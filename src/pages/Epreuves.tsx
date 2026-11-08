import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpenCheck, 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Edit3, 
  Trash2, 
  Eye, 
  X, 
  Send, 
  FileCode, 
  ShieldAlert, 
  Lock,
  Layers,
  GraduationCap,
  Calendar,
  Check,
  RotateCcw,
  Sparkles,
  Info,
  School,
  BookOpen,
  UserCheck,
  Bookmark,
  BookmarkCheck,
  FileSpreadsheet,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronRight,
  Star,
  CheckSquare,
  Tag,
  ExternalLink,
  Printer,
  AlertCircle
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { isPrimarySubject } from '../utils/subjectCatalog';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';

interface EpreuvesProps {
  cycleProp?: 'primaire' | 'secondaire' | 'tous';
}

interface Epreuve {
  id: number;
  titre: string;
  cycle: string;
  classe_id: number | null;
  classe_nom: string | null;
  nom_classe_associee?: string;
  niveau: string | null;
  matiere_id: number | null;
  matiere_nom: string;
  nom_matiere_associee?: string;
  type_evaluation: string;
  trimestre: number;
  annee_id: number | null;
  annee_libelle: string | null;
  annee_scolaire_libelle?: string | null;
  annee_ajout_libelle?: string | null;
  est_annee_anterieure?: boolean;
  mention_annee?: string;
  duree_minutes: number;
  coefficient: number;
  bareme: number;
  consignes: string | null;
  fichier_epreuve_url: string;
  fichier_epreuve_nom: string;
  fichier_epreuve_type: string;
  fichier_corrige_url: string | null;
  fichier_corrige_nom: string | null;
  enseignant_id: number | null;
  enseignant_nom: string;
  enseignant_telephone?: string;
  utilisateur_id: number;
  auteur_compte_nom?: string;
  auteur_email?: string;
  statut: 'en_attente' | 'validee' | 'rejetee';
  motif_rejet: string | null;
  analyse_par: number | null;
  analyste_nom: string | null;
  date_analyse: string | null;
  date_soumission: string;
  school_id: number;
}

export const TYPES_EVAL_PRIMAIRE = [
  { id: 'all', label: 'Toutes les évaluations' },
  { id: 'mensuelle', label: 'Évaluation Mensuelle (Standard)' },
  { id: 'mensuelle_1', label: 'Évaluation Mensuelle N°1' },
  { id: 'mensuelle_2', label: 'Évaluation Mensuelle N°2' },
  { id: 'mensuelle_3', label: 'Évaluation Mensuelle N°3' },
  { id: 'mensuelle_4', label: 'Évaluation Mensuelle N°4' },
  { id: 'mensuelle_5', label: 'Évaluation Mensuelle N°5' },
  { id: 'mensuelle_6', label: 'Évaluation Mensuelle N°6' },
  { id: 'sommative', label: 'Évaluation Sommative (Bilan d\'étape)' },
  { id: 'composition', label: 'Composition Trimestrielle' },
  { id: 'examen_blanc', label: 'Examen Blanc (CEP - Certificat d\'Études Primaires)' },
  { id: 'formative', label: 'Évaluation Formative (Contrôle continu)' },
  { id: 'diagnostique', label: 'Évaluation Diagnostique (Début d\'année)' },
  { id: 'bilan_etape', label: 'Bilan Périodique de Compétences' },
  { id: 'autre', label: 'Autre Évaluation Primaire' }
];

export const TYPES_EVAL_SECONDAIRE = [
  { id: 'all', label: 'Tous les devoirs & compositions' },
  { id: 'interrogation', label: 'Interrogation Écrite (Contrôle flash / court)' },
  { id: 'mini_devoir', label: 'Mini-Devoir (Bilan de cours)' },
  { id: 'devoir_1', label: 'Devoir Surveillé N°1 (DS1)' },
  { id: 'devoir_2', label: 'Devoir Surveillé N°2 (DS2)' },
  { id: 'devoir_3', label: 'Devoir Surveillé N°3 (DS3)' },
  { id: 'composition', label: 'Composition Trimestrielle' },
  { id: 'examen_blanc_bepc', label: 'Examen Blanc (BEPC - Classe de 3ème)' },
  { id: 'examen_blanc_bac', label: 'Examen Blanc (BAC - Classes de Terminale)' },
  { id: 'examen_blanc', label: 'Examen Blanc Général' },
  { id: 'tp', label: 'Travaux Pratiques / Épreuve Expérimentale (TP)' },
  { id: 'epreuve_commune', label: 'Devoir Départemental / Épreuve Commune' },
  { id: 'autre', label: 'Autre Évaluation Secondaire' }
];

export const Epreuves: React.FC<EpreuvesProps> = ({ cycleProp = 'tous' }) => {
  const { t } = useTranslation();
  const { years, selectedYearId: globalSelectedYearId } = useAuth();
  const [epreuves, setEpreuves] = useState<Epreuve[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'toutes' | 'mes_soumissions' | 'mes_en_attente' | 'mes_validees' | 'mes_rejetees' | 'a_analyser' | 'banque' | 'rejetees'>('toutes');
  const [selectedCycle, setSelectedCycle] = useState(cycleProp);
  const [selectedTypeEval, setSelectedTypeEval] = useState('all');
  const [selectedStatut, setSelectedStatut] = useState('all');
  const [selectedYearIdFilter, setSelectedYearIdFilter] = useState<string | number>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupBy, setGroupBy] = useState<'none' | 'matiere' | 'classe' | 'type_eval' | 'trimestre' | 'composition' | 'annee'>('none');
  const [selectedMatiereFilter, setSelectedMatiereFilter] = useState('all');
  const [selectedClasseFilter, setSelectedClasseFilter] = useState('all');
  const [selectedTrimestreFilter, setSelectedTrimestreFilter] = useState('all');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Retenir workflow states
  const [isRetenirModalOpen, setIsRetenirModalOpen] = useState(false);
  const [selectedEpreuveForRetenir, setSelectedEpreuveForRetenir] = useState<Epreuve | null>(null);
  const [retainedEpreuvesMap, setRetainedEpreuvesMap] = useState<Record<number, any>>({});
  const [submittingRetenir, setSubmittingRetenir] = useState(false);
  const [retenirFormData, setRetenirFormData] = useState({
    session_nom: 'Composition Trimestre 1',
    trimestre: 1,
    date_composition: new Date().toISOString().split('T')[0],
    heure_debut: '08:00',
    heure_fin: '10:00',
    duree_minutes: 120,
    salle: 'Toutes les salles',
    surveillants: '',
    nombre_copies_prevues: 50,
    statut_tirage: 'en_attente',
    consignes_secretariat: ''
  });
  
  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    validees: 0,
    rejetees: 0,
    mes_en_attente: 0,
    mes_rejetees: 0
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [enseignantsList, setEnseignantsList] = useState<any[]>([]);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAnalyseModalOpen, setIsAnalyseModalOpen] = useState(false);
  const [selectedEpreuveForAnalyse, setSelectedEpreuveForAnalyse] = useState<Epreuve | null>(null);
  const [editingEpreuve, setEditingEpreuve] = useState<Epreuve | null>(null);
  const [viewingEpreuve, setViewingEpreuve] = useState<Epreuve | null>(null);

  // Custom input toggles in modal
  const [customClasseInput, setCustomClasseInput] = useState(false);
  const [customMatiereInput, setCustomMatiereInput] = useState(false);

  // Analysis form state
  const [analyseAction, setAnalyseAction] = useState<'valider' | 'rejeter'>('valider');
  const [motifRejet, setMotifRejet] = useState('');
  const [submittingAnalyse, setSubmittingAnalyse] = useState(false);

  // Submission Form state
  const [formData, setFormData] = useState({
    titre: '',
    cycle: cycleProp === 'primaire' ? 'primaire' : 'secondaire',
    classe_id: null as number | null,
    classe_nom: '',
    niveau: '',
    matiere_id: null as number | null,
    matiere_nom: '',
    type_evaluation: cycleProp === 'primaire' ? 'mensuelle' : 'devoir_1',
    trimestre: 1,
    duree_minutes: cycleProp === 'primaire' ? 60 : 120,
    coefficient: 1,
    bareme: 20,
    consignes: '',
    fichier_epreuve_url: '',
    fichier_epreuve_nom: '',
    fichier_epreuve_type: 'pdf',
    fichier_corrige_url: '',
    fichier_corrige_nom: '',
    enseignant_nom: '',
    enseignant_id: null as number | null,
    statut_direct: 'en_attente',
    resubmit: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [classesList, setClassesList] = useState<any[]>([]);
  const [matieresList, setMatieresList] = useState<any[]>([]);
  const [modalSubLevelFilter, setModalSubLevelFilter] = useState<string>('all');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        if (u.role === 'enseignant') {
          setActiveTab('mes_soumissions');
        }
        setFormData(prev => ({
          ...prev,
          enseignant_nom: u.nom || 'Enseignant',
          enseignant_id: u.enseignant_id || null
        }));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role === 'parent' || currentUser?.role === 'eleve') {
      return; // Handled by security screen
    }
    fetchEpreuves();
    fetchStats();
    fetchClassesAndMatieres();
    fetchEnseignants();
    fetchRetainedCompositions();
  }, [selectedCycle, selectedTypeEval, selectedStatut, selectedYearIdFilter, activeTab]);

  const fetchRetainedCompositions = async () => {
    try {
      const res = await apiFetch('/api/epreuves-composition');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const map: Record<number, any> = {};
          data.forEach((c: any) => {
            if (c.epreuve_id) {
              map[c.epreuve_id] = c;
            }
          });
          setRetainedEpreuvesMap(map);
        }
      }
    } catch (e) {
      console.error("Error fetching retained exams map:", e);
    }
  };

  const fetchEnseignants = async () => {
    try {
      const res = await apiFetch('/api/enseignants');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEnseignantsList(data);
          // If currentUser is teacher, locate their teacher record
          if (currentUser?.enseignant_id) {
            const found = data.find((e: any) => e.id === currentUser.enseignant_id);
            if (found) setCurrentTeacher(found);
          } else if (currentUser?.role === 'enseignant') {
            const found = data.find((e: any) => 
              (e.email && e.email.toLowerCase() === (currentUser.email || '').toLowerCase()) ||
              (e.nom && currentUser.nom && e.nom.toLowerCase().includes(currentUser.nom.toLowerCase()))
            );
            if (found) setCurrentTeacher(found);
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEpreuves = async () => {
    try {
      setLoading(true);
      let filterParam = 'all';
      const isTeacherUser = currentUser?.role === 'enseignant';
      
      if (isTeacherUser || activeTab === 'mes_soumissions' || activeTab === 'mes_en_attente' || activeTab === 'mes_validees' || activeTab === 'mes_rejetees') {
        filterParam = 'my_submissions';
      } else if (activeTab === 'banque') {
        filterParam = 'bank';
      } else if (activeTab === 'retenues') {
        filterParam = 'retained';
      } else if (activeTab === 'a_analyser') {
        filterParam = 'all';
      }

      let url = `/api/epreuves?cycle=${selectedCycle}&type_evaluation=${selectedTypeEval}&filter=${filterParam}&annee_id=${selectedYearIdFilter}`;
      
      if (isTeacherUser) {
        if (activeTab === 'mes_en_attente') {
          url += `&statut=en_attente`;
        } else if (activeTab === 'mes_validees') {
          url += `&statut=validee`;
        } else if (activeTab === 'mes_rejetees') {
          url += `&statut=rejetee`;
        } else if (selectedStatut !== 'all') {
          url += `&statut=${selectedStatut}`;
        }
      } else {
        if (activeTab === 'a_analyser') {
          url += `&statut=en_attente`;
        } else if (activeTab === 'banque') {
          url += `&statut=validee`;
        } else if (activeTab === 'rejetees') {
          url += `&statut=rejetee`;
        } else if (selectedStatut !== 'all') {
          url += `&statut=${selectedStatut}`;
        }
      }

      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setEpreuves(data);
        } else {
          setEpreuves([]);
        }
      } else {
        setEpreuves([]);
      }
    } catch (err: any) {
      console.error("Error fetching exams:", err);
      setEpreuves([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch(`/api/epreuves/stats?cycle=${selectedCycle}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          setStats(data);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClassesAndMatieres = async () => {
    try {
      const resC = await apiFetch('/api/classes');
      if (resC.ok) {
        const c = await resC.json();
        if (Array.isArray(c)) setClassesList(c);
      }
      const resM = await apiFetch('/api/matieres');
      if (resM.ok) {
        const m = await resM.json();
        if (Array.isArray(m)) setMatieresList(m);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEpreuves();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isCorrige = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const reader = new FileReader();
    reader.onload = (event) => {
      if (isCorrige) {
        setFormData(prev => ({
          ...prev,
          fichier_corrige_url: event.target?.result as string,
          fichier_corrige_nom: file.name
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          fichier_epreuve_url: event.target?.result as string,
          fichier_epreuve_nom: file.name,
          fichier_epreuve_type: ext === 'doc' || ext === 'docx' ? 'docx' : 'pdf'
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitEpreuve = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.titre.trim() || !formData.matiere_nom.trim() || !formData.fichier_epreuve_url) {
      setErrorMsg('Veuillez renseigner le titre, la matière et joindre le fichier de l\'épreuve (Word ou PDF).');
      return;
    }

    try {
      setSubmitting(true);
      if (editingEpreuve) {
        const res = await apiFetch(`/api/epreuves/${editingEpreuve.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            ...formData,
            resubmit: formData.resubmit
          })
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Erreur lors de la mise à jour.');
        }
        setSuccessMsg(formData.resubmit 
          ? 'Épreuve corrigée et re-soumise pour analyse avec succès !' 
          : 'Épreuve mise à jour avec succès.');
      } else {
        const res = await apiFetch('/api/epreuves', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Erreur lors de la soumission.');
        }
        setSuccessMsg(formData.statut_direct === 'validee' 
          ? 'Épreuve enregistrée directement dans la banque d\'épreuves.' 
          : 'Votre épreuve a été soumise avec succès ! Elle s\'affiche directement dans vos dépôts et la notification a été envoyée au personnel d\'analyse.');
      }

      setIsSubmitModalOpen(false);
      setEditingEpreuve(null);
      resetForm();

      if (isTeacher) {
        setActiveTab('mes_soumissions');
      }

      await fetchEpreuves();
      await fetchStats();
      // Instantly dispatch notification update across all components
      window.dispatchEvent(new CustomEvent('refresh_notifications'));
    } catch (err: any) {
      setErrorMsg(err.message || "Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRetenirModal = (epreuve: Epreuve) => {
    setSelectedEpreuveForRetenir(epreuve);
    
    // Suggest default session name based on trimester and evaluation type
    let defaultSession = `Composition Trimestre ${epreuve.trimestre || 1}`;
    if (epreuve.type_evaluation === 'examen_blanc_bepc') {
      defaultSession = 'Examen Blanc BEPC';
    } else if (epreuve.type_evaluation === 'examen_blanc_bac') {
      defaultSession = 'Examen Blanc BAC';
    } else if (epreuve.type_evaluation === 'examen_blanc') {
      defaultSession = epreuve.cycle === 'primaire' ? 'Examen Blanc CEP' : 'Examen Blanc Général';
    } else if (epreuve.type_evaluation.includes('devoir')) {
      defaultSession = `Devoir Commun Synthèse Trimestre ${epreuve.trimestre || 1}`;
    }

    setRetenirFormData({
      session_nom: defaultSession,
      trimestre: epreuve.trimestre || 1,
      date_composition: new Date().toISOString().split('T')[0],
      heure_debut: '08:00',
      heure_fin: '10:00',
      duree_minutes: epreuve.duree_minutes || 120,
      salle: 'Toutes les salles de composition',
      surveillants: '',
      nombre_copies_prevues: 50,
      statut_tirage: 'en_attente',
      consignes_secretariat: epreuve.consignes || ''
    });
    setErrorMsg('');
    setIsRetenirModalOpen(true);
  };

  const handleConfirmRetenir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEpreuveForRetenir) return;

    if (!retenirFormData.session_nom.trim()) {
      setErrorMsg('Veuillez indiquer le nom de la session de composition (ex: Composition Trimestre 1).');
      return;
    }

    try {
      setSubmittingRetenir(true);
      setErrorMsg('');

      const res = await apiFetch('/api/epreuves-composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epreuve_id: selectedEpreuveForRetenir.id,
          session_nom: retenirFormData.session_nom.trim(),
          trimestre: retenirFormData.trimestre,
          date_composition: retenirFormData.date_composition,
          heure_debut: retenirFormData.heure_debut,
          heure_fin: retenirFormData.heure_fin,
          duree_minutes: retenirFormData.duree_minutes,
          salle: retenirFormData.salle,
          surveillants: retenirFormData.surveillants,
          nombre_copies_prevues: retenirFormData.nombre_copies_prevues,
          statut_tirage: retenirFormData.statut_tirage,
          consignes_secretariat: retenirFormData.consignes_secretariat
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de l\'enregistrement dans les épreuves retenues.');
      }

      setSuccessMsg(`L'épreuve "${selectedEpreuveForRetenir.titre}" a été retenue avec succès pour la session "${retenirFormData.session_nom}". Elle est maintenant accessible dans l'espace confidentiel de composition.`);
      setIsRetenirModalOpen(false);
      setSelectedEpreuveForRetenir(null);
      await fetchRetainedCompositions();
      window.dispatchEvent(new CustomEvent('refresh_notifications'));
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmittingRetenir(false);
    }
  };

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const teacherCycle = useMemo(() => {
    if (!currentUser || currentUser.role !== 'enseignant') {
      if (cycleProp === 'primaire') return 'primaire';
      if (cycleProp === 'secondaire') return 'secondaire';
      return null;
    }

    // Check teacher record cycle
    if (currentTeacher?.cycle) {
      const c = currentTeacher.cycle.toLowerCase();
      if (c === 'primaire' || c === 'maternelle') return 'primaire';
      if (c === 'secondaire') return 'secondaire';
    }

    // Check user record cycle
    if (currentUser?.cycle) {
      const c = currentUser.cycle.toLowerCase();
      if (c === 'primaire' || c === 'maternelle') return 'primaire';
      if (c === 'secondaire') return 'secondaire';
    }

    // Inspect classes assigned if cycle is not explicit
    const allClassNames = `${currentTeacher?.classes_noms || ''} ${currentTeacher?.classe_titulaire_nom || ''} ${currentUser?.classes_noms || ''}`.toLowerCase();
    if (allClassNames.trim()) {
      const primaryKeywords = ['ci', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', 'maternelle', 'sil', 'm1', 'm2'];
      const secondaryKeywords = ['6eme', '6ème', '5eme', '5ème', '4eme', '4ème', '3eme', '3ème', '2nde', 'seconde', '1ere', '1ère', 'premiere', 'tle', 'terminale', 'college', 'lycee'];
      
      const hasPrimary = primaryKeywords.some(kw => allClassNames.includes(kw));
      const hasSecondary = secondaryKeywords.some(kw => allClassNames.includes(kw));
      if (hasPrimary && !hasSecondary) return 'primaire';
      if (hasSecondary && !hasPrimary) return 'secondaire';
    }

    // Inspect subjects (e.g. secondary disciplines)
    const allSubjects = `${currentTeacher?.matieres_noms || ''} ${currentUser?.matieres_noms || ''}`.toLowerCase();
    if (allSubjects.trim()) {
      const secondaryKeywords = ['math', 'physique', 'chimie', 'pct', 'svt', 'anglais', 'français', 'francais', 'histoire', 'geo', 'philosophie', 'allemand', 'espagnol', 'eps', 'ses'];
      if (secondaryKeywords.some(kw => allSubjects.includes(kw))) return 'secondaire';
    }

    // Fallback to cycleProp or default to 'secondaire' for teachers
    if (cycleProp === 'primaire') return 'primaire';
    return 'secondaire';
  }, [currentUser, currentTeacher, cycleProp]);

  // Extract classes assigned to current teacher
  const teacherAssignedClasses = useMemo(() => {
    if (!currentTeacher) return [];
    const assignedNames = new Set<string>();
    if (currentTeacher.classe_titulaire_nom) {
      currentTeacher.classe_titulaire_nom.split(',').forEach((n: string) => assignedNames.add(n.trim()));
    }
    if (currentTeacher.classes_noms) {
      currentTeacher.classes_noms.split(',').forEach((n: string) => assignedNames.add(n.trim()));
    }

    const matchedClasses: any[] = [];
    classesList.forEach((c: any) => {
      if (assignedNames.has(c.nom) || c.enseignant_id === currentTeacher.id || c.prof_principal_id === currentTeacher.id) {
        matchedClasses.push(c);
      }
    });

    // Also include any raw class name strings not in classesList
    assignedNames.forEach(name => {
      if (name && !matchedClasses.some(c => c.nom.toLowerCase() === name.toLowerCase())) {
        matchedClasses.push({ id: null, nom: name, niveau: '' });
      }
    });

    const activeCycle = formData.cycle || teacherCycle;
    if (activeCycle) {
      return matchedClasses.filter((c: any) => {
        const nom = (c.nom || '').toLowerCase();
        const niveau = (c.niveau || '').toLowerCase();
        const isPri = ['maternelle', 'primaire', 'ci', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', 'sil'].some(
          lvl => niveau.includes(lvl) || nom.includes(lvl)
        );
        return activeCycle === 'primaire' ? isPri : !isPri;
      });
    }

    return matchedClasses;
  }, [currentTeacher, classesList, formData.cycle, teacherCycle]);

  // Extract subjects assigned to current teacher
  const teacherAssignedSubjects = useMemo(() => {
    if (!currentTeacher) return [];
    const assignedNames = new Set<string>();
    if (currentTeacher.matieres_noms) {
      currentTeacher.matieres_noms.split(',').forEach((n: string) => assignedNames.add(n.trim()));
    }

    const matchedMatieres: any[] = [];
    matieresList.forEach((m: any) => {
      if (assignedNames.has(m.nom) || assignedNames.has(m.code)) {
        matchedMatieres.push(m);
      }
    });

    // Also include raw subject names
    assignedNames.forEach(name => {
      if (name && !matchedMatieres.some(m => m.nom.toLowerCase() === name.toLowerCase())) {
        matchedMatieres.push({ id: null, nom: name, categorie: '' });
      }
    });

    const activeCycle = formData.cycle || teacherCycle;
    if (activeCycle) {
      return matchedMatieres.filter((m: any) => {
        const isPri = isPrimarySubject(m);
        return activeCycle === 'primaire' ? isPri : !isPri;
      });
    }

    return matchedMatieres;
  }, [currentTeacher, matieresList, formData.cycle, teacherCycle]);

  const isPrimaryFormCycle = formData.cycle === 'primaire';

  const filteredFormClasses = useMemo(() => {
    if (!Array.isArray(classesList)) return [];
    return classesList.filter((c: any) => {
      const nom = (c.nom || '').toLowerCase();
      const niveau = (c.niveau || '').toLowerCase();
      const isPri = ['maternelle', 'primaire', 'ci', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', 'sil'].some(
        lvl => niveau.includes(lvl) || nom.includes(lvl)
      );

      if (isPrimaryFormCycle) {
        if (!isPri) return false;
        if (modalSubLevelFilter === 'maternelle') {
          return nom.includes('mat') || niveau.includes('mat') || nom.includes('petite') || nom.includes('grande');
        }
        if (modalSubLevelFilter === 'ci_cp') {
          return nom.includes('ci') || nom.includes('cp') || niveau.includes('ci') || niveau.includes('cp');
        }
        if (modalSubLevelFilter === 'ce') {
          return nom.includes('ce1') || nom.includes('ce2') || niveau.includes('ce');
        }
        if (modalSubLevelFilter === 'cm') {
          return nom.includes('cm1') || nom.includes('cm2') || niveau.includes('cm');
        }
        return true;
      } else {
        if (isPri) return false;
        if (modalSubLevelFilter === 'college') {
          return ['6', '5', '4', '3', 'sixi', 'cinq', 'quatr', 'trois', 'premier cycle'].some(k => nom.includes(k) || niveau.includes(k));
        }
        if (modalSubLevelFilter === 'lycee') {
          return ['2nd', 'seconde', '1ere', '1ère', 'premiere', 'tle', 'terminale', 'second cycle'].some(k => nom.includes(k) || niveau.includes(k));
        }
        return true;
      }
    });
  }, [classesList, isPrimaryFormCycle, modalSubLevelFilter]);

  const filteredFormMatieres = useMemo(() => {
    if (!Array.isArray(matieresList)) return [];
    return matieresList.filter((m: any) => {
      const isPri = isPrimarySubject(m);
      return isPrimaryFormCycle ? isPri : !isPri;
    });
  }, [matieresList, isPrimaryFormCycle]);

  // Smart Title Generator
  const generateSmartTitle = (overrides?: Partial<typeof formData>) => {
    const data = { ...formData, ...(overrides || {}) };
    const list = data.cycle === 'secondaire' ? TYPES_EVAL_SECONDAIRE : TYPES_EVAL_PRIMAIRE;
    const evalObj = list.find(t => t.id === data.type_evaluation);
    let evalLabel = evalObj ? evalObj.label : 'Évaluation';

    // Clean up label for title formatting
    if (evalLabel.includes('(')) {
      evalLabel = evalLabel.split('(')[0].trim();
    }

    const matiere = data.matiere_nom ? data.matiere_nom.trim() : '';
    const classe = data.classe_nom ? data.classe_nom.trim() : '';
    const trimestreStr = `${data.trimestre}er Trimestre`;
    const trimestreFormatted = data.trimestre === 1 ? '1er Trimestre' : `${data.trimestre}ème Trimestre`;

    if (data.type_evaluation === 'examen_blanc_bepc') {
      return matiere ? `Examen Blanc BEPC — Épreuve de ${matiere}${classe ? ` (${classe})` : ''}` : `Examen Blanc BEPC (Classe de 3ème)`;
    }
    if (data.type_evaluation === 'examen_blanc_bac') {
      return matiere ? `Examen Blanc BAC — Épreuve de ${matiere}${classe ? ` (${classe})` : ''}` : `Examen Blanc BAC (Terminale)`;
    }
    if (data.type_evaluation === 'examen_blanc' && data.cycle === 'primaire') {
      return matiere ? `Examen Blanc CEP — Épreuve de ${matiere}${classe ? ` (${classe})` : ''}` : `Examen Blanc CEP (CM2)`;
    }
    if (data.type_evaluation === 'tp') {
      return matiere ? `Épreuve de Travaux Pratiques (TP) de ${matiere}${classe ? ` — ${classe}` : ''}` : `Épreuve de Travaux Pratiques`;
    }
    if (data.type_evaluation === 'interrogation') {
      return matiere ? `Interrogation Écrite de ${matiere}${classe ? ` — ${classe}` : ''} (${trimestreFormatted})` : `Interrogation Écrite (${trimestreFormatted})`;
    }

    let titleParts: string[] = [];
    if (matiere) {
      titleParts.push(`${evalLabel} de ${matiere}`);
    } else {
      titleParts.push(evalLabel);
    }

    if (classe) {
      titleParts.push(classe.startsWith('Classe') ? classe : `Classe de ${classe}`);
    }

    titleParts.push(`(${trimestreFormatted})`);

    return titleParts.join(' — ');
  };

  const resetForm = (cycleOverride?: 'primaire' | 'secondaire') => {
    const determinedCycle = cycleOverride || teacherCycle || (selectedCycle === 'primaire' ? 'primaire' : 'secondaire');
    const defaultEval = determinedCycle === 'secondaire' ? 'devoir_1' : 'mensuelle';

    // Auto pick teacher assigned first class and subject if available
    let initialClasseId: number | null = null;
    let initialClasseNom = '';
    let initialNiveau = '';
    let initialMatiereId: number | null = null;
    let initialMatiereNom = '';

    if (teacherAssignedClasses.length === 1) {
      initialClasseId = teacherAssignedClasses[0].id || null;
      initialClasseNom = teacherAssignedClasses[0].nom || '';
      initialNiveau = teacherAssignedClasses[0].niveau || '';
    }
    if (teacherAssignedSubjects.length === 1) {
      initialMatiereId = teacherAssignedSubjects[0].id || null;
      initialMatiereNom = teacherAssignedSubjects[0].nom || '';
    }
    
    const initialData = {
      titre: '',
      cycle: determinedCycle,
      classe_id: initialClasseId,
      classe_nom: initialClasseNom,
      niveau: initialNiveau,
      matiere_id: initialMatiereId,
      matiere_nom: initialMatiereNom,
      type_evaluation: defaultEval,
      trimestre: 1,
      duree_minutes: determinedCycle === 'secondaire' ? 120 : 60,
      coefficient: 1,
      bareme: 20,
      consignes: '',
      fichier_epreuve_url: '',
      fichier_epreuve_nom: '',
      fichier_epreuve_type: 'pdf',
      fichier_corrige_url: '',
      fichier_corrige_nom: '',
      enseignant_nom: currentTeacher ? `${currentTeacher.nom} ${currentTeacher.prenom || ''}`.trim() : (currentUser?.nom || 'Enseignant'),
      enseignant_id: currentTeacher?.id || currentUser?.enseignant_id || null,
      statut_direct: 'en_attente',
      resubmit: false
    };

    if (initialMatiereNom || initialClasseNom) {
      initialData.titre = generateSmartTitle(initialData);
    }

    setFormData(initialData);
    setModalSubLevelFilter('all');
    setCustomClasseInput(false);
    setCustomMatiereInput(false);
    setErrorMsg('');
  };

  const handleCycleChangeInModal = (newCycle: 'primaire' | 'secondaire') => {
    setModalSubLevelFilter('all');
    setFormData(prev => {
      const next = {
        ...prev,
        cycle: newCycle,
        type_evaluation: newCycle === 'secondaire' ? 'devoir_1' : 'mensuelle',
        duree_minutes: newCycle === 'secondaire' ? 120 : 60,
        classe_id: null,
        classe_nom: '',
        matiere_id: null,
        matiere_nom: ''
      };
      next.titre = generateSmartTitle(next);
      return next;
    });
  };

  const handleTypeEvalChange = (newType: string) => {
    let suggestedDuree = formData.duree_minutes;
    let suggestedCoef = formData.coefficient;
    let suggestedBareme = formData.bareme;

    if (newType === 'interrogation') {
      suggestedDuree = 20;
      suggestedCoef = 1;
    } else if (newType === 'mini_devoir') {
      suggestedDuree = 45;
      suggestedCoef = 1;
    } else if (newType.startsWith('devoir_')) {
      suggestedDuree = 120;
      suggestedCoef = 2;
    } else if (newType === 'composition') {
      suggestedDuree = formData.cycle === 'secondaire' ? 180 : 120;
      suggestedCoef = 2;
    } else if (newType.startsWith('examen_blanc')) {
      suggestedDuree = formData.cycle === 'secondaire' ? 240 : 120;
      suggestedCoef = 3;
    } else if (newType === 'tp') {
      suggestedDuree = 90;
      suggestedCoef = 1;
    } else if (newType.startsWith('mensuelle') || newType === 'sommative') {
      suggestedDuree = 60;
      suggestedCoef = 1;
    }

    setFormData(prev => {
      const next = {
        ...prev,
        type_evaluation: newType,
        duree_minutes: suggestedDuree,
        coefficient: suggestedCoef,
        bareme: suggestedBareme
      };
      if (!prev.titre || prev.titre.includes('—') || prev.titre.includes('Devoir') || prev.titre.includes('Évaluation')) {
        next.titre = generateSmartTitle(next);
      }
      return next;
    });
  };

  const handleEdit = (epreuve: Epreuve, isResubmit = false) => {
    setEditingEpreuve(epreuve);
    setFormData({
      titre: epreuve.titre,
      cycle: epreuve.cycle,
      classe_id: epreuve.classe_id || null,
      classe_nom: epreuve.classe_nom || '',
      niveau: epreuve.niveau || '',
      matiere_id: epreuve.matiere_id || null,
      matiere_nom: epreuve.matiere_nom,
      type_evaluation: epreuve.type_evaluation,
      trimestre: epreuve.trimestre || 1,
      duree_minutes: epreuve.duree_minutes || 60,
      coefficient: epreuve.coefficient || 1,
      bareme: epreuve.bareme || 20,
      consignes: epreuve.consignes || '',
      fichier_epreuve_url: epreuve.fichier_epreuve_url,
      fichier_epreuve_nom: epreuve.fichier_epreuve_nom,
      fichier_epreuve_type: epreuve.fichier_epreuve_type || 'pdf',
      fichier_corrige_url: epreuve.fichier_corrige_url || '',
      fichier_corrige_nom: epreuve.fichier_corrige_nom || '',
      enseignant_nom: epreuve.enseignant_nom,
      enseignant_id: epreuve.enseignant_id || null,
      statut_direct: 'en_attente',
      resubmit: isResubmit
    });
    setIsSubmitModalOpen(true);
  };

  const handleOpenAnalyse = (epreuve: Epreuve) => {
    setSelectedEpreuveForAnalyse(epreuve);
    setAnalyseAction('valider');
    setMotifRejet('');
    setIsAnalyseModalOpen(true);
  };

  const handleConfirmAnalyse = async () => {
    if (!selectedEpreuveForAnalyse) return;
    if (analyseAction === 'rejeter' && !motifRejet.trim()) {
      alert("Veuillez indiquer le motif du rejet pour expliciter les corrections demandées à l'enseignant.");
      return;
    }

    try {
      setSubmittingAnalyse(true);
      await apiFetch(`/api/epreuves/${selectedEpreuveForAnalyse.id}/analyser`, {
        method: 'PUT',
        body: JSON.stringify({
          action: analyseAction,
          motif_rejet: motifRejet
        })
      });

      setSuccessMsg(analyseAction === 'valider' 
        ? `L'épreuve "${selectedEpreuveForAnalyse.titre}" a été validée et enregistrée dans la banque d'épreuves.` 
        : `L'épreuve "${selectedEpreuveForAnalyse.titre}" a été rejetée. L'enseignant a reçu une notification immédiate avec vos motifs.`);
      
      setIsAnalyseModalOpen(false);
      setSelectedEpreuveForAnalyse(null);
      fetchEpreuves();
      fetchStats();
    } catch (err: any) {
      alert(err.message || "Erreur lors de l'analyse.");
    } finally {
      setSubmittingAnalyse(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette épreuve ?")) {
      return;
    }
    try {
      await apiFetch(`/api/epreuves/${id}`, { method: 'DELETE' });
      setEpreuves(prev => prev.filter(e => e.id !== id));
      setSuccessMsg('Épreuve supprimée avec succès.');
      fetchStats();
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    }
  };

  const handleDownload = (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'epreuve.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAdminOrCenseur = ['admin', 'direction', 'censeur', 'super_admin'].includes(currentUser?.role);
  const isTeacher = currentUser?.role === 'enseignant';

  // STRICT ACCESS RESTRICTION: Parents and Students are NEVER allowed in the exam space!
  if (currentUser?.role === 'parent' || currentUser?.role === 'eleve') {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-2xl border border-rose-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Espace Confidentiel Réservé</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Conformément aux règles de sécurité de l'établissement, la banque et la gestion des épreuves sont strictement confidentielles et réservées exclusivement au corps enseignant et à la direction pédagogique.
        </p>
        <div className="pt-2">
          <a
            href="/accueil"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl transition shadow"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  const getEvaluationTypeLabel = (cycle: string, typeKey: string) => {
    const list = cycle === 'secondaire' ? TYPES_EVAL_SECONDAIRE : TYPES_EVAL_PRIMAIRE;
    const item = list.find(t => t.id === typeKey);
    return item ? item.label : typeKey;
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'validee':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" /> Validée
          </span>
        );
      case 'rejetee':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" /> Rejetée (Corrections requises)
          </span>
        );
      case 'en_attente':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> En attente d'analyse
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      {isTeacher ? (
        <div className="bg-gradient-to-r from-cyan-950 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <BookOpenCheck className="w-96 h-96 -mr-20 -mt-20" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/30 text-cyan-200 rounded-full text-xs font-semibold tracking-wide w-fit mb-3 border border-cyan-400/30">
              <Send className="w-3.5 h-3.5" />
              Espace Enseignant — Dépôt & Suivi de vos Épreuves
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              {cycleProp === 'primaire' ? 'Mes Épreuves & Évaluations — Maternelle & Primaire' :
               cycleProp === 'secondaire' ? 'Mes Devoirs & Épreuves — Secondaire' :
               'Mes Dépôts & Épreuves'}
            </h1>
            <p className="text-cyan-100 text-sm md:text-base leading-relaxed mb-6">
              Déposez vos sujets d'évaluation et devoirs en format Word (.docx) ou PDF pour examen et validation par l'administration. Suivez en temps réel l'état d'analyse de vos propositions et consultez les retours pédagogiques.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-soumettre-epreuve"
                onClick={() => {
                  resetForm();
                  setEditingEpreuve(null);
                  setIsSubmitModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl shadow-lg transition duration-150 text-sm"
              >
                <Plus className="w-4 h-4" />
                Soumettre une nouvelle épreuve
              </button>
              <div className="text-xs text-cyan-200 bg-cyan-950/60 px-3 py-2 rounded-lg border border-cyan-700/50">
                <span className="font-bold text-white">{stats.total}</span> de vos épreuves soumises
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-indigo-900 via-violet-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
            <BookOpenCheck className="w-96 h-96 -mr-20 -mt-20" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-semibold tracking-wide w-fit mb-3 border border-indigo-400/30">
              <BookOpenCheck className="w-3.5 h-3.5" />
              Gestion des Épreuves & Banque Pédagogique
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
              {cycleProp === 'primaire' ? 'Épreuves & Évaluations — Maternelle & Primaire' :
               cycleProp === 'secondaire' ? 'Devoirs & Compositions — Secondaire' :
               'Système de Gestion des Épreuves & Banque'}
            </h1>
            <p className="text-indigo-100 text-sm md:text-base leading-relaxed mb-6">
              Dépôt des épreuves par les enseignants (Word / PDF), analyse et validation par les directeurs et censeurs, notification immédiate des motifs en cas de rejet, et stockage sécurisé dans la banque d'épreuves de l'école.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                id="btn-soumettre-epreuve"
                onClick={() => {
                  resetForm();
                  setEditingEpreuve(null);
                  setIsSubmitModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg transition duration-150 text-sm"
              >
                <Plus className="w-4 h-4" />
                Soumettre une épreuve
              </button>
              <a
                href="/epreuves-composition"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg transition duration-150 text-sm"
              >
                <BookOpenCheck className="w-4 h-4" />
                Espace Épreuves de Composition
              </a>
              <div className="text-xs text-indigo-200 bg-indigo-950/60 px-3 py-2 rounded-lg border border-indigo-700/50">
                <span className="font-bold text-white">{stats.validees}</span> épreuves archivées dans la banque
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase">
              {isTeacher ? 'Mes Dépôts Totaux' : 'Total Épreuves'}
            </span>
            <span className="text-xl font-bold text-slate-800">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase">
              {isTeacher ? 'En attente d\'analyse' : 'À Analyser'}
            </span>
            <span className="text-xl font-bold text-amber-700">{stats.en_attente}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase">
              {isTeacher ? 'Mes Épreuves Validées' : 'Validées (Banque)'}
            </span>
            <span className="text-xl font-bold text-emerald-700">{stats.validees}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block uppercase">
              {isTeacher ? 'Corrections Demandées' : 'Épreuves Rejetées'}
            </span>
            <span className="text-xl font-bold text-rose-700">{stats.rejetees}</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 space-x-2 text-sm font-semibold overflow-x-auto">
        {isTeacher ? (
          <>
            <button
              onClick={() => setActiveTab('mes_soumissions')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'mes_soumissions'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Send className="w-4 h-4" />
              Toutes mes épreuves ({stats.total})
            </button>

            <button
              onClick={() => setActiveTab('mes_en_attente')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'mes_en_attente'
                  ? 'border-amber-600 text-amber-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              En attente d'analyse ({stats.en_attente})
            </button>

            <button
              onClick={() => setActiveTab('mes_validees')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'mes_validees'
                  ? 'border-emerald-600 text-emerald-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Mes épreuves validées ({stats.validees})
            </button>

            <button
              onClick={() => setActiveTab('mes_rejetees')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'mes_rejetees'
                  ? 'border-rose-600 text-rose-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Corrections demandées ({stats.rejetees})
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setActiveTab('toutes')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'toutes'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              Toutes les épreuves ({stats.total})
            </button>

            <button
              onClick={() => setActiveTab('a_analyser')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'a_analyser'
                  ? 'border-amber-600 text-amber-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              À Analyser & Valider ({stats.en_attente})
            </button>

            <button
              onClick={() => setActiveTab('banque')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'banque'
                  ? 'border-emerald-600 text-emerald-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Banque d'épreuves validées ({stats.validees})
            </button>

            <button
              onClick={() => setActiveTab('retenues')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'retenues'
                  ? 'border-amber-600 text-amber-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Bookmark className="w-4 h-4" />
              Épreuves de Composition ({Object.keys(retainedEpreuvesMap).length})
            </button>

            <button
              onClick={() => setActiveTab('rejetees')}
              className={`pb-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'rejetees'
                  ? 'border-rose-600 text-rose-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Épreuves Rejetées ({stats.rejetees})
            </button>
          </>
        )}
      </div>

      {/* Organization, Search and Filters Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Search row & Mode d'affichage */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher par titre d'épreuve, enseignant, matière, classe..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition shrink-0"
            >
              Rechercher
            </button>
          </form>

          {/* Grouping / Organization View Modes */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 self-start lg:self-auto overflow-x-auto max-w-full">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 shrink-0">
              Organisation :
            </span>
            <button
              type="button"
              onClick={() => setGroupBy('none')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'none'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Liste
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('matiere')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'matiere'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Par Matière
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('classe')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'classe'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Par Classe
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('type_eval')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'type_eval'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              Par Type / Composition
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('trimestre')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'trimestre'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Par Trimestre
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('composition')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'composition'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              Par Composition
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('annee')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                groupBy === 'annee'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Par Année d'ajout
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1 text-slate-500 font-bold mr-1 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            Filtres :
          </div>

          <select
            value={selectedYearIdFilter}
            onChange={(e) => setSelectedYearIdFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">Toutes les années</option>
            {years.map((y: any) => (
              <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
            ))}
          </select>

          {cycleProp === 'tous' && (
            <select
              value={selectedCycle}
              onChange={(e: any) => setSelectedCycle(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="tous">Tous les cycles</option>
              <option value="primaire">Maternelle & Primaire</option>
              <option value="secondaire">Secondaire</option>
            </select>
          )}

          {/* Matière Filter */}
          <select
            value={selectedMatiereFilter}
            onChange={(e) => setSelectedMatiereFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Toutes les matières</option>
            {Array.from(new Set([...epreuves.map(e => e.matiere_nom), ...matieresList.map(m => m.nom)])).filter(Boolean).sort().map(mat => (
              <option key={mat} value={mat}>{mat}</option>
            ))}
          </select>

          {/* Classe Filter */}
          <select
            value={selectedClasseFilter}
            onChange={(e) => setSelectedClasseFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Toutes les classes</option>
            {Array.from(new Set([...epreuves.map(e => e.classe_nom || e.niveau), ...classesList.map(c => c.nom)])).filter(Boolean).sort().map(cls => (
              <option key={cls} value={cls}>{cls}</option>
            ))}
          </select>

          {/* Type d'évaluation / Composition Filter */}
          <select
            value={selectedTypeEval}
            onChange={(e) => setSelectedTypeEval(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tous types d'évaluation</option>
            {selectedCycle === 'secondaire' ? (
              TYPES_EVAL_SECONDAIRE.filter(t => t.id !== 'all').map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))
            ) : selectedCycle === 'primaire' ? (
              TYPES_EVAL_PRIMAIRE.filter(t => t.id !== 'all').map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))
            ) : (
              <>
                <optgroup label="Primaire">
                  {TYPES_EVAL_PRIMAIRE.filter(t => t.id !== 'all').map(t => (
                    <option key={`p_${t.id}`} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
                <optgroup label="Secondaire">
                  {TYPES_EVAL_SECONDAIRE.filter(t => t.id !== 'all').map(t => (
                    <option key={`s_${t.id}`} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              </>
            )}
          </select>

          {/* Trimestre Filter */}
          <select
            value={selectedTrimestreFilter}
            onChange={(e) => setSelectedTrimestreFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Tous les trimestres</option>
            <option value="1">1er Trimestre</option>
            <option value="2">2ème Trimestre</option>
            <option value="3">3ème Trimestre</option>
          </select>

          {activeTab !== 'a_analyser' && activeTab !== 'banque' && (
            <select
              value={selectedStatut}
              onChange={(e) => setSelectedStatut(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="en_attente">En attente d'analyse</option>
              <option value="validee">Validées</option>
              <option value="rejetee">Rejetées</option>
            </select>
          )}

          {(selectedTypeEval !== 'all' || selectedStatut !== 'all' || selectedMatiereFilter !== 'all' || selectedClasseFilter !== 'all' || selectedTrimestreFilter !== 'all' || searchTerm !== '' || (cycleProp === 'tous' && selectedCycle !== 'tous') || groupBy !== 'none') && (
            <button
              onClick={() => {
                setSelectedTypeEval('all');
                setSelectedCycle(cycleProp);
                setSelectedStatut('all');
                setSelectedMatiereFilter('all');
                setSelectedClasseFilter('all');
                setSelectedTrimestreFilter('all');
                setGroupBy('none');
                setSearchTerm('');
              }}
              className="text-rose-600 hover:text-rose-700 underline font-medium ml-auto"
            >
              Réinitialiser filtres & vue
            </button>
          )}
        </div>
      </div>

      {/* Render Single Exam Card Helper */}
      {(() => {
        const renderExamCard = (epreuve: Epreuve) => {
          const isAuthor = epreuve.utilisateur_id === currentUser?.id || (currentUser?.enseignant_id && epreuve.enseignant_id === currentUser.enseignant_id);
          const isWord = epreuve.fichier_epreuve_type === 'doc' || epreuve.fichier_epreuve_type === 'docx';
          const retainedInfo = retainedEpreuvesMap[epreuve.id];

          return (
            <div
              key={epreuve.id}
              className={`bg-white rounded-2xl border p-5 transition duration-150 hover:shadow-md ${
                epreuve.statut === 'rejetee' 
                  ? 'border-rose-300 bg-rose-50/20' 
                  : epreuve.statut === 'validee'
                  ? 'border-emerald-200'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Column: Details */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(epreuve.statut)}

                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      epreuve.cycle === 'primaire' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-indigo-100 text-indigo-800'
                    }`}>
                      {epreuve.cycle === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire'}
                    </span>

                    <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      {getEvaluationTypeLabel(epreuve.cycle, epreuve.type_evaluation)}
                    </span>

                    {epreuve.trimestre && (
                      <span className="text-xs text-slate-500 font-medium">
                        Trimestre {epreuve.trimestre}
                      </span>
                    )}

                    {/* Mention Année d'ajout au système */}
                    {epreuve.annee_ajout_libelle && (
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold border shadow-2xs ${
                        epreuve.est_annee_anterieure
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-sky-50 text-sky-800 border-sky-200'
                      }`}>
                        <Calendar className="w-3.5 h-3.5" />
                        {epreuve.est_annee_anterieure
                          ? `Année d'ajout : ${epreuve.annee_ajout_libelle}`
                          : `Année en cours (${epreuve.annee_ajout_libelle})`}
                      </span>
                    )}

                    {/* Retained in composition badge */}
                    {retainedInfo && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                        <BookmarkCheck className="w-3.5 h-3.5 text-amber-700" />
                        Retenue : {retainedInfo.session_nom}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {epreuve.titre}
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
                    <span>Matière : <strong className="text-slate-800">{epreuve.matiere_nom}</strong></span>
                    {epreuve.classe_nom && <span>Classe : <strong className="text-slate-800">{epreuve.classe_nom}</strong></span>}
                    <span>Durée : <strong className="text-slate-800">{epreuve.duree_minutes} min</strong></span>
                    <span>Barème : <strong className="text-slate-800">/{epreuve.bareme || 20}</strong></span>
                    <span>Soumis par : <strong className="text-slate-800">{epreuve.enseignant_nom}</strong></span>
                    {epreuve.annee_ajout_libelle && (
                      <span>Année d'ajout : <strong className={epreuve.est_annee_anterieure ? 'text-amber-800 font-bold' : 'text-slate-800'}>{epreuve.annee_ajout_libelle}</strong></span>
                    )}
                    <span className="text-slate-400">({new Date(epreuve.date_soumission).toLocaleDateString('fr-FR')})</span>
                  </div>

                  {/* Consignes */}
                  {epreuve.consignes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic">
                      <strong>Consignes :</strong> {epreuve.consignes}
                    </p>
                  )}

                  {/* Rejection Notification / Feedback box if rejected */}
                  {epreuve.statut === 'rejetee' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 space-y-1.5 mt-2">
                      <div className="flex items-center gap-2 font-bold text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Motif du rejet (Remarques de l'administrateur / Censeur) :</span>
                      </div>
                      <p className="leading-relaxed pl-6 text-rose-800 whitespace-pre-line font-medium">
                        "{epreuve.motif_rejet}"
                      </p>
                      {epreuve.analyste_nom && (
                        <p className="text-[11px] text-rose-600 pl-6">
                          Analysé par {epreuve.analyste_nom} le {epreuve.date_analyse ? new Date(epreuve.date_analyse).toLocaleDateString('fr-FR') : ''}
                        </p>
                      )}
                      {isAuthor && (
                        <div className="pt-2 pl-6">
                          <button
                            onClick={() => handleEdit(epreuve, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Corriger & Re-soumettre l'épreuve
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Validation Note */}
                  {epreuve.statut === 'validee' && epreuve.analyste_nom && (
                    <p className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Validée par {epreuve.analyste_nom} {epreuve.date_analyse ? `le ${new Date(epreuve.date_analyse).toLocaleDateString('fr-FR')}` : ''}
                    </p>
                  )}
                </div>

                {/* Right Column: Actions */}
                <div className="flex flex-wrap lg:flex-col items-center lg:items-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Download Exam File */}
                    <button
                      onClick={() => handleDownload(epreuve.fichier_epreuve_url, epreuve.fichier_epreuve_nom)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition"
                      title="Télécharger le sujet de l'épreuve"
                    >
                      {isWord ? <FileCode className="w-4 h-4 text-blue-600" /> : <FileText className="w-4 h-4 text-rose-600" />}
                      <span>Télécharger Sujet ({isWord ? 'Word' : 'PDF'})</span>
                    </button>

                    {/* Download Answer Key / Corrigé if available */}
                    {epreuve.fichier_corrige_url && (
                      <button
                        onClick={() => handleDownload(epreuve.fichier_corrige_url!, epreuve.fichier_corrige_nom || 'corrige.pdf')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition"
                        title="Télécharger le corrigé type"
                      >
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Corrigé type</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {/* Retenir button for staff on validated bank exams */}
                    {epreuve.statut === 'validee' && isAdminOrCenseur && (
                      <button
                        onClick={() => handleOpenRetenirModal(epreuve)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
                          retainedInfo 
                            ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title="Retenir cette épreuve pour la composition officielle"
                      >
                        <Bookmark className="w-3.5 h-3.5 text-white" />
                        <span>{retainedInfo ? 'Retenue (Changer)' : 'Retenir pour composition'}</span>
                      </button>
                    )}

                    {/* Admin Analysis Button */}
                    {isAdminOrCenseur && (
                      <button
                        onClick={() => handleOpenAnalyse(epreuve)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition"
                      >
                        <BookOpenCheck className="w-4 h-4 text-amber-400" />
                        <span>{epreuve.statut === 'en_attente' ? 'Analyser' : 'Statut'}</span>
                      </button>
                    )}

                    {/* Edit / Delete for author or admin */}
                    <div className="flex items-center gap-1">
                      {(isAuthor || isAdminOrCenseur) && (
                        <button
                          onClick={() => handleEdit(epreuve, false)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition text-xs"
                          title="Modifier les détails"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      {(isAuthor || isAdminOrCenseur) && (
                        <button
                          onClick={() => handleDelete(epreuve.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        };

        // Filtered exams according to multi-criteria
        const filteredEpreuves = epreuves.filter(e => {
          if (selectedMatiereFilter !== 'all' && e.matiere_nom !== selectedMatiereFilter) return false;
          if (selectedClasseFilter !== 'all') {
            const cls = e.classe_nom || e.niveau || '';
            if (cls !== selectedClasseFilter) return false;
          }
          if (selectedTrimestreFilter !== 'all' && String(e.trimestre) !== selectedTrimestreFilter) return false;
          return true;
        });

        if (loading) {
          return (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
              <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-slate-500 font-medium">Chargement des épreuves...</p>
            </div>
          );
        }

        if (filteredEpreuves.length === 0) {
          return (
            <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <BookOpenCheck className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">Aucune épreuve trouvée</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Aucun sujet d'évaluation ne correspond aux critères sélectionnés. Les enseignants peuvent soumettre leurs épreuves en fichier Word ou PDF à tout moment.
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setIsSubmitModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition"
              >
                <Plus className="w-4 h-4" />
                Soumettre une épreuve
              </button>
            </div>
          );
        }

        // Grouped Views
        if (groupBy !== 'none') {
          const groups: Record<string, { label: string; icon: any; items: Epreuve[] }> = {};

          filteredEpreuves.forEach(epreuve => {
            let key = '';
            let label = '';
            let icon = BookOpen;

            if (groupBy === 'matiere') {
              key = epreuve.matiere_nom || 'Sans matière';
              label = `Discipline : ${key}`;
              icon = BookOpen;
            } else if (groupBy === 'classe') {
              key = epreuve.classe_nom || epreuve.niveau || 'Toutes classes / Non spécifié';
              label = `Classe / Niveau : ${key}`;
              icon = GraduationCap;
            } else if (groupBy === 'type_eval') {
              key = getEvaluationTypeLabel(epreuve.cycle, epreuve.type_evaluation);
              label = `Type d'évaluation : ${key}`;
              icon = Tag;
            } else if (groupBy === 'trimestre') {
              key = epreuve.trimestre ? `Trimestre ${epreuve.trimestre}` : 'Non spécifié';
              label = key.startsWith('Trimestre') ? `Session : ${key}` : key;
              icon = Calendar;
            } else if (groupBy === 'composition') {
              const retained = retainedEpreuvesMap[epreuve.id];
              key = retained ? retained.session_nom : 'Libre (Non retenue)';
              label = `Composition : ${key}`;
              icon = BookmarkCheck;
            } else if (groupBy === 'annee') {
              key = epreuve.annee_ajout_libelle || epreuve.annee_libelle || (epreuve.date_soumission ? new Date(epreuve.date_soumission).getFullYear().toString() : 'Année non spécifiée');
              label = epreuve.est_annee_anterieure ? `Année d'ajout (Antérieure) : ${key}` : `Année scolaire d'ajout : ${key}`;
              icon = Calendar;
            }

            if (!groups[key]) {
              groups[key] = { label, icon, items: [] };
            }
            groups[key].items.push(epreuve);
          });

          const sortedGroupEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

          return (
            <div className="space-y-6">
              {sortedGroupEntries.map(([groupKey, group]) => {
                const isCollapsed = collapsedGroups[groupKey];
                const GroupIcon = group.icon;

                return (
                  <div key={groupKey} className="bg-slate-50/70 rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => toggleGroupCollapse(groupKey)}
                      className="w-full px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between hover:bg-slate-50/80 transition text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                          <GroupIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">{group.label}</h3>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {(group.items || []).length} {(group.items || []).length > 1 ? 'épreuves répertoriées' : 'épreuve répertoriée'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {(group.items || []).length}
                        </span>
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-4 space-y-3">
                        {(group.items || []).map(epreuve => renderExamCard(epreuve))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // Standard Flat List View
        return (
          <div className="space-y-4">
            {filteredEpreuves.map(epreuve => renderExamCard(epreuve))}
          </div>
        );
      })()}

      {/* Modal: Submission Form (Teacher / Admin) */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  formData.cycle === 'primaire' 
                    ? 'bg-emerald-100 text-emerald-700' 
                    : 'bg-indigo-100 text-indigo-700'
                }`}>
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {formData.resubmit 
                      ? 'Re-soumission après correction de l\'épreuve' 
                      : editingEpreuve 
                      ? 'Modifier les paramètres de l\'épreuve' 
                      : 'Dépôt d\'une épreuve pour analyse & validation'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {formData.cycle === 'primaire' 
                      ? 'Espace Maternelle & Primaire — Dépôt des sujets d\'évaluation & compositions' 
                      : 'Espace Secondaire — Dépôt des devoirs, interrogations & compositions'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSubmitModalOpen(false);
                  setEditingEpreuve(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEpreuve} className="p-6 space-y-5">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Teacher Context Banner & Cycle Switcher */}
              <div className="space-y-3">
                {isTeacher && (
                  <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    formData.cycle === 'primaire'
                      ? 'bg-gradient-to-r from-emerald-50/90 to-teal-50/90 border-emerald-200 text-emerald-950 shadow-xs'
                      : 'bg-gradient-to-r from-indigo-50/90 to-blue-50/90 border-indigo-200 text-indigo-950 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-3.5">
                      <div className={`p-2.5 rounded-xl shadow-xs ${formData.cycle === 'primaire' ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {formData.cycle === 'primaire' ? <School className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 opacity-90">
                          <UserCheck className="w-3.5 h-3.5" />
                          {formData.cycle === 'primaire' ? 'Enseignant — Maternelle & Primaire' : 'Enseignant — Secondaire (Collège / Lycée)'}
                        </div>
                        <div className="text-sm font-bold mt-0.5">
                          {currentTeacher ? `${currentTeacher.nom} ${currentTeacher.prenom || ''}`.trim() : currentUser?.nom}
                        </div>
                        {(currentTeacher?.classes_noms || currentTeacher?.classe_titulaire_nom) && (
                          <div className="text-xs opacity-80 mt-0.5 flex items-center gap-1.5">
                            <span className="font-semibold">Classes attribuées :</span>
                            <span>{currentTeacher.classe_titulaire_nom || currentTeacher.classes_noms}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs border ${
                        formData.cycle === 'primaire'
                          ? 'bg-white text-emerald-800 border-emerald-300'
                          : 'bg-white text-indigo-800 border-indigo-300'
                      }`}>
                        {formData.cycle === 'primaire' ? '🌿 Cycle Primaire Actif' : '🎓 Cycle Secondaire Actif'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-indigo-600" />
                      Cycle d'enseignement concerné *
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">Adapte les types d'évaluation, classes et matières</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleCycleChangeInModal('primaire')}
                      className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        formData.cycle === 'primaire'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <School className={`w-5 h-5 ${formData.cycle === 'primaire' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold">Maternelle & Primaire</div>
                        <div className="text-[11px] text-slate-500">Évaluations mensuelles (N°1-6), sommatives, CEP</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCycleChangeInModal('secondaire')}
                      className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition ${
                        formData.cycle === 'secondaire'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <GraduationCap className={`w-5 h-5 ${formData.cycle === 'secondaire' ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="text-xs font-bold">Secondaire (Collège / Lycée)</div>
                        <div className="text-[11px] text-slate-500">Interros flash, devoirs surveillés (DS1-3), BEPC, BAC</div>
                      </div>
                    </button>
                  </div>

                  {/* Optional author teacher selection for admin */}
                  {isAdminOrCenseur && (
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Enseignant auteur du sujet</label>
                        <select
                          value={formData.enseignant_id || ''}
                          onChange={e => {
                            const val = e.target.value;
                            if (val) {
                              const t = enseignantsList.find(x => x.id === parseInt(val));
                              setFormData({
                                ...formData,
                                enseignant_id: parseInt(val),
                                enseignant_nom: t ? `${t.nom} ${t.prenom || ''}`.trim() : formData.enseignant_nom
                              });
                            } else {
                              setFormData({
                                ...formData,
                                enseignant_id: null,
                                enseignant_nom: currentUser?.nom || 'Administration'
                              });
                            }
                          }}
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Administration / Direction ({currentUser?.nom})</option>
                          {enseignantsList
                            .filter(t => {
                              const c = (t.cycle || '').toLowerCase();
                              if (formData.cycle === 'primaire') return c === 'primaire' || c === 'maternelle' || !c;
                              return c === 'secondaire' || !c;
                            })
                            .map(t => (
                              <option key={t.id} value={t.id}>
                                {t.nom} {t.prenom} {t.classes_noms ? `(${t.classes_noms})` : ''}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Nom affiché de l'auteur</label>
                        <input
                          type="text"
                          value={formData.enseignant_nom}
                          onChange={e => setFormData({ ...formData, enseignant_nom: e.target.value })}
                          placeholder="Nom de l'enseignant"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-level Filter Tabs */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span className="font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-500" />
                    Filtrer les niveaux & classes du {formData.cycle === 'primaire' ? 'Primaire' : 'Secondaire'} :
                  </span>
                  <span className="text-[11px] text-slate-400">Cliquez pour restreindre les classes</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalSubLevelFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      modalSubLevelFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Toutes les classes ({filteredFormClasses.length})
                  </button>

                  {formData.cycle === 'primaire' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setModalSubLevelFilter('maternelle')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          modalSubLevelFilter === 'maternelle'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        Maternelle (M1, M2)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSubLevelFilter('ci_cp')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          modalSubLevelFilter === 'ci_cp'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        Cours d'Initiation & Préparatoire (CI, CP)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSubLevelFilter('ce')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          modalSubLevelFilter === 'ce'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        Cours Élémentaire (CE1, CE2)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSubLevelFilter('cm')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          modalSubLevelFilter === 'cm'
                            ? 'bg-amber-600 text-white shadow-xs'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        Cours Moyen & Candidats CEP (CM1, CM2)
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setModalSubLevelFilter('college')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          modalSubLevelFilter === 'college'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        Premier Cycle / Collège (6ème, 5ème, 4ème, 3ème)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalSubLevelFilter('lycee')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          modalSubLevelFilter === 'lycee'
                            ? 'bg-cyan-700 text-white shadow-xs'
                            : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
                        }`}
                      >
                        Second Cycle / Lycée (2nde, 1ère, Terminale)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Dynamic Type of Evaluation / Composition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                    <span>
                      {formData.cycle === 'secondaire' 
                        ? 'Type d\'épreuve ou devoir (Secondaire) *' 
                        : 'Type d\'évaluation (Maternelle & Primaire) *'}
                    </span>
                  </label>
                  <select
                    value={formData.type_evaluation}
                    onChange={e => handleTypeEvalChange(e.target.value)}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 transition ${
                      formData.cycle === 'primaire'
                        ? 'bg-emerald-50/60 border-emerald-300 text-emerald-950 focus:ring-emerald-500'
                        : 'bg-indigo-50/60 border-indigo-300 text-indigo-950 focus:ring-indigo-500'
                    }`}
                  >
                    {formData.cycle === 'secondaire' ? (
                      TYPES_EVAL_SECONDAIRE.filter(t => t.id !== 'all').map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))
                    ) : (
                      TYPES_EVAL_PRIMAIRE.filter(t => t.id !== 'all').map(t => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))
                    )}
                  </select>
                  <p className="text-[11px] text-slate-500">
                    {formData.cycle === 'secondaire'
                      ? 'Interrogations flash, devoirs surveillés (DS1, DS2, DS3), compositions, BEPC/BAC blanc, TP.'
                      : 'Évaluations mensuelles sommatives (N°1 à 6), compositions trimestrielles, examen blanc CEP.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Trimestre d'évaluation *</label>
                  <select
                    value={formData.trimestre}
                    onChange={e => {
                      const trimVal = parseInt(e.target.value) || 1;
                      setFormData(prev => {
                        const next = { ...prev, trimestre: trimVal };
                        if (!prev.titre || prev.titre.includes('Trimestre')) {
                          next.titre = generateSmartTitle(next);
                        }
                        return next;
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={1}>1er Trimestre</option>
                    <option value={2}>2ème Trimestre</option>
                    <option value={3}>3ème Trimestre</option>
                  </select>
                  <p className="text-[11px] text-slate-500">Période académique de passage du sujet</p>
                </div>
              </div>

              {/* Discipline & Classe with Teacher Quick-Select Chips */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matière / Discipline */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Matière / Discipline *</label>
                    <button
                      type="button"
                      onClick={() => setCustomMatiereInput(!customMatiereInput)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      {customMatiereInput ? 'Choisir dans la liste' : '+ Saisie libre'}
                    </button>
                  </div>

                  {/* Quick-select chips for teacher assigned subjects */}
                  {teacherAssignedSubjects.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Mes matières :</span>
                      <div className="flex flex-wrap gap-1">
                        {teacherAssignedSubjects.map((m, idx) => (
                          <button
                            key={`teacher_mat_${idx}`}
                            type="button"
                            onClick={() => {
                              setCustomMatiereInput(false);
                              setFormData(prev => {
                                const next = {
                                  ...prev,
                                  matiere_id: m.id || null,
                                  matiere_nom: m.nom
                                };
                                next.titre = generateSmartTitle(next);
                                return next;
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                              formData.matiere_nom.toLowerCase() === m.nom.toLowerCase()
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100'
                            }`}
                          >
                            {m.nom}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary common subjects presets */}
                  {formData.cycle === 'primaire' && teacherAssignedSubjects.length === 0 && (
                    <div className="flex flex-wrap gap-1">
                      {['Lecture & Compréhension', 'Expression Écrite', 'Mathématiques', 'Éveil Scientifique (EST)', 'Histoire-Géographie', 'Dictée & Questions'].map(matName => (
                        <button
                          key={matName}
                          type="button"
                          onClick={() => {
                            setCustomMatiereInput(false);
                            const found = matieresList.find(m => m.nom.toLowerCase().includes(matName.toLowerCase().split(' ')[0]));
                            setFormData(prev => {
                              const next = {
                                ...prev,
                                matiere_id: found ? found.id : null,
                                matiere_nom: matName
                              };
                              next.titre = generateSmartTitle(next);
                              return next;
                            });
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                            formData.matiere_nom === matName
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {matName}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Secondary common subjects presets */}
                  {formData.cycle === 'secondaire' && teacherAssignedSubjects.length === 0 && (
                    <div className="flex flex-wrap gap-1">
                      {['Mathématiques', 'Français', 'Anglais', 'Physique-Chimie (PCT)', 'SVT (Sciences)', 'Histoire-Géographie', 'Philosophie', 'EPS', 'Allemand', 'Espagnol'].map(matName => (
                        <button
                          key={matName}
                          type="button"
                          onClick={() => {
                            setCustomMatiereInput(false);
                            const found = matieresList.find(m => m.nom.toLowerCase().includes(matName.toLowerCase().split(' ')[0]));
                            setFormData(prev => {
                              const next = {
                                ...prev,
                                matiere_id: found ? found.id : null,
                                matiere_nom: matName
                              };
                              next.titre = generateSmartTitle(next);
                              return next;
                            });
                          }}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition ${
                            formData.matiere_nom === matName
                              ? 'bg-indigo-600 text-white'
                              : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                          }`}
                        >
                          {matName}
                        </button>
                      ))}
                    </div>
                  )}

                  {customMatiereInput ? (
                    <input
                      type="text"
                      required
                      placeholder={formData.cycle === 'secondaire' ? "Ex: Mathématiques, SVT, Français, Anglais" : "Ex: Mathématiques, Lecture, Éveil Scientifique"}
                      value={formData.matiere_nom}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const next = { ...prev, matiere_nom: val, matiere_id: null };
                          return next;
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <select
                      required
                      value={formData.matiere_id || (formData.matiere_nom ? 'custom' : '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setCustomMatiereInput(true);
                        } else if (val) {
                          const m = matieresList.find(x => x.id === parseInt(val));
                          if (m) {
                            setFormData(prev => {
                              const next = {
                                ...prev,
                                matiere_id: m.id,
                                matiere_nom: m.nom
                              };
                              next.titre = generateSmartTitle(next);
                              return next;
                            });
                          }
                        } else {
                          setFormData(prev => ({ ...prev, matiere_id: null, matiere_nom: '' }));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Sélectionner une matière...</option>
                      {filteredFormMatieres.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.nom} {m.categorie ? `(${m.categorie})` : ''}
                        </option>
                      ))}
                      <option value="custom">Autre matière (Saisie libre)...</option>
                    </select>
                  )}
                </div>

                {/* Classe */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Classe concernée</label>
                    <button
                      type="button"
                      onClick={() => setCustomClasseInput(!customClasseInput)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                    >
                      {customClasseInput ? 'Choisir dans la liste' : '+ Saisie libre'}
                    </button>
                  </div>

                  {/* Quick-select chips for teacher assigned classes */}
                  {teacherAssignedClasses.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Mes classes :</span>
                      <div className="flex flex-wrap gap-1">
                        {teacherAssignedClasses.map((c, idx) => (
                          <button
                            key={`teacher_cls_${idx}`}
                            type="button"
                            onClick={() => {
                              setCustomClasseInput(false);
                              setFormData(prev => {
                                const next = {
                                  ...prev,
                                  classe_id: c.id || null,
                                  classe_nom: c.nom,
                                  niveau: c.niveau || ''
                                };
                                next.titre = generateSmartTitle(next);
                                return next;
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                              formData.classe_nom.toLowerCase() === c.nom.toLowerCase()
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {c.nom}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {customClasseInput ? (
                    <input
                      type="text"
                      placeholder={formData.cycle === 'secondaire' ? "Ex: 3ème A, Terminale C, 6ème B" : "Ex: CM2, CE1, Maternelle II"}
                      value={formData.classe_nom}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const next = { ...prev, classe_nom: val, classe_id: null, niveau: '' };
                          return next;
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  ) : (
                    <select
                      value={formData.classe_id || (formData.classe_nom ? 'custom' : '')}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setCustomClasseInput(true);
                        } else if (val) {
                          const c = classesList.find(x => x.id === parseInt(val));
                          if (c) {
                            setFormData(prev => {
                              const next = {
                                ...prev,
                                classe_id: c.id,
                                classe_nom: c.nom,
                                niveau: c.niveau || ''
                              };
                              next.titre = generateSmartTitle(next);
                              return next;
                            });
                          }
                        } else {
                          setFormData(prev => ({ ...prev, classe_id: null, classe_nom: '', niveau: '' }));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Toutes les classes / Générale...</option>
                      {filteredFormClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.nom} {c.niveau ? `(${c.niveau})` : ''}
                        </option>
                      ))}
                      <option value="custom">Autre classe (Saisie libre)...</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Title / Intitulé with Auto-generate helper */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Intitulé / Titre officiel de l'épreuve *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newTitle = generateSmartTitle();
                      setFormData(prev => ({ ...prev, titre: newTitle }));
                    }}
                    className="text-[11px] text-violet-700 hover:text-violet-900 font-bold flex items-center gap-1 bg-violet-50 px-2 py-0.5 rounded-md hover:bg-violet-100 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                    Générer l'intitulé standard
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder={
                    formData.cycle === 'secondaire'
                      ? "Ex: Devoir Surveillé N°1 de Sciences de la Vie et de la Terre — Classe de 3ème A (1er Trimestre)"
                      : "Ex: Évaluation Mensuelle N°2 de Mathématiques & Calcul — CM2 (1er Trimestre)"
                  }
                  value={formData.titre}
                  onChange={e => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                />
              </div>

              {/* Durée, Coefficient, Barème */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Durée de l'épreuve
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={15}
                      step={15}
                      placeholder="120"
                      value={formData.duree_minutes}
                      onChange={e => setFormData({ ...formData, duree_minutes: parseInt(e.target.value) || 60 })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {Math.floor(formData.duree_minutes / 60)}h {formData.duree_minutes % 60 > 0 ? `${formData.duree_minutes % 60}min` : ''} ({formData.duree_minutes} minutes)
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Coefficient</label>
                  <input
                    type="number"
                    min={1}
                    step={0.5}
                    value={formData.coefficient}
                    onChange={e => setFormData({ ...formData, coefficient: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">Poids dans le calcul des moyennes</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Barème</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={formData.bareme}
                    onChange={e => setFormData({ ...formData, bareme: parseFloat(e.target.value) || 20 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[11px] text-slate-500">Note maximale (ex: sur {formData.bareme})</span>
                </div>
              </div>

              {/* Fichier de l'épreuve */}
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  Fichier du sujet d'épreuve (Word ou PDF) *
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm shrink-0">
                    <Upload className="w-4 h-4" />
                    <span>Choisir fichier (.docx, .doc, .pdf)</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={e => handleFileUpload(e, false)}
                    />
                  </label>
                  <span className="text-xs text-slate-700 font-medium truncate">
                    {formData.fichier_epreuve_nom ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
                        <Check className="w-4 h-4" />
                        {formData.fichier_epreuve_nom}
                      </span>
                    ) : (
                      'Aucun fichier sélectionné (Obligatoire)'
                    )}
                  </span>
                </div>
              </div>

              {/* Fichier du corrigé type */}
              <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Fichier du Corrigé-Type & Grille de notation (Optionnel)
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition shrink-0">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Joindre le corrigé type</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={e => handleFileUpload(e, true)}
                    />
                  </label>
                  <span className="text-xs text-slate-600 truncate">
                    {formData.fichier_corrige_nom ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        {formData.fichier_corrige_nom}
                      </span>
                    ) : (
                      'Pas de corrigé type joint pour l\'instant'
                    )}
                  </span>
                </div>
              </div>

              {/* Consignes pédagogiques */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Consignes pédagogiques pour les élèves & consignes de surveillance
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Calculatrice non autorisée. Soigner la présentation et la justification des réponses..."
                  value={formData.consignes}
                  onChange={e => setFormData({ ...formData, consignes: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Admin Direct Validation Option */}
              {isAdminOrCenseur && !formData.resubmit && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="chk-statut-direct"
                    checked={formData.statut_direct === 'validee'}
                    onChange={e => setFormData({ ...formData, statut_direct: e.target.checked ? 'validee' : 'en_attente' })}
                    className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                  />
                  <label htmlFor="chk-statut-direct" className="text-xs font-semibold text-amber-900 cursor-pointer">
                    Enregistrer directement dans la banque d'épreuves validées (Publier immédiatement sans étape d'analyse)
                  </label>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsSubmitModalOpen(false);
                    setEditingEpreuve(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  <span>
                    {formData.resubmit 
                      ? 'Re-soumettre l\'épreuve corrigée' 
                      : editingEpreuve 
                      ? 'Enregistrer les modifications' 
                      : 'Soumettre l\'épreuve pour analyse'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin / Censeur Analysis Modal (Validate or Reject with Motifs) */}
      {isAnalyseModalOpen && selectedEpreuveForAnalyse && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-100 p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-bold text-slate-900">Analyse Pédagogique de l'Épreuve</h3>
                </div>
                <p className="text-xs text-slate-500">Examinez le sujet déposé et décidez de sa validation ou de son renvoi avec motifs</p>
              </div>
              <button onClick={() => setIsAnalyseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Exam Summary Preview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 text-sm">{selectedEpreuveForAnalyse.titre}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>Enseignant : <strong className="text-slate-800">{selectedEpreuveForAnalyse.enseignant_nom}</strong></div>
                <div>Matière : <strong className="text-slate-800">{selectedEpreuveForAnalyse.matiere_nom}</strong></div>
                <div>Classe : <strong className="text-slate-800">{selectedEpreuveForAnalyse.classe_nom || 'Toutes'}</strong></div>
                <div>Évaluation : <strong className="text-slate-800">{getEvaluationTypeLabel(selectedEpreuveForAnalyse.cycle, selectedEpreuveForAnalyse.type_evaluation)}</strong></div>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownload(selectedEpreuveForAnalyse.fichier_epreuve_url, selectedEpreuveForAnalyse.fichier_epreuve_nom)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-slate-700 font-semibold"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  Télécharger le fichier pour relecture
                </button>
              </div>
            </div>

            {/* Analysis Decision */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Décision de l'administrateur / Censeur *</label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAnalyseAction('valider')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    analyseAction === 'valider'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <span className="font-bold text-xs">Valider l'épreuve</span>
                  <span className="text-[10px] text-slate-500 text-center">Archiver dans la banque officielle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAnalyseAction('rejeter')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    analyseAction === 'rejeter'
                      ? 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <XCircle className="w-6 h-6 text-rose-600" />
                  <span className="font-bold text-xs">Rejeter l'épreuve</span>
                  <span className="text-[10px] text-slate-500 text-center">Notifier l'enseignant avec motifs</span>
                </button>
              </div>

              {analyseAction === 'rejeter' && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Motif détaillé du rejet (Obligatoire) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Énumérez clairement les motifs du rejet pour que l'enseignant sache quoi corriger : ex. Barème incohérent (total = 18 au lieu de 20), exercice 2 hors programme, manque de schéma pour la question 3..."
                    value={motifRejet}
                    onChange={e => setMotifRejet(e.target.value)}
                    className="w-full px-3.5 py-2 bg-rose-50/40 border border-rose-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500 italic">
                    L'enseignant recevra une notification automatique avec ces remarques pour corriger et re-soumettre son épreuve.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAnalyseModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={submittingAnalyse}
                onClick={handleConfirmAnalyse}
                className={`px-5 py-2 text-white font-bold rounded-xl text-xs shadow transition flex items-center gap-2 ${
                  analyseAction === 'valider' 
                    ? 'bg-emerald-600 hover:bg-emerald-700' 
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submittingAnalyse && <div className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />}
                <span>{analyseAction === 'valider' ? 'Confirmer la Validation' : 'Confirmer le Rejet'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Retenir l'épreuve validée pour la Composition Officielle */}
      {isRetenirModalOpen && selectedEpreuveForRetenir && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800">
                  <Bookmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Retenir pour la Composition Officielle
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sélectionnez la session et configurez les détails d'organisation pour le secrétariat
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsRetenirModalOpen(false);
                  setSelectedEpreuveForRetenir(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmRetenir} className="p-6 space-y-4">
              {/* Epreuve Preview Summary */}
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 text-xs space-y-1.5">
                <div className="font-bold text-amber-950 text-sm">{selectedEpreuveForRetenir.titre}</div>
                <div className="grid grid-cols-2 gap-2 text-amber-900">
                  <div>Matière : <strong>{selectedEpreuveForRetenir.matiere_nom}</strong></div>
                  <div>Classe : <strong>{selectedEpreuveForRetenir.classe_nom || 'Toutes'}</strong></div>
                  <div>Auteur : <strong>{selectedEpreuveForRetenir.enseignant_nom}</strong></div>
                  <div>Durée prévue : <strong>{selectedEpreuveForRetenir.duree_minutes} min</strong></div>
                </div>
              </div>

              {/* Session Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Nom de la session de composition *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Composition Trimestre 1, Examen Blanc BEPC..."
                  value={retenirFormData.session_nom}
                  onChange={(e) => setRetenirFormData(prev => ({ ...prev, session_nom: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Trimestre & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Trimestre / Période *
                  </label>
                  <select
                    value={retenirFormData.trimestre}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, trimestre: Number(e.target.value) }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value={1}>1er Trimestre</option>
                    <option value={2}>2ème Trimestre</option>
                    <option value={3}>3ème Trimestre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Date de passage prévue
                  </label>
                  <input
                    type="date"
                    value={retenirFormData.date_composition}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, date_composition: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Hours & Copies */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Heure début
                  </label>
                  <input
                    type="time"
                    value={retenirFormData.heure_debut}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, heure_debut: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Heure fin
                  </label>
                  <input
                    type="time"
                    value={retenirFormData.heure_fin}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, heure_fin: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Nombre de copies
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={retenirFormData.nombre_copies_prevues}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, nombre_copies_prevues: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              {/* Salle & Tirage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Salle(s) / Emplacement
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Salles A1, A2, A3 ou Hall B"
                    value={retenirFormData.salle}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, salle: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Statut du tirage papier
                  </label>
                  <select
                    value={retenirFormData.statut_tirage}
                    onChange={(e) => setRetenirFormData(prev => ({ ...prev, statut_tirage: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  >
                    <option value="en_attente">En attente de tirage</option>
                    <option value="en_cours">En cours d'impression</option>
                    <option value="tire">Tirage terminé & mis sous pli</option>
                  </select>
                </div>
              </div>

              {/* Instructions / Secretariat */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Instructions pour le secrétariat / Tirage
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Tirage recto-verso agrafé, calculatrice non autorisée, intercalaires fournis..."
                  value={retenirFormData.consignes_secretariat}
                  onChange={(e) => setRetenirFormData(prev => ({ ...prev, consignes_secretariat: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsRetenirModalOpen(false);
                    setSelectedEpreuveForRetenir(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submittingRetenir}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submittingRetenir && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  <BookmarkCheck className="w-4 h-4" />
                  <span>Confirmer la Rétention pour Composition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
