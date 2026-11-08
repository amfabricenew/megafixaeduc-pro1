import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { 
  GraduationCap, Check, ArrowRight, Star, Users, 
  MapPin, Phone, Mail, FileText, ListChecks, 
  Sparkles, ShieldCheck, BookOpen, Clock, AlertCircle,
  FileUp, Send, X, ChevronDown, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface EnrollmentConfig {
  id: number;
  school_id: number;
  titre_page: string;
  description_ecole: string;
  atouts: string;
  conditions_admission: string;
  pieces_a_fournir: string;
  frais_scolarite_info: string;
  lien_marketing_token: string;
  nom_ecole: string;
  logo: string;
  adresse: string;
  telephone: string;
  email: string;
  classes: any[];
}

export default function PublicEnrollment() {
  const { token } = useParams<{ token: string }>();
  const [config, setConfig] = useState<EnrollmentConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInscribeForm, setShowInscribeForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ code: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nom_enfant: '',
    prenom_enfant: '',
    date_naissance: '',
    sexe: 'M',
    classe_demandee_id: '',
    nom_parent: '',
    tel_parent: '',
    email_parent: '',
    dossier_pdf_data: '',
  });

  useEffect(() => {
    if (token) {
      apiFetch(`/api/public/inscription/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error(data.error);
          } else {
            setConfig(data);
          }
        })
        .catch(() => toast.error("Erreur lors de la récupération des informations."))
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error("Veuillez sélectionner un fichier PDF uniquement.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, dossier_pdf_data: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dossier_pdf_data) {
      toast.error("Le dossier PDF d'inscription est requis.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/public/inscription/postuler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, token })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissionSuccess({ code: data.code });
        toast.success("Demande d'inscription soumise avec succès !");
      } else {
        toast.error(data.error || "Erreur lors de la soumission.");
      }
    } catch (err) {
      toast.error("Erreur de communication avec le serveur.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!config) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <AlertCircle size={64} className="text-slate-300 mb-4" />
      <h1 className="text-2xl font-black text-slate-900">Page introuvable</h1>
      <p className="text-slate-500 mt-2">Le lien d'inscription est invalide ou a expiré.</p>
      <button onClick={() => window.history.back()} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black">Retour</button>
    </div>
  );

  const atouts = JSON.parse(config.atouts || '[]');
  const pieces = JSON.parse(config.pieces_a_fournir || '{}');
  const frais = JSON.parse(config.frais_scolarite_info || '{}');

  if (submissionSuccess) return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-600 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white rounded-[3rem] p-12 text-center shadow-2xl"
      >
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <Check size={48} strokeWidth={3} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-4">Demande Enregistrée !</h1>
        <p className="text-slate-500 font-medium mb-8">
          Votre demande d'inscription pour {formData.nom_enfant} a été soumise avec succès à l'établissement <strong>{config.nom_ecole}</strong>.
        </p>
        
        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Code de Suivi d'Inscription</p>
          <p className="text-4xl font-black text-indigo-600 tracking-tighter">{submissionSuccess.code}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-4 italic">Utilisez ce code pour suivre l'évolution de votre dossier.</p>
        </div>

        <button 
          onClick={() => navigate('/public/suivi-candidature')}
          className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          Suivre ma demande
        </button>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              {config.logo ? <img src={config.logo} alt="Logo" className="w-6 h-6 object-contain" /> : <GraduationCap size={20} />}
            </div>
            <span className="font-black text-slate-900 tracking-tight">{config.nom_ecole}</span>
          </div>
          <button 
            onClick={() => {
              const el = document.getElementById('enroll-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            S'inscrire maintenant
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[800px] h-[800px] bg-indigo-50 rounded-full blur-[120px] -z-10 opacity-50"></div>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest">
              <Sparkles size={14} />
              Inscriptions Ouvertes 2026-2027
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]">
              {config.titre_page || `Donnez à votre enfant l'éducation qu'il mérite`}
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
              {config.description_ecole || `Bienvenue à ${config.nom_ecole}. Un environnement d'apprentissage stimulant où chaque élève est encouragé à atteindre son plein potentiel.`}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button 
                onClick={() => {
                  const el = document.getElementById('enroll-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-2xl shadow-indigo-100 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                Commencer l'inscription
                <ArrowRight size={24} />
              </button>
              <button 
                onClick={() => navigate('/public/suivi-candidature')}
                className="w-full sm:w-auto px-10 py-5 bg-white text-indigo-600 rounded-[1.5rem] font-black text-lg shadow-xl shadow-slate-100 hover:scale-[1.03] active:scale-95 transition-all flex items-center justify-center gap-3 border border-indigo-100"
              >
                Suivre ma demande
                <Clock size={24} />
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative hidden lg:block"
          >
            <div className="aspect-square bg-gradient-to-br from-indigo-100 to-white rounded-[4rem] border border-indigo-50 p-8 relative">
              <div className="absolute -top-10 -right-10 p-8 bg-white rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 animate-bounce-slow">
                <Star className="text-amber-400 mb-2" size={32} fill="currentColor" />
                <p className="text-xs font-black text-slate-900">Excellence Académique</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Certifié</p>
              </div>
              <div className="w-full h-full bg-indigo-500/5 rounded-[3rem] border border-indigo-500/10 flex items-center justify-center">
                 <GraduationCap size={160} className="text-indigo-600/20" />
              </div>
              <div className="absolute -bottom-10 -left-10 p-6 bg-slate-900 rounded-[2rem] shadow-2xl text-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Users size={24} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-black">98%</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Taux de réussite</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Atouts Section */}
      <section className="py-24 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Pourquoi nous choisir ?</h2>
            <p className="text-slate-500 font-medium">Découvrez ce qui fait la force de notre établissement et les avantages pour votre enfant.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(atouts.length > 0 ? atouts : ['Infrastructures Modernes', 'Suivi Personnalisé', 'Activités Sportives', 'Langues Étrangères']).map((atout: string, i: number) => (
              <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{atout}</h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Nous mettons tout en œuvre pour offrir un cadre propice à l'épanouissement.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Infos & Fees */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 tracking-tight">Modalités d'Admission</h2>
              <p className="text-slate-500 font-medium">{config.conditions_admission || "Voici les conditions et pièces requises pour une inscription réussie."}</p>
            </div>

            <div className="space-y-6">
              <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100">
                <h3 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-3">
                  <FileText size={24} className="text-indigo-600" />
                  Dossier à constituer
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(Object.keys(pieces).length > 0 ? pieces['Général'] || [] : ['Acte de naissance', 'Carnet de santé', 'Certificat de scolarité', '4 photos d\'identité']).map((p: string, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm font-bold text-indigo-800 bg-white/50 px-4 py-3 rounded-xl border border-indigo-100/50">
                      <Check size={16} className="text-emerald-500" />
                      {p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BookOpen size={160} />
            </div>
            <h3 className="text-3xl font-black mb-8 flex items-center gap-3">
              Frais de Scolarité
            </h3>
            <div className="space-y-4">
              {Object.keys(frais).length > 0 ? (
                Object.entries(frais).map(([classe, f]: [string, any]) => (
                  <div key={classe} className="flex items-center justify-between p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-sm font-black text-white">{classe}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Par année académique</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black text-indigo-400">{f}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Tout inclus</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <p className="text-slate-400 font-bold italic">Consultez l'administration pour la grille tarifaire détaillée.</p>
                </div>
              )}
            </div>
            <div className="mt-12 p-6 bg-indigo-500 rounded-2xl flex items-center justify-between shadow-xl shadow-indigo-900/50">
              <div className="flex items-center gap-4">
                <Clock className="text-white" size={24} />
                <p className="text-xs font-black uppercase tracking-widest">Modalités de paiement flexibles</p>
              </div>
              <ChevronRight size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* CTA / Enrollment Form Section */}
      <section id="enroll-section" className="py-24 bg-indigo-600 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)] pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          {!showInscribeForm ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center text-white space-y-10"
            >
              <h2 className="text-5xl md:text-7xl font-black tracking-tight leading-none">Prêt à rejoindre l'aventure ?</h2>
              <p className="text-xl text-indigo-100 max-w-2xl mx-auto font-medium">
                Remplissez le formulaire en ligne pour réserver une place pour votre enfant. Notre équipe vous contactera sous 48h.
              </p>
              <button 
                onClick={() => setShowInscribeForm(true)}
                className="inline-flex items-center gap-4 px-16 py-8 bg-white text-indigo-600 rounded-[2.5rem] font-black text-2xl shadow-2xl hover:scale-[1.05] active:scale-95 transition-all"
              >
                Ouvrir le formulaire
                <ChevronDown size={32} />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 md:p-16 rounded-[4rem] shadow-3xl max-w-5xl mx-auto"
            >
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-4xl font-black text-slate-900">Inscription en Ligne</h3>
                  <p className="text-slate-500 font-bold mt-2">Veuillez remplir toutes les informations requises.</p>
                </div>
                <button 
                  onClick={() => setShowInscribeForm(false)}
                  className="p-4 bg-slate-100 text-slate-500 rounded-3xl hover:bg-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-10">
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <Users size={16} className="text-indigo-600" />
                    Informations sur l'enfant
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Nom de famille</label>
                      <input 
                        type="text" required
                        value={formData.nom_enfant}
                        onChange={e => setFormData({...formData, nom_enfant: e.target.value.toUpperCase()})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Prénoms</label>
                      <input 
                        type="text" required
                        value={formData.prenom_enfant}
                        onChange={e => setFormData({...formData, prenom_enfant: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Date de naissance</label>
                      <input 
                        type="date" required
                        value={formData.date_naissance}
                        onChange={e => setFormData({...formData, date_naissance: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Sexe</label>
                      <select 
                        required
                        value={formData.sexe}
                        onChange={e => setFormData({...formData, sexe: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                      >
                        <option value="M">Masculin</option>
                        <option value="F">Féminin</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Classe souhaitée</label>
                      <select 
                        required
                        value={formData.classe_demandee_id}
                        onChange={e => setFormData({...formData, classe_demandee_id: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900"
                      >
                        <option value="">Sélectionner une classe...</option>
                        {config.classes.map((c: any) => <option key={c.id} value={c.id}>{c.nom} ({c.niveau})</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-600" />
                    Responsable Légal (Parent)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Nom Complet</label>
                      <input 
                        type="text" required
                        value={formData.nom_parent}
                        onChange={e => setFormData({...formData, nom_parent: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Téléphone</label>
                      <input 
                        type="tel" required
                        value={formData.tel_parent}
                        onChange={e => setFormData({...formData, tel_parent: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 ml-4">Email</label>
                      <input 
                        type="email" required
                        value={formData.email_parent}
                        onChange={e => setFormData({...formData, email_parent: e.target.value})}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600" />
                    Dossier d'Inscription (PDF UNIQUE)
                  </h4>
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                      Veuillez soumettre un SEUL fichier PDF contenant les pièces suivantes :
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {config.pieces_requises.map((piece: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl">
                          <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center text-xs font-black">{i+1}</span>
                          <span className="text-xs font-bold text-slate-600">{piece}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="relative">
                      <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="enroll-pdf" />
                      <label 
                        htmlFor="enroll-pdf"
                        className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2.5rem] cursor-pointer transition-all ${
                          formData.dossier_pdf_data ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 shadow-sm'
                        }`}
                      >
                        <FileUp className={formData.dossier_pdf_data ? 'text-emerald-500' : 'text-slate-300'} size={48} />
                        <p className={`mt-4 font-black text-lg ${formData.dossier_pdf_data ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {formData.dossier_pdf_data ? 'Dossier prêt à l\'envoi' : 'Cliquer pour joindre le dossier PDF'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Format PDF uniquement (Max 15MB)</p>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    disabled={isSubmitting}
                    className="w-full py-6 bg-indigo-600 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                  >
                    {isSubmitting ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : <><Send size={24} /> Soumettre ma demande d'inscription</>}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-bold uppercase mt-6 tracking-widest leading-relaxed">
                    En soumettant ce formulaire, vous acceptez les conditions de traitement des données personnelles de l'établissement.
                  </p>
                </div>
              </form>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 pt-24 pb-12 text-white">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
              <span className="text-xl font-black">{config.nom_ecole}</span>
            </div>
            <p className="text-slate-400 font-medium leading-relaxed">
              Une institution dédiée au développement intellectuel et moral de chaque enfant. Excellence, Intégrité, Innovation.
            </p>
          </div>
          <div className="space-y-6">
            <h4 className="text-lg font-black tracking-tight">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                <MapPin size={20} className="text-indigo-400" />
                {config.adresse}
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                <Phone size={20} className="text-indigo-400" />
                {config.telephone}
              </div>
              <div className="flex items-center gap-3 text-slate-400 font-bold text-sm">
                <Mail size={20} className="text-indigo-400" />
                {config.email}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <h4 className="text-lg font-black tracking-tight">Liens Utiles</h4>
            <ul className="space-y-3">
              <li><button onClick={() => navigate('/public/suivi-candidature')} className="text-slate-400 font-bold text-sm hover:text-white transition-colors">Suivi de dossier</button></li>
              <li><button className="text-slate-400 font-bold text-sm hover:text-white transition-colors">Notre équipe</button></li>
              <li><button className="text-slate-400 font-bold text-sm hover:text-white transition-colors">Vie scolaire</button></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 border-t border-white/10 pt-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">&copy; 2026 {config.nom_ecole}. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
             <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center hover:bg-indigo-600 transition-colors cursor-pointer">
                <Star size={16} />
             </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
