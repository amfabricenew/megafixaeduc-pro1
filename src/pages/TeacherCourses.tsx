import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Lock, 
  Unlock, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  BookOpen, 
  Users, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  FileText, 
  RotateCcw,
  Globe
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

// Haversine formula to calculate distance between two points in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

import { formatClassName } from '../utils/format';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import DeviceClockAlert, { useSchoolClock } from '../components/DeviceClockAlert';

interface SessionItem {
  id: number;
  emploi_du_temps_id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  jour: string;
  matiere_nom: string;
  classe_nom: string;
  salle_nom: string;
  enseignant_nom?: string;
  enseignant_prenom?: string;
  enseignant_id: number;
  session: {
    id: number;
    statut: 'programmé' | 'en_cours' | 'terminé' | 'verrouillé' | 'absent' | 'permission';
    heure_debut_reelle: string | null;
    heure_fin_reelle: string | null;
    retard_minutes: number;
    heures_validees: number;
    is_upcoming?: boolean;
    is_future_day?: boolean;
    lock_reason?: string;
  };
}

export default function TeacherCourses() {
  const { user } = useAuth();
  const { clockInfo } = useSchoolClock();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [startingSessionId, setStartingSessionId] = useState<number | null>(null);
  const [cancellingSessionId, setCancellingSessionId] = useState<number | null>(null);
  const [schoolLocation, setSchoolLocation] = useState<{ lat: number; lng: number; radius: number } | null>(null);

  useEffect(() => {
    const fetchSchoolLoc = async () => {
      try {
        const res = await apiFetch('/api/school-info');
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            setSchoolLocation({
              lat: Number(data.latitude),
              lng: Number(data.longitude),
              radius: Number(data.geofence_radius) || 200
            });
          }
        }
      } catch (e) {}
    };
    fetchSchoolLoc();
  }, []);

  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayDayInt = now.getDay();

  const [currentDate, setCurrentDate] = useState(todayDateStr);
  const [currentDay, setCurrentDay] = useState(todayDayInt);

  const fetchSessions = async (isManual = false, dateToFetch?: string, dayToFetch?: number) => {
    if (isManual) setRefreshing(true);
    try {
      const date = dateToFetch || currentDate;
      const day = dayToFetch !== undefined ? dayToFetch : currentDay;
      const res = await apiFetch(`/api/teacher/today-sessions?date=${date}&day=${day}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  const handleTomorrowCourses = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    const dayInt = tomorrow.getDay();
    
    setCurrentDate(dateStr);
    setCurrentDay(dayInt);
    setLoading(true);
    fetchSessions(false, dateStr, dayInt);
  };

  const handleTodayCourses = () => {
    setCurrentDate(todayDateStr);
    setCurrentDay(todayDayInt);
    setLoading(true);
    fetchSessions(false, todayDateStr, todayDayInt);
  };

  useEffect(() => {
    fetchSessions();
    // Auto refresh every 15 seconds so admin actions are reflected quickly
    const interval = setInterval(() => {
      fetchSessions();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentDate]);

  const handleStartCourse = async (sessionId: number) => {
    if (startingSessionId) return;

    // Geofencing Check
    if (schoolLocation) {
      if (!navigator.geolocation) {
        toast.error("La géolocalisation n'est pas supportée par votre navigateur.");
        return;
      }

      setStartingSessionId(sessionId);
      
      try {
        const position: any = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, (err) => {
            // Fallback for timeout if high accuracy fails
            if (err.code === 3) {
              toast("Signal GPS faible, tentative simplifiée...", { icon: '📡' });
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 15000,
                maximumAge: 10000
              });
            } else {
              reject(err);
            }
          }, { 
            enableHighAccuracy: true,
            timeout: 15000 // 15s for first attempt
          });
        });

        const teacherLat = position.coords.latitude;
        const teacherLng = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        console.log(`Teacher position: ${teacherLat}, ${teacherLng} (accuracy: ${accuracy}m)`);
        
        const distance = getDistance(
          teacherLat, 
          teacherLng, 
          schoolLocation.lat, 
          schoolLocation.lng
        );

        if (distance > schoolLocation.radius) {
          toast.error(`Accès refusé : Vous êtes trop loin de l'école (${Math.round(distance)}m). Vous devez être dans l'enceinte de l'établissement (Rayon: ${schoolLocation.radius}m).`);
          setStartingSessionId(null);
          return;
        }
      } catch (err: any) {
        setStartingSessionId(null);
        if (err.code === 1) {
          toast.error("Veuillez activer la localisation de votre appareil pour ouvrir votre séance de cours.");
        } else {
          toast.error("Impossible de récupérer votre position actuelle. Veuillez réessayer.");
        }
        return;
      }
    }

    setStartingSessionId(sessionId);
    try {
      const res = await apiFetch(`/api/teacher/sessions/start/${sessionId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message + (data.retard > 0 ? ` (Retard: ${data.retard} min)` : ''));
        fetchSessions();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors du démarrage');
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    } finally {
      setStartingSessionId(null);
    }
  };

  const handleCancelCourse = async (sessionId: number) => {
    if (cancellingSessionId) return;
    if (!window.confirm("Voulez-vous vraiment annuler le démarrage de ce cours et le remettre en attente (programmé) ?")) {
      return;
    }
    setCancellingSessionId(sessionId);
    try {
      const res = await apiFetch(`/api/teacher/sessions/cancel/${sessionId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || 'Démarrage du cours annulé');
        fetchSessions();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'annulation");
      }
    } catch (err) {
      toast.error('Une erreur est survenue');
    } finally {
      setCancellingSessionId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const isViewingTomorrow = currentDate !== todayDateStr;

  return (
    <div className="space-y-6">
      {/* Device clock warning if client time differs from school timezone time */}
      <DeviceClockAlert />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Mes cours</h1>
            {clockInfo && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-200">
                <Globe size={13} className="text-indigo-600" />
                {clockInfo.pays} ({clockInfo.timezone}) : <strong>{clockInfo.timeStr}</strong>
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-0.5">
            {isViewingTomorrow 
              ? "Aperçu de vos séances de demain. Aucun cours de demain ne peut démarrer aujourd'hui (sécurité verrouillée jusqu'au jour normal)." 
              : "Aperçu et gestion de vos séances programmées pour aujourd'hui."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isViewingTomorrow ? (
            <button 
              onClick={handleTodayCourses}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <Calendar size={16} />
              Revenir à Aujourd'hui
            </button>
          ) : (
            <button 
              onClick={handleTomorrowCourses}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all shadow-sm"
            >
              <Calendar size={16} />
              Consulter les cours de demain
            </button>
          )}
          <button 
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* Banner for tomorrow locking */}
      {isViewingTomorrow && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-4 sm:p-5 flex items-start gap-3.5 shadow-sm">
          <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5 shadow">
            <Lock size={18} />
          </div>
          <div className="text-sm">
            <h3 className="font-bold text-amber-950">Sécurité emploi du temps active</h3>
            <p className="text-amber-900/90 text-xs sm:text-sm mt-0.5 leading-relaxed">
              Dans l'espace enseignant, aucun cours de demain ne peut démarrer à l'avance. Tous les cours restent strictement <strong>verrouillés</strong> jusqu'au jour normal ({sessions[0]?.jour || 'demain'}) et à l'heure exacte fixée selon l'emploi du temps officiel.
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Légende:</span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> En cours
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 text-[9px] font-bold text-indigo-700">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> À venir / Verrouillé
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-[9px] font-bold text-blue-700">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Terminé
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-100 text-[9px] font-bold text-rose-700">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span> Verrouillé (Retard)
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-700 text-[9px] font-bold text-white">
          <span className="w-1.5 h-1.5 rounded-full bg-white"></span> Absent
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-100 text-[9px] font-bold text-purple-700">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Permission
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessions.length > 0 ? (
          sessions.map((item) => (
            <SessionCard 
              key={item.id} 
              item={item} 
              isViewingTomorrow={isViewingTomorrow}
              isStarting={startingSessionId === item.session.id}
              onStart={() => handleStartCourse(item.session.id)}
              isCancelling={cancellingSessionId === item.session.id}
              onCancel={() => handleCancelCourse(item.session.id)}
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <Calendar size={64} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">
              Aucun cours programmé pour {isViewingTomorrow ? "demain" : "aujourd'hui"}.
            </p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 flex items-start gap-4">
        <AlertCircle className="text-amber-600 shrink-0 mt-1" />
        <div className="text-sm">
          <h3 className="font-bold text-amber-900 mb-1">Règlement de démarrage</h3>
          <p className="text-amber-800 leading-relaxed">
            Vous disposez d'un délai de <strong>30 minutes maximum</strong> après l'heure de début officielle pour lancer votre cours. 
            Au-delà de 30 minutes, le cours sera automatiquement <strong>verrouillé</strong> et nécessitera une intervention de l'administration pour être débloqué. 
            Le retard est enregistré et pris en compte dans le bilan officiel.
          </p>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ item, onStart, isStarting, onCancel, isCancelling, isViewingTomorrow }: any) {
  const { session, heure_debut, heure_fin, matiere_nom, classe_nom, salle_nom, enseignant_nom, enseignant_prenom, jour } = item;

  const isLockedForTomorrow = isViewingTomorrow || session.is_future_day;

  const getStatusInfo = () => {
    if (isLockedForTomorrow) {
      return { 
        icon: Lock, 
        color: 'bg-amber-50 text-amber-800 border-amber-200', 
        label: `Verrouillé (${jour})`,
        dot: 'bg-amber-500'
      };
    }

    if (session.is_upcoming) {
      return { 
        icon: Lock, 
        color: 'bg-indigo-50 text-indigo-700 border-indigo-100', 
        label: 'À venir',
        dot: 'bg-indigo-500'
      };
    }

    switch (session.statut) {
      case 'en_cours':
        return { 
          icon: Clock, 
          color: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
          label: 'En cours',
          dot: 'bg-emerald-500 animate-ping'
        };
      case 'terminé':
        return { 
          icon: CheckCircle2, 
          color: 'bg-blue-50 text-blue-700 border-blue-100', 
          label: 'Terminé',
          dot: 'bg-blue-500'
        };
      case 'verrouillé':
        return { 
          icon: Lock, 
          color: 'bg-rose-50 text-rose-700 border-rose-100', 
          label: 'Verrouillé (Retard)',
          dot: 'bg-rose-500'
        };
      case 'absent':
        return { 
          icon: AlertTriangle, 
          color: 'bg-slate-900 text-white border-slate-800', 
          label: 'Absent',
          dot: 'bg-white'
        };
      case 'permission':
        return { 
          icon: FileText, 
          color: 'bg-purple-50 text-purple-700 border-purple-100', 
          label: 'Permission',
          dot: 'bg-purple-500'
        };
      default:
        return { 
          icon: Unlock, 
          color: 'bg-slate-50 text-slate-700 border-slate-200', 
          label: 'Programmé',
          dot: 'bg-slate-400'
        };
    }
  };

  const info = getStatusInfo();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-3xl border ${session.statut === 'en_cours' ? 'border-emerald-200 ring-4 ring-emerald-50' : 'border-slate-200'} shadow-md overflow-hidden flex flex-col group hover:border-indigo-300 transition-all`}
    >
      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border ${info.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`}></span>
            {info.label}
          </div>
          <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
            <Clock size={13} className="text-slate-400" />
            {heure_debut} - {heure_fin}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{matiere_nom}</h3>
          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{formatClassName(classe_nom)}</span>
              <span className="text-xs font-medium text-slate-400">{salle_nom || 'Salle non définie'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Users size={12} className="text-slate-400" />
              {enseignant_nom} {enseignant_prenom}
              <span className="text-[10px] font-black text-indigo-500 uppercase ml-1">(Vous)</span>
            </div>
          </div>
        </div>

        {session.statut === 'en_cours' && (
          <div className="bg-emerald-50 rounded-2xl p-3 flex items-center justify-between">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-tight">Début réel</div>
            <div className="text-xs font-black text-emerald-600">{session.heure_debut_reelle}</div>
          </div>
        )}

        {session.retard_minutes > 0 && (
          <div className="bg-amber-50 rounded-2xl p-3 flex items-center justify-between">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-tight">Retard enregistré</div>
            <div className="text-xs font-black text-amber-600">{session.retard_minutes} min</div>
          </div>
        )}

        {isLockedForTomorrow && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-2.5 text-center text-xs text-slate-500 font-medium">
            🔒 Cours de {jour}. Démarrage verrouillé jusqu'à demain {heure_debut}.
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-50/50 border-t">
        {session.statut === 'programmé' ? (
          <button 
            onClick={onStart}
            disabled={isLockedForTomorrow || session.is_upcoming || isStarting}
            className={`w-full py-3 ${(!isLockedForTomorrow && !session.is_upcoming && !isStarting) ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100' : 'bg-slate-200 text-slate-500 cursor-not-allowed'} rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all`}
          >
            {isStarting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isLockedForTomorrow || session.is_upcoming ? (
              <Lock size={18} />
            ) : (
              <Unlock size={18} />
            )}
            {isStarting 
              ? 'Démarrage...' 
              : isLockedForTomorrow
                ? `Verrouillé jusqu'à ${jour}`
                : session.is_upcoming 
                  ? `Verrouillé (Démarre à ${heure_debut})` 
                  : 'Démarrer le cours'
            }
          </button>
        ) : session.statut === 'en_cours' ? (
          <div className="space-y-2.5">
            <div className="w-full py-2.5 bg-emerald-50 text-emerald-700 rounded-2xl text-xs font-black text-center border border-emerald-200 flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              COURS EN COURS...
            </div>
            <button
              onClick={onCancel}
              disabled={isCancelling}
              className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              title="Annuler le démarrage du cours"
            >
              {isCancelling ? (
                <Loader2 size={16} className="animate-spin text-rose-500" />
              ) : (
                <RotateCcw size={16} />
              )}
              {isCancelling ? 'Annulation en cours...' : 'Annuler le démarrage'}
            </button>
          </div>
        ) : session.statut === 'verrouillé' ? (
          <div className="w-full py-3 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold text-center border border-rose-200 flex items-center justify-center gap-2">
            <Lock size={16} />
            Verrouillé (Retard &gt; 30 min)
          </div>
        ) : (
          <div className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl text-sm font-bold text-center border border-slate-200 italic">
            Session close ({session.statut})
          </div>
        )}
      </div>
    </motion.div>
  );
}

