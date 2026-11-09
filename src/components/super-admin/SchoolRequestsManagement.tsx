import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  School, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  Check, 
  X, 
  Trash2, 
  Copy, 
  KeyRound, 
  CreditCard, 
  Smartphone, 
  Calendar, 
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  ExternalLink,
  BellRing,
  MoreVertical,
  History,
  LifeBuoy
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SchoolRequestsManagementProps {
  onSchoolApproved?: () => void;
}

export default function SchoolRequestsManagement({ onSchoolApproved }: SchoolRequestsManagementProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'complaints'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ total: 0, pending: 0, payment_confirmed: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedRequestDetails, setSelectedRequestDetails] = useState<any | null>(null);
  const [approvingRequest, setApprovingRequest] = useState<any | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);
  
  // Notice modal state
  const [notifyingRequest, setNotifyingRequest] = useState<any | null>(null);
  const [submittingNotice, setSubmittingNotice] = useState(false);

  // Approval form state
  const [approveForm, setApproveForm] = useState({
    code_ecole: '',
    custom_password: '',
    plan_abonnement: 'PRO',
    duree_mois: '12',
    admin_notes: ''
  });
  const [submittingApprove, setSubmittingApprove] = useState(false);
  const [submittingReject, setSubmittingReject] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  const [approvedCredentialsResult, setApprovedCredentialsResult] = useState<any | null>(null);

  // Complaint resolving state
  const [resolvingComplaint, setResolvingComplaint] = useState<any | null>(null);
  const [complaintResponse, setComplaintResponse] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const [reqsRes, compRes] = await Promise.all([
        fetch('/api/super-admin/school-requests', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/super-admin/complaints', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (reqsRes.ok) {
        const data = await reqsRes.json();
        setRequests(data.requests || []);
        setStats(data.stats || { total: 0, pending: 0, payment_confirmed: 0, approved: 0, rejected: 0 });
      }

      if (compRes.ok) {
        const data = await compRes.json();
        setComplaints(data || []);
      }
    } catch (err) {
      console.error("Erreur récupération données:", err);
      toast.error("Impossible de charger les données.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copié !`);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // 1. Send specific notice
  const handleSendNotice = async (requestId: number, type: string) => {
    setSubmittingNotice(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/school-requests/${requestId}/send-notice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'envoi");

      toast.success("Notification envoyée avec succès !");
      setNotifyingRequest(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmittingNotice(false);
    }
  };

  // 2. Resolve Complaint
  const handleResolveComplaint = async (complaintId: number, status: 'resolved' | 'closed') => {
    setSubmittingResolve(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/complaints/${complaintId}/resolve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ admin_response: complaintResponse, status })
      });

      if (res.ok) {
        toast.success("Réclamation traitée.");
        setResolvingComplaint(null);
        setComplaintResponse('');
        fetchData();
      }
    } catch (err) {
      toast.error("Erreur de traitement.");
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Open Approval Modal
  const handleOpenApprove = (req: any) => {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase();
    const cleanCode = `MF-${req.nom_ecole.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'SCH')}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    setApproveForm({
      code_ecole: cleanCode,
      custom_password: `Edu2026!${randomSuffix}`,
      plan_abonnement: req.plan_souhaite || 'PRO',
      duree_mois: '12',
      admin_notes: 'Demande validée et compte école configuré avec succès.'
    });
    setApprovingRequest(req);
    setApprovedCredentialsResult(null);
  };

  // Submit Approval
  const handleConfirmApprove = async () => {
    if (!approvingRequest) return;
    setSubmittingApprove(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/school-requests/${approvingRequest.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(approveForm)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'approbation");
      }

      toast.success(data.message || "Établissement validé et compte créé !");
      setApprovedCredentialsResult(data.credentials);
      fetchData();
      if (onSchoolApproved) onSchoolApproved();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la validation");
    } finally {
      setSubmittingApprove(false);
    }
  };

  // Submit Reject
  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setSubmittingReject(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/school-requests/${rejectingRequest.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ motif_rejet: rejectReason })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec du rejet");
      }

      toast.success("Demande rejetée.");
      setRejectingRequest(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du rejet");
    } finally {
      setSubmittingReject(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deletingRequestId) return;
    setSubmittingDelete(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/school-requests/${deletingRequestId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Dossier de demande supprimé.");
        setDeletingRequestId(null);
        fetchData();
      }
    } catch (err) {
      toast.error("Erreur de suppression.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Direct WhatsApp contact link
  const getWhatsAppContactLink = (req: any) => {
    const rawNumber = (req.demandeur_whatsapp || req.demandeur_telephone || '').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Bonjour ${req.demandeur_nom}, nous vous contactons depuis l'administration de MégafixaEduc Pro concernant votre demande d'ouverture de compte pour l'école « ${req.nom_ecole} » (Réf : ${req.reference}).`
    );
    return `https://wa.me/${rawNumber}?text=${message}`;
  };

  // Filtered requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch = 
      r.nom_ecole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.demandeur_nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.demandeur_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.demandeur_telephone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.ville?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'pending' ? (r.statut === 'pending' || r.statut === 'payment_pending') :
      r.statut === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingComplaintsCount = complaints.filter(c => c.statut === 'pending').length;

  return (
    <div className="space-y-6">

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('requests')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
            activeTab === 'requests' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <History size={16} />
          <span>Dossiers de Demandes ({requests.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('complaints')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer relative",
            activeTab === 'complaints' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
          )}
        >
          <LifeBuoy size={16} />
          <span>Réclamations & SAV</span>
          {pendingComplaintsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-slate-100">
              {pendingComplaintsCount}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'requests' ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <School size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Demandes Totales</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{stats.total || requests.length}</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <CreditCard size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Paiement Signalé</p>
                <p className="text-xl font-black text-emerald-800 leading-tight mt-0.5">
                  {stats.payment_confirmed || requests.filter(r => r.statut === 'payment_confirmed').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">En Attente (24H)</p>
                <p className="text-xl font-black text-amber-800 leading-tight mt-0.5">
                  {stats.pending || requests.filter(r => r.statut === 'pending' || r.statut === 'payment_pending').length}
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/40 to-white shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Comptes Validés</p>
                <p className="text-xl font-black text-blue-800 leading-tight mt-0.5">
                  {stats.approved || requests.filter(r => r.statut === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher par école, demandeur, email, téléphone, référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold text-slate-400 shrink-0">Filtrer :</span>
              {[
                { id: 'all', label: 'Toutes' },
                { id: 'payment_confirmed', label: '💰 Paiements' },
                { id: 'pending', label: '⏳ En Attente' },
                { id: 'approved', label: '✅ Validées' },
                { id: 'rejected', label: '❌ Rejetées' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    statusFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2" />
                <p className="text-xs font-semibold">Chargement des demandes...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <School className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-bold text-slate-600">Aucune demande trouvée</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Dossier / Date</th>
                      <th className="py-3.5 px-4">Établissement</th>
                      <th className="py-3.5 px-4">Promoteur</th>
                      <th className="py-3.5 px-4">Statut / Relances</th>
                      <th className="py-3.5 px-4 text-center">Contact</th>
                      <th className="py-3.5 px-4 text-right">Traitement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                    {filteredRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                            {req.reference}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {new Date(req.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 text-sm">{req.nom_ecole}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {req.ville || 'N/A'} • {req.plan_souhaite}
                          </p>
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{req.demandeur_nom}</p>
                          <p className="text-[11px] text-indigo-600 font-mono">{req.demandeur_telephone}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1.5">
                            {req.statut === 'payment_confirmed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 size={12} />
                                <span>Paiement Signalé</span>
                              </span>
                            ) : req.statut === 'approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                <Check size={12} />
                                <span>Validé</span>
                              </span>
                            ) : req.statut === 'rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <X size={12} />
                                <span>{req.auto_rejected_at ? 'Auto-Rejeté (24H)' : 'Rejeté'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                <Clock size={12} />
                                <span>Attente</span>
                              </span>
                            )}
                            
                            {req.last_notice_sent_at && (
                              <p className="text-[9px] text-slate-400 flex items-center gap-1">
                                <BellRing size={10} className="text-amber-500" />
                                <span>Averti le {new Date(req.last_notice_sent_at).toLocaleDateString()}</span>
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <a href={getWhatsAppContactLink(req)} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                              <MessageSquare size={16} />
                            </a>
                            <button 
                              onClick={() => setNotifyingRequest(req)} 
                              className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"
                              title="Envoyer un avertissement spécifique"
                            >
                              <BellRing size={16} />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => setSelectedRequestDetails(req)} className="p-1.5 text-slate-500 hover:text-indigo-600"><Eye size={17} /></button>
                            {req.statut !== 'approved' && (
                              <button onClick={() => handleOpenApprove(req)} className="px-2.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl">Accepter</button>
                            )}
                            {req.statut !== 'approved' && req.statut !== 'rejected' && (
                              <button onClick={() => { setRejectingRequest(req); setRejectReason(''); }} className="p-1.5 text-slate-400 hover:text-rose-600"><X size={17} /></button>
                            )}
                            <button onClick={() => setDeletingRequestId(req.id)} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Complaints View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <LifeBuoy className="text-rose-500" />
              <span>Réclamations des Demandeurs</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">Traitement des dossiers rejetés après auto-rejet ou erreur.</p>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {complaints.length === 0 ? (
              <div className="p-16 text-center text-slate-400">
                <LifeBuoy className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold">Aucune réclamation enregistrée</p>
                <p className="text-xs mt-1">Les plaintes des utilisateurs rejetés s'afficheront ici.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <div key={c.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                            c.statut === 'pending' ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {c.statut === 'pending' ? 'En attente' : 'Traitée'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">• Réf : {c.reference}</span>
                          <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900">{c.nom_ecole}</h4>
                          <p className="text-[11px] text-slate-500">{c.demandeur_nom} • {c.demandeur_email} • {c.demandeur_telephone}</p>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs italic text-slate-700 leading-relaxed">
                          "{c.message}"
                        </div>

                        {c.admin_response && (
                          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-xs text-emerald-800">
                            <span className="font-bold block mb-1">Ma réponse :</span>
                            {c.admin_response}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a href={getWhatsAppContactLink(c)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-[11px] font-bold rounded-xl shadow-sm">
                          <MessageSquare size={14} />
                          WhatsApp
                        </a>
                        {c.statut === 'pending' && (
                          <button
                            onClick={() => { setResolvingComplaint(c); setComplaintResponse(''); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-xl shadow-sm"
                          >
                            <Check size={14} />
                            Répondre & Valider
                          </button>
                        )}
                        <button onClick={() => setSelectedRequestDetails(c)} className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200">
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notice Modal */}
      {notifyingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Prévenir le demandeur</h3>
              <button onClick={() => setNotifyingRequest(null)} className="p-1 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <p className="text-xs text-slate-600">Choisissez le type de notification à envoyer par Email et WhatsApp :</p>
            
            <div className="space-y-2">
              <button
                disabled={submittingNotice}
                onClick={() => handleSendNotice(notifyingRequest.id, 'payment_missing')}
                className="w-full p-4 text-left border border-slate-200 rounded-2xl hover:bg-amber-50 hover:border-amber-200 transition-all group"
              >
                <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700">Paiement non reçu</p>
                <p className="text-[10px] text-slate-500">Rappel pour le versement Mobile Money.</p>
              </button>
              
              <button
                disabled={submittingNotice}
                onClick={() => handleSendNotice(notifyingRequest.id, 'incorrect_reference')}
                className="w-full p-4 text-left border border-slate-200 rounded-2xl hover:bg-rose-50 hover:border-rose-200 transition-all group"
              >
                <p className="text-xs font-bold text-slate-900 group-hover:text-rose-700">Référence incorrecte</p>
                <p className="text-[10px] text-slate-500">La référence fournie ne correspond à aucune transaction.</p>
              </button>
              
              <button
                disabled={submittingNotice}
                onClick={() => handleSendNotice(notifyingRequest.id, 'pending_24h')}
                className="w-full p-4 text-left border border-slate-200 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all group"
              >
                <p className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">Mise en attente 24H</p>
                <p className="text-[10px] text-slate-500">Informer que le dossier sera traité prochainement.</p>
              </button>
            </div>

            {submittingNotice && (
              <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-indigo-600 animate-pulse">
                <Send size={12} />
                <span>Envoi en cours...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolve Complaint Modal */}
      {resolvingComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-black text-slate-900">Traiter la réclamation</h3>
            <div className="p-3 bg-slate-50 rounded-xl border text-xs text-slate-600 italic">
              "{resolvingComplaint.message}"
            </div>
            <textarea
              rows={4}
              value={complaintResponse}
              onChange={(e) => setComplaintResponse(e.target.value)}
              placeholder="Votre réponse au demandeur (optionnel)..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none"
            />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResolvingComplaint(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Annuler</button>
              <button
                disabled={submittingResolve}
                onClick={() => handleResolveComplaint(resolvingComplaint.id, 'resolved')}
                className="flex-1 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-lg"
              >
                {submittingResolve ? 'Chargement...' : 'Réclamation Résolue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {approvingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Valider & Créer l'Établissement</h3>
                  <p className="text-xs text-slate-500">{approvingRequest.nom_ecole}</p>
                </div>
              </div>
              <button onClick={() => setApprovingRequest(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><X size={18} /></button>
            </div>

            {approvedCredentialsResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
                  <p className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Compte école initialisé avec succès !</span>
                  </p>
                  <p className="text-xs text-emerald-800">Les accès ont été envoyés par Email et WhatsApp.</p>
                </div>
                <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Code École :</span>
                    <span className="font-bold text-emerald-400">{approvedCredentialsResult.code_ecole}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Mot de passe :</span>
                    <span className="font-bold text-amber-400">{approvedCredentialsResult.default_password}</span>
                  </div>
                </div>
                <button onClick={() => { setApprovingRequest(null); setApprovedCredentialsResult(null); }} className="w-full py-3 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-lg">Terminer</button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Code École unique attribué</label>
                    <input type="text" value={approveForm.code_ecole} onChange={(e) => setApproveForm({ ...approveForm, code_ecole: e.target.value.toUpperCase() })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Mot de passe initial généré</label>
                    <input type="text" value={approveForm.custom_password} onChange={(e) => setApproveForm({ ...approveForm, custom_password: e.target.value })} className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Formule</label>
                      <select value={approveForm.plan_abonnement} onChange={(e) => setApproveForm({ ...approveForm, plan_abonnement: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                        <option value="PRO">Formule Pro</option>
                        <option value="EXCELLENCE">Excellence Illimitée</option>
                        <option value="DECOUVERTE">Découverte (Gratuit)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Durée (Mois)</label>
                      <select value={approveForm.duree_mois} onChange={(e) => setApproveForm({ ...approveForm, duree_mois: e.target.value })} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
                        <option value="12">12 Mois (1 an)</option>
                        <option value="6">6 Mois</option>
                        <option value="24">24 Mois (2 ans)</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setApprovingRequest(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Annuler</button>
                  <button onClick={handleConfirmApprove} disabled={submittingApprove} className="flex-1 py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg disabled:opacity-50">
                    {submittingApprove ? 'Validation...' : 'Confirmer l\'ouverture'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <h3 className="text-base font-black text-slate-900">Rejeter la Demande</h3>
            <textarea rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Indiquez le motif..." className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRejectingRequest(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Annuler</button>
              <button onClick={handleConfirmReject} disabled={submittingReject} className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg disabled:opacity-50">
                {submittingReject ? 'Chargement...' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deletingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto"><Trash2 size={24} /></div>
            <h3 className="text-base font-black text-slate-900">Supprimer la Demande ?</h3>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDeletingRequestId(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Annuler</button>
              <button onClick={handleConfirmDelete} disabled={submittingDelete} className="flex-1 py-2.5 bg-rose-600 text-white font-bold text-xs rounded-xl">{submittingDelete ? '...' : 'Supprimer'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedRequestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">{selectedRequestDetails.nom_ecole}</h3>
              <button onClick={() => setSelectedRequestDetails(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"><X size={18} /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block font-bold uppercase tracking-widest text-[9px]">Détails École</span>
                <p><strong>Code :</strong> {selectedRequestDetails.reference}</p>
                <p><strong>Ville :</strong> {selectedRequestDetails.ville}</p>
                <p><strong>Tél :</strong> {selectedRequestDetails.telephone_ecole}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 block font-bold uppercase tracking-widest text-[9px]">Promoteur</span>
                <p><strong>Nom :</strong> {selectedRequestDetails.demandeur_nom}</p>
                <p><strong>Email :</strong> {selectedRequestDetails.demandeur_email}</p>
                <p><strong>WhatsApp :</strong> {selectedRequestDetails.demandeur_whatsapp || selectedRequestDetails.demandeur_telephone}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
               <div className="flex justify-between"><span className="text-slate-500">Statut actuel :</span><span className="font-bold">{selectedRequestDetails.statut}</span></div>
               <div className="flex justify-between"><span className="text-slate-500">Réf Paiement :</span><span className="font-mono font-bold text-indigo-600">{selectedRequestDetails.payment_reference || 'N/A'}</span></div>
               {selectedRequestDetails.motif_rejet && (
                 <div className="mt-2 p-2 bg-rose-50 text-rose-700 rounded-lg"><strong>Motif rejet :</strong> {selectedRequestDetails.motif_rejet}</div>
               )}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setSelectedRequestDetails(null)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl">Fermer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
