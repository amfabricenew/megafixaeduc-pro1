import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { auth } from './firebase';

export const WORKSPACE_SCOPES = [
  'https://mail.google.com/',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});
WORKSPACE_SCOPES.forEach(scope => provider.addScope(scope));

// In-memory token caching (MANDATORY per Workspace Integration Skill)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener. Call this on app load.
export const initWorkspaceAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check for redirect result if returning from a redirect auth flow
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          if (onAuthSuccess) onAuthSuccess(result.user, cachedAccessToken);
        }
      }
    })
    .catch((err) => {
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/popup-blocked') {
        console.warn('[Google Workspace] Redirect auth check notice:', err?.message || err);
      }
    });

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

export const connectWorkspace = async (preferRedirect = false): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    if (preferRedirect) {
      await signInWithRedirect(auth, provider);
      return new Promise<{ user: User; accessToken: string }>(() => {});
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Impossible d'obtenir le jeton d'accès Google Workspace.");
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.message?.includes('popup-closed-by-user')) {
      console.info('[Google Workspace Auth] La fenêtre contextuelle a été fermée par l’utilisateur.');
    } else if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('[Google Workspace Auth] La fenêtre pop-up a été bloquée par le navigateur.');
    } else {
      console.error('[Google Workspace Auth Error]', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getWorkspaceAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const disconnectWorkspace = async () => {
  cachedAccessToken = null;
};

/* =========================================================================
   1. GOOGLE CALENDAR API
   ========================================================================= */

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink?: string;
  status?: string;
}

export async function listCalendarEvents(options: {
  timeMin?: string;
  timeMax?: string;
  maxResults?: number;
} = {}): Promise<CalendarEvent[]> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const {
    timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    maxResults = 50
  } = options;

  let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}`;
  if (options.timeMax) {
    url += `&timeMax=${encodeURIComponent(options.timeMax)}`;
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur Google Calendar (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    id: item.id,
    summary: item.summary || '(Événement sans titre)',
    description: item.description,
    location: item.location,
    start: item.start || {},
    end: item.end || {},
    htmlLink: item.htmlLink,
    status: item.status
  }));
}

export async function createCalendarEvent(event: {
  summary: string;
  description?: string;
  location?: string;
  startDateTime: string; // ISO string
  endDateTime: string;   // ISO string
}): Promise<CalendarEvent> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const payload = {
    summary: event.summary,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.startDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    },
    end: {
      dateTime: event.endDateTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Échec de la création de l'événement Calendar (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Échec de suppression de l'événement (${res.status}): ${err}`);
  }
}

/* =========================================================================
   2. GOOGLE TASKS API
   ========================================================================= */

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  updated?: string;
}

export async function listTaskLists(): Promise<GoogleTaskList[]> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur Google Tasks Lists (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.items || [];
}

export async function listTasks(taskListId: string = '@default'): Promise<GoogleTaskItem[]> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur récupération Google Tasks (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.items || []).map((t: any) => ({
    id: t.id,
    title: t.title || '(Tâche sans titre)',
    notes: t.notes,
    status: t.status === 'completed' ? 'completed' : 'needsAction',
    due: t.due,
    updated: t.updated
  }));
}

export async function createGoogleTask(taskListId: string = '@default', task: {
  title: string;
  notes?: string;
  due?: string; // ISO date format e.g. YYYY-MM-DDT00:00:00.000Z
}): Promise<GoogleTaskItem> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: task.title,
      notes: task.notes,
      due: task.due
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur création Google Task (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function updateGoogleTaskStatus(
  taskListId: string = '@default',
  taskId: string,
  completed: boolean
): Promise<GoogleTaskItem> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      status: completed ? 'completed' : 'needsAction'
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur mise à jour tâche (${res.status}): ${err}`);
  }

  return await res.json();
}

export async function deleteGoogleTask(taskListId: string = '@default', taskId: string): Promise<void> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 404) {
    const err = await res.text();
    throw new Error(`Erreur suppression tâche (${res.status}): ${err}`);
  }
}

/* =========================================================================
   3. GOOGLE DOCS API & DRIVE
   ========================================================================= */

export interface GoogleDriveDocFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export async function listGoogleDocs(): Promise<GoogleDriveDocFile[]> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const q = encodeURIComponent("mimeType='application/vnd.google-apps.document' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc&pageSize=25`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur récupération documents Google Docs (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function createGoogleDocWithTemplate(title: string, bodyContent: string): Promise<{
  documentId: string;
  title: string;
  webViewLink: string;
}> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  // 1. Create document
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Erreur création Google Doc (${createRes.status}): ${err}`);
  }

  const doc = await createRes.json();
  const documentId = doc.documentId;

  // 2. Insert initial formatted text into document if provided
  if (bodyContent && bodyContent.trim().length > 0) {
    try {
      await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: `${bodyContent}\n`
              }
            }
          ]
        })
      });
    } catch (e) {
      console.warn('Could not insert initial text in Google Doc:', e);
    }
  }

  return {
    documentId,
    title,
    webViewLink: `https://docs.google.com/document/d/${documentId}/edit`
  };
}

/* =========================================================================
   4. GOOGLE SHEETS API & DRIVE
   ========================================================================= */

export interface GoogleDriveSheetFile {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
}

export async function listGoogleSheets(): Promise<GoogleDriveSheetFile[]> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const q = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc&pageSize=25`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur récupération tableurs Google Sheets (${res.status}): ${err}`);
  }

  const data = await res.json();
  return data.files || [];
}

export async function createGoogleSpreadsheetWithData(
  title: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
}> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title }
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Erreur création Google Sheets (${createRes.status}): ${err}`);
  }

  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const spreadsheetUrl = sheetData.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Header & Rows
  const values = [
    headers,
    ...rows.map(row => row.map(cell => cell === null || cell === undefined ? '' : String(cell)))
  ];

  if (values.length > 0) {
    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values
        })
      }
    );

    if (!updateRes.ok) {
      // If default sheet tab has localized name like Feuil1, try appending or writing to range without sheet prefix
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values })
        }
      ).catch(() => {});
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl
  };
}

export async function readSpreadsheetValues(spreadsheetId: string, range: string = 'A1:Z100'): Promise<{
  values: string[][];
}> {
  const token = getWorkspaceAccessToken();
  if (!token) throw new Error("Veuillez connecter votre compte Google Workspace.");

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Erreur lecture Google Sheets (${res.status}): ${err}`);
  }

  const data = await res.json();
  return { values: data.values || [] };
}
