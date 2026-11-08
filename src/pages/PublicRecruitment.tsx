import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { 
  GraduationCap, Briefcase, Calendar, CheckCircle2, 
  FileText, ArrowRight, ChevronRight, ListChecks, 
  Info, AlertCircle, Phone, Mail, MapPin, Sparkles,
  FileUp, Send, Check, Clock, UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Campaign {
  id: number;
  type: 'enseignant' | 'personnel';
  titre: string;
  description: string;
  conditions: string;
  postes: string;
  matieres: string;
  diplomes: string;
  competences: string;
  pieces_requises: string;
  status: 'ouvert' | 'ferme';
  date_ouverture: string;
  date_fermeture: string;
  nom_ecole: string;
  logo: string;
}

export default function PublicRecruitment() {
  const { token } = useParams<{ token: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<{ code: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    poste_vise: '',
    matiere_visee: '',
    diplome_obtenu: '',
    experience_annees: 0,
    dossier_pdf_data: '',
  });

  useEffect(() => {
    if (token) {
      apiFetch(`/api/public/recrutement/campagne/${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            toast.error(data.error);
          } else {
            setCampaign(data);
            // Pre-select first position if available
            const postes = JSON.parse(data.postes || '[]');
            if (postes.length > 0) setFormData(prev => ({ ...prev, poste_vise: postes[0] }));
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
      toast.error("Le dossier PDF est requis.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/public/recrutement/postuler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, campagne_id: campaign?.id })
      });
      const data = await res.json();
      if (res.ok) {
        setSubmissionSuccess({ code: data.code });
        toast.success("Candidature soumise avec succès !");
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!campaign) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
      <AlertCircle size={64} className="text-slate-300 mb-4" />
      <h1 className="text-2xl font-black text-slate-900">Offre non disponible</h1>
      <p className="text-slate-500 mt-2">Cette offre de recrutement est introuvable ou a expiré.</p>
      <button onClick={() => window.history.back()} className="mt-6 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black">Retour</button>
    </div>
  );

  const pieces = JSON.parse(campaign.pieces_requises || '[]');
  const postes = JSON.parse(campaign.postes || '[]');
  const matieres = JSON.parse(campaign.matieres || '[]');
  const diplomesInfo = JSON.parse(campaign.diplomes || '{}');

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
        <h1 className="text-3xl font-black text-slate-900 mb-4">Candidature Envoyée !</h1>
        <p className="text-slate-500 font-medium mb-8">
          Merci d'avoir postulé. Votre dossier a été transmis à l'équipe de recrutement de <strong>{campaign.nom_ecole}</strong>.
        </p>
        
        <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Votre Code de Suivi</p>
          <p className="text-4xl font-black text-indigo-600 tracking-tighter">{submissionSuccess.code}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-4 italic">Veuillez conserver ce code précieusement pour suivre l'évolution de votre dossier.</p>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate('/public/suivi-candidature')}
            className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <UserCheck size={24} />
            Vérifier l'évolution du dossier
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 text-slate-500 font-bold hover:text-slate-900"
          >
            Retourner à l'accueil
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header / Hero */}
      <div className="relative bg-slate-900 overflow-hidden pt-16 pb-32 md:pt-32 md:pb-56">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-transparent z-0"></div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center p-3">
              {campaign.logo ? (
                <img src={campaign.logo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <GraduationCap className="text-white" size={32} />
              )}
            </div>
            <div>
              <p className="text-indigo-400 font-black uppercase tracking-[0.2em] text-[10px]">Offre de Recrutement</p>
              <h2 className="text-white text-xl font-black">{campaign.nom_ecole}</h2>
            </div>
          </div>

          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-8">
              {campaign.titre}
            </h1>
            <p className="text-lg md:text-xl text-slate-300 font-medium leading-relaxed mb-10">
              {campaign.description}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 text-slate-400 text-sm font-bold">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-indigo-400" />
                Clôture : {new Date(campaign.date_fermeture).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-400" />
                {postes.length} {postes.length > 1 ? 'postes disponibles' : 'poste disponible'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 -mt-24 relative z-20 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details Column */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100"
            >
              <div className="space-y-10">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <ListChecks size={24} />
                    </div>
                    Profil Recherché & Conditions
                  </h3>
                  <div className="prose prose-slate max-w-none text-slate-600 font-medium leading-loose">
                    {campaign.conditions}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Postes Concernés</h4>
                    <ul className="space-y-3">
                      {postes.map((p: string, i: number) => (
                        <li key={i} className="flex items-center gap-3 text-sm font-black text-slate-700">
                          <ChevronRight size={16} className="text-indigo-500" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {campaign.type === 'enseignant' && matieres.length > 0 && (
                    <div className="p-8 bg-indigo-50/30 rounded-[2.5rem] border border-indigo-100/50">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Matières Prioritaires</h4>
                      <div className="flex flex-wrap gap-2">
                        {matieres.map((m: string, i: number) => (
                          <span key={i} className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-sm border border-indigo-100">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <FileText size={24} />
                    </div>
                    Documents à fournir
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pieces.map((p: string, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{p}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                    <Info className="text-amber-500 flex-shrink-0 mt-1" size={24} />
                    <p className="text-xs font-bold text-amber-800 leading-relaxed">
                      Important : Toutes les pièces doivent être réunies en un <strong>fichier unique PDF</strong> suivant l'ordre indiqué ci-dessus avant la soumission.
                    </p>
                  </div>
                </div>
              </div>

              {!showApplyForm && (
                <div className="mt-16 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-center gap-6">
                  <button 
                    onClick={() => setShowApplyForm(true)}
                    className="group relative inline-flex items-center justify-center px-12 py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-200 hover:scale-[1.03] active:scale-95 transition-all overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Postuler à cette offre
                      <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </button>
                  <button 
                    onClick={() => navigate('/public/suivi-candidature')}
                    className="inline-flex items-center justify-center px-10 py-6 bg-white text-indigo-600 border-2 border-indigo-100 rounded-[2rem] font-black text-xl shadow-xl shadow-slate-100 hover:scale-[1.03] active:scale-95 transition-all"
                  >
                    Suivre mon dossier
                  </button>
                </div>
              )}
            </motion.div>

            <AnimatePresence>
              {showApplyForm && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-indigo-100 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-3xl font-black text-slate-900">Formulaire de Dépôt</h3>
                    <button 
                      onClick={() => setShowApplyForm(false)}
                      className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Nom</label>
                        <input 
                          type="text" required
                          value={formData.nom}
                          onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Prénom</label>
                        <input 
                          type="text" required
                          value={formData.prenom}
                          onChange={e => setFormData({...formData, prenom: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Email</label>
                        <input 
                          type="email" required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Téléphone</label>
                        <input 
                          type="tel" required
                          value={formData.telephone}
                          onChange={e => setFormData({...formData, telephone: e.target.value})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {campaign && campaign.type !== 'enseignant' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Poste Visé</label>
                          <select 
                            required
                            value={formData.poste_vise}
                            onChange={e => setFormData({...formData, poste_vise: e.target.value})}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 appearance-none"
                          >
                            <option value="">Sélectionner un poste...</option>
                            {JSON.parse(campaign.postes || '[]').map((p: string) => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      )}
                      {campaign && campaign.type === 'enseignant' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Matières souhaitées</label>
                          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap gap-2">
                             {JSON.parse(campaign.matieres || '[]').map((m: string) => (
                               <label key={m} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-all">
                                 <input 
                                   type="checkbox"
                                   checked={formData.matiere_visee.split(', ').includes(m)}
                                   onChange={(e) => {
                                      const current = formData.matiere_visee ? formData.matiere_visee.split(', ') : [];
                                      const next = e.target.checked ? [...current, m] : current.filter(x => x !== m);
                                      setFormData({...formData, matiere_visee: next.join(', ')});
                                   }}
                                   className="w-4 h-4 rounded text-indigo-600"
                                 />
                                 <span className="text-[10px] font-bold text-slate-600">{m}</span>
                               </label>
                             ))}
                             {JSON.parse(campaign.matieres || '[]').length === 0 && (
                               <div className="text-amber-600 text-[10px] font-bold">Aucune matière spécifiée pour ce recrutement.</div>
                             )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Diplôme le plus élevé</label>
                        <input 
                          type="text" required
                          value={formData.diplome_obtenu}
                          onChange={e => setFormData({...formData, diplome_obtenu: e.target.value})}
                          placeholder={diplomesInfo[formData.poste_vise] || "ex: Master en Pédagogie"}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Années d'expérience</label>
                        <input 
                          type="number" required min="0"
                          value={formData.experience_annees}
                          onChange={e => setFormData({...formData, experience_annees: parseInt(e.target.value) || 0})}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-4">Dossier de Candidature (PDF UNIQUE)</label>
                      <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-4">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase mb-2">Pièces à inclure dans l'ordre :</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {JSON.parse(campaign?.pieces_requises || '[]').map((p: string, i: number) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <span className="w-4 h-4 bg-indigo-200 text-indigo-700 rounded-full flex items-center justify-center text-[8px] font-black">{i+1}</span>
                              <span className="text-[10px] font-bold text-slate-600">{p}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <input 
                          type="file" 
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden" 
                          id="pdf-upload"
                        />
                        <label 
                          htmlFor="pdf-upload"
                          className={`flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${
                            formData.dossier_pdf_data ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30'
                          }`}
                        >
                          <FileUp className={formData.dossier_pdf_data ? 'text-emerald-500' : 'text-slate-400'} size={48} />
                          <p className={`mt-4 font-black ${formData.dossier_pdf_data ? 'text-emerald-600' : 'text-slate-600'}`}>
                            {formData.dossier_pdf_data ? 'Fichier sélectionné avec succès' : 'Cliquez pour uploader votre PDF'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-2">Format PDF uniquement (Max 10MB)</p>
                        </label>
                      </div>
                    </div>

                    <div className="pt-6">
                      <button 
                        disabled={isSubmitting}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Soumission en cours...
                          </>
                        ) : (
                          <>
                            <Send size={24} />
                            Envoyer ma candidature
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <div className="bg-slate-900 p-8 rounded-[3rem] text-white">
                <h4 className="text-xl font-black mb-4">À propos de nous</h4>
                <p className="text-sm text-slate-400 leading-relaxed mb-6">
                  {campaign.nom_ecole} est un établissement d'excellence engagé pour une éducation de qualité. Rejoindre notre équipe, c'est participer à un projet humain et innovant.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <MapPin size={18} className="text-indigo-400" />
                    Bénin
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold">
                    <Phone size={18} className="text-indigo-400" />
                    Contactez l'administration
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 p-8 rounded-[3rem] border border-indigo-100">
                <Sparkles size={32} className="text-indigo-600 mb-4" />
                <h4 className="text-lg font-black text-indigo-900 mb-2">Déjà postulé ?</h4>
                <p className="text-xs font-bold text-indigo-700 leading-relaxed mb-6">
                  Si vous avez déjà soumis votre dossier, vous pouvez vérifier son statut à tout moment avec votre code de suivi.
                </p>
                <button 
                  onClick={() => navigate('/public/suivi-candidature')}
                  className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm shadow-sm hover:shadow-md transition-all"
                >
                  Suivre mon dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="bg-slate-50 py-12 border-t border-slate-100 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          &copy; 2026 {campaign.nom_ecole} • Système de Recrutement Sécurisé
        </p>
      </footer>
    </div>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}

function Link({ size }: { size?: number }) {
  return <ChevronRight size={size} />;
}
