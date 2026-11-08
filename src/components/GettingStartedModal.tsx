import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  GraduationCap, 
  School, 
  BookOpen, 
  Users, 
  ClipboardList, 
  CheckCircle2, 
  ArrowRight, 
  UserCheck, 
  Calculator, 
  Award, 
  FileDown, 
  Loader2, 
  CreditCard, 
  Clock, 
  FileText, 
  ShieldCheck, 
  QrCode, 
  Database, 
  Search, 
  BellRing, 
  Building2, 
  Layers, 
  HelpCircle,
  Smartphone,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateUserGuidePDF } from '../utils/userGuidePdfGenerator';
import toast from 'react-hot-toast';

interface GettingStartedModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCycle?: 'primaire' | 'secondaire' | 'finances' | 'edt' | 'documents' | 'all';
}

type TabType = 'demarrage' | 'primaire' | 'secondaire' | 'finances' | 'edt' | 'secretariat';

export default function GettingStartedModal({ isOpen, onClose, initialCycle = 'all' }: GettingStartedModalProps) {
  const getInitialTab = (): TabType => {
    if (initialCycle === 'secondaire') return 'secondaire';
    if (initialCycle === 'primaire') return 'primaire';
    if (initialCycle === 'finances') return 'finances';
    if (initialCycle === 'edt') return 'edt';
    if (initialCycle === 'documents') return 'secretariat';
    return 'demarrage';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab());
  const [searchTerm, setSearchTerm] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleAction = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleDownloadPdf = async (autoPrint: boolean = false) => {
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Génération du guide officiel complet en PDF...');
    try {
      await generateUserGuidePDF(autoPrint);
      toast.success('Guide d\'utilisation officiel téléchargé avec succès !', { id: toastId });
    } catch (error) {
      console.error('Erreur lors du téléchargement du guide PDF :', error);
      toast.error('Erreur lors de la génération du guide PDF', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-primary-700 via-indigo-600 to-purple-700 text-white flex items-center justify-between relative shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 font-bold border border-white/20 shadow-inner shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-1">
                Guide Opérationnel Certifié
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Manuel & Guide de Démarrage
              </h2>
              <p className="text-xs sm:text-sm text-primary-100 mt-0.5">
                Documentation complète, règles de calcul, flux de gestion et raccourcis d'action MégafixaEduc Pro.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDownloadPdf(false)}
              disabled={isDownloadingPdf}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-all border border-white/20 shadow-sm"
              title="Télécharger le manuel complet en PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileDown size={15} />
              )}
              <span>Télécharger le Guide PDF</span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              title="Fermer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-4 pt-3 overflow-x-auto no-scrollbar gap-1.5 text-xs sm:text-sm font-bold">
          <button
            onClick={() => setActiveTab('demarrage')}
            className={`pb-3 px-3.5 rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'demarrage'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400 bg-white dark:bg-slate-900 shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <School size={16} />
            <span>1. Démarrage & Structure</span>
          </button>

          <button
            onClick={() => setActiveTab('primaire')}
            className={`pb-3 px-3.5 rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'primaire'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400 bg-white dark:bg-slate-900 shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen size={16} />
            <span>2. Maternelle & Primaire</span>
          </button>

          <button
            onClick={() => setActiveTab('secondaire')}
            className={`pb-3 px-3.5 rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'secondaire'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-900 shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <GraduationCap size={16} />
            <span>3. Secondaire (Collège/Lycée)</span>
          </button>

          <button
            onClick={() => setActiveTab('finances')}
            className={`pb-3 px-3.5 rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'finances'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <CreditCard size={16} />
            <span>4. Scolarité & Finances</span>
          </button>

          <button
            onClick={() => setActiveTab('edt')}
            className={`pb-3 px-3.5 rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'edt'
                ? 'border-amber-600 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900 shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock size={16} />
            <span>5. Emplois du Temps & Salles</span>
          </button>

          <button
            onClick={() => setActiveTab('secretariat')}
            className={`pb-3 px-3.5 rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'secretariat'
                ? 'border-purple-600 text-purple-700 dark:text-purple-400 bg-white dark:bg-slate-900 shadow-2xs font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText size={16} />
            <span>6. Cartes QR & Documents</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: DÉMARRAGE & STRUCTURE */}
          {activeTab === 'demarrage' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-primary-900 dark:text-primary-200 flex items-center gap-2">
                    <School className="text-primary-600" size={20} />
                    Bienvenue dans MégafixaEduc Pro
                  </h3>
                  <p className="text-xs sm:text-sm text-primary-700 dark:text-primary-300 mt-1 leading-relaxed">
                    Plateforme tout-en-un certifiée pour la gestion administrative, pédagogique, financière et disciplinaire des établissements d'enseignement général et technique.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction('/parametres')}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Identité École</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Step Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-black text-xs flex items-center justify-center">1</div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-2">Identité & Logo Officiel</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Téléversez votre logo officiel (PNG/JPEG) et renseignez les coordonnées de l'école. Ils apparaîtront automatiquement sur tous les bulletins, reçus et cartes.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleAction('/parametres')} 
                    className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Modifier l'identité <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-black text-xs flex items-center justify-center">2</div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-2">Année Scolaire & Périodes</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Activez l'année scolaire en cours (ex: 2025-2026) et découpez en Trimestres (T1, T2, T3) ou Semestres selon le règlement pédagogique de votre établissement.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleAction('/annees-scolaires')} 
                    className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Gérer les années <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-full bg-primary-600 text-white font-black text-xs flex items-center justify-center">3</div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mt-2">Comptes Utilisateurs & Rôles</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Créez les accès pour la Direction, le Censeur, le Surveillant, le Secrétariat, les Comptables, les Enseignants et les Parents d'élèves.
                    </p>
                  </div>
                  <button 
                    onClick={() => handleAction('/utilisateurs')} 
                    className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Gérer les comptes <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Permissions Matrix Table */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 overflow-hidden">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="text-emerald-600" size={16} />
                  Matrice des Droits & Rôles Applicatifs (RBAC)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-700/50 text-slate-700 dark:text-slate-200 font-bold">
                        <th className="p-2.5 rounded-l-lg">Rôle</th>
                        <th className="p-2.5">Périmètre d'action principal</th>
                        <th className="p-2.5">Droits spécifiques</th>
                        <th className="p-2.5 rounded-r-lg">Accès finances</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      <tr>
                        <td className="p-2.5 font-bold text-primary-700 dark:text-primary-400">Direction / Super Admin</td>
                        <td className="p-2.5">Gestion globale de l'école</td>
                        <td className="p-2.5">Clôture d'année, sauvegardes SQL, audit logs, validation finale</td>
                        <td className="p-2.5 font-semibold text-emerald-600">Total (Tout)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-indigo-700 dark:text-indigo-400">Censeur / Dir. Études</td>
                        <td className="p-2.5">Pédagogie & Emplois du temps</td>
                        <td className="p-2.5">Validation des épreuves, EDT, autorisations d'ajustement de notes</td>
                        <td className="p-2.5 text-slate-400">Consultation</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-amber-700 dark:text-amber-400">Surveillant Général</td>
                        <td className="p-2.5">Discipline & Assiduité</td>
                        <td className="p-2.5">Pointage des retards/absences, sanctions, convocations de parents</td>
                        <td className="p-2.5 text-slate-400">Aucun</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-purple-700 dark:text-purple-400">Secrétariat</td>
                        <td className="p-2.5">Inscriptions & Actes</td>
                        <td className="p-2.5">Dossiers élèves, certificats de scolarité, attestations, cartes</td>
                        <td className="p-2.5 text-slate-400">Reçus simples</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-emerald-700 dark:text-emerald-400">Comptable / Caissier</td>
                        <td className="p-2.5">Caisse & Frais de scolarité</td>
                        <td className="p-2.5">Encaissements, reçus QR Code, journal de caisse, salaires profs</td>
                        <td className="p-2.5 font-semibold text-emerald-600">Total (Caisse)</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-blue-700 dark:text-blue-400">Enseignant</td>
                        <td className="p-2.5">Évaluation & Cours</td>
                        <td className="p-2.5">Saisie de ses notes, dépôt d'épreuves, demandes d'aménagement EDT</td>
                        <td className="p-2.5 text-slate-400">Fiche de paie perso</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">Parent / Élève</td>
                        <td className="p-2.5">Suivi de scolarité</td>
                        <td className="p-2.5">Consultation bulletins QR, assiduité, paiement en ligne FedaPay</td>
                        <td className="p-2.5 text-primary-600">Paiement Mobile Money</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MATERNELLE & PRIMAIRE */}
          {activeTab === 'primaire' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                    <BookOpen className="text-emerald-600" size={20} />
                    Espace Pédagogique Maternelle & Primaire
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                    Organisation simplifiée centrée sur l'Enseignant Titulaire Unique et le double barème officiel Note /20 + Perfectionnement (0 à 2).
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction('/accueil-primaire')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Tableau Primaire</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 4 Steps Primaire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <School className="text-emerald-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Classes & Enseignant Titulaire</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Configurez vos classes élémentaires (Maternelle I, II, CI, CP, CE1, CE2, CM1, CM2). Assignez un Maître ou Maîtresse Titulaire unique pour la totalité des matières.
                  </p>
                  <button 
                    onClick={() => handleAction('/classes-primaire')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Configurer les classes primaires <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</span>
                    <BookOpen className="text-emerald-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Matières & Sous-Matières Modulaires</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Définissez les domaines fondamentaux : Expression Orale, Lecture, Écriture, Mathématiques, Éveil Scientifique, Dessin, EPS.
                  </p>
                  <button 
                    onClick={() => handleAction('/matieres-primaire')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Gérer les disciplines primaires <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">3</span>
                    <Calculator className="text-emerald-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Saisie Rapide & Double Barème</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Saisie instantanée pré-remplie : saisissez la Note /20 et le Perfectionnement (0 à 2 points). Le système calcule automatiquement la note finale plafonnée à 20.
                  </p>
                  <button 
                    onClick={() => handleAction('/notes-primaire')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Saisie des notes primaires <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">4</span>
                    <Award className="text-emerald-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Bulletins Mensuels & Trimestriels</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Générez les bulletins d'évaluation avec calcul automatique du rang, de la moyenne de classe, des mentions d'excellence et signatures pré-imprimées.
                  </p>
                  <button 
                    onClick={() => handleAction('/bulletins-primaire')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Éditer les bulletins primaires <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Formula Callout */}
              <div className="p-4 bg-emerald-100/60 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs space-y-1.5 text-emerald-900 dark:text-emerald-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  Formule Mathématique du Primaire :
                </div>
                <p className="font-mono text-emerald-800 dark:text-emerald-300">
                  Note Finale = Minimum(20, Note Obtenue [/20] + Note de Perfectionnement [0 à 2])
                </p>
                <p className="text-emerald-700 dark:text-emerald-400">
                  Exemple : Un élève avec 18.5/20 et +2.0 de perfectionnement obtient 20/20 (plafonnement automatique conforme au barème ministériel).
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: SECONDAIRE */}
          {activeTab === 'secondaire' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                    <GraduationCap className="text-indigo-600" size={20} />
                    Cycle Secondaire Général & Technique (Collège & Lycée)
                  </h3>
                  <p className="text-xs sm:text-sm text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">
                    Gestion des professeurs par discipline, coefficients officiels par filière, devoirs surveillés (DS1, DS2), compositions et bulletins d'excellence.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction('/accueil-secondaire')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Tableau Secondaire</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 4 Steps Secondaire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">1</span>
                    <Layers className="text-indigo-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Classes, Séries & Coefficients</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Paramétrez les promotions de la 6ème à la Terminale (Séries A, B, C, D, TI). Définissez les coefficients officiels de chaque matière par classe.
                  </p>
                  <button 
                    onClick={() => handleAction('/classes-secondaire')} 
                    className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Gérer les classes & séries <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">2</span>
                    <UserCheck className="text-indigo-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Professeurs par Matière</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Attribuez chaque professeur spécialisé à sa matière dans la classe. Nommez le Professeur Principal pour la rédaction des bilans trimestriels.
                  </p>
                  <button 
                    onClick={() => handleAction('/enseignants-secondaire')} 
                    className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Attribuer les enseignants <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">3</span>
                    <Calculator className="text-indigo-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Interrogations, DS1/DS2 & Compositions</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Saisie des évaluations formatives et sommatives. Le système pré-remplit les notes existantes pour une saisie fluide et sans erreur.
                  </p>
                  <button 
                    onClick={() => handleAction('/notes-secondaire')} 
                    className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Saisie des devoirs & notes <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center">4</span>
                    <Award className="text-indigo-600" size={18} />
                  </div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Bulletins Officiels avec QR Code</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Calcul automatique de la moyenne pondérée, total points, rang, mentions, plus forte/faible moyenne, et QR Code de certification publique.
                  </p>
                  <button 
                    onClick={() => handleAction('/bulletins-secondaire')} 
                    className="w-full py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Imprimer les bulletins officiels <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Formula & Rule Box */}
              <div className="p-4 bg-indigo-100/60 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 rounded-2xl text-xs space-y-2 text-indigo-900 dark:text-indigo-200">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-indigo-600" />
                  Règle de Pondération du Secondaire :
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 bg-white/70 dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <strong>Moyenne Matière :</strong><br />
                    (Moyenne Interros + DS1 + 2×DS2) ÷ Pondération
                  </div>
                  <div className="p-2 bg-white/70 dark:bg-slate-800/80 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <strong>Moyenne Générale :</strong><br />
                    Σ (Moyenne Matière × Coeff) ÷ Σ Coeffs
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FINANCES & SCOLARITÉ */}
          {activeTab === 'finances' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                    <CreditCard className="text-emerald-600" size={20} />
                    Comptabilité Scolaire, Échéanciers & Recouvrement
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 mt-1 leading-relaxed">
                    Gestion des tranches de paiement, encaissement rapide, passerelle FedaPay pour paiement en ligne (Mobile Money MTN / Moov / Celtiis / CB), et reçus certifiés QR.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction('/frais-scolarite')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Frais de Scolarité</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 3 Pillars of Finances */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">1</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Grille Tarifaire & Échéances</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Définissez les montants par classe : Inscription, Réinscription, Scolarité, Cantine, Bus, Uniformes. Fixez les dates limites des tranches (T1, T2, T3).
                  </p>
                  <button 
                    onClick={() => handleAction('/frais-scolarite')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Configurer la grille <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">2</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Encaissement & Reçus QR</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Enregistrez les versements en espèces, chèques ou virements. Génération instantanée d'un reçu officiel avec QR Code infalsifiable pour preuve légale.
                  </p>
                  <button 
                    onClick={() => handleAction('/paiements')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Encaisser un paiement <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center">3</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Paiement Mobile Money FedaPay</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Les parents règlent directement depuis leur smartphone via MTN MoMo, Moov Money, Celtiis Cash ou Carte bancaire. Mise à jour instantanée du solde.
                  </p>
                  <button 
                    onClick={() => handleAction('/espace-parents')} 
                    className="w-full py-2 px-3 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Voir l'espace parent <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* Table of Fee Types */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4">
                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
                  Types de Frais & Modes de Règlement Disponibles
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block">Scolarité Générale</span>
                    <span className="text-slate-500 text-[11px]">Découpée en 3 tranches d'échéances trimestrielles obligatoires.</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block">Inscription / Réinscr.</span>
                    <span className="text-slate-500 text-[11px]">Payable à l'ouverture du dossier pour validation de la place.</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block">Cantine & Transport</span>
                    <span className="text-slate-500 text-[11px]">Options mensuelles ou trimestrielles avec gestion des régimes.</span>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-700/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white block">FedaPay Mobile Money</span>
                    <span className="text-slate-500 text-[11px]">MTN MoMo, Moov Money, Celtiis, Visa, Mastercard sécurisé.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: EMPLOIS DU TEMPS & SALLES */}
          {activeTab === 'edt' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                    <Clock className="text-amber-600" size={20} />
                    Planification Hebdomadaire & Fusion Continue Multi-Heures
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                    Grille continue de 07h00 à 19h00 (Lundi à Samedi), fusion verticale sans coupure pour les cours consécutifs, détection de conflits et gestion des salles.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction('/emploi-du-temps')}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Ouvrir l'EDT</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 3 Pillars of EDT */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">1</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Fusion Continue Multi-Heures</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Lorsqu'un cours dure 2h, 3h ou 4h consécutives, la cellule s'étend en un seul bloc vertical élégant sans aucun trait de séparation horizontal.
                  </p>
                  <button 
                    onClick={() => handleAction('/emploi-du-temps')} 
                    className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Grille de planification <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">2</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Salles, Bâtiments & Conflits</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Inventoriez les salles de classe, laboratoires et capacités. Le système empêche automatiquement la double-réservation d'une salle ou d'un professeur.
                  </p>
                  <button 
                    onClick={() => handleAction('/salles')} 
                    className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Gérer les salles <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center">3</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Demandes d'Autorisation Enseignant</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Les enseignants peuvent formuler des demandes d'échange de créneau ou d'absence. Le censeur ou la direction reçoit une notification pour valider.
                  </p>
                  <button 
                    onClick={() => handleAction('/emploi-du-temps-requests')} 
                    className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Suivre les demandes <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SECRÉTARIAT, CARTES QR & DOCUMENTS */}
          {activeTab === 'secretariat' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                    <FileText className="text-purple-600" size={20} />
                    Secrétariat Numérique, Cartes Scolaires QR & Banque d'Épreuves
                  </h3>
                  <p className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 mt-1 leading-relaxed">
                    Production instantanée d'actes officiels en 1 clic, badges plastifiables avec QR Code de vérification publique et archivage des sujets d'examens.
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAction('/cartes-scolaires')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <span>Cartes Scolaires</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* 3 Pillars of Documents */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">1</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Cartes Scolaires & Badges QR</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Format badge officiel (85.6 × 54 mm) avec logo, photo de l'élève et QR Code infalsifiable permettant de vérifier l'inscription en ligne instantanément.
                  </p>
                  <button 
                    onClick={() => handleAction('/cartes-scolaires')} 
                    className="w-full py-2 px-3 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-800 dark:text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Imprimer les cartes <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">2</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Certificats & Attestations en 1 Clic</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Édition automatique de certificats de scolarité, attestations de fréquentation, fiches de radiation/transfert et attestations de travail pour les enseignants.
                  </p>
                  <button 
                    onClick={() => handleAction('/documents-demandes')} 
                    className="w-full py-2 px-3 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-800 dark:text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Générer des documents <ArrowRight size={14} />
                  </button>
                </div>

                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">3</div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">Banque d'Épreuves & Examens</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Espace collaboratif : les professeurs déposent leurs sujets et corrigés types. Le Censeur valide la qualité pédagogique avant le tirage des compositions.
                  </p>
                  <button 
                    onClick={() => handleAction('/epreuves')} 
                    className="w-full py-2 px-3 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 text-purple-800 dark:text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-colors"
                  >
                    Banque d'épreuves <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <Award size={16} className="text-emerald-500 shrink-0" />
            <span>Assistance MEGAFIXA Tech : Tél / WhatsApp +229 0161107918 / +229 0141264238</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleDownloadPdf(false)}
              disabled={isDownloadingPdf}
              className="px-4 py-2.5 bg-primary-50 hover:bg-primary-100 text-primary-700 font-bold text-xs rounded-xl transition-all border border-primary-200 shadow-xs flex items-center gap-1.5"
            >
              {isDownloadingPdf ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FileDown size={15} />
              )}
              <span>Télécharger le Manuel PDF Complet</span>
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs"
            >
              Fermer le guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
