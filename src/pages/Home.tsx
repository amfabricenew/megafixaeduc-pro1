import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  User,
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Contact,
  Receipt,
  DollarSign,
  Calendar, 
  AlertCircle,
  Settings,
  Building2,
  History,
  ArrowRightCircle,
  Clock,
  UserSquare2,
  FileText,
  Sparkles,
  ArrowRight,
  School,
  BookMarked,
  HelpCircle,
  Compass,
  FileDown,
  Loader2,
  FileCheck2,
  DoorOpen,
  Package,
  Library,
  BookOpenCheck,
  MessageSquare,
  IdCard,
  UserCog,
  UserPlus,
  FileStack,
  CalendarClock,
  PenTool,
  BellRing,
  UserCheck,
  Lock,
  X,
  Mail,
  Phone
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/TranslationContext';
import { useNotifications } from '../contexts/NotificationContext';
import { motion } from 'framer-motion';
import GettingStartedModal from '../components/GettingStartedModal';
import { useAppSync } from '../utils/api';
import { generateUserGuidePDF } from '../utils/userGuidePdfGenerator';
import toast from 'react-hot-toast';
import HomeTeacher from './HomeTeacher';
import HomeParent from './HomeParent';
import SchoolCarousel from '../components/SchoolCarousel';

interface HomeProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Home({ cycle = 'all' }: HomeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'super_admin') {
      navigate('/super-admin');
    }
  }, [user, navigate]);

  // If logged in as teacher, render dedicated teacher dashboard
  if (user?.role === 'enseignant') {
    return <HomeTeacher />;
  }

  // If logged in as parent, render dedicated parent dashboard
  if (user?.role === 'parent') {
    return <HomeParent />;
  }

  const { t } = useTranslation();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [lockedModal, setLockedModal] = useState<{ title: string; motif: string } | null>(null);

  useEffect(() => {
    fetch('/api/school-info')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) setSchoolInfo(data);
      })
      .catch(() => {});
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';
  const isPrimaireLocked = !isSuperAdmin && (
    (schoolInfo?.espace_primaire_actif === 0) ||
    (user?.espace_primaire_actif === 0) ||
    ((user as any)?.school_info?.espace_primaire_actif === 0)
  );
  const isSecondaireLocked = !isSuperAdmin && (
    (schoolInfo?.espace_secondaire_actif === 0) ||
    (user?.espace_secondaire_actif === 0) ||
    ((user as any)?.school_info?.espace_secondaire_actif === 0)
  );

  const primaireLockMotif = schoolInfo?.espace_primaire_motif_verrouillage || user?.espace_primaire_motif_verrouillage || (user as any)?.school_info?.espace_primaire_motif_verrouillage || "L'accès à l'espace Maternelle & Primaire a été temporairement suspendu ou verrouillé par le Super Administrateur.";
  const secondaireLockMotif = schoolInfo?.espace_secondaire_motif_verrouillage || user?.espace_secondaire_motif_verrouillage || (user as any)?.school_info?.espace_secondaire_motif_verrouillage || "L'accès à l'espace Secondaire a été temporairement suspendu ou verrouillé par le Super Administrateur.";

  // Auto-sync for external window updates (less frequent for home)
  useAppSync(() => {
    // Keep page synchronized
  }, 60000);

  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Génération du guide officiel en PDF...');
    try {
      await generateUserGuidePDF(false);
      toast.success('Guide d\'utilisation officiel téléchargé avec succès !', { id: toastId });
    } catch (error) {
      console.error('Erreur lors du téléchargement du guide PDF :', error);
      toast.error('Erreur lors de la génération du guide PDF', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const primaryMenus = [
    { icon: LayoutDashboard, label: 'Tableau de Bord Primaire', path: '/tableau-de-bord-primaire', color: 'bg-amber-500', desc: 'Statistiques & aperçu du cycle' },
    { icon: GraduationCap, label: 'Classes Maternelle & Primaire', path: '/classes-primaire', color: 'bg-emerald-500', desc: 'Gestion des classes et titulaires' },
    { icon: Users, label: 'Élèves Maternelle & Primaire', path: '/eleves-primaire', color: 'bg-teal-500', desc: 'Inscriptions et dossiers élèves' },
    { icon: ArrowRightCircle, label: 'Gestion des Passages & Redoublements (Primaire)', path: '/promotions-primaire', color: 'bg-orange-500', desc: 'Passages ou redoublements' },
    { icon: UserSquare2, label: 'Maîtres & Maîtresses', path: '/enseignants-primaire', color: 'bg-rose-500', desc: 'Corps enseignant du primaire' },
    { icon: BookOpen, label: 'Matières & Évaluations', path: '/matieres-primaire', color: 'bg-amber-600', desc: 'Programme et sous-matières' },
    { icon: ClipboardList, label: 'Évaluations & Notes', path: '/notes-primaire', color: 'bg-cyan-600', desc: 'Formatives & Sommatives' },
    { icon: Receipt, label: 'Paiements Primaire', path: '/paiements-primaire', color: 'bg-emerald-600', desc: 'Scolarités & reçus primaire' },
  ];

  const secondaryMenus = [
    { icon: LayoutDashboard, label: 'Tableau de Bord Secondaire', path: '/tableau-de-bord-secondaire', color: 'bg-indigo-600', desc: 'Statistiques & suivi collège/lycée' },
    { icon: GraduationCap, label: 'Classes Secondaire', path: '/classes-secondaire', color: 'bg-blue-600', desc: 'Classes de la 6ème à la Tle' },
    { icon: Users, label: 'Élèves Secondaire', path: '/eleves-secondaire', color: 'bg-indigo-500', desc: 'Base élèves et effectifs' },
    { icon: ArrowRightCircle, label: 'Gestion des Passages & Redoublements (Secondaire)', path: '/promotions-secondaire', color: 'bg-violet-500', desc: 'Orientations, passages et redoublements' },
    { icon: UserSquare2, label: 'Enseignants Secondaire', path: '/enseignants-secondaire', color: 'bg-purple-600', desc: 'Professeurs par matière' },
    { icon: UserCheck, label: 'Collecte Enseignants', path: '/collecte-enseignants-secondaire', color: 'bg-emerald-600', desc: 'Formulaires, voeux horaires & intégration' },
    { icon: BookOpen, label: 'Matières Secondaire', path: '/matieres-secondaire', color: 'bg-cyan-600', desc: 'Coefficients et filières' },
    { icon: ClipboardList, label: 'Notes & Bulletins', path: '/notes-secondaire', color: 'bg-blue-700', desc: 'Interrogations, devoirs, examens' },
    { icon: Receipt, label: 'Paiements Secondaire', path: '/paiements-secondaire', color: 'bg-blue-600', desc: 'Scolarités & reçus secondaire' },
    { icon: Calendar, label: 'Emploi du Temps', path: '/emploi-du-temps-secondaire', color: 'bg-indigo-500', desc: 'Planification hebdomadaire' },
  ];

  const sharedMenusByCategory = [
    {
      title: "Gestion Administrative & Personnel",
      icon: Building2,
      color: "text-sky-600",
      items: [
        { icon: School, label: t('school_info'), path: '/ecole', color: 'bg-sky-600', desc: 'Identité de l établissement' },
        { icon: UserCog, label: 'Personnel Admin.', path: '/personnel-administratif', color: 'bg-indigo-600', desc: 'Gestion du staff' },
        { icon: DoorOpen, label: 'Bâtiments & Salles', path: '/batiments-salles', color: 'bg-slate-600', desc: 'Salles & infrastructures' },
        { icon: Package, label: 'Ressources Matérielles', path: '/ressources-materielles', color: 'bg-amber-600', desc: 'Inventaire mobilier & équipements' },
        { icon: IdCard, label: 'Cartes & Badges', path: '/cartes-et-badges', color: 'bg-emerald-600', desc: 'Impression badges' },
        { icon: UserPlus, label: 'Recrutement & Inscriptions', path: '/recrutement-inscriptions', color: 'bg-blue-600', desc: 'Campagnes & admissions' },
        { icon: UserCheck, label: 'Collecte Enseignants', path: '/collecte-enseignants', color: 'bg-emerald-600', desc: 'Fiches & voeux enseignants' },
        { icon: History, label: t('audit_logs'), path: '/audit-logs', color: 'bg-slate-500', desc: 'Suivi des actions' },
      ]
    },
    {
      title: "Finance & Ressources Humaines",
      icon: DollarSign,
      color: "text-emerald-600",
      items: [
        { icon: Receipt, label: 'Paiements Scolarité', path: '/paiements', color: 'bg-purple-600', desc: 'Frais & inscriptions' },
        { icon: DollarSign, label: 'Salaires Enseignants', path: '/salaires-enseignants', color: 'bg-emerald-600', desc: 'Paies & heures' },
      ]
    },
    {
      title: "Pédagogie & Outils Numériques",
      icon: BookOpen,
      color: "text-indigo-600",
      items: [
        { icon: Library, label: 'Bibliothèque Numérique', path: '/bibliotheque', color: 'bg-blue-500', desc: 'Livres & ressources' },
        { icon: BookMarked, label: 'Bibliothèque Scolaire', path: '/bibliotheque-physique', color: 'bg-teal-600', desc: 'Livres physiques' },
        { icon: BookOpenCheck, label: 'Banque d\'Épreuves', path: '/epreuves', color: 'bg-indigo-500', desc: 'Sujets & archives' },
        { icon: PenTool, label: 'Épreuves Compositions', path: '/epreuves-composition', color: 'bg-cyan-600', desc: 'Gestion des tests' },
      ]
    },
    {
      title: "Communication & Requêtes",
      icon: MessageSquare,
      color: "text-primary-600",
      items: [
        { icon: MessageSquare, label: 'Messagerie & SMS', path: '/messagerie', color: 'bg-primary-600', desc: 'Emails & SMS groupés' },
        { icon: BellRing, label: t('alerts'), path: '/alertes', color: 'bg-red-500', desc: 'Notifications système' },
        { icon: CalendarClock, label: 'Demandes EDT', path: '/emploi-du-temps-requests', color: 'bg-slate-500', desc: 'Modifications horaires' },
        { icon: FileStack, label: 'Documents & Demandes', path: '/documents-demandes', color: 'bg-indigo-600', desc: 'Attestations & formulaires' },
      ]
    },
    {
      title: "Configuration & Système",
      icon: Settings,
      color: "text-slate-500",
      items: [
        { icon: Settings, label: t('settings'), path: '/parametres', color: 'bg-slate-400', desc: 'Réglages plateforme' },
      ]
    }
  ];

  if (cycle === 'primaire') {
    if (isPrimaireLocked) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800">
              Espace Verrouillé
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Espace Maternelle & Primaire Momentanément Indisponible
            </h1>
            <p className="text-sm font-semibold text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200/80 max-w-lg mx-auto">
              {primaireLockMotif}
            </p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            L'accès au cycle Maternelle & Primaire a été verrouillé pour cet établissement par le Super Administrateur. Veuillez contacter l'administration de votre école ou le support technique pour débloquer cet espace.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/accueil"
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Retour à l'Accueil Général
            </Link>
            <a
              href="https://wa.me/2290161107918"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Assistance WhatsApp (+229 0161107918)</span>
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 py-4">
        <GettingStartedModal 
          isOpen={showGuideModal} 
          onClose={() => setShowGuideModal(false)} 
          initialCycle="primaire"
        />
        <header className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Espace Maternelle & Primaire
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Bienvenue dans l'espace Primaire & Maternelle
            </h1>
            <p className="text-amber-100 text-base">
              Gérez les classes, les maîtres/maîtresses titulaires, les évaluations formatives et sommatives ainsi que les programmes scolaires du primaire.
            </p>
          </div>
          <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-5 py-3 bg-white/20 hover:bg-white/30 text-white font-extrabold text-sm rounded-2xl backdrop-blur-md border border-white/30 shadow-lg transition-all flex items-center justify-center gap-2"
              title="Télécharger la documentation complète en PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileDown size={18} />
              )}
              Guide PDF
            </button>
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-5 py-3 bg-white text-amber-600 font-extrabold text-sm rounded-2xl shadow-lg hover:bg-amber-50 transition-all flex items-center justify-center gap-2"
            >
              <Compass size={18} /> Guide de démarrage
            </button>
          </div>
          <School size={160} className="absolute -right-8 -bottom-8 text-white/10 pointer-events-none" />
        </header>

        {/* Carrousel d'immersion */}
        <SchoolCarousel 
          compact={true}
          title="Vie de l'Établissement & Nos Écoliers"
          subtitle="Élèves en classe, cour de récréation et activités pédagogiques"
        />

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BookMarked className="text-amber-500" size={24} /> Modules du Primaire & Maternelle
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {primaryMenus.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className="group flex flex-col justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all h-full"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md`}>
                      <item.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {item.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                    Ouvrir <ArrowRight size={14} className="ml-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (cycle === 'secondaire') {
    if (isSecondaireLocked) {
      return (
        <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-rose-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <Lock size={32} />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800">
              Espace Verrouillé
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Espace Secondaire Momentanément Indisponible
            </h1>
            <p className="text-sm font-semibold text-rose-700 bg-rose-50 p-3.5 rounded-2xl border border-rose-200/80 max-w-lg mx-auto">
              {secondaireLockMotif}
            </p>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
            L'accès au cycle Secondaire (Collège & Lycée) a été verrouillé pour cet établissement par le Super Administrateur. Veuillez contacter l'administration de votre école ou le support technique pour débloquer cet espace.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/accueil"
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              Retour à l'Accueil Général
            </Link>
            <a
              href="https://wa.me/2290161107918"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Assistance WhatsApp (+229 0161107918)</span>
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8 py-4">
        <GettingStartedModal 
          isOpen={showGuideModal} 
          onClose={() => setShowGuideModal(false)} 
          initialCycle="secondaire"
        />
        <header className="bg-gradient-to-r from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} /> Espace Secondaire (Collège & Lycée)
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              Bienvenue dans l'espace Secondaire
            </h1>
            <p className="text-indigo-100 text-base">
              Pilotez les enseignements par matière, les coefficients, les devoirs, les compositions et l'attribution des professeurs par classe.
            </p>
          </div>
          <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="px-5 py-3 bg-white/20 hover:bg-white/30 text-white font-extrabold text-sm rounded-2xl backdrop-blur-md border border-white/30 shadow-lg transition-all flex items-center justify-center gap-2"
              title="Télécharger la documentation complète en PDF"
            >
              {isDownloadingPdf ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <FileDown size={18} />
              )}
              Guide PDF
            </button>
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-5 py-3 bg-white text-indigo-600 font-extrabold text-sm rounded-2xl shadow-lg hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
            >
              <Compass size={18} /> Guide de démarrage
            </button>
          </div>
          <GraduationCap size={160} className="absolute -right-8 -bottom-8 text-white/10 pointer-events-none" />
        </header>

        {/* Carrousel d'immersion */}
        <SchoolCarousel 
          compact={true}
          title="Vie Scolaire & Administration Secondaire"
          subtitle="Nos collégiens, lycéens et équipes pédagogiques et administratives au quotidien"
        />

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <BookMarked className="text-indigo-600" size={24} /> Modules du Secondaire
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {secondaryMenus.map((item, index) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className="group flex flex-col justify-between p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all h-full"
                >
                  <div className="space-y-3">
                    <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-md`}>
                      <item.icon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.label}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    Ouvrir <ArrowRight size={14} className="ml-1" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // General Main Entrance
  return (
    <div className="space-y-8 py-4">
      <GettingStartedModal 
        isOpen={showGuideModal} 
        onClose={() => setShowGuideModal(false)} 
        initialCycle="all"
      />

      <header className="flex flex-col md:flex-row items-center justify-between gap-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="space-y-2 max-w-xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-primary-300 uppercase tracking-wider">
            <Sparkles size={14} /> Plateforme Scolaire Multi-Cycles
          </div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-extrabold text-white"
          >
            Bienvenue, {user?.nom}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-slate-300 text-sm md:text-base leading-relaxed"
          >
            Sélectionnez votre espace de travail ou consultez le guide de démarrage rapide pour configurer facilement le premier cycle de votre établissement.
          </motion.p>
        </div>

        <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-extrabold text-sm rounded-2xl backdrop-blur-md border border-white/20 shadow-lg transition-all flex items-center justify-center gap-2"
            title="Télécharger le guide officiel complet en PDF"
          >
            {isDownloadingPdf ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <FileDown size={20} />
            )}
            Guide PDF Officiel
          </button>
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm rounded-2xl shadow-lg hover:brightness-110 transition-all flex items-center justify-center gap-2.5"
          >
            <Compass size={20} className="animate-spin-slow" />
            Guide de démarrage
          </button>
        </div>
        <School size={220} className="absolute -right-12 -bottom-12 text-white/5 pointer-events-none" />
      </header>

      {/* Guide Quick Callout & Documentation Banner */}
      <div className="p-5 bg-gradient-to-r from-amber-500/10 via-primary-500/10 to-indigo-500/10 border border-amber-200/80 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 shadow-xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center shrink-0 font-bold shadow-md">
            <FileCheck2 size={24} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-100 text-primary-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              Documentation & Manuel Officiel
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Manuel d'utilisation & Guide de démarrage</h3>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              Téléchargez le guide complet en PDF (10 modules, spécificités Primaire/Secondaire, notation /20 + perfectionnement, gestion financière, filigrane et mentions légales).
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 shrink-0"
          >
            {isDownloadingPdf ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            Télécharger le Guide en PDF
          </button>
          <button
            onClick={() => setShowGuideModal(true)}
            className="px-4 py-2.5 bg-white text-slate-900 border border-slate-200 font-bold text-xs rounded-xl hover:bg-slate-50 transition-colors shrink-0 shadow-sm flex items-center gap-1.5"
          >
            Guide interactif <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Dual Space Hero Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isPrimaireLocked ? (
            <div 
              onClick={() => setLockedModal({ title: "Espace Maternelle & Primaire Verrouillé", motif: primaireLockMotif })}
              className="group relative block p-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl text-white shadow-lg transition-all overflow-hidden cursor-pointer hover:border-rose-400 border border-slate-600/50"
            >
              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/90 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-white shadow-xs">
                  <Lock size={12} /> Espace Verrouillé
                </span>
                <h2 className="text-2xl font-bold opacity-90">Espace Maternelle & Primaire</h2>
                <p className="text-slate-300 text-sm leading-relaxed max-w-md line-clamp-2">
                  {primaireLockMotif}
                </p>
                <div className="pt-2 flex items-center font-bold text-sm text-rose-400 group-hover:translate-x-2 transition-transform">
                  Détails du verrouillage & Assistance <ArrowRight size={18} className="ml-2" />
                </div>
              </div>
              <School size={180} className="absolute -right-8 -bottom-8 text-white/5 group-hover:scale-110 transition-transform pointer-events-none" />
            </div>
          ) : (
            <Link 
              to="/accueil-primaire"
              className="group relative block p-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl text-white shadow-xl hover:shadow-2xl transition-all overflow-hidden"
            >
              <div className="relative z-10 space-y-4">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                  Cycle Primaire & Maternelle
                </span>
                <h2 className="text-2xl font-bold">Espace Maternelle & Primaire</h2>
                <p className="text-amber-100 text-sm leading-relaxed max-w-md">
                  Classes Maternelle & Primaire, attribution des Maîtres et Maîtresses par classe, évaluations formatives & sommatives.
                </p>
                <div className="pt-2 flex items-center font-bold text-sm text-white group-hover:translate-x-2 transition-transform">
                  Accéder à l'espace <ArrowRight size={18} className="ml-2" />
                </div>
              </div>
              <School size={180} className="absolute -right-8 -bottom-8 text-white/15 group-hover:scale-110 transition-transform pointer-events-none" />
            </Link>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isSecondaireLocked ? (
            <div 
              onClick={() => setLockedModal({ title: "Espace Secondaire Verrouillé", motif: secondaireLockMotif })}
              className="group relative block p-8 bg-gradient-to-br from-slate-700 to-slate-800 rounded-3xl text-white shadow-lg transition-all overflow-hidden cursor-pointer hover:border-rose-400 border border-slate-600/50"
            >
              <div className="relative z-10 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/90 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider text-white shadow-xs">
                  <Lock size={12} /> Espace Verrouillé
                </span>
                <h2 className="text-2xl font-bold opacity-90">Espace Secondaire</h2>
                <p className="text-slate-300 text-sm leading-relaxed max-w-md line-clamp-2">
                  {secondaireLockMotif}
                </p>
                <div className="pt-2 flex items-center font-bold text-sm text-rose-400 group-hover:translate-x-2 transition-transform">
                  Détails du verrouillage & Assistance <ArrowRight size={18} className="ml-2" />
                </div>
              </div>
              <GraduationCap size={180} className="absolute -right-8 -bottom-8 text-white/5 group-hover:scale-110 transition-transform pointer-events-none" />
            </div>
          ) : (
            <Link 
              to="/accueil-secondaire"
              className="group relative block p-8 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl text-white shadow-xl hover:shadow-2xl transition-all overflow-hidden"
            >
              <div className="relative z-10 space-y-4">
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">
                  Cycle Secondaire
                </span>
                <h2 className="text-2xl font-bold">Espace Secondaire</h2>
                <p className="text-indigo-100 text-sm leading-relaxed max-w-md">
                  Collège & Lycée, professeurs spécialisés par matière, gestion des devoirs, interrogations et bulletins de notes.
                </p>
                <div className="pt-2 flex items-center font-bold text-sm text-white group-hover:translate-x-2 transition-transform">
                  Accéder à l'espace <ArrowRight size={18} className="ml-2" />
                </div>
              </div>
              <GraduationCap size={180} className="absolute -right-8 -bottom-8 text-white/15 group-hover:scale-110 transition-transform pointer-events-none" />
            </Link>
          )}
        </motion.div>
      </div>

      {/* Carrousel d'immersion scolaire & administration */}
      <SchoolCarousel 
        title="Immersion & Vie Scolaire de l'Établissement"
        subtitle="Découvrez nos apprenants en uniforme officiel, l'équipe administrative en action et nos infrastructures modernes"
      />

      {/* Shared Services organized by category */}
      <div className="space-y-10">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <div className="p-2 bg-slate-100 rounded-xl">
            <LayoutDashboard size={22} className="text-slate-600" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Services Généraux de l'Établissement</h2>
        </div>

        {sharedMenusByCategory.map((category) => (
          <div key={category.title} className="space-y-5">
            <h3 className={`text-sm font-black uppercase tracking-widest ${category.color} flex items-center gap-2 px-1`}>
              <category.icon size={16} />
              {category.title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-5">
              {category.items.map((item) => {
                const notifCount = getUnreadCountForPath(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (notifCount > 0) {
                        markPathNotificationsAsRead(item.path);
                      }
                    }}
                    className={`group flex flex-col p-5 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden ${
                      notifCount > 0 
                        ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200' 
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-11 h-11 ${item.color} rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform shadow-sm`}>
                        <item.icon size={20} />
                      </div>
                      {notifCount > 0 && (
                        <span 
                          title={`${notifCount} notification(s) non lue(s)`}
                          className="px-2 py-0.5 text-[11px] font-black rounded-full bg-rose-600 text-white shadow-sm animate-pulse flex items-center gap-1"
                        >
                          <span>{notifCount}</span>
                          <span className="text-[9px] uppercase font-bold">nouv.</span>
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-primary transition-colors block leading-tight">
                        {item.label}
                      </span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        {item.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Modal d'Alerte d'Espace Verrouillé */}
      {lockedModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-rose-200 overflow-hidden text-left p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
                <Lock size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800">
                  Accès Restreint
                </span>
                <h3 className="font-black text-slate-900 text-base mt-1">
                  {lockedModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLockedModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-rose-50/80 rounded-2xl border border-rose-200 space-y-2 text-xs">
              <p className="font-bold text-rose-900 leading-snug">
                {lockedModal.motif}
              </p>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                L'accès à cet espace a été verrouillé pour votre établissement par le Super Administrateur de la plateforme MégafixaEduc Pro.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <p className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">Assistance & Déverrouillage :</p>
              <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                <Mail size={12} className="text-slate-400" />
                <span>contact@megafixa.com</span>
              </p>
              <p className="text-slate-600 flex items-center gap-1.5 text-[11px]">
                <Phone size={12} className="text-slate-400" />
                <span>(+229) 0161107918 / 0141264238</span>
              </p>
            </div>

            <div className="pt-2 flex gap-3">
              <a
                href="https://wa.me/2290161107918"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all text-center flex items-center justify-center gap-1.5"
              >
                <span>WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setLockedModal(null)}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

