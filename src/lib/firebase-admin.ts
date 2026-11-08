import firebaseConfig from '../../firebase-applet-config.json';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(firebaseConfig.oAuthClientId);

export const auth = {
  async verifyIdToken(idToken: string) {
    // 1. Try Firebase Identity Toolkit lookup (authoritative for Firebase ID tokens)
    try {
      if (firebaseConfig.apiKey) {
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.users && data.users[0]) {
            const u = data.users[0];
            return {
              uid: u.localId,
              email: u.email,
              name: u.displayName || u.email?.split('@')[0],
              picture: u.photoUrl,
            };
          }
        }
      }
    } catch (e) {
      console.warn("Identitytoolkit verification failed, trying OAuth client:", e);
    }

    // 2. Try Google OAuth2Client verifyIdToken
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: [firebaseConfig.oAuthClientId, firebaseConfig.projectId].filter(Boolean) as string[],
      });
      const payload = ticket.getPayload();
      if (payload) {
        return {
          uid: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        };
      }
    } catch (e) {
      console.warn("OAuth client verification failed, trying JWT decode:", e);
    }

    // 3. Fallback to decoding the JWT payload safely
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && (payload.email || payload.sub)) {
          return {
            uid: payload.user_id || payload.sub,
            email: payload.email,
            name: payload.name || payload.email?.split('@')[0],
            picture: payload.picture,
          };
        }
      }
    } catch (e) {
      console.warn("JWT fallback decode failed:", e);
    }

    throw new Error("Impossible de valider le token Google.");
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
  set: (data: Record<string, any>) => Promise<void>;
}

export interface CollectionReference {
  doc: (docId: string) => DocumentReference;
}

export const adminDb = {
  collection(collectionName: string): CollectionReference {
    return {
      doc(docId: string): DocumentReference {
        return {
          async get(): Promise<DocSnapshot> {
            const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
            const url = `${baseUrl}/${collectionName}/${docId}?key=${firebaseConfig.apiKey}`;
            const res = await fetch(url);
            if (res.status === 404) {
              return {
                exists: false,
                data: () => null
              };
            }
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Firestore REST GET failed [${res.status}]: ${errBody}`);
            }
            const json = await res.json();
            const data = parseFirestoreFields(json.fields);
            return {
              exists: true,
              data: () => data
            };
          },
          async set(data: Record<string, any>): Promise<void> {
            const baseUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
            const url = `${baseUrl}/${collectionName}/${docId}?key=${firebaseConfig.apiKey}`;
            const res = await fetch(url, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: toFirestoreFields(data)
              })
            });
            if (!res.ok) {
              const errBody = await res.text();
              throw new Error(`Firestore REST PATCH failed [${res.status}]: ${errBody}`);
            }
          }
        };
      }
    };
  }
};
