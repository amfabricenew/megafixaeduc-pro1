import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GraduationCap, Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';
import PasswordStrengthMeter, { evaluatePassword } from '../components/PasswordStrengthMeter';

export default function SetupPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    const qOtp = searchParams.get('otp');
    if (qEmail) setEmail(qEmail);
    if (qOtp) setOtp(qOtp);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !otp || !password || !question || !answer) {
      setError('Tous les champs sont requis, y compris la question de sécurité.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    const passwordEval = evaluatePassword(password);
    if (!passwordEval.isStrictValid) {
      setError('Sécurité du mot de passe insuffisante : il doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, password, question, answer }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || 'Erreur lors de la configuration du mot de passe.');
        toast.error(data.error || 'Échec de la configuration');
      } else {
        toast.success('Mot de passe configuré avec succès ! Connectez-vous.');
        navigate('/login');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex justify-center items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Mégafixa<span className="text-emerald-400">Educ Pro</span>
            </h1>
            <p className="text-xs font-semibold text-slate-400">
              Activation du compte
            </p>
          </div>
        </div>

        <h2 className="mt-6 text-center text-xl font-bold tracking-tight text-white">
          Configuration de votre mot de passe
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Définissez un nouveau mot de passe sécurisé pour votre compte
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-slate-800/80 backdrop-blur-md py-8 px-6 shadow-2xl border border-slate-700/60 rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Adresse Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre email"
                className="block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Code OTP de vérification
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Code à 6 chiffres"
                className="block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 car. (Maj, min, chiffre)"
                  className="block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <PasswordStrengthMeter password={password} />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmez le mot de passe"
                className="block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-700/50">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-3">Récupération hors-ligne (Optionnel)</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Question de sécurité
                  </label>
                  <select
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionnez une question</option>
                    <option value="Quel est le nom de votre premier animal de compagnie ?">Quel est le nom de votre premier animal de compagnie ?</option>
                    <option value="Quelle est votre ville de naissance ?">Quelle est votre ville de naissance ?</option>
                    <option value="Quel est le nom de votre école primaire ?">Quel est le nom de votre école primaire ?</option>
                    <option value="Quel est le nom de votre plat préféré ?">Quel est le nom de votre plat préféré ?</option>
                    <option value="Quelle est la marque de votre première voiture ?">Quelle est la marque de votre première voiture ?</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Réponse secrète
                  </label>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Votre réponse (insensible à la casse)"
                    className="block w-full px-4 py-2.5 bg-slate-900/90 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="mt-1 text-[10px] text-slate-500 italic">
                    Cette question vous permettra de réinitialiser votre mot de passe même sans connexion internet.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Enregistrer mon mot de passe</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-slate-700/40">
            <Link to="/login" className="text-xs font-bold text-slate-400 hover:text-white transition-colors">
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
