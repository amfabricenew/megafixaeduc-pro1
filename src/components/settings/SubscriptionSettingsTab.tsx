import React, { useState, useEffect } from 'react';
import { 
  Crown, 
  Check, 
  Sparkles, 
  Key, 
  ShieldCheck, 
  Calendar, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  ExternalLink,
  Zap,
  Building2,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../../utils/api';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../../utils/subscriptions';
import { useTranslation } from '../../contexts/TranslationContext';

interface SchoolSubData {
  plan: string;
  statut: string;
  date_fin: string | null;
  school_nom: string;
  subscription_key?: string;
  license?: {
    license_key: string;
    plan_name: string;
    amount?: number;
    currency?: string;
    expires_at?: string;
    status: string;
    created_at?: string;
  } | null;
}

export default function SubscriptionSettingsTab() {
  const { language, t } = useTranslation();
  const [subData, setSubData] = useState<SchoolSubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activatingKey, setActivatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // Fetch school subscription
      const res = await apiFetch('/api/school-subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Also fetch license details if available
        let licenseData = null;
        try {
          const licRes = await apiFetch('/api/school-subscription/my-license', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (licRes.ok) {
            licenseData = await licRes.json();
          }
        } catch {
          // ignore
        }

        setSubData({
          plan: data.plan || 'standard',
          statut: data.statut || 'actif',
          date_fin: data.date_fin || null,
          school_nom: data.school_nom || '',
          subscription_key: licenseData?.subscription_key || null,
          license: licenseData?.license || null
        });
      }
    } catch (err: any) {
      console.error("Erreur récupération abonnement:", err);
      toast.error(language === 'en' ? "Failed to load subscription details" : "Erreur lors du chargement de l'abonnement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  const handleActivateLicenseKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      toast.error(language === 'en' ? "Please enter a license key" : "Veuillez saisir une clé d'abonnement");
      return;
    }

    try {
      setActivatingKey(true);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/subscriptions/activate-key', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          license_key: licenseKeyInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          data.message || (
            language === 'en' 
              ? "License key activated successfully! All plan features are now active." 
              : "Clé d'abonnement activée avec succès ! Les fonctionnalités de la formule sont débloquées."
          )
        );
        setLicenseKeyInput('');
        await fetchSubscription();
        // Notify app to refresh permissions & caches
        window.dispatchEvent(new Event('school_subscription_updated'));
      } else {
        toast.error(data.error || (language === 'en' ? "Invalid license key" : "Clé invalide ou déjà utilisée"));
      }
    } catch (err: any) {
      toast.error(err.message || (language === 'en' ? "Network error" : "Erreur réseau"));
    } finally {
      setActivatingKey(false);
    }
  };

  const handleSwitchPlan = async (targetPlan: SubscriptionPlan) => {
    if (subData?.plan === targetPlan) return;

    const planLabel = SUBSCRIPTION_PLANS[targetPlan]?.name || targetPlan;
    const confirmPrompt = language === 'en'
      ? `Switch subscription plan to "${planLabel}"?`
      : `Voulez-vous basculer l'abonnement de votre école vers "${planLabel}" ?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setUpdatingPlan(targetPlan);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/school-subscription', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: targetPlan,
          statut: 'actif'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          language === 'en'
            ? `Plan upgraded to ${targetPlan.toUpperCase()}!`
            : `Formule mise à niveau vers ${targetPlan.toUpperCase()} avec succès !`
        );
        await fetchSubscription();
        window.dispatchEvent(new Event('school_subscription_updated'));
      } else {
        toast.error(data.error || (language === 'en' ? "Update failed" : "Erreur lors de la mise à jour"));
      }
    } catch (err: any) {
      toast.error(err.message || (language === 'en' ? "Network error" : "Erreur réseau"));
    } finally {
      setUpdatingPlan(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success(language === 'en' ? "Copied to clipboard!" : "Copié dans le presse-papiers !");
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const currentPlan = (subData?.plan?.toLowerCase() as SubscriptionPlan) || 'standard';
  const isExpired = subData?.date_fin && new Date(subData.date_fin) < new Date();

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Top Banner / Hero */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Crown size={14} className="text-amber-400" />
                {language === 'en' ? 'School Subscription' : 'Formule & Abonnement École'}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                isExpired 
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/30' 
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
              }`}>
                {isExpired 
                  ? (language === 'en' ? 'Expired' : 'Expiré') 
                  : (language === 'en' ? 'Active' : 'Actif')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {subData?.school_nom || (language === 'en' ? 'Your School' : 'Votre Établissement Scolaire')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {language === 'en'
                ? "Manage your active subscription formula, unlock school modules, or activate an official license key."
                : "Consultez votre formule d'abonnement en cours, basculez entre les plans ou activez une clé de licence officielle."}
            </p>
          </div>

          <button
            onClick={fetchSubscription}
            disabled={loading}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl text-xs font-bold text-white flex items-center gap-2 transition-all shrink-0"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>{language === 'en' ? 'Refresh' : 'Actualiser'}</span>
          </button>
        </div>

        {/* Current status summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-white/10">
          <div className="p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'en' ? 'Current Formula' : 'Formule Actuelle'}
            </span>
            <p className="text-lg font-black text-amber-300 mt-1 uppercase">
              {subData?.plan || 'STANDARD'}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              {SUBSCRIPTION_PLANS[currentPlan]?.name || 'Standard'}
            </p>
          </div>

          <div className="p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'en' ? 'Validity / Expiry Date' : 'Validité & Échéance'}
            </span>
            <p className="text-lg font-black text-white mt-1">
              {subData?.date_fin 
                ? new Date(subData.date_fin).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : (language === 'en' ? 'Unlimited / Ongoing' : 'Illimitée')}
            </p>
            <p className={`text-xs mt-0.5 font-medium ${isExpired ? 'text-rose-300' : 'text-emerald-300'}`}>
              {isExpired 
                ? (language === 'en' ? 'Renewal required' : 'Renouvellement requis') 
                : (language === 'en' ? 'Fully operational' : 'Fonctionnel & à jour')}
            </p>
          </div>

          <div className="p-4 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {language === 'en' ? 'License Key / Ref' : 'Clé de Licence Active'}
            </span>
            {subData?.subscription_key ? (
              <div className="flex items-center justify-between gap-2 mt-1">
                <span className="font-mono text-xs font-bold text-slate-200 truncate">
                  {subData.subscription_key}
                </span>
                <button
                  onClick={() => copyToClipboard(subData.subscription_key!)}
                  className="p-1 hover:bg-white/10 rounded text-slate-300 hover:text-white"
                  title="Copier"
                >
                  {copiedKey ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mt-1 italic">
                {language === 'en' ? 'Direct school subscription' : 'Abonnement direct établissement'}
              </p>
            )}
            <p className="text-[11px] text-slate-400 mt-0.5">
              {language === 'en' ? 'SQLite Local Database' : 'Base SQLite locale'}
            </p>
          </div>
        </div>
      </div>

      {/* License Key Activation Box */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Key size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-lg">
              {language === 'en' ? 'Activate a Subscription License Key' : "Activer une Clé d'Abonnement"}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'en'
                ? "Enter your license key provided by the administration or invoice to instantly unlock your school formula."
                : "Saisissez votre clé fournie lors de l'achat ou sur votre reçu pour renouveler ou débloquer votre formule."}
            </p>
          </div>
        </div>

        <form onSubmit={handleActivateLicenseKey} className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <div className="relative flex-1 w-full">
            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value.toUpperCase())}
              placeholder={language === 'en' ? "e.g. M2-F6K1W-ET1R-P0LX-1BQV" : "ex: M2-F6K1W-ET1R-P0LX-1BQV"}
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-slate-800 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={activatingKey || !licenseKeyInput.trim()}
            className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs sm:text-sm font-black rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 shrink-0"
          >
            {activatingKey ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <ShieldCheck size={16} />
            )}
            <span>{language === 'en' ? 'Activate License' : 'Activer la Clé'}</span>
          </button>
        </form>
      </div>

      {/* Available Plans Selector / Comparison */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              {language === 'en' ? 'Formulas & Tier Gating' : 'Formules d\'Abonnement & Niveaux d\'Accès'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'en'
                ? 'Select a plan below to upgrade or switch your school formula.'
                : 'Sélectionnez une formule ci-dessous pour changer instantanément de formule.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Starter Plan */}
          <div className={`bg-white rounded-3xl border-2 p-6 flex flex-col justify-between transition-all ${
            currentPlan === 'starter'
              ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-lg'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                  Starter
                </span>
                {currentPlan === 'starter' && (
                  <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={12} /> {language === 'en' ? 'Current' : 'En cours'}
                  </span>
                )}
              </div>
              <h4 className="text-xl font-black text-slate-900">{SUBSCRIPTION_PLANS.starter.name}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">{SUBSCRIPTION_PLANS.starter.tagline}</p>

              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-900">{SUBSCRIPTION_PLANS.starter.price}</span>
                  <span className="text-xs text-slate-400 font-medium">{SUBSCRIPTION_PLANS.starter.period}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{SUBSCRIPTION_PLANS.starter.maxStudents}</p>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {language === 'en' ? 'Included features:' : 'Inclus dans Starter :'}
                </p>
                {SUBSCRIPTION_PLANS.starter.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="stroke-[3]" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSwitchPlan('starter')}
              disabled={currentPlan === 'starter' || updatingPlan !== null}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                currentPlan === 'starter'
                  ? 'bg-blue-50 text-blue-700 cursor-default border border-blue-200'
                  : 'bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-800'
              }`}
            >
              {updatingPlan === 'starter' && <RefreshCw size={14} className="animate-spin" />}
              <span>{currentPlan === 'starter' ? (language === 'en' ? 'Current Formula' : 'Formule Active') : (language === 'en' ? 'Switch to Starter' : 'Activer Starter')}</span>
            </button>
          </div>

          {/* Standard Plan */}
          <div className={`bg-white rounded-3xl border-2 p-6 flex flex-col justify-between transition-all ${
            currentPlan === 'standard'
              ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  Académique Standard
                </span>
                {currentPlan === 'standard' && (
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={12} /> {language === 'en' ? 'Current' : 'En cours'}
                  </span>
                )}
              </div>
              <h4 className="text-xl font-black text-slate-900">{SUBSCRIPTION_PLANS.standard.name}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">{SUBSCRIPTION_PLANS.standard.tagline}</p>

              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-emerald-900">{SUBSCRIPTION_PLANS.standard.price}</span>
                  <span className="text-xs text-slate-400 font-medium">{SUBSCRIPTION_PLANS.standard.period}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{SUBSCRIPTION_PLANS.standard.maxStudents}</p>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {language === 'en' ? 'Starter features, plus:' : 'Tout Starter, plus :'}
                </p>
                {SUBSCRIPTION_PLANS.standard.features.slice(1).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="stroke-[3]" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSwitchPlan('standard')}
              disabled={currentPlan === 'standard' || updatingPlan !== null}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                currentPlan === 'standard'
                  ? 'bg-emerald-50 text-emerald-700 cursor-default border border-emerald-200'
                  : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-800'
              }`}
            >
              {updatingPlan === 'standard' && <RefreshCw size={14} className="animate-spin" />}
              <span>{currentPlan === 'standard' ? (language === 'en' ? 'Current Formula' : 'Formule Active') : (language === 'en' ? 'Switch to Standard' : 'Activer Standard')}</span>
            </button>
          </div>

          {/* Excellence Plan */}
          <div className={`bg-white rounded-3xl border-2 p-6 flex flex-col justify-between transition-all ${
            currentPlan === 'excellence'
              ? 'border-amber-500 ring-4 ring-amber-500/10 shadow-lg'
              : 'border-slate-200 hover:border-slate-300 shadow-xs'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full flex items-center gap-1">
                  <Crown size={12} className="text-amber-600" />
                  Excellence Pro
                </span>
                {currentPlan === 'excellence' && (
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check size={12} /> {language === 'en' ? 'Current' : 'En cours'}
                  </span>
                )}
              </div>
              <h4 className="text-xl font-black text-slate-900">{SUBSCRIPTION_PLANS.excellence.name}</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">{SUBSCRIPTION_PLANS.excellence.tagline}</p>

              <div className="mb-4 pb-4 border-b border-slate-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-amber-900">{SUBSCRIPTION_PLANS.excellence.price}</span>
                  <span className="text-xs text-slate-400 font-medium">{SUBSCRIPTION_PLANS.excellence.period}</span>
                </div>
                <p className="text-[11px] text-amber-700 font-medium mt-0.5">{SUBSCRIPTION_PLANS.excellence.maxStudents}</p>
              </div>

              <div className="space-y-2 mb-6">
                <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  {language === 'en' ? 'Standard features, plus:' : 'Tout Standard, plus :'}
                </p>
                {SUBSCRIPTION_PLANS.excellence.features.slice(1).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={10} className="stroke-[3]" />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleSwitchPlan('excellence')}
              disabled={currentPlan === 'excellence' || updatingPlan !== null}
              className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                currentPlan === 'excellence'
                  ? 'bg-amber-50 text-amber-800 cursor-default border border-amber-200'
                  : 'bg-slate-100 hover:bg-amber-600 hover:text-white text-slate-800'
              }`}
            >
              {updatingPlan === 'excellence' && <RefreshCw size={14} className="animate-spin" />}
              <span>{currentPlan === 'excellence' ? (language === 'en' ? 'Current Formula' : 'Formule Active') : (language === 'en' ? 'Switch to Excellence' : 'Activer Excellence')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Gating Comparison Matrix */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h4 className="font-black text-slate-900 text-base">
            {language === 'en' ? 'Module Availability Matrix' : 'Matrice de Déblocage des Modules par Formule'}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {language === 'en'
              ? 'Detailed breakdown of modules accessible for each subscription plan.'
              : 'Détail des modules et accès réservés selon la formule active de votre établissement.'}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
              <tr>
                <th className="py-3 px-6">{language === 'en' ? 'Module / Capability' : 'Module / Fonctionnalité'}</th>
                <th className="py-3 px-4 text-center">Starter</th>
                <th className="py-3 px-4 text-center">Standard</th>
                <th className="py-3 px-4 text-center">Excellence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {[
                { name: 'Pédagogie (Classes, Matières, Élèves, Notes)', starter: true, standard: true, excellence: true },
                { name: 'Bulletins de notes officiels PDF & Calculs', starter: true, standard: true, excellence: true },
                { name: 'Emplois du temps hebdomadaires', starter: true, standard: true, excellence: true },
                { name: 'Espace Parent sécurisé (Mon Enfant)', starter: true, standard: true, excellence: true },
                { name: 'Cartes Scolaires & Badges QR Code imprimables', starter: false, standard: true, excellence: true },
                { name: 'Passages, Redoublements & Décisions de fin d\'année', starter: false, standard: true, excellence: true },
                { name: 'Gestion du Personnel Administratif & Postes', starter: false, standard: true, excellence: true },
                { name: 'Banque d\'épreuves et compositions', starter: false, standard: true, excellence: true },
                { name: 'Module Finances (Tranches, Frais de Scolarité, Reçus)', starter: false, standard: false, excellence: true },
                { name: 'Gestion des Salaires & Paie du Personnel Enseignant', starter: false, standard: false, excellence: true },
                { name: 'Journal d\'Audit & Traçabilité Complète des Opérations', starter: false, standard: false, excellence: true },
                { name: 'Assistant IA Gemini pour Synthèses Pédagogiques', starter: false, standard: false, excellence: true },
                { name: 'Capacité d\'élèves maximale', starter: '300 élèves', standard: '1 000 élèves', excellence: 'Illimitée' },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-6 font-semibold text-slate-800">{row.name}</td>
                  <td className="py-3.5 px-4 text-center">
                    {typeof row.starter === 'boolean' ? (
                      row.starter ? (
                        <div className="w-5 h-5 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                          <Lock size={11} />
                        </div>
                      )
                    ) : (
                      <span className="font-bold text-slate-600">{row.starter}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {typeof row.standard === 'boolean' ? (
                      row.standard ? (
                        <div className="w-5 h-5 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                          <Lock size={11} />
                        </div>
                      )
                    ) : (
                      <span className="font-bold text-emerald-700">{row.standard}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {typeof row.excellence === 'boolean' ? (
                      row.excellence ? (
                        <div className="w-5 h-5 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Check size={12} className="stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                          <Lock size={11} />
                        </div>
                      )
                    ) : (
                      <span className="font-bold text-amber-700">{row.excellence}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
