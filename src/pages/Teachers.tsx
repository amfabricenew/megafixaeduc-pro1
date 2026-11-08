import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  Plus, Search, Mail, Phone, MapPin, MoreVertical, GraduationCap, BookOpen, Download, 
  FileText, UserPlus, X, Trash2, Calendar, Folder, Upload, CheckCircle, AlertTriangle, 
  XCircle, File, Eye, Camera, Image as ImageIcon, CheckSquare, Square,
  Key, ShieldCheck, Copy, RefreshCw, Lock, KeyRound, Sparkles, EyeOff, Link2, ExternalLink, Check,
  Repeat
} from 'lucide-react';
import * as XLSX from 'xlsx';
import TeacherTimetableModal, { generateTeacherTimetablePDF } from '../components/TeacherTimetableModal';
import BatchPhotoImportModal, { ImportEntity } from '../components/BatchPhotoImportModal';
import { AccountCreatedModal, AccountCredentials } from '../components/AccountCreatedModal';
import BatchAccountsModal, { TeacherAccountData } from '../components/BatchAccountsModal';
import { ReconduireEnseignantsModal } from '../components/ReconduireEnseignantsModal';
import { generateSingleTeacherAccessPdf, generateBatchTeachersAccessPdf } from '../utils/teacherAccountPdf';
import { isPrimarySubject } from '../utils/subjectCatalog';
import { DuplicateVerificationModal } from '../components/DuplicateVerificationModal';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';

interface TeachersProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Teachers({ cycle = 'all' }: TeachersProps) {
  const confirm = useConfirm();
  const [enseignants, setEnseignants] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [matieres, setMatieres] = React.useState([]);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isCustomMatiere, setIsCustomMatiere] = React.useState(false);
  const [filterMatiere, setFilterMatiere] = React.useState('');
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importWorkbook, setImportWorkbook] = React.useState<any>(null);
  const [importSheetName, setImportSheetName] = React.useState('');
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importAnalysis, setImportAnalysis] = React.useState<any>(null);
  const [isAnalyzingImport, setIsAnalyzingImport] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [singleSuspectDuplicate, setSingleSuspectDuplicate] = React.useState<{ candidate: any; existing: any; reason: string } | null>(null);
  const [showDupDetails, setShowDupDetails] = React.useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = React.useState(false);
  const [editingTeacher, setEditingTeacher] = React.useState<any>(null);
  const [selectedTeacher, setSelectedTeacher] = React.useState<any>(null);
  const [timetableTeacher, setTimetableTeacher] = React.useState<any>(null);
  const [showTimetableModal, setShowTimetableModal] = React.useState(false);
  const [teacherUser, setTeacherUser] = React.useState<any>(null);
  const [generatedCredentials, setGeneratedCredentials] = React.useState<any>(null);
  const [createdAccountCredentials, setCreatedAccountCredentials] = React.useState<AccountCredentials | null>(null);
  const [showCreatedAccountModal, setShowCreatedAccountModal] = React.useState(false);
  const [showBatchAccountsModal, setShowBatchAccountsModal] = React.useState(false);
  const [showReconduireModal, setShowReconduireModal] = React.useState(false);
  const [batchGeneratedAccounts, setBatchGeneratedAccounts] = React.useState<TeacherAccountData[]>([]);
  const [visibleCardPasswords, setVisibleCardPasswords] = React.useState<Record<number, boolean>>({});
  const [isSyncingTeachers, setIsSyncingTeachers] = React.useState(false);
  const [isGeneratingAccount, setIsGeneratingAccount] = React.useState(false);
  const [teacherSelectedRole, setTeacherSelectedRole] = React.useState('enseignant');
  const excelInputRef = React.useRef<HTMLInputElement>(null);

  const toggleCardPasswordVisibility = (teacherId: number) => {
    setVisibleCardPasswords(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  // Selection & Batch Photo states
  const [selectedTeachers, setSelectedTeachers] = React.useState<number[]>([]);
  const [showBatchPhotoModal, setShowBatchPhotoModal] = React.useState(false);
  const [batchPhotoFiles, setBatchPhotoFiles] = React.useState<FileList | null>(null);
  const batchPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const formPhotoInputRef = React.useRef<HTMLInputElement>(null);

  // Dossier state
  const [showDossierModal, setShowDossierModal] = React.useState(false);
  const [dossierTeacher, setDossierTeacher] = React.useState<any>(null);
  const [teacherDossiers, setTeacherDossiers] = React.useState<any[]>([]);
  const [remarqueAdmin, setRemarqueAdmin] = React.useState('');
  const [isUploadingDossier, setIsUploadingDossier] = React.useState(false);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/enseignants' : p.path === '/enseignants'));
  const canWrite = user.role === 'admin' || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [formData, setFormData] = React.useState({
    matricule: '',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    photo: '',
    matiere_id: '',
    matieres_ids: [] as number[],
    matiere_principale_id: '' as string | number,
    matiere_nom_custom: '',
    sexe: 'M',
    date_naissance: '',
    niveau_etudes: 'Licence',
    diplome_pro: '',
    autorisation_enseigner: 'Oui',
    annees_experience: '0'
  });

  const getTeacherTitle = (prof: any) => {
    const isPrimaire = cycle === 'primaire' || prof.cycle === 'primaire' || prof.cycle === 'maternelle';
    const isFemme = prof.sexe === 'F';
    if (isPrimaire) {
      return isFemme ? 'Maîtresse' : 'Maître';
    } else {
      return isFemme ? 'Professeure' : 'Professeur';
    }
  };

  const calculateAge = (dateStr: string) => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  const fetchEnseignants = () => {
    apiFetch('/api/enseignants')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEnseignants(data);
        } else {
          setEnseignants([]);
        }
      })
      .catch(() => setEnseignants([]));
  };

  const fetchUsers = () => {
    apiFetch('/api/users')
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

  const fetchMatieres = () => {
    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMatieres(data);
        } else {
          setMatieres([]);
        }
      })
      .catch(() => setMatieres([]));
  };

  React.useEffect(() => {
    fetchEnseignants();
    fetchUsers();
    fetchMatieres();
    apiFetch('/api/ecole').then(r => r.json()).then(data => {
      if (data && !data.error) setSchoolInfo(data);
    }).catch(() => {});
  }, []);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const schoolCode = schoolInfo?.code_ecole || (schoolInfo?.id ? `SCH-${String(schoolInfo.id).padStart(4, '0')}` : 'SCH-0001');
  const schoolLoginUrl = `${origin}/login?code=${encodeURIComponent(schoolCode)}`;

  // Map of users by teacher ID and by email
  const teachersUsersMap = React.useMemo(() => {
    const map: Record<number, any> = {};
    users.forEach(u => {
      if (u.enseignant_id) {
        map[u.enseignant_id] = u;
      }
    });
    // Fallback match by email
    enseignants.forEach(e => {
      if (!map[e.id] && e.email) {
        const found = users.find(u => u.email && u.email.toLowerCase() === e.email.toLowerCase());
        if (found) map[e.id] = found;
      }
    });
    return map;
  }, [users, enseignants]);

  const handleGenerateSingleTeacher = async (teacher: any) => {
    setIsGeneratingAccount(true);
    try {
      const res = await apiFetch('/api/users/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enseignant_id: teacher.id, role: 'enseignant' })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Compte généré avec succès pour ${teacher.nom} ${teacher.prenom} !`);
        setBatchGeneratedAccounts([data]);
        setShowBatchAccountsModal(true);
        fetchEnseignants();
        fetchUsers();
      }
    } catch (e) {
      toast.error("Erreur lors de la génération du compte.");
    } finally {
      setIsGeneratingAccount(false);
    }
  };

  const handleGenerateAccounts = async () => {
    const targetTeachers = selectedTeachers.length > 0 
      ? enseignants.filter(e => selectedTeachers.includes(e.id))
      : filteredEnseignants;

    if (targetTeachers.length === 0) {
      toast.error("Aucun enseignant trouvé.");
      return;
    }

    const count = targetTeachers.length;
    const isSelection = selectedTeachers.length > 0;

    const confirmed = await confirm({
      title: 'Générer les comptes d\'accès enseignants',
      message: isSelection
        ? `Voulez-vous générer automatiquement les identifiants et mots de passe pour les ${count} enseignant(s) sélectionné(s) sous le compte de l'école ? Le lien de connexion sera configuré sous le compte principal de l'établissement.`
        : `Voulez-vous générer automatiquement les identifiants et mots de passe pour TOUS les ${count} enseignants affichés sous le compte de l'école ?`,
      confirmText: `Générer Compte (${count})`,
      variant: 'info'
    });

    if (confirmed) {
      setIsSyncingTeachers(true);
      try {
        const res = await apiFetch('/api/users/generate-teachers-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teacher_ids: targetTeachers.map(t => t.id),
            role: 'enseignant'
          })
        });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.success(`${data.count || count} compte(s) enseignant(s) généré(s) avec succès !`);
          if (data.accounts && data.accounts.length > 0) {
            setBatchGeneratedAccounts(data.accounts);
            setShowBatchAccountsModal(true);
          }
          fetchEnseignants();
          fetchUsers();
        }
      } catch(err) {
        toast.error("Erreur lors de la génération des comptes.");
      } finally {
        setIsSyncingTeachers(false);
      }
    }
  };

  const fetchTeacherDossiers = (teacherId: number) => {
    apiFetch(`/api/enseignants/${teacherId}/dossiers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setTeacherDossiers(data);
        else setTeacherDossiers([]);
      })
      .catch(() => setTeacherDossiers([]));
  };

  const handleOpenDossier = (teacher: any) => {
    setDossierTeacher(teacher);
    setRemarqueAdmin(teacher.remarque_dossier || '');
    fetchTeacherDossiers(teacher.id);
    setShowDossierModal(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !dossierTeacher) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Veuillez sélectionner un fichier au format PDF.');
      return;
    }

    setIsUploadingDossier(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      apiFetch(`/api/enseignants/${dossierTeacher.id}/dossiers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom_fichier: file.name,
          fichier_data: base64,
          type_document: 'Dossier PDF enseignant',
          taille_fichier: file.size
        })
      })
        .then(res => res.json())
        .then(data => {
          setIsUploadingDossier(false);
          if (data.success) {
            toast.success('Fichier PDF ajouté au dossier');
            fetchTeacherDossiers(dossierTeacher.id);
            fetchEnseignants();
            setDossierTeacher({ ...dossierTeacher, statut_dossier: 'soumis' });
          } else {
            toast.error(data.error || 'Erreur lors de l\'envoi');
          }
        })
        .catch(() => {
          setIsUploadingDossier(false);
          toast.error('Erreur lors du téléversement');
        });
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateDossierStatus = (newStatut: 'valide' | 'rejete') => {
    if (!dossierTeacher) return;
    apiFetch(`/api/enseignants/${dossierTeacher.id}/dossier-statut`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statut: newStatut,
        remarque_admin: remarqueAdmin
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success(`Dossier ${newStatut === 'valide' ? 'validé' : 'rejeté'}`);
          fetchEnseignants();
          setDossierTeacher({ ...dossierTeacher, statut_dossier: newStatut, remarque_dossier: remarqueAdmin });
        } else {
          toast.error(data.error || 'Erreur lors de la mise à jour');
        }
      });
  };

  const handleDeleteDocument = (docId: number) => {
    apiFetch(`/api/enseignants/dossiers/${docId}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          toast.success('Document supprimé');
          if (dossierTeacher) fetchTeacherDossiers(dossierTeacher.id);
          fetchEnseignants();
        }
      });
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nom': 'KOFFI',
        'Prénom': 'Jean',
        'Date de naissance (jj/mm/aaaa)': '15/05/1985',
        'Sexe (M/F)': 'M',
        'Téléphone': '90000000',
        'Email': 'jean.koffi@example.com',
        'Adresse': 'Lomé, Togo',
        'Matière': 'Mathématiques',
        'Matière secondaire 1': 'Physique',
        'Matière secondaire 2': 'Informatique',
        'Niveau d\'études': 'Master',
        'Diplôme professionnel': 'CAPES',
        'Autorisation d\'enseigner (Oui/Non)': 'Oui',
        'Années d\'expérience': 8
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Enseignants");
    XLSX.writeFile(wb, "template_import_enseignants.xlsx");
  };

  const handleFormPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const toggleTeacherSelection = (id: number) => {
    setSelectedTeachers(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const selectAllTeachers = () => {
    const visibleIds = filteredEnseignants.map((t: any) => t.id);
    if (selectedTeachers.length === visibleIds.length) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(visibleIds);
    }
  };

  const handleOpenBatchPhotoPicker = () => {
    batchPhotoInputRef.current?.click();
  };

  const handleBatchPhotoFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBatchPhotoFiles(e.target.files);
      setShowBatchPhotoModal(true);
    }
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    const isPrimaryCycle = cycle === 'primaire';

    if (!isPrimaryCycle) {
      const selectedIds = Array.isArray(formData.matieres_ids) ? formData.matieres_ids : [];
      const hasSelectedSubjects = selectedIds.length > 0 || (formData.matiere_id && formData.matiere_id !== '') || (formData.matiere_nom_custom && formData.matiere_nom_custom.trim() !== '');
      if (!hasSelectedSubjects) {
        toast.error("Veuillez sélectionner au moins une matière pour l'enseignant.");
        return;
      }
      if (selectedIds.length > 3) {
        toast.error("Un enseignant peut enseigner au maximum 3 matières.");
        return;
      }
    }

    const url = editingTeacher ? `/api/enseignants/${editingTeacher.id}` : '/api/enseignants';
    const method = editingTeacher ? 'PUT' : 'POST';

    // Build payload ensuring matieres_ids, matiere_principale_id and single-fallback matiere_id are coherent
    let finalMatieresIds = [...(Array.isArray(formData.matieres_ids) ? formData.matieres_ids : [])];
    if (finalMatieresIds.length === 0 && formData.matiere_id && !isNaN(Number(formData.matiere_id))) {
      finalMatieresIds = [Number(formData.matiere_id)];
    }
    finalMatieresIds = finalMatieresIds.slice(0, 3);

    let finalMainId = formData.matiere_principale_id ? Number(formData.matiere_principale_id) : (finalMatieresIds[0] || null);

    const payload = {
      ...formData,
      matieres_ids: finalMatieresIds,
      matiere_principale_id: finalMainId,
      matiere_id: finalMainId || (finalMatieresIds[0] || ''),
      cycle: cycle === 'primaire' ? 'primaire' : 'secondaire',
      force
    };

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409 && data.duplicateType === 'suspect') {
          setSingleSuspectDuplicate({
            candidate: data.candidate || formData,
            existing: data.matched,
            reason: data.error
          });
          return;
        }
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }
      setSingleSuspectDuplicate(null);
      toast.success(editingTeacher ? "Enseignant mis à jour" : "Enseignant ajouté avec succès");
      setShowModal(false);
      
      if (!editingTeacher && data.username && data.password) {
        setCreatedAccountCredentials({
          fullName: data.fullName || `${formData.prenom} ${formData.nom}`,
          role: data.role || 'enseignant',
          poste: data.poste || 'Enseignant',
          matricule: data.matricule || formData.matricule,
          username: data.username,
          password: data.password,
          schoolId: data.schoolId,
          schoolCode: data.schoolCode,
          schoolName: data.schoolName || 'Votre Établissement',
          schoolLoginUrl: data.schoolLoginUrl
        });
        setShowCreatedAccountModal(true);
      }

      setEditingTeacher(null);
      setIsCustomMatiere(false);
      fetchEnseignants();
      setFormData({
        matricule: '', nom: '', prenom: '', telephone: '', email: '', adresse: '', photo: '', 
        matiere_id: '', matieres_ids: [], matiere_principale_id: '',
        matiere_nom_custom: '',
        sexe: 'M', date_naissance: '', niveau_etudes: 'Licence', diplome_pro: '',
        autorisation_enseigner: 'Oui', annees_experience: '0'
      });
    })
    .catch(err => {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'enregistrement");
    });
  };

  const handleExecuteImport = (mode: 'all' | 'valid_only') => {
    if (!importAnalysis) return;
    setIsImporting(true);
    apiFetch('/api/enseignants/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enseignants: importData, dryRun: false, mode })
    })
    .then(res => res.json())
    .then((data) => {
      setIsImporting(false);
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setShowImportModal(false);
      setImportWorkbook(null);
      setImportData([]);
      setImportAnalysis(null);
      fetchEnseignants();
      toast.success(`${data.count || 0} enseignant(s) importé(s) avec succès !`);
    })
    .catch(err => {
      setIsImporting(false);
      console.error(err);
      toast.error("Erreur lors de l'importation.");
    });
  };

  const handleEdit = (prof: any) => {
    setEditingTeacher(prof);
    setIsCustomMatiere(false);

    let parsedIds: number[] = [];
    if (prof.matieres_ids) {
      parsedIds = String(prof.matieres_ids).split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id) && id > 0);
    } else if (prof.matiere_id) {
      parsedIds = [parseInt(prof.matiere_id)];
    }
    parsedIds = Array.from(new Set(parsedIds)).slice(0, 3);

    const mainId = prof.matiere_principale_id || (parsedIds.length > 0 ? parsedIds[0] : '');

    setFormData({
      matricule: prof.matricule || '',
      nom: prof.nom,
      prenom: prof.prenom,
      telephone: prof.telephone || '',
      email: prof.email || '',
      adresse: prof.adresse || '',
      photo: prof.photo || '',
      matieres_ids: parsedIds,
      matiere_principale_id: mainId,
      matiere_id: mainId ? String(mainId) : (parsedIds[0] ? String(parsedIds[0]) : ''),
      matiere_nom_custom: '',
      sexe: prof.sexe || 'M',
      date_naissance: prof.date_naissance || '',
      niveau_etudes: prof.niveau_etudes || 'Licence',
      diplome_pro: prof.diplome_pro || '',
      autorisation_enseigner: prof.autorisation_enseigner || 'Oui',
      annees_experience: prof.annees_experience ? String(prof.annees_experience) : '0'
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({
      title: "Supprimer l'enseignant",
      message: "Êtes-vous sûr de vouloir supprimer cet enseignant ? Cette action est irréversible et supprimera également ses affectations.",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      apiFetch(`/api/enseignants/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            fetchEnseignants();
            toast.success("Enseignant supprimé");
          } else {
            toast.error(data.error || 'Erreur lors de la suppression');
          }
        })
        .catch(err => console.error('Delete error:', err));
    }
  };

  const mainMatieres = React.useMemo(() => {
    const list = (Array.isArray(matieres) ? matieres : []).filter((m: any) => !m.parent_id);
    if (cycle === 'secondaire') {
      return list.filter((m: any) => !isPrimarySubject(m));
    }
    if (cycle === 'primaire') {
      return list.filter((m: any) => isPrimarySubject(m));
    }
    return list;
  }, [matieres, cycle]);

  const filteredEnseignants = enseignants.filter((prof: any) => {
    const profCycle = (prof.cycle || '').toLowerCase();
    const classStr = `${prof.classes_noms || ''} ${prof.classe_titulaire_nom || ''}`.toLowerCase();
    const primaryKeywords = ['ci', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', 'maternelle', 'sil', 'm1', 'm2', 'petite section', 'moyenne section', 'grande section'];
    const hasPrimaryClass = primaryKeywords.some(k => classStr.includes(k));
    const isPri = profCycle === 'primaire' || profCycle === 'maternelle' || hasPrimaryClass;

    if (cycle === 'primaire') {
      if (!isPri) return false;
    } else if (cycle === 'secondaire') {
      if (isPri) return false;
    }

    const matchesSearch = ((prof.nom || '') + ' ' + (prof.prenom || '')).toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (prof.matricule || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (prof.classes_noms || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (prof.matieres_noms || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (prof.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    // Pas de tri par matière pour le primaire et la maternelle
    if (cycle === 'primaire') {
      return matchesSearch;
    }

    const matchesMatiere = filterMatiere === '' || 
      prof.matiere_id === parseInt(filterMatiere) ||
      (prof.matieres_ids && prof.matieres_ids.split(',').map(Number).includes(parseInt(filterMatiere)));
    
    return matchesSearch && matchesMatiere;
  }).sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));

  return (
    <div className="space-y-6 relative">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-primary-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-primary-400">
            <div className="p-2 bg-primary-500 rounded-full">
              <UserPlus size={24} />
            </div>
            <span className="font-bold text-lg">Enseignants importés avec succès</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {cycle === 'primaire' ? 'Maîtres & Maîtresses (Primaire & Maternelle)' : cycle === 'secondaire' ? 'Enseignants (Secondaire)' : 'Gestion des Enseignants'}
          </h1>
          <p className="text-slate-500">
            {cycle === 'primaire' ? 'Gérez les enseignants titulaires des classes du primaire et de la maternelle.' : 'Gérez le corps professoral et leurs affectations.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Hidden input for batch photo import */}
          <input
            type="file"
            ref={batchPhotoInputRef}
            onChange={handleBatchPhotoFilesSelected}
            multiple
            accept="image/*"
            className="hidden"
          />

          {canWrite && (
            <>
              <button 
                onClick={handleGenerateAccounts}
                disabled={isSyncingTeachers}
                className="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm text-sm"
                title="Générer automatiquement les identifiants, mots de passe et lien école pour les enseignants"
              >
                {isSyncingTeachers ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <KeyRound size={18} />
                )}
                <span>
                  {isSyncingTeachers 
                    ? 'Génération en cours...' 
                    : selectedTeachers.length > 0 
                      ? `Générer Compte (${selectedTeachers.length})` 
                      : 'Générer Compte'}
                </span>
              </button>
              <button 
                id="btn-reconduire-enseignants"
                onClick={() => setShowReconduireModal(true)}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-2xs text-sm"
                title="Reconduire les enseignants et leurs affectations vers une autre année scolaire"
              >
                <Repeat size={18} className="text-emerald-600" />
                <span>
                  {selectedTeachers.length > 0 
                    ? `Reconduire (${selectedTeachers.length})` 
                    : 'Reconduire'}
                </span>
              </button>
              <button 
                onClick={handleOpenBatchPhotoPicker}
                className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-2xs text-sm"
                title="Importer des photos (nom_prénoms_matricule)"
              >
                <Camera size={18} />
                <span>Importer photo{selectedTeachers.length > 0 ? ` (${selectedTeachers.length})` : 's'}</span>
              </button>
              <button 
                onClick={downloadTemplate}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
              >
                <Download size={20} />
                Template
              </button>
              <button 
                onClick={() => setShowImportModal(true)}
                className="bg-primary-50 text-primary-600 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-100 transition-colors"
              >
                <FileText size={20} />
                Importer
              </button>
              <button 
                onClick={() => {
                  setEditingTeacher(null);
                  setFormData({
                    matricule: '', nom: '', prenom: '', telephone: '', email: '', adresse: '', photo: '', matiere_id: '',
                    sexe: 'M', date_naissance: '', niveau_etudes: 'Licence', diplome_pro: '',
                    autorisation_enseigner: 'Oui', annees_experience: '0'
                  });
                  setShowModal(true);
                }}
                className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
              >
                <Plus size={20} />
                {cycle === 'primaire' ? 'Nouveau Maître/Maîtresse' : 'Ajouter un enseignant'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col md:flex-row gap-4 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={cycle === 'primaire' ? "Rechercher un maître/maîtresse (nom, matricule, classe, email...)" : "Rechercher un enseignant (nom, matricule, matière, email...)"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          {cycle !== 'primaire' && (
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-slate-400" />
              <select 
                value={filterMatiere}
                onChange={(e) => setFilterMatiere(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium text-slate-700 min-w-[200px]"
              >
                <option value="">Toutes les matières</option>
                {mainMatieres.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.nom}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selection summary toggle */}
        {filteredEnseignants.length > 0 && (
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              onClick={selectAllTeachers}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {selectedTeachers.length === filteredEnseignants.length ? (
                <>
                  <CheckSquare size={16} className="text-primary-600" />
                  <span>Tout désélectionner</span>
                </>
              ) : (
                <>
                  <Square size={16} />
                  <span>Tout sélectionner ({filteredEnseignants.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEnseignants.map((prof: any) => {
          const age = calculateAge(prof.date_naissance);
          const teacherTitle = getTeacherTitle(prof);
          const assignedClassesText = prof.classes_noms ? prof.classes_noms : (prof.count_classes > 0 ? `${prof.count_classes} Classe(s)` : 'Aucune classe assignée');
          const isSelected = selectedTeachers.includes(prof.id);

          return (
            <div 
              key={prof.id} 
              className={`bg-white p-6 rounded-2xl border transition-all relative group ${
                isSelected ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md' : 'border-slate-100 shadow-sm hover:shadow-md'
              }`}
            >
              {/* Checkbox selection */}
              <div className="absolute top-4 left-4 z-10">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleTeacherSelection(prof.id)}
                  className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500 cursor-pointer"
                  title="Sélectionner pour import photo ou action groupée"
                />
              </div>

              <button 
                onClick={() => {
                  setSelectedTeacher(prof);
                  apiFetch(`/api/users/enseignant/${prof.id}`).then(res => res.json()).then(setTeacherUser);
                  setGeneratedCredentials(null);
                  setShowDetailsModal(true);
                }}
                className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600"
              >
                <MoreVertical size={18} />
              </button>
              <div className="flex items-center gap-4 mb-5 pl-6">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xl shrink-0 border border-slate-200">
                  {prof.photo ? (
                    <img src={prof.photo} alt={`${prof.nom} ${prof.prenom}`} className="w-full h-full object-cover" />
                  ) : (
                    <span>{prof.nom?.[0] || ''}{prof.prenom?.[0] || ''}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-slate-900 truncate">{prof.nom} {prof.prenom}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs text-primary-600 font-semibold uppercase tracking-wider">
                      {teacherTitle}
                    </p>
                    {prof.matricule && (
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                        {prof.matricule}
                      </span>
                    )}
                    {prof.est_reconduit && (
                      <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1" title="Enseignant reconduit pour cette année scolaire">
                        <Repeat size={10} /> Reconduit
                      </span>
                    )}
                  </div>

                  {/* Badges Matière Principale & Secondaires */}
                  {prof.matieres_noms && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {prof.matiere_principale_nom ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ★ {prof.matiere_principale_nom} (Principale)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-200 px-2 py-0.5 rounded-md">
                          ★ {prof.matieres_noms.split(',')[0]} (Principale)
                        </span>
                      )}
                      {(() => {
                        const secNoms: string[] = Array.isArray(prof.matieres_secondaires_noms)
                          ? prof.matieres_secondaires_noms
                          : typeof prof.matieres_secondaires_noms === 'string' && prof.matieres_secondaires_noms.trim()
                          ? prof.matieres_secondaires_noms.split(',').map((s: string) => s.trim()).filter(Boolean)
                          : [];

                        return secNoms.map((secNom: string, sIdx: number) => (
                          <span key={sIdx} className="inline-flex items-center text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                            {secNom}
                          </span>
                        ));
                      })()}
                    </div>
                  )}
                  {age !== null && (
                    <span className="inline-block mt-1 text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                      {age} ans
                    </span>
                  )}
                  <div className="mt-1.5">
                    {prof.statut_dossier === 'valide' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                        <CheckCircle size={12} /> Dossier Validé
                      </span>
                    )}
                    {prof.statut_dossier === 'rejete' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <XCircle size={12} /> Dossier Rejeté
                      </span>
                    )}
                    {prof.statut_dossier === 'soumis' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={12} /> Dossier Soumis
                      </span>
                    )}
                    {(!prof.statut_dossier || prof.statut_dossier === 'non_soumis') && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                        Dossier Non Soumis
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">{prof.email || 'Aucun email'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span>{prof.telephone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <MapPin size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">{prof.adresse || 'N/A'}</span>
                </div>
              </div>

              {/* Planche d'Identifiants & Accès École de l'enseignant */}
              {(() => {
                const userAcc = teachersUsersMap[prof.id];
                const hasAccount = !!(prof.user_id || prof.identifiant_compte || userAcc);
                const identifiant = prof.identifiant_compte || userAcc?.identifiant || userAcc?.email || '';
                const initialPassword = prof.mot_de_passe_initial || userAcc?.mot_de_passe_initial || '';
                const isPassVisible = !!visibleCardPasswords[prof.id];

                const teacherDataForPdf = {
                  id: prof.id,
                  nom: prof.nom,
                  prenom: prof.prenom,
                  matricule: prof.matricule,
                  telephone: prof.telephone,
                  email: prof.email,
                  matiere: prof.matieres_noms,
                  matieres_noms: prof.matieres_noms,
                  classes_noms: assignedClassesText,
                  identifiant: identifiant || `${prof.prenom?.toLowerCase() || 'prof'}.${prof.nom?.toLowerCase() || 'user'}`,
                  password: initialPassword || 'Initialisé',
                  mot_de_passe_initial: initialPassword,
                  role: userAcc?.role || prof.user_role || 'enseignant',
                  schoolName: schoolInfo?.nom || 'Votre Établissement',
                  schoolCode: schoolCode,
                  schoolLoginUrl: schoolLoginUrl
                };

                if (hasAccount && (identifiant || initialPassword || userAcc)) {
                  return (
                    <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/30 border border-indigo-100 shadow-2xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <KeyRound size={14} className="text-indigo-600" />
                          <span>Identifiants & Accès</span>
                        </div>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          {userAcc?.role ? userAcc.role.toUpperCase() : 'ACTIF'}
                        </span>
                      </div>

                      {/* Identifiant & Mot de passe */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-bold text-slate-400 block">Identifiant :</span>
                            <span className="font-mono font-bold text-slate-900 truncate block text-[11px]">
                              {identifiant || 'Non défini'}
                            </span>
                          </div>
                          {identifiant && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(identifiant);
                                toast.success("Identifiant copié !");
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Copier l'identifiant"
                            >
                              <Copy size={13} />
                            </button>
                          )}
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-emerald-200 flex items-center justify-between">
                          <div className="min-w-0">
                            <span className="text-[9px] uppercase font-bold text-emerald-600 block">Mot de passe :</span>
                            <span className="font-mono font-bold text-slate-900 truncate block text-[11px]">
                              {initialPassword ? (isPassVisible ? initialPassword : '••••••••') : '••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {initialPassword && (
                              <button
                                type="button"
                                onClick={() => toggleCardPasswordVisibility(prof.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                title={isPassVisible ? "Masquer" : "Afficher"}
                              >
                                {isPassVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                            {initialPassword && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(initialPassword);
                                  toast.success("Mot de passe copié !");
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                title="Copier le mot de passe"
                              >
                                <Copy size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Lien de connexion école */}
                      <div className="p-2 bg-white/90 rounded-xl border border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0 text-slate-600">
                          <Link2 size={13} className="text-sky-600 shrink-0" />
                          <span className="truncate font-mono text-[10px] text-sky-800" title={schoolLoginUrl}>
                            {schoolLoginUrl}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(schoolLoginUrl);
                            toast.success("Lien de connexion école copié !");
                          }}
                          className="text-[11px] font-bold text-sky-700 hover:text-sky-900 shrink-0 flex items-center gap-1 hover:underline"
                          title="Copier le lien"
                        >
                          <Copy size={12} />
                          <span>Copier</span>
                        </button>
                      </div>

                      {/* Actions row: PDF download + Manage role */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => generateSingleTeacherAccessPdf(teacherDataForPdf, schoolInfo)}
                          className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                          title="Télécharger la fiche d'accès officielle en PDF"
                        >
                          <FileText size={13} />
                          <span>Fiche PDF</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacher(prof);
                            apiFetch(`/api/users/enseignant/${prof.id}`).then(res => res.json()).then(data => {
                              setTeacherUser(data);
                              setTeacherSelectedRole(data?.role || 'enseignant');
                            });
                            setGeneratedCredentials(null);
                            setShowDetailsModal(true);
                          }}
                          className="py-1.5 px-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                          title="Gérer les accès et le rôle"
                        >
                          <Key size={13} />
                          <span>Rôle</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                // If no account generated yet
                return (
                  <div className="mt-3.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <Key size={13} className="text-amber-600" />
                        Compte d'accès non généré
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={isGeneratingAccount}
                      onClick={() => handleGenerateSingleTeacher(prof)}
                      className="w-full py-2 px-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={14} className="text-amber-300" />
                      <span>Générer Compte & Accès</span>
                    </button>
                  </div>
                );
              })()}

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate max-w-[170px]" title={assignedClassesText}>
                  <GraduationCap size={15} className="text-primary-600 shrink-0" />
                  <span className="truncate">{assignedClassesText}</span>
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => handleEdit(prof)}
                      className="text-xs font-bold text-primary-600 hover:underline"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => handleDelete(prof.id)}
                      className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              {/* Emploi du Temps Action Buttons */}
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTimetableTeacher(prof);
                    setShowTimetableModal(true);
                  }}
                  className="flex-1 py-2 px-3 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-blue-200/80 shadow-2xs"
                >
                  <Calendar size={14} />
                  <span>Afficher l'EDT</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await apiFetch(`/api/emplois/enseignant/${prof.id}`);
                      const slots = await res.json();
                      generateTeacherTimetablePDF(prof, Array.isArray(slots) ? slots : []);
                    } catch(e) {
                      generateTeacherTimetablePDF(prof, []);
                    }
                  }}
                  className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs shrink-0"
                  title="Télécharger l'emploi du temps au format PDF"
                >
                  <Download size={14} />
                  <span>PDF EDT</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenDossier(prof)}
                  className="py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-indigo-200/80 shadow-2xs shrink-0"
                  title="Gérer les dossiers PDF de l'enseignant"
                >
                  <Folder size={14} />
                  <span>Dossier PDF</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedTeacher && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            <div className="p-6 border-b flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 text-white flex items-center justify-center font-bold text-xl border border-white/20 shrink-0">
                  {selectedTeacher.photo ? (
                    <img src={selectedTeacher.photo} alt={`${selectedTeacher.nom} ${selectedTeacher.prenom}`} className="w-full h-full object-cover" />
                  ) : (
                    <span>{selectedTeacher.nom?.[0] || ''}{selectedTeacher.prenom?.[0] || ''}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">{selectedTeacher.nom} {selectedTeacher.prenom}</h2>
                  <p className="text-xs text-slate-300 mt-0.5">{selectedTeacher.matieres_noms || 'Enseignant'}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowDetailsModal(false);
                  setGeneratedCredentials(null);
                }} 
                className="p-2 text-slate-400 hover:text-white rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Email :</span>
                  <span className="font-bold text-slate-800">{selectedTeacher.email || <span className="text-red-500 font-normal italic">Aucun email</span>}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Téléphone :</span>
                  <span className="font-bold text-slate-800">{selectedTeacher.telephone || 'N/A'}</span>
                </div>
                {selectedTeacher.matricule && (
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Matricule :</span>
                    <span className="font-mono font-bold text-slate-800">{selectedTeacher.matricule}</span>
                  </div>
                )}
                <div className="pt-2 mt-2 border-t border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-500">Matière Principale :</span>
                    <span className="font-bold text-emerald-700">{selectedTeacher.matiere_principale_nom || (selectedTeacher.matieres_noms ? selectedTeacher.matieres_noms.split(',')[0] : 'N/A')}</span>
                  </div>
                  {(() => {
                    const secNoms: string[] = Array.isArray(selectedTeacher.matieres_secondaires_noms)
                      ? selectedTeacher.matieres_secondaires_noms
                      : typeof selectedTeacher.matieres_secondaires_noms === 'string' && selectedTeacher.matieres_secondaires_noms.trim()
                      ? selectedTeacher.matieres_secondaires_noms.split(',').map((s: string) => s.trim()).filter(Boolean)
                      : [];
                    
                    if (secNoms.length === 0) return null;

                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium text-slate-500">Matières Secondaires :</span>
                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                          {secNoms.map((secNom: string, idx: number) => (
                            <span key={idx} className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[10px]">
                              {secNom}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Account Management & Role Assignment Section */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Attribution de Rôle & Compte d'Accès :
                </label>

                {!selectedTeacher.email ? (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5" />
                    <span>Veuillez ajouter une adresse email valide à la fiche de cet enseignant pour lui créer un compte.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <select
                        value={teacherSelectedRole}
                        onChange={e => setTeacherSelectedRole(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="enseignant">Rôle : Enseignant (Accès standard)</option>
                        <option value="censeur">Rôle : Censeur / Pédagogie</option>
                        <option value="surveillant">Rôle : Surveillant Général</option>
                        <option value="direction">Rôle : Direction</option>
                        <option value="admin">Rôle : Administrateur</option>
                      </select>

                      <button 
                        type="button"
                        disabled={isGeneratingAccount}
                        onClick={async () => {
                          setIsGeneratingAccount(true);
                          try {
                            const res = await apiFetch('/api/users/generate', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ 
                                enseignant_id: selectedTeacher.id,
                                role: teacherSelectedRole 
                              })
                            });
                            const data = await res.json();
                            if (data.error) {
                              toast.error(data.error);
                            } else {
                              setGeneratedCredentials(data);
                              setTeacherUser({ email: data.email, role: data.role || teacherSelectedRole });
                              setCreatedAccountCredentials({
                                fullName: data.fullName || `${selectedTeacher.prenom} ${selectedTeacher.nom}`,
                                role: data.role || teacherSelectedRole,
                                poste: 'Enseignant',
                                matricule: data.matricule || selectedTeacher.matricule,
                                username: data.username || data.email,
                                password: data.password,
                                otp: data.otp,
                                schoolId: data.schoolId,
                                schoolCode: data.schoolCode,
                                schoolName: data.schoolName || 'Votre Établissement',
                                schoolLoginUrl: data.schoolLoginUrl
                              });
                              setShowCreatedAccountModal(true);
                              toast.success("Compte enseignant activé avec succès !");
                              fetchUsers();
                            }
                          } catch(e) {
                            toast.error("Erreur lors de la génération du compte.");
                          } finally {
                            setIsGeneratingAccount(false);
                          }
                        }}
                        className="px-4 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors flex items-center gap-1.5 shrink-0 shadow-sm disabled:opacity-50"
                      >
                        {isGeneratingAccount ? (
                          <>
                            <RefreshCw size={15} className="animate-spin" />
                            <span>Génération...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck size={16} />
                            <span>{teacherUser || generatedCredentials ? 'Mettre à jour' : 'Activer Compte'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {(generatedCredentials || teacherUser) && (
                      <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl space-y-2.5 text-xs text-slate-800">
                        <div className="flex items-center justify-between text-emerald-900 font-bold text-sm">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={16} className="text-emerald-600" />
                            <span>Identifiants du compte</span>
                          </div>
                          <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                            {generatedCredentials?.role || teacherUser?.role || 'ENSEIGNANT'}
                          </span>
                        </div>

                        <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Email de connexion :</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                              <span>{generatedCredentials?.email || teacherUser?.email}</span>
                              <button 
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedCredentials?.email || teacherUser?.email);
                                  toast.success("Email copié !");
                                }}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>

                          {generatedCredentials?.temporary_password && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Mot de passe temporaire :</span>
                              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                                <span>{generatedCredentials.temporary_password}</span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedCredentials.temporary_password);
                                    toast.success("Mot de passe copié !");
                                  }}
                                  className="text-slate-400 hover:text-slate-700"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>
                          )}

                          {generatedCredentials?.otp_code && (
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500">Code d'activation OTP :</span>
                              <div className="flex items-center gap-1.5 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                                <span>{generatedCredentials.otp_code}</span>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(generatedCredentials.otp_code);
                                    toast.success("Code OTP copié !");
                                  }}
                                  className="text-amber-600 hover:text-amber-800"
                                >
                                  <Copy size={13} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        <p className="text-[11px] text-emerald-800">
                          L'enseignant peut se connecter directement avec son adresse email et ce code OTP / mot de passe.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingTeacher ? 'Modifier l\'enseignant' : 'Nouvel Enseignant'}</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Photo Upload Zone */}
              <div className="flex items-center gap-4 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                <input
                  type="file"
                  ref={formPhotoInputRef}
                  onChange={handleFormPhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <div 
                  onClick={() => formPhotoInputRef.current?.click()}
                  className="relative w-16 h-16 rounded-full overflow-hidden bg-white border-2 border-dashed border-slate-300 hover:border-primary-500 cursor-pointer flex items-center justify-center group shrink-0 transition-colors"
                  title="Cliquer pour choisir une photo"
                >
                  {formData.photo ? (
                    <img src={formData.photo} alt="Photo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-primary-600">
                      <Camera size={20} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={18} />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">Photo de profil (Optionnel)</p>
                  <p className="text-[11px] text-slate-500">Formats JPG, PNG, WEBP</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => formPhotoInputRef.current?.click()}
                      className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      {formData.photo ? 'Changer' : 'Sélectionner'}
                    </button>
                    {formData.photo && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, photo: '' }))}
                        className="text-xs font-semibold text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {editingTeacher && (
                <div className="bg-primary-50 p-4 rounded-xl space-y-1">
                  <p className="text-sm font-medium text-primary-900">Identifiant (Email): {editingTeacher.email}</p>
                  <p className="text-xs text-primary-700">Mot de passe: Généré lors de la création</p>
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">Matricule</label>
                  <span className="text-xs text-slate-400 font-normal">Généré auto si laissé vide</span>
                </div>
                <input 
                  value={formData.matricule}
                  onChange={e => setFormData({...formData, matricule: e.target.value})}
                  type="text" 
                  placeholder="Laisser vide pour auto-génération (ex: ENS-2026-001)"
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-mono" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Nom</label>
                  <input 
                    required
                    value={formData.nom}
                    onChange={e => setFormData({...formData, nom: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Prénom</label>
                  <input 
                    required
                    value={formData.prenom}
                    onChange={e => setFormData({...formData, prenom: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sexe (Optionnel)</label>
                  <select 
                    value={formData.sexe}
                    onChange={e => setFormData({...formData, sexe: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Non spécifié</option>
                    <option value="M">Homme (M)</option>
                    <option value="F">Femme (F)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date de naissance (Optionnel)</label>
                  <input 
                    type="date"
                    value={formData.date_naissance}
                    onChange={e => setFormData({...formData, date_naissance: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Email (Optionnel)</label>
                <input 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  type="email" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Téléphone</label>
                <input 
                  required
                  value={formData.telephone}
                  onChange={e => setFormData({...formData, telephone: e.target.value})}
                  type="tel" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">
                    {cycle === 'primaire' ? 'Matière / Spécialité (Optionnel)' : 'Matières enseignées (Max 3 matières)'}
                  </label>
                  {cycle !== 'primaire' && (
                    <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      {(formData.matieres_ids || []).length}/3 matière(s)
                    </span>
                  )}
                </div>

                {cycle === 'primaire' ? (
                  <select 
                    value={formData.matiere_id}
                    onChange={e => setFormData({ ...formData, matiere_id: e.target.value, matieres_ids: e.target.value ? [Number(e.target.value)] : [] })}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Tout le programme (Titulaire polyvalent) --</option>
                    {mainMatieres.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    {/* Add subject dropdown */}
                    <div className="flex gap-2">
                      <select
                        value=""
                        onChange={e => {
                          const val = Number(e.target.value);
                          const currentIds = Array.isArray(formData.matieres_ids) ? formData.matieres_ids : [];
                          if (val && !currentIds.includes(val)) {
                            if (currentIds.length >= 3) {
                              toast.error("Un enseignant peut enseigner au maximum 3 matières.");
                              return;
                            }
                            const updated = [...currentIds, val];
                            const main = formData.matiere_principale_id || val;
                            setFormData({
                              ...formData,
                              matieres_ids: updated,
                              matiere_principale_id: main,
                              matiere_id: String(main)
                            });
                          }
                        }}
                        disabled={(formData.matieres_ids || []).length >= 3}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                      >
                        <option value="">
                          {(formData.matieres_ids || []).length >= 3 ? "Limite de 3 matières atteinte" : "+ Ajouter une matière..."}
                        </option>
                        {mainMatieres
                          .filter((m: any) => !(formData.matieres_ids || []).includes(m.id))
                          .map((m: any) => (
                            <option key={m.id} value={m.id}>{m.nom} ({m.categorie || 'Général'})</option>
                          ))
                        }
                      </select>
                    </div>

                    {/* Selected subjects list with primary designation */}
                    {(formData.matieres_ids || []).length > 0 ? (
                      <div className="space-y-2 pt-1">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Matières choisies (Sélectionnez la matière principale) :
                        </p>
                        <div className="space-y-1.5">
                          {(formData.matieres_ids || []).map((mId) => {
                            const subObj = (Array.isArray(matieres) ? matieres : []).find((m: any) => m.id === mId);
                            const subName = subObj?.nom || `Matière #${mId}`;
                            const isMain = Number(formData.matiere_principale_id) === mId || ((formData.matieres_ids || []).length === 1);

                            return (
                              <div 
                                key={mId} 
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                                  isMain 
                                    ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs' 
                                    : 'bg-white border-slate-200'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input 
                                    type="radio" 
                                    name="matiere_principale_radio" 
                                    id={`main_matiere_${mId}`}
                                    checked={isMain} 
                                    onChange={() => setFormData({ 
                                      ...formData, 
                                      matiere_principale_id: mId,
                                      matiere_id: String(mId)
                                    })}
                                    className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <label htmlFor={`main_matiere_${mId}`} className="text-sm font-semibold text-slate-800 cursor-pointer flex items-center gap-1.5 truncate">
                                    <span>{subName}</span>
                                    {isMain && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-full uppercase tracking-wider shrink-0">
                                        Principale
                                      </span>
                                    )}
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = (formData.matieres_ids || []).filter(id => id !== mId);
                                    let newMain = formData.matiere_principale_id;
                                    if (Number(newMain) === mId) {
                                      newMain = updated[0] || '';
                                    }
                                    setFormData({
                                      ...formData,
                                      matieres_ids: updated,
                                      matiere_principale_id: newMain,
                                      matiere_id: newMain ? String(newMain) : ''
                                    });
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                                  title="Retirer cette matière"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">
                        Aucune matière sélectionnée. Choisissez jusqu'à 3 matières dans la liste déroulante ci-dessus.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Niveau d'études</label>
                  <input 
                    type="text"
                    placeholder="ex: Licence, Master..."
                    value={formData.niveau_etudes}
                    onChange={e => setFormData({...formData, niveau_etudes: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Diplôme professionnel (Optionnel)</label>
                  <input 
                    type="text"
                    placeholder="ex: CAPES, CEAP..."
                    value={formData.diplome_pro}
                    onChange={e => setFormData({...formData, diplome_pro: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Autorisation d'enseigner</label>
                  <select 
                    value={formData.autorisation_enseigner}
                    onChange={e => setFormData({...formData, autorisation_enseigner: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Oui">Oui</option>
                    <option value="Non">Non</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Années d'expérience (Optionnel)</label>
                  <input 
                    type="number"
                    min="0"
                    placeholder="ex: 5"
                    value={formData.annees_experience}
                    onChange={e => setFormData({...formData, annees_experience: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Adresse</label>
                <textarea 
                  value={formData.adresse}
                  onChange={e => setFormData({...formData, adresse: e.target.value})}
                  rows={2} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                ></textarea>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Importer des enseignants</h2>
              <button onClick={() => {
                setShowImportModal(false);
                setImportWorkbook(null);
                setImportData([]);
                setImportErrors([]);
              }} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              {/* Upload Zone */}
              {!importWorkbook ? (
                <div className="border-2 border-dashed border-primary-300 bg-primary-50 rounded-2xl p-8 text-center">
                  <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText size={32} />
                  </div>
                  <p className="text-sm text-slate-600 mb-4">Glissez-déposez votre fichier Excel ici ou cliquez pour parcourir</p>
                  <input 
                    type="file" 
                    ref={excelInputRef}
                    accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                    onChange={(e) => {
                      console.log("Teacher file input changed", e.target.files);
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("Teacher file selected:", file.name, file.type, file.size);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            console.log("Teacher file read successfully");
                            const data = new Uint8Array(e.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                            setImportWorkbook(workbook);
                            if (workbook.SheetNames.length > 0) {
                              setImportSheetName(workbook.SheetNames[0]);
                            }
                          } catch (err) {
                            console.error("Error reading teacher excel file:", err);
                            toast.error("Erreur lors de la lecture du fichier Excel. Assurez-vous qu'il s'agit d'un fichier valide.");
                          }
                        };
                        reader.onerror = (err) => {
                          console.error("Teacher FileReader error:", err);
                          toast.error("Erreur lors de la lecture du fichier.");
                        };
                        reader.readAsArrayBuffer(file);
                      }
                    }} 
                    className="sr-only" 
                    id="excel-upload-teacher"
                  />
                  <label 
                    htmlFor="excel-upload-teacher"
                    className="inline-block px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-primary-700 transition-colors active:scale-95"
                  >
                    Choisir un fichier
                  </label>
                </div>
              ) : (
                <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 text-primary-600 rounded-lg">
                      <FileText size={20} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">Fichier chargé avec succès</span>
                  </div>
                  <button 
                    onClick={() => {
                      setImportWorkbook(null);
                      setImportData([]);
                      setImportErrors([]);
                    }}
                    className="text-xs font-bold text-primary-600 hover:underline"
                  >
                    Changer
                  </button>
                </div>
              )}
              
              {importWorkbook && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Feuille Excel</label>
                    <select 
                      value={importSheetName}
                      onChange={(e) => setImportSheetName(e.target.value)} 
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {importWorkbook.SheetNames.map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                  </div>

                  <button 
                    disabled={isAnalyzingImport}
                    onClick={() => {
                      const sheet = importWorkbook.Sheets[importSheetName];
                      const data = XLSX.utils.sheet_to_json(sheet);
                      
                      const errors: string[] = [];
                      const mappedData = data.map((row: any, index: number) => {
                        const rowNum = index + 2;
                        
                        const getVal = (keys: string[]) => {
                          const foundKey = Object.keys(row).find(k => 
                            keys.some(key => k.toLowerCase().trim() === key.toLowerCase())
                          );
                          return foundKey ? String(row[foundKey]).trim() : '';
                        };

                        const nom = getVal(['nom', 'name', 'last name']);
                        const prenom = getVal(['prénom', 'prenom', 'first name']);
                        const telephone = getVal(['téléphone', 'telephone', 'phone', 'tel']);
                        const email = getVal(['email', 'e-mail', 'mail']);
                        const matiere_nom = getVal(['matière', 'matiere', 'subject']);
                        const matiere_secondaire_1 = getVal(['matière secondaire 1', 'matiere secondaire 1', 'matiere_secondaire_1']);
                        const matiere_secondaire_2 = getVal(['matière secondaire 2', 'matiere secondaire 2', 'matiere_secondaire_2']);
                        const date_naissance = getVal(['date de naissance (jj/mm/aaaa)', 'date de naissance', 'date_naissance', 'birthdate']);
                        const sexe = getVal(['sexe (m/f)', 'sexe', 'gender']) || 'M';
                        const niveau_etudes = getVal(['niveau d\'études', 'niveau d\'etudes', 'niveau_etudes', 'degree']) || 'Licence';
                        const diplome_pro = getVal(['diplôme professionnel', 'diplome professionnel', 'diplome_pro']);
                        const autorisation_enseigner = getVal(['autorisation d\'enseigner (oui/non)', 'autorisation d\'enseigner', 'autorisation_enseigner']) || 'Oui';
                        const annees_experience = getVal(['années d\'expérience', 'annees d\'experience', 'annees_experience', 'experience']) || '0';

                        if (!nom) errors.push(`Ligne ${rowNum}: Nom manquant`);
                        if (!prenom) errors.push(`Ligne ${rowNum}: Prénom manquant`);
                        // Telephone, email and subjects are now optional per user request

                        return {
                          nom,
                          prenom,
                          telephone,
                          email,
                          adresse: getVal(['adresse', 'address']) || '',
                          matiere_nom,
                          matiere_secondaire_1,
                          matiere_secondaire_2,
                          date_naissance,
                          sexe,
                          niveau_etudes,
                          diplome_pro,
                          autorisation_enseigner,
                          annees_experience
                        };
                      });

                      setImportErrors(errors);
                      setImportData(mappedData);
                      setImportAnalysis(null);
                    }} 
                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    Afficher l'aperçu du fichier Excel
                  </button>
                  
                  {importErrors.length > 0 && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-sm font-bold text-red-600 mb-2">Informations manquantes ou erreurs :</p>
                      <ul className="text-xs text-red-500 list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                        {importErrors.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                      <p className="text-xs text-red-600 mt-2 font-medium italic">
                        Veuillez corriger ces erreurs dans votre fichier Excel avant d'importer.
                      </p>
                    </div>
                  )}

                  {importData.length > 0 && importErrors.length === 0 && (
                    <div className="space-y-4">
                      {/* Full Scrollable Preview of ALL rows */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-slate-700">
                            Aperçu du contenu du fichier ({importData.length} enseignant(s)) :
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">Défilez pour voir tout le fichier</span>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-inner bg-white">
                          <table className="w-full text-left text-xs relative">
                            <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 w-10 text-center">#</th>
                                <th className="px-3 py-2">Nom & Prénom</th>
                                <th className="px-3 py-2">Matière</th>
                                <th className="px-3 py-2">Téléphone</th>
                                <th className="px-3 py-2">Email</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importData.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px]">{i + 1}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.nom} {row.prenom}</td>
                                  <td className="px-3 py-2 font-medium text-primary-600">{row.matiere_nom}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.telephone}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.email}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Import Trigger Button */}
                      <button 
                        disabled={isAnalyzingImport}
                        onClick={() => {
                          setIsAnalyzingImport(true);
                          apiFetch('/api/enseignants/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ enseignants: importData, dryRun: true })
                          })
                          .then(res => res.json())
                          .then(analysis => {
                            setIsAnalyzingImport(false);
                            if (analysis.error) {
                              toast.error(analysis.error);
                              return;
                            }
                            setImportAnalysis(analysis);
                            setShowDupDetails(false);
                          })
                          .catch(err => {
                            setIsAnalyzingImport(false);
                            console.error(err);
                            toast.error("Erreur lors de la vérification des doublons.");
                          });
                        }} 
                        className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isAnalyzingImport ? (
                          <>Analyse de conformité en cours...</>
                        ) : (
                          <>Lancer l'importation ({importData.length} enseignant{importData.length > 1 ? 's' : ''})</>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* MODAL WINDOW FOR DUPLICATE & CONFORMITY ANALYSIS */}
              {importAnalysis && (
                <DuplicateVerificationModal
                  isOpen={Boolean(importAnalysis)}
                  onClose={() => setImportAnalysis(null)}
                  analysis={importAnalysis}
                  entityName="enseignant"
                  onContinueAll={() => handleExecuteImport('all')}
                  onContinueValidOnly={() => handleExecuteImport('valid_only')}
                  isSubmitting={isImporting}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Teacher Timetable Modal */}
      <TeacherTimetableModal 
        teacher={timetableTeacher}
        isOpen={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
      />

      {/* Teacher Dossier PDF Modal */}
      {showDossierModal && dossierTeacher && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Folder size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Dossier Administratif PDF - {dossierTeacher.nom} {dossierTeacher.prenom}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Sexe: {dossierTeacher.sexe || 'M'} | Niveau: {dossierTeacher.niveau_etudes || 'Licence'} | Exp: {dossierTeacher.annees_experience || 0} ans | Autorisation: {dossierTeacher.autorisation_enseigner || 'Oui'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowDossierModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Statut Global du Dossier */}
              <div className="p-4 rounded-2xl border flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Statut Actuel du Dossier
                  </span>
                  <div className="flex items-center gap-2">
                    {dossierTeacher.statut_dossier === 'valide' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                        <CheckCircle size={14} /> Dossier Validé
                      </span>
                    )}
                    {dossierTeacher.statut_dossier === 'rejete' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                        <XCircle size={14} /> Dossier Rejeté
                      </span>
                    )}
                    {dossierTeacher.statut_dossier === 'soumis' && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle size={14} /> Dossier Soumis (En cours d'analyse)
                      </span>
                    )}
                    {(!dossierTeacher.statut_dossier || dossierTeacher.statut_dossier === 'non_soumis') && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                        Dossier Non Soumis
                      </span>
                    )}
                  </div>
                </div>

                {/* Bouton d'upload PDF */}
                <div>
                  <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-sm">
                    <Upload size={16} />
                    <span>{isUploadingDossier ? 'Envoi...' : 'Importer PDF'}</span>
                    <input 
                      type="file" 
                      accept=".pdf,application/pdf" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                      disabled={isUploadingDossier}
                    />
                  </label>
                </div>
              </div>

              {/* Information Enseignant complémentaire */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-slate-700">
                <div>
                  <span className="block text-slate-400 font-semibold">Diplôme Pro</span>
                  <span className="font-bold">{dossierTeacher.diplome_pro || 'Non spécifié'}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold">Autorisation</span>
                  <span className="font-bold">{dossierTeacher.autorisation_enseigner || 'Oui'}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold">Expérience</span>
                  <span className="font-bold">{dossierTeacher.annees_experience || 0} an(s)</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-semibold">Date de Naiss.</span>
                  <span className="font-bold">{dossierTeacher.date_naissance || 'Non renseignée'}</span>
                </div>
              </div>

              {/* Liste des Documents PDF Téléversés */}
              <div>
                <h3 className="font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" />
                  Documents PDF de l'enseignant ({teacherDossiers.length})
                </h3>

                {teacherDossiers.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <File size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">Aucun document PDF dans ce dossier</p>
                    <p className="text-xs text-slate-400 mt-1">Utilisez le bouton "Importer PDF" ci-dessus pour ajouter des pièces justificatives.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teacherDossiers.map((doc: any) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <File size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-slate-800 truncate">{doc.nom_fichier}</p>
                            <p className="text-[10px] text-slate-400">
                              {doc.taille_fichier ? `${Math.round(doc.taille_fichier / 1024)} KB • ` : ''}
                              {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              const win = window.open();
                              if (win) {
                                win.document.write(`<iframe src="${doc.fichier_data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              }
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Aperçu du PDF"
                          >
                            <Eye size={14} />
                            <span>Voir</span>
                          </button>

                          <a
                            href={doc.fichier_data}
                            download={doc.nom_fichier}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                            title="Télécharger"
                          >
                            <Download size={14} />
                          </a>

                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section Analyse & Validation par l'Administration */}
              {user.role === 'admin' && (
                <div className="pt-4 border-t space-y-3">
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                    <CheckCircle size={16} className="text-green-600" />
                    Analyse et décision de l'Administration
                  </h3>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600 block">
                      Remarques / Compte-rendu de l'analyse du dossier :
                    </label>
                    <textarea 
                      value={remarqueAdmin}
                      onChange={e => setRemarqueAdmin(e.target.value)}
                      placeholder="Indiquez vos remarques ou motifs en cas de rejet..."
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => handleUpdateDossierStatus('valide')}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle size={16} />
                      <span>Valider le dossier</span>
                    </button>

                    <button
                      onClick={() => handleUpdateDossierStatus('rejete')}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <XCircle size={16} />
                      <span>Rejeter le dossier</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Photo Import Modal */}
      {showBatchPhotoModal && (
        <BatchPhotoImportModal
          isOpen={showBatchPhotoModal}
          onClose={() => {
            setShowBatchPhotoModal(false);
            setBatchPhotoFiles(null);
          }}
          targetType="enseignants"
          title="Importation de photos - Enseignants"
          description="Les photos sélectionnées sont automatiquement associées par le nom de fichier au format nom_prénoms_matricule."
          initialFiles={batchPhotoFiles}
          entities={
            (selectedTeachers.length > 0 
              ? enseignants.filter((t: any) => selectedTeachers.includes(t.id))
              : enseignants
            ).map((t: any) => ({
              id: t.id,
              nom: t.nom,
              prenom: t.prenom,
              matricule: t.matricule || '',
              photo: t.photo || '',
              subtitle: t.matieres_noms ? `Matière : ${t.matieres_noms}` : (t.telephone ? `Tél : ${t.telephone}` : undefined)
            }))
          }
          onSuccess={() => {
            fetchEnseignants();
            setSelectedTeachers([]);
          }}
        />
      )}

      {/* Batch Accounts Created Modal */}
      {showBatchAccountsModal && (
        <BatchAccountsModal
          isOpen={showBatchAccountsModal}
          onClose={() => {
            setShowBatchAccountsModal(false);
            setBatchGeneratedAccounts([]);
          }}
          accounts={batchGeneratedAccounts}
          schoolInfo={schoolInfo}
        />
      )}

      {/* Account Created Credentials Modal */}
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
      {/* Single Suspect Duplicate Modal */}
      {singleSuspectDuplicate && (
        <DuplicateVerificationModal
          isOpen={Boolean(singleSuspectDuplicate)}
          onClose={() => setSingleSuspectDuplicate(null)}
          isSingleMode={true}
          singleCandidate={singleSuspectDuplicate.candidate}
          singleExisting={singleSuspectDuplicate.existing}
          singleReason={singleSuspectDuplicate.reason}
          entityName="enseignant"
          onContinueAll={() => {
            setSingleSuspectDuplicate(null);
            handleSubmit(undefined, true);
          }}
        />
      )}

      {/* Modal de reconduction des enseignants */}
      {showReconduireModal && (
        <ReconduireEnseignantsModal
          isOpen={showReconduireModal}
          onClose={() => setShowReconduireModal(false)}
          onSuccess={() => {
            fetchEnseignants();
          }}
          selectedTeachers={selectedTeachers}
          allTeachers={enseignants}
          cycleFilter={cycle}
        />
      )}
    </div>
  );
}

