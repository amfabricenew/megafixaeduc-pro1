import { apiFetch } from '../utils/api';
import React from 'react';

interface SchoolInfo {
  nom: string;
  couleur_primaire: string;
  police: string;
  taille_police: number;
}

const FONTS: Record<string, string> = {
  inter: '"Inter", sans-serif',
  roboto: '"Roboto", sans-serif',
  playfair: '"Playfair Display", serif',
  mono: '"JetBrains Mono", monospace'
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schoolInfo, setSchoolInfo] = React.useState<SchoolInfo | null>(null);

  const updateTheme = (info: SchoolInfo) => {
    const root = document.documentElement;
    const primaryColor = info.couleur_primaire || '#013efb';
    root.style.setProperty('--school-primary', primaryColor);
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--sidebar-primary', primaryColor);
    if (info.police && FONTS[info.police]) {
      root.style.setProperty('--school-font', FONTS[info.police]);
    }
    if (info.taille_police) {
      root.style.setProperty('--school-font-size', `${info.taille_police}px`);
    }
  };

  const lastThemeFetchRef = React.useRef<number>(0);

  const fetchTheme = (force = false) => {
    const now = Date.now();
    if (!force && now - lastThemeFetchRef.current < 3000) return;
    lastThemeFetchRef.current = now;
    let token: string | null = null;
    try {
      token = window.localStorage?.getItem('token') || null;
    } catch {
      token = null;
    }
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSchoolInfo(data);
          updateTheme(data);
        }
      })
      .catch(err => console.warn('Unable to fetch theme:', err));
  };

  React.useEffect(() => {
    fetchTheme(true);

    const handleThemeChange = () => fetchTheme(true);
    const handleSync = () => fetchTheme(false);

    window.addEventListener('schoolInfoChanged', handleThemeChange);
    window.addEventListener('app:data-updated', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('schoolInfoChanged', handleThemeChange);
      window.removeEventListener('app:data-updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, []);

  return <>{children}</>;
};
