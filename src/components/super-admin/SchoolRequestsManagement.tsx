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
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SchoolRequestsManagementProps {
  onSchoolApproved?: () => void;
}

export default function SchoolRequestsManagement({ onSchoolApproved }: SchoolRequestsManagementProps) {
  const [requests, setRequests] = useState<any[]>([]);
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

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/super-admin/school-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
        setStats(data.stats || { total: 0, pending: 0, payment_confirmed: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error("Erreur récupération demandes:", err);
      toast.error("Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copié !`);
    setTimeout(() => setCopiedField(null), 2500);
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
      fetchRequests();
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
      fetchRequests();
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
        fetchRequests();
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

  return (
    <div className="space-y-6">

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
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Paiement Signalé (24H)</p>
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
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">En Attente Paiement</p>
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
          <span className="text-xs font-bold text-slate-400 shrink-0">Statut :</span>
          {[
            { id: 'all', label: 'Toutes' },
            { id: 'payment_confirmed', label: '💰 Paiement Reçu' },
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
            <p className="text-[11px] text-slate-400 mt-0.5">Les nouvelles demandes d'adhésion s'afficheront ici automatiquement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4">Dossier / Date</th>
                  <th className="py-3.5 px-4">Établissement</th>
                  <th className="py-3.5 px-4">Demandeur (Promoteur)</th>
                  <th className="py-3.5 px-4">Formule / Montant</th>
                  <th className="py-3.5 px-4">Statut / Paiement</th>
                  <th className="py-3.5 px-4 text-center">Contact Direct</th>
                  <th className="py-3.5 px-4 text-right">Traitement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Reference & Date */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                        {req.reference}
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(req.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </td>

                    {/* School Info */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900 text-sm">{req.nom_ecole}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {req.type_etablissement || 'Général'} • {req.ville || 'N/A'} ({req.pays || 'Bénin'})
                      </p>
                    </td>

                    {/* Applicant Info */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{req.demandeur_nom}</p>
                      <p className="text-[11px] text-slate-400">{req.demandeur_fonction || 'Directeur'}</p>
                      <p className="text-[11px] text-indigo-600 font-mono mt-0.5">{req.demandeur_telephone}</p>
                    </td>

                    {/* Plan & Amount */}
                    <td className="py-3.5 px-4">
                      <span className="font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {req.plan_souhaite || 'PRO'}
                      </span>
                      <p className="font-bold text-slate-700 text-xs mt-1">
                        {req.montant_estime ? `${Number(req.montant_estime).toLocaleString()} F` : '0 F'}
                      </p>
                    </td>

                    {/* Status & Payment */}
                    <td className="py-3.5 px-4">
                      {req.statut === 'payment_confirmed' ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>Paiement Signalé</span>
                          </span>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {req.payment_method || 'Mobile Money'} ({req.payment_phone || 'Tél'})
                          </p>
                        </div>
                      ) : req.statut === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <Check size={12} />
                          <span>Validée (Compte Actif)</span>
                        </span>
                      ) : req.statut === 'rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          <X size={12} />
                          <span>Rejetée</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={12} />
                          <span>Attente Paiement</span>
                        </span>
                      )}
                    </td>

                    {/* Contact Buttons */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* WhatsApp Button */}
                        <a
                          href={getWhatsAppContactLink(req)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
                          title="Contacter directement sur WhatsApp"
                        >
                          <MessageSquare size={16} />
                        </a>

                        {/* Phone Button */}
                        <a
                          href={`tel:${req.demandeur_telephone}`}
                          className="w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
                          title="Appeler par téléphone"
                        >
                          <Phone size={16} />
                        </a>

                        {/* Email Button */}
                        <a
                          href={`mailto:${req.demandeur_email}?subject=Demande%20de%20création%20d'école%20${req.reference}`}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-700 text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-sm"
                          title="Envoyer un email"
                        >
                          <Mail size={16} />
                        </a>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRequestDetails(req)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Voir les détails complets"
                        >
                          <Eye size={17} />
                        </button>

                        {req.statut !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => handleOpenApprove(req)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                            title="Accepter et créer l'école"
                          >
                            <Check size={14} />
                            <span>Accepter</span>
                          </button>
                        )}

                        {req.statut !== 'approved' && req.statut !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => { setRejectingRequest(req); setRejectReason(''); }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Rejeter la demande"
                          >
                            <X size={17} />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeletingRequestId(req.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer ce dossier"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================== */}
      {/* MODAL 1: DÉTAILS COMPLETS DU DOSSIER */}
      {/* ========================================================== */}
      {selectedRequestDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <School size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Réf : {selectedRequestDetails.reference}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-0.5">{selectedRequestDetails.nom_ecole}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedRequestDetails(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* School Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">1. Établissement Scolaire</h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Type :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.type_etablissement || 'Général'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Pays & Ville :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.ville || 'N/A'}, {selectedRequestDetails.pays || 'Bénin'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Adresse :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.adresse || 'Non renseignée'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Tél École :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.telephone_ecole || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Applicant Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">2. Demandeur (Promoteur / Directeur)</h4>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Nom :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.demandeur_nom}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Fonction :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.demandeur_fonction || 'Directeur'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Email :</span>
                  <span className="font-bold text-indigo-600">{selectedRequestDetails.demandeur_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px] block">Téléphone / WhatsApp :</span>
                  <span className="font-bold text-emerald-700">{selectedRequestDetails.demandeur_whatsapp || selectedRequestDetails.demandeur_telephone}</span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">3. Formule & Règlement Mobile Money</h4>
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Formule demandée :</span>
                  <span className="font-black text-slate-900">{selectedRequestDetails.plan_souhaite} ({Number(selectedRequestDetails.montant_estime || 0).toLocaleString()} FCFA)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Moyen Mobile Money :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.payment_method || 'Non encore confirmé'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Numéro payeur :</span>
                  <span className="font-bold text-slate-800">{selectedRequestDetails.payment_phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Réf transaction payeur :</span>
                  <span className="font-mono font-bold text-emerald-800">{selectedRequestDetails.payment_reference || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Actions in details */}
            <div className="flex items-center justify-between pt-2">
              <a
                href={getWhatsAppContactLink(selectedRequestDetails)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <MessageSquare size={15} />
                <span>Contacter sur WhatsApp</span>
              </a>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRequestDetails(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
                >
                  Fermer
                </button>
                {selectedRequestDetails.statut !== 'approved' && (
                  <button
                    type="button"
                    onClick={() => {
                      const req = selectedRequestDetails;
                      setSelectedRequestDetails(null);
                      handleOpenApprove(req);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md"
                  >
                    <Check size={15} />
                    <span>Valider & Créer le Compte</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 2: APPROBATION ET CRÉATION AUTOMATIQUE DU COMPTE */}
      {/* ========================================================== */}
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
              <button
                onClick={() => setApprovingRequest(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {/* Generated Credentials Result if Success */}
            {approvedCredentialsResult ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 space-y-2">
                  <p className="font-bold text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span>Compte école initialisé avec succès !</span>
                  </p>
                  <p className="text-xs leading-relaxed text-emerald-800">
                    Les accès ci-dessous ont été enregistrés et envoyés par email au demandeur :
                  </p>
                </div>

                <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Code École :</span>
                    <span className="font-bold text-emerald-400">{approvedCredentialsResult.code_ecole}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Email Admin :</span>
                    <span className="font-bold text-white">{approvedCredentialsResult.email}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                    <span className="text-slate-400">Mot de passe temporaire :</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded">
                        {approvedCredentialsResult.default_password}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(approvedCredentialsResult.default_password, 'Mot de passe')}
                        className="text-slate-400 hover:text-white"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Formule :</span>
                    <span className="text-indigo-400 font-bold">{approvedCredentialsResult.plan}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => { setApprovingRequest(null); setApprovedCredentialsResult(null); }}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Terminer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Le système va créer automatiquement l'espace de l'école <strong className="text-slate-900">{approvingRequest.nom_ecole}</strong>, rattacher le compte administrateur à <strong className="text-slate-900">{approvingRequest.demandeur_email}</strong>, et lui attribuer sa clé de licence SaaS.
                </p>

                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Code École unique attribué</label>
                    <input
                      type="text"
                      value={approveForm.code_ecole}
                      onChange={(e) => setApproveForm({ ...approveForm, code_ecole: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Mot de passe initial généré</label>
                    <input
                      type="text"
                      value={approveForm.custom_password}
                      onChange={(e) => setApproveForm({ ...approveForm, custom_password: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                    <p className="text-[10px] text-slate-400">Le demandeur pourra le changer à tout moment depuis son profil.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Formule d'abonnement</label>
                      <select
                        value={approveForm.plan_abonnement}
                        onChange={(e) => setApproveForm({ ...approveForm, plan_abonnement: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="PRO">Formule Pro</option>
                        <option value="EXCELLENCE">Excellence Illimitée</option>
                        <option value="DECOUVERTE">Découverte (Gratuit)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Durée (Mois)</label>
                      <select
                        value={approveForm.duree_mois}
                        onChange={(e) => setApproveForm({ ...approveForm, duree_mois: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="12">12 Mois (1 an)</option>
                        <option value="6">6 Mois</option>
                        <option value="24">24 Mois (2 ans)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setApprovingRequest(null)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApprove}
                    disabled={submittingApprove}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingApprove ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <Check size={16} />
                        <span>Confirmer l'ouverture</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 3: REJET DE DEMANDE */}
      {/* ========================================================== */}
      {rejectingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Rejeter la Demande</h3>
                <p className="text-xs text-slate-500">{rejectingRequest.nom_ecole}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Indiquez le motif du refus (documents non conformes, absence de versement Mobile Money, etc.) :
            </p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="ex: Versement Mobile Money non constaté sur le compte marchand..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none font-medium"
            />

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={submittingReject}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingReject ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <X size={16} />
                    <span>Confirmer le Rejet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* MODAL 4: SUPPRESSION DE DOSSIER */}
      {/* ========================================================== */}
      {deletingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl relative text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Supprimer la Demande ?</h3>
              <p className="text-xs text-slate-500 mt-1">Ce dossier sera définitivement effacé.</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRequestId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={submittingDelete}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                {submittingDelete ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
