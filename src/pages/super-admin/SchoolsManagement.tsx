import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  School, 
  Users, 
  CreditCard, 
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Mail,
  Phone,
  Eye,
  Edit,
  Trash2,
  KeyRound,
  Copy,
  Check,
  ShieldCheck,
  MapPin,
  Globe,
  Clock,
  X,
  Lock,
  Sparkles,
  BookOpen,
  GraduationCap,
  Smartphone,
  SlidersHorizontal
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import SchoolRequestsManagement from '../../components/super-admin/SchoolRequestsManagement';
import SchoolMessagingModal from '../../components/super-admin/SchoolMessagingModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SchoolsManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState<'schools' | 'requests'>(
    searchParams.get('tab') === 'requests' ? 'requests' : 'schools'
  );
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const [schools, setSchools] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [createdCredentialsModal, setCreatedCredentialsModal] = useState<{
    school: any;
    credentials: any;
  } | null>(null);

  // View Details Modal State (Strict Privacy Isolation)
  const [selectedSchoolDetails, setSelectedSchoolDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit Modal State
  const [editingSchool, setEditingSchool] = useState<any | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Reset Password Modal State
  const [resettingPasswordSchool, setResettingPasswordSchool] = useState<any | null>(null);
  const [newGeneratedPasswordResult, setNewGeneratedPasswordResult] = useState<any | null>(null);
  const [submittingReset, setSubmittingReset] = useState(false);

  // Delete Modal State
  const [deletingSchool, setDeletingSchool] = useState<any | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Spaces Lock State (Maternelle & Primaire / Secondaire)
  const [spacesLockSchool, setSpacesLockSchool] = useState<any | null>(null);
  const [submittingSpacesLock, setSubmittingSpacesLock] = useState(false);
  const [spacesLockForm, setSpacesLockForm] = useState({
    espace_secondaire_actif: 1,
    espace_primaire_motif_verrouillage: '',
    espace_secondaire_motif_verrouillage: '',
    features_locked: 0,
    features_locked_motif: ''
  });

  // School Messaging Configuration Modal State
  const [selectedSchoolForMessaging, setSelectedSchoolForMessaging] = useState<any | null>(null);
  const [isMessagingModalOpen, setIsMessagingModalOpen] = useState(false);

  // Copy state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form for new school
  const [newSchoolForm, setNewSchoolForm] = useState({
    nom: '',
    code_ecole: '',
    admin_nom: '',
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    pays: 'Bénin',
    devise: 'FCFA',
    plan_abonnement: 'Standard',
    duree_mois: '12'
  });

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [schoolsRes, plansRes] = await Promise.all([
        fetch('/api/super-admin/schools', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/super-admin/plans', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (schoolsRes.ok) {
        const data = await schoolsRes.json();
        setSchools(data || []);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData || []);
        if (plansData.length > 0 && !newSchoolForm.plan_abonnement) {
          setNewSchoolForm(prev => ({ ...prev, plan_abonnement: plansData[0].name }));
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erreur lors de la récupération des établissements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Fetch pending school requests count
    const token = localStorage.getItem('token');
    fetch('/api/super-admin/school-requests', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.stats) {
          setPendingRequestsCount(Number(data.stats.payment_confirmed || 0) + Number(data.stats.pending || 0));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'requests') {
      setMainTab('requests');
    } else {
      setMainTab('schools');
    }
  }, [searchParams]);

  const handleCopyText = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast.success("Copié dans le presse-papier !");
    setTimeout(() => setCopiedField(null), 2500);
  };

  // 1. Create School Manually
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolForm.nom.trim()) return toast.error("Le nom de l'établissement est obligatoire.");
    if (!newSchoolForm.email.trim()) return toast.error("L'adresse email de l'administrateur est obligatoire.");

    setSubmittingAdd(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/super-admin/schools', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newSchoolForm)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de la création de l'école");
      }

      toast.success(data.message || "École et compte administrateur créés avec succès !");
      setShowAddModal(false);
      setCreatedCredentialsModal({
        school: data.school,
        credentials: data.credentials
      });
      setNewSchoolForm({
        nom: '',
        code_ecole: '',
        admin_nom: '',
        email: '',
        telephone: '',
        adresse: '',
        ville: '',
        pays: 'Bénin',
        devise: 'FCFA',
        plan_abonnement: plans.length > 0 ? plans[0].name : 'Standard',
        duree_mois: '12'
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur de création");
    } finally {
      setSubmittingAdd(false);
    }
  };

  // 2. View School Details (Privacy Isolated)
  const handleOpenDetails = async (school: any) => {
    setLoadingDetails(true);
    setSelectedSchoolDetails(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${school.id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de charger la fiche.");
      setSelectedSchoolDetails(data);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des détails");
    } finally {
      setLoadingDetails(false);
    }
  };

  // 3. Edit School
  const handleOpenEdit = (school: any) => {
    setEditingSchool({
      id: school.id,
      nom: school.nom || '',
      code_ecole: school.code_ecole || '',
      email: school.email || school.admin_email || '',
      telephone: school.telephone || '',
      adresse: school.adresse || '',
      pays: school.pays || 'Bénin',
      devise: school.devise || 'FCFA',
      plan_abonnement: school.plan_abonnement || 'Standard',
      statut_abonnement: school.statut_abonnement || 'actif',
      date_fin_abonnement: school.date_fin_abonnement ? school.date_fin_abonnement.split('T')[0] : '',
      espace_primaire_actif: (school.espace_primaire_actif !== undefined && school.espace_primaire_actif !== null) ? Number(school.espace_primaire_actif) : 1,
      espace_secondaire_actif: (school.espace_secondaire_actif !== undefined && school.espace_secondaire_actif !== null) ? Number(school.espace_secondaire_actif) : 1,
      espace_primaire_motif_verrouillage: school.espace_primaire_motif_verrouillage || '',
      espace_secondaire_motif_verrouillage: school.espace_secondaire_motif_verrouillage || '',
      features_locked: (school.features_locked !== undefined && school.features_locked !== null) ? Number(school.features_locked) : 0,
      features_locked_motif: school.features_locked_motif || ''
    });
  };

  // 3b. Spaces Lock Management (Maternelle & Primaire / Secondaire)
  const handleOpenSpacesLock = (school: any) => {
    setSpacesLockSchool(school);
    setSpacesLockForm({
      espace_primaire_actif: (school.espace_primaire_actif !== undefined && school.espace_primaire_actif !== null) ? Number(school.espace_primaire_actif) : 1,
      espace_secondaire_actif: (school.espace_secondaire_actif !== undefined && school.espace_secondaire_actif !== null) ? Number(school.espace_secondaire_actif) : 1,
      espace_primaire_motif_verrouillage: school.espace_primaire_motif_verrouillage || '',
      espace_secondaire_motif_verrouillage: school.espace_secondaire_motif_verrouillage || '',
      features_locked: (school.features_locked !== undefined && school.features_locked !== null) ? Number(school.features_locked) : 0,
      features_locked_motif: school.features_locked_motif || ''
    });
  };

  const handleSaveSpacesLock = async (schoolId?: number, formData?: any) => {
    const targetId = schoolId || spacesLockSchool?.id;
    if (!targetId) return;

    const payload = formData || spacesLockForm;
    setSubmittingSpacesLock(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${targetId}/spaces-lock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la mise à jour des espaces.");
      }

      toast.success(data.message || "Espaces scolaires mis à jour avec succès !");
      setSpacesLockSchool(null);
      fetchData();

      if (selectedSchoolDetails && selectedSchoolDetails.school?.id === targetId) {
        setSelectedSchoolDetails((prev: any) => ({
          ...prev,
          school: {
            ...prev.school,
            espace_primaire_actif: data.espace_primaire_actif,
            espace_secondaire_actif: data.espace_secondaire_actif,
            espace_primaire_motif_verrouillage: data.espace_primaire_motif_verrouillage,
            espace_secondaire_motif_verrouillage: data.espace_secondaire_motif_verrouillage,
            features_locked: data.features_locked,
            features_locked_motif: data.features_locked_motif
          }
        }));
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour des espaces.");
    } finally {
      setSubmittingSpacesLock(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool?.nom?.trim()) return toast.error("Le nom est obligatoire");

    setSubmittingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingSchool)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur de mise à jour");
      }

      toast.success(data.message || "Établissement mis à jour avec succès");
      setEditingSchool(null);
      fetchData();
      if (selectedSchoolDetails && selectedSchoolDetails.school?.id === editingSchool.id) {
        handleOpenDetails({ id: editingSchool.id });
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 4. Reset Admin Password
  const handleOpenResetPassword = (school: any) => {
    setResettingPasswordSchool(school);
    setNewGeneratedPasswordResult(null);
  };

  const handleConfirmResetPassword = async () => {
    if (!resettingPasswordSchool) return;
    setSubmittingReset(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${resettingPasswordSchool.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Impossible de réinitialiser le mot de passe");
      }
      setNewGeneratedPasswordResult(data);
      toast.success("Nouveau mot de passe par défaut généré avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la réinitialisation");
    } finally {
      setSubmittingReset(false);
    }
  };

  // 5. Delete School
  const handleOpenDelete = (school: any) => {
    setDeletingSchool(school);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!deletingSchool) return;
    if (deleteConfirmText.trim().toLowerCase() !== deletingSchool.nom.trim().toLowerCase()) {
      return toast.error("Veuillez saisir le nom exact de l'école pour confirmer la suppression.");
    }

    setSubmittingDelete(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${deletingSchool.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur de suppression");
      }

      toast.success(data.message || "Établissement supprimé avec succès.");
      setDeletingSchool(null);
      if (selectedSchoolDetails && selectedSchoolDetails.school?.id === deletingSchool.id) {
        setSelectedSchoolDetails(null);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Filtered schools
  const filteredSchools = schools.filter(s => {
    const matchesSearch = 
      s.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code_ecole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admin_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admin_nom?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.statut_abonnement === statusFilter;
    const matchesPlan = planFilter === 'all' || (s.plan_abonnement && s.plan_abonnement.toLowerCase() === planFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Global KPIs
  const totalSchools = schools.length;
  const activeSchools = schools.filter(s => s.statut_abonnement === 'actif').length;
  const totalStudents = schools.reduce((acc, curr) => acc + (curr.student_count || 0), 0);
  const totalTeachers = schools.reduce((acc, curr) => acc + (curr.teacher_count || 0), 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-xs font-semibold text-slate-500">Chargement des établissements scolaires...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-700">
              SaaS Administration
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Espace Cloisonné</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Gestion des Comptes Écoles</h1>
          <p className="text-xs text-slate-500">
            Suivi des établissements, attribution de licences, création manuelle avec mots de passe générés et gestion sans violation de confidentialité.
          </p>
        </div>

        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} />
          <span>Ajouter une École Manuellement</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setMainTab('schools');
            setSearchParams({});
          }}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer",
            mainTab === 'schools'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <School size={16} />
          <span>Établissements Actifs ({schools.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMainTab('requests');
            setSearchParams({ tab: 'requests' });
          }}
          className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer relative",
            mainTab === 'requests'
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          )}
        >
          <CreditCard size={16} />
          <span>Demandes de création d'école</span>
          {pendingRequestsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </div>

      {mainTab === 'requests' ? (
        <SchoolRequestsManagement onSchoolApproved={fetchData} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <School size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Écoles</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{totalSchools}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actives</p>
            <p className="text-xl font-black text-emerald-600 leading-tight mt-0.5">{activeSchools}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <GraduationCap size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Élèves Déclarés</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{totalStudents.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Enseignants</p>
            <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{totalTeachers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Rechercher par nom d'école, code, email administrateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tous les statuts</option>
            <option value="actif">Actif</option>
            <option value="suspendu">Suspendu</option>
            <option value="en_attente_activation">En attente d'activation</option>
          </select>

          <select 
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Toutes les formules</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
            <option value="excellence">Excellence</option>
            <option value="illimité">Illimité</option>
          </select>

          {(searchTerm || statusFilter !== 'all' || planFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); setPlanFilter('all'); }}
              className="p-2 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
              title="Réinitialiser les filtres"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Schools Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80">
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Établissement</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Principal</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Formule & Licence</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Volumes</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <School className="w-10 h-10 mx-auto mb-2 opacity-30 text-indigo-500" />
                    <p className="text-sm font-bold text-slate-600">Aucun établissement trouvé</p>
                    <p className="text-xs text-slate-400 mt-1">Modifiez vos critères de recherche ou ajoutez une nouvelle école.</p>
                  </td>
                </tr>
              ) : (
                filteredSchools.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors group">
                    {/* Nom & Code */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm border border-indigo-200/60 shadow-xs shrink-0">
                          {s.nom?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5">
                            {s.nom}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                              {s.code_ecole || 'SANS-CODE'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {s.pays || 'Bénin'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <span 
                              className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight",
                                s.espace_primaire_actif === 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              )}
                              title={s.espace_primaire_actif === 0 ? `Primaire verrouillé : ${s.espace_primaire_motif_verrouillage || 'Sans motif'}` : 'Espace Maternelle & Primaire actif'}
                            >
                              {s.espace_primaire_actif === 0 ? <Lock size={9} /> : <Check size={9} />}
                              <span>Primaire: {s.espace_primaire_actif === 0 ? 'Verrouillé' : 'Actif'}</span>
                            </span>

                            <span 
                              className={cn(
                                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-tight",
                                s.espace_secondaire_actif === 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              )}
                              title={s.espace_secondaire_actif === 0 ? `Secondaire verrouillé : ${s.espace_secondaire_motif_verrouillage || 'Sans motif'}` : 'Espace Secondaire actif'}
                            >
                              {s.espace_secondaire_actif === 0 ? <Lock size={9} /> : <Check size={9} />}
                              <span>Secondaire: {s.espace_secondaire_actif === 0 ? 'Verrouillé' : 'Actif'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Admin */}
                    <td className="px-5 py-4">
                      <div className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-800 truncate">
                          {s.admin_nom || 'Direction'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1">
                          <Mail size={11} className="text-slate-400 shrink-0" />
                          <span>{s.admin_email || s.email || 'N/A'}</span>
                        </p>
                        {s.telephone && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <Phone size={10} className="text-slate-400 shrink-0" />
                            <span>{s.telephone}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Plan & Subscription */}
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider",
                          s.plan_abonnement?.toLowerCase() === 'excellence' || s.plan_abonnement?.toLowerCase() === 'illimité'
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : s.plan_abonnement?.toLowerCase() === 'premium'
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        )}>
                          <CreditCard size={11} />
                          <span>{s.plan_abonnement || 'Standard'}</span>
                        </span>
                        {s.date_fin_abonnement && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            <span>Échéance : {new Date(s.date_fin_abonnement).toLocaleDateString('fr-FR')}</span>
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Volumes (Aggregated Counts Only) */}
                    <td className="px-5 py-4 text-center">
                      <div className="inline-flex items-center gap-3 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/70 text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1" title="Élèves inscrits">
                          <GraduationCap size={13} className="text-blue-500" />
                          <span>{s.student_count || 0}</span>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1" title="Classes">
                          <BookOpen size={13} className="text-emerald-500" />
                          <span>{s.class_count || 0}</span>
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="flex items-center gap-1" title="Enseignants">
                          <Users size={13} className="text-indigo-500" />
                          <span>{s.teacher_count || 0}</span>
                        </span>
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="px-5 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-0.8 rounded-full text-[10px] font-bold uppercase",
                        s.statut_abonnement === 'actif'
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : s.statut_abonnement === 'suspendu'
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                      )}>
                        {s.statut_abonnement === 'actif' ? (
                          <CheckCircle2 size={11} className="text-emerald-600" />
                        ) : (
                          <AlertCircle size={11} className="text-amber-600" />
                        )}
                        <span>{s.statut_abonnement === 'actif' ? 'Actif' : s.statut_abonnement || 'Inactif'}</span>
                      </span>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. View Details (Privacy Isolated) */}
                        <button
                          onClick={() => handleOpenDetails(s)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                          title="Voir la fiche détaillée (sans accès aux données confidentielles)"
                        >
                          <Eye size={15} />
                        </button>

                        {/* 1b. Spaces Lock / Unlock */}
                        <button
                          onClick={() => handleOpenSpacesLock(s)}
                          className={cn(
                            "p-1.5 rounded-lg border transition-colors cursor-pointer",
                            (s.espace_primaire_actif === 0 || s.espace_secondaire_actif === 0)
                              ? "text-rose-600 bg-rose-50 hover:bg-rose-100 border-rose-200"
                              : "text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 border-slate-200 hover:border-amber-200"
                          )}
                          title="Activer ou verrouiller les espaces scolaires (Maternelle & Primaire / Secondaire)"
                        >
                          <Lock size={15} />
                        </button>

                        {/* 1c. School Messaging Gateways (SMTP & SMS) */}
                        <button
                          onClick={() => {
                            setSelectedSchoolForMessaging(s);
                            setIsMessagingModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors cursor-pointer"
                          title="Passerelles SMTP & SMS de cet établissement"
                        >
                          <Smartphone size={15} />
                        </button>

                        {/* 2. Edit */}
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                          title="Modifier les informations de l'école"
                        >
                          <Edit size={15} />
                        </button>

                        {/* 3. Reset Password */}
                        <button
                          onClick={() => handleOpenResetPassword(s)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded-lg border border-slate-200 hover:border-amber-200 transition-colors cursor-pointer"
                          title="Générer un nouveau mot de passe par défaut pour l'admin"
                        >
                          <KeyRound size={15} />
                        </button>

                        {/* 4. Delete */}
                        <button
                          onClick={() => handleOpenDelete(s)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 rounded-lg border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                          title="Supprimer l'établissement"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD SCHOOL MANUALLY + DEFAULT PASSWORD GENERATION               */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <School size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Ajouter un Compte École</h3>
                  <p className="text-xs text-slate-500">Un mot de passe par défaut et une clé de licence seront auto-générés.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSchool} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Nom de l'Établissement *
                  </label>
                  <input 
                    autoFocus
                    type="text" 
                    required
                    placeholder="ex: Complexe Scolaire Saint-Augustin"
                    value={newSchoolForm.nom}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, nom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Code École (Optionnel)
                  </label>
                  <input 
                    type="text" 
                    placeholder="Auto-généré si vide (ex: MF-XXXX)"
                    value={newSchoolForm.code_ecole}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, code_ecole: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Nom du Responsable / Directeur
                  </label>
                  <input 
                    type="text" 
                    placeholder="ex: M. Augustin KOUDJO"
                    value={newSchoolForm.admin_nom}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, admin_nom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Email de Connexion de l'Admin *
                  </label>
                  <input 
                    type="email" 
                    required
                    placeholder="direction@saint-augustin.com"
                    value={newSchoolForm.email}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[10px] text-slate-400">Cette adresse servira à l'école pour se connecter.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Téléphone de Contact
                  </label>
                  <input 
                    type="tel" 
                    placeholder="+229 97 00 00 00"
                    value={newSchoolForm.telephone}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, telephone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Pays
                  </label>
                  <select 
                    value={newSchoolForm.pays}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, pays: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Bénin">Bénin</option>
                    <option value="Togo">Togo</option>
                    <option value="Côte d'Ivoire">Côte d'Ivoire</option>
                    <option value="Sénégal">Sénégal</option>
                    <option value="Burkina Faso">Burkina Faso</option>
                    <option value="Mali">Mali</option>
                    <option value="Niger">Niger</option>
                    <option value="Cameroun">Cameroun</option>
                    <option value="France">France</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Devise
                  </label>
                  <select 
                    value={newSchoolForm.devise}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, devise: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">Euro (€)</option>
                    <option value="USD">Dollar ($)</option>
                    <option value="GNF">Franc Guinéen (GNF)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Formule de Licence
                  </label>
                  <select 
                    value={newSchoolForm.plan_abonnement}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, plan_abonnement: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                    {plans.length === 0 && (
                      <>
                        <option value="Standard">Standard</option>
                        <option value="Premium">Premium</option>
                        <option value="Excellence">Excellence</option>
                        <option value="Illimité">Illimité</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Durée de la Licence
                  </label>
                  <select 
                    value={newSchoolForm.duree_mois}
                    onChange={(e) => setNewSchoolForm({ ...newSchoolForm, duree_mois: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="1">1 Mois (Essai)</option>
                    <option value="3">3 Mois (Trimestriel)</option>
                    <option value="6">6 Mois (Semestriel)</option>
                    <option value="12">12 Mois / 1 An (Annuel)</option>
                    <option value="24">24 Mois / 2 Ans</option>
                  </select>
                </div>
              </div>

              {/* Informational banner about auto password */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 text-xs text-indigo-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-indigo-700">
                  <Sparkles size={15} />
                  <span>Génération automatique des accès</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Le système génèrera un mot de passe par défaut sécurisé (ex: <span className="font-mono font-bold text-indigo-600">Edu2026!xxxx</span>) et une clé unique de licence MFEP. Vous pourrez les copier immédiatement à la fin pour les transmettre au responsable.
                </p>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={submittingAdd}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAdd ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Créer l'Établissement</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATED CREDENTIALS RECAP MODAL                                  */}
      {/* ========================================================================= */}
      {createdCredentialsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-emerald-500/30 overflow-hidden text-left p-6 sm:p-8 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-500/10">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="text-lg font-black text-slate-900">Établissement & Compte Créés avec Succès !</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Voici les identifiants de connexion générés pour <strong>{createdCredentialsModal.school.nom}</strong>. Transmettez-les au responsable de l'école.
              </p>
            </div>

            {/* Credentials Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Établissement :</span>
                <span className="font-extrabold text-slate-900">{createdCredentialsModal.school.nom}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Code École :</span>
                <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {createdCredentialsModal.credentials.schoolCode}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500 font-bold">Identifiant / Email Admin :</span>
                <span className="font-mono font-bold text-slate-800">
                  {createdCredentialsModal.credentials.email}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-slate-200 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/80">
                <div>
                  <span className="text-amber-800 font-extrabold block text-[11px]">Mot de passe par défaut :</span>
                  <span className="font-mono font-black text-slate-900 text-sm tracking-wider">
                    {createdCredentialsModal.credentials.defaultPassword}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText(createdCredentialsModal.credentials.defaultPassword, 'defaultPassword')}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedField === 'defaultPassword' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedField === 'defaultPassword' ? 'Copié' : 'Copier'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-bold">Clé de Licence (MFEP) :</span>
                <span className="font-mono font-bold text-emerald-600 text-[11px]">
                  {createdCredentialsModal.credentials.subscriptionKey}
                </span>
              </div>
            </div>

            <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-[11px] text-slate-600 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                Le responsable pourra se connecter directement avec cet email et ce mot de passe, puis modifier son mot de passe en toute sécurité lors de son premier accès.
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  const summary = `🏫 IDENTIFIANTS MÉGAFIXAEDUC PRO\nÉtablissement : ${createdCredentialsModal.school.nom}\nCode École : ${createdCredentialsModal.credentials.schoolCode}\nEmail Admin : ${createdCredentialsModal.credentials.email}\nMot de passe par défaut : ${createdCredentialsModal.credentials.defaultPassword}\nClé de Licence : ${createdCredentialsModal.credentials.subscriptionKey}\nLien de connexion : ${window.location.origin}/login`;
                  handleCopyText(summary, 'fullSummary');
                }}
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedField === 'fullSummary' ? <Check size={15} /> : <Copy size={15} />}
                <span>Copier la Fiche Complète</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentialsModal(null)}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: VIEW DETAILED SCHOOL (STRICT PRIVACY ISOLATION)                  */}
      {/* ========================================================================= */}
      {selectedSchoolDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg border border-indigo-200/80 shadow-xs">
                  {selectedSchoolDetails.school.nom?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base leading-tight">
                    {selectedSchoolDetails.school.nom}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                      Code : {selectedSchoolDetails.school.code_ecole || 'N/A'}
                    </span>
                    <span className="text-xs text-slate-400 font-semibold">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      Inscrit le {new Date(selectedSchoolDetails.school.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedSchoolDetails(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Privacy Certification Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-emerald-900 flex items-start gap-3 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-extrabold flex items-center gap-1.5 text-emerald-800">
                    <span>Garantie de Cloisonnement de Confidentialité</span>
                    <span className="px-2 py-0.2 bg-emerald-200/60 rounded text-[9px] font-black uppercase tracking-wider">Actif</span>
                  </div>
                  <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                    Les données pédagogiques sensibles (notes des élèves, appréciations, délibérations d'examens), données financières internes des familles (scolarités perçues) et salaires du personnel demeurent strictement chiffrées et cloisonnées au niveau de l'établissement.
                  </p>
                </div>
              </div>

              {/* Aggregated Usage Metrics (Non-confidential) */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Métriques d'Utilisation Globales (Agrégées)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                    <p className="text-lg font-black text-slate-900">
                      {selectedSchoolDetails.metrics?.studentCount || 0}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Élèves Enregistrés</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                    <p className="text-lg font-black text-slate-900">
                      {selectedSchoolDetails.metrics?.classCount || 0}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Classes Ouvertes</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                    <p className="text-lg font-black text-slate-900">
                      {selectedSchoolDetails.metrics?.teacherCount || 0}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Enseignants</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                    <p className="text-lg font-black text-slate-900">
                      {selectedSchoolDetails.metrics?.userCount || 0}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Comptes Utilisateurs</p>
                  </div>
                </div>
              </div>

              {/* Administrative Info & Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2">
                    Coordonnées de l'Établissement
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Mail size={13} className="text-slate-400" />
                      <span>{selectedSchoolDetails.school.email || 'Aucun email officiel'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={13} className="text-slate-400" />
                      <span>{selectedSchoolDetails.school.telephone || 'Aucun téléphone'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={13} className="text-slate-400" />
                      <span>{selectedSchoolDetails.school.adresse || selectedSchoolDetails.school.pays || 'Non renseignée'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Globe size={13} className="text-slate-400" />
                      <span>Devise : {selectedSchoolDetails.school.devise || 'FCFA'}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription & Licence */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-2">
                    Licence & Abonnement
                  </h4>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Formule :</span>
                      <span className="font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {selectedSchoolDetails.school.plan_abonnement || 'Standard'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Statut :</span>
                      <span className={cn(
                        "font-extrabold uppercase text-[10px] px-2 py-0.5 rounded-full",
                        selectedSchoolDetails.school.statut_abonnement === 'actif'
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      )}>
                        {selectedSchoolDetails.school.statut_abonnement === 'actif' ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Échéance :</span>
                      <span className="font-semibold text-slate-800">
                        {selectedSchoolDetails.school.date_fin_abonnement 
                          ? new Date(selectedSchoolDetails.school.date_fin_abonnement).toLocaleDateString('fr-FR')
                          : 'Illimitée'}
                      </span>
                    </div>
                    {selectedSchoolDetails.school.subscription_key && (
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 block">Clé de licence MFEP :</span>
                        <span className="font-mono text-[10px] text-emerald-700 font-bold break-all">
                          {selectedSchoolDetails.school.subscription_key}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contrôle des Espaces Scolaires (Maternelle & Primaire / Secondaire) */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                      <Lock size={15} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">
                        Contrôle d'Accès aux Espaces Scolaires
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Activez ou verrouillez chaque cycle indépendamment pour cet établissement
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenSpacesLock(selectedSchoolDetails.school)}
                    className="px-2.5 py-1 text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                  >
                    Configuration Avancée
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Primaire */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all space-y-2",
                    selectedSchoolDetails.school.espace_primaire_actif === 0
                      ? "bg-rose-50/70 border-rose-200 text-rose-900"
                      : "bg-white border-slate-200 text-slate-800"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BookOpen size={14} className={selectedSchoolDetails.school.espace_primaire_actif === 0 ? "text-rose-600" : "text-amber-500"} />
                        <span className="font-bold text-xs">Maternelle & Primaire</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                        selectedSchoolDetails.school.espace_primaire_actif === 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      )}>
                        {selectedSchoolDetails.school.espace_primaire_actif === 0 ? "Verrouillé" : "Actif"}
                      </span>
                    </div>
                    {selectedSchoolDetails.school.espace_primaire_motif_verrouillage && (
                      <p className="text-[10px] text-rose-700 italic">
                        Motif : {selectedSchoolDetails.school.espace_primaire_motif_verrouillage}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = selectedSchoolDetails.school.espace_primaire_actif === 0 ? 1 : 0;
                        const motif = newStatus === 0 ? prompt("Motif du verrouillage pour Maternelle & Primaire (optionnel) :", "Accès suspendu par le Super Administrateur") : "";
                        handleSaveSpacesLock(selectedSchoolDetails.school.id, {
                          espace_primaire_actif: newStatus,
                          espace_secondaire_actif: selectedSchoolDetails.school.espace_secondaire_actif !== undefined ? selectedSchoolDetails.school.espace_secondaire_actif : 1,
                          espace_primaire_motif_verrouillage: motif,
                          espace_secondaire_motif_verrouillage: selectedSchoolDetails.school.espace_secondaire_motif_verrouillage || null
                        });
                      }}
                      className={cn(
                        "w-full py-1.5 px-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                        selectedSchoolDetails.school.espace_primaire_actif === 0
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-rose-600 hover:bg-rose-700 text-white"
                      )}
                    >
                      {selectedSchoolDetails.school.espace_primaire_actif === 0 ? "Déverrouiller Maternelle & Primaire" : "Verrouiller Maternelle & Primaire"}
                    </button>
                  </div>

                  {/* Secondaire */}
                  <div className={cn(
                    "p-3 rounded-xl border transition-all space-y-2",
                    selectedSchoolDetails.school.espace_secondaire_actif === 0
                      ? "bg-rose-50/70 border-rose-200 text-rose-900"
                      : "bg-white border-slate-200 text-slate-800"
                  )}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={14} className={selectedSchoolDetails.school.espace_secondaire_actif === 0 ? "text-rose-600" : "text-indigo-600"} />
                        <span className="font-bold text-xs">Secondaire</span>
                      </div>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                        selectedSchoolDetails.school.espace_secondaire_actif === 0
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      )}>
                        {selectedSchoolDetails.school.espace_secondaire_actif === 0 ? "Verrouillé" : "Actif"}
                      </span>
                    </div>
                    {selectedSchoolDetails.school.espace_secondaire_motif_verrouillage && (
                      <p className="text-[10px] text-rose-700 italic">
                        Motif : {selectedSchoolDetails.school.espace_secondaire_motif_verrouillage}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = selectedSchoolDetails.school.espace_secondaire_actif === 0 ? 1 : 0;
                        const motif = newStatus === 0 ? prompt("Motif du verrouillage pour le Secondaire (optionnel) :", "Accès suspendu par le Super Administrateur") : "";
                        handleSaveSpacesLock(selectedSchoolDetails.school.id, {
                          espace_primaire_actif: selectedSchoolDetails.school.espace_primaire_actif !== undefined ? selectedSchoolDetails.school.espace_primaire_actif : 1,
                          espace_secondaire_actif: newStatus,
                          espace_primaire_motif_verrouillage: selectedSchoolDetails.school.espace_primaire_motif_verrouillage || null,
                          espace_secondaire_motif_verrouillage: motif
                        });
                      }}
                      className={cn(
                        "w-full py-1.5 px-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                        selectedSchoolDetails.school.espace_secondaire_actif === 0
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-rose-600 hover:bg-rose-700 text-white"
                      )}
                    >
                      {selectedSchoolDetails.school.espace_secondaire_actif === 0 ? "Déverrouiller le Secondaire" : "Verrouiller le Secondaire"}
                    </button>
                  </div>

                  {/* Accès Fonctionnalités Status Card */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fonctionnalités</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase",
                        selectedSchoolDetails.school.features_locked === 1
                          ? "bg-rose-100 text-rose-800"
                          : "bg-emerald-100 text-emerald-800"
                      )}>
                        {selectedSchoolDetails.school.features_locked === 1 ? "Bloquées" : "Libres"}
                      </span>
                    </div>
                    {selectedSchoolDetails.school.features_locked === 1 && selectedSchoolDetails.school.features_locked_motif && (
                      <p className="text-[10px] text-rose-700 italic">
                        Motif : {selectedSchoolDetails.school.features_locked_motif}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const newStatus = selectedSchoolDetails.school.features_locked === 1 ? 0 : 1;
                        const motif = newStatus === 1 ? prompt("Motif du blocage des fonctionnalités (ex: impayé) :", "Accès suspendu par le Super Administrateur") : "";
                        handleSaveSpacesLock(selectedSchoolDetails.school.id, {
                          espace_primaire_actif: selectedSchoolDetails.school.espace_primaire_actif !== undefined ? selectedSchoolDetails.school.espace_primaire_actif : 1,
                          espace_secondaire_actif: selectedSchoolDetails.school.espace_secondaire_actif !== undefined ? selectedSchoolDetails.school.espace_secondaire_actif : 1,
                          espace_primaire_motif_verrouillage: selectedSchoolDetails.school.espace_primaire_motif_verrouillage || null,
                          espace_secondaire_motif_verrouillage: selectedSchoolDetails.school.espace_secondaire_motif_verrouillage || null,
                          features_locked: newStatus,
                          features_locked_motif: motif
                        });
                      }}
                      className={cn(
                        "w-full py-1.5 px-2 rounded-lg text-[10px] font-bold cursor-pointer transition-all",
                        selectedSchoolDetails.school.features_locked === 1
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-rose-600 hover:bg-rose-700 text-white"
                      )}
                    >
                      {selectedSchoolDetails.school.features_locked === 1 ? "Libérer les fonctions" : "Bloquer les fonctions"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Administrative Accounts (Only roles & names, no passwords) */}
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Responsables & Administrateurs Enregistrés
                </h4>
                <div className="space-y-2">
                  {selectedSchoolDetails.admins?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Aucun compte administrateur direct trouvé.</p>
                  ) : (
                    selectedSchoolDetails.admins?.map((adm: any) => (
                      <div key={adm.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center">
                            {adm.nom?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{adm.nom}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{adm.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700">
                            {adm.role}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {adm.last_seen ? `Vu le ${new Date(adm.last_seen).toLocaleDateString('fr-FR')}` : 'Jamais connecté'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  handleOpenEdit(selectedSchoolDetails.school);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit size={14} />
                <span>Modifier l'école</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenResetPassword(selectedSchoolDetails.school);
                }}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <KeyRound size={14} />
                <span>Réinitialiser Mot de Passe Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSchoolDetails(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: EDIT SCHOOL DETAILS                                              */}
      {/* ========================================================================= */}
      {editingSchool && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Modifier l'Établissement</h3>
                  <p className="text-xs text-slate-500">{editingSchool.nom}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSchool(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Nom de l'Établissement *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={editingSchool.nom}
                    onChange={(e) => setEditingSchool({ ...editingSchool, nom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Code École
                  </label>
                  <input 
                    type="text" 
                    value={editingSchool.code_ecole}
                    onChange={(e) => setEditingSchool({ ...editingSchool, code_ecole: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Email Officiel
                  </label>
                  <input 
                    type="email" 
                    value={editingSchool.email}
                    onChange={(e) => setEditingSchool({ ...editingSchool, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Téléphone
                  </label>
                  <input 
                    type="tel" 
                    value={editingSchool.telephone}
                    onChange={(e) => setEditingSchool({ ...editingSchool, telephone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Pays
                  </label>
                  <input 
                    type="text" 
                    value={editingSchool.pays}
                    onChange={(e) => setEditingSchool({ ...editingSchool, pays: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Adresse Géographique
                  </label>
                  <input 
                    type="text" 
                    value={editingSchool.adresse}
                    onChange={(e) => setEditingSchool({ ...editingSchool, adresse: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Formule d'Abonnement
                  </label>
                  <select 
                    value={editingSchool.plan_abonnement}
                    onChange={(e) => setEditingSchool({ ...editingSchool, plan_abonnement: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                    <option value="Excellence">Excellence</option>
                    <option value="Illimité">Illimité</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Statut du Compte
                  </label>
                  <select 
                    value={editingSchool.statut_abonnement}
                    onChange={(e) => setEditingSchool({ ...editingSchool, statut_abonnement: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                    <option value="inactif">Inactif</option>
                    <option value="en_attente_activation">En attente d'activation</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Date de Fin d'Abonnement (YYYY-MM-DD)
                  </label>
                  <input 
                    type="date" 
                    value={editingSchool.date_fin_abonnement}
                    onChange={(e) => setEditingSchool({ ...editingSchool, date_fin_abonnement: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Contrôle des Espaces Scolaires dans Modifier l'école */}
                <div className="sm:col-span-2 p-3.5 bg-slate-100/70 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-amber-600" />
                    <span className="text-xs font-bold text-slate-800">Contrôle des Espaces Scolaires</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Espace Primaire */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Maternelle & Primaire</span>
                        <input 
                          type="checkbox"
                          checked={editingSchool.espace_primaire_actif !== 0}
                          onChange={(e) => setEditingSchool({ ...editingSchool, espace_primaire_actif: e.target.checked ? 1 : 0 })}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold block",
                        editingSchool.espace_primaire_actif !== 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {editingSchool.espace_primaire_actif !== 0 ? "✓ Espace Actif" : "🔒 Espace Verrouillé"}
                      </span>
                      {editingSchool.espace_primaire_actif === 0 && (
                        <input
                          type="text"
                          placeholder="Motif du verrouillage..."
                          value={editingSchool.espace_primaire_motif_verrouillage || ''}
                          onChange={(e) => setEditingSchool({ ...editingSchool, espace_primaire_motif_verrouillage: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900"
                        />
                      )}
                    </div>

                    {/* Espace Secondaire */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">Secondaire</span>
                        <input 
                          type="checkbox"
                          checked={editingSchool.espace_secondaire_actif !== 0}
                          onChange={(e) => setEditingSchool({ ...editingSchool, espace_secondaire_actif: e.target.checked ? 1 : 0 })}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                        />
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold block",
                        editingSchool.espace_secondaire_actif !== 0 ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {editingSchool.espace_secondaire_actif !== 0 ? "✓ Espace Actif" : "🔒 Espace Verrouillé"}
                      </span>
                      {editingSchool.espace_secondaire_actif === 0 && (
                        <input
                          type="text"
                          placeholder="Motif du verrouillage..."
                          value={editingSchool.espace_secondaire_motif_verrouillage || ''}
                          onChange={(e) => setEditingSchool({ ...editingSchool, espace_secondaire_motif_verrouillage: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-900"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingSchool(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={submittingEdit}
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingEdit ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Enregistrer les Modifications</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: RESET ADMIN PASSWORD MODAL                                       */}
      {/* ========================================================================= */}
      {resettingPasswordSchool && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-amber-500/30 overflow-hidden text-left p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Réinitialiser le Mot de Passe Admin</h3>
                <p className="text-xs text-slate-500">Pour : <strong>{resettingPasswordSchool.nom}</strong></p>
              </div>
            </div>

            {newGeneratedPasswordResult ? (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 animate-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <CheckCircle2 size={16} />
                  <span>Nouveau Mot de Passe Généré avec Succès !</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Email Admin :</span>
                    <span className="font-mono font-bold text-slate-800">{newGeneratedPasswordResult.adminEmail}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold">Nouveau Mot de Passe :</span>
                    <span className="font-mono font-black text-indigo-700 text-sm tracking-wider">
                      {newGeneratedPasswordResult.newDefaultPassword}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyText(newGeneratedPasswordResult.newDefaultPassword, 'newDefaultPwd')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedField === 'newDefaultPwd' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedField === 'newDefaultPwd' ? 'Mot de passe copié !' : 'Copier le nouveau mot de passe'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResettingPasswordSchool(null);
                    setNewGeneratedPasswordResult(null);
                  }}
                  className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Terminer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cette action va remplacer le mot de passe actuel du compte administrateur principal de cet établissement par un nouveau mot de passe temporaire par défaut (ex: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-indigo-600">Edu2026!xxxx</code>).
                </p>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 leading-relaxed">
                  ⚠️ Le responsable de l'école devra utiliser ce nouveau mot de passe lors de sa prochaine connexion pour accéder à son établissement.
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button" 
                    onClick={() => setResettingPasswordSchool(null)}
                    className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button 
                    type="button" 
                    onClick={handleConfirmResetPassword}
                    disabled={submittingReset}
                    className="flex-1 py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submittingReset ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                    ) : (
                      <>
                        <KeyRound size={15} />
                        <span>Générer Nouveau MDP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: DELETE SCHOOL CONFIRMATION                                       */}
      {/* ========================================================================= */}
      {deletingSchool && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-rose-500/30 overflow-hidden text-left p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Supprimer l'Établissement</h3>
                <p className="text-xs text-slate-500">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement l'établissement <strong className="text-slate-900">{deletingSchool.nom}</strong> ?
            </p>

            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200/80 text-[11px] text-rose-800 leading-relaxed space-y-1">
              <p className="font-bold">⚠️ Conséquences de la suppression :</p>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>Les comptes utilisateurs rattachés seront supprimés.</li>
                <li>La licence et la configuration de l'école seront effacées.</li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-600">
                Veuillez taper <span className="font-mono font-bold text-rose-600 select-all">{deletingSchool.nom}</span> pour confirmer :
              </label>
              <input
                type="text"
                placeholder="Tapez le nom exact de l'école..."
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setDeletingSchool(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Annuler
              </button>
              <button 
                type="button" 
                onClick={handleConfirmDelete}
                disabled={submittingDelete || deleteConfirmText.trim().toLowerCase() !== deletingSchool.nom.trim().toLowerCase()}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
              >
                {submittingDelete ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Confirmer Suppression</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: SPACES LOCK / UNLOCK (MATERNELLE & PRIMAIRE / SECONDAIRE)       */}
      {/* ========================================================================= */}
      {spacesLockSchool && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col max-h-[92vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">Activer ou Verrouiller les Espaces</h3>
                  <p className="text-xs text-slate-500 truncate max-w-[280px]">{spacesLockSchool.nom}</p>
                </div>
              </div>
              <button 
                onClick={() => setSpacesLockSchool(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveSpacesLock(); }} className="p-6 overflow-y-auto space-y-5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Configurez l'accès aux cycles scolaires pour cet établissement. Les espaces verrouillés ne seront plus accessibles aux utilisateurs de cette école jusqu'à leur réactivation par le Super Administrateur.
              </p>

              {/* Maternelle & Primaire Card */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-3",
                spacesLockForm.espace_primaire_actif === 1 
                  ? "bg-slate-50 border-slate-200" 
                  : "bg-rose-50/60 border-rose-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={18} className={spacesLockForm.espace_primaire_actif === 1 ? "text-amber-500" : "text-rose-600"} />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Espace Maternelle & Primaire</h4>
                      <p className="text-[10px] text-slate-500">Classes, maîtres/maîtresses, notes et scolarité primaire</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpacesLockForm(prev => ({
                      ...prev,
                      espace_primaire_actif: prev.espace_primaire_actif === 1 ? 0 : 1
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      spacesLockForm.espace_primaire_actif === 1
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-rose-600 text-white shadow-xs"
                    )}
                  >
                    {spacesLockForm.espace_primaire_actif === 1 ? (
                      <>
                        <Check size={14} />
                        <span>Actif</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Verrouillé</span>
                      </>
                    )}
                  </button>
                </div>

                {spacesLockForm.espace_primaire_actif === 0 && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                    <label className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                      Motif du verrouillage (affiché aux utilisateurs de l'école)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Formule secondaire seule, renouvellement requis..."
                      value={spacesLockForm.espace_primaire_motif_verrouillage}
                      onChange={(e) => setSpacesLockForm(prev => ({ ...prev, espace_primaire_motif_verrouillage: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Secondaire Card */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-3",
                spacesLockForm.espace_secondaire_actif === 1 
                  ? "bg-slate-50 border-slate-200" 
                  : "bg-rose-50/60 border-rose-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className={spacesLockForm.espace_secondaire_actif === 1 ? "text-indigo-600" : "text-rose-600"} />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Espace Secondaire (Collège & Lycée)</h4>
                      <p className="text-[10px] text-slate-500">Classes collège/lycée, professeurs, devoirs, bulletins</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpacesLockForm(prev => ({
                      ...prev,
                      espace_secondaire_actif: prev.espace_secondaire_actif === 1 ? 0 : 1
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      spacesLockForm.espace_secondaire_actif === 1
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-rose-600 text-white shadow-xs"
                    )}
                  >
                    {spacesLockForm.espace_secondaire_actif === 1 ? (
                      <>
                        <Check size={14} />
                        <span>Actif</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Verrouillé</span>
                      </>
                    )}
                  </button>
                </div>

                {spacesLockForm.espace_secondaire_actif === 0 && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                    <label className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                      Motif du verrouillage (affiché aux utilisateurs de l'école)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Formule primaire seule, abonnement secondaire suspendu..."
                      value={spacesLockForm.espace_secondaire_motif_verrouillage}
                      onChange={(e) => setSpacesLockForm(prev => ({ ...prev, espace_secondaire_motif_verrouillage: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                )}
              </div>
              
              {/* Global Features Lock Card */}
              <div className={cn(
                "p-4 rounded-2xl border transition-all space-y-3",
                spacesLockForm.features_locked === 0 
                  ? "bg-slate-50 border-slate-200" 
                  : "bg-rose-50/60 border-rose-200"
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className={spacesLockForm.features_locked === 0 ? "text-indigo-600" : "text-rose-600"} />
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">Verrouiller toutes les fonctionnalités</h4>
                      <p className="text-[10px] text-slate-500">Bloquer l'accès à tous les modules d'écriture/modification</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSpacesLockForm(prev => ({
                      ...prev,
                      features_locked: prev.features_locked === 1 ? 0 : 1
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                      spacesLockForm.features_locked === 0
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-rose-600 text-white shadow-xs"
                    )}
                  >
                    {spacesLockForm.features_locked === 0 ? (
                      <>
                        <Check size={14} />
                        <span>Libre</span>
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        <span>Verrouillé</span>
                      </>
                    )}
                  </button>
                </div>

                {spacesLockForm.features_locked === 1 && (
                  <div className="space-y-1 pt-1 animate-in fade-in duration-150">
                    <label className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                      Motif du verrouillage des fonctionnalités
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Abonnement expiré, maintenance, solde impayé..."
                      value={spacesLockForm.features_locked_motif}
                      onChange={(e) => setSpacesLockForm(prev => ({ ...prev, features_locked_motif: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-rose-200 rounded-xl text-xs text-rose-900 placeholder:text-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSpacesLockSchool(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingSpacesLock}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submittingSpacesLock ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      <span>Appliquer la Configuration</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* School Messaging Configuration Modal */}
      <SchoolMessagingModal
        schoolId={selectedSchoolForMessaging?.id || null}
        isOpen={isMessagingModalOpen}
        onClose={() => {
          setIsMessagingModalOpen(false);
          setSelectedSchoolForMessaging(null);
        }}
        onUpdated={fetchData}
      />
    </div>
  );
}
