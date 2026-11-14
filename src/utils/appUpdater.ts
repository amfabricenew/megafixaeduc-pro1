import toast from 'react-hot-toast';

const RELOAD_GUARD_KEY = 'megafixa_last_reloaded_build';
const RELOAD_GUARD_TS_KEY = 'megafixa_last_reloaded_ts';
const RELOAD_COOLDOWN_MS = 20000;

let knownBuildId: string | null = null;
let knownDataVersion: string | null = null;
let isApplyingUpdate = false;
let monitorInitialized = false;
let syncChannel: BroadcastChannel | null = null;

function isStaticFallbackHost(): boolean {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return (
    host.endsWith('github.io') ||
    host.includes('web.app') ||
    host.includes('firebaseapp.com')
  );
}

function getSyncChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return null;
  if (!syncChannel) {
    try {
      syncChannel = new BroadcastChannel('megafixa_app_sync');
    } catch {
      return null;
    }
  }
  return syncChannel;
}

export async function clearAppCachesAndUpdateSW(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
  } catch {
    // ignore cache errors
  }

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update().catch(() => {});
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      }
    }
  } catch {
    // ignore SW errors
  }
}

export function triggerCrossLevelDataSync(reason = 'server_sync'): void {
  if (typeof window === 'undefined') return;
  const timestamp = Date.now().toString();
  try {
    localStorage.setItem('megafixa_last_update', timestamp);
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent('app:data-updated', { detail: { timestamp, reason } }));
  window.dispatchEvent(new CustomEvent('schoolInfoChanged', { detail: { timestamp, reason } }));
  window.dispatchEvent(new CustomEvent('school_permissions_updated', { detail: { timestamp, reason } }));
  window.dispatchEvent(new CustomEvent('refresh_notifications', { detail: { timestamp, reason } }));
}

export async function applyAutomaticUpdate(newBuildId: string, broadcast = true): Promise<void> {
  if (typeof window === 'undefined' || isApplyingUpdate || isStaticFallbackHost()) return;
  if (!newBuildId || newBuildId === 'static') return;

  try {
    const lastBuild = sessionStorage.getItem(RELOAD_GUARD_KEY);
    const lastTs = parseInt(sessionStorage.getItem(RELOAD_GUARD_TS_KEY) || '0', 10);
    if (lastBuild === newBuildId && Date.now() - lastTs < RELOAD_COOLDOWN_MS) {
      knownBuildId = newBuildId;
      return;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, newBuildId);
    sessionStorage.setItem(RELOAD_GUARD_TS_KEY, Date.now().toString());
  } catch {
    // ignore sessionStorage error
  }

  isApplyingUpdate = true;
  knownBuildId = newBuildId;

  if (broadcast) {
    try {
      getSyncChannel()?.postMessage({ type: 'APP_NEW_BUILD', buildId: newBuildId });
    } catch {
      // ignore broadcast error
    }
  }

  try {
    toast('Nouvelle mise à jour détectée — actualisation automatique...', {
      id: 'megafixa-auto-update',
      duration: 3000,
    });
  } catch {
    // ignore toast error before mount
  }

  await clearAppCachesAndUpdateSW();

  setTimeout(() => {
    window.location.reload();
  }, 600);
}

export function observeVersionInfo(buildId?: string | null, dataVersion?: string | null): void {
  if (typeof window === 'undefined' || isStaticFallbackHost()) return;

  if (buildId && buildId.trim().length > 0) {
    if (!knownBuildId) {
      knownBuildId = buildId;
    } else if (knownBuildId !== buildId) {
      void applyAutomaticUpdate(buildId, true);
      return;
    }
  }

  if (dataVersion && dataVersion.trim().length > 0) {
    if (!knownDataVersion) {
      knownDataVersion = dataVersion;
    } else if (knownDataVersion !== dataVersion) {
      knownDataVersion = dataVersion;
      triggerCrossLevelDataSync('server_data_version');
    }
  }
}

export function observeServerHeaders(headers: Headers | null | undefined): void {
  if (!headers) return;
  try {
    const buildId = headers.get('X-App-Build-Version');
    const dataVersion = headers.get('X-App-Data-Version');
    observeVersionInfo(buildId, dataVersion);
  } catch {
    // ignore header inspection errors
  }
}

export async function checkForAppUpdate(): Promise<void> {
  if (typeof window === 'undefined' || isApplyingUpdate || isStaticFallbackHost()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

  try {
    const res = await fetch(`/api/app-version?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'Pragma': 'no-cache'
      }
    });
    if (!res.ok) return;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) return;
    const data = await res.json();
    observeVersionInfo(
      data?.buildId ? String(data.buildId) : res.headers.get('X-App-Build-Version'),
      data?.dataVersion ? String(data.dataVersion) : res.headers.get('X-App-Data-Version')
    );
  } catch {
    // ignore offline / transient errors
  }
}

export function initAutoUpdateMonitor(): void {
  if (typeof window === 'undefined' || monitorInitialized || isStaticFallbackHost()) return;
  monitorInitialized = true;

  // Initial check immediately on app load
  void checkForAppUpdate();

  // Check whenever user switches back to tab, restores focus, or regains connectivity
  const handleTrigger = () => {
    void checkForAppUpdate();
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      void checkForAppUpdate();
    }
  };

  window.addEventListener('focus', handleTrigger);
  window.addEventListener('online', handleTrigger);
  document.addEventListener('visibilitychange', handleVisibility);

  // Listen for sibling tabs announcing a new build or data update
  const channel = getSyncChannel();
  if (channel) {
    channel.addEventListener('message', (event: MessageEvent) => {
      if (event.data?.type === 'APP_NEW_BUILD' && event.data?.buildId) {
        void applyAutomaticUpdate(String(event.data.buildId), false);
      }
    });
  }

  // Periodic background poll (every 25 seconds) so idle connected dashboards also auto-update
  window.setInterval(() => {
    if (document.visibilityState !== 'hidden') {
      void checkForAppUpdate();
    }
  }, 25000);
}
