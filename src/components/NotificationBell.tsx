import React from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { useNotifications, AppNotification } from '../contexts/NotificationContext';

export default function NotificationBell() {
  const { 
    notifications, 
    unreadCount, 
    openNotification, 
    markAllAsRead, 
    deleteNotification 
  } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleNotificationClick = (notif: AppNotification) => {
    setIsOpen(false);
    openNotification(notif);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 z-50 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-medium text-primary hover:text-primary-700 flex items-center gap-1"
                >
                  <Check size={14} /> Tout marquer comme lu
                </button>
              )}
            </div>
            
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Bell size={32} className="mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 ${!notif.lu ? 'bg-indigo-50/30' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!notif.lu ? (notif.type === 'error' || notif.type === 'warning' ? 'bg-red-500' : 'bg-primary-500') : 'bg-transparent'}`} />
                      <div className="flex-1 min-w-0 relative pr-6">
                        <button 
                          onClick={(e) => deleteNotification(notif.id, e)}
                          className="absolute right-0 top-0 text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                          title="Supprimer la notification"
                        >
                          <Trash2 size={14} />
                        </button>
                        <p className={`text-sm pr-2 ${!notif.lu ? 'font-bold text-slate-900' : 'font-normal text-slate-600'}`}>
                          {notif.titre}
                        </p>
                        <p className={`text-xs mt-1 line-clamp-2 ${!notif.lu ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-2 font-medium">
                          {new Date(notif.date_creation).toLocaleString('fr-FR', { 
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
