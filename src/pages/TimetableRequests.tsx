import { apiFetch } from '../utils/api';
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Check, 
  X, 
  Clock, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Send, 
  Plus, 
  Sparkles,
  Phone,
  RotateCcw,
  BookOpen,
  FileSpreadsheet,
  Layers,
  GraduationCap
} from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { formatClassName } from '../utils/format';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES_DEBUT = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const HEURES_FIN = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
const EVAL_TYPES = ['Toutes les évaluations', 'Interrogation 1', 'Interrogation 2', 'Devoir 1', 'Devoir 2', 'Composition', 'Rattrapage / Autre'];

export default function TimetableRequests() {
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = React.useState<string | number>('all');
  const confirm = useConfirm();
  const [requests, setRequests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  // Lists for dropdowns
  const [classesList, setClassesList] = React.useState<any[]>([]);
  const [matieresList, setMatieresList] = React.useState<any[]>([]);

  // Response / Processing modal state
  const [processingRequest, setProcessingRequest] = React.useState<any | null>(null);
  const [actionType, setActionType] = React.useState<'approved' | 'rejected'>('approved');
  const [adminNote, setAdminNote] = React.useState('');
  const [isSubmittingAction, setIsSubmittingAction] = React.useState(false);

  // New Request Modal (for teachers)
  const [showNewModal, setShowNewModal] = React.useState(false);
  const [reqType, setReqType] = React.useState<'emploi_du_temps' | 'notes'>('emploi_du_temps');
  const [reqClasseId, setReqClasseId] = React.useState('');
  const [reqMatiereId, setReqMatiereId] = React.useState('');
  const [reqJour, setReqJour] = React.useState('Lundi');
  const [reqHeureDebut, setReqHeureDebut] = React.useState('08:00');
  const [reqHeureFin, setReqHeureFin] = React.useState('10:00');
  const [reqTrimestre, setReqTrimestre] = React.useState(1);
  const [reqEvalType, setReqEvalType] = React.useState('Devoir 1');
  const [newDescription, setNewDescription] = React.useState('');
  const [isSubmittingNew, setIsSubmittingNew] = React.useState(false);

  const fetchRequests = () => {
    setLoading(true);
    const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
    apiFetch(`/api/timetable-requests${yearParam}`)
      .then(res => res.json())
      .then(data => {
        setRequests(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setRequests([]);
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchRequests();
  }, [selectedYearId]);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      apiFetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
        .then(res => res.json())
        .then(u => {
          setCurrentUser(u);
          if (u.role === 'enseignant' && u.enseignant_id) {
            // Load classes where teacher intervenes
            apiFetch('/api/teacher-classes', { headers: { 'Authorization': `Bearer ${token}` } })
              .then(r => r.json())
              .then(data => setClassesList(Array.isArray(data) ? data : []))
              .catch(() => {
                apiFetch('/api/classes').then(r => r.json()).then(setClassesList).catch(() => setClassesList([]));
              });
          } else {
            apiFetch('/api/classes').then(r => r.json()).then(setClassesList).catch(() => setClassesList([]));
          }
        })
        .catch(console.error);
    }

    apiFetch('/api/matieres')
      .then(r => r.json())
      .then(data => setMatieresList(Array.isArray(data) ? data : []))
      .catch(() => setMatieresList([]));
  }, []);

  const staffRoles = ['super_admin', 'admin', 'direction', 'censeur', 'secretariat', 'secretaire', 'surveillant'];
  const isAuthorizedStaff = currentUser && (
    staffRoles.includes(currentUser.role) ||
    (Array.isArray(currentUser.permissions) && currentUser.permissions.some((p: any) => 
      (p === '/emploi-du-temps-requests' || p.path === '/emploi-du-temps-requests') && (p.access_type === 'read_write' || p.can_write)
    ))
  );

  const openProcessModal = (req: any, status: 'approved' | 'rejected') => {
    setProcessingRequest(req);
    setActionType(status);
    setAdminNote(req.reponse_admin || '');
  };

  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processingRequest) return;

    setIsSubmittingAction(true);
    try {
      const res = await apiFetch(`/api/timetable-requests/${processingRequest.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: actionType,
          reponse_admin: adminNote.trim() || undefined
        })
      });

      if (res.ok) {
        toast.success(actionType === 'approved' ? "Demande approuvée avec succès !" : "Demande rejetée.");
        setProcessingRequest(null);
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors du traitement de la demande");
      }
    } catch (e) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleResetStatus = async (id: number) => {
    if (!await confirm({
      title: "Remettre en attente",
      message: "Voulez-vous réinitialiser le statut de cette demande vers 'En attente' ?",
      confirmText: "Réinitialiser",
      variant: 'warning'
    })) return;

    try {
      const res = await apiFetch(`/api/timetable-requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', reponse_admin: '' })
      });
      if (res.ok) {
        toast.success("Demande remise en attente");
        fetchRequests();
      }
    } catch (e) {
      toast.error("Erreur");
    }
  };

  const handleCreateNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      toast.error("Veuillez préciser le motif de votre demande");
      return;
    }

    setIsSubmittingNew(true);
    try {
      const payload: any = {
        enseignant_id: currentUser?.enseignant_id,
        type_modification: reqType,
        classe_id: reqClasseId ? parseInt(reqClasseId) : null,
        matiere_id: reqMatiereId ? parseInt(reqMatiereId) : null,
        description: newDescription.trim()
      };

      if (reqType === 'emploi_du_temps') {
        payload.jour = reqJour;
        payload.heure_debut = reqHeureDebut;
        payload.heure_fin = reqHeureFin;
      } else {
        payload.trimestre = reqTrimestre;
        payload.type_evaluation = reqEvalType;
      }

      const res = await apiFetch('/api/timetable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success("Votre demande a été transmise à la direction avec succès !");
        setShowNewModal(false);
        setNewDescription('');
        setReqClasseId('');
        setReqMatiereId('');
        fetchRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la soumission");
      }
    } catch (e) {
      toast.error("Erreur réseau");
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const filteredRequests = React.useMemo(() => {
    return requests.filter(req => {
      const matchSearch = 
        (req.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.matricule || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.classe_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.matiere_nom || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'all' || req.status === statusFilter;
      const matchType = typeFilter === 'all' || 
        (typeFilter === 'emploi_du_temps' ? (!req.type_modification || req.type_modification === 'emploi_du_temps') : req.type_modification === 'notes');
      
      return matchSearch && matchStatus && matchType;
    });
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const stats = React.useMemo(() => {
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      edt: requests.filter(r => !r.type_modification || r.type_modification === 'emploi_du_temps').length,
      notes: requests.filter(r => r.type_modification === 'notes').length,
    };
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <Clock className="text-amber-500" />
              Demandes de Modification (Emploi du Temps & Notes)
            </h1>
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              <Calendar size={12} className="text-slate-400" />
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-[10px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
              >
                <option value="all">Toutes les années</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-slate-500 text-sm">
            {isAuthorizedStaff 
              ? "Examinez et validez les autorisations de modification d'emploi du temps ou de notes soumises par les enseignants."
              : "Suivez le statut de vos demandes d'ajustement d'emploi du temps et de modification de notes."}
          </p>
        </div>

        {currentUser?.role === 'enseignant' && (
          <button
            onClick={() => {
              setReqType('emploi_du_temps');
              setShowNewModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all active:scale-95 text-xs"
          >
            <Plus size={16} />
            Nouvelle Demande
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div 
          onClick={() => { setStatusFilter('all'); setTypeFilter('all'); }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'all' && typeFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md' 
              : 'bg-white text-slate-700 border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold opacity-75">Toutes les demandes</div>
          <div className="text-2xl font-bold mt-1">{stats.total}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'pending' 
              ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20' 
              : 'bg-amber-50/50 text-amber-900 border-amber-200/70 hover:bg-amber-50'
          }`}
        >
          <div className="text-xs font-semibold opacity-75 flex items-center justify-between">
            <span>En attente</span>
            <Clock size={14} />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.pending}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'approved' 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20' 
              : 'bg-emerald-50/50 text-emerald-900 border-emerald-200/70 hover:bg-emerald-50'
          }`}
        >
          <div className="text-xs font-semibold opacity-75 flex items-center justify-between">
            <span>Approuvées (Actives)</span>
            <CheckCircle2 size={14} />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.approved}</div>
        </div>

        <div 
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'rejected' 
              ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20' 
              : 'bg-rose-50/50 text-rose-900 border-rose-200/70 hover:bg-rose-50'
          }`}
        >
          <div className="text-xs font-semibold opacity-75 flex items-center justify-between">
            <span>Rejetées</span>
            <XCircle size={14} />
          </div>
          <div className="text-2xl font-bold mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Type Tabs & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={13} />
            Tous types ({stats.total})
          </button>
          <button
            onClick={() => setTypeFilter('emploi_du_temps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'emploi_du_temps' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock size={13} />
            Emploi du Temps ({stats.edt})
          </button>
          <button
            onClick={() => setTypeFilter('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              typeFilter === 'notes' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet size={13} />
            Notes & Évaluations ({stats.notes})
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher prof, classe, matière..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                statusFilter === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Approuvées
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                statusFilter === 'rejected' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Rejetées
            </button>
          </div>
        </div>
      </div>

      {/* Requests Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            Chargement des demandes...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm flex flex-col items-center gap-3">
            <div className="p-4 bg-slate-50 rounded-full">
              <Clock size={32} className="text-slate-300" />
            </div>
            <p className="font-semibold text-slate-600">Aucune demande trouvée</p>
            <p className="text-xs text-slate-400 max-w-sm">
              {statusFilter !== 'all' 
                ? `Il n'y a aucune demande avec le statut "${statusFilter}".`
                : "Aucune demande de modification d'emploi du temps ou de notes enregistrée."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-100">
                <tr>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Enseignant</th>
                  <th className="px-5 py-4">Cible & Périmètre</th>
                  <th className="px-5 py-4">Motif & Détails</th>
                  <th className="px-5 py-4">Statut & Décision</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRequests.map((req: any) => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';
                  const isRejected = req.status === 'rejected';
                  const isEdt = !req.type_modification || req.type_modification === 'emploi_du_temps';

                  const teacherName = `${req.prenom || ''} ${req.nom || ''}`.trim() || 'Enseignant';

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Type Badge */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isEdt ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock size={12} className="text-amber-600" />
                            Emploi du Temps
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                            <FileSpreadsheet size={12} className="text-indigo-600" />
                            Notes & Notes
                          </span>
                        )}
                      </td>

                      {/* Teacher info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {req.prenom ? req.prenom[0].toUpperCase() : 'P'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {teacherName}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {req.matricule || req.telephone || 'Professeur'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Target & Scope */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {req.classe_nom && (
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-normal">Classe :</span>
                              {formatClassName(req.classe_nom)}
                            </div>
                          )}
                          {req.matiere_nom && (
                            <div className="text-[11px] text-indigo-700 font-semibold flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-normal">Matière :</span>
                              {req.matiere_nom}
                            </div>
                          )}
                          {isEdt ? (
                            (req.jour || req.heure_debut) && (
                              <div className="text-[11px] text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-lg border border-amber-200/50 w-fit font-medium">
                                📅 {req.jour || 'Jour non spécifié'} {req.heure_debut ? `de ${req.heure_debut} à ${req.heure_fin}` : ''}
                              </div>
                            )
                          ) : (
                            <div className="text-[11px] text-indigo-800 bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-200/50 w-fit font-medium">
                              📝 Trimestre {req.trimestre || 1} • {req.type_evaluation || 'Toutes évaluations'}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Description & Note */}
                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-medium text-slate-800 text-xs leading-relaxed line-clamp-3">
                          {req.description}
                        </div>
                        {req.reponse_admin && (
                          <div className="mt-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-1.5">
                            <MessageSquare size={12} className="text-slate-400 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-bold text-slate-700">Direction : </span>
                              {req.reponse_admin}
                            </div>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <Calendar size={10} />
                          {req.created_at ? new Date(req.created_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200/60">
                            <Clock size={12} />
                            En attente
                          </span>
                        )}
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200/60">
                            <CheckCircle2 size={12} />
                            Approuvée
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200/60">
                            <XCircle size={12} />
                            Rejetée
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        {isAuthorizedStaff ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <>
                                <button
                                  onClick={() => openProcessModal(req, 'approved')}
                                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 border border-emerald-200 hover:border-emerald-600 shadow-sm"
                                  title="Approuver la demande"
                                >
                                  <Check size={14} />
                                  Approuver
                                </button>
                                <button
                                  onClick={() => openProcessModal(req, 'rejected')}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 border border-rose-200 hover:border-rose-600 shadow-sm"
                                  title="Rejeter la demande"
                                >
                                  <X size={14} />
                                  Rejeter
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleResetStatus(req.id)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                                title="Remettre en attente"
                              >
                                <RotateCcw size={12} />
                                Réinitialiser
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">
                            {isPending ? 'En attente d\'approbation' : isApproved ? 'Autorisation active' : 'Demande rejetée'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Process Request (Approve / Reject with optional note) */}
      {processingRequest && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
            <div className={`p-5 border-b flex items-center justify-between text-white ${
              actionType === 'approved' 
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600' 
                : 'bg-gradient-to-r from-rose-600 to-red-600'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  {actionType === 'approved' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h2 className="text-base font-bold">
                    {actionType === 'approved' 
                      ? `Approuver l'autorisation (${processingRequest.type_modification === 'notes' ? 'Notes' : 'Emploi du Temps'})`
                      : "Rejeter la demande"}
                  </h2>
                  <p className="text-xs text-white/80">
                    Professeur : {processingRequest.prenom} {processingRequest.nom}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setProcessingRequest(null)}
                className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProcessSubmit} className="p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Périmètre demandé :
                </div>
                <div className="text-slate-800 font-semibold">
                  {processingRequest.classe_nom && `Classe : ${formatClassName(processingRequest.classe_nom)} • `}
                  {processingRequest.matiere_nom && `Matière : ${processingRequest.matiere_nom}`}
                </div>
                {processingRequest.type_modification === 'notes' ? (
                  <div className="text-indigo-700 font-medium">
                    Trimestre {processingRequest.trimestre || 1} • {processingRequest.type_evaluation || 'Toutes évaluations'}
                  </div>
                ) : (
                  (processingRequest.jour || processingRequest.heure_debut) && (
                    <div className="text-amber-700 font-medium">
                      {processingRequest.jour} de {processingRequest.heure_debut} à {processingRequest.heure_fin}
                    </div>
                  )
                )}
                <div className="text-slate-600 mt-2 text-xs border-t border-slate-200/60 pt-1.5">
                  <span className="font-semibold text-slate-700">Motif : </span>
                  {processingRequest.description}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Instructions ou note pour l'enseignant (Optionnel)
                </label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder={
                    actionType === 'approved'
                      ? "Ex : Autorisation accordée. Vous pouvez modifier votre programme dans la classe convenue."
                      : "Ex : Demande refusée car ce créneau est déjà attribué à un autre cours..."
                  }
                  className="w-full rounded-2xl border border-slate-300 p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ce message sera envoyé directement dans la notification de l'enseignant.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProcessingRequest(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5 ${
                    actionType === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  <Send size={14} />
                  {isSubmittingAction ? 'Enregistrement...' : actionType === 'approved' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: New Request (Teacher) */}
      {showNewModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold">Nouvelle Demande de Modification</h2>
                  <p className="text-xs text-amber-100">Transmise au Censeur et à la Direction des Études</p>
                </div>
              </div>
              <button onClick={() => setShowNewModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateNewRequest} className="p-6 space-y-4 overflow-y-auto">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Type de modification
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setReqType('emploi_du_temps')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      reqType === 'emploi_du_temps' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Clock size={14} className="text-amber-500" />
                    Emploi du Temps
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqType('notes')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      reqType === 'notes' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet size={14} className="text-indigo-500" />
                    Notes & Évaluations
                  </button>
                </div>
              </div>

              {/* Classe selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Classe concernée *
                </label>
                <select
                  value={reqClasseId}
                  onChange={e => setReqClasseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  required
                >
                  <option value="">Sélectionner une classe</option>
                  {classesList.map((c: any) => (
                    <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>
                  ))}
                </select>
                {reqType === 'notes' && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Seules vos classes d'intervention sont éligibles pour une modification de notes.
                  </p>
                )}
              </div>

              {/* Matiere selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Matière concernée *
                </label>
                <select
                  value={reqMatiereId}
                  onChange={e => setReqMatiereId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  required
                >
                  <option value="">Sélectionner votre matière</option>
                  {matieresList.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              {/* Conditional Fields for Emploi du Temps */}
              {reqType === 'emploi_du_temps' ? (
                <div className="p-3.5 bg-amber-50/60 rounded-2xl border border-amber-200/60 space-y-3">
                  <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Créneau horaire souhaité à modifier
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Jour</label>
                    <select
                      value={reqJour}
                      onChange={e => setReqJour(e.target.value)}
                      className="w-full bg-white border border-amber-200 rounded-xl text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Heure début</label>
                      <select
                        value={reqHeureDebut}
                        onChange={e => setReqHeureDebut(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {HEURES_DEBUT.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Heure fin</label>
                      <select
                        value={reqHeureFin}
                        onChange={e => setReqHeureFin(e.target.value)}
                        className="w-full bg-white border border-amber-200 rounded-xl text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500"
                      >
                        {HEURES_FIN.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                /* Conditional Fields for Notes */
                <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-200/60 space-y-3">
                  <div className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    Périmètre de l'évaluation à modifier
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Trimestre</label>
                      <select
                        value={reqTrimestre}
                        onChange={e => setReqTrimestre(parseInt(e.target.value))}
                        className="w-full bg-white border border-indigo-200 rounded-xl text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={1}>Trimestre 1</option>
                        <option value={2}>Trimestre 2</option>
                        <option value={3}>Trimestre 3</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Évaluation</label>
                      <select
                        value={reqEvalType}
                        onChange={e => setReqEvalType(e.target.value)}
                        className="w-full bg-white border border-indigo-200 rounded-xl text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {EVAL_TYPES.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Description / Motif */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Motif et détails de la demande *
                </label>
                <textarea
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder={
                    reqType === 'emploi_du_temps'
                      ? "Ex : Échange de créneau avec un collègue pour cause de contrainte pédagogique..."
                      : "Ex : Rectification d'une note suite à réclamation justifiée d'un élève après vérification de copie..."
                  }
                  className="w-full rounded-2xl border border-slate-300 p-3 text-xs outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all leading-relaxed"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNew}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send size={14} />
                  {isSubmittingNew ? 'Envoi en cours...' : 'Envoyer la Demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
