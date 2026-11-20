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
import { useTranslation } from '../../contexts/TranslationContext';
import {
  APP_FEATURES,
  resolvePlanFeatureIds,
  formatStudentLimit,
  formatStaffLimit,
} from '../../constants/productFeatures';

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
  const { language } = useTranslation();
  const [subData, setSubData] = useState<SchoolSubData | null>(null);
  const [configuredPlans, setConfiguredPlans] = useState<any[]>([]);
  const [currencyLabel, setCurrencyLabel] = useState('FCFA');
  const [loading, setLoading] = useState(true);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [activatingKey, setActivatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const [subRes, cfgRes] = await Promise.all([
        apiFetch('/api/school-subscription', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        apiFetch('/api/public/config')
      ]);

      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (Array.isArray(cfgData?.plans)) {
          setConfiguredPlans(cfgData.plans);
        }
        if (cfgData?.config?.currency || cfgData?.currency) {
          setCurrencyLabel(cfgData?.config?.currency || cfgData?.currency);
        }
      }

      if (subRes.ok) {
        const data = await subRes.json();
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
          plan: data.plan || '',
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

  const handleSwitchPlan = async (targetPlan: any) => {
    const planLabel = targetPlan?.name || String(targetPlan);
    if ((subData?.plan || '').toLowerCase().trim() === planLabel.toLowerCase().trim()) return;

    const confirmPrompt = language === 'en'
      ? `Switch subscription plan to "${planLabel}"?`
      : `Voulez-vous basculer l'abonnement de votre école vers "${planLabel}" ?`;

    if (!window.confirm(confirmPrompt)) return;

    try {
      setUpdatingPlan(planLabel);
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/school-subscription', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: planLabel,
          statut: 'actif'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(
          language === 'en'
            ? `Plan upgraded to ${planLabel}!`
            : `Formule mise à niveau vers ${planLabel} avec succès !`
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

  const rawPlanLower = (subData?.plan || '').toLowerCase().trim();
  const matchedCurrentPlan =
    configuredPlans.find(p => (p.name || '').toLowerCase().trim() === rawPlanLower || String(p.id).toLowerCase() === rawPlanLower) ||
    configuredPlans.find(p => rawPlanLower && ((p.name || '').toLowerCase().includes(rawPlanLower) || rawPlanLower.includes((p.name || '').toLowerCase()))) ||
    null;
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
                : "Consultez votre formule d'abonnement en cours, basculez entre les plans configurés par la plateforme ou activez une clé de licence officielle."}
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
              {matchedCurrentPlan?.name || subData?.plan || 'Non définie'}
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              {matchedCurrentPlan
                ? (Number(matchedCurrentPlan.price) === 0
                  ? `Gratuit • ${matchedCurrentPlan.period || 'essai'}`
                  : `${Number(matchedCurrentPlan.price).toLocaleString('fr-FR')} ${currencyLabel} / ${matchedCurrentPlan.period || 'mois'}`)
                : 'Offre configurée Super Admin'}
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

        {configuredPlans.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-sm text-slate-500">
            {language === 'en' ? 'No active plans configured yet.' : "Aucune formule d'abonnement active configurée par le super-admin."}
          </div>
        ) : (
          <div className={`grid grid-cols-1 ${configuredPlans.length <= 2 ? 'lg:grid-cols-2' : configuredPlans.length >= 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
            {configuredPlans.map((plan) => {
              const isCurrent = matchedCurrentPlan
                ? String(matchedCurrentPlan.id) === String(plan.id)
                : rawPlanLower === (plan.name || '').toLowerCase().trim();
              const isFree = Number(plan.price) === 0 || plan.type === 'trial';
              const isRec = Boolean(plan.is_recommended);
              const activeIds = resolvePlanFeatureIds(plan.features, plan.featureIds, plan.name);
              const displayFeats: string[] = Array.isArray(plan.features) && plan.features.length > 0
                ? plan.features
                : APP_FEATURES.filter((f) => activeIds.includes(f.id)).map((f) => f.name);
              const maxStudentsLabel = `${formatStudentLimit(plan.student_limit)} • ${formatStaffLimit(plan.staff_limit ?? 0)}`;

              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-3xl border-2 p-6 flex flex-col justify-between transition-all ${
                    isCurrent
                      ? 'border-emerald-500 ring-4 ring-emerald-500/10 shadow-lg'
                      : isRec
                        ? 'border-indigo-200 hover:border-indigo-400 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                        isRec
                          ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
                          : isFree
                            ? 'text-blue-700 bg-blue-50 border-blue-200'
                            : 'text-amber-800 bg-amber-50 border-amber-200'
                      }`}>
                        {isRec ? 'Recommandée' : isFree ? 'Découverte' : 'Offre Pro'}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check size={12} /> {language === 'en' ? 'Current' : 'En cours'}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xl font-black text-slate-900">{plan.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      {plan.description || (isFree ? 'Offre de découverte' : 'Formule configurée par le super-admin')}
                    </p>

                    <div className="mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">
                          {isFree ? 'Gratuit' : `${Number(plan.price).toLocaleString('fr-FR')} ${currencyLabel}`}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">/ {plan.period || 'mois'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">{maxStudentsLabel}</p>
                    </div>

                    <div className="space-y-2 mb-6">
                      <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                        {language === 'en' ? 'Included features:' : `Fonctionnalités actives (${displayFeats.length}) :`}
                      </p>
                      {displayFeats.map((f, i) => (
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
                    onClick={() => handleSwitchPlan(plan)}
                    disabled={isCurrent || updatingPlan !== null}
                    className={`w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                      isCurrent
                        ? 'bg-emerald-50 text-emerald-700 cursor-default border border-emerald-200'
                        : 'bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800'
                    }`}
                  >
                    {updatingPlan === plan.name && <RefreshCw size={14} className="animate-spin" />}
                    <span>
                      {isCurrent
                        ? (language === 'en' ? 'Current Formula' : 'Formule Active')
                        : (language === 'en' ? `Switch to ${plan.name}` : `Activer ${plan.name}`)}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Comparison Matrix across Configured Plans */}
      {configuredPlans.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h4 className="font-black text-slate-900 text-base">
              {language === 'en' ? 'Configured Plans Overview' : 'Comparatif des Formules Configurées'}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === 'en'
                ? 'Tariffs and features published directly by platform administration.'
                : 'Tarifs, capacités et fonctionnalités publiés par le super-administrateur.'}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-6">{language === 'en' ? 'Criteria / Feature' : 'Critère / Fonctionnalité'}</th>
                  {configuredPlans.map((p) => (
                    <th key={p.id} className="py-3 px-4 text-center">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-6 font-semibold text-slate-800">Tarif</td>
                  {configuredPlans.map((p) => (
                    <td key={p.id} className="py-3.5 px-4 text-center font-black text-slate-900">
                      {Number(p.price) === 0 ? `Gratuit / ${p.period || 'essai'}` : `${Number(p.price).toLocaleString('fr-FR')} ${currencyLabel} / ${p.period || 'mois'}`}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-6 font-semibold text-slate-800">Capacité d'élèves maximale</td>
                  {configuredPlans.map((p) => (
                    <td key={p.id} className="py-3.5 px-4 text-center font-bold text-indigo-700">
                      {formatStudentLimit(p.student_limit)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-6 font-semibold text-slate-800">Capacité personnel & staff</td>
                  {configuredPlans.map((p) => (
                    <td key={p.id} className="py-3.5 px-4 text-center font-bold text-emerald-700">
                      {formatStaffLimit(p.staff_limit ?? 0)}
                    </td>
                  ))}
                </tr>
                {APP_FEATURES.map((feat) => (
                  <tr key={feat.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-800">{feat.name}</td>
                    {configuredPlans.map((p) => {
                      const activeIds = resolvePlanFeatureIds(p.features, p.featureIds, p.name);
                      const included = activeIds.includes(feat.id);
                      return (
                        <td key={p.id} className="py-3.5 px-4 text-center">
                          {included ? (
                            <div className="w-5 h-5 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                              <Check size={12} className="stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                              <Lock size={11} />
                            </div>
                          )}
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
    </div>
  );
}
