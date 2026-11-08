import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';
import { getWorkspaceAccessToken } from './google-workspace';

export const GMAIL_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
];

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});
GMAIL_SCOPES.forEach(scope => provider.addScope(scope));

// In-memory token caching (MANDATORY per Workspace Integration Skill)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export const initGmailAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const connectGmail = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google Gmail.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
      console.info('[Gmail Auth] La fenêtre contextuelle a été fermée par l’utilisateur.');
    } else if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('[Gmail Auth] La fenêtre pop-up a été bloquée par le navigateur.');
    } else {
      console.error('[Gmail Auth Error]', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGmailAccessToken = (): string | null => {
  return cachedAccessToken || getWorkspaceAccessToken();
};

export const disconnectGmail = async () => {
  cachedAccessToken = null;
};

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  snippet?: string;
  from?: string;
  to?: string;
  subject?: string;
  date?: string;
  isUnread?: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  bodyText?: string;
  bodyHtml?: string;
}

// Encode utf8 string to base64url format for Gmail API
function toBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Decode base64url string from Gmail API
function fromBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

// List user's messages
export async function listGmailMessages(options: { query?: string; maxResults?: number } = {}): Promise<GmailMessageSummary[]> {
  const token = getGmailAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google pour accéder à Gmail.");

  const { query = 'in:inbox', maxResults = 25 } = options;
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Erreur Gmail (${res.status}): ${errText}`);
  }

  const data = await res.json();
  if (!data.messages || data.messages.length === 0) {
    return [];
  }

  // Fetch summary metadata for the first batch of messages in parallel
  const details = await Promise.all(
    data.messages.slice(0, 15).map(async (m: { id: string; threadId: string }) => {
      try {
        const itemRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!itemRes.ok) return { id: m.id, threadId: m.threadId };
        const itemData = await itemRes.json();
        
        const headers: Record<string, string> = {};
        itemData.payload?.headers?.forEach((h: { name: string; value: string }) => {
          headers[h.name.toLowerCase()] = h.value;
        });

        return {
          id: m.id,
          threadId: m.threadId,
          snippet: itemData.snippet,
          subject: headers['subject'] || '(Sans objet)',
          from: headers['from'] || 'Expéditeur inconnu',
          to: headers['to'] || '',
          date: headers['date'] || '',
          isUnread: itemData.labelIds?.includes('UNREAD')
        };
      } catch {
        return { id: m.id, threadId: m.threadId };
      }
    })
  );

  return details;
}

// Get full message details
export async function getGmailMessage(messageId: string): Promise<GmailMessageDetail> {
  const token = getGmailAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google pour accéder à Gmail.");

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    throw new Error(`Impossible de récupérer le message Gmail: ${res.status}`);
  }

  const data = await res.json();
  const headers: Record<string, string> = {};
  data.payload?.headers?.forEach((h: { name: string; value: string }) => {
    headers[h.name.toLowerCase()] = h.value;
  });

  let bodyText = '';
  let bodyHtml = '';

  const extractBody = (part: any) => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText = fromBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml = fromBase64Url(part.body.data);
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(extractBody);
    }
  };

  if (data.payload) {
    extractBody(data.payload);
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet,
    subject: headers['subject'] || '(Sans objet)',
    from: headers['from'] || 'Expéditeur inconnu',
    to: headers['to'] || '',
    date: headers['date'] || '',
    isUnread: data.labelIds?.includes('UNREAD'),
    bodyText: bodyText || data.snippet,
    bodyHtml: bodyHtml
  };
}

// Send an email through the user's Gmail account (with MIME RFC 2822 formatting)
export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  body: string;
  html?: string;
  fromName?: string;
}): Promise<{ id: string; threadId: string }> {
  const token = getGmailAccessToken();
  if (!token) throw new Error("Veuillez vous connecter avec Google pour autoriser l'envoi via Gmail.");

  const { to, subject, body, html, fromName = "MégafixaEduc Pro" } = params;

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const boundary = `boundary_${Date.now()}`;

  let rawMessage = '';
  rawMessage += `To: ${to}\r\n`;
  rawMessage += `Subject: ${utf8Subject}\r\n`;
  rawMessage += `MIME-Version: 1.0\r\n`;

  if (html) {
    rawMessage += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n\r\n`;
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    rawMessage += `${body}\r\n\r\n`;
    rawMessage += `--${boundary}\r\n`;
    rawMessage += `Content-Type: text/html; charset="UTF-8"\r\n\r\n`;
    rawMessage += `${html}\r\n\r\n`;
    rawMessage += `--${boundary}--\r\n`;
  } else {
    rawMessage += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    rawMessage += `${body}\r\n`;
  }

  const encodedMessage = toBase64Url(rawMessage);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Échec de l'envoi Gmail (${res.status}): ${errorBody}`);
  }

  return await res.json();
}
