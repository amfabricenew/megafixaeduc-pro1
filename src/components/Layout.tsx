import { motion } from 'framer-motion';
import { apiFetch } from '../utils/api';
import TimeSyncWarning from './TimeSyncWarning';
import React from 'react';
import ErrorBoundary from './ErrorBoundary';
import logo from '../LOGO_MEGFIXAEDEUC_PRO.png';
import { 
  LayoutDashboard, 
  Users, 
  User,
  UserSquare2, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Contact,
  Receipt,
  DollarSign,
  Calendar, 
  ArrowRightCircle,
  AlertCircle,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Building2,
  Clock,
  Phone,
  Mail,
  History,
  Chrome,
  Download,
  FileText,
  FileSpreadsheet,
  KeyRound,
  UserCheck,
  Radio,
  UserPlus,
  Home as HomeIcon,
  DoorOpen,
  Package,
  Library,
  BookOpenCheck,
  ClipboardCheck,
  ArrowLeftRight,
  Sparkles,
  ShieldCheck,
  School,
  UserCog,
  Book,
  PenTool,
  IdCard,
  FileStack,
  CalendarClock,
  BookMarked,
  BellRing,
  BookOpenText,
  Layers,
  CheckSquare, 
  Lock
} from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTranslation } from '../contexts/TranslationContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationBell from './NotificationBell';
import { toggleAIAssistant } from './AIAssistantWidget';
import { hasPageAccess, getPageAccessMode } from '../utils/permissions';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { LanguageSelector } from './LanguageSelector';


function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout() {
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const { user, logout, years, selectedYearId, setSelectedYearId } = useAuth();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const activeYear = years.find((y: any) => y.id === selectedYearId) || years.find((y: any) => y.est_active === 1) || years[0];
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [localUser, setLocalUser] = React.useState<any>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const fetchSchoolInfo = React.useCallback(() => {
    apiFetch('/api/school-info')
      .then(res => res.json())
      .then(data => setSchoolInfo(data));
  }, []);

  React.useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setLocalUser(JSON.parse(savedUser));
    }
    fetchSchoolInfo();
    
    // Listen for custom events
    window.addEventListener('schoolInfoChanged', fetchSchoolInfo);
    return () => {
      window.removeEventListener('schoolInfoChanged', fetchSchoolInfo);
    };
  }, [fetchSchoolInfo]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const [activeSpace, setActiveSpace] = React.useState<'all' | 'primaire' | 'secondaire'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('activeSpace') as 'all' | 'primaire' | 'secondaire';
      if (stored && ['all', 'primaire', 'secondaire'].includes(stored)) return stored;
      if (window.location.pathname.includes('primaire')) return 'primaire';
      if (window.location.pathname.includes('secondaire')) return 'secondaire';
    }
    return 'all';
  });

  // Space lock verification (Super admin has unhindered access)
  const isSuperAdmin = localUser?.role === 'super_admin';
  const isPrimaireLocked = !isSuperAdmin && (
    (schoolInfo?.espace_primaire_actif === 0) ||
    (localUser?.espace_primaire_actif === 0)
  );
  const isSecondaireLocked = !isSuperAdmin && (
    (schoolInfo?.espace_secondaire_actif === 0) ||
    (localUser?.espace_secondaire_actif === 0)
  );

  const primaireLockMotif = schoolInfo?.espace_primaire_motif_verrouillage || localUser?.espace_primaire_motif_verrouillage || "L'accès au cycle Maternelle & Primaire a été verrouillé pour cet établissement par le Super Administrateur. Veuillez contacter l'administration de votre école ou le support technique pour débloquer cet espace.";
  const secondaireLockMotif = schoolInfo?.espace_secondaire_motif_verrouillage || localUser?.espace_secondaire_motif_verrouillage || "L'accès au cycle Secondaire a été verrouillé pour cet établissement par le Super Administrateur. Veuillez contacter l'administration de votre école ou le support technique pour débloquer cet espace.";

  const [lockedModalInfo, setLockedModalInfo] = React.useState<{ spaceName: string; motif: string } | null>(null);

  const updateActiveSpace = (space: 'all' | 'primaire' | 'secondaire') => {
    setActiveSpace(space);
    if (typeof window !== 'undefined') {
      localStorage.setItem('activeSpace', space);
      window.dispatchEvent(new Event('activeSpaceChanged'));
    }
  };

  React.useEffect(() => {
    if (location.pathname.includes('primaire')) {
      if (isPrimaireLocked) {
        setLockedModalInfo({
          spaceName: "Maternelle & Primaire",
          motif: primaireLockMotif
        });
        updateActiveSpace('all');
        navigate('/accueil');
      } else {
        updateActiveSpace('primaire');
      }
    } else if (location.pathname.includes('secondaire')) {
      if (isSecondaireLocked) {
        setLockedModalInfo({
          spaceName: "Secondaire",
          motif: secondaireLockMotif
        });
        updateActiveSpace('all');
        navigate('/accueil');
      } else {
        updateActiveSpace('secondaire');
      }
    }
  }, [location.pathname, isPrimaireLocked, isSecondaireLocked]);

  const itemsPrimaire = [
    { group: 'Tableau de Bord', icon: HomeIcon, label: 'Accueil Principal', path: '/accueil' },
    { group: 'Tableau de Bord', icon: LayoutDashboard, label: 'Accueil Primaire', path: '/accueil-primaire' },
    { group: 'Tableau de Bord', icon: LayoutDashboard, label: 'Bord Primaire', path: '/tableau-de-bord-primaire' },
    { group: 'Pédagogie', icon: GraduationCap, label: 'Classes (Primaire)', path: '/classes-primaire' },
    { group: 'Pédagogie', icon: Users, label: 'Élèves (Primaire)', path: '/eleves-primaire' },
    { group: 'Pédagogie', icon: ArrowRightCircle, label: 'Gestion des Passages & Redoublements (Primaire)', path: '/promotions-primaire' },
    { group: 'Pédagogie', icon: UserSquare2, label: 'Maîtres & Maîtresses', path: '/enseignants-primaire' },
    { group: 'Pédagogie', icon: BookOpen, label: 'Matières Primaire', path: '/matieres-primaire' },
    { group: 'Pédagogie', icon: Calendar, label: 'Emploi du Temps', path: '/emploi-du-temps-primaire' },
    { group: 'Évaluations', icon: ClipboardList, label: 'Évaluations & Notes', path: '/notes-primaire' },
    { group: 'Évaluations', icon: BookOpenCheck, label: 'Épreuves (Primaire)', path: '/epreuves-primaire' },
    { group: 'Évaluations', icon: ClipboardCheck, label: "Espace Examens", path: "/examens-primaire" },
    { group: 'Communication', icon: BookOpenText, label: 'Bibliothèque Primaire', path: '/bibliotheque-primaire' },
    { group: 'Communication', icon: BookMarked, label: 'Bibliothèque Scolaire', path: '/bibliotheque-physique' },
    { group: 'Finance', icon: Receipt, label: 'Paiements (Primaire)', path: '/paiements-primaire' },
    { group: 'Finance', icon: ArrowLeftRight, label: 'Trésorerie & Dépenses (Primaire)', path: '/finances-primaire' },
  ];

  const itemsSecondaire = [
    { group: 'Tableau de Bord', icon: HomeIcon, label: 'Accueil Principal', path: '/accueil' },
    { group: 'Tableau de Bord', icon: LayoutDashboard, label: 'Accueil Secondaire', path: '/accueil-secondaire' },
    { group: 'Tableau de Bord', icon: LayoutDashboard, label: 'Bord Secondaire', path: '/tableau-de-bord-secondaire' },
    { group: 'Pédagogie', icon: GraduationCap, label: 'Classes (Secondaire)', path: '/classes-secondaire' },
    { group: 'Pédagogie', icon: Users, label: 'Élèves (Secondaire)', path: '/eleves-secondaire' },
    { group: 'Pédagogie', icon: ArrowRightCircle, label: 'Gestion des Passages & Redoublements (Secondaire)', path: '/promotions-secondaire' },
    { group: 'Pédagogie', icon: UserSquare2, label: 'Enseignants (Secondaire)', path: '/enseignants-secondaire' },
    { group: 'Pédagogie', icon: UserCheck, label: 'Collecte Enseignants (Secondaire)', path: '/collecte-enseignants-secondaire' },
    { group: 'Pédagogie', icon: BookOpen, label: 'Matières Secondaire', path: '/matieres-secondaire' },
    { group: 'Pédagogie', icon: Calendar, label: 'Emploi du Temps', path: '/emploi-du-temps-secondaire' },
    { group: 'Évaluations', icon: ClipboardList, label: 'Notes & Bulletins', path: '/notes-secondaire' },
    { group: 'Évaluations', icon: BookOpenCheck, label: 'Épreuves (Secondaire)', path: '/epreuves-secondaire' },
    { group: 'Évaluations', icon: ClipboardCheck, label: "Espace Examens", path: "/examens-secondaire" },
    { group: 'Communication', icon: Library, label: 'Bibliothèque Secondaire', path: '/bibliotheque-secondaire' },
    { group: 'Communication', icon: BookMarked, label: 'Bibliothèque Scolaire', path: '/bibliotheque-physique' },
    { group: 'Finance', icon: Receipt, label: 'Paiements (Secondaire)', path: '/paiements-secondaire' },
    { group: 'Finance', icon: ArrowLeftRight, label: 'Trésorerie & Dépenses (Secondaire)', path: '/finances-secondaire' },
  ];

  const itemsShared = [
    { group: 'Administration', icon: Radio, label: 'Sessions Actives', path: '/admin/sessions-actives' },
    { group: 'Administration', icon: DoorOpen, label: 'Bâtiments & Salles', path: '/batiments-salles' },
    { group: 'Administration', icon: Package, label: 'Ressources Matérielles', path: '/ressources-materielles' },
    { group: 'Administration', icon: IdCard, label: 'Cartes & Badges', path: '/cartes-et-badges' },
    { group: 'Administration', icon: UserPlus, label: 'Recrutement & Inscriptions', path: '/recrutement-inscriptions' },
    { group: 'Administration', icon: UserCheck, label: 'Collecte Enseignants', path: '/collecte-enseignants' },
    { group: 'Administration', icon: UserCog, label: 'Personnel Admin.', path: '/personnel-administratif' },
    { group: 'Administration', icon: School, label: 'Info École', path: '/ecole' },
    { group: 'Communication', icon: BookOpen, label: 'Bibliothèque Numérique', path: '/bibliotheque' },
    { group: 'Communication', icon: BookMarked, label: 'Bibliothèque Scolaire', path: '/bibliotheque-physique' },
    { group: 'Communication', icon: BookOpenCheck, label: 'Banque d\'Épreuves', path: '/epreuves' },
    { group: 'Communication', icon: PenTool, label: 'Épreuves Compositions', path: '/epreuves-composition' },
    { group: 'Communication', icon: MessageSquare, label: 'Messagerie & SMS', path: '/messagerie' },
    { group: 'Google Workspace', icon: Layers, label: 'Suite Google Workspace', path: '/workspace' },
    { group: 'Google Workspace', icon: Calendar, label: 'Google Calendar (Agenda)', path: '/workspace?tab=calendar' },
    { group: 'Google Workspace', icon: CheckSquare, label: 'Google Tasks (Tâches)', path: '/workspace?tab=tasks' },
    { group: 'Google Workspace', icon: FileText, label: 'Google Docs (Rapports)', path: '/workspace?tab=docs' },
    { group: 'Google Workspace', icon: FileSpreadsheet, label: 'Google Sheets (Tableurs)', path: '/workspace?tab=sheets' },
    { group: 'Google Workspace', icon: Mail, label: 'Google Gmail (Boîte)', path: '/workspace?tab=gmail' },
    { group: 'Finance', icon: Receipt, label: 'Paiements Scolarité', path: '/paiements' },
    { group: 'Finance', icon: DollarSign, label: 'Salaires & Paie', path: '/salaires-enseignants' },
    { group: 'Finance', icon: ArrowLeftRight, label: 'Trésorerie & Dépenses (Entrées/Sorties)', path: '/finances' },
    { group: 'Système', icon: History, label: 'Audit Logs', path: '/audit-logs' },
    { group: 'Système', icon: Settings, label: 'Paramètres', path: '/parametres' },
    { group: 'Intelligence Artificielle', icon: Sparkles, label: 'Laboratoire IA', path: '/lab-ia' },
  ];

  const itemsAll = [
    { group: 'Tableau de Bord', icon: HomeIcon, label: 'Accueil Principal', path: '/accueil' },
    { group: 'Tableau de Bord', icon: LayoutDashboard, label: 'Tableau de bord Général', path: '/tableau-de-bord' },
    { group: 'Pédagogie', icon: User, label: 'Mon Enfant', path: '/mon-enfant' },
    ...itemsShared
  ];

  const itemsTeacher = [
    { group: 'Tableau de Bord', icon: HomeIcon, label: 'Accueil Enseignant', path: '/accueil' },
    { 
      group: 'Pédagogie', 
      icon: GraduationCap, 
      label: localUser?.cycle?.toLowerCase().includes('secondaire') ? 'Mes classes' : 'Ma classe', 
      path: localUser?.cycle?.toLowerCase().includes('secondaire') ? '/mes-classes' : '/ma-classe' 
    },
    { group: 'Pédagogie', icon: Clock, label: 'Mes cours', path: '/mes-cours', hidden: localUser?.cycle?.toLowerCase().includes('primaire') || localUser?.cycle?.toLowerCase().includes('maternelle') },
    { 
      group: 'Pédagogie', 
      icon: Calendar, 
      label: 'Emploi du temps', 
      path: (localUser?.cycle?.toLowerCase().includes('primaire') || localUser?.cycle?.toLowerCase().includes('maternelle') || activeSpace === 'primaire')
        ? '/emploi-du-temps-primaire'
        : (localUser?.cycle?.toLowerCase().includes('secondaire') || activeSpace === 'secondaire')
          ? '/emploi-du-temps-secondaire'
          : '/emploi-du-temps' 
    },
    { group: 'Pédagogie', icon: FileSpreadsheet, label: 'Notes des classes', path: '/notes' },
    { group: 'Pédagogie', icon: BookOpenCheck, label: 'Dépôt & Épreuves', path: '/epreuves' },
    { group: 'Communication', icon: BookOpen, label: 'Bibliothèque Numérique', path: '/bibliotheque' },
    { group: 'Communication', icon: CalendarClock, label: 'Demandes de modif.', path: '/emploi-du-temps-requests' },
    { group: 'Communication', icon: FileStack, label: 'Documents administratifs', path: '/documents-administratifs' },
    { group: 'Communication', icon: MessageSquare, label: 'Messagerie & SMS', path: '/messagerie' },
    { group: 'Google Workspace', icon: Layers, label: 'Suite Google Workspace', path: '/workspace' },
    { group: 'Google Workspace', icon: Calendar, label: 'Google Calendar (Agenda)', path: '/workspace?tab=calendar' },
    { group: 'Google Workspace', icon: CheckSquare, label: 'Google Tasks (Tâches)', path: '/workspace?tab=tasks' },
    { group: 'Communication', icon: BellRing, label: 'Alertes', path: '/alertes' },
    { group: 'Intelligence Artificielle', icon: Sparkles, label: 'Laboratoire IA', path: '/lab-ia' },
    { group: 'Système', icon: UserCheck, label: 'Mon Compte', path: '/mon-compte' },
  ].filter(item => !item.hidden);

  const itemsParent = [
    { group: 'Tableau de Bord', icon: HomeIcon, label: 'Accueil Espace Parent', path: '/accueil' },
    { group: 'Pédagogie', icon: User, label: 'Dossier Mon Enfant', path: '/mon-enfant' },
    { group: 'Pédagogie', icon: Calendar, label: 'Emploi du temps', path: '/emploi-du-temps' },
    { group: 'Communication', icon: MessageSquare, label: 'Messagerie & SMS', path: '/messagerie' },
    { group: 'Communication', icon: BellRing, label: 'Alertes', path: '/alertes' },
    { group: 'Communication', icon: FileStack, label: 'Documents & Demandes', path: '/documents-demandes' },
  ];

  let currentSpaceItems = itemsAll;
  if (localUser?.role === 'enseignant') {
    currentSpaceItems = itemsTeacher;
  } else if (localUser?.role === 'parent') {
    currentSpaceItems = itemsParent;
  } else if (activeSpace === 'primaire') {
    currentSpaceItems = [...itemsPrimaire, ...itemsShared];
  } else if (activeSpace === 'secondaire') {
    currentSpaceItems = [...itemsSecondaire, ...itemsShared];
  }

  // Ensure items are strictly unique by path
  const seenPaths = new Set<string>();
  const uniqueSpaceItems = currentSpaceItems.filter(item => {
    if (seenPaths.has(item.path)) return false;
    seenPaths.add(item.path);
    return true;
  });

  const filteredSidebarItems = uniqueSpaceItems.filter(item => {
    const currentUser = localUser || { role: 'user' };
    return hasPageAccess(currentUser.permissions, item.path, currentUser.role);
  }).map(item => {
    const accessMode = getPageAccessMode(localUser?.permissions, item.path, localUser?.role);
    // Dynamic label for teachers/personnel
    if (item.path === '/documents-demandes' && (localUser?.role === 'enseignant' || localUser?.role === 'surveillant' || localUser?.role === 'comptable')) {
      return { ...item, label: 'Mes Documents', accessMode };
    }
    return { ...item, accessMode };
  });

  const groupedSidebarItems = filteredSidebarItems.reduce((acc: any, item: any) => {
    const groupName = item.group || "Autres";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {});

  const groupOrder = ['Tableau de Bord', 'Pédagogie', 'Évaluations', 'Administration', 'Finance', 'Communication', 'Système', 'Autres'];
  const sortedGroupNames = Object.keys(groupedSidebarItems).sort((a, b) => {
    return groupOrder.indexOf(a) - groupOrder.indexOf(b);
  });

  // Apply school styles
  React.useEffect(() => {
    if (schoolInfo) {
      document.documentElement.style.setProperty('--school-primary', schoolInfo.couleur_primaire || '#10b981');
      
      const fontFamilies: Record<string, string> = {
        inter: '"Inter", sans-serif',
        roboto: '"Roboto", sans-serif',
        playfair: '"Playfair Display", serif',
        mono: '"JetBrains Mono", monospace'
      };
      
      document.documentElement.style.setProperty('--school-font', fontFamilies[schoolInfo.police] || '"Inter", sans-serif');
    }
  }, [schoolInfo]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-school">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          {schoolInfo?.logo ? (
            <img src={schoolInfo.logo} alt="Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <img src={logo} alt="Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
          )}
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 truncate max-w-[150px] text-sm leading-tight">{schoolInfo?.nom || import.meta.env.VITE_SCHOOL_NAME || 'MégafixaEduc'}</span>
            {activeYear && <span className="text-[10px] text-primary font-bold uppercase tracking-wider">{activeYear.libelle}</span>}
          </div>
        </div>
          <div className="flex items-center gap-1.5 sm:gap-2">

            <LanguageSelector variant="dropdown" className="scale-95" />
            <PWAInstallButton />
            <NotificationBell />
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-full transition-colors">
              {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 hidden md:flex items-center gap-3">
            {schoolInfo?.logo ? (
              <img src={schoolInfo.logo} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <img src={logo} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-slate-900 leading-tight truncate max-w-[140px]">{schoolInfo?.nom || import.meta.env.VITE_SCHOOL_NAME || 'MégafixaEduc'}</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500">
                  {localUser?.role === 'enseignant' ? t('Espace Enseignant') : localUser?.role === 'parent' ? t('Espace Parents') : t('Administration')}
                </p>
                {activeYear && (
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded-md uppercase">
                    {activeYear.libelle}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Space Selector Tabs (Hidden for teachers & parents) */}
          {localUser?.role !== 'enseignant' && localUser?.role !== 'parent' && (
            <div className="px-4 pt-1 pb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-1">{t("Choix de l'espace")}</p>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => {
                    updateActiveSpace('all');
                    navigate('/accueil');
                  }}
                  className={cn(
                    "py-1.5 px-1 rounded-lg transition-all text-center truncate relative z-10",
                    activeSpace === 'all'
                      ? "bg-primary text-white font-bold shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  {t('Général')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isPrimaireLocked) {
                      setLockedModalInfo({
                        spaceName: "Maternelle & Primaire",
                        motif: primaireLockMotif
                      });
                      return;
                    }
                    updateActiveSpace('primaire');
                    navigate('/accueil-primaire');
                  }}
                  className={cn(
                    "py-1.5 px-1 rounded-lg transition-all text-center truncate relative z-10 flex items-center justify-center gap-1",
                    activeSpace === 'primaire'
                      ? "bg-primary text-white font-bold shadow-sm"
                      : isPrimaireLocked
                        ? "text-rose-600 bg-rose-50/50 hover:bg-rose-100/60"
                        : "text-slate-600 hover:text-slate-900"
                  )}
                  title={isPrimaireLocked ? `Espace Verrouillé : ${primaireLockMotif}` : undefined}
                >
                  {isPrimaireLocked && <Lock size={11} className="shrink-0 text-rose-500" />}
                  <span>{t('Primaire')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isSecondaireLocked) {
                      setLockedModalInfo({
                        spaceName: "Secondaire",
                        motif: secondaireLockMotif
                      });
                      return;
                    }
                    updateActiveSpace('secondaire');
                    navigate('/accueil-secondaire');
                  }}
                  className={cn(
                    "py-1.5 px-1 rounded-lg transition-all text-center truncate relative z-10 flex items-center justify-center gap-1",
                    activeSpace === 'secondaire'
                      ? "bg-primary text-white font-bold shadow-sm"
                      : isSecondaireLocked
                        ? "text-rose-600 bg-rose-50/50 hover:bg-rose-100/60"
                        : "text-slate-600 hover:text-slate-900"
                  )}
                  title={isSecondaireLocked ? `Espace Verrouillé : ${secondaireLockMotif}` : undefined}
                >
                  {isSecondaireLocked && <Lock size={11} className="shrink-0 text-rose-500" />}
                  <span>{t('Secondaire')}</span>
                </button>
              </div>
            </div>
          )}

          <nav className="flex-1 px-4 py-4 space-y-6 overflow-y-auto custom-scrollbar">
            {sortedGroupNames.map((groupName) => (
              <div key={groupName} className="space-y-1">
                <h3 className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center justify-between">
                  {t(groupName)}
                </h3>
                <div className="space-y-1">
                  {groupedSidebarItems[groupName].map((item: any) => {
                    const isActive = location.pathname === item.path;
                    const notifCount = getUnreadCountForPath(item.path);
                    const isReadOnly = item.accessMode === 'read_only' && localUser?.role !== 'admin' && localUser?.role !== 'super_admin' && localUser?.role !== 'fonde';
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => {
                          setIsSidebarOpen(false);
                          if (notifCount > 0) {
                            markPathNotificationsAsRead(item.path);
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-bold transition-all group relative",
                          isActive 
                            ? "bg-primary text-white shadow-md shadow-primary/20" 
                            : notifCount > 0
                              ? "text-slate-900 bg-rose-50/90 hover:bg-rose-100 border border-rose-200"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative shrink-0 flex items-center justify-center">
                            <item.icon size={18} className={isActive ? "text-white shrink-0" : notifCount > 0 ? "text-rose-600 shrink-0" : "text-slate-400 shrink-0 group-hover:text-slate-600"} />
                            {notifCount > 0 && (
                              <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                              </span>
                            )}
                          </div>
                          {notifCount > 0 && (
                            <span 
                              title={`${notifCount} notification(s) non lue(s) pour ${t(item.label)}`}
                              className={cn(
                                "px-1.5 py-0.5 text-[9px] font-black rounded-full shadow-sm flex items-center justify-center min-w-[16px] shrink-0",
                                isActive ? "bg-white text-primary" : "bg-rose-600 text-white"
                              )}
                            >
                              {notifCount}
                            </span>
                          )}
                          <span className="truncate">{t(item.label)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                          {isReadOnly && !isActive && notifCount === 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 shrink-0 uppercase">
                              Lect.
                            </span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Bouton de l'Assistant IA en dessous des options du menu latéral */}
          <div className="px-3.5 py-2.5 border-t border-slate-100 bg-gradient-to-b from-slate-50/50 to-slate-100/60">
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                toggleAIAssistant();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-primary-600 to-indigo-600 hover:from-emerald-700 hover:via-primary-700 hover:to-indigo-700 text-white shadow-sm hover:shadow transition-all group cursor-pointer"
              title="Ouvrir l'Assistant IA MégafixaBot"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25 group-hover:scale-110 transition-transform shadow-2xs">
                  <Sparkles size={15} className="text-amber-300" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold leading-tight truncate flex items-center gap-1.5">
                    Assistant IA
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  </p>
                  <p className="text-[10px] text-white/80 leading-tight truncate">MégafixaBot 7j/7</p>
                </div>
              </div>
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/20 text-white uppercase tracking-wider shrink-0 border border-white/20 group-hover:bg-white/30 transition-colors">
                Ouvrir
              </span>
            </button>
          </div>

          <div className="p-4 border-t">
            <div className="mb-3 px-1 flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Langue / Lang</span>
              <LanguageSelector variant="dropdown" />
            </div>
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs relative">
                {user?.nom?.charAt(0).toUpperCase()}
                {user?.google_id && (
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                    <Chrome size={10} className="text-red-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.nom}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2.5 w-full text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              {t('logout')}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col min-h-screen">
        <TimeSyncWarning />
        <div className="hidden md:flex items-center justify-end px-8 pt-6 gap-3">
          {/* Academic Year Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Calendar size={14} className="text-slate-400" />
            <select
              value={selectedYearId || ''}
              onChange={async (e) => {
                const targetId = Number(e.target.value);
                if (targetId) {
                  try {
                    await apiFetch(`/api/annees/${targetId}/activate`, { method: 'PATCH' });
                  } catch (err) {
                    console.warn("Auto-activation error on backend:", err);
                  }
                  setSelectedYearId(targetId);
                }
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              {years.map((y: any) => (
                <option key={y.id} value={y.id}>
                  Année {y.libelle} {y.est_active_effective || y.est_active ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>


          <LanguageSelector variant="dropdown" />
          <PWAInstallButton />
          <NotificationBell />
        </div>
        
        <div className="p-4 md:px-8 md:pb-8 flex-1 w-full max-w-7xl mx-auto">
          {/* First Login Password Change Reminder Banner */}
          {(localUser?.role === 'enseignant' || localUser?.role === 'admin') && (localUser?.is_first_login === 1 || localUser?.is_first_login === true || localUser?.is_first_login === '1') && location.pathname !== '/mon-compte' && (
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-amber-400/40 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
                  <KeyRound size={22} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    Sécurisez votre compte : Modification du mot de passe requise
                  </h4>
                  <p className="text-xs sm:text-sm text-amber-100 mt-0.5 max-w-2xl">
                    Pour garantir la sécurité de vos données, nous vous demandons de personnaliser votre mot de passe initial dans la page <strong>Mon Compte</strong>.
                  </p>
                </div>
              </div>
              <Link
                to="/mon-compte"
                className="px-5 py-2.5 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all shrink-0 flex items-center gap-2 whitespace-nowrap self-end sm:self-auto"
              >
                <KeyRound size={16} />
                Accéder à Mon Compte
              </Link>
            </div>
          )}

          {/* Global Features Lock Banner */}
          {!isSuperAdmin && (schoolInfo?.features_locked === 1 || localUser?.features_locked === 1) && (
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-rose-500/40 animate-pulse">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/30">
                  <Lock size={22} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                    Fonctionnalités Verrouillées
                  </h4>
                  <p className="text-xs sm:text-sm text-rose-100 mt-0.5 max-w-2xl">
                    {schoolInfo?.features_locked_motif || localUser?.features_locked_motif || "Toutes les fonctionnalités de modification ont été suspendues pour votre établissement par le Super Administrateur."}
                  </p>
                </div>
              </div>
              <div className="px-5 py-2.5 bg-white/10 rounded-xl border border-white/20 text-white font-bold text-xs sm:text-sm whitespace-nowrap">
                Accès en lecture seule
              </div>
            </div>
          )}

          <ErrorBoundary inline key={location.pathname + location.search}>
            <Outlet />
          </ErrorBoundary>
        </div>
        
        {/* Global Footer */}
        <footer className="mt-8 pt-8 border-t border-slate-200 text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 text-center md:text-left">
              <p className="text-xs font-medium italic opacity-70">
                MEGAFIXA Tech, La technologie et le numérique au service de l'excellence.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs">
                  <Phone size={14} className="text-primary shrink-0" />
                  <span>+229 0161107918 / +229 0141264238 (WhatsApp)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Mail size={14} className="text-primary shrink-0" />
                  <a href="mailto:megafixatecheduc@gmail.com" className="hover:underline">megafixatecheduc@gmail.com</a>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <img src={logo} alt="Mégafixa Tech" className="w-8 h-8 object-contain opacity-80" referrerPolicy="no-referrer" />
            </div>
          </div>
        </footer>
      </main>

      {/* Modal d'Alerte d'Espace Verrouillé */}
      {lockedModalInfo && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-rose-200 overflow-hidden text-left p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <Lock size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                  Accès Restreint
                </span>
                <h3 className="font-black text-slate-900 text-base mt-1">
                  Espace {lockedModalInfo.spaceName} Verrouillé
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLockedModalInfo(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-2 text-xs">
              <p className="font-bold text-rose-900 leading-snug">
                {lockedModalInfo.motif}
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                L'accès à cet espace a été verrouillé pour votre établissement par le Super Administrateur de la plateforme MégafixaEduc Pro.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Assistance & Déverrouillage :</p>
              <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                <Mail size={12} className="text-slate-400" />
                <span>contact@megafixa.com</span>
              </p>
              <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                <Phone size={12} className="text-slate-400" />
                <span>(+229) 0161107918 / 0141264238</span>
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setLockedModalInfo(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Compris, fermer
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
