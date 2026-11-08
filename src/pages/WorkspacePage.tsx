import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Calendar, 
  CheckSquare, 
  FileText, 
  FileSpreadsheet, 
  Mail, 
  LogOut, 
  ShieldCheck, 
  Sparkles,
  Layers,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  connectWorkspace, 
  disconnectWorkspace, 
  getWorkspaceAccessToken, 
  initWorkspaceAuth 
} from '../lib/google-workspace';
import { GoogleCalendarView } from '../components/workspace/GoogleCalendarView';
import { GoogleTasksView } from '../components/workspace/GoogleTasksView';
import { GoogleDocsView } from '../components/workspace/GoogleDocsView';
import { GoogleSheetsView } from '../components/workspace/GoogleSheetsView';
import GmailInboxView from '../components/GmailInboxView';
import { toast } from 'react-hot-toast';

export const WorkspacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'calendar';
  const [activeTab, setActiveTab] = useState<'calendar' | 'tasks' | 'docs' | 'sheets' | 'gmail'>(
    ['calendar', 'tasks', 'docs', 'sheets', 'gmail'].includes(initialTab) ? initialTab : 'calendar'
  );

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    const unsub = initWorkspaceAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
        setPopupBlocked(false);
      },
      () => {
        setHasToken(false);
      }
    );
    return () => unsub();
  }, []);

  const handleConnect = async (useRedirect = false) => {
    setIsConnecting(true);
    setPopupBlocked(false);
    try {
      const res = await connectWorkspace(useRedirect);
      if (res?.user) {
        setCurrentUser(res.user);
        setHasToken(true);
        toast.success('Connecté à Google Workspace avec succès !');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        toast('Connexion annulée.');
      } else if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked')) {
        setPopupBlocked(true);
        toast.error('La fenêtre de connexion a été bloquée par votre navigateur. Autorisez les pop-ups ou utilisez le bouton de redirection.', { duration: 6000 });
      } else {
        toast.error(err.message || 'Erreur lors de la connexion Google');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWorkspace();
    setHasToken(false);
    toast.success('Session Google Workspace déconnectée.');
  };

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Top Banner & Workspace Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-indigo-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md text-indigo-300 border border-white/10">
              <Sparkles size={13} className="text-amber-400" />
              <span>Google Workspace Professionnel Éducatif</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Suite Google Workspace Scolaire
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Gérez votre établissement avec les outils officiels de Google : Agenda partagé, Tâches pédagogiques, Rapports Docs, Tableurs Sheets et Gmail.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {hasToken ? (
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 pl-3 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2.5">
                  {currentUser?.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Profile" 
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-white/20" 
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                      {currentUser?.email?.slice(0, 2).toUpperCase() || 'GW'}
                    </div>
                  )}
                  <div className="hidden sm:block text-left text-xs">
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>{currentUser?.displayName || 'Compte Google'}</span>
                      <ShieldCheck size={13} className="text-emerald-400" />
                    </div>
                    <div className="text-slate-300 text-[11px] truncate max-w-[150px]">
                      {currentUser?.email}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="p-2 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors"
                  title="Déconnecter Google Workspace"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConnect(false)}
                  disabled={isConnecting}
                  className="px-5 py-3 rounded-2xl bg-white text-slate-800 text-xs font-bold hover:bg-slate-100 shadow-xl transition-all flex items-center gap-2.5 disabled:opacity-50"
                >
                  {/* Official Google G Logo SVG */}
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isConnecting ? 'Connexion en cours...' : 'Connecter Google Workspace'}</span>
                </button>

                {popupBlocked && (
                  <button
                    type="button"
                    onClick={() => handleConnect(true)}
                    disabled={isConnecting}
                    className="px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xl transition-all flex items-center gap-2"
                  >
                    <span>Continuer par redirection</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {popupBlocked && (
          <div className="mt-4 p-3.5 bg-amber-500/20 border border-amber-400/40 rounded-2xl text-amber-100 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base">⚠️</span>
              <span>
                La fenêtre pop-up de connexion a été bloquée par votre navigateur. Autorisez les fenêtres pop-up pour ce site ou utilisez le bouton <strong>« Continuer par redirection »</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleConnect(true)}
              className="px-3 py-1.5 bg-amber-400 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-300 shrink-0"
            >
              Lancer la redirection
            </button>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 overflow-x-auto scrollbar-none">
        {[
          { id: 'calendar' as const, label: 'Google Calendar', icon: Calendar, color: 'text-blue-600' },
          { id: 'tasks' as const, label: 'Google Tasks', icon: CheckSquare, color: 'text-teal-600' },
          { id: 'docs' as const, label: 'Google Docs', icon: FileText, color: 'text-indigo-600' },
          { id: 'sheets' as const, label: 'Google Sheets', icon: FileSpreadsheet, color: 'text-emerald-600' },
          { id: 'gmail' as const, label: 'Gmail', icon: Mail, color: 'text-rose-600' },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon size={16} className={isActive ? tab.color : 'text-slate-400'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {!hasToken ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-14 text-center max-w-xl mx-auto shadow-sm space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-inner">
            <Layers size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800">
              Connexion Google requise
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Pour accéder aux événements de l'agenda, à vos listes de tâches, rédiger des documents et synchroniser des tableurs, connectez votre compte Google en toute sécurité.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-100 transition-all inline-flex items-center gap-2.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isConnecting ? 'Autorisation...' : 'Se connecter avec Google'}</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Jeton sécurisé strictement en mémoire, aucune persistance locale.</span>
          </div>
        </div>
      ) : (
        <div>
          {activeTab === 'calendar' && <GoogleCalendarView />}
          {activeTab === 'tasks' && <GoogleTasksView />}
          {activeTab === 'docs' && <GoogleDocsView />}
          {activeTab === 'sheets' && <GoogleSheetsView />}
          {activeTab === 'gmail' && <GmailInboxView />}
        </div>
      )}
    </div>
  );
};

export default WorkspacePage;
