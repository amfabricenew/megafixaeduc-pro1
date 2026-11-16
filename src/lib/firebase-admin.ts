import fs from 'fs';
import path from 'path';
import firebaseConfig from '../../firebase-applet-config.json';
import { GoogleAuth, OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(firebaseConfig.oAuthClientId);

export const auth = {
  async verifyIdToken(idToken: string) {
    // 1. Try Firebase Identity Toolkit lookup (authoritative for Firebase ID tokens)
    if (firebaseConfig.apiKey) {
      try {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users[0]) {
            const u = data.users[0];
            if (!u.email || u.emailVerified === false) {
              throw new Error("Adresse email Google non vérifiée.");
            }
            return {
              uid: u.localId,
              email: u.email,
              email_verified: true,
              name: u.displayName || u.email?.split('@')[0],
              picture: u.photoUrl,
            };
          }
        }
      } catch (e: any) {
        if (e?.message?.includes("non vérifiée")) throw e;
        console.warn("Identitytoolkit verification failed, trying OAuth client:", e?.message || e);
      }
    }

    // 2. Try Google OAuth2Client verifyIdToken (cryptographic signature verification)
    try {
      const audiences = [
        firebaseConfig.oAuthClientId,
        firebaseConfig.projectId,
        process.env.GOOGLE_CLIENT_ID
      ].filter(Boolean) as string[];
      const ticket = await client.verifyIdToken({
        idToken,
        audience: audiences.length > 0 ? audiences : undefined,
      });
      const payload = ticket.getPayload();
      if (payload && payload.email && payload.email_verified !== false) {
        return {
          uid: payload.sub,
          email: payload.email,
          email_verified: true,
          name: payload.name || payload.email.split('@')[0],
          picture: payload.picture,
        };
      }
    } catch (e: any) {
      console.warn("OAuth client verification failed:", e?.message || e);
    }

    throw new Error("Jeton Google invalide, expiré ou non vérifié.");
  }
};

function toFirestoreFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) {
      fields[key] = { nullValue: null };
    } else if (typeof val === 'string') {
      fields[key] = { stringValue: val };
    } else if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        fields[key] = { integerValue: String(val) };
      } else {
        fields[key] = { doubleValue: val };
      }
    } else if (typeof val === 'boolean') {
      fields[key] = { booleanValue: val };
    } else if (Array.isArray(val)) {
      fields[key] = {
        arrayValue: {
          values: val.map(item => {
            if (typeof item === 'string') return { stringValue: item };
            if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
            if (typeof item === 'boolean') return { booleanValue: item };
            return { stringValue: JSON.stringify(item) };
          })
        }
      };
    } else if (typeof val === 'object') {
      fields[key] = { mapValue: { fields: toFirestoreFields(val) } };
    }
  }
  return fields;
}

function parseFirestoreFields(fields: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = Number(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = Boolean(val.booleanValue);
    else if (val.nullValue !== undefined) result[key] = null;
    else if (val.arrayValue?.values) {
      result[key] = val.arrayValue.values.map((v: any) => {
        if (v.stringValue !== undefined) return v.stringValue;
        if (v.integerValue !== undefined) return Number(v.integerValue);
        if (v.doubleValue !== undefined) return Number(v.doubleValue);
        if (v.booleanValue !== undefined) return Boolean(v.booleanValue);
        return null;
      });
    } else if (val.mapValue?.fields) {
      result[key] = parseFirestoreFields(val.mapValue.fields);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export interface DocSnapshot {
  exists: boolean;
  data: () => any;
}

export interface DocumentReference {
  get: () => Promise<DocSnapshot>;
  set: (data: Record<string, any>) => Promise<boolean>;
}

export interface CollectionReference {
  doc: (docId: string) => DocumentReference;
}

let cloudSyncStatus: 'unknown' | 'ready' | 'unavailable' = 'unknown';
let loggedCloudUnavailable = false;
let cachedGoogleAuth: GoogleAuth | null = null;

function markCloudUnavailable(reason: string) {
  cloudSyncStatus = 'unavailable';
  if (!loggedCloudUnavailable) {
    loggedCloudUnavailable = true;
    console.info(`[Persistence] Local SQLite persistence active (${reason}).`);
  }
}

export function isCloudSyncAvailable(): boolean {
  return cloudSyncStatus !== 'unavailable';
}

function getGoogleAuthClient(): GoogleAuth {
  if (cachedGoogleAuth) return cachedGoogleAuth;

  const scopes = ['https://www.googleapis.com/auth/datastore'];

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      cachedGoogleAuth = new GoogleAuth({ credentials, scopes });
      return cachedGoogleAuth;
    } catch {
      // Fall through to file/ADC lookup
    }
  }

  const saFilePath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    path.join(process.cwd(), 'firebase-service-account.json');
  if (saFilePath && fs.existsSync(saFilePath)) {
    cachedGoogleAuth = new GoogleAuth({ keyFilename: saFilePath, scopes });
    return cachedGoogleAuth;
  }

  cachedGoogleAuth = new GoogleAuth({ scopes });
  return cachedGoogleAuth;
}

async function getAdminAccessToken(): Promise<string | null> {
  if (cloudSyncStatus === 'unavailable') return null;
  try {
    const googleAuth = getGoogleAuthClient();
    const authClient = await googleAuth.getClient();
    const tokenRes = await authClient.getAccessToken();
    const token = typeof tokenRes === 'string' ? tokenRes : tokenRes?.token;
    if (!token) {
      markCloudUnavailable('no OAuth access token');
      return null;
    }
    return token;
  } catch {
    markCloudUnavailable('no cloud admin credentials');
    return null;
  }
}

async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = 3,
  timeoutMs = 12000
): Promise<Response> {
  let lastErr: any = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
          continue;
        }
      }
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
        continue;
      }
    }
  }
  throw lastErr || new Error('Firestore REST request failed after retries');
}

export const adminDb = {
  collection(collectionName: string): CollectionReference {
    return {
      doc(docId: string): DocumentReference {
        const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
        const url = `${baseUrl}/${collectionName}/${docId}`;

        return {
          async get(): Promise<DocSnapshot> {
            if (cloudSyncStatus === 'unavailable') {
              return { exists: false, data: () => null };
            }
            const accessToken = await getAdminAccessToken();
            if (!accessToken) {
              return { exists: false, data: () => null };
            }
            const res = await fetchWithRetry(url, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            if (res.status === 404) {
              cloudSyncStatus = 'ready';
              return {
                exists: false,
                data: () => null
              };
            }
            if (res.status === 401 || res.status === 403) {
              markCloudUnavailable('cloud backup permissions not configured for this runtime');
              return { exists: false, data: () => null };
            }
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Firestore REST GET failed [${res.status}]: ${errBody}`);
            }
            cloudSyncStatus = 'ready';
            const json = await res.json();
            const data = parseFirestoreFields(json.fields);
            return {
              exists: true,
              data: () => data
            };
          },
          async set(data: Record<string, any>): Promise<boolean> {
            if (cloudSyncStatus === 'unavailable') {
              return false;
            }
            const accessToken = await getAdminAccessToken();
            if (!accessToken) {
              return false;
            }
            const res = await fetchWithRetry(url, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
              },
              body: JSON.stringify({
                fields: toFirestoreFields(data)
              })
            });
            if (res.status === 401 || res.status === 403) {
              markCloudUnavailable('cloud backup permissions not configured for this runtime');
              return false;
            }
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Firestore REST PATCH failed [${res.status}]: ${errBody}`);
            }
            cloudSyncStatus = 'ready';
            return true;
          }
        };
      }
    };
  }
};
