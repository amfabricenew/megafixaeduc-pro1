import React from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  CreditCard, 
  Settings, 
  Users, 
  UserSquare2, 
  Download, 
  Eye, 
  Printer, 
  Upload, 
  Trash2, 
  CheckCircle2, 
  Search, 
  Filter, 
  Sparkles, 
  Building2, 
  FileText,
  ShieldCheck,
  RefreshCw,
  UserCheck,
  Image as ImageIcon,
  Scissors,
  Layers,
  Sliders,
  Check,
  FileDown,
  Info,
  LayoutGrid
} from 'lucide-react';
import toast from 'react-hot-toast';
import SchoolCardView, { CardData, CardSettingsData, SchoolInfoData } from '../components/SchoolCardView';
import { 
  downloadSingleCardImage, 
  generateSingleCardImageDataUrl, 
  generateBatchCardsZip,
  ImageFormat 
} from '../utils/cardImageGenerator';
import {
  generateSingleCardPdf,
  generateBatchCardsPdf,
  PdfExportOptions,
  CardPdfItem
} from '../utils/cardPdfGenerator';

export default function SchoolCards() {
  const [activeTab, setActiveTab] = React.useState<'eleves' | 'staff' | 'settings'>('eleves');
  const [staffSubTab, setStaffSubTab] = React.useState<'enseignants' | 'admin'>('enseignants');

  // Loading & Export States
  const [loading, setLoading] = React.useState(true);
  const [savingSettings, setSavingSettings] = React.useState(false);
  const [generatingImage, setGeneratingImage] = React.useState(false);
  const [generatingPdf, setGeneratingPdf] = React.useState(false);
  const [batchProgress, setBatchProgress] = React.useState<number | null>(null);
  const [pdfProgress, setPdfProgress] = React.useState<{
    percent: number;
    current: number;
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = React.useState<string | number>('all');
  const [selectedFormat, setSelectedFormat] = React.useState<ImageFormat>('png');

  // Export Dialog / Configuration Modal
  const [exportModalOpen, setExportModalOpen] = React.useState(false);
  const [exportModalTarget, setExportModalTarget] = React.useState<'eleves' | 'staff' | 'single'>('eleves');
  const [exportSingleTargetData, setExportSingleTargetData] = React.useState<CardData | null>(null);
  const [exportConfig, setExportConfig] = React.useState<{
    mode: 'grouped_8_a4' | 'single_a4' | 'zip_png' | 'zip_jpeg';
    showCropMarks: boolean;
    showDashedBorders: boolean;
    showCutBorder: boolean;
    showPageHeaders: boolean;
    includePageHeader: boolean;
    showDimensionsLabel: boolean;
  }>({
    mode: 'grouped_8_a4',
    showCropMarks: true,
    showDashedBorders: true,
    showCutBorder: true,
    showPageHeaders: true,
    includePageHeader: true,
    showDimensionsLabel: true
  });

  // Data States
  const [schoolInfo, setSchoolInfo] = React.useState<SchoolInfoData>({
    nom: 'ÉCOLE MAÎTRESSE D\'EXCELLENCE',
    adresse: 'B.P. 123 - Cotonou, Bénin',
    telephone: '+229 01 41 26 42',
    email: 'contact@ecole-excellence.bj',
    annee_active: '2025-2026'
  });

  const [cardSettings, setCardSettings] = React.useState<CardSettingsData>({
    nom_pays: 'RÉPUBLIQUE DU BÉNIN',
    ministere_tutelle: 'MINISTÈRE DE L\'ENSEIGNEMENT SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE',
    drapeau_pays: '',
    signature_directeur: '',
    theme_style: 'classic_emerald',
    titre_signataire: 'auto',
    nom_directeur_custom: 'Francis AYEDEGUE',
    lieu_emission: 'Fait à Cotonou',
    show_lieu_naissance: true,
    show_qr_code: true,
    detected_director_title: 'Le Directeur',
    detected_director_name: 'Francis AYEDEGUE'
  });

  const [classes, setClasses] = React.useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = React.useState<number | string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = React.useState<string>('all');

  const [eleves, setEleves] = React.useState<any[]>([]);
  const [enseignants, setEnseignants] = React.useState<any[]>([]);
  const [personnelAdmin, setPersonnelAdmin] = React.useState<any[]>([]);
  const [teacherCycleFilter, setTeacherCycleFilter] = React.useState<'all' | 'primaire_maternelle' | 'secondaire'>('all');

  const [searchQuery, setSearchQuery] = React.useState('');

  // Preview Modal State
  const [previewCardData, setPreviewCardData] = React.useState<CardData | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState<string | null>(null);
  const [imagePreviewLoading, setImagePreviewLoading] = React.useState<boolean>(false);

  // Preset National Flags (Base64 or clean SVGs)
  const flagPresets = [
    { name: 'Bénin 🇧🇯', url: 'https://flagcdn.com/w80/bj.png' },
    { name: 'Togo 🇹🇬', url: 'https://flagcdn.com/w80/tg.png' },
    { name: 'Côte d\'Ivoire 🇨🇮', url: 'https://flagcdn.com/w80/ci.png' },
    { name: 'Sénégal 🇸🇳', url: 'https://flagcdn.com/w80/sn.png' },
    { name: 'Cameroun 🇨🇲', url: 'https://flagcdn.com/w80/cm.png' },
    { name: 'Burkina Faso 🇧🇫', url: 'https://flagcdn.com/w80/bf.png' },
    { name: 'Mali 🇲🇱', url: 'https://flagcdn.com/w80/ml.png' },
    { name: 'Niger 🇳🇪', url: 'https://flagcdn.com/w80/ne.png' },
    { name: 'France 🇫🇷', url: 'https://flagcdn.com/w80/fr.png' },
  ];

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const [schoolRes, settingsRes, classesRes, elevesRes, teachersRes, staffRes] = await Promise.all([
        apiFetch('/api/school-info').then(r => r.json()).catch(() => ({})),
        apiFetch('/api/card-settings').then(r => r.json()).catch(() => ({})),
        apiFetch(`/api/classes${yearParam}`).then(r => r.json()).catch(() => []),
        apiFetch(`/api/eleves${yearParam}`).then(r => r.json()).catch(() => []),
        apiFetch(`/api/enseignants${yearParam}`).then(r => r.json()).catch(() => []),
        apiFetch(`/api/personnel-administratif${yearParam}`).then(r => r.json()).catch(() => [])
      ]);

      if (schoolRes && schoolRes.nom) {
        setSchoolInfo(schoolRes);
      }

      if (settingsRes && (settingsRes.theme_style || settingsRes.nom_pays || settingsRes.school_id)) {
        const detected = settingsRes.detected_director_name || (Array.isArray(staffRes) && staffRes.length > 0 ? `${staffRes[0].nom} ${staffRes[0].prenom}` : '');
        setCardSettings(prev => ({
          ...prev,
          nom_pays: settingsRes.nom_pays ?? prev.nom_pays ?? '',
          ministere_tutelle: settingsRes.ministere_tutelle ?? prev.ministere_tutelle ?? '',
          drapeau_pays: settingsRes.drapeau_pays ?? prev.drapeau_pays ?? '',
          signature_directeur: settingsRes.signature_directeur ?? prev.signature_directeur ?? '',
          theme_style: settingsRes.theme_style ?? prev.theme_style ?? 'classic_emerald',
          titre_signataire: settingsRes.titre_signataire ?? prev.titre_signataire ?? 'auto',
          lieu_emission: settingsRes.lieu_emission ?? prev.lieu_emission ?? 'Fait à Cotonou',
          show_lieu_naissance: settingsRes.show_lieu_naissance ?? prev.show_lieu_naissance ?? true,
          show_qr_code: settingsRes.show_qr_code ?? prev.show_qr_code ?? true,
          detected_director_title: settingsRes.detected_director_title ?? prev.detected_director_title ?? 'Le Directeur',
          detected_director_name: settingsRes.detected_director_name ?? prev.detected_director_name ?? 'Francis AYEDEGUE',
          nom_directeur_custom: (settingsRes.nom_directeur_custom && settingsRes.nom_directeur_custom.trim() !== '')
            ? settingsRes.nom_directeur_custom
            : (detected || prev.nom_directeur_custom || 'Francis AYEDEGUE')
        }));
      }

      if (Array.isArray(classesRes)) {
        setClasses(classesRes);
      }

      if (Array.isArray(elevesRes)) {
        setEleves(elevesRes);
      }

      if (Array.isArray(teachersRes)) {
        setEnseignants(teachersRes);
      }

      if (Array.isArray(staffRes)) {
        setPersonnelAdmin(staffRes);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors du chargement des données des cartes.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, [selectedYearId]);

  // Save Card Settings
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await apiFetch('/api/card-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardSettings)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Configuration des cartes enregistrée avec succès !');
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur réseau lors de la sauvegarde.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Image Upload Helper for Flag / Signature
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'drapeau_pays' | 'signature_directeur') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image est trop volumineuse (max 2 Mo).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setCardSettings(prev => ({ ...prev, [field]: base64 }));
      toast.success(field === 'drapeau_pays' ? 'Drapeau mis à jour !' : 'Signature numérique mise à jour !');
    };
    reader.readAsDataURL(file);
  };

  // Helper to accurately classify any class into one of the 3 primary levels: Maternelle, Primaire, Secondaire
  const getSchoolLevel = React.useCallback((cls: any): 'Maternelle' | 'Primaire' | 'Secondaire' => {
    if (!cls) return 'Secondaire';
    const nom = (cls.nom || '').toLowerCase().trim();
    const rawNiveau = (cls.niveau || '').toLowerCase().trim();
    const rawCycle = (cls.cycle || '').toLowerCase().trim();

    if (
      rawNiveau.includes('maternelle') ||
      rawCycle.includes('maternelle') ||
      nom.includes('maternelle') ||
      nom.includes('jardin') ||
      nom.includes('section') ||
      ['tps', 'ps', 'ms', 'gs'].some(p => nom.startsWith(p) || nom === p)
    ) {
      return 'Maternelle';
    }

    if (
      rawNiveau.includes('primaire') ||
      rawCycle.includes('primaire') ||
      nom.includes('primaire') ||
      ['ci', 'cp', 'cp1', 'cp2', 'ce1', 'ce2', 'cm1', 'cm2', 'sil'].some(p => nom.startsWith(p) || nom === p)
    ) {
      return 'Primaire';
    }

    return 'Secondaire';
  }, []);

  // Standard official levels
  const levels = React.useMemo(() => {
    return ['Maternelle', 'Primaire', 'Secondaire'];
  }, []);

  const filteredClasses = React.useMemo(() => {
    if (selectedLevelFilter === 'all') return classes;
    return classes.filter(c => getSchoolLevel(c) === selectedLevelFilter);
  }, [classes, selectedLevelFilter, getSchoolLevel]);

  // Filtered Students list
  const filteredEleves = React.useMemo(() => {
    return eleves.filter(e => {
      const cls = classes.find(c => c.id === e.classe_id);
      const matchesLevel = selectedLevelFilter === 'all' || (cls && getSchoolLevel(cls) === selectedLevelFilter);
      const matchesClass = selectedClassId === 'all' || e.classe_id === Number(selectedClassId);
      const matchesSearch = searchQuery === '' || 
        `${e.nom} ${e.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.matricule && e.matricule.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesLevel && matchesClass && matchesSearch;
    });
  }, [eleves, classes, selectedLevelFilter, selectedClassId, searchQuery, getSchoolLevel]);

  // Helper to build teacher card data with cycle, titular class, and main subject
  const getTeacherCardData = React.useCallback((teacher: any): CardData => {
    const isPrimaryOrMaternelle = 
      teacher.cycle?.toLowerCase() === 'primaire' || 
      teacher.cycle?.toLowerCase() === 'maternelle' ||
      (Boolean(teacher.classe_titulaire_nom || classes.find(c => c.enseignant_id === teacher.id)?.nom) && teacher.cycle?.toLowerCase() !== 'secondaire');

    const classeTitulaire = teacher.classe_titulaire_nom || classes.find(c => c.enseignant_id === teacher.id)?.nom || teacher.classes_noms || '';
    
    // Main subject for secondary
    const mainMatiere = teacher.matieres_noms 
      ? teacher.matieres_noms.split(',')[0].trim() 
      : (teacher.matiere_nom || teacher.matiere || 'Enseignant');

    return {
      id: teacher.id,
      type: 'teacher',
      nom: teacher.nom,
      prenom: teacher.prenom,
      matricule: teacher.matricule || `ENS-${teacher.id}`,
      sexe: teacher.sexe || 'M',
      date_naissance: teacher.date_naissance || '',
      lieu_naissance: teacher.lieu_naissance || '',
      cycle: isPrimaryOrMaternelle ? (teacher.cycle || 'primaire') : (teacher.cycle || 'secondaire'),
      classe_titulaire: classeTitulaire,
      classe_nom: classeTitulaire,
      matiere_nom: mainMatiere,
      matiere_principale: mainMatiere,
      poste: teacher.poste,
      telephone: teacher.telephone,
      photo: teacher.photo
    };
  }, [classes]);

  // Filtered Staff list
  const filteredStaff = React.useMemo(() => {
    if (staffSubTab === 'enseignants') {
      return enseignants.filter(e => {
        const matchesSearch = searchQuery === '' || 
          `${e.nom} ${e.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (e.matricule && e.matricule.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (e.matieres_noms && e.matieres_noms.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (e.classe_titulaire_nom && e.classe_titulaire_nom.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (teacherCycleFilter === 'all') return true;

        const isPrimMat = 
          e.cycle?.toLowerCase() === 'primaire' || 
          e.cycle?.toLowerCase() === 'maternelle' ||
          (Boolean(e.classe_titulaire_nom || classes.find(c => c.enseignant_id === e.id)?.nom) && e.cycle?.toLowerCase() !== 'secondaire');

        if (teacherCycleFilter === 'primaire_maternelle') return isPrimMat;
        if (teacherCycleFilter === 'secondaire') return !isPrimMat;

        return true;
      });
    } else {
      return personnelAdmin.filter(p => 
        searchQuery === '' || 
        `${p.nom} ${p.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.matricule && p.matricule.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.poste && p.poste.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
  }, [staffSubTab, enseignants, personnelAdmin, searchQuery, teacherCycleFilter, classes]);

  // Generate single card image preview DataURL
  const generateSingleCardImagePreview = async (cardData: CardData, format: ImageFormat = selectedFormat) => {
    setImagePreviewLoading(true);
    setImagePreviewUrl(null);

    const modalId = `card-render-${cardData.type}-${cardData.id}`;
    const prefix = cardData.type === 'student' ? 'student' : cardData.type === 'teacher' ? 'enseignants' : 'admin';
    const batchId = `batch-card-${prefix}-${cardData.id}`;

    setTimeout(async () => {
      try {
        const elementId = document.getElementById(modalId) ? modalId : batchId;
        const url = await generateSingleCardImageDataUrl(elementId, format, 0.95);
        setImagePreviewUrl(url);
      } catch (err: any) {
        console.error("Image Preview Error:", err);
        toast.error("Erreur lors de la génération de l'aperçu de l'image.");
      } finally {
        setImagePreviewLoading(false);
      }
    }, 250);
  };

  // Open single card preview modal & generate preview
  const handleOpenCardPreview = (cardData: CardData) => {
    setPreviewCardData(cardData);
    generateSingleCardImagePreview(cardData, selectedFormat);
  };

  // Single card image download
  const handleExportSingleImage = async (cardData: CardData, format: ImageFormat = selectedFormat) => {
    setGeneratingImage(true);

    const modalId = `card-render-${cardData.type}-${cardData.id}`;
    const prefix = cardData.type === 'student' ? 'student' : cardData.type === 'teacher' ? 'enseignants' : 'admin';
    const batchId = `batch-card-${prefix}-${cardData.id}`;
    
    setTimeout(async () => {
      try {
        const elementId = document.getElementById(modalId) ? modalId : batchId;
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const filename = `Carte_${cardData.type}_${cardData.nom}_${cardData.prenom}`.replace(/\s+/g, '_') + `.${ext}`;
        await downloadSingleCardImage(elementId, filename, format, 0.95);
        toast.success(`Carte de ${cardData.nom} ${cardData.prenom} enregistrée (${format.toUpperCase()}) !`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Erreur lors de l'enregistrement de l'image.");
      } finally {
        setGeneratingImage(false);
      }
    }, 200);
  };

  // Batch Image ZIP export for entire class
  const handleExportBatchClassImages = async (format: ImageFormat = selectedFormat) => {
    if (filteredEleves.length === 0) {
      toast.error("Aucun élève à exporter.");
      return;
    }

    const activeClassName = classes.find(c => c.id === Number(selectedClassId))?.nom || 'Toute_Ecole';
    setGeneratingImage(true);
    setBatchProgress(0);

    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const zipFilename = `Cartes_Eleves_${activeClassName}_${format.toUpperCase()}`.replace(/\s+/g, '_') + '.zip';

    const items = filteredEleves.map(e => ({
      elementId: `batch-card-student-${e.id}`,
      filename: `Carte_${e.nom}_${e.prenom}_${e.matricule || e.id}.${ext}`.replace(/\s+/g, '_')
    }));

    setTimeout(async () => {
      try {
        await generateBatchCardsZip(items, zipFilename, format, (percent) => {
          setBatchProgress(percent);
        });
        toast.success(`Lot de ${filteredEleves.length} cartes exporté avec succès en ZIP (${format.toUpperCase()}) !`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Erreur lors de la génération du lot d'images.");
      } finally {
        setGeneratingImage(false);
        setBatchProgress(null);
      }
    }, 300);
  };

  // Batch Image ZIP export for staff members
  const handleExportBatchStaffImages = async (format: ImageFormat = selectedFormat) => {
    if (filteredStaff.length === 0) {
      toast.error("Aucun membre à exporter.");
      return;
    }

    const title = staffSubTab === 'enseignants' ? 'Enseignants' : 'Personnel_Admin';
    setGeneratingImage(true);
    setBatchProgress(0);

    const ext = format === 'jpeg' ? 'jpg' : 'png';
    const zipFilename = `Badges_${title}_${format.toUpperCase()}`.replace(/\s+/g, '_') + '.zip';

    const prefix = staffSubTab === 'enseignants' ? 'enseignants' : 'admin';
    const items = filteredStaff.map(s => ({
      elementId: `batch-card-${prefix}-${s.id}`,
      filename: `Badge_${s.nom}_${s.prenom}_${s.matricule || s.id}.${ext}`.replace(/\s+/g, '_')
    }));

    setTimeout(async () => {
      try {
        await generateBatchCardsZip(items, zipFilename, format, (percent) => {
          setBatchProgress(percent);
        });
        toast.success(`Lot de ${filteredStaff.length} badges exporté avec succès en ZIP (${format.toUpperCase()}) !`);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Erreur lors de la génération du lot d'images.");
      } finally {
        setGeneratingImage(false);
        setBatchProgress(null);
      }
    }, 300);
  };

  // Single Card PDF Export (A4 page with high-res card & crop marks)
  const handleExportSinglePdf = async (cardData: CardData, customOptions?: Partial<PdfExportOptions>) => {
    setGeneratingPdf(true);
    const modalId = `card-render-${cardData.type}-${cardData.id}`;
    const prefix = cardData.type === 'student' ? 'student' : cardData.type === 'teacher' ? 'enseignants' : 'admin';
    const batchId = `batch-card-${prefix}-${cardData.id}`;

    setTimeout(async () => {
      try {
        const elementId = document.getElementById(modalId) ? modalId : batchId;
        const filename = `Carte_${cardData.type}_${cardData.nom}_${cardData.prenom}_A4`.replace(/\s+/g, '_') + '.pdf';
        
        await generateSingleCardPdf(elementId, filename, {
          showCropMarks: customOptions?.showCropMarks ?? exportConfig.showCropMarks,
          showDashedBorders: customOptions?.showDashedBorders ?? exportConfig.showDashedBorders,
          showPageHeaders: customOptions?.showPageHeaders ?? exportConfig.showPageHeaders,
          showDimensionsLabel: customOptions?.showDimensionsLabel ?? exportConfig.showDimensionsLabel,
          schoolName: schoolInfo.nom,
          academicYear: schoolInfo.annee_active,
          ...customOptions
        });

        toast.success(`PDF A4 haute résolution généré pour ${cardData.nom} ${cardData.prenom} !`);
      } catch (err: any) {
        console.error("PDF Export Error:", err);
        toast.error(err.message || "Erreur lors de la génération du PDF.");
      } finally {
        setGeneratingPdf(false);
      }
    }, 250);
  };

  // Batch Students PDF Export (Grouped 8 per A4 page OR 1 per page)
  const handleExportBatchClassPdf = async (
    mode: 'grouped_8_a4' | 'single_a4' = 'grouped_8_a4',
    customOptions?: Partial<PdfExportOptions>
  ) => {
    if (filteredEleves.length === 0) {
      toast.error("Aucun élève à exporter.");
      return;
    }

    const activeClassName = classes.find(c => c.id === Number(selectedClassId))?.nom || 'Toute_Ecole';
    setGeneratingPdf(true);
    setPdfProgress({ percent: 0, current: 0, total: filteredEleves.length, page: 1, totalPages: Math.ceil(filteredEleves.length / (mode === 'grouped_8_a4' ? 8 : 1)) });

    const filename = `Cartes_Eleves_${activeClassName}_${mode === 'grouped_8_a4' ? 'Planche_A4_8x' : 'Individuel_A4'}`.replace(/\s+/g, '_') + '.pdf';

    const items: CardPdfItem[] = filteredEleves.map(e => ({
      elementId: `batch-card-student-${e.id}`,
      title: `${e.nom} ${e.prenom}`,
      subtitle: `${e.classe_nom || ''} • Mat: ${e.matricule || e.id}`
    }));

    setTimeout(async () => {
      try {
        await generateBatchCardsPdf(items, filename, {
          mode,
          showCropMarks: customOptions?.showCropMarks ?? exportConfig.showCropMarks,
          showDashedBorders: customOptions?.showDashedBorders ?? exportConfig.showDashedBorders,
          showPageHeaders: customOptions?.showPageHeaders ?? exportConfig.showPageHeaders,
          showDimensionsLabel: customOptions?.showDimensionsLabel ?? exportConfig.showDimensionsLabel,
          schoolName: schoolInfo.nom,
          academicYear: schoolInfo.annee_active,
          groupTitle: `Planche Cartes Scolaires — Classe : ${activeClassName}`,
          ...customOptions
        }, (progress) => {
          setPdfProgress(progress);
        });

        const totalPages = Math.ceil(filteredEleves.length / (mode === 'grouped_8_a4' ? 8 : 1));
        toast.success(`PDF (${filteredEleves.length} élèves • ${totalPages} page${totalPages > 1 ? 's' : ''} A4) exporté avec succès !`);
      } catch (err: any) {
        console.error("Batch PDF Export Error:", err);
        toast.error(err.message || "Erreur lors de la génération du lot PDF.");
      } finally {
        setGeneratingPdf(false);
        setPdfProgress(null);
      }
    }, 300);
  };

  // Batch Staff PDF Export (Grouped 8 per A4 page OR 1 per page)
  const handleExportBatchStaffPdf = async (
    mode: 'grouped_8_a4' | 'single_a4' = 'grouped_8_a4',
    customOptions?: Partial<PdfExportOptions>
  ) => {
    if (filteredStaff.length === 0) {
      toast.error("Aucun membre du personnel à exporter.");
      return;
    }

    const title = staffSubTab === 'enseignants' ? 'Corps_Enseignant' : 'Personnel_Administratif';
    const displayTitle = staffSubTab === 'enseignants' ? 'Corps Enseignant' : 'Personnel Administratif';
    setGeneratingPdf(true);
    setPdfProgress({ percent: 0, current: 0, total: filteredStaff.length, page: 1, totalPages: Math.ceil(filteredStaff.length / (mode === 'grouped_8_a4' ? 8 : 1)) });

    const filename = `Badges_${title}_${mode === 'grouped_8_a4' ? 'Planche_A4_8x' : 'Individuel_A4'}`.replace(/\s+/g, '_') + '.pdf';

    const prefix = staffSubTab === 'enseignants' ? 'enseignants' : 'admin';
    const items: CardPdfItem[] = filteredStaff.map(s => ({
      elementId: `batch-card-${prefix}-${s.id}`,
      title: `${s.nom} ${s.prenom}`,
      subtitle: `${s.poste || (staffSubTab === 'enseignants' ? 'Enseignant' : 'Personnel')} • Mat: ${s.matricule || s.id}`
    }));

    setTimeout(async () => {
      try {
        await generateBatchCardsPdf(items, filename, {
          mode,
          showCropMarks: customOptions?.showCropMarks ?? exportConfig.showCropMarks,
          showDashedBorders: customOptions?.showDashedBorders ?? exportConfig.showDashedBorders,
          showPageHeaders: customOptions?.showPageHeaders ?? exportConfig.showPageHeaders,
          showDimensionsLabel: customOptions?.showDimensionsLabel ?? exportConfig.showDimensionsLabel,
          schoolName: schoolInfo.nom,
          academicYear: schoolInfo.annee_active,
          groupTitle: `Planche Badges Professionnels — ${displayTitle}`,
          ...customOptions
        }, (progress) => {
          setPdfProgress(progress);
        });

        const totalPages = Math.ceil(filteredStaff.length / (mode === 'grouped_8_a4' ? 8 : 1));
        toast.success(`PDF (${filteredStaff.length} badges • ${totalPages} page${totalPages > 1 ? 's' : ''} A4) exporté avec succès !`);
      } catch (err: any) {
        console.error("Batch Staff PDF Export Error:", err);
        toast.error(err.message || "Erreur lors de la génération du lot PDF.");
      } finally {
        setGeneratingPdf(false);
        setPdfProgress(null);
      }
    }, 300);
  };

  // Open Export Modal
  const handleOpenExportModal = (target: 'eleves' | 'staff' | 'single', singleData?: CardData) => {
    setExportModalTarget(target);
    if (singleData) {
      setExportSingleTargetData(singleData);
      setExportConfig(prev => ({ ...prev, mode: 'single_a4' }));
    } else {
      setExportSingleTargetData(null);
      setExportConfig(prev => ({ ...prev, mode: 'grouped_8_a4' }));
    }
    setExportModalOpen(true);
  };

  // Trigger export from modal
  const handleExecuteConfiguredExport = () => {
    setExportModalOpen(false);

    if (exportConfig.mode === 'zip_png') {
      if (exportModalTarget === 'eleves') {
        handleExportBatchClassImages('png');
      } else if (exportModalTarget === 'staff') {
        handleExportBatchStaffImages('png');
      } else if (exportSingleTargetData) {
        handleExportSingleImage(exportSingleTargetData, 'png');
      }
    } else if (exportConfig.mode === 'zip_jpeg') {
      if (exportModalTarget === 'eleves') {
        handleExportBatchClassImages('jpeg');
      } else if (exportModalTarget === 'staff') {
        handleExportBatchStaffImages('jpeg');
      } else if (exportSingleTargetData) {
        handleExportSingleImage(exportSingleTargetData, 'jpeg');
      }
    } else {
      // PDF Export
      if (exportModalTarget === 'eleves') {
        handleExportBatchClassPdf(exportConfig.mode, exportConfig);
      } else if (exportModalTarget === 'staff') {
        handleExportBatchStaffPdf(exportConfig.mode, exportConfig);
      } else if (exportSingleTargetData) {
        handleExportSinglePdf(exportSingleTargetData, exportConfig);
      }
    }
  };

  // Sample data for preview in settings tab
  const sampleCardData: CardData = {
    id: 'DEMO-01',
    type: 'student',
    nom: 'KOUASSI',
    prenom: 'Jean-Baptiste',
    matricule: '2025-MAT-042',
    sexe: 'M',
    date_naissance: '2012-05-14',
    lieu_naissance: 'Cotonou',
    classe_nom: '6ème A',
    tel_parent: '+229 97 00 11 22',
    photo: ''
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-primary-900 text-white p-6 rounded-2xl shadow-lg border border-slate-700/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 text-primary-300 font-bold text-xs uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <CreditCard size={16} />
              <span>Format Officiel : 8,5 cm x 5,5 cm (Paysage)</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 rounded-lg border border-white/10">
              <Filter size={12} className="text-white/60" />
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-[10px] font-bold text-white bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
              >
                <option value="all" className="text-slate-900">Toutes les années</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id} className="text-slate-900">Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Cartes Scolaires & Badges de Travail
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Concevez, personnalisez et imprimez en haute définition les cartes scolaires des élèves et badges professionnels des enseignants et du personnel administratif.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/15 self-stretch md:self-auto justify-center">
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'eleves' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <Users size={16} />
            <span>Élèves</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'staff' ? 'bg-primary-600 text-white shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <UserSquare2 size={16} />
            <span>Personnel & Profs</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'settings' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-200 hover:bg-white/10'
            }`}
          >
            <Settings size={16} />
            <span>Personnalisation</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3"></div>
          <p className="text-sm font-medium text-slate-500">Chargement des modules de cartes...</p>
        </div>
      ) : (
        <>
          {/* ================= TAB 1: CARTES SCOLAIRES ÉLÈVES ================= */}
          {activeTab === 'eleves' && (
            <div className="space-y-6">
              {/* Level & Class Buttons Toolbar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Filter size={18} className="text-primary-600" />
                      Sélection de la classe pour aperçu & impression
                    </h2>
                    <p className="text-xs text-slate-500">
                      Filtrer par niveau puis choisir la classe correspondante
                    </p>
                  </div>

                  {/* Level Filters */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => { setSelectedLevelFilter('all'); setSelectedClassId('all'); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        selectedLevelFilter === 'all' 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tous les niveaux
                    </button>
                    {levels.map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => { setSelectedLevelFilter(lvl); setSelectedClassId('all'); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          selectedLevelFilter === lvl 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class Selection Buttons */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Classes disponibles ({filteredClasses.length}) :
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedClassId('all')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 ${
                        selectedClassId === 'all'
                          ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-102'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span>Toutes les classes</span>
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                        selectedClassId === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {eleves.length}
                      </span>
                    </button>

                    {filteredClasses.map(cls => {
                      const count = eleves.filter(e => e.classe_id === cls.id).length;
                      const isSelected = selectedClassId === cls.id;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => setSelectedClassId(cls.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-2 ${
                            isSelected
                              ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-102'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span>{cls.nom}</span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Bar & Search */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 w-full md:w-auto">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un élève par nom, prénom ou matricule..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none"
                  />
                </div>

                {/* Batch Action Buttons (PDF Planche A4 8x, Options & Images) */}
                <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                  {/* Primary: PDF Batch Export (Planche A4 8 cartes / page) */}
                  <button
                    onClick={() => handleExportBatchClassPdf('grouped_8_a4')}
                    disabled={generatingPdf || generatingImage || filteredEleves.length === 0}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    title="Exporter toutes les cartes de la sélection sur papier A4 en grille de 8 cartes avec traits de découpage"
                  >
                    <Printer size={16} />
                    <span>Planche PDF A4 (8/page)</span>
                    <span className="px-1.5 py-0.5 bg-rose-800/60 rounded-md text-[10px] font-bold">
                      {Math.ceil(filteredEleves.length / 8)} page{Math.ceil(filteredEleves.length / 8) > 1 ? 's' : ''}
                    </span>
                  </button>

                  {/* Options Button */}
                  <button
                    onClick={() => handleOpenExportModal('eleves')}
                    disabled={generatingPdf || generatingImage || filteredEleves.length === 0}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    title="Personnaliser le format d'export PDF et les options de découpe"
                  >
                    <Sliders size={15} />
                    <span>Options...</span>
                  </button>

                  {/* ZIP Images button */}
                  <button
                    onClick={() => handleExportBatchClassImages('png')}
                    disabled={generatingPdf || generatingImage || filteredEleves.length === 0}
                    className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    title="Enregistrer toutes les cartes en images individuelles haute résolution (Archive ZIP)"
                  >
                    <Download size={15} />
                    <span>ZIP PNG</span>
                  </button>
                </div>
              </div>

              {/* Batch Generation Progress Indicator (ZIP) */}
              {batchProgress !== null && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Exportation des cartes en images (ZIP) en cours...</span>
                    <span>{batchProgress}%</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${batchProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Students List Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Liste des élèves ({filteredEleves.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Dimensions réelles : 85 × 55 mm • Idéal pour papier A4 160g-250g ou PVC
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenExportModal('eleves')}
                    className="text-xs text-primary-600 hover:text-primary-800 font-bold flex items-center gap-1 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100"
                  >
                    <Scissors size={13} />
                    <span>Guides & Traits de découpage</span>
                  </button>
                </div>

                {filteredEleves.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-600">Aucun élève trouvé pour ces critères.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">Photo</th>
                          <th className="px-4 py-3">Matricule</th>
                          <th className="px-4 py-3">Nom & Prénoms</th>
                          <th className="px-4 py-3">Sexe</th>
                          <th className="px-4 py-3">Né(e) le / Lieu</th>
                          <th className="px-4 py-3">Classe</th>
                          <th className="px-4 py-3 text-right">Exportations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEleves.map(student => {
                          const cardData: CardData = {
                            id: student.id,
                            type: 'student',
                            nom: student.nom,
                            prenom: student.prenom,
                            matricule: student.matricule,
                            sexe: student.sexe,
                            date_naissance: student.date_naissance,
                            lieu_naissance: student.lieu_naissance,
                            classe_nom: student.classe_nom,
                            tel_parent: student.tel_parent || student.telephone_parent || student.tel_tuteur || student.telephone,
                            photo: student.photo
                          };

                          return (
                            <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5 text-center">
                                <div className="w-9 h-11 rounded-md bg-slate-200 overflow-hidden mx-auto border border-slate-300 flex items-center justify-center">
                                  {student.photo ? (
                                    <img src={student.photo} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400">
                                      {student.nom?.charAt(0)}{student.prenom?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                                {student.matricule || 'N/A'}
                              </td>
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                {student.nom} {student.prenom}
                              </td>
                              <td className="px-4 py-2.5 font-medium text-slate-600">
                                {student.sexe === 'M' ? 'Masculin' : student.sexe === 'F' ? 'Féminin' : (student.sexe || '-')}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">
                                {student.date_naissance || '-'} {student.lieu_naissance ? `à ${student.lieu_naissance}` : ''}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 bg-primary-50 text-primary-700 font-bold text-[11px] rounded-md border border-primary-100">
                                  {student.classe_nom}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                                {/* Aperçu button */}
                                <button
                                  onClick={() => handleOpenCardPreview(cardData)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1"
                                  title="Aperçu visuel de la carte"
                                >
                                  <Eye size={13} />
                                  <span>Aperçu</span>
                                </button>

                                {/* PDF Single A4 button */}
                                <button
                                  onClick={() => handleExportSinglePdf(cardData)}
                                  disabled={generatingPdf}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                                  title="Exporter en PDF sur feuille A4 avec traits de découpage et dimensions d'impression"
                                >
                                  <FileText size={13} />
                                  <span>PDF A4</span>
                                </button>

                                {/* PNG button */}
                                <button
                                  onClick={() => handleExportSingleImage(cardData, 'png')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                                  title="Télécharger image PNG HD"
                                >
                                  <Download size={13} />
                                  <span>PNG</span>
                                </button>

                                {/* JPEG button */}
                                <button
                                  onClick={() => handleExportSingleImage(cardData, 'jpeg')}
                                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                                  title="Télécharger image JPEG HD"
                                >
                                  <Download size={13} />
                                  <span>JPG</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 2: BADGES ENSEIGNANTS & STAFF ================= */}
          {activeTab === 'staff' && (
            <div className="space-y-6">
              {/* Sub tab selector & filters */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setStaffSubTab('enseignants')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      staffSubTab === 'enseignants'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <UserSquare2 size={16} />
                    <span>Enseignants ({enseignants.length})</span>
                  </button>
                  <button
                    onClick={() => setStaffSubTab('admin')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                      staffSubTab === 'admin'
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Building2 size={16} />
                    <span>Personnel Admin ({personnelAdmin.length})</span>
                  </button>

                  {/* Cycle filters for Teachers */}
                  {staffSubTab === 'enseignants' && (
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80 ml-1">
                      <button
                        onClick={() => setTeacherCycleFilter('all')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          teacherCycleFilter === 'all'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tous
                      </button>
                      <button
                        onClick={() => setTeacherCycleFilter('primaire_maternelle')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          teacherCycleFilter === 'primaire_maternelle'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Maternelle & Primaire
                      </button>
                      <button
                        onClick={() => setTeacherCycleFilter('secondaire')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                          teacherCycleFilter === 'secondaire'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Secondaire
                      </button>
                    </div>
                  )}
                </div>

                {/* Search */}
                <div className="relative flex-1 max-w-md w-full">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={staffSubTab === 'enseignants' ? "Rechercher enseignant, matière, classe..." : "Rechercher par nom, prénom, poste..."}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>

              {/* Staff List Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-slate-50">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Badges de travail - {staffSubTab === 'enseignants' ? 'Corps Enseignant' : 'Personnel Administratif'} ({filteredStaff.length})
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">Format d'impression : 8,5 cm x 5,5 cm • Dimensions officielles ISO ID-1</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary: Planche PDF 8/page */}
                    <button
                      onClick={() => handleExportBatchStaffPdf('grouped_8_a4')}
                      disabled={generatingPdf || generatingImage || filteredStaff.length === 0}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                      title="Exporter tous les badges en PDF sur papier A4 (Planche de 8 badges par page avec traits de découpage)"
                    >
                      <Printer size={15} />
                      <span>Planche PDF A4 (8/page)</span>
                      <span className="px-1.5 py-0.5 bg-rose-800/60 rounded-md text-[10px] font-bold">
                        {Math.ceil(filteredStaff.length / 8)} page{Math.ceil(filteredStaff.length / 8) > 1 ? 's' : ''}
                      </span>
                    </button>

                    {/* Options button */}
                    <button
                      onClick={() => handleOpenExportModal('staff')}
                      disabled={generatingPdf || generatingImage || filteredStaff.length === 0}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      title="Options et formats d'exportation PDF/Images"
                    >
                      <Sliders size={14} />
                      <span>Options...</span>
                    </button>

                    {/* ZIP Images button */}
                    <button
                      onClick={() => handleExportBatchStaffImages('png')}
                      disabled={generatingPdf || generatingImage || filteredStaff.length === 0}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                      title="Enregistrer tous les badges en images PNG HD (ZIP)"
                    >
                      <Download size={14} />
                      <span>ZIP PNG</span>
                    </button>
                  </div>
                </div>

                {filteredStaff.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm font-semibold text-slate-600">Aucun membre trouvé.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-bold tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center">Photo</th>
                          <th className="px-4 py-3">Nom & Prénoms</th>
                          <th className="px-4 py-3">{staffSubTab === 'enseignants' ? 'Rôle (Titulaire / Matière)' : 'Poste'}</th>
                          <th className="px-4 py-3">Contact</th>
                          <th className="px-4 py-3 text-right">Exportations</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStaff.map((member: any) => {
                          const cardData: CardData = staffSubTab === 'enseignants'
                            ? getTeacherCardData(member)
                            : {
                                id: member.id,
                                type: 'staff',
                                nom: member.nom,
                                prenom: member.prenom,
                                matricule: member.matricule || `EMP-${member.id}`,
                                sexe: member.sexe || 'M',
                                date_naissance: member.date_naissance || '',
                                lieu_naissance: member.lieu_naissance || '',
                                poste: member.poste,
                                telephone: member.telephone,
                                photo: member.photo
                              };

                          const isTeacher = staffSubTab === 'enseignants';
                          const isPrimaryOrMaternelleTeacher = isTeacher && (
                            member.cycle?.toLowerCase() === 'primaire' || 
                            member.cycle?.toLowerCase() === 'maternelle' ||
                            (Boolean(member.classe_titulaire_nom || classes.find(c => c.enseignant_id === member.id)?.nom) && member.cycle?.toLowerCase() !== 'secondaire')
                          );

                          return (
                            <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-2.5 text-center">
                                <div className="w-9 h-11 rounded-md bg-slate-200 overflow-hidden mx-auto border border-slate-300 flex items-center justify-center">
                                  {member.photo ? (
                                    <img src={member.photo} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-500">
                                      {member.nom?.charAt(0)}{member.prenom?.charAt(0)}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-2.5 font-bold text-slate-900">
                                {member.nom} {member.prenom}
                              </td>
                              <td className="px-4 py-2.5">
                                {isTeacher ? (
                                  isPrimaryOrMaternelleTeacher ? (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 font-bold text-[11px] rounded-lg border border-emerald-200/80">
                                      <span className="text-[10px] uppercase font-black text-emerald-600">Titulaire :</span>
                                      <span>{cardData.classe_titulaire || cardData.classe_nom || 'Titulaire'}</span>
                                    </div>
                                  ) : (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-800 font-bold text-[11px] rounded-lg border border-indigo-200/80">
                                      <span className="text-[10px] uppercase font-black text-indigo-600">Matière :</span>
                                      <span>{cardData.matiere_principale || cardData.matiere_nom || 'Enseignant'}</span>
                                    </div>
                                  )
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold text-[11px] rounded-md border border-slate-200">
                                    {member.poste || 'Personnel'}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-slate-600">
                                {member.telephone || member.email || '-'}
                              </td>
                              <td className="px-4 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleOpenCardPreview(cardData)}
                                  className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1"
                                  title="Aperçu du badge"
                                >
                                  <Eye size={13} />
                                  <span>Aperçu</span>
                                </button>
                                <button
                                  onClick={() => handleExportSinglePdf(cardData)}
                                  disabled={generatingPdf}
                                  className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs disabled:opacity-50"
                                  title="Exporter le badge en PDF A4 avec traits de découpage"
                                >
                                  <FileText size={13} />
                                  <span>PDF A4</span>
                                </button>
                                <button
                                  onClick={() => handleExportSingleImage(cardData, 'png')}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                                  title="Télécharger image PNG HD"
                                >
                                  <Download size={13} />
                                  <span>PNG</span>
                                </button>
                                <button
                                  onClick={() => handleExportSingleImage(cardData, 'jpeg')}
                                  className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-xs"
                                  title="Télécharger image JPEG HD"
                                >
                                  <Download size={13} />
                                  <span>JPG</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================= TAB 3: PERSONNALISATION ET CONFIGURATION ================= */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Controls */}
              <div className="lg:col-span-7 space-y-6">
                {/* Section 1: Informations de l'école & Signataire */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Building2 size={18} className="text-primary-600" />
                        Informations & Signataire de la Carte
                      </h3>
                      <p className="text-xs text-slate-500">
                        Configuration des éléments imprimés sur le recto de la carte
                      </p>
                    </div>
                  </div>

                  {/* Nom du Pays & Ministère */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Nom du Pays (affiché au-dessus du nom de l'école)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: RÉPUBLIQUE DU BÉNIN"
                        value={cardSettings.nom_pays || ''}
                        onChange={e => setCardSettings(p => ({ ...p, nom_pays: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">
                        Ministère en charge de l'enseignement
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: MINISTÈRE DE L'ENSEIGNEMENT SECONDAIRE..."
                        value={cardSettings.ministere_tutelle || ''}
                        onChange={e => setCardSettings(p => ({ ...p, ministere_tutelle: e.target.value }))}
                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Signataire & Direction de l'Établissement */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                        <UserCheck size={16} className="text-primary-600" />
                        Signataire de la Carte (Direction)
                      </label>
                      <span className="text-[10px] text-slate-500 font-medium">
                        Affiché en bas à droite
                      </span>
                    </div>

                    {/* Sélection rapide parmi le personnel administratif */}
                    {personnelAdmin && personnelAdmin.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600 block">
                          Sélectionner un membre du personnel de direction (optionnel) :
                        </label>
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!val) return;
                            const staff = personnelAdmin.find(p => String(p.id) === val);
                            if (staff) {
                              const isFem = staff.sexe === 'F' || staff.sexe === 'Féminin' || (staff.poste || '').toLowerCase().includes('directrice') || (staff.poste || '').toLowerCase().includes('proviseure') || (staff.poste || '').toLowerCase().includes('principale') || (staff.poste || '').toLowerCase().includes('fondatrice');
                              const pLower = (staff.poste || '').toLowerCase();
                              let title = isFem ? 'La Directrice' : 'Le Directeur';
                              if (pLower.includes('proviseur')) title = isFem ? 'La Proviseure' : 'Le Proviseur';
                              else if (pLower.includes('principal')) title = isFem ? 'La Principale' : 'Le Principal';
                              else if (pLower.includes('fondat')) title = isFem ? 'La Fondatrice' : 'Le Fondateur';
                              
                              const fullName = `${staff.nom} ${staff.prenom}`.trim();
                              setCardSettings(p => ({
                                ...p,
                                titre_signataire: title,
                                nom_directeur_custom: fullName
                              }));
                              toast.success(`Signataire appliqué : ${title} ${fullName}`);
                            }
                          }}
                          defaultValue=""
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">-- Choisir dans la liste du personnel administratif --</option>
                          {personnelAdmin.map((staff: any) => {
                            const isFem = staff.sexe === 'F' || staff.sexe === 'Féminin';
                            return (
                              <option key={staff.id} value={staff.id}>
                                {staff.nom} {staff.prenom} ({staff.poste || 'Personnel'} - {isFem ? 'Femme' : 'Homme'})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}

                    {/* Choix du Titre du signataire */}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Titre du signataire :
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { id: 'auto', label: `Auto (${cardSettings.detected_director_title || 'Le Directeur'})` },
                          { id: 'Le Directeur', label: 'Le Directeur' },
                          { id: 'La Directrice', label: 'La Directrice' },
                          { id: 'Le Proviseur', label: 'Le Proviseur' },
                          { id: 'La Proviseure', label: 'La Proviseure' },
                          { id: 'Le Principal', label: 'Le Principal' },
                          { id: 'La Principale', label: 'La Principale' },
                          { id: 'Le Fondateur', label: 'Le Fondateur' },
                          { id: 'La Fondatrice', label: 'La Fondatrice' },
                          { id: 'custom', label: 'Personnalisé...' }
                        ].map(t => {
                          const isSelected = t.id === 'custom' 
                            ? !['auto', 'Le Directeur', 'La Directrice', 'Le Proviseur', 'La Proviseure', 'Le Principal', 'La Principale', 'Le Fondateur', 'La Fondatrice'].includes(cardSettings.titre_signataire || 'auto')
                            : (cardSettings.titre_signataire === t.id);

                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                if (t.id === 'custom') {
                                  setCardSettings(p => ({ ...p, titre_signataire: 'Le Directeur Général' }));
                                } else {
                                  setCardSettings(p => ({ ...p, titre_signataire: t.id }));
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                                isSelected
                                  ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {t.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* Saisie personnalisée du titre si non standard */}
                      {!['auto', 'Le Directeur', 'La Directrice', 'Le Proviseur', 'La Proviseure', 'Le Principal', 'La Principale', 'Le Fondateur', 'La Fondatrice'].includes(cardSettings.titre_signataire || 'auto') && (
                        <div className="pt-1">
                          <input
                            type="text"
                            placeholder="Saisir le titre exact (ex: Le Directeur Général, La Directrice des Études...)"
                            value={cardSettings.titre_signataire || ''}
                            onChange={e => setCardSettings(p => ({ ...p, titre_signataire: e.target.value }))}
                            className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      )}
                    </div>

                    {/* Nom et Prénom du Signataire */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        Nom et Prénom du signataire (affiché sous la signature) :
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Ex: AYEDEGUE Francis ou Dr. KOUASSI Jean"
                          value={cardSettings.nom_directeur_custom || ''}
                          onChange={e => setCardSettings(p => ({ ...p, nom_directeur_custom: e.target.value }))}
                          className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        {cardSettings.detected_director_name && (
                          <button
                            type="button"
                            onClick={() => setCardSettings(p => ({ ...p, nom_directeur_custom: cardSettings.detected_director_name || '' }))}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                            title="Utiliser le nom détecté"
                          >
                            Nom détecté ({cardSettings.detected_director_name})
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Ce nom apparaîtra en toutes lettres sous la signature numérique en bas à droite de chaque carte.
                      </p>
                    </div>
                  </div>

                  {/* Lieu d'émission */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Lieu d'émission (affiché en bas à gauche)</label>
                    <input
                      type="text"
                      placeholder="Ex: Fait à Cotonou"
                      value={cardSettings.lieu_emission || ''}
                      onChange={e => setCardSettings(p => ({ ...p, lieu_emission: e.target.value }))}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Section 2: Drapeau du Pays & Signature Numérique */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles size={18} className="text-amber-500" />
                      Image du Drapeau & Signature Numérique
                    </h3>
                  </div>

                  {/* Drapeau du pays */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 block">
                      Image du Drapeau du pays (placé à gauche sous l'entête)
                    </label>

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {flagPresets.map(flag => (
                        <button
                          key={flag.name}
                          type="button"
                          onClick={() => setCardSettings(p => ({ ...p, drapeau_pays: flag.url }))}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                            cardSettings.drapeau_pays === flag.url
                              ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <img src={flag.url} alt="" className="w-4 h-2.5 object-cover rounded-2xs" />
                          <span>{flag.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom upload flag */}
                    <div className="flex items-center gap-3 pt-1">
                      <label className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 border border-slate-200">
                        <Upload size={14} />
                        <span>Téléverser mon drapeau</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleFileUpload(e, 'drapeau_pays')}
                        />
                      </label>

                      {cardSettings.drapeau_pays && (
                        <div className="flex items-center gap-2">
                          <img src={cardSettings.drapeau_pays} alt="" className="w-8 h-5 object-cover rounded border border-slate-300" />
                          <button
                            type="button"
                            onClick={() => setCardSettings(p => ({ ...p, drapeau_pays: '' }))}
                            className="p-1 hover:bg-red-50 text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Signature Numérique */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-700 block">
                      Signature numérique du Directeur (optionnelle)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Si elle est importée, elle s'affiche à la place de la signature. Si non, l'espace est laissé libre pour tampon / signature manuelle.
                    </p>

                    <div className="flex items-center gap-4">
                      <label className="px-4 py-2 bg-primary-50 hover:bg-primary-100 text-primary-800 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center gap-2 border border-primary-200">
                        <Upload size={14} />
                        <span>Importer la signature (PNG transparent)</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => handleFileUpload(e, 'signature_directeur')}
                        />
                      </label>

                      {cardSettings.signature_directeur ? (
                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                          <img src={cardSettings.signature_directeur} alt="Signature" className="h-8 max-w-[100px] object-contain" />
                          <button
                            type="button"
                            onClick={() => setCardSettings(p => ({ ...p, signature_directeur: '' }))}
                            className="p-1 hover:bg-red-50 text-red-600 rounded"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Aucune signature numérique enregistrée</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Modèles & Design Graphique */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard size={18} className="text-emerald-600" />
                    Thème & Style Graphique de la Carte
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'classic_emerald', label: 'Émeraude & Or', bg: 'linear-gradient(to right, rgb(6, 78, 59), rgb(6, 95, 70))' },
                      { id: 'royal_blue', label: 'Bleu Roi Prestige', bg: 'linear-gradient(to right, rgb(30, 58, 138), rgb(55, 48, 163))' },
                      { id: 'crimson_gold', label: 'Bordeaux Excellence', bg: 'linear-gradient(to right, rgb(76, 5, 25), rgb(136, 19, 55))' },
                      { id: 'modern_slate', label: 'Ardoise / Dark Modern', bg: 'linear-gradient(to right, rgb(15, 23, 42), rgb(30, 41, 59))' },
                      { id: 'tricolor_light', label: 'Tricolore Épuré', bg: 'linear-gradient(to right, rgb(226, 232, 240), rgb(203, 213, 225))' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCardSettings(p => ({ ...p, theme_style: t.id }))}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                          cardSettings.theme_style === t.id
                            ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-primary-500'
                            : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            style={{ background: t.bg, border: '1px solid rgba(255, 255, 255, 0.2)' }}
                            className="w-6 h-6 rounded-md shadow-xs"
                          ></div>
                          <span className="text-xs font-bold">{t.label}</span>
                        </div>
                        {cardSettings.theme_style === t.id && (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingSettings ? (
                    <>Enregistrement en cours...</>
                  ) : (
                    <>
                      <CheckCircle2 size={18} />
                      Enregistrer la configuration de la carte
                    </>
                  )}
                </button>
              </div>

              {/* Right Column: Live Card Interactive Preview */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-6 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Eye size={18} className="text-amber-400" />
                      <h3 className="text-sm font-bold text-white">Aperçu en direct (8,5 x 5,5 cm)</h3>
                    </div>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full uppercase">
                      Temps réel
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Voici l'aperçu dynamique de la carte selon vos préférences visuelles :
                  </p>

                  {/* Rendered Card Component Container */}
                  <div className="bg-slate-800 p-4 rounded-xl flex items-center justify-center border border-slate-700/60 overflow-hidden shadow-inner min-h-[260px]">
                    <div className="transform scale-95 hover:scale-100 transition-transform">
                      <SchoolCardView
                        data={sampleCardData}
                        schoolInfo={schoolInfo}
                        settings={cardSettings}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-[11px] text-slate-300 space-y-1">
                    <p className="font-bold text-amber-400 flex items-center gap-1.5">
                      <ShieldCheck size={14} />
                      Spécifications de la carte :
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-slate-400">
                      <li>Taille réelle à l'impression : <strong>85 mm x 55 mm</strong></li>
                      <li>Inclus entête avec logo, photo, informations et signature</li>
                      <li>Compatible avec imprimantes PVC et papier cartonné</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= MODAL APERÇU UNIQUE DE LA CARTE ================= */}
      {previewCardData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-lg">
                  💳
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Aperçu de la Carte
                  </h3>
                  <p className="text-xs text-slate-500">
                    {previewCardData.nom} {previewCardData.prenom} — Format officiel (8,5 cm x 5,5 cm - 300 DPI)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setPreviewCardData(null)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
              >
                ✕ Fermer
              </button>
            </div>

            {/* Single Centered Card Preview */}
            <div className="space-y-4 flex flex-col items-center">
              <div className="w-full bg-slate-900 p-6 md:p-8 rounded-2xl flex items-center justify-center border border-slate-800 shadow-inner overflow-hidden">
                <div className="transform hover:scale-105 transition-transform">
                  <SchoolCardView
                    data={previewCardData}
                    schoolInfo={schoolInfo}
                    settings={cardSettings}
                    elementId={`card-render-${previewCardData.type}-${previewCardData.id}`}
                  />
                </div>
              </div>

              <div className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Résolution HD 300 DPI (8,5 x 5,5 cm)</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Couleurs & dimensions haute définition pour impression</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2 flex-wrap sm:flex-nowrap">
              <button
                onClick={() => setPreviewCardData(null)}
                className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
              >
                Fermer
              </button>

              <button
                onClick={() => {
                  handleExportSinglePdf(previewCardData, { showCropMarks: true, showCutBorder: true });
                }}
                disabled={generatingPdf}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                title="Générer un fichier PDF A4 haute résolution avec traits de découpage"
              >
                <FileText size={16} />
                <span>Imprimer / PDF A4</span>
              </button>

              <button
                onClick={() => handleExportSingleImage(previewCardData, 'png')}
                disabled={generatingImage}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={16} />
                <span>PNG</span>
              </button>

              <button
                onClick={() => handleExportSingleImage(previewCardData, 'jpeg')}
                disabled={generatingImage}
                className="py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Download size={16} />
                <span>JPG</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CONFIGURATION DE L'EXPORTATION PDF ================= */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-6 my-auto flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg">
                  <Printer size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Configuration d'Impression & Export PDF
                  </h3>
                  <p className="text-xs text-slate-500">
                    {exportModalTarget === 'eleves'
                      ? `Élèves : ${filteredEleves.length} carte(s) sélectionnée(s)`
                      : exportModalTarget === 'staff'
                      ? `Personnel : ${filteredStaff.length} badge(s) sélectionné(s)`
                      : `Carte de ${exportSingleTargetData?.nom || ''} ${exportSingleTargetData?.prenom || ''}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExportModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Configuration Form */}
            <div className="space-y-4 text-xs">
              {/* Layout Mode */}
              <div className="space-y-2">
                <label className="font-extrabold text-slate-800 uppercase tracking-wider block">
                  Disposition des cartes sur le papier A4
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Grouped 8 cards / page (4x2) */}
                  <div
                    onClick={() => setExportConfig(prev => ({ ...prev, mode: 'grouped_8_a4' }))}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      exportConfig.mode === 'grouped_8_a4'
                        ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <LayoutGrid size={15} className="text-rose-600" />
                        Planche 8 cartes (4×2)
                      </span>
                      {exportConfig.mode === 'grouped_8_a4' && (
                        <Check size={16} className="text-rose-600 font-bold" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      8 cartes par feuille A4 (2 colonnes × 4 rangées). Économique et optimisé pour le mass-printing.
                    </p>
                    <div className="mt-2 text-[10px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md inline-block">
                      {Math.ceil((exportModalTarget === 'eleves' ? filteredEleves.length : filteredStaff.length) / 8)} page(s) A4
                    </div>
                  </div>

                  {/* Option 2: Single Card centered per A4 page */}
                  <div
                    onClick={() => setExportConfig(prev => ({ ...prev, mode: 'single_a4' }))}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      exportConfig.mode === 'single_a4'
                        ? 'border-rose-600 bg-rose-50/50 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                        <FileText size={15} className="text-rose-600" />
                        Carte Unique (1 / A4)
                      </span>
                      {exportConfig.mode === 'single_a4' && (
                        <Check size={16} className="text-rose-600 font-bold" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Une seule carte parfaitement centrée sur chaque page A4 avec repères de découpage.
                    </p>
                    <div className="mt-2 text-[10px] font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-md inline-block">
                      {exportModalTarget === 'eleves' ? filteredEleves.length : exportModalTarget === 'staff' ? filteredStaff.length : 1} page(s) A4
                    </div>
                  </div>
                </div>
              </div>

              {/* Cutting & Printing Options */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <Scissors size={15} className="text-slate-600" />
                  <span>Repères & Traits de découpage</span>
                </div>

                {/* Toggle: Crop Marks (Traits aux coins) */}
                <label className="flex items-center justify-between cursor-pointer group select-none">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs group-hover:text-primary-600 transition-colors">
                      Traits de découpe aux angles (Crop Marks)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Guides en croix aux 4 coins de chaque carte pour guidage cutter/massicot
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!exportConfig.showCropMarks}
                    onChange={e => setExportConfig(prev => ({ ...prev, showCropMarks: e.target.checked }))}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                </label>

                {/* Toggle: Cut Border (Contour pointillé) */}
                <label className="flex items-center justify-between cursor-pointer group select-none pt-1 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs group-hover:text-primary-600 transition-colors">
                      Lignes de coupe fines (Bordures de découpage)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Fine délimitation grise facilitant le découpage aux ciseaux
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!exportConfig.showCutBorder}
                    onChange={e => setExportConfig(prev => ({ ...prev, showCutBorder: e.target.checked }))}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                </label>

                {/* Toggle: Header Info on A4 */}
                <label className="flex items-center justify-between cursor-pointer group select-none pt-1 border-t border-slate-200">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs group-hover:text-primary-600 transition-colors">
                      En-tête de page A4 avec informations d'impression
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Nom de l'école, classe, date d'édition et numérotation des pages
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={!!exportConfig.includePageHeader}
                    onChange={e => setExportConfig(prev => ({ ...prev, includePageHeader: e.target.checked }))}
                    className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Quality Info Callout */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2.5">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Qualité d'impression :</strong> Les cartes sont générées en haute résolution (300 DPI) au format standard <strong>8,5 cm × 5,5 cm</strong> (85 × 55 mm). Pour un résultat optimal, utilisez du papier cartonné 180g-250g ou du film PVC perforable.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                Annuler
              </button>

              <button
                onClick={handleExecuteConfiguredExport}
                disabled={generatingPdf}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Printer size={16} />
                <span>Générer le document PDF ({exportConfig.mode === 'grouped_8_a4' ? 'Planche 8/page' : '1 par page'})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL PROGRESSION GÉNÉRATION PDF ================= */}
      {generatingPdf && pdfProgress !== null && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto animate-pulse">
              <Printer size={32} />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Génération du fichier PDF en cours...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Rendu haute résolution (300 DPI) et mise en page A4
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-slate-700 px-1">
                <span>Carte {pdfProgress.current} / {pdfProgress.total}</span>
                <span className="text-rose-600 font-bold">{pdfProgress.percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
                <div
                  className="bg-rose-600 h-full rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${pdfProgress.percentage}%` }}
                ></div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Veuillez patienter pendant le traitement et l'assemblage des pages...
            </p>
          </div>
        </div>
      )}

      {/* Hidden Off-Screen Render Elements for Batch & Single Image Export */}
      <div 
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: '0px', 
          width: '360px', 
          opacity: 0, 
          pointerEvents: 'none', 
          zIndex: -9999
        }} 
        aria-hidden="true"
      >
        {/* All Students */}
        {eleves.map(student => (
          <SchoolCardView
            key={`batch-student-${student.id}`}
            elementId={`batch-card-student-${student.id}`}
            data={{
              id: student.id,
              type: 'student',
              nom: student.nom,
              prenom: student.prenom,
              matricule: student.matricule,
              sexe: student.sexe,
              date_naissance: student.date_naissance,
              lieu_naissance: student.lieu_naissance,
              classe_nom: student.classe_nom,
              tel_parent: student.tel_parent || student.telephone_parent || student.tel_tuteur || student.telephone,
              photo: student.photo
            }}
            schoolInfo={schoolInfo}
            settings={cardSettings}
          />
        ))}

        {/* Teachers */}
        {enseignants.map(teacher => (
          <SchoolCardView
            key={`batch-teacher-${teacher.id}`}
            elementId={`batch-card-enseignants-${teacher.id}`}
            data={getTeacherCardData(teacher)}
            schoolInfo={schoolInfo}
            settings={cardSettings}
          />
        ))}

        {/* Personnel Admin */}
        {personnelAdmin.map(admin => (
          <SchoolCardView
            key={`batch-admin-${admin.id}`}
            elementId={`batch-card-admin-${admin.id}`}
            data={{
              id: admin.id,
              type: 'staff',
              nom: admin.nom,
              prenom: admin.prenom,
              matricule: admin.matricule || `ADM-${admin.id}`,
              sexe: admin.sexe || 'M',
              date_naissance: admin.date_naissance || '',
              lieu_naissance: admin.lieu_naissance || '',
              poste: admin.poste || 'Personnel Administratif',
              telephone: admin.telephone,
              photo: admin.photo
            }}
            schoolInfo={schoolInfo}
            settings={cardSettings}
          />
        ))}
      </div>
    </div>
  );
}
