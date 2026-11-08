import React from 'react';
import { apiFetch } from '../utils/api';
import { 
  Users, Plus, Search, Filter, Mail, Phone, MapPin, 
  Briefcase, DollarSign, Calendar, Edit2, Trash2, Shield, X, Check, Award,
  Upload, Download, FileSpreadsheet, CheckCircle, AlertTriangle, Camera, CheckSquare, Square,
  Key, UserCheck, UserPlus, Copy, ShieldCheck, Lock, ExternalLink, RefreshCw, Crown, Sparkles,
  Repeat, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import BatchPhotoImportModal, { ImportEntity } from '../components/BatchPhotoImportModal';
import { AccountCreatedModal, AccountCredentials } from '../components/AccountCreatedModal';
import { DuplicateVerificationModal } from '../components/DuplicateVerificationModal';
import { ReconduirePersonnelModal } from '../components/ReconduirePersonnelModal';

const DEFAULT_POSTES = [
  'Direction',
  'Secrétaire',
  'Comptable',
  'Surveillant général',
  'Censeur'
];

export const ROLE_OPTIONS = [
  { value: 'admin', label: 'Fondé / Administrateur', desc: 'Fondateur seul administrateur avec plein contrôle sur tous les paramètres', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { value: 'direction', label: 'Direction Générale', desc: 'Gestion et supervision des opérations scolaires', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'censeur', label: 'Censeur / Pédagogie', desc: 'Gestion des classes, matières, notes et EDT', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { value: 'surveillant', label: 'Surveillant Général / Discipline', desc: 'Suivi discipline, élèves, cartes et EDT', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'secretariat', label: 'Secrétariat / Administration', desc: 'Inscriptions, bulletins, emplois du temps et dossiers', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'comptable', label: 'Comptabilité / Économe', desc: 'Paiements, écolages et gestion de la paie', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

export function mapPosteToDefaultRole(poste: string): string {
  const p = (poste || '').toLowerCase().trim();
  if (p.includes('fondé') || p.includes('fondateur')) {
    return 'admin';
  }
  if (p.includes('direct') || p.includes('proviseur') || p.includes('principal')) {
    return 'direction';
  }
  if (p.includes('censeur') || p.includes('étude') || p.includes('etude') || p.includes('pédagogique') || p.includes('pedagogique')) {
    return 'censeur';
  }
  if (p.includes('surveill') || p.includes('discipline')) {
    return 'surveillant';
  }
  if (p.includes('comptab') || p.includes('économe') || p.includes('econome') || p.includes('financ') || p.includes('caisse')) {
    return 'comptable';
  }
  if (p.includes('secrét') || p.includes('secret') || p.includes('assist')) {
    return 'secretariat';
  }
  return 'secretariat';
}

export default function AdministrativeStaff() {
  const confirm = useConfirm();
  const [staff, setStaff] = React.useState<any[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [customPostes, setCustomPostes] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterPoste, setFilterPoste] = React.useState('');
  
  const [showModal, setShowModal] = React.useState(false);
  const [showPostesModal, setShowPostesModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importWorkbook, setImportWorkbook] = React.useState<XLSX.WorkBook | null>(null);
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importAnalysis, setImportAnalysis] = React.useState<any>(null);
  const [isAnalyzingImport, setIsAnalyzingImport] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [singleSuspectDuplicate, setSingleSuspectDuplicate] = React.useState<{ candidate: any; existing: any; reason: string } | null>(null);
  const [showDupDetails, setShowDupDetails] = React.useState(false);
  const [editingMember, setEditingMember] = React.useState<any>(null);
  const [newPosteTitle, setNewPosteTitle] = React.useState('');

  // User Account Management modal states
  const [accountModalStaff, setAccountModalStaff] = React.useState<any>(null);
  const [selectedRole, setSelectedRole] = React.useState('secretariat');
  const [accountCredentials, setAccountCredentials] = React.useState<any>(null);
  const [createdAccountCredentials, setCreatedAccountCredentials] = React.useState<AccountCredentials | null>(null);
  const [showCreatedAccountModal, setShowCreatedAccountModal] = React.useState(false);
  const [isGeneratingAccount, setIsGeneratingAccount] = React.useState(false);
  const [isSyncingStaff, setIsSyncingStaff] = React.useState(false);
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = React.useState<string | number>('all');

  // Selection & Batch photo states
  const [selectedStaff, setSelectedStaff] = React.useState<number[]>([]);
  const [showBatchPhotoModal, setShowBatchPhotoModal] = React.useState(false);
  const [showReconduireModal, setShowReconduireModal] = React.useState(false);
  const [batchPhotoFiles, setBatchPhotoFiles] = React.useState<FileList | null>(null);
  const batchPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const formPhotoInputRef = React.useRef<HTMLInputElement>(null);

  const [formData, setFormData] = React.useState({
    matricule: '',
    nom: '',
    prenom: '',
    poste: 'Secrétaire',
    telephone: '',
    email: '',
    adresse: '',
    photo: '',
    sexe: 'M',
    date_naissance: '',
    date_embauche: '',
    niveau_etudes: 'Licence',
    diplome: '',
    type_contrat: 'CDI',
    salaire_mensuel: '150000',
    statut: 'Actif'
  });

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

  const toggleStaffSelection = (id: number) => {
    setSelectedStaff(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAllStaff = () => {
    const visibleIds = filteredStaff.map(s => s.id);
    if (selectedStaff.length === visibleIds.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(visibleIds);
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

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nom': 'KOUASSI',
        'Prénom': 'Amina',
        'Poste': 'Secrétaire',
        'Sexe (M/F)': 'F',
        'Date de naissance (jj/mm/aaaa)': '10/03/1990',
        'Téléphone': '91234567',
        'Email': 'amina.kouassi@example.com',
        'Adresse': 'Lomé, Togo',
        'Niveau d\'études': 'Licence',
        'Diplôme': 'BTS Secrétariat',
        'Type de contrat': 'CDI',
        'Salaire mensuel': 150000,
        'Statut': 'Actif'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Personnel");
    XLSX.writeFile(wb, "template_import_personnel.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const bstr = event.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        setImportWorkbook(wb);
        setImportData([]);
        setImportErrors([]);
      } catch (err) {
        console.error(err);
        toast.error("Erreur de lecture du fichier Excel");
      }
    };
    reader.readAsBinaryString(file);
  };

  const fetchStaff = () => {
    const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
    apiFetch(`/api/personnel-administratif${yearParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setStaff(data);
        else setStaff([]);
      })
      .catch(() => setStaff([]));
  };

  const fetchUsers = () => {
    apiFetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsers(data);
        else setUsers([]);
      })
      .catch(() => setUsers([]));
  };

  const fetchPostes = () => {
    apiFetch('/api/personnel-postes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCustomPostes(data);
        else setCustomPostes([]);
      })
      .catch(() => setCustomPostes([]));
  };

  React.useEffect(() => {
    fetchStaff();
    fetchUsers();
    fetchPostes();
  }, [selectedYearId]);

  // Map of users by staff ID and by email
  const staffUsersMap = React.useMemo(() => {
    const map: Record<number, any> = {};
    users.forEach(u => {
      if (u.personnel_id) {
        map[u.personnel_id] = u;
      }
    });
    // Also cross-reference by email if personnel_id wasn't set yet
    staff.forEach(s => {
      if (!map[s.id] && s.email) {
        const found = users.find(u => u.email && u.email.toLowerCase() === s.email.toLowerCase());
        if (found) map[s.id] = found;
      }
    });
    return map;
  }, [users, staff]);

  const handleOpenAccountModal = (member: any) => {
    const existing = staffUsersMap[member.id];
    setAccountModalStaff(member);
    setSelectedRole(existing?.role || mapPosteToDefaultRole(member.poste));
    setAccountCredentials(null);
  };

  const handleGenerateStaffAccount = async (member: any) => {
    if (!member.email || !member.email.includes('@')) {
      toast.error("Veuillez d'abord renseigner une adresse email valide pour ce membre.");
      return;
    }
    setIsGeneratingAccount(true);
    try {
      const res = await apiFetch('/api/users/generate-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personnel_id: member.id,
          role: selectedRole
        })
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        setAccountCredentials(data);
        setCreatedAccountCredentials({
          fullName: data.fullName || `${member.prenom} ${member.nom}`,
          role: data.role || selectedRole,
          poste: data.poste || member.poste,
          matricule: data.matricule || member.matricule,
          username: data.username || member.email,
          password: data.password,
          otp: data.otp,
          schoolId: data.schoolId,
          schoolCode: data.schoolCode,
          schoolName: data.schoolName || 'Votre Établissement',
          schoolLoginUrl: data.schoolLoginUrl
        });
        setShowCreatedAccountModal(true);
        toast.success(`Compte ${data.role ? data.role.toUpperCase() : ''} activé avec succès !`);
        fetchUsers();
      }
    } catch (err: any) {
      toast.error("Erreur lors de la création du compte.");
    } finally {
      setIsGeneratingAccount(false);
    }
  };

  const handleSyncAllStaff = async () => {
    const staffWithEmail = staff.filter(s => s.email && s.email.includes('@'));
    if (staffWithEmail.length === 0) {
      toast.error("Aucun membre du personnel avec adresse email valide n'a été trouvé.");
      return;
    }

    if (await confirm({
      title: 'Synchroniser tous les comptes du personnel',
      message: `Voulez-vous générer et activer les comptes d'accès pour les ${staffWithEmail.length} membres du personnel ayant une adresse email ? Le rôle sera automatiquement attribué selon leur poste respectif.`,
      confirmText: 'Lancer la synchronisation',
      variant: 'info'
    })) {
      setIsSyncingStaff(true);
      try {
        const res = await apiFetch('/api/users/sync-staff', { method: 'POST' });
        const data = await res.json();
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.success(`Synchronisation terminée : ${data.created} créés, ${data.updated || 0} mis à jour, ${data.skipped} ignorés/existants.`);
          fetchUsers();
          fetchStaff();
        }
      } catch (err) {
        toast.error("Erreur lors de la synchronisation.");
      } finally {
        setIsSyncingStaff(false);
      }
    }
  };

  const allPostes = React.useMemo(() => {
    const customTitles = customPostes.map(p => p.titre);
    const set = new Set([...DEFAULT_POSTES, ...customTitles]);
    return Array.from(set);
  }, [customPostes]);

  const handleSubmit = (e?: React.FormEvent, force = false) => {
    if (e) e.preventDefault();
    const url = editingMember 
      ? `/api/personnel-administratif/${editingMember.id}` 
      : '/api/personnel-administratif';
    const method = editingMember ? 'PUT' : 'POST';
    const payload = force ? { ...formData, force: true } : formData;

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async res => {
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
        toast.success(editingMember ? 'Membre mis à jour' : 'Membre ajouté avec succès');
        setShowModal(false);

        if (!editingMember && data.username && data.password) {
          setCreatedAccountCredentials({
            fullName: data.fullName || `${formData.prenom} ${formData.nom}`,
            role: data.role || mapPosteToDefaultRole(formData.poste),
            poste: data.poste || formData.poste,
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

        setEditingMember(null);
        resetForm();
        fetchStaff();
      })
      .catch((err) => toast.error(err.message || 'Erreur lors de l\'enregistrement'));
  };

  const handleExecuteImport = (mode: 'all' | 'valid_only') => {
    if (!importAnalysis) return;
    setIsImporting(true);
    apiFetch('/api/personnel-administratif/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personnel: importData, dryRun: false, mode })
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
      fetchStaff();
      toast.success(`${data.count || 0} membre(s) importé(s) avec succès !`);
    })
    .catch(err => {
      setIsImporting(false);
      console.error(err);
      toast.error("Erreur lors de l'importation.");
    });
  };

  const resetForm = () => {
    setFormData({
      matricule: '',
      nom: '',
      prenom: '',
      poste: allPostes[0] || 'Secrétaire',
      telephone: '',
      email: '',
      adresse: '',
      photo: '',
      sexe: 'M',
      date_naissance: '',
      date_embauche: '',
      niveau_etudes: 'Licence',
      diplome: '',
      type_contrat: 'CDI',
      salaire_mensuel: '150000',
      statut: 'Actif'
    });
  };

  const handleEdit = (member: any) => {
    setEditingMember(member);
    setFormData({
      matricule: member.matricule || '',
      nom: member.nom || '',
      prenom: member.prenom || '',
      poste: member.poste || 'Secrétaire',
      telephone: member.telephone || '',
      email: member.email || '',
      adresse: member.adresse || '',
      photo: member.photo || '',
      sexe: member.sexe || 'M',
      date_naissance: member.date_naissance || '',
      date_embauche: member.date_embauche || '',
      niveau_etudes: member.niveau_etudes || 'Licence',
      diplome: member.diplome || '',
      type_contrat: member.type_contrat || 'CDI',
      salaire_mensuel: member.salaire_mensuel ? String(member.salaire_mensuel) : '0',
      statut: member.statut || 'Actif'
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number, name: string) => {
    if (await confirm({
      title: 'Supprimer ce membre',
      message: `Êtes-vous sûr de vouloir supprimer ${name} du personnel administratif ?`,
      confirmText: 'Supprimer',
      variant: 'danger'
    })) {
      apiFetch(`/api/personnel-administratif/${id}`, { method: 'DELETE' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            toast.success('Membre supprimé');
            fetchStaff();
          } else {
            toast.error(data.error || 'Erreur lors de la suppression');
          }
        });
    }
  };

  const handleAddPoste = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosteTitle.trim()) return;
    apiFetch('/api/personnel-postes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titre: newPosteTitle.trim() })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          toast.error(data.error);
        } else {
          toast.success('Nouveau poste ajouté');
          setNewPosteTitle('');
          fetchPostes();
        }
      });
  };

  const handleDeleteCustomPoste = (id: number) => {
    apiFetch(`/api/personnel-postes/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        toast.success('Poste personnalisé supprimé');
        fetchPostes();
      });
  };

  const currentUser = React.useMemo(() => {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }, []);

  const isUserFondeOrAdmin = currentUser?.role === 'admin' || currentUser?.role === 'fondateur';

  const fondeMember = React.useMemo(() => {
    return staff.find(m => m.is_fonde === 1 || m.is_fonde === true || (m.poste && m.poste.toLowerCase().includes('fond')));
  }, [staff]);

  const regularStaff = React.useMemo(() => {
    return staff.filter(m => !(m.is_fonde === 1 || m.is_fonde === true || (m.poste && m.poste.toLowerCase().includes('fond'))));
  }, [staff]);

  const filteredStaff = regularStaff.filter(m => {
    const matchesSearch = (m.nom + ' ' + m.prenom + ' ' + m.poste + ' ' + (m.email || '')).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPoste = !filterPoste || m.poste === filterPoste;
    return matchesSearch && matchesPoste;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-primary-600" size={28} />
            Personnel Administratif
          </h1>
          <p className="text-slate-500 text-sm">
            Gestion des membres de la Direction, Fondé, Secrétariat, Comptabilité, Surveillance et Censeur.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Année :</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
              >
                <option value="all">Toutes les années</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Hidden file input for batch photo import */}
          <input
            type="file"
            ref={batchPhotoInputRef}
            onChange={handleBatchPhotoFilesSelected}
            multiple
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={handleSyncAllStaff}
            disabled={isSyncingStaff}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
            title="Générer et synchroniser les comptes utilisateurs pour tout le personnel"
          >
            <RefreshCw size={18} className={isSyncingStaff ? 'animate-spin' : ''} />
            <span>{isSyncingStaff ? 'Synchronisation...' : 'Synchroniser Comptes'}</span>
          </button>

          <button
            onClick={downloadTemplate}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
            title="Télécharger le modèle Excel"
          >
            <Download size={18} />
            <span className="hidden sm:inline">Modèle Excel</span>
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
          >
            <Upload size={18} />
            <span>Importer Excel</span>
          </button>

          <button
            onClick={handleOpenBatchPhotoPicker}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
            title="Importer des photos (nom_prénoms_matricule)"
          >
            <Camera size={18} />
            <span>
              {selectedStaff.length > 0
                ? `Importer photos (${selectedStaff.length})`
                : 'Importer photos'}
            </span>
          </button>

          <button
            onClick={() => setShowReconduireModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
            title="Reconduire le personnel d'une année scolaire à une autre avec calcul de l'ancienneté"
          >
            <Repeat size={18} />
            <span>
              {selectedStaff.length > 0
                ? `Reconduire personnel (${selectedStaff.length})`
                : 'Reconduire personnel'}
            </span>
          </button>

          <button
            onClick={() => setShowPostesModal(true)}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition-colors"
          >
            <Shield size={18} />
            <span className="hidden sm:inline">Personnaliser Postes</span>
          </button>

          <button
            onClick={() => {
              setEditingMember(null);
              resetForm();
              setShowModal(true);
            }}
            className="bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={18} />
            <span>Nouveau Membre</span>
          </button>
        </div>
      </div>

      {/* Section Spéciale & Planche Distincte du Fondateur */}
      {fondeMember ? (
        <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/40 p-6 rounded-3xl border-2 border-amber-300 shadow-sm relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none text-amber-600">
            <Crown size={160} />
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-2xl shrink-0 border-2 border-amber-300 shadow-md">
                {fondeMember.photo ? (
                  <img src={fondeMember.photo} alt={`${fondeMember.nom} ${fondeMember.prenom}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center">
                    <Crown size={28} className="text-amber-600 mb-0.5" />
                    <span className="text-xs font-black">{fondeMember.nom?.[0] || 'F'}{fondeMember.prenom?.[0] || 'A'}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs">
                    <Crown size={14} />
                    FONDATEUR / ADMI
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                    <ShieldCheck size={13} className="text-amber-700" />
                    Compte Administrateur Principal
                  </span>
                  {fondeMember.matricule && (
                    <span className="text-xs font-mono font-bold bg-white text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200">
                      {fondeMember.matricule}
                    </span>
                  )}
                  {fondeMember.anciennete_texte && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                      <Clock size={12} className="text-indigo-600" />
                      Ancienneté : {fondeMember.anciennete_texte}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-extrabold text-slate-900">
                  {fondeMember.nom} {fondeMember.prenom}
                </h2>

                <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {fondeMember.telephone && (
                    <span className="flex items-center gap-1">
                      <Phone size={13} className="text-amber-600" /> {fondeMember.telephone}
                    </span>
                  )}
                  {fondeMember.email && (
                    <span className="flex items-center gap-1">
                      <Mail size={13} className="text-amber-600" /> {fondeMember.email}
                    </span>
                  )}
                  {fondeMember.niveau_etudes && (
                    <span className="flex items-center gap-1">
                      <Award size={13} className="text-amber-600" /> {fondeMember.niveau_etudes} {fondeMember.diplome ? `(${fondeMember.diplome})` : ''}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-amber-200">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                  Profil Protégé
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">Non soumis aux imports de masse</p>
              </div>

              {isUserFondeOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleEdit(fondeMember)}
                  className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                  title="Modifier les informations du Fondateur"
                >
                  <Edit2 size={14} />
                  <span>Modifier mon profil</span>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        isUserFondeOrAdmin && (
          <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Crown size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Profil du Fondateur non configuré</p>
                <p className="text-xs text-amber-700">Renseignez votre profil dans Paramètres &gt; Mon compte pour afficher automatiquement votre planche officielle.</p>
              </div>
            </div>
            <a
              href="/parametres?tab=account"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl whitespace-nowrap transition-colors"
            >
              Renseigner Mon Profil
            </a>
          </div>
        )
      )}

      {/* Filters & Selection Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher par nom, prénom, poste..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select
              value={filterPoste}
              onChange={e => setFilterPoste(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary-500 transition-all text-sm font-medium text-slate-700 min-w-[200px]"
            >
              <option value="">Tous les postes</option>
              {allPostes.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredStaff.length > 0 && (
          <div className="flex items-center gap-3 self-end sm:self-center">
            <button
              onClick={selectAllStaff}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors"
            >
              {selectedStaff.length === filteredStaff.length ? (
                <>
                  <CheckSquare size={16} className="text-primary-600" />
                  <span>Tout désélectionner</span>
                </>
              ) : (
                <>
                  <Square size={16} className="text-slate-400" />
                  <span>Tout sélectionner ({filteredStaff.length})</span>
                </>
              )}
            </button>

            {selectedStaff.length > 0 && (
              <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1.5 rounded-lg border border-primary-200/50">
                {selectedStaff.length} sélectionné(s)
              </span>
            )}
          </div>
        )}
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStaff.map(member => {
          const isSelected = selectedStaff.includes(member.id);
          return (
            <div 
              key={member.id} 
              className={`bg-white p-6 rounded-2xl border transition-all relative ${
                isSelected ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md' : 'border-slate-100 shadow-xs hover:shadow-md'
              }`}
            >
              {/* Checkbox */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => toggleStaffSelection(member.id)}
                  className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare size={20} className="text-primary-600" />
                  ) : (
                    <Square size={20} className="text-slate-300 hover:text-slate-400" />
                  )}
                </button>
              </div>

              <div className="flex items-start justify-between mb-4 pr-8">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-lg shrink-0 border border-slate-200">
                    {member.photo ? (
                      <img src={member.photo} alt={`${member.nom} ${member.prenom}`} className="w-full h-full object-cover" />
                    ) : (
                      <span>{member.nom?.[0] || ''}{member.prenom?.[0] || ''}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{member.nom} {member.prenom}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-primary-50 text-primary-700 border border-primary-200/60">
                        {member.poste}
                      </span>
                      {member.est_reconduit && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle size={11} />
                          Reconduit
                        </span>
                      )}
                      {member.matricule && (
                        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {member.matricule}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-600 mb-4 border-t border-slate-100 pt-3">
                {member.anciennete_texte && (
                  <div className="flex items-center gap-1.5 text-xs text-indigo-800 bg-indigo-50/80 px-2.5 py-1.5 rounded-xl border border-indigo-100 font-medium">
                    <Clock size={13} className="text-indigo-600 shrink-0" />
                    <span>Ancienneté : <strong className="text-indigo-900 font-bold">{member.anciennete_texte}</strong></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400 shrink-0" />
                  <span>{member.telephone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">{member.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award size={14} className="text-slate-400 shrink-0" />
                  <span>{member.niveau_etudes || 'N/A'} {member.diplome ? `(${member.diplome})` : ''}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500 pt-1">
                  <span>Contrat: <strong>{member.type_contrat}</strong></span>
                  <span>Salaire: <strong className="text-slate-900">{Number(member.salaire_mensuel || 0).toLocaleString()} FCFA</strong></span>
                </div>
              </div>

              {/* User Account Status & Quick Role Chip */}
              {(() => {
                const userAcc = staffUsersMap[member.id];
                const matchedRole = ROLE_OPTIONS.find(r => r.value === (userAcc?.role || mapPosteToDefaultRole(member.poste)));
                return (
                  <div className="mb-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                        userAcc ? (userAcc.approuve ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700') : 'bg-slate-200 text-slate-500'
                      }`}>
                        {userAcc ? <ShieldCheck size={14} /> : <Key size={14} />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-slate-800 truncate flex items-center gap-1.5">
                          <span>Compte :</span>
                          {userAcc ? (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${matchedRole?.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                              {matchedRole ? matchedRole.label.split('/')[0].trim() : userAcc.role}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">Non généré</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {userAcc 
                            ? (userAcc.is_first_login ? `OTP généré (${userAcc.otp_code || 'Actif'})` : 'Compte configuré')
                            : (member.email ? 'Prêt pour création' : 'Email manquant')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenAccountModal(member)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs shrink-0 ${
                        userAcc 
                          ? 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-primary-600 hover:bg-primary-700 text-white'
                      }`}
                    >
                      <Key size={12} />
                      <span>{userAcc ? 'Gérer rôle' : 'Créer compte'}</span>
                    </button>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className={`px-2 py-0.5 rounded-full font-semibold ${
                  member.statut === 'Actif' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {member.statut}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(member)}
                    className="p-1.5 hover:bg-slate-100 text-primary-600 rounded-lg font-bold transition-colors flex items-center gap-1"
                  >
                    <Edit2 size={14} />
                    <span>Modifier</span>
                  </button>
                  <button
                    onClick={() => handleDelete(member.id, `${member.nom} ${member.prenom}`)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg font-bold transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={14} />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredStaff.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
            <Users className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-600 font-medium">Aucun membre du personnel administratif trouvé.</p>
            <p className="text-slate-400 text-xs mt-1">Cliquez sur "Nouveau Membre" pour ajouter un agent.</p>
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b mb-4 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-slate-900">
                {editingMember ? 'Modifier le membre administratif' : 'Nouveau membre du personnel'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Matricule (Optionnel)</label>
                <input
                  type="text"
                  placeholder="ex: ADM-2024-001"
                  value={formData.matricule}
                  onChange={e => setFormData({ ...formData, matricule: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nom *</label>
                  <input
                    required
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prénom *</label>
                  <input
                    required
                    type="text"
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Poste / Fonction *</label>
                  <select
                    value={formData.poste}
                    onChange={e => setFormData({ ...formData, poste: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    {allPostes.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Sexe</label>
                  <select
                    value={formData.sexe}
                    onChange={e => setFormData({ ...formData, sexe: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="M">Masculin (M)</option>
                    <option value="F">Féminin (F)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={e => setFormData({ ...formData, telephone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date de naissance</label>
                  <input
                    type="date"
                    value={formData.date_naissance}
                    onChange={e => setFormData({ ...formData, date_naissance: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Niveau d'études</label>
                  <input
                    type="text"
                    placeholder="ex: Licence, Master..."
                    value={formData.niveau_etudes}
                    onChange={e => setFormData({ ...formData, niveau_etudes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Diplôme</label>
                  <input
                    type="text"
                    placeholder="ex: BTS, BAC+3..."
                    value={formData.diplome}
                    onChange={e => setFormData({ ...formData, diplome: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Date d'embauche (ancienneté)</label>
                  <input
                    type="date"
                    value={formData.date_embauche}
                    onChange={e => setFormData({ ...formData, date_embauche: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Type de Contrat</label>
                  <select
                    value={formData.type_contrat}
                    onChange={e => setFormData({ ...formData, type_contrat: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Vacataire">Vacataire</option>
                    <option value="Stagiaire">Stagiaire</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Statut</label>
                  <select
                    value={formData.statut}
                    onChange={e => setFormData({ ...formData, statut: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Actif">Actif</option>
                    <option value="Inactif">Inactif</option>
                    <option value="En congé">En congé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Salaire Mensuel (FCFA)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.salaire_mensuel}
                    onChange={e => setFormData({ ...formData, salaire_mensuel: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Adresse</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={e => setFormData({ ...formData, adresse: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Positions Modal */}
      {showPostesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b mb-4">
              <h2 className="text-lg font-bold text-slate-900">Personnaliser les Postes Administratifs</h2>
              <button onClick={() => setShowPostesModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddPoste} className="flex gap-2 mb-6">
              <input
                type="text"
                placeholder="Nouveau titre de poste (ex: Intendant)..."
                value={newPosteTitle}
                onChange={e => setNewPosteTitle(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-colors shrink-0"
              >
                Ajouter
              </button>
            </form>

            <div className="space-y-4 max-h-80 overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Postes par défaut</h4>
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_POSTES.map(p => (
                    <span key={p} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Postes personnalisés ajoutés</h4>
                {customPostes.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Aucun poste personnalisé pour l'instant.</p>
                ) : (
                  <div className="space-y-2">
                    {customPostes.map(cp => (
                      <div key={cp.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                        <span className="font-medium text-slate-800">{cp.titre}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomPoste(cp.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl p-6 my-8 overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <FileSpreadsheet size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Importer du personnel administratif</h3>
                  <p className="text-xs text-slate-500">Charger un fichier Excel (.xlsx, .xls)</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportWorkbook(null);
                  setImportData([]);
                  setImportErrors([]);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-700">Format de fichier attendu</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Téléchargez notre modèle type pour éviter toute erreur de format.</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="px-3 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Download size={14} />
                  <span>Modèle Excel</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  1. Sélectionner le fichier Excel
                </label>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                />
              </div>

              {importWorkbook && (
                <div className="space-y-4 pt-4 border-t">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    2. Prévisualiser et valider
                  </label>
                  <button 
                    disabled={isAnalyzingImport}
                    onClick={() => {
                      const firstSheetName = importWorkbook.SheetNames[0];
                      const worksheet = importWorkbook.Sheets[firstSheetName];
                      const json: any[] = XLSX.utils.sheet_to_json(worksheet);
                      
                      const errors: string[] = [];
                      const mappedData = json.map((row: any, index: number) => {
                        const rowNum = index + 2;
                        
                        const getVal = (keys: string[]) => {
                          for (const k of keys) {
                            if (row[k] !== undefined && row[k] !== null) return String(row[k]).trim();
                          }
                          return '';
                        };

                        const nom = getVal(['Nom', 'nom', 'NOM']);
                        const prenom = getVal(['Prénom', 'Prenom', 'prenom', 'PRENOM']);
                        const poste = getVal(['Poste', 'poste', 'POSTE', 'Fonction', 'fonction']) || 'Secrétaire';
                        const telephone = getVal(['Téléphone', 'Telephone', 'telephone', 'TEL', 'Tel']);
                        const email = getVal(['Email', 'email', 'EMAIL', 'E-mail']);

                        if (!nom) errors.push(`Ligne ${rowNum}: Nom manquant`);
                        if (!prenom) errors.push(`Ligne ${rowNum}: Prénom manquant`);

                        return {
                          nom,
                          prenom,
                          poste,
                          sexe: getVal(['Sexe (M/F)', 'Sexe', 'sexe']) || 'M',
                          date_naissance: getVal(['Date de naissance (jj/mm/aaaa)', 'Date de naissance', 'date_naissance']) || '',
                          telephone,
                          email,
                          adresse: getVal(['Adresse', 'adresse']) || '',
                          niveau_etudes: getVal(['Niveau d\'études', 'Niveau d\'etudes', 'niveau_etudes']) || 'Licence',
                          diplome: getVal(['Diplôme', 'Diplome', 'diplome']) || '',
                          type_contrat: getVal(['Type de contrat', 'type_contrat']) || 'CDI',
                          salaire_mensuel: getVal(['Salaire mensuel', 'salaire_mensuel', 'Salaire']) || '150000',
                          statut: getVal(['Statut', 'statut']) || 'Actif'
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
                            Aperçu du contenu du fichier ({importData.length} membre(s)) :
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">Défilez pour voir tout le fichier</span>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-inner bg-white">
                          <table className="w-full text-left text-xs relative">
                            <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 w-10 text-center">#</th>
                                <th className="px-3 py-2">Nom & Prénom</th>
                                <th className="px-3 py-2">Poste</th>
                                <th className="px-3 py-2">Téléphone</th>
                                <th className="px-3 py-2">Email</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importData.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px]">{i + 1}</td>
                                  <td className="px-3 py-2 font-bold text-slate-800">{row.nom} {row.prenom}</td>
                                  <td className="px-3 py-2 font-medium text-emerald-700">{row.poste}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.telephone || '-'}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.email || '-'}</td>
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
                          apiFetch('/api/personnel-administratif/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ personnel: importData, dryRun: true })
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
                          <>Lancer l'importation ({importData.length} membre{importData.length > 1 ? 's' : ''})</>
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
                  entityName="membre du personnel"
                  onContinueAll={() => handleExecuteImport('all')}
                  onContinueValidOnly={() => handleExecuteImport('valid_only')}
                  isSubmitting={isImporting}
                />
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
          targetType="personnel"
          title="Importation de photos - Personnel Administratif"
          description="Les photos sélectionnées sont automatiquement associées par le nom de fichier au format nom_prénoms_matricule."
          initialFiles={batchPhotoFiles}
          entities={
            (selectedStaff.length > 0 
              ? staff.filter((s: any) => selectedStaff.includes(s.id))
              : staff
            ).map((s: any) => ({
              id: s.id,
              nom: s.nom,
              prenom: s.prenom,
              matricule: s.matricule || '',
              photo: s.photo || '',
              subtitle: s.poste ? `Poste : ${s.poste}` : (s.telephone ? `Tél : ${s.telephone}` : undefined)
            }))
          }
          onSuccess={() => {
            fetchStaff();
            setSelectedStaff([]);
          }}
        />
      )}

      {/* User Account & Role Assignment Modal */}
      {accountModalStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-scale-up">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <ShieldCheck size={22} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Attribution de Rôle & Compte</h3>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {accountModalStaff.nom} {accountModalStaff.prenom} • {accountModalStaff.poste}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setAccountModalStaff(null);
                  setAccountCredentials(null);
                }} 
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {/* Member Summary Card */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Identifiant de connexion (Email) :</p>
                  <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                    <Mail size={14} className="text-slate-400" />
                    {accountModalStaff.email || <span className="text-red-500 font-normal italic">Aucun email configuré</span>}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700">
                  Poste : {accountModalStaff.poste}
                </span>
              </div>

              {!accountModalStaff.email ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs text-amber-900">
                    <p className="font-bold mb-1">Email obligatoire pour la création du compte</p>
                    <p>Ce membre n'a pas d'adresse email. Veuillez modifier sa fiche pour renseigner son email avant d'activer son compte.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Role Selector with Visual Radio Cards */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                      Choisir le Rôle & les Privilèges d'Accès :
                    </label>
                    <div className="space-y-2">
                      {ROLE_OPTIONS.map(r => {
                        const isSelected = selectedRole === r.value;
                        return (
                          <label
                            key={r.value}
                            onClick={() => setSelectedRole(r.value)}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-primary-50/70 border-primary-500 ring-2 ring-primary-500/20' 
                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="role"
                              value={r.value}
                              checked={isSelected}
                              onChange={() => setSelectedRole(r.value)}
                              className="mt-0.5 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 text-sm">{r.label}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${r.color}`}>
                                  {r.value.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Credentials / Activation Results */}
                  {accountCredentials && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                        <CheckCircle size={18} className="text-emerald-600" />
                        <span>Compte prêt et identifiants générés !</span>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Email :</span>
                          <span className="font-mono font-bold text-slate-800">{accountCredentials.email}</span>
                        </div>
                        {accountCredentials.temporary_password && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Mot de passe temporaire :</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                              <span>{accountCredentials.temporary_password}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(accountCredentials.temporary_password);
                                  toast.success("Mot de passe copié !");
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700"
                                title="Copier"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                        {accountCredentials.otp_code && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Code d'activation OTP :</span>
                            <div className="flex items-center gap-1.5 font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                              <span>{accountCredentials.otp_code}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(accountCredentials.otp_code);
                                  toast.success("Code OTP copié !");
                                }}
                                className="p-1 text-amber-600 hover:text-amber-800"
                                title="Copier"
                              >
                                <Copy size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">Rôle attribué :</span>
                          <span className="font-bold text-primary-700 uppercase">{accountCredentials.role}</span>
                        </div>
                      </div>

                      <p className="text-[11px] text-emerald-800">
                        {accountCredentials.emailSent 
                          ? "✅ Les instructions et le lien d'activation ont été envoyés par email à l'utilisateur."
                          : "Transmettez ces informations à l'agent ou fournissez-lui le code OTP pour finaliser son premier accès."}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountModalStaff(null);
                        setAccountCredentials(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingAccount}
                      onClick={() => handleGenerateStaffAccount(accountModalStaff)}
                      className="flex-[2] py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                      {isGeneratingAccount ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          <span>Génération en cours...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          <span>{accountCredentials ? 'Régénérer / Mettre à jour' : 'Activer & Attribuer Rôle'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
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
          entityName="membre du personnel"
          onContinueAll={() => {
            setSingleSuspectDuplicate(null);
            handleSubmit(undefined, true);
          }}
        />
      )}

      {/* Modal de Reconduction du Personnel Administratif */}
      <ReconduirePersonnelModal
        isOpen={showReconduireModal}
        onClose={() => setShowReconduireModal(false)}
        onSuccess={() => {
          fetchStaff();
          setSelectedStaff([]);
        }}
        selectedStaff={selectedStaff}
        allStaff={staff}
      />
    </div>
  );
}
