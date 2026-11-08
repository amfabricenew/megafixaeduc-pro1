import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  KeyRound,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  Check,
  CheckCircle2,
  CheckCheck,
  Crown,
  Zap,
  Shield,
  Info
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';
import PasswordStrengthMeter, { evaluatePassword } from '../components/PasswordStrengthMeter';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '../utils/subscriptions';
import SchoolCreationRequestModal from '../components/SchoolCreationRequestModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Step 1: Admin & School info
  const [nom, setNom] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Step 2: Subscription Plan
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('standard');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unlinkedNotice, setUnlinkedNotice] = useState<string | null>(null);

  // Steps: 1: School Info, 2: Choose Plan, 3: OTP Verification
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [otpCode, setOtpCode] = useState('');
  const [simulatedOtpNotice, setSimulatedOtpNotice] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const nomParam = params.get('nom');
    const planParam = params.get('plan') as SubscriptionPlan;

    if (emailParam) setEmail(emailParam);
    if (nomParam) setNom(nomParam);
    if (planParam && (planParam === 'starter' || planParam === 'standard' || planParam === 'excellence')) {
      setSelectedPlan(planParam);
    }

    if (location.state?.unlinkedNotice) {
      setUnlinkedNotice(location.state.unlinkedNotice);
    } else if (params.get('from') === 'login' || params.get('from') === 'google') {
      setUnlinkedNotice("Votre identifiant (email) n'est lié à aucun compte école existant. Renseignez les informations de votre établissement ci-dessous pour créer votre espace.");
    }
  }, [location]);

  // Handle Step 1 validation -> go to Step 2 (Choose Plan)
  const handleNextToPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const notice = "momentanément indisponible, les créations de compte sont temporairement suspendues. Veuillez contacter l'administration.";
    setError(notice);
    toast.error(notice);
    return;
  };

  // Step 2 validation -> Redirect to payment page with configured methods
  const handleConfirmPlanAndSignup = () => {
    const notice = "momentanément indisponible, les créations de compte sont temporairement suspendues. Veuillez contacter l'administration.";
    setError(notice);
    toast.error(notice);
    return;
  };

  // Standard signup handler
  const handleFinalSignup = async (_planId?: string, _paymentMethod?: string) => {
    const notice = "momentanément indisponible, les créations de compte sont temporairement suspendues. Veuillez contacter l'administration.";
    setError(notice);
    toast.error(notice);
    return;
  };

  // Verify OTP handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, otp: otpCode }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Code OTP invalide ou expiré.');
        toast.error(data.error || 'Code invalide');
      } else {
        toast.success('Compte validé et connecté avec succès !');
        login(data.token, data.user);
        navigate('/accueil');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-5xl z-10 mb-2">
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

        {/* Step Indicator */}
        <div className="mt-6 flex items-center justify-center gap-3 px-4">
          {[
            { num: 1, label: 'Établissement' },
            { num: 2, label: 'Plan & Formule' },
            { num: 3, label: 'Validation' }
          ].map((s) => (
            <div key={s.num} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all",
                  step === s.num ? "bg-amber-500 text-slate-950 scale-110 shadow-lg shadow-amber-500/30" : 
                  step > s.num ? "bg-emerald-500 text-white" : "bg-slate-800 text-slate-500 border border-slate-700"
                )}>
                  {step > s.num ? <Check size={14} strokeWidth={3} /> : s.num}
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1 hidden sm:block">{s.label}</span>
              </div>
              {s.num < 3 && <div className={cn("w-6 sm:w-16 h-0.5 mx-2 rounded-full mb-3", step > s.num ? "bg-emerald-500" : "bg-slate-800")} />}
            </div>
          ))}
        </div>
      </div>

      {/* Main Container */}
      <div className={cn(
        "mt-4 sm:mx-auto z-10 px-2 transition-all duration-500 w-full",
        step === 2 ? "max-w-5xl" : "max-w-2xl"
      )}>
        <div className="bg-slate-900/80 backdrop-blur-2xl py-8 px-5 sm:px-10 shadow-2xl border border-slate-800 rounded-[2.5rem]">
          
          {/* Alerte Indisponibilité Momentanée */}
          <div className="mb-6 p-5 rounded-3xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-medium flex items-start gap-3.5 shadow-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="font-bold text-white text-sm">momentanément indisponible</p>
              <p className="text-amber-200/90 leading-relaxed">
                Les créations de compte directes sont temporairement suspendues. Pour ouvrir un compte officiel pour votre établissement, vous pouvez adresser directement une demande de création au Super Admin avec règlement Mobile Money (activation garantie sous 24H au plus).
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-400/30"
                >
                  <GraduationCap size={16} />
                  <span>Demande de création de compte école (Traitement 24H)</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          </div>
          {/* Notice when arriving with unlinked email */}
          {unlinkedNotice && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-start gap-3 animate-in fade-in duration-300">
              <Info className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white mb-0.5">Accès Création de Compte École</p>
                <p>{unlinkedNotice}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-3 animate-in fade-in duration-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <div className="flex-1">
                {error}
                {error.includes("déjà utilisé") && (
                  <Link to="/login" className="ml-2 font-black underline text-rose-400 hover:text-rose-300">
                    Connectez-vous ici →
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <form onSubmit={handleNextToPlan} className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <h2 className="text-xl font-black text-white">Création du Compte Établissement</h2>
                <p className="text-slate-400 text-xs mt-1">Créez l'accès administrateur principal pour gérer votre établissement.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nom & Prénom du Fondateur / Admin *</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={nom} 
                      onChange={(e) => setNom(e.target.value)} 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                      placeholder="ex: Jean Koffi" 
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nom Officiel de l'Établissement *</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      type="text" 
                      value={schoolName} 
                      onChange={(e) => setSchoolName(e.target.value)} 
                      required 
                      className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                      placeholder="ex: Complexe Scolaire Saint-Augustin" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Professionnel Direction *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                    placeholder="direction@ecole.com" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Mot de passe *</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input 
                      type={showPassword ? 'text' : 'password'} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="w-full pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                      placeholder="Min. 8 car. (Maj, min, chiffre)" 
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmer le mot de passe *</label>
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    required 
                    className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                    placeholder="Répétez le mot de passe" 
                  />
                </div>
              </div>

              {password && (
                <PasswordStrengthMeter password={password} />
              )}

              <button 
                type="submit" 
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-[0.99] mt-2 cursor-pointer"
              >
                <span>Étape suivante : Choisir ma formule d'abonnement</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: Choose Subscription Plan */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="text-center mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <Crown size={14} />
                  Plans d'Abonnement Fonctionnels
                </span>
                <h2 className="text-2xl font-black text-white">Choisissez la Formule de votre École</h2>
                <p className="text-slate-400 text-xs mt-1 max-w-lg mx-auto">
                  Sélectionnez l'offre adaptée à la taille et aux besoins de votre établissement scolaire.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(['starter', 'standard', 'excellence'] as SubscriptionPlan[]).map((planKey) => {
                  const plan = SUBSCRIPTION_PLANS[planKey];
                  const isSelected = selectedPlan === planKey;
                  const isPopular = planKey === 'standard';
                  const isExcellence = planKey === 'excellence';

                  return (
                    <div
                      key={planKey}
                      onClick={() => setSelectedPlan(planKey)}
                      className={cn(
                        "relative rounded-3xl p-6 border-2 transition-all cursor-pointer flex flex-col justify-between group",
                        isSelected 
                          ? isExcellence 
                            ? "bg-amber-950/30 border-amber-500 shadow-xl shadow-amber-500/20 scale-[1.02]"
                            : isPopular
                              ? "bg-emerald-950/30 border-emerald-500 shadow-xl shadow-emerald-500/20 scale-[1.02]"
                              : "bg-blue-950/30 border-blue-500 shadow-xl shadow-blue-500/20 scale-[1.02]"
                          : "bg-slate-800/40 border-slate-700/80 hover:border-slate-600 hover:bg-slate-800/70"
                      )}
                    >
                      {isPopular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                          Recommandé
                        </div>
                      )}
                      {isExcellence && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-full shadow-md">
                          Intégrale Pro
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={cn(
                            "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                            planKey === 'starter' ? "bg-blue-500/20 text-blue-400" :
                            planKey === 'standard' ? "bg-emerald-500/20 text-emerald-400" :
                            "bg-amber-500/20 text-amber-400"
                          )}>
                            {plan.badge}
                          </span>
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected ? "border-amber-400 bg-amber-400 text-slate-950" : "border-slate-600"
                          )}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-black text-white">{plan.name}</h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{plan.tagline}</p>
                        </div>

                        <div className="pt-2 border-t border-slate-700/50">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white">{plan.price}</span>
                            <span className="text-xs text-slate-400 font-bold">{plan.period}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">{plan.maxStudents}</p>
                          <div className="mt-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-300 font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span>Paiement unique (100%) ou Acompte initial de 45%</span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inclus :</span>
                          <ul className="space-y-1.5 text-xs text-slate-300">
                            {plan.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-[11px] leading-tight">
                                <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-700/50">
                        <button
                          type="button"
                          onClick={() => setSelectedPlan(planKey)}
                          className={cn(
                            "w-full py-2.5 rounded-xl text-xs font-bold transition-all",
                            isSelected 
                              ? "bg-amber-500 text-slate-950 font-black" 
                              : "bg-slate-700/60 hover:bg-slate-700 text-white"
                          )}
                        >
                          {isSelected ? 'Formule sélectionnée' : 'Sélectionner ce plan'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Retour aux informations</span>
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPlanAndSignup}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Passer au Paiement Sécurisé ({SUBSCRIPTION_PLANS[selectedPlan].name})</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: OTP Verification & Final Login */}
          {step === 3 && (
            <form onSubmit={handleVerifyOtp} className="max-w-md mx-auto space-y-6 animate-in fade-in duration-300">
              <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-xl font-black text-white">Vérification de votre Compte</h2>
                <p className="text-slate-400 text-xs mt-1">
                  Saisissez le code de confirmation envoyé à <span className="text-white font-bold">{email}</span>.
                </p>
              </div>

              {simulatedOtpNotice && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{simulatedOtpNotice}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Code de validation (OTP)</label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 w-5 h-5 text-amber-400" />
                  <input 
                    type="text" 
                    value={otpCode} 
                    onChange={(e) => setOtpCode(e.target.value)} 
                    required 
                    placeholder="123456" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-white text-base font-black tracking-[0.4em] focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <CheckCheck size={18} />
                    <span>Activer mon établissement & Accéder</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Bottom Login Link */}
          {step !== 3 && (
            <div className="mt-6 text-center pt-5 border-t border-slate-800/60">
              <p className="text-xs text-slate-500 font-medium">
                Vous avez déjà un compte établissement ?{' '}
                <Link to="/login" className="font-black text-amber-400 hover:text-amber-300 transition-colors ml-1">
                  Se connecter
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>

      <SchoolCreationRequestModal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        defaultEmail={email}
        defaultNom={nom}
        defaultPlan={selectedPlan.toUpperCase()}
      />
    </div>
  );
}
