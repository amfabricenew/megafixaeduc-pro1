import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  BookOpen, 
  Users, 
  CreditCard, 
  Calendar, 
  Bell, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  FileText, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  Menu, 
  X, 
  Building2,
  Award,
  HeartHandshake,
  LayoutDashboard,
  Send,
  HelpCircle,
  ChevronDown,
  Download,
  Smartphone,
  Laptop,
  Share2,
  Crown,
  Check,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import SchoolCarousel from '../components/SchoolCarousel';
import FeaturesShowcase from '../components/FeaturesShowcase';
import { LanguageSelector } from '../components/LanguageSelector';
import { useTranslation } from '../contexts/TranslationContext';
import logoOfficial from '../LOGO_MEGFIXAEDEUC_PRO.png';

export default function LandingPage() {
  const { t, language } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'privacy' | 'security' | 'accounts'>('general');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [faqCategory, setFaqCategory] = useState<'all' | 'features' | 'parents'>('all');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  /* 
  // Disable auto-redirect to allow users to land on the first page as requested
  useEffect(() => {
    if (user && !localStorage.getItem('logged_out')) {
      if (user.role === 'super_admin') {
        navigate('/super-admin');
      } else {
        navigate('/accueil');
      }
    }
  }, [user, navigate]);
  */
  const [showInstallModal, setShowInstallModal] = useState(false);

  React.useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstalled(true);
        toast.success(t("Application installée avec succès !"));
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const [contactForm, setContactForm] = useState({
    nom: '',
    email: '',
    etablissement: '',
    sujet: '',
    message: ''
  });
  const [submittingContact, setSubmittingContact] = useState(false);

  const faqItems = [
    {
      category: 'features',
      question: language === 'en' 
        ? "What are the available subscription plans and pricing?" 
        : "Quels sont les tarifs et formules d'abonnement disponibles ?",
      answer: language === 'en'
        ? "MégafixaEduc Pro offers 3 transparent plans tailored to your school's size and ambitions: Starter Plan (25,000 FCFA/term for essential academics up to 300 students), Standard Plan (75,000 FCFA/year with QR badges and full organization up to 1,000 students), and Excellence Plan (150,000 FCFA/year all-in-one with finance, payroll, official tamper-proof receipts, and AI assistant for unlimited students). You can select your plan directly during registration."
        : "MégafixaEduc Pro propose 3 formules transparentes adaptées à la taille et aux ambitions de votre école : la Formule Starter (25 000 FCFA/trimestre pour l'essentiel académique jusqu'à 300 élèves), la Formule Standard (75 000 FCFA/an avec badges QR code et organisation complète jusqu'à 1 000 élèves), et la Formule Excellence (150 000 FCFA/an tout-en-un avec finances, salaires, reçus officiels infalsifiables et assistant IA pour élèves illimités). Vous pouvez sélectionner directement votre formule lors de l'inscription."
    },
    {
      category: 'features',
      question: language === 'en'
        ? "How does automated report card generation work?"
        : "Comment s'effectue la génération automatique des bulletins de notes ?",
      answer: language === 'en'
        ? "Once grades and tests are entered by teachers, the platform instantly calculates weighted averages for each student by subject and term, assigns the student's rank, and generates official curriculum-compliant PDF report cards."
        : "Une fois les devoirs et interrogations saisis par les enseignants, la plateforme calcule instantanément les moyennes coeficientées de chaque élève par matière et trimestre, attribue le rang de l'élève dans la classe et génère des bulletins officiels conformes au programme, imprimables en PDF."
    },
    {
      category: 'parents',
      question: language === 'en'
        ? "What payment methods are supported for tuition fees?"
        : "Quels modes de paiement sont pris en charge pour les frais de scolarité ?",
      answer: language === 'en'
        ? "Parents can pay tuition online via the secure FedaPay gateway (MTN / Moov Mobile Money, Bank Card) or directly at the school counter. Each payment generates an official numbered receipt with a tamper-proof QR code."
        : "Les parents peuvent régler la scolarité en ligne via la passerelle sécurisée FedaPay (Mobile Money MTN / Moov, Carte bancaire) ou directement au guichet de l'école. Chaque versement génère un reçu officiel numéroté muni d'un QR code infalsifiable."
    },
    {
      category: 'parents',
      question: language === 'en'
        ? "How do parents access their Parent Portal?"
        : "Comment les parents d'élèves accèdent-ils à leur Espace Parent ?",
      answer: language === 'en'
        ? "Parents sign in to the Parent Portal using their email address or phone number and an instant OTP validation code. There they find their child's quarterly report card, timetable, attendance records, and tuition receipts."
        : "Les parents se connectent sur l'Espace Parent avec leur adresse e-mail ou numéro de téléphone et un code OTP de validation instantané. Ils y retrouvent le bulletin trimestriel de leur enfant, l'emploi du temps, les absences/retards et les reçus de scolarité."
    },
    {
      category: 'features',
      question: language === 'en'
        ? "Is automated SMS and email messaging included?"
        : "L'envoi de SMS et d'alertes automatisées est-il inclus ?",
      answer: language === 'en'
        ? "Yes! The alert module allows sending automated SMS and email notifications to immediately inform families about tardiness, absences, notices, and tuition payment deadlines."
        : "Oui ! Le module d'alertes permet d'envoyer des notifications automatisées par SMS et email pour informer immédiatement les familles des retards, des absences, des convocations et des dates d'échéances de scolarité."
    },
    {
      category: 'features',
      question: language === 'en'
        ? "Can student lists be imported from an Excel file?"
        : "Est-il possible d'importer la liste des élèves depuis un fichier Excel ?",
      answer: language === 'en'
        ? "Absolutely. You can import your complete list of students, teachers, and subjects directly from any Excel (.xlsx) or CSV file in seconds."
        : "Absolument. Vous pouvez importer la liste complète de vos élèves, professeurs et matières directement à partir de n'importe quel fichier Excel (.xlsx) ou CSV en quelques secondes."
    },
    {
      category: 'features',
      question: language === 'en'
        ? "How is school data security and confidentiality ensured?"
        : "Comment est assurée la sécurité et la confidentialité des données scolaires ?",
      answer: language === 'en'
        ? "All data is hosted securely with SSL/TLS encryption and daily automatic backups. Access is compartmentalized by roles (Principal, Secretary, Teacher, Parent) and fully auditable."
        : "Toutes les données sont hébergées sur des serveurs sécurisés avec chiffrage SSL/TLS et sauvegardes quotidiennes automatiques. L'accès est compartimenté selon les rôles (Directeur, Secrétaire, Enseignant, Parent) et traçable via un journal d'audit."
    }
  ];

  const filteredFaqs = faqCategory === 'all' 
    ? faqItems 
    : faqItems.filter(item => item.category === faqCategory);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.nom || !contactForm.email || !contactForm.message) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSubmittingContact(true);
    setTimeout(() => {
      setSubmittingContact(false);
      toast.success("Votre message a été envoyé avec succès ! Notre équipe vous répondra dans les plus brefs délais.");
      setContactForm({ nom: '', email: '', etablissement: '', sujet: '', message: '' });
    }, 1000);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-primary-500 selection:text-white">
      {/* Top Notification Bar */}
      <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-indigo-700 text-white py-2 px-4 text-xs md:text-sm text-center font-medium flex items-center justify-center gap-2 shadow-inner">
        <Sparkles size={16} className="text-amber-300 animate-pulse" />
        <span>Bienvenue sur <strong>MégafixaEduc Pro</strong> — La plateforme moderne de gestion scolaire intégrée.</span>
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              <img 
                src={logoOfficial} 
                alt="MégafixaEduc Pro Logo" 
                className="h-11 w-auto object-contain drop-shadow-sm" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/LOGO_MEGFIXAEDEUC_PRO.png';
                }}
              />
              <div>
                <span className="text-xl md:text-2xl font-black tracking-tight text-slate-900 block leading-tight">
                  Mégafixa<span className="text-primary-600">Educ</span> <span className="text-xs bg-primary-100 text-primary-800 font-bold px-2 py-0.5 rounded-full uppercase ml-1">Pro</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium block">Solution Intégrée de Gestion Scolaire</span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary-600 transition-colors">
                {t('Accueil')}
              </button>
              <button onClick={() => scrollToSection('galerie')} className="hover:text-primary-600 transition-colors flex items-center gap-1.5">
                <span>{t('Vie Scolaire')}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </button>
              <button onClick={() => scrollToSection('fonctionnalites')} className="hover:text-primary-600 transition-colors">
                {t('Fonctionnalités')}
              </button>
              <button onClick={() => scrollToSection('apropos')} className="hover:text-primary-600 transition-colors">
                {t('À propos')}
              </button>
              <button onClick={() => scrollToSection('tarifs')} className="hover:text-primary-600 transition-colors flex items-center gap-1">
                <span>{t('Tarifs')}</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-full">Formules</span>
              </button>
              <button onClick={() => scrollToSection('faq')} className="hover:text-primary-600 transition-colors flex items-center gap-1">
                {t('FAQ')}
              </button>
              <button onClick={() => scrollToSection('conditions')} className="hover:text-primary-600 transition-colors">
                {t('Conditions')}
              </button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-primary-600 transition-colors">
                {t('Nous contacter')}
              </button>
            </nav>

            {/* CTA Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              {user ? (
                <>
                  {user.role === 'super_admin' ? (
                    <Link
                      to="/super-admin"
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                    >
                      <ShieldCheck size={16} />
                      {t('Back-office Admin')}
                    </Link>
                  ) : (
                    <Link
                      to="/accueil"
                      className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-all shadow-md shadow-primary-600/20 flex items-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <LayoutDashboard size={16} />
                      {t('Accéder à mon espace')}
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-primary-600 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <LogIn size={16} />
                    {t('Se connecter')}
                  </Link>
                </>
              )}

              {/* Language Switcher */}
              <div className="pl-1 border-l border-slate-200">
                <LanguageSelector variant="pill" />
              </div>
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              <LanguageSelector variant="pill" className="scale-90" />
              {user ? (
                <Link
                  to={user.role === 'super_admin' ? "/super-admin" : "/accueil"}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-primary-600 rounded-lg shadow-sm flex items-center gap-1"
                >
                  {t("Mon Espace")}
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-xs font-bold text-white bg-primary-600 rounded-lg shadow-sm flex items-center gap-1"
                >
                  {t("Connexion")}
                </Link>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                aria-label="Menu"
              >
                {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-b border-slate-200 px-4 pt-3 pb-6 space-y-3"
            >
              <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Langue / Language :</span>
                <LanguageSelector variant="minimal" />
              </div>
              <button 
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600"
              >
                {t('Accueil')}
              </button>
              <button 
                onClick={() => scrollToSection('galerie')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600 flex items-center justify-between"
              >
                <span>{t('Vie Scolaire & Galerie')}</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Photos</span>
              </button>
              <button 
                onClick={() => scrollToSection('fonctionnalites')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600"
              >
                {t('Fonctionnalités')}
              </button>
              <button 
                onClick={() => scrollToSection('apropos')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600"
              >
                {t('À propos')}
              </button>
              <button 
                onClick={() => scrollToSection('tarifs')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600 flex items-center justify-between"
              >
                <span>{t('Tarifs & Abonnements')}</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">Formules</span>
              </button>
              <button 
                onClick={() => scrollToSection('faq')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600"
              >
                {t('FAQ')}
              </button>
              <button 
                onClick={() => scrollToSection('conditions')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600"
              >
                {t("Conditions d'utilisation")}
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="block w-full text-left py-2 font-medium text-slate-700 hover:text-primary-600"
              >
                {t('Nous contacter')}
              </button>
              
              <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                {user?.role === 'super_admin' && (
                  <Link
                    to="/super-admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 font-bold text-white bg-indigo-600 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                  >
                    <ShieldCheck size={18} />
                    {t('Accès Back-office Admin')}
                  </Link>
                )}
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  {t('Se connecter')}
                </Link>
                <Link
                  to="/parent-login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 font-bold text-slate-700 bg-slate-100 rounded-xl flex items-center justify-center gap-2"
                >
                  <Users size={18} />
                  {t('Espace Parent')}
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-3 font-bold text-white bg-primary-600 rounded-xl shadow-sm flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  {t('Créer un compte')}
                </Link>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); handleInstallClick(); }}
                  className="w-full text-center py-2.5 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center gap-2"
                >
                  <Download size={18} className="text-emerald-600" />
                  {t("Installer l'application sur l'appareil")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32 bg-gradient-to-b from-white via-slate-50 to-slate-100">
        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-200 text-primary-800 text-xs md:text-sm font-bold mb-8 shadow-sm"
          >
            <Sparkles size={16} className="text-primary-600" />
            <span>{t("La Référence de la Gestion Scolaire Moderne")}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-[1.15]"
          >
            {language === 'en' ? (
              <>Manage your school with <span className="bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">simplicity & precision</span></>
            ) : (
              <>Pilotez votre établissement scolaire avec <span className="bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">simplicité & précision</span></>
            )}
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto font-medium leading-relaxed"
          >
            {t("MégafixaEduc Pro centralise l'ensemble des activités administratives et pédagogiques : inscriptions des élèves, saisie des notes, génération automatique des bulletins, comptabilité des frais scolaires, emplois du temps et suivi parental.")}
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/login"
              className="px-8 py-4 text-base font-extrabold text-white bg-primary-600 hover:bg-primary-700 rounded-2xl shadow-xl shadow-primary-600/30 transition-all flex items-center gap-3 hover:scale-105 active:scale-95"
            >
              <LogIn size={20} />
              {t("Se connecter")}
            </Link>
            <Link
              to="/signup"
              className="px-8 py-4 text-base font-extrabold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-2xl shadow-md transition-all flex items-center gap-3 hover:scale-105 active:scale-95"
            >
              <UserPlus size={20} className="text-primary-600" />
              {t("Créer un Compte École (Gratuit)")}
            </Link>
            <Link
              to="/parent-login"
              className="px-6 py-4 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all flex items-center gap-2"
            >
              <Users size={18} className="text-indigo-600" />
              {t("Espace Parent")}
            </Link>
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-8 py-4 text-base font-extrabold text-emerald-900 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center gap-3 hover:scale-105 active:scale-95 border border-emerald-300"
            >
              <Download size={22} className="text-emerald-950 stroke-[2.5]" />
              <span>{isInstalled ? t("Application Déjà Installée") : t("Installer l'application sur l'appareil")}</span>
            </button>
          </motion.div>

          {/* Quick Metrics Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <span className="block text-2xl md:text-3xl font-black text-primary-600">100%</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 block">{t("Sécurisé & Conforme")}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <span className="block text-2xl md:text-3xl font-black text-indigo-600">{t("Bulletins")}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 block">{t("Génération Instantanée")}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <span className="block text-2xl md:text-3xl font-black text-purple-600">{t("SMS / Email")}</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 block">{t("Alertes Automatisées")}</span>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm text-center">
              <span className="block text-2xl md:text-3xl font-black text-emerald-600">24/7</span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1 block">{t("Accès Multi-Supports")}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Galerie & Immersion Scolaire Section */}
      <section id="galerie" className="py-12 md:py-20 bg-gradient-to-b from-slate-100/90 via-white to-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SchoolCarousel 
            title={t("Immersion au Cœur de MégafixaEduc")}
            subtitle={t("Découvrez nos apprenants en uniforme officiel, notre équipe administrative et nos infrastructures pédagogiques modernes")}
          />
        </div>
      </section>

      {/* Key Features Section with Visual Document Mockups & Logo_megafixa */}
      <section id="fonctionnalites" className="py-16 md:py-24 bg-gradient-to-b from-white via-slate-50/50 to-white border-t border-slate-200 relative overflow-hidden">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <FeaturesShowcase />
        </div>
      </section>

      {/* About Section */}
      <section id="apropos" className="py-20 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary-600 block mb-2">{t("À propos de MégafixaEduc Pro")}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
                {t("Une vision ambitieuse pour la transformation numérique des écoles")}
              </h2>
              <p className="text-slate-600 text-base leading-relaxed mb-4">
                {t("MégafixaEduc Pro est une solution informatique moderne conçue par")} <strong>Mégafixa</strong>. {t("Elle répond aux défis quotidiens de l'administration scolaire : réduction de la paperasse, prévention des erreurs de calcul de moyenne, transparence avec les parents et gain de temps précieux pour le corps enseignant.")}
              </p>
              <p className="text-slate-600 text-base leading-relaxed mb-6">
                {t("Notre engagement est de fournir un logiciel hautement fiable, conforme aux directives d'apprentissage et accessible sur n'importe quel équipement (ordinateur, tablette, smartphone) sans installation lourde.")}
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-800">{t("Interface épurée et prise en main immédiate par le personnel")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-800">{t("Sauvegarde automatique et sécurisation absolue des dossiers scolaires")}</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm font-semibold text-slate-800">{t("Support technique dédié et mises à jour régulières intégrées")}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="w-14 h-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-md">
                  M
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-lg">{t("Plateforme Éducative Officielle")}</h4>
                  <p className="text-xs text-slate-500 font-medium">{t("Développée pour les collèges, lycées et complexes scolaires")}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-slate-600">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{t("Architecture")}</span>
                  <span className="font-bold text-primary-700">{t("Cloud & Full-Stack")}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{t("Sécurité des Comptes")}</span>
                  <span className="font-bold text-emerald-700">{t("Code de validation OTP & JWT")}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="font-semibold text-slate-700">{t("Disponibilité du Serveur")}</span>
                  <span className="font-bold text-indigo-700">{t("99.9% Haute Disponibilité")}</span>
                </div>
              </div>

              <div className="pt-2 text-center flex flex-col sm:flex-row items-center gap-3">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center flex-1 py-3.5 px-6 font-extrabold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all gap-2 text-sm"
                >
                  <LogIn size={16} />
                  {t("Se connecter")}
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center flex-1 py-3.5 px-6 font-extrabold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm transition-all gap-2 text-sm"
                >
                  <UserPlus size={16} className="text-primary-600" />
                  {t("Créer un compte")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tarifs & Formules d'Abonnement Section */}
      <section id="tarifs" className="py-24 bg-white border-t border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600 bg-primary-50 border border-primary-200/60 px-3 py-1 rounded-full inline-block mb-3">
              {t("Tarifs Transparents & Sans Surprise")}
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
              {t("Des Formules Adaptées à Votre Établissement")}
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
              {t("Activez dès aujourd'hui la formule qui répond exactement aux besoins académiques, financiers et technologiques de votre école.")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
            {/* Formule Starter */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
                    Starter
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">{t("Jusqu'à 300 élèves")}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{t("Formule Starter")}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">{t("Idéal pour informatiser la gestion pédagogique et les notes.")}</p>

                <div className="mb-6 pb-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">25 000</span>
                    <span className="text-sm font-bold text-slate-600">FCFA</span>
                    <span className="text-xs text-slate-400 font-medium">{t("/ trimestre")}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{t("Facturation trimestrielle flexible")}</p>
                </div>

                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("Fonctionnalités incluses :")}</p>
                  {[
                    'Gestion des classes, matières et coefficients',
                    'Fiches complètes et inscriptions des élèves',
                    'Saisie des notes et calcul des moyennes',
                    'Emplois du temps hebdomadaires',
                    'Espace Parent sécurisé (Mon Enfant)'
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Check size={11} className="stroke-[3]" />
                      </div>
                      <span>{t(feat)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/paiement-abonnement?plan=starter"
                className="w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider text-center text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all shadow-xs flex items-center justify-center gap-2 group-hover:shadow-md"
              >
                <span>{t("Choisir Formule Starter")}</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Formule Standard (Populaire) */}
            <div className="bg-gradient-to-b from-white to-emerald-50/30 rounded-3xl border-2 border-emerald-500 p-8 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between relative transform lg:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[11px] font-black uppercase tracking-widest px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-300" />
                <span>{t("Formule la plus populaire")}</span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4 mt-2">
                  <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-full">
                    {t("Académique Standard")}
                  </span>
                  <span className="text-xs text-emerald-800 font-bold">{t("Jusqu'à 1 000 élèves")}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{t("Formule Standard")}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">{t("Organisation complète avec badges officiels et promotions de fin d'année.")}</p>

                <div className="mb-6 pb-6 border-b border-emerald-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">75 000</span>
                    <span className="text-sm font-bold text-slate-600">FCFA</span>
                    <span className="text-xs text-slate-400 font-medium">{t("/ an")}</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">{t("Licence annuelle complète")}</p>
                </div>

                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("Tout ce qui est dans Starter, plus :")}</p>
                  {[
                    'Cartes Scolaires & Badges QR Code imprimables',
                    'Gestion des Passages & Redoublements de classe',
                    'Personnel Administratif & affectation des postes',
                    'Demandes d\'ajustement d\'horaires & documents officiels',
                    'Paramétrage complet des années scolaires & rôles'
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Check size={11} className="stroke-[3]" />
                      </div>
                      <span>{t(feat)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/paiement-abonnement?plan=standard"
                className="w-full py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider text-center text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{t("Choisir Formule Standard")}</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Formule Excellence */}
            <div className="bg-gradient-to-b from-white to-amber-50/20 rounded-3xl border border-amber-300 p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative group">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1">
                    <Crown size={12} className="text-amber-700" />
                    {t("Excellence Pro")}
                  </span>
                  <span className="text-xs text-amber-800 font-bold">{t("Élèves Illimités")}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900">{t("Formule Excellence")}</h3>
                <p className="text-xs text-slate-500 mt-1 mb-6">{t("Gestion intégrale de l'école : Académie, Finances, Salaires & IA.")}</p>

                <div className="mb-6 pb-6 border-b border-amber-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">150 000</span>
                    <span className="text-sm font-bold text-slate-600">FCFA</span>
                    <span className="text-xs text-slate-400 font-medium">{t("/ an")}</span>
                  </div>
                  <p className="text-[11px] text-amber-700 font-medium mt-1">{t("Licence annuelle VIP tout-en-un")}</p>
                </div>

                <div className="space-y-3 mb-8">
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t("Tout ce qui est dans Standard, plus :")}</p>
                  {[
                    'Finances & Paiements scolarité (tranches, reçus numérotés)',
                    'Gestion complète des Salaires & Paie du personnel',
                    'Journal d\'Audit & traçabilité stricte des actions',
                    'Assistant IA Gemini pour synthèses & bilans scolaires',
                    'Support dédié 24/7 & sauvegardes multi-formats'
                  ].map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 font-medium">
                      <div className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Check size={11} className="stroke-[3]" />
                      </div>
                      <span>{t(feat)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to="/paiement-abonnement?plan=excellence"
                className="w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider text-center text-amber-900 bg-amber-100 hover:bg-amber-500 hover:text-white border border-amber-300 transition-all shadow-xs flex items-center justify-center gap-2 group-hover:shadow-md"
              >
                <span>{t("Choisir Formule Excellence")}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Bottom Security & Offline Guarantee banner */}
          <div className="mt-14 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary-600/30 border border-primary-500/40 flex items-center justify-center text-primary-400 shrink-0">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-white">{t("Garantie Souveraineté & Mode Strict Hors-Ligne")}</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {t("Toutes les formules fonctionnent en totale indépendance sur votre machine. Vos données scolaires restent hébergées localement sur votre base SQLite sécurisée avec sauvegardes automatiques.")}
                </p>
              </div>
            </div>
            <Link
              to="/signup"
              className="px-6 py-3 bg-white text-slate-950 hover:bg-slate-100 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shrink-0 flex items-center gap-2"
            >
              <span>{t("Démarrer Maintenant")}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section id="faq" className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary-600 block mb-2">{t("Foire aux Questions")}</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("Questions Fréquemment Posées")}
            </h2>
            <p className="mt-3 text-slate-600 text-base">
              {t("Retrouvez toutes les réponses concernant les fonctionnalités et les capacités de MégafixaEduc Pro.")}
            </p>

            {/* Category Filter Chips */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setFaqCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  faqCategory === 'all'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t("Toutes les questions")}
              </button>
              <button
                onClick={() => setFaqCategory('features')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  faqCategory === 'features'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t("Fonctionnalités & Bulletins")}
              </button>
              <button
                onClick={() => setFaqCategory('parents')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  faqCategory === 'parents'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {t("Paiements & Parents")}
              </button>
            </div>
          </div>

          {/* Accordion List */}
          <div className="space-y-4">
            {filteredFaqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden transition-all hover:border-slate-300"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 font-bold text-slate-900 text-base sm:text-lg focus:outline-none"
                  >
                    <span className="flex items-center gap-3">
                      <HelpCircle size={20} className="text-primary-600 shrink-0" />
                      {faq.question}
                    </span>
                    <div className={`p-2 rounded-full bg-slate-100 text-slate-500 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180 bg-primary-100 text-primary-700' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="px-5 pb-6 sm:px-6 sm:pb-6 pt-0 text-slate-600 text-sm leading-relaxed border-t border-slate-100/60"
                      >
                        <p className="pt-4">{faq.answer}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Conditions d'Utilisation Section */}
      <section id="conditions" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-primary-600 mb-2">{t("Engagements & Réglementation")}</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {t("Conditions d'utilisation & Confidentialité")}
            </p>
            <p className="mt-3 text-slate-600 text-base">
              {t("Transparence, sécurité de l'information et règles régissant l'utilisation de MégafixaEduc Pro.")}
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 bg-white overflow-x-auto">
              <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 min-w-[140px] py-4 px-6 text-xs sm:text-sm font-bold border-b-2 transition-all text-center ${
                  activeTab === 'general'
                    ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t("1. Conditions Générales")}
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex-1 min-w-[140px] py-4 px-6 text-xs sm:text-sm font-bold border-b-2 transition-all text-center ${
                  activeTab === 'privacy'
                    ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t("2. Données Personnelles")}
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`flex-1 min-w-[140px] py-4 px-6 text-xs sm:text-sm font-bold border-b-2 transition-all text-center ${
                  activeTab === 'security'
                    ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t("3. Sécurité des Accès")}
              </button>
              <button
                onClick={() => setActiveTab('accounts')}
                className={`flex-1 min-w-[140px] py-4 px-6 text-xs sm:text-sm font-bold border-b-2 transition-all text-center ${
                  activeTab === 'accounts'
                    ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {t("4. Comptes & Approbation")}
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8 space-y-4 text-slate-700 text-sm leading-relaxed">
              {activeTab === 'general' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <FileText className="text-primary-600" size={20} />
                    {t("1. Acceptation des Conditions d'Utilisation")}
                  </h4>
                  <p>
                    {t("L'accès et l'utilisation de la plateforme MégafixaEduc Pro sont soumis au respect strict des présentes conditions. En vous connectant à l'application, vous acceptez sans réserve les règles d'usage de votre établissement scolaire.")}
                  </p>
                  <p>
                    {t("La plateforme est destinée exclusivement aux administrateurs, secrétaires, enseignants, élèves et parents autorisés par la direction de l'établissement scolaire partenaire.")}
                  </p>
                </motion.div>
              )}

              {activeTab === 'privacy' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <ShieldCheck className="text-emerald-600" size={20} />
                    {t("2. Protection et Confidentialité des Données")}
                  </h4>
                  <p>
                    {t("Toutes les informations à caractère personnel (noms des élèves, notes, coordonnées des parents, historique des paiements) sont traitées dans la plus stricte confidentialité et exclusivement pour la gestion de la scolarité.")}
                  </p>
                  <p>
                    {t("Mégafixa s'interdit formellement toute revente, transmission ou commercialisation de vos données à des tiers publicitaires. Les données sont chiffrées et stockées de manière sécurisée.")}
                  </p>
                </motion.div>
              )}

              {activeTab === 'security' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <Lock className="text-indigo-600" size={20} />
                    {t("3. Sécurité des Identifiants & Responsabilité")}
                  </h4>
                  <p>
                    {t("Chaque utilisateur est personnellement responsable de la confidentialité de ses identifiants de connexion (adresse e-mail, mot de passe et code OTP).")}
                  </p>
                  <p>
                    {t("En cas de perte ou de compromission de votre mot de passe, vous devez immédiatement utiliser la procédure de réinitialisation ou avertir l'administrateur de votre établissement.")}
                  </p>
                </motion.div>
              )}

              {activeTab === 'accounts' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <h4 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                    <Award className="text-purple-600" size={20} />
                    {t("4. Validation et Approbation des Nouveaux Comptes")}
                  </h4>
                  <p>
                    {t("Afin d'éviter tout accès non autorisé aux informations confidentielles des élèves, les comptes créés lors de l'inscription peuvent nécessiter une validation préalable par l'Administrateur principal de l'école ou un code OTP envoyé par mail.")}
                  </p>
                  <p>
                    {t("L'établissement se réserve le droit d'inactiver tout compte ne respectant pas la déontologie ou les règles de fonctionnement de l'école.")}
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Nous Contacter Section */}
      <section id="contact" className="py-20 bg-slate-900 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left Contact Details */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-primary-400 block mb-2">{t("Besoin d'aide ou d'information ?")}</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">
                {t("Nous contacter")}
              </h2>
              <p className="text-slate-300 text-base leading-relaxed mb-8">
                {t("Notre équipe de support technique et d'assistance pédagogique est à votre entière disposition pour répondre à toutes vos questions et vous accompagner.")}
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-primary-400 shrink-0">
                    <Mail size={22} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-base">{t("Adresse Email")}</h5>
                    <a href="mailto:megafixatecheduc@gmail.com" className="text-slate-300 hover:text-white transition-colors text-sm block font-medium">
                      megafixatecheduc@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-emerald-400 shrink-0">
                    <Phone size={22} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-base">{t("Téléphone & WhatsApp Support")}</h5>
                    <p className="text-slate-300 text-sm font-medium">
                      <a href="tel:+2290161107918" className="hover:text-emerald-400 transition-colors">+229 0161107918</a>
                      {' / '}
                      <a href="https://wa.me/2290141264238" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">
                        +229 0141264238 (WhatsApp)
                      </a>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{t("Du Lundi au Samedi de 08h00 à 18h00")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0">
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h5 className="font-bold text-white text-base">{t("Localisation")}</h5>
                    <p className="text-slate-400 text-sm">{t("Siège Mégafixa Technologies — Cotonou, Bénin")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Contact Form */}
            <div className="bg-slate-800/90 border border-slate-700/80 p-6 sm:p-8 rounded-3xl shadow-2xl">
              <h3 className="text-xl font-bold text-white mb-2">{t("Envoyez-nous un message")}</h3>
              <p className="text-xs text-slate-400 mb-6">{t("Remplissez le formulaire ci-dessous et nous vous recontacterons rapidement.")}</p>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("Nom complet *")}</label>
                    <input
                      type="text"
                      required
                      placeholder={language === 'en' ? "E.g.: John Doe" : "Ex: Jean Dupont"}
                      value={contactForm.nom}
                      onChange={(e) => setContactForm({ ...contactForm, nom: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("Email *")}</label>
                    <input
                      type="email"
                      required
                      placeholder={language === 'en' ? "E.g.: john@school.com" : "Ex: jean@ecole.com"}
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("Nom de l'établissement")}</label>
                    <input
                      type="text"
                      placeholder={language === 'en' ? "E.g.: Saint-Michel School" : "Ex: Complexe Scolaire Saint-Michel"}
                      value={contactForm.etablissement}
                      onChange={(e) => setContactForm({ ...contactForm, etablissement: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t("Sujet")}</label>
                    <input
                      type="text"
                      placeholder={language === 'en' ? "E.g.: Information request / Support" : "Ex: Demande d'information / Assistance"}
                      value={contactForm.sujet}
                      onChange={(e) => setContactForm({ ...contactForm, sujet: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">{t("Votre Message *")}</label>
                  <textarea
                    required
                    rows={4}
                    placeholder={t("Écrivez votre message ici...")}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submittingContact}
                  className="w-full py-3.5 px-6 font-extrabold text-white bg-primary-600 hover:bg-primary-500 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <Send size={18} />
                  {submittingContact ? t("Envoi en cours...") : t("Envoyer le Message")}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-800 text-center md:text-left">
            <div className="flex items-center gap-3">
              <img 
                src={logoOfficial} 
                alt="MégafixaEduc Pro Logo" 
                className="h-9 w-auto object-contain brightness-125" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/LOGO_MEGFIXAEDEUC_PRO.png';
                }}
              />
              <span className="text-xl font-black text-white">
                Mégafixa<span className="text-primary-500">Educ</span> Pro
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-semibold text-slate-400">
              <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">{t("Accueil")}</button>
              <button onClick={() => scrollToSection('fonctionnalites')} className="hover:text-white transition-colors">{t("Fonctionnalités")}</button>
              <button onClick={() => scrollToSection('apropos')} className="hover:text-white transition-colors">{t("À propos")}</button>
              <button onClick={() => scrollToSection('conditions')} className="hover:text-white transition-colors">{t("Conditions")}</button>
              <button onClick={() => scrollToSection('contact')} className="hover:text-white transition-colors">{t("Nous contacter")}</button>
              <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold flex items-center gap-1">
                {t("Se connecter")}
              </Link>
              <Link to="/signup" className="text-white hover:text-primary-300 font-bold flex items-center gap-1">
                {t("Créer un compte")}
              </Link>
              <Link to="/super-admin" className="ml-4 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 transition-all flex items-center gap-1.5 font-bold">
                <ShieldCheck size={14} />
                {t("SaaS Admin")}
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} MégafixaEduc Pro. {t("Tous droits réservés.")}</p>
            <p>{t("Conçu avec excellence pour les établissements scolaires.")}</p>
          </div>
        </div>
      </footer>

      {/* PWA Install Guide Modal */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 p-6 sm:p-8 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                    <Download size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">{t("Installer l'Application")}</h3>
                    <p className="text-xs text-slate-500">{t("Accès ultra-rapide et plein écran sur tous vos appareils")}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInstallModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 text-xs text-slate-600">
                {/* Android Chrome */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Smartphone size={16} className="text-emerald-600" />
                    <span>{t("Sur Android (Google Chrome)")}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    {language === 'en' ? (
                      <>
                        1. Tap the <strong>three vertical dots menu (⋮)</strong> in the top right corner.<br />
                        2. Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.
                      </>
                    ) : (
                      <>
                        1. Appuyez sur le menu des <strong>trois points verticaux (⋮)</strong> en haut à droite du navigateur.<br />
                        2. Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
                      </>
                    )}
                  </p>
                </div>

                {/* iOS Safari */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Share2 size={16} className="text-blue-600" />
                    <span>{t("Sur iPhone & iPad (Safari)")}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    {language === 'en' ? (
                      <>
                        1. Tap the <strong>Share</strong> button (square icon with an upward arrow).<br />
                        2. Scroll down and tap <strong>"Add to Home Screen"</strong>.
                      </>
                    ) : (
                      <>
                        1. Appuyez sur le bouton <strong>Partager</strong> (icône de carré avec une flèche montante en bas).<br />
                        2. Faites défiler vers le bas et appuyez sur <strong>« Sur l'écran d'accueil »</strong>.
                      </>
                    )}
                  </p>
                </div>

                {/* PC / Mac */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-slate-800">
                    <Laptop size={16} className="text-indigo-600" />
                    <span>{t("Sur Ordinateur (Chrome / Edge)")}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed pl-6">
                    {language === 'en' ? (
                      <>
                        1. Click the <strong>Install app (⊕ or arrow)</strong> icon in the address bar.<br />
                        2. Click <strong>"Install"</strong> to add it to your desktop.
                      </>
                    ) : (
                      <>
                        1. Cliquez sur l'icône <strong>Installer l'application (⊕ ou flèche)</strong> située dans la barre d'adresse tout à droite.<br />
                        2. Cliquez sur <strong>« Installer »</strong> pour l'ajouter sur votre bureau.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md shadow-primary-600/20"
                >
                  {t("J'ai compris")}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
