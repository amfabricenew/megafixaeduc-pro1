import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { 
  Plus, Search, Filter, MoreVertical, Calendar, UserPlus, 
  FileText, ClipboardList, CheckCircle2, XCircle, Clock, 
  Share2, Eye, Edit2, Trash2, Send, Download, 
  ExternalLink, Copy, Check, Users, GraduationCap, Briefcase,
  AlertCircle, ChevronRight, FileUp, ListChecks, Mail, Phone,
  Info, Sparkles, X, Link, Settings2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

interface Campaign {
  id: number;
  type: 'enseignant' | 'personnel';
  titre: string;
  description: string;
  conditions: string;
  postes: string;
  matieres: string;
  diplomes: string;
  competences: string;
  pieces_requises: string;
  status: 'ouvert' | 'ferme';
  date_ouverture: string;
  date_fermeture: string;
  token: string;
  created_at: string;
}

interface Candidature {
  id: number;
  campagne_id: number;
  code_candidature: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  poste_vise: string;
  matiere_visee: string;
  diplome_obtenu: string;
  experience_annees: number;
  dossier_pdf_url: string;
  status: 'soumis' | 'en_cours' | 'piece_manquante' | 'entretien' | 'examen' | 'embauche' | 'rejete';
  details_decision: string;
  date_entretien: string;
  date_examen: string;
  note_examen: number;
  epreuves?: any[];
  created_at: string;
  est_integre?: boolean;
}

interface EnrollmentRequest {
  id: number;
  code_suivi: string;
  nom_enfant: string;
  prenom_enfant: string;
  date_naissance: string;
  sexe: string;
  classe_demandee_id: number;
  classe_nom: string;
  nom_parent: string;
  tel_parent: string;
  email_parent: string;
  dossier_pdf_url: string;
  status: string;
  est_integre?: boolean;
  created_at: string;
}

export default function RecruitmentManagement() {
  const [activeTab, setActiveTab] = useState<'campaigns' | 'applications' | 'enrollment'>('campaigns');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [applications, setApplications] = useState<Candidature[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = useState<string | number>('all');

  const filteredApplications = applications.filter(app => 
    `${app.nom} ${app.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    app.code_candidature.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [isEditingCampaign, setIsEditingCampaign] = useState<number | null>(null);
  const [showApplicationDetails, setShowApplicationDetails] = useState<Candidature | null>(null);
  
  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    type: 'enseignant' as 'enseignant' | 'personnel',
    titre: '',
    description: '',
    conditions: '',
    postes: [] as string[],
    matieres: [] as string[],
    diplomes: {} as Record<string, string>,
    competences: '',
    pieces_requises: [] as string[],
    date_ouverture: '',
    date_fermeture: '',
  });

  useEffect(() => {
    if (showCampaignModal && isEditingCampaign && campaigns.length > 0) {
      const camp = campaigns.find(c => c.id === isEditingCampaign);
      if (camp) {
        setCampaignForm({
          type: camp.type,
          titre: camp.titre,
          description: camp.description,
          conditions: camp.conditions,
          postes: typeof camp.postes === 'string' ? JSON.parse(camp.postes || '[]') : camp.postes,
          matieres: typeof camp.matieres === 'string' ? JSON.parse(camp.matieres || '[]') : camp.matieres,
          diplomes: typeof camp.diplomes === 'string' ? JSON.parse(camp.diplomes || '{}') : camp.diplomes,
          competences: camp.competences,
          pieces_requises: typeof camp.pieces_requises === 'string' ? JSON.parse(camp.pieces_requises || '[]') : camp.pieces_requises,
          date_ouverture: camp.date_ouverture ? new Date(camp.date_ouverture).toISOString().split('T')[0] : '',
          date_fermeture: camp.date_fermeture ? new Date(camp.date_fermeture).toISOString().split('T')[0] : '',
        });
      }
    } else if (showCampaignModal && !isEditingCampaign) {
      setCampaignForm({
        type: 'enseignant',
        titre: '',
        description: '',
        conditions: '',
        postes: [],
        matieres: [],
        diplomes: {},
        competences: '',
        pieces_requises: ['CV Détaillé', 'Lettre de Motivation', 'Copies des Diplômes'],
        date_ouverture: new Date().toISOString().split('T')[0],
        date_fermeture: '',
      });
    }
  }, [showCampaignModal, isEditingCampaign, campaigns]);

  // Decision state
  const [decisionForm, setDecisionForm] = useState({
    status: '' as Candidature['status'],
    details_decision: '',
    date_entretien: '',
    date_examen: '',
    note_examen: 0,
    epreuves: [] as { titre: string }[],
  });

  useEffect(() => {
    if (showApplicationDetails) {
      setDecisionForm({
        status: showApplicationDetails.status,
        details_decision: showApplicationDetails.details_decision || '',
        date_entretien: showApplicationDetails.date_entretien ? new Date(showApplicationDetails.date_entretien).toISOString().slice(0, 16) : '',
        date_examen: showApplicationDetails.date_examen ? new Date(showApplicationDetails.date_examen).toISOString().slice(0, 16) : '',
        note_examen: showApplicationDetails.note_examen || 0,
        epreuves: showApplicationDetails.epreuves || [],
      });
    }
  }, [showApplicationDetails]);

  const [enrollmentConfig, setEnrollmentConfig] = useState<any>(null);
  const [enrollmentRequests, setEnrollmentRequests] = useState<any[]>([]);
  const [showEnrollmentDetails, setShowEnrollmentDetails] = useState<any>(null);

  // Enrollment config edit state
  const [enrollmentForm, setEnrollmentForm] = useState({
    titre_page: '',
    description_ecole: '',
    atouts: [] as string[],
    conditions_admission: [] as string[],
    pieces_a_fournir: [] as string[],
    frais_scolarite_info: '',
  });

  useEffect(() => {
    fetchCampaigns();
    fetchEnrollmentConfig();
    fetchEnrollmentRequests();
    if (activeTab === 'applications') {
      fetchAllApplications();
    }
  }, [selectedYearId, activeTab]);

  useEffect(() => {
    if (enrollmentConfig) {
      setEnrollmentForm({
        titre_page: enrollmentConfig.titre_page || '',
        description_ecole: enrollmentConfig.description_ecole || '',
        atouts: Array.isArray(enrollmentConfig.atouts) ? enrollmentConfig.atouts : (typeof enrollmentConfig.atouts === 'string' ? JSON.parse(enrollmentConfig.atouts || '[]') : []),
        conditions_admission: Array.isArray(enrollmentConfig.conditions_admission) ? enrollmentConfig.conditions_admission : (typeof enrollmentConfig.conditions_admission === 'string' ? JSON.parse(enrollmentConfig.conditions_admission || '[]') : []),
        pieces_a_fournir: Array.isArray(enrollmentConfig.pieces_a_fournir) ? enrollmentConfig.pieces_a_fournir : (typeof enrollmentConfig.pieces_a_fournir === 'string' ? JSON.parse(enrollmentConfig.pieces_a_fournir || '[]') : []),
        frais_scolarite_info: enrollmentConfig.frais_scolarite_info || '',
      });
    }
  }, [enrollmentConfig]);

  const fetchCampaigns = async () => {
    try {
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const res = await apiFetch(`/api/recrutement/campagnes${yearParam}`);
      const data = await res.json();
      setCampaigns(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des campagnes.");
    } finally {
      setIsLoading(false);
    }
  };

  const [allApplications, setAllApplications] = useState<Candidature[]>([]);
  const [integrating, setIntegrating] = useState<number | null>(null);

  const handleIntegrateCandidate = async (candidature: Candidature) => {
    if (!window.confirm(`Confirmer l'intégration de ${candidature.nom} ${candidature.prenom} dans l'effectif ?`)) return;
    
    setIntegrating(candidature.id);
    try {
      const res = await apiFetch(`/api/recrutement/candidatures/${candidature.id}/integrer`, { method: 'POST' });
      if (res.ok) {
        toast.success("Candidat intégré avec succès !");
        setShowApplicationDetails(null);
        fetchAllApplications();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'intégration.");
      }
    } catch (err) {
      toast.error("Une erreur est survenue.");
    } finally {
      setIntegrating(null);
    }
  };

  const handleIntegrateStudent = async (request: EnrollmentRequest) => {
    if (!window.confirm(`Intégrer ${request.nom_enfant} ${request.prenom_enfant} dans la classe ${request.classe_nom} ?`)) return;

    setIntegrating(request.id);
    try {
      const res = await apiFetch(`/api/inscription/demandes/${request.id}/integrer`, { method: 'POST' });
      if (res.ok) {
        toast.success("Élève intégré avec succès !");
        setShowEnrollmentDetails(null);
        fetchEnrollmentRequests();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'intégration.");
      }
    } catch (err) {
      toast.error("Une erreur est survenue.");
    } finally {
      setIntegrating(null);
    }
  };

  const fetchAllApplications = async () => {
    try {
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const res = await apiFetch(`/api/recrutement/candidatures${yearParam}`);
      const data = await res.json();
      setAllApplications(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des candidatures.");
    }
  };

  const fetchApplications = async (campaignId: number) => {
    try {
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const res = await apiFetch(`/api/recrutement/candidatures/${campaignId}${yearParam}`);
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des candidatures.");
    }
  };

  const fetchEnrollmentConfig = async () => {
    try {
      const res = await apiFetch('/api/inscription/config');
      const data = await res.json();
      setEnrollmentConfig(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEnrollmentRequests = async () => {
    try {
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const res = await apiFetch(`/api/inscription/demandes${yearParam}`);
      const data = await res.json();
      setEnrollmentRequests(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCampaign = async () => {
    try {
      const url = isEditingCampaign 
        ? `/api/recrutement/campagnes/${isEditingCampaign}`
        : '/api/recrutement/campagnes';
      const method = isEditingCampaign ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm)
      });
      if (res.ok) {
        toast.success(isEditingCampaign ? "Campagne mise à jour !" : "Campagne créée avec succès !");
        setShowCampaignModal(false);
        setIsEditingCampaign(null);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const handleUpdateDecision = async (applicationId: number) => {
    try {
      const res = await apiFetch(`/api/recrutement/candidatures/${applicationId}/decision`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionForm)
      });
      
      if (res.ok && decisionForm.status === 'examen' && decisionForm.epreuves.length > 0) {
         // Add epreuves
         for (const ep of decisionForm.epreuves) {
           await apiFetch(`/api/recrutement/candidatures/${applicationId}/epreuves`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ titre: ep.titre })
           });
         }
      }

      if (res.ok) {
        toast.success("Décision enregistrée.");
        setShowApplicationDetails(null);
        if (selectedCampaign) fetchApplications(selectedCampaign.id);
      }
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    }
  };

  const handleUpdateEnrollmentConfig = async () => {
    try {
      const res = await apiFetch('/api/inscription/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollmentForm)
      });
      if (res.ok) {
        toast.success("Configuration mise à jour !");
        fetchEnrollmentConfig();
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const handleUpdateEnrollmentStatus = async (requestId: number, status: 'approuve' | 'rejete') => {
    try {
      const res = await apiFetch(`/api/inscription/demandes/${requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(status === 'approuve' ? "Demande approuvée !" : "Demande rejetée.");
        setShowEnrollmentDetails(null);
        fetchEnrollmentRequests();
      }
    } catch (err) {
      toast.error("Erreur lors de la mise à jour.");
    }
  };

  const addListItem = (field: 'atouts' | 'conditions_admission' | 'pieces_a_fournir', value: string) => {
    if (!value.trim()) return;
    setEnrollmentForm({
      ...enrollmentForm,
      [field]: [...(enrollmentForm[field] as string[]), value.trim()]
    });
  };

  const removeListItem = (field: 'atouts' | 'conditions_admission' | 'pieces_a_fournir', index: number) => {
    setEnrollmentForm({
      ...enrollmentForm,
      [field]: (enrollmentForm[field] as string[]).filter((_, i) => i !== index)
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Lien copié !");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'soumis': return 'bg-blue-100 text-blue-700';
      case 'en_cours': return 'bg-yellow-100 text-yellow-700';
      case 'entretien': return 'bg-purple-100 text-purple-700';
      case 'examen': return 'bg-orange-100 text-orange-700';
      case 'embauche': return 'bg-emerald-100 text-emerald-700';
      case 'rejete': return 'bg-rose-100 text-rose-700';
      case 'piece_manquante': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'soumis': return 'Dossier Reçu';
      case 'en_cours': return 'En Étude';
      case 'entretien': return 'Entretien Oral';
      case 'examen': return 'Évaluation';
      case 'embauche': return 'Retenu';
      case 'rejete': return 'Refusé';
      case 'piece_manquante': return 'Complément Requis';
      default: return status.replace('_', ' ');
    }
  };

  const getPublicLink = (token: string, type: 'recrutement' | 'inscription') => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/${type}/${token}`;
  };

  const exportToCSV = () => {
    const headers = ['Nom', 'Prénom', 'Code', 'Campagne', 'Poste', 'Statut', 'Date Soumission'];
    const rows = allApplications.map(app => [
      app.nom,
      app.prenom,
      app.code_candidature,
      (app as any).campagne_titre,
      app.poste_vise,
      app.status,
      new Date(app.created_at).toLocaleDateString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "rapport_recrutement.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Recrutement & Inscriptions</h1>
              <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-xl border border-slate-200">
                <Calendar size={14} className="text-slate-400" />
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="text-xs font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
                >
                  <option value="all">Toutes les années</option>
                  {years.map((y: any) => (
                    <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-slate-500 font-medium">Gérez vos campagnes de recrutement et les inscriptions en ligne.</p>
          </div>
          <div className="flex items-center gap-3">
            {activeTab === 'campaigns' && (
              <button 
                onClick={() => setShowCampaignModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Plus size={20} />
                Nouvelle Campagne
              </button>
            )}
          </div>
        </div>

        <div className="flex p-1 bg-white rounded-2xl border border-slate-200 shadow-sm w-fit">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'campaigns' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Campagnes de Recrutement
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'applications' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Analyse des Dossiers
          </button>
          <button
            onClick={() => setActiveTab('enrollment')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === 'enrollment' 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Inscriptions en Ligne
          </button>
        </div>

        {activeTab === 'campaigns' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-indigo-600" />
                Vos Campagnes
              </h2>
              <div className="space-y-3">
                {campaigns.map((camp) => (
                  <button
                    key={camp.id}
                    onClick={() => {
                      setSelectedCampaign(camp);
                      fetchApplications(camp.id);
                    }}
                    className={`w-full p-4 rounded-[2rem] border transition-all text-left group ${
                      selectedCampaign?.id === camp.id
                        ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100'
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                        selectedCampaign?.id === camp.id 
                          ? 'bg-indigo-500 text-white' 
                          : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {camp.type === 'enseignant' ? 'Enseignant' : 'Personnel'}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        selectedCampaign?.id === camp.id ? 'text-indigo-200' : 'text-slate-400'
                      }`}>
                        {camp.status === 'ouvert' ? 'Ouvert' : 'Fermé'}
                      </span>
                    </div>
                    <h3 className={`font-black text-sm mb-1 ${
                      selectedCampaign?.id === camp.id ? 'text-white' : 'text-slate-900'
                    }`}>
                      {camp.titre}
                    </h3>
                    <p className={`text-[10px] font-medium ${
                      selectedCampaign?.id === camp.id ? 'text-indigo-100' : 'text-slate-500'
                    }`}>
                      Créée le {new Date(camp.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <AnimatePresence mode="wait">
                {selectedCampaign ? (
                  <motion.div
                    key={selectedCampaign.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-2xl font-black text-slate-900">{selectedCampaign.titre}</h2>
                          <p className="text-slate-500 text-sm font-medium mt-1">{selectedCampaign.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => copyToClipboard(getPublicLink(selectedCampaign.token, 'recrutement'))}
                            className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors"
                            title="Copier le lien public"
                          >
                            <Link size={20} />
                          </button>
                          <button 
                            onClick={() => {
                              setIsEditingCampaign(selectedCampaign.id);
                              setShowCampaignModal(true);
                            }}
                            className="p-3 bg-slate-50 text-slate-600 rounded-2xl hover:bg-slate-100 transition-colors"
                          >
                            <Edit2 size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Candidatures</p>
                          <p className="text-2xl font-black text-slate-900">{applications.length}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">En attente</p>
                          <p className="text-2xl font-black text-amber-600">
                            {applications.filter(a => a.status === 'soumis').length}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Entretiens</p>
                          <p className="text-2xl font-black text-purple-600">
                            {applications.filter(a => a.status === 'entretien' || a.status === 'examen').length}
                          </p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Recrutés</p>
                          <p className="text-2xl font-black text-emerald-600">
                            {applications.filter(a => a.status === 'embauche').length}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="font-black text-slate-900">Liste des Candidatures</h3>
                        <div className="flex gap-2">
                          <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Rechercher..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidat</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Poste / Matière</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredApplications.map((app) => (
                              <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-600">
                                      {app.nom[0]}{app.prenom[0]}
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-slate-900">{app.nom} {app.prenom}</p>
                                      <p className="text-[10px] font-bold text-slate-500">{app.email}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-xs font-bold text-slate-700">{app.poste_vise}</p>
                                  {app.matiere_visee && <p className="text-[10px] text-indigo-600 font-black">{app.matiere_visee}</p>}
                                </td>
                                <td className="px-6 py-4 text-xs font-medium text-slate-500">
                                  {new Date(app.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit ${getStatusColor(app.status)}`}>
                                      {getStatusLabel(app.status)}
                                    </span>
                                    {app.est_integre && (
                                      <span className="text-[9px] font-black text-emerald-600 mt-1 uppercase tracking-widest flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Intégré
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => setShowApplicationDetails(app)}
                                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                      title="Voir les détails"
                                    >
                                      <Eye size={18} />
                                    </button>
                                    {app.status === 'embauche' && !app.est_integre && (
                                      <button 
                                        onClick={() => handleIntegrateCandidate(app)}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                        title="Intégrer au personnel"
                                        disabled={integrating === app.id}
                                      >
                                        {integrating === app.id ? (
                                          <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <UserPlus size={18} />
                                        )}
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
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                    <Briefcase size={64} className="text-slate-200 mb-4" />
                    <h3 className="text-xl font-black text-slate-900">Sélectionnez une campagne</h3>
                    <p className="text-slate-500 text-sm mt-2 max-w-sm">
                      Choisissez une campagne dans la liste de gauche pour voir les détails et les candidatures reçues.
                    </p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : activeTab === 'applications' ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Total Candidats</p>
                <p className="text-3xl font-black text-slate-900">{allApplications.length}</p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">En Examen / Entretien</p>
                <p className="text-3xl font-black text-indigo-600">
                  {allApplications.filter(a => a.status === 'entretien' || a.status === 'examen').length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Recrutés</p>
                <p className="text-3xl font-black text-emerald-600">
                  {allApplications.filter(a => a.status === 'embauche').length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Dossiers Analysés</p>
                <p className="text-3xl font-black text-slate-900">
                  {allApplications.filter(a => a.status !== 'soumis').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Analyse de Dossier & Suivi d'Évolution</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">Vue d'ensemble de tous les candidats et de leur progression.</p>
                </div>
                <button 
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm"
                >
                   <Download size={18} />
                   Rapport de Recrutement
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Candidat</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campagne</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Poste</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Évolution</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date Examen/Entr.</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-600 uppercase">
                              {app.nom[0]}{app.prenom[0]}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900">{app.nom} {app.prenom}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{app.code_candidature}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-xs font-black text-slate-700">{(app as any).campagne_titre}</p>
                        </td>
                        <td className="px-8 py-6">
                           <p className="text-xs font-bold text-slate-600">{app.poste_vise}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${getStatusColor(app.status)}`}>
                            {app.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          {app.status === 'entretien' && app.date_entretien && (
                            <p className="text-[10px] font-black text-purple-600">Entretien: {new Date(app.date_entretien).toLocaleString()}</p>
                          )}
                          {app.status === 'examen' && app.date_examen && (
                            <p className="text-[10px] font-black text-orange-600">Examen: {new Date(app.date_examen).toLocaleString()}</p>
                          )}
                        </td>
                        <td className="px-8 py-6">
                           <button 
                            onClick={() => setShowApplicationDetails(app)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Configuration de l'Espace Inscriptions</h2>
                  <p className="text-slate-500 font-medium">Personnalisez votre page marketing pour attirer de nouveaux élèves.</p>
                </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={handleUpdateEnrollmentConfig}
                      className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                      <Send size={20} />
                      Enregistrer les modifications
                    </button>
                    <button 
                      onClick={() => copyToClipboard(getPublicLink(enrollmentConfig?.lien_marketing_token, 'inscription'))}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg shadow-slate-200"
                    >
                      <Share2 size={20} />
                      Lien Public
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Titre de la Page</label>
                      <input 
                        type="text" 
                        value={enrollmentForm.titre_page}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, titre_page: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Description de l'École</label>
                      <textarea 
                        rows={4}
                        value={enrollmentForm.description_ecole}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, description_ecole: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Infos Frais de Scolarité (Aperçu)</label>
                      <textarea 
                        rows={3}
                        value={enrollmentForm.frais_scolarite_info}
                        onChange={(e) => setEnrollmentForm({...enrollmentForm, frais_scolarite_info: e.target.value})}
                        placeholder="Ex: Frais de dossier 10.000 FCFA, Premier versement à l'inscription..."
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 bg-indigo-50/50 rounded-[2rem] border border-indigo-100/50">
                      <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2">
                        <Sparkles size={20} className="text-indigo-600" />
                        Atouts de l'établissement
                      </h3>
                      <div className="space-y-2">
                        {enrollmentForm.atouts.map((atout, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-100">
                            <span className="text-sm font-bold text-slate-700">{atout}</span>
                            <button 
                              onClick={() => removeListItem('atouts', i)}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Nouvel atout..."
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addListItem('atouts', (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <button 
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              addListItem('atouts', input.value);
                              input.value = '';
                            }}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50">
                      <h3 className="font-black text-emerald-900 mb-4 flex items-center gap-2">
                        <ListChecks size={20} className="text-emerald-600" />
                        Pièces à fournir (Inscription)
                      </h3>
                      <div className="space-y-2">
                        {enrollmentForm.pieces_a_fournir.map((piece, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-emerald-100">
                            <span className="text-sm font-bold text-slate-700">{piece}</span>
                            <button 
                              onClick={() => removeListItem('pieces_a_fournir', i)}
                              className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-all"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Nouvelle pièce..."
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                addListItem('pieces_a_fournir', (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                          <button 
                            onClick={(e) => {
                              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                              addListItem('pieces_a_fournir', input.value);
                              input.value = '';
                            }}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all"
                          >
                            Ajouter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-100">
                <h3 className="text-xl font-black text-slate-900">Demandes d'Inscription Reçues</h3>
                <p className="text-sm text-slate-500 font-medium">Suivez et traitez les demandes envoyées via le lien public.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe Souhaitée</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Parent</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                      <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrollmentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-slate-900">{req.nom_enfant} {req.prenom_enfant}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">Code: {req.code_suivi}</p>
                        </td>
                        <td className="px-8 py-6">
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black uppercase">
                            {req.classe_nom}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-bold text-slate-700">{req.nom_parent}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Phone size={10} /> {req.tel_parent}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            req.status === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                            req.status === 'approuve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {req.status === 'en_attente' ? 'En attente' : req.status === 'approuve' ? 'Approuvé' : 'Rejeté'}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setShowEnrollmentDetails(req)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Analyser le dossier"
                            >
                              <Eye size={20} />
                            </button>
                            {req.status === 'approuve' && !req.est_integre && (
                              <button 
                                onClick={() => handleIntegrateStudent(req)}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Intégrer dans la classe"
                                disabled={integrating === req.id}
                              >
                                {integrating === req.id ? (
                                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <UserPlus size={20} />
                                )}
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
          </div>
        )}
      </div>

      {/* Campaign Creation Modal */}
      <AnimatePresence>
        {showCampaignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowCampaignModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                    {isEditingCampaign ? <Edit2 size={24} /> : <Plus size={24} />}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">{isEditingCampaign ? 'Modifier la Campagne' : 'Nouvelle Campagne de Recrutement'}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Configuration du lien public</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowCampaignModal(false)}
                  className="p-3 hover:bg-slate-200 rounded-2xl transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-8">
                  {/* Step 1: Type Selection */}
                  <div className="flex flex-col items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Type de Recrutement</label>
                    <div className="flex gap-4 w-full max-w-md">
                      <button 
                        onClick={() => setCampaignForm({...campaignForm, type: 'enseignant'})}
                        className={`flex-1 flex items-center justify-center gap-3 p-5 rounded-[2rem] border-2 font-black text-sm transition-all ${
                          campaignForm.type === 'enseignant' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                        }`}
                      >
                        <GraduationCap size={22} />
                        Enseignant
                      </button>
                      <button 
                        onClick={() => setCampaignForm({...campaignForm, type: 'personnel'})}
                        className={`flex-1 flex items-center justify-center gap-3 p-5 rounded-[2rem] border-2 font-black text-sm transition-all ${
                          campaignForm.type === 'personnel' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-200'
                        }`}
                      >
                        <Briefcase size={22} />
                        Personnel
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Column: Info */}
                    <div className="space-y-6">
                      <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 space-y-6">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Settings2 size={16} className="text-indigo-600" />
                          Informations Générales
                        </h3>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Titre de la Campagne</label>
                          <input 
                            type="text" 
                            value={campaignForm.titre}
                            onChange={(e) => setCampaignForm({...campaignForm, titre: e.target.value})}
                            placeholder="ex: Recrutement Professeurs 2026"
                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Description</label>
                          <textarea 
                            rows={4}
                            value={campaignForm.description}
                            onChange={(e) => setCampaignForm({...campaignForm, description: e.target.value})}
                            className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Début</label>
                            <input 
                              type="date" 
                              value={campaignForm.date_ouverture}
                              onChange={(e) => setCampaignForm({...campaignForm, date_ouverture: e.target.value})}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Fin</label>
                            <input 
                              type="date" 
                              value={campaignForm.date_fermeture}
                              onChange={(e) => setCampaignForm({...campaignForm, date_fermeture: e.target.value})}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Configuration */}
                    <div className="space-y-6">
                      <div className="p-6 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100/50">
                        <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2 text-xs uppercase tracking-widest">
                          {campaignForm.type === 'enseignant' ? 'Matières Recherchées' : 'Postes Ouverts'}
                        </h3>
                        <div className="space-y-2">
                          {(campaignForm.type === 'enseignant' ? campaignForm.matieres : campaignForm.postes).map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-indigo-100 shadow-sm">
                              <span className="text-sm font-bold text-slate-700">{item}</span>
                              <button 
                                onClick={() => {
                                  const field = campaignForm.type === 'enseignant' ? 'matieres' : 'postes';
                                  setCampaignForm({
                                    ...campaignForm,
                                    [field]: (campaignForm[field] as string[]).filter((_, idx) => idx !== i)
                                  });
                                }}
                                className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-all"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              id="new-item-input"
                              placeholder={campaignForm.type === 'enseignant' ? "Ex: Français..." : "Ex: Comptable..."}
                              className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById('new-item-input') as HTMLInputElement;
                                const val = input.value.trim();
                                if (val) {
                                  const field = campaignForm.type === 'enseignant' ? 'matieres' : 'postes';
                                  setCampaignForm({
                                    ...campaignForm,
                                    [field]: [...(campaignForm[field] as string[]), val]
                                  });
                                  input.value = '';
                                }
                              }}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-slate-900 rounded-[2.5rem]">
                        <h3 className="font-black text-white text-xs mb-4 uppercase tracking-widest flex items-center gap-2">
                          <ListChecks size={18} className="text-emerald-400" />
                          Pièces Requises (PDF UNIQUE)
                        </h3>
                        <div className="space-y-2">
                          {campaignForm.pieces_requises.map((piece, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-slate-800 rounded-xl border border-slate-700">
                              <span className="text-[10px] font-bold text-slate-300">{piece}</span>
                              <button 
                                onClick={() => setCampaignForm({...campaignForm, pieces_requises: campaignForm.pieces_requises.filter((_, idx) => idx !== i)})}
                                className="text-rose-400 hover:bg-rose-400/10 p-1 rounded-lg"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2 mt-4">
                            <input 
                              type="text"
                              id="new-piece-input"
                              placeholder="ex: Diplôme Master..."
                              className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-bold text-white outline-none focus:border-emerald-400"
                            />
                            <button 
                              onClick={() => {
                                const input = document.getElementById('new-piece-input') as HTMLInputElement;
                                const val = input.value.trim();
                                if (val) {
                                  setCampaignForm({...campaignForm, pieces_requises: [...campaignForm.pieces_requises, val]});
                                  input.value = '';
                                }
                              }}
                              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                            >
                              Ajouter
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowCampaignModal(false)}
                  className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all border border-slate-200"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleSaveCampaign}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  {isEditingCampaign ? 'Mettre à jour' : 'Générer le Lien & Publier'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Application Details Modal */}
      <AnimatePresence>
        {showApplicationDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowApplicationDetails(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row h-[90vh]"
            >
              <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-100 p-8 flex flex-col">
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-24 h-24 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-100 mb-4">
                    {showApplicationDetails.nom[0]}{showApplicationDetails.prenom[0]}
                  </div>
                  <h2 className="text-xl font-black text-slate-900">{showApplicationDetails.nom} {showApplicationDetails.prenom}</h2>
                  <p className="text-xs font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full mt-2 uppercase tracking-widest">
                    Candidat {showApplicationDetails.poste_vise}
                  </p>
                </div>

                <div className="space-y-6 flex-1">
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Coordonnées</h3>
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <Mail size={16} className="text-slate-400" />
                        {showApplicationDetails.email}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                        <Phone size={16} className="text-slate-400" />
                        {showApplicationDetails.telephone}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Parcours</h3>
                    <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Diplôme</p>
                        <p className="text-xs font-bold text-slate-700">{showApplicationDetails.diplome_obtenu}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase">Expérience</p>
                        <p className="text-xs font-bold text-slate-700">{showApplicationDetails.experience_annees} ans</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Dossier de candidature</h3>
                    <a 
                      href={showApplicationDetails.dossier_pdf_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100 hover:bg-emerald-100 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <FileText size={20} />
                        <span className="text-xs font-black">Consulter le PDF</span>
                      </div>
                      <ExternalLink size={16} />
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex-1 flex flex-col p-8 bg-white">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900">Traitement du Dossier</h3>
                  <div className="flex flex-col items-end">
                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${getStatusColor(showApplicationDetails.status)}`}>
                      Statut : {getStatusLabel(showApplicationDetails.status)}
                    </span>
                    <p className="text-[9px] font-black text-slate-400 mt-1 uppercase tracking-widest">
                      Niveau actuel : {
                        showApplicationDetails.status === 'soumis' ? 'Dossier Reçu' :
                        showApplicationDetails.status === 'examen' ? 'Tests Techniques' :
                        showApplicationDetails.status === 'entretien' ? 'Entretien Oral' :
                        showApplicationDetails.status === 'embauche' ? 'Validation Finale' :
                        showApplicationDetails.status === 'piece_manquante' ? 'Complément requis' : 'Candidature Close'
                      }
                    </p>
                  </div>
                </div>

                <div className="space-y-8 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Nouvelle Décision</label>
                        <select 
                          value={decisionForm.status}
                          onChange={(e) => setDecisionForm({...decisionForm, status: e.target.value as any})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none appearance-none"
                        >
                          <option value="">Sélectionner une action...</option>
                          <option value="en_cours">En cours de traitement</option>
                          <option value="piece_manquante">Demander pièce supplémentaire</option>
                          <option value="entretien">Programmer pour Entretien</option>
                          <option value="examen">Programmer pour Examen/Test</option>
                          <option value="embauche">RETENIR LE CANDIDAT</option>
                          <option value="rejete">Rejeter la candidature</option>
                        </select>
                      </div>

                      {showApplicationDetails.status === 'embauche' && !showApplicationDetails.est_integre && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex flex-col items-center text-center"
                        >
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                            <UserPlus size={24} />
                          </div>
                          <h4 className="text-sm font-black text-emerald-900 mb-1">Candidat Retenu</h4>
                          <p className="text-[10px] font-bold text-emerald-600 mb-4">
                            Dossier validé ! Vous pouvez maintenant intégrer ce candidat dans la liste du personnel de l'école.
                          </p>
                          <button 
                            disabled={integrating === showApplicationDetails.id}
                            onClick={() => handleIntegrateCandidate(showApplicationDetails)}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                          >
                            {integrating === showApplicationDetails.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            Finaliser l'Intégration
                          </button>
                        </motion.div>
                      )}

                      {decisionForm.status === 'entretien' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Date de l'Entretien</label>
                          <input 
                            type="datetime-local" 
                            value={decisionForm.date_entretien}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                            onChange={(e) => setDecisionForm({...decisionForm, date_entretien: e.target.value})}
                          />
                        </motion.div>
                      )}

                      {decisionForm.status === 'examen' && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Date de l'Examen</label>
                            <input 
                              type="datetime-local" 
                              value={decisionForm.date_examen}
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                              onChange={(e) => setDecisionForm({...decisionForm, date_examen: e.target.value})}
                            />
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <label className="text-[10px] font-black text-indigo-400 uppercase mb-3 block">Épreuves à composer (Optionnel)</label>
                            <div className="space-y-2 mb-3">
                              {decisionForm.epreuves.map((ep, i) => (
                                <div key={i} className="flex items-center justify-between p-2 bg-white rounded-lg text-[10px] font-bold text-slate-700">
                                  {ep.titre}
                                  <button onClick={() => setDecisionForm({...decisionForm, epreuves: decisionForm.epreuves.filter((_, idx) => idx !== i)})} className="text-rose-500">
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                placeholder="Nom de l'épreuve..."
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value;
                                    if (val) {
                                      setDecisionForm({...decisionForm, epreuves: [...decisionForm.epreuves, { titre: val }]});
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">Observations & Réponse au Candidat</label>
                      <textarea 
                        rows={8}
                        value={decisionForm.details_decision}
                        onChange={(e) => setDecisionForm({...decisionForm, details_decision: e.target.value})}
                        placeholder="Écrivez ici le message ou les raisons de votre décision..."
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-[2rem] font-bold text-slate-900 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none h-[calc(100%-2rem)]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => setShowApplicationDetails(null)}
                    className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-black hover:bg-slate-100 transition-all border border-slate-200"
                  >
                    Fermer
                  </button>
                  <button 
                    onClick={() => handleUpdateDecision(showApplicationDetails.id)}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Enregistrer la Décision
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enrollment Request Details Modal */}
      <AnimatePresence>
        {showEnrollmentDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowEnrollmentDetails(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-900">Demande d'Inscription : {showEnrollmentDetails.nom_enfant} {showEnrollmentDetails.prenom_enfant}</h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        showEnrollmentDetails.status === 'en_attente' ? 'bg-amber-100 text-amber-700' :
                        showEnrollmentDetails.status === 'approuve' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {showEnrollmentDetails.status === 'en_attente' ? 'En attente' : showEnrollmentDetails.status === 'approuve' ? 'Approuvé' : 'Rejeté'}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Niveau : {showEnrollmentDetails.est_integre ? 'Dossier Intégré' : 'Analyse en cours'}
                      </p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setShowEnrollmentDetails(null)}
                  className="p-3 hover:bg-slate-200 rounded-2xl transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informations de l'Enfant</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Classe demandée</p>
                        <p className="text-sm font-black text-indigo-600">{showEnrollmentDetails.classe_nom}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Date de naissance</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(showEnrollmentDetails.date_naissance).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Informations des Parents</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Parent / Tuteur</p>
                        <p className="text-sm font-bold text-slate-700">{showEnrollmentDetails.nom_parent}</p>
                      </div>
                      <div className="flex gap-4">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Téléphone</p>
                          <p className="text-sm font-bold text-slate-700">{showEnrollmentDetails.tel_parent}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase">Email</p>
                          <p className="text-sm font-bold text-slate-700">{showEnrollmentDetails.email_parent}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 h-full">
                    <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-4">Actions d'Admission</h3>
                    <p className="text-xs text-amber-700 font-medium mb-6">
                      En approuvant cette demande, un message de confirmation sera envoyé au parent et l'élève pourra procéder à son inscription administrative définitive.
                    </p>
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleUpdateEnrollmentStatus(showEnrollmentDetails.id, 'approuve')}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={20} />
                        Approuver la demande
                      </button>
                      <button 
                        onClick={() => handleUpdateEnrollmentStatus(showEnrollmentDetails.id, 'rejete')}
                        className="w-full py-4 bg-white text-rose-600 rounded-2xl font-black border border-rose-200 hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle size={20} />
                        Rejeter la demande
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowEnrollmentDetails(null)}
                  className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-black border border-slate-200"
                >
                  Fermer
                </button>
                {showEnrollmentDetails.status === 'approuve' && !showEnrollmentDetails.est_integre && (
                  <button 
                    disabled={integrating === showEnrollmentDetails.id}
                    onClick={() => handleIntegrateStudent(showEnrollmentDetails)}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-100"
                  >
                    {integrating === showEnrollmentDetails.id ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus size={20} />
                    )}
                    Intégrer dans la Classe
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LinkComponent({ size }: { size?: number }) {
  return <Share2 size={size} />;
}
