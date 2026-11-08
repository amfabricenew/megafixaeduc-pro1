import React, { useState, useEffect } from 'react';
import { 
  Check, 
  X, 
  Zap, 
  Shield, 
  Crown, 
  Building2,
  Users,
  CreditCard,
  Loader2
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import { APP_FEATURES } from '../../constants/productFeatures';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PlansCatalog() {
  const [plans, setPlans] = useState<any[]>([]);
  const [featureMatrix, setFeatureMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/api/admin/product-config');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
        setFeatureMatrix(data.featureMatrix || {});
      }
    } catch (err) {
      console.error("Failed to fetch product data", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlanIcon = (index: number) => {
    switch (index) {
      case 0: return <Zap className="text-amber-500" size={24} />;
      case 1: return <Shield className="text-indigo-500" size={24} />;
      case 2: return <Crown className="text-purple-500" size={24} />;
      default: return <Building2 className="text-slate-500" size={24} />;
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Catalogue des Offres & Services</h1>
        <p className="text-slate-500 leading-relaxed">
          Vue d'ensemble comparative de toutes les fonctionnalités disponibles par palier d'abonnement. 
          Idéal pour le conseil commercial et l'orientation des établissements.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, index) => {
          const enabledFeatures = featureMatrix[plan.id] || [];
          
          return (
            <div 
              key={plan.id} 
              className={cn(
                "relative bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-xl hover:-translate-y-1",
                !plan.active && "opacity-60 grayscale"
              )}
            >
              {!plan.active && (
                <div className="absolute top-4 right-4 px-2 py-1 bg-slate-200 text-slate-500 rounded text-[8px] font-black uppercase tracking-tighter z-10">
                  Inactif
                </div>
              )}
              
              <div className="p-8 space-y-6 flex-1">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center shadow-inner">
                    {getPlanIcon(index)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-xl">{plan.name}</h3>
                    <p className="text-indigo-600 font-black text-sm">{plan.price.toLocaleString()} FCFA <span className="text-slate-400 font-medium">/mois</span></p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-2xl text-center">
                    <Users className="mx-auto mb-1 text-slate-400" size={16} />
                    <p className="text-xs font-black text-slate-900">{plan.student_limit}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-none mt-1">Élèves</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl text-center">
                    <Shield className="mx-auto mb-1 text-slate-400" size={16} />
                    <p className="text-xs font-black text-slate-900">{plan.staff_limit}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter leading-none mt-1">Staff</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fonctionnalités Incluses</p>
                  <div className="space-y-2.5">
                    {APP_FEATURES.map((feature) => {
                      const isEnabled = enabledFeatures.includes(feature.id);
                      return (
                        <div key={feature.id} className="flex items-start gap-3 group">
                          <div className={cn(
                            "mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors",
                            isEnabled ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"
                          )}>
                            {isEnabled ? <Check size={10} strokeWidth={4} /> : <X size={10} strokeWidth={4} />}
                          </div>
                          <span className={cn(
                            "text-xs leading-tight transition-colors",
                            isEnabled ? "text-slate-700 font-medium" : "text-slate-400"
                          )}>
                            {feature.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  disabled={!plan.active}
                  className={cn(
                    "w-full py-3 rounded-2xl text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2",
                    plan.active 
                      ? "bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700 hover:shadow-indigo-200" 
                      : "bg-slate-200 text-slate-400 shadow-none cursor-not-allowed"
                  )}
                >
                  <CreditCard size={16} />
                  Simuler Inscription
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
