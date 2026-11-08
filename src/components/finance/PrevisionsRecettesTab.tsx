import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calculator, 
  Building2, 
  Users, 
  Coins, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Download, 
  Printer, 
  Edit, 
  RefreshCw, 
  Sparkles,
  ChevronRight,
  Sliders,
  DollarSign,
  Layers,
  Save,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/api';
import { useTranslation } from '../../contexts/TranslationContext';

export type PrevisionCycleFilter = 'all' | 'maternelle' | 'primaire' | 'maternelle_primaire' | 'secondaire';

interface ClassPrevision {
  id: number;
  nom: string;
  niveau: string;
  cycle: 'maternelle' | 'primaire' | 'secondaire';
  devise: string;
  nombre_eleves: number;
  frais_inscription: number;
  tranche1_montant: number;
  tranche1_date_limite?: string;
  tranche2_montant: number;
  tranche2_date_limite?: string;
  tranche3_montant: number;
  tranche3_date_limite?: string;
  frais_scolarite: number;
  frais_annexes: number;
  total_inscription_prevu: number;
  total_tranche1_prevu: number;
  total_tranche2_prevu: number;
  total_tranche3_prevu: number;
  total_scolarite_prevu: number;
  total_annexes_prevu: number;
  total_annuel_prevu: number;
  total_encaisse: number;
  tranche1_encaissee?: number;
  tranche2_encaissee?: number;
  tranche3_encaissee?: number;
  inscription_encaissee?: number;
  autres_encaisse?: number;
  reste_a_recouvrer: number;
  taux_recouvrement: number;
}

interface SyntheseItem {
  effectif: number;
  total_inscription_prevu: number;
  total_tranche1_prevu: number;
  total_tranche2_prevu: number;
  total_tranche3_prevu: number;
  total_scolarite_prevu: number;
  total_annexes_prevu: number;
  total_annuel_prevu: number;
  total_encaisse: number;
  reste_a_recouvrer: number;
  taux_recouvrement: number;
}

interface PrevisionsData {
  yearId: number;
  classes: ClassPrevision[];
  synthese: {
    maternelle: SyntheseItem;
    primaire: SyntheseItem;
    maternelle_primaire: SyntheseItem;
    secondaire: SyntheseItem;
    ensemble: SyntheseItem;
  };
}

interface PrevisionsRecettesTabProps {
  initialCycle?: 'all' | 'primaire' | 'secondaire';
  schoolCurrency?: string;
}

export const PrevisionsRecettesTab: React.FC<PrevisionsRecettesTabProps> = ({
  initialCycle = 'all',
  schoolCurrency = 'FCFA'
}) => {
  const { t } = useTranslation();
  const [data, setData] = useState<PrevisionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cycleFilter, setCycleFilter] = useState<PrevisionCycleFilter>(
    initialCycle === 'primaire' ? 'primaire' : initialCycle === 'secondaire' ? 'secondaire' : 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [simulatedGrowth, setSimulatedGrowth] = useState<number>(0); // e.g. -10, 0, +10, +20 percent

  // Editing class fees modal state
  const [editingClass, setEditingClass] = useState<ClassPrevision | null>(null);
  const [editForm, setEditForm] = useState({
    frais_inscription: 0,
    tranche1_montant: 0,
    tranche1_date_limite: '',
    tranche2_montant: 0,
    tranche2_date_limite: '',
    tranche3_montant: 0,
    tranche3_date_limite: '',
    frais_annexes: 0,
    frais_scolarite: 0,
    cycle: 'primaire'
  });
  const [isSavingFee, setIsSavingFee] = useState(false);

  const fetchPrevisions = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/finances/previsions-recettes');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json);
      } else {
        toast.error("Impossible de charger l'aperçu prévisionnel des recettes.");
      }
    } catch (err: any) {
      console.error("Error fetching previsions:", err);
      toast.error("Erreur lors de la récupération des prévisions financières.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrevisions();
  }, []);

  const handleOpenEdit = (cls: ClassPrevision) => {
    setEditingClass(cls);
    setEditForm({
      frais_inscription: cls.frais_inscription || 0,
      tranche1_montant: cls.tranche1_montant || 0,
      tranche1_date_limite: cls.tranche1_date_limite || '',
      tranche2_montant: cls.tranche2_montant || 0,
      tranche2_date_limite: cls.tranche2_date_limite || '',
      tranche3_montant: cls.tranche3_montant || 0,
      tranche3_date_limite: cls.tranche3_date_limite || '',
      frais_annexes: cls.frais_annexes || 0,
      frais_scolarite: cls.frais_scolarite || 0,
      cycle: cls.cycle
    });
  };

  const handleSaveClassFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;

    setIsSavingFee(true);
    try {
      const calculatedScolarite = Number(editForm.tranche1_montant) + Number(editForm.tranche2_montant) + Number(editForm.tranche3_montant);

      const res = await apiFetch(`/api/finances/classes/${editingClass.id}/frais`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          frais_scolarite: calculatedScolarite > 0 ? calculatedScolarite : editForm.frais_scolarite
        })
      });
      const resJson = await res.json();

      if (!res.ok || !resJson.success) {
        throw new Error(resJson.error || "Erreur lors de l'enregistrement.");
      }

      toast.success(`Tarifs et tranches mis à jour pour ${editingClass.nom} !`);
      setEditingClass(null);
      fetchPrevisions();
    } catch (err: any) {
      toast.error(err.message || "Échec de la mise à jour des frais.");
    } finally {
      setIsSavingFee(false);
    }
  };

  // Filter classes according to selected cycle and search query
  const filteredClasses = useMemo(() => {
    if (!data?.classes) return [];
    return data.classes.filter(cls => {
      // Cycle filter
      let matchCycle = true;
      if (cycleFilter === 'maternelle') matchCycle = cls.cycle === 'maternelle';
      else if (cycleFilter === 'primaire') matchCycle = cls.cycle === 'primaire';
      else if (cycleFilter === 'maternelle_primaire') matchCycle = cls.cycle === 'maternelle' || cls.cycle === 'primaire';
      else if (cycleFilter === 'secondaire') matchCycle = cls.cycle === 'secondaire';

      // Search query
      const matchSearch = searchQuery.trim() === '' || 
        cls.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cls.niveau.toLowerCase().includes(searchQuery.toLowerCase());

      return matchCycle && matchSearch;
    });
  }, [data, cycleFilter, searchQuery]);

  // Compute live simulated metrics based on growth multiplier
  const growthMultiplier = 1 + (simulatedGrowth / 100);

  const activeSynthese = useMemo(() => {
    if (!data?.synthese) return null;

    let base: SyntheseItem;
    if (cycleFilter === 'maternelle') base = data.synthese.maternelle;
    else if (cycleFilter === 'primaire') base = data.synthese.primaire;
    else if (cycleFilter === 'maternelle_primaire') base = data.synthese.maternelle_primaire;
    else if (cycleFilter === 'secondaire') base = data.synthese.secondaire;
    else base = data.synthese.ensemble;

    // Apply simulation growth if non-zero
    if (simulatedGrowth !== 0) {
      const simulatedEffectif = Math.round(base.effectif * growthMultiplier);
      const simulatedInscription = Math.round(base.total_inscription_prevu * growthMultiplier);
      const simulatedT1 = Math.round(base.total_tranche1_prevu * growthMultiplier);
      const simulatedT2 = Math.round(base.total_tranche2_prevu * growthMultiplier);
      const simulatedT3 = Math.round(base.total_tranche3_prevu * growthMultiplier);
      const simulatedScolarite = Math.round(base.total_scolarite_prevu * growthMultiplier);
      const simulatedAnnexes = Math.round(base.total_annexes_prevu * growthMultiplier);
      const simulatedAnnuel = simulatedInscription + simulatedScolarite + simulatedAnnexes;
      const reste = Math.max(0, simulatedAnnuel - base.total_encaisse);
      const taux = simulatedAnnuel > 0 ? Math.min(100, Math.round((base.total_encaisse / simulatedAnnuel) * 100)) : 0;

      return {
        ...base,
        effectif: simulatedEffectif,
        total_inscription_prevu: simulatedInscription,
        total_tranche1_prevu: simulatedT1,
        total_tranche2_prevu: simulatedT2,
        total_tranche3_prevu: simulatedT3,
        total_scolarite_prevu: simulatedScolarite,
        total_annexes_prevu: simulatedAnnexes,
        total_annuel_prevu: simulatedAnnuel,
        reste_a_recouvrer: reste,
        taux_recouvrement: taux
      };
    }

    return base;
  }, [data, cycleFilter, simulatedGrowth, growthMultiplier]);

  const printPrevision = () => {
    window.print();
  };

  const formatMoney = (val: number) => {
    return Number(val || 0).toLocaleString('fr-FR');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-3xl border border-slate-200">
        <RefreshCw size={32} className="animate-spin text-emerald-600" />
        <span className="text-xs font-bold text-slate-500">Calcul du prévisionnel des recettes par tranche...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Cycle Controls */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold backdrop-blur-md text-emerald-300 border border-white/10">
              <Calculator size={13} className="text-amber-400" />
              <span>{t("Budget Prévisionnel & Encaissements par Tranche")}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {t("Aperçu des Recettes Scolaires par Classe")}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t("Estimez le potentiel financier global et le calendrier prévisionnel des rentrées par tranche (Tranche 1, Tranche 2, Tranche 3), frais d'inscription et annexes, en fonction du nombre réel d'élèves inscrits.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto shrink-0">
            <button
              type="button"
              onClick={printPrevision}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-2 border border-white/15"
            >
              <Printer size={15} />
              <span>{t("Imprimer l'Aperçu")}</span>
            </button>
            <button
              type="button"
              onClick={fetchPrevisions}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-2"
            >
              <RefreshCw size={15} />
              <span>{t("Actualiser les chiffres")}</span>
            </button>
          </div>
        </div>

        {/* Cycle Filter Pills (Maternelle, Primaire, Maternelle & Primaire, Secondaire, Ensemble) */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1.5">
            <Filter size={13} />
            <span>Périmètre :</span>
          </span>

          {[
            { id: 'all' as const, icon: '🌐', label: t('Ensemble de l\'Établissement') },
            { id: 'maternelle_primaire' as const, icon: '🏫', label: t('Maternelle & Primaire') },
            { id: 'maternelle' as const, icon: '🧸', label: t('Maternelle') },
            { id: 'primaire' as const, icon: '🎒', label: t('Primaire') },
            { id: 'secondaire' as const, icon: '🎓', label: t('Secondaire') },
          ].map(btn => {
            const isSelected = cycleFilter === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => setCycleFilter(btn.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold ring-2 ring-emerald-300/40'
                    : 'bg-white/5 hover:bg-white/15 text-slate-200 border border-white/10'
                }`}
              >
                <span>{btn.icon}</span>
                <span>{btn.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards: Consolidated Budget & Tranches */}
      {activeSynthese && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Potentiel Annuel */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Potentiel Annuel Estimé
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-black text-slate-900 block tracking-tight">
                {formatMoney(activeSynthese.total_annuel_prevu)} <span className="text-xs font-bold text-slate-400">{schoolCurrency}</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                Pour un effectif de <strong>{activeSynthese.effectif} élèves</strong> inscrits
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Scolarité totale :</span>
              <span className="font-bold text-slate-800">{formatMoney(activeSynthese.total_scolarite_prevu)} {schoolCurrency}</span>
            </div>
          </div>

          {/* Card 2: Frais d'Inscription */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Frais d'Inscription Prévus
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-black text-blue-900 block tracking-tight">
                {formatMoney(activeSynthese.total_inscription_prevu)} <span className="text-xs font-bold text-blue-400">{schoolCurrency}</span>
              </span>
              <p className="text-[11px] text-slate-500 font-medium">
                Droit d'entrée / réinscription exigibles
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Frais annexes (tenues, cantine) :</span>
              <span className="font-bold text-slate-800">{formatMoney(activeSynthese.total_annexes_prevu)} {schoolCurrency}</span>
            </div>
          </div>

          {/* Card 3: Répartition par Tranches */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Échéancier des 3 Tranches
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Tranche 1 (Rentrée) :</span>
                <span className="font-extrabold text-indigo-700">{formatMoney(activeSynthese.total_tranche1_prevu)} {schoolCurrency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Tranche 2 (Janvier) :</span>
                <span className="font-extrabold text-indigo-700">{formatMoney(activeSynthese.total_tranche2_prevu)} {schoolCurrency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Tranche 3 (Avril) :</span>
                <span className="font-extrabold text-indigo-700">{formatMoney(activeSynthese.total_tranche3_prevu)} {schoolCurrency}</span>
              </div>
            </div>
          </div>

          {/* Card 4: Recouvrement Réel & Reste */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Recouvrement Réalisé
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                activeSynthese.taux_recouvrement >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {activeSynthese.taux_recouvrement}%
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-2xl font-black text-emerald-700 block tracking-tight">
                {formatMoney(activeSynthese.total_encaisse)} <span className="text-xs font-bold text-emerald-400">{schoolCurrency}</span>
              </span>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden my-1">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, activeSynthese.taux_recouvrement)}%` }}
                />
              </div>
              <p className="text-[11px] text-amber-700 font-bold flex items-center justify-between">
                <span>Reste à recouvrer :</span>
                <span>{formatMoney(activeSynthese.reste_a_recouvrer)} {schoolCurrency}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Simulation & Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Class search */}
        <div className="flex-1 max-w-md relative">
          <input
            type="text"
            placeholder="Rechercher une classe (ex: CP, 6ème, Terminale)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Growth simulator buttons */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1.5">
            <Sliders size={14} />
            <span>Simulation d'effectifs :</span>
          </span>
          {[-10, 0, 10, 20].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => setSimulatedGrowth(pct)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                simulatedGrowth === pct
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {pct === 0 ? 'Actuel (Réel)' : `${pct > 0 ? '+' : ''}${pct}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed Revenue Table per Class */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <Building2 size={16} className="text-emerald-600" />
              <span>Détail Prévisionnel des Recettes par Classe</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredClasses.length} classe(s) affichée(s) • Tarifs unitaires et prévisions calculées selon l'effectif
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500 hidden sm:block">
            {simulatedGrowth !== 0 && (
              <span className="text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                Simulation active ({simulatedGrowth > 0 ? `+${simulatedGrowth}` : simulatedGrowth}% élèves)
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="py-3.5 px-4">Classe & Cycle</th>
                <th className="py-3.5 px-3 text-center">Effectif</th>
                <th className="py-3.5 px-3 text-right">Inscription</th>
                <th className="py-3.5 px-3 text-right">Tranche 1 (Rentrée)</th>
                <th className="py-3.5 px-3 text-right">Tranche 2 (Janvier)</th>
                <th className="py-3.5 px-3 text-right">Tranche 3 (Avril)</th>
                <th className="py-3.5 px-3 text-right">Annexes</th>
                <th className="py-3.5 px-3 text-right">Total Prévu</th>
                <th className="py-3.5 px-3 text-right">Encaissé</th>
                <th className="py-3.5 px-3 text-right">Reste</th>
                <th className="py-3.5 px-3 text-center">Recouvrement</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <Building2 size={24} />
                      </div>
                      <div className="space-y-1">
                        <span className="font-extrabold text-sm text-slate-800 block">
                          Aucune classe enregistrée pour ce périmètre
                        </span>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Configurez vos classes (Maternelle, Primaire, Secondaire) et leurs tarifs d'inscription et de scolarité par tranche pour voir le prévisionnel budgétaire en temps réel.
                        </p>
                      </div>
                      <Link
                        to="/classes"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
                      >
                        <span>Gérer les classes & tarifs</span>
                        <ChevronRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls) => {
                  const effectiveCount = Math.round(cls.nombre_eleves * growthMultiplier);
                  const effectiveInscription = effectiveCount * cls.frais_inscription;
                  const effectiveT1 = effectiveCount * cls.tranche1_montant;
                  const effectiveT2 = effectiveCount * cls.tranche2_montant;
                  const effectiveT3 = effectiveCount * cls.tranche3_montant;
                  const effectiveAnnexes = effectiveCount * cls.frais_annexes;
                  const effectiveTotal = effectiveInscription + effectiveT1 + effectiveT2 + effectiveT3 + effectiveAnnexes;
                  const effectiveReste = Math.max(0, effectiveTotal - cls.total_encaisse);
                  const effectiveRate = effectiveTotal > 0 ? Math.min(100, Math.round((cls.total_encaisse / effectiveTotal) * 100)) : 0;

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 text-xs">{cls.nom}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cls.cycle === 'maternelle'
                              ? 'bg-purple-100 text-purple-800'
                              : cls.cycle === 'primaire'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {cls.cycle.toUpperCase()}
                          </span>
                          <span className="text-[10px] text-slate-400">{cls.niveau}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center font-extrabold text-slate-800">
                        {effectiveCount}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-slate-900">{formatMoney(effectiveInscription)}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          ({formatMoney(cls.frais_inscription)} / élève)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-indigo-700">{formatMoney(effectiveT1)}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          ({formatMoney(cls.tranche1_montant)} / élève)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-indigo-700">{formatMoney(effectiveT2)}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          ({formatMoney(cls.tranche2_montant)} / élève)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-indigo-700">{formatMoney(effectiveT3)}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          ({formatMoney(cls.tranche3_montant)} / élève)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-bold text-slate-700">{formatMoney(effectiveAnnexes)}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">
                          ({formatMoney(cls.frais_annexes)} / élève)
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <span className="font-black text-slate-950 text-xs">{formatMoney(effectiveTotal)}</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">{cls.devise}</span>
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-emerald-700">
                        {formatMoney(cls.total_encaisse)}
                      </td>

                      <td className="py-3.5 px-3 text-right font-bold text-amber-700">
                        {formatMoney(effectiveReste)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            effectiveRate >= 80 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : effectiveRate >= 50 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                          }`}>
                            {effectiveRate}%
                          </span>
                          <div className="w-12 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full ${effectiveRate >= 80 ? 'bg-emerald-500' : effectiveRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${Math.min(100, effectiveRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cls)}
                          className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Modifier les tranches et frais de cette classe"
                        >
                          <Edit size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Subtotals */}
            {filteredClasses.length > 0 && activeSynthese && (
              <tfoot className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                <tr>
                  <td className="py-4 px-4 font-black">
                    TOTAL SÉLECTION ({filteredClasses.length} classes)
                  </td>
                  <td className="py-4 px-3 text-center text-sm font-black text-slate-900">
                    {activeSynthese.effectif}
                  </td>
                  <td className="py-4 px-3 text-right">
                    {formatMoney(activeSynthese.total_inscription_prevu)}
                  </td>
                  <td className="py-4 px-3 text-right text-indigo-800">
                    {formatMoney(activeSynthese.total_tranche1_prevu)}
                  </td>
                  <td className="py-4 px-3 text-right text-indigo-800">
                    {formatMoney(activeSynthese.total_tranche2_prevu)}
                  </td>
                  <td className="py-4 px-3 text-right text-indigo-800">
                    {formatMoney(activeSynthese.total_tranche3_prevu)}
                  </td>
                  <td className="py-4 px-3 text-right">
                    {formatMoney(activeSynthese.total_annexes_prevu)}
                  </td>
                  <td className="py-4 px-3 text-right text-sm font-black text-slate-950">
                    {formatMoney(activeSynthese.total_annuel_prevu)}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-emerald-800">
                    {formatMoney(activeSynthese.total_encaisse)}
                  </td>
                  <td className="py-4 px-3 text-right font-black text-amber-800">
                    {formatMoney(activeSynthese.reste_a_recouvrer)}
                  </td>
                  <td className="py-4 px-3 text-center">
                    <span className="font-black text-xs px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                      {activeSynthese.taux_recouvrement}%
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Class Fee Adjustment Modal */}
      {editingClass && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scale-in">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Paramétrer les Tranches & Frais
                </h3>
                <span className="text-xs font-bold text-emerald-700">
                  Classe : {editingClass.nom} ({editingClass.cycle})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingClass(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveClassFees} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Frais d'Inscription (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.frais_inscription}
                    onChange={(e) => setEditForm({ ...editForm, frais_inscription: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Frais Annexes (Tenues, etc.)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editForm.frais_annexes}
                    onChange={(e) => setEditForm({ ...editForm, frais_annexes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Tranche 1 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-indigo-900 block">Tranche 1 (Rentrée / 1er Versement)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Montant FCFA"
                    value={editForm.tranche1_montant}
                    onChange={(e) => setEditForm({ ...editForm, tranche1_montant: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                  <input
                    type="date"
                    value={editForm.tranche1_date_limite}
                    onChange={(e) => setEditForm({ ...editForm, tranche1_date_limite: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    title="Date limite de paiement Tranche 1"
                  />
                </div>
              </div>

              {/* Tranche 2 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-indigo-900 block">Tranche 2 (Deuxième Versement / Janvier)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Montant FCFA"
                    value={editForm.tranche2_montant}
                    onChange={(e) => setEditForm({ ...editForm, tranche2_montant: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                  <input
                    type="date"
                    value={editForm.tranche2_date_limite}
                    onChange={(e) => setEditForm({ ...editForm, tranche2_date_limite: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    title="Date limite de paiement Tranche 2"
                  />
                </div>
              </div>

              {/* Tranche 3 */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-black text-indigo-900 block">Tranche 3 (Troisième Versement / Avril)</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Montant FCFA"
                    value={editForm.tranche3_montant}
                    onChange={(e) => setEditForm({ ...editForm, tranche3_montant: Number(e.target.value) })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold"
                  />
                  <input
                    type="date"
                    value={editForm.tranche3_date_limite}
                    onChange={(e) => setEditForm({ ...editForm, tranche3_date_limite: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    title="Date limite de paiement Tranche 3"
                  />
                </div>
              </div>

              {/* Total Scolarité calculée */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
                <span className="font-bold text-emerald-900">Total Scolarité (T1 + T2 + T3) :</span>
                <span className="font-black text-sm text-emerald-700">
                  {formatMoney(Number(editForm.tranche1_montant) + Number(editForm.tranche2_montant) + Number(editForm.tranche3_montant))} FCFA / élève
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingFee}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingFee ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Enregistrer les tarifs</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
