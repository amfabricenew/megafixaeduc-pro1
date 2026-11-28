import { useEffect, useRef } from 'react';
import { handleStaticApiFallback } from './cloudFallback';
import { observeServerHeaders, markLocalDataVersionSeen } from './appUpdater';

let rateLimitedUntil = 0;
let lastNotifyDispatchAt = 0;

export function isRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}

export function getRateLimitRemainingMs(): number {
  return Math.max(0, rateLimitedUntil - Date.now());
}

export function markRateLimited(ms = 8000): void {
  const safeMs = Math.max(2500, Math.min(ms, 25000));
  const until = Date.now() + safeMs;
  if (until > rateLimitedUntil) {
    rateLimitedUntil = until;
  }
}

// ============================================================================
// Global Request Queue + Concurrency Cap + In-flight GET Deduplication
// Prevents simultaneous HTTP bursts from triggering Cloud Run / proxy 429s
// ============================================================================
const MAX_CONCURRENT_API_REQUESTS = 3;
const MIN_DISPATCH_GAP_MS = 35;
const GET_MICRO_CACHE_TTL_MS = 1500;

interface QueuedTask {
  priority: 'high' | 'normal';
  signal?: AbortSignal | null;
  run: () => void;
}

let activeApiCount = 0;
let lastDispatchAt = 0;
let queueDrainTimer: ReturnType<typeof setTimeout> | null = null;
const requestQueue: QueuedTask[] = [];

const inFlightGetRequests = new Map<string, Promise<Response>>();
const recentGetCache = new Map<string, { timestamp: number; response: Response }>();

function clearGetMicroCache() {
  recentGetCache.clear();
}

function drainQueue() {
  if (queueDrainTimer !== null) {
    clearTimeout(queueDrainTimer);
    queueDrainTimer = null;
  }

  while (activeApiCount < MAX_CONCURRENT_API_REQUESTS && requestQueue.length > 0) {
    // Pause queued requests while global 429 cooldown is active
    const rlRemaining = getRateLimitRemainingMs();
    if (rlRemaining > 0) {
      const jitter = 180 + Math.floor(Math.random() * 450);
      queueDrainTimer = setTimeout(drainQueue, rlRemaining + jitter);
      return;
    }

    const now = Date.now();
    const gapRemaining = lastDispatchAt + MIN_DISPATCH_GAP_MS - now;
    if (gapRemaining > 0) {
      queueDrainTimer = setTimeout(drainQueue, gapRemaining);
      return;
    }

    const next = requestQueue.shift();
    if (!next) break;
    if (next.signal?.aborted) continue;

    activeApiCount++;
    lastDispatchAt = Date.now();
    next.run();
  }
}

function enqueueApiSlot<T>(
  priority: 'high' | 'normal',
  signal: AbortSignal | null | undefined,
  fn: () => Promise<T>
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const task: QueuedTask = {
      priority,
      signal,
      run: () => {
        Promise.resolve()
          .then(fn)
          .then(resolve, reject)
          .finally(() => {
            activeApiCount = Math.max(0, activeApiCount - 1);
            drainQueue();
          });
      },
    };

    if (priority === 'high') {
      const firstNormalIdx = requestQueue.findIndex((t) => t.priority === 'normal');
      if (firstNormalIdx === -1) {
        requestQueue.push(task);
      } else {
        requestQueue.splice(firstNormalIdx, 0, task);
      }
    } else {
      requestQueue.push(task);
    }

    drainQueue();
  });
}

function parseRetryAfterMs(headerVal: string | null): number {
  if (!headerVal) return 8000;
  const trimmed = headerVal.trim();
  const asSeconds = Number(trimmed);
  if (Number.isFinite(asSeconds) && asSeconds > 0) {
    return Math.min(Math.max(asSeconds * 1000, 3000), 20000);
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    if (diff > 0) return Math.min(Math.max(diff, 3000), 20000);
  }
  return 8000;
}

let appSyncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    appSyncChannel = new BroadcastChannel('megafixa_app_sync');
  } catch {
    // ignore BroadcastChannel errors
  }
}

export const notifyAppUpdate = () => {
  if (typeof window !== 'undefined') {
    const now = Date.now();
    if (now - lastNotifyDispatchAt < 1500) return;
    lastNotifyDispatchAt = now;
    const timestamp = now.toString();
    try {
      localStorage.setItem('megafixa_last_update', timestamp);
    } catch {
      // ignore storage error
    }
    window.dispatchEvent(new CustomEvent('app:data-updated', { detail: { timestamp } }));
    window.dispatchEvent(new CustomEvent('refresh_notifications', { detail: { timestamp } }));
    if (appSyncChannel) {
      try {
        appSyncChannel.postMessage({ type: 'DATA_CHANGED', timestamp });
      } catch {
        // ignore channel errors
      }
    }
  }
};

const safeStorageGet = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

function wrapSafeResponse(res: Response): Response {
  return new Proxy(res, {
    get(target: any, prop: string | symbol) {
      if (prop === 'json') {
        return async () => {
          const contentType = target.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            if (target.status === 404) {
              return { error: "Ressource introuvable sur le serveur (Erreur 404).", status: 404 };
            }
            if (target.status === 429) {
              return { error: "Trop de requêtes simultanées vers le serveur (429). Veuillez patienter quelques secondes puis réessayer.", status: 429 };
            }
            return { error: `Réponse inattendue du serveur (${target.status})`, status: target.status };
          }
          try {
            return await target.json();
          } catch {
            if (target.status === 404) {
              return { error: "Ressource introuvable sur le serveur (Erreur 404).", status: 404 };
            }
            if (target.status === 409) {
              return { error: "Cette adresse email ou ressource est déjà utilisée.", status: 409 };
            }
            if (target.status === 429) {
              return { error: "Trop de requêtes simultanées vers le serveur (429). Veuillez patienter quelques secondes puis réessayer.", status: 429 };
            }
            return { error: `Erreur de communication avec le serveur (${target.status})`, status: target.status };
          }
        };
      }
      if (prop === 'clone') {
        return () => wrapSafeResponse(target.clone());
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

function shouldSkipMutationBroadcast(url: string): boolean {
  return (
    url.includes('/api/super-admin/cloud-vault/reconcile') ||
    url.includes('/api/school/firestore-reconcile') ||
    url.includes('/api/super-admin/notifications/mark-read') ||
    url.includes('/api/auth/login') ||
    url.includes('/api/auth/verify')
  );
}

const executeSingleFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  retryCount = 0
): Promise<Response> => {
  const token = safeStorageGet('token');
  const selectedYearId = safeStorageGet('selected_year_id');

  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  }

  const isPublicApi = url.includes('/api/public/');
  const isApiUrl = url.includes('/api/');
  const methodUpper = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(methodUpper);

  if (isMutation) {
    clearGetMicroCache();
  }

  const shouldUseTimeout = !init?.signal && typeof AbortController !== 'undefined' && methodUpper === 'GET';
  const controller = shouldUseTimeout ? new AbortController() : null;
  const timeoutMs = isPublicApi ? 12000 : 20000;
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

  let res: Response;

  try {
    const runNetworkFetch = async () => {
      if (isApiUrl) {
        if (input instanceof Request) {
          const newHeaders = new Headers(input.headers);
          if (!isPublicApi && token && !newHeaders.has('Authorization')) {
            newHeaders.set('Authorization', `Bearer ${token}`);
          }
          if (!isPublicApi && selectedYearId && !newHeaders.has('X-Academic-Year-ID')) {
            newHeaders.set('X-Academic-Year-ID', selectedYearId);
          }
          if (init?.body && typeof init.body === 'string' && !newHeaders.has('Content-Type') && !newHeaders.has('content-type')) {
            const trimmed = init.body.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              newHeaders.set('Content-Type', 'application/json');
            }
          }
          const newRequest = new Request(input, { headers: newHeaders });
          return fetch(newRequest, controller ? { ...init, signal: controller.signal } : init);
        } else {
          const newInit = { ...init, ...(controller ? { signal: controller.signal } : {}) };
          const headers = new Headers(newInit.headers || {});
          if (!isPublicApi && token && !headers.has('Authorization') && !headers.has('authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          if (!isPublicApi && selectedYearId && !headers.has('X-Academic-Year-ID')) {
            headers.set('X-Academic-Year-ID', selectedYearId);
          }
          if (newInit.body && typeof newInit.body === 'string' && !headers.has('Content-Type') && !headers.has('content-type')) {
            const trimmed = newInit.body.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              headers.set('Content-Type', 'application/json');
            }
          }
          newInit.headers = headers;
          return fetch(input, newInit);
        }
      } else {
        const newInit = { ...init, ...(controller ? { signal: controller.signal } : {}) };
        if (newInit.body && typeof newInit.body === 'string') {
          const headers = new Headers(newInit.headers || {});
          if (!headers.has('Content-Type') && !headers.has('content-type')) {
            const trimmed = newInit.body.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              headers.set('Content-Type', 'application/json');
              newInit.headers = headers;
            }
          }
        }
        return fetch(input, newInit);
      }
    };

    if (isApiUrl) {
      res = await enqueueApiSlot(
        isMutation ? 'high' : 'normal',
        init?.signal || controller?.signal,
        runNetworkFetch
      );
    } else {
      res = await runNetworkFetch();
    }

    if (timeoutId) clearTimeout(timeoutId);

    const resContentType = (res.headers.get('content-type') || '').toLowerCase();
    if (res.status === 429) {
      const cooldownMs = parseRetryAfterMs(res.headers.get('Retry-After'));
      markRateLimited(cooldownMs);
      const max429Retries = isMutation ? 2 : 1;
      if (retryCount < max429Retries) {
        const jitter = 250 + Math.floor(Math.random() * 650);
        const waitMs = Math.min(cooldownMs, 12000) + jitter;
        await new Promise(resolve => setTimeout(resolve, waitMs));
        return executeSingleFetch(input, init, retryCount + 1);
      }
    } else {
      const isBusinessJson503 = res.status === 503 && resContentType.includes('application/json');
      if (retryCount < 2 && !isBusinessJson503 && [502, 503, 504].includes(res.status)) {
        const delay = [900, 1800][retryCount] || 1500;
        await new Promise(resolve => setTimeout(resolve, delay));
        return executeSingleFetch(input, init, retryCount + 1);
      }
    }

    if (res.ok && isMutation) {
      markLocalDataVersionSeen(res.headers.get('X-App-Data-Version'));
    }

    observeServerHeaders(res.headers);

    if (res.status === 404) {
      const fallback = await handleStaticApiFallback(url, init);
      if (fallback) return fallback;
    }

    if (!res.ok) {
      if (res.status >= 500) {
        console.error(`apiFetch FAILED: ${methodUpper} ${url} - Status: ${res.status}`);
        try {
          const errorData = await res.clone().json();
          console.error("apiFetch error details:", errorData);
        } catch {
          // ignore
        }
      } else if (res.status !== 429) {
        try {
          const errorData = await res.clone().json();
          console.warn(`apiFetch ${res.status} [${methodUpper} ${url}]:`, errorData?.error || errorData?.message || res.statusText);
        } catch {
          // ignore
        }
      }
    }
  } catch (netErr: any) {
    if (timeoutId) clearTimeout(timeoutId);
    if (init?.signal?.aborted) {
      throw netErr;
    }
    if (retryCount < 2 && (methodUpper === 'GET' || netErr?.name === 'TypeError')) {
      await new Promise(resolve => setTimeout(resolve, 400 * (retryCount + 1)));
      return executeSingleFetch(input, init, retryCount + 1);
    }

    const staticFallback = await handleStaticApiFallback(url, init);
    if (staticFallback) return staticFallback;

    console.warn("apiFetch network/server error:", netErr?.message || netErr);
    const errObj = {
      error: "Impossible de contacter le serveur. Veuillez vérifier votre connexion réseau ou l'état du serveur.",
      success: false
    };
    return new Response(JSON.stringify(errObj), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (res.ok && isMutation && !shouldSkipMutationBroadcast(url)) {
    clearGetMicroCache();
    notifyAppUpdate();
  }

  return res;
};

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit, retryCount = 0): Promise<Response> => {
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  }

  const methodUpper = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const canDedupeGet =
    retryCount === 0 &&
    methodUpper === 'GET' &&
    url.includes('/api/') &&
    typeof input === 'string' &&
    !init?.body &&
    !init?.signal;

  if (canDedupeGet) {
    const token = safeStorageGet('token') || '';
    const yearId = safeStorageGet('selected_year_id') || '';
    const cacheKey = `${url}::${token.slice(-16)}::${yearId}`;

    const cached = recentGetCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < GET_MICRO_CACHE_TTL_MS) {
      return wrapSafeResponse(cached.response.clone());
    }

    const existingPromise = inFlightGetRequests.get(cacheKey);
    if (existingPromise) {
      const sharedRes = await existingPromise;
      return wrapSafeResponse(sharedRes.clone());
    }

    const fetchPromise = executeSingleFetch(input, init, retryCount)
      .then((res) => {
        if (res.ok) {
          recentGetCache.set(cacheKey, { timestamp: Date.now(), response: res.clone() });
        }
        return res;
      })
      .finally(() => {
        inFlightGetRequests.delete(cacheKey);
      });

    inFlightGetRequests.set(cacheKey, fetchPromise);
    const res = await fetchPromise;
    return wrapSafeResponse(res.clone());
  }

  const res = await executeSingleFetch(input, init, retryCount);
  return wrapSafeResponse(res);
};

export function useAppSync(onSync: () => void, intervalMs: number = 15000) {
  const savedHandler = useRef(onSync);
  const lastRunRef = useRef<number>(0);

  useEffect(() => {
    savedHandler.current = onSync;
  }, [onSync]);

  useEffect(() => {
    let updateDebounce: ReturnType<typeof setTimeout> | null = null;

    const handler = (force = false) => {
      if (isRateLimited()) return;
      const now = Date.now();
      if (!force && now - lastRunRef.current < 1500) return;
      lastRunRef.current = now;
      savedHandler.current();
    };

    const onUpdated = () => {
      if (isRateLimited()) return;
      if (updateDebounce) clearTimeout(updateDebounce);
      updateDebounce = setTimeout(() => {
        updateDebounce = null;
        handler(true);
      }, 300);
    };
    const onFocusOrStorage = () => handler(false);

    window.addEventListener('app:data-updated', onUpdated);
    window.addEventListener('focus', onFocusOrStorage);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handler(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'megafixa_last_update') {
        onUpdated();
      }
    };
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('megafixa_app_sync');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'DATA_CHANGED') {
            onUpdated();
          }
        };
      } catch {
        // channel error
      }
    }

    const effectiveInterval = Math.max(intervalMs, 15000);
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      handler(false);
    }, effectiveInterval);

    return () => {
      if (updateDebounce) clearTimeout(updateDebounce);
      window.removeEventListener('app:data-updated', onUpdated);
      window.removeEventListener('focus', onFocusOrStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.close();
      }
      clearInterval(timer);
    };
  }, [intervalMs]);
}
