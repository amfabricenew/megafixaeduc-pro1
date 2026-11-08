import { useEffect, useRef } from 'react';
import { handleStaticApiFallback } from './cloudFallback';

let appSyncChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    appSyncChannel = new BroadcastChannel('megafixa_app_sync');
  } catch (e) {
    console.warn('BroadcastChannel not supported');
  }
}

export const notifyAppUpdate = () => {
  if (typeof window !== 'undefined') {
    const timestamp = Date.now().toString();
    try {
      localStorage.setItem('megafixa_last_update', timestamp);
    } catch (e) {
      // ignore storage error
    }
    window.dispatchEvent(new CustomEvent('app:data-updated', { detail: { timestamp } }));
    window.dispatchEvent(new CustomEvent('refresh_notifications', { detail: { timestamp } }));
    if (appSyncChannel) {
      try {
        appSyncChannel.postMessage({ type: 'DATA_CHANGED', timestamp });
      } catch (e) {
        // ignore channel errors
      }
    }
  }
};

export const apiFetch = async (input: RequestInfo | URL, init?: RequestInit, retryCount = 0): Promise<Response> => {
  const token = localStorage.getItem('token');
  const selectedYearId = localStorage.getItem('selected_year_id');
  
  let url = '';
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof URL) {
    url = input.toString();
  } else if (input instanceof Request) {
    url = input.url;
  }

  let res: Response;

  try {
    if (url.includes('/api/')) {
      if (input instanceof Request) {
        const newHeaders = new Headers(input.headers);
        if (token && !newHeaders.has('Authorization')) {
          newHeaders.set('Authorization', `Bearer ${token}`);
        }
        if (selectedYearId && !newHeaders.has('X-Academic-Year-ID')) {
          newHeaders.set('X-Academic-Year-ID', selectedYearId);
        }
        if (init?.body && typeof init.body === 'string' && !newHeaders.has('Content-Type') && !newHeaders.has('content-type')) {
          const trimmed = init.body.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            newHeaders.set('Content-Type', 'application/json');
          }
        }
        const newRequest = new Request(input, { headers: newHeaders });
        res = await fetch(newRequest, init);
      } else {
        const newInit = { ...init };
        const headers = new Headers(newInit.headers || {});
        
        if (token && !headers.has('Authorization') && !headers.has('authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (selectedYearId && !headers.has('X-Academic-Year-ID')) {
          headers.set('X-Academic-Year-ID', selectedYearId);
        }
        if (newInit.body && typeof newInit.body === 'string' && !headers.has('Content-Type') && !headers.has('content-type')) {
          const trimmed = newInit.body.trim();
          if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
            headers.set('Content-Type', 'application/json');
          }
        }
        
        newInit.headers = headers;
        res = await fetch(input, newInit);
      }
    } else {
      const newInit = { ...init };
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
      res = await fetch(input, newInit);
    }

    // Retry for transient server errors (502, 503, 504) or rate limits (429)
    if (retryCount < 2 && [429, 502, 503, 504].includes(res.status)) {
      const delay = res.headers.get('Retry-After') 
        ? parseInt(res.headers.get('Retry-After')!) * 1000 
        : 500 * (retryCount + 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      return apiFetch(input, init, retryCount + 1);
    }

    if (res.status === 404) {
      const fallback = await handleStaticApiFallback(url, init);
      if (fallback) return fallback;
    }

    if (!res.ok) {
      const reqMethod = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      if (res.status >= 500) {
        console.error(`apiFetch FAILED: ${reqMethod} ${url} - Status: ${res.status}`);
        try {
          const errorData = await res.clone().json();
          console.error("apiFetch error details:", errorData);
        } catch (e) {
          // ignore error parsing
        }
      } else {
        try {
          const errorData = await res.clone().json();
          console.warn(`apiFetch ${res.status} [${reqMethod} ${url}]:`, errorData?.error || errorData?.message || res.statusText);
        } catch (e) {
          // ignore error parsing
        }
      }
    }
  } catch (netErr: any) {
    const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    // Retry once or twice for GET requests or server cold-start/brief lag
    if (retryCount < 2 && (method === 'GET' || netErr.name === 'TypeError')) {
      await new Promise(resolve => setTimeout(resolve, 350 * (retryCount + 1)));
      return apiFetch(input, init, retryCount + 1);
    }

    const staticFallback = await handleStaticApiFallback(url, init);
    if (staticFallback) return staticFallback;

    console.warn("apiFetch network/server error:", netErr?.message || netErr);
    const errObj = { 
      error: "Impossible de contacter le serveur. Veuillez vérifier votre connexion réseau ou l'état du serveur.",
      success: false 
    };
    const fallbackResponse = new Response(JSON.stringify(errObj), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { 'Content-Type': 'application/json' }
    });
    return fallbackResponse;
  }

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
  if (res.ok && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    notifyAppUpdate();
  }

  // Wrap the response to safely handle HTML/non-JSON responses without SyntaxError crashes
  const safeResponse = new Proxy(res, {
    get(target: any, prop: string | symbol) {
      if (prop === 'json') {
        return async () => {
          const contentType = target.headers.get('content-type') || '';
          if (contentType.includes('text/html')) {
            if (target.status === 404) {
              return { error: "Ressource introuvable sur le serveur (Erreur 404).", status: 404 };
            }
            return { error: `Réponse inattendue du serveur (${target.status})`, status: target.status };
          }
          try {
            return await target.json();
          } catch (e) {
            if (target.status === 404) {
              return { error: "Ressource introuvable sur le serveur (Erreur 404).", status: 404 };
            }
            if (target.status === 409) {
              return { error: "Cette adresse email ou ressource est déjà utilisée.", status: 409 };
            }
            return { error: `Erreur de communication avec le serveur (${target.status})`, status: target.status };
          }
        };
      }
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });

  return safeResponse;
};

export function useAppSync(onSync: () => void, intervalMs: number = 8000) {
  const savedHandler = useRef(onSync);

  useEffect(() => {
    savedHandler.current = onSync;
  }, [onSync]);

  useEffect(() => {
    const handler = () => {
      savedHandler.current();
    };

    window.addEventListener('app:data-updated', handler);
    window.addEventListener('focus', handler);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handler();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'megafixa_last_update') {
        handler();
      }
    };
    window.addEventListener('storage', handleStorage);

    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('megafixa_app_sync');
        channel.onmessage = (event) => {
          if (event.data && event.data.type === 'DATA_CHANGED') {
            handler();
          }
        };
      } catch (e) {
        // channel error
      }
    }

    const timer = setInterval(() => {
      handler();
    }, intervalMs);

    return () => {
      window.removeEventListener('app:data-updated', handler);
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.close();
      }
      clearInterval(timer);
    };
  }, [intervalMs]);
}

