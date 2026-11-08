import React, { useState } from 'react';
import { apiFetch } from '../utils/api';
import { 
  Search, FileText, CheckCircle2, Clock, XCircle, 
  ChevronRight, ArrowLeft, Mail, Phone, Info,
  Check, GraduationCap, Briefcase, Calendar, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function PublicTracking() {
  const [code, setCode] = useState('');
  const [type, setType] = useState<'recrutement' | 'inscription'>('recrutement');
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setIsLoading(true);
    try {
      const endpoint = type === 'recrutement' 
        ? `/api/public/recrutement/suivi/${code.trim()}`
        : `/api/public/inscription/suivi/${code.trim()}`;
      
      const res = await apiFetch(endpoint);
      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
      } else {
        toast.error(data.error || "Code introuvable. Veuillez vérifier votre saisie.");
        setResult(null);
      }
    } catch (err) {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'soumis': 
      case 'en_attente':
        return { 
          icon: <Clock size={48} className="text-amber-500" />, 
          title: "Dossier Soumis", 
          desc: "Votre dossier a été bien reçu et est en attente d'analyse initiale.",
          color: "text-amber-600 bg-amber-50"
        };
      case 'en_cours':
        return { 
          icon: <Search size={48} className="text-blue-500" />, 
          title: "En Cours de Traitement", 
          desc: "Notre équipe analyse actuellement votre dossier.",
          color: "text-blue-600 bg-blue-50"
        };
      case 'entretien':
        return { 
          icon: <Calendar size={48} className="text-purple-500" />, 
          title: "Convocation à un Entretien", 
          desc: "Félicitations ! Vous êtes invité(e) à un entretien.",
          color: "text-purple-600 bg-purple-50"
        };
      case 'examen':
        return { 
          icon: <FileText size={48} className="text-orange-500" />, 
          title: "Convocation à un Examen", 
          desc: "Vous êtes invité(e) à passer un test ou examen d'embauche.",
          color: "text-orange-600 bg-orange-50"
        };
      case 'embauche':
      case 'approuve':
        return { 
          icon: <CheckCircle2 size={48} className="text-emerald-500" />, 
          title: type === 'recrutement' ? "Félicitations : Recruté(e) !" : "Inscription Approuvée !", 
          desc: type === 'recrutement' 
            ? "Félicitations ! Vous êtes retenu(e) pour rejoindre notre équipe."
            : "Bonne nouvelle ! Votre demande d'inscription a été acceptée.",
          color: "text-emerald-600 bg-emerald-50"
        };
      case 'rejete':
        return { 
          icon: <XCircle size={48} className="text-rose-500" />, 
          title: "Dossier Non Retenu", 
          desc: "Désolé, votre candidature n'a pas pu être retenue pour le moment.",
          color: "text-rose-600 bg-rose-50"
        };
      case 'piece_manquante':
        return { 
          icon: <AlertCircle size={48} className="text-rose-500" />, 
          title: "Pièce Manquante", 
          desc: "Des pièces supplémentaires sont nécessaires pour traiter votre dossier.",
          color: "text-rose-600 bg-rose-50"
        };
      default:
        return { 
          icon: <Info size={48} className="text-slate-500" />, 
          title: "Statut Inconnu", 
          desc: "Analyse en cours...",
          color: "text-slate-600 bg-slate-50"
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Retour
        </button>

        {!result ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl border border-slate-100 text-center space-y-8"
          >
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Suivi de Dossier</h1>
              <p className="text-slate-500 font-medium">Consultez l'état d'avancement de votre candidature ou inscription.</p>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200 max-w-md mx-auto">
              <button
                onClick={() => setType('recrutement')}
                className={`flex-1 px-6 py-3 rounded-xl text-xs font-black transition-all ${
                  type === 'recrutement' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Candidature
              </button>
              <button
                onClick={() => setType('inscription')}
                className={`flex-1 px-6 py-3 rounded-xl text-xs font-black transition-all ${
                  type === 'inscription' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Inscription
              </button>
            </div>

            <form onSubmit={handleSearch} className="max-w-md mx-auto space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Entrez votre code (ex: CAND-XXXXXX)"
                  className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-xl text-center text-indigo-600 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all uppercase placeholder:text-slate-300"
                />
              </div>
              <button 
                disabled={isLoading}
                className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Search size={24} />
                    Vérifier le statut
                  </>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600">
                  {type === 'recrutement' ? <Briefcase size={24} /> : <GraduationCap size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">
                    {type === 'recrutement' ? result.campagne_titre : result.nom_ecole}
                  </h2>
                  <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">{code}</p>
                </div>
              </div>
              <button onClick={() => setResult(null)} className="text-slate-400 hover:text-slate-900 font-bold text-sm">Nouveau suivi</button>
            </div>

            <div className="p-10 text-center">
              <div className="mb-8">
                <div className="inline-flex p-6 rounded-[2rem] bg-white shadow-xl shadow-slate-100 mb-6 border border-slate-50">
                  {getStatusDisplay(result.status).icon}
                </div>
                <h3 className={`text-3xl font-black mb-2 ${getStatusDisplay(result.status).color.split(' ')[0]}`}>
                  {getStatusDisplay(result.status).title}
                </h3>
                <p className="text-slate-500 font-medium max-w-md mx-auto">
                  {getStatusDisplay(result.status).desc}
                </p>
              </div>

              {result.details_decision && (
                <div className="max-w-2xl mx-auto p-8 bg-slate-50 rounded-[2rem] border border-slate-100 text-left mb-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info size={14} className="text-indigo-600" />
                    Message de l'établissement
                  </h4>
                  <p className="text-sm font-bold text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {result.details_decision}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                <div className="p-6 bg-white border border-slate-200 rounded-[1.5rem] text-left">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Candidat</p>
                  <p className="text-lg font-black text-slate-900">{result.nom} {result.prenom || result.nom_enfant}</p>
                  <div className="flex flex-col gap-1 mt-3">
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                      <Mail size={14} /> {result.email || result.email_parent}
                    </span>
                    <span className="text-xs font-bold text-slate-500 flex items-center gap-2">
                      <Phone size={14} /> {result.telephone || result.tel_parent}
                    </span>
                  </div>
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-[1.5rem] text-left space-y-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Information</p>
                    <p className="text-sm font-bold text-slate-700">
                      {type === 'recrutement' ? `Poste : ${result.poste_vise}` : `Classe : ${result.classe_nom}`}
                    </p>
                  </div>
                  {(result.date_entretien || result.date_examen) && (
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-600 uppercase mb-1">Rendez-vous programmé</p>
                      <p className="text-xs font-black text-indigo-900">
                        {result.date_entretien ? `Entretien : ${new Date(result.date_entretien).toLocaleString()}` : `Examen : ${new Date(result.date_examen).toLocaleString()}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mis à jour en temps réel</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
