import { apiFetch, useAppSync } from '../utils/api';
import React from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, Link } from 'react-router-dom';
import { Plus, Download, Search, ClipboardList, User, BookOpen, X, Loader2, FileText, Archive, Eye, EyeOff, Globe, Share2, Printer, BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Save, Info, Upload, Sliders, Settings, CheckCircle2, Filter, ShieldCheck, Sparkles, Send, AlertCircle, Edit, Lock, Unlock, GraduationCap } from 'lucide-react';
import { jsPDF } from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import { formatClassName } from '../utils/format';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { useNotifications } from '../contexts/NotificationContext';
import BulletinHeaderModal from '../components/BulletinHeaderModal';
import { generateQRCodeDataUrl } from '../utils/qrAuth';

interface GradesProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export const isPrimaryOrMaternelleClass = (classeObjOrNiveau: any, currentCycle?: string) => {
  if (currentCycle === 'primaire' || currentCycle === 'maternelle') return true;
  if (!classeObjOrNiveau) return currentCycle === 'primaire' || currentCycle === 'maternelle';
  const niveau = typeof classeObjOrNiveau === 'string' 
    ? classeObjOrNiveau 
    : (classeObjOrNiveau.cycle || classeObjOrNiveau.niveau || classeObjOrNiveau.nom || '');
  return ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2", "sil", "gs", "ms", "ps", "1af", "2af", "3af", "4af", "5af", "6af", "p1", "p2", "p3", "p4", "p5", "p6", "eb", "petite", "moyenne", "grande"].some(lvl => 
    niveau.toLowerCase().includes(lvl)
  );
};

export const normalizeSubjectName = (name: string): string => {
  return (name || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

export const matchSubject = (classSubject: any, excelSubjectName: string): boolean => {
  const cName = normalizeSubjectName(classSubject?.matiere_nom || classSubject?.nom || '');
  const eName = normalizeSubjectName(excelSubjectName || '');
  if (!cName || !eName) return false;
  if (cName === eName) return true;

  const aliases: Record<string, string[]> = {
    'francais': ['fr', 'francais'],
    'lectureetudetexte': ['lecture', 'etudetexte', 'lec', 'comprehension', 'lectureetudetexte'],
    'communicationecrite': ['expressionecrite', 'communicationecrite', 'redaction', 'ce', 'communication'],
    'mathematiques': ['maths', 'math', 'mathematique', 'mathematiques'],
    'anglais': ['ang', 'angl', 'anglais'],
    'histoiregeographie': ['hg', 'histgeo', 'histoiregeo', 'histoiregeographie'],
    'physiquechimietechnologie': ['pct', 'physiquechimie', 'physique', 'chimie', 'pctphysiquechimie'],
    'sciencesdelavieetdelaterre': ['svt', 'sciencesvieeterre', 'biologie', 'svtsciences'],
    'educationphysiqueetsportive': ['eps', 'sport', 'educationphysique'],
    'philosophie': ['philo', 'philosophie'],
    'conduite': ['comportement', 'discipline', 'civisme', 'moral', 'conduct']
  };

  for (const [key, list] of Object.entries(aliases)) {
    const listNorm = [key, ...list].map(normalizeSubjectName);
    if (listNorm.includes(cName) && listNorm.includes(eName)) {
      return true;
    }
  }

  if (cName.length >= 4 && eName.length >= 4) {
    if (cName.includes(eName) || eName.includes(cName)) return true;
  }

  return false;
};

export const formatGrade = (val: any): string => {
  if (val === undefined || val === null || val === '' || isNaN(val)) return '-';
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num)) return '-';
  const rounded = Math.round(num * 100) / 100;
  return rounded.toString().replace('.', ',');
};

export const parseGrade = (val: any): { valid: boolean; num: number | null; error?: string } => {
  if (val === undefined || val === null || val === '' || String(val).trim() === '') {
    return { valid: true, num: null };
  }
  const cleanStr = String(val).trim().replace(',', '.');
  const num = parseFloat(cleanStr);
  if (isNaN(num)) return { valid: false, num: null, error: `Valeur non numérique: ${val}` };
  if (num < 0 || num > 20) return { valid: false, num: null, error: `Note hors plage (0-20): ${num}` };
  const rounded = Math.round(num * 100) / 100;
  return { valid: true, num: rounded };
};

export const isValidGradeInput = (rawVal: string, maxVal: number = 20): boolean => {
  if (rawVal === '') return true;
  // Accepts digits with optional single dot or comma and up to 2 decimals
  if (!/^\d*(?:[.,]\d{0,2})?$/.test(rawVal)) return false;
  const num = parseFloat(rawVal.replace(',', '.'));
  if (!isNaN(num) && num > maxVal) return false;
  return true;
};

export default function Grades({ cycle = 'all' }: GradesProps) {
  const [searchParams] = useSearchParams();
  const confirm = useConfirm();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  const [classes, setClasses] = React.useState([]);
  const [selectedClasse, setSelectedClasse] = React.useState('');

  React.useEffect(() => {
    const classeId = searchParams.get('classeId');
    if (classeId) {
      setSelectedClasse(classeId);
    }
  }, [searchParams]);
  const [matieres, setMatieres] = React.useState([]);
  const [user, setUser] = React.useState<any>(null);
  const [eleves, setEleves] = React.useState([]);

  const isPrimary = React.useCallback((c?: any) => {
    return isPrimaryOrMaternelleClass(c || classeDetails, cycle);
  }, [cycle]);
  const [notes, setNotes] = React.useState([]);
  const [exclusions, setExclusions] = React.useState<any[]>([]);
  const [mentions, setMentions] = React.useState<any[]>([]);
  const [classeDetails, setClasseDetails] = React.useState<any>(null);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showRapidEntryModal, setShowRapidEntryModal] = React.useState(false);
  const [modalFormData, setModalFormData] = React.useState({
    classe_id: '',
    eleve_id: '',
    matiere_id: '',
    trimestre: 1,
    date_evaluation: new Date().toISOString().split('T')[0],
  });

  const reloadGrades = React.useCallback(() => {
    if (selectedClasse) {
      apiFetch(`/api/notes/${selectedClasse}`)
        .then(res => res.json())
        .then(data => setNotes(Array.isArray(data) ? data : []))
        .catch(() => setNotes([]));
      apiFetch('/api/exclusions')
        .then(res => res.json())
        .then(data => setExclusions(Array.isArray(data) ? data : []))
        .catch(() => setExclusions([]));
      apiFetch(`/api/bulletin-mentions?classeId=${selectedClasse}`)
        .then(res => res.json())
        .then(data => setMentions(Array.isArray(data) ? data : []))
        .catch(() => setMentions([]));
    }
  }, [selectedClasse]);

  useAppSync(() => {
    reloadGrades();
  }, 30000);

  const [notesInputs, setNotesInputs] = React.useState<Record<string, string>>({
    I1: '', I2: '', I3: '', I4: '',
    Dev1: '', Dev2: '',
    Composition: '', Examen: '',
    NoteObtenue: '', NotePerfectionnement: ''
  });

  const [showConfigEvalModal, setShowConfigEvalModal] = React.useState(false);
  const [customEvals, setCustomEvals] = React.useState<{id: string, label: string}[]>([]);
  const [newCustomEvalInput, setNewCustomEvalInput] = React.useState('');
  const [selectedGridEval, setSelectedGridEval] = React.useState<string>('EvalSommative1');
  const [selectedTrimestre, setSelectedTrimestre] = React.useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<Set<number>>(new Set());
  const [selectedEvalRapid, setSelectedEvalRapid] = React.useState<string>('EvalSommative1');
  const [importEval, setImportEval] = React.useState<string>('EvalSommative1');
  const [showAnnualBilan, setShowAnnualBilan] = React.useState(false);
  const [showBulletinHeaderModal, setShowBulletinHeaderModal] = React.useState(false);
  const [bulletinHeaderData, setBulletinHeaderData] = React.useState<any>(null);

  // Result Publication state
  const [publications, setPublications] = React.useState<any[]>([]);
  const [showPublishModal, setShowPublishModal] = React.useState(false);
  const [showPublicationsCenterModal, setShowPublicationsCenterModal] = React.useState(false);
  const [showPostImportPublishModal, setShowPostImportPublishModal] = React.useState(false);
  const [postImportDetails, setPostImportDetails] = React.useState<any>(null);
  const [publishTargetCycle, setPublishTargetCycle] = React.useState<boolean>(false);
  const [publishAllowDownload, setPublishAllowDownload] = React.useState<boolean>(true);
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [pubCenterCycleTab, setPubCenterCycleTab] = React.useState<'primaire' | 'secondaire'>(
    cycle === 'primaire' ? 'primaire' : 'secondaire'
  );

  React.useEffect(() => {
    if (cycle === 'primaire') {
      setPubCenterCycleTab('primaire');
    } else if (cycle === 'secondaire') {
      setPubCenterCycleTab('secondaire');
    } else if (classeDetails) {
      setPubCenterCycleTab(isPrimary(classeDetails) ? 'primaire' : 'secondaire');
    }
  }, [cycle, classeDetails]);

  const fetchPublications = React.useCallback(async () => {
    try {
      const cycleQuery = cycle !== 'all' ? `?cycle=${cycle}` : '';
      const res = await apiFetch(`/api/publications${cycleQuery}`);
      if (res.ok) {
        const data = await res.json();
        setPublications(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erreur lors de la récupération des publications:", e);
    }
  }, [cycle]);

  React.useEffect(() => {
    fetchPublications();
  }, [fetchPublications]);

  const currentPublication = React.useMemo(() => {
    if (!classeDetails) return null;
    const isPrim = isPrimary(classeDetails);
    const expectedCycle = isPrim ? 'primaire' : 'secondaire';
    const typePeriode = isPrim ? 'evaluation' : 'trimestre';
    const valPeriode = isPrim ? selectedGridEval : (selectedTrimestre?.toString() || '1');

    const classPub = publications.find(p => 
      p.type_periode === typePeriode && 
      p.periode_valeur === valPeriode && 
      p.classe_id === parseInt(selectedClasse) &&
      (p.cycle === expectedCycle || !p.cycle)
    );
    if (classPub) return classPub;

    return publications.find(p => 
      p.type_periode === typePeriode && 
      p.periode_valeur === valPeriode && 
      (!p.classe_id || p.classe_id === null) &&
      (p.cycle === expectedCycle || !p.cycle)
    ) || null;
  }, [publications, classeDetails, selectedGridEval, selectedTrimestre, selectedClasse]);

  const isCurrentPeriodPublished = currentPublication?.est_publie === 1;
  const isCurrentBulletinDownloadable = currentPublication?.bulletin_telechargeable === 1;

  const pathPermission = user?.permissions?.find((p: any) => (typeof p === 'string' ? p === '/notes' : p.path === '/notes'));
  const isTeacher = user?.role === 'enseignant';
  const isAdmin = ['admin', 'super_admin', 'direction', 'censeur'].includes(user?.role || '');

  const canWrite = user && (isAdmin || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true))) && !(isTeacher && isCurrentPeriodPublished);

  const handleTogglePublish = async (publish: boolean, allowDownload: boolean = true, allCycle: boolean = false) => {
    if (!classeDetails) return;
    setIsPublishing(true);
    try {
      const isPrim = isPrimary(classeDetails);
      const typePeriode = isPrim ? 'evaluation' : 'trimestre';
      const valPeriode = isPrim ? selectedGridEval : (selectedTrimestre?.toString() || '1');

      if (allCycle) {
        const res = await apiFetch('/api/publications/bulk-cycle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cycle: isPrim ? 'primaire' : 'secondaire',
            type_periode: typePeriode,
            periode_valeur: valPeriode,
            est_publie: publish ? 1 : 0,
            bulletin_telechargeable: allowDownload ? 1 : 0
          })
        });
        if (res.ok) {
          toast.success(publish 
            ? `Résultats publiés pour tout le cycle ${isPrim ? 'primaire' : 'secondaire'} ! Les parents ont été notifiés.` 
            : `Résultats dépubliés pour tout le cycle.`
          );
        }
      } else {
        const res = await apiFetch('/api/publications/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classe_id: parseInt(selectedClasse),
            cycle: isPrim ? 'primaire' : 'secondaire',
            type_periode: typePeriode,
            periode_valeur: valPeriode,
            est_publie: publish ? 1 : 0,
            bulletin_telechargeable: allowDownload ? 1 : 0
          })
        });
        if (res.ok) {
          toast.success(publish 
            ? `Résultats de la classe publiés ! Les parents ont été notifiés.` 
            : `Résultats dépubliés.`
          );
        }
      }
      await fetchPublications();
      setShowPublishModal(false);
      setShowPostImportPublishModal(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la mise à jour de la publication");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleToggleBulletinLock = async (downloadable: boolean, allCycle: boolean = false) => {
    if (!classeDetails) return;
    try {
      const isPrim = isPrimary(classeDetails);
      const typePeriode = isPrim ? 'evaluation' : 'trimestre';
      const valPeriode = isPrim ? selectedGridEval : (selectedTrimestre?.toString() || '1');

      const res = await apiFetch('/api/publications/toggle-bulletin-lock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_id: allCycle ? null : parseInt(selectedClasse),
          cycle: allCycle ? (isPrim ? 'primaire' : 'secondaire') : null,
          type_periode: typePeriode,
          periode_valeur: valPeriode,
          bulletin_telechargeable: downloadable ? 1 : 0
        })
      });
      if (res.ok) {
        toast.success(downloadable 
          ? "Téléchargement du bulletin déverrouillé pour les parents !" 
          : "Téléchargement du bulletin verrouillé par l'administration."
        );
        await fetchPublications();
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur de verrouillage du bulletin");
    }
  };

  const activeCycleKey = React.useMemo(() => {
    if (cycle === 'secondaire') return 'secondaire';
    if (cycle === 'primaire') return 'primaire_maternelle';
    if (selectedClasse && classes.length > 0) {
      const cls = classes.find((c: any) => c.id === parseInt(selectedClasse));
      if (cls && !isPrimary(cls)) return 'secondaire';
    }
    return 'primaire_maternelle';
  }, [cycle, selectedClasse, classes]);

  const fetchActiveBulletinHeader = React.useCallback(async () => {
    try {
      const res = await apiFetch(`/api/bulletin-headers/${activeCycleKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          setBulletinHeaderData(data);
        }
      }
    } catch (e) {
      console.error("Erreur lors de la récupération de l'en-tête de bulletin:", e);
    }
  }, [activeCycleKey]);

  React.useEffect(() => {
    fetchActiveBulletinHeader();
  }, [fetchActiveBulletinHeader]);

  const [classEvalConfig, setClassEvalConfig] = React.useState<Record<number, string[]>>({
    1: ['EvalFormative', 'EvalSommative1', 'EvalSommative2'],
    2: ['EvalFormative', 'EvalSommative1', 'EvalSommative2'],
    3: ['EvalFormative', 'EvalSommative1', 'EvalSommative2']
  });

  React.useEffect(() => {
    if (selectedClasse) {
      const savedConfig = localStorage.getItem(`class_eval_config_${selectedClasse}`);
      if (savedConfig) {
        try {
          const parsed = JSON.parse(savedConfig);
          const cleaned: any = {};
          for (const k in parsed) {
            if (Array.isArray(parsed[k])) {
              cleaned[k] = parsed[k].filter((x: string) => x !== 'NoteObtenue' && x !== 'NotePerfectionnement');
            }
          }
          setClassEvalConfig(cleaned);
        } catch (e) {}
      } else {
        const currentClasseObj = classes.find((c: any) => c.id === parseInt(selectedClasse));
        const isPrim = isPrimary(currentClasseObj);
        if (isPrim) {
          setClassEvalConfig({
            1: ['EvalFormative', 'EvalSommative1', 'EvalSommative2'],
            2: ['EvalFormative', 'EvalSommative1', 'EvalSommative2'],
            3: ['EvalFormative', 'EvalSommative1', 'EvalSommative2']
          });
        } else {
          setClassEvalConfig({
            1: ['EvalFormative', 'EvalSommative1', 'I1', 'I2', 'Dev1', 'Composition'],
            2: ['EvalFormative', 'EvalSommative1', 'I1', 'I2', 'Dev1', 'Composition'],
            3: ['EvalFormative', 'EvalSommative1', 'I1', 'I2', 'Dev1', 'Composition']
          });
        }
      }

      const savedCustom = localStorage.getItem(`custom_evals_${selectedClasse}`);
      if (savedCustom) {
        try { setCustomEvals(JSON.parse(savedCustom)); } catch (e) {}
      } else {
        setCustomEvals([]);
      }
    }
  }, [selectedClasse, classes]);

  React.useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [selectedClasse, selectedTrimestre]);

  const [classMatieres, setClassMatieres] = React.useState<any[]>([]);
  const [isLoadingClassMatieres, setIsLoadingClassMatieres] = React.useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = React.useState(false);

  React.useEffect(() => {
    if (modalFormData.classe_id) {
      setIsLoadingClassMatieres(true);
      apiFetch(`/api/classes/${modalFormData.classe_id}/details`)
        .then(res => res.json())
        .then(data => {
          // Filter by teacher if applicable
          const matieres = Array.isArray(data.matieres) ? data.matieres : [];
          if (user?.role === 'enseignant' && user?.enseignant_id) {
            setClassMatieres(matieres.filter((m: any) => m.enseignant_id === user.enseignant_id));
          } else {
            setClassMatieres(matieres);
          }
        })
        .finally(() => setIsLoadingClassMatieres(false));
    } else {
      setClassMatieres([]);
    }
  }, [modalFormData.classe_id, user]);

  React.useEffect(() => {
    if (modalFormData.eleve_id && modalFormData.matiere_id && modalFormData.trimestre) {
      setIsLoadingExisting(true);
      apiFetch(`/api/notes/eleve/${modalFormData.eleve_id}/matiere/${modalFormData.matiere_id}/trimestre/${modalFormData.trimestre}`)
        .then(res => res.json())
        .then(existingNotes => {
          const newInputs = {
            I1: '', I2: '', I3: '', I4: '',
            Dev1: '', Dev2: '',
            Composition: '', Examen: '',
            NoteObtenue: '', NotePerfectionnement: ''
          };
          existingNotes.forEach((n: any) => {
            if (n.type_evaluation in newInputs) {
              (newInputs as any)[n.type_evaluation] = n.note.toString();
            }
          });
          setNotesInputs(newInputs);
        })
        .finally(() => setIsLoadingExisting(false));
    } else {
      setNotesInputs({
        I1: '', I2: '', I3: '', I4: '',
        Dev1: '', Dev2: '',
        Composition: '', Examen: '',
        NoteObtenue: '', NotePerfectionnement: ''
      });
    }
  }, [modalFormData.eleve_id, modalFormData.matiere_id, modalFormData.trimestre]);

  const [viewMode, setViewMode] = React.useState<'grid' | 'stats'>('grid');
  const [showGridModal, setShowGridModal] = React.useState(false);
  const [isLoadingGrid, setIsLoadingGrid] = React.useState(false);
  const [showAnnualStats, setShowAnnualStats] = React.useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = React.useState(false);
  const [rapidEntryData, setRapidEntryData] = React.useState<any[]>([]);
  const [selectedMatiereRapid, setSelectedMatiereRapid] = React.useState('');
  const [selectedTrimestreRapid, setSelectedTrimestreRapid] = React.useState(1);
  const [rapidEntryDate, setRapidEntryDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isSavingRapid, setIsSavingRapid] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importSheets, setImportSheets] = React.useState<Record<string, any[]>>({});
  const [selectedImportSheet, setSelectedImportSheet] = React.useState('');
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importMatiereId, setImportMatiereId] = React.useState('');
  const [importTrimestre, setImportTrimestre] = React.useState(1);
  const [importDate, setImportDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importPreview, setImportPreview] = React.useState<any[]>([]);
  const [importFileSubjects, setImportFileSubjects] = React.useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Notes Locking & Teacher Permission State
  const [isNotesLocked, setIsNotesLocked] = React.useState(false);
  const [canManageLock, setCanManageLock] = React.useState(false);
  const [hasApprovedPermission, setHasApprovedPermission] = React.useState(false);
  const [approvedPermissions, setApprovedPermissions] = React.useState<any[]>([]);
  const [isTogglingLock, setIsTogglingLock] = React.useState(false);
  const [showPermissionModal, setShowPermissionModal] = React.useState(false);
  const [permissionForm, setPermissionForm] = React.useState({
    classe_id: '',
    matiere_id: '',
    trimestre: 1,
    type_evaluation: '',
    description: ''
  });
  const [isSubmittingPermission, setIsSubmittingPermission] = React.useState(false);

  // New states for refined modals
  const [showLockConfirmModal, setShowLockConfirmModal] = React.useState(false);
  const [lockNextState, setLockNextState] = React.useState(false);

  const [showBulletinWarningModal, setShowBulletinWarningModal] = React.useState(false);
  const [bulletinWarningData, setBulletinWarningData] = React.useState<{
    eleve: any;
    type: 'none' | 'partial';
    preview: boolean;
    evalType?: string;
  } | null>(null);

  const [showMotifModal, setShowMotifModal] = React.useState(false);
  const [bulletinMotif, setBulletinMotif] = React.useState('');

  const isEntryRestricted = Boolean(user?.role === 'enseignant' && isNotesLocked && !hasApprovedPermission);

  const fetchNotesLockStatus = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/notes-lock-status');
      if (res.ok) {
        const data = await res.json();
        setIsNotesLocked(Boolean(data.is_locked));
        setCanManageLock(Boolean(data.can_manage));
        setHasApprovedPermission(Boolean(data.has_approved_request));
        setApprovedPermissions(data.approved_requests || []);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l'état de verrouillage des notes:", err);
    }
  }, []);

  React.useEffect(() => {
    fetchNotesLockStatus();
  }, [fetchNotesLockStatus]);

  const handleToggleExclusion = async (eleveId: number, currentExcluStatus: boolean) => {
    if (!selectedTrimestre) return;
    try {
      const response = await apiFetch('/api/exclusions', {
        method: 'POST',
        body: JSON.stringify({
          eleve_id: eleveId,
          trimestre: selectedTrimestre,
          exclu: !currentExcluStatus,
          is_manual: true
        })
      });
      if (response.ok) {
        toast.success("Statut d'exclusion mis à jour");
        reloadGrades();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    }
  };

  const handleToggleMention = async (eleveId: number, type: string, currentStatus: boolean) => {
    if (!selectedTrimestre || !selectedClasse) return;
    try {
      const response = await apiFetch('/api/bulletin-mentions', {
        method: 'POST',
        body: JSON.stringify({
          eleve_id: eleveId,
          classe_id: parseInt(selectedClasse),
          trimestre: selectedTrimestre,
          type,
          active: !currentStatus
        })
      });
      if (response.ok) {
        toast.success("Mention mise à jour");
        reloadGrades();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    }
  };

  const handleBulkToggleMention = async (type: string, active: boolean) => {
    if (!selectedTrimestre || !selectedClasse) return;
    try {
      const response = await apiFetch('/api/bulletin-mentions/bulk', {
        method: 'POST',
        body: JSON.stringify({
          classe_id: parseInt(selectedClasse),
          trimestre: selectedTrimestre,
          type,
          active
        })
      });
      if (response.ok) {
        toast.success("Mentions mises à jour pour toute la classe");
        reloadGrades();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Erreur lors de la mise à jour groupée");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    }
  };

  const handleToggleNotesLock = () => {
    setLockNextState(!isNotesLocked);
    setShowLockConfirmModal(true);
  };

  const confirmToggleNotesLock = async () => {
    setShowLockConfirmModal(false);
    setIsTogglingLock(true);
    try {
      const res = await apiFetch('/api/notes-lock-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_verrouillees: lockNextState ? 1 : 0 })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors du verrouillage");
      }
      const data = await res.json();
      setIsNotesLocked(data.notes_verrouillees === 1);
      toast.success(data.notes_verrouillees === 1 
        ? "La saisie et l'importation des notes ont été VERROUILLÉES avec succès." 
        : "La saisie et l'importation des notes ont été DÉVERROUILLÉES avec succès."
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour");
    } finally {
      setIsTogglingLock(false);
    }
  };

  const handleSubmitPermissionRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissionForm.description.trim()) {
      toast.error("Veuillez indiquer le motif de votre demande de permission.");
      return;
    }

    setIsSubmittingPermission(true);
    try {
      const res = await apiFetch('/api/timetable-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type_modification: 'notes',
          classe_id: permissionForm.classe_id ? parseInt(permissionForm.classe_id) : (selectedClasse ? parseInt(selectedClasse) : null),
          matiere_id: permissionForm.matiere_id ? parseInt(permissionForm.matiere_id) : null,
          trimestre: permissionForm.trimestre,
          type_evaluation: permissionForm.type_evaluation || null,
          description: permissionForm.description
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'envoi de la demande");
      }

      toast.success("Votre demande de permission a été transmise avec succès à l'administration !");
      setShowPermissionModal(false);
      setPermissionForm({
        classe_id: '',
        matiere_id: '',
        trimestre: 1,
        type_evaluation: '',
        description: ''
      });
      fetchNotesLockStatus();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la demande");
    } finally {
      setIsSubmittingPermission(false);
    }
  };

  React.useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(savedUser);
    
    if (savedUser.role === 'enseignant' && savedUser.enseignant_id) {
      const token = localStorage.getItem('token');
      apiFetch('/api/teacher-classes', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
        .then(res => res.json())
        .then(data => setClasses(Array.isArray(data) ? data : []))
        .catch(() => setClasses([]));
    } else {
      apiFetch('/api/classes')
        .then(res => res.json())
        .then(data => setClasses(Array.isArray(data) ? data : []))
        .catch(() => setClasses([]));
    }
    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(allMatieres => {
        const matieresArray = Array.isArray(allMatieres) ? allMatieres : [];
        if (savedUser.role === 'enseignant' && savedUser.enseignant_id) {
          apiFetch('/api/enseignants')
            .then(res => res.json())
            .then(enseignants => {
              const enseignantsArray = Array.isArray(enseignants) ? enseignants : [];
              const teacher = enseignantsArray.find((e: any) => e.id === savedUser.enseignant_id);
              if (teacher && teacher.matieres_ids) {
                const ids = teacher.matieres_ids.split(',').map((id: string) => parseInt(id.trim()));
                setMatieres(matieresArray.filter((m: any) => ids.includes(m.id)));
              } else {
                setMatieres([]);
              }
            })
            .catch(() => setMatieres([]));
        } else {
          setMatieres(matieresArray);
        }
      })
      .catch(() => setMatieres([]));
    apiFetch('/api/eleves')
      .then(res => res.json())
      .then(data => setEleves(Array.isArray(data) ? data : []))
      .catch(() => setEleves([]));
    apiFetch('/api/exclusions')
      .then(res => res.json())
      .then(data => setExclusions(Array.isArray(data) ? data : []))
      .catch(() => setExclusions([]));
    const token = localStorage.getItem('token');
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSchoolInfo(data);
        }
      })
      .catch(err => console.error(err));
  }, []);

  React.useEffect(() => {
    if (selectedClasse) {
      apiFetch(`/api/classes/${selectedClasse}/details`)
        .then(res => res.json())
        .then(data => {
          if (data && (data.classe || data.eleves)) {
            const safeData = {
              ...data,
              eleves: Array.isArray(data?.eleves) ? data.eleves : [],
              matieres: Array.isArray(data?.matieres) ? data.matieres : [],
              notes: Array.isArray(data?.notes) ? data.notes : []
            };
            setClasseDetails(safeData);
            setClassMatieres(safeData.matieres);
          }
        })
        .catch(err => console.error("Erreur chargement détails classe:", err));

      apiFetch(`/api/notes/${selectedClasse}`)
        .then(res => res.json())
        .then(data => setNotes(Array.isArray(data) ? data : []))
        .catch(() => setNotes([]));
    } else {
      setClasseDetails(null);
      setClassMatieres([]);
      setNotes([]);
    }
  }, [selectedClasse]);

  const openGrid = (trimestre: number) => {
    if (!selectedClasse) return;
    setSelectedTrimestre(trimestre);
    setViewMode('grid');
    setIsLoadingGrid(true);
    apiFetch(`/api/classes/${selectedClasse}/details`)
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement des détails');
        return res.json();
      })
      .then(data => {
        setClasseDetails(data);
        setShowGridModal(true);
      })
      .catch(err => {
        console.error(err);
        toast.error("Impossible de charger la grille des notes.");
      })
      .finally(() => setIsLoadingGrid(false));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEntryRestricted) {
      setShowModal(false);
      setShowPermissionModal(true);
      toast.error("La saisie des notes est verrouillée par l'administration. Veuillez soumettre une demande de permission.");
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const enseignant_id = user.enseignant_id;
    
    const currentMatiere = classMatieres.find((m: any) => m.matiere_id?.toString() === modalFormData.matiere_id?.toString());
    const isDisciplinaire = currentMatiere?.est_disciplinaire;

    let notesToSave: any[] = [];
    if (isDisciplinaire) {
      if (notesInputs.NoteDisciplinaire !== '') {
        notesToSave = [{
          type: 'NoteDisciplinaire',
          note: parseFloat(notesInputs.NoteDisciplinaire)
        }];
      }
    } else {
      notesToSave = (Object.entries(notesInputs) as [string, string][])
        .filter(([_, value]) => value !== '')
        .map(([type, value]) => {
          let noteType = type;
          if (modalFormData.type_evaluation) {
            noteType = (type === 'NoteObtenue' || type === 'NotePerfectionnement') 
              ? `${modalFormData.type_evaluation}_${type}` 
              : modalFormData.type_evaluation;
          }
          return {
            type: noteType,
            note: parseFloat(value)
          };
        });
    }

    if (notesToSave.length === 0) {
      toast.error("Veuillez saisir au moins une note.");
      return;
    }

    apiFetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eleve_id: modalFormData.eleve_id,
        matiere_id: modalFormData.matiere_id,
        trimestre: modalFormData.trimestre,
        date_evaluation: modalFormData.date_evaluation,
        notes: notesToSave,
        enseignant_id 
      })
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || "Erreur lors de l'enregistrement des notes.");
        return;
      }
      setShowModal(false);
      if (selectedClasse) {
        apiFetch(`/api/notes/${selectedClasse}`)
          .then(res => res.json())
          .then(data => setNotes(Array.isArray(data) ? data : []))
          .catch(() => setNotes([]));
      }
    });
  };

  const getAppreciation = (moy: number | null) => {
    if (moy === null) return '-';
    if (moy >= 16) return 'Très Bien';
    if (moy >= 14) return 'Bien';
    if (moy >= 12) return 'Assez Bien';
    if (moy >= 10) return 'Passable';
    if (moy >= 8) return 'Médiocre';
    return 'Insuffisant';
  };

  const calculateStudentGrades = (eleveId: number, notes: any[], matieres: any[], trimestre: number, targetEval?: string) => {
    const currentClasse = classeDetails || classes.find((c: any) => c.id === parseInt(selectedClasse));
    const isPrimaryClass = isPrimary(currentClasse);
    const safeNotes = Array.isArray(notes) ? notes : [];

    const calculateForTrimestre = (t: number) => {
      const studentNotes = safeNotes.filter(n => n.eleve_id === eleveId && n.trimestre === t);
      
      const subjectsGrades = matieres.map(m => {
        const getNote = (type: string) => {
          const noteObj = studentNotes.find(n => n.matiere_id === m.matiere_id && (n.type_evaluation === type || n.type_evaluation?.endsWith(`_${type}`)));
          return noteObj ? noteObj.note : null;
        };

        const noteObtenue = getNote('NoteObtenue') ?? getNote('note_obtenue');
        const notePerfectionnement = getNote('NotePerfectionnement') ?? getNote('note_perfectionnement');

        const i1 = getNote('I1');
        const i2 = getNote('I2');
        const i3 = getNote('I3');
        const i4 = getNote('I4');
        const mi_imported = getNote('MI');
        const d1 = getNote('Dev1');
        const d2 = getNote('Dev2');

        let moy: number | null = null;
        if (m.est_disciplinaire) {
          const disciplinaireNote = studentNotes.find(n => n.matiere_id === m.matiere_id && (n.type_evaluation === 'NoteDisciplinaire' || n.type_evaluation === 'Disciplinaire'));
          moy = disciplinaireNote && disciplinaireNote.note !== null ? Number(disciplinaireNote.note) : null;
        } else if (isPrimaryClass) {
          const subjectNotes = studentNotes.filter(n => 
            n.matiere_id === m.matiere_id && 
            (!targetEval || n.type_evaluation === targetEval || n.type_evaluation?.startsWith(targetEval + '_'))
          );
          const evalMap = new Map<string, { noteObt?: number; notePerf?: number; singleNote?: number }>();
          
          subjectNotes.forEach(n => {
            let rawType = n.type_evaluation || '';
            let evalBase = rawType.replace(/_(NoteObtenue|NotePerfectionnement)$/, '');
            if (!evalMap.has(evalBase)) evalMap.set(evalBase, {});
            const item = evalMap.get(evalBase)!;
            
            if (rawType.endsWith('NoteObtenue') || rawType === 'NoteObtenue') {
              item.noteObt = n.note !== null ? Number(n.note) : undefined;
            } else if (rawType.endsWith('NotePerfectionnement') || rawType === 'NotePerfectionnement') {
              item.notePerf = n.note !== null ? Number(n.note) : undefined;
            } else {
              item.singleNote = n.note !== null ? Number(n.note) : undefined;
            }
          });

          const scores: number[] = [];
          evalMap.forEach(item => {
            if (item.noteObt !== undefined || item.notePerf !== undefined) {
              scores.push(Math.min(20, Math.max(0, (item.noteObt || 0) + (item.notePerf || 0))));
            } else if (item.singleNote !== undefined) {
              scores.push(item.singleNote);
            }
          });

          if (scores.length > 0) {
            moy = scores.reduce((a, b) => a + b, 0) / scores.length;
          } else {
            const legacyNotes = [i1, i2, i3, i4, d1, d2].filter(n => n !== null) as number[];
            if (legacyNotes.length > 0) {
              moy = legacyNotes.reduce((a, b) => a + b, 0) / legacyNotes.length;
            }
          }
        } else {
          const interrogations = [i1, i2, i3, i4].filter(n => n !== null) as number[];
          const mi_calc = interrogations.length > 0 ? interrogations.reduce((a, b) => a + b, 0) / interrogations.length : null;
          const mi = mi_imported !== null ? mi_imported : mi_calc;

          const components = [mi, d1, d2].filter(n => n !== null) as number[];
          moy = components.length > 0 ? components.reduce((a, b) => a + b, 0) / components.length : null;
        }

        const interrogations = [i1, i2, i3, i4].filter(n => n !== null) as number[];
        const mi_calc = interrogations.length > 0 ? interrogations.reduce((a, b) => a + b, 0) / interrogations.length : null;
        const mi = mi_imported !== null ? mi_imported : mi_calc;

        const coef = m.coefficient || 1;
        const moyCoef = moy !== null ? moy * coef : null;

        return {
          matiere_id: m.matiere_id,
          matiere_nom: m.matiere_nom,
          parent_id: m.parent_id,
          categorie: m.categorie,
          est_disciplinaire: m.est_disciplinaire,
          noteObtenue,
          notePerfectionnement,
          mi,
          d1,
          d2,
          moy,
          coef: coef,
          moyCoef,
          appreciation: getAppreciation(moy)
        };
      });

      const finalGrades = subjectsGrades.map(sg => {
        const children = subjectsGrades.filter(other => other.parent_id === sg.matiere_id);
        if (children.length > 0) {
          const validChildren = children.filter(c => c.moy !== null);
          if (validChildren.length > 0) {
            const totalMoy = validChildren.reduce((acc, c) => acc + (c.moy || 0), 0);
            const avgMoy = totalMoy / validChildren.length;
            return {
              ...sg,
              moy: avgMoy,
              moyCoef: avgMoy * sg.coef,
              appreciation: getAppreciation(avgMoy),
              hasChildren: true
            };
          }
        }
        return sg;
      });

      // Filter out parents that have children (they don't count directly if children exist, 
      // but wait, the prompt says "Français" won't have grades, only sub-subjects.
      // So the parent's coefficient should be used for the group?
      // Usually, either the parent has a coef and children are sub-parts, 
      // or children have their own coefs.
      // The requirement says "Français" vertical grouping two lines.
      
      // Filter out parents that have children (in Secondary cycle, the mother subject has NO global coefficient;
      // each sub-subject carries its own individual coefficient, and standalone subjects carry theirs).
      const validGrades = finalGrades.filter(sg => {
        const hasChildren = finalGrades.some(other => other.parent_id === sg.matiere_id);
        if (hasChildren) return false;
        return sg.moy !== null && sg.moy !== undefined;
      });

      const totalMoyCoef = validGrades.reduce((acc, sg) => acc + ((sg.moy || 0) * (sg.coef || 1)), 0);
      const totalCoef = validGrades.reduce((acc, sg) => acc + (sg.coef || 1), 0);
      const globalMoy = totalCoef > 0 ? totalMoyCoef / totalCoef : 0;

      const evaluatedSubjectsForSeuil = finalGrades.filter(sg => {
        const hasChildren = finalGrades.some(other => other.parent_id === sg.matiere_id);
        if (hasChildren) return false;
        return sg.moy !== null;
      });
      const totalSubjectsCount = evaluatedSubjectsForSeuil.length;
      const validatedSubjectsCount = evaluatedSubjectsForSeuil.filter(sg => (sg.moy || 0) >= 10).length;
      const seuil = `${validatedSubjectsCount}/${totalSubjectsCount}`;
      const seuilAtteint = totalSubjectsCount > 0 && validatedSubjectsCount >= Math.ceil(totalSubjectsCount / 2) ? 'Oui' : 'Non';

      const disciplineGradeObj = finalGrades.find(sg => sg.est_disciplinaire);
      const disciplineMoy = disciplineGradeObj ? disciplineGradeObj.moy : null;

      return {
        subjectsGrades: finalGrades,
        totalMoyCoef,
        totalCoef,
        globalMoy,
        totalSubjectsCount,
        validatedSubjectsCount,
        seuil,
        seuilAtteint,
        hasData: totalCoef > 0,
        disciplineMoy
      };
    };

    const trim1 = calculateForTrimestre(1);
    const trim2 = calculateForTrimestre(2);
    const trim3 = calculateForTrimestre(3);

    const currentTrimGrades = calculateForTrimestre(trimestre);

    // Annual average considering only trimesters with data
    const averages = [trim1, trim2, trim3].filter(t => t.hasData).map(t => t.globalMoy);
    const annualMoy = averages.length > 0 ? averages.reduce((a, b) => a + b, 0) / averages.length : 0;

    // Annual subject averages
    const annualSubjectsGrades = matieres.map(m => {
      const subjectAverages = [trim1, trim2, trim3]
        .filter(t => t.hasData)
        .map(t => t.subjectsGrades.find((sg: any) => sg.matiere_id === m.matiere_id)?.moy)
        .filter(moy => moy !== null && moy !== undefined) as number[];
      
      const annualMoy = subjectAverages.length > 0 ? subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length : null;
      return {
        matiere_id: m.matiere_id,
        moy: annualMoy
      };
    });

    return {
      ...currentTrimGrades,
      t1: trim1.globalMoy,
      t2: trim2.globalMoy,
      t3: trim3.globalMoy,
      t1HasData: trim1.hasData,
      t2HasData: trim2.hasData,
      t3HasData: trim3.hasData,
      annualMoy,
      annualSubjectsGrades
    };
  };

  const calculateStudentAnnualBilan = (eleveId: number, notes: any[], matieres: any[]) => {
    let evalsDone = 0;
    let evalsValidated = 0;

    const studentNotes = (notes || []).filter(n => n.eleve_id === eleveId && [1, 2, 3].includes(n.trimestre));
    const evalGroups = new Map<string, { noteObt?: number; notePerf?: number; singleNote?: number }>();

    studentNotes.forEach(n => {
      let rawType = n.type_evaluation || '';
      let evalBase = rawType.replace(/_(NoteObtenue|NotePerfectionnement)$/, '');
      const key = `${n.trimestre}_${n.matiere_id}_${evalBase}`;
      
      if (!evalGroups.has(key)) {
        evalGroups.set(key, {});
      }
      const group = evalGroups.get(key)!;

      if (rawType.endsWith('NoteObtenue') || rawType === 'NoteObtenue') {
        group.noteObt = n.note !== null && n.note !== undefined ? Number(n.note) : undefined;
      } else if (rawType.endsWith('NotePerfectionnement') || rawType === 'NotePerfectionnement') {
        group.notePerf = n.note !== null && n.note !== undefined ? Number(n.note) : undefined;
      } else {
        group.singleNote = n.note !== null && n.note !== undefined ? Number(n.note) : undefined;
      }
    });

    evalGroups.forEach(group => {
      let score: number | null = null;
      if (group.noteObt !== undefined || group.notePerf !== undefined) {
        score = Math.min(20, (group.noteObt || 0) + (group.notePerf || 0));
      } else if (group.singleNote !== undefined) {
        score = group.singleNote;
      }

      if (score !== null) {
        evalsDone++;
        if (score >= 10) {
          evalsValidated++;
        }
      }
    });

    if (evalsDone === 0) {
      [1, 2, 3].forEach(t => {
        const trimRes = calculateStudentGrades(eleveId, notes, matieres, t);
        evalsDone += trimRes.totalSubjectsCount;
        evalsValidated += trimRes.validatedSubjectsCount;
      });
    }

    const seuilRatio = `${evalsValidated}/${evalsDone}`;
    const seuilAtteint = evalsDone > 0 && evalsValidated >= Math.ceil(evalsDone / 2) ? 'Oui' : 'Non';
    const currentClasse = classeDetails || classes.find((c: any) => c.id === parseInt(selectedClasse));
    const isPrim = isPrimary(currentClasse);
    const trim3Grades = calculateStudentGrades(eleveId, notes, matieres, 3);
    const annualMoy = trim3Grades.annualMoy;
    const decision = isPrim ? (seuilAtteint === 'Oui' ? 'Passe' : 'Redouble') : (annualMoy >= 10 ? 'Passe' : 'Redouble');

    return {
      evalsDone,
      evalsValidated,
      seuilRatio,
      seuilAtteint,
      decision,
      annualMoy
    };
  };

  const allStudentsGrades = React.useMemo(() => {
    const eleves = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    const notes = Array.isArray(classeDetails?.notes) ? classeDetails.notes : [];
    const matieres = Array.isArray(classeDetails?.matieres) ? classeDetails.matieres : [];
    
    const results = new Map();
    eleves.forEach((e: any) => {
      const g = calculateStudentGrades(e.id, notes, matieres, selectedTrimestre || 1, isPrimary(classeDetails) ? selectedGridEval : undefined);
      const ab = calculateStudentAnnualBilan(e.id, notes, matieres);
      results.set(e.id, { grades: g, annualBilan: ab });
    });
    return results;
  }, [classeDetails, selectedTrimestre, selectedGridEval]);

  const sortedStudentsByMoy = React.useMemo(() => {
    const eleves = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    if (eleves.length === 0) return [];
    
    const list = eleves.map((e: any) => {
      const studentData = allStudentsGrades.get(e.id);
      return {
        id: e.id,
        moy: studentData?.grades?.globalMoy || 0
      };
    });
    return list.sort((a: any, b: any) => b.moy - a.moy);
  }, [classeDetails, allStudentsGrades]);

  const getStudentRank = (eleveId: number) => {
    const index = sortedStudentsByMoy.findIndex((s: any) => s.id === eleveId);
    if (index === -1) return '-';
    const rank = index + 1;
    return rank === 1 ? '1er' : `${rank}e`;
  };

  const sortedStudentsByAnnualMoy = React.useMemo(() => {
    const eleves = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    if (eleves.length === 0) return [];
    
    const list = eleves.map((e: any) => {
      const studentData = allStudentsGrades.get(e.id);
      return {
        id: e.id,
        annualMoy: studentData?.annualBilan?.annualMoy || 0
      };
    });
    return list.sort((a: any, b: any) => b.annualMoy - a.annualMoy);
  }, [classeDetails, allStudentsGrades]);

  const getStudentAnnualRank = (eleveId: number) => {
    const index = sortedStudentsByAnnualMoy.findIndex((s: any) => s.id === eleveId);
    if (index === -1) return '-';
    const rank = index + 1;
    return rank === 1 ? '1er' : `${rank}e`;
  };

  const groupedRecentNotes = React.useMemo(() => {
    if (!Array.isArray(notes) || notes.length === 0) return [];

    const map = new Map<string, {
      id: string;
      eleve_id: number;
      nom: string;
      prenom: string;
      matiere_id: number;
      matiere_nom: string;
      trimestre: number;
      evalBase: string;
      date_evaluation: string;
      noteObtenue?: number;
      notePerfectionnement?: number;
      singleNote?: number;
      rawNotes: any[];
    }>();

    notes.forEach((n: any) => {
      const rawType = n.type_evaluation || '';
      let evalBase = rawType.replace(/_(NoteObtenue|NotePerfectionnement)$/, '');
      if (evalBase === 'NoteObtenue' || evalBase === 'NotePerfectionnement' || !evalBase) {
        evalBase = 'Évaluation';
      }
      
      const key = `${n.eleve_id}_${n.matiere_id}_${n.trimestre}_${evalBase}_${n.date_evaluation || ''}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          eleve_id: n.eleve_id,
          nom: n.nom || '',
          prenom: n.prenom || '',
          matiere_id: n.matiere_id,
          matiere_nom: n.matiere_nom || '',
          trimestre: n.trimestre,
          evalBase: evalBase,
          date_evaluation: n.date_evaluation || '',
          rawNotes: []
        });
      }

      const item = map.get(key)!;
      item.rawNotes.push(n);

      if (rawType.endsWith('NoteObtenue') || rawType === 'NoteObtenue') {
        item.noteObtenue = n.note !== null && n.note !== undefined ? Number(n.note) : undefined;
      } else if (rawType.endsWith('NotePerfectionnement') || rawType === 'NotePerfectionnement') {
        item.notePerfectionnement = n.note !== null && n.note !== undefined ? Number(n.note) : undefined;
      } else {
        item.singleNote = n.note !== null && n.note !== undefined ? Number(n.note) : undefined;
      }
    });

    return Array.from(map.values());
  }, [notes]);

  // Helper to format evaluation title suffix (e.g. "DE L'ÉVALUATION SOMMATIVE 1")
  const getEvaluationTitleSuffix = (evalName?: string, trimNum: number = 1, isPrimary: boolean = true): string => {
    const trimWords = trimNum === 1 ? 'PREMIER' : trimNum === 2 ? 'DEUXIÈME' : 'TROISIÈME';
    const trimDigits = trimNum === 1 ? '1ER' : trimNum === 2 ? '2ÈME' : '3ÈME';

    if (!isPrimary) {
      return `DE ${trimWords} TRIMESTRE`;
    }

    if (!evalName || evalName === 'global' || evalName === 'trimestre') {
      return `DU ${trimDigits} TRIMESTRE`;
    }

    const clean = evalName.trim();
    
    // Check if it matches a custom evaluation label
    const customMatch = customEvals.find((c: any) => c.id === clean);
    const labelToCheck = customMatch ? customMatch.label : clean;

    // Evaluation Sommative 1, 2, 3...
    if (/^EvalSommative(\d+)/i.test(labelToCheck)) {
      const num = labelToCheck.match(/^EvalSommative(\d+)/i)![1];
      return `DE L'ÉVALUATION SOMMATIVE ${num}`;
    }
    if (/sommative\s*(\d*)/i.test(labelToCheck)) {
      const numMatch = labelToCheck.match(/(\d+)/);
      return numMatch ? `DE L'ÉVALUATION SOMMATIVE ${numMatch[1]}` : `DE L'ÉVALUATION SOMMATIVE`;
    }

    // Evaluation Formative 1, 2...
    if (/^EvalFormative(\d*)/i.test(labelToCheck)) {
      const num = labelToCheck.match(/^EvalFormative(\d*)/i)?.[1];
      return num ? `DE L'ÉVALUATION FORMATIVE ${num}` : `DE L'ÉVALUATION FORMATIVE`;
    }
    if (/formative/i.test(labelToCheck)) {
      const numMatch = labelToCheck.match(/(\d+)/);
      return numMatch ? `DE L'ÉVALUATION FORMATIVE ${numMatch[1]}` : `DE L'ÉVALUATION FORMATIVE`;
    }

    // Evaluation Diagnostique
    if (/diagnostique/i.test(labelToCheck)) {
      return `DE L'ÉVALUATION DIAGNOSTIQUE`;
    }

    // Interrogations
    if (/^I(\d+)/i.test(labelToCheck)) {
      const num = labelToCheck.match(/^I(\d+)/i)![1];
      return `DE L'INTERROGATION ${num}`;
    }
    if (/interro/i.test(labelToCheck)) {
      const numMatch = labelToCheck.match(/(\d+)/);
      return numMatch ? `DE L'INTERROGATION ${numMatch[1]}` : `DE L'INTERROGATION`;
    }

    // Devoirs
    if (/^(Dev|Devoir)(\d+)/i.test(labelToCheck)) {
      const num = labelToCheck.match(/(\d+)/)?.[1] || '1';
      return `DU DEVOIR ${num}`;
    }

    // Composition
    if (/composition/i.test(labelToCheck)) {
      return `DE LA COMPOSITION DU ${trimDigits} TRIMESTRE`;
    }

    // General format for custom evaluations
    const upper = labelToCheck.toUpperCase().trim();
    if (/^[AEIOUYÉÈÊËÀÂÎÏÔÙÛ]/.test(upper)) {
      return `DE L'${upper}`;
    }
    return `DU ${upper}`;
  };

  const generateBulletin = async (eleve: any, preview: boolean = false, evalType?: string, motif?: string, returnDoc: boolean = false, existingDoc?: any) => {
    if (user?.role === 'enseignant') {
      toast.error("L'aperçu et le téléchargement des bulletins de notes sont strictement réservés à l'administration.");
      return;
    }
    if (!classeDetails || !selectedTrimestre) return;

    const doc = existingDoc || (new jsPDF() as any);
    const trimestre = selectedTrimestre;

    const studentClassName = formatClassName(
      eleve.classe_nom || classeDetails?.nom || classeDetails?.nom_classe || (classes.find((c: any) => c.id === (classeDetails?.id || parseInt(selectedClasse))) as any)?.nom || ''
    );
    const safeClassName = studentClassName.trim().replace(/\s+/g, '_') || 'CLASSE';
    const safeNom = (eleve.nom || 'NOM').trim().replace(/\s+/g, '_');
    const safePrenom = (eleve.prenom || 'PRENOM').trim().replace(/\s+/g, '_');
    
    // Set document properties
    if (!existingDoc) {
      doc.setProperties({
        title: `${safeNom}_${safePrenom}_${safeClassName}_T${trimestre}`
      });
    }
    
    // Calculate all students grades to get ranks and statistics
    const elevesList = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    const allStudentsGrades = elevesList.map((e: any) => ({
      id: e.id,
      ...calculateStudentGrades(e.id, classeDetails?.notes || [], classeDetails?.matieres || [], trimestre)
    }));

    const currentStudentGrades = allStudentsGrades.find(s => s.id === eleve.id);
    if (!currentStudentGrades) return;

    // Global Statistics
    const validMoys = allStudentsGrades.map(s => s.globalMoy).filter(m => m > 0);
    const forteMoyenne = validMoys.length > 0 ? Math.max(...validMoys) : 0;
    const faibleMoyenne = validMoys.length > 0 ? Math.min(...validMoys) : 0;
    const moyenneClasse = validMoys.length > 0 ? validMoys.reduce((a, b) => a + b, 0) / validMoys.length : 0;

    // Global Rank
    const sortedByMoy = [...allStudentsGrades].sort((a, b) => b.globalMoy - a.globalMoy);
    const globalRank = sortedByMoy.findIndex(s => s.id === eleve.id) + 1;

    // Check if excluded (Conduite)
    const disciplineMoy = currentStudentGrades.disciplineMoy;
    const isAutoExclu = disciplineMoy !== null && disciplineMoy !== undefined && disciplineMoy < 7;
    const manualExclusion = exclusions.find((ex: any) => Number(ex.eleve_id) === Number(eleve.id) && Number(ex.trimestre) === Number(trimestre));
    const isActuallyExclu = manualExclusion ? manualExclusion.exclu === 1 : isAutoExclu;

    // Previous Trimester Moyenne (if T2 or T3)
    let prevMoy = null;
    let prevRank = null;
    let prevAppreciation = '-';
    if (trimestre > 1) {
      const prevTrimGrades = elevesList.map((e: any) => ({
        id: e.id,
        ...calculateStudentGrades(e.id, classeDetails?.notes || [], classeDetails?.matieres || [], trimestre - 1)
      }));
      const currentPrev = prevTrimGrades.find(s => s.id === eleve.id);
      prevMoy = currentPrev?.globalMoy || 0;
      prevAppreciation = getAppreciation(prevMoy);
      
      const sortedPrev = [...prevTrimGrades].sort((a, b) => b.globalMoy - a.globalMoy);
      prevRank = sortedPrev.findIndex(s => s.id === eleve.id) + 1;
    }

    // Header Box
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277); // Main border

    // Header Data Configuration & Defaults
    const isPrim = isPrimaryOrMaternelleClass(classeDetails, cycle);
    const primaryThemeColor = bulletinHeaderData?.couleur_principale || schoolInfo?.couleur_primaire || '#059669';
    const themeRgb = hexToRgb(primaryThemeColor) || [5, 150, 105];

    const nomEcole = bulletinHeaderData?.nom_ecole || schoolInfo?.nom || 'COMPLEXE SCOLAIRE';
    const sloganEcole = bulletinHeaderData?.slogan_ecole || schoolInfo?.slogan || bulletinHeaderData?.statut_ecole || (schoolInfo?.devise && !['fcfa', 'eur', 'usd', 'xof', 'cfa'].includes(schoolInfo.devise.toLowerCase().trim()) ? schoolInfo.devise : '') || '';
    const adresseEcole = bulletinHeaderData?.adresse || schoolInfo?.adresse || '';
    const telEcole = bulletinHeaderData?.telephone || schoolInfo?.telephone || '';
    const emailEcole = bulletinHeaderData?.email || schoolInfo?.email || '';
    const bpEcole = bulletinHeaderData?.boite_postale || schoolInfo?.boite_postale || '';
    
    const nomPays = bulletinHeaderData?.nom_pays || schoolInfo?.pays || 'RÉPUBLIQUE DU BÉNIN';
    const devisePays = bulletinHeaderData?.devise_pays || 'Fraternité - Justice - Travail';
    const ministere = bulletinHeaderData?.ministere_tutelle || (isPrim ? 'MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE' : 'MINISTÈRE DES ENSEIGNEMENTS SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE');
    const direction = bulletinHeaderData?.direction_departementale || '';
    const inspection = bulletinHeaderData?.inspection_zone || '';

    const posTutelle = bulletinHeaderData?.position_tutelle || 'gauche';
    const alignTutelle = bulletinHeaderData?.alignement_tutelle || 'center';
    const posEcole = bulletinHeaderData?.position_etablissement || 'droite';
    const alignEcole = bulletinHeaderData?.alignement_etablissement || 'center';
    const posLogo = bulletinHeaderData?.position_logo || 'centre';

    const showNomPays = bulletinHeaderData?.afficher_nom_pays !== 0;
    const showDevisePays = bulletinHeaderData?.afficher_devise_pays === 1;
    const showMinistere = bulletinHeaderData?.afficher_ministere !== 0;
    const showDirection = bulletinHeaderData?.afficher_direction_departementale !== 0 && !!direction;
    const showInspection = bulletinHeaderData?.afficher_inspection_zone !== 0 && !!inspection;

    const showNomEcole = bulletinHeaderData?.afficher_nom_ecole !== 0;
    const showSloganEcole = (bulletinHeaderData?.afficher_slogan_ecole !== 0 && bulletinHeaderData?.afficher_statut_ecole !== 0) && !!sloganEcole;
    const showAdresse = bulletinHeaderData?.afficher_adresse !== 0 && !!adresseEcole;
    const showTel = bulletinHeaderData?.afficher_telephone !== 0 && !!telEcole;
    const showEmail = bulletinHeaderData?.afficher_email !== 0 && !!emailEcole;
    const showBp = bulletinHeaderData?.afficher_boite_postale !== 0 && !!bpEcole;
    const showLogo = bulletinHeaderData?.afficher_logo !== 0 && posLogo !== 'aucun';

    // Calculate slots coordinates (Left: ~45mm center, Middle: 105mm center, Right: ~165mm center)
    const getSlotX = (position: string, align: string) => {
      if (position === 'centre') {
        return { x: 105, align: align as 'center' | 'left' | 'right' };
      }
      if (position === 'droite') {
        if (align === 'right') return { x: 195, align: 'right' as const };
        if (align === 'left') return { x: 135, align: 'left' as const };
        return { x: 165, align: 'center' as const };
      }
      // Left
      if (align === 'right') return { x: 75, align: 'right' as const };
      if (align === 'left') return { x: 15, align: 'left' as const };
      return { x: 45, align: 'center' as const };
    };

    // Draw Tutelle Block
    const tutelleCoords = getSlotX(posTutelle, alignTutelle);
    let currentTutelleY = 17.5;

    if (showNomPays) {
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text(nomPays.toUpperCase(), tutelleCoords.x, currentTutelleY, { align: tutelleCoords.align });
      currentTutelleY += 4.0;
    }

    if (showDevisePays && devisePays) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.text(devisePays, tutelleCoords.x, currentTutelleY, { align: tutelleCoords.align });
      currentTutelleY += 3.5;
    }

    if (showMinistere && ministere) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      const minLines = doc.splitTextToSize(ministere.toUpperCase(), 62);
      doc.text(minLines, tutelleCoords.x, currentTutelleY, { align: tutelleCoords.align });
      currentTutelleY += (minLines.length * 3.2);
    }

    if (showDirection) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      const dirLines = doc.splitTextToSize(direction.toUpperCase(), 62);
      doc.text(dirLines, tutelleCoords.x, currentTutelleY, { align: tutelleCoords.align });
      currentTutelleY += (dirLines.length * 3.0);
    }

    if (showInspection) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      const inspLines = doc.splitTextToSize(inspection.toUpperCase(), 62);
      doc.text(inspLines, tutelleCoords.x, currentTutelleY, { align: tutelleCoords.align });
      currentTutelleY += (inspLines.length * 3.0);
    }

    // Draw School Identity Block
    const ecoleCoords = getSlotX(posEcole, alignEcole);
    let currentEcoleY = 17.5;

    if (showNomEcole) {
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      const ecoleLines = doc.splitTextToSize(nomEcole.toUpperCase(), 62);
      doc.text(ecoleLines, ecoleCoords.x, currentEcoleY, { align: ecoleCoords.align });
      currentEcoleY += (ecoleLines.length * 4.2);
    }

    if (showSloganEcole && sloganEcole) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      const sloganLines = doc.splitTextToSize(`« ${sloganEcole} »`, 62);
      doc.text(sloganLines, ecoleCoords.x, currentEcoleY, { align: ecoleCoords.align });
      currentEcoleY += (sloganLines.length * 3.4);
    }

    if (showAdresse) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Add: ${adresseEcole}`, ecoleCoords.x, currentEcoleY, { align: ecoleCoords.align });
      currentEcoleY += 3.2;
    }

    if (showTel) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tél: ${telEcole}`, ecoleCoords.x, currentEcoleY, { align: ecoleCoords.align });
      currentEcoleY += 3.2;
    }

    if (showEmail) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Email: ${emailEcole}`, ecoleCoords.x, currentEcoleY, { align: ecoleCoords.align });
      currentEcoleY += 3.2;
    }

    if (showBp) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`BP: ${bpEcole}`, ecoleCoords.x, currentEcoleY, { align: ecoleCoords.align });
      currentEcoleY += 3.2;
    }

    // Draw Logo (Middle by default or positioned)
    if (showLogo) {
      const logoData = bulletinHeaderData?.logo || schoolInfo?.logo;
      if (logoData && typeof logoData === 'string' && logoData.startsWith('data:image')) {
        try {
          const logoSize = 25; // Increased logo dimensions for visual clarity
          const logoX = posLogo === 'gauche' ? 16 : posLogo === 'droite' ? 166 : (105 - logoSize / 2);
          doc.addImage(logoData, 'PNG', logoX, 16.5, logoSize, logoSize);
        } catch (imgErr) {
          console.warn("Could not embed logo image in PDF:", imgErr);
        }
      }
    }

    // Divider line under header with generous breathing space
    doc.setLineWidth(0.4);
    doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
    doc.line(15, 49.5, 195, 49.5);

    // Student Info Grid
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    const infoY = 54.5;

    const studentRankStr = globalRank === 1 ? (eleve.sexe === 'F' ? '1ère' : '1er') : `${globalRank}e`;
    const directorNom = bulletinHeaderData?.nom_directeur || schoolInfo?.nom_directeur || schoolInfo?.nom_fondateur || '';

    // Left Column (Student identity - Aligned colons at X=34)
    doc.setFont('helvetica', 'normal');
    doc.text("Matricule", 15, infoY);
    doc.text(":", 34, infoY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eleve.matricule || '-'}`, 36.5, infoY);

    doc.setFont('helvetica', 'normal');
    doc.text("Nom", 15, infoY + 4.2);
    doc.text(":", 34, infoY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eleve.nom || ''}`, 36.5, infoY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text("Prénom(s)", 15, infoY + 8.4);
    doc.text(":", 34, infoY + 8.4);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eleve.prenom || ''}`, 36.5, infoY + 8.4);

    doc.setFont('helvetica', 'normal');
    doc.text("Sexe", 15, infoY + 12.6);
    doc.text(":", 34, infoY + 12.6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eleve.sexe === 'F' ? 'Fille (F)' : 'Garçon (M)'}`, 36.5, infoY + 12.6);

    doc.setFont('helvetica', 'normal');
    doc.text("Né(e) le", 15, infoY + 16.8);
    doc.text(":", 34, infoY + 16.8);
    doc.setFont('helvetica', 'bold');
    const birthDateStr = eleve.date_naissance ? new Date(eleve.date_naissance).toLocaleDateString('fr-FR') : '-';
    const birthPlaceStr = eleve.lieu_naissance ? ` à ${eleve.lieu_naissance}` : '';
    doc.text(`${birthDateStr}${birthPlaceStr}`, 36.5, infoY + 16.8);

    // Center Column (Schooling Details - Aligned colons at X=120)
    const midX = 96;
    const midColonX = 120;
    const midValX = 122.5;

    doc.setFont('helvetica', 'normal');
    doc.text("Année Scolaire", midX, infoY);
    doc.text(":", midColonX, infoY);
    doc.setFont('helvetica', 'bold');
    doc.text(`${schoolInfo?.annee_active || '2025-2026'}`, midValX, infoY);

    doc.setFont('helvetica', 'normal');
    doc.text("Classe", midX, infoY + 4.2);
    doc.text(":", midColonX, infoY + 4.2);
    doc.setFont('helvetica', 'bold');
    doc.text(`${studentClassName || '-'}`, midValX, infoY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.text("Effectif", midX, infoY + 8.4);
    doc.text(":", midColonX, infoY + 8.4);
    doc.setFont('helvetica', 'bold');
    doc.text(`${elevesList.length} élève(s)`, midValX, infoY + 8.4);

    doc.setFont('helvetica', 'normal');
    doc.text("Statut", midX, infoY + 12.6);
    doc.text(":", midColonX, infoY + 12.6);
    doc.setFont('helvetica', 'bold');
    doc.text(`${eleve.statut || (currentStudentGrades.globalMoy >= 10 ? 'Passant' : 'Redoublant(e)')}`, midValX, infoY + 12.6);

    doc.setFont('helvetica', 'normal');
    doc.text("Trimestre", midX, infoY + 16.8);
    doc.text(":", midColonX, infoY + 16.8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${trimestre === 1 ? '1er Trimestre' : trimestre === 2 ? '2ème Trimestre' : '3ème Trimestre'}`, midValX, infoY + 16.8);

    // QR Code Authentication positioned neatly to the right of student info
    try {
      const qrDataUrl = await generateQRCodeDataUrl({
        docType: 'bulletin',
        docTitle: `Bulletin Scolaire - Trimestre ${trimestre}`,
        reference: `BUL-T${trimestre}-${eleve.matricule || eleve.id}`,
        schoolName: nomEcole,
        beneficiaryNom: eleve.nom,
        beneficiaryPrenom: eleve.prenom,
        matricule: eleve.matricule,
        classe: studentClassName,
        anneeScolaire: schoolInfo?.annee_active || '2025-2026',
        trimestre: trimestre,
        moyenne: currentStudentGrades.globalMoy.toFixed(2),
        rang: studentRankStr,
        dateEmission: new Date().toISOString().split('T')[0],
        signataire: directorNom || "La Direction"
      }, { size: 140, margin: 0 });

      if (qrDataUrl) {
        const qrSize = 19.5;
        const qrX = 173;
        const qrY = 51;

        // Subtle frame around QR Code
        doc.setDrawColor(215, 222, 230);
        doc.setLineWidth(0.25);
        doc.roundedRect(qrX - 1.2, qrY - 1, qrSize + 2.4, qrSize + 4.8, 1, 1, 'S');

        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
        
        doc.setFontSize(5.2);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.text("AUTHENTICITÉ", qrX + qrSize / 2, qrY + qrSize + 2.5, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }
    } catch (qrErr) {
      console.warn("QR Code generation error for student header:", qrErr);
    }

    const isPrimaryDoc = isPrimaryOrMaternelleClass(classeDetails, cycle);

    // Title Banner - Dynamic Trimester in Title
    const trimText = trimestre === 1 ? 'PREMIER' : trimestre === 2 ? 'DEUXIÈME' : 'TROISIÈME';
    const activeEval = evalType || (isPrimaryDoc ? selectedGridEval : undefined);
    const evalSuffix = getEvaluationTitleSuffix(activeEval, trimestre, isPrimaryDoc);

    const prep = isPrimaryDoc ? 'DU' : 'DE';
    let customTitle = `BULLETIN DE NOTES ${prep} ${trimText} TRIMESTRE`;
    
    // For primary, we might use evaluation titles (e.g. Composition, Contrôle)
    // For secondary, we follow the request: always suffix trimester and ignore evaluation names in title
    if (isPrimaryDoc && activeEval && activeEval !== 'global' && activeEval !== 'trimestre') {
      customTitle = `BULLETIN DE NOTES ${evalSuffix}`;
    } else if (bulletinHeaderData?.titre_bulletin) {
      const bTitle = bulletinHeaderData.titre_bulletin.trim().toUpperCase();
      if (bTitle !== 'BULLETIN DE NOTES' && bTitle !== 'BULLETIN') {
        // If the custom title already has the trimester info, don't double suffix
        if (bTitle.includes('TRIMESTRE')) {
          customTitle = bTitle;
        } else {
          customTitle = `${bTitle} ${prep} ${trimText} TRIMESTRE`;
        }
      }
    }
    
    // Ensure that for secondary we REALLY focus on Trimester if it's not custom
    if (!isPrimaryDoc && (!bulletinHeaderData?.titre_bulletin || bulletinHeaderData.titre_bulletin.trim().toUpperCase() === 'BULLETIN DE NOTES' || bulletinHeaderData.titre_bulletin.trim().toUpperCase() === 'BULLETIN')) {
      customTitle = `BULLETIN DE NOTES DE ${trimText} TRIMESTRE`;
    }

    // Fill Title Banner with Theme Color
    doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
    doc.roundedRect(15, 76.5, 180, 6.5, 1.5, 1.5, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(customTitle, 105, 81.0, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // Helper to abbreviate and clean subject names for primary / maternelle
    const formatPrimarySubjectName = (rawName: string): string => {
      if (!rawName) return '';
      let name = rawName.trim();
      name = name.replace(/^[\s\-•*]+\s*/, '');

      // Remove "Lecture -" or "Lecture :" or "Lecture /" in front of comprehension de l'écrit or similar
      name = name.replace(/^lecture\s*[-:/]?\s*(compréhension\s+de\s+l['’]écrit)/i, "Compréhension de l'écrit");
      name = name.replace(/^lecture\s*[-:/]?\s*(compréhension)/i, "Compréhension de l'écrit");
      name = name.replace(/^lecture\s*[-:/]?\s*(exploitation\s+de\s+texte)/i, "Exploitation de texte");
      name = name.replace(/^lecture\s*[-:/]?\s*(vocabulaire)/i, "Vocabulaire");

      // Éducation Scientifique et Technologique / Technologie -> EST
      if (/^éducation\s+scientifique/i.test(name) || /sciences?\s+et\s+technologie/i.test(name) || /^est$/i.test(name)) {
        return 'EST';
      }
      // Éducation aux Droits Humains / Éducation Sociale -> EDH / Éduc. Sociale
      if (/^éducation\s+aux\s+droits\s+humains/i.test(name) || /^éducation\s+sociale/i.test(name) || /^edh$/i.test(name)) {
        return 'EDH / Éduc. Sociale';
      }
      // Éducation Physique et Sportive -> EPS
      if (/^éducation\s+physique/i.test(name) || /^eps$/i.test(name)) {
        return 'EPS';
      }
      // Éducation Civique et Morale -> ECM
      if (/^éducation\s+(civique|morale)/i.test(name) || /^ecm$/i.test(name) || /^emc$/i.test(name)) {
        return 'ECM';
      }
      // Éducation Artistique -> Éduc. Artistique
      if (/^éducation\s+artistique/i.test(name) || /^ea$/i.test(name)) {
        return 'Éduc. Artistique';
      }
      // Production d'écrits
      if (/^production\s+d['’]écrits?/i.test(name)) {
        return "Production d'écrits";
      }

      return name;
    };

    // Filter visible subjects for the active bulletin
    let visibleMatieresConfig: any[] | null = null;
    if (bulletinHeaderData?.matieres_visibles) {
      if (Array.isArray(bulletinHeaderData.matieres_visibles)) {
        visibleMatieresConfig = bulletinHeaderData.matieres_visibles;
      } else if (typeof bulletinHeaderData.matieres_visibles === 'string' && bulletinHeaderData.matieres_visibles.trim().length > 0) {
        try {
          const parsed = JSON.parse(bulletinHeaderData.matieres_visibles);
          if (Array.isArray(parsed)) visibleMatieresConfig = parsed;
        } catch (e) {}
      }
    }

    let customMatieresOrdre: any[] | null = null;
    if (bulletinHeaderData?.matieres_ordre) {
      if (Array.isArray(bulletinHeaderData.matieres_ordre)) {
        customMatieresOrdre = bulletinHeaderData.matieres_ordre;
      } else if (typeof bulletinHeaderData.matieres_ordre === 'string' && bulletinHeaderData.matieres_ordre.trim().length > 0) {
        try {
          const parsed = JSON.parse(bulletinHeaderData.matieres_ordre);
          if (Array.isArray(parsed)) customMatieresOrdre = parsed;
        } catch (e) {}
      }
    }

    const classMatiereIds = new Set((classeDetails?.matieres || []).map((m: any) => m.matiere_id || m.id));
    let sourceSubjects = currentStudentGrades.subjectsGrades;

    if (isPrimaryDoc) {
      sourceSubjects = sourceSubjects.filter((sg: any) => {
        // Exclude strictly secondary subjects
        const cat = (sg.categorie || '').toLowerCase();
        if (cat.includes('collège') || cat.includes('lycée') || (cat.includes('secondaire') && !cat.includes('primaire'))) {
          return false;
        }
        // If specific subjects are checked in header customization, filter by them
        if (visibleMatieresConfig && visibleMatieresConfig.length > 0) {
          const isExplicitlyVisible = visibleMatieresConfig.includes(sg.matiere_id) ||
            visibleMatieresConfig.includes(String(sg.matiere_id)) ||
            visibleMatieresConfig.includes(sg.matiere_nom) ||
            visibleMatieresConfig.some((v: any) => typeof v === 'string' && v.toLowerCase() === (sg.matiere_nom || '').toLowerCase()) ||
            (sg.parent_id && (visibleMatieresConfig.includes(sg.parent_id) || visibleMatieresConfig.includes(String(sg.parent_id))));
          return isExplicitlyVisible;
        }
        return true;
      });
    } else {
      // Secondary: strictly filter by subjects configured/assigned to the class, and respect visible list if present
      sourceSubjects = sourceSubjects.filter((sg: any) => {
        if (!classMatiereIds.has(sg.matiere_id)) return false;
        if (visibleMatieresConfig && visibleMatieresConfig.length > 0) {
          return visibleMatieresConfig.includes(sg.matiere_id) ||
            visibleMatieresConfig.includes(String(sg.matiere_id)) ||
            (sg.parent_id && (visibleMatieresConfig.includes(sg.parent_id) || visibleMatieresConfig.includes(String(sg.parent_id))));
        }
        return true;
      });
    }

    // Group and sort subjects: Parent followed by its children
    const groupedSubjects: any[] = [];
    let parents = sourceSubjects.filter(sg => !sg.parent_id);
    const children = sourceSubjects.filter(sg => sg.parent_id);

    // Apply custom order configured by user if available
    if (customMatieresOrdre && customMatieresOrdre.length > 0) {
      parents = [...parents].sort((a, b) => {
        const idxA = customMatieresOrdre!.indexOf(a.matiere_id) !== -1 
          ? customMatieresOrdre!.indexOf(a.matiere_id) 
          : customMatieresOrdre!.indexOf(String(a.matiere_id));
        const idxB = customMatieresOrdre!.indexOf(b.matiere_id) !== -1 
          ? customMatieresOrdre!.indexOf(b.matiere_id) 
          : customMatieresOrdre!.indexOf(String(b.matiere_id));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.matiere_nom || '').localeCompare(b.matiere_nom || '');
      });
    }

    parents.forEach(p => {
      let subSubjects = children.filter(c => c.parent_id === p.matiere_id);
      if (customMatieresOrdre && customMatieresOrdre.length > 0) {
        subSubjects = [...subSubjects].sort((a, b) => {
          const idxA = customMatieresOrdre!.indexOf(a.matiere_id) !== -1 
            ? customMatieresOrdre!.indexOf(a.matiere_id) 
            : customMatieresOrdre!.indexOf(String(a.matiere_id));
          const idxB = customMatieresOrdre!.indexOf(b.matiere_id) !== -1 
            ? customMatieresOrdre!.indexOf(b.matiere_id) 
            : customMatieresOrdre!.indexOf(String(b.matiere_id));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return (a.matiere_nom || '').localeCompare(b.matiere_nom || '');
        });
      }

      if (subSubjects.length > 0) {
        // Parent is a group header
        groupedSubjects.push({
          ...p,
          isParent: true,
          subCount: subSubjects.length
        });
        subSubjects.forEach((s, idx) => {
          groupedSubjects.push({
            ...s,
            isChild: true,
            isFirstChild: idx === 0,
            subCount: subSubjects.length,
            parentNom: p.matiere_nom
          });
        });
      } else {
        // Normal independent subject
        groupedSubjects.push(p);
      }
    });

    // Add orphaned children just in case
    children.forEach(c => {
      if (!parents.find(p => p.matiere_id === c.parent_id)) {
        groupedSubjects.push(c);
      }
    });

    // Grades Table
    const tableData: any[] = [];

    if (isPrimaryDoc) {
      // Primary & Maternelle Grades Table Construction
      groupedSubjects.forEach((sg) => {
        let noteObtVal = sg.noteObtenue !== null && sg.noteObtenue !== undefined 
          ? Number(sg.noteObtenue) 
          : (sg.mi !== null ? Number(sg.mi) : null);
        let notePerfVal = sg.notePerfectionnement !== null && sg.notePerfectionnement !== undefined 
          ? Number(sg.notePerfectionnement) 
          : null;
        let noteTotVal = sg.moy !== null ? Number(sg.moy) : null;

        if (noteTotVal === null && (noteObtVal !== null || notePerfVal !== null)) {
          noteTotVal = (noteObtVal || 0) + (notePerfVal || 0);
        }

        const noteObtStr = noteObtVal !== null ? noteObtVal.toFixed(2) : '-';
        const notePerfStr = notePerfVal !== null ? notePerfVal.toFixed(2) : '-';
        const noteTotStr = noteTotVal !== null ? noteTotVal.toFixed(2) : '-';
        const baseSurStr = String(sg.base_sur || sg.sur || 20);
        const validationStr = noteTotVal !== null ? (noteTotVal >= 10 ? 'Validé' : 'Non validé') : '-';
        const appreciationStr = sg.appreciation || getAppreciation(noteTotVal);

        if (sg.isParent) {
          tableData.push([
            { content: formatPrimarySubjectName(sg.matiere_nom), colSpan: 7, styles: { fontStyle: 'bold', fillColor: [240, 245, 245], halign: 'left' } }
          ]);
        } else if (sg.isChild) {
          tableData.push([
            `   • ${formatPrimarySubjectName(sg.matiere_nom)}`,
            noteObtStr,
            notePerfStr,
            noteTotStr,
            baseSurStr,
            validationStr,
            appreciationStr
          ]);
        } else {
          tableData.push([
            formatPrimarySubjectName(sg.matiere_nom),
            noteObtStr,
            notePerfStr,
            noteTotStr,
            baseSurStr,
            validationStr,
            appreciationStr
          ]);
        }
      });

      // No Total/Bilan row for primary as requested (handled in Point de l'évaluation below)

      autoTable(doc, {
        startY: 83,
        margin: { left: 15, right: 15 },
        tableWidth: 180,
        head: [['DISCIPLINE / ACTIVITÉ', 'NOTE OBT.', 'NOTE PERF.', 'NOTE TOTALE', 'SUR', 'VALIDATION', 'APP.']],
        body: tableData,
        theme: 'grid',
        styles: { 
          fontSize: 7.5, 
          cellPadding: 1.6, 
          overflow: 'linebreak',
          lineColor: [210, 210, 210],
          lineWidth: 0.15
        },
        headStyles: { 
          fillColor: themeRgb, 
          textColor: [255, 255, 255], 
          fontStyle: 'bold', 
          halign: 'center', 
          fontSize: 7.5, 
          cellPadding: 1.8 
        },
        columnStyles: {
          0: { cellWidth: 64, halign: 'left' },
          1: { cellWidth: 17, halign: 'center' },
          2: { cellWidth: 17, halign: 'center' },
          3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          4: { cellWidth: 14, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 24, halign: 'center' }
        }
      });
    } else {
      // Secondary Grades Table Construction
      groupedSubjects.forEach((sg) => {
        const subjectRank = allStudentsGrades
          .map(s => ({ id: s.id, moy: s.subjectsGrades.find(ss => ss.matiere_id === sg.matiere_id)?.moy }))
          .filter(s => s.moy !== null && s.moy !== undefined)
          .sort((a, b) => (b.moy || 0) - (a.moy || 0))
          .findIndex(s => s.id === eleve.id) + 1;

        const rankStr = subjectRank > 0 ? (subjectRank === 1 ? (eleve.sexe === 'F' ? '1ère' : '1er') : `${subjectRank}e`) : '-';
        const miStr = sg.mi !== null && sg.mi !== undefined ? Number(sg.mi).toFixed(2) : '-';
        const d1Str = sg.d1 !== null && sg.d1 !== undefined ? Number(sg.d1).toFixed(2) : '-';
        const d2Str = sg.d2 !== null && sg.d2 !== undefined ? Number(sg.d2).toFixed(2) : '-';
        const moyStr = sg.moy !== null && sg.moy !== undefined ? Number(sg.moy).toFixed(2) : '-';
        const coefStr = sg.coef !== undefined ? String(sg.coef) : '-';
        const moyCoefStr = sg.moyCoef !== null && sg.moyCoef !== undefined ? Number(sg.moyCoef).toFixed(2) : '-';
        const appStr = sg.appreciation || getAppreciation(sg.moy);

        if (sg.isChild) {
          if (sg.isFirstChild) {
            tableData.push([
              { content: sg.parentNom, rowSpan: sg.subCount, styles: { fontStyle: 'bold', halign: 'center', valign: 'middle' } },
              sg.matiere_nom.replace(/^[\s\-•*]+\s*/, ''),
              miStr,
              d1Str,
              d2Str,
              moyStr,
              coefStr,
              moyCoefStr,
              rankStr,
              appStr
            ]);
          } else {
            tableData.push([
              sg.matiere_nom.replace(/^[\s\-•*]+\s*/, ''),
              miStr,
              d1Str,
              d2Str,
              moyStr,
              coefStr,
              moyCoefStr,
              rankStr,
              appStr
            ]);
          }
        } else if (!sg.isParent) {
          if (sg.est_disciplinaire) {
            tableData.push([
              { content: sg.matiere_nom, colSpan: 2 },
              { content: 'Note Unique Disciplinaire', colSpan: 3, styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 100, 100] } },
              moyStr,
              coefStr,
              moyCoefStr,
              rankStr,
              appStr
            ]);
          } else {
            tableData.push([
              { content: sg.matiere_nom, colSpan: 2 },
              miStr,
              d1Str,
              d2Str,
              moyStr,
              coefStr,
              moyCoefStr,
              rankStr,
              appStr
            ]);
          }
        }
      });

      // Secondary Total Row
      tableData.push([
        { content: 'TOTAL :', colSpan: 2, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 245, 245] } },
        { content: '', colSpan: 3, styles: { fillColor: [240, 245, 245] } },
        { content: currentStudentGrades.totalMoyCoef.toFixed(2), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 245, 245] } },
        { content: currentStudentGrades.totalCoef.toString(), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 245, 245] } },
        { content: currentStudentGrades.totalMoyCoef.toFixed(2), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 245, 245] } },
        { content: '', colSpan: 2, styles: { fillColor: [240, 245, 245] } }
      ]);

      autoTable(doc, {
        startY: 83,
        margin: { left: 15, right: 15 },
        tableWidth: 180,
        head: [['MATIÈRE', '', 'MI', 'DEV 1', 'DEV 2', 'MOY.', 'COEF.', 'MOY. COEF.', 'RANG', 'APP. DU PROF']],
        body: tableData,
        theme: 'grid',
        styles: { fontSize: 7.5, cellPadding: 1.8, lineColor: [210, 210, 210], lineWidth: 0.15 },
        headStyles: { fillColor: themeRgb, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 26, halign: 'left' },
          1: { cellWidth: 26, halign: 'left' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center' },
          5: { halign: 'center', fontStyle: 'bold' },
          6: { halign: 'center' },
          7: { halign: 'center', fontStyle: 'bold' },
          8: { halign: 'center' },
          9: { halign: 'center' }
        }
      });
    }

    if (isPrimaryDoc) {
      // Primary & Maternelle Layout: Point de l'évaluation, Appréciation & Observation, Avis du parent/tuteur, Signatures
      const tableFinalY = (doc as any).lastAutoTable.finalY;
      const targetBottomY = 282; // Harmonious lower boundary inside outer frame (bottom=287)
      const sigBoxH = 26; // Fixed signature box height (does not expand when extra space above)
      const sigY = targetBottomY - sigBoxH; // Fixed position anchored at Y = 256
      const sigBoxW = 87;
      const gap = 2.5;

      const availableAboveSig = Math.max(sigY - tableFinalY - (gap * 3), 45);

      // Proportional vertical distribution for top sections
      const pointH = Math.min(Math.max(availableAboveSig * 0.22, 14), 18);
      const obsH = Math.min(Math.max(availableAboveSig * 0.44, 20), 32);
      const parentH = Math.min(Math.max(availableAboveSig - pointH - obsH, 18), 30);
      
      const pointY = tableFinalY + gap;
      const obsY = pointY + pointH + gap;
      const parentY = obsY + obsH + gap;

      // 1. POINT DU TRIMESTRE / DE L'ÉVALUATION
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setLineWidth(0.35);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(15, pointY, 180, pointH, 1.2, 1.2, 'FD');

      // Title Bar
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(15, pointY, 180, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const pointTitle = isPrimaryDoc ? "POINT DE L'ÉVALUATION" : `POINT DU ${trimText} TRIMESTRE`;
      doc.text(pointTitle, 105, pointY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Line 1: Moyenne & Rang
      const studentRankStr = globalRank === 1 ? (eleve.sexe === 'F' ? '1ère' : '1er') : `${globalRank}ème`;
      const pointLine1Y = pointY + 4.5 + (pointH - 4.5) * 0.38;
      const pointLine2Y = pointY + 4.5 + (pointH - 4.5) * 0.78;

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text("Moyenne :", 20, pointLine1Y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentStudentGrades.globalMoy.toFixed(2)}`, 38, pointLine1Y);
      doc.setFont('helvetica', 'normal');
      doc.text("sur 20", 49, pointLine1Y);

      doc.text("Rang :", 115, pointLine1Y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${studentRankStr}`, 127, pointLine1Y);
      doc.setFont('helvetica', 'normal');
      doc.text(`sur ${elevesList.length} élève(s)`, 137, pointLine1Y);

      // Line 2: Seuil & Seuil Atteint
      doc.text("Seuil :", 20, pointLine2Y);
      doc.setFont('helvetica', 'bold');
      doc.text(`${currentStudentGrades.seuil}`, 32, pointLine2Y);

      doc.setFont('helvetica', 'normal');
      doc.text("Seuil Atteint :", 115, pointLine2Y);
      doc.setFont('helvetica', 'bold');
      if (currentStudentGrades.seuilAtteint === 'Oui') {
        doc.setTextColor(16, 185, 129);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.text(`${currentStudentGrades.seuilAtteint}`, 138, pointLine2Y);
      doc.setTextColor(0, 0, 0);

      // 2. APPRÉCIATION & OBSERVATION DE L'ENSEIGNANT
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, obsY, 180, obsH, 1.2, 1.2, 'FD');

      // Title Bar
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(15, obsY, 180, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("APPRÉCIATION & OBSERVATION DE L'ENSEIGNANT", 105, obsY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Appréciation
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.text("Appréciation :", 20, obsY + 8.8);
      doc.setFont('helvetica', 'bold');
      doc.text(`${getAppreciation(currentStudentGrades.globalMoy)}`, 43, obsY + 8.8);

      // Observation label & 4 dotted lines distributed evenly
      const obsDottedStart = obsY + 12.8;
      const obsLineStep = Math.max((obsH - 14.5) / 3.5, 3.2);
      doc.setFont('helvetica', 'normal');
      doc.text("Observation :", 20, obsDottedStart);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([0.8, 1.2], 0);
      doc.line(42, obsDottedStart, 190, obsDottedStart);
      for (let l = 1; l <= 3; l++) {
        const ly = obsDottedStart + (obsLineStep * l);
        doc.line(20, ly, 190, ly);
      }
      doc.setLineDashPattern([], 0);

      // 3. AVIS DU PARENT/TUTEUR
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, parentY, 180, parentH, 1.2, 1.2, 'FD');

      // Title Bar
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(15, parentY, 180, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("AVIS DU PARENT / TUTEUR", 105, parentY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // 4 dotted lines distributed evenly
      const parentDottedStart = parentY + 8.2;
      const parentLineStep = Math.max((parentH - 9.5) / 3.5, 3.2);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([0.8, 1.2], 0);
      for (let l = 0; l < 4; l++) {
        const ly = parentDottedStart + (parentLineStep * l);
        doc.line(20, ly, 190, ly);
      }
      doc.setLineDashPattern([], 0);

      // 4. SIGNATURES & NOMS DES SIGNATAIRES
      // Left Box: Enseignant
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, sigY, sigBoxW, sigBoxH, 1.2, 1.2, 'FD');
      
      // Header for Enseignant
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(15, sigY, sigBoxW, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text("VISA DE L'ENSEIGNANT(E)", 15 + sigBoxW / 2, sigY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Teacher Signer Name at the bottom of the box
      const enseignantNom = bulletinHeaderData?.nom_prof_principal || classeDetails?.enseignant_nom || classeDetails?.professeur_principal || (classeDetails?.enseignant ? `${classeDetails.enseignant.prenom || ''} ${classeDetails.enseignant.nom || ''}`.trim() : '') || "L'Enseignant(e)";
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(enseignantNom, 15 + sigBoxW / 2, sigY + sigBoxH - 3.2, { align: 'center' });

      // Right Box: Chef d'établissement / Directeur
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(108, sigY, sigBoxW, sigBoxH, 1.2, 1.2, 'FD');

      // Header for Directeur
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(108, sigY, sigBoxW, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const signTitle = bulletinHeaderData?.titre_directeur 
        ? bulletinHeaderData.titre_directeur.toUpperCase() 
        : "LE DIRECTEUR";
      doc.text(signTitle, 108 + sigBoxW / 2, sigY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Director Signer Name
      const directorNom = bulletinHeaderData?.nom_directeur || schoolInfo?.nom_directeur || schoolInfo?.nom_fondateur || '';

      // Digital Signature / Stamp centered in the box if available
      const sigData = bulletinHeaderData?.signature_tampon || bulletinHeaderData?.signature || schoolInfo?.signature || schoolInfo?.tampon || schoolInfo?.cachet;
      const showSignature = bulletinHeaderData?.afficher_signature !== 0;

      if (showSignature && sigData && typeof sigData === 'string' && sigData.startsWith('data:image')) {
        try {
          const sigImgW = 38;
          const sigImgH = 14;
          const sigImgX = 108 + (sigBoxW - sigImgW) / 2;
          const sigImgY = sigY + 5.0 + (sigBoxH - 9.5 - sigImgH) / 2;
          doc.addImage(sigData, 'PNG', sigImgX, sigImgY, sigImgW, sigImgH);
        } catch (sigErr) {
          console.warn("Could not embed signature image in PDF:", sigErr);
        }
      }

      // Director Signer Name at the bottom of the box (below the signature space)
      if (directorNom) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(directorNom, 108 + sigBoxW / 2, sigY + sigBoxH - 3.2, { align: 'center' });
      }

      // Security Footer Line under main frame
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text("Document officiel certifié • Scannez le QR Code pour vérifier l'authenticité numérique de ce bulletin", 105, 290.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    } else {
      // Secondary Layout: Refined Rapport Trimestriel, Bilan Catégoriel, Bilan Annuel/Conseil de classe, Signatures
      const tableFinalY = (doc as any).lastAutoTable.finalY;
      const targetBottomY = 282; // Harmonious bottom frame boundary
      const sigBoxH = 26; // Fixed signature box height (does not expand when extra space above)
      const sigY = targetBottomY - sigBoxH; // Fixed position anchored at Y = 256
      const sigBoxW = 87;
      const gap = 2.5;

      const availableAboveSig = Math.max(sigY - tableFinalY - (gap * 2), 45);
      const row1H = Math.min(Math.max(availableAboveSig * 0.52, 22), 34);
      const row2H = Math.min(Math.max(availableAboveSig - row1H, 20), 32);
      const row1Y = tableFinalY + gap;
      const row2Y = row1Y + row1H + gap;

      // 1. ROW 1: RAPPORT TRIMESTRIEL (Left: 120mm) & BILAN CATÉGORIEL (Right: 57mm)
      const rapportX = 15;
      const rapportW = 120;
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setLineWidth(0.3);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(rapportX, row1Y, rapportW, row1H, 1.2, 1.2, 'FD');

      // Title Bar Rapport
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(rapportX, row1Y, rapportW, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('RAPPORT TRIMESTRIEL', rapportX + rapportW / 2, row1Y + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Rapport Table Content
      const colW = rapportW / 4;
      const headerRowY = row1Y + 8.2;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(245, 247, 248);
      doc.rect(rapportX + 1, row1Y + 5.0, rapportW - 2, 4.5, 'F');
      doc.text('PÉRIODE', rapportX + colW * 0.5, headerRowY, { align: 'center' });
      doc.text('MOYENNE', rapportX + colW * 1.5, headerRowY, { align: 'center' });
      doc.text('RANG', rapportX + colW * 2.5, headerRowY, { align: 'center' });
      doc.text('APPRÉCIATION', rapportX + colW * 3.5, headerRowY, { align: 'center' });

      // Row Data based on Trimester
      const studentRankStr = globalRank === 1 ? (eleve.sexe === 'F' ? '1ère' : '1er') : `${globalRank}e`;
      const dataRowY = row1Y + 13.5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      if (trimestre === 1) {
        doc.text('1er Trimestre', rapportX + colW * 0.5, dataRowY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(currentStudentGrades.globalMoy.toFixed(2), rapportX + colW * 1.5, dataRowY, { align: 'center' });
        doc.text(studentRankStr, rapportX + colW * 2.5, dataRowY, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(getAppreciation(currentStudentGrades.globalMoy), rapportX + colW * 3.5, dataRowY, { align: 'center' });
      } else if (trimestre === 2) {
        // T1 Row
        doc.text('1er Trim.', rapportX + colW * 0.5, dataRowY - 1, { align: 'center' });
        doc.text(prevMoy !== null ? prevMoy.toFixed(2) : '-', rapportX + colW * 1.5, dataRowY - 1, { align: 'center' });
        doc.text(prevRank !== null ? (prevRank === 1 ? (eleve.sexe === 'F' ? '1ère' : '1er') : `${prevRank}e`) : '-', rapportX + colW * 2.5, dataRowY - 1, { align: 'center' });
        doc.text(prevAppreciation || '-', rapportX + colW * 3.5, dataRowY - 1, { align: 'center' });

        // T2 Row
        doc.text('2ème Trim.', rapportX + colW * 0.5, dataRowY + 3.8, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(currentStudentGrades.globalMoy.toFixed(2), rapportX + colW * 1.5, dataRowY + 3.8, { align: 'center' });
        doc.text(studentRankStr, rapportX + colW * 2.5, dataRowY + 3.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(getAppreciation(currentStudentGrades.globalMoy), rapportX + colW * 3.5, dataRowY + 3.8, { align: 'center' });
      } else {
        // T3: All three trimestres summary
        const t1Grades = calculateStudentGrades(eleve.id, classeDetails?.notes || [], classeDetails?.matieres || [], 1);
        const t2Grades = calculateStudentGrades(eleve.id, classeDetails?.notes || [], classeDetails?.matieres || [], 2);
        
        doc.text('1er Trim.', rapportX + colW * 0.5, dataRowY - 2.2, { align: 'center' });
        doc.text(t1Grades.hasData ? t1Grades.globalMoy.toFixed(2) : '-', rapportX + colW * 1.5, dataRowY - 2.2, { align: 'center' });
        doc.text('-', rapportX + colW * 2.5, dataRowY - 2.2, { align: 'center' });
        doc.text(t1Grades.hasData ? getAppreciation(t1Grades.globalMoy) : '-', rapportX + colW * 3.5, dataRowY - 2.2, { align: 'center' });

        doc.text('2ème Trim.', rapportX + colW * 0.5, dataRowY + 1.8, { align: 'center' });
        doc.text(t2Grades.hasData ? t2Grades.globalMoy.toFixed(2) : '-', rapportX + colW * 1.5, dataRowY + 1.8, { align: 'center' });
        doc.text('-', rapportX + colW * 2.5, dataRowY + 1.8, { align: 'center' });
        doc.text(t2Grades.hasData ? getAppreciation(t2Grades.globalMoy) : '-', rapportX + colW * 3.5, dataRowY + 1.8, { align: 'center' });

        doc.text('3ème Trim.', rapportX + colW * 0.5, dataRowY + 5.8, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text(currentStudentGrades.globalMoy.toFixed(2), rapportX + colW * 1.5, dataRowY + 5.8, { align: 'center' });
        doc.text(studentRankStr, rapportX + colW * 2.5, dataRowY + 5.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.text(getAppreciation(currentStudentGrades.globalMoy), rapportX + colW * 3.5, dataRowY + 5.8, { align: 'center' });
      }

      // Class Performance Bar at bottom of Rapport Trimestriel
      const classStatY = row1Y + row1H - 2.6;
      doc.setFillColor(245, 247, 248);
      doc.rect(rapportX + 1, row1Y + row1H - 5.5, rapportW - 2, 4.8, 'F');
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'normal');
      doc.text(`Forte moy. : ${forteMoyenne.toFixed(2)}`, rapportX + 5, classStatY);
      doc.text(`Faible moy. : ${faibleMoyenne.toFixed(2)}`, rapportX + 46, classStatY);
      doc.setFont('helvetica', 'bold');
      doc.text(`Moy. Classe : ${moyenneClasse.toFixed(2)}`, rapportX + 86, classStatY);

      // BILAN CATÉGORIEL (Right: 57mm)
      const bilanX = rapportX + rapportW + 3;
      const bilanW = 57;
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(bilanX, row1Y, bilanW, row1H, 1.2, 1.2, 'FD');

      // Title Bar Bilan
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(bilanX, row1Y, bilanW, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('BILAN CATÉGORIEL', bilanX + bilanW / 2, row1Y + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      const calculateCategoryAverage = (grades: any[], category: string) => {
        const isMatch = (g: any) => {
          const cat = (g.categorie || '').toLowerCase();
          const nom = (g.matiere_nom || '').toLowerCase();
          
          const isLitName = nom.includes('fran') || nom.includes('lect') || nom.includes('comm') || 
                            nom.includes('angl') || nom.includes('espa') || nom.includes('alle') || 
                            nom.includes('hist') || nom.includes('géo') || nom.includes('geo') || 
                            nom.includes('lettr') || nom.includes('lang');
          
          const isSciName = nom.includes('math') || nom.includes('svt') || nom.includes('pct') || 
                            (nom.includes('physiq') && !nom.includes('educ') && !nom.includes('sport')) || 
                            nom.includes('chimi') || nom.includes('scien') ||
                            nom.includes('techn');

          if (category === 'Littéraire') {
            return isLitName || cat.includes('littér') || cat.includes('litter') || cat.includes('langue') || cat.includes('lettre') || cat.includes('humaine');
          }
          if (category === 'Scientifique') {
            return (isSciName || cat.includes('scientifiq') || cat.includes('science') || cat.includes('techno') || cat.includes('math')) && !cat.includes('humaine') && !isLitName;
          }
          if (category === 'Autres') {
            if (nom.includes('eps') || nom.includes('sport') || nom.includes('conduite') || nom.includes('discipline')) return true;
            
            const isLit = isLitName || cat.includes('littér') || cat.includes('litter') || cat.includes('langue') || cat.includes('lettre') || cat.includes('humaine');
            const isSci = (isSciName || cat.includes('scientifiq') || cat.includes('science') || cat.includes('techno') || cat.includes('math')) && !cat.includes('humaine') && !isLitName;
            return !isLit && !isSci;
          }
          return false;
        };

        const leafGrades = grades.filter(g => {
          if (g.moy === null || g.moy === undefined) return false;
          const hasChildren = grades.some(other => other.parent_id === g.matiere_id);
          if (hasChildren) return false;
          
          if (isMatch(g)) return true;
          const parent = grades.find(p => p.matiere_id === g.parent_id);
          if (parent && isMatch(parent)) return true;
          
          return false;
        });

        if (leafGrades.length === 0) return '-';

        const sumMoyCoef = leafGrades.reduce((acc, g) => acc + (Number(g.moy) * (g.coef || 1)), 0);
        const sumCoef = leafGrades.reduce((acc, g) => acc + (g.coef || 1), 0);
        
        return sumCoef > 0 ? (sumMoyCoef / sumCoef).toFixed(2) : '-';
      };

      const litMoy = calculateCategoryAverage(currentStudentGrades.subjectsGrades, 'Littéraire');
      const sciMoy = calculateCategoryAverage(currentStudentGrades.subjectsGrades, 'Scientifique');
      const autMoy = calculateCategoryAverage(currentStudentGrades.subjectsGrades, 'Autres');

      const bilanStep = (row1H - 7.5) / 3;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      // Row 1
      doc.text('Disciplines Littéraires :', bilanX + 4, row1Y + 7.5 + bilanStep * 0.5);
      doc.setFont('helvetica', 'bold');
      doc.text(litMoy !== '-' ? `${litMoy} / 20` : '-', bilanX + bilanW - 4, row1Y + 7.5 + bilanStep * 0.5, { align: 'right' });

      // Row 2
      doc.setFont('helvetica', 'normal');
      doc.text('Disciplines Scientifiques :', bilanX + 4, row1Y + 7.5 + bilanStep * 1.5);
      doc.setFont('helvetica', 'bold');
      doc.text(sciMoy !== '-' ? `${sciMoy} / 20` : '-', bilanX + bilanW - 4, row1Y + 7.5 + bilanStep * 1.5, { align: 'right' });

      // Row 3
      doc.setFont('helvetica', 'normal');
      doc.text('Autres disciplines :', bilanX + 4, row1Y + 7.5 + bilanStep * 2.5);
      doc.setFont('helvetica', 'bold');
      doc.text(autMoy !== '-' ? `${autMoy} / 20` : '-', bilanX + bilanW - 4, row1Y + 7.5 + bilanStep * 2.5, { align: 'right' });

      // 2. ROW 2: CONSEIL DE CLASSE & BILAN ANNUEL / OBSERVATION
      if (trimestre === 3) {
        // Bilan Annuel Box (Left: 96mm)
        const bilanAnnuelX = 15;
        const bilanAnnuelW = 96;
        doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(bilanAnnuelX, row2Y, bilanAnnuelW, row2H, 1.2, 1.2, 'FD');

        // Header Bilan Annuel
        doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.roundedRect(bilanAnnuelX, row2Y, bilanAnnuelW, 4.5, 1.2, 1.2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('BILAN ANNUEL & DÉCISION', bilanAnnuelX + bilanAnnuelW / 2, row2Y + 3.4, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Left Col: Trimester Averages & Annual Average
        const bStep = (row2H - 7) / 3;
        doc.setFontSize(7.8);
        doc.setFont('helvetica', 'normal');
        doc.text('Moy. T1 :', bilanAnnuelX + 4, row2Y + 7 + bStep * 0.4);
        doc.setFont('helvetica', 'bold');
        doc.text(currentStudentGrades.t1HasData ? currentStudentGrades.t1.toFixed(2) : '-', bilanAnnuelX + 22, row2Y + 7 + bStep * 0.4);

        doc.setFont('helvetica', 'normal');
        doc.text('Moy. T2 :', bilanAnnuelX + 4, row2Y + 7 + bStep * 1.3);
        doc.setFont('helvetica', 'bold');
        doc.text(currentStudentGrades.t2HasData ? currentStudentGrades.t2.toFixed(2) : '-', bilanAnnuelX + 22, row2Y + 7 + bStep * 1.3);

        doc.setFont('helvetica', 'normal');
        doc.text('Moy. T3 :', bilanAnnuelX + 4, row2Y + 7 + bStep * 2.2);
        doc.setFont('helvetica', 'bold');
        doc.text(currentStudentGrades.t3HasData ? currentStudentGrades.t3.toFixed(2) : '-', bilanAnnuelX + 22, row2Y + 7 + bStep * 2.2);

        // Vertical divider inside Bilan Annuel
        doc.setDrawColor(220, 220, 220);
        doc.line(bilanAnnuelX + 38, row2Y + 5.5, bilanAnnuelX + 38, row2Y + row2H - 1.5);

        // Right Col: MOYENNE ANNUELLE + DÉCISION
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('MOY. ANNUELLE :', bilanAnnuelX + 42, row2Y + 9.5);
        doc.setFontSize(10);
        doc.setTextColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.text(`${currentStudentGrades.annualMoy.toFixed(2)} / 20`, bilanAnnuelX + bilanAnnuelW - 4, row2Y + 9.5, { align: 'right' });

        const decision = currentStudentGrades.annualMoy >= 10 ? 'ADMIS(E)' : 'REDOUBLE';
        const badgeW = 48;
        const badgeH = 7.5;
        const badgeX = bilanAnnuelX + 42 + (bilanAnnuelW - 42 - badgeW) / 2;
        const badgeY = row2Y + 14.5;

        if (decision === 'ADMIS(E)') {
          doc.setFillColor(209, 250, 229);
          doc.setDrawColor(16, 185, 129);
          doc.setTextColor(6, 95, 70);
        } else {
          doc.setFillColor(254, 226, 226);
          doc.setDrawColor(239, 68, 68);
          doc.setTextColor(153, 27, 27);
        }
        doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.5, 1.5, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text(decision, badgeX + badgeW / 2, badgeY + 5.2, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // CONSEIL DE CLASSE (Right: 81mm - No Blâme)
        const conseilX = bilanAnnuelX + bilanAnnuelW + 3;
        const conseilW = 81;
        doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(conseilX, row2Y, conseilW, row2H, 1.2, 1.2, 'FD');

        // Header Conseil
        doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.roundedRect(conseilX, row2Y, conseilW, 4.5, 1.2, 1.2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('CONSEIL DE CLASSE', conseilX + conseilW / 2, row2Y + 3.4, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Items without "Blâme"
        const items = [
          { label: 'Assiduité', key: 'assiduite' },
          { label: 'Discipline', key: 'discipline' },
          { label: "Tableau d'Honneur", key: 'tableau_honneur' },
          { label: 'Félicitations', key: 'felicitations' },
          { label: 'Encouragements', key: 'encouragements' }
        ];

        const studentMentions = (mentions || []).find((m: any) => 
          Number(m.eleve_id) === Number(eleve.id) && 
          Number(m.trimestre) === Number(trimestre)
        ) || {};

        const itemStep = (row2H - 7) / items.length;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');

        items.forEach((item, i) => {
          const itemY = row2Y + 7.5 + (i * itemStep);
          doc.text(item.label, conseilX + 4, itemY + 2.5);
          doc.setDrawColor(180, 180, 180);
          doc.roundedRect(conseilX + conseilW - 14, itemY, 10, 3.8, 0.8, 0.8);

          if (studentMentions[item.key as keyof typeof studentMentions] === 1) {
            doc.setFont('helvetica', 'bold');
            doc.text('X', conseilX + conseilW - 10.5, itemY + 2.8);
            doc.setFont('helvetica', 'normal');
          }
        });
      } else {
        // T1 / T2: Conseil de Classe (Left: 88mm) & Observation / Mention Spéciale (Right: 89mm)
        const conseilX = 15;
        const conseilW = 88;
        doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(conseilX, row2Y, conseilW, row2H, 1.2, 1.2, 'FD');

        // Header Conseil
        doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.roundedRect(conseilX, row2Y, conseilW, 4.5, 1.2, 1.2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('CONSEIL DE CLASSE', conseilX + conseilW / 2, row2Y + 3.4, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // Items without "Blâme"
        const items = [
          { label: 'Assiduité', key: 'assiduite' },
          { label: 'Discipline', key: 'discipline' },
          { label: "Tableau d'Honneur", key: 'tableau_honneur' },
          { label: 'Félicitations', key: 'felicitations' },
          { label: 'Encouragements', key: 'encouragements' }
        ];

        const studentMentions = (mentions || []).find((m: any) => 
          Number(m.eleve_id) === Number(eleve.id) && 
          Number(m.trimestre) === Number(trimestre)
        ) || {};

        const itemStep = (row2H - 7) / items.length;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');

        items.forEach((item, i) => {
          const itemY = row2Y + 7.5 + (i * itemStep);
          doc.text(item.label, conseilX + 4, itemY + 2.5);
          doc.setDrawColor(180, 180, 180);
          doc.roundedRect(conseilX + conseilW - 16, itemY, 12, 3.8, 0.8, 0.8);

          if (studentMentions[item.key as keyof typeof studentMentions] === 1) {
            doc.setFont('helvetica', 'bold');
            doc.text('X', conseilX + conseilW - 11.5, itemY + 2.8);
            doc.setFont('helvetica', 'normal');
          }
        });

        // Observation Box (Right: 89mm)
        const obsX = conseilX + conseilW + 3;
        const obsW = 89;
        doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(obsX, row2Y, obsW, row2H, 1.2, 1.2, 'FD');

        // Header Observation
        doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
        doc.roundedRect(obsX, row2Y, obsW, 4.5, 1.2, 1.2, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('OBSERVATION / APPRÉCIATION GÉNÉRALE', obsX + obsW / 2, row2Y + 3.4, { align: 'center' });
        doc.setTextColor(0, 0, 0);

        // 3 dotted lines inside observation box
        const dottedStart = row2Y + 9.5;
        const dottedStep = (row2H - 12) / 2.5;
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([0.8, 1.2], 0);
        for (let l = 0; l < 3; l++) {
          const ly = dottedStart + (dottedStep * l);
          doc.line(obsX + 4, ly, obsX + obsW - 4, ly);
        }
        doc.setLineDashPattern([], 0);
      }

      // 3. ROW 3: SIGNATURES & NOMS DES SIGNATAIRES
      // Left Box: Professeur Principal
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(15, sigY, sigBoxW, sigBoxH, 1.2, 1.2, 'FD');

      // Header Professeur Principal
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(15, sigY, sigBoxW, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const profTitle = bulletinHeaderData?.titre_prof_principal || "LE PROFESSEUR PRINCIPAL";
      doc.text(profTitle.toUpperCase(), 15 + sigBoxW / 2, sigY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Professeur Signer Name at the bottom of the box
      const profNom = bulletinHeaderData?.nom_prof_principal || classeDetails?.professeur_principal || classeDetails?.enseignant_nom || (classeDetails?.enseignant ? `${classeDetails.enseignant.prenom || ''} ${classeDetails.enseignant.nom || ''}`.trim() : '') || '';
      if (profNom) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(profNom, 15 + sigBoxW / 2, sigY + sigBoxH - 3.2, { align: 'center' });
      }

      // Right Box: Chef d'établissement / Directeur
      doc.setDrawColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(108, sigY, sigBoxW, sigBoxH, 1.2, 1.2, 'FD');

      // Header Chef d'établissement
      doc.setFillColor(themeRgb[0], themeRgb[1], themeRgb[2]);
      doc.roundedRect(108, sigY, sigBoxW, 4.5, 1.2, 1.2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      const signTitle = bulletinHeaderData?.titre_directeur 
        ? bulletinHeaderData.titre_directeur.toUpperCase() 
        : "LE CHEF D'ÉTABLISSEMENT";
      doc.text(signTitle, 108 + sigBoxW / 2, sigY + 3.4, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Director Signer Name
      const directorNom = bulletinHeaderData?.nom_directeur || schoolInfo?.nom_directeur || schoolInfo?.nom_fondateur || '';

      // Digital Signature / Stamp centered in the box if available
      const sigData = bulletinHeaderData?.signature_tampon || bulletinHeaderData?.signature || schoolInfo?.signature || schoolInfo?.tampon || schoolInfo?.cachet;
      const showSignature = bulletinHeaderData?.afficher_signature !== 0;

      if (showSignature && sigData && typeof sigData === 'string' && sigData.startsWith('data:image')) {
        try {
          const sigImgW = 38;
          const sigImgH = 14;
          const sigImgX = 108 + (sigBoxW - sigImgW) / 2;
          const sigImgY = sigY + 5.0 + (sigBoxH - 9.5 - sigImgH) / 2;
          doc.addImage(sigData, 'PNG', sigImgX, sigImgY, sigImgW, sigImgH);
        } catch (sigErr) {
          console.warn("Could not embed signature image in PDF:", sigErr);
        }
      }

      // Director Signer Name at the bottom of the box (below the signature space)
      if (directorNom) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(directorNom, 108 + sigBoxW / 2, sigY + sigBoxH - 3.2, { align: 'center' });
      }

      // Security Footer Line under main frame
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(130, 130, 130);
      doc.text("Document officiel certifié • Scannez le QR Code pour vérifier l'authenticité numérique de ce bulletin", 105, 290.5, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    // Exclu Stamp
    if (isActuallyExclu) {
      doc.saveGraphicsState();
      try {
        if (typeof (doc as any).GState !== 'undefined') {
          doc.setGState(new (doc as any).GState({ opacity: 0.85 }));
        }
      } catch(e) {}
      doc.setTextColor(220, 38, 38); // Red-600
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      
      const stampText = "EXCLU(E)";
      const stampX = 105;
      const stampY = 180;
      
      // Draw border
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(1.5);
      // Rough bounds for the stamp text rotated
      doc.text(stampText, stampX, stampY, {
        align: 'center',
        angle: 25
      });
      doc.restoreGraphicsState();
    }

    // Motif diagonal text
    if (motif) {
      doc.saveGraphicsState();
      doc.setTextColor(225, 225, 225); // Even lighter gray for subtleness
      doc.setFontSize(72);
      doc.setFont('helvetica', 'bold');
      
      // Calculate a generous letter spacing manually if needed
      const spreadMotif = motif.toUpperCase().split('').join('   ');
      
      // Centering over the table area (Table starts at Y=83, roughly covers until Y=220)
      const motifX = 105;
      const motifY = 155; // Center of the grade table area
      
      doc.text(spreadMotif, motifX, motifY, {
        align: 'center',
        angle: 45
      });
      doc.restoreGraphicsState();
      doc.setTextColor(0, 0, 0); // Reset
    }

    if (returnDoc) {
      return doc;
    }

    if (preview) {
      window.open(doc.output('bloburl'), '_blank');
    } else if (!existingDoc) {
      // Format demandé pour le téléchargement individuel : nom_prénom_classe_trimestre
      const individualFileName = `${safeNom}_${safePrenom}_${safeClassName}_T${trimestre}.pdf`;
      doc.save(individualFileName);
    }
  };

  const handleDownloadBulletins = async (mode: 'merged' | 'individual') => {
    if (!classeDetails || !selectedTrimestre) return;
    if (user?.role === 'enseignant') {
      toast.error("Le téléchargement groupé des bulletins est réservé à l'administration.");
      return;
    }

    let students = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    
    // If some students are selected, only download those
    if (selectedStudentIds.size > 0) {
      students = students.filter(s => selectedStudentIds.has(s.id));
    }

    if (students.length === 0) {
      toast.error("Aucun élève sélectionné.");
      return;
    }

    setIsDownloadingAll(true);
    const toastId = toast.loading(mode === 'merged' ? "Génération du fichier PDF unique..." : "Génération de l'archive ZIP...");

    try {
      const cleanClassName = formatClassName(classeDetails?.nom || (classes.find((c: any) => c.id === parseInt(selectedClasse)) as any)?.nom || 'Classe').trim().replace(/\s+/g, '_');
      const sortedStudents = [...students].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));

      if (mode === 'merged') {
        const finalDoc = new jsPDF() as any;
        finalDoc.setProperties({
          title: `BULLETIN_${cleanClassName}_T${selectedTrimestre}`
        });
        
        for (let i = 0; i < sortedStudents.length; i++) {
          const student = sortedStudents[i];
          if (i > 0) finalDoc.addPage();
          if (i % 5 === 0) {
            toast.loading(`Génération : ${i + 1}/${sortedStudents.length} bulletins...`, { id: toastId });
          }
          await generateBulletin(student, false, selectedGridEval, undefined, false, finalDoc);
        }

        // Format exact demandé pour le bouton "Générer bulletins" : BULLETIN_[CLASSE]_T[TRIMESTRE] (exemple: BULLETIN_6ème_T1.pdf)
        const fileName = `BULLETIN_${cleanClassName}_T${selectedTrimestre}.pdf`;
        finalDoc.save(fileName);
        toast.success("Le fichier PDF unique a été téléchargé !", { id: toastId });
      } else {
        // Individual Files -> ZIP
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        for (let i = 0; i < sortedStudents.length; i++) {
          const student = sortedStudents[i];
          if (i % 5 === 0) {
            toast.loading(`Génération : ${i + 1}/${sortedStudents.length} bulletins...`, { id: toastId });
          }
          
          const studentDoc = new jsPDF() as any;
          await generateBulletin(student, false, selectedGridEval, undefined, false, studentDoc);
          
          const pdfBlob = studentDoc.output('blob');
          const safeNom = (student.nom || '').trim().replace(/\s+/g, '_');
          const safePrenom = (student.prenom || '').trim().replace(/\s+/g, '_');
          // Format individuel : nom_prénom_classe_trimestre
          const fileName = `${safeNom}_${safePrenom}_${cleanClassName}_T${selectedTrimestre}.pdf`;
          zip.file(fileName, pdfBlob);
        }
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const zipFileName = `BULLETIN_${cleanClassName}_T${selectedTrimestre}.zip`;
        
        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = zipFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.success("L'archive ZIP a été téléchargée !", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération.", { id: toastId });
    } finally {
      setIsDownloadingAll(false);
    }
  };

  const handleToggleSelectAll = () => {
    const allStudents = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    if (selectedStudentIds.size === allStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(allStudents.map(s => s.id)));
    }
  };

  const handleToggleSelectStudent = (id: number) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleGenerateBulletinClick = (eleve: any, preview: boolean = false, evalType?: string) => {
    if (user?.role === 'enseignant') {
      toast.error("L'aperçu et le téléchargement des bulletins de notes sont strictement réservés à l'administration.");
      return;
    }
    if (!classeDetails || !selectedTrimestre) return;

    const student = {
      ...eleve,
      id: eleve?.id ?? eleve?.eleve_id
    };

    // Pour le téléchargement direct (clic sur l'icône de téléchargement), générer et télécharger sans blocage
    if (!preview) {
      generateBulletin(student, false, evalType);
      return;
    }

    const grades = calculateStudentGrades(student.id, classeDetails?.notes || [], classeDetails?.matieres || [], selectedTrimestre, evalType);
    const subjects = grades.subjectsGrades;
    const missingCount = subjects.filter(s => s.moy === null).length;
    const totalCount = subjects.length;

    if (missingCount === totalCount) {
      setBulletinWarningData({ eleve: student, type: 'none', preview, evalType });
      setShowBulletinWarningModal(true);
    } else if (missingCount > 0) {
      setBulletinWarningData({ eleve: student, type: 'partial', preview, evalType });
      setShowBulletinWarningModal(true);
    } else {
      generateBulletin(student, preview, evalType);
    }
  };

  const generateStatsPDF = () => {
    if (!classeDetails || !selectedClasse) return;
    
    const doc = new jsPDF();
    const className = classes.find((c: any) => (c as any).id === parseInt(selectedClasse))?.nom || '';
    const trimestre = selectedTrimestre;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(getPrimaryColor());
    doc.text(`Statistiques de Performance - ${className}`, 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Trimestre ${trimestre} | Année Scolaire: ${schoolInfo?.annee_active || '2025-2026'}`, 105, 30, { align: 'center' });
    
    // Calculate Stats
    const elevesListStats = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    const allGrades = elevesListStats.map((e: any) => ({
      ...e,
      ...calculateStudentGrades(e.id, classeDetails?.notes || [], classeDetails?.matieres || [], selectedTrimestre || 1)
    }));

    const isT3 = selectedTrimestre === 3;

    const validMoys = allGrades.map(s => s.globalMoy).filter(m => m > 0);
    const passCount = allGrades.filter(s => s.globalMoy >= 10).length;
    const passRate = allGrades.length > 0 ? (passCount / allGrades.length) * 100 : 0;
    const avgMoy = validMoys.length > 0 ? validMoys.reduce((a, b) => a + b, 0) / validMoys.length : 0;

    // Summary Table
    autoTable(doc, {
      startY: 40,
      head: [['Indicateur', `Valeur (T${trimestre})`, ...(isT3 ? ['Valeur (Annuelle)'] : [])]],
      body: [
        ['Nombre d\'élèves', allGrades.length.toString(), ...(isT3 ? [allGrades.length.toString()] : [])],
        ['Taux de réussite', `${passRate.toFixed(2)}%`, ...(isT3 ? [`${(allGrades.filter(s => s.annualMoy >= 10).length / allGrades.length * 100).toFixed(2)}%`] : [])],
        ['Moyenne générale de classe', avgMoy.toFixed(2), ...(isT3 ? [(allGrades.map(s => s.annualMoy).reduce((a, b) => a + b, 0) / allGrades.length).toFixed(2)] : [])],
        ['Plus forte moyenne', validMoys.length > 0 ? Math.max(...validMoys).toFixed(2) : '-', ...(isT3 ? [Math.max(...allGrades.map(s => s.annualMoy)).toFixed(2)] : [])],
        ['Plus faible moyenne', validMoys.length > 0 ? Math.min(...validMoys).toFixed(2) : '-', ...(isT3 ? [Math.min(...allGrades.map(s => s.annualMoy)).toFixed(2)] : [])],
      ],
      theme: 'striped',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    // Gender Stats Table
    const maleStudents = allGrades.filter(s => s.sexe === 'M');
    const femaleStudents = allGrades.filter(s => s.sexe === 'F');
    const malePassCount = maleStudents.filter(s => s.globalMoy >= 10).length;
    const femalePassCount = femaleStudents.filter(s => s.globalMoy >= 10).length;
    
    const maleAnnualPassCount = maleStudents.filter(s => s.annualMoy >= 10).length;
    const femaleAnnualPassCount = femaleStudents.filter(s => s.annualMoy >= 10).length;

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Sexe', 'Effectif', `Admis (T${trimestre})`, `Taux (T${trimestre})`, ...(isT3 ? ['Admis (Annuel)', 'Taux (Annuel)'] : [])]],
      body: [
        [
          'Garçons', 
          maleStudents.length.toString(), 
          malePassCount.toString(), 
          `${maleStudents.length > 0 ? ((malePassCount / maleStudents.length) * 100).toFixed(2) : 0}%`,
          ...(isT3 ? [maleAnnualPassCount.toString(), `${maleStudents.length > 0 ? ((maleAnnualPassCount / maleStudents.length) * 100).toFixed(2) : 0}%`] : [])
        ],
        [
          'Filles', 
          femaleStudents.length.toString(), 
          femalePassCount.toString(), 
          `${femaleStudents.length > 0 ? ((femalePassCount / femaleStudents.length) * 100).toFixed(2) : 0}%`,
          ...(isT3 ? [femaleAnnualPassCount.toString(), `${femaleStudents.length > 0 ? ((femaleAnnualPassCount / femaleStudents.length) * 100).toFixed(2) : 0}%`] : [])
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    // Distribution Table
    const distribution = [
      { range: '0-5', count: allGrades.filter(s => s.globalMoy < 5 && s.globalMoy > 0).length, annualCount: allGrades.filter(s => s.annualMoy < 5 && s.annualMoy > 0).length },
      { range: '5-10', count: allGrades.filter(s => s.globalMoy >= 5 && s.globalMoy < 10).length, annualCount: allGrades.filter(s => s.annualMoy >= 5 && s.annualMoy < 10).length },
      { range: '10-12', count: allGrades.filter(s => s.globalMoy >= 10 && s.globalMoy < 12).length, annualCount: allGrades.filter(s => s.annualMoy >= 10 && s.annualMoy < 12).length },
      { range: '12-14', count: allGrades.filter(s => s.globalMoy >= 12 && s.globalMoy < 14).length, annualCount: allGrades.filter(s => s.annualMoy >= 12 && s.annualMoy < 14).length },
      { range: '14-16', count: allGrades.filter(s => s.globalMoy >= 14 && s.globalMoy < 16).length, annualCount: allGrades.filter(s => s.annualMoy >= 14 && s.annualMoy < 16).length },
      { range: '16-20', count: allGrades.filter(s => s.globalMoy >= 16).length, annualCount: allGrades.filter(s => s.annualMoy >= 16).length },
    ];

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      head: [['Tranche de Moyenne', `Nombre (T${trimestre})`, ...(isT3 ? ['Nombre (Annuel)'] : [])]],
      body: distribution.map(d => [d.range, d.count.toString(), ...(isT3 ? [d.annualCount.toString()] : [])]),
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    // Subject Performance Table
    const sortedMatieres: any[] = [];
    const parents = (classeDetails?.matieres || []).filter((m: any) => !m.parent_id);
    const children = (classeDetails?.matieres || []).filter((m: any) => m.parent_id);
    parents.forEach((p: any) => {
      const subMatieres = children.filter((c: any) => c.parent_id === p.matiere_id);
      if (subMatieres.length > 0) subMatieres.forEach((s: any) => sortedMatieres.push(s));
      else sortedMatieres.push(p);
    });
    children.forEach((c: any) => {
      if (!parents.find((p: any) => p.matiere_id === c.parent_id)) sortedMatieres.push(c);
    });

    const subjectData = sortedMatieres.map(m => {
      const subjectMoys = allGrades.map(s => {
        const sm = s.subjectsGrades.find((sm: any) => sm.matiere_id === m.matiere_id);
        return sm ? sm.moy : null;
      }).filter(n => n !== null) as number[];
      
      const avg = subjectMoys.length > 0 ? subjectMoys.reduce((a, b) => a + b, 0) / subjectMoys.length : 0;
      const pass = subjectMoys.filter(n => n >= 10).length;
      const rate = subjectMoys.length > 0 ? (pass / subjectMoys.length) * 100 : 0;
      
      return [m.matiere_nom, avg.toFixed(2), `${rate.toFixed(2)}%`];
    });

    doc.text("Performance par Matière", 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Matière', 'Moyenne', 'Taux de Réussite']],
      body: subjectData,
      theme: 'grid',
      headStyles: { fillColor: hexToRgb(getPrimaryColor()) }
    });

    doc.save(`Statistiques_${className}_Trimestre_${trimestre}.pdf`);
  };

  const populateRapidData = React.useCallback((elevesList: any[], notesList: any[], matId: string | number, trim: number, isPrim: boolean, evalType: string) => {
    const currentMatiere = classMatieres?.find((m: any) => (m.matiere_id || m.id).toString() === matId.toString());
    const isDisciplinaire = currentMatiere?.est_disciplinaire;

    return (elevesList || []).map((e: any) => {
      const studentNotes = (notesList || []).filter((n: any) => 
        Number(n.eleve_id) === Number(e.id) && 
        (Number(n.matiere_id) === Number(matId) || n.matiere_id?.toString() === matId?.toString()) && 
        Number(n.trimestre) === Number(trim)
      );

      const initialNotes: any = { I1: '', I2: '', I3: '', I4: '', Dev1: '', Dev2: '', Composition: '', Examen: '', NoteObtenue: '', NotePerfectionnement: '', Disciplinaire: '' };

      if (isDisciplinaire) {
        const discNote = studentNotes.find(n => n.matiere_id?.toString() === matId.toString());
        initialNotes.Disciplinaire = discNote && discNote.note !== null && discNote.note !== undefined ? formatGrade(discNote.note) : '';
      } else if (isPrim) {
        const evalNorm = (evalType || '').toLowerCase().replace(/[\s_-]/g, '');

        // Find NoteObtenue
        let obt = studentNotes.find((n: any) => {
          const t = (n.type_evaluation || '').toString().toLowerCase().replace(/[\s_-]/g, '');
          const isObt = t.includes('noteobtenue') || t.includes('obtenue') || t.endsWith('obt');
          if (!isObt) return false;
          if (evalNorm) return t.startsWith(evalNorm) || t.includes(evalNorm);
          return true;
        }) || studentNotes.find((n: any) => {
          const t = (n.type_evaluation || '').toString().toLowerCase().replace(/[\s_-]/g, '');
          return t === 'noteobtenue' || t === 'note_obtenue';
        });

        // If not found with NoteObtenue suffix, check if saved directly under eval name
        if (!obt) {
          obt = studentNotes.find((n: any) => {
            const t = (n.type_evaluation || '').toString().toLowerCase().replace(/[\s_-]/g, '');
            return t === evalNorm || (evalNorm && t.startsWith(evalNorm));
          });
        }

        // Find NotePerfectionnement
        const perf = studentNotes.find((n: any) => {
          const t = (n.type_evaluation || '').toString().toLowerCase().replace(/[\s_-]/g, '');
          const isPerf = t.includes('noteperfectionnement') || t.includes('perfectionnement') || t.includes('perf');
          if (!isPerf) return false;
          if (evalNorm) return t.startsWith(evalNorm) || t.includes(evalNorm);
          return true;
        }) || studentNotes.find((n: any) => {
          const t = (n.type_evaluation || '').toString().toLowerCase().replace(/[\s_-]/g, '');
          return t === 'noteperfectionnement' || t === 'note_perfectionnement';
        });

        if (obt && obt.note !== null && obt.note !== undefined) initialNotes.NoteObtenue = formatGrade(obt.note);
        if (perf && perf.note !== null && perf.note !== undefined) initialNotes.NotePerfectionnement = formatGrade(perf.note);
      } else {
        const findNote = (candidates: string[]) => {
          const found = studentNotes.find((n: any) => {
            const t = (n.type_evaluation || '').toString().trim().toLowerCase().replace(/[\s_-]/g, '');
            return candidates.some(c => t === c.toLowerCase().replace(/[\s_-]/g, ''));
          });
          return found && found.note !== null && found.note !== undefined ? formatGrade(found.note) : '';
        };

        initialNotes.I1 = findNote(['I1', 'Interrogation 1', 'Interrogation1']);
        initialNotes.I2 = findNote(['I2', 'Interrogation 2', 'Interrogation2']);
        initialNotes.I3 = findNote(['I3', 'Interrogation 3', 'Interrogation3']);
        initialNotes.I4 = findNote(['I4', 'Interrogation 4', 'Interrogation4']);
        initialNotes.Dev1 = findNote(['Dev1', 'D1', 'Devoir 1', 'Devoir1', 'devoir_1']);
        initialNotes.Dev2 = findNote(['Dev2', 'D2', 'Devoir 2', 'Devoir2', 'devoir_2']);
        initialNotes.Composition = findNote(['Composition', 'Comp', 'Compo']);
        initialNotes.Examen = findNote(['Examen', 'Exam']);
      }

      return {
        id: e.id,
        nom: `${e.nom} ${e.prenom}`,
        notes: initialNotes
      };
    });
  }, [formatGrade]);

  const openRapidEntry = (targetMatiereId?: string | number, targetTrim?: number, targetEval?: string) => {
    if (isEntryRestricted) {
      setShowPermissionModal(true);
      toast.error("La saisie des notes est verrouillée par l'administration. Veuillez soumettre une demande de permission.");
      return;
    }
    if (!selectedClasse) {
      toast.error("Veuillez sélectionner une classe d'abord.");
      return;
    }
    setIsLoadingGrid(true);
    Promise.all([
      apiFetch(`/api/classes/${selectedClasse}/details`).then(res => res.json()),
      apiFetch(`/api/notes/${selectedClasse}`).then(res => res.json()).catch(() => [])
    ])
      .then(([detailsData, notesData]) => {
        const allNotes = [
          ...(Array.isArray(detailsData?.notes) ? detailsData.notes : []),
          ...(Array.isArray(notesData) ? notesData : [])
        ];
        const notesMap = new Map();
        allNotes.forEach((n: any) => {
          const key = `${n.eleve_id}_${n.matiere_id}_${n.type_evaluation}_${n.trimestre}`;
          notesMap.set(key, n);
        });
        const mergedNotes = Array.from(notesMap.values());

        const safeData = {
          ...detailsData,
          eleves: Array.isArray(detailsData?.eleves) ? detailsData.eleves : [],
          matieres: Array.isArray(detailsData?.matieres) ? detailsData.matieres : [],
          notes: mergedNotes
        };
        setClasseDetails(safeData);
        setClassMatieres(safeData.matieres);
        setNotes(mergedNotes);

        const isPrim = isPrimary(classes.find((c: any) => c.id === parseInt(selectedClasse)) || safeData);
        const currentTrim = targetTrim || selectedTrimestre || selectedTrimestreRapid || 1;
        const currentEval = targetEval || selectedGridEval || selectedEvalRapid || 'EvalFormative';

        setSelectedTrimestreRapid(currentTrim);
        setSelectedEvalRapid(currentEval);

        let targetMatId = targetMatiereId ? targetMatiereId.toString() : selectedMatiereRapid;
        if (!targetMatId || !safeData.matieres.some((m: any) => (m.matiere_id || m.id).toString() === targetMatId)) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const teacherMat = user?.role === 'enseignant' && user?.enseignant_id 
            ? safeData.matieres.find((m: any) => m.enseignant_id === user.enseignant_id)
            : null;

          if (teacherMat) {
            targetMatId = (teacherMat.matiere_id || teacherMat.id).toString();
          } else if (safeData.matieres.length > 0) {
            targetMatId = (safeData.matieres[0].matiere_id || safeData.matieres[0].id).toString();
          } else {
            targetMatId = '';
          }
        }
        setSelectedMatiereRapid(targetMatId);

        const initialData = populateRapidData(safeData.eleves, mergedNotes, targetMatId, currentTrim, isPrim, currentEval);
        setRapidEntryData(initialData);
        setShowRapidEntryModal(true);
      })
      .catch(err => {
        console.error(err);
        toast.error("Impossible d'ouvrir la saisie rapide.");
      })
      .finally(() => setIsLoadingGrid(false));
  };

  const handleRapidSubjectOrTrimChange = (newMatId: string, newTrim: number, newEval: string = selectedEvalRapid) => {
    setSelectedMatiereRapid(newMatId);
    setSelectedTrimestreRapid(newTrim);
    setSelectedEvalRapid(newEval);

    const safeNotes = [
      ...(Array.isArray(classeDetails?.notes) ? classeDetails.notes : []),
      ...(Array.isArray(notes) ? notes : [])
    ];
    const notesMap = new Map();
    safeNotes.forEach((n: any) => {
      const key = `${n.eleve_id}_${n.matiere_id}_${n.type_evaluation}_${n.trimestre}`;
      notesMap.set(key, n);
    });
    const mergedNotes = Array.from(notesMap.values());

    const safeEleves = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    const isPrim = isPrimary(classes.find((c: any) => c.id === parseInt(selectedClasse)) || classeDetails);

    const updated = populateRapidData(safeEleves, mergedNotes, newMatId, newTrim, isPrim, newEval);
    setRapidEntryData(updated);
  };

  const handleRapidNoteChange = (studentIdx: number, field: string, rawVal: string, maxVal: number = 20) => {
    if (rawVal === '') {
      const newData = [...rapidEntryData];
      newData[studentIdx].notes[field] = '';
      setRapidEntryData(newData);
      return;
    }
    // Accept up to 2 decimals
    if (!isValidGradeInput(rawVal, maxVal)) return;

    const newData = [...rapidEntryData];
    newData[studentIdx].notes[field] = rawVal;
    setRapidEntryData(newData);
  };

  const handlePasteGrades = (e: React.ClipboardEvent, studentIndex: number, noteType: string) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text');
    const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
    const isPrim = isPrimary(classes.find((c: any) => c.id === parseInt(selectedClasse)) || classeDetails);
    const types = isPrim 
      ? ['NoteObtenue', 'NotePerfectionnement'] 
      : ['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'];
    
    if (rows.length > 1) {
      // Multi-row paste (from Excel/Table)
      const newRapidData = [...rapidEntryData];
      rows.forEach((row, i) => {
        const targetIdx = studentIndex + i;
        if (targetIdx < newRapidData.length) {
          const cells = row.split(/\t/); // Split by tab for Excel
          if (cells.length > 1) {
            // Multi-column paste
            const startTypeIdx = types.indexOf(noteType);
            cells.forEach((cell, j) => {
              const typeIdx = startTypeIdx + j;
              if (typeIdx >= 0 && typeIdx < types.length) {
                const parsed = parseGrade(cell);
                if (parsed.valid && parsed.num !== null) {
                  newRapidData[targetIdx].notes[types[typeIdx]] = formatGrade(parsed.num);
                } else if (cell.trim() === '') {
                  newRapidData[targetIdx].notes[types[typeIdx]] = '';
                }
              }
            });
          } else {
            // Single column paste across multiple students
            const parsed = parseGrade(row);
            if (parsed.valid && parsed.num !== null) {
              newRapidData[targetIdx].notes[noteType] = formatGrade(parsed.num);
            } else if (row.trim() === '') {
              newRapidData[targetIdx].notes[noteType] = '';
            }
          }
        }
      });
      setRapidEntryData(newRapidData);
    } else {
      // Single cell paste
      const parsed = parseGrade(pasteData);
      if (parsed.valid && parsed.num !== null) {
        const newRapidData = [...rapidEntryData];
        newRapidData[studentIndex].notes[noteType] = formatGrade(parsed.num);
        setRapidEntryData(newRapidData);
      } else if (pasteData.trim() === '') {
        const newRapidData = [...rapidEntryData];
        newRapidData[studentIndex].notes[noteType] = '';
        setRapidEntryData(newRapidData);
      }
    }
  };

  const handleRapidSubmit = async () => {
    if (isEntryRestricted) {
      setShowGridModal(false);
      setShowPermissionModal(true);
      toast.error("La saisie des notes est verrouillée par l'administration. Veuillez soumettre une demande de permission.");
      return;
    }
    if (!selectedMatiereRapid) {
      toast.error("Veuillez sélectionner une matière.");
      return;
    }
    
    setIsSavingRapid(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const enseignant_id = user.enseignant_id;
    const isPrim = isPrimary(classes.find((c: any) => c.id === parseInt(selectedClasse)) || classeDetails);
    const currentMatiere = (classeDetails?.matieres || matieres)?.find((m: any) => (m.matiere_id || m.id).toString() === selectedMatiereRapid);
    const isDisciplinaire = currentMatiere?.est_disciplinaire;

    try {
      const bulkData = rapidEntryData.map(student => {
        const studentNotes = Object.entries(student.notes)
          .filter(([type, value]) => value !== '' && value !== null && value !== undefined && type !== 'MinusValue' && type !== 'PlusValue')
          .map(([type, value]) => {
            const parsed = parseGrade(value);
            if (!parsed.valid || parsed.num === null) return null;

            let noteType = type;
            if (isDisciplinaire) {
              noteType = 'NoteDisciplinaire';
            } else if (isPrim) {
              noteType = (type === 'NoteObtenue' || type === 'NotePerfectionnement') 
                ? `${selectedEvalRapid}_${type}` 
                : selectedEvalRapid;
            }
            // For secondary: noteType is 'I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'
            return {
              type: noteType,
              note: parsed.num,
              matiere_id: selectedMatiereRapid
            };
          })
          .filter((n: any) => n !== null);

        return {
          eleve_id: student.id,
          matiere_id: selectedMatiereRapid,
          notes: studentNotes
        };
      }).filter(s => s.notes.length > 0);

      if (bulkData.length === 0) {
        toast.error("Aucune note valide à enregistrer.");
        setIsSavingRapid(false);
        return;
      }

      const response = await apiFetch('/api/notes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: bulkData,
          matiere_id: selectedMatiereRapid,
          trimestre: selectedTrimestreRapid,
          date_evaluation: rapidEntryDate,
          enseignant_id 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'enregistrement");
      }
      
      setShowRapidEntryModal(false);
      setSelectedTrimestre(selectedTrimestreRapid);

      // Refresh both notes and class details so the grid displays newly entered notes immediately!
      if (selectedClasse) {
        const [notesRes, detailsRes] = await Promise.all([
          apiFetch(`/api/notes/${selectedClasse}`).then(res => res.json()),
          apiFetch(`/api/classes/${selectedClasse}/details`).then(res => res.json())
        ]);
        if (Array.isArray(notesRes)) setNotes(notesRes);
        if (detailsRes && (detailsRes.eleves || detailsRes.classe)) setClasseDetails(detailsRes);
      }
      toast.success("Notes enregistrées avec succès ! La grille a été actualisée.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setIsSavingRapid(false);
    }
  };

  const downloadNotesExcel = async (trimestre: number) => {
    if (!selectedClasse) {
      toast.error("Veuillez sélectionner une classe d'abord.");
      return;
    }

    const toastId = toast.loading(`Préparation de l'export Excel (Trimestre ${trimestre})...`);
    
    try {
      const currentClasseObj = classes.find((c: any) => c.id === parseInt(selectedClasse));
      const className = currentClasseObj?.nom || 'Classe';

      // Fetch latest details to be sure we have everything
      const res = await apiFetch(`/api/classes/${selectedClasse}/details`);
      const data = await res.json();
      
      const students = Array.isArray(data.eleves) ? data.eleves : [];
      const subjects = Array.isArray(data.matieres) ? data.matieres : [];
      const allNotes = Array.isArray(data.notes) ? data.notes : [];

      // Sort students by name
      students.sort((a: any, b: any) => a.nom.localeCompare(b.nom));

      const wb = XLSX.utils.book_new();

      // Only include subjects that are not parents (actual leaf subjects)
      const leafSubjects = subjects.filter((s: any) => !subjects.some((other: any) => other.parent_id === s.matiere_id));

      if (leafSubjects.length === 0) {
        throw new Error("Aucune matière trouvée pour cette classe.");
      }

      leafSubjects.forEach((subject: any) => {
        const subjectName = (subject.matiere_nom || subject.nom || 'Sans nom').toUpperCase();
        
        // Rows data
        const aoaData: any[][] = [
          ['Matricule', 'Nom', 'Prénoms', 'Moy. interro', 'Devoir 1', 'Devoir 2']
        ];

        students.forEach((student: any) => {
          const studentNotes = allNotes.filter(n => 
            n.eleve_id === student.id && 
            n.matiere_id === subject.matiere_id && 
            n.trimestre === trimestre
          );

          // Get specific notes
          const getNote = (type: string) => {
            const noteObj = studentNotes.find(n => n.type_evaluation === type);
            return noteObj ? noteObj.note : null;
          };

          // Mapping for MI, Dev1, Dev2
          const mi_imported = getNote('MI');
          const i1 = getNote('I1');
          const i2 = getNote('I2');
          const i3 = getNote('I3');
          const i4 = getNote('I4');
          
          const interrogations = [i1, i2, i3, i4].filter(n => n !== null) as number[];
          const mi_calc = interrogations.length > 0 ? interrogations.reduce((a, b) => a + b, 0) / interrogations.length : null;
          const mi = mi_imported !== null ? mi_imported : mi_calc;

          const d1 = getNote('Dev1');
          const d2 = getNote('Dev2');

          aoaData.push([
            student.matricule || '',
            student.nom || '',
            student.prenom || '',
            mi !== null ? Math.round(mi * 100) / 100 : '',
            d1 !== null ? d1 : '',
            d2 !== null ? d2 : ''
          ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoaData);
        
        // Set column widths
        ws['!cols'] = [
          { wch: 15 }, // Matricule
          { wch: 20 }, // Nom
          { wch: 25 }, // Prénoms
          { wch: 12 }, // Moy. interro
          { wch: 12 }, // Devoir 1
          { wch: 12 }, // Devoir 2
        ];

        // Sheet name must be < 31 chars and unique
        let safeName = subjectName.substring(0, 30).replace(/[:\\\?\*\/\[\]]/g, '_');
        
        // Ensure unique sheet name
        let counter = 1;
        let finalName = safeName;
        while (wb.SheetNames.includes(finalName)) {
          finalName = `${safeName.substring(0, 27)}_${counter++}`;
        }
        
        XLSX.utils.book_append_sheet(wb, ws, finalName);
      });

      XLSX.writeFile(wb, `Notes_${className.replace(/\s+/g, '_')}_T${trimestre}.xlsx`);
      toast.success("Export Excel terminé !", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'export Excel.", { id: toastId });
    }
  };

  const downloadTemplate = () => {
    if (!selectedClasse) {
      toast.error("Veuillez sélectionner une classe d'abord.");
      return;
    }

    const currentClasseObj = classes.find((c: any) => c.id === parseInt(selectedClasse));
    const className = currentClasseObj?.nom || 'Classe';

    const studentsInClass = eleves
      .filter((e: any) => e.classe_id === parseInt(selectedClasse))
      .sort((a: any, b: any) => a.nom.localeCompare(b.nom));

    const wb = XLSX.utils.book_new();

    // Get subjects for this class
    apiFetch(`/api/classes/${selectedClasse}/details`)
      .then(res => res.json())
      .then(data => {
        const classMatieres = data.matieres || [];
        const isPrimaryClass = isPrimary(currentClasseObj);

        // Sorting matieres by category as requested: Littéraires, Scientifiques, Autres
        const parents = classMatieres.filter((m: any) => !m.parent_id);
        const children = classMatieres.filter((m: any) => m.parent_id);

        const categoryOrder = ['littéraire', 'littéraires', 'scientifique', 'scientifiques', 'autre', 'autres'];
        
        const subjectsWithMetadata = parents.map((p: any) => {
          const subMatieres = children.filter((c: any) => c.parent_id === p.matiere_id || c.parent_id === p.id);
          return {
            parent: p,
            children: subMatieres
          };
        });

        // Sort parents by category then name
        subjectsWithMetadata.sort((a: any, b: any) => {
          const catA = (a.parent.categorie || '').toLowerCase();
          const catB = (b.parent.categorie || '').toLowerCase();
          let indexA = categoryOrder.findIndex(o => catA.includes(o));
          let indexB = categoryOrder.findIndex(o => catB.includes(o));
          if (indexA === -1) indexA = 99;
          if (indexB === -1) indexB = 99;
          if (indexA !== indexB) return indexA - indexB;
          return (a.parent.matiere_nom || a.parent.nom || '').localeCompare(b.parent.matiere_nom || b.parent.nom || '');
        });

        const sortedMatieres: any[] = [];
        subjectsWithMetadata.forEach(item => {
          if (item.children.length > 0) {
            // Sort children alphabetically
            const sortedChildren = [...item.children].sort((a, b) => (a.matiere_nom || a.nom || '').localeCompare(b.matiere_nom || b.nom || ''));
            sortedChildren.forEach(s => sortedMatieres.push(s));
          } else {
            sortedMatieres.push(item.parent);
          }
        });

        // Add orphaned children
        const orphanedChildren = children.filter((c: any) => !parents.find((p: any) => p.matiere_id === c.parent_id || p.id === c.parent_id));
        orphanedChildren.forEach(c => sortedMatieres.push(c));

        // Generate 3 sheets, one for each trimester
        [1, 2, 3].forEach(trim => {
          if (isPrimaryClass) {
            // Primary still uses one sheet but with requested category sorting
            const row0: any[] = ['Matricule', 'Nom', 'Prénom', 'Classe'];
            const row1: any[] = ['', '', '', ''];
            
            const merges: any[] = [
              { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Matricule
              { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Nom
              { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Prénom
              { s: { r: 0, c: 3 }, e: { r: 1, c: 3 } }, // Classe
            ];

            sortedMatieres.forEach((m: any, idx: number) => {
              const startCol = 4 + idx * 2;
              const subjectName = m.matiere_nom || m.nom || `Matière ${idx + 1}`;
              row0.push(subjectName, '');
              row1.push('Note Obtenue', 'Note de Perfectionnement');
              merges.push({
                s: { r: 0, c: startCol },
                e: { r: 0, c: startCol + 1 }
              });
            });

            const aoaData: any[][] = [row0, row1];

            studentsInClass.forEach((e: any) => {
              const studentRow: any[] = [e.matricule, e.nom, e.prenom, className];
              sortedMatieres.forEach(() => {
                studentRow.push('', '');
              });
              aoaData.push(studentRow);
            });

            const ws = XLSX.utils.aoa_to_sheet(aoaData);
            ws['!merges'] = merges;

            const colWidths: any[] = [
              { wch: 14 },
              { wch: 20 },
              { wch: 20 },
              { wch: 14 },
            ];
            sortedMatieres.forEach(() => {
              colWidths.push({ wch: 16 }, { wch: 24 });
            });
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, `Notes du Trimestre ${trim}`);
          } else {
            // Secondary: Single sheet, horizontal layout with MI/D1/D2 columns
            const row0: any[] = ['Matricule', 'Nom', 'Prénoms'];
            const row1: any[] = ['', '', ''];
            const merges: any[] = [
              { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // Matricule
              { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, // Nom
              { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, // Prénoms
            ];

            let currentCol = 3;
            sortedMatieres.forEach((m: any, idx: number) => {
              const subjectName = m.matiere_nom || m.nom || `Matière ${idx + 1}`;
              const isDisciplinaire = m.est_disciplinaire;

              if (isDisciplinaire) {
                row0.push(subjectName);
                row1.push('Note');
                merges.push({
                  s: { r: 0, c: currentCol },
                  e: { r: 0, c: currentCol }
                });
                currentCol += 1;
              } else {
                row0.push(subjectName, null, null);
                row1.push('MI', 'D1', 'D2');
                merges.push({
                  s: { r: 0, c: currentCol },
                  e: { r: 0, c: currentCol + 2 }
                });
                currentCol += 3;
              }
            });

            const aoaData: any[][] = [row0, row1];
            studentsInClass.forEach((student: any) => {
              const studentRow: any[] = [student.matricule, student.nom, student.prenom];
              sortedMatieres.forEach((m: any) => {
                if (m.est_disciplinaire) {
                  studentRow.push(null);
                } else {
                  studentRow.push(null, null, null);
                }
              });
              aoaData.push(studentRow);
            });

            const ws = XLSX.utils.aoa_to_sheet(aoaData);
            ws['!merges'] = merges;

            const colWidths: any[] = [
              { wch: 14 },
              { wch: 20 },
              { wch: 20 },
            ];
            sortedMatieres.forEach((m: any) => {
              if (m.est_disciplinaire) {
                colWidths.push({ wch: 12 });
              } else {
                colWidths.push({ wch: 10 }, { wch: 10 }, { wch: 10 });
              }
            });
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, `Notes du Trimestre ${trim}`);
          }
        });
        
        XLSX.writeFile(wb, `Template_Notes_${className.replace(/\s+/g, '_')}.xlsx`);
      })
      .catch(err => {
        console.error(err);
        toast.error("Erreur lors de la génération du template.");
      });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEntryRestricted) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowPermissionModal(true);
      toast.error("L'importation des notes est actuellement verrouillée par l'administration. Veuillez soumettre une demande de permission.");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        
        const allSheets: Record<string, any[]> = {};
        const combinedData: any[] = [];
        const foundSummarySheet = wb.SheetNames.find(n => n.trim().toUpperCase() === "TOUS LES ÉLÈVES");

        wb.SheetNames.forEach(name => {
          const ws = wb.Sheets[name];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (!rawRows || rawRows.length === 0) {
            allSheets[name] = [];
            return;
          }

          // Check if file uses Vertical Template (Secondary Old) or New Secondary Single Sheet
          const isVertical = rawRows.length >= 4 && 
            rawRows[0] && rawRows[0][0] === 'Matricule' && 
            rawRows[2] && rawRows[2][0]?.toString().includes('NOTES DU');

          // Check if file uses 2-row header (Row 0: Subject names merged, Row 1: Note Obtenue / MI / D1 / D2)
          const isTwoRowHeader = rawRows.length >= 2 && 
            (rawRows[0][0] === 'Matricule' || rawRows[0][1] === 'Nom') &&
            rawRows[1] && 
            (
              rawRows[1].some((cell: any) => typeof cell === 'string' && (
                cell.includes('Note Obtenue') || 
                cell.includes('Note de Perfectionnement') ||
                cell === 'MI' || cell === 'D1' || cell === 'D2'
              ))
            );

          let currentSheetData: any[] = [];

          if (isVertical) {
            const matricule = rawRows[1][0]?.toString().trim();
            const nom = rawRows[1][1]?.toString().trim();
            const prenom = rawRows[1][2]?.toString().trim();

            const studentNotes: any[] = [];

            // Subjects start at row 4 (index 3)
            for (let i = 3; i < rawRows.length; i += 3) {
              const subjectName = rawRows[i] && rawRows[i][0]?.toString().trim();
              if (!subjectName) continue;

              const matchedMat = matieres.find((m: any) => 
                (m.matiere_nom || m.nom || '').toLowerCase() === subjectName.toLowerCase()
              );

              if (matchedMat) {
                const mi = rawRows[i] ? rawRows[i][2] : null;
                const d1 = rawRows[i+1] ? rawRows[i+1][2] : null;
                const d2 = rawRows[i+2] ? rawRows[i+2][2] : null;

                if (mi !== undefined && mi !== null && mi !== '' && mi.toString().trim() !== '') {
                  studentNotes.push({ matiere_id: matchedMat.id, type: 'MI', note: parseFloat(mi.toString().replace(',', '.')) });
                }
                if (d1 !== undefined && d1 !== null && d1 !== '' && d1.toString().trim() !== '') {
                  studentNotes.push({ matiere_id: matchedMat.id, type: 'Dev1', note: parseFloat(d1.toString().replace(',', '.')) });
                }
                if (d2 !== undefined && d2 !== null && d2 !== '' && d2.toString().trim() !== '') {
                  studentNotes.push({ matiere_id: matchedMat.id, type: 'Dev2', note: parseFloat(d2.toString().replace(',', '.')) });
                }
              }
            }

            if (studentNotes.length > 0) {
              const obj: any = {
                Matricule: matricule,
                Nom: nom,
                Prénoms: prenom
              };
              studentNotes.forEach(sn => {
                const mat = matieres.find(m => m.id === sn.matiere_id);
                if (mat) {
                  const key = `${mat.matiere_nom || mat.nom} - ${sn.type}`;
                  obj[key] = sn.note;
                }
              });
              currentSheetData = [obj];
            }
          } else if (isTwoRowHeader) {
            const row0 = rawRows[0] || [];
            const row1 = rawRows[1] || [];
            const headers: string[] = [];
            let lastSubject = '';

            const maxCols = Math.max(row0.length, row1.length);
            // Detect if it's the 3-column start (Matricule, Nom, Prénoms) or 4-column (with Classe)
            const subjectStartCol = (row0[3] === 'Classe' || row1[3] === 'Classe') ? 4 : 3;

            for (let c = 0; c < maxCols; c++) {
              if (c < subjectStartCol) {
                headers[c] = (row0[c] || row1[c] || '').toString().trim();
              } else {
                if (row0[c] && row0[c].toString().trim() !== '') {
                  lastSubject = row0[c].toString().trim();
                }
                const subHeader = (row1[c] || '').toString().trim();
                if (lastSubject && subHeader) {
                  headers[c] = `${lastSubject} - ${subHeader}`;
                } else if (lastSubject) {
                  headers[c] = lastSubject;
                } else {
                  headers[c] = subHeader || `Col_${c}`;
                }
              }
            }

            for (let r = 2; r < rawRows.length; r++) {
              const rowData = rawRows[r];
              if (!rowData || rowData.length === 0) continue;
              const obj: any = {};
              let hasVal = false;
              headers.forEach((h, colIdx) => {
                if (h) {
                  const val = rowData[colIdx];
                  obj[h] = val !== undefined ? val : '';
                  if (val !== undefined && val !== null && val !== '') hasVal = true;
                }
              });
              if (hasVal) {
                currentSheetData.push(obj);
              }
            }
          } else {
            currentSheetData = (XLSX.utils.sheet_to_json(ws) as any[]).filter(row => 
              row.Nom || row.nom || row.Prenom || row.prenom || row.prénom || row.Prénoms || row.Matricule || row.matricule || row.Classe || row.classe
            );
          }

          allSheets[name] = currentSheetData;
          
          // Add to combinedData ONLY IF no summary sheet exists in file OR if this IS the summary sheet
          if (!foundSummarySheet || name === foundSummarySheet) {
            combinedData.push(...currentSheetData);
          }
        });

        if (Object.keys(allSheets).length === 0) {
          toast.error("Le fichier est vide.");
          return;
        }

        setImportSheets(allSheets);
        
        // If multiple sheets (one per student), combine them into a single view
        if (wb.SheetNames.length > 1) {
          if (foundSummarySheet) {
            setSelectedImportSheet(foundSummarySheet);
            setImportData(allSheets[foundSummarySheet]);
          } else {
            // Check if sheets look like individual student sheets (one row each)
            const isIndividualStudentSheets = wb.SheetNames.length > 3 && Object.values(allSheets).every(data => data.length === 1);
            if (isIndividualStudentSheets) {
              allSheets["TOUS LES ÉLÈVES"] = combinedData;
              setSelectedImportSheet("TOUS LES ÉLÈVES");
              setImportData(combinedData);
            } else {
              // Default to first sheet instead of automatically combining all
              const firstSheet = wb.SheetNames[0];
              setSelectedImportSheet(firstSheet);
              setImportData(allSheets[firstSheet]);
            }
          }
        } else {
          const firstSheet = wb.SheetNames[0];
          setSelectedImportSheet(firstSheet);
          setImportData(allSheets[firstSheet]);
        }
        
        setShowImportModal(true);
      } catch (err) {
        console.error(err);
        toast.error("Erreur lors de la lecture du fichier Excel.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset input
    e.target.value = '';
  };

  React.useEffect(() => {
    if (selectedImportSheet && importSheets[selectedImportSheet]) {
      setImportData(importSheets[selectedImportSheet]);
      
      // Try to auto-select subject based on sheet name
      const matchedMatiere = matieres.find((m: any) => 
        m.nom.toLowerCase() === selectedImportSheet.toLowerCase() || 
        selectedImportSheet.toLowerCase().includes(m.nom.toLowerCase())
      );
      if (matchedMatiere) {
        setImportMatiereId(matchedMatiere.id.toString());
      }
    }
  }, [selectedImportSheet, importSheets, matieres]);

  React.useEffect(() => {
    if (importData.length > 0) {
      const currentClassMatieres = (classeDetails?.matieres && classeDetails.matieres.length > 0)
        ? classeDetails.matieres
        : (classMatieres.length > 0 ? classMatieres : []);
      
      const currentImportClasse = classes.find((c: any) => c.id === parseInt(selectedClasse));
      const isImportPrimaryMode = isPrimary(currentImportClasse || classeDetails);

      // Step 1: Detect all non-identity column headers across the imported rows
      const identityKeyNorms = ['matricule', 'nom', 'prenom', 'prenoms', 'classe', 'rownum'];
      const detectedKeys: string[] = [];

      importData.forEach(row => {
        Object.keys(row).forEach(k => {
          const trimmed = k.trim();
          const cleanK = normalizeSubjectName(trimmed);
          if (!identityKeyNorms.includes(cleanK) && !detectedKeys.includes(trimmed)) {
            detectedKeys.push(trimmed);
          }
        });
      });

      // Step 2: Group detected columns by Excel subject
      const subjectMap = new Map<string, { key: string; subLabel: string; evalType: string }[]>();

      detectedKeys.forEach(rawKey => {
        let subjectName = '';
        let subLabel = '';
        let evalType = 'Dev1';

        if (rawKey.includes(' - ')) {
          const parts = rawKey.split(' - ');
          subjectName = parts[0].trim();
          subLabel = parts.slice(1).join(' - ').trim();
        } else if (rawKey.includes('_')) {
          const parts = rawKey.split('_');
          subjectName = parts[0].trim();
          subLabel = parts.slice(1).join('_').trim();
        } else {
          const endMatch = rawKey.match(/^(.*)[\s]+(MI|D1|D2|I1|I2|I3|I4|Dev1|Dev2|Composition|Examen)$/i);
          if (endMatch) {
            subjectName = endMatch[1].trim();
            subLabel = endMatch[2].trim();
          } else {
            const standalone = ['mi', 'd1', 'd2', 'i1', 'i2', 'i3', 'i4', 'dev1', 'dev2', 'composition', 'examen', 'noteobtenue', 'noteperfectionnement'];
            if (standalone.includes(normalizeSubjectName(rawKey))) {
              const activeMatiere = (currentClassMatieres.find((m: any) => (m.matiere_id || m.id).toString() === importMatiereId) ||
                currentClassMatieres.find((m: any) => matchSubject(m, selectedImportSheet)) ||
                matieres.find((m: any) => matchSubject(m, selectedImportSheet)));
              subjectName = activeMatiere ? (activeMatiere.matiere_nom || activeMatiere.nom) : selectedImportSheet;
              subLabel = rawKey;
            } else {
              subjectName = rawKey;
              subLabel = isImportPrimaryMode ? 'Note' : 'Note';
            }
          }
        }

        const subNorm = normalizeSubjectName(subLabel);
        const matchedMat = currentClassMatieres.find((cm: any) => matchSubject(cm, subjectName));
        const isMatiereDisciplinaire = matchedMat?.est_disciplinaire;

        if (isMatiereDisciplinaire) {
          evalType = 'NoteDisciplinaire';
          subLabel = 'Note';
        } else if (isImportPrimaryMode) {
          if (subNorm.includes('perfectionnement') || subNorm === 'perf') {
            evalType = 'NotePerfectionnement';
            subLabel = 'Note Perf.';
          } else {
            evalType = 'NoteObtenue';
            subLabel = 'Note Obtenue';
          }
        } else {
          if (subNorm === 'mi' || subNorm.includes('interrogation')) evalType = 'MI';
          else if (subNorm === 'd1' || subNorm === 'dev1' || subNorm.includes('devoir1')) evalType = 'Dev1';
          else if (subNorm === 'd2' || subNorm === 'dev2' || subNorm.includes('devoir2')) evalType = 'Dev2';
          else if (subNorm === 'i1') evalType = 'I1';
          else if (subNorm === 'i2') evalType = 'I2';
          else if (subNorm === 'i3') evalType = 'I3';
          else if (subNorm === 'i4') evalType = 'I4';
          else if (subNorm === 'composition') evalType = 'Composition';
          else if (subNorm === 'examen') evalType = 'Examen';
          else evalType = importEval || 'Dev1';
        }

        if (!subjectMap.has(subjectName)) {
          subjectMap.set(subjectName, []);
        }
        subjectMap.get(subjectName)!.push({
          key: rawKey,
          subLabel: subLabel || evalType,
          evalType
        });
      });

      // Step 3: Check assignment against currentClassMatieres
      const fileSubjects: any[] = [];
      subjectMap.forEach((cols, subjectName) => {
        const matchedMat = currentClassMatieres.find((cm: any) => matchSubject(cm, subjectName));
        const isAssigned = !!matchedMat;
        fileSubjects.push({
          subjectName,
          displayName: subjectName,
          matiere_id: matchedMat ? (matchedMat.matiere_id || matchedMat.id) : null,
          isAssigned,
          columns: cols
        });
      });

      setImportFileSubjects(fileSubjects);

      // Step 4: Parse students & notes with integrity
      const preview = importData.map((row: any) => {
        const rowNom = (row.Nom || row.nom || '').toString().trim();
        const rowPrenom = (row.Prénoms || row.Prénom || row.prénom || row.prenom || '').toString().trim();
        const rowMatricule = (row.Matricule || row.matricule || '').toString().trim();

        const student = eleves.find(e => 
          (rowMatricule && e.matricule?.toString().trim().toLowerCase() === rowMatricule.toLowerCase()) ||
          (
            rowNom && rowPrenom &&
            normalizeSubjectName(e.nom) === normalizeSubjectName(rowNom) &&
            normalizeSubjectName(e.prenom) === normalizeSubjectName(rowPrenom)
          )
        );
        
        const nameMatches = student ? (
          normalizeSubjectName(student.nom) === normalizeSubjectName(rowNom) &&
          normalizeSubjectName(student.prenom) === normalizeSubjectName(rowPrenom)
        ) : false;

        const studentNotes: any[] = [];
        let rowHasNotes = false;
        let rowErrorMessage = '';
        const parsedCells: Record<string, { display: string; error?: boolean; value?: number | null }> = {};

        fileSubjects.forEach(fs => {
          fs.columns.forEach((col: any) => {
            const rawVal = row[col.key];
            const parsed = parseGrade(rawVal);
            if (!parsed.valid) {
              rowErrorMessage = parsed.error || `Note invalide (${rawVal})`;
              parsedCells[col.key] = { display: String(rawVal), error: true, value: null };
            } else if (parsed.num !== null) {
              parsedCells[col.key] = { display: formatGrade(parsed.num), error: false, value: parsed.num };
              if (fs.isAssigned && fs.matiere_id) {
                studentNotes.push({
                  matiere_id: fs.matiere_id,
                  matiere_nom: fs.displayName,
                  type: col.evalType,
                  note: parsed.num
                });
                rowHasNotes = true;
              }
            } else {
              parsedCells[col.key] = { display: '-', error: false, value: null };
            }
          });
        });

        const hasNotesFilledInFile = Object.values(parsedCells).some((c: any) => c.value !== null && c.value !== undefined);

        return {
          matricule: rowMatricule,
          nom: rowNom,
          prenom: rowPrenom,
          classe: row.Classe || row.classe,
          studentId: student?.id,
          exists: !!student,
          nameMatches,
          hasNotes: rowHasNotes,
          hasNotesFilledInFile,
          notes: studentNotes,
          parsedCells,
          errorMessage: rowErrorMessage,
          status: !student ? 'error' : (!nameMatches ? 'warning' : 'success')
        };
      });

      setImportPreview(preview);
    } else {
      setImportFileSubjects([]);
      setImportPreview([]);
    }
  }, [importData, eleves, matieres, selectedClasse, classes, importEval, classMatieres, classeDetails, selectedImportSheet, importMatiereId]);

  // Memoized stats for Excel import preview
  const targetClassStudents = React.useMemo(() => {
    if (classeDetails?.eleves && Array.isArray(classeDetails.eleves) && classeDetails.eleves.length > 0) {
      return classeDetails.eleves;
    }
    const cid = parseInt(selectedClasse);
    if (cid && Array.isArray(eleves)) {
      const filtered = eleves.filter((e: any) => e.classe_id === cid);
      if (filtered.length > 0) return filtered;
    }
    return [];
  }, [classeDetails, selectedClasse, eleves]);

  const targetClassTotalCount = targetClassStudents.length > 0 ? targetClassStudents.length : (importPreview.length || 0);

  const targetClassName = React.useMemo(() => {
    const c = classes.find((cls: any) => cls.id === parseInt(selectedClasse)) || classeDetails;
    return c?.nom || c?.nom_classe || '';
  }, [classes, selectedClasse, classeDetails]);

  const studentsWithNotesCount = React.useMemo(() => {
    return importPreview.filter(p => {
      const hasCellGrade = p.parsedCells && Object.values(p.parsedCells).some((c: any) => c.value !== null && c.value !== undefined);
      return (p.notes && p.notes.length > 0) || hasCellGrade;
    }).length;
  }, [importPreview]);

  const studentsWithoutNotesCount = Math.max(0, importPreview.length - studentsWithNotesCount);

  const subjectsWithEnteredGrades = React.useMemo(() => {
    return importFileSubjects.map(fs => {
      let studentCountWithGrade = 0;
      let totalGradeValuesCount = 0;
      const evalTypesFound = new Set<string>();

      importPreview.forEach(p => {
        let studentHasGrade = false;
        fs.columns.forEach((col: any) => {
          const cell = p.parsedCells?.[col.key];
          if (cell && cell.value !== null && cell.value !== undefined) {
            totalGradeValuesCount++;
            studentHasGrade = true;
            if (col.subLabel) evalTypesFound.add(col.subLabel);
          }
        });
        if (studentHasGrade) {
          studentCountWithGrade++;
        }
      });

      return {
        displayName: fs.displayName,
        subjectName: fs.subjectName,
        matiere_id: fs.matiere_id,
        isAssigned: fs.isAssigned,
        studentCountWithGrade,
        totalGradeValuesCount,
        evalTypes: Array.from(evalTypesFound),
        columnsCount: fs.columns.length,
        hasGrades: studentCountWithGrade > 0
      };
    });
  }, [importFileSubjects, importPreview]);

  const handleImportSubmit = async () => {
    if (isEntryRestricted) {
      setShowImportModal(false);
      setShowPermissionModal(true);
      toast.error("L'importation des notes est actuellement verrouillée par l'administration. Veuillez soumettre une demande de permission.");
      return;
    }
    const validData = importPreview.filter(p => p.exists && p.hasNotes);

    if (validData.length === 0) {
      toast.error("Aucune note valide à importer. Veuillez vous assurer que les élèves existent et ont des notes dans des matières assignées à la classe.");
      return;
    }

    const warningCount = importPreview.filter(p => p.exists && !p.nameMatches).length;
    if (warningCount > 0) {
      if (!await confirm({
        title: "Avertissement d'importation",
        message: `${warningCount} élèves ont des noms qui diffèrent légèrement de la base. Voulez-vous poursuivre ?`,
        confirmText: "Poursuivre",
        variant: "warning"
      })) {
        return;
      }
    }

    setIsImporting(true);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const enseignant_id = user.enseignant_id;

    try {
      const bulkData = validData.map(p => ({
        eleve_id: p.studentId,
        notes: p.notes.map((n: any) => {
          let noteType = n.type;
          if (n.type === 'NoteObtenue' || n.type === 'NotePerfectionnement') {
            noteType = `${importEval || 'Dev1'}_${n.type}`;
          }
          return {
            matiere_id: n.matiere_id,
            type: noteType,
            note: Math.round(n.note * 100) / 100
          };
        })
      }));

      const response = await apiFetch('/api/notes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: bulkData,
          trimestre: importTrimestre,
          date_evaluation: importDate,
          enseignant_id 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'importation");
      }
      
      setShowImportModal(false);
      setSelectedTrimestre(importTrimestre);

      if (selectedClasse) {
        const [notesRes, detailsRes] = await Promise.all([
          apiFetch(`/api/notes/${selectedClasse}`).then(res => res.json()),
          apiFetch(`/api/classes/${selectedClasse}/details`).then(res => res.json())
        ]);
        if (Array.isArray(notesRes)) setNotes(notesRes);
        if (detailsRes && detailsRes.eleves) setClasseDetails(detailsRes);
      }

      toast.success(`${bulkData.length} élèves importés avec succès ! La grille a été actualisée.`);

      // Open Publication prompt as requested by user
      const isPrim = isPrimary(classeDetails);
      const evalVal = isPrim ? (importEval || selectedGridEval || 'EvalSommative1') : (importTrimestre?.toString() || '1');
      const evalLbl = isPrim 
        ? (evalVal.replace('EvalSommative', 'Évaluation Sommative ').replace('EvalFormative', 'Évaluation Formative'))
        : `Trimestre ${importTrimestre || 1}`;

      setPostImportDetails({
        isPrimary: isPrim,
        cycle: isPrim ? 'primaire' : 'secondaire',
        classeId: selectedClasse,
        classeNom: classeDetails?.nom || 'Classe',
        typePeriode: isPrim ? 'evaluation' : 'trimestre',
        valeurPeriode: evalVal,
        periodeLabel: evalLbl,
        count: bulkData.length
      });
      setShowPostImportPublishModal(true);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Une erreur est survenue lors de l'importation.");
    } finally {
      setIsImporting(false);
    }
  };

  const filteredClasses = React.useMemo(() => {
    return classes.filter((c: any) => {
      const niveau = (c.niveau || '').toLowerCase();
      if (cycle === 'primaire') {
        return ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2"].some(lvl => niveau.includes(lvl));
      }
      if (cycle === 'secondaire') {
        return ["secondaire", "premier cycle", "second cycle", "technique", "6ème", "5ème", "4ème", "3ème", "2nd", "1ère", "tle"].some(lvl => niveau.includes(lvl));
      }
      return true;
    });
  }, [classes, cycle]);

  return (
    <div className="space-y-6">
      {/* Lock status banner for teachers */}
      {user?.role === 'enseignant' && isNotesLocked && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-4 rounded-2xl border flex items-center gap-4 ${hasApprovedPermission ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm'}`}
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${hasApprovedPermission ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            {hasApprovedPermission ? <Unlock size={24} /> : <Lock size={24} />}
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              {hasApprovedPermission ? "Permission de régularisation accordée" : "Saisie des notes verrouillée"}
              {!hasApprovedPermission && <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded-lg text-[10px] font-black uppercase tracking-tighter">Action Requise</span>}
            </h3>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">
              {hasApprovedPermission 
                ? "L'administration a approuvé votre demande. Vous pouvez saisir les notes pour les classes et matières autorisées."
                : "La saisie est actuellement bloquée par l'administration. Si vous avez des notes à régulariser, veuillez soumettre une demande de permission via le bouton en haut à droite."
              }
            </p>
          </div>
          {!hasApprovedPermission && (
            <button
              onClick={() => setShowPermissionModal(true)}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-rose-700 transition"
            >
              Demander Permission
            </button>
          )}
        </motion.div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {cycle === 'primaire' ? 'Évaluations & Notes (Primaire & Maternelle)' : cycle === 'secondaire' ? 'Notes & Bulletins (Secondaire)' : 'Notes & Bulletins'}
          </h1>
          <p className="text-slate-500">
            {cycle === 'primaire' ? 'Saisie des Évaluations Formatives et Sommatives du primaire.' : 'Saisie des notes, devoirs, compositions et bulletins.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user?.role === 'enseignant' && (
            <Link
              to="/emploi-du-temps-requests?tab=notes"
              onClick={() => {
                if (getUnreadCountForPath('/emploi-du-temps-requests') > 0) {
                  markPathNotificationsAsRead('/emploi-du-temps-requests');
                }
              }}
              className="bg-amber-50 text-amber-800 border border-amber-300 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors text-sm shadow-2xs relative"
            >
              <Send size={18} className="text-amber-600" />
              <span>Demande de modification de notes</span>
              {getUnreadCountForPath('/emploi-du-temps-requests') > 0 && (
                <span 
                  title={`${getUnreadCountForPath('/emploi-du-temps-requests')} notification(s) non lue(s)`}
                  className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse"
                >
                  {getUnreadCountForPath('/emploi-du-temps-requests')} nouv.
                </span>
              )}
            </Link>
          )}

          {/* Admin Lock / Unlock Toggle Button */}
          {canManageLock && (
            <button
              onClick={handleToggleNotesLock}
              disabled={isTogglingLock}
              className={`px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm shadow-sm ${
                isNotesLocked
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
              }`}
              title={isNotesLocked ? "Cliquer pour déverrouiller l'insertion des notes pour les enseignants" : "Cliquer pour verrouiller l'insertion des notes pour les enseignants"}
            >
              {isTogglingLock ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isNotesLocked ? (
                <Lock size={18} className="text-white" />
              ) : (
                <Unlock size={18} className="text-emerald-700" />
              )}
              <span>{isNotesLocked ? "Notes Verrouillées (Déverrouiller)" : "Notes Déverrouillées (Verrouiller)"}</span>
            </button>
          )}

          {canWrite && (
            <>
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />
              {user?.role !== 'enseignant' && (
                <button 
                  onClick={() => setShowBulletinHeaderModal(true)}
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-2xs"
                  title="Personnaliser l'en-tête officiel des bulletins de notes (armoiries, ministères, contacts, signatures)"
                >
                  <Sliders size={18} className="text-emerald-600" />
                  <span>En-tête des Bulletins</span>
                </button>
              )}
              <button 
                onClick={() => {
                  if (isEntryRestricted) {
                    setShowPermissionModal(true);
                    toast.error("L'importation des notes est verrouillée par l'administration. Vous devez demander une permission.");
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                className={`border px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                  isEntryRestricted 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isEntryRestricted ? "Importation verrouillée par l'administration" : "Importer un fichier Excel"}
              >
                {isEntryRestricted ? <Lock size={16} className="text-slate-400" /> : <Upload size={20} className="text-indigo-600" />}
                Importer Excel
              </button>
              <button 
                onClick={() => {
                  if (isEntryRestricted) {
                    setShowPermissionModal(true);
                    toast.error("La saisie des notes est verrouillée par l'administration. Vous devez demander une permission.");
                    return;
                  }
                  openRapidEntry();
                }}
                className={`border px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                  isEntryRestricted 
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={isEntryRestricted ? "Saisie verrouillée par l'administration" : "Saisie Rapide"}
              >
                {isEntryRestricted ? <Lock size={16} className="text-slate-400" /> : <ClipboardList size={20} className="text-primary-600" />}
                Saisie Rapide
              </button>
              <button 
                onClick={() => {
                  if (isEntryRestricted) {
                    setShowPermissionModal(true);
                    toast.error("La saisie des notes est verrouillée par l'administration. Vous devez demander une permission.");
                    return;
                  }
                  setShowModal(true);
                }}
                className={`px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                  isEntryRestricted 
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                }`}
                title={isEntryRestricted ? "Saisie verrouillée par l'administration" : "Saisir une note"}
              >
                {isEntryRestricted ? <Lock size={16} /> : <Plus size={20} />}
                Saisir une note
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notes Lock Status Banners */}
      {isNotesLocked && user?.role === 'enseignant' && !hasApprovedPermission && (
        <div className="bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
              <Lock size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Insertion des notes actuellement verrouillée</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wide">
                  Verrouillé
                </span>
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                L'administration de l'établissement a verrouillé la saisie manuelle et l'importation Excel des notes. Vous ne pouvez pas insérer ni modifier de notes sans autorisation préalable.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPermissionModal(true)}
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all whitespace-nowrap self-stretch sm:self-auto justify-center"
          >
            <Send size={15} />
            <span>Demander une permission</span>
          </button>
        </div>
      )}

      {isNotesLocked && user?.role === 'enseignant' && hasApprovedPermission && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm text-emerald-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <span>Permission spéciale accordée</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-200 text-emerald-900 uppercase">
                  Autorisé
                </span>
              </h3>
              <p className="text-xs text-emerald-700 mt-0.5">
                Votre demande de permission a été validée par l'administration. Vous êtes autorisé(e) à saisir et importer des notes.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPermissionModal(true)}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline whitespace-nowrap"
          >
            Nouvelle demande
          </button>
        </div>
      )}

      {isNotesLocked && user?.role !== 'enseignant' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 text-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                Verrouillage actif : Les enseignants ne peuvent pas saisir ou importer de notes sans autorisation.
              </p>
              <p className="text-[11px] text-slate-500">
                Vous pouvez déverrouiller la saisie à tout moment avec le bouton ci-dessus.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleNotesLock}
            disabled={isTogglingLock}
            className="text-xs bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 px-3 py-1.5 rounded-lg font-bold"
          >
            Déverrouiller
          </button>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Filtrer par classe</label>
            <select 
              value={selectedClasse}
              onChange={e => setSelectedClasse(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 font-medium"
            >
              <option value="">Sélectionner une classe</option>
              {filteredClasses.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <button 
              onClick={() => setShowBulletinHeaderModal(true)}
              className="w-full md:w-auto px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 shadow-2xs"
              title="Personnaliser l'en-tête officiel des bulletins"
            >
              <Sliders size={18} />
              <span>En-tête Bulletins</span>
            </button>
            {selectedClasse && isPrimary(classes.find((c: any) => c.id === parseInt(selectedClasse))) && (
              <button 
                onClick={() => setShowConfigEvalModal(true)}
                className="w-full md:w-auto px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-100 transition-colors flex items-center justify-center gap-2 shadow-2xs"
              >
                <Sliders size={18} />
                Choix des Évaluations
              </button>
            )}
            <button 
              onClick={downloadTemplate}
              className="w-full md:w-auto px-6 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={18} />
              Template Import
            </button>
            <button 
              onClick={() => setShowPublicationsCenterModal(true)}
              className="w-full md:w-auto px-5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors flex items-center justify-center gap-2 shadow-2xs"
              title="Gérer la publication des résultats et l'accès aux bulletins pour les parents"
            >
              <Globe size={18} />
              <span>Publication Résultats</span>
            </button>
            <button 
              onClick={() => {
                if (selectedTrimestre) downloadNotesExcel(selectedTrimestre);
                else downloadNotesExcel(1);
              }}
              className="w-full md:w-auto px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Exporter Notes (Excel)
            </button>
          </div>
        </div>

        {filteredClasses.filter((c: any) => isPrimary(c)).length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mr-1">Choix des Évaluations par classe :</span>
            {filteredClasses.filter((c: any) => isPrimary(c)).map((c: any) => (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClasse(c.id.toString());
                  setShowConfigEvalModal(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  selectedClasse === c.id.toString() 
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-800 hover:border-amber-200'
                }`}
              >
                <Sliders size={13} />
                <span>{formatClassName(c.nom)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedClasse ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((t) => {
              const trimPub = publications.find(p => 
                p.type_periode === 'trimestre' && 
                p.periode_valeur === t.toString() && 
                (p.classe_id === parseInt(selectedClasse) || !p.classe_id)
              );
              const isPub = trimPub?.est_publie === 1;
              const isDl = trimPub?.bulletin_telechargeable === 1;

              return (
                <div key={t} className="relative group">
                  <button
                    onClick={() => openGrid(t)}
                    className="w-full bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all text-left relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        {isLoadingGrid && selectedTrimestre === t ? (
                          <Loader2 size={24} className="animate-spin" />
                        ) : (
                          <ClipboardList size={24} />
                        )}
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                        isPub ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isPub ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {isPub ? 'Résultats Publiés' : 'Non publié'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">Trimestre {t}</h3>
                    <p className="text-slate-500 text-sm mt-1">Voir la grille des notes</p>
                    {isPub && (
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Bulletin parent :</span>
                        <span className={`font-bold flex items-center gap-1 ${isDl ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {isDl ? <Unlock size={12} /> : <Lock size={12} />}
                          {isDl ? 'Téléchargeable' : 'Verrouillé'}
                        </span>
                      </div>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadNotesExcel(t);
                    }}
                    className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-primary-600 hover:text-white text-slate-400 rounded-xl transition-all shadow-sm z-10"
                    title="Télécharger toutes les notes en Excel"
                  >
                    <Download size={18} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h2 className="text-lg font-bold text-slate-900">Dernières notes saisies</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 font-medium">Élève</th>
                  <th className="px-6 py-3 font-medium">Matière</th>
                  <th className="px-6 py-3 font-medium">Trim.</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Note</th>
                  <th className="px-6 py-3 font-medium">Date</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groupedRecentNotes.map((item) => {
                  const hasDualNotes = item.noteObtenue !== undefined || item.notePerfectionnement !== undefined;
                  const totalVal = hasDualNotes 
                    ? Math.min(20, (item.noteObtenue || 0) + (item.notePerfectionnement || 0))
                    : (item.singleNote || 0);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                            {(item.nom[0] || '')}{(item.prenom[0] || '')}
                          </div>
                          <span className="text-sm font-medium text-slate-700">{item.nom} {item.prenom}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-800">{item.matiere_nom}</td>
                      <td className="px-6 py-4 text-sm text-slate-600 font-medium">T{item.trimestre}</td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider border border-blue-100">
                          {item.evalBase}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {hasDualNotes ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <span>Obtenue: <strong className="text-slate-900">{item.noteObtenue !== undefined ? item.noteObtenue : '-'} / 20</strong></span>
                              <span className="text-slate-300">•</span>
                              <span>Perf.: <strong className="text-emerald-700">{item.notePerfectionnement !== undefined ? item.notePerfectionnement : '-'} / 2</strong></span>
                            </div>
                            <div className="text-xs font-extrabold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-lg inline-block">
                              Total: {totalVal.toFixed(2)} / 20
                            </div>
                          </div>
                        ) : (
                          <span className={`text-sm font-bold ${totalVal >= 10 ? 'text-primary-600' : 'text-red-600'}`}>
                            {totalVal.toFixed(2)} / 20
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{item.date_evaluation || '-'}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            const studentObj = { id: item.eleve_id, nom: item.nom, prenom: item.prenom };
                            handleGenerateBulletinClick(studentObj, false, item.evalBase);
                          }}
                          className="text-primary-600 hover:text-primary-700 p-1.5 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Télécharger le bulletin de cet élève"
                        >
                          <Download size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {groupedRecentNotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                      Aucune note enregistrée pour cette classe.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <ClipboardList size={64} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400">Veuillez sélectionner une classe pour voir les notes.</p>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Importation des Notes</h2>
              <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Feuille Excel (Source)</label>
                  <select
                    value={selectedImportSheet}
                    onChange={(e) => setSelectedImportSheet(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                  >
                    {Object.keys(importSheets).map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Trimestre cible</label>
                  <select 
                    value={importTrimestre}
                    onChange={e => setImportTrimestre(parseInt(e.target.value))}
                    className="w-full bg-white border border-slate-200 rounded-lg text-sm px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-500 font-bold"
                  >
                    <option value={1}>Trimestre 1</option>
                    <option value={2}>Trimestre 2</option>
                    <option value={3}>Trimestre 3</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase block">Date d'évaluation</label>
                  <input 
                    type="date"
                    value={importDate}
                    onChange={e => setImportDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                  />
                </div>
              </div>

              {importPreview.some(p => p.errorMessage) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-tight">Certaines notes sont hors plage (0-20)</p>
                    <p className="opacity-90">Ces valeurs ont été automatiquement ignorées pour permettre l'importation du reste du fichier.</p>
                  </div>
                </div>
              )}

              {/* Statistiques d'aperçu : Élèves notés / Effectif de la classe et Matières saisies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Nombre d'élèves dont les notes sont remplies sur l'effectif de la classe */}
                <div className="p-3.5 bg-gradient-to-br from-primary-50 to-indigo-50/40 border border-primary-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-primary-800 uppercase tracking-wider">Élèves notés / Effectif</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xl font-black text-slate-900">{studentsWithNotesCount}</span>
                        <span className="text-xs font-bold text-slate-500">/ {targetClassTotalCount} élève(s)</span>
                        {targetClassName && (
                          <span className="text-[10px] font-bold text-primary-700 bg-white px-1.5 py-0.5 rounded border border-primary-200">
                            {targetClassName}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {studentsWithNotesCount} élève(s) avec notes saisies sur {targetClassTotalCount} dans la classe
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white border border-primary-200 text-primary-800 shadow-2xs">
                      {targetClassTotalCount > 0 ? Math.round((studentsWithNotesCount / targetClassTotalCount) * 100) : 0}%
                    </span>
                  </div>
                </div>

                {/* Matières renseignées */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Matières avec notes</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-black text-slate-900">
                          {subjectsWithEnteredGrades.filter(s => s.hasGrades).length}
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          / {importFileSubjects.length} matière(s) détectée(s)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {subjectsWithEnteredGrades.filter(s => s.hasGrades && s.isAssigned).length} matière(s) assignée(s) avec notes
                      </p>
                    </div>
                  </div>
                </div>

                {/* Total lignes détectées dans le fichier Excel */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lignes fichier Excel</p>
                      <div className="flex items-baseline gap-1.5 mt-0.5">
                        <span className="text-xl font-black text-slate-900">{importPreview.length}</span>
                        <span className="text-xs font-bold text-slate-500">ligne(s)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {studentsWithoutNotesCount > 0 ? `${studentsWithoutNotesCount} sans note dans ce fichier` : 'Toutes les lignes ont au moins une note'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Affichage détaillé des matières dont les notes sont saisies */}
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen size={16} className="text-primary-600" />
                    <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                      Matières dont les notes sont saisies ({subjectsWithEnteredGrades.filter(s => s.hasGrades).length})
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {subjectsWithEnteredGrades.filter(s => s.hasGrades).length > 0 
                      ? `${subjectsWithEnteredGrades.filter(s => s.hasGrades).length} matière(s) avec notes prêtes`
                      : "Aucune note saisie détectée dans ce fichier"
                    }
                  </span>
                </div>

                {subjectsWithEnteredGrades.filter(s => s.hasGrades).length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {subjectsWithEnteredGrades.filter(s => s.hasGrades).map((s, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs transition-shadow ${
                          s.isAssigned 
                            ? 'bg-white border-slate-200 text-slate-900 shadow-2xs' 
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${s.isAssigned ? 'bg-primary-600' : 'bg-amber-500'}`} />
                        <span className="font-bold">{s.displayName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-extrabold">
                          {s.studentCountWithGrade} / {targetClassTotalCount} élève(s)
                        </span>
                        {s.evalTypes.length > 0 && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            ({s.evalTypes.join(', ')})
                          </span>
                        )}
                        {!s.isAssigned ? (
                          <span className="text-[10px] bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-bold uppercase tracking-tight">
                            Non assignée
                          </span>
                        ) : (
                          <CheckCircle2 size={13} className="text-emerald-600" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-dashed border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                    Aucune matière ne contient de notes saisies dans ce fichier Excel.
                  </div>
                )}

                {subjectsWithEnteredGrades.some(s => !s.hasGrades) && (
                  <div className="pt-2 border-t border-slate-200/70 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-600">Matières sans notes dans le fichier (0 note) :</span>
                    {subjectsWithEnteredGrades.filter(s => !s.hasGrades).map((s, idx) => (
                      <span key={idx} className="bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[10px]">
                        {s.displayName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-primary-600" />
                    <span>Aperçu de la structure du fichier Excel</span>
                  </div>
                  <span className="text-xs font-bold text-slate-700">
                    {studentsWithNotesCount} / {targetClassTotalCount} élève(s) avec notes renseignées ({importPreview.length} élèves dans Excel)
                  </span>
                </h3>

                {importFileSubjects.some(fs => !fs.isAssigned) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                      <p className="font-bold">Matières du fichier non assignées à cette classe</p>
                      <p className="opacity-90">
                        Le fichier contient des matières non assignées à la classe sélectionnée : <span className="font-extrabold">{importFileSubjects.filter(fs => !fs.isAssigned).map(fs => fs.displayName).join(', ')}</span>. Leurs colonnes sont affichées dans l'aperçu pour refléter fidèlement le fichier, mais ne seront pas enregistrées.
                      </p>
                    </div>
                  </div>
                )}

                {(() => {
                  if (importFileSubjects.length === 0) {
                    return (
                      <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-500 text-sm">
                        Aucune colonne de notes détectée dans cette feuille.
                      </div>
                    );
                  }

                  return (
                    <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[50vh] shadow-inner">
                      <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-bold border-b border-slate-200">
                          <tr>
                            <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center bg-slate-100">Statut</th>
                            <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center font-mono bg-slate-100">Matricule</th>
                            <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-left bg-slate-100 min-w-[160px]">Nom & Prénom (Excel)</th>
                            <th rowSpan={2} className="px-3 py-2 border-r border-slate-200 text-center bg-slate-100">Classe</th>
                            {importFileSubjects.map((fs: any, idx: number) => {
                              const fsStat = subjectsWithEnteredGrades.find(s => s.subjectName === fs.subjectName || s.displayName === fs.displayName);
                              return (
                                <th 
                                  key={idx} 
                                  colSpan={fs.columns.length} 
                                  className={`px-3 py-2 border-r border-slate-200 text-center font-extrabold ${
                                    fs.isAssigned ? 'bg-slate-200 text-slate-900' : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <span>{fs.displayName}</span>
                                    {fsStat && (
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                        fsStat.hasGrades ? 'bg-primary-100 text-primary-900' : 'bg-slate-300/80 text-slate-600'
                                      }`}>
                                        {fsStat.studentCountWithGrade}/{targetClassTotalCount} noté(s)
                                      </span>
                                    )}
                                    {!fs.isAssigned && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold uppercase tracking-tight">
                                        Non assignée
                                      </span>
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                          <tr className="border-t border-slate-200">
                            {importFileSubjects.map((fs: any, fsIdx: number) => (
                              fs.columns.map((col: any, cIdx: number) => (
                                <th 
                                  key={`sub_${fsIdx}_${cIdx}`} 
                                  className={`px-2 py-1.5 border-r border-slate-200 text-center text-[10px] font-bold ${
                                    !fs.isAssigned ? 'bg-amber-50 text-amber-700' :
                                    col.evalType === 'MI' ? 'bg-indigo-50 text-indigo-700' : 
                                    col.evalType === 'NotePerfectionnement' ? 'bg-emerald-50 text-emerald-800' : 
                                    'bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  {col.subLabel}
                                </th>
                              ))
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {importPreview.map((p, idx) => (
                            <tr key={idx} className={p.status === 'error' ? 'bg-red-50/80' : (p.status === 'warning' ? 'bg-amber-50/80' : 'hover:bg-slate-50')}>
                              <td className="px-3 py-2 border-r border-slate-200 text-center">
                                {p.status === 'success' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mx-auto" title="Prêt" />}
                                {p.status === 'warning' && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mx-auto" title="Nom différent de la base" />}
                                {p.status === 'error' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 mx-auto" title="Élève inconnu" />}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-200 font-mono text-center text-slate-700 font-medium">{p.matricule || '-'}</td>
                              <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-900">
                                {p.nom} {p.prenom}
                                {p.status === 'warning' && (
                                  <p className="text-[10px] text-amber-700 font-normal mt-0.5 italic">
                                    (Système: {eleves.find(e => e.id === p.studentId)?.nom} {eleves.find(e => e.id === p.studentId)?.prenom})
                                  </p>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-600 font-medium">{p.classe || '-'}</td>
                              {importFileSubjects.map((fs: any, fsIdx: number) => (
                                fs.columns.map((col: any, cIdx: number) => {
                                  const cell = p.parsedCells?.[col.key];
                                  const isErr = cell?.error;
                                  const display = cell?.display || '-';
                                  return (
                                    <td 
                                      key={`cell_${fsIdx}_${cIdx}`} 
                                      className={`px-2 py-1.5 border-r border-slate-200 text-center font-bold ${
                                        isErr ? 'text-red-600 bg-red-100/50' : 
                                        !fs.isAssigned ? 'text-slate-400 bg-slate-50 line-through' :
                                        'text-slate-800'
                                      }`}
                                    >
                                      {display}
                                    </td>
                                  );
                                })
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
                  <Users size={14} className="text-primary-600" />
                  <span>{studentsWithNotesCount} / {targetClassTotalCount} élèves notés</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>{importPreview.filter(p => p.status === 'success').length} OK</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>{importPreview.filter(p => p.status === 'warning').length} Alertes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>{importPreview.filter(p => p.status === 'error').length} Erreurs</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleImportSubmit}
                  disabled={isImporting || importPreview.filter(p => p.exists && p.hasNotes).length === 0}
                  className="px-8 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
                >
                  {isImporting ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                  Lancer l'importation ({importPreview.filter(p => p.exists && p.hasNotes).length} élèves)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Saisie de Notes</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select 
                    required
                    value={modalFormData.classe_id}
                    onChange={e => setModalFormData({...modalFormData, classe_id: e.target.value, eleve_id: ''})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="">Sélectionner une classe</option>
                    {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Trimestre</label>
                  <select 
                    value={modalFormData.trimestre || 1}
                    onChange={e => setModalFormData({...modalFormData, trimestre: parseInt(e.target.value) || 1})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value={1}>Trimestre 1</option>
                    <option value={2}>Trimestre 2</option>
                    <option value={3}>Trimestre 3</option>
                  </select>
                </div>
                {modalFormData.classe_id && isPrimary(classes.find((c: any) => c.id === parseInt(modalFormData.classe_id))) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Évaluation</label>
                    <select 
                      required
                      value={modalFormData.type_evaluation || ''}
                      onChange={e => setModalFormData({...modalFormData, type_evaluation: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                    >
                      <option value="">Sélectionner une évaluation</option>
                      {(classEvalConfig[modalFormData.trimestre || 1] || []).map((evalId: string) => {
                        const baseOpts = [
                          { id: 'EvalFormative', label: 'Évaluation Formative' },
                          { id: 'EvalSommative1', label: 'Évaluation Sommative 1' },
                          { id: 'EvalSommative2', label: 'Évaluation Sommative 2' },
                          { id: 'EvalSommative3', label: 'Évaluation Sommative 3' },
                          { id: 'EvalSommative4', label: 'Évaluation Sommative 4' },
                          { id: 'EvalSommative5', label: 'Évaluation Sommative 5' },
                          { id: 'I1', label: 'Interrogation 1 (I1)' },
                          { id: 'I2', label: 'Interrogation 2 (I2)' },
                          { id: 'Dev1', label: 'Devoir 1 (Dev1)' },
                          { id: 'Dev2', label: 'Devoir 2 (Dev2)' },
                          { id: 'Composition', label: 'Composition' }
                        ];
                        const evalObj = [...baseOpts, ...customEvals].find(o => o.id === evalId);
                        return <option key={evalId} value={evalId}>{evalObj ? evalObj.label : evalId}</option>;
                      })}
                    </select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Matière</label>
                  <div className="relative">
                    <select 
                      required
                      disabled={!modalFormData.classe_id || isLoadingClassMatieres}
                      value={modalFormData.matiere_id}
                      onChange={e => setModalFormData({...modalFormData, matiere_id: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 font-medium"
                    >
                      <option value="">Sélectionner une matière</option>
                      {classMatieres.map((m: any) => (
                        <option key={m.matiere_id} value={m.matiere_id}>{m.matiere_nom}</option>
                      ))}
                    </select>
                    {isLoadingClassMatieres && (
                      <div className="absolute right-8 top-1/2 -translate-y-1/2">
                        <Loader2 size={16} className="animate-spin text-primary-600" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Élève</label>
                  <select 
                    required
                    disabled={!modalFormData.classe_id}
                    value={modalFormData.eleve_id}
                    onChange={e => setModalFormData({...modalFormData, eleve_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 font-medium"
                  >
                    <option value="">Sélectionner un élève</option>
                    {eleves
                      .filter((e: any) => e.classe_id === parseInt(modalFormData.classe_id))
                      .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                      .map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                  </select>
                </div>
              </div>

              {modalFormData.matiere_id && (() => {
                const modalClasseObj = classes.find((c: any) => c.id === parseInt(modalFormData.classe_id));
                const isModalPrimary = isPrimary(modalClasseObj);
                const currentMatiere = classMatieres.find((m: any) => m.matiere_id?.toString() === modalFormData.matiere_id?.toString());
                const isDisciplinaire = currentMatiere?.est_disciplinaire;
                const obtVal = parseFloat(notesInputs.NoteObtenue || '0') || 0;
                const perfVal = parseFloat(notesInputs.NotePerfectionnement || '0') || 0;
                const totalSum = obtVal + perfVal;
                const isInvalidPrimary = isModalPrimary && (totalSum > 20 || obtVal > 20 || perfVal > 2);

                if (isDisciplinaire) {
                  const tMap: any = { 1: 'plafond_conduite_t1', 2: 'plafond_conduite_t2', 3: 'plafond_conduite_t3' };
                  const plafond = modalClasseObj?.[tMap[selectedTrimestre]] ?? modalClasseObj?.plafond_conduite ?? 20;
                  const minusVal = notesInputs.MinusValue || '0';
                  const plusVal = notesInputs.PlusValue || '0';
                  const calculatedNote = Math.min(20, Math.max(0, plafond - (parseFloat(minusVal) || 0) + (parseFloat(plusVal) || 0)));

                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Note Disciplinaire ({currentMatiere?.matiere_nom || 'Conduite'})</h3>
                        {isLoadingExisting && <Loader2 size={16} className="animate-spin text-primary-600" />}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Plafond (T{selectedTrimestre})</label>
                          <div className="text-xl font-black text-slate-900">{plafond} / 20</div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Moins (Malus)</label>
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={plafond}
                            value={notesInputs.MinusValue || ''}
                            onChange={e => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              const currentPlus = parseFloat(notesInputs.PlusValue) || 0;
                              const final = Math.min(20, Math.max(0, plafond - num + currentPlus));
                              setNotesInputs({
                                ...notesInputs, 
                                MinusValue: val,
                                NoteDisciplinaire: final.toString()
                              });
                            }}
                            placeholder="Ex: 2"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Plus (Bonus)</label>
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            value={notesInputs.PlusValue || ''}
                            onChange={e => {
                              const val = e.target.value;
                              const num = parseFloat(val) || 0;
                              const currentMinus = parseFloat(notesInputs.MinusValue) || 0;
                              const final = Math.min(20, Math.max(0, plafond - currentMinus + num));
                              setNotesInputs({
                                ...notesInputs, 
                                PlusValue: val,
                                NoteDisciplinaire: final.toString()
                              });
                            }}
                            placeholder="Ex: 1"
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border bg-amber-50 border-amber-100 text-amber-900">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider">Note Finale Calculée</span>
                          <span className="text-2xl font-black">{calculatedNote.toFixed(2)} / 20</span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            type="number"
                            step="0.25"
                            value={notesInputs.NoteDisciplinaire || ''}
                            onChange={e => setNotesInputs({...notesInputs, NoteDisciplinaire: e.target.value})}
                            className="w-24 px-2 py-1 bg-white border border-amber-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500"
                          />
                          <span className="text-[10px] text-amber-700 italic">Saisie manuelle possible ici</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (isModalPrimary) {
                  return (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Évaluation Primaire & Maternelle</h3>
                        {isLoadingExisting && <Loader2 size={16} className="animate-spin text-primary-600" />}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Note obtenue (00 à 20)</label>
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            value={notesInputs.NoteObtenue}
                            onChange={e => setNotesInputs({...notesInputs, NoteObtenue: e.target.value})}
                            placeholder="Ex: 15"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-900"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-700">Note de perfectionnement (00 à 02)</label>
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max="2"
                            value={notesInputs.NotePerfectionnement}
                            onChange={e => setNotesInputs({...notesInputs, NotePerfectionnement: e.target.value})}
                            placeholder="Ex: 1.5"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold text-slate-900"
                          />
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border ${isInvalidPrimary ? 'bg-red-50 border-red-200 text-red-700' : 'bg-primary-50 border-primary-100 text-primary-900'}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase">Note finale calculée</span>
                          <span className="text-lg font-black">{totalSum.toFixed(2)} / 20</span>
                        </div>
                        {isInvalidPrimary && (
                          <p className="text-xs mt-1 font-semibold text-red-600">
                            La somme de la note obtenue ({obtVal}) et de la note de perfectionnement ({perfVal}) ne peut pas dépasser 20/20.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Évaluations (Notes / 20)</h3>
                      {isLoadingExisting && <Loader2 size={16} className="animate-spin text-primary-600" />}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'].map((type) => (
                        <div key={type} className="space-y-1">
                          <label className="text-xs font-medium text-slate-500">{type}</label>
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max="20"
                            value={notesInputs[type]}
                            onChange={e => setNotesInputs({...notesInputs, [type]: e.target.value})}
                            placeholder="-"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={!modalFormData.eleve_id || !modalFormData.matiere_id || (isPrimary(classes.find((c: any) => c.id === parseInt(modalFormData.classe_id))) && (((parseFloat(notesInputs.NoteObtenue || '0') || 0) + (parseFloat(notesInputs.NotePerfectionnement || '0') || 0)) > 20 || (parseFloat(notesInputs.NoteObtenue || '0') > 20) || (parseFloat(notesInputs.NotePerfectionnement || '0') > 2)))}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Enregistrer tout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configuration of Evaluations Modal */}
      {showConfigEvalModal && selectedClasse && (() => {
        const selectedClassObj = classes.find((c: any) => c.id === parseInt(selectedClasse));
        const isPrim = isPrimary(selectedClassObj);
        
        const baseOptions = isPrim ? [
          { id: 'EvalFormative', label: 'Évaluation Formative' },
          { id: 'EvalSommative1', label: 'Évaluation Sommative 1' },
          { id: 'EvalSommative2', label: 'Évaluation Sommative 2' },
          { id: 'EvalSommative3', label: 'Évaluation Sommative 3' },
          { id: 'EvalSommative4', label: 'Évaluation Sommative 4' },
          { id: 'EvalSommative5', label: 'Évaluation Sommative 5' }
        ] : [
          { id: 'EvalFormative', label: 'Évaluation Formative' },
          { id: 'EvalSommative1', label: 'Évaluation Sommative 1' },
          { id: 'EvalSommative2', label: 'Évaluation Sommative 2' },
          { id: 'I1', label: 'Interrogation 1 (I1)' },
          { id: 'I2', label: 'Interrogation 2 (I2)' },
          { id: 'I3', label: 'Interrogation 3 (I3)' },
          { id: 'I4', label: 'Interrogation 4 (I4)' },
          { id: 'Dev1', label: 'Devoir 1 (Dev1)' },
          { id: 'Dev2', label: 'Devoir 2 (Dev2)' },
          { id: 'Composition', label: 'Composition' }
        ];

        const allEvalOptions = [...baseOptions, ...customEvals];

        const allCheckedIds = Array.from(new Set([
          ...(classEvalConfig[1] || []),
          ...(classEvalConfig[2] || []),
          ...(classEvalConfig[3] || [])
        ]));
        const checkedLabels = allCheckedIds.map(id => allEvalOptions.find(o => o.id === id)?.label || id);

        const handleAddCustomEval = (e: React.FormEvent) => {
          e.preventDefault();
          if (!newCustomEvalInput.trim()) return;
          const newId = `custom_${Date.now()}`;
          const newLabel = newCustomEvalInput.trim();
          const updatedCustom = [...customEvals, { id: newId, label: newLabel }];
          setCustomEvals(updatedCustom);
          
          // Auto-enable for all trimestres
          setClassEvalConfig({
            1: [...(classEvalConfig[1] || []), newId],
            2: [...(classEvalConfig[2] || []), newId],
            3: [...(classEvalConfig[3] || []), newId]
          });
          setNewCustomEvalInput('');
        };

        return (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-amber-100 flex flex-col max-h-[90vh]">
              <div className="p-6 border-b flex items-center justify-between bg-amber-50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Choix des Évaluations</h3>
                    <p className="text-xs text-amber-800 font-medium">{formatClassName(selectedClassObj?.nom || '')}</p>
                  </div>
                </div>
                <button onClick={() => setShowConfigEvalModal(false)} className="p-2 hover:bg-amber-100 rounded-full transition-colors text-amber-800">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Évaluation effectuée dans cette classe */}
                <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                      Évaluation effectuée dans cette classe ({checkedLabels.length})
                    </span>
                  </div>
                  {checkedLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {checkedLabels.map((lbl, idx) => (
                        <span key={idx} className="px-3 py-1 bg-white text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold shadow-2xs flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {lbl}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Aucune évaluation sélectionnée. Cochez les évaluations ci-dessous pour les ajouter.</p>
                  )}
                </div>

                <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                  <Info size={18} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>Cochez les évaluations qui seront prises en compte pour chaque trimestre. L'affichage des évaluations par trimestre dans l'application se fera en fonction de vos choix.</span>
                </div>

                {/* Custom Evaluation Adder */}
                <form onSubmit={handleAddCustomEval} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Créer une Évaluation Personnalisée</label>
                    <input 
                      type="text" 
                      value={newCustomEvalInput}
                      onChange={e => setNewCustomEvalInput(e.target.value)}
                      placeholder="Ex: Contrôle continu, TP Informatique, Test de lecture..."
                      className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs transition-colors shrink-0 flex items-center justify-center gap-2 mt-auto"
                  >
                    <Plus size={16} />
                    <span>Ajouter l'évaluation</span>
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[1, 2, 3].map((tri) => {
                    const activeForTri = classEvalConfig[tri] || [];
                    return (
                      <div key={tri} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="border-b pb-2 flex items-center justify-between">
                          <h4 className="font-extrabold text-slate-800 text-sm">Trimestre {tri}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                            {activeForTri.length} active(s)
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {allEvalOptions.map(opt => {
                            const checked = activeForTri.includes(opt.id);
                            return (
                              <label key={opt.id} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900 bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                                <input 
                                  type="checkbox"
                                  checked={checked}
                                  onChange={e => {
                                    const updated = e.target.checked 
                                      ? [...activeForTri, opt.id]
                                      : activeForTri.filter(id => id !== opt.id);
                                    setClassEvalConfig({ ...classEvalConfig, [tri]: updated });
                                  }}
                                  className="w-4 h-4 text-amber-500 rounded focus:ring-amber-400"
                                />
                                <span className="truncate">{opt.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-6 border-t bg-slate-50 flex justify-end gap-3 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowConfigEvalModal(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 text-xs transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    localStorage.setItem(`class_eval_config_${selectedClasse}`, JSON.stringify(classEvalConfig));
                    localStorage.setItem(`custom_evals_${selectedClasse}`, JSON.stringify(customEvals));
                    setShowConfigEvalModal(false);
                    toast.success("Configuration des évaluations enregistrée pour cette classe !");
                  }}
                  className="px-6 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 text-xs transition-colors shadow-md shadow-amber-200 flex items-center gap-2"
                >
                  <Save size={16} />
                  Enregistrer la configuration
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {/* Rapid Entry Modal */}
      {showRapidEntryModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-6xl rounded-3xl shadow-2xl my-4 overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Saisie Rapide des Notes</h2>
                <p className="text-sm text-slate-500">
                  Classe : {classes.find((c: any) => c.id === parseInt(selectedClasse))?.nom}
                  {selectedMatiereRapid && ` • Matière : ${(classeDetails?.matieres || matieres)?.find((m: any) => (m.matiere_id || m.id).toString() === selectedMatiereRapid)?.matiere_nom || ''}`}
                  {` • Trimestre ${selectedTrimestreRapid}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-100 flex items-center gap-2">
                  <Info size={14} />
                  <span>Astuce: Copiez-collez depuis Excel (Tabulation entre colonnes)</span>
                </div>
                <button onClick={() => setShowRapidEntryModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50/50 border-b grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Trimestre</label>
                <select 
                  value={selectedTrimestreRapid}
                  onChange={e => handleRapidSubjectOrTrimChange(selectedMatiereRapid, parseInt(e.target.value), selectedEvalRapid)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold"
                >
                  <option value={1}>Trimestre 1</option>
                  <option value={2}>Trimestre 2</option>
                  <option value={3}>Trimestre 3</option>
                </select>
              </div>
              {isPrimary(classes.find((c: any) => c.id === parseInt(selectedClasse)) || classeDetails) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase">Évaluation</label>
                  <select 
                    value={selectedEvalRapid}
                    onChange={e => handleRapidSubjectOrTrimChange(selectedMatiereRapid, selectedTrimestreRapid, e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold"
                  >
                    {(classEvalConfig[selectedTrimestreRapid || 1] || []).map((evalId: string) => {
                      const baseOpts = [
                        { id: 'EvalFormative', label: 'Évaluation Formative' },
                        { id: 'EvalSommative1', label: 'Évaluation Sommative 1' },
                        { id: 'EvalSommative2', label: 'Évaluation Sommative 2' },
                        { id: 'EvalSommative3', label: 'Évaluation Sommative 3' },
                        { id: 'EvalSommative4', label: 'Évaluation Sommative 4' },
                        { id: 'EvalSommative5', label: 'Évaluation Sommative 5' },
                        { id: 'I1', label: 'Interrogation 1 (I1)' },
                        { id: 'I2', label: 'Interrogation 2 (I2)' },
                        { id: 'Dev1', label: 'Devoir 1 (Dev1)' },
                        { id: 'Dev2', label: 'Devoir 2 (Dev2)' },
                        { id: 'Composition', label: 'Composition' }
                      ];
                      const evalObj = [...baseOpts, ...customEvals].find(o => o.id === evalId);
                      return <option key={evalId} value={evalId}>{evalObj ? evalObj.label : evalId}</option>;
                    })}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Matière</label>
                <select 
                  value={selectedMatiereRapid}
                  onChange={e => handleRapidSubjectOrTrimChange(e.target.value, selectedTrimestreRapid, selectedEvalRapid)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold"
                >
                  <option value="">Sélectionner une matière</option>
                  {(classeDetails?.matieres || matieres)?.map((m: any) => (
                    <option key={m.matiere_id || m.id} value={m.matiere_id || m.id}>{m.matiere_nom || m.nom}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 uppercase">Date d'évaluation</label>
                <input 
                  type="date"
                  value={rapidEntryDate}
                  onChange={e => setRapidEntryDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {(() => {
                const rapidClasseObj = classes.find((c: any) => c.id === parseInt(selectedClasse));
                const isRapidPrimary = isPrimary(rapidClasseObj || classeDetails);
                const currentMatiere = (classeDetails?.matieres || matieres)?.find((m: any) => (m.matiere_id || m.id).toString() === selectedMatiereRapid);
                const isDisciplinaire = currentMatiere?.est_disciplinaire;

                if (isDisciplinaire) {
                  const tMap: any = { 1: 'plafond_conduite_t1', 2: 'plafond_conduite_t2', 3: 'plafond_conduite_t3' };
                  const plafond = rapidClasseObj?.[tMap[selectedTrimestre]] ?? rapidClasseObj?.plafond_conduite ?? 20;

                  return (
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-slate-100">
                          <th className="border border-slate-200 p-3 text-left sticky left-0 bg-slate-100 z-20 min-w-[200px]">Élève</th>
                          <th className="border border-slate-200 p-3 text-center w-24">Plafond</th>
                          <th className="border border-slate-200 p-3 text-center w-24">Moins (-)</th>
                          <th className="border border-slate-200 p-3 text-center w-24">Plus (+)</th>
                          <th className="border border-slate-200 p-3 text-center min-w-[120px] bg-blue-50 text-blue-800">Note Finale</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rapidEntryData.map((student, sIdx) => {
                          const malus = parseFloat(student.notes.MinusValue) || 0;
                          const bonus = parseFloat(student.notes.PlusValue) || 0;
                          
                          // Only auto-calculate if there's a malus or bonus typed, otherwise show what's typed in Disciplinaire
                          const hasModifiers = student.notes.MinusValue !== undefined || student.notes.PlusValue !== undefined;
                          if (hasModifiers) {
                             const finalNote = Math.min(20, Math.max(0, plafond - malus + bonus));
                             if (student.notes.Disciplinaire !== finalNote.toString()) {
                               // This might cause a slight delay/re-render issue if we don't handle it in onChange, 
                               // but it's just visual. Actually, better to handle in onChange.
                             }
                          }
                          
                          return (
                          <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="border border-slate-200 p-3 font-medium sticky left-0 bg-white z-10">
                              {student.nom}
                            </td>
                            <td className="border border-slate-200 p-3 text-center font-bold text-slate-500 bg-slate-50">
                              {plafond}
                            </td>
                            <td className="border border-slate-200 p-1">
                              <input 
                                type="number"
                                step="0.25"
                                min="0"
                                value={student.notes.MinusValue || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  const currentPlus = parseFloat(student.notes.PlusValue) || 0;
                                  const final = Math.min(20, Math.max(0, plafond - (parseFloat(val) || 0) + currentPlus));
                                  setRapidEntryData(prev => {
                                    const newData = [...prev];
                                    newData[sIdx].notes['MinusValue'] = val;
                                    newData[sIdx].notes['Disciplinaire'] = final.toString();
                                    return newData;
                                  });
                                }}
                                placeholder="0"
                                className="w-full h-full p-2 text-center border-none outline-none focus:bg-primary-50 transition-colors"
                              />
                            </td>
                            <td className="border border-slate-200 p-1">
                              <input 
                                type="number"
                                step="0.25"
                                min="0"
                                value={student.notes.PlusValue || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  const currentMinus = parseFloat(student.notes.MinusValue) || 0;
                                  const final = Math.min(20, Math.max(0, plafond - currentMinus + (parseFloat(val) || 0)));
                                  setRapidEntryData(prev => {
                                    const newData = [...prev];
                                    newData[sIdx].notes['PlusValue'] = val;
                                    newData[sIdx].notes['Disciplinaire'] = final.toString();
                                    return newData;
                                  });
                                }}
                                placeholder="0"
                                className="w-full h-full p-2 text-center border-none outline-none focus:bg-primary-50 transition-colors"
                              />
                            </td>
                            <td className="border border-slate-200 p-1 bg-blue-50/50">
                              <input 
                                type="text"
                                value={student.notes.Disciplinaire}
                                onChange={e => handleRapidNoteChange(sIdx, 'Disciplinaire', e.target.value, 20)}
                                onPaste={(e) => handlePasteGrades(e, sIdx, 'Disciplinaire')}
                                placeholder="0 - 20"
                                className="w-full h-full p-2 text-center border-none outline-none focus:bg-blue-100 font-bold text-blue-900 bg-transparent transition-colors"
                              />
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  );
                }

                if (isRapidPrimary) {
                  return (
                    <table className="w-full border-collapse text-sm">
                      <thead className="sticky top-0 bg-white z-10">
                        <tr className="bg-slate-100">
                          <th className="border border-slate-200 p-3 text-left sticky left-0 bg-slate-100 z-20 min-w-[200px]">Élève</th>
                          <th className="border border-slate-200 p-3 text-center min-w-[150px]">Note obtenue (00 à 20)</th>
                          <th className="border border-slate-200 p-3 text-center min-w-[170px]">Note perfectionnement (00 à 02)</th>
                          <th className="border border-slate-200 p-3 text-center min-w-[130px] bg-primary-50 font-bold text-primary-700">Note Finale (/20)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rapidEntryData.map((student, sIdx) => {
                          const obtVal = parseFloat(student.notes.NoteObtenue || '0') || 0;
                          const perfVal = parseFloat(student.notes.NotePerfectionnement || '0') || 0;
                          const sumVal = Math.min(20, obtVal + perfVal);
                          const isError = (obtVal + perfVal) > 20 || obtVal > 20 || perfVal > 2;

                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                              <td className="border border-slate-200 p-3 font-medium sticky left-0 bg-white z-10">
                                {student.nom}
                              </td>
                              <td className="border border-slate-200 p-1">
                                <input 
                                  type="text"
                                  value={student.notes.NoteObtenue}
                                  onChange={e => handleRapidNoteChange(sIdx, 'NoteObtenue', e.target.value, 20)}
                                  onPaste={(e) => handlePasteGrades(e, sIdx, 'NoteObtenue')}
                                  placeholder="0 - 20"
                                  className="w-full h-full p-2 text-center border-none outline-none focus:bg-primary-50 font-medium transition-colors"
                                />
                              </td>
                              <td className="border border-slate-200 p-1">
                                <input 
                                  type="text"
                                  value={student.notes.NotePerfectionnement}
                                  onChange={e => handleRapidNoteChange(sIdx, 'NotePerfectionnement', e.target.value, 2)}
                                  onPaste={(e) => handlePasteGrades(e, sIdx, 'NotePerfectionnement')}
                                  placeholder="0 - 02"
                                  className="w-full h-full p-2 text-center border-none outline-none focus:bg-primary-50 font-medium transition-colors"
                                />
                              </td>
                              <td className={`border border-slate-200 p-3 text-center font-black ${isError ? 'bg-red-100 text-red-700' : 'bg-primary-50 text-primary-700'}`}>
                                {(student.notes.NoteObtenue || student.notes.NotePerfectionnement) ? sumVal.toFixed(2) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                }

                return (
                  <table className="w-full border-collapse text-sm">
                    <thead className="sticky top-0 bg-white z-10">
                      <tr className="bg-slate-100">
                        <th className="border border-slate-200 p-3 text-left sticky left-0 bg-slate-100 z-20 min-w-[200px]">Élève</th>
                        {['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'].map(type => (
                          <th key={type} className="border border-slate-200 p-3 text-center w-24">{type}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rapidEntryData.map((student, sIdx) => (
                        <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                          <td className="border border-slate-200 p-3 font-medium sticky left-0 bg-white z-10">
                            {student.nom}
                          </td>
                          {['I1', 'I2', 'I3', 'I4', 'Dev1', 'Dev2', 'Composition', 'Examen'].map(type => (
                            <td key={type} className="border border-slate-200 p-1">
                              <input 
                                type="text"
                                value={student.notes[type]}
                                onChange={e => handleRapidNoteChange(sIdx, type, e.target.value, 20)}
                                onPaste={(e) => handlePasteGrades(e, sIdx, type)}
                                placeholder="-"
                                className="w-full h-full p-2 text-center border-none outline-none focus:bg-primary-50 transition-colors"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>

            <div className="p-6 border-t bg-slate-50 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {rapidEntryData.length} élèves chargés.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowRapidEntryModal(false)}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleRapidSubmit}
                  disabled={isSavingRapid || !selectedMatiereRapid}
                  className="px-8 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSavingRapid ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Enregistrer toutes les notes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid Modal */}
      {showGridModal && classeDetails && (() => {
        const sortedMatieres: any[] = [];
        const parents = (classeDetails?.matieres || []).filter((m: any) => !m.parent_id);
        const children = (classeDetails?.matieres || []).filter((m: any) => m.parent_id);

        // Categorized sorting for subjects: Littéraires, Scientifiques, Autres
        const categoryOrder = ['littéraire', 'littéraires', 'scientifique', 'scientifiques', 'autre', 'autres'];
        
        const subjectsWithMetadata = parents.map(p => {
          const subMatieres = children.filter((c: any) => c.parent_id === p.matiere_id);
          return {
            parent: p,
            children: subMatieres
          };
        });

        // Sort parents by category then name
        subjectsWithMetadata.sort((a, b) => {
          const catA = (a.parent.categorie || '').toLowerCase();
          const catB = (b.parent.categorie || '').toLowerCase();
          let indexA = categoryOrder.findIndex(o => catA.includes(o));
          let indexB = categoryOrder.findIndex(o => catB.includes(o));
          if (indexA === -1) indexA = 99;
          if (indexB === -1) indexB = 99;
          if (indexA !== indexB) return indexA - indexB;
          return (a.parent.matiere_nom || a.parent.nom || '').localeCompare(b.parent.matiere_nom || b.parent.nom || '');
        });

        subjectsWithMetadata.forEach(item => {
          if (item.children.length > 0) {
            // Sort children alphabetically
            const sortedChildren = [...item.children].sort((a, b) => (a.matiere_nom || a.nom || '').localeCompare(b.matiere_nom || b.nom || ''));
            sortedChildren.forEach(s => sortedMatieres.push(s));
          } else {
            sortedMatieres.push(item.parent);
          }
        });

        // Add orphaned children (shouldn't happen with good data but for safety)
        const orphanedChildren = children.filter(c => !parents.find(p => p.matiere_id === c.parent_id));
        orphanedChildren.forEach(c => sortedMatieres.push(c));

        return (
          <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full h-full max-w-[95vw] max-h-[95vh] rounded-3xl shadow-2xl my-4 overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{viewMode === 'grid' ? 'Grille des Notes' : 'Statistiques'} - Trimestre {selectedTrimestre}</h2>
                <p className="text-slate-500">{classes.find((c: any) => c.id === parseInt(selectedClasse))?.nom}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-200 p-1 rounded-xl mr-4">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Grille
                  </button>
                  <button 
                    onClick={() => setViewMode('stats')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${viewMode === 'stats' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Statistiques
                  </button>
                </div>
                {canWrite && (
                  <button 
                    onClick={() => openRapidEntry(undefined, selectedTrimestre)}
                    className="bg-white text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-2xs"
                    title="Saisie rapide des notes pour ce trimestre"
                  >
                    <ClipboardList size={18} className="text-primary-600" />
                    <span>Saisie Rapide</span>
                  </button>
                )}
                {user?.role !== 'enseignant' && (
                  <button 
                    onClick={() => setShowBulletinHeaderModal(true)}
                    className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-emerald-100 transition-colors shadow-2xs"
                    title="Personnaliser l'en-tête officiel des bulletins"
                  >
                    <Sliders size={18} />
                    <span>En-tête Bulletins</span>
                  </button>
                )}
                {viewMode === 'stats' ? (
                  <button 
                    onClick={generateStatsPDF}
                    className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-700 transition-colors"
                  >
                    <Download size={20} />
                    Télécharger les statistiques
                  </button>
                ) : (
                  user?.role !== 'enseignant' && (
                    <button 
                      onClick={() => handleDownloadBulletins('merged')}
                      className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-primary-700 transition-colors"
                    >
                      <FileText size={20} />
                      Générer bulletins
                    </button>
                  )
                )}
                <button onClick={() => setShowGridModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-6">
              {viewMode === 'grid' && !isPrimary(classeDetails) && user?.role !== 'enseignant' && (
                <div className="mb-4 p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <ShieldCheck size={16} className="text-blue-600" />
                    <span>Plafond de la conduite (Trimestre {selectedTrimestre}) :</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.25"
                      min="1"
                      max="20"
                      value={classeDetails[`plafond_conduite_t${selectedTrimestre}`] ?? classeDetails.plafond_conduite ?? 20}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) {
                          const updatedClass = { ...classeDetails, [`plafond_conduite_t${selectedTrimestre}`]: val };
                          // Optimistic UI update
                          setClasseDetails(updatedClass);
                          setClasses(classes.map((c: any) => c.id === updatedClass.id ? updatedClass : c));
                          
                          try {
                            const res = await apiFetch(`/api/classes/${selectedClasse}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(updatedClass)
                            });
                            if (!res.ok) {
                               toast.error("Erreur lors de l'enregistrement du plafond");
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="w-20 px-2 py-1.5 text-center font-bold border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                    <span className="text-slate-500 font-medium">/ 20</span>
                  </div>
                </div>
              )}
              {viewMode === 'grid' && isPrimary(classeDetails) && (
                <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Filter size={16} className="text-amber-600" />
                    <span>Sélectionner l'évaluation (Trimestre {selectedTrimestre}) :</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(classEvalConfig[selectedTrimestre || 1] || []).map((evalId: string) => {
                      const baseOpts = isPrimary(classeDetails) ? [
                        { id: 'EvalFormative', label: 'Évaluation Formative' },
                        { id: 'EvalSommative1', label: 'Évaluation Sommative 1' },
                        { id: 'EvalSommative2', label: 'Évaluation Sommative 2' },
                        { id: 'EvalSommative3', label: 'Évaluation Sommative 3' },
                        { id: 'EvalSommative4', label: 'Évaluation Sommative 4' },
                        { id: 'EvalSommative5', label: 'Évaluation Sommative 5' }
                      ] : [
                        { id: 'EvalFormative', label: 'Évaluation Formative' },
                        { id: 'EvalSommative1', label: 'Évaluation Sommative 1' },
                        { id: 'EvalSommative2', label: 'Évaluation Sommative 2' },
                        { id: 'I1', label: 'I1' },
                        { id: 'I2', label: 'I2' },
                        { id: 'Dev1', label: 'Dev1' },
                        { id: 'Composition', label: 'Composition' }
                      ];
                      const evalObj = [...baseOpts, ...customEvals].find(o => o.id === evalId);
                      const label = evalObj ? evalObj.label : evalId;
                      return (
                        <button
                          key={evalId}
                          onClick={() => setSelectedGridEval(evalId)}
                          className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                            selectedGridEval === evalId
                              ? 'bg-amber-600 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-100/50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    {selectedTrimestre === 3 && (
                      <button
                        onClick={() => setShowAnnualBilan(!showAnnualBilan)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                          showAnnualBilan
                            ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-300'
                            : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        <BarChart3 size={14} />
                        Bilan Annuel
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Publication Status & Action Bar */}
              {viewMode === 'grid' && (
                <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isCurrentPeriodPublished ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-600 ring-1 ring-amber-200'}`}>
                      {isCurrentPeriodPublished ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">
                          {isPrimary(classeDetails) 
                            ? `Résultats : ${selectedGridEval}`
                            : `Résultats : Trimestre ${selectedTrimestre}`}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isCurrentPeriodPublished 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isCurrentPeriodPublished ? 'Publié pour les parents' : 'Brouillon (Non publié)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isCurrentPeriodPublished ? (
                          <span>
                            {isTeacher 
                              ? "Mode Consultation Uniquement (Publication active)"
                              : <>Téléchargement bulletin par les parents : {' '}
                                <strong className={isCurrentBulletinDownloadable ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                                  {isCurrentBulletinDownloadable ? 'Déverrouillé (Autorisé)' : 'Verrouillé (Consultation écran seule)'}
                                </strong>
                                </>
                            }
                          </span>
                        ) : (
                          <span>Les notes sont masquées aux parents et aux enseignants jusqu'à publication.</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {isCurrentPeriodPublished ? (
                        <>
                          <button
                            onClick={() => handleToggleBulletinLock(!isCurrentBulletinDownloadable)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                              isCurrentBulletinDownloadable
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={isCurrentBulletinDownloadable ? "Verrouiller le téléchargement du bulletin dans l'espace parent" : "Déverrouiller le téléchargement du bulletin"}
                          >
                            {isCurrentBulletinDownloadable ? <Lock size={14} /> : <Unlock size={14} />}
                            <span>{isCurrentBulletinDownloadable ? 'Verrouiller Bulletin Parents' : 'Déverrouiller Bulletin Parents'}</span>
                          </button>

                          <button
                            onClick={() => handleTogglePublish(false)}
                            className="px-3.5 py-2 bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <EyeOff size={14} />
                            <span>Dépublier</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setPublishAllowDownload(true);
                            setPublishTargetCycle(false);
                            setShowPublishModal(true);
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                        >
                          <Send size={14} />
                          <span>Publier les Résultats</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (classeDetails) {
                            setPubCenterCycleTab(isPrimary(classeDetails) ? 'primaire' : 'secondaire');
                          }
                          setShowPublicationsCenterModal(true);
                        }}
                        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                        title={isPrimary(classeDetails) ? "Gérer les publications des évaluations (Maternelle & Primaire)" : "Gérer les publications des trimestres (Secondaire)"}
                      >
                        <Settings size={14} />
                        <span>Centre de Publication ({isPrimary(classeDetails) ? 'Maternelle & Primaire' : 'Secondaire'})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {viewMode === 'grid' && user?.role !== 'enseignant' && (
                <div className="mb-6 flex items-center justify-between gap-4 flex-wrap bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${selectedStudentIds.size > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                      <span className="text-xs font-bold text-slate-700">
                        {selectedStudentIds.size > 0 
                          ? `${selectedStudentIds.size} élève(s) sélectionné(s)` 
                          : "Tous les élèves sélectionnés par défaut"}
                      </span>
                    </div>
                    {selectedStudentIds.size > 0 && (
                      <button 
                        onClick={() => setSelectedStudentIds(new Set())}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2"
                      >
                        Annuler la sélection
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDownloadBulletins('merged')}
                      disabled={isDownloadingAll || (classeDetails?.eleves || []).length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {isDownloadingAll ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                      <span>{selectedStudentIds.size > 0 ? 'Fusionner PDF (Sélection)' : 'Fichier unique PDF (Tous)'}</span>
                    </button>

                    <button
                      onClick={() => handleDownloadBulletins('individual')}
                      disabled={isDownloadingAll || (classeDetails?.eleves || []).length === 0}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all disabled:opacity-50"
                    >
                      {isDownloadingAll ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                      <span>{selectedStudentIds.size > 0 ? 'Détails ZIP (Sélection)' : 'Archive ZIP (Tous)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {viewMode === 'grid' ? (
                <table className="w-full border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 sticky left-0 z-20 min-w-[240px]">
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            checked={selectedStudentIds.size === (Array.isArray(classeDetails?.eleves) ? classeDetails.eleves.length : 0) && (classeDetails?.eleves || []).length > 0}
                            onChange={handleToggleSelectAll}
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span>Élèves</span>
                        </div>
                      </th>

                      {(() => {
                        const parents = (classeDetails?.matieres || []).filter((m: any) => !m.parent_id);
                        const children = (classeDetails?.matieres || []).filter((m: any) => !!m.parent_id);
                        const isPrim = isPrimary(classeDetails);
                        
                        // We need to maintain the same order as sortedMatieres (which is used in the body)
                        // sortedMatieres was built from subjectsWithMetadata which was sorted.
                        const categoryOrder = ['littéraire', 'littéraires', 'scientifique', 'scientifiques', 'autre', 'autres'];
                        const subjectsWithMetadata = parents.map(p => ({
                          parent: p,
                          children: children.filter((c: any) => c.parent_id === p.matiere_id)
                        }));
                        subjectsWithMetadata.sort((a, b) => {
                          const catA = (a.parent.categorie || '').toLowerCase();
                          const catB = (b.parent.categorie || '').toLowerCase();
                          let indexA = categoryOrder.findIndex(o => catA.includes(o));
                          let indexB = categoryOrder.findIndex(o => catB.includes(o));
                          if (indexA === -1) indexA = 99;
                          if (indexB === -1) indexB = 99;
                          if (indexA !== indexB) return indexA - indexB;
                          return (a.parent.matiere_nom || a.parent.nom || '').localeCompare(b.parent.matiere_nom || b.parent.nom || '');
                        });

                        const headers: React.ReactNode[] = [];
                        subjectsWithMetadata.forEach(item => {
                          const m = item.parent;
                          const subMatieres = item.children;
                          const isDisciplinaire = m.est_disciplinaire;
                          const span = isPrim ? 3 : (isDisciplinaire ? 1 : 9);

                          if (subMatieres.length > 0) {
                            headers.push(
                              <th key={m.matiere_id} colSpan={span * subMatieres.length} className="border border-slate-200 bg-primary-50 p-2 text-center">
                                <div className="flex flex-col items-center justify-center h-full">
                                  <span className="font-bold">{m.matiere_nom}</span>
                                </div>
                              </th>
                            );
                          } else {
                            headers.push(
                              <th key={m.matiere_id} colSpan={span} className="border border-slate-200 bg-primary-50 p-2 text-center font-bold">
                                <div className="flex items-center justify-center gap-1.5 group">
                                  <span>{m.matiere_nom}</span>
                                  {canWrite && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRapidEntry((m.matiere_id || m.id).toString(), selectedTrimestre);
                                      }}
                                      className="opacity-60 hover:opacity-100 p-0.5 hover:bg-primary-100 rounded text-primary-700 transition-all"
                                      title={`Saisie rapide pour ${m.matiere_nom}`}
                                    >
                                      <Edit size={12} />
                                    </button>
                                  )}
                                </div>
                              </th>
                            );
                          }
                        });

                        // Add orphaned children
                        const orphanedChildren = children.filter(c => !parents.find(p => p.matiere_id === c.parent_id));
                        orphanedChildren.forEach(m => {
                          const span = isPrim ? 3 : (m.est_disciplinaire ? 1 : 9);
                          headers.push(
                            <th key={m.matiere_id} colSpan={span} className="border border-slate-200 bg-slate-50 p-2 text-center text-[10px]">
                              <div className="flex items-center justify-center gap-1 group">
                                <span>{m.matiere_nom}</span>
                                {canWrite && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openRapidEntry((m.matiere_id || m.id).toString(), selectedTrimestre);
                                    }}
                                    className="opacity-60 hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-700 transition-all"
                                    title={`Saisie rapide for ${m.matiere_nom}`}
                                  >
                                    <Edit size={10} />
                                  </button>
                                )}
                              </div>
                            </th>
                          );
                        });

                        return headers;
                      })()}

                      {isPrimary(classeDetails) && (
                        <>
                          <th rowSpan={2} className="border border-slate-200 bg-primary-600 text-white p-2 min-w-[90px]">Moy. Gén.</th>
                          <th rowSpan={2} className="border border-slate-200 bg-emerald-600 text-white p-2 min-w-[80px]">Seuil</th>
                          <th rowSpan={2} className="border border-slate-200 bg-teal-600 text-white p-2 min-w-[90px]">Seuil Atteint</th>
                          <th rowSpan={2} className="border border-slate-200 bg-amber-600 text-white p-2 min-w-[70px]">Rang</th>
                          {selectedTrimestre === 3 && (
                            <>
                              <th rowSpan={2} className="border border-slate-200 bg-indigo-600 text-white p-2 min-w-[110px]" title="Nombre d'évaluations validées / faites">Évals. Validées / Faites</th>
                              <th rowSpan={2} className="border border-slate-200 bg-teal-600 text-white p-2 min-w-[90px]">Seuil Atteint</th>
                              <th rowSpan={2} className="border border-slate-200 bg-purple-700 text-white p-2 min-w-[100px]">Décision</th>
                            </>
                          )}
                          {user?.role !== 'enseignant' && (
                            <>
                              <th rowSpan={2} className="border border-slate-200 bg-red-100 text-red-900 p-2 min-w-[70px]">Exclu. (Conduite)</th>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 min-w-[120px]">Bulletin</th>
                            </>
                          )}
                        </>
                      )}
                      {!isPrimary(classeDetails) && (
                        <>
                          <th rowSpan={2} className="border border-slate-200 bg-primary-600 text-white p-2 min-w-[90px]">Moy. Gén.</th>
                          <th rowSpan={2} className="border border-slate-200 bg-amber-600 text-white p-2 min-w-[70px]">Rang</th>
                          {selectedTrimestre === 3 && (
                            <>
                              <th rowSpan={2} className="border border-slate-200 bg-blue-600 text-white p-2 min-w-[80px]">Moy. T1</th>
                              <th rowSpan={2} className="border border-slate-200 bg-indigo-600 text-white p-2 min-w-[80px]">Moy. T2</th>
                              <th rowSpan={2} className="border border-slate-200 bg-emerald-700 text-white p-2 min-w-[90px]">Moy. Ann</th>
                              <th rowSpan={2} className="border border-slate-200 bg-amber-700 text-white p-2 min-w-[70px]">Rang Ann.</th>
                              <th rowSpan={2} className="border border-slate-200 bg-purple-700 text-white p-2 min-w-[100px]">Décision</th>
                            </>
                          )}
                          {user?.role !== 'enseignant' && (
                            <>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 text-[10px] min-w-[55px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>Assid.</span>
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => handleBulkToggleMention('assiduite', true)}
                                      className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-700 transition-colors font-black"
                                      title="Cocher pour tous"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => handleBulkToggleMention('assiduite', false)}
                                      className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-rose-600 transition-colors font-black"
                                      title="Décocher pour tous"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </th>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 text-[10px] min-w-[55px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>Disc.</span>
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => handleBulkToggleMention('discipline', true)}
                                      className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-700 transition-colors font-black"
                                      title="Cocher pour tous"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => handleBulkToggleMention('discipline', false)}
                                      className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-rose-600 transition-colors font-black"
                                      title="Décocher pour tous"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </th>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 text-[10px] min-w-[55px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>T.H</span>
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => handleBulkToggleMention('tableau_honneur', true)}
                                      className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-700 transition-colors font-black"
                                      title="Cocher pour tous"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => handleBulkToggleMention('tableau_honneur', false)}
                                      className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-rose-600 transition-colors font-black"
                                      title="Décocher pour tous"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </th>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 text-[10px] min-w-[55px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>Félic.</span>
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => handleBulkToggleMention('felicitations', true)}
                                      className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-700 transition-colors font-black"
                                      title="Cocher pour tous"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => handleBulkToggleMention('felicitations', false)}
                                      className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-rose-600 transition-colors font-black"
                                      title="Décocher pour tous"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </th>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 text-[10px] min-w-[55px]">
                                <div className="flex flex-col items-center gap-1">
                                  <span>Encour.</span>
                                  <div className="flex gap-1 mt-1">
                                    <button 
                                      onClick={() => handleBulkToggleMention('encouragements', true)}
                                      className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-emerald-700 transition-colors font-black"
                                      title="Cocher pour tous"
                                    >
                                      ✓
                                    </button>
                                    <button 
                                      onClick={() => handleBulkToggleMention('encouragements', false)}
                                      className="text-[9px] bg-rose-500 text-white px-1.5 py-0.5 rounded shadow-sm hover:bg-rose-600 transition-colors font-black"
                                      title="Décocher pour tous"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              </th>
                              <th rowSpan={2} className="border border-slate-200 bg-red-100 text-red-900 p-2 min-w-[70px]">Exclu. (Conduite)</th>
                              <th rowSpan={2} className="border border-slate-200 bg-slate-100 p-2 min-w-[120px]">Bulletins</th>
                            </>
                          )}
                        </>
                      )}
                    </tr>
                    <tr>
                      {sortedMatieres.map((m: any) => {
                        const hasChildren = (classeDetails?.matieres || []).some((other: any) => other.parent_id === m.matiere_id);
                        if (hasChildren) return null; // Headers are handled by children

                        if (isPrimary(classeDetails)) {
                          return (
                            <React.Fragment key={m.matiere_id}>
                              <th className="border border-slate-200 bg-slate-50 p-1 text-center w-14 font-semibold text-slate-700" title="Note Obtenue (sur 20)">Obt.</th>
                              <th className="border border-slate-200 bg-slate-50 p-1 text-center w-14 font-semibold text-slate-700" title="Note de Perfectionnement (sur 02)">Perf.</th>
                              <th className="border border-slate-200 bg-emerald-50 p-1 text-center w-16 font-bold text-emerald-800 border-r-[2px] border-r-slate-300" title="Note Totale sur 20 (Obtenue + Perfectionnement)">Tot.</th>
                            </React.Fragment>
                          );
                        }

                        if (m.est_disciplinaire) {
                          return (
                            <React.Fragment key={m.matiere_id}>
                              <th className="border border-slate-200 bg-blue-50 p-1 text-center w-12 font-bold text-blue-700 border-r-[3px] border-r-slate-400">Moy</th>
                            </React.Fragment>
                          );
                        }

                        return (
                          <React.Fragment key={m.matiere_id}>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I1</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I2</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I3</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">I4</th>
                            <th className="border border-slate-200 bg-amber-50 p-1 text-center w-12 font-bold text-amber-700">MI</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">D1</th>
                            <th className="border border-slate-200 bg-slate-50 p-1 text-center w-10">D2</th>
                            <th className="border border-slate-200 bg-blue-50 p-1 text-center w-12 font-bold text-blue-700">Moy</th>
                            <th className="border border-slate-200 bg-indigo-50 p-1 text-center w-12 font-bold text-indigo-700 border-r-[3px] border-r-slate-400">Moy C.</th>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : []).slice().sort((a: any, b: any) => (a?.nom || '').localeCompare(b?.nom || '')).map((e: any) => (
                      <tr key={e.id} className={`hover:bg-slate-50 transition-colors ${selectedStudentIds.has(e.id) ? 'bg-indigo-50/50' : ''}`}>
                        <td className="border border-slate-200 p-2 font-medium sticky left-0 bg-inherit z-10 border-r-[3px] border-r-slate-400">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input 
                                type="checkbox"
                                checked={selectedStudentIds.has(e.id)}
                                onChange={() => handleToggleSelectStudent(e.id)}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                              />
                              <span className={`truncate ${selectedStudentIds.has(e.id) ? 'text-indigo-900 font-bold' : ''}`}>
                                {e.nom} {e.prenom}
                              </span>
                            </div>
                            {user?.role !== 'enseignant' && (
                              <button 
                                type="button"
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleGenerateBulletinClick(e, false, selectedGridEval);
                                }}
                                className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 hover:text-primary-700 transition-colors shadow-xs ml-auto shrink-0"
                                title="Télécharger le bulletin individuel"
                              >
                                <Download size={13} />
                              </button>
                            )}
                          </div>
                        </td>

                        {sortedMatieres.map((m: any) => {
                          const hasChildren = (classeDetails?.matieres || []).some((other: any) => other.parent_id === m.matiere_id);
                          if (hasChildren) return null;

                          const getNote = (type: string) => {
                            const notesList = [
                              ...(Array.isArray(classeDetails?.notes) ? classeDetails.notes : []),
                              ...(Array.isArray(notes) ? notes : [])
                            ];
                            const noteObj = notesList.find((n: any) => 
                              Number(n.eleve_id) === Number(e.id) && 
                              (Number(n.matiere_id) === Number(m.matiere_id) || Number(n.matiere_id) === Number(m.id)) && 
                              Number(n.trimestre) === Number(selectedTrimestre) &&
                              n.type_evaluation?.toString().toLowerCase() === type.toLowerCase()
                            );
                            return noteObj ? Number(noteObj.note) : null;
                          };

                          if (isPrimary(classeDetails)) {
                            const studentSubjectNotes = [
                              ...(Array.isArray(classeDetails?.notes) ? classeDetails.notes : []),
                              ...(Array.isArray(notes) ? notes : [])
                            ].filter((n: any) =>
                              Number(n.eleve_id) === Number(e.id) &&
                              (Number(n.matiere_id) === Number(m.matiere_id) || Number(n.matiere_id) === Number(m.id)) &&
                              Number(n.trimestre) === Number(selectedTrimestre)
                            );

                            let noteObt: number | null = null;
                            let notePerf: number | null = null;
                            let singleNote: number | null = null;

                            if (selectedGridEval) {
                              const obtObj = studentSubjectNotes.find((n: any) => n.type_evaluation === `${selectedGridEval}_NoteObtenue` || n.type_evaluation === `${selectedGridEval}_note_obtenue`);
                              const perfObj = studentSubjectNotes.find((n: any) => n.type_evaluation === `${selectedGridEval}_NotePerfectionnement` || n.type_evaluation === `${selectedGridEval}_note_perfectionnement`);
                              if (obtObj) noteObt = Number(obtObj.note);
                              if (perfObj) notePerf = Number(perfObj.note);
                              if (noteObt === null && notePerf === null) {
                                const directObj = studentSubjectNotes.find((n: any) => n.type_evaluation === selectedGridEval);
                                if (directObj) singleNote = Number(directObj.note);
                              }
                            }

                            let tot: number | null = null;
                            if (noteObt !== null || notePerf !== null) {
                              tot = Math.min(20, Math.max(0, (noteObt || 0) + (notePerf || 0)));
                            } else if (singleNote !== null) {
                              tot = singleNote;
                            }

                            return (
                              <React.Fragment key={m.matiere_id}>
                                <td className="border border-slate-200 p-1 text-center font-medium">{noteObt !== null ? formatGrade(noteObt) : '-'}</td>
                                <td className="border border-slate-200 p-1 text-center font-medium">{notePerf !== null ? formatGrade(notePerf) : '-'}</td>
                                <td className="border border-slate-200 p-1 text-center bg-emerald-50/70 font-bold text-emerald-900 border-r-[2px] border-r-slate-300">
                                  {tot !== null ? formatGrade(tot) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          }

                          if (m.est_disciplinaire) {
                            const discNote = getNote('NoteDisciplinaire') || getNote('Disciplinaire');
                            return (
                              <React.Fragment key={m.matiere_id}>
                                <td className="border border-slate-200 p-1 text-center bg-blue-50 font-bold text-blue-700 border-r-[3px] border-r-slate-400">
                                  {discNote !== null ? formatGrade(discNote) : '-'}
                                </td>
                              </React.Fragment>
                            );
                          }

                          const i1 = getNote('I1');
                          const i2 = getNote('I2');
                          const i3 = getNote('I3');
                          const i4 = getNote('I4');
                          const mi_imported = getNote('MI');
                          const d1 = getNote('Dev1');
                          const d2 = getNote('Dev2');

                          const interrogations = [i1, i2, i3, i4].filter(n => n !== null) as number[];
                          const mi_calculated = interrogations.length > 0 ? interrogations.reduce((a, b) => a + b, 0) / interrogations.length : null;
                          const mi = mi_imported !== null ? mi_imported : mi_calculated;

                          const components = [mi, d1, d2].filter(n => n !== null) as number[];
                          const moy = components.length > 0 ? components.reduce((a, b) => a + b, 0) / components.length : null;
                          const moyCoef = moy !== null ? moy * (m.coefficient || 1) : null;

                          return (
                            <React.Fragment key={m.matiere_id}>
                              <td className="border border-slate-200 p-1 text-center">{i1 !== null ? formatGrade(i1) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{i2 !== null ? formatGrade(i2) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{i3 !== null ? formatGrade(i3) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{i4 !== null ? formatGrade(i4) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center bg-amber-50 font-bold text-amber-700">{mi !== null ? formatGrade(mi) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{d1 !== null ? formatGrade(d1) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center">{d2 !== null ? formatGrade(d2) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center bg-blue-50 font-bold text-blue-700">{moy !== null ? formatGrade(moy) : '-'}</td>
                              <td className="border border-slate-200 p-1 text-center bg-indigo-50 font-bold text-indigo-700 border-r-[3px] border-r-slate-400">{moyCoef !== null ? formatGrade(moyCoef) : '-'}</td>
                            </React.Fragment>
                          );
                        })}

                        {isPrimary(classeDetails) && (() => {
                          const studentData = allStudentsGrades.get(e.id);
                          const studentGrades = studentData?.grades || { globalMoy: 0, seuil: '0/0', seuilAtteint: 'Non', disciplineMoy: null };
                          const annualBilan = studentData?.annualBilan || { seuilRatio: '0/0', seuilAtteint: 'Non', decision: 'Redouble', annualMoy: 0 };
                          
                          const disciplineMoy = studentGrades.disciplineMoy;
                          const isAutoExclu = disciplineMoy !== null && disciplineMoy !== undefined && disciplineMoy < 7;
                          const manualExclusion = exclusions.find((ex: any) => Number(ex.eleve_id) === Number(e.id) && Number(ex.trimestre) === Number(selectedTrimestre));
                          const isActuallyExclu = manualExclusion ? manualExclusion.exclu === 1 : isAutoExclu;

                          return (
                            <>
                              <td className="border border-slate-200 p-2 bg-primary-50 font-bold text-primary-700 text-center">
                                {studentGrades.globalMoy.toFixed(2)}
                              </td>
                              <td className="border border-slate-200 p-2 bg-emerald-50 font-bold text-emerald-800 text-center">
                                {studentGrades.seuil}
                              </td>
                              <td className="border border-slate-200 p-2 bg-teal-50 font-bold text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${studentGrades.seuilAtteint === 'Oui' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {studentGrades.seuilAtteint}
                                </span>
                              </td>
                              <td className="border border-slate-200 p-2 bg-amber-50 font-bold text-amber-900 text-center">
                                {getStudentRank(e.id)}
                              </td>
                              {selectedTrimestre === 3 && (
                                <>
                                  <td className="border border-slate-200 p-2 text-center bg-indigo-50 font-bold text-indigo-900">
                                    {annualBilan.seuilRatio}
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-teal-50 font-bold">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${annualBilan.seuilAtteint === 'Oui' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                      {annualBilan.seuilAtteint}
                                    </span>
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-purple-50">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${annualBilan.decision === 'Passe' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                      {annualBilan.decision}
                                    </span>
                                  </td>
                                </>
                              )}
                              {user?.role !== 'enseignant' && (
                                <>
                                  <td className="border border-slate-200 p-2 text-center">
                                    <button
                                      onClick={() => handleToggleExclusion(e.id, isActuallyExclu)}
                                      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${isActuallyExclu ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                      title={isActuallyExclu ? 'Annuler l\'exclusion' : 'Marquer comme exclu'}
                                    >
                                      {isActuallyExclu ? 'Oui' : 'Non'}
                                    </button>
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-white">
                                    <div className="flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => handleGenerateBulletinClick(e, false, selectedGridEval)}
                                        className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                                        title="Télécharger"
                                      >
                                        <Download size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleGenerateBulletinClick(e, true, selectedGridEval)}
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Afficher"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}

                        {!isPrimary(classeDetails) && (() => {
                          const studentData = allStudentsGrades.get(e.id);
                          const studentGrades = studentData?.grades || { globalMoy: 0, t1: 0, t2: 0, t3: 0, annualMoy: 0, t1HasData: false, t2HasData: false, disciplineMoy: null };
                          const annualBilan = studentData?.annualBilan || { decision: 'Redouble' };
                          
                          const disciplineMoy = studentGrades.disciplineMoy;
                          const isAutoExclu = disciplineMoy !== null && disciplineMoy !== undefined && disciplineMoy < 7;
                          const manualExclusion = exclusions.find((ex: any) => Number(ex.eleve_id) === Number(e.id) && Number(ex.trimestre) === Number(selectedTrimestre));
                          const isActuallyExclu = manualExclusion ? manualExclusion.exclu === 1 : isAutoExclu;

                          const studentMentions = mentions.find((m: any) => 
                            Number(m.eleve_id) === Number(e.id) && 
                            Number(m.trimestre) === Number(selectedTrimestre)
                          ) || {
                            assiduite: 0,
                            discipline: 0,
                            tableau_honneur: 0,
                            felicitations: 0,
                            encouragements: 0
                          };

                          return (
                            <>
                              <td className="border border-slate-200 p-2 bg-primary-50 font-bold text-primary-700 text-center">
                                {studentGrades.globalMoy.toFixed(2)}
                              </td>
                              <td className="border border-slate-200 p-2 bg-amber-50 font-bold text-amber-900 text-center">
                                {getStudentRank(e.id)}
                              </td>
                              {selectedTrimestre === 3 && (
                                <>
                                  <td className="border border-slate-200 p-2 text-center bg-blue-50 font-bold text-blue-900">
                                    {studentGrades.t1HasData ? studentGrades.t1.toFixed(2) : '-'}
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-indigo-50 font-bold text-indigo-900">
                                    {studentGrades.t2HasData ? studentGrades.t2.toFixed(2) : '-'}
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-emerald-50 font-bold text-emerald-900">
                                    {studentGrades.annualMoy.toFixed(2)}
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-amber-50 font-bold text-amber-900">
                                    {getStudentAnnualRank(e.id)}
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-purple-50">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${annualBilan.decision === 'Passe' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                      {annualBilan.decision}
                                    </span>
                                  </td>
                                </>
                              )}
                              {user?.role !== 'enseignant' && (
                                <>
                                  <td className="border border-slate-200 p-1 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={Boolean(studentMentions.assiduite)}
                                      onChange={() => handleToggleMention(e.id, 'assiduite', Boolean(studentMentions.assiduite))}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="border border-slate-200 p-1 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={Boolean(studentMentions.discipline)}
                                      onChange={() => handleToggleMention(e.id, 'discipline', Boolean(studentMentions.discipline))}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="border border-slate-200 p-1 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={Boolean(studentMentions.tableau_honneur)}
                                      onChange={() => handleToggleMention(e.id, 'tableau_honneur', Boolean(studentMentions.tableau_honneur))}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="border border-slate-200 p-1 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={Boolean(studentMentions.felicitations)}
                                      onChange={() => handleToggleMention(e.id, 'felicitations', Boolean(studentMentions.felicitations))}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="border border-slate-200 p-1 text-center">
                                    <input 
                                      type="checkbox" 
                                      checked={Boolean(studentMentions.encouragements)}
                                      onChange={() => handleToggleMention(e.id, 'encouragements', Boolean(studentMentions.encouragements))}
                                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center">
                                    <button
                                      onClick={() => handleToggleExclusion(e.id, isActuallyExclu)}
                                      className={`px-2 py-1 rounded text-xs font-bold transition-colors ${isActuallyExclu ? 'bg-red-100 text-red-800 hover:bg-red-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                      title={isActuallyExclu ? 'Annuler l\'exclusion' : 'Marquer comme exclu'}
                                    >
                                      {isActuallyExclu ? 'Oui' : 'Non'}
                                    </button>
                                  </td>
                                  <td className="border border-slate-200 p-2 text-center bg-white">
                                    <div className="flex items-center justify-center gap-2">
                                      <button 
                                        onClick={() => handleGenerateBulletinClick(e, false, selectedGridEval)}
                                        className="p-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors"
                                        title="Télécharger"
                                      >
                                        <Download size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleGenerateBulletinClick(e, true, selectedGridEval)}
                                        className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                        title="Afficher"
                                      >
                                        <Eye size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </>
                          );
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (() => {
                // Calculate Statistics
                const elevesStatsList = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
                const allGrades = elevesStatsList.map((e: any) => ({
                  ...e,
                  ...calculateStudentGrades(e.id, classeDetails?.notes || [], classeDetails?.matieres || [], selectedTrimestre || 1)
                }));

                const statsToUse = showAnnualStats && selectedTrimestre === 3 ? 
                  allGrades.map(s => ({ ...s, globalMoy: s.annualMoy })) : 
                  allGrades;

                const validMoys = statsToUse.map(s => s.globalMoy).filter(m => m > 0);
                const passCount = statsToUse.filter(s => s.globalMoy >= 10).length;
                const failCount = statsToUse.length - passCount;
                const passRate = statsToUse.length > 0 ? (passCount / statsToUse.length) * 100 : 0;

                const maleStudents = statsToUse.filter(s => s.sexe === 'M');
                const femaleStudents = statsToUse.filter(s => s.sexe === 'F');
                const malePassCount = maleStudents.filter(s => s.globalMoy >= 10).length;
                const femalePassCount = femaleStudents.filter(s => s.globalMoy >= 10).length;

                const distribution = [
                  { range: '0-5', count: statsToUse.filter(s => s.globalMoy < 5 && s.globalMoy > 0).length },
                  { range: '5-10', count: statsToUse.filter(s => s.globalMoy >= 5 && s.globalMoy < 10).length },
                  { range: '10-12', count: statsToUse.filter(s => s.globalMoy >= 10 && s.globalMoy < 12).length },
                  { range: '12-14', count: statsToUse.filter(s => s.globalMoy >= 12 && s.globalMoy < 14).length },
                  { range: '14-16', count: statsToUse.filter(s => s.globalMoy >= 14 && s.globalMoy < 16).length },
                  { range: '16-20', count: statsToUse.filter(s => s.globalMoy >= 16).length },
                ];

                const subjectStats = sortedMatieres.map(m => {
                  const subjectMoys = statsToUse.map(s => {
                    if (showAnnualStats && selectedTrimestre === 3) {
                      return s.annualSubjectsGrades.find((ss: any) => ss.matiere_id === m.matiere_id)?.moy;
                    }
                    const sg = s.subjectsGrades.find((ss: any) => ss.matiere_id === m.matiere_id);
                    return sg ? sg.moy : null;
                  }).filter(m => m !== null) as number[];

                  const avg = subjectMoys.length > 0 ? subjectMoys.reduce((a, b) => a + b, 0) / subjectMoys.length : 0;
                  const pass = subjectMoys.filter(m => m >= 10).length;
                  const rate = subjectMoys.length > 0 ? (pass / subjectMoys.length) * 100 : 0;

                  return {
                    name: m.matiere_nom,
                    average: parseFloat(avg.toFixed(2)),
                    passRate: parseFloat(rate.toFixed(2))
                  };
                });

                const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

                return (
                  <div className="space-y-8 pb-12">
                    {selectedTrimestre === 3 && (
                      <div className="flex justify-center mb-6">
                        <div className="bg-slate-100 p-1 rounded-xl flex gap-1">
                          <button
                            onClick={() => setShowAnnualStats(false)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!showAnnualStats ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Trimestre 3
                          </button>
                          <button
                            onClick={() => setShowAnnualStats(true)}
                            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${showAnnualStats ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                          >
                            Bilan Annuel
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                            <Users size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Effectif</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">{allGrades.length}</div>
                        <div className="text-xs text-slate-500 mt-1">{maleStudents.length} Garçons / {femaleStudents.length} Filles</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Taux de Réussite</span>
                        </div>
                        <div className="text-3xl font-bold text-emerald-600">{passRate.toFixed(1)}%</div>
                        <div className="text-xs text-slate-500 mt-1">{passCount} admis sur {allGrades.length}</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                            <BarChart3 size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Moyenne Classe</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900">
                          {(validMoys.reduce((a, b) => a + b, 0) / (validMoys.length || 1)).toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Sur 20</div>
                      </div>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <span className="text-sm font-bold text-slate-400 uppercase">Extrêmes</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-emerald-600">{validMoys.length > 0 ? Math.max(...validMoys).toFixed(2) : '-'}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-2xl font-bold text-red-600">{validMoys.length > 0 ? Math.min(...validMoys).toFixed(2) : '-'}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Plus forte / Plus faible</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Distribution Chart */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <BarChart3 size={20} className="text-primary-600" />
                          Distribution des Moyennes
                        </h3>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distribution}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                              <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                              <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                cursor={{ fill: '#f8fafc' }}
                              />
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Nombre d'élèves" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Gender Success Rate */}
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                          <PieChartIcon size={20} className="text-primary-600" />
                          Réussite par Sexe
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-2xl">
                            <span className="text-sm font-bold text-blue-600 uppercase mb-2">Garçons</span>
                            <div className="text-4xl font-bold text-blue-900">
                              {maleStudents.length > 0 ? ((malePassCount / maleStudents.length) * 100).toFixed(1) : 0}%
                            </div>
                            <span className="text-xs text-blue-600 mt-1">{malePassCount} admis / {maleStudents.length}</span>
                          </div>
                          <div className="flex flex-col items-center justify-center p-6 bg-pink-50 rounded-2xl">
                            <span className="text-sm font-bold text-pink-600 uppercase mb-2">Filles</span>
                            <div className="text-4xl font-bold text-pink-900">
                              {femaleStudents.length > 0 ? ((femalePassCount / femaleStudents.length) * 100).toFixed(1) : 0}%
                            </div>
                            <span className="text-xs text-pink-600 mt-1">{femalePassCount} admises / {femaleStudents.length}</span>
                          </div>
                        </div>
                        <div className="mt-8 h-[150px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Admis', value: passCount },
                                  { name: 'Échecs', value: failCount }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={60}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                <Cell fill="#10b981" />
                                <Cell fill="#ef4444" />
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36}/>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>

                    {/* Subject Performance */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-600" />
                        Performance par Matière
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-6 py-3 font-medium">Matière</th>
                              <th className="px-6 py-3 font-medium text-center">Moyenne</th>
                              <th className="px-6 py-3 font-medium text-center">Taux de Réussite</th>
                              <th className="px-6 py-3 font-medium">Progression</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {subjectStats.map((s, i) => (
                              <tr key={i} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-slate-700">{s.name}</td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-bold ${s.average >= 10 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {s.average.toFixed(2)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <span className={`text-sm font-bold ${s.passRate >= 50 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {s.passRate.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${s.passRate >= 70 ? 'bg-emerald-500' : s.passRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${s.passRate}%` }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
        );
      })()}

      {/* Modal de demande de permission pour la saisie des notes */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
            <div className="p-6 border-b flex items-center justify-between bg-amber-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Demande de permission de saisie</h2>
                  <p className="text-xs text-slate-500">Autorisation pour insérer ou importer des notes</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPermissionModal(false)}
                className="p-2 hover:bg-amber-100 rounded-full transition-colors text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitPermissionRequest} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                <p>
                  L'administration a verrouillé la saisie générale des notes. Formulez votre demande avec la classe, la matière et le motif pour débloquer votre accès.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Classe concernée</label>
                  <select
                    value={permissionForm.classe_id}
                    onChange={e => setPermissionForm({ ...permissionForm, classe_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">{selectedClasse ? "Classe actuellement filtrée" : "Toutes mes classes"}</option>
                    {classes.map((c: any) => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Trimestre</label>
                  <select
                    value={permissionForm.trimestre}
                    onChange={e => setPermissionForm({ ...permissionForm, trimestre: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1}>Trimestre 1</option>
                    <option value={2}>Trimestre 2</option>
                    <option value={3}>Trimestre 3</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Matière concernée (Optionnel)</label>
                <select
                  value={permissionForm.matiere_id}
                  onChange={e => setPermissionForm({ ...permissionForm, matiere_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Toutes mes matières</option>
                  {matieres.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.nom}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Type d'évaluation (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Devoir 1, Interrogation, Composition..."
                  value={permissionForm.type_evaluation}
                  onChange={e => setPermissionForm({ ...permissionForm, type_evaluation: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Motif de la demande <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Expliquez à l'administration pourquoi vous devez saisir ou modifier des notes (ex: retard de correction justifié, rattrapage d'évaluation, régularisation de notes...)"
                  value={permissionForm.description}
                  onChange={e => setPermissionForm({ ...permissionForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowPermissionModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-medium hover:bg-slate-50 text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPermission}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm text-sm disabled:opacity-50"
                >
                  {isSubmittingPermission ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Envoyer la demande</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BulletinHeaderModal
        isOpen={showBulletinHeaderModal}
        onClose={() => setShowBulletinHeaderModal(false)}
        defaultCycle={cycle === 'secondaire' ? 'secondaire' : cycle === 'primaire' ? 'primaire' : (activeCycleKey === 'secondaire' ? 'secondaire' : 'all')}
        schoolInfo={schoolInfo}
        onSaved={(newHeader) => setBulletinHeaderData(newHeader)}
      />

      {/* Modal de Confirmation de Verrouillage Raffiné */}
      {showLockConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className={`p-6 text-center ${lockNextState ? 'bg-rose-50' : 'bg-emerald-50'}`}>
              <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 ${lockNextState ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {lockNextState ? <Lock size={32} /> : <Unlock size={32} />}
              </div>
              <h3 className="text-xl font-bold text-slate-900">
                {lockNextState ? 'Confirmer le verrouillage' : 'Confirmer le déverrouillage'}
              </h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-center leading-relaxed">
                {lockNextState 
                  ? "Êtes-vous sûr de vouloir VERROUILLER la saisie et l'importation des notes ? Les enseignants ne pourront plus effectuer de modifications sans autorisation."
                  : "Êtes-vous sûr de vouloir DÉVERROUILLER la saisie des notes ? Tous les enseignants pourront à nouveau saisir et importer des notes librement."
                }
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={confirmToggleNotesLock}
                  className={`w-full py-3 rounded-2xl font-bold text-white shadow-lg shadow-opacity-20 transition-all ${
                    lockNextState ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                  }`}
                >
                  {lockNextState ? 'Verrouiller maintenant' : 'Déverrouiller maintenant'}
                </button>
                <button
                  onClick={() => setShowLockConfirmModal(false)}
                  className="w-full py-3 rounded-2xl font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-all"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal d'Avertissement de Notes Manquantes */}
      {showBulletinWarningModal && bulletinWarningData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6 bg-amber-50 text-center border-b border-amber-100">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Attention : Notes manquantes</h3>
              <p className="text-sm text-amber-800 font-medium mt-1">
                {bulletinWarningData.eleve.nom} {bulletinWarningData.eleve.prenom}
              </p>
            </div>
            <div className="p-6">
              <div className="p-4 bg-slate-50 rounded-2xl mb-6">
                <p className="text-slate-700 text-center text-sm leading-relaxed">
                  {bulletinWarningData.type === 'none' 
                    ? "Aucune note n'est importée pour cet élève dans ce trimestre."
                    : "Il manque plusieurs notes non importées pour cet élève dans ce trimestre."
                  }
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowBulletinWarningModal(false)}
                    className="py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all text-sm"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => {
                      setShowBulletinWarningModal(false);
                      generateBulletin(bulletinWarningData.eleve, bulletinWarningData.preview, bulletinWarningData.evalType);
                    }}
                    className="py-3 rounded-2xl font-bold transition-all text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-100"
                  >
                    Continuer
                  </button>
                </div>
                <button
                  onClick={() => {
                    setShowBulletinWarningModal(false);
                    setShowMotifModal(true);
                  }}
                  className="w-full py-3 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Enregistrer avec motif
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Saisie Motif */}
      {showMotifModal && bulletinWarningData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Motif de l'état du bulletin</h3>
              <button onClick={() => setShowMotifModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">
                Saisissez le motif qui s'affichera en diagonale sur le bulletin de l'élève (ex: Abandon, Malade, Absent).
              </p>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Motif à afficher</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: Abandon"
                  value={bulletinMotif}
                  onChange={e => setBulletinMotif(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowMotifModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (!bulletinMotif.trim()) {
                      toast.error("Veuillez saisir un motif.");
                      return;
                    }
                    setShowMotifModal(false);
                    generateBulletin(bulletinWarningData.eleve, bulletinWarningData.preview, bulletinWarningData.evalType, bulletinMotif);
                    setBulletinMotif('');
                  }}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                >
                  Générer PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Modal Publication Post-Importation (Strictement par cycle) */}
      {showPostImportPublishModal && postImportDetails && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className={`p-6 text-white flex items-center justify-between ${
              postImportDetails.cycle === 'primaire' 
                ? 'bg-gradient-to-r from-amber-600 to-orange-600' 
                : 'bg-gradient-to-r from-indigo-600 to-blue-600'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
                  <Send size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/20 text-white mb-1 inline-block">
                    {postImportDetails.cycle === 'primaire' ? 'Espace Maternelle & Primaire' : 'Espace Secondaire'}
                  </span>
                  <h3 className="text-lg font-bold">Publication des Résultats</h3>
                  <p className="text-xs text-white/90">Notes importées avec succès ({postImportDetails.count} élèves)</p>
                </div>
              </div>
              <button onClick={() => setShowPostImportPublishModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className={`p-4 rounded-2xl border ${
                postImportDetails.cycle === 'primaire'
                  ? 'bg-amber-50 border-amber-100 text-amber-950'
                  : 'bg-indigo-50 border-indigo-100 text-indigo-950'
              }`}>
                <p className="text-xs font-medium">
                  Les notes de la classe <strong>{postImportDetails.classeNom}</strong> pour <strong>{postImportDetails.periodeLabel}</strong> ont été enregistrées en base.
                </p>
                <p className="text-xs mt-1 font-semibold">
                  Souhaitez-vous publier immédiatement ces résultats afin que les parents d'élèves puissent les consulter dans leur espace ?
                </p>
              </div>

              {/* Option Verrouillage Bulletin */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {publishAllowDownload ? <Unlock size={18} className="text-emerald-600" /> : <Lock size={18} className="text-amber-600" />}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Téléchargement du bulletin par les parents</p>
                      <p className="text-[11px] text-slate-500">
                        {publishAllowDownload 
                          ? 'Les parents pourront télécharger le bulletin officiel en PDF' 
                          : 'Les parents consultent les notes à l\'écran, mais le téléchargement PDF est verrouillé'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublishAllowDownload(!publishAllowDownload)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      publishAllowDownload ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium">
                    Appliquer également à toutes les classes du cycle ({postImportDetails.cycle === 'primaire' ? 'Maternelle & Primaire uniquement' : 'Secondaire uniquement'})
                  </span>
                  <input
                    type="checkbox"
                    checked={publishTargetCycle}
                    onChange={(e) => setPublishTargetCycle(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  disabled={isPublishing}
                  onClick={() => handleTogglePublish(true, publishAllowDownload, publishTargetCycle)}
                  className={`w-full py-3 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all text-sm disabled:opacity-50 ${
                    postImportDetails.cycle === 'primaire'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-100'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                  }`}
                >
                  {isPublishing ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  <span>Publier les Résultats Maintenant</span>
                </button>

                <button
                  onClick={() => setShowPostImportPublishModal(false)}
                  className="w-full py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-2xl font-bold text-xs transition-colors"
                >
                  Garder en brouillon (Publier ultérieurement)
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Publier Manuellement (Strictement par cycle) */}
      {showPublishModal && classeDetails && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isPrimary(classeDetails) ? 'bg-amber-500/20 text-amber-400' : 'bg-indigo-500/20 text-indigo-400'
                }`}>
                  <Globe size={20} />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 ${
                    isPrimary(classeDetails) ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {isPrimary(classeDetails) ? 'Espace Maternelle & Primaire' : 'Espace Secondaire'}
                  </span>
                  <h3 className="text-lg font-bold">Publier les Résultats</h3>
                  <p className="text-xs text-slate-400">{classeDetails.nom} — {isPrimary(classeDetails) ? selectedGridEval : `Trimestre ${selectedTrimestre}`}</p>
                </div>
              </div>
              <button onClick={() => setShowPublishModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs text-slate-600">
                La publication rendra les moyennes et notes consultables par les parents sur leur espace privé et permettra aux enseignants de consulter les résultats de la classe.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {publishAllowDownload ? <Unlock size={18} className="text-emerald-600" /> : <Lock size={18} className="text-amber-600" />}
                    <div>
                      <p className="text-xs font-bold text-slate-800">Autoriser le téléchargement du bulletin officiel</p>
                      <p className="text-[11px] text-slate-500">
                        {publishAllowDownload ? 'Les parents peuvent imprimer et télécharger le bulletin PDF' : 'Téléchargement verrouillé pour les parents (consultation écran seule)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPublishAllowDownload(!publishAllowDownload)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      publishAllowDownload ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-xs"></div>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-medium">
                    Étendre la publication à l'ensemble du cycle ({isPrimary(classeDetails) ? 'Maternelle & Primaire uniquement' : 'Secondaire uniquement'})
                  </span>
                  <input
                    type="checkbox"
                    checked={publishTargetCycle}
                    onChange={(e) => setPublishTargetCycle(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-md focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm"
                >
                  Annuler
                </button>
                <button
                  disabled={isPublishing}
                  onClick={() => handleTogglePublish(true, publishAllowDownload, publishTargetCycle)}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPublishing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  <span>Confirmer la publication</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Centre de Gestion de Toutes les Publications (Strictement partitionné par cycle) */}
      {showPublicationsCenterModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 max-h-[92vh] flex flex-col"
          >
            {/* Header Modal */}
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                  pubCenterCycleTab === 'primaire' 
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-200' 
                    : 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-200'
                }`}>
                  <Globe size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">
                      Centre de Publication des Résultats
                    </h3>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      pubCenterCycleTab === 'primaire'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {pubCenterCycleTab === 'primaire' ? 'Espace Maternelle & Primaire' : 'Espace Secondaire'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {pubCenterCycleTab === 'primaire'
                      ? 'Publication par évaluation et verrouillage des bulletins (Maternelle & Primaire)'
                      : 'Publication par trimestre et verrouillage des bulletins (Secondaire)'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowPublicationsCenterModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* In cycle === 'all' context: Two explicit tabs to strictly avoid mixing */}
            {cycle === 'all' && (
              <div className="p-4 bg-slate-50/70 border-b border-slate-200">
                <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPubCenterCycleTab('primaire')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      pubCenterCycleTab === 'primaire'
                        ? 'bg-white text-amber-900 shadow-sm border border-amber-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <GraduationCap size={16} className="text-amber-600" />
                    <span>Espace Maternelle & Primaire (Par Évaluation)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPubCenterCycleTab('secondaire')}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      pubCenterCycleTab === 'secondaire'
                        ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                    }`}
                  >
                    <BookOpen size={16} className="text-indigo-600" />
                    <span>Espace Secondaire (Par Trimestre)</span>
                  </button>
                </div>
              </div>
            )}

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Espace Maternelle & Primaire ONLY */}
              {pubCenterCycleTab === 'primaire' && (
                <div className="space-y-4">
                  <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
                    <Info size={20} className="text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-950 space-y-1">
                      <p className="font-bold text-amber-900">Espace Maternelle & Primaire — Diffusion des Évaluations</p>
                      <p>
                        • Les résultats sont publiés <strong>exclusivement par Évaluation</strong> (Sommative 1 à 5, Formative).
                      </p>
                      <p>
                        • Une fois une évaluation publiée, les parents de maternelle & primaire peuvent consulter les résultats de leur enfant.
                      </p>
                      <p>
                        • Vous pouvez autoriser ou verrouiller le téléchargement du bulletin officiel par évaluation.
                      </p>
                    </div>
                  </div>

                  {/* Tableau des Évaluations Maternelle & Primaire */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-50/60 text-amber-900 uppercase tracking-wider border-b border-amber-200/80 font-bold">
                        <tr>
                          <th className="px-4 py-3">Évaluation</th>
                          <th className="px-4 py-3">Périmètre</th>
                          <th className="px-4 py-3 text-center">Visibilité Notes</th>
                          <th className="px-4 py-3 text-center">Téléchargement Bulletin</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {['EvalSommative1', 'EvalSommative2', 'EvalSommative3', 'EvalSommative4', 'EvalSommative5', 'EvalFormative'].map((evId) => {
                          const pub = publications.find(p => p.type_periode === 'evaluation' && p.periode_valeur === evId && (p.cycle === 'primaire' || !p.cycle));
                          const isPub = pub?.est_publie === 1;
                          const isDl = pub?.bulletin_telechargeable === 1;
                          const evLabel = evId.replace('EvalSommative', 'Sommative ').replace('EvalFormative', 'Formative');

                          return (
                            <tr key={evId} className="hover:bg-amber-50/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                {evLabel}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {pub?.classe_id ? `Classe spécifiée` : `Tout le cycle Maternelle & Primaire`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                  isPub ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isPub ? 'Publié' : 'Non publié'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center justify-center gap-1 w-fit mx-auto ${
                                  isDl ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {isDl ? <Unlock size={11} /> : <Lock size={11} />}
                                  {isDl ? 'Déverrouillé' : 'Verrouillé'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={async () => {
                                      await apiFetch('/api/publications/bulk-cycle', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          cycle: 'primaire',
                                          type_periode: 'evaluation',
                                          periode_valeur: evId,
                                          est_publie: isPub ? 0 : 1,
                                          bulletin_telechargeable: isDl ? 1 : 0
                                        })
                                      });
                                      fetchPublications();
                                      toast.success(isPub ? "Résultats passés en brouillon (Primaire)" : "Résultats publiés pour le Primaire !");
                                    }}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                                      isPub ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-2xs'
                                    }`}
                                  >
                                    {isPub ? 'Dépublier' : 'Publier'}
                                  </button>
                                  {isPub && (
                                    <button
                                      onClick={async () => {
                                        await apiFetch('/api/publications/toggle-bulletin-lock', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            cycle: 'primaire',
                                            type_periode: 'evaluation',
                                            periode_valeur: evId,
                                            bulletin_telechargeable: isDl ? 0 : 1
                                          })
                                        });
                                        fetchPublications();
                                        toast.success(isDl ? "Bulletin primaire verrouillé" : "Bulletin primaire déverrouillé");
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                      title={isDl ? "Verrouiller le téléchargement du bulletin" : "Déverrouiller le téléchargement du bulletin"}
                                    >
                                      {isDl ? <Lock size={13} /> : <Unlock size={13} />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Espace Secondaire ONLY */}
              {pubCenterCycleTab === 'secondaire' && (
                <div className="space-y-4">
                  <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 flex items-start gap-3">
                    <Info size={20} className="text-indigo-700 shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-950 space-y-1">
                      <p className="font-bold text-indigo-900">Espace Secondaire — Diffusion par Trimestre</p>
                      <p>
                        • Les résultats sont publiés <strong>exclusivement par Trimestre</strong> (Trimestre 1, 2, 3).
                      </p>
                      <p>
                        • Une fois le trimestre publié, les parents d'élèves du secondaire peuvent consulter le bulletin officiel.
                      </p>
                      <p>
                        • Vous pouvez autoriser ou verrouiller le téléchargement du bulletin officiel par trimestre.
                      </p>
                    </div>
                  </div>

                  {/* Tableau des Trimestres Secondaire */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-indigo-50/60 text-indigo-900 uppercase tracking-wider border-b border-indigo-200/80 font-bold">
                        <tr>
                          <th className="px-4 py-3">Trimestre</th>
                          <th className="px-4 py-3">Périmètre</th>
                          <th className="px-4 py-3 text-center">Visibilité Notes</th>
                          <th className="px-4 py-3 text-center">Téléchargement Bulletin</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[1, 2, 3].map((trim) => {
                          const trimVal = trim.toString();
                          const pub = publications.find(p => p.type_periode === 'trimestre' && p.periode_valeur === trimVal && (p.cycle === 'secondaire' || !p.cycle));
                          const isPub = pub?.est_publie === 1;
                          const isDl = pub?.bulletin_telechargeable === 1;

                          return (
                            <tr key={trim} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="px-4 py-3 font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                                {trim === 1 ? '1er Trimestre' : trim === 2 ? '2ème Trimestre' : '3ème Trimestre'}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {pub?.classe_id ? `Classe spécifiée` : `Tout le cycle Secondaire`}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                                  isPub ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {isPub ? 'Publié' : 'Non publié'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] flex items-center justify-center gap-1 w-fit mx-auto ${
                                  isDl ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}>
                                  {isDl ? <Unlock size={11} /> : <Lock size={11} />}
                                  {isDl ? 'Déverrouillé' : 'Verrouillé'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={async () => {
                                      await apiFetch('/api/publications/bulk-cycle', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          cycle: 'secondaire',
                                          type_periode: 'trimestre',
                                          periode_valeur: trimVal,
                                          est_publie: isPub ? 0 : 1,
                                          bulletin_telechargeable: isDl ? 1 : 0
                                        })
                                      });
                                      fetchPublications();
                                      toast.success(isPub ? "Résultats passés en brouillon (Secondaire)" : "Résultats publiés pour le Secondaire !");
                                    }}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-colors ${
                                      isPub ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                                    }`}
                                  >
                                    {isPub ? 'Dépublier' : 'Publier'}
                                  </button>
                                  {isPub && (
                                    <button
                                      onClick={async () => {
                                        await apiFetch('/api/publications/toggle-bulletin-lock', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            cycle: 'secondaire',
                                            type_periode: 'trimestre',
                                            periode_valeur: trimVal,
                                            bulletin_telechargeable: isDl ? 0 : 1
                                          })
                                        });
                                        fetchPublications();
                                        toast.success(isDl ? "Bulletin secondaire verrouillé" : "Bulletin secondaire déverrouillé");
                                      }}
                                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
                                      title={isDl ? "Verrouiller le téléchargement du bulletin" : "Déverrouiller le téléchargement du bulletin"}
                                    >
                                      {isDl ? <Lock size={13} /> : <Unlock size={13} />}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Espace actif : <strong className="text-slate-800">{pubCenterCycleTab === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire'}</strong>
              </span>
              <button
                onClick={() => setShowPublicationsCenterModal(false)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs shadow-sm transition-colors"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

