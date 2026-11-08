import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Search, Filter, Link as LinkIcon, Copy, QrCode, 
  ExternalLink, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, 
  ShieldAlert, ShieldCheck, Check, Trash2, Edit3, ArrowUpRight, 
  Download, Printer, RefreshCw, BookOpen, GraduationCap, Mail, Phone,
  ChevronRight, X, Sparkles, Building2, UserPlus, FileSpreadsheet, Lock, Unlock
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useConfirm } from '../contexts/ConfirmContext';
import { jsPDF } from '../utils/compressedPdf';
import autoTable from 'jspdf-autotable';

interface CollectionForm {
  id: number;
  titre: string;
  description: string;
  cycle: string;
  classes_proposees: string;
  classes_details?: any[];
  statut: 'actif' | 'cloture';
  token: string;
  date_expiration?: string;
  created_at: string;
  stats?: {
    total: number;
    en_attente: number;
    valide: number;
    rejete: number;
    bloque: number;
  };
}

interface TeacherResponse {
  id: number;
  formulaire_id: number;
  formulaire_titre?: string;
  code_suivi: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  matiere_principale: string;
  matiere_secondaire?: string;
  classes_tenues: { id: number; nom: string; niveau?: string }[];
  emploi_du_temps: {
    classe_id: number;
    classe_nom: string;
    jour: string;
    heure_debut: string;
    heure_fin: string;
    salle?: string;
  }[];
  statut: 'en_attente' | 'valide' | 'rejete' | 'bloque';
  motif_rejet?: string;
  est_bloque: number;
  integre_enseignant_id?: number;
  integre_emploi_temps: number;
  remarques_admin?: string;
  created_at: string;
}

export default function TeacherCollectionManagement() {
  const confirm = useConfirm();

  const [activeTab, setActiveTab] = useState<'formulaires' | 'reponses' | 'bloques'>('reponses');
  const [loading, setLoading] = useState(false);

  // Forms and responses
  const [forms, setForms] = useState<CollectionForm[]>([]);
  const [responses, setResponses] = useState<TeacherResponse[]>([]);
  const [blockedList, setBlockedList] = useState<any[]>([]);
  const [classesList, setClassesList] = useState<any[]>([]);

  // Filters
  const [selectedFormFilter, setSelectedFormFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingForm, setEditingForm] = useState<CollectionForm | null>(null);
  const [selectedResponse, setSelectedResponse] = useState<TeacherResponse | null>(null);
  const [showQrModal, setShowQrModal] = useState<CollectionForm | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<{ id: number; isBlock: boolean } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form Editor State
  const [formTitre, setFormTitre] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSelectedClasses, setFormSelectedClasses] = useState<number[]>([]);
  const [formExpiration, setFormExpiration] = useState('');

  // Load secondary classes
  const fetchClasses = async () => {
    try {
      const res = await apiFetch('/api/classes');
      const data = await res.json();
      if (Array.isArray(data)) {
        // Filter secondary classes
        const secClasses = data.filter((c: any) => {
          const niveau = (c.niveau || '').toLowerCase();
          const isPrim = (
            niveau.includes('maternelle') ||
            niveau.includes('primaire') ||
            niveau.includes('ci') || niveau.includes('cp') ||
            niveau.includes('ce1') || niveau.includes('ce2') ||
            niveau.includes('cm1') || niveau.includes('cm2')
          );
          return !isPrim;
        });
        setClassesList(secClasses);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch all collection campaigns
  const fetchForms = async () => {
    try {
      const res = await apiFetch('/api/collecte-enseignants/formulaires');
      const data = await res.json();
      if (Array.isArray(data)) {
        setForms(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch all submitted responses
  const fetchResponses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/collecte-enseignants/reponses');
      const data = await res.json();
      if (Array.isArray(data)) {
        setResponses(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch blocked respondents
  const fetchBlocked = async () => {
    try {
      const res = await apiFetch('/api/collecte-enseignants/bloques');
      const data = await res.json();
      if (Array.isArray(data)) {
        setBlockedList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchForms();
    fetchResponses();
    fetchBlocked();
  }, []);

  // Filtered responses
  const filteredResponses = useMemo(() => {
    return responses.filter(r => {
      const matchForm = selectedFormFilter === 'all' || String(r.formulaire_id) === String(selectedFormFilter);
      const matchStatus = selectedStatusFilter === 'all' || r.statut === selectedStatusFilter;
      const s = searchTerm.toLowerCase().trim();
      const matchSearch = !s ||
        (r.nom && r.nom.toLowerCase().includes(s)) ||
        (r.prenom && r.prenom.toLowerCase().includes(s)) ||
        (r.email && r.email.toLowerCase().includes(s)) ||
        (r.matiere_principale && r.matiere_principale.toLowerCase().includes(s)) ||
        (r.code_suivi && r.code_suivi.toLowerCase().includes(s));
      return matchForm && matchStatus && matchSearch;
    });
  }, [responses, selectedFormFilter, selectedStatusFilter, searchTerm]);

  // Overall KPIs
  const totalSubmissions = responses.length;
  const pendingSubmissions = responses.filter(r => r.statut === 'en_attente').length;
  const validatedSubmissions = responses.filter(r => r.statut === 'valide').length;
  const rejectedSubmissions = responses.filter(r => r.statut === 'rejete' || r.statut === 'bloque').length;

  // Open Create/Edit Form Modal
  const openFormModal = (f?: CollectionForm) => {
    if (f) {
      setEditingForm(f);
      setFormTitre(f.titre);
      setFormDescription(f.description || '');
      setFormExpiration(f.date_expiration ? f.date_expiration.split('T')[0] : '');
      try {
        const ids = typeof f.classes_proposees === 'string' ? JSON.parse(f.classes_proposees) : f.classes_proposees;
        setFormSelectedClasses(Array.isArray(ids) ? ids : []);
      } catch (e) {
        setFormSelectedClasses([]);
      }
    } else {
      setEditingForm(null);
      setFormTitre('Fiche de Renseignements Professeurs — Secondaire');
      setFormDescription('Veuillez renseigner vos matières enseignées, classes tenues et vos disponibilités d\'emploi du temps.');
      setFormExpiration('');
      // By default, select all secondary classes
      setFormSelectedClasses(classesList.map(c => c.id));
    }
    setShowCreateModal(true);
  };

  // Submit Form campaign creation/edit
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitre.trim()) {
      toast.error("Veuillez renseigner le titre du formulaire.");
      return;
    }

    try {
      const url = editingForm 
        ? `/api/collecte-enseignants/formulaires/${editingForm.id}`
        : '/api/collecte-enseignants/formulaires';
      const method = editingForm ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: formTitre.trim(),
          description: formDescription.trim(),
          classes_proposees: formSelectedClasses,
          cycle: 'secondaire',
          date_expiration: formExpiration || null
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'enregistrement");
      }

      toast.success(editingForm ? "Formulaire modifié avec succès !" : "Formulaire créé avec succès !");
      setShowCreateModal(false);
      fetchForms();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Toggle Form Status (Actif / Cloture)
  const toggleFormStatus = async (form: CollectionForm) => {
    const newStatus = form.statut === 'actif' ? 'cloture' : 'actif';
    try {
      const res = await apiFetch(`/api/collecte-enseignants/formulaires/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatus })
      });
      if (res.ok) {
        toast.success(newStatus === 'actif' ? "Formulaire réactivé" : "Formulaire clôturé");
        fetchForms();
      }
    } catch (e) {
      toast.error("Erreur de mise à jour");
    }
  };

  // Delete Form
  const handleDeleteForm = async (form: CollectionForm) => {
    const ok = await confirm({
      title: "Supprimer ce formulaire ?",
      message: `Êtes-vous sûr de vouloir supprimer définitivement "${form.titre}" ainsi que toutes les fiches associées ?`,
      confirmText: "Supprimer",
      confirmVariant: "danger"
    });
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/collecte-enseignants/formulaires/${form.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Formulaire supprimé");
        fetchForms();
        fetchResponses();
      }
    } catch (e) {
      toast.error("Erreur de suppression");
    }
  };

  // Copy public form link
  const getPublicLink = (formToken: string) => {
    return `${window.location.origin}/formulaire-enseignant/${formToken}`;
  };

  const copyLink = (formToken: string) => {
    const url = getPublicLink(formToken);
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papier !");
  };

  // Decision actions on response: Valider, Rejeter, Bloquer, Debloquer
  const handleDecision = async (responseId: number, action: 'valider' | 'rejeter' | 'bloquer' | 'debloquer', reason?: string) => {
    try {
      const res = await apiFetch(`/api/collecte-enseignants/reponses/${responseId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          motif_rejet: reason || null
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de mise à jour");

      toast.success(
        action === 'valider' ? "Fiche validée avec succès !" :
        action === 'bloquer' ? "Répondant bloqué et lien révoqué !" :
        action === 'rejeter' ? "Fiche rejetée." : "Répondant débloqué."
      );

      if (selectedResponse?.id === responseId) {
        setSelectedResponse(data);
      }
      setShowRejectModal(null);
      fetchResponses();
      fetchBlocked();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Direct integration into School Database (1-click action)
  const handleIntegrate = async (response: TeacherResponse) => {
    const ok = await confirm({
      title: "Intégrer à la Base de l'Établissement",
      message: `Confirmez-vous l'enregistrement de ${response.prenom} ${response.nom} comme enseignant du secondaire, avec liaison de ses matières et injection de ses ${response.emploi_du_temps?.length || 0} créneau(x) d'emploi du temps ?`,
      confirmText: "Oui, Tout Intégrer",
      confirmVariant: "success"
    });
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/collecte-enseignants/reponses/${response.id}/integrer`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'intégration");

      toast.success(data.message || "Enseignant et cours intégrés avec succès !");
      fetchResponses();
      if (selectedResponse?.id === response.id) {
        setSelectedResponse(prev => prev ? { ...prev, statut: 'valide', integre_emploi_temps: 1 } : null);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Generate Official PDF dossier
  const handleExportPDF = (r: TeacherResponse) => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("ÉTABLISSEMENT SCOLAIRE (SECONDAIRE)", 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text("DOSSIER DE RENSEIGNEMENT ENSEIGNANT & EMPLOI DU TEMPS", 14, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`RÉF : ${r.code_suivi}`, 210 - 14, 23, { align: 'right' });

      // Personal Info Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 38, 182, 38, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 38, 182, 38, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`${r.nom.toUpperCase()} ${r.prenom}`, 20, 48);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Email : ${r.email}  |  Téléphone : ${r.telephone || 'Non renseigné'}`, 20, 56);
      doc.text(`Matière Principale : ${r.matiere_principale}  ${r.matiere_secondaire ? `|  Matière Secondaire : ${r.matiere_secondaire}` : ''}`, 20, 64);
      doc.text(`Classes Tenues : ${(r.classes_tenues || []).map(c => c.nom).join(', ')}`, 20, 71);

      // Timetable Slots Table
      const tableData = (r.emploi_du_temps || []).map((slot, index) => [
        index + 1,
        slot.classe_nom,
        slot.jour,
        `${slot.heure_debut} à ${slot.heure_fin}`,
        slot.salle || 'Salle standard',
        r.matiere_principale
      ]);

      autoTable(doc, {
        startY: 84,
        head: [['N°', 'Classe', 'Jour', 'Plage Horaire', 'Salle', 'Matière']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [13, 148, 136], // Teal-600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 20;
      if (finalY < 240) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("L'Enseignant(e)", 25, finalY);
        doc.text("Le Censeur / La Direction", 140, finalY);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("(Signature)", 25, finalY + 15);
        doc.text("(Cachet & Signature)", 140, finalY + 15);
      }

      doc.save(`Fiche_Enseignant_${r.nom}_${r.prenom}_${r.code_suivi}.pdf`);
      toast.success("Dossier PDF téléchargé avec succès !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur d'exportation PDF");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider text-teal-200">
            <Sparkles size={14} /> Espace Secondaire • Pédagogie & Administration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Collecte des Informations & Horaires Enseignants
          </h1>
          <p className="text-teal-100 text-sm leading-relaxed">
            Créez des formulaires en ligne sécurisés pour collecter les coordonnées, matières enseignées et propositions d'emplois du temps des professeurs, puis intégrez-les en 1 clic dans la base de l'école.
          </p>
        </div>

        <div className="relative z-10 shrink-0 flex flex-wrap gap-3">
          <button
            onClick={() => openFormModal()}
            className="inline-flex items-center gap-2 px-5 py-3 bg-white text-teal-900 hover:bg-teal-50 font-black rounded-2xl shadow-lg transition-all text-sm cursor-pointer"
          >
            <Plus size={18} />
            <span>Nouveau Formulaire</span>
          </button>
        </div>

        <GraduationCap size={160} className="absolute -right-8 -bottom-8 text-white/5 pointer-events-none" />
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Fiches Reçues</span>
            <span className="p-2 bg-teal-50 text-teal-600 rounded-xl">
              <Users size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalSubmissions}</div>
          <p className="text-[11px] text-slate-400 mt-1">Soumissions enregistrées</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">En Attente de Revue</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700">{pendingSubmissions}</div>
          <p className="text-[11px] text-amber-600/80 mt-1">À vérifier par le censeur</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Validées / Intégrées</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700">{validatedSubmissions}</div>
          <p className="text-[11px] text-emerald-600/80 mt-1">Dossiers approuvés</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Rejetées ou Bloquées</span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ShieldAlert size={18} />
            </span>
          </div>
          <div className="text-2xl font-black text-rose-700">{rejectedSubmissions}</div>
          <p className="text-[11px] text-rose-600/80 mt-1">Accès refusés ou restreints</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-fit">
        <button
          onClick={() => setActiveTab('reponses')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'reponses' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={16} />
          <span>Fiches Enseignants ({responses.length})</span>
          {pendingSubmissions > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-full">
              {pendingSubmissions}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('formulaires')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'formulaires' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LinkIcon size={16} />
          <span>Formulaires & Liens de Collecte ({forms.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bloques')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'bloques' ? 'bg-white text-rose-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Lock size={16} />
          <span>Répondants Bloqués ({blockedList.length})</span>
        </button>
      </div>

      {/* TAB 1: FORMULAIRES & LIENS */}
      {activeTab === 'formulaires' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Gestion des Liens de Formulaires</h3>
              <p className="text-xs text-slate-500">Chaque formulaire possède son lien unique et ses classes assignées.</p>
            </div>
            <button
              onClick={() => openFormModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Créer un formulaire</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map(form => (
              <div key={form.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      form.statut === 'actif' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {form.statut === 'actif' ? 'Actif' : 'Clôturé'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Créé le {new Date(form.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mb-1">{form.titre}</h3>
                  {form.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{form.description}</p>
                  )}

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Classes proposées :</span>
                      <span className="font-bold text-slate-800">
                        {form.classes_details && form.classes_details.length > 0 
                          ? `${form.classes_details.length} classe(s)` 
                          : 'Toutes les classes'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fiches collectées :</span>
                      <span className="font-bold text-teal-700">{form.stats?.total || 0} réponse(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">En attente de revue :</span>
                      <span className="font-bold text-amber-600">{form.stats?.en_attente || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyLink(form.token)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-xl transition-all cursor-pointer border border-teal-200"
                    >
                      <Copy size={14} />
                      <span>Copier le lien public</span>
                    </button>
                    <button
                      onClick={() => setShowQrModal(form)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                      title="Afficher le QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                    <a
                      href={getPublicLink(form.token)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                      title="Ouvrir le formulaire dans un nouvel onglet"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => toggleFormStatus(form)}
                      className="text-slate-500 hover:text-slate-800 font-semibold"
                    >
                      {form.statut === 'actif' ? 'Clôturer le formulaire' : 'Réactiver'}
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openFormModal(form)}
                        className="text-teal-600 hover:underline font-bold"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDeleteForm(form)}
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {forms.length === 0 && (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center mx-auto">
                <LinkIcon size={24} />
              </div>
              <h3 className="font-bold text-slate-800">Aucun formulaire de collecte créé</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Créez votre premier formulaire de collecte pour générer un lien spécifique à envoyer aux enseignants du secondaire.
              </p>
              <button
                onClick={() => openFormModal()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Plus size={16} /> Créer un formulaire
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RÉPONSES / FICHES ENSEIGNANTS */}
      {activeTab === 'reponses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Form Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <Filter size={14} className="text-slate-400" />
                <select
                  value={selectedFormFilter}
                  onChange={e => setSelectedFormFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">Tous les formulaires</option>
                  {forms.map(f => (
                    <option key={f.id} value={f.id}>{f.titre}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
                <select
                  value={selectedStatusFilter}
                  onChange={e => setSelectedStatusFilter(e.target.value)}
                  className="bg-transparent font-semibold text-slate-700 focus:outline-hidden"
                >
                  <option value="all">Tous les statuts ({responses.length})</option>
                  <option value="en_attente">En attente ({pendingSubmissions})</option>
                  <option value="valide">Validées ({validatedSubmissions})</option>
                  <option value="rejete">Rejetées</option>
                  <option value="bloque">Bloquées</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom, matière, code..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>

            <button
              onClick={() => { fetchResponses(); fetchBlocked(); }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all self-end md:self-auto cursor-pointer"
              title="Actualiser la liste"
            >
              <RefreshCw size={16} />
            </button>
          </div>

          {/* Responses Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 text-center">Réf.</th>
                    <th className="py-3 px-4">Enseignant</th>
                    <th className="py-3 px-4">Matières</th>
                    <th className="py-3 px-4">Classes tenues</th>
                    <th className="py-3 px-4 text-center">Créneaux EDT</th>
                    <th className="py-3 px-4 text-center">Statut</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredResponses.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-xs font-bold text-slate-400">
                        {r.code_suivi}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{r.nom.toUpperCase()} {r.prenom}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-2">
                          <span>{r.email}</span>
                          {r.telephone && <span>• {r.telephone}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-teal-800 text-xs">{r.matiere_principale}</div>
                        {r.matiere_secondaire && (
                          <div className="text-[11px] text-slate-400">Sec: {r.matiere_secondaire}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(r.classes_tenues || []).map((c, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">
                              {c.nom}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-800 text-xs font-bold rounded-lg border border-teal-200">
                          {r.emploi_du_temps?.length || 0} créneau{r.emploi_du_temps?.length > 1 ? 'x' : ''}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {r.statut === 'valide' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                            <CheckCircle2 size={12} /> Validée
                          </span>
                        )}
                        {r.statut === 'en_attente' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                            <Clock size={12} /> En attente
                          </span>
                        )}
                        {r.statut === 'rejete' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-xs rounded-full">
                            <XCircle size={12} /> Rejetée
                          </span>
                        )}
                        {r.statut === 'bloque' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full">
                            <ShieldAlert size={12} /> Bloqué
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedResponse(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                          <span>Examiner</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredResponses.length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm">
                  Aucune fiche enseignant ne correspond à vos filtres.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: RÉPONDANTS BLOQUÉS */}
      {activeTab === 'bloques' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Lock size={18} className="text-rose-600" />
              <span>Liste des Répondants Bloqués</span>
            </h3>
            <p className="text-xs text-slate-500">
              Ces personnes ont vu leur lien résilié et ne peuvent plus accéder ni soumettre de fiches sur les formulaires de l'établissement.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
            {blockedList.map(b => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900 text-sm">
                    {b.nom || ''} {b.prenom || ''} <span className="text-xs font-normal text-slate-500">({b.email})</span>
                  </div>
                  <p className="text-xs text-rose-600 mt-0.5">Motif : {b.motif || 'Non spécifié'}</p>
                  <p className="text-[10px] text-slate-400">Bloqué le {new Date(b.created_at).toLocaleDateString('fr-FR')}</p>
                </div>

                <button
                  onClick={() => {
                    // Find response ID corresponding to this email if any
                    const resp = responses.find(r => r.email.toLowerCase() === b.email.toLowerCase());
                    if (resp) {
                      handleDecision(resp.id, 'debloquer');
                    } else {
                      toast.error("Impossible de trouver la référence");
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-xl text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                >
                  <Unlock size={14} />
                  <span>Débloquer</span>
                </button>
              </div>
            ))}

            {blockedList.length === 0 && (
              <div className="py-8 text-center text-slate-400 italic text-sm">
                Aucun répondant n'est actuellement bloqué.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL MODAL (EXAMEN DE LA FICHE) */}
      {selectedResponse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-500 text-white font-black text-lg flex items-center justify-center">
                  {selectedResponse.nom.charAt(0)}{selectedResponse.prenom.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black">{selectedResponse.nom.toUpperCase()} {selectedResponse.prenom}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 bg-white/10 rounded-md text-teal-300">
                      {selectedResponse.code_suivi}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {selectedResponse.email} • {selectedResponse.telephone || 'Sans tél'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportPDF(selectedResponse)}
                  className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                  title="Télécharger la fiche en PDF"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setSelectedResponse(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Status Notice */}
              {selectedResponse.statut === 'bloque' && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-xs text-rose-800">
                  <ShieldAlert size={20} className="text-rose-600 shrink-0" />
                  <div>
                    <p className="font-bold">Ce répondant a été bloqué par l'administration.</p>
                    <p>Son lien est devenu inaccessible et toute future tentative sera rejetée. Motif : {selectedResponse.motif_rejet || 'Non renseigné'}</p>
                  </div>
                </div>
              )}

              {/* Personal & Subjects Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Matière principale</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedResponse.matiere_principale}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Matière secondaire</span>
                  <span className="font-bold text-slate-900 text-sm">{selectedResponse.matiere_secondaire || 'Aucune'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Classes Tenues</span>
                  <span className="font-bold text-teal-800 text-sm">
                    {(selectedResponse.classes_tenues || []).map(c => c.nom).join(', ')}
                  </span>
                </div>
              </div>

              {/* Timetable grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock size={16} className="text-teal-600" />
                    <span>Emploi du temps proposé ({selectedResponse.emploi_du_temps?.length || 0} créneau(x))</span>
                  </h3>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Classe</th>
                        <th className="py-2.5 px-3">Jour</th>
                        <th className="py-2.5 px-3">Horaire</th>
                        <th className="py-2.5 px-3">Matière</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedResponse.emploi_du_temps || []).map((slot, sIdx) => (
                        <tr key={sIdx} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{slot.classe_nom}</td>
                          <td className="py-2.5 px-3 font-semibold text-teal-800">{slot.jour}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{slot.heure_debut} - {slot.heure_fin}</td>
                          <td className="py-2.5 px-3 text-slate-500">{selectedResponse.matiere_principale}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action buttons bar */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Décisions Pédagogiques & Intégration
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Valider et Tout Intégrer en 1 clic */}
                  <button
                    onClick={() => handleIntegrate(selectedResponse)}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-md shadow-teal-600/20 text-xs transition-all cursor-pointer"
                  >
                    <UserPlus size={16} />
                    <span>Valider & Intégrer Enseignant + Emploi du Temps</span>
                  </button>

                  {/* Valider seul */}
                  {selectedResponse.statut !== 'valide' && (
                    <button
                      onClick={() => handleDecision(selectedResponse.id, 'valider')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl text-xs border border-emerald-200 transition-all cursor-pointer"
                    >
                      <Check size={14} />
                      <span>Valider la fiche</span>
                    </button>
                  )}

                  {/* Rejeter */}
                  {selectedResponse.statut !== 'rejete' && selectedResponse.statut !== 'bloque' && (
                    <button
                      onClick={() => {
                        setShowRejectModal({ id: selectedResponse.id, isBlock: false });
                        setRejectReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>Rejeter</span>
                    </button>
                  )}

                  {/* Bloquer */}
                  {selectedResponse.statut !== 'bloque' && (
                    <button
                      onClick={() => {
                        setShowRejectModal({ id: selectedResponse.id, isBlock: true });
                        setRejectReason('');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-2xl text-xs border border-rose-200 transition-all cursor-pointer"
                    >
                      <ShieldAlert size={14} />
                      <span>Rejeter et Bloquer l'accès</span>
                    </button>
                  )}

                  {/* Débloquer */}
                  {selectedResponse.statut === 'bloque' && (
                    <button
                      onClick={() => handleDecision(selectedResponse.id, 'debloquer')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                    >
                      <Unlock size={14} />
                      <span>Débloquer ce répondant</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">
                  {editingForm ? "Modifier le Formulaire de Collecte" : "Créer un Formulaire de Collecte Enseignants"}
                </h2>
                <p className="text-xs text-slate-300">Espace Secondaire • Génère un lien direct unique</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Titre du formulaire <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitre}
                  onChange={e => setFormTitre(e.target.value)}
                  placeholder="Ex: Fiche Renseignements Professeurs 2026-2027"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Description / Consignes
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Consignes à afficher pour les professeurs..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Date limite de soumission (Optionnelle)
                </label>
                <input
                  type="date"
                  value={formExpiration}
                  onChange={e => setFormExpiration(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Classes proposées à la sélection dans ce formulaire
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formSelectedClasses.length === classesList.length) {
                        setFormSelectedClasses([]);
                      } else {
                        setFormSelectedClasses(classesList.map(c => c.id));
                      }
                    }}
                    className="text-[11px] text-teal-600 font-bold hover:underline"
                  >
                    {formSelectedClasses.length === classesList.length ? 'Tout décocher' : 'Tout cocher'}
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                  {classesList.map(cls => {
                    const checked = formSelectedClasses.includes(cls.id);
                    return (
                      <label key={cls.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            if (checked) {
                              setFormSelectedClasses(prev => prev.filter(id => id !== cls.id));
                            } else {
                              setFormSelectedClasses(prev => [...prev, cls.id]);
                            }
                          }}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="font-semibold text-slate-800">{cls.nom}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-600/20 cursor-pointer"
                >
                  {editingForm ? "Enregistrer les modifications" : "Créer le formulaire et générer le lien"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="font-bold text-slate-800 text-sm">QR Code du Formulaire</h3>
              <button onClick={() => setShowQrModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Scannez ce QR Code avec un smartphone pour ouvrir directement le formulaire de collecte :
            </p>

            <div className="p-4 bg-white rounded-2xl border border-slate-200 inline-block shadow-inner mx-auto">
              <QRCodeSVG value={getPublicLink(showQrModal.token)} size={180} />
            </div>

            <p className="text-[11px] font-mono text-slate-400 break-all bg-slate-50 p-2 rounded-xl border border-slate-200">
              {getPublicLink(showQrModal.token)}
            </p>

            <button
              onClick={() => copyLink(showQrModal.token)}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Copier le lien public
            </button>
          </div>
        </div>
      )}

      {/* REJECT / BLOCK MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                showRejectModal.isBlock ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {showRejectModal.isBlock ? <ShieldAlert size={20} /> : <XCircle size={20} />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {showRejectModal.isBlock ? "Bloquer le répondant & Résilier le lien" : "Rejeter la fiche"}
                </h3>
                <p className="text-xs text-slate-500">
                  {showRejectModal.isBlock 
                    ? "Le lien deviendra immédiatement inaccessible pour cette personne." 
                    : "La fiche sera marquée comme rejetée."}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Motif de la décision <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Précisez la raison (ex: Informations incohérentes, doublon, profil non retenu...)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRejectModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rejectReason.trim()) {
                    toast.error("Veuillez saisir un motif.");
                    return;
                  }
                  handleDecision(
                    showRejectModal.id, 
                    showRejectModal.isBlock ? 'bloquer' : 'rejeter', 
                    rejectReason.trim()
                  );
                }}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold shadow-xs cursor-pointer ${
                  showRejectModal.isBlock ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-900'
                }`}
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
