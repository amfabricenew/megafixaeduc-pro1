import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  Package, 
  ShieldCheck, 
  Zap, 
  Building,
  CheckCircle2,
  DollarSign,
  Clock,
  Save,
  AlertCircle,
  Crown,
  Power,
  PowerOff,
  Users,
  Shield,
  Layers,
  Sparkles,
  Info,
  CheckCheck,
  Search,
  Filter
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { APP_FEATURES } from '../../constants/productFeatures';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface Plan {
  id: number | string;
  name: string;
  price: number;
  period: string;
  features: string[];
  is_active: boolean;
  type: 'trial' | 'paid';
  color: 'slate' | 'emerald' | 'indigo' | 'amber' | 'purple';
  is_recommended?: boolean;
  student_limit?: number;
  staff_limit?: number;
  description?: string | null;
}

export default function PlansManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<Plan | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAllFeatures, setShowAllFeatures] = useState(true);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/plans', {
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPlans(data);
      } else {
        toast.error("Impossible de charger les formules d'abonnement");
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleToggleActive = async (plan: Plan) => {
    const nextStatus = !plan.is_active;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/plans/${plan.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ...plan, 
          is_active: nextStatus 
        })
      });

      if (response.ok) {
        toast.success(nextStatus ? `Offre « ${plan.name} » activée` : `Offre « ${plan.name} » désactivée`);
        setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, is_active: nextStatus } : p));
      } else {
        toast.error("Erreur lors de la mise à jour du statut");
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur");
    }
  };

  const handleSavePlan = async (planData: Partial<Plan>) => {
    try {
      const token = localStorage.getItem('token');
      const isUpdate = !!isEditing;
      const url = isUpdate ? `/api/super-admin/plans/${planData.id}` : '/api/super-admin/plans';
      const method = isUpdate ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        toast.success(isUpdate ? "Formule mise à jour avec succès" : "Nouvelle formule créée avec succès");
        setIsEditing(null);
        setIsAdding(false);
        fetchPlans();
      } else {
        toast.error("Erreur lors de l'enregistrement de la formule");
      }
    } catch (error) {
      toast.error("Erreur de connexion au serveur");
    }
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/super-admin/plans/${planToDelete.id}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      if (response.ok) {
        toast.success(`Offre « ${planToDelete.name} » supprimée`);
        setPlans(prev => prev.filter(p => p.id !== planToDelete.id));
        setPlanToDelete(null);
      } else {
        toast.error("Impossible de supprimer cette formule");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const filteredPlans = plans.filter(p => {
    if (filterActive === 'active') return p.is_active;
    if (filterActive === 'inactive') return !p.is_active;
    return true;
  });

  const activeCount = plans.filter(p => p.is_active).length;
  const totalCount = plans.length;

  const getPlanIcon = (color: string, type: string) => {
    if (type === 'trial') return <Clock className="text-amber-500" size={24} />;
    switch (color) {
      case 'emerald': return <Zap className="text-emerald-500" size={24} />;
      case 'indigo': return <ShieldCheck className="text-indigo-500" size={24} />;
      case 'purple': return <Crown className="text-purple-500" size={24} />;
      case 'amber': return <Sparkles className="text-amber-500" size={24} />;
      default: return <Package className="text-slate-500" size={24} />;
    }
  };

  if (loading && plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
        <p className="text-sm text-slate-500 font-medium">Chargement des planches d'offres...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0b1329] to-indigo-950 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Layers size={16} />
              <span>Gestion Commerciale & Tarification</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Planches des Offres & Formules d'Abonnement
            </h1>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
              Consultez l'ensemble des formules proposées aux établissements scolaires avec le détail complet 
              de leurs fonctionnalités. Activez, désactivez ou supprimez les offres en un clic.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-bold text-xs md:text-sm transition-all shadow-lg shadow-amber-500/20 active:scale-95 shrink-0"
            >
              <Plus size={18} />
              <span>Créer une nouvelle formule</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Formules</p>
            <p className="text-xl font-black text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Formules Actives</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{activeCount}</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Formules Inactives</p>
            <p className="text-xl font-black text-slate-400 mt-0.5">{totalCount - activeCount}</p>
          </div>
          <div className="p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tarif Référence</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">
              {plans.find(p => p.is_recommended)?.price.toLocaleString() || '45 000'} <span className="text-xs text-slate-400 font-normal">FCFA</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Options Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Filtrer par statut :</span>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterActive('all')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                filterActive === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Toutes ({plans.length})
            </button>
            <button
              onClick={() => setFilterActive('active')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                filterActive === 'active' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Actives ({activeCount})
            </button>
            <button
              onClick={() => setFilterActive('inactive')}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-bold transition-all",
                filterActive === 'inactive' ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"
              )}
            >
              Inactives ({totalCount - activeCount})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAllFeatures}
              onChange={e => setShowAllFeatures(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-0 w-4 h-4"
            />
            <span>Afficher la grille complète comparative des fonctionnalités</span>
          </label>
        </div>
      </div>

      {/* Grid of Plans / Planches des Offres */}
      {filteredPlans.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <Package className="mx-auto text-slate-300" size={48} />
          <h3 className="text-base font-bold text-slate-700">Aucune formule trouvée</h3>
          <p className="text-xs text-slate-400">Aucune offre ne correspond aux filtres sélectionnés.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {filteredPlans.map((plan) => {
            const planFeatures = Array.isArray(plan.features) ? plan.features : [];

            return (
              <div 
                key={plan.id}
                className={cn(
                  "bg-white rounded-3xl border transition-all flex flex-col justify-between relative overflow-hidden shadow-sm hover:shadow-xl",
                  plan.is_recommended 
                    ? "border-amber-400 ring-2 ring-amber-400/20" 
                    : plan.is_active 
                      ? "border-slate-200" 
                      : "border-slate-200 bg-slate-50/70 opacity-80",
                  !plan.is_active && "grayscale-[0.3]"
                )}
              >
                {/* Status Ribbons */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                  {plan.is_recommended && (
                    <span className="flex items-center gap-1 bg-amber-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full shadow-sm">
                      <Crown size={11} />
                      Populaire
                    </span>
                  )}
                  <span className={cn(
                    "flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded-full",
                    plan.is_active 
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                      : "bg-rose-50 text-rose-700 border border-rose-200"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", plan.is_active ? "bg-emerald-500" : "bg-rose-500")} />
                    {plan.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>

                {/* Plan Header */}
                <div className="p-6 md:p-7 border-b border-slate-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner",
                      plan.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                      plan.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                      plan.color === 'purple' ? "bg-purple-50 text-purple-600" :
                      plan.color === 'amber' ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
                    )}>
                      {getPlanIcon(plan.color, plan.type)}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
                        {plan.name}
                      </h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {plan.type === 'trial' ? 'Formule Découverte / Essai' : 'Abonnement Standardisé'}
                      </p>
                    </div>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                      {plan.description}
                    </p>
                  )}

                  {/* Price Display */}
                  <div className="mt-2 mb-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">
                        {plan.price === 0 ? 'Gratuit' : plan.price.toLocaleString()}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-xs font-bold text-slate-400 uppercase">
                          FCFA / {plan.period || 'mois'}
                        </span>
                      )}
                      {plan.price === 0 && (
                        <span className="text-xs font-bold text-slate-400">
                          ({plan.period || '14 jours'})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Capacity Quotas */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                      <Users size={15} className="text-indigo-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Élèves max</p>
                        <p className="text-xs font-black text-slate-800 mt-1">
                          {plan.student_limit ? plan.student_limit.toLocaleString() : 'Illimité'}
                        </p>
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2">
                      <Shield size={15} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase leading-none">Personnel/Staff</p>
                        <p className="text-xs font-black text-slate-800 mt-1">
                          {plan.staff_limit ? plan.staff_limit.toLocaleString() : 'Illimité'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Features Section */}
                <div className="p-6 md:p-7 flex-1 bg-slate-50/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {showAllFeatures ? 'Toutes les fonctionnalités' : 'Fonctionnalités incluses'}
                    </p>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      {planFeatures.length} configurées
                    </span>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1 text-xs">
                    {/* Custom Plan features */}
                    {planFeatures.length > 0 && (
                      <div className="space-y-1.5 pb-2">
                        {planFeatures.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-slate-700 font-medium">
                            <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-tight">{feat}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Extended Platform Features Check if enabled */}
                    {showAllFeatures && (
                      <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Modules Système</p>
                        {APP_FEATURES.map((feature) => {
                          const isIncluded = planFeatures.some(f => 
                            f.toLowerCase().includes(feature.name.toLowerCase()) || 
                            f.toLowerCase() === feature.id
                          );

                          return (
                            <div key={feature.id} className="flex items-center justify-between py-0.5">
                              <span className={cn(
                                "text-[11px] truncate pr-2",
                                isIncluded ? "text-slate-800 font-semibold" : "text-slate-400"
                              )}>
                                {feature.name}
                              </span>
                              {isIncluded ? (
                                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                  <Check size={10} strokeWidth={3} />
                                </span>
                              ) : (
                                <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center shrink-0">
                                  <X size={10} strokeWidth={3} />
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct Action Buttons on Each Plan Board */}
                <div className="p-4 md:p-5 bg-white border-t border-slate-100 space-y-2">
                  {/* Primary Activate / Deactivate button */}
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className={cn(
                      "w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border shadow-sm",
                      plan.is_active
                        ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                        : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                    )}
                  >
                    {plan.is_active ? (
                      <>
                        <PowerOff size={15} />
                        <span>Désactiver l'offre</span>
                      </>
                    ) : (
                      <>
                        <Power size={15} />
                        <span>Activer l'offre</span>
                      </>
                    )}
                  </button>

                  {/* Secondary buttons: Edit and Delete */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(plan)}
                      className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <Edit3 size={14} />
                      <span>Modifier</span>
                    </button>

                    <button
                      onClick={() => setPlanToDelete(plan)}
                      className="py-2 px-3 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                      title="Supprimer la formule"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Form Modal (Create or Edit) */}
      <AnimatePresence>
        {(isEditing || isAdding) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => { setIsEditing(null); setIsAdding(false); }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10"
            >
              <PlanForm 
                initialData={isEditing || undefined}
                onSave={handleSavePlan}
                onCancel={() => { setIsEditing(null); setIsAdding(false); }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-100 space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle size={26} />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-black text-slate-900">Supprimer cette formule ?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement la formule <span className="font-bold text-slate-800">« {planToDelete.name} »</span> ? 
                Cette action retirera cette planche de l'ensemble du catalogue commercial.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeletePlan}
                className="flex-1 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-lg shadow-rose-600/20"
              >
                Confirmer la suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PlanForm Component for Creating and Editing Plans
function PlanForm({ 
  initialData, 
  onSave, 
  onCancel 
}: { 
  initialData?: Plan, 
  onSave: (p: Partial<Plan>) => void, 
  onCancel: () => void 
}) {
  const [formData, setFormData] = useState<Partial<Plan>>(initialData || {
    name: '',
    price: 25000,
    period: 'mois',
    features: ['Cycle Primaire & Secondaire', 'Gestion des Élèves & Classes', 'Bulletins de Notes Officiels'],
    type: 'paid',
    color: 'indigo',
    is_active: true,
    is_recommended: false,
    student_limit: 500,
    staff_limit: 50,
    description: ''
  });

  const [newFeatureText, setNewFeatureText] = useState('');

  const handleAddFeature = () => {
    if (!newFeatureText.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), newFeatureText.trim()]
    }));
    setNewFeatureText('');
  };

  const handleRemoveFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== index)
    }));
  };

  const handleToggleStandardFeature = (featureName: string) => {
    const current = formData.features || [];
    const exists = current.some(f => f.toLowerCase() === featureName.toLowerCase());
    if (exists) {
      setFormData(prev => ({
        ...prev,
        features: current.filter(f => f.toLowerCase() !== featureName.toLowerCase())
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        features: [...current, featureName]
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Veuillez saisir un nom pour cette offre");
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 md:p-8 flex flex-col max-h-[90vh]">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Package size={20} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900">
              {initialData ? `Modifier l'offre « ${initialData.name} »` : 'Créer une Nouvelle Formule'}
            </h3>
            <p className="text-xs text-slate-400">Configurez la planche tarifaire et toutes ses caractéristiques.</p>
          </div>
        </div>
        <button 
          type="button" 
          onClick={onCancel} 
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all"
        >
          <X size={18} />
        </button>
      </div>

      <div className="space-y-4 py-4 overflow-y-auto pr-1 flex-1 custom-scrollbar text-xs">
        {/* Nom & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Nom de la formule *</label>
            <input 
              type="text" 
              required
              value={formData.name || ''}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="Ex: Découverte, Pro, Excellence..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Type de tarification</label>
            <select
              value={formData.type || 'paid'}
              onChange={e => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="paid">Payant standard</option>
              <option value="trial">Essai gratuit (Trial)</option>
            </select>
          </div>
        </div>

        {/* Prix & Période */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Prix (FCFA)</label>
            <input 
              type="number" 
              min="0"
              step="500"
              value={formData.price ?? 0}
              onChange={e => setFormData({ ...formData, price: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Fréquence / Période</label>
            <select 
              value={formData.period || 'mois'}
              onChange={e => setFormData({ ...formData, period: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="mois">Mois</option>
              <option value="trimestre">Trimestre</option>
              <option value="an">An (Annuel)</option>
              <option value="14 jours">14 jours (Essai)</option>
              <option value="30 jours">30 jours</option>
            </select>
          </div>
        </div>

        {/* Quotas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Nombre max d'élèves</label>
            <input 
              type="number" 
              min="0"
              value={formData.student_limit ?? 500}
              onChange={e => setFormData({ ...formData, student_limit: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="Ex: 500 (0 pour illimité)"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-700">Nombre max d'enseignants & staff</label>
            <input 
              type="number" 
              min="0"
              value={formData.staff_limit ?? 50}
              onChange={e => setFormData({ ...formData, staff_limit: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              placeholder="Ex: 50 (0 pour illimité)"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-700">Description courte</label>
          <input 
            type="text" 
            value={formData.description || ''}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            placeholder="Ex: Idéal pour les collèges et écoles en croissance..."
          />
        </div>

        {/* Thème visuel */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 block">Thème de couleur</label>
          <div className="flex gap-2.5">
            {(['indigo', 'emerald', 'amber', 'purple', 'slate'] as const).map(c => (
              <button 
                key={c}
                type="button"
                onClick={() => setFormData({ ...formData, color: c })}
                className={cn(
                  "w-7 h-7 rounded-xl border-2 transition-all",
                  c === 'slate' ? "bg-slate-500" :
                  c === 'emerald' ? "bg-emerald-500" :
                  c === 'indigo' ? "bg-indigo-500" :
                  c === 'amber' ? "bg-amber-500" : "bg-purple-500",
                  formData.color === c ? "border-slate-900 scale-110 shadow-md" : "border-transparent opacity-50"
                )}
              />
            ))}
          </div>
        </div>

        {/* Rapid Feature Checklist from APP_FEATURES */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="font-bold text-slate-700 block">
            Sélection rapide parmi les fonctionnalités officielles
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            {APP_FEATURES.map((feat) => {
              const checked = (formData.features || []).some(f => 
                f.toLowerCase() === feat.name.toLowerCase() || f.toLowerCase() === feat.id
              );
              return (
                <label key={feat.id} className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 hover:text-slate-900 select-none">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleStandardFeature(feat.name)}
                    className="rounded border-slate-300 text-amber-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <span className="truncate">{feat.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Custom Features List */}
        <div className="space-y-2 pt-2">
          <label className="font-bold text-slate-700 block">Fonctionnalités personnalisées</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newFeatureText}
              onChange={e => setNewFeatureText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
              placeholder="Ex: Support téléphonique 24h/24"
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddFeature}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
            >
              Ajouter
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {(formData.features || []).map((feat, idx) => (
              <span 
                key={idx} 
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold"
              >
                {feat}
                <button 
                  type="button" 
                  onClick={() => handleRemoveFeature(idx)}
                  className="text-slate-400 hover:text-rose-500"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Options Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={formData.is_active !== false}
              onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-0"
            />
            <span className="font-bold text-slate-700">Activer immédiatement ce plan</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input 
              type="checkbox" 
              checked={formData.is_recommended || false}
              onChange={e => setFormData({ ...formData, is_recommended: e.target.checked })}
              className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-0"
            />
            <span className="font-bold text-slate-700">Mettre en avant (Recommandé)</span>
          </label>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex gap-3">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
        >
          Annuler
        </button>
        <button 
          type="submit"
          className="flex-1 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} />
          <span>{initialData ? 'Mettre à jour' : 'Enregistrer la formule'}</span>
        </button>
      </div>
    </form>
  );
}
