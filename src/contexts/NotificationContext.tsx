import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from './AuthContext';

export interface AppNotification {
  id: number;
  utilisateur_id: number;
  titre: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success' | 'danger';
  lu: number;
  lien?: string | null;
  date_creation: string;
  school_id?: number;
}

export interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  floatingNotifs: AppNotification[];
  selectedDetailNotif: AppNotification | null;
  fetchNotifications: () => Promise<void>;
  openNotification: (notif: AppNotification) => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markPathNotificationsAsRead: (path: string) => Promise<void>;
  getUnreadCountForPath: (path: string) => number;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number, e?: React.MouseEvent) => Promise<void>;
  closeDetailModal: () => void;
  dismissFromFloating: (id: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Helper function to resolve target route from a notification
export function getNotificationTargetRoute(notif: AppNotification): string | null {
  if (notif.lien) {
    const raw = notif.lien.trim();
    const clean = raw.split('?')[0].split('#')[0].toLowerCase();
    if (clean === '/documents-demandes' || clean.includes('document')) return '/documents-demandes';
    if (clean === '/emploi-du-temps-requests' || clean === '/demandes-emploi-du-temps' || clean.includes('requests') || clean.includes('ajustement')) {
      return '/emploi-du-temps-requests';
    }
    if (clean === '/epreuves' || clean.includes('epreuve')) return '/epreuves';
    if (clean === '/messagerie' || clean.includes('messagerie')) return '/messagerie';
    if (clean === '/notes' || clean.includes('note') || clean.includes('bulletin')) return '/notes';
    if (clean === '/alertes' || clean.includes('alerte')) return '/alertes';
    if (clean === '/emploi-du-temps' || clean.includes('emploi-du-temps')) return '/emploi-du-temps';
    if (clean === '/bibliotheque' || clean.includes('bibliotheque')) return '/bibliotheque';
    if (clean === '/paiements' || clean.includes('paiement') || clean.includes('scolarite')) return '/paiements';
    if (clean.startsWith('/')) return clean;
  }

  // Fallback heuristic based on notification title and message content
  const text = `${notif.titre || ''} ${notif.message || ''}`.toLowerCase();
  
  if (text.includes('document') || text.includes('attestation') || text.includes('certificat')) {
    return '/documents-demandes';
  }
  if (text.includes('demande') && (text.includes('edt') || text.includes('emploi du temps') || text.includes('horaire') || text.includes('cours') || text.includes('créneau') || text.includes('creneau'))) {
    return '/emploi-du-temps-requests';
  }
  if (text.includes('demande') && (text.includes('note') || text.includes('bulletin'))) {
    return '/emploi-du-temps-requests';
  }
  if (text.includes('demande')) {
    return '/documents-demandes';
  }
  if (text.includes('épreuve') || text.includes('epreuve') || text.includes('sujet')) {
    return '/epreuves';
  }
  if (text.includes('message') || text.includes('sms')) {
    return '/messagerie';
  }
  if (text.includes('note') || text.includes('bulletin')) {
    return '/notes';
  }
  if (text.includes('absence') || text.includes('retard') || text.includes('alerte')) {
    return '/alertes';
  }

  return null;
}

// Web Audio synthesizer for gentle notification chime
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    // Two-tone soft harmonious chime: 587.33Hz (D5) -> 880Hz (A5)
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);
  } catch (err) {
    // Non-critical audio chime error
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [floatingNotifs, setFloatingNotifs] = useState<AppNotification[]>([]);
  const [selectedDetailNotif, setSelectedDetailNotif] = useState<AppNotification | null>(null);

  // Keep track of previously seen notification IDs to trigger chime only on truly new items
  const knownNotifIdsRef = useRef<Set<number>>(new Set());
  const initialLoadRef = useRef<boolean>(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setFloatingNotifs([]);
      return;
    }

    try {
      const res = await apiFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotifications(data);
          const unread = data.filter((n: AppNotification) => !n.lu);
          setUnreadCount(unread.length);

          // Detect new incoming notifications for audio alert
          const newIncoming = unread.filter(n => !knownNotifIdsRef.current.has(n.id));
          if (!initialLoadRef.current && newIncoming.length > 0) {
            playNotificationChime();
          }

          // Register all current IDs
          data.forEach((n: AppNotification) => knownNotifIdsRef.current.add(n.id));
          initialLoadRef.current = false;

          // The user requested: "Lorsqu'une notification viens, qu'elle s'affiche devant la page concernée
          // jusqu'à l'ouverture de la notification, après ouverture, elle peut disparaitre."
          // All unread notifications that haven't been opened are kept in floating state until opened.
          setFloatingNotifs(unread);
        } else {
          setNotifications([]);
          setUnreadCount(0);
          setFloatingNotifs([]);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  }, [user]);

  // Initial load and periodic polling every 10 seconds
  useEffect(() => {
    if (!user) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // 30s poll is sufficient for non-critical notifications

    const handleRefresh = () => {
      fetchNotifications();
    };

    window.addEventListener('refresh_notifications', handleRefresh);
    window.addEventListener('storage', handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener('refresh_notifications', handleRefresh);
      window.removeEventListener('storage', handleRefresh);
    };
  }, [user, fetchNotifications]);

  // Mark notification as read in the backend
  const markAsRead = useCallback(async (id: number) => {
    try {
      // Optimistic state update
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      setFloatingNotifs(prev => prev.filter(n => n.id !== id));
      await apiFetch(`/api/notifications/${id}/read`, { method: 'PUT' });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  // Count unread notifications targeting a specific route/button
  const getUnreadCountForPath = useCallback((targetPath: string): number => {
    if (!targetPath) return 0;
    const normTarget = targetPath.split('?')[0].split('#')[0].toLowerCase();

    return notifications.filter(notif => {
      if (notif.lu) return false;
      const t = getNotificationTargetRoute(notif);
      if (!t) return false;
      if (t === normTarget) return true;
      if (
        (normTarget === '/emploi-du-temps-requests' || normTarget === '/demandes-emploi-du-temps') &&
        (t === '/emploi-du-temps-requests' || t === '/demandes-emploi-du-temps')
      ) {
        return true;
      }
      return false;
    }).length;
  }, [notifications]);

  // Mark all unread notifications for a specific route as read (e.g. upon opening the page)
  const markPathNotificationsAsRead = useCallback(async (targetPath: string) => {
    if (!targetPath) return;
    const normTarget = targetPath.split('?')[0].split('#')[0].toLowerCase();
    
    const matchingNotifs = notifications.filter(notif => {
      if (notif.lu) return false;
      const t = getNotificationTargetRoute(notif);
      if (!t) return false;
      if (t === normTarget) return true;
      if (
        (normTarget === '/emploi-du-temps-requests' || normTarget === '/demandes-emploi-du-temps') &&
        (t === '/emploi-du-temps-requests' || t === '/demandes-emploi-du-temps')
      ) {
        return true;
      }
      return false;
    });

    if (matchingNotifs.length === 0) return;

    const idsToMark = matchingNotifs.map(n => n.id);
    const idSet = new Set(idsToMark);

    // Optimistic local state update
    setNotifications(prev => prev.map(n => idSet.has(n.id) ? { ...n, lu: 1 } : n));
    setUnreadCount(prev => Math.max(0, prev - idsToMark.length));
    setFloatingNotifs(prev => prev.filter(n => !idSet.has(n.id)));

    try {
      await apiFetch('/api/notifications/mark-read-batch', {
        method: 'PUT',
        body: JSON.stringify({ ids: idsToMark })
      });
    } catch (err) {
      console.error("Error marking path notifications as read:", err);
    }
  }, [notifications]);

  const lastMarkedPathRef = useRef<string>('');

  // When user opens a page, automatically mark the notifications concerning this page as read after opening
  useEffect(() => {
    if (!location.pathname) return;
    const currentPath = location.pathname.split('?')[0].split('#')[0].toLowerCase();
    
    // Only check once per distinct page navigation
    if (lastMarkedPathRef.current === currentPath) return;
    lastMarkedPathRef.current = currentPath;

    const timer = setTimeout(() => {
      markPathNotificationsAsRead(currentPath);
    }, 600);

    return () => clearTimeout(timer);
  }, [location.pathname, markPathNotificationsAsRead]);

  // Open notification: marks it as read, navigates or displays modal, and makes it disappear from screen
  const openNotification = useCallback(async (notif: AppNotification) => {
    // 1. Immediately remove from floating overlay so it disappears
    setFloatingNotifs(prev => prev.filter(n => n.id !== notif.id));
    
    // 2. Mark as read on server
    if (!notif.lu) {
      await markAsRead(notif.id);
    }

    // 3. If there is a target link, navigate to it
    if (notif.lien) {
      const cleanLien = notif.lien.trim();
      if (cleanLien.startsWith('http://') || cleanLien.startsWith('https://')) {
        window.open(cleanLien, '_blank');
      } else {
        navigate(cleanLien);
      }
    } else {
      // If no link, open the detailed notification modal
      setSelectedDetailNotif(notif);
    }
  }, [markAsRead, navigate]);

  // Dismiss from floating without necessarily navigating (e.g. click X or "Vu")
  const dismissFromFloating = useCallback((id: number) => {
    markAsRead(id);
  }, [markAsRead]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, lu: 1 })));
      setUnreadCount(0);
      setFloatingNotifs([]);
      window.dispatchEvent(new CustomEvent('refresh_notifications'));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications(prev => prev.filter(n => n.id !== id));
      setFloatingNotifs(prev => prev.filter(n => n.id !== id));
      setUnreadCount(prev => {
        const notif = notifications.find(n => n.id === id);
        return notif && !notif.lu ? Math.max(0, prev - 1) : prev;
      });
      window.dispatchEvent(new CustomEvent('refresh_notifications'));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  }, [notifications]);

  const closeDetailModal = useCallback(() => {
    setSelectedDetailNotif(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        floatingNotifs,
        selectedDetailNotif,
        fetchNotifications,
        openNotification,
        markAsRead,
        markPathNotificationsAsRead,
        getUnreadCountForPath,
        markAllAsRead,
        deleteNotification,
        closeDetailModal,
        dismissFromFloating,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
