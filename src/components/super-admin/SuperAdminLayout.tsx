import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  DollarSign, 
  Package, 
  BarChart3, 
  Settings, 
  ShieldCheck, 
  HelpCircle, 
  Megaphone, 
  Users2, 
  FileText, 
  Wrench,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User as UserIcon,
  Globe,
  Mail,
  Lock,
  History,
  Activity,
  Sparkles,
  School,
  Check
} from 'lucide-react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { toggleAIAssistant } from '../AIAssistantWidget';
import logo from '../../LOGO_MEGFIXAEDEUC_PRO.png';
import { LanguageSelector } from '../LanguageSelector';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../../lib/firebase';
import { syncCloudVaultWithFirestore } from '../../utils/cloudVaultSync';
import { apiFetch, isRateLimited, markRateLimited } from '../../utils/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MenuItem {
  title: string;
  icon: any;
  path?: string;
  submenu?: { title: string; path: string }[];
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: 'Tableau de bord',
    icon: LayoutDashboard,
    submenu: [
      { title: 'Vue d\'ensemble', path: '/super-admin' },
      { title: 'Statistiques', path: '/super-admin/stats' },
      { title: 'Activité récente', path: '/super-admin/activite' },
    ]
  },
  {
    title: 'Utilisateurs & Clients',
    icon: Users,
    submenu: [
      { title: 'Tous les utilisateurs', path: '/super-admin/users' },
      { title: 'Clients (Écoles)', path: '/super-admin/clients' },
      { title: 'Demandes d\'adhésion', path: '/super-admin/clients?tab=requests' },
      { title: 'Administrateurs', path: '/super-admin/admins' },
      { title: 'Utilisateurs actifs', path: '/super-admin/users/active' },
      { title: 'Utilisateurs inactifs', path: '/super-admin/users/inactive' },
    ]
  },
  {
    title: 'Offres & Abonnements',
    icon: Package,
    submenu: [
      { title: 'Planches des Offres & Tarifs', path: '/super-admin/plans' },
      { title: 'Abonnements & Licences', path: '/super-admin/subscriptions' },
      { title: 'Catalogue Comparatif', path: '/super-admin/catalog' },
      { title: 'Offre Produit & Matrice', path: '/super-admin/product' },
    ]
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    submenu: [
      { title: 'Acquisition', path: '/super-admin/analytics/acquisition' },
      { title: 'Engagement', path: '/super-admin/analytics/engagement' },
      { title: 'Rétention', path: '/super-admin/analytics/retention' },
      { title: 'Churn', path: '/super-admin/analytics/churn' },
      { title: 'Rapports', path: '/super-admin/analytics/reports' },
    ]
  },
  {
    title: 'Configuration Système',
    icon: Settings,
    submenu: [
      { title: 'Configuration App', path: '/super-admin/product/config' },
      { title: 'Notifications', path: '/super-admin/product/notifications' },
      { title: 'Emails automatiques', path: '/super-admin/product/emails' },
      { title: 'Pages publiques', path: '/super-admin/product/pages' },
      { title: 'Maintenance', path: '/super-admin/product/maintenance' },
    ]
  },
  {
    title: 'Support',
    icon: HelpCircle,
    submenu: [
      { title: 'Tickets', path: '/super-admin/support/tickets' },
      { title: 'Conversations', path: '/super-admin/support/chats' },
      { title: 'FAQ', path: '/super-admin/support/faq' },
      { title: 'Base de connaissances', path: '/super-admin/support/kb' },
    ]
  },
  {
    title: 'Marketing',
    icon: Megaphone,
    submenu: [
      { title: 'Campagnes', path: '/super-admin/marketing/campaigns' },
      { title: 'Codes promotionnels', path: '/super-admin/marketing/promos' },
      { title: 'Affiliés', path: '/super-admin/marketing/affiliates' },
    ]
  },
  {
    title: 'Sécurité',
    icon: ShieldCheck,
    submenu: [
      { title: 'Journal d\'activité', path: '/super-admin/security/logs' },
      { title: 'Sessions actives', path: '/super-admin/security/sessions' },
      { title: 'Rôles & permissions', path: '/super-admin/security/permissions' },
    ]
  },
  {
    title: 'Équipe',
    icon: Users2,
    submenu: [
      { title: 'Membres', path: '/super-admin/team' },
      { title: 'Invitations', path: '/super-admin/team/invites' },
    ]
  },
  {
    title: 'Journaux & Rapports',
    icon: FileText,
    submenu: [
      { title: 'Journal système', path: '/super-admin/logs/system' },
      { title: 'Journal financier', path: '/super-admin/logs/finance' },
      { title: 'Export de données', path: '/super-admin/logs/export' },
    ]
  },
  {
    title: 'Paramètres',
    icon: Settings,
    submenu: [
      { title: 'Général', path: '/super-admin/settings' },
      { title: 'Moyens de Paiement', path: '/super-admin/settings/payment' },
      { title: 'Compte Admin', path: '/super-admin/settings/account' },
      { title: 'API & Webhooks', path: '/super-admin/settings/api' },
      { title: 'Intégrations', path: '/super-admin/settings/integrations' },
    ]
  },
];

export default function SuperAdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [openMenus, setOpenMenus] = React.useState<string[]>([]);

  const toggleMenu = (title: string) => {
    setOpenMenus(prev => 
      prev.includes(title) 
        ? prev.filter(t => t !== title) 
        : [...prev, title]
    );
  };

  const isPathActive = (path: string) => location.pathname === path;
  const isMenuOpen = (title: string) => openMenus.includes(title);

  // Auto-open menu containing current path
  React.useEffect(() => {
    MENU_ITEMS.forEach(item => {
      if (item.submenu?.some(sub => location.pathname === sub.path)) {
        if (!openMenus.includes(item.title)) {
          setOpenMenus(prev => [...prev, item.title]);
        }
      }
    });
  }, [location.pathname]);

  // Real-time notifications for Super Admin
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = React.useState(false);
  const prevUnreadRef = React.useRef<number | null>(null);

  const fetchNotifications = React.useCallback(async () => {
    try {
      if (isRateLimited()) return;
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await apiFetch('/api/super-admin/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 429) {
        markRateLimited(10000);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        const newUnread = data.unreadCount || 0;
        
        // Notify Super Admin if new school registrations occur
        if (prevUnreadRef.current !== null && newUnread > prevUnreadRef.current) {
          const newest = data.notifications?.find((n: any) => n.lu === 0);
          if (newest) {
            toast.success(`🏫 ${newest.titre}\n${newest.message}`, {
              duration: 8000,
              icon: '🔔'
            });
          }
        }
        prevUnreadRef.current = newUnread;
        setNotifications(data.notifications || []);
        setUnreadCount(newUnread);
      }
    } catch (e) {
      // background silent poll
    }
  }, []);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (isRateLimited()) return;
      fetchNotifications();
    }, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const [cloudSyncLinked, setCloudSyncLinked] = React.useState<boolean | null>(null);
  const [cloudSyncBusy, setCloudSyncBusy] = React.useState(false);

  // Mirror and reconcile persisted requests/accounts vault with Firestore when Super Admin has an active Firebase session
  React.useEffect(() => {
    if (user?.role !== 'super_admin') return;
    let active = true;
    let serverCloudActive = false;

    const runCloudSync = (prioritizeRemote = false) => {
      syncCloudVaultWithFirestore({ prioritizeRemote })
        .then((res) => {
          if (!active || !res) return;
          if (res.reconciled > 0) {
            fetchNotifications();
            window.dispatchEvent(new CustomEvent('megafixa-cloud-reconciled', { detail: res }));
          }
        })
        .catch(() => {});
    };

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (!active) return;
      if (fbUser?.emailVerified) {
        setCloudSyncLinked(true);
        runCloudSync(true);
      } else if (!serverCloudActive) {
        setCloudSyncLinked(false);
      }
    });

    const intervalId = window.setInterval(() => {
      if (!active) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      runCloudSync(false);
    }, 60_000);

    let mutationSyncTimer: number | null = null;
    const handleMutationEvent = () => {
      if (!active || isRateLimited()) return;
      if (mutationSyncTimer !== null) {
        window.clearTimeout(mutationSyncTimer);
      }
      mutationSyncTimer = window.setTimeout(() => {
        mutationSyncTimer = null;
        if (active && !isRateLimited()) runCloudSync(false);
      }, 6000);
    };
    const handleVisibilityOrHide = () => {
      if (!active || isRateLimited()) return;
      if (document.visibilityState === 'hidden') {
        runCloudSync(false);
      }
    };

    window.addEventListener('app:data-updated', handleMutationEvent);
    window.addEventListener('schoolInfoChanged', handleMutationEvent);
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handleMutationEvent);

    const token = localStorage.getItem('token');
    if (token && !isRateLimited()) {
      apiFetch('/api/super-admin/persistence-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(r => (r.ok ? r.json() : null))
        .then(st => {
          if (active && st?.cloudSyncAvailable) {
            serverCloudActive = true;
            setCloudSyncLinked(true);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      if (mutationSyncTimer !== null) {
        window.clearTimeout(mutationSyncTimer);
      }
      window.clearInterval(intervalId);
      window.removeEventListener('app:data-updated', handleMutationEvent);
      window.removeEventListener('schoolInfoChanged', handleMutationEvent);
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handleMutationEvent);
      unsubscribe();
    };
  }, [user?.role, fetchNotifications]);

  const handleLinkCloudVault = async () => {
    if (cloudSyncBusy) return;
    setCloudSyncBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
      const res = await syncCloudVaultWithFirestore({ prioritizeRemote: true, throwOnError: true });
      if (!res) {
        setCloudSyncLinked(false);
        toast.error('Utilisez un compte Google Super Admin vérifié pour lier le Cloud Vault.');
        return;
      }
      setCloudSyncLinked(true);
      toast.success(
        res.pushed || res.reconciled > 0
          ? 'Sauvegarde Cloud Vault synchronisée avec succès !'
          : 'Session Cloud Vault liée (données déjà à jour).'
      );
      if (res.reconciled > 0) {
        fetchNotifications();
        window.dispatchEvent(new CustomEvent('megafixa-cloud-reconciled', { detail: res }));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Connexion Cloud annulée');
    } finally {
      setCloudSyncBusy(false);
    }
  };

  const markNotificationsAsRead = async (id?: number) => {
    try {
      const token = localStorage.getItem('token');
      await apiFetch('/api/super-admin/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, all: !id })
      });
      if (id) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: 1 } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, lu: 1 })));
        setUnreadCount(0);
      }
    } catch (e) {}
  };

  const superAdminLocation = useLocation();
  const superAdminContentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (superAdminLocation.hash) return;
    if (superAdminContentRef.current) {
      superAdminContentRef.current.scrollTop = 0;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [superAdminLocation.pathname, superAdminLocation.search, superAdminLocation.hash]);

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-x-clip">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px] z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-50 fixed inset-y-0 left-0 md:relative md:translate-x-0 shadow-2xl md:shadow-none max-w-[85vw]",
          isSidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full md:w-20 md:translate-x-0"
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2">
              <img src={logo} alt="Logo" className="h-8" />
              <span className="font-bold text-slate-800 text-sm">Super Admin</span>
            </div>
          ) : (
            <img src={logo} alt="Logo" className="h-8 mx-auto" />
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
          <nav className="px-2 space-y-1">
            {MENU_ITEMS.map((item) => (
              <div key={item.title}>
                {item.submenu ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.title)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                        openMenus.includes(item.title) 
                          ? "bg-slate-50 text-[#013efb]" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={20} className={cn(
                          "shrink-0",
                          openMenus.includes(item.title) ? "text-[#013efb]" : "text-slate-400 group-hover:text-slate-600"
                        )} />
                        {isSidebarOpen && <span>{item.title}</span>}
                      </div>
                      {isSidebarOpen && (
                        isMenuOpen(item.title) ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                      )}
                    </button>
                    
                    {isMenuOpen(item.title) && isSidebarOpen && (
                      <div className="overflow-hidden transition-all duration-200">
                        <div className="ml-9 mt-1 space-y-1 border-l-2 border-slate-100">
                          {item.submenu.map((sub) => (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={() => {
                                if (typeof window !== 'undefined' && window.innerWidth < 768) {
                                  setIsSidebarOpen(false);
                                }
                              }}
                              className={cn(
                                "block px-3 py-1.5 text-xs font-medium rounded-r-lg transition-all",
                                isPathActive(sub.path)
                                  ? "text-[#013efb] bg-[#013efb]/10 border-l-2 border-[#013efb] -ml-[2px]"
                                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                              )}
                            >
                              {sub.title}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path || '#'}
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.innerWidth < 768) {
                        setIsSidebarOpen(false);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group",
                      isPathActive(item.path || '')
                        ? "bg-[#013efb]/10 text-[#013efb]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon size={20} className={cn(
                      "shrink-0",
                      isPathActive(item.path || '') ? "text-[#013efb]" : "text-slate-400 group-hover:text-slate-600"
                    )} />
                    {isSidebarOpen && <span>{item.title}</span>}
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Bouton Assistant IA en dessous des options du menu latéral */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={() => toggleAIAssistant()}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#013efb] via-[#049ffb] to-[#fb5c03] hover:brightness-110 text-white shadow-sm hover:shadow transition-all group cursor-pointer",
              !isSidebarOpen && "justify-center px-2 py-2"
            )}
            title="Assistant IA MégafixaBot"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25 group-hover:scale-110 transition-transform">
                <Sparkles size={15} className="text-white" />
              </div>
              {isSidebarOpen && (
                <div className="text-left min-w-0">
                  <p className="text-xs font-bold leading-tight truncate flex items-center gap-1">
                    Assistant IA
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  </p>
                  <p className="text-[10px] text-white/80 leading-tight truncate">MégafixaBot 7j/7</p>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-white/20 text-white uppercase tracking-wider shrink-0 border border-white/20">
                Ouvrir
              </span>
            )}
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => logout()}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-clip">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between gap-2 px-2.5 sm:px-4 md:px-6 sticky top-0 z-30 safe-top">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] -ml-1 flex items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 shrink-0"
              aria-label="Ouvrir le menu"
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 md:hidden min-w-0">
              <img src={logo} alt="Logo" className="h-7 w-7 object-contain shrink-0" />
              <span className="font-bold text-slate-800 text-xs sm:text-sm truncate">Super Admin</span>
            </div>
            <div className="relative max-w-md w-full hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher une école, un utilisateur, une facture..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-full text-sm focus:ring-2 focus:ring-[#013efb]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {cloudSyncLinked === false && (
              <button
                type="button"
                onClick={handleLinkCloudVault}
                disabled={cloudSyncBusy}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold transition-colors"
                title="Lier le Cloud Vault Firestore pour garantir la réplication cloud"
              >
                <Globe size={13} className="text-amber-600" />
                <span>{cloudSyncBusy ? 'Sync...' : 'Activer Cloud Vault'}</span>
              </button>
            )}
            {/* Real-time Notification Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={cn(
                  "p-2 rounded-full relative transition-colors cursor-pointer",
                  showNotifDropdown ? "bg-[#013efb]/10 text-[#013efb]" : "text-slate-500 hover:bg-slate-100"
                )}
                title="Notifications Système Super Admin"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div
                  className="absolute -right-10 sm:right-0 mt-2 w-[calc(100vw-1rem)] max-w-sm sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden text-left animate-in fade-in duration-150"
                >
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell size={16} className="text-indigo-600" />
                        <h4 className="text-sm font-bold text-slate-900">Notifications Système</h4>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                            {unreadCount} nouvelle{unreadCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markNotificationsAsRead()}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <School className="w-8 h-8 mx-auto mb-2 opacity-30 text-indigo-500" />
                          <p className="text-xs font-semibold">Aucune notification pour le moment</p>
                          <p className="text-[10px] text-slate-400 mt-1">Vous serez notifié dès qu'une nouvelle école est créée.</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationsAsRead(notif.id);
                              setShowNotifDropdown(false);
                              if (notif.type === 'school_request' || notif.type === 'school_request_payment') {
                                navigate('/super-admin/clients?tab=requests');
                              } else {
                                navigate('/super-admin/clients');
                              }
                            }}
                            className={cn(
                              "p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3",
                              notif.lu === 0 ? "bg-indigo-50/40" : ""
                            )}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                              notif.lu === 0 ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                            )}>
                              <School size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {notif.titre}
                                </p>
                                {notif.lu === 0 && (
                                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                                <span>{new Date(notif.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                <span className="font-semibold text-indigo-600 flex items-center gap-0.5 hover:underline">
                                  Gérer l'école →
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                      <Link
                        to="/super-admin/clients"
                        onClick={() => setShowNotifDropdown(false)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Gérer les établissements (Clients) →
                      </Link>
                    </div>
                  </div>
                )}
            </div>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <LanguageSelector variant="dropdown" />
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <Link to="/super-admin/profile" className="flex items-center gap-3 pl-2 group cursor-pointer">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-none">{user?.nom}</p>
                <p className="text-[10px] font-medium text-indigo-600 uppercase mt-1">Super Administrateur</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border-2 border-indigo-50 group-hover:border-indigo-200 transition-all">
                <UserIcon size={20} />
              </div>
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div ref={superAdminContentRef} data-scroll-container="main" className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
