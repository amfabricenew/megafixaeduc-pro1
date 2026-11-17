import { apiFetch } from '../utils/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

declare global {
  interface Window {
    Brevo?: any;
  }
}

interface User {
  id: number;
  nom: string;
  email: string;
  role: string;
  permissions?: any[];
  enseignant_id?: number | null;
  eleve_id?: number | null;
  cycle?: string | null;
  google_id?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  schoolPlan: string | null;
  years: any[];
  selectedYearId: number | null;
  selectedYear: any | null;
  login: (token: string, userData: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshPlan: () => Promise<void>;
  fetchYears: () => Promise<void>;
  setSelectedYearId: (id: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const safeGet = (key: string): string | null => {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

const safeSet = (key: string, value: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore storage errors in restricted webviews
  }
};

const safeRemove = (key: string): void => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
};

const isPublicUnblockedRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const p = (window.location.pathname || '/').toLowerCase();
  return (
    p === '/' ||
    p === '/welcome' ||
    p === '/login' ||
    p === '/parent-login' ||
    p === '/signup' ||
    p.startsWith('/formulaire-enseignant') ||
    p.startsWith('/collecte-enseignant') ||
    p.startsWith('/public/') ||
    p.startsWith('/f/') ||
    p.startsWith('/verifier-document') ||
    p.startsWith('/verify-doc') ||
    p.startsWith('/demande-compte-ecole') ||
    p.startsWith('/demande-ecole') ||
    p.startsWith('/school-request') ||
    p.startsWith('/paiement') ||
    p.startsWith('/subscription-payment') ||
    p.startsWith('/setup-password')
  );
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => !isPublicUnblockedRoute());
  const [schoolPlan, setSchoolPlan] = useState<string | null>(null);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearIdState] = useState<number | null>(null);

  const fetchYears = async () => {
    try {
      const res = await apiFetch('/api/annees');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setYears(data);
          
          // Auto-select year logic
          const storedYearId = safeGet('selected_year_id');
          if (storedYearId) {
            const id = parseInt(storedYearId);
            if (data.some((y: any) => y.id === id)) {
              setSelectedYearIdState(id);
              return;
            }
          }
          
          // Fallback: active year
          const active = data.find((y: any) => y.est_active === 1);
          let newId = null;
          if (active) {
            newId = active.id;
          } else if (data.length > 0) {
            newId = data[0].id;
          }

          if (newId) {
            setSelectedYearIdState(newId);
            safeSet('selected_year_id', newId.toString());
          }
        } else {
          console.error('Expected array from /api/annees, got:', data);
          setYears([]);
        }
      }
    } catch (e) {
      console.warn('Unable to fetch years:', e);
    }
  };

  const setSelectedYearId = (id: number) => {
    setSelectedYearIdState(id);
    safeSet('selected_year_id', id.toString());
    // Trigger a window event so other components can react if needed
    window.dispatchEvent(new CustomEvent('academic_year_changed', { detail: { yearId: id } }));
    
    // Force a reload to ensure all data across the app is fresh from the new year context
    // We use a small timeout to allow any immediate state updates or feedback (like closing a dropdown)
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const userJsonRef = React.useRef<string>('');
  const refreshInFlightRef = React.useRef<Promise<void> | null>(null);

  const refreshPlan = async () => {
    try {
      const res = await apiFetch('/api/school-subscription');
      if (res.ok) {
        const data = await res.json();
        const nextPlan = data.plan || 'standard';
        setSchoolPlan(prev => (prev === nextPlan ? prev : nextPlan));
      }
    } catch (e) {
      console.warn('Unable to refresh school plan:', e);
      setSchoolPlan(prev => prev || 'standard');
    }
  };

  const refreshUser = async () => {
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const promise = (async () => {
      try {
        const token = safeGet('token');
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await apiFetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          const serialized = JSON.stringify(userData);
          if (serialized !== userJsonRef.current) {
            userJsonRef.current = serialized;
            safeSet('user', serialized);
            setUser(userData);
          }
        } else if (response.status === 401 || response.status === 403) {
          logout();
        } else {
          console.warn(`Auth sync failed with status ${response.status}. Keeping session.`);
        }
      } catch (error) {
        console.warn('Unable to refresh user data:', error);
      } finally {
        setLoading(false);
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = promise;
    return promise;
  };

  const login = (token: string, userData: User) => {
    safeRemove('logged_out');
    safeSet('token', token);
    const serialized = JSON.stringify(userData);
    userJsonRef.current = serialized;
    safeSet('user', serialized);
    safeSet('activeSpace', 'all');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('activeSpaceChanged'));
    }
    setUser(userData);
    refreshPlan();
    fetchYears();
  };

  const logout = () => {
    lastIdentifiedEmailRef.current = null;
    userJsonRef.current = '';
    safeSet('logged_out', 'true');
    safeRemove('token');
    safeRemove('user');
    safeRemove('selected_year_id');
    safeRemove('activeSpace');
    setUser(null);
    setSchoolPlan(null);
    setYears([]);
    setSelectedYearIdState(null);
  };

  useEffect(() => {
    const publicRoute = isPublicUnblockedRoute();
    const isLoggedOut = safeGet('logged_out') === 'true';
    const token = safeGet('token');

    if (publicRoute) {
      setLoading(false);
      // Do not block public forms or pages waiting on auth checks
      if (!isLoggedOut && token) {
        refreshUser().catch(() => {});
      }
      return;
    }

    if (isLoggedOut || !token) {
      setUser(null);
      safeRemove('user');
      safeRemove('token');
      setLoading(false);
      return;
    }

    // Safety guard: never stay stuck in loading screen beyond 6 seconds
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 6000);

    // Verify token with backend before granting access
    refreshUser()
      .then(() => {
        refreshPlan();
        fetchYears();
      })
      .finally(() => {
        clearTimeout(safetyTimer);
      });

    return () => clearTimeout(safetyTimer);
  }, []);

  // Polling for updates and listening for permission & cross-level sync events
  const lastSyncRef = React.useRef<number>(0);
  const lastIdentifiedEmailRef = React.useRef<string | null>(null);

  useEffect(() => {
    const email = user?.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (lastIdentifiedEmailRef.current === email) return;
    lastIdentifiedEmailRef.current = email;

    try {
      window.Brevo = window.Brevo || [];
      window.Brevo.push(function () {
        if (window.Brevo && typeof window.Brevo.identify === 'function') {
          const nameParts = (user?.nom || '').trim().split(/\s+/).filter(Boolean);
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          window.Brevo.identify({
            identifiers: {
              email_id: email,
            },
            attributes: {
              ...(firstName ? { FIRSTNAME: firstName } : {}),
              ...(lastName ? { LASTNAME: lastName } : {}),
              ...(user?.role ? { ROLE: user.role } : {}),
            },
          });
        }
      });
    } catch {
      // Ignore tracker failures if blocked by browser privacy extensions
    }
  }, [user?.email, user?.nom, user?.role]);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;

    const handlePermissionSync = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - lastSyncRef.current < 4000) return;
      lastSyncRef.current = now;
      refreshUser();
      refreshPlan();
      fetchYears();
    };

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      refreshUser();
      refreshPlan();
      fetchYears();
    }, 30000);

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'school_permissions_version' || e.key === 'user') {
        handlePermissionSync();
      }
    };

    window.addEventListener('focus', handlePermissionSync);
    window.addEventListener('school_permissions_updated', handlePermissionSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handlePermissionSync);
      window.removeEventListener('school_permissions_updated', handlePermissionSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId]);

  const selectedYear = (Array.isArray(years) && typeof years.find === 'function') ? years.find(y => y.id === selectedYearId) || null : null;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      schoolPlan, 
      years, 
      selectedYearId, 
      selectedYear,
      login, 
      logout, 
      refreshUser, 
      refreshPlan,
      fetchYears,
      setSelectedYearId
    }}>
      {loading && !isPublicUnblockedRoute() ? (
        <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#013efb] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500">Chargement en cours...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
