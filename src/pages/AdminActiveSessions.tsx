import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Search, 
  RefreshCw, 
  Loader2, 
  Check, 
  X, 
  User, 
  GraduationCap, 
  Calendar, 
  Save, 
  UserX, 
  FileText,
  RotateCcw,
  ShieldAlert,
  Globe,
  Filter
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { formatClassName } from '../utils/format';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import DeviceClockAlert, { useSchoolClock } from '../components/DeviceClockAlert';

interface ActiveSession {
  id: number;
  emploi_du_temps_id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  jour: string;
  classe_id?: number;
  classe_nom: string;
  matiere_nom: string;
  salle_nom?: string;
  enseignant_id?: number;
  enseignant_nom: string;
  enseignant_prenom: string;
  statut: 'programmé' | 'en_cours' | 'terminé' | 'verrouillé' | 'absent' | 'permission';
  is_upcoming?: boolean;
  is_future_day?: boolean;
  heure_debut_reelle: string | null;
  heure_fin_reelle: string | null;
  retard_minutes: number;
  heures_validees: number;
  commentaires: string | null;
}

export default function AdminActiveSessions() {
  const { user } = useAuth();
  const { clockInfo } = useSchoolClock();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Date state (defaults to today's date)
  const now = new Date();
  const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);

  // Validation State
  const [selectedSession, setSelectedSession] = useState<ActiveSession | null>(null);
  const [valideHours, setValideHours] = useState<string>('0');
  const [valideComment, setValideComment] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  // Permission State
  const [permissionSession, setPermissionSession] = useState<ActiveSession | null>(null);
  const [permissionMotif, setPermissionMotif] = useState('');
  const [permissionHours, setPermissionHours] = useState('0');
  const [isMarkingPermission, setIsMarkingPermission] = useState(false);

  // Action loading indicators
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchSessions = async (isManual = false, dateToQuery = selectedDate) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch(`/api/admin/sessions-actives?date=${dateToQuery}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error('Error fetching active sessions:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSessions(false, selectedDate);
    // Poll every 15 seconds so changes made by teachers or other admins are visible
    const interval = setInterval(() => {
      fetchSessions(false, selectedDate);
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setLoading(true);
    fetchSessions(false, newDate);
  };

  const handleUnlock = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/unlock/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Session déverrouillée (mis à jour dans le compte enseignant)');
        fetchSessions();
      } else {
        toast.error('Erreur lors du déverrouillage');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLock = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/lock/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Session verrouillée (mis à jour dans le compte enseignant)');
        fetchSessions();
      } else {
        toast.error('Erreur lors du verrouillage');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStart = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/start/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Session démarrée en direct (mis à jour dans le compte enseignant)');
        fetchSessions();
      } else {
        toast.error('Erreur lors du démarrage');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Voulez-vous vraiment annuler le cours et le remettre à zéro (statut programmé) ? Cela agira immédiatement sur le compte de l'enseignant.")) return;
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/cancel/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Session remise à zéro');
        fetchSessions();
      } else {
        toast.error("Erreur lors de l'annulation");
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleComplete = async (id: number) => {
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/complete/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Session terminée / clôturée');
        fetchSessions();
      } else {
        toast.error('Erreur lors de la clôture');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAbsent = async (id: number) => {
    if (!confirm("Marquer cet enseignant comme absent pour ce cours ? Cela s'affichera directement dans son compte.")) return;
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/mark-absent/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Absence enregistrée');
        fetchSessions();
      } else {
        toast.error('Erreur lors du marquage');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLockAndMarkAbsent = async (id: number) => {
    if (!confirm("Voulez-vous verrouiller la session et marquer l'enseignant absent immédiatement ?")) return;
    setActionLoadingId(id);
    try {
      const res = await apiFetch(`/api/admin/sessions/lock-and-absent/${id}`, { method: 'POST' });
      if (res.ok) {
        toast.success('Session verrouillée et marquée absent avec succès');
        fetchSessions();
      } else {
        toast.error("Erreur lors de l'opération");
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenValidate = (session: ActiveSession) => {
    setSelectedSession(session);
    const [h1, m1] = session.heure_debut.split(':').map(Number);
    const [h2, m2] = session.heure_fin.split(':').map(Number);
    const durationH = h2 - h1 + (m2 - m1) / 60;
    setValideHours(durationH.toFixed(2));
    setValideComment(session.retard_minutes > 0 ? `Retard de ${session.retard_minutes} min constaté.` : '');
  };

  const handleConfirmValidate = async () => {
    if (!selectedSession) return;
    setIsValidating(true);
    try {
      const res = await apiFetch(`/api/admin/sessions/validate/${selectedSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heures_validees: parseFloat(valideHours),
          commentaires: valideComment
        })
      });
      if (res.ok) {
        toast.success('Session validée et comptabilisée');
        setSelectedSession(null);
        fetchSessions();
      } else {
        toast.error('Erreur lors de la validation');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmPermission = async () => {
    if (!permissionSession) return;
    setIsMarkingPermission(true);
    try {
      const res = await apiFetch(`/api/admin/sessions/mark-permission/${permissionSession.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motif: permissionMotif,
          heures_a_soustraire: parseFloat(permissionHours)
        })
      });
      if (res.ok) {
        toast.success('Permission enregistrée');
        setPermissionSession(null);
        fetchSessions();
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setIsMarkingPermission(false);
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = 
      (s.enseignant_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.enseignant_prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.classe_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.matiere_nom || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'a_venir') return s.is_upcoming;
    if (statusFilter === 'en_cours') return s.statut === 'en_cours';
    if (statusFilter === 'termine') return s.statut === 'terminé';
    if (statusFilter === 'verrouille') return s.statut === 'verrouillé';
    if (statusFilter === 'absent') return s.statut === 'absent';
    if (statusFilter === 'permission') return s.statut === 'permission';

    return true;
  });

  const sessionsByClass = filteredSessions.reduce((acc: Record<string, ActiveSession[]>, session) => {
    const className = session.classe_nom || 'Non assigné';
    if (!acc[className]) acc[className] = [];
    acc[className].push(session);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const isViewingToday = selectedDate === todayDateStr;

  return (
    <div className="space-y-6">
      {/* Device clock warning if client time differs from school timezone */}
      <DeviceClockAlert />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Radio size={24} className="text-rose-600 animate-pulse" />
              Suivi des cours en direct (Session en cours)
            </h1>
            {clockInfo && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold border border-slate-200">
                <Globe size={13} className="text-indigo-600" />
                {clockInfo.pays} ({clockInfo.timezone}) : <strong>{clockInfo.dayFr} {clockInfo.timeStr}</strong>
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Supervisez les cours du jour par classe avec le nom de l'enseignant. Chaque action agit directement sur le compte de l'enseignant concerné.
          </p>
        </div>

        {/* Date Controls & Refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleDateChange(todayDateStr)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${isViewingToday ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
          >
            Aujourd'hui
          </button>
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-semibold text-slate-600">
            <Calendar size={14} className="text-slate-400" />
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent outline-none font-bold text-slate-800 text-xs"
            />
          </div>
          <button 
            onClick={() => fetchSessions(true)}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            title="Rafraîchir"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'all' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
          >
            Tous ({sessions.length})
          </button>
          <button
            onClick={() => setStatusFilter('en_cours')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'en_cours' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100'}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            En cours ({sessions.filter(s => s.statut === 'en_cours').length})
          </button>
          <button
            onClick={() => setStatusFilter('a_venir')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'a_venir' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100'}`}
          >
            À venir ({sessions.filter(s => s.is_upcoming).length})
          </button>
          <button
            onClick={() => setStatusFilter('termine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'termine' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100'}`}
          >
            Terminé ({sessions.filter(s => s.statut === 'terminé').length})
          </button>
          <button
            onClick={() => setStatusFilter('verrouille')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'verrouille' ? 'bg-rose-600 text-white shadow-sm' : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100'}`}
          >
            Verrouillé ({sessions.filter(s => s.statut === 'verrouillé').length})
          </button>
          <button
            onClick={() => setStatusFilter('absent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'absent' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'}`}
          >
            Absent ({sessions.filter(s => s.statut === 'absent').length})
          </button>
          <button
            onClick={() => setStatusFilter('permission')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${statusFilter === 'permission' ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100'}`}
          >
            Permission ({sessions.filter(s => s.statut === 'permission').length})
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Rechercher classe, prof, matière..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Classes and sessions list */}
      <div className="space-y-6">
        {Object.keys(sessionsByClass).length > 0 ? (
          (Object.entries(sessionsByClass) as [string, ActiveSession[]][]).map(([className, classSessions]) => (
            <div key={className} className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden">
              {/* Class Header */}
              <div className="px-6 py-4 bg-slate-50/80 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner font-bold text-sm">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">{formatClassName(className)}</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{classSessions.length} séance(s) programmée(s)</p>
                  </div>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                      <th className="px-6 py-3.5">Statut actuel</th>
                      <th className="px-6 py-3.5">Enseignant</th>
                      <th className="px-6 py-3.5">Matière</th>
                      <th className="px-6 py-3.5">Horaire prévu</th>
                      <th className="px-6 py-3.5">Activité réelle</th>
                      <th className="px-6 py-3.5 text-right">Actions directes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Status Badge */}
                        <td className="px-6 py-4">
                          <StatusBadge statut={session.statut} isUpcoming={session.is_upcoming} isFutureDay={session.is_future_day} />
                        </td>

                        {/* Teacher */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center shrink-0">
                              <User size={16} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                {session.enseignant_nom} {session.enseignant_prenom}
                              </p>
                              <span className="text-[11px] text-slate-400">Enseignant</span>
                            </div>
                          </div>
                        </td>

                        {/* Subject */}
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-slate-800">{session.matiere_nom}</p>
                          {session.salle_nom && (
                            <span className="text-[11px] text-slate-400">{session.salle_nom}</span>
                          )}
                        </td>

                        {/* Scheduled time */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                            <Clock size={13} className="text-slate-400" />
                            {session.heure_debut} - {session.heure_fin}
                          </div>
                        </td>

                        {/* Real activity */}
                        <td className="px-6 py-4">
                          {session.heure_debut_reelle ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-xs font-bold text-emerald-700">Début: {session.heure_debut_reelle}</span>
                                {session.retard_minutes > 0 && (
                                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-lg border border-rose-100">
                                    +{session.retard_minutes}m
                                  </span>
                                )}
                              </div>
                              {session.heure_fin_reelle && (
                                <div className="text-[11px] font-semibold text-slate-500 pl-4">
                                  Fin: {session.heure_fin_reelle}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Non démarré</span>
                          )}
                        </td>

                        {/* Action buttons */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Action: Lancer le cours */}
                            {session.statut === 'programmé' && !session.is_future_day && (
                              <button 
                                onClick={() => handleStart(session.id)}
                                disabled={actionLoadingId === session.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-all border border-emerald-200 shadow-sm disabled:opacity-50"
                                title="Lancer le cours directement dans le compte enseignant"
                              >
                                <Radio size={14} className="text-emerald-600" />
                                Lancer
                              </button>
                            )}

                            {/* Actions for En cours: Terminer / Fermer + Annuler */}
                            {session.statut === 'en_cours' && (
                              <>
                                <button 
                                  onClick={() => handleComplete(session.id)}
                                  disabled={actionLoadingId === session.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition-all border border-blue-200 shadow-sm disabled:opacity-50"
                                  title="Terminer et fermer le cours"
                                >
                                  <CheckCircle2 size={14} className="text-blue-600" />
                                  Terminer / Fermer
                                </button>
                                <button 
                                  onClick={() => handleCancel(session.id)}
                                  disabled={actionLoadingId === session.id}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200 shadow-sm disabled:opacity-50"
                                  title="Annuler le cours (remettre à zéro)"
                                >
                                  <RotateCcw size={14} className="text-rose-600" />
                                  Annuler
                                </button>
                              </>
                            )}

                            {/* Action: Verrouiller */}
                            {session.statut === 'programmé' && (
                              <button 
                                onClick={() => handleLock(session.id)}
                                disabled={actionLoadingId === session.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-all border border-rose-200 shadow-sm disabled:opacity-50"
                                title="Verrouiller le cours"
                              >
                                <Lock size={14} className="text-rose-600" />
                                Verrouiller
                              </button>
                            )}

                            {/* Action: Déverrouiller */}
                            {session.statut === 'verrouillé' && (
                              <button 
                                onClick={() => handleUnlock(session.id)}
                                disabled={actionLoadingId === session.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-bold transition-all border border-amber-200 shadow-sm disabled:opacity-50"
                                title="Déverrouiller le cours pour l'enseignant"
                              >
                                <Unlock size={14} className="text-amber-600" />
                                Déverrouiller
                              </button>
                            )}

                            {/* Action: Marquer absent */}
                            {(session.statut === 'programmé' || session.statut === 'verrouillé' || session.statut === 'en_cours') && (
                              <button 
                                onClick={() => handleMarkAbsent(session.id)}
                                disabled={actionLoadingId === session.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                title="Marquer l'enseignant comme absent"
                              >
                                <UserX size={14} />
                                Absent
                              </button>
                            )}

                            {/* Action: Verrouiller et marquer absent */}
                            {(session.statut === 'programmé' || session.statut === 'en_cours') && (
                              <button 
                                onClick={() => handleLockAndMarkAbsent(session.id)}
                                disabled={actionLoadingId === session.id}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                                title="Verrouiller la session et marquer l'enseignant absent"
                              >
                                <ShieldAlert size={14} />
                                Verrouiller & Absent
                              </button>
                            )}

                            {/* Action: Permission */}
                            {(session.statut === 'programmé' || session.statut === 'verrouillé' || session.statut === 'en_cours') && (
                              <button 
                                onClick={() => {
                                  setPermissionSession(session);
                                  setPermissionMotif('');
                                  setPermissionHours('0');
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-all border border-purple-200 shadow-sm"
                                title="Déclarer une permission avec justification"
                              >
                                <FileText size={14} className="text-purple-600" />
                                Permission
                              </button>
                            )}

                            {/* Action: Valider */}
                            {(session.statut === 'terminé' || session.statut === 'absent' || session.statut === 'permission') && (
                              <button 
                                onClick={() => handleOpenValidate(session)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100"
                                title="Valider définitivement les heures de cours"
                              >
                                <CheckCircle2 size={14} />
                                Valider
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        ) : (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
            <Radio size={48} className="mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500 font-medium">Aucun cours trouvé pour cette sélection ({selectedDate}).</p>
          </div>
        )}
      </div>

      {/* Modal: Permission */}
      <AnimatePresence>
        {permissionSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Enregistrer une permission</h2>
                    <p className="text-xs text-slate-500 font-medium">Justification et déduction d'heures</p>
                  </div>
                </div>
                <button 
                  onClick={() => setPermissionSession(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1.5">
                  <p className="text-sm font-bold text-slate-800">{permissionSession.enseignant_nom} {permissionSession.enseignant_prenom}</p>
                  <p className="text-xs text-slate-500">{permissionSession.matiere_nom} • {permissionSession.classe_nom}</p>
                  <p className="text-xs font-bold text-slate-400">Horaire: {permissionSession.heure_debut} - {permissionSession.heure_fin}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Motif de la permission</label>
                    <textarea 
                      value={permissionMotif}
                      onChange={(e) => setPermissionMotif(e.target.value)}
                      placeholder="Ex: Raison médicale, mission officielle..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none h-20"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Heures à soustraire</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number"
                        step="0.25"
                        min="0"
                        value={permissionHours}
                        onChange={(e) => setPermissionHours(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-purple-600 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex items-center justify-end gap-3">
                <button 
                  onClick={() => setPermissionSession(null)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmPermission}
                  disabled={isMarkingPermission}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-purple-100 transition-all"
                >
                  {isMarkingPermission ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Enregistrer la permission
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal: Validation */}
        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Validation de la session</h2>
                    <p className="text-xs text-slate-500 font-medium">Pointage et validation comptable des heures</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-indigo-500" />
                    <span className="text-sm font-bold text-slate-800">{selectedSession.enseignant_nom} {selectedSession.enseignant_prenom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap size={14} className="text-indigo-500" />
                    <span className="text-xs font-semibold text-slate-600">{selectedSession.matiere_nom} • {selectedSession.classe_nom}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-indigo-500" />
                    <span className="text-xs font-bold text-slate-500">Prévu : {selectedSession.heure_debut} - {selectedSession.heure_fin}</span>
                  </div>
                  {selectedSession.retard_minutes > 0 && (
                    <div className="flex items-center gap-2 text-rose-600 font-bold text-xs">
                      <AlertTriangle size={14} />
                      <span>Retard de {selectedSession.retard_minutes} minutes</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Heures à comptabiliser</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="number"
                        step="0.25"
                        min="0"
                        value={valideHours}
                        onChange={(e) => setValideHours(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-black text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Commentaires / Observations</label>
                    <textarea 
                      value={valideComment}
                      onChange={(e) => setValideComment(e.target.value)}
                      placeholder="Commentaires pour le bulletin de paie / bilan..."
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none h-20"
                    />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t flex items-center justify-end gap-3">
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleConfirmValidate}
                  disabled={isValidating}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all"
                >
                  {isValidating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Valider & Enregistrer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatusBadge({ statut, isUpcoming, isFutureDay }: { statut: string; isUpcoming?: boolean; isFutureDay?: boolean }) {
  if (isFutureDay) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border border-amber-200 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        Verrouillé (Jour futur)
      </div>
    );
  }

  if (isUpcoming) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
        À venir
      </div>
    );
  }

  const configs: Record<string, { label: string; color: string; dot: string }> = {
    'programmé': { label: 'Programmé', color: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400' },
    'en_cours': { label: 'En cours', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500 animate-ping' },
    'terminé': { label: 'Terminé', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    'verrouillé': { label: 'Verrouillé', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-600' },
    'absent': { label: 'Absent', color: 'bg-slate-900 text-white border-slate-700', dot: 'bg-white' },
    'permission': { label: 'Permission', color: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500' }
  };

  const config = configs[statut] || configs['programmé'];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${config.color} border shadow-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
      {config.label}
    </div>
  );
}
