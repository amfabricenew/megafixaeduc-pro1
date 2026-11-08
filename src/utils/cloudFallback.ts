import { db, doc, getDoc, setDoc } from '../lib/firebase';

interface LocalState {
  tables: Record<string, any[]>;
  lastLoaded: number;
}

let cachedState: LocalState | null = null;
let syncPromise: Promise<LocalState> | null = null;

// Parse standard SQL INSERT statements from global_checkpoint into table arrays
export function parseSqlDump(sql: string): Record<string, any[]> {
  const tables: Record<string, any[]> = {};
  const insertRegex = /INSERT OR REPLACE INTO\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES\s*\(([^;]+)\);/gi;
  let match: RegExpExecArray | null;

  while ((match = insertRegex.exec(sql)) !== null) {
    const tableName = match[1];
    const colNames = match[2].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    const rawVals = match[3];

    // Basic value extractor
    const vals: any[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < rawVals.length; i++) {
      const char = rawVals[i];
      if (char === "'" && (i === 0 || rawVals[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        vals.push(parseRawVal(current.trim()));
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) {
      vals.push(parseRawVal(current.trim()));
    }

    if (!tables[tableName]) {
      tables[tableName] = [];
    }

    const rowObj: Record<string, any> = {};
    colNames.forEach((col, idx) => {
      rowObj[col] = vals[idx] !== undefined ? vals[idx] : null;
    });

    tables[tableName].push(rowObj);
  }

  return tables;
}

function parseRawVal(raw: string): any {
  if (raw === 'NULL' || raw === 'null') return null;
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  const num = Number(raw);
  if (!isNaN(num) && raw.length > 0) return num;
  if (raw.toLowerCase() === 'true') return 1;
  if (raw.toLowerCase() === 'false') return 0;
  return raw;
}

// Load tables from Firestore cloud checkpoint or localStorage
export async function getCloudTables(): Promise<Record<string, any[]>> {
  if (cachedState && Date.now() - cachedState.lastLoaded < 30000) {
    return cachedState.tables;
  }

  if (syncPromise) return (await syncPromise).tables;

  syncPromise = (async () => {
    try {
      // 1. Try local storage cache first
      const stored = localStorage.getItem('megafixa_cloud_tables');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          cachedState = { tables: parsed, lastLoaded: Date.now() };
        } catch (e) {}
      }

      // 2. Fetch fresh checkpoint from Firestore with soft timeout race
      const fetchPromise = getDoc(doc(db, 'backups', 'global_checkpoint'));
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Firestore checkpoint timeout')), 3500)
      );
      const snap = await Promise.race([fetchPromise, timeoutPromise]);
      if (snap && snap.exists()) {
        const data = snap.data();
        if (data?.sql_dump) {
          const parsed = parseSqlDump(data.sql_dump);
          cachedState = { tables: parsed, lastLoaded: Date.now() };
          try {
            localStorage.setItem('megafixa_cloud_tables', JSON.stringify(parsed));
          } catch (e) {}
          return cachedState;
        }
      }
    } catch (err) {
      // Fallback to cached tables gracefully
    }

    if (!cachedState) {
      cachedState = { tables: {}, lastLoaded: Date.now() };
    }
    return cachedState;
  })();

  const result = await syncPromise;
  syncPromise = null;
  return result.tables;
}

// Handle client-side fallback responses for GitHub Pages
export async function handleStaticApiFallback(url: string, init?: RequestInit): Promise<Response | null> {
  const isStaticHost = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('github.io') ||
    window.location.hostname.includes('web.app') ||
    window.location.hostname.includes('firebaseapp.com')
  );

  const cleanUrl = url.split('?')[0];
  const queryParams = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
  const method = (init?.method || 'GET').toUpperCase();

  const tables = await getCloudTables();

  const okJson = (data: any) => new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

  // School info
  if (cleanUrl.endsWith('/api/school-info')) {
    const list = tables['school_info'] || [];
    return okJson(list[0] || {
      id: 1,
      nom: "MEGAFIXAEDUC_PRO",
      adresse: "Cotonou, Bénin",
      telephone: "+229 01 61 10 79 18",
      email: "megafixaservices01@gmail.com",
      couleur_primaire: "#10b981",
      code_ecole: "MEGAFIXAEDUC_PRO"
    });
  }

  // Active academic year
  if (cleanUrl.endsWith('/api/annees/active') || cleanUrl.endsWith('/api/annees')) {
    const list = tables['annees_scolaires'] || [];
    if (cleanUrl.endsWith('/active')) {
      return okJson(list.find(a => a.est_active === 1 || a.est_active_effective === 1) || list[0] || {
        id: 1,
        libelle: "2025-2026",
        est_active: 1
      });
    }
    return okJson(list);
  }

  // Classes
  if (cleanUrl.endsWith('/api/classes')) {
    return okJson(tables['classes'] || []);
  }

  // Students
  if (cleanUrl.endsWith('/api/eleves')) {
    return okJson(tables['eleves'] || []);
  }

  // Subjects
  if (cleanUrl.endsWith('/api/matieres')) {
    return okJson(tables['matieres'] || []);
  }

  // Grades / Notes
  if (cleanUrl.includes('/api/notes')) {
    return okJson(tables['notes'] || []);
  }

  // Teachers
  if (cleanUrl.endsWith('/api/enseignants')) {
    return okJson(tables['enseignants'] || []);
  }

  // Dashboard stats
  if (cleanUrl.endsWith('/api/stats') || cleanUrl.endsWith('/api/stats/chart')) {
    const eleves = tables['eleves'] || [];
    const classes = tables['classes'] || [];
    const enseignants = tables['enseignants'] || [];
    return okJson({
      totalStudents: eleves.length,
      totalClasses: classes.length,
      totalTeachers: enseignants.length,
      totalRevenue: 0,
      monthlyRevenue: []
    });
  }

  // Alerts
  if (cleanUrl.endsWith('/api/alertes')) {
    return okJson(tables['alertes'] || []);
  }

  // Auth / Login fallback for static demo
  if (cleanUrl.endsWith('/api/auth/login') && method === 'POST') {
    let body: any = {};
    try {
      body = JSON.parse(init?.body as string || '{}');
    } catch (e) {}

    const users = tables['utilisateurs'] || [];
    const found = users.find(u => u.email === body.email) || users[0];

    return okJson({
      token: 'static_gh_token_' + Date.now(),
      user: found || {
        id: 1,
        nom: "Administrateur",
        email: body.email || "admin@megafixa.com",
        role: "admin",
        permissions: ["all"]
      }
    });
  }

  return null;
}
