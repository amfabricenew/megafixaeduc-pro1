// Secure offline/static API fallback helper
// Multi-tenant security: Never download global database SQL checkpoints or bypass server authentication in browser storage.

export function parseSqlDump(_sql: string): Record<string, any[]> {
  return {};
}

// Clear any legacy insecure cloud table cache stored in browser localStorage
export async function getCloudTables(): Promise<Record<string, any[]>> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('megafixa_cloud_tables');
    }
  } catch {
    // ignore storage errors
  }
  return {};
}

// Do not forge multi-tenant data or bypass authentication on client fallback
export async function handleStaticApiFallback(_url: string, _init?: RequestInit): Promise<Response | null> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('megafixa_cloud_tables');
    }
  } catch {
    // ignore storage errors
  }
  return null;
}
