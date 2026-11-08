import React from 'react';
import { 
  Bell, 
  ExternalLink, 
  Check, 
  X, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  MessageSquare, 
  BookOpenCheck, 
  Calendar, 
  ClipboardList, 
  FileText, 
  Users, 
  CreditCard,
  ArrowRight,
  Sparkles,
  Clock
} from 'lucide-react';
import { useNotifications, AppNotification, getNotificationTargetRoute } from '../contexts/NotificationContext';

function getConcernedPageInfo(notif: AppNotification) {
  const route = getNotificationTargetRoute(notif);
  if (route === '/documents-demandes') return { label: 'Page : Documents & Demandes', Icon: FileText };
  if (route === '/emploi-du-temps-requests') return { label: 'Page : Demandes de Modif (EDT & Notes)', Icon: Clock };
  if (route === '/epreuves') return { label: 'Page : Épreuves', Icon: BookOpenCheck };
  if (route === '/messagerie') return { label: 'Page : Messagerie', Icon: MessageSquare };
  if (route === '/notes') return { label: 'Page : Notes & Bulletins', Icon: ClipboardList };
  if (route === '/emploi-du-temps') return { label: 'Page : Emploi du temps', Icon: Calendar };
  if (route === '/alertes') return { label: 'Page : Alertes', Icon: AlertCircle };
  if (route === '/paiements') return { label: 'Page : Paiements', Icon: CreditCard };
  return { label: 'Notification système', Icon: Bell };
}

function getTypeDetails(type?: string) {
  switch (type) {
    case 'warning':
      return {
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
        cardBorder: 'border-l-4 border-l-amber-500',
        iconColor: 'text-amber-600',
        buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        Icon: AlertTriangle,
        label: 'Avertissement',
      };
    case 'error':
    case 'danger':
      return {
        badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
        cardBorder: 'border-l-4 border-l-rose-500',
        iconColor: 'text-rose-600',
        buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
        Icon: AlertCircle,
        label: 'Urgent',
      };
    case 'success':
      return {
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        cardBorder: 'border-l-4 border-l-emerald-500',
        iconColor: 'text-emerald-600',
        buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        Icon: CheckCircle2,
        label: 'Validé',
      };
    case 'info':
    default:
      return {
        badgeBg: 'bg-primary-100 text-primary-800 border-primary-200',
        cardBorder: 'border-l-4 border-l-primary-600',
        iconColor: 'text-primary-600',
        buttonBg: 'bg-primary-600 hover:bg-primary-700 text-white',
        Icon: Bell,
        label: 'Information',
      };
  }
}

export default function FloatingNotificationOverlay() {
  const { 
    floatingNotifs, 
    selectedDetailNotif, 
    openNotification, 
    dismissFromFloating, 
    closeDetailModal 
  } = useNotifications();

  // Show at most 3 notifications in the foreground stack to keep screen clean and ergonomic
  const visibleNotifs = floatingNotifs.slice(0, 3);
  const remainingCount = Math.max(0, floatingNotifs.length - 3);

  return (
    <>
      {/* Floating Notifications Container - always in front of the active page until opened */}
      {visibleNotifs.length > 0 && (
        <aside 
          aria-label="Notifications actives en attente d'ouverture"
          className="fixed top-5 right-4 sm:right-6 md:right-8 z-[9990] flex flex-col gap-3.5 w-[calc(100vw-2rem)] sm:w-96 max-w-md pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4"
        >
          {visibleNotifs.map((notif: AppNotification) => {
            const typeConfig = getTypeDetails(notif.type);
            const pageInfo = getConcernedPageInfo(notif);
            const TypeIcon = typeConfig.Icon;
            const PageIcon = pageInfo.Icon;

            return (
              <div
                key={notif.id}
                role="alert"
                aria-live="assertive"
                className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/90 ${typeConfig.cardBorder} p-4 sm:p-5 transition-all duration-300 hover:shadow-primary-500/10 hover:border-slate-300 flex flex-col gap-3 group relative`}
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-600"></span>
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${typeConfig.badgeBg}`}>
                      <TypeIcon size={12} />
                      {typeConfig.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <PageIcon size={12} className="text-slate-500" />
                      {pageInfo.label}
                    </span>
                  </div>

                  {/* Dismiss / Mark read button */}
                  <button
                    type="button"
                    onClick={() => dismissFromFloating(notif.id)}
                    className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors"
                    title="Fermer et marquer comme lu"
                    aria-label="Fermer la notification"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content */}
                <div 
                  className="cursor-pointer space-y-1"
                  onClick={() => openNotification(notif)}
                  title="Cliquez pour ouvrir la notification"
                >
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition-colors leading-snug">
                    {notif.titre}
                  </h4>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Footer and Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(notif.date_creation).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => dismissFromFloating(notif.id)}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Check size={13} />
                      <span>Lu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openNotification(notif)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 ${typeConfig.buttonBg}`}
                    >
                      <span>Ouvrir</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* If there are more than 3 pending notifications */}
          {remainingCount > 0 && (
            <div className="pointer-events-auto bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-medium flex items-center justify-between shadow-lg">
              <span>+ {remainingCount} autre{remainingCount > 1 ? 's' : ''} notification{remainingCount > 1 ? 's' : ''} non lue{remainingCount > 1 ? 's' : ''}</span>
              <span className="text-[10px] text-slate-300">Consultez la cloche en haut</span>
            </div>
          )}
        </aside>
      )}

      {/* Modal for viewing full notification details (when no link or opened directly) */}
      {selectedDetailNotif && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={closeDetailModal}
        >
          <div 
            className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 space-y-4 overflow-hidden relative animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                  <Bell size={20} />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-primary-700 uppercase tracking-wider">
                    Détail de la notification
                  </span>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {selectedDetailNotif.titre}
                  </h3>
                </div>
              </div>

              <button 
                onClick={closeDetailModal}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {selectedDetailNotif.message}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>
                Reçue le {new Date(selectedDetailNotif.date_creation).toLocaleString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>

              <button
                type="button"
                onClick={closeDetailModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
