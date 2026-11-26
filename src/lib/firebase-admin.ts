import { initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { OAuth2Client } from 'google-auth-library';

const firebaseApp = getApps().length
  ? getApp()
  : initializeApp({
      projectId: firebaseConfig.projectId,
    });

export const adminAuth = getAuth(firebaseApp);

const client = new OAuth2Client(firebaseConfig.oAuthClientId);

export const auth = {
  async verifyIdToken(idToken: string) {
    // 1. Verify via Firebase Admin SDK (no IAM role needed for verifyIdToken)
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (decoded?.email) {
        if (decoded.email_verified === false) {
          throw new Error("Adresse email Google non vérifiée.");
        }
        return {
          uid: decoded.uid,
          email: decoded.email,
          email_verified: true,
          name: (decoded as any).name || decoded.email.split('@')[0],
          picture: (decoded as any).picture,
        };
      }
    } catch (e: any) {
      if (e?.message?.includes("non vérifiée")) throw e;
    }

    // 2. Fallback: Firebase Identity Toolkit lookup
    if (firebaseConfig.apiKey) {
      try {
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseConfig.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        );
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
      }
    }

    // 3. Fallback: Google OAuth2Client verifyIdToken
    try {
      const audiences = [
        firebaseConfig.oAuthClientId,
        firebaseConfig.projectId,
        process.env.GOOGLE_CLIENT_ID,
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
    } catch {}

    throw new Error("Jeton Google invalide, expiré ou non vérifié.");
  },
};
