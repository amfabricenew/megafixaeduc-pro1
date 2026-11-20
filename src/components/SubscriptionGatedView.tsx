import React, { useEffect, useState } from 'react';
import { Crown, Sparkles, ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionPlan, SchoolPlanDetails, formatStudentLimit, formatStaffLimit } from '../utils/subscriptions';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionGatedViewProps {
  path: string;
  currentPlan?: SchoolPlanDetails | SubscriptionPlan | string;
}

export default function SubscriptionGatedView({ path, currentPlan = '' }: SubscriptionGatedViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFonde = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'fonde';
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/public/config')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data?.plans)) setPlans(data.plans);
      })
      .catch(() => {});
  }, []);

  const planObj = typeof currentPlan === 'object' && currentPlan !== null ? currentPlan : null;
  const planName = planObj ? planObj.name : String(currentPlan || '');
  const target = planName.toLowerCase().trim();
  const matchedPlan = plans.find(p => (p.name || '').toLowerCase().trim() === target || String(p.id).toLowerCase() === target);
  const recommendedPlan = plans.find(p => p.is_recommended) || plans[plans.length - 1];
  const currentPlanLabel = matchedPlan?.name || planName || 'Formule actuelle';

  const rawStudentLimit = planObj ? planObj.student_limit : matchedPlan?.student_limit;
  const rawStaffLimit = planObj ? planObj.staff_limit : matchedPlan?.staff_limit;
  const currentStudentLimit = rawStudentLimit !== undefined
    ? `${formatStudentLimit(rawStudentLimit)} • ${formatStaffLimit(rawStaffLimit ?? 0)}`
    : 'Selon configuration super-admin';

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-2 sm:p-4">
      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-6 sm:p-10 text-center relative overflow-hidden">
        
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-amber-500/10 ring-8 ring-amber-50">
          <Crown className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-black uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Module Non Inclus
        </div>

        <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Module non actif dans votre formule actuelle
        </h2>

        <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-lg mx-auto">
          Votre établissement est actuellement sous la formule <strong className="text-slate-900 font-bold">{currentPlanLabel}</strong>. 
          Cette fonctionnalité n'est pas activée dans cette offre. Veuillez mettre à niveau votre abonnement pour y accéder.
        </p>

        {/* Feature comparison highlights */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Votre formule</span>
            </div>
            <p className="font-extrabold text-slate-800 text-sm">{currentPlanLabel}</p>
            <p className="text-xs text-slate-500 mt-1">{currentStudentLimit}</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-2 border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                Formule Recommandée
              </span>
            </div>
            <p className="font-extrabold text-amber-950 text-sm">{recommendedPlan?.name || 'Formule supérieure configurée'}</p>
            <p className="text-xs text-amber-800 mt-1">
              {recommendedPlan
                ? `${Number(recommendedPlan.price).toLocaleString('fr-FR')} FCFA / ${recommendedPlan.period || 'mois'}`
                : 'Consultez les formules configurées par le super-admin'}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/accueil')}
            className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'accueil</span>
          </button>

          {isFonde ? (
            <button
              type="button"
              onClick={() => navigate('/parametres?tab=subscription')}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-sm transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              <span>Mettre à niveau l'abonnement</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="text-xs text-slate-500 italic p-2">
              Veuillez contacter le Fondé ou la Direction pour l'activation de ce module.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
