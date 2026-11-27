import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { 
  initializeFirestore,
  getFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Force HTTP long-polling and multi-tab cache management (with memory fallback)
// so proxied / iframe preview environments never hang on buffered WebChannel streams
export const db = (() => {
  const transportSettings = {
    experimentalForceLongPolling: true,
    experimentalLongPollingOptions: { timeoutSeconds: 10 },
  };
  try {
    return initializeFirestore(
      app,
      {
        ...transportSettings,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          ...transportSettings,
          localCache: memoryLocalCache(),
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
})();

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  onSnapshot, 
  query, 
  where, 
  orderBy 
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionCheckPromise: Promise<boolean> | null = null;

// Test Firestore connection gracefully on boot using a single shared getDocFromServer probe
export async function testFirestoreConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (connectionCheckPromise) {
    return connectionCheckPromise;
  }
  connectionCheckPromise = (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
      return true;
    } catch (error: any) {
      const code = String(error?.code || '').toLowerCase();
      const message = error instanceof Error ? error.message : String(error || '');
      if (
        code === 'permission-denied' ||
        code === 'not-found' ||
        code === 'unauthenticated' ||
        message.includes('Missing or insufficient permissions')
      ) {
        return true;
      }
      if (message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
      return false;
    } finally {
      connectionCheckPromise = null;
    }
  })();
  return connectionCheckPromise;
}

if (typeof window !== 'undefined') {
  testFirestoreConnection().catch(() => {});
}


