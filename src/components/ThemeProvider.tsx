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
    if (info.couleur_primaire) {
      root.style.setProperty('--school-primary', info.couleur_primaire);
    }
    if (info.police && FONTS[info.police]) {
      root.style.setProperty('--school-font', FONTS[info.police]);
    }
    if (info.taille_police) {
      root.style.setProperty('--school-font-size', `${info.taille_police}px`);
    }
  };

  const fetchTheme = () => {
    const token = localStorage.getItem('token');
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSchoolInfo(data);
          updateTheme(data);
        }
      })
      .catch(err => console.warn('Unable to fetch theme:', err));
  };

  React.useEffect(() => {
    fetchTheme();

    const handleThemeChange = () => {
      fetchTheme();
    };

    window.addEventListener('schoolInfoChanged', handleThemeChange);
    return () => window.removeEventListener('schoolInfoChanged', handleThemeChange);
  }, []);

  return <>{children}</>;
};
