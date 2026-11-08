import React from 'react';
import { 
  Book, 
  Users, 
  Clock, 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw,
  BookOpen,
  MapPin,
  Barcode,
  History,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  X,
  Edit2,
  Eye,
  Trash2,
  Bookmark,
  Library,
  LayoutDashboard,
  Upload,
  User,
  CreditCard,
  PhoneCall,
  RefreshCw,
  AlertCircle,
  UserCheck,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BookPhysical {
  id: number;
  code_livre: string;
  isbn?: string;
  titre: string;
  auteur: string;
  editeur?: string;
  categorie: string;
  cycle: string;
  quantite_totale: number;
  quantite_disponible: number;
  quantite_empruntee: number;
  quantite_sur_place: number;
  armoire_numero: string;
  casier_numero: string;
  position_casier: 'gauche' | 'droite';
  table_numero: string;
  etat_general: 'neuf' | 'bon' | 'ancien' | 'defectueux' | 'vole';
  resume?: string;
  couverture_url?: string;
}

interface Member {
  id: number;
  numero_adherent: string;
  eleve_id?: number;
  nom_complet: string;
  classe_nom?: string;
  telephone?: string;
  email?: string;
  photo?: string;
  date_adhesion: string;
  date_expiration?: string;
  statut: 'actif' | 'bloque' | 'suspect' | 'expire';
  emprunts_en_cours: number;
  type: 'eleve' | 'externe';
  nombre_avertissements: number;
  date_fin_exclusion?: string;
  est_suspect: number;
  contact_urgence_nom?: string;
  contact_urgence_telephone?: string;
  contact_urgence_adresse?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  adresse?: string;
  ecole_provenance?: string;
  parents_tuteurs?: string;
  montant_cotisation_du?: number;
  montant_cotisation_paye?: number;
  statut_paiement?: string;
}

interface Loan {
  id: number;
  livre_id: number;
  adherent_id: number;
  titre_livre: string;
  code_livre: string;
  livre_auteur?: string;
  armoire_numero?: string;
  casier_numero?: string;
  position_casier?: string;
  livre_table?: string;
  nom_adherent: string;
  prenom_adherent: string;
  classe_adherent: string;
  date_emprunt: string;
  date_retour_prevue: string;
  date_retour_effective: string | null;
  statut: 'en_cours' | 'rendu' | 'retard' | 'perdu';
  remarques: string;
}

interface Consultation {
  id: number;
  livre_id: number;
  eleve_id: number;
  adherent_id?: number;
  titre_livre: string;
  code_livre: string;
  livre_auteur?: string;
  nom_eleve: string;
  prenom_eleve: string;
  date_consultation: string;
  heure_debut: string;
  heure_fin: string | null;
  emplacement_lecture: string;
}

export default function BibliothequePhysique({ cycleProp = 'tous' }: { cycleProp?: string }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<'dashboard' | 'livres' | 'adherents' | 'emprunts' | 'consultations'>('dashboard');
  
  // Data States
  const [books, setBooks] = React.useState<BookPhysical[]>([]);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [consultations, setConsultations] = React.useState<Consultation[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [allStudents, setAllStudents] = React.useState<any[]>([]);
  
  // UI States
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showLoanModal, setShowLoanModal] = React.useState(false);
  const [showConsultationModal, setShowConsultationModal] = React.useState(false);
  const [showMemberModal, setShowMemberModal] = React.useState(false);
  const [showGlobalLoanModal, setShowGlobalLoanModal] = React.useState(false);
  const [showGlobalConsultationModal, setShowGlobalConsultationModal] = React.useState(false);
  const [showContinueReadingModal, setShowContinueReadingModal] = React.useState(false);
  const [continuingConsultId, setContinuingConsultId] = React.useState<number | null>(null);
  const [showMemberDetails, setShowMemberDetails] = React.useState(false);
  const [showBookDetails, setShowBookDetails] = React.useState(false);
  const [showMoveModal, setShowMoveModal] = React.useState(false);
  const [showPermuteModal, setShowPermuteModal] = React.useState(false);
  const [showIDCard, setShowIDCard] = React.useState(false);
  const [selectedBooksForAction, setSelectedBooksForAction] = React.useState<BookPhysical[]>([]);
  const [selectedAdherentForAction, setSelectedAdherentForAction] = React.useState<Member | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = React.useState('');
  const [bookSearchQuery, setBookSearchQuery] = React.useState('');

  // Membership lookup by number state
  const [membershipSearchCode, setMembershipSearchCode] = React.useState('');
  const [membershipLookupResult, setMembershipLookupResult] = React.useState<Member | null>(null);
  const [isSearchingMembership, setIsSearchingMembership] = React.useState(false);
  const [membershipSearchError, setMembershipSearchError] = React.useState<string | null>(null);
  
  // Form States
  const [selectedBook, setSelectedBook] = React.useState<BookPhysical | null>(null);
  const [selectedMember, setSelectedMember] = React.useState<Member | null>(null);
  const [memberHistory, setMemberHistory] = React.useState<{loans: Loan[], consultations: Consultation[]} | null>(null);
  const [selectedClassId, setSelectedClassId] = React.useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = React.useState('');
  const [receiptNumber, setReceiptNumber] = React.useState('');
  const [externalPhoto, setExternalPhoto] = React.useState('');
  const [bookCoverPhoto, setBookCoverPhoto] = React.useState('');
  const [memberStudentPhoto, setMemberStudentPhoto] = React.useState('');
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = React.useState<string | number>('all');

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const [bRes, mRes, lRes, cRes, sRes, clRes, stRes] = await Promise.all([
        apiFetch('/api/bibliotheque-physique/livres'),
        apiFetch('/api/bibliotheque-physique/adherents'),
        apiFetch(`/api/bibliotheque-physique/emprunts${yearParam}`),
        apiFetch(`/api/bibliotheque-physique/consultations${yearParam}`),
        apiFetch(`/api/bibliotheque-physique/stats${yearParam}`),
        apiFetch('/api/classes'),
        apiFetch('/api/bibliotheque-physique/eleves-candidats')
      ]);

      if (bRes.ok) setBooks(await bRes.json());
      if (mRes.ok) setMembers(await mRes.json());
      if (lRes.ok) setLoans(await lRes.json());
      if (cRes.ok) setConsultations(await cRes.json());
      if (sRes.ok) setStats(await sRes.json());
      if (clRes.ok) setClasses(await clRes.json());
      if (stRes.ok) setAllStudents(await stRes.json());
    } catch (error) {
      console.error('Error fetching library data:', error);
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData, selectedYearId]);

  const fetchMemberHistory = async (memberId: number) => {
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/adherents/${memberId}/historique`);
      if (res.ok) setMemberHistory(await res.json());
    } catch (e) { toast.error("Erreur lors du chargement de l'historique"); }
  };

  const categories = Array.from(new Set(books.map(b => b.categorie)));

  const filteredBooks = books.filter(book => {
    const matchesSearch = 
      book.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.auteur.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.code_livre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || book.categorie === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const studentsOfClass = allStudents.filter(s => s.classe_nom === classes.find(c => String(c.id) === selectedClassId)?.nom);
  const searchedStudents = studentSearchTerm.length >= 2 
    ? allStudents.filter(s => `${s.nom} ${s.prenom}`.toLowerCase().includes(studentSearchTerm.toLowerCase()))
    : [];

  const handleAddBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    if (bookCoverPhoto) {
      data.couverture_url = bookCoverPhoto;
    }

    try {
      const res = await apiFetch('/api/bibliotheque-physique/livres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success('Livre ajouté avec succès');
        setShowAddModal(false);
        setBookCoverPhoto('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de l\'ajout');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleLoan = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await apiFetch('/api/bibliotheque-physique/emprunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success('Emprunt enregistré');
        setShowLoanModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de l\'emprunt');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleReturn = async (loanId: number) => {
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/emprunts/${loanId}/retour`, {
        method: 'PATCH'
      });

      if (res.ok) {
        toast.success('Livre rendu');
        fetchData();
      } else {
        toast.error('Erreur lors du retour');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleRenewMember = async (memberId: number) => {
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/adherents/${memberId}/renouveler`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montant: 1000 })
      });

      if (res.ok) {
        toast.success("Adhésion renouvelée avec succès pour une durée annuelle (1 an) !");
        fetchData();
        if (selectedMember && selectedMember.id === memberId) {
          const nextYear = new Date();
          nextYear.setFullYear(nextYear.getFullYear() + 1);
          setSelectedMember(prev => prev ? ({
            ...prev,
            statut: 'actif',
            date_expiration: nextYear.toISOString().split('T')[0],
            statut_paiement: 'paye'
          }) : null);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors du renouvellement");
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleConsultation = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const res = await apiFetch('/api/bibliotheque-physique/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        toast.success('Consultation démarrée');
        setShowConsultationModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleMoveBook = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedBook) return;
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    const moveRequest = async (force = false) => {
      try {
        const res = await apiFetch(`/api/bibliotheque-physique/livres/${selectedBook.id}/deplacer`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, force })
        });
        
        if (res.ok) {
          toast.success('Emplacement mis à jour');
          setShowMoveModal(false);
          setShowBookDetails(false);
          fetchData();
        } else if (res.status === 409) {
          const err = await res.json();
          const conflictBook = err.conflict_book;
          if (window.confirm(`L'emplacement est déjà occupé par "${conflictBook.titre}" (${conflictBook.code_livre}). Voulez-vous permuter les emplacements entre ces deux livres ?`)) {
            handlePermuteBooks(conflictBook.id);
            setShowMoveModal(false);
          }
        } else {
          const err = await res.json();
          toast.error(err.error || 'Erreur lors du déplacement');
        }
      } catch (e) { toast.error('Erreur réseau'); }
    };

    moveRequest();
  };

  const handlePermuteBooks = async (targetBookId: number) => {
    if (!selectedBook) return;
    try {
      const res = await apiFetch('/api/bibliotheque-physique/livres/permuter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id1: selectedBook.id, id2: targetBookId })
      });
      if (res.ok) {
        toast.success('Emplacements permutés');
        setShowBookDetails(false);
        fetchData();
      }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const handleEndConsultation = async (id: number) => {
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/consultations/${id}/fin`, {
        method: 'POST'
      });

      if (res.ok) {
        toast.success('Consultation terminée');
        fetchData();
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleReconduireLoan = async (loanId: number) => {
    const jours = window.prompt("Nombre de jours de prolongation ?", "3");
    if (jours === null) return;
    
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/emprunts/${loanId}/reconduire`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jours: parseInt(jours, 10) })
      });

      if (res.ok) {
        toast.success('Emprunt reconduit');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la reconduction');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleExitLibrary = async (consultId: number) => {
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/consultations/${consultId}/sortie`, {
        method: 'POST'
      });

      if (res.ok) {
        toast.success('Sortie enregistrée');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la sortie');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleContinueWithOtherBook = async (consultId: number) => {
    setContinuingConsultId(consultId);
    setShowContinueReadingModal(true);
  };

  const handleToggleBookSelection = (book: BookPhysical) => {
    setSelectedBooksForAction(prev => {
      if (prev.find(b => b.id === book.id)) {
        return prev.filter(b => b.id !== book.id);
      }
      return [...prev, book];
    });
  };

  const handleGlobalLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdherentForAction || selectedBooksForAction.length === 0) {
      toast.error("Veuillez sélectionner un adhérent et au moins un livre.");
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const date_retour_prevue = formData.get('date_retour_prevue');

    try {
      const res = await apiFetch('/api/bibliotheque-physique/emprunts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adherent_id: selectedAdherentForAction.id,
          livres_ids: selectedBooksForAction.map(b => b.id),
          date_retour_prevue
        })
      });

      if (res.ok) {
        toast.success(`${selectedBooksForAction.length} livre(s) emprunté(s) avec succès`);
        setShowGlobalLoanModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de l\'emprunt');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleGlobalConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBooksForAction.length === 0) {
      toast.error("Veuillez sélectionner au moins un livre.");
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    const numero_table = formData.get('numero_table');

    try {
      const res = await apiFetch('/api/bibliotheque-physique/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adherent_id: selectedAdherentForAction?.id,
          livres_ids: selectedBooksForAction.map(b => b.id),
          numero_table
        })
      });

      if (res.ok) {
        toast.success('Consultation enregistrée');
        setShowGlobalConsultationModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  const handleContinueReadingSubmit = async (newBookId: number) => {
    if (!continuingConsultId) return;
    try {
      const res = await apiFetch(`/api/bibliotheque-physique/consultations/${continuingConsultId}/continuer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nouveau_livre_id: newBookId })
      });
      if (res.ok) {
        toast.success('Nouveau livre enregistré pour cette session');
        setShowContinueReadingModal(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur');
      }
    } catch (e) { toast.error('Erreur réseau'); }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Book size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Livres Totaux</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.totalBooks || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <ArrowLeftRight size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Emprunts en cours</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.activeLoans || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Retards</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.overdueLoans || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Consultations (Aujourd'hui)</p>
            <p className="text-2xl font-bold text-slate-900">{stats?.todayConsultations || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <History size={20} className="text-primary" />
            Emprunts récents
          </h3>
          <div className="space-y-4">
            {loans.slice(0, 5).map(loan => (
              <div key={loan.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center text-slate-400">
                    <Book size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 truncate max-w-[200px]">{loan.titre_livre}</p>
                    <p className="text-xs text-slate-500">{loan.nom_adherent} {loan.prenom_adherent} • {loan.classe_adherent}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                    loan.statut === 'rendu' ? 'bg-emerald-100 text-emerald-700' :
                    loan.statut === 'retard' ? 'bg-rose-100 text-rose-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {loan.statut}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {format(new Date(loan.date_emprunt), 'dd MMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
            {loans.length === 0 && (
              <p className="text-center py-8 text-slate-400 italic">Aucun emprunt récent</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            Consultations en cours
          </h3>
          <div className="space-y-4">
            {consultations.filter(c => !c.heure_fin).map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center animate-pulse">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{c.titre_livre}</p>
                    <p className="text-xs text-slate-500">{c.nom_eleve} {c.prenom_eleve} • {c.emplacement_lecture}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleEndConsultation(c.id)}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold transition-all"
                >
                  Terminer
                </button>
              </div>
            ))}
            {consultations.filter(c => !c.heure_fin).length === 0 && (
              <p className="text-center py-8 text-slate-400 italic">Aucune consultation active</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderLivres = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-2 w-full max-w-2xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher un livre par titre, auteur ou code..."
              className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2 bg-white border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Toutes catégories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => {
            setSelectedBook(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-primary text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Plus size={20} />
          Nouveau Livre
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredBooks.map(book => (
          <motion.div 
            layout
            key={book.id} 
            className="bg-white border rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all group relative flex flex-col h-full"
          >
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded border">
                {book.code_livre}
              </span>
              <div className={`w-3 h-3 rounded-full ${
                book.etat_general === 'neuf' ? 'bg-emerald-500' :
                book.etat_general === 'bon' ? 'bg-blue-500' :
                book.etat_general === 'ancien' ? 'bg-amber-500' :
                'bg-rose-500'
              }`} title={`État: ${book.etat_general}`} />
            </div>

            <div className="p-5 flex-1 cursor-pointer" onClick={() => { setSelectedBook(book); setShowBookDetails(true); }}>
              <div className="w-full aspect-[3/4] bg-slate-100 rounded-2xl mb-4 overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner group-hover:scale-[1.02] transition-transform">
                {book.couverture_url ? (
                  <img src={book.couverture_url} alt={book.titre} className="w-full h-full object-cover" />
                ) : (
                  <Book size={48} className="text-slate-300" />
                )}
              </div>
              <h4 className="font-black text-slate-900 line-clamp-2 min-h-[2.5rem] leading-tight text-base mb-1">{book.titre}</h4>
              <p className="text-sm text-slate-500 italic">par {book.auteur}</p>
              
              <div className="mt-4 flex items-center gap-4">
                 <div className="flex-1">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                         className="h-full bg-primary rounded-full transition-all" 
                         style={{ width: `${(book.quantite_disponible / book.quantite_totale) * 100}%` }}
                       />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">
                      {book.quantite_disponible} dispo. / {book.quantite_totale}
                    </p>
                 </div>
                 <div className="bg-primary/5 px-2 py-1 rounded-lg border border-primary/10">
                    <p className="text-[9px] text-primary font-black uppercase">{book.categorie}</p>
                 </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 text-slate-400">
                <MapPin size={14} className="text-rose-400" />
                <span className="text-[10px] font-black uppercase tracking-tight">
                  Arm: {book.armoire_numero || '?'} • Cas: {book.casier_numero || '?'} • Tab: {book.table_numero || '?'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t flex gap-2">
              <button 
                onClick={() => {
                  setSelectedBook(book);
                  setShowLoanModal(true);
                }}
                disabled={book.quantite_disponible <= 0}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-lg shadow-blue-600/20"
              >
                <ArrowLeftRight size={14} />
                Emprunt
              </button>
              <button 
                onClick={() => {
                  setSelectedBook(book);
                  setShowConsultationModal(true);
                }}
                disabled={book.quantite_disponible <= 0}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-lg shadow-emerald-600/20"
              >
                <BookOpen size={14} />
                Lire ici
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shadow-inner">
              <Library size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Bibliothèque Scolaire</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-slate-500 font-medium">Gestion des livres, emprunts et consultations</p>
                <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                  <Filter size={12} className="text-slate-400" />
                  <select
                    value={selectedYearId}
                    onChange={(e) => setSelectedYearId(e.target.value)}
                    className="text-[10px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
                  >
                    <option value="all">Toutes les années</option>
                    {years.map((y: any) => (
                      <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                setSelectedBooksForAction([]);
                setSelectedAdherentForAction(null);
                setShowGlobalLoanModal(true);
              }}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <ArrowLeftRight size={18} /> Enregistrer un emprunt
            </button>
            <button 
              onClick={() => {
                setSelectedBooksForAction([]);
                setSelectedAdherentForAction(null);
                setShowGlobalConsultationModal(true);
              }}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <BookOpen size={18} /> Lecture sur place
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border shadow-sm">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
            { id: 'livres', icon: Book, label: 'Livres' },
            { id: 'adherents', icon: Users, label: 'Adhérents' },
            { id: 'emprunts', icon: ArrowLeftRight, label: 'Emprunts' },
            { id: 'consultations', icon: BookOpen, label: 'Lecture sur place' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id 
                ? 'bg-primary text-white shadow-md' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <tab.icon size={18} />
              <span className="hidden lg:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'livres' && renderLivres()}
          {activeTab === 'adherents' && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Gestion des Adhérents</h3>
                  <p className="text-sm text-slate-500">Membres inscrits à la bibliothèque scolaire</p>
                </div>
                <div className="flex items-center gap-3">
                  <Link 
                    to="/paiements"
                    className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs"
                    title="Encaisser la cotisation et générer le reçu officiel avec code adhérent"
                  >
                    <CreditCard size={16} /> Adhésion & Reçu officiel
                  </Link>
                  <button 
                    onClick={() => {
                      setMembershipSearchCode('');
                      setMembershipLookupResult(null);
                      setMembershipSearchError(null);
                      setShowMemberModal(true);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                    title="Ajouter un adhérent via son numéro d'adhésion officiel délivré au paiement"
                  >
                    <UserCheck size={16} /> Ajouter par N° d'adhésion
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-4">N° Adhérent</th>
                      <th className="px-6 py-4">Nom Complet</th>
                      <th className="px-6 py-4">Type / Classe</th>
                      <th className="px-6 py-4">Cotisation & Dette</th>
                      <th className="px-6 py-4">Emprunts</th>
                      <th className="px-6 py-4">Validité & Statut</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map(m => {
                      const isExpired = m.statut === 'expire' || Boolean(m.date_expiration && new Date(m.date_expiration) < new Date());
                      const due = m.montant_cotisation_du ?? 1000;
                      const paid = m.montant_cotisation_paye ?? 0;
                      const dette = Math.max(0, due - paid);

                      return (
                        <tr 
                          key={m.id} 
                          className="hover:bg-slate-50 transition-colors cursor-pointer group"
                          onClick={() => {
                            setSelectedMember(m);
                            setShowMemberDetails(true);
                            fetchMemberHistory(m.id);
                          }}
                        >
                          <td className="px-6 py-4">
                            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border text-xs group-hover:bg-primary/10 transition-all">
                              {m.numero_adherent}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                                {m.photo ? (
                                  <img src={m.photo} alt={m.nom_complet} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                                    {m.nom_complet.charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{m.nom_complet}</p>
                                <p className="text-[10px] text-slate-400">{m.telephone || m.email || 'Pas de contact'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                m.type === 'eleve' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100'
                              }`}>
                                {m.type === 'eleve' ? 'Élève (Interne)' : 'Externe'}
                              </span>
                              {m.classe_nom && (
                                <span className="text-xs font-bold text-slate-600">
                                  {m.classe_nom}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {dette > 0 ? (
                                <span className="w-fit inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <AlertCircle size={10} />
                                  Dette : {dette.toLocaleString()} FCFA
                                </span>
                              ) : (
                                <span className="w-fit inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 size={10} />
                                  Cotisation payée
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {paid.toLocaleString()} / {due.toLocaleString()} FCFA
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-black text-slate-700">{m.emprunts_en_cours}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <span className={`w-fit px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                isExpired ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                                m.statut === 'actif' ? 'bg-emerald-100 text-emerald-700' : 
                                m.statut === 'suspect' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {isExpired ? 'Expiré (1 an révolu)' : m.statut}
                              </span>
                              {m.date_expiration && (
                                <span className={`text-[10px] font-medium ${isExpired ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                                  {isExpired ? 'Expiré le ' : 'Expire le '}
                                  {format(new Date(m.date_expiration), 'dd/MM/yyyy')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2" onClick={e => e.stopPropagation()}>
                              {isExpired && (
                                <button 
                                  onClick={() => handleRenewMember(m.id)}
                                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-all"
                                  title="Renouveler l'adhésion pour 1 an"
                                >
                                  <RefreshCw size={11} />
                                  <span>Renouveler</span>
                                </button>
                              )}
                              <button 
                                onClick={() => {
                                  setSelectedMember(m);
                                  setShowMemberDetails(true);
                                  fetchMemberHistory(m.id);
                                }}
                                className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-primary transition-all shadow-sm border border-transparent hover:border-slate-200"
                                title="Voir la fiche détaillée"
                              >
                                <Eye size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {members.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                          Aucun adhérent enregistré
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activeTab === 'emprunts' && (
             <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
               <div className="p-6 border-b flex justify-between items-center">
                 <h3 className="text-lg font-bold">Suivi des Emprunts</h3>
                 <div className="flex gap-2">
                    <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold flex items-center gap-2">
                      <Filter size={18} /> Retards uniquement
                    </button>
                 </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                      <tr>
                        <th className="px-6 py-4">Livre</th>
                        <th className="px-6 py-4">Adhérent</th>
                        <th className="px-6 py-4">Date Emprunt</th>
                        <th className="px-6 py-4">Retour Prévu</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {loans.map(loan => (
                        <tr key={loan.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{loan.titre_livre}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400">{loan.code_livre}</span>
                              {loan.armoire_numero && (
                                <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold uppercase">
                                  Pos: {loan.armoire_numero}/{loan.casier_numero}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700">{loan.nom_adherent} {loan.prenom_adherent}</p>
                            <p className="text-[10px] text-slate-400">{loan.classe_adherent}</p>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {format(new Date(loan.date_emprunt), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4 text-sm font-bold">
                            {format(new Date(loan.date_retour_prevue), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                              loan.statut === 'rendu' ? 'bg-emerald-100 text-emerald-700' :
                              loan.statut === 'retard' ? 'bg-rose-100 text-rose-700 animate-pulse' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {loan.statut.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {loan.statut !== 'rendu' && (
                                <>
                                  <button 
                                    onClick={() => handleReturn(loan.id)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                  >
                                    Marquer comme rendu
                                  </button>
                                  <button 
                                    onClick={() => handleReconduireLoan(loan.id)}
                                    className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-bold transition-all"
                                    title="Reconduire l'emprunt (Prolonger la durée)"
                                  >
                                    Reconduire l'emprunt
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               </div>
             </div>
          )}
          {activeTab === 'consultations' && (
            <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
               <div className="p-6 border-b flex justify-between items-center">
                 <h3 className="text-lg font-bold">Consultations sur Place</h3>
               </div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4">Livre</th>
                        <th className="px-6 py-4">Élève</th>
                        <th className="px-6 py-4">Lieu</th>
                        <th className="px-6 py-4">Horaires</th>
                        <th className="px-6 py-4">Statut</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {consultations.map(c => (
                        <tr key={c.id}>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-900">{c.titre_livre}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700">{c.nom_eleve} {c.prenom_eleve}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm">{c.emplacement_lecture}</span>
                          </td>
                          <td className="px-6 py-4 text-xs">
                            <p>Début: {c.heure_debut}</p>
                            {c.heure_fin && <p>Fin: {c.heure_fin}</p>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                                c.heure_fin ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {c.heure_fin ? 'Terminé' : 'En cours'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {!c.heure_fin && (
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleEndConsultation(c.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                                  title="Marquer comme lecture terminée"
                                >
                                  Terminé
                                </button>
                                <button 
                                  onClick={() => handleContinueWithOtherBook(c.id)}
                                  className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs font-bold transition-all"
                                  title="Changer de livre pour la même session"
                                >
                                  Continuer avec autre livre
                                </button>
                                <button 
                                  onClick={() => handleExitLibrary(c.id)}
                                  className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-xs font-bold transition-all"
                                  title="Enregistrer la sortie du lecteur"
                                >
                                  Sortie
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals Implementation (Simplified for briefness) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">Ajouter un nouveau livre</h2>
              <button onClick={() => { setShowAddModal(false); setBookCoverPhoto(''); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddBook} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Code Livre (Auto-généré si vide)</label>
                  <input name="code_livre" className="w-full px-4 py-2 border rounded-xl bg-slate-50 focus:bg-white transition-all" placeholder="ex: BIB-2024-001" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Couverture du livre (Image)</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {bookCoverPhoto ? (
                        <img src={bookCoverPhoto} alt="Aperçu couverture" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen size={20} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="cursor-pointer px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 shadow-2xs transition-all">
                        <Upload size={13} className="text-indigo-600" />
                        <span>Importer une image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setBookCoverPhoto(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {bookCoverPhoto && (
                        <button
                          type="button"
                          onClick={() => setBookCoverPhoto('')}
                          className="block text-[11px] text-rose-500 font-bold hover:underline"
                        >
                          Supprimer l'image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Titre du livre</label>
                  <input name="titre" required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Titre complet" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Catégorie</label>
                  <input name="categorie" required className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary/20 outline-none" placeholder="ex: Roman, Sciences, Histoire..." />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Auteur</label>
                <input name="auteur" required className="w-full px-4 py-2 border rounded-xl" placeholder="Nom de l'auteur" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Quantité Totale</label>
                  <input name="quantite_totale" type="number" required className="w-full px-4 py-2 border rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">État</label>
                  <select name="etat" className="w-full px-4 py-2 border rounded-xl">
                    <option value="neuf">Neuf</option>
                    <option value="ancien">Ancien</option>
                    <option value="defectueux">Défectueux</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Armoire</label>
                  <input name="emplacement_armoire" required className="w-full px-4 py-2 border rounded-xl" placeholder="n°" />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl">Annuler</button>
                <button type="submit" className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">Enregistrer</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showLoanModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-md p-0 shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-blue-600 text-white">
              <h2 className="text-xl font-black mb-1">Enregistrer un emprunt</h2>
              <p className="text-blue-100 text-xs">Règle: 2 livres max, 72h max, pas de week-end</p>
            </div>
            <div className="p-6">
              <div className="p-4 bg-blue-50 rounded-2xl mb-6 flex gap-3 items-center border border-blue-100">
                <Book className="text-blue-600" />
                <div>
                    <p className="text-sm font-bold text-blue-900 line-clamp-1">{selectedBook.titre}</p>
                    <p className="text-[10px] text-blue-600 uppercase font-bold tracking-widest">{selectedBook.code_livre}</p>
                </div>
              </div>

              <form onSubmit={handleLoan} className="space-y-4">
                <input type="hidden" name="livre_id" value={selectedBook.id} />
                
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recherche rapide (Élève)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Chercher un élève..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white shadow-sm"
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value);
                          if (e.target.value === '') setSelectedClassId('');
                        }}
                      />
                    </div>
                    {studentSearchTerm.length >= 2 && (
                      <div className="mt-2 p-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto space-y-1 z-10 relative">
                        {allStudents
                          .filter(s => `${s.nom} ${s.prenom}`.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                          .map(s => {
                            const isAdherent = members.find(m => m.eleve_id === s.id);
                            return (
                              <button 
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClassId(s.classe_nom || '');
                                  setStudentSearchTerm(`${s.nom} ${s.prenom}`);
                                }}
                                className="w-full text-left p-2 hover:bg-blue-50 rounded-lg text-xs font-bold text-slate-700 flex justify-between items-center"
                              >
                                <span>{s.nom} {s.prenom}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-slate-400 font-black uppercase">{s.classe_nom}</span>
                                  {!isAdherent && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">Nouv. Adhérent</span>}
                                </div>
                              </button>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                    <div className="relative flex justify-center text-[10px] uppercase font-black text-slate-300"><span className="bg-slate-50 px-2 italic">OU Sélection par classe</span></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</label>
                      <select 
                        className="w-full px-4 py-2 border rounded-xl bg-white text-xs font-bold"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                      >
                        <option value="">-- Classe --</option>
                        {classes.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève / Adhérent</label>
                      <select 
                        name="eleve_or_adherent_id"
                        required 
                        className="w-full px-4 py-2 border rounded-xl bg-white text-xs font-bold"
                        value={
                          allStudents.find(s => `${s.nom} ${s.prenom}` === studentSearchTerm)?.id || ""
                        }
                        onChange={(e) => {
                          const s = allStudents.find(stu => String(stu.id) === e.target.value);
                          if (s) {
                            setStudentSearchTerm(`${s.nom} ${s.prenom}`);
                            setSelectedClassId(s.classe_nom);
                          }
                        }}
                      >
                        <option value="">-- Sélectionner --</option>
                        {allStudents.filter(s => !selectedClassId || s.classe_nom === selectedClassId).map(s => {
                           const m = members.find(mem => mem.eleve_id === s.id);
                           return (
                             <option key={s.id} value={s.id}>
                               {s.nom} {s.prenom} {!m ? '(Nouv. Adhérent)' : ''}
                             </option>
                           );
                        })}
                      </select>
                    </div>
                  </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowLoanModal(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600">Annuler</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20">Valider l'emprunt</button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {showConsultationModal && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-md p-0 shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black mb-1">Lecture sur place</h2>
                <p className="text-emerald-100 text-xs">Règle: 5 livres max sur place</p>
              </div>
              <button onClick={() => setShowConsultationModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleConsultation} className="space-y-4">
                <input type="hidden" name="livre_id" value={selectedBook.id} />
                
                <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recherche rapide (Élève)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Taper le nom..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl bg-white shadow-sm"
                        value={studentSearchTerm}
                        onChange={(e) => {
                          setStudentSearchTerm(e.target.value);
                          if (e.target.value === '') setSelectedClassId('');
                        }}
                      />
                    </div>
                    {studentSearchTerm.length >= 2 && (
                      <div className="mt-2 p-1 bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto space-y-1 z-10 relative">
                        {allStudents
                          .filter(s => `${s.nom} ${s.prenom}`.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                          .map(s => {
                            const isAdherent = members.find(m => m.eleve_id === s.id);
                            return (
                              <button 
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClassId(s.classe_nom || '');
                                  setStudentSearchTerm(`${s.nom} ${s.prenom}`);
                                }}
                                className="w-full text-left p-2 hover:bg-emerald-50 rounded-lg text-xs font-bold text-slate-700 flex justify-between items-center"
                              >
                                <span>{s.nom} {s.prenom}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] text-slate-400 font-black uppercase">{s.classe_nom}</span>
                                  {!isAdherent && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">Nouv. Adhérent</span>}
                                </div>
                              </button>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Classe</label>
                      <select 
                        className="w-full px-4 py-2 border rounded-xl bg-white text-xs font-bold"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                      >
                        <option value="">-- Classe --</option>
                        {classes.map(c => <option key={c.id} value={c.nom}>{c.nom}</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Élève / Adhérent</label>
                      <select 
                        name="eleve_or_adherent_id"
                        required 
                        className="w-full px-4 py-2 border rounded-xl bg-white text-xs font-bold"
                        value={
                          allStudents.find(s => `${s.nom} ${s.prenom}` === studentSearchTerm)?.id || ""
                        }
                        onChange={(e) => {
                          const s = allStudents.find(stu => String(stu.id) === e.target.value);
                          if (s) {
                            setStudentSearchTerm(`${s.nom} ${s.prenom}`);
                            setSelectedClassId(s.classe_nom);
                          }
                        }}
                      >
                        <option value="">-- Sélectionner --</option>
                        {allStudents.filter(s => !selectedClassId || s.classe_nom === selectedClassId || String(s.classe_id) === selectedClassId).map(s => {
                           const m = members.find(mem => mem.eleve_id === s.id);
                           return (
                             <option key={s.id} value={s.id}>
                               {s.nom} {s.prenom} {!m ? '(Nouv. Adhérent)' : ''}
                             </option>
                           );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Emplacement de lecture</label>
                    <input name="numero_table" placeholder="N° Table (ex: Table 04)" required className="w-full px-4 py-2 border rounded-xl bg-white font-bold" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowConsultationModal(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600">Annuler</button>
                  <button type="submit" className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">Démarrer la lecture</button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {showBookDetails && selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 bg-slate-100 p-6 flex flex-col items-center border-r">
               <div className="w-full aspect-[3/4] bg-white rounded-2xl shadow-lg mb-6 overflow-hidden flex items-center justify-center border">
                  {selectedBook.couverture_url ? (
                    <img src={selectedBook.couverture_url} alt={selectedBook.titre} className="w-full h-full object-cover" />
                  ) : (
                    <Book size={64} className="text-slate-200" />
                  )}
               </div>
               <div className="w-full space-y-2">
                  <button 
                    onClick={() => setShowMoveModal(true)}
                    className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <MapPin size={14} className="text-rose-500" />
                    Déplacer le livre
                  </button>
                  <button 
                    onClick={() => setShowPermuteModal(true)}
                    className="w-full py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeftRight size={14} className="text-blue-500" />
                    Permuter emplacement
                  </button>
               </div>
            </div>
            
            <div className="w-full md:w-2/3 p-8 flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-1">{selectedBook.titre}</h2>
                  <p className="text-slate-500 font-bold italic">par {selectedBook.auteur}</p>
                </div>
                <button onClick={() => setShowBookDetails(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Emplacement Actuel</p>
                    <p className="text-sm font-black text-slate-900">Armoire {selectedBook.armoire_numero || '?'}</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Casier {selectedBook.casier_numero || '?'} • Table {selectedBook.table_numero || '?'}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Inventaire</p>
                    <p className="text-sm font-black text-slate-900">{selectedBook.quantite_disponible} Disponibles</p>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">Sur total de {selectedBook.quantite_totale}</p>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 mb-6">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Résumé / Description</p>
                 <p className="text-sm text-slate-600 leading-relaxed italic">
                   {selectedBook.resume || "Aucune description disponible pour cet ouvrage."}
                 </p>
              </div>

              <div className="flex gap-4 pt-4 border-t">
                  <button 
                    onClick={() => { setShowBookDetails(false); setShowLoanModal(true); }}
                    disabled={selectedBook.quantite_disponible <= 0}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20"
                  >
                    Emprunter
                  </button>
                  <button 
                    onClick={() => { setShowBookDetails(false); setShowConsultationModal(true); }}
                    disabled={selectedBook.quantite_disponible <= 0}
                    className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20"
                  >
                    Lecture sur place
                  </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showMoveModal && selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in zoom-in-95">
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-black mb-1">Déplacer le livre</h2>
                <p className="text-slate-500 text-xs">Modifier l'emplacement physique dans la bibliothèque</p>
              </div>
              <button onClick={() => setShowMoveModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleMoveBook} className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Armoire</label>
                    <input name="armoire" defaultValue={selectedBook.armoire_numero} className="w-full px-4 py-2 border rounded-xl font-bold" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Casier</label>
                    <input name="casier" defaultValue={selectedBook.casier_numero} className="w-full px-4 py-2 border rounded-xl font-bold" />
                  </div>
               </div>
               
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Position dans le casier</label>
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="position" value="gauche" defaultChecked={selectedBook.position_casier === 'gauche'} className="hidden peer" />
                      <div className="py-2 text-center text-xs font-black uppercase rounded-lg peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-primary text-slate-400 transition-all">À Gauche</div>
                    </label>
                    <label className="flex-1 cursor-pointer">
                      <input type="radio" name="position" value="droite" defaultChecked={selectedBook.position_casier === 'droite'} className="hidden peer" />
                      <div className="py-2 text-center text-xs font-black uppercase rounded-lg peer-checked:bg-white peer-checked:shadow-sm peer-checked:text-primary text-slate-400 transition-all">À Droite</div>
                    </label>
                  </div>
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Table (Optionnel)</label>
                  <input name="table" defaultValue={selectedBook.table_numero} className="w-full px-4 py-2 border rounded-xl font-bold" placeholder="N° Table" />
               </div>

               <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowMoveModal(false)} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-slate-600">Annuler</button>
                  <button type="submit" className="flex-1 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20">Valider</button>
               </div>
            </form>
          </motion.div>
        </div>
      )}

      {showMemberDetails && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-4xl p-0 shadow-2xl overflow-hidden my-8 flex flex-col md:flex-row">
            <div className="w-full md:w-1/3 bg-slate-900 text-white p-8">
              <div className="flex justify-between items-start mb-8">
                <div className="w-20 h-20 bg-primary/20 text-primary rounded-2xl flex items-center justify-center shadow-inner overflow-hidden border-2 border-white/20">
                   {selectedMember.photo ? (
                     <img src={selectedMember.photo} alt={selectedMember.nom_complet} className="w-full h-full object-cover" />
                   ) : (
                     <Users size={40} />
                   )}
                </div>
                <button onClick={() => setShowMemberDetails(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white md:hidden">
                  <X size={20} />
                </button>
              </div>
              <h2 className="text-2xl font-black mb-1">{selectedMember.nom_complet}</h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-6">{selectedMember.numero_adherent}</p>
              
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Informations Personnelles</p>
                    <p className="text-xs font-medium"><span className="text-slate-400">Type / Classe :</span> <span className="font-bold text-white">{selectedMember.type === 'eleve' ? `Élève (${selectedMember.classe_nom || 'Interne'})` : 'Adhérent Externe'}</span></p>
                    <p className="text-xs font-medium"><span className="text-slate-400">Téléphone :</span> <span className="font-bold text-white">{selectedMember.telephone || 'Non renseigné'}</span></p>
                    {selectedMember.email && <p className="text-xs font-medium"><span className="text-slate-400">Email :</span> <span className="font-bold text-white">{selectedMember.email}</span></p>}
                    {selectedMember.date_naissance && <p className="text-xs font-medium"><span className="text-slate-400">Né(e) le :</span> <span className="font-bold text-white">{format(new Date(selectedMember.date_naissance), 'dd/MM/yyyy')} {selectedMember.lieu_naissance ? `à ${selectedMember.lieu_naissance}` : ''}</span></p>}
                    {selectedMember.adresse && <p className="text-xs font-medium"><span className="text-slate-400">Adresse :</span> <span className="font-bold text-white">{selectedMember.adresse}</span></p>}
                    {selectedMember.ecole_provenance && <p className="text-xs font-medium"><span className="text-slate-400">École :</span> <span className="font-bold text-white">{selectedMember.ecole_provenance}</span></p>}
                    {selectedMember.parents_tuteurs && <p className="text-xs font-medium"><span className="text-slate-400">Parents/Tuteurs :</span> <span className="font-bold text-white">{selectedMember.parents_tuteurs}</span></p>}
                 </div>

                 {selectedMember.contact_urgence_nom && (
                   <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 space-y-1.5">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                        <PhoneCall size={12} /> Contact d'Urgence
                      </p>
                      <p className="text-xs font-bold text-white">{selectedMember.contact_urgence_nom}</p>
                      {selectedMember.contact_urgence_telephone && (
                        <p className="text-xs text-amber-200 font-mono">Tél : {selectedMember.contact_urgence_telephone}</p>
                      )}
                      {selectedMember.contact_urgence_adresse && (
                        <p className="text-[11px] text-slate-300">Adr : {selectedMember.contact_urgence_adresse}</p>
                      )}
                   </div>
                 )}

                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Adhésion & Validité (Annuelle)</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date d'adhésion</span>
                        <span className="font-bold text-white">
                          {selectedMember.date_adhesion ? format(new Date(selectedMember.date_adhesion), 'dd/MM/yyyy') : 'Non renseignée'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Date d'expiration</span>
                        <span className={`font-bold ${
                          selectedMember.date_expiration && new Date(selectedMember.date_expiration) < new Date() ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {selectedMember.date_expiration ? format(new Date(selectedMember.date_expiration), 'dd/MM/yyyy') : '1 an'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Cotisation</span>
                        <span className="text-xs font-bold text-white">
                          {(selectedMember.montant_cotisation_paye || 0).toLocaleString()} / {(selectedMember.montant_cotisation_du || 1000).toLocaleString()} FCFA
                        </span>
                      </div>
                      {(selectedMember.montant_cotisation_du || 1000) > (selectedMember.montant_cotisation_paye || 0) ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                          Dette : {((selectedMember.montant_cotisation_du || 1000) - (selectedMember.montant_cotisation_paye || 0)).toLocaleString()} FCFA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Soldée
                        </span>
                      )}
                    </div>
                 </div>

                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Statut & Sanctions</p>
                    <div className="flex items-center gap-2 mt-1">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                         (selectedMember.statut === 'expire' || (selectedMember.date_expiration && new Date(selectedMember.date_expiration) < new Date())) ? 'bg-rose-500/20 text-rose-400' :
                         selectedMember.statut === 'actif' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-rose-400'
                       }`}>
                         {(selectedMember.statut === 'expire' || (selectedMember.date_expiration && new Date(selectedMember.date_expiration) < new Date())) ? 'Expiré (1 an)' : selectedMember.statut}
                       </span>
                       <span className="text-xs font-bold text-slate-400">{selectedMember.nombre_avertissements} Avertissements</span>
                    </div>
                 </div>

                 {(selectedMember.statut === 'expire' || (selectedMember.date_expiration && new Date(selectedMember.date_expiration) < new Date())) && (
                   <button 
                     onClick={() => handleRenewMember(selectedMember.id)}
                     className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                   >
                     <RefreshCw size={16} /> Renouveler l'adhésion (1 an)
                   </button>
                 )}
              </div>

              {selectedMember.type === 'externe' && (
                <button 
                  onClick={() => setShowIDCard(true)}
                  className="w-full mt-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                >
                  <Barcode size={20} /> Générer Carte
                </button>
              )}
            </div>

            <div className="w-full md:w-2/3 p-8 bg-slate-50 flex flex-col max-h-[80vh] overflow-hidden">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                   <History size={20} className="text-primary" /> Historique d'activité
                 </h3>
                 <button onClick={() => setShowMemberDetails(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hidden md:block">
                  <X size={20} />
                </button>
               </div>

               <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                  <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <ArrowLeftRight size={14} /> Emprunts (A domicile)
                    </h4>
                    <div className="space-y-2">
                       {memberHistory?.loans.map(loan => (
                         <div key={loan.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div>
                               <p className="text-sm font-black text-slate-900">{loan.titre_livre}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">{loan.code_livre} • Emprunté le {format(new Date(loan.date_emprunt), 'dd/MM/yyyy')}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              loan.statut === 'rendu' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {loan.statut}
                            </span>
                         </div>
                       ))}
                       {memberHistory?.loans.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Aucun emprunt</p>}
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BookOpen size={14} /> Lectures sur place
                    </h4>
                    <div className="space-y-2">
                       {memberHistory?.consultations.map(c => (
                         <div key={c.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                            <div>
                               <p className="text-sm font-black text-slate-900">{c.titre_livre}</p>
                               <p className="text-[10px] text-slate-400 font-bold uppercase">{c.date_consultation} • {c.heure_debut} - {c.heure_fin || 'En cours'}</p>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">{c.emplacement_lecture}</span>
                         </div>
                       ))}
                       {memberHistory?.consultations.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">Aucune lecture sur place</p>}
                    </div>
                  </section>
               </div>
            </div>
          </motion.div>
        </div>
      )}

      {showIDCard && selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
           <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-12 rounded-[2rem] shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <button onClick={() => setShowIDCard(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <X size={20} />
              </button>
              
              <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center border-4 border-slate-50 text-slate-300 overflow-hidden">
                 {selectedMember.photo ? (
                   <img src={selectedMember.photo} alt={selectedMember.nom_complet} className="w-full h-full object-cover" />
                 ) : (
                   <Users size={48} />
                 )}
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-1">{selectedMember.nom_complet}</h3>
              <p className="text-primary font-black uppercase tracking-[0.2em] text-xs mb-8">Carte d'Adhérent Externe</p>
              
              <div className="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 mb-8">
                 <Barcode size={64} className="mx-auto text-slate-900 mb-4" />
                 <p className="font-mono text-xl font-black text-slate-900 tracking-widest">{selectedMember.numero_adherent}</p>
              </div>

              <div className="flex flex-col gap-2">
                 <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-900/20 hover:scale-[1.02] transition-all">
                    Imprimer la carte
                 </button>
                 <button onClick={() => setShowIDCard(false)} className="w-full py-4 bg-white border border-slate-200 text-slate-400 font-black rounded-2xl hover:bg-slate-50 transition-all">
                    Fermer
                 </button>
              </div>
              
              <p className="mt-8 text-[10px] text-slate-400 font-bold uppercase tracking-widest">Bibliothèque Scolaire • {new Date().getFullYear()}</p>
           </motion.div>
        </div>
      )}

      {showMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-xl p-0 shadow-2xl overflow-hidden my-8">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <UserCheck size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black">Ajouter un Adhérent à la Bibliothèque</h2>
                  <p className="text-slate-400 text-xs">Vérification et activation par numéro d'adhésion officiel</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowMemberModal(false);
                  setMembershipSearchCode('');
                  setMembershipLookupResult(null);
                  setMembershipSearchError(null);
                }} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Notice d'information officielle */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-start gap-3">
                <ShieldCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-bold text-indigo-950">Procédure officielle d'adhésion</p>
                  <p className="text-indigo-800 leading-relaxed">
                    Les inscriptions et encaissements de cotisation sont centralisés au guichet <strong>Paiement & Scolarité</strong>. 
                    Saisissez ici le numéro d'adhésion remis sur le reçu officiel (ex: <strong>ADH-2026-001</strong>) ou la référence du reçu pour ajouter ou vérifier le membre dans la bibliothèque.
                  </p>
                  <div className="pt-1">
                    <Link 
                      to="/paiements" 
                      className="font-bold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                    >
                      <span>Accéder au guichet Paiement & Scolarité</span>
                      <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* Formulaire de recherche par numéro */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const code = membershipSearchCode.trim();
                  if (!code) {
                    toast.error("Veuillez saisir un numéro d'adhésion ou de reçu");
                    return;
                  }

                  setIsSearchingMembership(true);
                  setMembershipSearchError(null);
                  setMembershipLookupResult(null);

                  try {
                    const res = await apiFetch(`/api/bibliotheque-physique/adherents/rechercher-numero/${encodeURIComponent(code)}`);
                    const data = await res.json();
                    if (res.ok && data.id) {
                      setMembershipLookupResult(data);
                      toast.success(`Adhérent trouvé : ${data.nom_complet} (${data.numero_adherent})`);
                    } else {
                      setMembershipSearchError(data.error || "Aucun adhérent trouvé avec ce numéro");
                    }
                  } catch (err: any) {
                    setMembershipSearchError("Erreur lors de la vérification du numéro d'adhésion");
                  } finally {
                    setIsSearchingMembership(false);
                  }
                }} 
                className="space-y-2"
              >
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Numéro d'adhésion officiel ou N° de reçu de paiement <span className="text-rose-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">Exemple : ADH-2026-001 ou REC-0012</span>
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      required
                      placeholder="ex: ADH-2026-001 ou 2026-001"
                      className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-2xl bg-white shadow-2xs font-mono font-bold text-slate-900 text-sm uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      value={membershipSearchCode}
                      onChange={(e) => setMembershipSearchCode(e.target.value.toUpperCase())}
                    />
                    {membershipSearchCode && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setMembershipSearchCode('');
                          setMembershipLookupResult(null);
                          setMembershipSearchError(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSearchingMembership || !membershipSearchCode.trim()}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs flex items-center gap-2 shadow-md shadow-indigo-200 transition-all shrink-0"
                  >
                    {isSearchingMembership ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>Vérification...</span>
                      </>
                    ) : (
                      <>
                        <Search size={15} />
                        <span>Vérifier le numéro</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Résultat si Adhérent Trouvé */}
              {membershipLookupResult && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wide">Adhérent vérifié & conforme</span>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                      {membershipLookupResult.numero_adherent}
                    </span>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                      {membershipLookupResult.photo ? (
                        <img src={membershipLookupResult.photo} alt={membershipLookupResult.nom_complet} className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-900 text-base truncate">{membershipLookupResult.nom_complet}</h4>
                      <div className="flex flex-wrap gap-2 items-center mt-1">
                        <span className="px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md">
                          {membershipLookupResult.type === 'eleve' ? `Élève (${membershipLookupResult.classe_nom || 'Classe non définie'})` : 'Membre Externe'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                          Cotisation : {Number(membershipLookupResult.montant_cotisation_paye || 0).toLocaleString()} F réglée
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Validité adhésion</span>
                      <span className="font-bold text-slate-700">
                        {membershipLookupResult.date_expiration ? `Jusqu'au ${new Date(membershipLookupResult.date_expiration).toLocaleDateString('fr-FR')}` : '1 an actif'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold block">Téléphone</span>
                      <span className="font-bold text-slate-700">{membershipLookupResult.telephone || 'Non renseigné'}</span>
                    </div>
                    {membershipLookupResult.contact_urgence_nom && (
                      <div className="col-span-2 pt-1 border-t border-slate-100">
                        <span className="text-slate-400 text-[10px] uppercase font-bold block">Contact d'urgence</span>
                        <span className="font-medium text-slate-700">
                          {membershipLookupResult.contact_urgence_nom} {membershipLookupResult.contact_urgence_telephone ? `(${membershipLookupResult.contact_urgence_telephone})` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  <button 
                    type="button" 
                    onClick={() => {
                      toast.success(`Adhérent ${membershipLookupResult.nom_complet} (${membershipLookupResult.numero_adherent}) validé et prêt dans la bibliothèque !`);
                      setShowMemberModal(false);
                      setSearchTerm(membershipLookupResult.numero_adherent);
                      setMembershipSearchCode('');
                      setMembershipLookupResult(null);
                      setMembershipSearchError(null);
                      fetchData();
                    }}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 transition-all"
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirmer l'ajout dans la liste de la bibliothèque</span>
                  </button>
                </div>
              )}

              {/* Erreur si Adhérent Non Trouvé */}
              {membershipSearchError && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-rose-900">Numéro d'adhésion introuvable</p>
                      <p className="text-rose-700 leading-relaxed">{membershipSearchError}</p>
                      <p className="text-slate-500 text-[11px] pt-1">
                        Assurez-vous que l'adhésion a été enregistrée et payée au guichet <strong>Paiement & Scolarité</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 flex gap-2">
                    <Link 
                      to="/paiements" 
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-2xs inline-flex items-center gap-1.5 transition-colors"
                    >
                      <CreditCard size={14} />
                      <span>Enregistrer l'adhésion au Paiement</span>
                    </Link>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowMemberModal(false);
                    setMembershipSearchCode('');
                    setMembershipLookupResult(null);
                    setMembershipSearchError(null);
                  }} 
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 text-xs transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {showPermuteModal && selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Permuter avec quel livre ?</h3>
              <button onClick={() => setShowPermuteModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Livre Source</p>
                <p className="text-sm font-bold text-slate-700">{selectedBook.titre}</p>
                <p className="text-[10px] text-slate-400 italic">Position: Armoire {selectedBook.armoire_numero}, Casier {selectedBook.casier_numero} ({selectedBook.position_casier})</p>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Chercher le livre cible..." 
                  className="w-full pl-10 pr-4 py-3 border rounded-2xl bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {books
                  .filter(b => b.id !== selectedBook.id && (
                    b.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    b.code_livre.toLowerCase().includes(searchTerm.toLowerCase())
                  ))
                  .map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        handlePermuteBooks(b.id);
                        setShowPermuteModal(false);
                      }}
                      className="w-full p-4 hover:bg-blue-50 border border-slate-100 rounded-2xl text-left transition-all group hover:border-blue-200"
                    >
                      <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{b.titre}</p>
                      <p className="text-[10px] text-slate-500">Armoire {b.armoire_numero}, Casier {b.casier_numero} ({b.position_casier})</p>
                    </button>
                  ))
                }
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL EMPRUNT GLOBAL */}
      {showGlobalLoanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
             {/* Panneau de gauche: Sélection Adhérent & Livres */}
             <div className="w-full md:w-1/2 border-r p-6 bg-slate-50 overflow-y-auto max-h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Enregistrer un emprunt</h3>
                  <button onClick={() => setShowGlobalLoanModal(false)} className="md:hidden p-2"><X /></button>
                </div>

                <div className="space-y-6">
                  {/* Recherche Adhérent */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Sélectionner l'Adhérent</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Nom ou numéro d'adhérent..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded-xl bg-white mt-1">
                      {members.filter(m => m.nom_complet.toLowerCase().includes(memberSearchQuery.toLowerCase()) || m.numero_adherent.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                        .slice(0, 10).map(m => (
                        <button 
                          key={m.id}
                          onClick={() => { setSelectedAdherentForAction(m); setMemberSearchQuery(''); }}
                          className={`w-full p-3 text-left hover:bg-blue-50 border-b flex justify-between items-center ${selectedAdherentForAction?.id === m.id ? 'bg-blue-50' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-bold">{m.nom_complet}</p>
                            <p className="text-[10px] text-slate-400">{m.numero_adherent}</p>
                          </div>
                          {selectedAdherentForAction?.id === m.id && <CheckCircle2 size={16} className="text-blue-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recherche Livres */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Ajouter des Livres</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Chercher un livre par titre ou code..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl"
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto border rounded-xl bg-white mt-1">
                      {books.filter(b => b.quantite_disponible > 0 && (b.titre.toLowerCase().includes(bookSearchQuery.toLowerCase()) || b.code_livre.toLowerCase().includes(bookSearchQuery.toLowerCase())))
                        .slice(0, 20).map(b => (
                        <button 
                          key={b.id}
                          onClick={() => handleToggleBookSelection(b)}
                          className={`w-full p-3 text-left hover:bg-slate-50 border-b flex justify-between items-center ${selectedBooksForAction.find(sb => sb.id === b.id) ? 'bg-emerald-50' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-bold">{b.titre}</p>
                            <p className="text-[10px] text-slate-400">{b.code_livre} • {b.auteur}</p>
                          </div>
                          {selectedBooksForAction.find(sb => sb.id === b.id) ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Plus size={16} className="text-slate-300" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
             </div>

             {/* Panneau de droite: Résumé & Validation */}
             <div className="w-full md:w-1/2 p-8 flex flex-col justify-between bg-white overflow-y-auto max-h-[80vh]">
                <div className="hidden md:flex justify-end">
                   <button onClick={() => setShowGlobalLoanModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="space-y-6">
                  {selectedAdherentForAction ? (
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-4">
                       <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black">
                          {selectedAdherentForAction.nom_complet.charAt(0)}
                       </div>
                       <div>
                          <p className="text-xs text-blue-600 font-black uppercase tracking-tighter">Emprunteur</p>
                          <p className="font-black text-slate-900">{selectedAdherentForAction.nom_complet}</p>
                          <p className="text-xs text-slate-500">{selectedAdherentForAction.numero_adherent} • {selectedAdherentForAction.classe_nom || 'Adhérent'}</p>
                       </div>
                    </div>
                  ) : (
                    <div className="p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-2">
                       <Users size={32} />
                       <p className="text-sm font-bold">Sélectionnez un adhérent</p>
                    </div>
                  )}

                  <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Livres sélectionnés ({selectedBooksForAction.length})</h4>
                     <div className="space-y-2">
                        {selectedBooksForAction.map(book => (
                          <div key={book.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border group">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-10 bg-white border rounded flex items-center justify-center">
                                   <Book size={14} className="text-slate-400" />
                                </div>
                                <div>
                                   <p className="text-xs font-bold text-slate-900">{book.titre}</p>
                                   <p className="text-[9px] text-slate-500">{book.code_livre}</p>
                                </div>
                             </div>
                             <button onClick={() => handleToggleBookSelection(book)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                <Trash2 size={16} />
                             </button>
                          </div>
                        ))}
                        {selectedBooksForAction.length === 0 && <p className="text-center py-4 text-xs text-slate-400 italic">Aucun livre sélectionné</p>}
                     </div>
                  </div>

                  <form onSubmit={handleGlobalLoanSubmit} className="space-y-4 pt-4 border-t">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Date de retour prévue</label>
                      <input 
                        type="date" 
                        name="date_retour_prevue" 
                        required 
                        className="w-full px-4 py-2 border rounded-xl font-bold"
                        defaultValue={new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={!selectedAdherentForAction || selectedBooksForAction.length === 0}
                      className="w-full py-4 bg-blue-600 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Valider l'emprunt
                    </button>
                  </form>
                </div>
             </div>
          </motion.div>
        </div>
      )}

      {/* MODAL LECTURE SUR PLACE GLOBAL */}
      {showGlobalConsultationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
             {/* Panneau de gauche: Sélection Lecteur & Livres */}
             <div className="w-full md:w-1/2 border-r p-6 bg-slate-50 overflow-y-auto max-h-[80vh]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900">Lecture sur place</h3>
                  <button onClick={() => setShowGlobalConsultationModal(false)} className="md:hidden p-2"><X /></button>
                </div>

                <div className="space-y-6">
                  {/* Recherche Adhérent/Élève */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Qui lit ? (Optionnel si non adhérent)</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Chercher un adhérent..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border rounded-xl bg-white mt-1">
                      {members.filter(m => m.nom_complet.toLowerCase().includes(memberSearchQuery.toLowerCase()))
                        .slice(0, 10).map(m => (
                        <button 
                          key={m.id}
                          onClick={() => { setSelectedAdherentForAction(m); setMemberSearchQuery(''); }}
                          className={`w-full p-3 text-left hover:bg-emerald-50 border-b flex justify-between items-center ${selectedAdherentForAction?.id === m.id ? 'bg-emerald-50' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-bold">{m.nom_complet}</p>
                            <p className="text-[10px] text-slate-400">{m.numero_adherent}</p>
                          </div>
                          {selectedAdherentForAction?.id === m.id && <CheckCircle2 size={16} className="text-emerald-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recherche Livres */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Livre(s) à consulter</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Chercher un livre..." 
                        className="w-full pl-10 pr-4 py-2 border rounded-xl"
                        value={bookSearchQuery}
                        onChange={(e) => setBookSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto border rounded-xl bg-white mt-1">
                      {books.filter(b => b.quantite_disponible > 0 && (b.titre.toLowerCase().includes(bookSearchQuery.toLowerCase()) || b.code_livre.toLowerCase().includes(bookSearchQuery.toLowerCase())))
                        .slice(0, 20).map(b => (
                        <button 
                          key={b.id}
                          onClick={() => handleToggleBookSelection(b)}
                          className={`w-full p-3 text-left hover:bg-slate-50 border-b flex justify-between items-center ${selectedBooksForAction.find(sb => sb.id === b.id) ? 'bg-blue-50' : ''}`}
                        >
                          <div>
                            <p className="text-sm font-bold">{b.titre}</p>
                            <p className="text-[10px] text-slate-400">{b.code_livre} • Position: {b.armoire_numero}/{b.casier_numero}</p>
                          </div>
                          {selectedBooksForAction.find(sb => sb.id === b.id) ? <CheckCircle2 size={16} className="text-blue-600" /> : <Plus size={16} className="text-slate-300" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
             </div>

             {/* Panneau de droite: Résumé & Validation */}
             <div className="w-full md:w-1/2 p-8 flex flex-col justify-between bg-white overflow-y-auto max-h-[80vh]">
                <div className="hidden md:flex justify-end">
                   <button onClick={() => setShowGlobalConsultationModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                     <p className="text-xs text-emerald-600 font-black uppercase mb-1">Lecteur</p>
                     <p className="font-black text-slate-900">{selectedAdherentForAction?.nom_complet || "Lecteur anonyme / Externe"}</p>
                  </div>

                  <div>
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Livre(s) (L'emplacement est indiqué pour chaque livre)</h4>
                     <div className="space-y-2">
                        {selectedBooksForAction.map(book => (
                          <div key={book.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                             <div>
                                <p className="text-xs font-bold text-slate-900">{book.titre}</p>
                                <p className="text-[9px] text-slate-500 font-medium">Position: {book.armoire_numero || '?'} - {book.casier_numero || '?'}</p>
                             </div>
                             <button onClick={() => handleToggleBookSelection(book)} className="text-rose-400"><Trash2 size={16}/></button>
                          </div>
                        ))}
                     </div>
                  </div>

                  <form onSubmit={handleGlobalConsultationSubmit} className="space-y-4 pt-4 border-t">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Emplacement de lecture (N° Table)</label>
                      <input 
                        type="text" 
                        name="numero_table" 
                        required 
                        placeholder="ex: Table 4"
                        className="w-full px-4 py-2 border rounded-xl font-bold"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={selectedBooksForAction.length === 0}
                      className="w-full py-4 bg-emerald-600 disabled:bg-slate-200 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all"
                    >
                      Démarrer la lecture
                    </button>
                  </form>
                </div>
             </div>
          </motion.div>
        </div>
      )}

      {/* MODAL CONTINUER AVEC AUTRE LIVRE */}
      {showContinueReadingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Nouveau livre pour cette session</h3>
                <button onClick={() => setShowContinueReadingModal(false)} className="p-2"><X /></button>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Chercher le nouveau livre..." 
                    className="w-full pl-10 pr-4 py-3 border rounded-2xl"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {books.filter(b => b.quantite_disponible > 0 && (b.titre.toLowerCase().includes(searchTerm.toLowerCase()) || b.code_livre.toLowerCase().includes(searchTerm.toLowerCase())))
                    .map(b => (
                      <button 
                        key={b.id} 
                        onClick={() => handleContinueReadingSubmit(b.id)}
                        className="w-full p-4 border rounded-2xl hover:bg-amber-50 text-left transition-all"
                      >
                        <p className="text-sm font-bold">{b.titre}</p>
                        <p className="text-[10px] text-slate-500">{b.code_livre}</p>
                      </button>
                    ))
                  }
                </div>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
