import { apiFetch } from '../utils/api';
import React, { createContext, useContext, useEffect, useState } from 'react';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
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
          const storedYearId = localStorage.getItem('selected_year_id');
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
            localStorage.setItem('selected_year_id', newId.toString());
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
    localStorage.setItem('selected_year_id', id.toString());
    // Trigger a window event so other components can react if needed
    window.dispatchEvent(new CustomEvent('academic_year_changed', { detail: { yearId: id } }));
    
    // Force a reload to ensure all data across the app is fresh from the new year context
    // We use a small timeout to allow any immediate state updates or feedback (like closing a dropdown)
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const refreshPlan = async () => {
    try {
      const res = await apiFetch('/api/school-subscription');
      if (res.ok) {
        const data = await res.json();
        setSchoolPlan(data.plan || 'standard');
      }
    } catch (e) {
      console.warn('Unable to refresh school plan:', e);
      if (!schoolPlan) setSchoolPlan('standard');
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      
      const response = await apiFetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      } else if (response.status === 401 || response.status === 403) {
        // Token is definitely invalid or expired
        logout();
      } else {
        // For other errors (500, 502, 503, 504), keep the current session
        // but perhaps log it for debugging
        console.warn(`Auth sync failed with status ${response.status}. Keeping session.`);
      }
    } catch (error) {
      console.warn('Unable to refresh user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = (token: string, userData: User) => {
    localStorage.removeItem('logged_out');
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    refreshPlan();
    fetchYears();
  };

  const logout = () => {
    localStorage.setItem('logged_out', 'true');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selected_year_id');
    setUser(null);
    setSchoolPlan(null);
    setYears([]);
    setSelectedYearIdState(null);
  };

  useEffect(() => {
    const isLoggedOut = localStorage.getItem('logged_out') === 'true';
    const token = localStorage.getItem('token');

    if (isLoggedOut || !token) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setLoading(false);
      return;
    }

    // Verify token with backend before granting access
    refreshUser().then(() => {
      refreshPlan();
      fetchYears();
    });
  }, []);

  // Polling for updates and listening for permission sync events
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      refreshUser();
      refreshPlan();
      fetchYears();
    }, 60000); // 60 seconds interval to reduce server load and browser re-renders

    const handlePermissionSync = () => {
      refreshUser();
      refreshPlan();
      fetchYears();
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'school_permissions_version' || e.key === 'user') {
        refreshUser();
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
  }, [user]);

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
      {!loading && children}
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
