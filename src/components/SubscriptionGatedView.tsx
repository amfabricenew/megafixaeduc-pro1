import React from 'react';
import { Crown, Sparkles, ArrowRight, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../utils/subscriptions';
import { useAuth } from '../contexts/AuthContext';

interface SubscriptionGatedViewProps {
  path: string;
  currentPlan?: SubscriptionPlan | string;
}

export default function SubscriptionGatedView({ path, currentPlan = 'starter' }: SubscriptionGatedViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isFonde = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'fonde';

  const planKey = (currentPlan in SUBSCRIPTION_PLANS ? currentPlan : 'starter') as SubscriptionPlan;
  const currentPlanDetails = SUBSCRIPTION_PLANS[planKey];

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-3xl shadow-xl p-8 sm:p-10 text-center relative overflow-hidden">
        
        {/* Glow ambient background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md shadow-amber-500/10 ring-8 ring-amber-50">
          <Crown className="w-8 h-8" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-black uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Fonctionnalité Premium
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Module non inclus dans votre formule actuelle
        </h2>

        <p className="text-slate-600 text-sm mt-3 leading-relaxed max-w-lg mx-auto">
          Votre établissement est actuellement sous la <strong className="text-slate-900 font-bold">{currentPlanDetails.name}</strong>. 
          Pour débloquer l'accès à ce module et à toutes ses fonctionnalités associées, veuillez mettre à niveau l'abonnement de votre établissement.
        </p>

        {/* Feature comparison highlights */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Votre formule</span>
            </div>
            <p className="font-extrabold text-slate-800 text-sm">{currentPlanDetails.name}</p>
            <p className="text-xs text-slate-500 mt-1">{currentPlanDetails.maxStudents}</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-2 border-amber-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                Formule Recommandée
              </span>
            </div>
            <p className="font-extrabold text-amber-950 text-sm">Formule Académique ou Excellence</p>
            <p className="text-xs text-amber-800 mt-1">Débloque la gestion des cartes, finances, salaires & IA</p>
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
