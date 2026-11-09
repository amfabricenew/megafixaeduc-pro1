import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  UserCheck,
  School,
  Users,
  ExternalLink,
  X,
  Check,
  Crown,
  Copy,
  Globe
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';
import PasswordStrengthMeter, { evaluatePassword } from '../components/PasswordStrengthMeter';
import { LanguageSelector } from '../components/LanguageSelector';
import { useTranslation } from '../contexts/TranslationContext';
import { auth, googleProvider, signInWithPopup } from '../lib/firebase';
import SchoolCreationRequestModal from '../components/SchoolCreationRequestModal';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // School creation request modal
  const [showSchoolRequestModal, setShowSchoolRequestModal] = useState(false);

  // License Key Activation State
  const [showActivateKeyModal, setShowActivateKeyModal] = useState(false);
  const [activateKeyInput, setActivateKeyInput] = useState('');
  const [activateEmailInput, setActivateEmailInput] = useState('');
  const [activatingKey, setActivatingKey] = useState(false);
  const [activatedPlanResult, setActivatedPlanResult] = useState<any>(null);

  // Unauthorized domain guidance modal
  const [showUnauthorizedDomainModal, setShowUnauthorizedDomainModal] = useState(false);
  const [detectedHost, setDetectedHost] = useState('');
  const [domainCopied, setDomainCopied] = useState(false);

  const handleActivateSubscriptionKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activateKeyInput.trim()) {
      toast.error("Veuillez saisir votre clé d'abonnement");
      return;
    }
    setActivatingKey(true);
    try {
      const res = await apiFetch('/api/subscriptions/activate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: activateKeyInput.trim(),
          admin_email: activateEmailInput.trim() || email.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'activation de la clé");
      }
      setActivatedPlanResult(data);
      if (activateEmailInput.trim()) {
        setEmail(activateEmailInput.trim());
      }
      if (data.already_active) {
        toast.success(data.message || "Compte école déjà activé ! Vous pouvez vous connecter.");
      } else {
        toast.success(data.message || "Abonnement activé avec succès !");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur d'activation");
    } finally {
      setActivatingKey(false);
    }
  };

  useEffect(() => {
    if (location.state) {
      if (location.state.loginIdentifier) {
        setEmail(location.state.loginIdentifier);
      }
      if (location.state.successMessage) {
        setSuccessInfo(location.state.successMessage);
      }
    }
    const searchParams = new URLSearchParams(location.search);
    const schoolKey = searchParams.get('schoolKey');
    const paramEmail = searchParams.get('email');
    if (paramEmail) {
      setEmail(paramEmail);
      setActivateEmailInput(paramEmail);
    }
    if (schoolKey) {
      setActivateKeyInput(schoolKey);
      setShowActivateKeyModal(true);
      setSuccessInfo(`Félicitations pour votre abonnement ! Clé d'activation du compte école détectée : ${schoolKey}`);
    }
  }, [location.state, location.search]);

  // School-specific portal state
  const [schoolInfo, setSchoolInfo] = useState<{
    id: number;
    nom: string;
    code_ecole: string;
    logo?: string;
    email?: string;
    telephone?: string;
    adresse?: string;
    ville?: string;
    devise?: string;
  } | null>(null);
  const [loadingSchool, setLoadingSchool] = useState(false);

  // Detect school param from URL (?school=..., ?code=..., ?ecole=..., ?school_id=...)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const schoolParam = searchParams.get('school') || searchParams.get('code') || searchParams.get('code_ecole') || searchParams.get('ecole') || searchParams.get('school_id');
    
    if (schoolParam) {
      setLoadingSchool(true);
      apiFetch(`/api/public/school-login-info?school=${encodeURIComponent(schoolParam)}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.nom) {
            setSchoolInfo(data);
          } else {
            console.warn('École introuvable pour ce paramètre:', schoolParam);
          }
        })
        .catch(err => {
          console.error('Erreur lors du chargement des informations de l\'école:', err);
        })
        .finally(() => {
          setLoadingSchool(false);
        });
    } else {
      setSchoolInfo(null);
    }
  }, [location.search]);

  // Forgot password states
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: Method selection/Action, 3: New Password
  const [forgotMethod, setForgotMethod] = useState<'email' | 'question'>('email');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [simulatedCodeNotice, setSimulatedCodeNotice] = useState<string | null>(null);

  const executeGoogleLogin = async (targetEmail: string, targetName?: string, idToken?: string) => {
    try {
      setLoading(true);
      const cleanEmail = targetEmail.trim().toLowerCase();
      const response = await apiFetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: cleanEmail,
          nom: targetName || cleanEmail.split('@')[0],
          google_id: cleanEmail,
          idToken
        }),
      });
      
      const data = await response.json();
      if (data.unlinkedEmail) {
        toast.error(data.message || "Cette adresse email n'est liée à aucun compte école existant.", { duration: 5000 });
        navigate(`/signup?email=${encodeURIComponent(data.email || targetEmail)}&nom=${encodeURIComponent(data.nom || targetName || '')}&from=google`, {
          state: {
            loginIdentifier: data.email || targetEmail,
            unlinkedNotice: "Votre adresse email n'est liée à aucun compte école existant. Renseignez les informations ci-dessous pour créer votre établissement."
          }
        });
        return;
      }
      if (data.success && data.token) {
        toast.success(`Bienvenue, ${data.user.nom} !`);
        login(data.token, data.user);
        if (data.user.role === 'super_admin') {
          navigate('/super-admin');
        } else {
          navigate('/accueil');
        }
      } else {
        toast.error(data.error || "Erreur d'authentification Google");
      }
    } catch (err: any) {
      toast.error(err?.message || "Échec de la connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      // Force Google account chooser so the user can select from devices/accounts
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      if (result?.user?.email) {
        const idToken = await result.user.getIdToken();
        await executeGoogleLogin(result.user.email, result.user.displayName || undefined, idToken);
        return;
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/popup-closed-by-user' || fbErr?.code === 'auth/cancelled-popup-request') {
        // User closed the popup, cancel silently
        return;
      }
      if (fbErr?.code === 'auth/popup-blocked') {
        toast.error("La fenêtre de connexion Google a été bloquée par votre navigateur. Veuillez autoriser les fenêtres pop-up.");
        return;
      }
      if (fbErr?.code === 'auth/unauthorized-domain' || fbErr?.message?.includes('unauthorized-domain')) {
        const currentHost = typeof window !== 'undefined' ? window.location.hostname : '';
        setDetectedHost(currentHost);
        setShowUnauthorizedDomainModal(true);
        toast.error("Domaine non autorisé dans Firebase Authentication", { duration: 6000 });
        return;
      }
      console.warn('[Google Auth Error]:', fbErr);
      toast.error(fbErr?.message || "Erreur lors de l'authentification avec Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(), 
          password: password.trim(), 
          otp: requiresOtp ? otp : undefined,
          school_id: schoolInfo?.id,
          code_ecole: schoolInfo?.code_ecole
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.unlinkedEmail) {
          toast.error(data.message || "Cette adresse email n'est liée à aucun compte école existant.", { duration: 5000 });
          navigate(`/signup?email=${encodeURIComponent(data.email || email.trim())}&from=login`, {
            state: {
              loginIdentifier: data.email || email.trim(),
              unlinkedNotice: "Votre adresse email n'est liée à aucun compte école existant. Renseignez le formulaire ci-dessous pour créer votre établissement."
            }
          });
          return;
        }
        if (data.requiresActivation) {
          setShowActivateKeyModal(true);
          if (data.schoolKey) {
            setActivateKeyInput(data.schoolKey);
          }
          if (email.trim()) {
            setActivateEmailInput(email.trim());
          }
          setError(data.error);
          toast.error(data.error || "Activation du compte école requise.", { duration: 6000 });
          return;
        }
        if (data.requiresOtp) {
          setRequiresOtp(true);
          setOtpNotice(data.message || 'Code de confirmation requis.');
          toast(data.message || 'Veuillez saisir votre code de vérification.', { icon: 'ℹ️' });
        } else {
          setError(data.error || 'Échec de la connexion. Vérifiez vos identifiants.');
          toast.error(data.error || 'Erreur de connexion');
        }
      } else {
        toast.success(`Bienvenue, ${data.user.nom || 'Utilisateur'} !`);
        login(data.token || 'demo-token', data.user);
        if (data.user.role === 'super_admin') {
          navigate('/super-admin');
        } else if (data.user.must_change_password) {
          navigate('/mon-compte', { state: { mustChangePassword: true } });
        } else {
          navigate('/accueil');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur réseau est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error('Veuillez saisir votre adresse email.');
      return;
    }
    setForgotLoading(true);
    setSimulatedCodeNotice(null);
    try {
      // Step 1: Check if user exists and if they have a security question
      const res = await apiFetch(`/api/auth/password/get-question?email=${encodeURIComponent(forgotEmail)}`);
      const data = await res.json();
      
      if (res.ok && data.question) {
        setSecurityQuestion(data.question);
        setForgotStep(2);
      } else {
        // If no security question, proceed with email reset (traditional)
        const resEmail = await apiFetch('/api/auth/password/request-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail })
        });
        const dataEmail = await resEmail.json();
        if (resEmail.ok && dataEmail.success) {
          setForgotMethod('email');
          setForgotStep(2);
          if (dataEmail.simulated && dataEmail.code) {
            setSimulatedCodeNotice(`Code de réinitialisation : ${dataEmail.code}`);
          }
          toast.success('Un code de confirmation a été généré !');
        } else {
          toast.error(dataEmail.error || 'Utilisateur non trouvé.');
        }
      }
    } catch (e: any) {
      toast.error('Erreur lors de la demande de réinitialisation.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (forgotMethod === 'question') {
      if (!securityAnswer || !newPassword) {
        toast.error('Veuillez répondre à la question et saisir un nouveau mot de passe.');
        return;
      }
    } else {
      if (!forgotCode || !newPassword) {
        toast.error('Veuillez remplir tous les champs.');
        return;
      }
    }

    const evalRes = evaluatePassword(newPassword);
    if (!evalRes.isStrictValid) {
      toast.error('Le nouveau mot de passe doit comporter au moins 8 caractères, une majuscule, une minuscule et un chiffre.');
      return;
    }

    setForgotLoading(true);
    try {
      let res;
      if (forgotMethod === 'question') {
        res = await apiFetch('/api/auth/password/reset-with-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, answer: securityAnswer, newPassword })
        });
      } else {
        res = await apiFetch('/api/auth/password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotEmail, code: forgotCode, newPassword })
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Mot de passe réinitialisé avec succès ! Vous pouvez vous connecter.');
        setIsForgotMode(false);
        setForgotStep(1);
        setEmail(forgotEmail);
        setPassword(newPassword);
      } else {
        toast.error(data.error || 'Réponse ou code invalide.');
      }
    } catch (e: any) {
      toast.error('Erreur lors de la réinitialisation du mot de passe.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Back to Landing / Info Page Button */}
      <div className="absolute top-6 left-6 z-30">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-lg text-xs font-bold backdrop-blur-md transition-all group hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform text-emerald-400" />
          <span>{t("Page d'information")}</span>
        </Link>
      </div>

      {/* Language Switcher in top-right */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-2">
        <LanguageSelector variant="pill" />
      </div>

      {/* Decorative background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Dedicated School Branding Banner if schoolParam present */}
        {schoolInfo ? (
          <div className="mb-4 bg-gradient-to-b from-emerald-950/60 to-slate-800/80 border border-emerald-500/30 rounded-3xl p-5 shadow-2xl backdrop-blur-md text-center relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <button 
                type="button"
                onClick={() => navigate('/login')}
                title="Accéder au portail général"
                className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900/60 rounded-full hover:bg-slate-700 transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex justify-center mb-3">
              {schoolInfo.logo ? (
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 p-1.5 border border-emerald-500/40 shadow-lg">
                  <img src={schoolInfo.logo} alt={schoolInfo.nom} className="w-full h-full object-contain rounded-xl" />
                </div>
              ) : (
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                  <School className="w-9 h-9" />
                </div>
              )}
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30 mb-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Portail Officiel d'Établissement</span>
            </div>

            <h1 className="text-xl font-extrabold text-white leading-tight">
              {schoolInfo.nom}
            </h1>

            {schoolInfo.code_ecole && (
              <p className="text-xs font-mono font-bold text-emerald-400 mt-1">
                Code école : {schoolInfo.code_ecole}
              </p>
            )}

            <p className="text-[11px] text-slate-400 mt-1">
              Connexion sécurisée pour le corps professoral & le personnel
            </p>
          </div>
        ) : (
          <div className="flex justify-center items-center gap-3">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Mégafixa<span className="text-emerald-400">Educ Pro</span>
              </h1>
              <p className="text-xs font-semibold text-slate-400">
                Système de Gestion Scolaire Intégré
              </p>
            </div>
          </div>
        )}

        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-white">
          {isForgotMode ? 'Réinitialisation du mot de passe' : 'Connexion à votre espace'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          {isForgotMode 
            ? 'Entrez vos informations pour recevoir un code de confirmation'
            : schoolInfo 
              ? `Saisissez vos identifiants rattachés à ${schoolInfo.nom}`
              : 'Saisissez vos identifiants de connexion'}
        </p>
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-xl md:max-w-2xl z-10 px-4 sm:px-0">
        <div className="bg-slate-800/80 backdrop-blur-md py-7 px-5 sm:px-8 shadow-2xl border border-slate-700/60 rounded-3xl">
          
          {successInfo && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              <span>{successInfo}</span>
            </div>
          )}

          {error && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Forgot Password Flow */}
          {isForgotMode ? (
            <div>
              {forgotStep === 1 ? (
                <form onSubmit={handleRequestPasswordReset} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Adresse Email ou Identifiant
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="votre.email@ecole.com"
                        className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>Vérifier mon compte</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => { setIsForgotMode(false); setForgotStep(1); }}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                </form>
              ) : forgotStep === 2 ? (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Choisir la méthode de récupération</p>
                    
                    <div className="grid grid-cols-1 gap-3">
                      {securityQuestion ? (
                        <button
                          type="button"
                          onClick={() => { setForgotMethod('question'); setForgotStep(3); }}
                          className="w-full p-4 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 hover:border-emerald-500 rounded-2xl text-left transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Question de Sécurité</p>
                              <p className="text-[11px] text-slate-400">Recommandé pour le mode hors-ligne</p>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="p-4 bg-slate-900/40 border border-slate-700/50 rounded-2xl opacity-60">
                           <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-400">Question non configurée</p>
                              <p className="text-[11px] text-slate-500 italic">Veuillez utiliser la méthode Email</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setForgotMethod('email');
                          setForgotStep(3);
                          // Re-trigger email if needed or just wait for step 3 to handle it
                        }}
                        className="w-full p-4 bg-slate-800/40 hover:bg-slate-700/60 border border-slate-700 hover:border-slate-600 rounded-2xl text-left transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
                            <Mail size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Code par Email (OTP)</p>
                            <p className="text-[11px] text-slate-400">Nécessite une connexion internet</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      ← Changer de compte
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-5">
                  {simulatedCodeNotice && forgotMethod === 'email' && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{simulatedCodeNotice}</span>
                    </div>
                  )}

                  {forgotMethod === 'question' ? (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Question : <span className="text-emerald-400">{securityQuestion}</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                          placeholder="Votre réponse secrète"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                        Code de confirmation (OTP)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={forgotCode}
                          onChange={(e) => setForgotCode(e.target.value)}
                          placeholder="Code à 6 chiffres"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent tracking-widest font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                      Nouveau mot de passe
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Min. 8 car. (Maj, min, chiffre)"
                        className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                    </div>
                    {newPassword && (
                      <PasswordStrengthMeter password={newPassword} />
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Réinitialiser et se connecter</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setForgotStep(2)}
                      className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                    >
                      ← Retour aux méthodes
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* Normal Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Identifiant ou Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: superadmin ou votre.email@domaine.com"
                    className="block w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-medium"
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-400">
                  Enseignants & Super Admin SaaS : saisissez votre identifiant (ex: <span className="text-emerald-400 font-mono font-bold">superadmin</span>) ou votre email.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Mot de passe
                  </label>
                  <button
                    type="button"
                    onClick={() => { setIsForgotMode(true); setForgotEmail(email); }}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-10 pr-10 py-3 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* OTP Field if required */}
              {requiresOtp && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>{otpNotice || 'Vérification du compte (Code OTP)'}</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="Code OTP à 6 chiffres"
                      className="block w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-amber-500/40 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Se connecter</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-800 px-2 text-slate-400 font-bold">Ou continuer avec</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                disabled={loading}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-3 border border-slate-200 cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Se connecter avec Google</span>
              </button>

              {/* Option: Premier Accès avec Clé d'Abonnement */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivatedPlanResult(null);
                    setShowActivateKeyModal(true);
                  }}
                  className="w-full py-2.5 px-4 bg-slate-900/90 hover:bg-slate-900 border border-amber-500/40 hover:border-amber-400 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <KeyRound size={15} />
                  <span>Activer une Clé d'Abonnement (Premier Accès)</span>
                </button>
              </div>

              {/* Bouton officiel : Demande de création de compte école */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowSchoolRequestModal(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2.5 cursor-pointer border border-emerald-400/40 group"
                >
                  <School className="w-5 h-5 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span>Demande de création de compte école</span>
                  <ArrowRight className="w-4 h-4 text-emerald-200 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          )}

          {/* Signup & School Request Links */}
          <div className="mt-6 text-center pt-4 border-t border-slate-700/40 space-y-2">
            <p className="text-xs text-slate-400">
              Vous représentez un nouvel établissement ?{' '}
              <button
                type="button"
                onClick={() => setShowSchoolRequestModal(true)}
                className="font-black text-emerald-400 hover:text-emerald-300 transition-colors underline cursor-pointer"
              >
                Faire une demande de création de compte
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* School Creation Request Modal */}
      <SchoolCreationRequestModal
        isOpen={showSchoolRequestModal}
        onClose={() => setShowSchoolRequestModal(false)}
        defaultEmail={email}
      />

      {/* Subscription Key Activation Modal (First Access) */}
      {showActivateKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowActivateKeyModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/40 shadow-md">
                <KeyRound size={24} />
              </div>
              <h3 className="text-lg font-black text-white">Activation Unique du Compte École</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Cette clé d'activation est valable <strong>une seule fois</strong> pour activer votre compte école. Après cette activation, vous utiliserez <strong>librement votre adresse email avec votre mot de passe</strong> pour accéder à votre espace école.
              </p>
            </div>

            {activatedPlanResult ? (
              <div className="p-5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl space-y-4 text-center animate-in zoom-in-95 duration-200">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Compte École Activé avec Succès !</h4>
                  <p className="text-xs text-emerald-400 font-bold mt-1 uppercase tracking-wider">
                    Formule {activatedPlanResult.plan}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                    Votre clé à usage unique a été validée. Votre adresse email est désormais reconnue et autorisée. Connectez-vous librement avec votre email et votre mot de passe.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowActivateKeyModal(false)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all"
                >
                  Continuer vers la Connexion
                </button>
              </div>
            ) : (
              <form onSubmit={handleActivateSubscriptionKey} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Clé d'Abonnement Unique *
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-3.5 w-4 h-4 text-amber-400" />
                    <input
                      type="text"
                      required
                      value={activateKeyInput}
                      onChange={(e) => setActivateKeyInput(e.target.value)}
                      placeholder="ex: M2-F6K1W-ET1R-P0LX-1BQV"
                      className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm uppercase focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Format : XX-XXXXX-XXXX-XXXX-XXXX (Clé unique MFEP avec date codée).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Email de l'administrateur (Optionnel)
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={activateEmailInput}
                      onChange={(e) => setActivateEmailInput(e.target.value)}
                      placeholder="direction@ecole.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-amber-500/30"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowActivateKeyModal(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={activatingKey}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {activatingKey ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Activer & Débloquer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Firebase Unauthorized Domain Guidance Modal */}
      {showUnauthorizedDomainModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-xl p-6 sm:p-8 space-y-6 shadow-2xl relative text-left">
            <button
              type="button"
              onClick={() => setShowUnauthorizedDomainModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40 flex-shrink-0 shadow-lg shadow-amber-500/10">
                <Globe size={26} />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-500/30">
                  <AlertCircle size={12} className="text-amber-400" />
                  <span>Sécurité Firebase Authentication</span>
                </div>
                <h3 className="text-lg font-black text-white">
                  Autorisation de domaine requise
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Firebase bloque la connexion Google car ce domaine de déploiement n'a pas encore été déclaré dans les domaines autorisés du projet Firebase <span className="text-emerald-400 font-mono font-bold">chrome-pride-dh7sp</span>.
                </p>
              </div>
            </div>

            {/* Domain display & copy */}
            <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Domaine détecté à ajouter :
                </span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Projet: chrome-pride-dh7sp
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl font-mono text-xs text-amber-300 select-all overflow-x-auto">
                  {detectedHost || (typeof window !== 'undefined' ? window.location.hostname : 'onrender.com')}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const domainToCopy = detectedHost || (typeof window !== 'undefined' ? window.location.hostname : 'onrender.com');
                    navigator.clipboard.writeText(domainToCopy);
                    setDomainCopied(true);
                    toast.success("Domaine copié !");
                    setTimeout(() => setDomainCopied(false), 2500);
                  }}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl border border-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {domainCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{domainCopied ? 'Copié' : 'Copier'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                💡 <strong className="text-slate-300">Recommandation :</strong> Ajoutez simplement <span className="text-emerald-400 font-mono font-bold">onrender.com</span> dans Firebase pour autoriser immédiatement tous vos déploiements Render.
              </p>
            </div>

            {/* Resolution Steps */}
            <div className="space-y-2.5 text-xs text-slate-300">
              <p className="font-bold text-white uppercase text-[11px] tracking-wider">
                Étapes simples pour l'activer en 30 secondes :
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-xs pl-1">
                <li>
                  Cliquez sur le bouton ci-dessous pour ouvrir la console Firebase.
                </li>
                <li>
                  Dans l'onglet <strong className="text-white">Paramètres (Settings)</strong>, descendez à la section <strong className="text-white">Domaines autorisés (Authorized domains)</strong>.
                </li>
                <li>
                  Cliquez sur <strong className="text-emerald-400">Ajouter un domaine</strong>, saisissez <code className="bg-slate-800 px-1.5 py-0.5 rounded text-amber-300 font-mono">onrender.com</code> puis validez.
                </li>
              </ol>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <a
                href="https://console.firebase.google.com/project/chrome-pride-dh7sp/authentication/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 text-center cursor-pointer"
              >
                <span>Ouvrir la Console Firebase</span>
                <ExternalLink size={15} />
              </a>
              <button
                type="button"
                onClick={() => setShowUnauthorizedDomainModal(false)}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Connexion Email & Mot de passe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
