import { apiFetch, notifyAppUpdate } from '../utils/api';
import React from 'react';
import { Plus, Search, Filter, MoreVertical, UserPlus, GraduationCap, Phone, MapPin, ArrowRightLeft, X, Edit2, Eye, Camera, Trash2, CreditCard, Printer, FileText, Download, ShieldCheck, Key, CheckSquare, Square, Users, CalendarCheck, BarChart3, UserX, UserCheck, History, Sparkles, BookOpen, Library, AlertCircle, CheckCircle2 } from 'lucide-react';
import { jsPDF } from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import * as XLSX from 'xlsx';
import { Mail } from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { generateQRCodeDataUrl, buildVerificationUrl } from '../utils/qrAuth';
import { generateReceiptPDF, downloadReceiptPDF, printReceiptPDF } from '../utils/receipt';
import BatchPhotoImportModal, { ImportEntity } from '../components/BatchPhotoImportModal';
import StudentDailyTracking from '../components/StudentDailyTracking';
import StudentMonthlyReport from '../components/StudentMonthlyReport';
import StudentAbandonModal from '../components/StudentAbandonModal';
import StudentAbandonList from '../components/StudentAbandonList';
import { DuplicateVerificationModal } from '../components/DuplicateVerificationModal';

interface StudentsProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Students({ cycle = 'all' }: StudentsProps) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = React.useState<'liste' | 'suivi' | 'bilan' | 'abandons'>('liste');
  const [activeCycle, setActiveCycle] = React.useState<'all' | 'primaire' | 'secondaire'>(cycle);
  const [abandonModalStudent, setAbandonModalStudent] = React.useState<any>(null);
  const [eleves, setEleves] = React.useState([]);

  React.useEffect(() => {
    setActiveCycle(cycle);
  }, [cycle]);
  const [classes, setClasses] = React.useState([]);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showTransferModal, setShowTransferModal] = React.useState(false);
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [showImportModal, setShowImportModal] = React.useState(false);
  const [importWorkbook, setImportWorkbook] = React.useState<any>(null);
  const [importClasseId, setImportClasseId] = React.useState('');
  const [importSheetName, setImportSheetName] = React.useState('');
  const [importData, setImportData] = React.useState<any[]>([]);
  const [importErrors, setImportErrors] = React.useState<string[]>([]);
  const [importAnalysis, setImportAnalysis] = React.useState<any>(null);
  const [isAnalyzingImport, setIsAnalyzingImport] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  const [singleSuspectDuplicate, setSingleSuspectDuplicate] = React.useState<{ candidate: any; existing: any; reason: string; shouldOpenPayment?: boolean } | null>(null);
  const [showDupDetails, setShowDupDetails] = React.useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = React.useState(false);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [lastPayment, setLastPayment] = React.useState<any>(null);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [parentAccount, setParentAccount] = React.useState<string | null>(null);
  const [selectedStudents, setSelectedStudents] = React.useState<number[]>([]);
  const [showBatchPhotoModal, setShowBatchPhotoModal] = React.useState(false);
  const [batchPhotoFiles, setBatchPhotoFiles] = React.useState<FileList | null>(null);
  const batchPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [showAccountsModal, setShowAccountsModal] = React.useState(false);
  const [generatedAccounts, setGeneratedAccounts] = React.useState<any[]>([]);
  const [generationErrors, setGenerationErrors] = React.useState<any[]>([]);
  const [isGeneratingAccounts, setIsGeneratingAccounts] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [newClasseId, setNewClasseId] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedClassFilter, setSelectedClassFilter] = React.useState('');
  const [selectedSeniorityFilter, setSelectedSeniorityFilter] = React.useState<'all' | 'nouveau' | 'ancien'>('all');
  const [importAsAncien, setImportAsAncien] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const excelInputRef = React.useRef<HTMLInputElement>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/eleves' : p.path === '/eleves'));
  const canWrite = user.role === 'admin' || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));
  
  const [formData, setFormData] = React.useState({
    matricule: '',
    nom: '',
    prenom: '',
    sexe: 'M',
    date_naissance: '',
    classe_id: '',
    nom_parent: '',
    tel_parent: '',
    email_parent: '',
    adresse: '',
    photo: '',
    statut: 'Passant',
    regime_inscription: 'Nouveau'
  });

  const [paymentFormData, setPaymentFormData] = React.useState({
    eleve_id: '',
    type_paiement: 'Frais d\'inscription',
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0]
  });

  const fetchEleves = () => {
    apiFetch(`/api/eleves?_t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEleves(data);
        } else {
          console.error("fetchEleves returned non-array:", data);
          setEleves([]);
        }
      })
      .catch((err) => {
        console.error("fetchEleves failed:", err);
        setEleves([]);
      });
  };

  const fetchSchoolInfo = () => {
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
  };

  React.useEffect(() => {
    fetchEleves();
    apiFetch('/api/classes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(() => setClasses([]));
    fetchSchoolInfo();

    const handleDataUpdate = () => {
      fetchEleves();
    };
    window.addEventListener('app:data-updated', handleDataUpdate);
    return () => {
      window.removeEventListener('app:data-updated', handleDataUpdate);
    };
  }, []);

  const isPrimaireClass = React.useCallback((c: any) => {
    if (!c) return false;
    const cycleVal = (c.cycle || '').toLowerCase();
    const niveau = (c.niveau || '').toLowerCase();
    const nom = (c.nom || '').toLowerCase();
    return (
      cycleVal === 'primaire' ||
      cycleVal === 'maternelle' ||
      cycleVal === 'primaire_maternelle' ||
      niveau.includes('maternelle') ||
      niveau.includes('primaire') ||
      nom.includes('maternelle') ||
      nom.includes('ci') ||
      nom.includes('cp') ||
      nom.includes('ce1') ||
      nom.includes('ce2') ||
      nom.includes('cm1') ||
      nom.includes('cm2') ||
      nom.includes('garderie') ||
      nom.includes('creche')
    );
  }, []);

  const isSecondaireClass = React.useCallback((c: any) => {
    if (!c) return false;
    const cycleVal = (c.cycle || '').toLowerCase();
    if (cycleVal === 'secondaire' || cycleVal === 'college' || cycleVal === 'lycee') return true;
    return !isPrimaireClass(c);
  }, [isPrimaireClass]);

  const isStudentAbandoned = (e: any) => {
    return Boolean(e && (e.statut_scolaire === 'Abandon' || e.est_abandonne === 1));
  };

  const cycleFilteredEleves = React.useMemo(() => {
    const list = Array.isArray(eleves) ? eleves : [];
    const classList = Array.isArray(classes) ? classes : [];
    return list.filter((eleve: any) => {
      if (!eleve) return false;
      const eleveClasse = classList.find((c: any) => c && String(c.id) === String(eleve.classe_id));
      if (activeCycle === 'primaire') {
        if (eleveClasse) return isPrimaireClass(eleveClasse);
        const cNom = (eleve.classe_nom || '').toLowerCase();
        return isPrimaireClass({ nom: cNom, niveau: '' });
      }
      if (activeCycle === 'secondaire') {
        if (eleveClasse) return isSecondaireClass(eleveClasse);
        const cNom = (eleve.classe_nom || '').toLowerCase();
        return isSecondaireClass({ nom: cNom, niveau: '' });
      }
      return true;
    });
  }, [eleves, classes, activeCycle, isPrimaireClass, isSecondaireClass]);

  const cycleFilteredActifs = React.useMemo(() => {
    return cycleFilteredEleves.filter((e: any) => !isStudentAbandoned(e));
  }, [cycleFilteredEleves]);

  const cycleFilteredAbandons = React.useMemo(() => {
    return cycleFilteredEleves.filter((e: any) => isStudentAbandoned(e));
  }, [cycleFilteredEleves]);

  const cycleFilteredAbandonsCount = cycleFilteredAbandons.length;

  const primaireCount = React.useMemo(() => {
    const list = Array.isArray(eleves) ? eleves : [];
    const classList = Array.isArray(classes) ? classes : [];
    return list.filter((e: any) => {
      if (!e || isStudentAbandoned(e)) return false;
      const c = classList.find((cl: any) => cl && String(cl.id) === String(e.classe_id));
      if (c) return isPrimaireClass(c);
      return isPrimaireClass({ nom: e.classe_nom || '', niveau: '' });
    }).length;
  }, [eleves, classes, isPrimaireClass]);

  const secondaireCount = React.useMemo(() => {
    const list = Array.isArray(eleves) ? eleves : [];
    const classList = Array.isArray(classes) ? classes : [];
    return list.filter((e: any) => {
      if (!e || isStudentAbandoned(e)) return false;
      const c = classList.find((cl: any) => cl && String(cl.id) === String(e.classe_id));
      if (c) return isSecondaireClass(c);
      return isSecondaireClass({ nom: e.classe_nom || '', niveau: '' });
    }).length;
  }, [eleves, classes, isSecondaireClass]);

  // If currently filtered by a cycle that has 0 students while the school has students, default to 'all' so students are always visible
  React.useEffect(() => {
    if (cycleFilteredActifs.length > 0 || eleves.length > 0) {
      if (activeCycle === 'primaire' && primaireCount === 0 && secondaireCount > 0) {
        setActiveCycle('all');
      } else if (activeCycle === 'secondaire' && secondaireCount === 0 && primaireCount > 0) {
        setActiveCycle('all');
      }
    }
  }, [eleves.length, cycleFilteredActifs.length, activeCycle, primaireCount, secondaireCount]);

  const availableClasses = React.useMemo(() => {
    return classes.filter((c: any) => {
      if (activeCycle === 'primaire') return isPrimaireClass(c);
      if (activeCycle === 'secondaire') return isSecondaireClass(c);
      return true;
    });
  }, [classes, activeCycle, isPrimaireClass, isSecondaireClass]);

  // Only active students in filteredEleves
  const filteredEleves = React.useMemo(() => {
    return cycleFilteredActifs
      .filter((eleve: any) => {
        const matchesSearch = 
          !searchTerm ||
          (eleve.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
          (eleve.prenom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eleve.matricule || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (eleve.classe_nom || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesClass = selectedClassFilter === '' || String(eleve.classe_id) === String(selectedClassFilter);

        const isAncien = eleve.anciennete === 'Ancien' || eleve.regime_inscription === 'Ancien';
        const matchesSeniority = 
          selectedSeniorityFilter === 'all' ||
          (selectedSeniorityFilter === 'ancien' && isAncien) ||
          (selectedSeniorityFilter === 'nouveau' && !isAncien);
        
        return matchesSearch && matchesClass && matchesSeniority;
      })
      .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));
  }, [cycleFilteredActifs, searchTerm, selectedClassFilter, selectedSeniorityFilter]);

  const resetForm = () => {
    setFormData({
      matricule: '', nom: '', prenom: '', sexe: 'M', date_naissance: '',
      classe_id: '', nom_parent: '', tel_parent: '', email_parent: '', adresse: '', photo: '', statut: 'Passant',
      regime_inscription: 'Nouveau'
    });
    setIsEditing(false);
    setSelectedStudent(null);
  };

  const handleDeclareSeniority = async (regime: 'Ancien' | 'Nouveau') => {
    if (selectedStudents.length === 0) return;
    try {
      const res = await apiFetch('/api/eleves/declare-anciennete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: selectedStudents,
          regime_inscription: regime
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`${selectedStudents.length} élève(s) déclaré(s) comme ${regime === 'Ancien' ? 'Ancien(ne)s' : 'Nouveau(x)'} avec succès !`);
        setSelectedStudents([]);
        fetchEleves();
      } else {
        toast.error(data.error || "Erreur lors de la déclaration.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de communication avec le serveur.");
    }
  };

  const handleDeclareSingleSeniority = async (eleve: any, regime: 'Ancien' | 'Nouveau') => {
    try {
      const res = await apiFetch('/api/eleves/declare-anciennete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_ids: [eleve.id],
          regime_inscription: regime
        })
      });
      const data = await res.json();
      if (res.ok) {
        const label = regime === 'Ancien' 
          ? (eleve.sexe === 'F' ? 'Ancienne' : 'Ancien') 
          : (eleve.sexe === 'F' ? 'Nouvelle' : 'Nouveau');
        toast.success(`${eleve.nom} ${eleve.prenom} déclaré(e) comme ${label} !`);
        fetchEleves();
        if (selectedStudent && selectedStudent.id === eleve.id) {
          setSelectedStudent((prev: any) => ({
            ...prev,
            regime_inscription: regime,
            anciennete: regime,
            anciennete_libelle: label,
            anciennete_motif: "Déclaré(e) par l'administration"
          }));
        }
      } else {
        toast.error(data.error || "Erreur lors de la déclaration.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la déclaration.");
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const targetClasses = availableClasses.length > 0 ? availableClasses : (
      cycle === 'primaire' 
        ? [{ id: 1, nom: 'CI A' }, { id: 2, nom: 'CP A' }, { id: 3, nom: 'CE1 A' }, { id: 4, nom: 'CE2 A' }, { id: 5, nom: 'CM1 A' }, { id: 6, nom: 'CM2 A' }]
        : cycle === 'secondaire'
        ? [{ id: 1, nom: '6ème A' }, { id: 2, nom: '5ème A' }, { id: 3, nom: '4ème A' }, { id: 4, nom: '3ème A' }, { id: 5, nom: '2nde A' }, { id: 6, nom: '1ère A' }, { id: 7, nom: 'Tle A' }]
        : [{ id: 1, nom: 'Classe Exemple' }]
    );

    targetClasses.forEach((c: any, index: number) => {
      const templateData = [
        {
          'Matricule': `MAT${String(index + 1).padStart(3, '0')}01`,
          'Nom': 'DOE',
          'Prénom': 'John',
          'Sexe': 'M',
          'Classe': c.nom,
          'Date de Naissance': '15/05/2012',
          'Adresse': 'Lomé, Togo',
          'Nom du Parent': 'DOE Senior',
          'Téléphone du Parent': '90000000',
          'Email du Parent': 'parent@example.com',
          'Statut': 'Passant'
        }
      ];

      const ws = XLSX.utils.json_to_sheet(templateData);
      const sheetName = String(c.nom || `Classe_${index + 1}`).substring(0, 31).replace(/[:\\/?*\[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    XLSX.writeFile(wb, `template_import_eleves_${cycle}.xlsx`);
  };

  const handleBulkDelete = async () => {
    if (selectedStudents.length === 0) return;

    if (!await confirm({
      title: "Suppression groupée d'élèves",
      message: `Êtes-vous sûr de vouloir supprimer définitivement les ${selectedStudents.length} élèves sélectionnés ? Cette action supprimera également toutes leurs notes et paiements associés.`,
      confirmText: `Supprimer (${selectedStudents.length})`,
      variant: "danger",
      icon: "trash"
    })) return;

    apiFetch('/api/eleves/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedStudents })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        toast.success(`${data.count || selectedStudents.length} élève(s) supprimé(s) avec succès`);
        setSelectedStudents([]);
        fetchEleves();
      } else {
        toast.error("Erreur lors de la suppression groupée : " + (data.error || "Erreur serveur"));
      }
    })
    .catch(err => {
      console.error(err);
      toast.error("Erreur lors de la suppression groupée");
    });
  };

  const [openPaymentAfterSave, setOpenPaymentAfterSave] = React.useState(false);
  
  const handleSubmit = (e?: React.FormEvent, shouldOpenPayment = false, force = false) => {
    if (e) e.preventDefault();
    const url = isEditing ? `/api/eleves/${selectedStudent.id}` : '/api/eleves';
    const method = isEditing ? 'PUT' : 'POST';
    const payload = force ? { ...formData, force: true } : formData;

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
            reason: data.error,
            shouldOpenPayment
          });
          return;
        }
        throw new Error(data.error || "Erreur lors de l'enregistrement de l'élève");
      }
      setSingleSuspectDuplicate(null);
      setShowModal(false);
      setActiveTab('liste');
      setActiveCycle('all');
      setSearchTerm('');
      setSelectedClassFilter('');
      setSelectedSeniorityFilter('all');
      fetchEleves();
      notifyAppUpdate();
      toast.success(isEditing ? "Élève mis à jour" : "Élève inscrit avec succès ! La liste des élèves a été actualisée.");
      
      // If it was a new registration, we might want to offer payment
      if (!isEditing && data.id) {
        setPaymentFormData(prev => ({ ...prev, eleve_id: data.id.toString() }));
        if (shouldOpenPayment || openPaymentAfterSave) {
          setShowPaymentModal(true);
        }
      }
      resetForm();
      setOpenPaymentAfterSave(false);
    })
    .catch(err => {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'enregistrement de l'élève");
    });
  };

  const handleConfirmSingleSuspect = () => {
    if (!singleSuspectDuplicate) return;
    const shouldOpenPay = singleSuspectDuplicate.shouldOpenPayment;
    setSingleSuspectDuplicate(null);
    handleSubmit(undefined, shouldOpenPay, true);
  };

  const handleExecuteImport = (mode: 'all' | 'valid_only') => {
    if (!importAnalysis) return;
    setIsImporting(true);
    apiFetch('/api/eleves/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classe_id: importClasseId, eleves: importData, dryRun: false, mode, importAsAncien })
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
      setActiveTab('liste');
      setActiveCycle('all');
      setSearchTerm('');
      setSelectedClassFilter('');
      setSelectedSeniorityFilter('all');
      fetchEleves();
      notifyAppUpdate();
      toast.success(`${data.count || 0} élève(s) importé(s) avec succès ! La liste des élèves est affichée.`);
    })
    .catch(err => {
      setIsImporting(false);
      console.error(err);
      toast.error("Erreur lors de l'importation.");
    });
  };

  const generatePDF = async () => {
    return generateReceiptPDF(lastPayment, schoolInfo);
  };

  const handlePrint = async () => {
    try {
      await printReceiptPDF(lastPayment, schoolInfo);
    } catch (e) {
      console.error(e);
      toast.error("Erreur impression reçu");
    }
  };

  const handleSavePDF = async () => {
    try {
      const safeName = `${lastPayment.eleve_nom || ''}_${lastPayment.eleve_prenom || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
      await downloadReceiptPDF(lastPayment, schoolInfo, `recu_A5_${safeName}_${lastPayment.id}.pdf`);
      toast.success("Reçu A5 téléchargé en PDF !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur téléchargement reçu");
    }
  };

  const handlePrintList = () => {
    const doc = new jsPDF();
    const s = schoolInfo;
    const title = "Liste des Élèves Actifs";
    
    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    // Header
    if (s?.logo) {
      doc.addImage(s.logo, 'PNG', 14, 10, 20, 20);
    }
    doc.setFontSize(16);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(s?.nom || 'Établissement Scolaire', 40, 18);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${s?.adresse || ''} | ${s?.telephone || ''}`, 40, 23);
    doc.text(`${s?.email || ''} | ${s?.site_web || ''}`, 40, 27);
    
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.line(14, 32, 196, 32);
    
    doc.setFontSize(14);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(title, 105, 41, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Effectif actif : ${filteredEleves.length} élève(s)  |  Édité le: ${new Date().toLocaleDateString('fr-FR')}`, 105, 46, { align: 'center' });

    const tableData = filteredEleves.map((e: any, index: number) => [
      index + 1,
      e.matricule,
      `${e.nom} ${e.prenom}`,
      e.sexe,
      e.classe_nom || 'N/A',
      e.tel_parent || 'N/A',
      e.statut || 'Passant'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Classe', 'Parent', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: rgb as any },
      styles: { fontSize: 8 }
    });

    doc.autoPrint();
    const dataUri = doc.output('datauristring');
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<iframe width='100%' height='100%' src='${dataUri}'></iframe>`);
    }
  };

  const handleSaveListPDF = () => {
    const doc = new jsPDF();
    const s = schoolInfo;
    const title = "Liste des Élèves Actifs";
    
    const primaryColor = getPrimaryColor();
    const rgb = hexToRgb(primaryColor);

    // Header
    if (s?.logo) {
      doc.addImage(s.logo, 'PNG', 14, 10, 20, 20);
    }
    doc.setFontSize(16);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(s?.nom || 'Établissement Scolaire', 40, 18);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${s?.adresse || ''} | ${s?.telephone || ''}`, 40, 23);
    doc.text(`${s?.email || ''} | ${s?.site_web || ''}`, 40, 27);
    
    doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
    doc.line(14, 32, 196, 32);
    
    doc.setFontSize(14);
    doc.setTextColor(rgb[0], rgb[1], rgb[2]);
    doc.text(title, 105, 41, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Effectif actif : ${filteredEleves.length} élève(s)  |  Édité le: ${new Date().toLocaleDateString('fr-FR')}`, 105, 46, { align: 'center' });

    const tableData = filteredEleves.map((e: any, index: number) => [
      index + 1,
      e.matricule,
      `${e.nom} ${e.prenom}`,
      e.sexe,
      e.classe_nom || 'N/A',
      e.tel_parent || 'N/A',
      e.statut || 'Passant'
    ]);

    autoTable(doc, {
      startY: 50,
      head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Classe', 'Parent', 'Statut']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: rgb as any },
      styles: { fontSize: 8 }
    });

    doc.save(`liste_eleves_actifs_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    apiFetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(paymentFormData)
    })
    .then(res => res.json())
    .then((data) => {
      setShowPaymentModal(false);
      
      // Find the student for the receipt
      const student = eleves.find((e: any) => e.id === parseInt(paymentFormData.eleve_id));
      setLastPayment({
        ...paymentFormData,
        id: data.id,
        eleve_nom: student?.nom,
        eleve_prenom: student?.prenom,
        eleve_matricule: student?.matricule,
        eleve_classe: student?.classe_nom,
        reste_scolarite: (student?.frais_scolarite || 0) - (student?.total_paye_scolarite || 0) - (paymentFormData.type_paiement === 'Frais de scolarité' ? parseInt(paymentFormData.montant) : 0),
        reste_inscription: (student?.frais_inscription || 0) - (student?.total_paye_inscription || 0) - (paymentFormData.type_paiement === "Frais d'inscription" ? parseInt(paymentFormData.montant) : 0),
        inscription_payee: (student?.total_paye_inscription || 0) + (paymentFormData.type_paiement === "Frais d'inscription" ? parseInt(paymentFormData.montant) : 0) >= (student?.frais_inscription || 0)
      });
      setShowReceipt(true);

      setPaymentFormData({
        eleve_id: '', type_paiement: 'Frais d\'inscription', montant: '',
        date_paiement: new Date().toISOString().split('T')[0]
      });
      toast.success('Paiement enregistré avec succès');
    });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !newClasseId) return;

    apiFetch('/api/promotion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eleve_id: selectedStudent.id,
        nouvelle_classe_id: newClasseId
      })
    }).then(() => {
      setShowTransferModal(false);
      setSelectedStudent(null);
      setNewClasseId('');
      fetchEleves();
    });
  };

  const handleDelete = async (id: number) => {
    if (await confirm({
      title: "Supprimer l'élève",
      message: "Êtes-vous sûr de vouloir supprimer cet élève ? Cette action est définitive.",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      apiFetch(`/api/eleves/${id}`, { method: 'DELETE' }).then(() => {
        fetchEleves();
        toast.success("Élève supprimé");
      });
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result as string });
      };
      reader.readAsDataURL(file);
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

  const toggleStudentSelection = (id: number) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const selectAllStudents = () => {
    const visibleStudentIds = filteredEleves.map((e: any) => e.id);
    
    if (selectedStudents.length === visibleStudentIds.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(visibleStudentIds);
    }
  };

  const handleGenerateAccounts = async () => {
    if (selectedStudents.length === 0) return;
    
    if (!await confirm({
      title: "Génération des comptes élèves",
      message: `Générer des comptes d'accès pour les ${selectedStudents.length} élèves sélectionnés ?`,
      confirmText: "Générer les comptes",
      variant: "primary",
      icon: "help"
    })) return;

    setIsGeneratingAccounts(true);
    apiFetch('/api/eleves/generate-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: selectedStudents })
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setGeneratedAccounts(data.results || []);
        setGenerationErrors(data.errors || []);
        setShowAccountsModal(true);
      } else {
        toast.error("Erreur lors de la génération des comptes: " + data.error);
      }
    })
    .catch(err => {
      console.error("Error generating accounts:", err);
      toast.error("Erreur réseau");
    })
    .finally(() => setIsGeneratingAccounts(false));
  };

  React.useEffect(() => {
    if (showDetailsModal && selectedStudent) {
      apiFetch(`/api/eleves/${selectedStudent.id}/parent-account`)
        .then(res => res.json())
        .then(data => setParentAccount(data.identifier))
        .catch(err => console.error("Error fetching parent account:", err));
    } else {
      setParentAccount(null);
    }
  }, [showDetailsModal, selectedStudent]);

  const openEditModal = (eleve: any) => {
    setSelectedStudent(eleve);
    setFormData({
      matricule: eleve.matricule ?? '',
      nom: eleve.nom ?? '',
      prenom: eleve.prenom ?? '',
      sexe: eleve.sexe ?? 'M',
      date_naissance: eleve.date_naissance ?? '',
      classe_id: eleve.classe_id ?? '',
      nom_parent: eleve.nom_parent ?? '',
      tel_parent: eleve.tel_parent ?? '',
      email_parent: eleve.email_parent ?? '',
      adresse: eleve.adresse ?? '',
      photo: eleve.photo ?? '',
      statut: eleve.statut ?? 'Passant',
      regime_inscription: (eleve.regime_inscription || eleve.anciennete || 'Nouveau')
    });
    setIsEditing(true);
    setShowModal(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-primary-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-primary-400">
            <div className="p-2 bg-primary-500 rounded-full">
              <UserPlus size={24} />
            </div>
            <span className="font-bold text-lg">Inscrit avec succès</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {cycle === 'primaire' ? 'Élèves (Maternelle & Primaire)' : cycle === 'secondaire' ? 'Élèves (Secondaire)' : 'Gestion des Élèves'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm">
            {cycle === 'primaire' ? 'Inscriptions, annuaire, suivi quotidien des présences et bilans mensuels de la Maternelle et du Primaire.' : 'Inscriptions, annuaire, suivi des présences et bilans mensuels des élèves.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('liste')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'liste'
                ? 'bg-white text-emerald-800 shadow-sm ring-1 ring-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={15} />
            <span>Élèves Actifs</span>
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] rounded-full">
              {cycleFilteredActifs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('abandons')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'abandons'
                ? 'bg-white text-rose-700 shadow-sm ring-1 ring-rose-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserX size={15} />
            <span>Élèves en Abandon</span>
            {cycleFilteredAbandonsCount > 0 && (
              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 font-black text-[10px] rounded-full">
                {cycleFilteredAbandonsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suivi')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'suivi'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck size={15} />
            <span>Suivi Quotidien</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bilan')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bilan'
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 size={15} />
            <span>Bilan Mensuel & PDF</span>
          </button>
        </div>
      </div>

      {/* Conditionally Render Tab Views */}
      {activeTab === 'suivi' && (
        <StudentDailyTracking classes={classes} cycle={cycle} />
      )}

      {activeTab === 'bilan' && (
        <StudentMonthlyReport classes={classes} schoolInfo={schoolInfo} cycle={cycle} />
      )}

      {activeTab === 'abandons' && (
        <StudentAbandonList
          eleves={eleves}
          classes={classes}
          schoolInfo={schoolInfo}
          cycle={cycle}
          onRefresh={fetchEleves}
          onOpenAbandonModal={(student) => setAbandonModalStudent(student)}
        />
      )}

      {activeTab === 'liste' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 justify-end">
            {/* Hidden file input for batch photo import */}
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
                  onClick={() => {
                    resetForm();
                    setShowModal(true);
                  }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
                >
                  <Plus size={20} />
                  Inscrire un élève
                </button>
                <button 
                  onClick={() => setShowImportModal(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
                >
                  <FileText size={20} />
                  Importer élèves
                </button>
                <button 
                  onClick={handleOpenBatchPhotoPicker}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
                  title="Importer des photos pour les élèves sélectionnés ou toute la liste"
                >
                  <Camera size={20} />
                  <span>
                    {selectedStudents.length > 0 
                      ? `Importer photos (${selectedStudents.length})` 
                      : 'Importer photos'}
                  </span>
                </button>
              </>
            )}
            {selectedStudents.length > 0 && (
              <>
                {canWrite && (
                  <>
                    <button 
                      onClick={handleBulkDelete}
                      className="bg-red-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
                    >
                      <Trash2 size={20} />
                      Supprimer sélection ({selectedStudents.length})
                    </button>
                    <button 
                      onClick={() => handleDeclareSeniority('Ancien')}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100"
                      title="Déclarer les élèves sélectionnés comme anciens élèves"
                    >
                      <History size={20} />
                      Déclarer Ancien(ne) ({selectedStudents.length})
                    </button>
                    <button 
                      onClick={() => handleDeclareSeniority('Nouveau')}
                      className="bg-sky-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-sky-700 transition-colors shadow-lg shadow-sky-100"
                      title="Déclarer les élèves sélectionnés comme nouveaux élèves"
                    >
                      <Sparkles size={20} />
                      Déclarer Nouveau/Nouvelle ({selectedStudents.length})
                    </button>
                  </>
                )}
                <button 
                  onClick={() => setShowEmailModal(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors shadow-lg shadow-primary-100"
                >
                  <Mail size={20} />
                  Envoyer Email ({selectedStudents.length})
                </button>
                <button 
                  onClick={handleGenerateAccounts}
                  disabled={isGeneratingAccounts}
                  className="bg-amber-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors shadow-lg shadow-amber-100 disabled:opacity-50"
                >
                  <ShieldCheck size={20} />
                  {isGeneratingAccounts ? 'Génération...' : 'Générer Comptes'}
                </button>
              </>
            )}
            <button 
              onClick={selectAllStudents}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              {selectedStudents.length > 0 ? 'Désélectionner tout' : 'Tout sélectionner'}
            </button>
            <button 
              onClick={handlePrintList}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Printer size={20} />
              Imprimer
            </button>
            <button 
              onClick={handleSaveListPDF}
              className="bg-primary-50 text-primary-600 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-100 transition-colors"
            >
              <Download size={20} />
              PDF
            </button>
            <button 
              onClick={downloadTemplate}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Download size={20} />
              Template
            </button>
          </div>

          {/* Alerte / Bannière Abandons Séparés */}
          {cycleFilteredAbandonsCount > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-100 rounded-xl text-rose-700 shrink-0">
                  <UserX size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-950">
                    {cycleFilteredAbandonsCount} élève{cycleFilteredAbandonsCount > 1 ? 's sont déclarés' : ' est déclaré'} en abandon (séparé{cycleFilteredAbandonsCount > 1 ? 's' : ''} et non comptabilisé{cycleFilteredAbandonsCount > 1 ? 's' : ''} dans l'effectif)
                  </h4>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Cette liste ci-dessous ne contient que les élèves actifs. Le téléchargement PDF/Excel n'inclut aucun abandon.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('abandons')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0"
              >
                <UserX size={14} />
                <span>Voir la liste des abandons ({cycleFilteredAbandonsCount})</span>
              </button>
            </div>
          )}

          {/* Cycle Selector Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setActiveCycle('all');
                  setSelectedClassFilter('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeCycle === 'all'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Tous les élèves actifs</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeCycle === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {cycleFilteredActifs.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCycle('primaire');
                  setSelectedClassFilter('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeCycle === 'primaire'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Maternelle & Primaire</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeCycle === 'primaire' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {primaireCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveCycle('secondaire');
                  setSelectedClassFilter('');
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                  activeCycle === 'secondaire'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Secondaire</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                  activeCycle === 'secondaire' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                }`}>
                  {secondaireCount}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 pr-2">
              <Users size={14} className="text-slate-400" />
              <span>Effectif actif : <strong className="text-slate-800 font-bold">{filteredEleves.length}</strong> affiché{filteredEleves.length > 1 ? 's' : ''} sur <strong className="text-slate-800 font-bold">{cycleFilteredActifs.length}</strong></span>
              {cycleFilteredAbandonsCount > 0 && (
                <span className="text-rose-600 font-bold text-xs">
                  • {cycleFilteredAbandonsCount} en abandon (exclus)
                </span>
              )}
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher par nom, matricule..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <select 
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Toutes les classes</option>
                {availableClasses.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>

              <select 
                value={selectedSeniorityFilter}
                onChange={(e: any) => setSelectedSeniorityFilter(e.target.value)}
                className="bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                title="Filtrer par statut d'ancienneté"
              >
                <option value="all">Tous (Nouveaux & Anciens)</option>
                <option value="nouveau">Nouveaux élèves</option>
                <option value="ancien">Anciens élèves</option>
              </select>

              <button className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100" title="Filtres">
                <Filter size={20} />
              </button>
            </div>
          </div>

          {/* Students List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEleves.map((eleve: any) => (
                <div 
                  key={eleve.id} 
                  onClick={() => toggleStudentSelection(eleve.id)}
                  className={`bg-white p-5 rounded-2xl border transition-all relative group cursor-pointer ${
                    selectedStudents.includes(eleve.id) 
                      ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md' 
                      : eleve.statut_scolaire === 'Abandon'
                      ? 'border-red-200 bg-red-50/20 shadow-sm hover:shadow-md'
                      : 'border-slate-100 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="absolute top-4 right-4 flex flex-col gap-1 items-center" onClick={e => e.stopPropagation()}>
                    <div className="relative group/menu">
                      <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                        <MoreVertical size={18} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 hidden group-hover/menu:block">
                        {canWrite && (
                          <>
                            <button 
                              onClick={() => openEditModal(eleve)}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Edit2 size={14} /> Modifier
                            </button>
                            <button 
                              onClick={() => handleDeclareSingleSeniority(eleve, (eleve.anciennete === 'Ancien' || eleve.regime_inscription === 'Ancien') ? 'Nouveau' : 'Ancien')}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                              title={eleve.anciennete_motif || "Modifier le statut d'ancienneté"}
                            >
                              {(eleve.anciennete === 'Ancien' || eleve.regime_inscription === 'Ancien') ? (
                                <>
                                  <Sparkles size={14} className="text-sky-600" />
                                  <span>Déclarer {eleve.sexe === 'F' ? 'Nouvelle' : 'Nouveau'}</span>
                                </>
                              ) : (
                                <>
                                  <History size={14} className="text-emerald-600" />
                                  <span>Déclarer {eleve.sexe === 'F' ? 'Ancienne' : 'Ancien'}</span>
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => setAbandonModalStudent(eleve)}
                              className={`w-full text-left px-4 py-2 text-xs font-medium flex items-center gap-2 ${
                                eleve.statut_scolaire === 'Abandon'
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              {eleve.statut_scolaire === 'Abandon' ? (
                                <>
                                  <UserCheck size={14} /> Marquer Reprise
                                </>
                              ) : (
                                <>
                                  <UserX size={14} /> Déclarer Abandon
                                </>
                              )}
                            </button>
                            <button 
                              onClick={() => handleDelete(eleve.id)}
                              className="w-full text-left px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {canWrite && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(eleve.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer cet élève"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudent(eleve);
                            setShowTransferModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Transférer l'élève"
                        >
                          <ArrowRightLeft size={18} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden relative group/photo">
                      {eleve.photo ? (
                        <img src={eleve.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserPlus size={32} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{eleve.nom} {eleve.prenom}</h3>
                      <p className="text-xs font-mono text-primary-600 mb-2">{eleve.matricule}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <GraduationCap size={14} />
                        <span>{eleve.classe_nom || 'Non assigné'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <Phone size={14} />
                        <span>{eleve.tel_parent}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {/* Statut d'ancienneté */}
                        <span 
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border cursor-help ${
                            (eleve.anciennete === 'Ancien' || eleve.regime_inscription === 'Ancien')
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-sky-50 text-sky-700 border-sky-200'
                          }`} 
                          title={eleve.anciennete_motif || "Statut d'ancienneté de l'élève"}
                        >
                          {eleve.anciennete_libelle || ((eleve.anciennete === 'Ancien' || eleve.regime_inscription === 'Ancien') ? (eleve.sexe === 'F' ? 'Ancienne' : 'Ancien') : (eleve.sexe === 'F' ? 'Nouvelle' : 'Nouveau'))}
                        </span>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          eleve.statut === 'Passant' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                        }`}>
                          {eleve.statut || 'Passant'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          eleve.statut_scolaire === 'Abandon'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        }`}>
                          {eleve.statut_scolaire === 'Abandon' ? 'Abandon' : 'Actif'}
                        </span>
                        {Boolean(eleve.est_adherent_bibliotheque) && (
                          <span 
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border flex items-center gap-1 ${
                              (eleve.dette_adhesion_bibliotheque || 0) > 0
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            }`}
                            title={`Adhérent Bibliothèque: ${eleve.adherent_code || ''} ${(eleve.dette_adhesion_bibliotheque || 0) > 0 ? `- Dette cotisation: ${eleve.dette_adhesion_bibliotheque} FCFA` : '- Cotisation soldée'}`}
                          >
                            <BookOpen size={10} />
                            {(eleve.dette_adhesion_bibliotheque || 0) > 0 
                              ? `Biblio : Dette ${(eleve.dette_adhesion_bibliotheque || 0).toLocaleString()} F` 
                              : `Biblio : ${eleve.adherent_code || 'Inscrit'}`}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-[10px] font-medium">
                          <span className="text-slate-500">Payé:</span>
                          <span className="text-primary-600 font-bold">{(eleve.total_paye || 0).toLocaleString()} {eleve.devise || 'FCFA'}</span>
                        </div>
                        <div className="flex justify-between text-[10px] font-medium">
                          <span className="text-slate-500">Reste:</span>
                          <span className={`${(eleve.frais_scolarite - (eleve.total_paye || 0)) > 0 ? 'text-red-500' : 'text-slate-500'} font-bold`}>
                            {(eleve.frais_scolarite - (eleve.total_paye || 0)).toLocaleString()} {eleve.devise || 'FCFA'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin size={12} />
                      <span className="truncate max-w-[150px]">{eleve.adresse}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAbandonModalStudent(eleve);
                        }}
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                          eleve.statut_scolaire === 'Abandon'
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        {eleve.statut_scolaire === 'Abandon' ? 'Reprendre' : 'Abandon'}
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedStudent(eleve);
                          setShowDetailsModal(true);
                        }}
                        className="text-xs font-bold text-primary-600 hover:underline"
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {filteredEleves.length === 0 && (
            <div className="text-center py-10 px-4 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm">
              <UserPlus size={44} className="mx-auto text-primary-500 mb-3" />
              <p className="text-slate-800 font-bold text-base mb-1">
                {eleves.length === 0
                  ? "Aucun élève enregistré pour le moment."
                  : "Aucun élève ne correspond aux filtres ou au cycle actuellement sélectionné."}
              </p>
              {eleves.length > 0 && (
                <div className="mt-3 flex flex-col items-center gap-3">
                  <p className="text-xs text-slate-600 max-w-lg">
                    Il y a <strong className="text-slate-900 font-bold">{eleves.length} élève(s)</strong> présent(s) dans l'établissement ({primaireCount} Maternelle/Primaire, {secondaireCount} Secondaire).
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCycle('all');
                        setSearchTerm('');
                        setSelectedClassFilter('');
                        setSelectedSeniorityFilter('all');
                      }}
                      className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-2"
                    >
                      <Users size={16} />
                      <span>Afficher tous les élèves ({eleves.length})</span>
                    </button>
                    {(searchTerm || selectedClassFilter || selectedSeniorityFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedClassFilter('');
                          setSelectedSeniorityFilter('all');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Réinitialiser la recherche
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Importer des élèves</h2>
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
                      console.log("File input changed", e.target.files);
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("File selected:", file.name, file.type, file.size);
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          try {
                            console.log("File read successfully");
                            const data = new Uint8Array(e.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                            setImportWorkbook(workbook);
                            if (workbook.SheetNames.length > 0) {
                              setImportSheetName(workbook.SheetNames[0]);
                            }
                          } catch (err) {
                            console.error("Error reading excel file:", err);
                            toast.error("Erreur lors de la lecture du fichier Excel. Assurez-vous qu'il s'agit d'un fichier valide.");
                          }
                        };
                        reader.onerror = (err) => {
                          console.error("FileReader error:", err);
                          toast.error("Erreur lors de la lecture du fichier.");
                        };
                        reader.readAsArrayBuffer(file);
                      }
                    }} 
                    className="sr-only" 
                    id="excel-upload"
                  />
                  <label 
                    htmlFor="excel-upload"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Classe de destination</label>
                      <select 
                        value={importClasseId}
                        onChange={(e) => setImportClasseId(e.target.value)} 
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Choisir la classe</option>
                        {availableClasses.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    </div>
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
                  </div>

                  <button 
                    disabled={isAnalyzingImport}
                    onClick={() => {
                      if (!importSheetName) return;
                      const sheet = importWorkbook.Sheets[importSheetName];
                      const data = XLSX.utils.sheet_to_json(sheet);
                      
                      const errors: string[] = [];
                      const destClass = availableClasses.find((c: any) => String(c.id) === String(importClasseId));

                      const isGenericSheet = (name: string) => {
                        const n = (name || '').toLowerCase().trim();
                        return n.startsWith('feuil') || n.startsWith('sheet') || n === 'eleves' || n === 'élèves' || n === 'import' || n === 'modele' || n === 'modèle';
                      };

                      const normalizeClassStr = (str: string) => {
                        return (str || '')
                          .toLowerCase()
                          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                          .replace(/(\d+)(eme|è|e|er|ere|re|ème)/g, '$1')
                          .replace(/\bseconde\b/g, '2')
                          .replace(/\bpremiere\b/g, '1')
                          .replace(/\bterminale\b/g, 'tle')
                          .replace(/[^a-z0-9]/g, '');
                      };

                      const mappedData = data.map((row: any, index: number) => {
                        const rowNum = index + 2;
                        const matricule = row.Matricule || row.matricule || row['N° Matricule'] || row['Numero Matricule'] || row['N°Matricule'] || '';
                        const nom = row.Nom || row.nom || row['Nom de famille'] || '';
                        const prenom = row.Prénom || row.prenom || row.Prenom || row['Prénoms'] || row['Prenoms'] || row['Prenom(s)'] || '';
                        const sexe = row.Sexe || row.sexe || row['Genre'] || row['genre'] || 'M';
                        const rawDate = row['Date de Naissance'] || row['Date de naissance'] || row.date_naissance || row['Date Naissance'] || row['Date de naiss.'] || row['Date'] || '';
                        const explicitRowClass = (row.Classe || row.classe || row['Nom Classe'] || row['Classe / Division'] || '').toString().trim();
                        const excelClassName = explicitRowClass || (!isGenericSheet(importSheetName) ? importSheetName.trim() : '');

                        if (!nom || !String(nom).trim()) errors.push(`Ligne ${rowNum}: Nom manquant`);
                        if (!prenom || !String(prenom).trim()) errors.push(`Ligne ${rowNum}: Prénom manquant`);

                        const rawSexeStr = String(sexe || 'M').trim().toUpperCase();
                        const cleanSexe = rawSexeStr.startsWith('F') ? 'F' : 'M';

                        let rowClasseId = null;

                        if (destClass) {
                          rowClasseId = destClass.id;
                        } else if (excelClassName) {
                          const normExcel = normalizeClassStr(excelClassName);
                          const foundClass = classes.find((c: any) => 
                            c.nom.toLowerCase().trim() === excelClassName.toLowerCase().trim() ||
                            normalizeClassStr(c.nom) === normExcel
                          );
                          if (foundClass) {
                            rowClasseId = foundClass.id;
                          } else {
                            errors.push(`Ligne ${rowNum}: La classe "${excelClassName}" n'a pas été trouvée. Veuillez choisir la "Classe de destination" dans le menu déroulant ci-dessus.`);
                          }
                        } else {
                          errors.push(`Ligne ${rowNum}: Aucune classe spécifiée. Veuillez sélectionner une classe de destination ci-dessus ou renseigner la colonne "Classe".`);
                        }

                        // Date validation and formatting
                        let formattedDate = '';
                        if (rawDate) {
                          if (rawDate instanceof Date) {
                            formattedDate = rawDate.toISOString().split('T')[0];
                          } else if (typeof rawDate === 'number') {
                            const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                            if (!isNaN(date.getTime())) {
                              formattedDate = date.toISOString().split('T')[0];
                            }
                          } else {
                            const dateStr = String(rawDate).trim();
                            const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
                            const ymdMatch = dateStr.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
                            if (dmyMatch) {
                              const [_, day, month, year] = dmyMatch;
                              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else if (ymdMatch) {
                              const [_, year, month, day] = ymdMatch;
                              formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                            } else {
                              const d = new Date(dateStr);
                              if (!isNaN(d.getTime())) {
                                formattedDate = d.toISOString().split('T')[0];
                              }
                            }
                          }
                        }

                        return {
                          matricule: matricule ? String(matricule).trim() : '',
                          nom: String(nom).trim(),
                          prenom: String(prenom).trim(),
                          sexe: cleanSexe,
                          date_naissance: formattedDate,
                          nom_parent: row['Nom du Parent'] || row.nom_parent || row['Parent'] || '',
                          tel_parent: row['Téléphone du Parent'] || row.tel_parent || row['Tel Parent'] || row['Téléphone'] || row['Telephone'] || '',
                          email_parent: row['Email du Parent'] || row.email_parent || row['Email'] || '',
                          statut: row['Statut'] || row.statut || 'Passant',
                          regime_inscription: (importAsAncien || String(row['Ancienneté'] || row['Anciennete'] || row['Régime'] || row['Regime'] || '').toLowerCase().includes('ancien')) ? 'Ancien' : 'Nouveau',
                          adresse: row.Adresse || row.adresse || '',
                          classe_id: rowClasseId
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

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <input 
                      type="checkbox" 
                      id="importAsAncienCheckbox"
                      checked={importAsAncien}
                      onChange={(e) => setImportAsAncien(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                    />
                    <label htmlFor="importAsAncienCheckbox" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                      Déclarer tous les élèves importés comme <span className="text-emerald-700 font-bold">Anciens élèves</span> (par défaut: <span className="text-sky-700 font-bold">Nouveaux</span>)
                    </label>
                  </div>
                  
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
                            Aperçu du contenu du fichier ({importData.length} élèves) :
                          </p>
                          <span className="text-[10px] text-slate-400 font-medium">Défilez pour voir tout le fichier</span>
                        </div>
                        <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto shadow-inner bg-white">
                          <table className="w-full text-left text-xs relative">
                            <thead className="bg-slate-100 text-slate-700 uppercase font-bold tracking-wider sticky top-0 z-10 border-b border-slate-200">
                              <tr>
                                <th className="px-3 py-2 w-10 text-center">#</th>
                                <th className="px-3 py-2">Matricule</th>
                                <th className="px-3 py-2">Nom & Prénom</th>
                                <th className="px-3 py-2">Sexe</th>
                                <th className="px-3 py-2">Date Naiss.</th>
                                <th className="px-3 py-2">Classe</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {importData.map((row: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px]">{i + 1}</td>
                                  <td className="px-3 py-2 font-mono text-primary-600 font-bold">{row.matricule}</td>
                                  <td className="px-3 py-2 font-medium text-slate-800">{row.nom} {row.prenom}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.sexe}</td>
                                  <td className="px-3 py-2 text-slate-500">{row.date_naissance || '-'}</td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {row.classe_id ? classes.find((c: any) => c.id === row.classe_id)?.nom : classes.find((c: any) => String(c.id) === importClasseId)?.nom || 'N/A'}
                                  </td>
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
                          apiFetch('/api/eleves/import', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ classe_id: importClasseId, eleves: importData, dryRun: true })
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
                          <>Lancer l'importation ({importData.length} élève{importData.length > 1 ? 's' : ''})</>
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
                  entityName="élève"
                  onContinueAll={() => handleExecuteImport('all')}
                  onContinueValidOnly={() => handleExecuteImport('valid_only')}
                  isSubmitting={isImporting}
                />
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <button 
                onClick={() => {
                  setShowImportModal(false);
                  setImportWorkbook(null);
                  setImportData([]);
                  setImportErrors([]);
                }} 
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Fiche de l'élève</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-sm">
                  {selectedStudent.photo ? (
                    <img src={selectedStudent.photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserPlus size={48} className="text-slate-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">{selectedStudent.nom} {selectedStudent.prenom}</h3>
                  <p className="text-primary-600 font-mono font-bold">{selectedStudent.matricule}</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full uppercase">
                    {selectedStudent.classe_nom}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Sexe</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date de naissance</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.date_naissance || 'Non renseignée'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Parent</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.nom_parent}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Téléphone Parent</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.tel_parent}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Parent</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.email_parent || 'Non renseigné'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Statut académique</p>
                  <p className={`text-sm font-bold ${selectedStudent.statut === 'Passant' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedStudent.statut || 'Passant'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Régime / Ancienneté</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${
                      (selectedStudent.anciennete === 'Ancien' || selectedStudent.regime_inscription === 'Ancien')
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-sky-50 text-sky-700 border-sky-200'
                    }`}>
                      {selectedStudent.anciennete_libelle || ((selectedStudent.anciennete === 'Ancien' || selectedStudent.regime_inscription === 'Ancien') ? (selectedStudent.sexe === 'F' ? 'Ancienne' : 'Ancien') : (selectedStudent.sexe === 'F' ? 'Nouvelle' : 'Nouveau'))}
                    </span>
                    {canWrite && (
                      <button
                        onClick={() => handleDeclareSingleSeniority(
                          selectedStudent, 
                          (selectedStudent.anciennete === 'Ancien' || selectedStudent.regime_inscription === 'Ancien') ? 'Nouveau' : 'Ancien'
                        )}
                        className="text-xs text-primary-600 hover:text-primary-700 underline font-semibold"
                        title="Modifier manuellement l'ancienneté"
                      >
                        Basculer en {(selectedStudent.anciennete === 'Ancien' || selectedStudent.regime_inscription === 'Ancien') ? (selectedStudent.sexe === 'F' ? 'Nouvelle' : 'Nouveau') : (selectedStudent.sexe === 'F' ? 'Ancienne' : 'Ancien')}
                      </button>
                    )}
                  </div>
                  {selectedStudent.anciennete_motif && (
                    <p className="text-[11px] text-slate-400 italic mt-0.5">
                      {selectedStudent.anciennete_motif}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Scolarité</p>
                  <p className="text-sm font-bold text-slate-900">{(selectedStudent.frais_scolarite || 0).toLocaleString()} {selectedStudent.devise || 'FCFA'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Payé</p>
                  <p className="text-sm font-bold text-primary-600">{(selectedStudent.total_paye || 0).toLocaleString()} {selectedStudent.devise || 'FCFA'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reste à payer</p>
                  <p className={`text-sm font-bold ${(selectedStudent.frais_scolarite - (selectedStudent.total_paye || 0)) > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                    {(selectedStudent.frais_scolarite - (selectedStudent.total_paye || 0)).toLocaleString()} {selectedStudent.devise || 'FCFA'}
                  </p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Adresse</p>
                  <p className="text-sm font-medium text-slate-700">{selectedStudent.adresse}</p>
                </div>
              </div>

              {/* Parent Account Info */}
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                    <Key size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-primary-400 tracking-wider">Compte Parent</p>
                    {parentAccount ? (
                      <p className="text-sm font-bold text-slate-900">{parentAccount}</p>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucun compte généré</p>
                    )}
                  </div>
                </div>
                {!parentAccount && (
                  <button 
                    onClick={async () => {
                      if (await confirm({
                        title: "Générer un compte parent",
                        message: "Générer un compte d'accès parent pour cet élève ?",
                        confirmText: "Générer",
                        variant: "primary"
                      })) {
                        apiFetch('/api/eleves/generate-accounts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ studentIds: [selectedStudent.id] })
                        })
                        .then(res => res.json())
                        .then(data => {
                          if (data.success && data.results.length > 0) {
                            setParentAccount(data.results[0].identifier);
                            toast.success(`Compte créé ! Identifiant: ${data.results[0].identifier}, Mot de passe: ${data.results[0].password}`, { duration: 6000 });
                          } else {
                            toast.error("Erreur: " + (data.error || "Impossible de créer le compte"));
                          }
                        });
                      }
                    }}
                    className="px-3 py-1 bg-white text-primary-600 border border-primary-200 rounded-lg text-[10px] font-bold hover:bg-primary-50 transition-colors"
                  >
                    Générer
                  </button>
                )}
              </div>

              {/* Bibliothèque Scolaire & Adhésion */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                      <Library size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bibliothèque Scolaire</p>
                      <p className="text-sm font-bold text-slate-900">
                        {Boolean(selectedStudent.est_adherent_bibliotheque) ? (
                          <span className="text-indigo-700">Adhérent ({selectedStudent.adherent_code || 'Inscrit'})</span>
                        ) : (
                          <span className="text-slate-500 font-normal text-xs">Non inscrit (Adhésion auto au 1er emprunt)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {Boolean(selectedStudent.est_adherent_bibliotheque) && (
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                      Boolean(selectedStudent.adherent_biblio_expire) 
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}>
                      {Boolean(selectedStudent.adherent_biblio_expire) ? 'Expiré (1 an)' : 'Valide (1 an)'}
                    </span>
                  )}
                </div>

                {Boolean(selectedStudent.est_adherent_bibliotheque) && (
                  <div className="pt-2 border-t border-slate-200/60 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Date d'expiration</span>
                      <span className="font-semibold text-slate-700">
                        {selectedStudent.adherent_date_expiration ? selectedStudent.adherent_date_expiration : '1 an'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">Cotisation / Dette</span>
                      {(selectedStudent.dette_adhesion_bibliotheque || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-bold">
                          <AlertCircle size={12} />
                          Dette : {(selectedStudent.dette_adhesion_bibliotheque || 0).toLocaleString()} FCFA
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 size={12} />
                          Cotisation soldée
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t flex gap-3">
                <button 
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedStudent);
                  }}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit2 size={18} /> Modifier
                </button>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accounts Modal */}
      {showAccountsModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Key size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Comptes Générés</h2>
                  <p className="text-sm text-slate-500">Voici les identifiants pour les parents</p>
                </div>
              </div>
              <button onClick={() => setShowAccountsModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {generatedAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-2">Aucun compte n'a été généré.</p>
                  {generationErrors.length > 0 && (
                    <div className="bg-red-50 p-4 rounded-xl text-left">
                      <p className="text-xs font-bold text-red-600 mb-2">Erreurs rencontrées :</p>
                      <ul className="text-[10px] text-red-500 list-disc list-inside">
                        {generationErrors.map((err: any, i: number) => (
                          <li key={i}>{err.student}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 mt-2">(Il est possible que les comptes existent déjà pour ces élèves)</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {generatedAccounts.map((account, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold text-slate-900">{account.student}</p>
                        <p className="text-xs text-slate-500">Identifiant: <span className="font-mono text-primary-600 font-bold">{account.identifier}</span></p>
                      </div>
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Mot de passe</p>
                        <p className="font-mono font-bold text-amber-600">{account.password}</p>
                      </div>
                    </div>
                  ))}
                  {generationErrors.length > 0 && (
                    <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                      <p className="text-xs font-bold text-red-600 mb-1">Non générés ({generationErrors.length}) :</p>
                      <ul className="text-[10px] text-red-500 list-disc list-inside">
                        {generationErrors.map((err: any, i: number) => (
                          <li key={i}>{err.student}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button 
                onClick={() => {
                  const content = generatedAccounts.map(a => `${a.student}\nID: ${a.identifier}\nPWD: ${a.password}`).join('\n\n');
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'comptes_eleves.txt';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
              >
                <Download size={20} />
                Télécharger (.txt)
              </button>
              <button 
                onClick={() => setShowAccountsModal(false)}
                className="flex-1 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all"
              >
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 text-primary-600 rounded-xl">
                  <Mail size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Envoyer un email groupé</h2>
                  <p className="text-sm text-slate-500">{selectedStudents.length} destinataire(s) sélectionné(s)</p>
                </div>
              </div>
              <button onClick={() => setShowEmailModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const subject = (form.elements.namedItem('subject') as HTMLInputElement).value;
              const body = (form.elements.namedItem('body') as HTMLTextAreaElement).value;
              
              const recipients = eleves
                .filter((e: any) => selectedStudents.includes(e.id) && e.email_parent)
                .map((e: any) => e.email_parent);

              if (recipients.length === 0) {
                toast.error("Aucun des élèves sélectionnés n'a d'email parent renseigné.");
                return;
              }

              apiFetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipients, subject, body })
              })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  toast.success(data.message || 'Email envoyé avec succès !');
                  setShowEmailModal(false);
                  setSelectedStudents([]);
                } else {
                  toast.error('Erreur: ' + data.error);
                }
              });
            }} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Sujet</label>
                <input 
                  name="subject"
                  required
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Retard de paiement / Réunion parents-profs"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Message</label>
                <textarea 
                  name="body"
                  required
                  rows={8}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Écrivez votre message ici..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-[2] py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  Envoyer le message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && selectedStudent && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Transférer l'élève</h2>
              <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                <p className="text-sm text-primary-800">
                  Vous allez transférer <strong>{selectedStudent.nom} {selectedStudent.prenom}</strong> de la classe <strong>{selectedStudent.classe_nom}</strong> vers une nouvelle classe.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nouvelle Classe</label>
                <select 
                  required
                  value={newClasseId}
                  onChange={e => setNewClasseId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner la nouvelle classe</option>
                  {availableClasses.filter((c: any) => c.id !== selectedStudent.classe_id).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {isEditing ? 'Modifier l\'élève' : 'Nouvelle Inscription'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={(e) => handleSubmit(e)} className="p-6 space-y-6">
              <div className="flex flex-col items-center gap-4 mb-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors overflow-hidden relative group"
                >
                  {formData.photo ? (
                    <img src={formData.photo} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera size={32} className="text-slate-300 mb-2" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Ajouter photo</span>
                    </>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handlePhotoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Matricule</label>
                  <input 
                    required
                    value={formData.matricule}
                    onChange={e => setFormData({...formData, matricule: e.target.value})}
                    type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select 
                    required
                    value={formData.classe_id}
                    onChange={e => setFormData({...formData, classe_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner une classe</option>
                    {availableClasses.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
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
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Sexe</label>
                  <select 
                    value={formData.sexe}
                    onChange={e => setFormData({...formData, sexe: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Date de naissance</label>
                  <input 
                    value={formData.date_naissance}
                    onChange={e => setFormData({...formData, date_naissance: e.target.value})}
                    type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Statut académique</label>
                  <select 
                    value={formData.statut}
                    onChange={e => setFormData({...formData, statut: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Passant">Passant</option>
                    <option value="Redoublant(e)">Redoublant(e)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Ancienneté / Régime</label>
                  <select 
                    value={(formData as any).regime_inscription || 'Nouveau'}
                    onChange={e => setFormData({...formData, regime_inscription: e.target.value} as any)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="Nouveau">Nouveau / Nouvelle</option>
                    <option value="Ancien">Ancien / Ancienne</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-bold text-slate-800 mb-4">Informations Parentales</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nom du parent</label>
                    <input 
                      value={formData.nom_parent}
                      onChange={e => setFormData({...formData, nom_parent: e.target.value})}
                      type="text" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Téléphone parent</label>
                    <input 
                      value={formData.tel_parent}
                      onChange={e => setFormData({...formData, tel_parent: e.target.value})}
                      type="tel" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email parent</label>
                    <input 
                      value={formData.email_parent}
                      onChange={e => setFormData({...formData, email_parent: e.target.value})}
                      type="email" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                      placeholder="parent@example.com"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700">Adresse</label>
                    <textarea 
                      value={formData.adresse}
                      onChange={e => setFormData({...formData, adresse: e.target.value})}
                      rows={2} className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                    ></textarea>
                  </div>
                </div>
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
                  {isEditing ? 'Enregistrer les modifications' : 'Inscrire l\'élève'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Preview Modal */}
      {showReceipt && lastPayment && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileText size={24} className="text-primary-600" />
                Aperçu du Reçu
              </h2>
              <button onClick={() => setShowReceipt(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="border-2 border-slate-100 rounded-2xl p-8 space-y-8 bg-white shadow-sm">
                {/* School Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {schoolInfo?.logo && (
                      <img src={schoolInfo.logo} alt="Logo" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                    )}
                    <div>
                      <h3 className="text-xl font-black text-slate-900 uppercase">{schoolInfo?.nom || 'Établissement Scolaire'}</h3>
                      <p className="text-xs italic text-slate-500">{schoolInfo?.slogan}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {schoolInfo?.adresse} • {schoolInfo?.telephone}<br/>
                        {schoolInfo?.email} • {schoolInfo?.site_web}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-primary-600 text-white px-4 py-1 rounded-lg text-xs font-bold mb-1">REÇU N° {lastPayment.id}</div>
                    <p className="text-[10px] text-slate-400">{lastPayment.date_paiement}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                {/* Student Info */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Élève</p>
                    <p className="text-sm font-bold text-slate-800">{lastPayment.eleve_nom} {lastPayment.eleve_prenom}</p>
                    <p className="text-xs text-slate-500">Matricule: {lastPayment.eleve_matricule}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classe</p>
                    <p className="text-sm font-bold text-slate-800">{lastPayment.eleve_classe}</p>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{lastPayment.type_paiement}</span>
                    <span className="text-sm font-black text-slate-900">{parseInt(lastPayment.montant).toLocaleString()} FCFA</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">TOTAL PAYÉ</span>
                    <span className="text-lg font-black text-primary-600">{parseInt(lastPayment.montant).toLocaleString()} FCFA</span>
                  </div>
                </div>

                {/* Balance & Status */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-[10px] font-bold text-red-400 uppercase">Reste à payer</p>
                    <p className="text-sm font-black text-red-700">{(lastPayment.reste_scolarite + lastPayment.reste_inscription).toLocaleString()} FCFA</p>
                  </div>
                  <div className={`p-3 rounded-xl border ${lastPayment.inscription_payee ? 'bg-primary-50 border-primary-100' : 'bg-amber-50 border-amber-100'}`}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Frais d'inscription</p>
                    <p className={`text-sm font-black ${lastPayment.inscription_payee ? 'text-primary-700' : 'text-amber-700'}`}>
                      {lastPayment.inscription_payee ? 'PAYÉS' : 'NON PAYÉS'}
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between pt-6">
                  {/* QR Code Authentification Reçu */}
                  <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <QRCodeSVG 
                      value={buildVerificationUrl({
                        docType: 'recu_paiement',
                        docTitle: `Reçu de Paiement N° ${lastPayment.id}`,
                        reference: `REC-${lastPayment.id}`,
                        schoolName: schoolInfo?.nom || 'Établissement Scolaire',
                        beneficiaryNom: lastPayment.eleve_nom,
                        beneficiaryPrenom: lastPayment.eleve_prenom,
                        matricule: lastPayment.eleve_matricule,
                        classe: lastPayment.eleve_classe,
                        montant: `${lastPayment.montant} FCFA`,
                        dateEmission: lastPayment.date_paiement || new Date().toISOString().split('T')[0],
                        signataire: "Le Service Comptabilité"
                      })} 
                      size={44}
                      level="L"
                    />
                    <div className="text-left">
                      <span className="text-[9px] font-bold text-slate-700 block uppercase tracking-wider">Document Authentifié</span>
                      <span className="text-[8px] text-slate-500 block">Scannez pour vérifier la validité de ce reçu</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-32 h-px bg-slate-200 mb-2" />
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Signature / Cachet</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t flex gap-3">
              <button 
                onClick={() => setShowReceipt(false)}
                className="flex-1 px-4 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 transition-all"
              >
                Fermer
              </button>
              <button 
                onClick={handlePrint}
                className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <Printer size={20} />
                Imprimer
              </button>
              <button 
                onClick={handleSavePDF}
                className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-200"
              >
                <Download size={20} />
                Enregistrer PDF
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Encaisser un paiement</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Élève</label>
                <select 
                  required
                  value={paymentFormData.eleve_id}
                  onChange={e => setPaymentFormData({...paymentFormData, eleve_id: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un élève</option>
                  {eleves.map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type de paiement</label>
                <select 
                  value={paymentFormData.type_paiement}
                  onChange={e => setPaymentFormData({...paymentFormData, type_paiement: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Frais d'inscription">Frais d'inscription</option>
                  <option value="Frais de scolarité">Frais de scolarité</option>
                  <option value="Frais d'examen">Frais d'examen</option>
                  <option value="Autres frais">Autres frais</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Montant (FCFA)</label>
                <input 
                  required
                  value={paymentFormData.montant}
                  onChange={e => setPaymentFormData({...paymentFormData, montant: e.target.value})}
                  type="number" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de paiement</label>
                <input 
                  value={paymentFormData.date_paiement}
                  onChange={e => setPaymentFormData({...paymentFormData, date_paiement: e.target.value})}
                  type="date" className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  Valider le paiement
                </button>
              </div>
            </form>
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
          targetType="eleves"
          title="Importation de photos - Élèves"
          description="Les photos sélectionnées sont automatiquement associées par le nom de fichier au format nom_prénoms_matricule."
          initialFiles={batchPhotoFiles}
          entities={
            (selectedStudents.length > 0
              ? eleves.filter((e: any) => selectedStudents.includes(e.id))
              : eleves
            ).map((e: any) => ({
              id: e.id,
              nom: e.nom,
              prenom: e.prenom,
              matricule: e.matricule || '',
              photo: e.photo || '',
              subtitle: e.classe_nom ? `Classe : ${e.classe_nom}` : undefined
            }))
          }
          onSuccess={() => {
            fetchEleves();
            setSelectedStudents([]);
          }}
        />
      )}

      {/* Student Abandon / Reprise Modal */}
      {abandonModalStudent && (
        <StudentAbandonModal
          student={abandonModalStudent}
          isOpen={Boolean(abandonModalStudent)}
          onClose={() => setAbandonModalStudent(null)}
          onSuccess={() => {
            fetchEleves();
          }}
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
          entityName="élève"
          onContinueAll={handleConfirmSingleSuspect}
        />
      )}
    </div>
  );
}


