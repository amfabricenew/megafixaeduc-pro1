import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Wrench, 
  Settings, 
  Bell, 
  Mail, 
  Lock,
  Plus,
  Save,
  ArrowRight,
  AlertCircle,
  CreditCard,
  Layers,
  Check,
  X,
  Zap,
  Loader2,
  Globe,
  Copy,
  ExternalLink,
  Trash2,
  Edit2,
  Smartphone,
  Landmark,
  ShieldCheck,
  Link2,
  CheckCheck
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiFetch } from '../../utils/api';
import toast from 'react-hot-toast';
import {
  APP_FEATURES,
  ALL_APP_FEATURE_IDS,
  resolvePlanFeatureIds,
  isUnlimitedLimit,
} from '../../constants/productFeatures';
import { syncCloudVaultWithFirestore } from '../../utils/cloudVaultSync';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TABS = [
  { id: 'product', label: 'Gestion des Produits', icon: Zap },
  { id: 'plans', label: 'Offres & Tarification', icon: Layers },
  { id: 'features', label: 'Matrice Fonctionnalités', icon: Wrench },
  { id: 'config', label: 'Configuration Globale', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'maintenance', label: 'Maintenance', icon: Lock },
];

export default function SuperAdminProduct() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'product';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && TABS.find(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };
  const [plans, setPlans] = useState<any[]>([]);
  const [featureMatrix, setFeatureMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/product-config');
      if (res.ok) {
        const data = await res.json();
        if (data.featureMatrix) setFeatureMatrix(data.featureMatrix);
        if (Array.isArray(data.plans)) {
          setPlans(data.plans);
        }
      }
    } catch (err) {
      toast.error("Erreur lors du chargement de la configuration");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      setSaving(true);
      const syncedPlans = plans.map((plan) => {
        const key = String(plan.id);
        const ids = Array.isArray(featureMatrix[key])
          ? featureMatrix[key]
          : resolvePlanFeatureIds(plan.features, plan.featureIds, plan.name);
        const canonicalNames = APP_FEATURES.filter((f) => ids.includes(f.id)).map((f) => f.name);
        const canonicalSet = new Set(APP_FEATURES.map((f) => f.name.toLowerCase()));
        const canonicalIdSet = new Set(APP_FEATURES.map((f) => f.id.toLowerCase()));
        const custom = (Array.isArray(plan.features) ? plan.features : []).filter((f: string) => {
          const low = String(f || '').toLowerCase().trim();
          return low && !canonicalSet.has(low) && !canonicalIdSet.has(low);
        });
        return {
          ...plan,
          featureIds: ids,
          features: Array.from(new Set([...canonicalNames, ...custom])),
        };
      });

      const res = await apiFetch('/api/admin/product-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plans: syncedPlans, 
          featureMatrix
        }),
      });

      if (res.ok) {
        toast.success("Configuration publiée et appliquée avec succès !");
        await fetchConfig();
        window.dispatchEvent(new Event('school_subscription_updated'));
        syncCloudVaultWithFirestore().catch(() => {});
      } else {
        const err = await res.json();
        throw new Error(err.error || "Erreur de publication");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const [modalFeatureIds, setModalFeatureIds] = useState<string[]>([]);

  const featureCategories = React.useMemo(() => {
    const groups: Record<string, typeof APP_FEATURES> = {};
    APP_FEATURES.forEach((f) => {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    });
    return Object.entries(groups);
  }, []);

  const openConfigModal = (plan?: any) => {
    if (plan) {
      const resolvedIds = resolvePlanFeatureIds(
        plan.features,
        featureMatrix[String(plan.id)] || plan.featureIds,
        plan.name
      );
      setModalFeatureIds(resolvedIds);
      setEditingPlan({
        ...plan,
        period: plan.period || 'mois',
        description: plan.description || '',
        student_limit: isUnlimitedLimit(plan.student_limit) ? 0 : Number(plan.student_limit),
        staff_limit: isUnlimitedLimit(plan.staff_limit) ? 0 : Number(plan.staff_limit),
        active: plan.is_active !== 0 && plan.active !== false
      });
    } else {
      const newId = `plan_${Math.random().toString(36).substr(2, 9)}`;
      setModalFeatureIds(['cycle_primaire', 'cycle_secondaire', 'dashboard', 'classes', 'students', 'teachers', 'subjects', 'grades']);
      setEditingPlan({
        id: newId,
        name: '',
        price: 0,
        period: 'mois',
        description: '',
        student_limit: 500,
        staff_limit: 50,
        active: true,
        is_active: 1
      });
    }
    setIsModalOpen(true);
  };

  const savePlanConfig = () => {
    if (!editingPlan.name) {
      toast.error("Le nom du plan est requis");
      return;
    }

    const canonicalNames = APP_FEATURES.filter((f) => modalFeatureIds.includes(f.id)).map((f) => f.name);
    const canonicalSet = new Set(APP_FEATURES.map((f) => f.name.toLowerCase()));
    const canonicalIdSet = new Set(APP_FEATURES.map((f) => f.id.toLowerCase()));
    const customFeatures = (Array.isArray(editingPlan.features) ? editingPlan.features : []).filter((f: string) => {
      const low = String(f || '').toLowerCase().trim();
      return low && !canonicalSet.has(low) && !canonicalIdSet.has(low);
    });

    const updatedPlan = {
      ...editingPlan,
      student_limit: isUnlimitedLimit(editingPlan.student_limit) ? 0 : Math.max(1, Number(editingPlan.student_limit) || 1),
      staff_limit: isUnlimitedLimit(editingPlan.staff_limit) ? 0 : Math.max(1, Number(editingPlan.staff_limit) || 1),
      featureIds: modalFeatureIds,
      features: Array.from(new Set([...canonicalNames, ...customFeatures])),
    };
    
    setPlans(prev => {
      const exists = prev.find(p => String(p.id) === String(updatedPlan.id));
      if (exists) {
        return prev.map(p => String(p.id) === String(updatedPlan.id) ? updatedPlan : p);
      }
      return [...prev, updatedPlan];
    });

    setFeatureMatrix(prev => ({ ...prev, [String(updatedPlan.id)]: modalFeatureIds }));

    setIsModalOpen(false);
    setEditingPlan(null);
    toast.success("Configuration enregistrée. Cliquez sur « Publier les changements » pour appliquer.");
  };

  const removePlan = (id: string) => {
    if (plans.length <= 1) {
      toast.error("Vous devez garder au moins un plan");
      return;
    }
    if (window.confirm("Supprimer ce plan et ses configurations de fonctionnalités ?")) {
      setPlans(plans.filter(p => String(p.id) !== String(id)));
      setFeatureMatrix(prev => {
        const newMatrix = { ...prev };
        delete newMatrix[String(id)];
        return newMatrix;
      });
    }
  };

  const toggleFeature = (planId: string, featureId: string) => {
    const key = String(planId);
    setFeatureMatrix(prev => {
      const current = prev[key] || [];
      if (current.includes(featureId)) {
        return { ...prev, [key]: current.filter(id => id !== featureId) };
      }
      return { ...prev, [key]: [...current, featureId] };
    });
  };

  const toggleAllFeaturesForPlan = (planId: string) => {
    const key = String(planId);
    setFeatureMatrix(prev => {
      const current = prev[key] || [];
      const allChecked = APP_FEATURES.every(f => current.includes(f.id));
      return {
        ...prev,
        [key]: allChecked ? [] : [...ALL_APP_FEATURE_IDS],
      };
    });
  };

  const updatePlan = (id: any, field: string, value: any) => {
    setPlans(prev => prev.map(p => String(p.id) === String(id) ? { ...p, [field]: value, ...(field === 'active' ? { is_active: value ? 1 : 0 } : {}) } : p));
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Gestion de l'Offre Produit</h1>
          <p className="text-xs sm:text-sm text-slate-500">Configurez les plans, les prix et les fonctionnalités distribuées aux écoles.</p>
        </div>
        <button 
          onClick={handlePublish}
          disabled={saving}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all shrink-0"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Publication..." : "Publier les changements"}
        </button>
      </div>

      <div className="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0",
              activeTab === tab.id 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeTab === 'product' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Catalogue des Produits</h3>
                <button 
                  onClick={() => openConfigModal()}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                          <Zap size={20} />
                        </div>
                        <div className="flex-1 cursor-pointer" onClick={() => openConfigModal(plan)}>
                          <p className="font-bold text-slate-900">{plan.name}</p>
                           <div className="flex items-center gap-2">
                              <span className="text-[10px] text-indigo-600 font-black">{Number(plan.price || 0).toLocaleString('fr-FR')}</span>
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FCFA / {plan.period || 'mois'}</span>
                           </div>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             openConfigModal(plan);
                           }}
                           className="p-2 bg-white text-indigo-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-indigo-50"
                         >
                           <Settings size={16} />
                         </button>
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             removePlan(plan.id);
                           }}
                           className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                         >
                           <X size={16} />
                         </button>
                       </div>
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase">Limite Élèves</p>
                         <p className="text-xs font-bold text-slate-900">
                           {isUnlimitedLimit(plan.student_limit) ? 'Illimité' : Number(plan.student_limit).toLocaleString('fr-FR')}
                         </p>
                       </div>
                       <div className="space-y-1">
                         <p className="text-[10px] font-bold text-slate-400 uppercase">Limite Staff</p>
                         <p className="text-xs font-bold text-slate-900">
                           {isUnlimitedLimit(plan.staff_limit) ? 'Illimité' : Number(plan.staff_limit).toLocaleString('fr-FR')}
                         </p>
                       </div>
                     </div>
                   </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center h-fit sticky top-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
                <Wrench size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Éditeur de Configuration</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                Créez et configurez vos offres commerciales. Définissez les noms, tarifs et limites techniques pour chaque profil d'école.
              </p>
              <button 
                onClick={() => openConfigModal()}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Plus size={20} />
                Créer un nouveau produit
              </button>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-emerald-50/30">
                <div>
                  <h3 className="font-bold text-slate-900">Console de Déploiement</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Visibilité sur la page d'inscription</p>
                </div>
                <div className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm shadow-emerald-100">
                  Live
                </div>
              </div>
              <div className="p-6 space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className={cn(
                    "p-4 rounded-2xl border transition-all flex items-center justify-between",
                    plan.active ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"
                  )}>
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                        plan.active ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"
                      )}>
                        <Zap size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{plan.name}</h4>
                          <div className="px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[8px] font-black uppercase tracking-widest border border-slate-200">
                            Synchro
                          </div>
                        </div>
                        <p className="text-xs text-indigo-600 font-black">{Number(plan.price || 0).toLocaleString('fr-FR')} FCFA / {plan.period || 'mois'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Statut</p>
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          plan.active ? "text-emerald-500" : "text-slate-400"
                        )}>
                          {plan.active ? 'Actif' : 'Désactivé'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => updatePlan(plan.id, 'active', !plan.active)}
                          className={cn(
                            "w-12 h-6 rounded-full transition-all relative",
                            plan.active ? "bg-emerald-500" : "bg-slate-300"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                            plan.active ? "right-1" : "left-1"
                          )} />
                        </button>
                        <button 
                          onClick={() => removePlan(plan.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center text-center h-fit sticky top-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
                <Layers size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Visibilité des Offres</h3>
              <p className="text-slate-500 max-w-sm mb-6">
                Activez ou désactivez les plans pour contrôler ce que les écoles voient lors de leur inscription ou renouvellement.
              </p>
              <div className="w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl text-left">
                <div className="flex gap-3">
                  <AlertCircle size={20} className="text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Les modifications de visibilité sont instantanées mais doivent être <strong>Publiées</strong> pour être sauvegardées de manière permanente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left p-4 sm:p-6 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 min-w-[220px]">
                      Fonctionnalités ({APP_FEATURES.length})
                    </th>
                    {plans.map(plan => {
                      const planKey = String(plan.id);
                      const checkedIds = featureMatrix[planKey] || [];
                      const allChecked = APP_FEATURES.every(f => checkedIds.includes(f.id));
                      return (
                        <th key={plan.id} className={cn(
                          "p-4 sm:p-6 text-center text-xs font-bold uppercase border-b border-slate-100 min-w-[140px]",
                          plan.active ? "text-slate-900" : "text-slate-400 italic"
                        )}>
                          <div className="space-y-1.5 flex flex-col items-center">
                            <span>{plan.name}</span>
                            {!plan.active && <span className="text-[8px] text-rose-400 font-black">(INACTIF)</span>}
                            <span className="text-[10px] text-indigo-600 font-extrabold">
                              {checkedIds.length}/{APP_FEATURES.length} actives
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAllFeaturesForPlan(plan.id)}
                              className={cn(
                                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all border normal-case",
                                allChecked
                                  ? "bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300"
                                  : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-2xs"
                              )}
                            >
                              <CheckCheck size={12} />
                              <span>{allChecked ? 'Tout décocher' : 'Cocher tous'}</span>
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {APP_FEATURES.map((feature) => (
                    <tr key={feature.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="p-4 sm:p-5 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{feature.name}</p>
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{feature.category}</p>
                        </div>
                      </td>
                      {plans.map(plan => {
                        const planKey = String(plan.id);
                        const active = featureMatrix[planKey]?.includes(feature.id);
                        return (
                          <td key={plan.id} className="p-4 sm:p-5 text-center border-b border-slate-100">
                            <button 
                              onClick={() => toggleFeature(plan.id, feature.id)}
                              className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-all mx-auto",
                                active
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-100 text-slate-300 hover:bg-rose-50 hover:text-rose-400"
                              )}
                            >
                              {active ? <Check size={18} /> : <X size={18} />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nom commercial de la plateforme</label>
                <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20" defaultValue="MégafixaEduc Pro" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Devise de facturation par défaut</label>
                <select className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20">
                  <option>Franc CFA (XOF)</option>
                  <option>Dollar US (USD)</option>
                  <option>Euro (EUR)</option>
                </select>
              </div>
            </div>
            
            <div className="pt-8 border-t border-slate-100">
              <h4 className="font-bold text-slate-900 mb-6">Limites Globales de Sécurité</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Taille max fichiers (Mo)</p>
                  <input type="number" className="w-full bg-transparent border-none p-0 text-lg font-black text-slate-900" defaultValue={50} />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Sessions simultanées max</p>
                  <input type="number" className="w-full bg-transparent border-none p-0 text-lg font-black text-slate-900" defaultValue={3} />
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Délai inactivité (min)</p>
                  <input type="number" className="w-full bg-transparent border-none p-0 text-lg font-black text-slate-900" defaultValue={30} />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="font-bold text-slate-900">Notifications Système Administrateur</h3>
            <div className="space-y-4">
              {[
                { name: 'Nouvel Abonnement', desc: 'Alerte lors d\'une nouvelle création de compte école.' },
                { name: 'Paiement Reçu', desc: 'Notification de succès de transaction.' },
                { name: 'Échec de Paiement', desc: 'Alerte pour les transactions rejetées.' },
                { name: 'Ticket Support Urgent', desc: 'Notification pour les demandes de support prioritaires.' },
              ].map((notif, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{notif.name}</p>
                    <p className="text-xs text-slate-500">{notif.desc}</p>
                  </div>
                  <button className="w-10 h-5 bg-indigo-600 rounded-full relative">
                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="space-y-6">
             <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl flex gap-6">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl h-fit">
                <AlertCircle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">Mode Maintenance</h3>
                <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                  L'activation du mode maintenance suspend tout accès utilisateur. Seuls les super-admins authentifiés pourront naviguer sur la plateforme. Utile pour les migrations de base de données ou les mises à jour majeures.
                </p>
                <div className="mt-6 flex gap-3">
                  <button className="px-8 py-3 bg-amber-600 text-white rounded-2xl text-sm font-bold shadow-lg shadow-amber-200 hover:bg-amber-700 transition-all">
                    Activer maintenant
                  </button>
                  <button className="px-8 py-3 bg-white text-amber-600 border border-amber-200 rounded-2xl text-sm font-bold hover:bg-amber-50 transition-all">
                    Planifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && editingPlan && (() => {
        const modalStudentsUnlimited = isUnlimitedLimit(editingPlan.student_limit);
        const modalStaffUnlimited = isUnlimitedLimit(editingPlan.staff_limit);
        const allModalChecked = modalFeatureIds.length === APP_FEATURES.length;
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-900">Configuration du Plan</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nom de l'offre</label>
                  <input 
                    type="text" 
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    placeholder="ex: Premium Plus"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tarif (FCFA)</label>
                    <input 
                      type="number" 
                      value={editingPlan.price}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value, 10) || 0 })}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Période / Durée</label>
                    <select 
                      value={editingPlan.period || 'mois'}
                      onChange={(e) => setEditingPlan({ ...editingPlan, period: e.target.value })}
                      className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="mois">Par mois</option>
                      <option value="an">Par an</option>
                      <option value="trimestre">Par trimestre</option>
                      <option value="14 jours">14 jours (Essai)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Limite Élèves</label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200">
                        <input
                          type="checkbox"
                          checked={modalStudentsUnlimited}
                          onChange={(e) => setEditingPlan({ ...editingPlan, student_limit: e.target.checked ? 0 : 500 })}
                          className="rounded border-indigo-300 text-indigo-600 focus:ring-0"
                        />
                        <span>Illimité</span>
                      </label>
                    </div>
                    {modalStudentsUnlimited ? (
                      <div className="w-full p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-sm font-black text-indigo-700">
                        Élèves illimités (∞)
                      </div>
                    ) : (
                      <input 
                        type="number" 
                        min="1"
                        value={editingPlan.student_limit}
                        onChange={(e) => setEditingPlan({ ...editingPlan, student_limit: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Limite Staff</label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                        <input
                          type="checkbox"
                          checked={modalStaffUnlimited}
                          onChange={(e) => setEditingPlan({ ...editingPlan, staff_limit: e.target.checked ? 0 : 50 })}
                          className="rounded border-emerald-300 text-emerald-600 focus:ring-0"
                        />
                        <span>Illimité</span>
                      </label>
                    </div>
                    {modalStaffUnlimited ? (
                      <div className="w-full p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-sm font-black text-emerald-700">
                        Staff illimité (∞)
                      </div>
                    ) : (
                      <input 
                        type="number" 
                        min="1"
                        value={editingPlan.staff_limit}
                        onChange={(e) => setEditingPlan({ ...editingPlan, staff_limit: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                        className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                      />
                    )}
                  </div>
                </div>

                {/* All App Features grouped in modal */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-widest block">
                        Fonctionnalités actives ({modalFeatureIds.length}/{APP_FEATURES.length})
                      </label>
                      <p className="text-[11px] text-slate-400">Chaque formule fonctionne strictement avec ses modules cochés.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalFeatureIds(allModalChecked ? [] : [...ALL_APP_FEATURE_IDS])}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border",
                        allModalChecked
                          ? "bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300"
                          : "bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-xs"
                      )}
                    >
                      <CheckCheck size={14} />
                      <span>{allModalChecked ? 'Tout décocher' : 'Cocher tous'}</span>
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                    {featureCategories.map(([category, feats]) => (
                      <div key={category} className="space-y-1.5">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{category}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {feats.map((feat) => {
                            const checked = modalFeatureIds.includes(feat.id);
                            return (
                              <label
                                key={feat.id}
                                className={cn(
                                  "flex items-center gap-2 cursor-pointer text-xs p-1.5 rounded-lg border transition-colors select-none",
                                  checked
                                    ? "bg-white border-indigo-200 text-slate-900 font-semibold shadow-2xs"
                                    : "border-transparent text-slate-600 hover:bg-white/60"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setModalFeatureIds((prev) =>
                                      prev.includes(feat.id) ? prev.filter((id) => id !== feat.id) : [...prev, feat.id]
                                    )
                                  }
                                  className="rounded border-slate-300 text-indigo-600 focus:ring-0 w-3.5 h-3.5 shrink-0"
                                />
                                <span className="truncate">{feat.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Statut Initial</label>
                  <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl h-[52px]">
                    <span className="text-xs font-bold text-slate-600">Actif</span>
                    <button 
                      type="button"
                      onClick={() => setEditingPlan({ ...editingPlan, active: !editingPlan.active, is_active: !editingPlan.active ? 1 : 0 })}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative ml-auto",
                        editingPlan.active ? "bg-emerald-500" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                        editingPlan.active ? "right-0.5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={savePlanConfig}
                  className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Enregistrer la configuration
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

