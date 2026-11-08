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
  Link2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { apiFetch } from '../../utils/api';
import toast from 'react-hot-toast';
import { APP_FEATURES } from '../../constants/productFeatures';

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

const INITIAL_PLANS = [
  { id: 'trial', name: 'Essai (Trial)', price: 0, student_limit: 50, staff_limit: 5, active: true },
  { id: 'standard', name: 'Standard', price: 25000, student_limit: 500, staff_limit: 50, active: true },
  { id: 'premium', name: 'Premium', price: 75000, student_limit: 2000, staff_limit: 150, active: true },
  { id: 'enterprise', name: 'Entreprise', price: 150000, student_limit: 10000, staff_limit: 1000, active: true },
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
  const [plans, setPlans] = useState(INITIAL_PLANS);
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
      const res = await apiFetch('/api/public/config');
      if (res.ok) {
        const data = await res.json();
        if (data.featureMatrix) setFeatureMatrix(data.featureMatrix);
        
        const dbPlans = data.config.product_plans ? JSON.parse(data.config.product_plans) : INITIAL_PLANS;
        setPlans(dbPlans);
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
      const res = await apiFetch('/api/admin/product-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plans, 
          featureMatrix
        }),
      });

      if (res.ok) {
        toast.success("Configuration publiée et appliquée avec succès !");
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

  const openConfigModal = (plan?: any) => {
    if (plan) {
      setEditingPlan({ ...plan });
    } else {
      setEditingPlan({
        id: `plan_${Math.random().toString(36).substr(2, 9)}`,
        name: '',
        price: 0,
        student_limit: 100,
        staff_limit: 10,
        active: true
      });
    }
    setIsModalOpen(true);
  };

  const savePlanConfig = () => {
    if (!editingPlan.name) {
      toast.error("Le nom du plan est requis");
      return;
    }
    
    setPlans(prev => {
      const exists = prev.find(p => p.id === editingPlan.id);
      if (exists) {
        return prev.map(p => p.id === editingPlan.id ? editingPlan : p);
      }
      return [...prev, editingPlan];
    });

    if (!featureMatrix[editingPlan.id]) {
      setFeatureMatrix(prev => ({ ...prev, [editingPlan.id]: [] }));
    }

    setIsModalOpen(false);
    setEditingPlan(null);
    toast.success("Configuration du plan enregistrée");
  };

  const removePlan = (id: string) => {
    if (plans.length <= 1) {
      toast.error("Vous devez garder au moins un plan");
      return;
    }
    if (window.confirm("Supprimer ce plan et ses configurations de fonctionnalités ?")) {
      setPlans(plans.filter(p => p.id !== id));
      setFeatureMatrix(prev => {
        const newMatrix = { ...prev };
        delete newMatrix[id];
        return newMatrix;
      });
    }
  };

  const toggleFeature = (planId: string, featureId: string) => {
    setFeatureMatrix(prev => {
      const current = prev[planId] || [];
      if (current.includes(featureId)) {
        return { ...prev, [planId]: current.filter(id => id !== featureId) };
      }
      return { ...prev, [planId]: [...current, featureId] };
    });
  };

  const updatePlan = (id: string, field: string, value: any) => {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion de l'Offre Produit</h1>
          <p className="text-slate-500">Configurez les plans, les prix et les fonctionnalités distribuées aux écoles.</p>
        </div>
        <button 
          onClick={handlePublish}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 transition-all"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Publication..." : "Publier les changements"}
        </button>
      </div>

      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all",
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
                             <span className="text-[10px] text-indigo-600 font-black">{plan.price.toLocaleString()}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FCFA / mois</span>
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
                        <p className="text-xs font-bold text-slate-900">{plan.student_limit.toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Limite Staff</p>
                        <p className="text-xs font-bold text-slate-900">{plan.staff_limit.toLocaleString()}</p>
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
                        <p className="text-xs text-indigo-600 font-black">{plan.price.toLocaleString()} FCFA / mois</p>
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
                    <th className="text-left p-6 text-xs font-bold text-slate-500 uppercase border-b border-slate-100 min-w-[250px]">Fonctionnalité</th>
                    {plans.map(plan => (
                      <th key={plan.id} className={cn(
                        "p-6 text-center text-xs font-bold uppercase border-b border-slate-100",
                        plan.active ? "text-slate-900" : "text-slate-400 italic"
                      )}>
                        {plan.name} {!plan.active && <span className="block text-[8px] mt-1 text-rose-400 font-black">(INACTIF)</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {APP_FEATURES.map((feature) => (
                    <tr key={feature.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="p-6 border-b border-slate-100">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{feature.name}</p>
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{feature.category}</p>
                        </div>
                      </td>
                      {plans.map(plan => (
                        <td key={plan.id} className="p-6 text-center border-b border-slate-100">
                          <button 
                            onClick={() => toggleFeature(plan.id, feature.id)}
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center transition-all mx-auto",
                              featureMatrix[plan.id]?.includes(feature.id)
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-100 text-slate-300 hover:bg-rose-50 hover:text-rose-400"
                            )}
                          >
                            {featureMatrix[plan.id]?.includes(feature.id) ? <Check size={18} /> : <X size={18} />}
                          </button>
                        </td>
                      ))}
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

      {isModalOpen && editingPlan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900">Configuration du Plan</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nom de l'offre</label>
                <input 
                  type="text" 
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  placeholder="ex: Premium Plus"
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Prix Mensuel (FCFA)</label>
                  <input 
                    type="number" 
                    value={editingPlan.price}
                    onChange={(e) => setEditingPlan({ ...editingPlan, price: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Statut Initial</label>
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl h-[52px]">
                    <span className="text-xs font-bold text-slate-600">Actif</span>
                    <button 
                      onClick={() => setEditingPlan({ ...editingPlan, active: !editingPlan.active })}
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Limite Élèves</label>
                  <input 
                    type="number" 
                    value={editingPlan.student_limit}
                    onChange={(e) => setEditingPlan({ ...editingPlan, student_limit: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Limite Staff</label>
                  <input 
                    type="number" 
                    value={editingPlan.staff_limit}
                    onChange={(e) => setEditingPlan({ ...editingPlan, staff_limit: parseInt(e.target.value) || 0 })}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <button 
                onClick={savePlanConfig}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Enregistrer la configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

