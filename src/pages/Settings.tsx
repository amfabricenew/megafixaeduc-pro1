import { apiFetch } from '../utils/api';
import React from 'react';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import logo from '../LOGO_MEGFIXAEDEUC_PRO.png';
import { 
  Settings as SettingsIcon, 
  Calendar, 
  Users, 
  Shield, 
  Database,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  Archive,
  Trash2,
  ArrowRightCircle,
  ArrowLeftCircle,
  RotateCcw,
  CheckCircle,
  Copy,
  Save,
  Clock,
  FileText,
  Printer,
  History,
  Search,
  Filter,
  Tag,
  Info,
  User,
  Mail,
  Lock,
  Unlock,
  ShieldCheck,
  Eye,
  EyeOff,
  Send,
  LogOut,
  Chrome,
  Crown,
  Sparkles,
  Check,
  CreditCard,
  Briefcase,
  GraduationCap,
  Building2,
  Phone,
  MapPin,
  Camera,
  Award,
  Smartphone,
  Upload,
  Download,
  RefreshCw,
  BookOpen,
  School,
  Layers,
  Globe
} from 'lucide-react';
import { LanguageSelector } from '../components/LanguageSelector';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import { useAuth } from '../contexts/AuthContext';
import { 
  SYSTEM_PAGES, 
  SYSTEM_ROLES, 
  normalizeAccessMode, 
  accessModeToBooleans, 
  AccessMode 
} from '../utils/permissions';
import { AccountCreatedModal, AccountCredentials } from '../components/AccountCreatedModal';
import PaymentSettingsTab from '../components/settings/PaymentSettingsTab';
import SmsSettingsTab from '../components/settings/SmsSettingsTab';
import BackupSettingsTab from '../components/settings/BackupSettingsTab';
import AISettingsTab from '../components/settings/AISettingsTab';
import SubscriptionSettingsTab from '../components/settings/SubscriptionSettingsTab';
import { formatAcademicYearLibelle, getDefaultDatesForAcademicYear, getNextAcademicYearLibelle } from '../utils/academicYear';

export default function Settings() {
  const confirm = useConfirm();
  const location = useLocation();
  const [annees, setAnnees] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [showYearModal, setShowYearModal] = React.useState(false);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [newYearForm, setNewYearForm] = React.useState({
    libelle: '',
    date_debut: '',
    date_fin: ''
  });
  const [dbHealth, setDbHealth] = React.useState<any>(null);
  const [checkingHealth, setCheckingHealth] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<any>(null);
  const [userForm, setUserForm] = React.useState({
    nom: '',
    email: '',
    role: 'enseignant',
    approuve: 1,
    permissions: [] as any[]
  });
  const [showApprovalModal, setShowApprovalModal] = React.useState<any>(null);
  const [approvalForm, setApprovalForm] = React.useState({
    role: 'enseignant',
    permissions: [{ path: '/', can_write: true }] as any[]
  });
  const [localFeedback, setLocalFeedback] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [logs, setLogs] = React.useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [logSearch, setLogSearch] = React.useState('');
  const [logFilterAction, setLogFilterAction] = React.useState('');
  const [logFilterEntity, setLogFilterEntity] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'general' | 'account' | 'language' | 'roles' | 'payments' | 'sms' | 'ai' | 'backups' | 'data_management' | 'subscription'>('general');
  const [showTransitionModal, setShowTransitionModal] = React.useState(false);
  const [transitionMode, setTransitionMode] = React.useState<'auto' | 'manual'>('auto');
  const [transitionConfig, setTransitionConfig] = React.useState({
    classes: true,
    eleves: true,
    timetable: true,
    matieres: true,
    evaluation_configs: true,
    notes: false,
    sourceYearId: '',
    targetYearId: '',
    mode: 'automatic' as 'automatic' | 'manual'
  });
  const [isTransitioning, setIsTransitioning] = React.useState(false);

  React.useEffect(() => {
    if (annees.length > 0 && !transitionConfig.sourceYearId) {
      const active = annees.find(y => y.est_active_effective);
      if (active) {
        setTransitionConfig(prev => ({ ...prev, sourceYearId: active.id.toString() }));
      }
    }
  }, [annees]);

  const handleTransition = async () => {
    const isManual = transitionConfig.mode === 'manual';
    const confirmMsg = isManual 
      ? "Êtes-vous sûr de vouloir copier les données entre ces deux années ?"
      : "Êtes-vous sûr de vouloir lancer la transition ? Cette action créera la nouvelle année et copiera les données sélectionnées.";
    
    const confirmed = await confirm({
      title: isManual ? "Copier les données" : "Transition de données",
      message: confirmMsg,
      confirmText: "Confirmer",
      confirmVariant: "danger"
    });
    
    if (!confirmed) return;
    
    setIsTransitioning(true);
    try {
      const endpoint = isManual ? '/api/annees/copy-data' : '/api/annees/transition';
      const body = isManual ? {
        from_year_id: transitionConfig.sourceYearId,
        to_year_id: transitionConfig.targetYearId,
        config: transitionConfig
      } : { import_config: transitionConfig };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(isManual ? "Données copiées avec succès !" : "Transition réussie ! La nouvelle année a été créée.");
        setShowTransitionModal(false);
        fetchAnnees();
      } else {
        toast.error(data?.error || "Erreur lors de l'opération");
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur réseau");
    } finally {
      setIsTransitioning(false);
    }
  };
  const [rolePermissions, setRolePermissions] = React.useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [profileForm, setProfileForm] = React.useState({ nom: '', email: '', question: '', answer: '' });
  const [passwordForm, setPasswordForm] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    code: ''
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [step, setStep] = React.useState<'request' | 'verify'>('request');
  const [sendingCode, setSendingCode] = React.useState(false);
  const [syncingTeachers, setSyncingTeachers] = React.useState(false);
  const [createdAccountCredentials, setCreatedAccountCredentials] = React.useState<AccountCredentials | null>(null);
  const [showCreatedAccountModal, setShowCreatedAccountModal] = React.useState(false);

  // Founder Profile State
  const [fondeForm, setFondeForm] = React.useState({
    matricule: '',
    nom: '',
    prenom: '',
    sexe: 'M',
    date_naissance: '',
    lieu_naissance: '',
    telephone: '',
    email: '',
    adresse: '',
    photo: '',
    niveau_etudes: 'Doctorat / Master',
    diplome: '',
    type_contrat: 'Fondateur',
    salaire_mensuel: '',
    statut: 'Actif'
  });
  const [savingFonde, setSavingFonde] = React.useState(false);
  const [loadingFonde, setLoadingFonde] = React.useState(false);
  const fondePhotoInputRef = React.useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const { logout, refreshUser, setSelectedYearId, fetchYears } = useAuth();
  const [syncingPermissions, setSyncingPermissions] = React.useState(false);

  const handleSyncAllPermissionsToUsers = async () => {
    try {
      setSyncingPermissions(true);
      const res = await fetchWithAuth('/api/role-permissions/sync-to-users', {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('school_permissions_version', Date.now().toString());
        window.dispatchEvent(new Event('school_permissions_updated'));
        if (refreshUser) refreshUser();
        fetchUsers();
        fetchRolePermissions();
        showToast(data.message || "Toutes les autorisations accordées ont été appliquées et synchronisées dans les comptes dédiés.");
      } else {
        toast.error(data.error || "Erreur lors de la synchronisation des autorisations");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion");
    } finally {
      setSyncingPermissions(false);
    }
  };

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { user: userData } = event.data;
        localStorage.setItem('user', JSON.stringify(userData));
        setCurrentUser(userData);
        showToast('Compte lié à Google avec succès');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const res = await apiFetch('/api/auth/google/url');
      const data = await res.json();
      
      if (data.error) {
        showToast(data.error, 'error');
        return;
      }

      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      window.open(
        data.url,
        'google-link',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (err) {
      console.error("Google link error:", err);
      showToast('Erreur lors de la liaison avec Google', 'error');
    }
  };

  const fetchWithAuth = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    return apiFetch(url, { ...options, headers });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSyncTeachers = async () => {
    if (!await confirm({
      title: "Génération de comptes enseignants",
      message: "Voulez-vous créer automatiquement des comptes pour tous les enseignants qui n'en ont pas encore ? Ils recevront un email avec leurs identifiants.",
      confirmText: "Générer les comptes",
      variant: "primary",
      icon: "help"
    })) {
      return;
    }

    try {
      setSyncingTeachers(true);
      const res = await fetchWithAuth('/api/users/sync-teachers', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        showToast(`${data.created} comptes créés, ${data.skipped} ignorés.`);
        fetchUsers();
      } else {
        showToast(data.error || "Erreur lors de la synchronisation", "error");
      }
    } catch (err) {
      showToast("Erreur de connexion", "error");
    } finally {
      setSyncingTeachers(false);
    }
  };

  const fetchFondeProfile = async () => {
    try {
      setLoadingFonde(true);
      const res = await fetchWithAuth('/api/personnel-administratif/fonde-profile');
      const data = await res.json();
      if (data && !data.error && data.fonde) {
        setFondeForm({
          matricule: data.fonde.matricule || '',
          nom: data.fonde.nom || '',
          prenom: data.fonde.prenom || '',
          sexe: data.fonde.sexe || 'M',
          date_naissance: data.fonde.date_naissance || '',
          lieu_naissance: data.fonde.lieu_naissance || '',
          telephone: data.fonde.telephone || '',
          email: data.fonde.email || '',
          adresse: data.fonde.adresse || '',
          photo: data.fonde.photo || '',
          niveau_etudes: data.fonde.niveau_etudes || 'Doctorat / Master',
          diplome: data.fonde.diplome || '',
          type_contrat: data.fonde.type_contrat || 'Fondateur',
          salaire_mensuel: data.fonde.salaire_mensuel || '',
          statut: data.fonde.statut || 'Actif'
        });
      }
    } catch (err) {
      console.error('Error fetching fonde profile:', err);
    } finally {
      setLoadingFonde(false);
    }
  };

  const handleFondePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFondeForm(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSaveFondeProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingFonde(true);
      const res = await fetchWithAuth('/api/personnel-administratif/fonde-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fondeForm)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Profil du Fondateur enregistré avec succès ! Sa planche est à jour dans Personnel Admi.');
      } else {
        showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
      }
    } catch (err) {
      showToast('Erreur de connexion au serveur', 'error');
    } finally {
      setSavingFonde(false);
    }
  };

  React.useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(user);
    setProfileForm({ 
      nom: user.nom || '', 
      email: user.email || '',
      question: user.question_secrete || '',
      answer: user.reponse_secrete || ''
    });
    fetchFondeProfile();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await fetchWithAuth('/api/audit-logs');
      if (!response.ok) {
        setLogs([]);
        return;
      }
      
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        setLogs([]);
        return;
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      } else {
        setLogs([]);
      }
    } catch (error) {
      console.warn('Unable to fetch audit logs:', error);
      setLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const generatePDF = (trimester?: number) => {
    if (!showPlanningModal) return;

    const doc = new jsPDF();
    const title = trimester 
      ? `Planification des activités - ${trimester}${trimester === 1 ? 'er' : 'ème'} Trimestre - ${showPlanningModal.libelle}`
      : `Planification annuelle des activités - ${showPlanningModal.libelle}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, 30);

    const filteredActivities = trimester 
      ? activities.filter(a => a.trimestre === trimester)
      : [...activities].sort((a, b) => a.trimestre - b.trimestre || new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

    const tableData = filteredActivities.map(a => [
      !trimester ? `${a.trimestre}${a.trimestre === 1 ? 'er' : 'ème'} Trim.` : '',
      a.titre,
      a.type.charAt(0).toUpperCase() + a.type.slice(1),
      `${new Date(a.date_debut).toLocaleDateString('fr-FR')}${a.date_fin ? ' au ' + new Date(a.date_fin).toLocaleDateString('fr-FR') : ''}`,
      a.heure || '-',
      a.description || '-'
    ].filter((_val, idx) => trimester ? idx !== 0 : true));

    const head = trimester 
      ? [['Activité', 'Type', 'Date', 'Heure', 'Description']]
      : [['Trim.', 'Activité', 'Type', 'Date', 'Heure', 'Description']];

    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    autoTable(doc, {
      head: head,
      body: tableData,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: rgb as any }, // dynamic primary color
      styles: { fontSize: 9 },
      columnStyles: trimester ? {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20 },
        4: { cellWidth: 'auto' }
      } : {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 35 },
        4: { cellWidth: 20 },
        5: { cellWidth: 'auto' }
      }
    });

    return doc;
  };

  const handleExportPDF = (trimester?: number) => {
    const doc = generatePDF(trimester);
    if (!doc) return;
    const fileName = trimester 
      ? `planification_trimestre_${trimester}_${showPlanningModal?.libelle}.pdf`
      : `planification_annuelle_${showPlanningModal?.libelle}.pdf`;
    doc.save(fileName);
  };

  const handlePrint = (trimester?: number) => {
    const doc = generatePDF(trimester);
    if (!doc) return;
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setLocalFeedback({ message, type });
    setTimeout(() => setLocalFeedback(null), 3000);
  };

  const [showPlanningModal, setShowPlanningModal] = React.useState<any>(null);
  const [activities, setActivities] = React.useState<any[]>([]);
  const [activityForm, setActivityForm] = React.useState({
    type: 'reunion',
    titre: '',
    description: '',
    date_debut: '',
    date_fin: '',
    heure: '',
    trimestre: 1
  });
  const [editingActivity, setEditingActivity] = React.useState<any>(null);
  const [showEvalPlanningModal, setShowEvalPlanningModal] = React.useState(false);
  const [evalPlanForm, setEvalPlanForm] = React.useState({
    trimestre: 1,
    date_debut: '',
    date_fin: '',
    titre: 'Évaluations du 1er Trimestre - Maternelle & Primaire',
    description: 'Planning des évaluations trimestrielles pour l\'espace Maternelle & Primaire.'
  });

  const handlePlanifyEvalMaternellePrimaire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPlanningModal?.id) return;
    
    fetchWithAuth('/api/activites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        annee_id: showPlanningModal.id,
        trimestre: evalPlanForm.trimestre,
        type: 'evaluation',
        titre: evalPlanForm.titre,
        description: evalPlanForm.description,
        date_debut: evalPlanForm.date_debut,
        date_fin: evalPlanForm.date_fin,
        heure: '08:00'
      })
    }).then(() => {
      setShowEvalPlanningModal(false);
      fetchActivities(showPlanningModal.id);
      showToast("Évaluations Maternelle & Primaire planifiées avec succès !");
    });
  };

  const fetchActivities = (yearId: number) => {
    fetchWithAuth(`/api/annees/${yearId}/activites`)
      .then(res => res.json())
      .then(setActivities);
  };

  const handleActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingActivity ? `/api/activites/${editingActivity.id}` : '/api/activites';
    const method = editingActivity ? 'PUT' : 'POST';

    fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...activityForm, annee_id: showPlanningModal.id })
    }).then(() => {
      setEditingActivity(null);
      setActivityForm({ type: 'reunion', titre: '', description: '', date_debut: '', date_fin: '', heure: '', trimestre: 1 });
      fetchActivities(showPlanningModal.id);
      showToast(editingActivity ? "Activité modifiée" : "Activité ajoutée");
    });
  };

  const handleDeleteActivity = async (id: number) => {
    if (await confirm({
      title: "Supprimer l'activité",
      message: "Voulez-vous vraiment supprimer cette activité ?",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      fetchWithAuth(`/api/activites/${id}`, { method: 'DELETE' }).then(() => {
        fetchActivities(showPlanningModal.id);
        showToast("Activité supprimée");
      });
    }
  };

  const handleNotifyActivity = (activity: any) => {
    fetchWithAuth('/api/alertes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titre: `Alerte: ${activity.titre}`,
        description: `${activity.description || ''} - Prévu pour le ${activity.date_debut}${activity.heure ? ' à ' + activity.heure : ''}`,
        importance: activity.type === 'evaluation' ? 'high' : (activity.type === 'conge' ? 'medium' : 'normal')
      })
    }).then(() => {
      showToast("Alerte envoyée avec succès");
    });
  };

  const fetchAnnees = () => {
    fetchWithAuth(`/api/annees?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnees(data);
        } else {
          setAnnees([]);
        }
        window.dispatchEvent(new CustomEvent('academicYearChanged'));
      })
      .catch(() => setAnnees([]));
  };

  const fetchUsers = () => {
    fetchWithAuth(`/api/users?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          setUsers([]);
        }
      })
      .catch(() => setUsers([]));
  };

  const fetchRolePermissions = () => {
    setLoadingRoles(true);
    fetchWithAuth('/api/role-permissions')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRolePermissions(data);
        } else {
          setRolePermissions([]);
        }
        setLoadingRoles(false);
      })
      .catch(() => {
        setRolePermissions([]);
        setLoadingRoles(false);
      });
  };

  const handleUpdateRolePermission = (role: string, permissions: any[]) => {
    fetchWithAuth(`/api/role-permissions/${role}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permissions })
    }).then(() => {
      fetchRolePermissions();
      fetchUsers();
      localStorage.setItem('school_permissions_version', Date.now().toString());
      window.dispatchEvent(new Event('school_permissions_updated'));
      if (refreshUser) refreshUser();
      showToast(`Permissions pour le rôle ${role} mises à jour et appliquées`);
    });
  };

  const [notesLocked, setNotesLocked] = React.useState(false);
  const [primaireLocked, setPrimaireLocked] = React.useState(false);
  const [secondaireLocked, setSecondaireLocked] = React.useState(false);
  const [togglingNotesLock, setTogglingNotesLock] = React.useState(false);

  const fetchNotesLockStatus = async () => {
    try {
      const res = await apiFetch('/api/notes-lock-status');
      if (res.ok) {
        const data = await res.json();
        setNotesLocked(Boolean(data.global_locked));
        setPrimaireLocked(Boolean(data.primaire_locked));
        setSecondaireLocked(Boolean(data.secondaire_locked));
      }
    } catch (e) {
      console.error("Erreur lock notes:", e);
    }
  };

  const handleToggleNotesLock = async (cycle?: 'primaire' | 'secondaire') => {
    let nextState = false;
    let cycleLabel = "globalement";
    if (cycle === 'primaire') {
      nextState = !primaireLocked;
      cycleLabel = "pour la maternelle & le primaire";
    } else if (cycle === 'secondaire') {
      nextState = !secondaireLocked;
      cycleLabel = "pour le secondaire";
    } else {
      nextState = !notesLocked;
    }

    const confirmMsg = nextState
      ? `Êtes-vous sûr de vouloir VERROUILLER l'insertion des notes ${cycleLabel} ?\n\nLorsque c'est verrouillé, les enseignants ne pourront plus saisir manuellement ni importer de notes sur Excel sans avoir obtenu au préalable une permission approuvée.`
      : `Êtes-vous sûr de vouloir DÉVERROUILLER l'insertion des notes ${cycleLabel} pour tous les enseignants ?`;

    if (!window.confirm(confirmMsg)) return;

    setTogglingNotesLock(true);
    try {
      const res = await apiFetch('/api/notes-lock-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notes_verrouillees: nextState ? 1 : 0,
          cycle
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur");
      }
      const data = await res.json();
      if (cycle === 'primaire') {
        setPrimaireLocked(data.notes_verrouillees === 1);
      } else if (cycle === 'secondaire') {
        setSecondaireLocked(data.notes_verrouillees === 1);
      } else {
        setNotesLocked(data.notes_verrouillees === 1);
      }
      showToast(data.notes_verrouillees === 1 
        ? `La saisie des notes ${cycleLabel} a été VERROUILLÉE avec succès.` 
        : `La saisie des notes ${cycleLabel} a été DÉVERROUILLÉE avec succès.`
      );
    } catch (err: any) {
      showToast(err.message || "Erreur lors de la mise à jour", 'error');
    } finally {
      setTogglingNotesLock(false);
    }
  };

  React.useEffect(() => {
    fetchAnnees();
    fetchUsers();
    checkDbHealth();
    fetchLogs();
    fetchRolePermissions();
    fetchNotesLockStatus();

    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'general' || tabParam === 'account' || tabParam === 'language' || tabParam === 'roles' || tabParam === 'payments' || tabParam === 'sms' || tabParam === 'ai' || tabParam === 'backups' || tabParam === 'data_management' || tabParam === 'subscription') {
      setActiveTab(tabParam as any);
    }
  }, [location.search]);

  const handleAddYear = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedLibelle = formatAcademicYearLibelle(newYearForm.libelle);
    let { date_debut, date_fin } = newYearForm;
    if (!date_debut || !date_fin) {
      const defDates = getDefaultDatesForAcademicYear(formattedLibelle);
      if (!date_debut) date_debut = defDates.date_debut;
      if (!date_fin) date_fin = defDates.date_fin;
    }
    fetchWithAuth('/api/annees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newYearForm,
        libelle: formattedLibelle,
        date_debut,
        date_fin
      })
    }).then(async res => {
      const data = await res.json();
      setShowYearModal(false);
      setNewYearForm({ libelle: '', date_debut: '', date_fin: '' });
      setSelectedYearId(data.new_year_id);
      showToast(`Nouvelle année scolaire ${formattedLibelle} ajoutée avec succès`);
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
    const method = editingUser ? 'PUT' : 'POST';

    try {
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });
      const data = await res.json();

      setShowUserModal(false);
      
      if (!editingUser && data && data.username && data.password) {
        setCreatedAccountCredentials({
          fullName: data.fullName || userForm.nom,
          role: data.role || userForm.role,
          username: data.username,
          password: data.password,
          otp: data.otp,
          schoolId: data.schoolId,
          schoolCode: data.schoolCode,
          schoolName: data.schoolName || 'Votre Établissement',
          schoolLoginUrl: data.schoolLoginUrl
        });
        setShowCreatedAccountModal(true);
      }

      setEditingUser(null);
      setUserForm({ nom: '', email: '', role: 'enseignant', approuve: 1, permissions: [] });
      fetchUsers();
      showToast(editingUser ? "Utilisateur modifié" : "Compte utilisateur créé avec succès");
    } catch (err: any) {
      showToast("Erreur lors de l'enregistrement de l'utilisateur", "error");
    }
  };

  const handleApproveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showApprovalModal) return;

    fetchWithAuth(`/api/users/${showApprovalModal.id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        approuve: true,
        role: approvalForm.role,
        permissions: approvalForm.permissions
      })
    }).then(() => {
      setShowApprovalModal(null);
      fetchUsers();
      showToast("Utilisateur confirmé manuellement");
    });
  };

  const handleRevokeUser = (id: number) => {
    fetchWithAuth(`/api/users/${id}/approve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approuve: false })
    }).then(() => {
      fetchUsers();
      showToast("Accès révoqué");
    });
  };

  // Helper functions for Granular Page Permissions (AccessMode)
  const getPermissionMode = (permissions: any[], path: string): AccessMode => {
    const list = Array.isArray(permissions) ? permissions : [];
    const item = list.find((p: any) => (typeof p === 'string' ? p === path : p.path === path));
    if (!item) return 'none';
    return normalizeAccessMode(item);
  };

  const updatePermissionsList = (permissions: any[], path: string, mode: AccessMode): any[] => {
    const list = Array.isArray(permissions) ? [...permissions] : [];
    const filtered = list.filter((p: any) => (typeof p === 'string' ? p !== path : p.path !== path));
    if (mode === 'none') {
      return filtered;
    }
    const pageDef = SYSTEM_PAGES.find(p => p.path === path);
    const { can_read, can_write } = accessModeToBooleans(mode);
    return [
      ...filtered,
      {
        path,
        label: pageDef?.label || path,
        can_read,
        can_write,
        access_type: mode
      }
    ];
  };

  const handleUpdateRolePageAccess = (role: string, path: string, mode: AccessMode) => {
    const roleData = rolePermissions.find(r => r.role === role);
    const currentPerms = roleData?.permissions || [];
    const newPerms = updatePermissionsList(currentPerms, path, mode);
    handleUpdateRolePermission(role, newPerms);
  };

  const handleSetRoleAllPagesMode = (role: string, mode: AccessMode) => {
    const newPerms = mode === 'none' 
      ? [] 
      : SYSTEM_PAGES.map(page => {
          const { can_read, can_write } = accessModeToBooleans(mode);
          return {
            path: page.path,
            label: page.label,
            can_read,
            can_write,
            access_type: mode
          };
        });
    handleUpdateRolePermission(role, newPerms);
  };

  const handleResetRoleToDefault = (role: string) => {
    const roleDef = SYSTEM_ROLES.find(r => r.id === role);
    if (!roleDef) return;
    const defaultPerms = SYSTEM_PAGES.map(page => {
      const mode = roleDef.defaultAccess[page.path] || 'none';
      const { can_read, can_write } = accessModeToBooleans(mode);
      return {
        path: page.path,
        label: page.label,
        can_read,
        can_write,
        access_type: mode
      };
    }).filter(p => p.access_type !== 'none');
    handleUpdateRolePermission(role, defaultPerms);
  };

  const setUserFormPageMode = (path: string, mode: AccessMode) => {
    setUserForm(prev => ({
      ...prev,
      permissions: updatePermissionsList(prev.permissions, path, mode)
    }));
  };

  const setUserFormAllPagesMode = (mode: AccessMode) => {
    setUserForm(prev => ({
      ...prev,
      permissions: mode === 'none' ? [] : SYSTEM_PAGES.map(page => {
        const { can_read, can_write } = accessModeToBooleans(mode);
        return {
          path: page.path,
          label: page.label,
          can_read,
          can_write,
          access_type: mode
        };
      })
    }));
  };

  const applyRoleDefaultsToUserForm = (role: string) => {
    const roleData = rolePermissions.find(r => r.role === role);
    if (roleData && Array.isArray(roleData.permissions) && roleData.permissions.length > 0) {
      setUserForm(prev => ({ ...prev, permissions: [...roleData.permissions] }));
      return;
    }
    const roleDef = SYSTEM_ROLES.find(r => r.id === role);
    if (!roleDef) return;
    const defPerms = SYSTEM_PAGES.map(page => {
      const mode = roleDef.defaultAccess[page.path] || 'none';
      const { can_read, can_write } = accessModeToBooleans(mode);
      return {
        path: page.path,
        label: page.label,
        can_read,
        can_write,
        access_type: mode
      };
    }).filter(p => p.access_type !== 'none');
    setUserForm(prev => ({ ...prev, permissions: defPerms }));
  };

  const setApprovalFormPageMode = (path: string, mode: AccessMode) => {
    setApprovalForm(prev => ({
      ...prev,
      permissions: updatePermissionsList(prev.permissions, path, mode)
    }));
  };

  const setApprovalFormAllPagesMode = (mode: AccessMode) => {
    setApprovalForm(prev => ({
      ...prev,
      permissions: mode === 'none' ? [] : SYSTEM_PAGES.map(page => {
        const { can_read, can_write } = accessModeToBooleans(mode);
        return {
          path: page.path,
          label: page.label,
          can_read,
          can_write,
          access_type: mode
        };
      })
    }));
  };

  const applyRoleDefaultsToApprovalForm = (role: string) => {
    const roleData = rolePermissions.find(r => r.role === role);
    if (roleData && Array.isArray(roleData.permissions) && roleData.permissions.length > 0) {
      setApprovalForm(prev => ({ ...prev, permissions: [...roleData.permissions] }));
      return;
    }
    const roleDef = SYSTEM_ROLES.find(r => r.id === role);
    if (!roleDef) return;
    const defPerms = SYSTEM_PAGES.map(page => {
      const mode = roleDef.defaultAccess[page.path] || 'none';
      const { can_read, can_write } = accessModeToBooleans(mode);
      return {
        path: page.path,
        label: page.label,
        can_read,
        can_write,
        access_type: mode
      };
    }).filter(p => p.access_type !== 'none');
    setApprovalForm(prev => ({ ...prev, permissions: defPerms }));
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    let perms = [];
    try {
      perms = user.permissions ? (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) : [];
      if (!Array.isArray(perms)) perms = [];
    } catch (e) {
      perms = [];
    }

    setUserForm({
      nom: user.nom ?? '',
      email: user.email ?? '',
      role: user.role ?? 'enseignant',
      approuve: user.approuve ?? 1,
      permissions: perms
    });
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: number) => {
    if (await confirm({
      title: "Supprimer l'utilisateur",
      message: "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      fetchWithAuth(`/api/users/${id}`, { method: 'DELETE' }).then(() => {
        fetchUsers();
        showToast("Utilisateur supprimé");
      });
    }
  };

  const activateYear = async (id: number, libelle: string) => {
    try {
      const res = await fetchWithAuth(`/api/annees/${id}/activate`, { method: 'PATCH' });
      if (res.ok) {
        localStorage.setItem('selected_year_id', id.toString());
        setSelectedYearId(id);
        await fetchAnnees();
        if (fetchYears) await fetchYears();
        showToast(`L'année ${libelle} est désormais l'année scolaire active. L'ancienne année a été automatiquement désactivée.`);
      } else {
        const data = await res.json();
        showToast(data.error || "Erreur lors de l'activation", "error");
      }
    } catch (e: any) {
      showToast(e.message || "Erreur réseau lors de l'activation", "error");
    }
  };

  const deactivateYear = async (id: number, libelle: string) => {
    if (await confirm({
      title: "Désactiver l'année scolaire",
      message: `Voulez-vous désactiver l'année scolaire ${libelle} ? L'année ne sera plus marquée comme l'année active.`,
      confirmText: "Désactiver",
      variant: "warning",
      icon: "warning"
    })) {
      fetchWithAuth(`/api/annees/${id}/deactivate`, { method: 'PATCH' }).then(async () => {
        await fetchAnnees();
        if (fetchYears) await fetchYears();
        showToast(`L'année ${libelle} a été désactivée`);
      });
    }
  };

  const archiveYear = async (id: number, libelle: string) => {
    if (await confirm({
      title: "Archiver l'année scolaire",
      message: `Voulez-vous archiver l'année scolaire ${libelle} ?`,
      confirmText: "Archiver",
      variant: "warning"
    })) {
      fetchWithAuth(`/api/annees/${id}/archive`, { method: 'PATCH' }).then(async () => {
        await fetchAnnees();
        if (fetchYears) await fetchYears();
        showToast(`L'année ${libelle} a été archivée`);
      });
    }
  };

  const cloturerYear = async (id: number, libelle: string) => {
    if (await confirm({
      title: "Clôturer l'année scolaire",
      message: `ATTENTION : Vous allez CLÔTURER l'année scolaire ${libelle}.\n\n• L'année sera clôturée et désactivée.\n• Elle ne sera plus l'année active.\n• Vous pourrez annuler la clôture ou la supprimer définitivement à tout moment.`,
      confirmText: "Clôturer l'année",
      variant: "danger",
      icon: "warning"
    })) {
      fetchWithAuth(`/api/annees/${id}/cloturer`, { method: 'PATCH' }).then(async () => {
        await fetchAnnees();
        if (fetchYears) await fetchYears();
        showToast(`L'année ${libelle} a été clôturée avec succès`);
      });
    }
  };

  const decloturerYear = async (id: number, libelle: string) => {
    if (await confirm({
      title: "Annuler la clôture de l'année scolaire",
      message: `Voulez-vous rouvrir et annuler la clôture de l'année scolaire ${libelle} ?\n\n• L'année sera réouverte et ne sera plus marquée comme clôturée.\n• Vous pourrez à nouveau la sélectionner pour être activée ou modifiée.`,
      confirmText: "Rouvrir / Annuler la clôture",
      variant: "primary",
      icon: "check"
    })) {
      try {
        const res = await fetchWithAuth(`/api/annees/${id}/decloturer`, { method: 'PATCH' });
        if (res.ok) {
          await fetchAnnees();
          if (fetchYears) await fetchYears();
          showToast(`La clôture de l'année ${libelle} a été annulée avec succès.`);
        } else {
          const data = await res.json();
          showToast(data.error || "Erreur lors de la réouverture", "error");
        }
      } catch (e: any) {
        showToast(e.message || "Erreur réseau", "error");
      }
    }
  };

  const unarchiveYear = async (id: number, libelle: string) => {
    if (await confirm({
      title: "Désarchiver l'année scolaire",
      message: `Voulez-vous désarchiver l'année scolaire ${libelle} ?`,
      confirmText: "Désarchiver",
      variant: "primary"
    })) {
      fetchWithAuth(`/api/annees/${id}/unarchive`, { method: 'PATCH' }).then(async () => {
        await fetchAnnees();
        if (fetchYears) await fetchYears();
        showToast(`L'année ${libelle} a été réactivée`);
      });
    }
  };

  const deleteYear = async (id: number, libelle: string, force: boolean = false) => {
    const title = force ? "Forcer la suppression de l'année" : "Supprimer l'année scolaire";
    const message = force 
      ? `ATTENTION : Vous allez supprimer l'année ${libelle} ET TOUTES SES DONNÉES (élèves, notes, classes, etc.). Cette action est IRRÉVERSIBLE. Continuer ?`
      : `Êtes-vous sûr de vouloir supprimer définitivement l'année scolaire ${libelle} ?`;

    if (await confirm({
      title,
      message,
      confirmText: "Supprimer définitivement",
      variant: "danger",
      icon: "trash"
    })) {
      fetchWithAuth(`/api/annees/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' })
        .then(async res => {
          const data = await res.json();
          if (!res.ok) {
            if (data.canForce) {
              if (await confirm({
                title: "Suppression forcée requise",
                message: `${data.error}\n\nVoulez-vous forcer la suppression et effacer TOUTES les données liées à cette année ?`,
                confirmText: "Forcer la suppression",
                variant: "danger",
                icon: "trash"
              })) {
                deleteYear(id, libelle, true);
                return;
              }
            }
            throw new Error(data.error || "Erreur lors de la suppression");
          }
          await fetchAnnees();
          if (fetchYears) await fetchYears();
          showToast(`L'année ${libelle} a été supprimée avec succès`);
        })
        .catch(err => {
          showToast(err.message, 'error');
        });
    }
  };

  const handlePrevYear = () => {
    const currentIndex = annees.findIndex(a => a.est_active_effective || a.est_active === 1);
    if (currentIndex !== -1 && currentIndex < annees.length - 1) {
      const prev = annees[currentIndex + 1];
      activateYear(prev.id, prev.libelle);
    } else {
      showToast("Aucune année précédente disponible", "error");
    }
  };

  const handleNextYear = async () => {
    const currentIndex = annees.findIndex(a => a.est_active_effective || a.est_active === 1);
    if (currentIndex > 0) {
      const next = annees[currentIndex - 1];
      activateYear(next.id, next.libelle);
    } else if (currentIndex === 0) {
      const active = annees[0];
      const nextLibelle = getNextAcademicYearLibelle(active.libelle);
      
      const confirmed = await confirm({
        title: "Année Suivante",
        message: `Voulez-vous créer l'année scolaire ${nextLibelle} et y transférer automatiquement toutes les configurations (classes, matières, plannings) de l'année en cours ?`,
        confirmText: "Oui, créer et transférer",
        cancelText: "Plus tard"
      });

      if (confirmed) {
        setIsTransitioning(true);
        try {
          const res = await apiFetch('/api/annees/transition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ import_config: transitionConfig })
          });
          const data = await res.json();
          if (res.ok) {
            toast.success(`Transition réussie vers l'année ${nextLibelle} !`);
            if (data.new_year_id) {
              await activateYear(data.new_year_id, nextLibelle);
            } else {
              await fetchAnnees();
              if (fetchYears) await fetchYears();
            }
          } else {
            toast.error(data?.error || "Erreur lors de la transition");
          }
        } catch (e) {
          toast.error("Erreur réseau");
        } finally {
          setIsTransitioning(false);
        }
      }
    } else if (annees.length > 0) {
      const mostRecent = annees[0];
      activateYear(mostRecent.id, mostRecent.libelle);
    }
  };

  const checkDbHealth = () => {
    setCheckingHealth(true);
    fetchWithAuth('/api/db/health')
      .then(res => res.json())
      .then(data => {
        setDbHealth(data);
        setCheckingHealth(false);
        showToast("Santé de la base de données vérifiée");
      })
      .catch(() => {
        setCheckingHealth(false);
        showToast("Erreur lors de la vérification", "error");
      });
  };

  const handleExportDb = () => {
    const token = localStorage.getItem('token');
    const url = `/api/db/export?t=${Date.now()}`;
    
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'megafixa_backup.sql');
    
    // Since we use Authorization header, we use fetch and then create a blob
    
    apiFetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    .then(res => {
      if (!res.ok) throw new Error("Erreur lors de l'exportation");
      return res.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `megafixa_backup_${new Date().toISOString().split('T')[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Base de données exportée avec succès");
    })
    .catch(err => {
      console.error(err);
      showToast("Erreur lors de l'exportation", "error");
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetchWithAuth('/api/auth/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: currentUser.id, ...profileForm })
      });
      const data = await response.json();
      if (data.success) {
        const updatedUser = { ...currentUser, ...profileForm };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        showToast('Profil mis à jour avec succès');
      } else {
        showToast(data.error || 'Erreur lors de la mise à jour', 'error');
      }
    } catch (error) {
      showToast('Erreur réseau', 'error');
    }
  };

  const handleRequestCode = async () => {
    try {
      setSendingCode(true);
      const response = await fetchWithAuth('/api/auth/password/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email })
      });
      const data = await response.json();
      if (data.success) {
        setStep('verify');
        showToast('Code de confirmation envoyé par email');
      } else {
        showToast(data.error || 'Erreur lors de l\'envoi du code', 'error');
      }
    } catch (error) {
      showToast('Erreur réseau', 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    try {
      const response = await fetchWithAuth('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentUser.email,
          code: passwordForm.code,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await response.json();
      if (data.success) {
        showToast('Mot de passe modifié avec succès');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '', code: '' });
        setStep('request');
      } else {
        showToast(data.error || 'Code invalide ou expiré', 'error');
      }
    } catch (error) {
      showToast('Erreur réseau', 'error');
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-100 rounded-xl">
            <SettingsIcon className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
            <p className="text-gray-500">Gérez votre compte et les paramètres de l'application</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 md:gap-4 mb-8 border-b border-gray-200 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <button
          onClick={() => setActiveTab('general')}
          className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${
            activeTab === 'general' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Général
          {activeTab === 'general' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('account')}
          className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${
            activeTab === 'account' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Mon compte
          {activeTab === 'account' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('language')}
          className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'language' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>Langue / Language</span>
          {activeTab === 'language' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
          )}
        </button>
        {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
          <>
            <button
              onClick={() => setActiveTab('roles')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap ${
                activeTab === 'roles' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Permissions par Rôle
              {activeTab === 'roles' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'payments' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Moyens de Paiement en Ligne</span>
              {activeTab === 'payments' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('sms')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'sms' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Passerelle SMS</span>
              {activeTab === 'sms' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'ai' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Services IA</span>
              {activeTab === 'ai' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('backups')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'backups' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database className="w-4 h-4 text-indigo-500" />
              <span>Sauvegardes</span>
              {activeTab === 'backups' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('data_management')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'data_management' ? 'text-amber-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Gestion des Données</span>
              {activeTab === 'data_management' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`pb-4 px-4 font-bold text-sm transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'subscription' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Abonnement & Formules</span>
              {activeTab === 'subscription' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full" />
              )}
            </button>
          </>
        )}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-8 relative">
          {/* Bannière Mode Strict Hors-Ligne */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 text-white p-5 rounded-3xl border border-slate-700/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Shield size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-sm md:text-base tracking-wide text-white">
                    Mode Strict Hors-Ligne & Souveraineté Locale
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Internet Interdit (100% Autonome)
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  L'accès à Internet est formellement interdit et neutralisé même si une connexion est disponible. Toutes les opérations s'exécutent en circuit fermé sur la base SQLite locale.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3.5 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                <p className="text-[10px] font-bold text-slate-300 uppercase">Données Externes</p>
                <p className="text-xs font-black text-amber-300">0 Reçues / 0 Émises</p>
              </div>
              <div className="px-3.5 py-2 bg-emerald-500/15 backdrop-blur-md rounded-2xl border border-emerald-400/30 text-center">
                <p className="text-[10px] font-bold text-emerald-300 uppercase">Base Locale</p>
                <p className="text-xs font-black text-white">megafixaEduc.db</p>
              </div>
            </div>
          </div>

          {/* Section Langue d'affichage du système */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Globe size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Langue d'Affichage du Système / System Display Language</h3>
                  <p className="text-xs text-slate-500">Basculez l'intégralité de l'interface en français ou en anglais en un clic.</p>
                </div>
              </div>
            </div>
            <LanguageSelector variant="cards" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Academic Years */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-primary-600" />
              Années Scolaires
            </h2>
            <div className="flex items-center gap-3">
              <button 
                id="btn-refresh-years-stats"
                onClick={() => {
                  fetchWithAuth('/api/annees/sync-stats', { method: 'POST' })
                    .finally(() => {
                      fetchAnnees();
                      showToast("Statistiques des années scolaires actualisées avec succès !");
                    });
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border border-indigo-200 shadow-2xs"
                title="Actualiser et recalculer toutes les statistiques de chaque année scolaire"
              >
                <RefreshCw size={14} />
                <span>Actualiser les statistiques</span>
              </button>
              <button 
                onClick={handlePrevYear}
                className="text-slate-600 text-sm font-bold flex items-center gap-1 hover:underline"
                title="Retourner à l'année précédente"
              >
                <ArrowLeftCircle size={16} />
                Année précédente
              </button>
              <button 
                onClick={handleNextYear}
                className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline"
                title="Aller à l'année suivante"
              >
                <ArrowRightCircle size={16} />
                Année suivante
              </button>
            </div>
          </div>

          {/* Sélecteur d'activation automatique de l'année scolaire */}
          <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-900">
                Année scolaire active :
              </span>
              <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                {annees.find(a => a.est_active_effective || a.est_active === 1)?.libelle || 'Aucune'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Changer pour activer automatiquement :</span>
              <select
                value={annees.find(a => a.est_active_effective || a.est_active === 1)?.id || ''}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const selectedYear = annees.find(a => a.id === val);
                  if (selectedYear) {
                    activateYear(selectedYear.id, selectedYear.libelle);
                  }
                }}
                className="bg-white text-xs font-bold text-slate-800 border border-emerald-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
              >
                {annees.map(a => (
                  <option key={a.id} value={a.id}>
                    Année {a.libelle} {a.est_active_effective ? '✓ (Active en cours)' : ''} {a.cloturee === 1 ? '🔒 (Clôturée)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y overflow-hidden">
            <div className="divide-y">
              {annees.map((annee) => (
                <YearItem 
                  key={annee.id} 
                  annee={annee} 
                  onActivate={() => activateYear(annee.id, annee.libelle)}
                  onDeactivate={() => deactivateYear(annee.id, annee.libelle)}
                  onArchive={() => archiveYear(annee.id, annee.libelle)}
                  onUnarchive={() => unarchiveYear(annee.id, annee.libelle)}
                  onDelete={() => deleteYear(annee.id, annee.libelle)}
                  onCloturer={() => cloturerYear(annee.id, annee.libelle)}
                  onDecloturer={() => decloturerYear(annee.id, annee.libelle)}
                  onPlanify={() => {
                    setShowPlanningModal(annee);
                    fetchActivities(annee.id);
                  }}
                  onRefreshStats={async (id: number) => {
                    try {
                      await fetchWithAuth(`/api/annees/${id}/recalculate-stats`, { method: 'POST' });
                      await fetchAnnees();
                      showToast(`Statistiques de l'année ${annee.libelle} mises à jour !`);
                    } catch (e: any) {
                      showToast("Erreur lors de la mise à jour des statistiques", "error");
                    }
                  }}
                  onUpdateDeadlines={(id: number, data: any) => {
                    fetchWithAuth(`/api/annees/${id}/deadlines`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    }).then(() => {
                      fetchAnnees();
                      showToast("Délais de paiement mis à jour");
                    });
                  }}
                  onUpdateYear={(id: number, data: any) => {
                    return fetchWithAuth(`/api/annees/${id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    }).then(() => {
                      fetchAnnees();
                      showToast("Période de l'année scolaire mise à jour");
                    });
                  }}
                />
              ))}
            </div>
            <button 
              onClick={() => setShowYearModal(true)}
              className="w-full p-4 text-primary-600 text-sm font-bold flex items-center justify-center gap-2 hover:bg-primary-50 transition-colors border-t border-slate-50"
            >
              <Plus size={18} />
              Créer une nouvelle année scolaire
            </button>
            {annees.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                Aucune année scolaire configurée.
              </div>
            )}
          </div>
        </section>

        {/* User Roles */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Shield size={20} className="text-blue-600" />
              Gestion des Utilisateurs
            </h2>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleSyncTeachers}
                disabled={syncingTeachers}
                className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                <RotateCcw size={16} className={syncingTeachers ? "animate-spin" : ""} />
                Synchroniser Enseignants
              </button>
              <button 
                onClick={() => { setEditingUser(null); setUserForm({ nom: '', email: '', role: 'enseignant', approuve: 1, permissions: [{ path: '/', can_write: true }] }); setShowUserModal(true); }}
                className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
              >
                <Plus size={16} />
                Ajouter un utilisateur
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y overflow-hidden">
            {users
              .filter((u: any) => u.id !== currentUser?.id) // Don't show current admin in the list of managed users
              .sort((a: any, b: any) => a.approuve - b.approuve)
              .map((user: any) => (
                <UserItem 
                  key={user.id} 
                  name={user.nom} 
                  email={user.email}
                  role={user.role} 
                  approuve={user.approuve}
                  otp_code={user.otp_code}
                  permissions={user.permissions}
                  last_seen={user.last_seen}
                  google_id={user.google_id}
                  onApprove={() => {
                    setApprovalForm({ role: user.role || 'enseignant', permissions: ['/'] });
                    setShowApprovalModal(user);
                  }}
                  onRevoke={() => handleRevokeUser(user.id)}
                  onEdit={() => handleEditUser(user)}
                  onDelete={() => handleDeleteUser(user.id)}
                />
              ))}
            {users.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm italic">
                Aucun utilisateur configuré.
              </div>
            )}
          </div>
        </section>

        {/* Database & Backup */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Database size={20} className="text-amber-600" />
            Base de données
          </h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">État de la base</p>
                {dbHealth ? (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${dbHealth.status === 'healthy' ? 'bg-primary-500' : 'bg-red-500'}`}></span>
                    <span className="text-xs text-slate-500">
                      {dbHealth.status === 'healthy' ? 'Opérationnelle' : 'Erreur'} 
                      {dbHealth.stats ? ` (${dbHealth.stats.tables ?? 0} tables, ${dbHealth.stats.eleves ?? 0} élèves)` : ''}
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">Vérification en cours...</p>
                )}
              </div>
              <button 
                onClick={checkDbHealth}
                disabled={checkingHealth}
                className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw size={18} className={checkingHealth ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="space-y-3">
              <button 
                onClick={() => setActiveTab('backups')}
                className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <Database size={16} />
                Centre de Sauvegarde & Restauration
              </button>
              <button 
                onClick={handleExportDb}
                className="w-full py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Exporter la base instantanée (.sql)
              </button>
              <button 
                onClick={async () => {
                  try {
                    toast.loading("Génération du ZIP du code...", { id: "code-zip" });
                    const res = await apiFetch('/api/code/download-zip');
                    if (!res.ok) throw new Error("Erreur de téléchargement");
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'megafixaeduc-code.zip';
                    a.click();
                    window.URL.revokeObjectURL(url);
                    toast.success("Archive ZIP du code téléchargée (< 25 Mo) !", { id: "code-zip" });
                  } catch (e: any) {
                    toast.error(e.message || "Erreur de génération", { id: "code-zip" });
                  }
                }}
                className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                Télécharger le code source (ZIP &lt; 25 Mo)
              </button>
              <p className="text-[10px] text-center text-slate-400">
                Sauvegardes automatiques quotidiennes et code source optimisé (&lt; 25 Mo) disponibles.
              </p>
            </div>
          </div>
        </section>

        {/* App Info */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SettingsIcon size={20} className="text-slate-600" />
            À propos
          </h2>
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <img src={logo} alt="Logo MégafixaEduc" className="w-12 h-12 object-contain rounded-xl" referrerPolicy="no-referrer" />
              <div>
                <p className="font-bold text-slate-900">MégafixaEduc Pro</p>
                <p className="text-xs text-slate-500">Version 1.0.0 (Stable)</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Solution moderne de gestion scolaire optimisée pour les établissements d'enseignement général et technique.
            </p>
          </div>
        </section>

        {/* Notes Entry Lock Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary-600" />
              Sécurité & Verrouillage des Notes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primaire & Maternelle */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <GraduationCap size={18} />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  primaireLocked ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {primaireLocked ? 'Verrouillé' : 'Déverrouillé'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-sm">Maternelle & Primaire</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Contrôle la saisie des notes pour les classes de maternelle et du primaire.
                </p>
              </div>
              <button
                onClick={() => handleToggleNotesLock('primaire')}
                disabled={togglingNotesLock}
                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all ${
                  primaireLocked ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200'
                }`}
              >
                {togglingNotesLock ? <RefreshCw size={14} className="animate-spin" /> : primaireLocked ? <Unlock size={14} /> : <Lock size={14} />}
                {primaireLocked ? 'Déverrouiller Primaire' : 'Verrouiller Primaire'}
              </button>
            </div>

            {/* Secondaire */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Building2 size={18} />
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  secondaireLocked ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {secondaireLocked ? 'Verrouillé' : 'Déverrouillé'}
                </span>
              </div>
              <div className="space-y-1">
                <p className="font-bold text-slate-900 text-sm">Cycle Secondaire</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Contrôle la saisie des notes pour les classes du collège et du lycée.
                </p>
              </div>
              <button
                onClick={() => handleToggleNotesLock('secondaire')}
                disabled={togglingNotesLock}
                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 text-xs transition-all ${
                  secondaireLocked ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200'
                }`}
              >
                {togglingNotesLock ? <RefreshCw size={14} className="animate-spin" /> : secondaireLocked ? <Unlock size={14} /> : <Lock size={14} />}
                {secondaireLocked ? 'Déverrouiller Secondaire' : 'Verrouiller Secondaire'}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${notesLocked ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">Verrouillage Global</p>
                <p className="text-[11px] text-slate-500">Applique un verrouillage à l'ensemble de l'établissement.</p>
              </div>
            </div>
            <button
              onClick={() => handleToggleNotesLock()}
              disabled={togglingNotesLock}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                notesLocked ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {notesLocked ? 'Désactiver Global' : 'Activer Global'}
            </button>
          </div>
        </section>
      </div>

      {/* Audit Log Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-primary-600" />
            Journal d'Audit
          </h2>
          <button 
            onClick={fetchLogs}
            className="text-primary-600 text-sm font-bold flex items-center gap-1 hover:underline"
          >
            <RotateCcw size={16} className={loadingLogs ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 bg-slate-50/30 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
              value={logFilterAction}
              onChange={(e) => setLogFilterAction(e.target.value)}
            >
              <option value="">Toutes les actions</option>
              <option value="CREATE">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
              <option value="LOGIN">Connexion</option>
            </select>
            <select
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500/20"
              value={logFilterEntity}
              onChange={(e) => setLogFilterEntity(e.target.value)}
            >
              <option value="">Toutes les entités</option>
              <option value="ELEVE">Élève</option>
              <option value="ENSEIGNANT">Enseignant</option>
              <option value="CLASSE">Classe</option>
              <option value="PAIEMENT">Paiement</option>
              <option value="ACTIVITE">Activité</option>
              <option value="USER">Utilisateur</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Utilisateur</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Entité</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">Chargement...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs italic">Aucun log trouvé</td>
                  </tr>
                ) : (
                  logs
                    .filter(log => {
                      const matchesSearch = 
                        (log.utilisateur_nom || '').toLowerCase().includes(logSearch.toLowerCase()) ||
                        (log.details || '').toLowerCase().includes(logSearch.toLowerCase()) ||
                        (log.entite_type || '').toLowerCase().includes(logSearch.toLowerCase());
                      const matchesAction = logFilterAction === '' || log.action === logFilterAction;
                      const matchesEntity = logFilterEntity === '' || log.entite_type === logFilterEntity;
                      return matchesSearch && matchesAction && matchesEntity;
                    })
                    .slice(0, 50)
                    .map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-slate-500">
                          {format(new Date(log.date_activite), 'Pp', { locale: fr })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold">
                              {(log.utilisateur_nom || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs font-medium text-slate-700">{log.utilisateur_nom || 'Utilisateur inconnu'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            log.action === 'CREATE' ? 'bg-green-50 text-green-600 border-green-100' :
                            log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            log.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-50 text-slate-600 border-slate-100'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                          <span className="font-bold">{log.entite_type}</span>
                          <span className="ml-1 opacity-50">#{log.entite_id}</span>
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-500 max-w-xs truncate">
                          {log.details}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-3 bg-slate-50/50 border-t border-slate-50 text-center">
            <button 
              onClick={() => window.location.href = '/audit-logs'}
              className="text-xs font-bold text-primary-600 hover:underline"
            >
              Voir tout le journal d'audit
            </button>
          </div>
        </div>
      </section>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{editingUser ? 'Modifier l\'utilisateur & ses accès' : 'Créer un nouvel utilisateur'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Le Fondé attribue ou retire des autorisations personnalisées (Lecture & Écriture, Lecture seule, Écriture seule)</p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUserSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nom complet</label>
                  <input 
                    required
                    value={userForm.nom}
                    onChange={e => setUserForm({...userForm, nom: e.target.value})}
                    type="text" 
                    placeholder="ex: Jean Dupont"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email (Identifiant)</label>
                  <input 
                    required
                    value={userForm.email}
                    onChange={e => setUserForm({...userForm, email: e.target.value})}
                    type="email" 
                    placeholder="email@ecole.com"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rôle Principal</label>
                  <select 
                    value={userForm.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      setUserForm(prev => ({ ...prev, role: newRole }));
                      applyRoleDefaultsToUserForm(newRole);
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-800"
                  >
                    {SYSTEM_ROLES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Statut d'accès</label>
                  <select 
                    value={userForm.approuve || 0}
                    onChange={e => setUserForm({...userForm, approuve: parseInt(e.target.value) || 0})}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-800"
                  >
                    <option value={1}>✅ Approuvé (Compte actif & autorisé)</option>
                    <option value={0}>⏳ En attente (Accès bloqué)</option>
                  </select>
                </div>
              </div>

              {/* Granular Page Access Section */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                  <div>
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={16} className="text-primary-600" />
                      Autorisations individuelles par page
                    </label>
                    <p className="text-[11px] text-slate-500">Les pages non autorisées seront totalement masquées pour cet utilisateur.</p>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => applyRoleDefaultsToUserForm(userForm.role)}
                      className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                      title="Rétablir les permissions par défaut du rôle"
                    >
                      Défaut rôle
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFormAllPagesMode('read_write')}
                      className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors"
                    >
                      Tout Lecture/Écriture
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFormAllPagesMode('read_only')}
                      className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                    >
                      Tout Lecture
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserFormAllPagesMode('none')}
                      className="px-2 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md transition-colors"
                    >
                      Tout désactiver
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {SYSTEM_PAGES.map(page => {
                    const currentMode = getPermissionMode(userForm.permissions, page.path);
                    const isEnabled = currentMode !== 'none';

                    return (
                      <div 
                        key={page.path} 
                        className={`p-2.5 rounded-xl border transition-all ${
                          isEnabled 
                            ? 'bg-slate-50/90 border-slate-200 shadow-xs' 
                            : 'bg-slate-50/30 border-slate-100 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={isEnabled}
                              onChange={() => {
                                setUserFormPageMode(page.path, isEnabled ? 'none' : 'read_write');
                              }}
                              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                            />
                            <div>
                              <span className="text-xs font-bold text-slate-800">{page.label}</span>
                              <span className="ml-1.5 text-[10px] font-mono text-slate-400">({page.path})</span>
                            </div>
                          </label>

                          {isEnabled ? (
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => setUserFormPageMode(page.path, 'read_write')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentMode === 'read_write'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                ✏️ Lecture & Écriture
                              </button>
                              <button
                                type="button"
                                onClick={() => setUserFormPageMode(page.path, 'read_only')}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  currentMode === 'read_only'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                👁️ Lecture seule
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-end sm:self-auto">
                              🚫 Masquée (Aucun accès)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-md shadow-primary-500/20 text-sm"
                >
                  {editingUser ? 'Enregistrer les modifications' : 'Créer et activer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <AnimatePresence>
        {showApprovalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Approuver et configurer l'accès</h3>
                    <p className="text-xs text-slate-500">{showApprovalModal.nom} ({showApprovalModal.email})</p>
                  </div>
                </div>
                <button onClick={() => setShowApprovalModal(null)} className="p-2 hover:bg-white rounded-full transition-colors">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleApproveUser} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Attribuer un rôle</label>
                  <select 
                    value={approvalForm.role}
                    onChange={e => {
                      const newRole = e.target.value;
                      setApprovalForm(prev => ({ ...prev, role: newRole }));
                      applyRoleDefaultsToApprovalForm(newRole);
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-800"
                  >
                    {SYSTEM_ROLES.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Granular Page Access Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-primary-600" />
                        Autoriser l'accès aux pages
                      </label>
                      <p className="text-[11px] text-slate-500">Choisissez les pages visibles et le mode d'accès accordé à ce membre.</p>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyRoleDefaultsToApprovalForm(approvalForm.role)}
                        className="px-2 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
                      >
                        Défaut rôle
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovalFormAllPagesMode('read_write')}
                        className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md transition-colors"
                      >
                        Tout Lecture/Écriture
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovalFormAllPagesMode('read_only')}
                        className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors"
                      >
                        Tout Lecture
                      </button>
                      <button
                        type="button"
                        onClick={() => setApprovalFormAllPagesMode('none')}
                        className="px-2 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md transition-colors"
                      >
                        Tout désactiver
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {SYSTEM_PAGES.map(page => {
                      const currentMode = getPermissionMode(approvalForm.permissions, page.path);
                      const isEnabled = currentMode !== 'none';

                      return (
                        <div 
                          key={page.path} 
                          className={`p-2.5 rounded-xl border transition-all ${
                            isEnabled 
                              ? 'bg-slate-50/90 border-slate-200 shadow-xs' 
                              : 'bg-slate-50/30 border-slate-100 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={isEnabled}
                                onChange={() => {
                                  setApprovalFormPageMode(page.path, isEnabled ? 'none' : 'read_write');
                                }}
                                className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                              />
                              <div>
                                <span className="text-xs font-bold text-slate-800">{page.label}</span>
                                <span className="ml-1.5 text-[10px] font-mono text-slate-400">({page.path})</span>
                              </div>
                            </label>

                            {isEnabled ? (
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => setApprovalFormPageMode(page.path, 'read_write')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentMode === 'read_write'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  ✏️ Lecture & Écriture
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setApprovalFormPageMode(page.path, 'read_only')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    currentMode === 'read_only'
                                      ? 'bg-blue-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  👁️ Lecture seule
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-end sm:self-auto">
                                🚫 Masquée
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <Shield className="text-amber-600 shrink-0" size={20} />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    En validant, le compte sera activé et l'utilisateur aura accès uniquement aux pages autorisées ci-dessus selon le mode configuré.
                  </p>
                </div>

                <div className="flex gap-3 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setShowApprovalModal(null)}
                    className="flex-1 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors text-sm"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 text-sm"
                  >
                    Autoriser et valider l'accès
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* New Year Modal */}
      {showYearModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Nouvelle Année Scolaire</h2>
              <button onClick={() => setShowYearModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddYear} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Libellé (ex: 2025-2026)</label>
                <input 
                  required
                  value={newYearForm.libelle}
                  onChange={e => {
                    const val = e.target.value;
                    const autoVal = formatAcademicYearLibelle(val);
                    if (val.match(/^(\d{4})[-/](\d{4})$/) && autoVal !== val) {
                      const defDates = getDefaultDatesForAcademicYear(autoVal);
                      setNewYearForm(prev => ({
                        ...prev,
                        libelle: autoVal,
                        date_debut: prev.date_debut || defDates.date_debut,
                        date_fin: defDates.date_fin
                      }));
                    } else {
                      setNewYearForm(prev => ({ ...prev, libelle: val }));
                    }
                  }}
                  onBlur={e => {
                    const formatted = formatAcademicYearLibelle(e.target.value);
                    if (formatted && formatted !== e.target.value) {
                      const defDates = getDefaultDatesForAcademicYear(formatted);
                      setNewYearForm(prev => ({
                        ...prev,
                        libelle: formatted,
                        date_debut: prev.date_debut || defDates.date_debut,
                        date_fin: defDates.date_fin
                      }));
                    }
                  }}
                  placeholder="2025-2026"
                  type="text" 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-bold text-slate-800" 
                />
                <p className="text-[11px] text-slate-500">
                  Format automatique : une année scolaire s'étend sur deux années consécutives (ex: 2025-2026).
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date début</label>
                  <input 
                    required
                    value={newYearForm.date_debut}
                    onChange={e => {
                      const dateVal = e.target.value;
                      const dateObj = new Date(dateVal);
                      const startYear = dateObj.getFullYear();
                      let updatedLibelle = newYearForm.libelle;
                      let updatedFin = newYearForm.date_fin;
                      if (!isNaN(startYear)) {
                        updatedLibelle = `${startYear}-${startYear + 1}`;
                        updatedFin = `${startYear + 1}-07-31`;
                      }
                      setNewYearForm(prev => ({
                        ...prev,
                        date_debut: dateVal,
                        libelle: updatedLibelle,
                        date_fin: updatedFin
                      }));
                    }}
                    type="date" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date fin</label>
                  <input 
                    required
                    value={newYearForm.date_fin}
                    onChange={e => setNewYearForm({...newYearForm, date_fin: e.target.value})}
                    type="date" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowYearModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Activity Planning Modal */}
      {showPlanningModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Planification des activités - {showPlanningModal.libelle}</h2>
                <p className="text-xs text-slate-500">Organisez les réunions, évaluations et congés par trimestre.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEvalPlanningModal(true)}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Calendar size={15} />
                  <span>Planifier les évaluations de la Maternelle et du Primaire</span>
                </button>
                <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm mr-2">
                  <button 
                    onClick={() => handlePrint()}
                    className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Imprimer tout"
                  >
                    <Printer size={16} />
                    <span className="hidden sm:inline">Imprimer tout</span>
                  </button>
                  <div className="w-px h-4 bg-slate-200 mx-1"></div>
                  <button 
                    onClick={() => handleExportPDF()}
                    className="p-2 hover:bg-slate-100 text-primary-600 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                    title="Exporter tout en PDF"
                  >
                    <FileText size={16} />
                    <span className="hidden sm:inline">PDF complet</span>
                  </button>
                </div>
                <button onClick={() => setShowPlanningModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Column */}
              <div className="lg:col-span-1 space-y-6">
                <form onSubmit={handleActivitySubmit} className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <Plus size={16} className="text-primary-600" />
                    {editingActivity ? 'Modifier l\'activité' : 'Nouvelle activité'}
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Trimestre</label>
                    <select 
                      value={activityForm.trimestre || 1}
                      onChange={e => setActivityForm({...activityForm, trimestre: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value={1}>1er Trimestre</option>
                      <option value={2}>2ème Trimestre</option>
                      <option value={3}>3ème Trimestre</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Type d'activité</label>
                    <select 
                      value={activityForm.type}
                      onChange={e => setActivityForm({...activityForm, type: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="reunion">Réunion</option>
                      <option value="evaluation">Évaluation / Examen</option>
                      <option value="conge">Congés / Vacances</option>
                      <option value="autre">Autre événement</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Titre</label>
                    <input 
                      required
                      value={activityForm.titre}
                      onChange={e => setActivityForm({...activityForm, titre: e.target.value})}
                      type="text" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Description</label>
                    <textarea 
                      value={activityForm.description}
                      onChange={e => setActivityForm({...activityForm, description: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm h-20 resize-none" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Date début</label>
                      <input 
                        required
                        value={activityForm.date_debut}
                        onChange={e => setActivityForm({...activityForm, date_debut: e.target.value})}
                        type="date" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-600">Heure (optionnel)</label>
                      <input 
                        value={activityForm.heure}
                        onChange={e => setActivityForm({...activityForm, heure: e.target.value})}
                        type="time" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Date fin (optionnel)</label>
                    <input 
                      value={activityForm.date_fin}
                      onChange={e => setActivityForm({...activityForm, date_fin: e.target.value})}
                      type="date" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm" 
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    {editingActivity && (
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingActivity(null);
                          setActivityForm({ type: 'reunion', titre: '', description: '', date_debut: '', date_fin: '', heure: '', trimestre: 1 });
                        }}
                        className="flex-1 px-3 py-2 bg-slate-200 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-300 transition-colors"
                      >
                        Annuler
                      </button>
                    )}
                    <button 
                      type="submit"
                      className="flex-2 px-3 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      {editingActivity ? 'Enregistrer' : 'Ajouter à la planification'}
                    </button>
                  </div>
                </form>
              </div>

              {/* List Column */}
              <div className="lg:col-span-2 space-y-6">
                {[1, 2, 3].map(tri => (
                  <div key={tri} className="space-y-3">
                    <div className="flex items-center justify-between border-l-4 border-primary-500 pl-3 bg-primary-50 py-1 pr-2">
                      <h4 className="text-sm font-bold text-slate-800">
                        {tri}{tri === 1 ? 'er' : 'ème'} Trimestre
                      </h4>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handlePrint(tri)}
                          className="p-1.5 hover:bg-white text-slate-500 hover:text-slate-900 rounded-lg transition-colors"
                          title="Imprimer ce trimestre"
                        >
                          <Printer size={14} />
                        </button>
                        <button 
                          onClick={() => handleExportPDF(tri)}
                          className="p-1.5 hover:bg-white text-primary-500 hover:text-primary-700 rounded-lg transition-colors"
                          title="PDF ce trimestre"
                        >
                          <FileText size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {activities.filter(a => a.trimestre === tri).length === 0 ? (
                        <p className="text-xs text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-xl">Aucune activité planifiée pour ce trimestre.</p>
                      ) : (
                        activities.filter(a => a.trimestre === tri).map(activity => (
                          <div key={activity.id} className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex items-start justify-between group">
                            <div className="flex gap-3">
                              <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                                activity.type === 'reunion' ? 'bg-blue-500' :
                                activity.type === 'evaluation' ? 'bg-amber-500' :
                                activity.type === 'conge' ? 'bg-primary-500' : 'bg-slate-400'
                              }`}></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{activity.titre}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{activity.description}</p>
                                <div className="flex items-center gap-3 mt-2">
                                  <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                    <Calendar size={12} />
                                    {new Date(activity.date_debut).toLocaleDateString('fr-FR')}
                                    {activity.date_fin && ` au ${new Date(activity.date_fin).toLocaleDateString('fr-FR')}`}
                                  </span>
                                  {activity.heure && (
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                      <Clock size={12} />
                                      {activity.heure}
                                    </span>
                                  )}
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                                    activity.type === 'reunion' ? 'bg-blue-100 text-blue-700' :
                                    activity.type === 'evaluation' ? 'bg-amber-100 text-amber-700' :
                                    activity.type === 'conge' ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {activity.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={() => handleNotifyActivity(activity)}
                                className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                title="Envoyer comme alerte"
                              >
                                <Send size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingActivity(activity);
                                  setActivityForm({
                                    type: activity.type,
                                    titre: activity.titre,
                                    description: activity.description || '',
                                    date_debut: activity.date_debut,
                                    date_fin: activity.date_fin || '',
                                    heure: activity.heure || '',
                                    trimestre: activity.trimestre
                                  });
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <RotateCcw size={14} className="rotate-45" />
                              </button>
                              <button 
                                onClick={() => handleDeleteActivity(activity.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Planning Modal (Maternelle & Primaire) */}
      {showEvalPlanningModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-amber-100">
            <div className="p-6 border-b flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Planifier les Évaluations</h3>
                  <p className="text-xs text-amber-700 font-medium">Maternelle & Primaire</p>
                </div>
              </div>
              <button onClick={() => setShowEvalPlanningModal(false)} className="p-2 hover:bg-amber-100 rounded-full transition-colors text-amber-800">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePlanifyEvalMaternellePrimaire} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Trimestre</label>
                <select 
                  value={evalPlanForm.trimestre}
                  onChange={e => {
                    const tri = parseInt(e.target.value) || 1;
                    setEvalPlanForm({
                      ...evalPlanForm, 
                      trimestre: tri,
                      titre: `Évaluations du ${tri === 1 ? '1er' : tri === 2 ? '2ème' : '3ème'} Trimestre - Maternelle & Primaire`
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                >
                  <option value={1}>1er Trimestre</option>
                  <option value={2}>2ème Trimestre</option>
                  <option value={3}>3ème Trimestre</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Titre de la session d'évaluation</label>
                <input 
                  required
                  value={evalPlanForm.titre}
                  onChange={e => setEvalPlanForm({...evalPlanForm, titre: e.target.value})}
                  type="text" 
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description / Instructions</label>
                <textarea 
                  value={evalPlanForm.description}
                  onChange={e => setEvalPlanForm({...evalPlanForm, description: e.target.value})}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm h-20 resize-none font-medium" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date début</label>
                  <input 
                    required
                    value={evalPlanForm.date_debut}
                    onChange={e => setEvalPlanForm({...evalPlanForm, date_debut: e.target.value})}
                    type="date" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Date fin</label>
                  <input 
                    required
                    value={evalPlanForm.date_fin}
                    onChange={e => setEvalPlanForm({...evalPlanForm, date_fin: e.target.value})}
                    type="date" 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium" 
                  />
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2">
                <Info size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <span>Cette planification apparaîtra dans le calendrier des activités. Les enseignants pourront enregistrer la <strong>Note Obtenue</strong> et la <strong>Note de Perfectionnement</strong> pour chaque élève.</span>
              </div>

              <div className="flex gap-3 pt-3">
                <button 
                  type="button"
                  onClick={() => setShowEvalPlanningModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors text-xs"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors text-xs shadow-lg shadow-amber-100"
                >
                  Enregistrer la planification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

        </div>
      )}

      {activeTab === 'roles' && (currentUser?.role === 'admin' || currentUser?.role === 'fonde') && (
        <div className="space-y-8">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-100 rounded-2xl text-primary-600">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Permissions par Rôle (Général)</h2>
                  <p className="text-xs text-slate-500">
                    Définissez les droits d'accès par défaut pour chaque rôle. Le Fondé peut également attribuer ou retirer des autorisations sur mesure pour chaque individu.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncAllPermissionsToUsers}
                  disabled={syncingPermissions}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-2 disabled:opacity-50"
                  title="Appliquer immédiatement toutes les autorisations accordées à l'ensemble des comptes dédiés"
                >
                  <RefreshCw size={14} className={syncingPermissions ? "animate-spin" : ""} />
                  <span>{syncingPermissions ? "Mise à jour en cours..." : "Mettre à jour les autorisations accordées"}</span>
                </button>
                <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                  <Shield size={14} className="text-amber-600" />
                  Espace d'administration du Fondé
                </span>
              </div>
            </div>

            {loadingRoles ? (
              <div className="py-16 text-center text-slate-400 font-medium">Chargement des configurations de rôles...</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {SYSTEM_ROLES.map((roleDef) => {
                  const roleData = rolePermissions.find(r => r.role === roleDef.id) || { role: roleDef.id, permissions: [] };
                  const activePermsCount = Array.isArray(roleData.permissions) ? roleData.permissions.length : 0;

                  return (
                    <div key={roleDef.id} className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-xs flex flex-col justify-between">
                      <div>
                        {/* Role Header */}
                        <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">{roleDef.label}</h3>
                              <span className="px-2 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-bold rounded-md uppercase border border-primary-100">
                                {roleDef.id}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{roleDef.description}</p>
                          </div>
                          <span className="px-2.5 py-1 bg-white text-[11px] font-bold text-slate-700 rounded-lg border border-slate-200 shrink-0">
                            {activePermsCount} page{activePermsCount > 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Batch Action Toolbar */}
                        <div className="flex items-center gap-1.5 py-2 overflow-x-auto">
                          <button
                            type="button"
                            onClick={() => handleResetRoleToDefault(roleDef.id)}
                            className="px-2 py-1 text-[10px] font-bold bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-colors shrink-0"
                            title="Rétablir les permissions recommandées par défaut"
                          >
                            🔄 Rétablir par défaut
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRoleAllPagesMode(roleDef.id, 'read_write')}
                            className="px-2 py-1 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors shrink-0"
                          >
                            Tout ✏️ L/É
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRoleAllPagesMode(roleDef.id, 'read_only')}
                            className="px-2 py-1 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition-colors shrink-0"
                          >
                            Tout 👁️ Lecture
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetRoleAllPagesMode(roleDef.id, 'none')}
                            className="px-2 py-1 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-colors shrink-0"
                          >
                            Tout 🚫 Masquer
                          </button>
                        </div>

                        {/* Page Permissions List */}
                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {SYSTEM_PAGES.map(page => {
                            const currentMode = getPermissionMode(roleData.permissions, page.path);
                            const isEnabled = currentMode !== 'none';

                            return (
                              <div 
                                key={page.path} 
                                className={`p-2.5 rounded-xl border transition-all ${
                                  isEnabled 
                                    ? 'bg-white border-slate-200 shadow-xs' 
                                    : 'bg-slate-100/60 border-slate-200/60 opacity-60'
                                }`}
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input 
                                      type="checkbox" 
                                      checked={isEnabled}
                                      onChange={() => {
                                        handleUpdateRolePageAccess(roleDef.id, page.path, isEnabled ? 'none' : 'read_write');
                                      }}
                                      className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    <div>
                                      <span className="text-xs font-bold text-slate-800">{page.label}</span>
                                      <span className="ml-1 text-[10px] font-mono text-slate-400">({page.path})</span>
                                    </div>
                                  </label>

                                  {isEnabled ? (
                                    <div className="flex items-center gap-1 self-end sm:self-auto">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateRolePageAccess(roleDef.id, page.path, 'read_write')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                          currentMode === 'read_write'
                                            ? 'bg-emerald-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                      >
                                        ✏️ Lecture & Écriture
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateRolePageAccess(roleDef.id, page.path, 'read_only')}
                                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                          currentMode === 'read_only'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                      >
                                        👁️ Lecture seule
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-end sm:self-auto">
                                      🚫 Masquée
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Section Profil du Fondateur (Mon Profil Administrateur) */}
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200/80 overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-primary-500/5 to-transparent border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Mon Profil (Fondateur / Direction Générale)
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">
                      Fondateur Admi
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Renseignez vos informations officielles de fondateur. Votre planche s'affichera automatiquement et distinctement dans "Personnel Admi".
                  </p>
                </div>
              </div>
              {loadingFonde && (
                <RotateCcw className="w-4 h-4 animate-spin text-amber-600" />
              )}
            </div>

            <form onSubmit={handleSaveFondeProfile} className="p-6 space-y-6">
              {/* Photo & Basic Info */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-amber-50 border-2 border-dashed border-amber-300 flex items-center justify-center relative group">
                    {fondeForm.photo ? (
                      <img src={fondeForm.photo} alt="Photo Fondateur" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-amber-600">
                        <Crown className="w-8 h-8 opacity-40" />
                        <span className="text-[10px] font-semibold mt-1">Photo</span>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fondePhotoInputRef}
                    accept="image/*"
                    onChange={handleFondePhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fondePhotoInputRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Camera size={14} />
                    {fondeForm.photo ? 'Changer' : 'Ajouter'}
                  </button>
                  {fondeForm.photo && (
                    <button
                      type="button"
                      onClick={() => setFondeForm(prev => ({ ...prev, photo: '' }))}
                      className="text-[11px] text-rose-600 hover:underline"
                    >
                      Supprimer la photo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 w-full">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Nom *</label>
                    <input
                      type="text"
                      value={fondeForm.nom}
                      onChange={(e) => setFondeForm({ ...fondeForm, nom: e.target.value })}
                      placeholder="Nom de famille"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Prénom(s) *</label>
                    <input
                      type="text"
                      value={fondeForm.prenom}
                      onChange={(e) => setFondeForm({ ...fondeForm, prenom: e.target.value })}
                      placeholder="Prénom(s)"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Matricule</label>
                    <input
                      type="text"
                      value={fondeForm.matricule}
                      onChange={(e) => setFondeForm({ ...fondeForm, matricule: e.target.value })}
                      placeholder="Ex: FOND-001"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-mono font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Sexe</label>
                    <select
                      value={fondeForm.sexe}
                      onChange={(e) => setFondeForm({ ...fondeForm, sexe: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                    >
                      <option value="M">Masculin (M)</option>
                      <option value="F">Féminin (F)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Date de naissance</label>
                    <input
                      type="date"
                      value={fondeForm.date_naissance}
                      onChange={(e) => setFondeForm({ ...fondeForm, date_naissance: e.target.value })}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Lieu de naissance</label>
                    <input
                      type="text"
                      value={fondeForm.lieu_naissance}
                      onChange={(e) => setFondeForm({ ...fondeForm, lieu_naissance: e.target.value })}
                      placeholder="Ville / Pays"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Coordonnées & Qualifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={fondeForm.telephone}
                      onChange={(e) => setFondeForm({ ...fondeForm, telephone: e.target.value })}
                      placeholder="+228 90 00 00 00"
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Email professionnel</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={fondeForm.email}
                      onChange={(e) => setFondeForm({ ...fondeForm, email: e.target.value })}
                      placeholder="fondateur@etablissement.com"
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Adresse de résidence</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fondeForm.adresse}
                      onChange={(e) => setFondeForm({ ...fondeForm, adresse: e.target.value })}
                      placeholder="Quartier, Ville"
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Niveau d'études</label>
                  <select
                    value={fondeForm.niveau_etudes}
                    onChange={(e) => setFondeForm({ ...fondeForm, niveau_etudes: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="Doctorat / Master">Doctorat / Master</option>
                    <option value="Doctorat">Doctorat</option>
                    <option value="Master / DEA">Master / DEA</option>
                    <option value="Licence / BAC+3">Licence / BAC+3</option>
                    <option value="DUT / BTS">DUT / BTS</option>
                    <option value="BAC">BAC</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Diplôme le plus élevé</label>
                  <div className="relative">
                    <Award className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={fondeForm.diplome}
                      onChange={(e) => setFondeForm({ ...fondeForm, diplome: e.target.value })}
                      placeholder="Ex: Doctorat en Sciences de l'Éducation"
                      className="w-full pl-9 pr-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Statut</label>
                  <select
                    value={fondeForm.statut}
                    onChange={(e) => setFondeForm({ ...fondeForm, statut: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingFonde}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
                >
                  {savingFonde ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Crown className="w-4 h-4" />
                  )}
                  Enregistrer mon profil de Fondé
                </button>
              </div>
            </form>
          </div>

          {/* Profile Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <User className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Informations personnelles</h2>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={profileForm.nom}
                      onChange={(e) => setProfileForm({ ...profileForm, nom: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Récupération hors-ligne</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Question de sécurité</label>
                    <select
                      value={profileForm.question}
                      onChange={(e) => setProfileForm({ ...profileForm, question: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une question</option>
                      <option value="Quel est le nom de votre premier animal de compagnie ?">Quel est le nom de votre premier animal de compagnie ?</option>
                      <option value="Quelle est votre ville de naissance ?">Quelle est votre ville de naissance ?</option>
                      <option value="Quel est le nom de votre école primaire ?">Quel est le nom de votre école primaire ?</option>
                      <option value="Quel est le nom de votre plat préféré ?">Quel est le nom de votre plat préféré ?</option>
                      <option value="Quelle est la marque de votre première voiture ?">Quelle est la marque de votre première voiture ?</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Réponse secrète</label>
                    <input
                      type="text"
                      value={profileForm.answer}
                      onChange={(e) => setProfileForm({ ...profileForm, answer: e.target.value })}
                      placeholder="Votre réponse (insensible à la casse)"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 italic">
                  Utilisez cette question pour réinitialiser votre mot de passe si vous oubliez vos accès en mode hors-ligne.
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>

          {/* Security Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Sécurité et mot de passe</h2>
            </div>
            <div className="p-6">
              {step === 'request' ? (
                <div className="space-y-4">
                  <p className="text-gray-600 text-sm">
                    Pour modifier votre mot de passe, nous devons d'abord vérifier votre identité en envoyant un code de confirmation à votre adresse email.
                  </p>
                  <button
                    onClick={handleRequestCode}
                    disabled={sendingCode}
                    className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                  >
                    {sendingCode ? (
                      <RotateCcw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    Envoyer le code de confirmation
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm mb-4">
                    Un code de confirmation a été envoyé à <strong>{currentUser?.email}</strong>.
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Code de confirmation</label>
                    <input
                      type="text"
                      value={passwordForm.code}
                      onChange={(e) => setPasswordForm({ ...passwordForm, code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Entrez le code à 6 chiffres"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => setStep('request')}
                      className="text-gray-500 hover:text-gray-700 font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Changer le mot de passe
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Permissions Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold">Mes permissions</h2>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2">
                {Array.isArray(currentUser?.permissions) && currentUser.permissions.length > 0 ? (
                  currentUser.permissions.map((perm: any, idx: number) => {
                    const path = typeof perm === 'string' ? perm : perm.path;
                    const canWrite = typeof perm === 'string' ? true : perm.can_write;
                    return (
                      <span key={idx} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-2">
                        {path === '/' ? 'Accès complet' : path}
                        {canWrite && <span className="text-[10px] bg-indigo-200 px-1 rounded">Lecture/Écriture</span>}
                      </span>
                    );
                  })
                ) : (
                  <p className="text-gray-500 italic">Aucune permission spécifique accordée.</p>
                )}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                Votre rôle actuel est : <span className="font-semibold text-indigo-600 capitalize">{currentUser?.role}</span>. 
                Contactez l'administrateur pour modifier vos permissions.
              </p>
            </div>
          </div>

          {/* Google Connection Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center gap-3">
              <Chrome className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold">Connexion Google</h2>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {currentUser?.google_id ? 'Votre compte est lié à Google' : 'Liez votre compte à Google'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentUser?.google_id 
                    ? 'Vous pouvez vous connecter rapidement avec votre compte Google.' 
                    : 'Connectez votre compte Google pour une connexion simplifiée.'}
                </p>
              </div>
              {!currentUser?.google_id && (
                <button 
                  onClick={handleGoogleLogin}
                  className="px-6 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Chrome size={16} className="text-red-500" />
                  Lier mon compte Google
                </button>
              )}
              {currentUser?.google_id && (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-xs font-bold">
                  <CheckCircle size={14} />
                  Compte lié
                </div>
              )}
            </div>
          </div>

          {/* Logout Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
            <div className="p-6 border-b border-red-100 flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-red-600">Déconnexion</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-4">
                Souhaitez-vous vous déconnecter de votre session actuelle ?
              </p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'language' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="relative z-10 flex items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 text-indigo-300">
                <Globe className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Configuration de la Langue / Language Configuration</h2>
                <p className="text-indigo-200 mt-1 max-w-xl text-sm">
                  Définissez la langue d'affichage du système. Dès que l'anglais est sélectionné, l'ensemble des modules, menus, tableaux et formulaires fonctionnent immédiatement en anglais sans exception.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Sélectionnez votre langue / Select your language</h3>
              <p className="text-sm text-slate-500 mt-1">
                Le choix est sauvegardé localement sur votre navigateur et synchronisé avec les paramètres de votre établissement.
              </p>
            </div>

            <LanguageSelector variant="cards" />

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs uppercase font-extrabold text-slate-400 tracking-wider mb-4">
                Périmètre de traduction en mode anglais / English Translation Coverage
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block">Navigation & Menus</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Dashboard, Students, Teachers, Classes, Timetable, Subjects</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block">Évaluations & Notes</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Report Cards, Grades, Exam Papers Bank, Student Promotion</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block">Finances & Trésorerie</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Tuition Payments, Receipts, Salaries, Financial Balances</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block">Administration & Salles</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Buildings & Rooms, ID Cards & Badges, Material Resources</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block">Portail Public</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Landing Page, Features Showcase, Parent Portal, FAQs, Contact</p>
                </div>
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-xs font-bold text-slate-800 block">Actions & Formulaires</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Save, Edit, Delete, Validate, Print, Download, Search & Filters</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
        <PaymentSettingsTab />
      )}

      {activeTab === 'sms' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
        <SmsSettingsTab />
      )}

      {activeTab === 'ai' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
        <AISettingsTab />
      )}

      {activeTab === 'backups' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
        <BackupSettingsTab />
      )}

      {activeTab === 'data_management' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative">
            <div className="relative z-10 flex items-center gap-6">
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl border border-white/30">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Gestion & Migration des Données</h2>
                <p className="text-amber-50 mt-1 max-w-lg">Transférez vos données d'une année scolaire à une autre en toute sécurité.</p>
              </div>
            </div>
            <div className="relative z-10">
              <button 
                onClick={() => {
                  setTransitionConfig(prev => ({ ...prev, mode: 'manual' }));
                  setShowTransitionModal(true);
                }}
                className="px-6 py-3 bg-white text-amber-700 font-bold rounded-2xl shadow-lg hover:bg-amber-50 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                Nouvelle Migration
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Transition Automatique</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Préparez la nouvelle année scolaire en important automatiquement les classes et les emplois du temps de l'année en cours.
              </p>
              <button 
                onClick={() => {
                  setTransitionConfig(prev => ({ ...prev, mode: 'automatic' }));
                  setShowTransitionModal(true);
                }}
                className="mt-4 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Lancer la transition
              </button>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                <Copy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Copie Manuelle</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Copiez sélectivement des données (élèves, notes, classes) entre deux années existantes au choix.
              </p>
              <button 
                onClick={() => {
                  setTransitionConfig(prev => ({ ...prev, mode: 'manual' }));
                  setShowTransitionModal(true);
                }}
                className="mt-4 px-6 py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors"
              >
                Copie personnalisée
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscription' && (currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'fonde' || currentUser?.role === 'fondateur' || currentUser?.role === 'fondé') && (
        <SubscriptionSettingsTab />
      )}

      {/* Transition/Migration Modal */}
      <AnimatePresence>
        {showTransitionModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {transitionConfig.mode === 'automatic' ? 'Transition de Fin d\'Année' : 'Migration de Données'}
                    </h3>
                    <p className="text-xs text-slate-500">Configurez les données à transférer</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTransitionModal(false)}
                  className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {transitionConfig.mode === 'manual' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Année Source</label>
                      <select 
                        value={transitionConfig.sourceYearId}
                        onChange={e => setTransitionConfig({...transitionConfig, sourceYearId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      >
                        <option value="">Sélectionner source...</option>
                        {annees.map(y => (
                          <option key={y.id} value={y.id}>{y.libelle}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Année Cible</label>
                      <select 
                        value={transitionConfig.targetYearId}
                        onChange={e => setTransitionConfig({...transitionConfig, targetYearId: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                      >
                        <option value="">Sélectionner cible...</option>
                        {annees.map(y => (
                          <option key={y.id} value={y.id} disabled={y.id.toString() === transitionConfig.sourceYearId}>
                            {y.libelle}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      Transition Automatique Complète
                    </div>
                    <p className="text-xs text-emerald-700 leading-relaxed">
                      Toutes les données et informations de l'année scolaire en cours (classes, matières, emplois du temps, configurations et élèves réinscrits/promus) seront <strong>automatiquement transmises</strong> dans la nouvelle année. <strong>Les notes sont exclues</strong> pour garantir un carnet d'évaluations entièrement vierge.
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Données prises en compte dans la transition</p>
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Notes exclues par défaut
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'classes', label: 'Classes, Niveaux & Frais', icon: <Archive size={14} />, desc: 'Structure des classes et grilles tarifaires', defaultLocked: true },
                      { key: 'eleves', label: 'Élèves & Réinscriptions', icon: <Users size={14} />, desc: 'Transfert avec statut Passant ou Redoublant(e)', defaultLocked: true },
                      { key: 'matieres', label: 'Matières & Coefficients', icon: <BookOpen size={14} />, desc: 'Affectations matières, coefs et enseignants', defaultLocked: true },
                      { key: 'timetable', label: 'Emplois du temps', icon: <Calendar size={14} />, desc: 'Créneaux horaires et plannings des salles', defaultLocked: false },
                      { key: 'evaluation_configs', label: 'Configs des Évaluations', icon: <Layers size={14} />, desc: 'Périodes, séquences et barèmes', defaultLocked: false },
                      { key: 'epreuves', label: 'Banque d\'épreuves', icon: <FileText size={14} />, desc: 'Archives des épreuves et compositions', defaultLocked: false },
                      { key: 'activities', label: 'Activités scolaires', icon: <RotateCcw size={14} />, desc: 'Projets et activités reconduites', defaultLocked: false },
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setTransitionConfig(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] }))}
                        className={`flex items-start gap-3 p-4 rounded-2xl border transition-all text-left group ${
                          transitionConfig[item.key as keyof typeof transitionConfig] 
                            ? 'bg-primary-50 border-primary-200 ring-2 ring-primary-500/10' 
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className={`mt-0.5 p-2 rounded-lg transition-colors ${
                          transitionConfig[item.key as keyof typeof transitionConfig] ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'
                        }`}>
                          {item.icon}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${
                            transitionConfig[item.key as keyof typeof transitionConfig] ? 'text-primary-900' : 'text-slate-700'
                          }`}>{item.label}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          transitionConfig[item.key as keyof typeof transitionConfig] ? 'bg-primary-500 border-primary-500' : 'border-slate-200 group-hover:border-slate-300'
                        }`}>
                          {transitionConfig[item.key as keyof typeof transitionConfig] && <Check size={12} className="text-white" />}
                        </div>
                      </button>
                    ))}

                    {/* Carte spéciale pour les notes : strictement exclues */}
                    <div className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-slate-50 opacity-80 text-left">
                      <div className="mt-0.5 p-2 rounded-lg bg-amber-100 text-amber-700">
                        <FileText size={14} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-700">Notes & Évaluations</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">Exclu</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Non transmises : la nouvelle année débute avec un carnet vierge</p>
                      </div>
                    </div>
                  </div>
                </div>

                {transitionConfig.mode === 'automatic' && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Libellé de la nouvelle année</label>
                    <input 
                      type="text"
                      placeholder="ex: 2026-2027"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button 
                  onClick={() => setShowTransitionModal(false)}
                  className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-sm"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleTransition}
                  disabled={isTransitioning || (transitionConfig.mode === 'manual' && (!transitionConfig.sourceYearId || !transitionConfig.targetYearId))}
                  className="px-8 py-2.5 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-200 flex items-center gap-2"
                >
                  {isTransitioning ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Lancer l'opération
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {localFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              localFeedback.type === 'success' 
                ? 'bg-primary-900 border-primary-700 text-primary-50' 
                : 'bg-red-900 border-red-700 text-red-50'
            }`}
          >
            {localFeedback.type === 'success' ? <CheckCircle size={20} className="text-primary-400" /> : <X size={20} className="text-red-400" />}
            <span className="font-bold text-sm">{localFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Created Modal */}
      {showCreatedAccountModal && createdAccountCredentials && (
        <AccountCreatedModal
          isOpen={showCreatedAccountModal}
          onClose={() => {
            setShowCreatedAccountModal(false);
            setCreatedAccountCredentials(null);
          }}
          credentials={createdAccountCredentials}
        />
      )}
    </div>
  );
}

function YearItem({ annee, onActivate, onDeactivate, onArchive, onUnarchive, onDelete, onCloturer, onDecloturer, onPlanify, onUpdateDeadlines, onUpdateYear, onRefreshStats }: any) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [deadlines, setDeadlines] = React.useState({
    date_limite_scolarite: annee.date_limite_scolarite || '',
    date_limite_inscription: annee.date_limite_inscription || ''
  });
  const [period, setPeriod] = React.useState({
    libelle: annee.libelle || '',
    date_debut: annee.date_debut || '',
    date_fin: annee.date_fin || ''
  });
  const [isSavingPeriod, setIsSavingPeriod] = React.useState(false);

  React.useEffect(() => {
    setPeriod({
      libelle: annee.libelle || '',
      date_debut: annee.date_debut || '',
      date_fin: annee.date_fin || ''
    });
  }, [annee]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="flex flex-col border-b border-slate-50 last:border-0 overflow-hidden">
      <div className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group ${isExpanded ? 'bg-slate-50' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">{annee.libelle}</span>
              {annee.est_active_effective && <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-[10px] font-bold rounded-full uppercase">Active</span>}
              {annee.cloturee === 1 && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full uppercase">Clôturée</span>}
              {annee.archivee === 1 && annee.cloturee === 0 && <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase">Archivée</span>}
            </div>
            <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
              <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                <Calendar size={11} className="text-slate-400" />
                {formatDate(annee.date_debut)} - {formatDate(annee.date_fin)}
              </p>
              <span className="text-slate-300">•</span>
              <p className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <Users size={11} />
                {annee.eleves_count ?? 0} élèves ({annee.garcons_count ?? 0}G / {annee.filles_count ?? 0}F)
              </p>
              <p className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <School size={11} />
                {annee.classes_count ?? 0} classes
              </p>
              <p className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <BookOpen size={11} />
                {annee.matieres_count ?? 0} matières
              </p>
              {Number(annee.paiements_total || 0) > 0 && (
                <p className="text-[10px] text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                  💰 {Number(annee.paiements_total).toLocaleString('fr-FR')} F
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Si clôturée : boutons Annuler la clôture, Supprimer et Activer */}
          {annee.cloturee === 1 && (
            <>
              <button 
                onClick={onDecloturer}
                className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Annuler la clôture (Rouvrir cette année scolaire)"
              >
                <RotateCcw size={14} className="text-emerald-600" />
                <span>Annuler la clôture</span>
              </button>
              <button 
                onClick={onDelete}
                className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Supprimer cette année scolaire clôturée"
              >
                <Trash2 size={14} className="text-red-600" />
                <span>Supprimer</span>
              </button>
              <button 
                onClick={onActivate}
                className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                title="Activer cette année scolaire (désactive automatiquement l'ancienne et annule la clôture)"
              >
                <CheckCircle2 size={14} className="text-primary-600" />
                <span>Activer</span>
              </button>
            </>
          )}

          {/* Si non active et non clôturée : bouton Activer immédiat */}
          {annee.cloturee === 0 && !annee.est_active_effective && (
            <button 
              onClick={onActivate}
              className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
              title="Activer cette année scolaire (désactive automatiquement l'ancienne)"
            >
              <CheckCircle2 size={14} className="text-primary-600" />
              <span>Activer</span>
            </button>
          )}

          {/* Si active : indicateur Active */}
          {annee.est_active_effective && (
            <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs">
              <CheckCircle2 size={13} />
              <span>Active</span>
            </span>
          )}

          {annee.cloturee === 0 && annee.archivee === 0 && !annee.est_active_effective && (
            <button 
              onClick={onArchive}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Archiver"
            >
              <Archive size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.archivee === 1 && (
            <button 
              onClick={onUnarchive}
              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Réactiver (Désarchiver)"
            >
              <RotateCcw size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.est_active_effective && (
            <button 
              onClick={onDeactivate}
              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Désactiver l'année"
            >
              <X size={18} />
            </button>
          )}
          {annee.cloturee === 0 && annee.est_active_effective && (
            <button 
              onClick={onCloturer}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
              title="Clôturer l'année scolaire"
            >
              <CheckCircle size={18} />
              <span className="text-[10px] font-bold hidden xl:inline text-red-600">Clôturer</span>
            </button>
          )}
          {!annee.est_active_effective && annee.cloturee === 0 && (
            <button 
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Supprimer"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all ${isExpanded ? 'rotate-90 text-primary-600 bg-primary-50' : ''}`}
            title="Détails de l'année"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50/50 border-t border-slate-100"
          >
            <div className="p-4 space-y-4">
              {/* Bannière d'actions si année clôturée */}
              {annee.cloturee === 1 && (
                <div className="p-3.5 bg-red-50/80 border border-red-200 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                    <div>
                      <p className="text-xs font-black text-red-800">
                        Cette année scolaire est actuellement CLÔTURÉE
                      </p>
                      <p className="text-[10px] text-red-600 font-medium">
                        Vous pouvez annuler sa clôture pour la rouvrir, ou la supprimer définitivement.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onDecloturer}
                      className="px-3 py-1.5 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="Annuler la clôture et rouvrir cette année"
                    >
                      <RotateCcw size={14} className="text-emerald-600" />
                      <span>Annuler la clôture (Rouvrir)</span>
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      title="Supprimer définitivement cette année scolaire clôturée"
                    >
                      <Trash2 size={14} />
                      <span>Supprimer l'année</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-600" />
                    Statistiques de l'Année Scolaire {annee.libelle}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        if (isRecalculating) return;
                        setIsRecalculating(true);
                        try {
                          if (onRefreshStats) {
                            await onRefreshStats(annee.id);
                          }
                        } finally {
                          setIsRecalculating(false);
                        }
                      }}
                      disabled={isRecalculating}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg flex items-center gap-1.5 transition-colors shadow-2xs"
                      title="Recalculer et synchroniser les statistiques de cette année scolaire"
                    >
                      <RefreshCw size={12} className={isRecalculating ? "animate-spin text-indigo-600" : ""} />
                      <span>{isRecalculating ? "Calcul en cours..." : "Mettre à jour les statistiques"}</span>
                    </button>
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-1 rounded-md hidden sm:inline">
                      Temps réel
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Élèves */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-extrabold uppercase">Effectif Élèves</span>
                      <Users size={14} className="text-indigo-600" />
                    </div>
                    <p className="text-xl font-black text-slate-900">
                      {annee.eleves_count ?? 0}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold mt-1">
                      <span className="text-blue-600 font-bold">{annee.garcons_count ?? 0} Garçons</span>
                      <span>•</span>
                      <span className="text-pink-600 font-bold">{annee.filles_count ?? 0} Filles</span>
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium mt-0.5 flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">{annee.eleves_actifs ?? annee.eleves_count ?? 0} actifs</span>
                      {Number(annee.abandons_count || 0) > 0 && (
                        <span className="text-rose-500 font-bold">• {annee.abandons_count} abandon(s)</span>
                      )}
                    </div>
                  </div>

                  {/* Classes & Matières */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-extrabold uppercase">Structure Pédagogique</span>
                      <School size={14} className="text-indigo-600" />
                    </div>
                    <p className="text-xl font-black text-slate-900">
                      {annee.classes_count ?? 0} <span className="text-xs font-bold text-slate-400">classes</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      {annee.classes_secondaire !== undefined && Number(annee.classes_secondaire) > 0 && (
                        <span className="text-indigo-600 font-bold">{annee.classes_secondaire} Sec. </span>
                      )}
                      {annee.classes_primaire !== undefined && Number(annee.classes_primaire) > 0 && (
                        <span className="text-purple-600 font-bold">• {annee.classes_primaire} Prim. </span>
                      )}
                    </p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                      <strong className="text-slate-600">{annee.matieres_count ?? 0}</strong> matières associées
                    </p>
                  </div>

                  {/* Enseignants & Notes / Performance */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-extrabold uppercase">Pédagogie & Évaluations</span>
                      <GraduationCap size={14} className="text-indigo-600" />
                    </div>
                    <p className="text-xl font-black text-slate-900">
                      {annee.enseignants_count ?? 0} <span className="text-xs font-bold text-slate-400">profs</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      <strong className="text-slate-700">{annee.notes_count ?? 0}</strong> notes saisies
                    </p>
                    {annee.moyenne_generale !== null && annee.moyenne_generale !== undefined ? (
                      <p className="text-[9px] font-bold text-indigo-700 mt-0.5">
                        Moy. {annee.moyenne_generale}/20 {annee.taux_reussite !== null ? `(${annee.taux_reussite}% réussite)` : ''}
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-400 mt-0.5">Évaluations continues</p>
                    )}
                  </div>

                  {/* Recouvrement financier */}
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-extrabold uppercase">Recouvrement</span>
                      <CreditCard size={14} className="text-emerald-600" />
                    </div>
                    <p className="text-xl font-black text-emerald-600">
                      {Number(annee.paiements_total || 0).toLocaleString('fr-FR')} <span className="text-xs font-bold text-emerald-700">F</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      {annee.paiements_count ?? 0} paiements enregistrés
                    </p>
                    <p className="text-[9px] text-emerald-700 font-bold mt-0.5">
                      Recettes validées
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500">Période scolaire officielle :</span>
                  <span className="text-xs font-black text-slate-800">
                    Du {formatDate(annee.date_debut)} au {formatDate(annee.date_fin)}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Édition de la Période & Libellé</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Libellé Année (ex: 2025-2026)</label>
                    <input 
                      type="text" 
                      value={period.libelle}
                      onChange={e => {
                        const val = e.target.value;
                        const autoVal = formatAcademicYearLibelle(val);
                        if (val.match(/^(\d{4})[-/](\d{4})$/) && autoVal !== val) {
                          setPeriod(prev => ({ ...prev, libelle: autoVal }));
                        } else {
                          setPeriod(prev => ({ ...prev, libelle: val }));
                        }
                      }}
                      onBlur={e => {
                        const formatted = formatAcademicYearLibelle(e.target.value);
                        if (formatted && formatted !== e.target.value) {
                          setPeriod(prev => ({ ...prev, libelle: formatted }));
                        }
                      }}
                      placeholder="ex: 2025-2026"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Date de Début</label>
                    <input 
                      type="date" 
                      value={period.date_debut}
                      onChange={e => {
                        const dateVal = e.target.value;
                        const startYear = new Date(dateVal).getFullYear();
                        let updatedLibelle = period.libelle;
                        let updatedFin = period.date_fin;
                        if (!isNaN(startYear)) {
                          updatedLibelle = `${startYear}-${startYear + 1}`;
                          updatedFin = `${startYear + 1}-07-31`;
                        }
                        setPeriod(prev => ({
                          ...prev,
                          date_debut: dateVal,
                          libelle: updatedLibelle,
                          date_fin: updatedFin
                        }));
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Date de Fin</label>
                    <input 
                      type="date" 
                      value={period.date_fin}
                      onChange={e => setPeriod({...period, date_fin: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    if (onUpdateYear) {
                      setIsSavingPeriod(true);
                      const formattedLibelle = formatAcademicYearLibelle(period.libelle);
                      let finalFin = period.date_fin;
                      if (period.date_debut && period.date_fin) {
                        const startY = new Date(period.date_debut).getFullYear();
                        const endY = new Date(period.date_fin).getFullYear();
                        if (!isNaN(startY) && !isNaN(endY) && endY <= startY) {
                          finalFin = `${startY + 1}-07-31`;
                        }
                      }
                      await onUpdateYear(annee.id, {
                        ...period,
                        libelle: formattedLibelle,
                        date_fin: finalFin
                      });
                      setIsSavingPeriod(false);
                    }
                  }}
                  disabled={isSavingPeriod}
                  className="w-full py-2 bg-primary-600 text-white text-[10px] font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  <Save size={14} />
                  {isSavingPeriod ? 'Enregistrement...' : "Enregistrer la période de l'année"}
                </button>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Délais de Paiement (Alertes)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Date limite Inscription</label>
                    <input 
                      type="date" 
                      value={deadlines.date_limite_inscription}
                      onChange={e => setDeadlines({...deadlines, date_limite_inscription: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-medium text-slate-500">Date limite Scolarité</label>
                    <input 
                      type="date" 
                      value={deadlines.date_limite_scolarite}
                      onChange={e => setDeadlines({...deadlines, date_limite_scolarite: e.target.value})}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => onUpdateDeadlines(annee.id, deadlines)}
                  className="w-full py-2 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  Enregistrer les délais
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-500 italic">
                  Gérez le calendrier scolaire et planifiez les événements importants de cette année.
                </p>
                <button 
                  onClick={onPlanify}
                  className="px-4 py-2 bg-primary-600 text-white text-xs font-bold rounded-xl hover:bg-primary-700 transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-primary-100"
                >
                  <Calendar size={14} />
                  Planifier les activités
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserItem({ name, email, role, approuve, otp_code, permissions, last_seen, google_id, onApprove, onRevoke, onEdit, onDelete }: any) {
  const handleCopyOtp = () => {
    if (otp_code) {
      navigator.clipboard.writeText(otp_code);
      toast.success("Code OTP copié !");
    }
  };

  const perms = Array.isArray(permissions) ? permissions : [];
  const accessCount = perms.length;

  const isOnline = last_seen && (new Date().getTime() - new Date(last_seen).getTime()) < 5 * 60 * 1000;

  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold relative ${approuve ? 'bg-primary-100 text-primary-600' : 'bg-amber-100 text-amber-600'}`}>
            {name.charAt(0)}
            {google_id && (
              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                <Chrome size={10} className="text-red-500" />
              </div>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} title={isOnline ? 'En ligne' : 'Hors ligne'} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-800">{name}</p>
            {approuve ? (
              <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 text-[9px] font-bold rounded uppercase">Confirmé</span>
            ) : (
              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">Non confirmé</span>
            )}
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[9px] font-bold rounded uppercase">
              {accessCount} page{accessCount > 1 ? 's' : ''} accessible{accessCount > 1 ? 's' : ''}
            </span>
            {otp_code && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded uppercase">
                <span>OTP: {otp_code}</span>
                <button onClick={handleCopyOtp} className="hover:text-blue-900">
                  <Copy size={10} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-slate-500 capitalize">{role}</p>
            <span className="text-slate-300">•</span>
            <p className="text-xs text-slate-400">{email}</p>
            {last_seen ? (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-[10px] text-slate-400 italic">
                  {isOnline ? 'En ligne' : `Dernière vue: ${format(new Date(last_seen), 'HH:mm', { locale: fr })}`}
                </p>
              </>
            ) : (
              <>
                <span className="text-slate-300">•</span>
                <p className="text-[10px] text-slate-400 italic">Jamais connecté</p>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!approuve ? (
          <button 
            onClick={onApprove}
            className="px-3 py-1.5 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
          >
            <CheckCircle size={14} />
            Confirmer manuellement
          </button>
        ) : (
          <button 
            onClick={onRevoke}
            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="Révoquer l'accès"
          >
            <X size={18} />
          </button>
        )}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier les accès">
            <ShieldCheck size={18} />
          </button>
          <button onClick={onDelete} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer l'utilisateur">
            <Trash2 size={18} />
          </button>
        </div>
        <ChevronRight size={18} className="text-slate-300" />
      </div>
    </div>
  );
}
