import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  GraduationCap,
  Mail,
  User,
  Building2,
  ArrowRight,
  ShieldCheck,
  Check,
  Crown,
  Info,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import SchoolCreationRequestModal from '../components/SchoolCreationRequestModal';
import { formatStudentLimit } from '../constants/productFeatures';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Signup() {
  const location = useLocation();
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Pre-fill values if arriving from redirect/CTA
  const [nom, setNom] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');

  // Subscription Plans loaded from Super Admin config
  const [configuredPlans, setConfiguredPlans] = useState<any[]>([]);
  const [currencyLabel, setCurrencyLabel] = useState('FCFA');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [unlinkedNotice, setUnlinkedNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const nomParam = params.get('nom');
    const planParam = params.get('plan') || '';

    if (emailParam) setEmail(emailParam);
    if (nomParam) setNom(nomParam);
    if (planParam) setSelectedPlan(planParam);

    fetch('/api/public/config')
      .then(res => res.json())
      .then(data => {
        if (data?.config?.currency || data?.currency) {
          setCurrencyLabel(data?.config?.currency || data?.currency);
        }
        if (Array.isArray(data?.plans) && data.plans.length > 0) {
          setConfiguredPlans(data.plans);
          const candidate = planParam.toLowerCase().trim();
          const matched =
            data.plans.find((p: any) => String(p.id).toLowerCase() === candidate || (p.name || '').toLowerCase().trim() === candidate) ||
            data.plans.find((p: any) => candidate && ((p.name || '').toLowerCase().includes(candidate) || candidate.includes((p.name || '').toLowerCase()))) ||
            data.plans.find((p: any) => p.is_recommended) ||
            data.plans[0];
          if (matched) setSelectedPlan(matched.name);
        }
      })
      .catch(err => console.warn('Could not load public plans in Signup:', err));

    if (location.state?.unlinkedNotice) {
      setUnlinkedNotice(location.state.unlinkedNotice);
    } else if (params.get('from') === 'login' || params.get('from') === 'google') {
      setUnlinkedNotice("Votre identifiant (email) n'est lié à aucun compte école existant. Remplissez une demande de création de compte école pour ouvrir votre espace.");
    }
  }, [location]);

  const handleOpenRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setShowRequestModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-5xl z-10 mb-4">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Mégafixa<span className="text-amber-400">Educ Pro</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mt-2 sm:mx-auto z-10 px-2 w-full max-w-4xl">
        <div className="bg-slate-900/80 backdrop-blur-2xl py-8 px-5 sm:px-10 shadow-2xl border border-slate-800 rounded-[2.5rem] space-y-6">

          {/* Security Notice: Password auto-generated */}
          <div className="p-5 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-100 text-xs font-medium flex items-start gap-3.5 shadow-lg">
            <ShieldCheck className="w-6 h-6 flex-shrink-0 text-emerald-400 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <p className="font-bold text-white text-sm">Ouverture de Compte École Sécurisée (Sous 24H)</p>
              <p className="text-emerald-100/90 leading-relaxed">
                La création d'un compte établissement s'effectue exclusivement par <strong className="text-white">Demande d'Ouverture Officielle</strong>.
                Aucun mot de passe n'est demandé lors de la soumission : un mot de passe unique et ultra-sécurisé sera généré automatiquement par le serveur lors de la validation et envoyé à votre email personnel ainsi qu'à l'email de votre école (si renseigné).
              </p>
            </div>
          </div>

          {unlinkedNotice && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-3">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white mb-0.5">Accès Création de Compte École</p>
                <p>{unlinkedNotice}</p>
              </div>
            </div>
          )}

          {/* Quick Pre-fill + Plan Preview */}
          <form onSubmit={handleOpenRequest} className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-black text-white">Préparer votre Demande d'Établissement</h2>
              <p className="text-slate-400 text-xs mt-1">
                Renseignez vos coordonnées de base et choisissez la formule souhaitée pour démarrer votre dossier.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nom du Fondateur / Admin</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="ex: Jean Koffi"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nom de l'Établissement</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="ex: CS Saint-Augustin"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Personnel Promoteur</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="promoteur@gmail.com"
                  />
                </div>
              </div>
            </div>

            {configuredPlans.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2">
                  <Crown size={14} className="text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300">Formules d'Abonnement Disponibles</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {configuredPlans.map((plan) => {
                    const isSelected = selectedPlan.toLowerCase() === (plan.name || '').toLowerCase() || String(plan.id) === selectedPlan;
                    const isFree = Number(plan.price) === 0 || plan.type === 'trial';
                    const feats: string[] = Array.isArray(plan.features) ? plan.features.slice(0, 4) : [];
                    return (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.name)}
                        className={cn(
                          "relative rounded-2xl p-4 border-2 transition-all cursor-pointer flex flex-col justify-between",
                          isSelected
                            ? "bg-emerald-950/30 border-emerald-500 shadow-lg shadow-emerald-500/15"
                            : "bg-slate-800/40 border-slate-700/80 hover:border-slate-600"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-black text-white">{plan.name}</h3>
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                              isSelected ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600"
                            )}>
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                          </div>
                          <p className="text-lg font-black text-amber-400">
                            {isFree ? 'Gratuit' : `${Number(plan.price).toLocaleString('fr-FR')} ${currencyLabel}`}
                            <span className="text-[11px] text-slate-400 font-bold ml-1">/ {plan.period || 'mois'}</span>
                          </p>
                          <p className="text-[10px] text-slate-400">{formatStudentLimit(plan.student_limit)}</p>
                          {feats.length > 0 && (
                            <ul className="space-y-1 pt-2 border-t border-slate-700/50">
                              {feats.map((f, i) => (
                                <li key={i} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                                  <CheckCircle2 size={11} className="text-emerald-400 shrink-0" />
                                  <span className="truncate">{f}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-emerald-600/25 active:scale-[0.99] cursor-pointer"
            >
              <Sparkles size={18} />
              <span>Soumettre ma Demande de Création de Compte École</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Bottom Login Link */}
          <div className="pt-5 border-t border-slate-800/60 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Vous avez déjà un compte établissement actif ?{' '}
              <Link to="/login" className="font-black text-amber-400 hover:text-amber-300 transition-colors ml-1">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>

      <SchoolCreationRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        defaultEmail={email}
        defaultNom={nom}
        defaultSchoolName={schoolName}
        defaultPlan={selectedPlan}
      />
    </div>
  );
}
