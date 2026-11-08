import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  Plus, 
  CreditCard, 
  History, 
  AlertCircle, 
  Search, 
  Filter, 
  X, 
  ChevronLeft, 
  Printer, 
  FileText, 
  Download, 
  Sparkles,
  Layers,
  ArrowRight,
  Wallet,
  CheckCircle2,
  BookOpen,
  Upload,
  User,
  Trash2,
  Phone,
  MapPin,
  PhoneCall,
  School,
  Calendar,
  GraduationCap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { generateReceiptPDF, downloadReceiptPDF, printReceiptPDF } from '../utils/receipt';
import { formatClassName } from '../utils/format';
import { QRCodeSVG } from 'qrcode.react';
import { buildVerificationUrl } from '../utils/qrAuth';
import toast from 'react-hot-toast';
import ScolaritePaymentModal from '../components/ScolaritePaymentModal';
import ArrieresAnterieursStats from '../components/ArrieresAnterieursStats';

interface PaymentsProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Payments({ cycle = 'all' }: PaymentsProps) {
  const [paiements, setPaiements] = React.useState<any[]>([]);
  const [eleves, setEleves] = React.useState<any[]>([]);
  const [classStats, setClassStats] = React.useState<any[]>([]);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showReceipt, setShowReceipt] = React.useState(false);
  const [lastPayment, setLastPayment] = React.useState<any>(null);
  const [selectedClassDetails, setSelectedClassDetails] = React.useState<any>(null);
  const [studentSearch, setStudentSearch] = React.useState('');
  const [showStudentResults, setShowStudentResults] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState('ALL');

  // Scolarité & Arriérés Dedicated States
  const [showScolariteModal, setShowScolariteModal] = React.useState(false);
  const [scolaritePreselectedEleveId, setScolaritePreselectedEleveId] = React.useState<number | undefined>(undefined);
  const [scolariteInitialIsArrieres, setScolariteInitialIsArrieres] = React.useState(false);
  const [scolariteInitialAnneeConcerneeId, setScolariteInitialAnneeConcerneeId] = React.useState<number | undefined>(undefined);
  const [scolariteInitialAnneeConcerneeLibelle, setScolariteInitialAnneeConcerneeLibelle] = React.useState<string | undefined>(undefined);
  const [anneesList, setAnneesList] = React.useState<any[]>([]);
  const [viewMode, setViewMode] = React.useState<'overview' | 'arrieres'>('overview');

  // Adhésion Bibliothèque State
  const [showLibraryModal, setShowLibraryModal] = React.useState(false);
  const [libraryClassFilter, setLibraryClassFilter] = React.useState('');
  const [libraryStudentSearch, setLibraryStudentSearch] = React.useState('');
  const [isSubmittingLibrary, setIsSubmittingLibrary] = React.useState(false);
  const [libraryForm, setLibraryForm] = React.useState({
    type_member: 'eleve' as 'eleve' | 'externe',
    eleve_id: '',
    nom_complet: '',
    telephone: '',
    email: '',
    date_naissance: '',
    lieu_naissance: '',
    adresse: '',
    ecole_provenance: '',
    parents_tuteurs: '',
    contact_urgence_nom: '',
    contact_urgence_telephone: '',
    contact_urgence_adresse: '',
    classe_nom: '',
    photo: '',
    montant: '1000',
    methode: 'Espèces',
    date_paiement: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/paiements' : p.path === '/paiements'));
  const canWrite = user.role === 'admin' || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [formData, setFormData] = React.useState({
    eleve_id: '',
    type_paiement: 'Frais de scolarité',
    montant: '',
    date_paiement: new Date().toISOString().split('T')[0],
    annee_id: '',
    annee_concernee_id: '',
    annee_concernee_libelle: '',
    methode: 'Espèces'
  });

  const [selectedClassId, setSelectedClassId] = React.useState('');
  const [classes, setClasses] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any>(null);

  const cycleParam = cycle && cycle !== 'all' ? `?cycle=${cycle}` : '';

  React.useEffect(() => {
    apiFetch('/api/annees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAnneesList(data);
      })
      .catch(() => {});
  }, []);

  const fetchPaiements = () => {
    apiFetch(`/api/paiements${cycleParam}`)
      .then(res => res.json())
      .then(data => setPaiements(Array.isArray(data) ? data : []))
      .catch(() => setPaiements([]));
  };

  const fetchClassStats = () => {
    apiFetch(`/api/stats/paiements-par-classe${cycleParam}`)
      .then(res => res.json())
      .then(data => setClassStats(Array.isArray(data) ? data : []))
      .catch(() => setClassStats([]));
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
          if (data.active_year_id) {
            setFormData(prev => ({ ...prev, annee_id: data.active_year_id }));
          }
        }
      })
      .catch(err => console.error(err));
  };

  const fetchClasses = () => {
    apiFetch(`/api/classes${cycleParam}`)
      .then(res => res.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  };

  const fetchEleves = () => {
    apiFetch(`/api/eleves${cycleParam}`)
      .then(res => res.json())
      .then(data => setEleves(Array.isArray(data) ? data : []))
      .catch(() => setEleves([]));
  };

  const fetchStats = () => {
    apiFetch(`/api/stats${cycleParam}`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  };

  React.useEffect(() => {
    fetchPaiements();
    fetchClassStats();
    fetchSchoolInfo();
    fetchClasses();
    fetchStats();
    fetchEleves();
  }, [cycle]);

  const totalEncaisse = React.useMemo(() => {
    return paiements
      .filter((p: any) => p.status === 'Terminé' || p.status === 'completed')
      .reduce((sum, p: any) => sum + Number(p.montant || 0), 0);
  }, [paiements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.eleve_id) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }

    if (formData.methode === 'Online') {
      try {
        const student = eleves.find((e: any) => e.id === parseInt(formData.eleve_id));
        const response = await apiFetch('/api/paiements/fedapay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, student_name: `${student?.nom || ''} ${student?.prenom || ''}` })
        });
        const data = await response.json();
        
        if (data.url) {
          window.open(data.url, '_blank');
          setShowModal(false);
          toast.success("Redirection vers la passerelle de paiement Fedapay...");
          setTimeout(() => {
            fetchPaiements();
            fetchClassStats();
          }, 3000);
          return;
        } else {
          toast.error('Erreur lors de la création de la transaction Fedapay.');
          return;
        }
      } catch (error) {
        console.error("Fedapay error:", error);
        toast.error('Erreur de connexion à Fedapay.');
        return;
      }
    }

    apiFetch('/api/paiements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then((data) => {
      setShowModal(false);
      toast.success("Paiement enregistré avec succès !");
      fetchPaiements();
      fetchClassStats();
      fetchEleves();
      fetchStats();
      
      // Find the student for the receipt
      const student = eleves.find((e: any) => e.id === parseInt(formData.eleve_id));
      setLastPayment({
        ...formData,
        id: data.id,
        numero_adherent: data.numero_adherent,
        eleve_nom: student?.nom,
        eleve_prenom: student?.prenom,
        eleve_matricule: student?.matricule,
        eleve_classe: student?.classe_nom,
        reste_scolarite: (student?.frais_scolarite || 0) - (student?.total_paye_scolarite || 0) - (formData.type_paiement === 'Frais de scolarité' ? (parseInt(formData.montant) || 0) : 0),
        reste_inscription: (student?.frais_inscription || 0) - (student?.total_paye_inscription || 0) - (formData.type_paiement === "Frais d'inscription" ? (parseInt(formData.montant) || 0) : 0),
        inscription_payee: (student?.total_paye_inscription || 0) + (formData.type_paiement === "Frais d'inscription" ? (parseInt(formData.montant) || 0) : 0) >= (student?.frais_inscription || 0)
      });
      setShowReceipt(true);

      setFormData({
        eleve_id: '', type_paiement: 'Frais de scolarité', montant: '',
        date_paiement: new Date().toISOString().split('T')[0], annee_id: schoolInfo?.active_year_id || '', methode: 'Espèces'
      });
      setStudentSearch('');
    })
    .catch((err) => {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement du paiement");
    });
  };

  const handleLibrarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (libraryForm.type_member === 'eleve' && !libraryForm.eleve_id) {
      toast.error("Veuillez sélectionner un élève");
      return;
    }

    if (libraryForm.type_member === 'externe' && !libraryForm.nom_complet.trim()) {
      toast.error("Veuillez saisir le nom complet de l'adhérent");
      return;
    }

    setIsSubmittingLibrary(true);
    try {
      const selectedStudent = eleves.find(st => String(st.id) === String(libraryForm.eleve_id));
      const payload = {
        eleve_id: libraryForm.type_member === 'eleve' ? libraryForm.eleve_id : null,
        nom_complet: libraryForm.type_member === 'eleve' 
          ? (selectedStudent ? `${selectedStudent.nom} ${selectedStudent.prenom}` : '') 
          : libraryForm.nom_complet,
        classe_nom: libraryForm.type_member === 'eleve' ? selectedStudent?.classe_nom : libraryForm.classe_nom,
        telephone: libraryForm.telephone || (libraryForm.type_member === 'eleve' ? selectedStudent?.tel_parent : ''),
        email: libraryForm.email,
        photo: libraryForm.photo || selectedStudent?.photo || null,
        date_naissance: libraryForm.date_naissance || (libraryForm.type_member === 'eleve' ? selectedStudent?.date_naissance : null),
        lieu_naissance: libraryForm.lieu_naissance,
        adresse: libraryForm.adresse || (libraryForm.type_member === 'eleve' ? selectedStudent?.adresse : null),
        ecole_provenance: libraryForm.ecole_provenance,
        parents_tuteurs: libraryForm.parents_tuteurs,
        contact_urgence_nom: libraryForm.contact_urgence_nom,
        contact_urgence_telephone: libraryForm.contact_urgence_telephone,
        contact_urgence_adresse: libraryForm.contact_urgence_adresse,
        type_paiement: "Adhésion Bibliothèque",
        montant: libraryForm.montant,
        date_paiement: libraryForm.date_paiement,
        methode: libraryForm.methode,
        annee_id: schoolInfo?.active_year_id || ''
      };

      const res = await apiFetch('/api/paiements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Adhésion enregistrée ! Code Adhérent : ${data.numero_adherent || 'N/A'}`);
        setShowLibraryModal(false);
        fetchPaiements();
        fetchStats();

        // Display receipt with Adherent Code
        setLastPayment({
          id: data.id,
          numero_adherent: data.numero_adherent,
          eleve_id: payload.eleve_id,
          eleve_nom: selectedStudent ? selectedStudent.nom : payload.nom_complet,
          eleve_prenom: selectedStudent ? selectedStudent.prenom : '',
          eleve_matricule: selectedStudent?.matricule || 'EXTERNE',
          eleve_classe: selectedStudent?.classe_nom || payload.classe_nom || 'Adhérent Bibliothèque',
          type_paiement: "Adhésion Bibliothèque",
          montant: payload.montant,
          date_paiement: payload.date_paiement,
          methode: payload.methode,
          photo: payload.photo,
          inscription_payee: true
        });
        setShowReceipt(true);
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement de l'adhésion");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsSubmittingLibrary(false);
    }
  };

  const handlePrint = async () => {
    try {
      await printReceiptPDF(lastPayment, schoolInfo);
    } catch (e) {
      console.error("Print receipt error:", e);
      toast.error("Erreur lors de l'impression du reçu");
    }
  };

  const handleSavePDF = async () => {
    try {
      const safeName = `${lastPayment.eleve_nom || ''}_${lastPayment.eleve_prenom || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
      await downloadReceiptPDF(lastPayment, schoolInfo, `recu_A5_${safeName}_${lastPayment.id}.pdf`);
      toast.success("Reçu A5 téléchargé en PDF !");
    } catch (e) {
      console.error("Save receipt error:", e);
      toast.error("Erreur lors de l'enregistrement du reçu");
    }
  };

  const filteredEleves = eleves
    .filter((e: any) => {
      const matchesSearch = ((e.nom || '') + ' ' + (e.prenom || '')).toLowerCase().includes(studentSearch.toLowerCase()) ||
        (e.matricule || '').toLowerCase().includes(studentSearch.toLowerCase());
      const matchesClass = selectedClassId ? e.classe_id === parseInt(selectedClassId) : true;
      return matchesSearch && matchesClass;
    })
    .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''));

  const filteredPaiements = paiements.filter((p: any) => {
    const matchesSearch = searchTerm === '' || 
      `${p.nom || ''} ${p.prenom || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.classe_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.type_paiement || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'ALL' || p.type_paiement === filterType;
    return matchesSearch && matchesType;
  });

  const headerConfig = {
    all: {
      title: "Gestion des Paiements Scolaires (Tous Cycles)",
      subtitle: "Suivi consolidé des frais de scolarité, inscriptions et reçus d'encaissement pour l'ensemble de l'école.",
      badge: "Tous Cycles Confondus",
      badgeColor: "bg-primary-50 text-primary-700 border-primary-200",
      colorTheme: "primary"
    },
    primaire: {
      title: "Paiements Scolarité — Maternelle & Primaire",
      subtitle: "Suivi des frais de scolarité, inscriptions et reçus d'encaissement spécifiques au cycle Maternelle & Primaire.",
      badge: "Espace Maternelle & Primaire",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      colorTheme: "emerald"
    },
    secondaire: {
      title: "Paiements Scolarité — Secondaire",
      subtitle: "Suivi des frais de scolarité, inscriptions et reçus d'encaissement spécifiques au Secondaire (Collège & Lycée).",
      badge: "Espace Secondaire (Collège & Lycée)",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      colorTheme: "blue"
    }
  }[cycle] || {
    title: "Gestion des Paiements Scolaires",
    subtitle: "Suivi des frais de scolarité et reçus.",
    badge: "Espace Scolarité",
    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
    colorTheme: "primary"
  };

  return (
    <div className="space-y-8 pb-16 md:pb-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border ${headerConfig.badgeColor}`}>
              {headerConfig.badge}
            </span>
            {cycle !== 'all' && (
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" /> Données filtrées
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {headerConfig.title}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {headerConfig.subtitle}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          {/* Quick Cycle Switcher */}
          <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl gap-1">
            <Link
              to="/paiements"
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                cycle === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Tous
            </Link>
            <Link
              to="/paiements-primaire"
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                cycle === 'primaire' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Primaire
            </Link>
            <Link
              to="/paiements-secondaire"
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                cycle === 'secondaire' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Secondaire
            </Link>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button 
                onClick={() => {
                  setScolaritePreselectedEleveId(undefined);
                  setScolariteInitialIsArrieres(false);
                  setScolariteInitialAnneeConcerneeId(undefined);
                  setScolariteInitialAnneeConcerneeLibelle(undefined);
                  setShowScolariteModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-200 text-xs sm:text-sm"
              >
                <GraduationCap size={18} />
                Payer la scolarité
              </button>

              <button 
                onClick={() => {
                  setLibraryForm({
                    type_member: 'eleve',
                    eleve_id: '',
                    nom_complet: '',
                    telephone: '',
                    email: '',
                    date_naissance: '',
                    lieu_naissance: '',
                    adresse: '',
                    ecole_provenance: '',
                    parents_tuteurs: '',
                    contact_urgence_nom: '',
                    contact_urgence_telephone: '',
                    contact_urgence_adresse: '',
                    classe_nom: '',
                    photo: '',
                    montant: '1000',
                    methode: 'Espèces',
                    date_paiement: new Date().toISOString().split('T')[0],
                    notes: ''
                  });
                  setLibraryStudentSearch('');
                  setLibraryClassFilter('');
                  setShowLibraryModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-200 text-xs sm:text-sm"
              >
                <BookOpen size={18} />
                Adhésion à la bibliothèque
              </button>

              <button 
                onClick={() => {
                  setSelectedClassId('');
                  setStudentSearch('');
                  setFormData({
                    eleve_id: '',
                    type_paiement: 'Frais de scolarité',
                    montant: '',
                    date_paiement: new Date().toISOString().split('T')[0],
                    annee_id: schoolInfo?.active_year_id || '',
                    methode: 'Espèces'
                  });
                  setShowModal(true);
                }}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-primary-200 text-xs sm:text-sm"
              >
                <Plus size={18} />
                Encaisser un paiement
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation tabs: Vue Générale vs Statistiques Arriérés Antérieurs */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-xs w-fit">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            viewMode === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Vue Générale & Transactions
        </button>
        <button
          onClick={() => setViewMode('arrieres')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            viewMode === 'arrieres'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-amber-800 hover:text-amber-900 hover:bg-amber-50'
          }`}
        >
          <AlertCircle size={14} />
          Statistiques des Arriérés Antérieurs
        </button>
      </div>

      {viewMode === 'arrieres' ? (
        <ArrieresAnterieursStats 
          cycle={cycle}
          onEncaisserArriere={(el) => {
            setScolaritePreselectedEleveId(el.eleve_id || el.id);
            setScolariteInitialIsArrieres(true);
            setScolariteInitialAnneeConcerneeId(el.annee_precedente_id);
            setScolariteInitialAnneeConcerneeLibelle(el.annee_precedente_libelle);
            setShowScolariteModal(true);
          }}
        />
      ) : (
        <>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <CreditCard size={26} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Encaissé</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight my-0.5">
              {totalEncaisse.toLocaleString()} <span className="text-xs font-medium text-slate-400">FCFA</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">Année scolaire en cours</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Wallet size={26} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ce Mois-ci</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight my-0.5">
              {Number(stats?.monthlyRevenue || 0).toLocaleString()} <span className="text-xs font-medium text-slate-400">FCFA</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">Semaine: {Number(stats?.weeklyRevenue || 0).toLocaleString()} F</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
            <Layers size={26} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Aujourd'hui</p>
            <h4 className="text-2xl font-black text-slate-900 tracking-tight my-0.5">
              {Number(stats?.dailyRevenue || 0).toLocaleString()} <span className="text-xs font-medium text-slate-400">FCFA</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">Transactions du jour</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle size={26} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Solde Incomplet</p>
            <h4 className="text-2xl font-black text-rose-600 tracking-tight my-0.5">
              {eleves.filter((e: any) => ((e.frais_scolarite || 0) + (e.frais_inscription || 0)) > ((e.total_paye_scolarite || 0) + (e.total_paye_inscription || 0))).length} <span className="text-xs font-medium text-slate-400">Élèves</span>
            </h4>
            <p className="text-xs text-slate-500 font-medium">Reste à solder</p>
          </div>
        </div>
      </div>

      {/* Class Summary Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Récapitulatif par Classe</h3>
            <p className="text-xs text-slate-500">Recouvrement, total attendu et restes par classe ({headerConfig.badge})</p>
          </div>
        </div>
        
        {/* Mobile view for class stats */}
        <div className="md:hidden divide-y divide-slate-50">
          {classStats.map((c: any) => {
            const totalAttendu = c.nombre_eleves * ((c.frais_scolarite || 0) + (c.frais_inscription || 0));
            const totalEncaisse = (c.total_encaisse_scolarite || 0) + (c.total_encaisse_inscription || 0);
            const reste = totalAttendu - totalEncaisse;
            return (
              <div key={c.id} className="p-4 space-y-3 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{formatClassName(c.nom)}</h4>
                    <p className="text-xs text-slate-500 font-medium">{c.nombre_eleves} élèves inscrits</p>
                  </div>
                  <button 
                    onClick={() => setSelectedClassDetails(c)}
                    className="text-xs bg-primary-50 text-primary-700 px-3.5 py-1.5 rounded-xl font-bold shadow-sm"
                  >
                    Détails
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Encaissé</p>
                    <p className="text-sm font-bold text-emerald-600">{totalEncaisse.toLocaleString()} <span className="text-[10px]">{c.devise || 'FCFA'}</span></p>
                  </div>
                  <div className="bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Reste</p>
                    <p className="text-sm font-bold text-rose-500">{reste.toLocaleString()} <span className="text-[10px]">{c.devise || 'FCFA'}</span></p>
                  </div>
                </div>
              </div>
            );
          })}
          {classStats.length === 0 && (
            <div className="p-8 text-center text-slate-400 italic text-sm">
              Aucune classe trouvée pour ce cycle.
            </div>
          )}
        </div>

        {/* Desktop view for class stats */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Classe</th>
                <th className="px-6 py-4">Élèves</th>
                <th className="px-6 py-4">Total Attendu</th>
                <th className="px-6 py-4">Total Encaissé</th>
                <th className="px-6 py-4">Reste à percevoir</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {classStats.map((c: any) => {
                const totalAttendu = c.nombre_eleves * ((c.frais_scolarite || 0) + (c.frais_inscription || 0));
                const totalEncaisse = (c.total_encaisse_scolarite || 0) + (c.total_encaisse_inscription || 0);
                const reste = totalAttendu - totalEncaisse;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-bold text-slate-800">{formatClassName(c.nom)}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{c.nombre_eleves}</td>
                    <td className="px-6 py-4 text-slate-700 font-medium">{totalAttendu.toLocaleString()} {c.devise || 'FCFA'}</td>
                    <td className="px-6 py-4 font-black text-emerald-600">{totalEncaisse.toLocaleString()} {c.devise || 'FCFA'}</td>
                    <td className="px-6 py-4 font-black text-rose-500">{reste.toLocaleString()} {c.devise || 'FCFA'}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => setSelectedClassDetails(c)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-1.5 rounded-xl font-bold transition-colors"
                      >
                        Voir Détails
                      </button>
                    </td>
                  </tr>
                );
              })}
              {classStats.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    Aucune classe trouvée pour ce cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payments History */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <History size={20} className="text-slate-400" />
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Historique des Transactions</h3>
              <p className="text-xs text-slate-500">Paiements enregistrés ({headerConfig.badge})</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher un élève, classe..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500 w-56"
              />
            </div>
            
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="bg-slate-50 border-none rounded-xl text-xs px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500 font-medium text-slate-700"
            >
              <option value="ALL">Tous les types</option>
              <option value="Frais de scolarité">Frais de scolarité</option>
              <option value="Frais d'inscription">Frais d'inscription</option>
              <option value="Frais d'examen">Frais d'examen</option>
              <option value="Autres frais">Autres frais</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Élève</th>
                <th className="px-6 py-4">Classe</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Méthode</th>
                <th className="px-6 py-4 text-right">Montant</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-center">Reçu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {filteredPaiements.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">{p.date_paiement}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-800">{p.nom} {p.prenom}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{p.classe_nom || '-'}</td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    <div className="flex flex-col gap-1 items-start">
                      <span>{p.type_paiement}</span>
                      {p.annee_concernee_libelle && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md">
                          Année {p.annee_concernee_libelle}
                        </span>
                      )}
                      {p.tranche && p.tranche !== p.type_paiement && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {p.tranche}
                        </span>
                      )}
                      {p.numero_adherent && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                          <BookOpen size={10} />
                          {p.numero_adherent}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">{p.methode || "Espèces"}</td>
                  <td className="px-6 py-4 text-right font-black text-slate-900">{Number(p.montant).toLocaleString()} FCFA</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      p.status === 'Terminé' || p.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : p.status === 'En cours' 
                        ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {p.status || 'Terminé'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        setLastPayment({
                          id: p.id,
                          numero_adherent: p.numero_adherent,
                          eleve_id: p.eleve_id,
                          eleve_nom: p.nom,
                          eleve_prenom: p.prenom,
                          eleve_matricule: p.eleve_matricule || 'N/A',
                          eleve_classe: p.classe_nom || 'N/A',
                          type_paiement: p.type_paiement,
                          tranche: p.tranche,
                          annee_concernee_id: p.annee_concernee_id,
                          annee_concernee_libelle: p.annee_concernee_libelle,
                          montant: p.montant,
                          date_paiement: p.date_paiement,
                          methode: p.methode,
                          inscription_payee: true
                        });
                        setShowReceipt(true);
                      }}
                      title="Imprimer / Afficher le reçu"
                      className="p-1.5 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      <Printer size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPaiements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                    Aucun paiement correspondant trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* Class Details Modal */}
      {selectedClassDetails && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex flex-col overflow-hidden">
          <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedClassDetails(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Détails des paiements : {formatClassName(selectedClassDetails.nom)}</h2>
                <p className="text-xs text-slate-500">Liste des élèves et état de leurs dettes ({headerConfig.badge})</p>
              </div>
            </div>
            <button 
              onClick={() => setSelectedClassDetails(null)}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
            <div className="max-w-6xl mx-auto space-y-4">
              {/* Desktop View */}
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Élève</th>
                      <th className="px-6 py-4">Matricule</th>
                      <th className="px-6 py-4">Scolarité Payée</th>
                      <th className="px-6 py-4">Inscription</th>
                      <th className="px-6 py-4 text-right">Reste Dû</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {eleves
                      .filter((e: any) => e.classe_id === selectedClassDetails.id)
                      .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''))
                      .map((e: any) => {
                        const resteScol = (selectedClassDetails.frais_scolarite || 0) - (e.total_paye_scolarite || 0);
                        const resteInsc = (selectedClassDetails.frais_inscription || 0) - (e.total_paye_inscription || 0);
                        const totalDu = resteScol + resteInsc;
                        
                        const studentPayments = paiements.filter((p: any) => 
                          p.eleve_id === e.id && (p.status === 'Terminé' || p.status === 'completed')
                        );
                        const lastStudentPayment = studentPayments.length > 0 ? studentPayments[0] : null;

                        return (
                          <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{e.nom} {e.prenom}</td>
                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{e.matricule}</td>
                            <td className="px-6 py-4 font-medium text-slate-700">
                              {(e.total_paye_scolarite || 0).toLocaleString()} / {(selectedClassDetails.frais_scolarite || 0).toLocaleString()} {selectedClassDetails.devise || 'FCFA'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                (e.total_paye_inscription || 0) >= (selectedClassDetails.frais_inscription || 0)
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {(e.total_paye_inscription || 0) >= (selectedClassDetails.frais_inscription || 0) ? 'Payée' : 'Non Soldée'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-rose-600">
                              {totalDu > 0 ? `${totalDu.toLocaleString()} ${selectedClassDetails.devise || 'FCFA'}` : '0 FCFA (Soldé)'}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {lastStudentPayment && (
                                <button 
                                  onClick={() => {
                                    setLastPayment({
                                      ...lastStudentPayment,
                                      eleve_nom: e.nom,
                                      eleve_prenom: e.prenom,
                                      eleve_matricule: e.matricule,
                                      eleve_classe: selectedClassDetails.nom,
                                      reste_scolarite: Math.max(0, resteScol),
                                      reste_inscription: Math.max(0, resteInsc),
                                      inscription_payee: (e.total_paye_inscription || 0) >= (selectedClassDetails.frais_inscription || 0)
                                    });
                                    setShowReceipt(true);
                                  }}
                                  className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-xl font-bold transition-colors"
                                >
                                  Reçu
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Students List with Installment Status */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">État des Tranches de Scolarité</h2>
            <p className="text-xs text-slate-500">Suivi des règlements par tranche pour chaque élève ({headerConfig.badge})</p>
          </div>
          <div className="flex gap-2">
            <select 
              value={selectedClassId}
              onChange={e => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border-none rounded-xl text-xs px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 font-medium text-slate-700"
            >
              <option value="">Toutes les classes</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                <th className="px-6 py-4">Élève</th>
                <th className="px-6 py-4">Classe</th>
                <th className="px-6 py-4 text-center">Tranche 1</th>
                <th className="px-6 py-4 text-center">Tranche 2</th>
                <th className="px-6 py-4 text-center">Tranche 3</th>
                <th className="px-6 py-4 text-right">Reste Scolarité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {eleves
                .filter((e: any) => !selectedClassId || String(e.classe_id) === selectedClassId)
                .sort((a: any, b: any) => (a.nom || '').localeCompare(b.nom || ''))
                .map((e: any) => {
                  const totalPaye = e.total_paye_scolarite || 0;
                  const t1 = e.tranche1_montant || 0;
                  const t2 = e.tranche2_montant || 0;
                  const t3 = e.tranche3_montant || 0;

                  const isT1Paid = totalPaye >= t1;
                  const isT2Paid = totalPaye >= (t1 + t2);
                  const isT3Paid = totalPaye >= (t1 + t2 + t3);
                  const reste = Math.max(0, (e.frais_scolarite || 0) - totalPaye);

                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900">{e.nom} {e.prenom}</span>
                          <span className="text-[10px] font-mono text-slate-400">{e.matricule}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-medium">{formatClassName(e.classe_nom)}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isT1Paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {isT1Paid ? 'Soldée' : 'Partiel/Non payé'}
                          </span>
                          {t1 > 0 && <span className="text-[9px] text-slate-400">{t1.toLocaleString()} {e.devise || 'FCFA'}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isT2Paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {isT2Paid ? 'Soldée' : 'Partiel/Non payé'}
                          </span>
                          {t2 > 0 && <span className="text-[9px] text-slate-400">{t2.toLocaleString()} {e.devise || 'FCFA'}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isT3Paid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {isT3Paid ? 'Soldée' : 'Partiel/Non payé'}
                          </span>
                          {t3 > 0 && <span className="text-[9px] text-slate-400">{t3.toLocaleString()} {e.devise || 'FCFA'}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`font-black ${reste > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {reste.toLocaleString()} {e.devise || 'FCFA'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              {eleves.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">
                    Aucun élève trouvé dans ce cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Entry Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Encaisser un paiement</h2>
                <p className="text-xs text-slate-500">{headerConfig.badge}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Classe (Optionnel pour filtrer)</label>
                <select 
                  value={selectedClassId}
                  onChange={e => {
                    setSelectedClassId(e.target.value);
                    setStudentSearch('');
                    setFormData({...formData, eleve_id: ''});
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Toutes les classes ({headerConfig.badge})</option>
                  {classes.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
                </select>
              </div>

              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-700">Élève *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text"
                    required
                    placeholder="Saisir le nom de l'élève..."
                    value={studentSearch}
                    onFocus={() => setShowStudentResults(true)}
                    onChange={(e) => {
                      setStudentSearch(e.target.value);
                      setShowStudentResults(true);
                      if (!e.target.value) setFormData({...formData, eleve_id: ''});
                    }}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {showStudentResults && studentSearch && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                    {filteredEleves.length > 0 ? (
                      filteredEleves.map((e: any) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, eleve_id: e.id.toString()});
                            setStudentSearch(`${e.nom} ${e.prenom} (${formatClassName(e.classe_nom)})`);
                            setShowStudentResults(false);
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-primary-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold">{e.nom} {e.prenom}</span>
                            <span className="text-xs text-slate-500 ml-2">({formatClassName(e.classe_nom)})</span>
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{e.matricule}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-sm text-slate-400 italic">Aucun élève trouvé dans ce cycle</div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Type de paiement</label>
                <select 
                  value={formData.type_paiement}
                  onChange={e => setFormData({...formData, type_paiement: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="Frais de scolarité">Frais de scolarité</option>
                  <option value="Arriérés de scolarité">Arriérés de scolarité (Année antérieure)</option>
                  <option value="Frais d'inscription">Frais d'inscription</option>
                  <option value="Adhésion Bibliothèque">Adhésion Bibliothèque</option>
                  <option value="Frais d'examen">Frais d'examen</option>
                  <option value="Autres frais">Autres frais</option>
                </select>
              </div>

              {formData.type_paiement === 'Arriérés de scolarité' && (
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <label className="text-xs font-bold text-amber-900 uppercase">
                    Année scolaire concernée par les arriérés <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.annee_concernee_id}
                    onChange={e => {
                      const selId = e.target.value;
                      const selObj = anneesList.find(a => a.id.toString() === selId);
                      setFormData({
                        ...formData,
                        annee_concernee_id: selId,
                        annee_concernee_libelle: selObj?.libelle || ''
                      });
                    }}
                    required
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Sélectionner l'année scolaire --</option>
                    {anneesList.map((an: any) => (
                      <option key={an.id} value={an.id.toString()}>
                        Année Scolaire {an.libelle} {an.est_active ? '(Active)' : ''}
                      </option>
                    ))}
                  </select>
                  {formData.annee_concernee_libelle && (
                    <span className="text-[11px] text-amber-700 block font-medium">
                      Mentionné sur le reçu : Année {formData.annee_concernee_libelle}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Montant (FCFA) *</label>
                <input 
                  required
                  value={formData.montant}
                  onChange={e => setFormData({...formData, montant: e.target.value})}
                  type="number" 
                  placeholder="Ex: 25000"
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Date de paiement</label>
                <input 
                  value={formData.date_paiement}
                  onChange={e => setFormData({...formData, date_paiement: e.target.value})}
                  type="date" 
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Moyen de paiement</label>
                <select 
                  value={formData.methode}
                  onChange={e => setFormData({...formData, methode: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Online">Paiement en ligne (FedaPay)</option>
                </select>
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
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  {formData.methode === 'Online' ? 'Payer avec FedaPay' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Library Adhesion Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Adhésion à la Bibliothèque</h3>
                  <p className="text-xs text-slate-500">Encaissement et enregistrement de l'adhérent avec reçu & code adhérent</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLibraryModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLibrarySubmit} className="space-y-4">
              {/* Type d'adhérent toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setLibraryForm(prev => ({ ...prev, type_member: 'eleve' }))}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    libraryForm.type_member === 'eleve' 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Élève de l'établissement
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryForm(prev => ({ ...prev, type_member: 'externe' }))}
                  className={`py-2 text-xs font-bold rounded-xl transition-all ${
                    libraryForm.type_member === 'externe' 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Membre externe / Autre
                </button>
              </div>

              {libraryForm.type_member === 'eleve' ? (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Classe (Optionnel pour filtrer)</label>
                      <select
                        value={libraryClassFilter}
                        onChange={e => {
                          setLibraryClassFilter(e.target.value);
                          setLibraryStudentSearch('');
                        }}
                        className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                      >
                        <option value="">Toutes les classes</option>
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Recherche élève</label>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Nom ou matricule..."
                          value={libraryStudentSearch}
                          onChange={e => setLibraryStudentSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 border rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Sélectionner l'élève <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={libraryForm.eleve_id}
                      onChange={e => {
                        const student = eleves.find(st => String(st.id) === e.target.value);
                        setLibraryForm(prev => ({
                          ...prev,
                          eleve_id: e.target.value,
                          nom_complet: student ? `${student.nom} ${student.prenom}` : '',
                          classe_nom: student?.classe_nom || '',
                          photo: student?.photo || prev.photo
                        }));
                      }}
                      className="w-full px-3 py-2.5 border rounded-xl bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="">-- Choisir un élève --</option>
                      {eleves
                        .filter(st => {
                          if (libraryClassFilter && String(st.classe_id) !== libraryClassFilter) return false;
                          if (libraryStudentSearch.trim()) {
                            const q = libraryStudentSearch.toLowerCase();
                            const name = `${st.nom} ${st.prenom}`.toLowerCase();
                            const mat = (st.matricule || '').toLowerCase();
                            return name.includes(q) || mat.includes(q);
                          }
                          return true;
                        })
                        .slice(0, 100)
                        .map(st => (
                          <option key={st.id} value={st.id}>
                            {st.nom} {st.prenom} ({formatClassName(st.classe_nom || '')}) - {st.matricule || 'Sans matricule'}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Selected Student Summary */}
                  {libraryForm.eleve_id && (
                    <div className="p-2.5 bg-white border border-indigo-100 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {eleves.find(st => String(st.id) === String(libraryForm.eleve_id))?.nom} {eleves.find(st => String(st.id) === String(libraryForm.eleve_id))?.prenom}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Matricule : <span className="font-mono font-bold text-slate-700">{eleves.find(st => String(st.id) === String(libraryForm.eleve_id))?.matricule || 'N/A'}</span> • Classe : <span className="font-bold text-indigo-600">{formatClassName(eleves.find(st => String(st.id) === String(libraryForm.eleve_id))?.classe_nom || '')}</span>
                        </p>
                      </div>
                      <span className="text-[10px] uppercase font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg">Sélectionné</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Section 1: Identité & Coordonnées de l'adhérent */}
                  <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 pb-1 border-b border-slate-200/60">
                      <User size={15} className="text-indigo-600" />
                      <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Identité & Coordonnées de l'adhérent</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">Nom et Prénom de l'adhérent <span className="text-rose-500">*</span></label>
                      <input
                        required
                        type="text"
                        placeholder="ex: KOUASSI Marc"
                        value={libraryForm.nom_complet}
                        onChange={e => setLibraryForm(prev => ({ ...prev, nom_complet: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400" />
                          <span>Date de naissance</span>
                        </label>
                        <input
                          type="date"
                          value={libraryForm.date_naissance}
                          onChange={e => setLibraryForm(prev => ({ ...prev, date_naissance: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <MapPin size={12} className="text-slate-400" />
                          <span>Lieu de naissance</span>
                        </label>
                        <input
                          type="text"
                          placeholder="ex: Cotonou / Abidjan"
                          value={libraryForm.lieu_naissance}
                          onChange={e => setLibraryForm(prev => ({ ...prev, lieu_naissance: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Phone size={12} className="text-slate-400" />
                          <span>N° de Téléphone <span className="text-rose-500">*</span></span>
                        </label>
                        <input
                          required
                          type="tel"
                          placeholder="ex: +229 97 00 00 00"
                          value={libraryForm.telephone}
                          onChange={e => setLibraryForm(prev => ({ ...prev, telephone: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Adresse Email</label>
                        <input
                          type="email"
                          placeholder="ex: adherent@email.com"
                          value={libraryForm.email}
                          onChange={e => setLibraryForm(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                        <MapPin size={12} className="text-slate-400" />
                        <span>Adresse de résidence</span>
                      </label>
                      <input
                        type="text"
                        placeholder="ex: Quartier Fidjrossè, Maison 12"
                        value={libraryForm.adresse}
                        onChange={e => setLibraryForm(prev => ({ ...prev, adresse: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <School size={12} className="text-slate-400" />
                          <span>École de provenance (si élève)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="ex: Collège Père Aupiais"
                          value={libraryForm.ecole_provenance}
                          onChange={e => setLibraryForm(prev => ({ ...prev, ecole_provenance: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Qualité / Fonction</label>
                        <input
                          type="text"
                          placeholder="ex: Élève externe, Enseignant, Lecteur..."
                          value={libraryForm.classe_nom}
                          onChange={e => setLibraryForm(prev => ({ ...prev, classe_nom: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Nom et prénom des parents ou tuteurs</label>
                      <input
                        type="text"
                        placeholder="ex: M. & Mme KOUASSI Paul"
                        value={libraryForm.parents_tuteurs}
                        onChange={e => setLibraryForm(prev => ({ ...prev, parents_tuteurs: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Section 2: Personne à contacter en cas d'urgence */}
                  <div className="space-y-3 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/60">
                    <div className="flex items-center gap-2 pb-1 border-b border-amber-200/50">
                      <PhoneCall size={15} className="text-amber-700" />
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wide">Personne à contacter en cas d'urgence</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900">Nom & Prénom contact</label>
                        <input
                          type="text"
                          placeholder="ex: KOUASSI Michel (Oncle)"
                          value={libraryForm.contact_urgence_nom}
                          onChange={e => setLibraryForm(prev => ({ ...prev, contact_urgence_nom: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium border-amber-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900">N° Téléphone d'urgence</label>
                        <input
                          type="tel"
                          placeholder="ex: +229 95 00 00 00"
                          value={libraryForm.contact_urgence_telephone}
                          onChange={e => setLibraryForm(prev => ({ ...prev, contact_urgence_telephone: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium border-amber-200"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-amber-900">Adresse du contact</label>
                        <input
                          type="text"
                          placeholder="ex: Quartier Cadjèhoun"
                          value={libraryForm.contact_urgence_adresse}
                          onChange={e => setLibraryForm(prev => ({ ...prev, contact_urgence_adresse: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium border-amber-200"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Photo de l'adhérent (Importation de fichier image) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Photo de l'adhérent (Fichier image)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Recommandé pour la carte d'adhérent</span>
                </label>
                
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {libraryForm.photo ? (
                      <img src={libraryForm.photo} alt="Aperçu adhérent" className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all">
                        <Upload size={13} className="text-indigo-600" />
                        <span>Importer un fichier image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLibraryForm(prev => ({ ...prev, photo: reader.result as string }));
                              };
                              reader.readAsDataURL(file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>

                      {libraryForm.photo && (
                        <button
                          type="button"
                          onClick={() => setLibraryForm(prev => ({ ...prev, photo: '' }))}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors text-xs font-medium"
                          title="Supprimer la photo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">Formats acceptés : JPG, PNG, WEBP</p>
                  </div>
                </div>
              </div>

              {/* Financial Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Montant adhésion (FCFA) <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={libraryForm.montant}
                    onChange={e => setLibraryForm(prev => ({ ...prev, montant: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="flex gap-1.5 mt-1">
                    {['500', '1000', '2000', '5000'].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setLibraryForm(prev => ({ ...prev, montant: amt }))}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                          libraryForm.montant === amt
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {Number(amt).toLocaleString()} F
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Mode de paiement</label>
                  <select
                    value={libraryForm.methode}
                    onChange={e => setLibraryForm(prev => ({ ...prev, methode: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Mobile Money">Mobile Money (MoMo / Flooz / Wave)</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Date d'adhésion</label>
                  <input
                    type="date"
                    value={libraryForm.date_paiement}
                    onChange={e => setLibraryForm(prev => ({ ...prev, date_paiement: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-xl bg-white text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Validité de la carte</label>
                  <div className="px-3 py-2 bg-indigo-50/50 border border-indigo-100 text-indigo-800 rounded-xl text-xs font-bold">
                    1 an (Année scolaire {schoolInfo?.nom_annee || 'en cours'})
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLibraryModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLibrary}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>{isSubmittingLibrary ? 'Enregistrement...' : "Valider & Générer le reçu"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastPayment && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="text-primary-600" size={24} />
                <h2 className="text-xl font-bold text-slate-900">Reçu de Paiement</h2>
              </div>
              <button onClick={() => setShowReceipt(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              <div className="bg-white border-2 border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{schoolInfo?.nom_ecole || 'Établissement Scolaire'}</h3>
                    <p className="text-xs text-slate-500">{schoolInfo?.adresse || 'Adresse'}</p>
                    <p className="text-xs text-slate-500">{schoolInfo?.telephone || 'Téléphone'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                      N° {lastPayment.id || 'N/A'}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{lastPayment.date_paiement}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100" />

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1 flex items-start gap-3">
                    {lastPayment.photo && (
                      <img src={lastPayment.photo} alt="Photo" className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" />
                    )}
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Élève / Adhérent</p>
                      <p className="text-sm font-bold text-slate-800">{lastPayment.eleve_nom} {lastPayment.eleve_prenom}</p>
                      <p className="text-xs text-slate-500">Matricule: {lastPayment.eleve_matricule}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Classe / Section</p>
                    <p className="text-sm font-bold text-slate-800">{formatClassName(lastPayment.eleve_classe)}</p>
                  </div>
                </div>

                {lastPayment.numero_adherent && (
                  <div className="p-4 bg-indigo-50/90 border-2 border-indigo-200 rounded-2xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Code Adhérent Bibliothèque</p>
                        <p className="text-lg font-mono font-black text-indigo-950 tracking-wider">{lastPayment.numero_adherent}</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-indigo-200/80 text-indigo-800 text-xs font-bold rounded-lg">
                      Actif • 1 an
                    </span>
                  </div>
                )}

                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{lastPayment.type_paiement}</span>
                    <span className="text-sm font-black text-slate-900">{parseInt(lastPayment.montant || 0).toLocaleString()} FCFA</span>
                  </div>
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">TOTAL PAYÉ</span>
                    <span className="text-lg font-black text-primary-600">{parseInt(lastPayment.montant || 0).toLocaleString()} FCFA</span>
                  </div>
                </div>

                {lastPayment.type_paiement !== 'Adhésion Bibliothèque' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                      <p className="text-[10px] font-bold text-red-400 uppercase">Reste à payer</p>
                      <p className="text-sm font-black text-red-700">{((lastPayment.reste_scolarite || 0) + (lastPayment.reste_inscription || 0)).toLocaleString()} FCFA</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${lastPayment.inscription_payee ? 'bg-primary-50 border-primary-100' : 'bg-amber-50 border-amber-100'}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Frais d'inscription</p>
                      <p className={`text-sm font-black ${lastPayment.inscription_payee ? 'text-primary-700' : 'text-amber-700'}`}>
                        {lastPayment.inscription_payee ? 'PAYÉS' : 'NON PAYÉS'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={18} className="text-emerald-600" />
                      <span className="text-xs font-bold text-emerald-800">Cotisation annuelle d'adhésion validée</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-700">Bibliothèque Scolaire</span>
                  </div>
                )}

                {/* QR Code Security Card */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-2xs shrink-0">
                      <QRCodeSVG 
                        value={buildVerificationUrl({
                          docType: 'recu_paiement',
                          docTitle: 'Reçu Officiel de Paiement',
                          reference: lastPayment.id ? `REÇU-N°${String(lastPayment.id).padStart(5, '0')}` : undefined,
                          schoolName: schoolInfo?.nom_ecole || 'Établissement Scolaire',
                          beneficiaryNom: lastPayment.eleve_nom,
                          beneficiaryPrenom: lastPayment.eleve_prenom,
                          matricule: lastPayment.eleve_matricule,
                          classe: lastPayment.eleve_classe,
                          montant: parseInt(lastPayment.montant || 0),
                          dateEmission: lastPayment.date_paiement
                        })}
                        size={48}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-800">Authentification par Code QR</p>
                      <p className="text-[10px] text-slate-500">Document vérifiable numériquement par scan ou référence.</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Certifié
                  </span>
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

      {/* Modal d'enregistrement des paiements de scolarité avec tranches et reçu PDF */}
      <ScolaritePaymentModal
        isOpen={showScolariteModal}
        onClose={() => {
          setShowScolariteModal(false);
          setScolaritePreselectedEleveId(undefined);
          setScolariteInitialIsArrieres(false);
          setScolariteInitialAnneeConcerneeId(undefined);
          setScolariteInitialAnneeConcerneeLibelle(undefined);
        }}
        onSuccess={() => {
          fetchPaiements();
          fetchClassStats();
          fetchEleves();
          fetchSchoolInfo();
        }}
        classes={classes}
        schoolInfo={schoolInfo}
        preselectedEleveId={scolaritePreselectedEleveId}
        initialCycle={cycle}
        initialIsArrieres={scolariteInitialIsArrieres}
        initialAnneeConcerneeId={scolariteInitialAnneeConcerneeId}
        initialAnneeConcerneeLibelle={scolariteInitialAnneeConcerneeLibelle}
      />
    </div>
  );
}
