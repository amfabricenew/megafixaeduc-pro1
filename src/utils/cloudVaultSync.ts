import { auth, db, doc, getDocFromServer, setDoc, handleFirestoreError, OperationType } from '../lib/firebase';
import { firestoreDbService } from '../services/firestoreDbService';

const SUPER_ADMIN_CLOUD_EMAILS = ['ayedeguef@gmail.com', 'amfabricenew@gmail.com'];
const VAULT_DOC_PATH = 'backups/school_accounts_registry';
const FIRESTORE_VAULT_BYTE_LIMIT = 750000;
const FIRESTORE_CHUNK_SIZE = 650000;

let syncInFlight: Promise<{ reconciled: number; pushed: boolean } | null> | null = null;

function isEligibleSuperAdminFirebaseSession(): boolean {
  const current = auth.currentUser;
  if (!current || !current.email || !current.emailVerified) return false;
  return SUPER_ADMIN_CLOUD_EMAILS.includes(current.email.toLowerCase());
}

/**
 * Mirrors school_accounts_registry (schools, users, school_creation_requests,
 * reclamations_demandes, inscription_demandes, plans, settings) with Firestore
 * using the Super Admin's authenticated Firebase session when available.
 * Automatically chunks payloads > 750 KB so synchronization never stops as data grows.
 */
export async function syncCloudVaultWithFirestore(options: {
  allowShrink?: boolean;
  prioritizeRemote?: boolean;
  throwOnError?: boolean;
} = {}): Promise<{ reconciled: number; pushed: boolean } | null> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    try {
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
      if (!token || !isEligibleSuperAdminFirebaseSession()) {
        return null;
      }

      const vaultRef = doc(db, 'backups', 'school_accounts_registry');
      let remoteVault: any = null;
      let remoteMeta: any = null;

      try {
        const snap = await getDocFromServer(vaultRef);
        if (snap.exists()) {
          remoteMeta = snap.data();
          if (remoteMeta?.encoding === 'plain-chunked' && Number(remoteMeta?.chunk_count) > 0) {
            const parts: string[] = [];
            const chunkCount = Number(remoteMeta.chunk_count);
            for (let i = 0; i < chunkCount; i++) {
              const chunkPath = `backups/school_accounts_registry_chunk_${i}`;
              try {
                const chunkSnap = await getDocFromServer(doc(db, 'backups', `school_accounts_registry_chunk_${i}`));
                if (!chunkSnap.exists() || typeof chunkSnap.data()?.data !== 'string') {
                  throw new Error(`Missing vault chunk ${i}/${chunkCount}`);
                }
                parts.push(chunkSnap.data().data);
              } catch (chunkErr: any) {
                handleFirestoreError(chunkErr, OperationType.GET, chunkPath);
              }
            }
            const joined = parts.join('');
            if (joined.length > 0) {
              remoteVault = JSON.parse(joined);
            }
          } else if (typeof remoteMeta?.vault_json === 'string' && remoteMeta.vault_json.length > 0) {
            remoteVault = JSON.parse(remoteMeta.vault_json);
          }
        }
      } catch (readErr: any) {
        if (options.throwOnError) {
          handleFirestoreError(readErr, OperationType.GET, VAULT_DOC_PATH);
        } else {
          try {
            handleFirestoreError(readErr, OperationType.GET, VAULT_DOC_PATH);
          } catch {
            return null;
          }
        }
      }

      let reconciled = 0;
      let latestVault: any = null;
      let latestStats: any = null;

      if (remoteVault && remoteVault.tables) {
        const reconcileRes = await fetch('/api/super-admin/cloud-vault/reconcile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            vault: remoteVault,
            prioritizeRemote: Boolean(options.prioritizeRemote),
          })
        });
        if (reconcileRes.ok) {
          const data = await reconcileRes.json();
          reconciled = Number(data?.reconciled || 0);
          latestVault = data?.vault || null;
          latestStats = data?.stats || null;
        }
      }

      if (!latestVault) {
        const exportRes = await fetch('/api/super-admin/cloud-vault', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!exportRes.ok) return { reconciled, pushed: false };
        const data = await exportRes.json();
        latestVault = data?.vault || null;
        latestStats = data?.stats || null;
      }

      if (!latestVault || !latestStats) {
        return { reconciled, pushed: false };
      }

      const localReqCount = Number(
        latestVault.request_count ??
        (Array.isArray(latestVault.tables?.school_creation_requests) ? latestVault.tables.school_creation_requests.length : 0)
      );
      const remoteReqCount = Number(
        remoteMeta?.request_count ??
        remoteVault?.request_count ??
        (Array.isArray(remoteVault?.tables?.school_creation_requests) ? remoteVault.tables.school_creation_requests.length : 0)
      );

      const wouldShrink = !options.allowShrink && remoteMeta && (
        Number(remoteMeta.non_default_school_count || 0) > Number(latestStats.nonDefaultSchoolCount || 0) ||
        Number(remoteMeta.school_count || 0) > Number(latestStats.schoolCount || 0) ||
        Number(remoteMeta.non_test_user_count || 0) > Number(latestStats.nonTestUserCount || 0) ||
        remoteReqCount > localReqCount
      );

      if (wouldShrink) {
        return { reconciled, pushed: false };
      }

      const vaultJson = JSON.stringify(latestVault);
      const nowIso = new Date().toISOString();
      const baseMeta = {
        last_updated: nowIso,
        school_count: Number(latestStats.schoolCount || 0),
        non_default_school_count: Number(latestStats.nonDefaultSchoolCount || 0),
        non_test_user_count: Number(latestStats.nonTestUserCount || 0),
        request_count: localReqCount,
      };

      try {
        if (new Blob([vaultJson]).size <= FIRESTORE_VAULT_BYTE_LIMIT) {
          await setDoc(vaultRef, {
            ...baseMeta,
            encoding: 'plain',
            chunk_count: 0,
            vault_json: vaultJson
          });
        } else {
          const chunks: string[] = [];
          for (let offset = 0; offset < vaultJson.length; offset += FIRESTORE_CHUNK_SIZE) {
            chunks.push(vaultJson.slice(offset, offset + FIRESTORE_CHUNK_SIZE));
          }
          for (let i = 0; i < chunks.length; i++) {
            const chunkPath = `backups/school_accounts_registry_chunk_${i}`;
            try {
              await setDoc(doc(db, 'backups', `school_accounts_registry_chunk_${i}`), {
                index: i,
                total: chunks.length,
                data: chunks[i],
                last_updated: nowIso
              });
            } catch (chunkWriteErr: any) {
              handleFirestoreError(chunkWriteErr, OperationType.WRITE, chunkPath);
            }
          }
          await setDoc(vaultRef, {
            ...baseMeta,
            encoding: 'plain-chunked',
            chunk_count: chunks.length,
            vault_json: ''
          });
        }
        await firestoreDbService
          .syncNormalizedEntitiesFromVault(latestVault, { throwOnError: false })
          .catch(() => {});
        return { reconciled, pushed: true };
      } catch (writeErr: any) {
        if (options.throwOnError) {
          handleFirestoreError(writeErr, OperationType.WRITE, VAULT_DOC_PATH);
        } else {
          try {
            handleFirestoreError(writeErr, OperationType.WRITE, VAULT_DOC_PATH);
          } catch {
            return { reconciled, pushed: false };
          }
        }
        return { reconciled, pushed: false };
      }
    } catch (err) {
      if (options.throwOnError) {
        throw err;
      }
      return null;
    } finally {
      syncInFlight = null;
    }
  })();

  return syncInFlight;
}
