import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { FirebaseProvider } from './contexts/FirebaseContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { registerSW } from 'virtual:pwa-register';
import { initAutoUpdateMonitor } from './utils/appUpdater.ts';

// Protect against browser translation / extensions modifying DOM nodes and breaking React reconciliation
if (typeof window !== 'undefined' && typeof Node !== 'undefined') {
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (this.contains(referenceNode)) {
        let directChild: Node | null = referenceNode;
        while (directChild && directChild.parentNode !== this) {
          directChild = directChild.parentNode;
        }
        if (directChild && directChild.parentNode === this) {
          return originalInsertBefore.call(this, newNode, directChild);
        }
      }
      return this.appendChild(newNode);
    }
    return originalInsertBefore.call(this, newNode, referenceNode);
  };

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child);
  };
}

// Prevent uncaught chunk preload errors from crashing the app during updates or local usage
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    console.warn('[MégafixaEduc] Module chunk reload requested');
    try {
      const reloadKey = 'megafixa_preload_reload';
      const lastReload = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
      const now = Date.now();
      if (now - lastReload > 15000) {
        sessionStorage.setItem(reloadKey, now.toString());
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}

// Automatic Service Worker update & controllerchange reload
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      const p = (window.location.pathname || '').toLowerCase();
      if (p.startsWith('/formulaire-enseignant') || p.startsWith('/collecte-enseignant') || p.startsWith('/f/')) {
        return;
      }
      try {
        const key = 'megafixa_sw_controller_reload';
        const last = parseInt(sessionStorage.getItem(key) || '0', 10);
        if (Date.now() - last > 20000) {
          sessionStorage.setItem(key, Date.now().toString());
          refreshing = true;
          window.location.reload();
        }
      } catch {
        refreshing = true;
        window.location.reload();
      }
    });

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[PWA] Nouvelle version prête — activation automatique.');
        void updateSW(true);
      },
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;
        const triggerSwCheck = () => {
          if (typeof navigator === 'undefined' || navigator.onLine !== false) {
            registration.update().catch(() => {});
          }
        };
        window.setInterval(triggerSwCheck, 60000);
        window.addEventListener('focus', triggerSwCheck);
      },
      onOfflineReady() {
        console.log('[PWA] MégafixaEduc disponible hors-ligne.');
      }
    });
  } catch (err) {
    console.warn('[PWA] Service worker registration bypassed:', err);
  }
}

// Start universal version/data auto-update monitor for all connected users & levels
initAutoUpdateMonitor();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <FirebaseProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </FirebaseProvider>
    </ErrorBoundary>
  </StrictMode>,
);

