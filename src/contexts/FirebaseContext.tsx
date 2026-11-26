import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { FIRESTORE_STORAGE_CONFIG } from '../lib/firestoreSchema';
import { firestoreDbService } from '../services/firestoreDbService';

export type FirestoreConnectionState = 'checking' | 'connected' | 'offline';

interface FirebaseContextValue {
  firebaseReady: boolean;
  firebaseUser: FirebaseUser | null;
  firestoreStatus: FirestoreConnectionState;
  firestoreDatabaseId: string;
  firestoreDbService: typeof firestoreDbService;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [firebaseReady, setFirebaseReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [firestoreStatus, setFirestoreStatus] = useState<FirestoreConnectionState>('checking');

  useEffect(() => {
    let active = true;

    firestoreDbService
      .verifyConnection()
      .then((ok) => {
        if (active) {
          setFirestoreStatus(ok ? 'connected' : 'offline');
        }
      })
      .catch(() => {
        if (active) setFirestoreStatus('offline');
      });

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!active) return;
      setFirebaseUser(fbUser);
      setFirebaseReady(true);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <FirebaseContext.Provider
      value={{
        firebaseReady,
        firebaseUser,
        firestoreStatus,
        firestoreDatabaseId: FIRESTORE_STORAGE_CONFIG.databaseId,
        firestoreDbService,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return ctx;
}
