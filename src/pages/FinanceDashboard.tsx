import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeftRight, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  DollarSign, 
  Plus, 
  Filter, 
  Search, 
  Download, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Building2, 
  Trash2, 
  Edit, 
  RefreshCw, 
  ChevronRight, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Check,
  X,
  Calculator
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import toast from 'react-hot-toast';
import { apiFetch, notifyAppUpdate } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { getPageAccessMode } from '../utils/permissions';
import ArrieresAnterieursStats from '../components/ArrieresAnterieursStats';
import { PrevisionsRecettesTab } from '../components/finance/PrevisionsRecettesTab';

interface FinanceOverview {
  summary: {
    totalTuition: number;
    totalOtherRevenue: number;
    totalInflows: number;
    totalTeacherSalaries: number;
    totalStaffSalaries: number;
    totalExpenses: number;
    totalOutflows: number;
    netBalance: number;
    salaryCoverageRatio: number;
    totalExpenseCoverageRatio: number;
  };
  monthlyTrends: Array<{
    month: string;
    label: string;
    entrees: number;
    sorties: number;
    soldeNet: number;
    scolarite: number;
    salaires: number;
    depenses: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
  }>;
  revenuesByCategory: Array<{
    category: string;
    amount: number;
  }>;
}

interface JournalEntry {
  id: string;
  source: 'scolarite' | 'autre_recette' | 'salaire_enseignant' | 'salaire_personnel' | 'depense';
  date: string;
  type: 'ENTREE' | 'SORTIE';
  category: string;
  label: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  beneficiaryOrPayer: string;
  cycle: string;
}

interface DepenseItem {
  id: number;
  annee_id: number;
  cycle: string;
  titre: string;
  categorie: string;
  montant: number;
  date_depense: string;
  mode_paiement: string;
  beneficiaire: string;
  reference_facture: string;
  description: string;
  statut: string;
  created_at: string;
}

interface AutreRecetteItem {
  id: number;
  annee_id: number;
  cycle: string;
  titre: string;
  categorie: string;
  montant: number;
  date_recette: string;
  mode_paiement: string;
  source_payeur: string;
  reference: string;
  description: string;
  statut: string;
  created_at: string;
}

interface Props {
  cycleProp?: 'primaire' | 'secondaire' | 'all';
}

const EXPENSE_CATEGORIES = [
  'Maintenance & Travaux',
  'Factures (Eau / Électricité / Internet)',
  'Fournitures & Manuels scolaires',
  'Pédagogie & Examens',
  'Transport & Carburant',
  'Loyer & Charges locatives',
  'Frais bancaires & Assurances',
  'Événements & Cérémonies',
  'Hygiène & Pharmacie',
  'Autre Dépense'
];

const REVENUE_CATEGORIES = [
  'Activités Périscolaires & Clubs',
  'Cantine & Restauration',
  'Transport Scolaire',
  'Uniformes, Badges & Carnets',
  'Dons & Subventions',
  'Frais d\'inscription / Dossier',
  'Location de salles & Espaces',
  'Autre Recette'
];

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e', '#64748b'];

export default function FinanceDashboard({ cycleProp = 'all' }: Props) {
  const { user } = useAuth();
  const accessMode = getPageAccessMode(user?.permissions, '/finances', user?.role);
  const canWrite = accessMode === 'read_write';

  const [activeCycle, setActiveCycle] = useState<'all' | 'primaire' | 'secondaire'>(cycleProp);
  const [activeTab, setActiveTab] = useState<'overview' | 'previsions' | 'journal' | 'depenses' | 'recettes' | 'reconciliation' | 'arrieres'>('overview');
  
  const [overview, setOverview] = useState<FinanceOverview | null>(null);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [depenses, setDepenses] = useState<DepenseItem[]>([]);
  const [recettes, setRecettes] = useState<AutreRecetteItem[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  // Filters for Journal
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'ENTREE' | 'SORTIE'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  // Modals state
  const [showDepenseModal, setShowDepenseModal] = useState(false);
  const [editingDepense, setEditingDepense] = useState<DepenseItem | null>(null);
  const [depenseForm, setDepenseForm] = useState({
    titre: '',
    categorie: 'Maintenance & Travaux',
    montant: '',
    date_depense: new Date().toISOString().split('T')[0],
    mode_paiement: 'Espèces',
    beneficiaire: '',
    reference_facture: '',
    description: '',
    cycle: cycleProp === 'all' ? 'tous' : cycleProp
  });

  const [showRecetteModal, setShowRecetteModal] = useState(false);
  const [editingRecette, setEditingRecette] = useState<AutreRecetteItem | null>(null);
  const [recetteForm, setRecetteForm] = useState({
    titre: '',
    categorie: 'Activités Périscolaires & Clubs',
    montant: '',
    date_recette: new Date().toISOString().split('T')[0],
    mode_paiement: 'Espèces',
    source_payeur: '',
    reference: '',
    description: '',
    cycle: cycleProp === 'all' ? 'tous' : cycleProp
  });

  // Receipt Modal
  const [selectedEntryForReceipt, setSelectedEntryForReceipt] = useState<JournalEntry | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const cycleParam = activeCycle === 'all' ? '' : `?cycle=${activeCycle}`;

      const [overviewRes, journalRes, depensesRes, recettesRes, schoolRes] = await Promise.all([
        apiFetch(`/api/finances/overview${cycleParam}`),
        apiFetch(`/api/finances/journal${cycleParam}`),
        apiFetch(`/api/depenses${cycleParam}`),
        apiFetch(`/api/autres-recettes${cycleParam}`),
        apiFetch('/api/school-info')
      ]);

      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setOverview(data);
      }
      if (journalRes.ok) {
        const data = await journalRes.json();
        setJournal(data);
      }
      if (depensesRes.ok) {
        const data = await depensesRes.json();
        setDepenses(data);
      }
      if (recettesRes.ok) {
        const data = await recettesRes.json();
        setRecettes(data);
      }
      if (schoolRes.ok) {
        const data = await schoolRes.json();
        setSchoolInfo(data);
      }
    } catch (err) {
      console.error('Erreur chargement finances:', err);
      toast.error('Impossible de charger les données financières');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [activeCycle]);

  // Handle Depense Save
  const handleSaveDepense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depenseForm.titre || !depenseForm.montant || Number(depenseForm.montant) <= 0) {
      toast.error('Veuillez renseigner le titre et un montant valide');
      return;
    }

    try {
      const payload = {
        ...depenseForm,
        montant: Number(depenseForm.montant)
      };

      let res;
      if (editingDepense) {
        res = await apiFetch(`/api/depenses/${editingDepense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/depenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingDepense ? 'Dépense modifiée avec succès' : 'Dépense enregistrée');
        setShowDepenseModal(false);
        setEditingDepense(null);
        setDepenseForm({
          titre: '',
          categorie: 'Maintenance & Travaux',
          montant: '',
          date_depense: new Date().toISOString().split('T')[0],
          mode_paiement: 'Espèces',
          beneficiaire: '',
          reference_facture: '',
          description: '',
          cycle: activeCycle === 'all' ? 'tous' : activeCycle
        });
        notifyAppUpdate();
        fetchFinanceData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  // Handle Recette Save
  const handleSaveRecette = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recetteForm.titre || !recetteForm.montant || Number(recetteForm.montant) <= 0) {
      toast.error('Veuillez renseigner le libellé et un montant valide');
      return;
    }

    try {
      const payload = {
        ...recetteForm,
        montant: Number(recetteForm.montant)
      };

      let res;
      if (editingRecette) {
        res = await apiFetch(`/api/autres-recettes/${editingRecette.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await apiFetch('/api/autres-recettes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingRecette ? 'Recette modifiée avec succès' : 'Recette enregistrée');
        setShowRecetteModal(false);
        setEditingRecette(null);
        setRecetteForm({
          titre: '',
          categorie: 'Activités Périscolaires & Clubs',
          montant: '',
          date_recette: new Date().toISOString().split('T')[0],
          mode_paiement: 'Espèces',
          source_payeur: '',
          reference: '',
          description: '',
          cycle: activeCycle === 'all' ? 'tous' : activeCycle
        });
        notifyAppUpdate();
        fetchFinanceData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  // Delete Expense
  const handleDeleteDepense = async (id: number) => {
    if (!confirm('Confirmez-vous la suppression de cette dépense ?')) return;
    try {
      const res = await apiFetch(`/api/depenses/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Dépense supprimée');
        notifyAppUpdate();
        fetchFinanceData();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  // Delete Other Revenue
  const handleDeleteRecette = async (id: number) => {
    if (!confirm('Confirmez-vous la suppression de cette recette ?')) return;
    try {
      const res = await apiFetch(`/api/autres-recettes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Recette supprimée');
        notifyAppUpdate();
        fetchFinanceData();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  // Seed sample data for preview if empty
  const handleSeedSample = async () => {
    if (!confirm('Voulez-vous injecter des exemples de dépenses et recettes pour tester le rapprochement financier ?')) return;
    try {
      const res = await apiFetch('/api/finances/seed-sample', { method: 'POST' });
      if (res.ok) {
        toast.success('Données de démonstration ajoutées avec succès');
        notifyAppUpdate();
        fetchFinanceData();
      } else {
        toast.error('Erreur lors de l\'injection');
      }
    } catch {
      toast.error('Erreur réseau');
    }
  };

  // Filtered Journal
  const filteredJournal = useMemo(() => {
    return journal.filter(entry => {
      const matchesSearch = 
        entry.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.beneficiaryOrPayer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || entry.type === typeFilter;
      const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [journal, searchTerm, typeFilter, categoryFilter]);

  // Printable Financial Statement
  const handlePrintFullReport = () => {
    window.print();
  };

  const summary = overview?.summary || {
    totalTuition: 0,
    totalOtherRevenue: 0,
    totalInflows: 0,
    totalTeacherSalaries: 0,
    totalStaffSalaries: 0,
    totalExpenses: 0,
    totalOutflows: 0,
    netBalance: 0,
    salaryCoverageRatio: 0,
    totalExpenseCoverageRatio: 0
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Printable Report View (Visible only during printing) */}
      <div className="hidden print:block p-8 bg-white text-slate-900">
        <div className="border-b-2 border-slate-800 pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-tight">{schoolInfo?.nom || 'Établissement Scolaire'}</h1>
            <p className="text-sm text-slate-600">{schoolInfo?.adresse || 'Direction Générale'} - Tél: {schoolInfo?.telephone || '-'}</p>
            <p className="text-sm font-semibold text-emerald-800 mt-1">ÉTAT RÉCAPITULATIF DE TRÉSORERIE & RAPPROCHEMENT FINANCIER</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-bold">Date d'édition: {new Date().toLocaleDateString('fr-FR')}</p>
            <p>Cycle concerné: {activeCycle === 'all' ? 'Ensemble de l\'établissement' : activeCycle.toUpperCase()}</p>
          </div>
        </div>

        {/* Print Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-slate-300 p-4 rounded bg-slate-50">
            <p className="text-xs uppercase font-bold text-slate-600">Total des Entrées (Recettes)</p>
            <p className="text-xl font-bold text-emerald-700">{summary.totalInflows.toLocaleString()} FCFA</p>
            <p className="text-[11px] text-slate-500 mt-1">Scolarités: {summary.totalTuition.toLocaleString()} | Autres: {summary.totalOtherRevenue.toLocaleString()}</p>
          </div>
          <div className="border border-slate-300 p-4 rounded bg-slate-50">
            <p className="text-xs uppercase font-bold text-slate-600">Total des Sorties (Charges)</p>
            <p className="text-xl font-bold text-rose-700">{summary.totalOutflows.toLocaleString()} FCFA</p>
            <p className="text-[11px] text-slate-500 mt-1">Masse salariale: {(summary.totalTeacherSalaries + summary.totalStaffSalaries).toLocaleString()} | Dépenses: {summary.totalExpenses.toLocaleString()}</p>
          </div>
          <div className="border border-slate-300 p-4 rounded bg-slate-50">
            <p className="text-xs uppercase font-bold text-slate-600">Solde Net Disponible</p>
            <p className={`text-xl font-bold ${summary.netBalance >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {summary.netBalance.toLocaleString()} FCFA
            </p>
            <p className="text-[11px] text-slate-500 mt-1">Taux de couverture: {summary.totalExpenseCoverageRatio}%</p>
          </div>
        </div>

        {/* Print Ledger */}
        <h2 className="text-sm font-bold uppercase mb-2 border-b pb-1">Extrait du Grand Livre Financier (Dernières opérations)</h2>
        <table className="w-full text-xs text-left border-collapse border border-slate-300 mb-8">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300">
              <th className="p-2 border">Date</th>
              <th className="p-2 border">Réf.</th>
              <th className="p-2 border">Type</th>
              <th className="p-2 border">Désignation</th>
              <th className="p-2 border">Tiers</th>
              <th className="p-2 border text-right">Entrée (FCFA)</th>
              <th className="p-2 border text-right">Sortie (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            {filteredJournal.slice(0, 40).map((item, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="p-1.5 border">{item.date}</td>
                <td className="p-1.5 border font-mono text-[10px]">{item.reference}</td>
                <td className="p-1.5 border">{item.type}</td>
                <td className="p-1.5 border font-medium">{item.label}</td>
                <td className="p-1.5 border">{item.beneficiaryOrPayer}</td>
                <td className="p-1.5 border text-right font-semibold text-emerald-700">
                  {item.type === 'ENTREE' ? item.amount.toLocaleString() : '-'}
                </td>
                <td className="p-1.5 border text-right font-semibold text-rose-700">
                  {item.type === 'SORTIE' ? item.amount.toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-slate-300">
          <div className="text-center">
            <p className="font-bold text-xs uppercase mb-16">Le Service de Comptabilité</p>
            <p className="text-xs text-slate-500">Cachet & Signature</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-xs uppercase mb-16">Le Fondé / La Direction Générale</p>
            <p className="text-xs text-slate-500">Cachet & Signature</p>
          </div>
        </div>
      </div>

      {/* Screen View (Interactive App) */}
      <div className="print:hidden space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <ArrowLeftRight className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                  Gestion Financière & Trésorerie
                </h1>
                <p className="text-xs md:text-sm text-slate-500">
                  Rapprochement centralisé des encaissements scolarité, salaires et charges de fonctionnement
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Cycle Switcher */}
            <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200">
              <button
                onClick={() => setActiveCycle('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCycle === 'all'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Général
              </button>
              <button
                onClick={() => setActiveCycle('primaire')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCycle === 'primaire'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Primaire
              </button>
              <button
                onClick={() => setActiveCycle('secondaire')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCycle === 'secondaire'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Secondaire
              </button>
            </div>

            <button
              onClick={handlePrintFullReport}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition-colors"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Imprimer État
            </button>

            {canWrite && (
              <>
                <button
                  onClick={() => {
                    setEditingRecette(null);
                    setShowRecetteModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Autre Recette
                </button>
                <button
                  onClick={() => {
                    setEditingDepense(null);
                    setShowDepenseModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Nouvelle Dépense
                </button>
              </>
            )}
          </div>
        </div>

        {/* Executive Overview KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Inflows */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Entrées</span>
              <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                {summary.totalInflows.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">FCFA</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span>Scolarités encaissées:</span>
                  <span className="font-semibold text-emerald-700">{summary.totalTuition.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Autres produits:</span>
                  <span className="font-semibold text-slate-700">{summary.totalOtherRevenue.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Total Outflows */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sorties</span>
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <ArrowDownRight className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                {summary.totalOutflows.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">FCFA</span>
              </div>
              <div className="mt-2 text-xs text-slate-500 flex flex-col gap-0.5">
                <div className="flex justify-between">
                  <span>Salaires enseignants:</span>
                  <span className="font-semibold text-rose-700">{summary.totalTeacherSalaries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Salaires admin:</span>
                  <span className="font-semibold text-slate-700">{summary.totalStaffSalaries.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Dépenses courantes:</span>
                  <span className="font-semibold text-slate-700">{summary.totalExpenses.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Cash Flow */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solde Net Disponible</span>
              <span className={`p-2 rounded-xl ${summary.netBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                <Wallet className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {summary.netBalance >= 0 ? '+' : ''}{summary.netBalance.toLocaleString()}{' '}
                <span className="text-xs font-normal text-slate-500">FCFA</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                {summary.netBalance >= 0 ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Trésorerie saine (Excédent)
                  </span>
                ) : (
                  <span className="text-rose-700 font-medium flex items-center gap-0.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Tension de trésorerie (Déficit)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Salary Coverage Ratio */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Couverture Dépenses</span>
              <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <BarChart3 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                {summary.totalExpenseCoverageRatio}{' '}
                <span className="text-xs font-normal text-slate-500">%</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full ${summary.totalExpenseCoverageRatio >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, summary.totalExpenseCoverageRatio))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                  <span>Couverture masse salariale:</span>
                  <span className="font-semibold text-slate-700">{summary.salaryCoverageRatio}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'overview', label: 'Vue Analytique & Graphiques', icon: BarChart3 },
              { id: 'previsions', label: 'Aperçu Recettes & Tranches par Classe', icon: Calculator },
              { id: 'journal', label: 'Grand Livre des Flux (Journal)', icon: Receipt, count: journal.length },
              { id: 'depenses', label: 'Dépenses & Charges', icon: TrendingDown, count: depenses.length },
              { id: 'recettes', label: 'Autres Recettes', icon: TrendingUp, count: recettes.length },
              { id: 'reconciliation', label: 'Équilibre Scolarité vs Charges', icon: ArrowLeftRight },
              { id: 'arrieres', label: 'Arriérés Années Antérieures', icon: AlertTriangle }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3 px-1 border-b-2 font-medium text-xs md:text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? 'border-emerald-600 text-emerald-700 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* TAB PREVISIONS: APERÇU RECETTES PAR TRANCHE & CLASSE */}
        {activeTab === 'previsions' && (
          <PrevisionsRecettesTab initialCycle={activeCycle} schoolCurrency="FCFA" />
        )}

        {/* TAB 1: OVERVIEW & CHARTS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Trend Chart */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Évolution Mensuelle des Flux</h2>
                    <p className="text-xs text-slate-500">Comparatif des entrées réelles face aux engagements de dépenses</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Entrées
                    </span>
                    <span className="inline-flex items-center gap-1 text-rose-700 font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Sorties
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  {overview?.monthlyTrends && overview.monthlyTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={overview.monthlyTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toLocaleString()} FCFA`]}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <Bar dataKey="entrees" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="sorties" name="Sorties" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      Aucune donnée mensuelle enregistrée
                    </div>
                  )}
                </div>
              </div>

              {/* Expense Breakdown Donut */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Répartition des Sorties</h2>
                  <p className="text-xs text-slate-500">Ventilation des salaires et postes de dépenses</p>
                </div>

                <div className="h-56 my-2">
                  {overview?.expensesByCategory && overview.expensesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { category: 'Salaires Enseignants', amount: summary.totalTeacherSalaries },
                            { category: 'Personnel Admin.', amount: summary.totalStaffSalaries },
                            ...overview.expensesByCategory
                          ].filter(i => i.amount > 0)}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                        >
                          {[
                            { category: 'Salaires Enseignants' },
                            { category: 'Personnel Admin.' },
                            ...overview.expensesByCategory
                          ].map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [`${Number(value).toLocaleString()} FCFA`]}
                          contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                      Aucune dépense enregistrée
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[0] }}></span>
                      Salaires Professeurs:
                    </span>
                    <span className="font-semibold">{summary.totalTeacherSalaries.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[1] }}></span>
                      Personnel Administratif:
                    </span>
                    <span className="font-semibold">{summary.totalStaffSalaries.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[2] }}></span>
                      Dépenses d'Exploitation:
                    </span>
                    <span className="font-semibold">{summary.totalExpenses.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Balance Health Assessment & Demo Seed */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Diagnostic de Trésorerie
                  </span>
                  <span className="text-xs text-slate-400">Année scolaire en cours</span>
                </div>
                <h3 className="text-lg font-bold">
                  {summary.netBalance >= 0 ? (
                    'Excédent de trésorerie disponible'
                  ) : (
                    'Déficit opérationnel : Vigilance sur le recouvrement'
                  )}
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl">
                  {summary.totalTuition > 0 ? (
                    `Les encaissements de scolarité (${summary.totalTuition.toLocaleString()} FCFA) et les recettes annexes couvrent à hauteur de ${summary.totalExpenseCoverageRatio}% l'ensemble des engagements de l'établissement.`
                  ) : (
                    'Aucun encaissement scolarité enregistré pour le moment. Vous pouvez enregistrer des paiements d\'élèves ou des dépenses de fonctionnement.'
                  )}
                </p>
              </div>

              {canWrite && journal.length === 0 && (
                <button
                  onClick={handleSeedSample}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-all shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  Générer données d'essai
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: JOURNAL DES FLUX */}
        {activeTab === 'journal' && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher par libellé, référence, payeur ou bénéficiaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
                >
                  <option value="all">Tous les flux (Entrées & Sorties)</option>
                  <option value="ENTREE">Entrées uniquement</option>
                  <option value="SORTIE">Sorties uniquement</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
                >
                  <option value="all">Toutes catégories</option>
                  <option value="Scolarité">Scolarités</option>
                  <option value="Salaires Enseignants">Salaires Enseignants</option>
                  <option value="Salaires Personnel">Salaires Personnel</option>
                  <option value="Dépense">Dépenses de Fonctionnement</option>
                  <option value="Autre Recette">Autres Recettes</option>
                </select>

                <button
                  onClick={() => {
                    setSearchTerm('');
                    setTypeFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Réinitialiser filtres"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Journal Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Référence</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4">Tiers / Bénéficiaire</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredJournal.length > 0 ? (
                      filteredJournal.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{entry.date}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                            {entry.reference || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              entry.type === 'ENTREE' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {entry.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                            {entry.label}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                            {entry.beneficiaryOrPayer || '-'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {entry.paymentMethod}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap font-bold">
                            {entry.type === 'ENTREE' ? (
                              <span className="text-emerald-600">+{entry.amount.toLocaleString()}</span>
                            ) : (
                              <span className="text-rose-600">-{entry.amount.toLocaleString()}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedEntryForReceipt(entry)}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Voir reçu / justificatif"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 text-xs md:text-sm">
                          Aucun flux financier correspondant aux critères
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: GESTION DES DÉPENSES */}
        {activeTab === 'depenses' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Dépenses d'Exploitation & Charges</h3>
                <p className="text-xs text-slate-500">Factures, achats pédagogiques, maintenance et prestations</p>
              </div>

              {canWrite && (
                <button
                  onClick={() => {
                    setEditingDepense(null);
                    setDepenseForm({
                      titre: '',
                      categorie: 'Maintenance & Travaux',
                      montant: '',
                      date_depense: new Date().toISOString().split('T')[0],
                      mode_paiement: 'Espèces',
                      beneficiaire: '',
                      reference_facture: '',
                      description: '',
                      cycle: activeCycle === 'all' ? 'tous' : activeCycle
                    });
                    setShowDepenseModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une dépense
                </button>
              )}
            </div>

            {/* Depenses Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Désignation</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Bénéficiaire / Fournisseur</th>
                      <th className="py-3 px-4">Réf. Facture</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                      {canWrite && <th className="py-3 px-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {depenses.length > 0 ? (
                      depenses.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{item.date_depense}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <div>{item.titre}</div>
                            {item.description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.description}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                              {item.categorie}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.beneficiaire || '-'}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{item.reference_facture || '-'}</td>
                          <td className="py-3 px-4 text-slate-500">{item.mode_paiement}</td>
                          <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                            {Number(item.montant).toLocaleString()}
                          </td>
                          {canWrite && (
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingDepense(item);
                                    setDepenseForm({
                                      titre: item.titre,
                                      categorie: item.categorie,
                                      montant: String(item.montant),
                                      date_depense: item.date_depense,
                                      mode_paiement: item.mode_paiement,
                                      beneficiaire: item.beneficiaire || '',
                                      reference_facture: item.reference_facture || '',
                                      description: item.description || '',
                                      cycle: item.cycle || 'tous'
                                    });
                                    setShowDepenseModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDepense(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-slate-400 text-xs md:text-sm">
                          Aucune dépense enregistrée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: AUTRES RECETTES */}
        {activeTab === 'recettes' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="font-bold text-slate-900 text-sm md:text-base">Autres Recettes & Produits</h3>
                <p className="text-xs text-slate-500">Activités périscolaires, cantine, uniformes, dons et subventions</p>
              </div>

              {canWrite && (
                <button
                  onClick={() => {
                    setEditingRecette(null);
                    setRecetteForm({
                      titre: '',
                      categorie: 'Activités Périscolaires & Clubs',
                      montant: '',
                      date_recette: new Date().toISOString().split('T')[0],
                      mode_paiement: 'Espèces',
                      source_payeur: '',
                      reference: '',
                      description: '',
                      cycle: activeCycle === 'all' ? 'tous' : activeCycle
                    });
                    setShowRecetteModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une recette
                </button>
              )}
            </div>

            {/* Recettes Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Libellé</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4">Source / Payeur</th>
                      <th className="py-3 px-4">Réf.</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4 text-right">Montant (FCFA)</th>
                      {canWrite && <th className="py-3 px-4 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recettes.length > 0 ? (
                      recettes.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{item.date_recette}</td>
                          <td className="py-3 px-4 font-medium text-slate-900">
                            <div>{item.titre}</div>
                            {item.description && <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.description}</div>}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {item.categorie}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">{item.source_payeur || '-'}</td>
                          <td className="py-3 px-4 font-mono text-xs text-slate-500">{item.reference || '-'}</td>
                          <td className="py-3 px-4 text-slate-500">{item.mode_paiement}</td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                            +{Number(item.montant).toLocaleString()}
                          </td>
                          {canWrite && (
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => {
                                    setEditingRecette(item);
                                    setRecetteForm({
                                      titre: item.titre,
                                      categorie: item.categorie,
                                      montant: String(item.montant),
                                      date_recette: item.date_recette,
                                      mode_paiement: item.mode_paiement,
                                      source_payeur: item.source_payeur || '',
                                      reference: item.reference || '',
                                      description: item.description || '',
                                      cycle: item.cycle || 'tous'
                                    });
                                    setShowRecetteModal(true);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                  title="Modifier"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRecette(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Supprimer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={canWrite ? 8 : 7} className="py-12 text-center text-slate-400 text-xs md:text-sm">
                          Aucune autre recette enregistrée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: RAPPROCHEMENT SALAIRES VS SCOLARITÉ */}
        {activeTab === 'reconciliation' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Matrice de Rapprochement Mensuel : Écolages vs Engagements
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                Analyse mensuelle de viabilité financière comparant les rentrées de scolarité à la masse salariale et aux dépenses courantes
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs md:text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[11px]">
                      <th className="py-3 px-4">Période</th>
                      <th className="py-3 px-4 text-right">Scolarités Encaissées</th>
                      <th className="py-3 px-4 text-right">Salaires Enseignants & Admin</th>
                      <th className="py-3 px-4 text-right">Charges & Dépenses</th>
                      <th className="py-3 px-4 text-right">Total Sorties</th>
                      <th className="py-3 px-4 text-right">Marge Nette (Solde)</th>
                      <th className="py-3 px-4 text-center">Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {overview?.monthlyTrends && overview.monthlyTrends.length > 0 ? (
                      overview.monthlyTrends.map((row) => {
                        const isPositive = row.soldeNet >= 0;
                        return (
                          <tr key={row.month} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{row.label}</td>
                            <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                              {row.scolarite.toLocaleString()} FCFA
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700">
                              {row.salaires.toLocaleString()} FCFA
                            </td>
                            <td className="py-3 px-4 text-right text-slate-700">
                              {row.depenses.toLocaleString()} FCFA
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-rose-600">
                              {row.sorties.toLocaleString()} FCFA
                            </td>
                            <td className={`py-3 px-4 text-right font-bold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isPositive ? '+' : ''}{row.soldeNet.toLocaleString()} FCFA
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isPositive 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isPositive ? 'Excédentaire' : 'Tension / Déficit'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Aucune donnée historique à rapprocher
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {overview?.monthlyTrends && overview.monthlyTrends.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100/80 font-bold text-slate-900 border-t-2 border-slate-300">
                        <td className="py-3.5 px-4">TOTAL EXERCICE</td>
                        <td className="py-3.5 px-4 text-right text-emerald-700">
                          {summary.totalTuition.toLocaleString()} FCFA
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {(summary.totalTeacherSalaries + summary.totalStaffSalaries).toLocaleString()} FCFA
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {summary.totalExpenses.toLocaleString()} FCFA
                        </td>
                        <td className="py-3.5 px-4 text-right text-rose-700">
                          {summary.totalOutflows.toLocaleString()} FCFA
                        </td>
                        <td className={`py-3.5 px-4 text-right ${summary.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {summary.netBalance >= 0 ? '+' : ''}{summary.netBalance.toLocaleString()} FCFA
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            summary.netBalance >= 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                          }`}>
                            {summary.totalExpenseCoverageRatio}% Couverture
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ONGLET 6: ARRIÉRÉS ANNÉES ANTÉRIEURES */}
        {activeTab === 'arrieres' && (
          <div className="space-y-6">
            <ArrieresAnterieursStats cycle={activeCycle} />
          </div>
        )}
      </div>

      {/* MODAL: AJOUTER / MODIFIER DÉPENSE */}
      {showDepenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <TrendingDown className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingDepense ? 'Modifier la dépense' : 'Enregistrer une nouvelle dépense'}
                </h3>
              </div>
              <button
                onClick={() => setShowDepenseModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé / Motif de la dépense *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Réparation toiture bâtiment B, Facture électricité..."
                  value={depenseForm.titre}
                  onChange={(e) => setDepenseForm({ ...depenseForm, titre: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Montant (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 50000"
                    value={depenseForm.montant}
                    onChange={(e) => setDepenseForm({ ...depenseForm, montant: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date de paiement *
                  </label>
                  <input
                    type="date"
                    required
                    value={depenseForm.date_depense}
                    onChange={(e) => setDepenseForm({ ...depenseForm, date_depense: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={depenseForm.categorie}
                    onChange={(e) => setDepenseForm({ ...depenseForm, categorie: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {EXPENSE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode de règlement
                  </label>
                  <select
                    value={depenseForm.mode_paiement}
                    onChange={(e) => setDepenseForm({ ...depenseForm, mode_paiement: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Mobile Money (Moov / MTN / Orange)">Mobile Money</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bénéficiaire / Fournisseur
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Société CIE / SODECI, Artisan..."
                    value={depenseForm.beneficiaire}
                    onChange={(e) => setDepenseForm({ ...depenseForm, beneficiaire: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Facture / Pièce justificative
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: FACT-2025-098"
                    value={depenseForm.reference_facture}
                    onChange={(e) => setDepenseForm({ ...depenseForm, reference_facture: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observations / Description complémentaire
                </label>
                <textarea
                  rows={2}
                  placeholder="Détails sur l'opération ou la validation..."
                  value={depenseForm.description}
                  onChange={(e) => setDepenseForm({ ...depenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowDepenseModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
                >
                  {editingDepense ? 'Enregistrer les modifications' : 'Valider la dépense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJOUTER / MODIFIER AUTRE RECETTE */}
      {showRecetteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <TrendingUp className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  {editingRecette ? 'Modifier la recette' : 'Enregistrer une autre entrée / recette'}
                </h3>
              </div>
              <button
                onClick={() => setShowRecetteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecette} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Libellé de la recette *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Inscriptions Club de Musique, Forfait Cantine..."
                  value={recetteForm.titre}
                  onChange={(e) => setRecetteForm({ ...recetteForm, titre: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Montant encaissé (FCFA) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Ex: 25000"
                    value={recetteForm.montant}
                    onChange={(e) => setRecetteForm({ ...recetteForm, montant: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date d'encaissement *
                  </label>
                  <input
                    type="date"
                    required
                    value={recetteForm.date_recette}
                    onChange={(e) => setRecetteForm({ ...recetteForm, date_recette: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Catégorie
                  </label>
                  <select
                    value={recetteForm.categorie}
                    onChange={(e) => setRecetteForm({ ...recetteForm, categorie: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {REVENUE_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mode de paiement
                  </label>
                  <select
                    value={recetteForm.mode_paiement}
                    onChange={(e) => setRecetteForm({ ...recetteForm, mode_paiement: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Espèces">Espèces</option>
                    <option value="Virement bancaire">Virement bancaire</option>
                    <option value="Chèque">Chèque</option>
                    <option value="Mobile Money (Moov / MTN / Orange)">Mobile Money</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source / Payeur (Organisme ou Parent)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Association des Parents, Donateur..."
                    value={recetteForm.source_payeur}
                    onChange={(e) => setRecetteForm({ ...recetteForm, source_payeur: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Référence de reçu
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: REC-2025-012"
                    value={recetteForm.reference}
                    onChange={(e) => setRecetteForm({ ...recetteForm, reference: e.target.value })}
                    className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarques
                </label>
                <textarea
                  rows={2}
                  placeholder="Commentaire sur cette rentrée de fonds..."
                  value={recetteForm.description}
                  onChange={(e) => setRecetteForm({ ...recetteForm, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs md:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowRecetteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                >
                  {editingRecette ? 'Enregistrer les modifications' : 'Valider la recette'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REÇU / PIÈCE DE CAISSE DÉTAILLÉE */}
      {selectedEntryForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Pièce Justificative de Trésorerie</h3>
              </div>
              <button
                onClick={() => setSelectedEntryForReceipt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Nature du flux:</span>
                <span className={`font-bold ${selectedEntryForReceipt.type === 'ENTREE' ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {selectedEntryForReceipt.type === 'ENTREE' ? 'RECETTE / ENCAISSEMENT' : 'DÉCAISSEMENT / CHARGE'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Catégorie:</span>
                <span className="font-semibold text-slate-800">{selectedEntryForReceipt.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Désignation:</span>
                <span className="font-semibold text-slate-800 text-right">{selectedEntryForReceipt.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tiers concerné:</span>
                <span className="font-semibold text-slate-800">{selectedEntryForReceipt.beneficiaryOrPayer || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date de valeur:</span>
                <span className="font-semibold text-slate-800">{selectedEntryForReceipt.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Référence:</span>
                <span className="font-mono text-slate-800">{selectedEntryForReceipt.reference || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode de paiement:</span>
                <span className="font-semibold text-slate-800">{selectedEntryForReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-sm font-bold">
                <span>Montant:</span>
                <span className={selectedEntryForReceipt.type === 'ENTREE' ? 'text-emerald-700' : 'text-rose-700'}>
                  {selectedEntryForReceipt.amount.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
              <button
                onClick={() => setSelectedEntryForReceipt(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
