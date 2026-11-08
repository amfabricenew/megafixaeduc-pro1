import React, { useState } from 'react';
import { 
  Layers, 
  Building2, 
  UserPlus, 
  Receipt, 
  Wallet, 
  Award, 
  BadgeCheck, 
  Calendar, 
  FileText, 
  BookOpenCheck, 
  BellRing, 
  Library, 
  ZoomIn, 
  Eye, 
  X, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../contexts/TranslationContext';
import logoOfficial from '../LOGO_MEGFIXAEDEUC_PRO.png';

export interface FeatureItem {
  id: string;
  title: string;
  title_en: string;
  subtitle: string;
  subtitle_en: string;
  category: 'pedagogie' | 'finance' | 'infrastructure' | 'administratif';
  categoryLabel: string;
  categoryLabel_en: string;
  image: string;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
  description: string;
  description_en: string;
  keyPoints: string[];
  keyPoints_en: string[];
  documentType: string;
  documentType_en: string;
}

export const FEATURES_DATA: FeatureItem[] = [
  {
    id: 'scolarite',
    title: 'Paiement de Scolarité & Reçu Imprimé',
    title_en: 'Tuition Payment & Printed Receipt',
    subtitle: 'Règlement Mobile Money en direct & impression de ticket de caisse',
    subtitle_en: 'Live Mobile Money payment & thermal cash receipt printing',
    category: 'finance',
    categoryLabel: 'Comptabilité & Encaissements',
    categoryLabel_en: 'Accounting & Cash Management',
    image: '/images/features/paiement_scolarite_recu.jpg?v=2',
    icon: Receipt,
    color: 'from-emerald-500 to-teal-600',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Double modalité d\'encaissement moderne : validation instantanée des paiements mobiles (MTN, Moov, FedaPay) sur smartphone et sortie automatique du reçu de caisse sur imprimante thermique avec QR code infalsifiable.',
    description_en: 'Modern dual payment workflow: instant verification of mobile money payments (MTN, Moov, FedaPay) on smartphone and automatic receipt printing on thermal printers with tamper-proof QR code.',
    keyPoints: [
      'Impression directe de quittance/reçu de caisse sur imprimante thermique',
      'Validation instantanée du paiement Mobile Money & carte avec notification',
      'Numéro de transaction certifié et blason officiel Logo Mégafixa'
    ],
    keyPoints_en: [
      'Direct thermal printing of payment receipts and cash slips',
      'Instant Mobile Money & card payment confirmation with alerts',
      'Certified transaction ID with official Mégafixa crest'
    ],
    documentType: 'Impression Reçu & Mobile Money',
    documentType_en: 'Receipt Print & Mobile Money'
  },
  {
    id: 'cartes',
    title: 'Éditeur & Studio de Cartes Scolaires',
    title_en: 'School ID Card Editor & Studio',
    subtitle: 'Studio graphique de personnalisation des badges élèves & personnel',
    subtitle_en: 'Graphic badge designer for student & staff identification',
    category: 'administratif',
    categoryLabel: 'Vie Scolaire & Sécurité',
    categoryLabel_en: 'School Life & Security',
    image: '/images/features/carte_scolaire_badges.jpg?v=2',
    icon: BadgeCheck,
    color: 'from-sky-600 to-blue-700',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Atelier complet de composition assistée : intégration de la photo d\'élève, matricule, classe, groupe sanguin, générateur dynamique de code-barres et QR code avec impression par lot en format carte plastifiable.',
    description_en: 'Comprehensive card design studio: student portrait photo integration, student ID, class, blood type, dynamic barcodes, and QR codes with batch printing in laminated card format.',
    keyPoints: [
      'Interface visuelle d\'édition avec prévisualisation en direct',
      'Génération instantanée de QR code & code-barres de contrôle',
      'Impression en planche ou thermique certifiée aux couleurs Mégafixa'
    ],
    keyPoints_en: [
      'Visual design editor with live real-time preview',
      'Instant generation of QR codes & inspection barcodes',
      'Batch sheet or thermal card printing with official Mégafixa branding'
    ],
    documentType: 'Studio & Éditeur de Cartes',
    documentType_en: 'Card Studio & Editor'
  },
  {
    id: 'classes',
    title: 'Création & Gestion des Classes',
    title_en: 'Class Setup & Academic Management',
    subtitle: 'Séries, cycles, quotas & affectation des professeurs principaux',
    subtitle_en: 'Academic streams, cycles, capacity quotas & head teacher assignments',
    category: 'pedagogie',
    categoryLabel: 'Pédagogie & Structure',
    categoryLabel_en: 'Academics & Structure',
    image: '/images/features/creation_classes.jpg',
    icon: Layers,
    color: 'from-sky-500 to-blue-600',
    badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
    description: 'Tableau de bord interactif de paramétrage des cycles scolaires (de la 6ème à la Terminale C, D, A, Tertiaire), attribution des professeurs principaux, calcul des quotas d\'effectifs et équilibrage parité.',
    description_en: 'Interactive management dashboard for configuring academic cycles (middle school through senior high tracks), assigning head teachers, calculating class quotas, and monitoring gender balance.',
    keyPoints: [
      'Génération des listes officielles par classe en 1 clic (PDF / Excel)',
      'Association automatique des matières, coefficients et volumes horaires',
      'Affichage officiel certifié avec en-tête Logo Mégafixa'
    ],
    keyPoints_en: [
      '1-click generation of official class rosters (PDF / Excel)',
      'Automatic mapping of subjects, credit weights, and weekly hours',
      'Certified official layout with Mégafixa logo header'
    ],
    documentType: 'Configurateur de Classes',
    documentType_en: 'Class Configurator'
  },
  {
    id: 'inscription',
    title: 'Poste d\'Enrôlement & Dossiers Élèves',
    title_en: 'Enrollment Station & Student Records',
    subtitle: 'Capture photo webcam en direct & matricule unique généré',
    subtitle_en: 'Live webcam portrait capture & unique student ID generation',
    category: 'pedagogie',
    categoryLabel: 'Gestion des Apprenants',
    categoryLabel_en: 'Student Records',
    image: '/images/features/inscription_eleves.jpg',
    icon: UserPlus,
    color: 'from-blue-600 to-indigo-700',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Poste d\'admission numérisé : prise de photo d\'identité par webcam intégrée, archivage des pièces d\'état civil, enregistrement des tuteurs légaux et génération de la fiche officielle scellée.',
    description_en: 'Digital admissions desk: built-in webcam identity portrait capture, birth certificate archiving, guardian registrations, and generation of official sealed enrollment forms.',
    keyPoints: [
      'Capture photo en direct et rognage automatique pour le dossier',
      'Fiche d\'inscription officielle prête pour impression avec photo',
      'Validation administrative scellée avec le sceau Logo Mégafixa'
    ],
    keyPoints_en: [
      'Live webcam photo capture with automatic cropping for student files',
      'Official printable enrollment form with full-color student photo',
      'Administrative registration sealed with official Mégafixa stamp'
    ],
    documentType: 'Poste d\'Enrôlement Numérique',
    documentType_en: 'Digital Enrollment Station'
  },
  {
    id: 'bulletins',
    title: 'Carnet de Notes & Générateur de Bulletins',
    title_en: 'Gradebook & Report Card Generator',
    subtitle: 'Grille de saisie, moyennes pondérées, rangs & relevés officiels',
    subtitle_en: 'Grade entry grid, weighted averages, ranks & official transcripts',
    category: 'pedagogie',
    categoryLabel: 'Évaluations & Examens',
    categoryLabel_en: 'Assessments & Examinations',
    image: '/images/features/bulletin_notes.jpg?v=2',
    icon: Award,
    color: 'from-blue-700 to-sky-600',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Saisie intuitive des notes par les professeurs, calcul automatique des moyennes pondérées selon les coefficients ministériels, rangs, tableaux d\'honneur et impression en lot des bulletins certifiés.',
    description_en: 'Intuitive grade entry for faculty, automatic computation of weighted averages using national curriculum coefficients, class ranks, honors lists, and bulk printing of certified report cards.',
    keyPoints: [
      'Relevé trimestriel officiel standardisé prêt à imprimer en lot',
      'Visualisation sécurisée en ligne depuis le portail Parents',
      'Authenticité garantie avec QR code et blason Logo Mégafixa'
    ],
    keyPoints_en: [
      'Standardized term report cards ready for batch high-speed printing',
      'Secure real-time online inspection from the Parent Portal',
      'Authenticity guaranteed with verification QR code & Mégafixa crest'
    ],
    documentType: 'Générateur de Bulletins',
    documentType_en: 'Report Card Generator'
  },
  {
    id: 'planning',
    title: 'Planificateur d\'Emplois du Temps',
    title_en: 'Timetable & Schedule Planner',
    subtitle: 'Grille hebdomadaire interactive avec détection de conflits',
    subtitle_en: 'Interactive weekly timetable matrix with conflict detection',
    category: 'pedagogie',
    categoryLabel: 'Organisation Pédagogique',
    categoryLabel_en: 'Academic Scheduling',
    image: '/images/features/emplois_du_temps.jpg',
    icon: Calendar,
    color: 'from-teal-600 to-emerald-600',
    badgeBg: 'bg-teal-50 text-teal-700 border-teal-200',
    description: 'Planificateur visuel par glisser-déposer du lundi au samedi. Répartition équilibrée des matières, prise en compte des créneaux des enseignants et affectation sans conflit de salles.',
    description_en: 'Visual drag-and-drop schedule planner Monday through Saturday. Balanced subject distribution, teacher availability constraints, and conflict-free room allocation.',
    keyPoints: [
      'Export mural haute résolution (formats A4 et grand A3)',
      'Consultation en direct sur smartphone par les élèves et parents',
      'En-tête officiel académique avec blason Logo Mégafixa'
    ],
    keyPoints_en: [
      'High-resolution wall chart exports (A4 and large A3 posters)',
      'Real-time mobile schedule check for students and parents',
      'Official academic layout with certified Mégafixa crest'
    ],
    documentType: 'Planificateur Graphique',
    documentType_en: 'Visual Timetable Planner'
  },
  {
    id: 'alertes',
    title: 'Alertes SMS & Console de Communication',
    title_en: 'SMS Alerts & Communication Console',
    subtitle: 'Réception instantanée sur smartphone des parents & passerelle SMS',
    subtitle_en: 'Instant notifications sent to parent smartphones & SMS gateway',
    category: 'administratif',
    categoryLabel: 'Communication & Familles',
    categoryLabel_en: 'Communication & Families',
    image: '/images/features/alertes_communication.jpg',
    icon: BellRing,
    color: 'from-amber-600 to-orange-600',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Canal de transmission instantanée vers les familles. Alerte SMS sous 15 secondes en cas d\'absence imprévue, publication des moyennes, alertes de paiement et convocations aux réunions.',
    description_en: 'Instant school-to-home broadcast channel. SMS notifications delivered within 15 seconds for unexpected absences, term grades publication, tuition reminders, and school meetings.',
    keyPoints: [
      'Passerelle SMS agréée avec 99.8% de délivrabilité sur tous réseaux',
      'Affichage direct sur smartphone des parents sans application requise',
      'Communication officielle signée sous le label MégafixaEduc'
    ],
    keyPoints_en: [
      'Certified SMS gateway with 99.8% multi-carrier delivery rate',
      'Direct mobile display on parents\' phones without requiring any app',
      'Official notices signed under the MégafixaEduc accreditation'
    ],
    documentType: 'Console d\'Alerte SMS & Mobile',
    documentType_en: 'SMS & Mobile Alert Console'
  },
  {
    id: 'salaires',
    title: 'Paiement de Salaire & Fiche de Paie',
    title_en: 'Payroll & Faculty Pay Slips',
    subtitle: 'Bulletins de paie enseignants & récapitulatifs des heures',
    subtitle_en: 'Faculty salary statements, hourly logs & allowances',
    category: 'finance',
    categoryLabel: 'Ressources Humaines & Paie',
    categoryLabel_en: 'Human Resources & Payroll',
    image: '/images/features/salaire_fiche_paie.jpg',
    icon: Wallet,
    color: 'from-violet-600 to-indigo-700',
    badgeBg: 'bg-violet-50 text-violet-700 border-violet-200',
    description: 'Calcul automatisé des salaires des enseignants titulaires et vacataires selon le volume horaire exécuté, les primes de responsabilité (professeur principal) et les retenues légales.',
    description_en: 'Automated salary computation for permanent and adjunct faculty based on logged teaching hours, administrative bonuses (head teacher), and statutory deductions.',
    keyPoints: [
      'Génération du bulletin de salaire officiel téléchargeable en PDF',
      'Suivi des virements bancaires et émargements avec signature',
      'En-tête officiel de l\'établissement et certification Logo Mégafixa'
    ],
    keyPoints_en: [
      'Generation of official printable salary slips in PDF format',
      'Bank transfer logs and attendance payroll sheets with signatures',
      'Official school header and certification with Mégafixa logo'
    ],
    documentType: 'Bulletin de Salaire Enseignant',
    documentType_en: 'Faculty Pay Slip'
  },
  {
    id: 'batiments',
    title: 'Gestion des Bâtiments & Salles',
    title_en: 'Building & Facility Management',
    subtitle: 'Cartographie des blocs, salles spécialisées & laboratoires',
    subtitle_en: 'Campus blocks map, specialized classrooms & science labs',
    category: 'infrastructure',
    categoryLabel: 'Infrastructures & Espaces',
    categoryLabel_en: 'Campus Facilities',
    image: '/images/features/gestion_batiments.jpg',
    icon: Building2,
    color: 'from-indigo-500 to-purple-600',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Organisation spatiale complète de l\'établissement : blocs primaire, collège et lycée, laboratoires de physique-chimie et informatique climatisés, préaux et bureaux administratifs.',
    description_en: 'Comprehensive campus facility mapping: primary, middle, and high school wings, air-conditioned computer rooms, science laboratories, courtyards, and administrative offices.',
    keyPoints: [
      'Contrôle des capacités sécuritaires d\'accueil par salle',
      'Détection automatique de conflits d\'occupation en temps réel',
      'Panneaux et signalétique officielle des blocs avec Logo Mégafixa'
    ],
    keyPoints_en: [
      'Enforcement of safety occupancy limits per classroom',
      'Automatic real-time room scheduling conflict detection',
      'Official signage and facility placards featuring Mégafixa insignia'
    ],
    documentType: 'Plan & Cartographie des Blocs',
    documentType_en: 'Campus Layout & Facilities Map'
  },
  {
    id: 'documents',
    title: 'Documents Administratifs & Attestations',
    title_en: 'Administrative Documents & Certificates',
    subtitle: 'Certificats de scolarité, attestations de fréquentation & radiation',
    subtitle_en: 'Enrollment certificates, attendance proofs & school transfers',
    category: 'administratif',
    categoryLabel: 'Secrétariat & Direction',
    categoryLabel_en: 'Secretariat & Registry',
    image: '/images/features/documents_administratifs.jpg',
    icon: FileText,
    color: 'from-cyan-700 to-blue-800',
    badgeBg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Édition instantanée de tous les actes administratifs scolaires : certificats de scolarité, attestations de radiation, fiches de transfert d\'établissement et convocations de conseil.',
    description_en: 'Instant issuance of all official school administrative certificates: enrollment certificates, release letters, inter-school transfer slips, and disciplinary board summons.',
    keyPoints: [
      'Tampon certifié, numéro d\'ordre officiel et signature scellée',
      'Vérifiable par flash QR code par les ambassades et institutions',
      'Cadre institutionnel conforme avec sceau Logo Mégafixa'
    ],
    keyPoints_en: [
      'Certified stamp, serial registration number, and sealed digital signature',
      'Instantly verifiable via QR code scanning by embassies and ministries',
      'Compliant institutional template with Mégafixa official seal'
    ],
    documentType: 'Certificat de Scolarité Officiel',
    documentType_en: 'Official Enrollment Certificate'
  },
  {
    id: 'epreuves',
    title: 'Épreuves & Banque d\'Examens',
    title_en: 'Exam Bank & Examination Papers',
    subtitle: 'Sujets de compositions, devoirs surveillés & barèmes officiels',
    subtitle_en: 'Midterm & mock exams, test papers & official marking schemes',
    category: 'pedagogie',
    categoryLabel: 'Examens & Contrôle',
    categoryLabel_en: 'Exams & Standardized Testing',
    image: '/images/features/epreuves_examens.jpg',
    icon: BookOpenCheck,
    color: 'from-fuchsia-600 to-purple-700',
    badgeBg: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    description: 'Plateforme centralisée pour la saisie et le dépôt des sujets d\'examens blancs et de devoirs surveillés. Intègre les consignes officielles, la durée, le barème et la grille de correction type.',
    description_en: 'Centralized repository for creating and archiving mock exams and supervised tests. Includes standardized instructions, duration, grading scale, and sample answer keys.',
    keyPoints: [
      'Mise en page ministérielle prête pour photocopie et anonymat',
      'Banque de ressources pédagogiques classées par discipline',
      'En-tête officiel d\'examen homologué avec Logo Mégafixa'
    ],
    keyPoints_en: [
      'Ministry-standard format ready for anonymous grading and printing',
      'Subject-categorized pedagogical resource library',
      'Accredited exam header formatted with official Mégafixa logo'
    ],
    documentType: 'Sujet d\'Épreuve Officiel',
    documentType_en: 'Official Exam Paper'
  },
  {
    id: 'bibliotheque',
    title: 'Bibliothèque & Manuels Scolaires',
    title_en: 'School Library & Book Lending',
    subtitle: 'Fonds documentaire, gestion des prêts de livres & ressources',
    subtitle_en: 'Book inventory, borrowing management & digital resources',
    category: 'infrastructure',
    categoryLabel: 'Centre de Documentation',
    categoryLabel_en: 'Documentation Center',
    image: '/images/features/bibliotheque_scolaire.jpg',
    icon: Library,
    color: 'from-emerald-700 to-teal-800',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Inventaire informatisé du centre de documentation : manuels du programme CIAM, romans, annales du BEPC/BAC. Gestion des fiches d\'emprunt et relances des retours d\'ouvrages.',
    description_en: 'Computerized inventory of the learning resource center: curriculum textbooks, literature novels, and national exam archives. Automated borrowing slips and overdue return alerts.',
    keyPoints: [
      'Scan rapide de la carte scolaire pour enregistrer les prêts',
      'Alertes automatiques avant la date limite de restitution',
      'Étiquetage officiel et enregistrement au nom de MégafixaEduc'
    ],
    keyPoints_en: [
      'Quick barcode scan of student ID cards to register book checkouts',
      'Automated alerts sent before loan return deadlines',
      'Official cataloging labels registered under MégafixaEduc'
    ],
    documentType: 'Fonds Documentaire Scolaire',
    documentType_en: 'School Library Collection'
  }
];

export default function FeaturesShowcase() {
  const { t, language } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeModalFeature, setActiveModalFeature] = useState<FeatureItem | null>(null);

  const getTitle = (f: FeatureItem) => language === 'en' ? (f.title_en || t(f.title)) : f.title;
  const getSubtitle = (f: FeatureItem) => language === 'en' ? (f.subtitle_en || t(f.subtitle)) : f.subtitle;
  const getCategoryLabel = (f: FeatureItem) => language === 'en' ? (f.categoryLabel_en || t(f.categoryLabel)) : f.categoryLabel;
  const getDescription = (f: FeatureItem) => language === 'en' ? (f.description_en || t(f.description)) : f.description;
  const getKeyPoints = (f: FeatureItem) => (language === 'en' && f.keyPoints_en) ? f.keyPoints_en : f.keyPoints;
  const getDocumentType = (f: FeatureItem) => language === 'en' ? (f.documentType_en || t(f.documentType)) : f.documentType;

  const categories = [
    { id: 'all', label: language === 'en' ? 'All Features' : 'Toutes les Fonctionnalités', count: FEATURES_DATA.length },
    { id: 'pedagogie', label: language === 'en' ? 'Academics & Students' : 'Pédagogie & Élèves', count: FEATURES_DATA.filter(f => f.category === 'pedagogie').length },
    { id: 'finance', label: language === 'en' ? 'Finance & Accounting' : 'Finance & Comptabilité', count: FEATURES_DATA.filter(f => f.category === 'finance').length },
    { id: 'infrastructure', label: language === 'en' ? 'Campus & Facilities' : 'Infrastructures & Espaces', count: FEATURES_DATA.filter(f => f.category === 'infrastructure').length },
    { id: 'administratif', label: language === 'en' ? 'Administration & Documents' : 'Administration & Documents', count: FEATURES_DATA.filter(f => f.category === 'administratif').length },
  ];

  const filteredFeatures = selectedCategory === 'all'
    ? FEATURES_DATA
    : FEATURES_DATA.filter(f => f.category === selectedCategory);

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="text-center max-w-4xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 border border-primary-200/80 text-primary-700 text-xs font-bold uppercase tracking-widest mb-3 shadow-xs">
          <Sparkles size={14} className="text-primary-600 animate-pulse" />
          <span>{t("Modules & Documents Officiels Homologués")}</span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          {t("Chaque Fonctionnalité au Cœur de Votre Établissement")}
        </h2>
        <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
          {t("Découvrez en images la puissance concrète de MégafixaEduc : classes, bâtiments, inscriptions, scolarité, bulletins de notes, cartes scolaires et documents administratifs estampillés du sceau officiel.")}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
        {categories.map(cat => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 border ${
                isActive
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-600/20 scale-[1.02]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <span>{cat.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Features Grid */}
      <motion.div 
        layout
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
      >
        <AnimatePresence>
          {filteredFeatures.map((feature, index) => {
            const IconComponent = feature.icon;
            const currentTitle = getTitle(feature);
            const currentSubtitle = getSubtitle(feature);
            const currentCategoryLabel = getCategoryLabel(feature);
            const currentDesc = getDescription(feature);
            const currentPoints = getKeyPoints(feature);
            const currentDocType = getDocumentType(feature);

            return (
              <motion.div
                key={feature.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-primary-300 transition-all duration-300 flex flex-col overflow-hidden group"
              >
                {/* Image Container with Document Mockup & Logo Watermark */}
                <div className="relative h-56 sm:h-60 bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setActiveModalFeature(feature)}>
                  <img
                    src={feature.image}
                    alt={currentTitle}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Top Bar with Official Logo Badge */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-slate-950/85 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-md">
                      <div className="w-5 h-5 bg-white rounded-full p-0.5 shrink-0 flex items-center justify-center">
                        <img 
                          src={logoOfficial} 
                          alt="Logo MégafixaEduc Pro" 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/LOGO_MEGFIXAEDEUC_PRO.png';
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-black tracking-wide text-white">
                        Mégafixa<span className="text-amber-400">Educ</span>
                      </span>
                    </div>

                    <span className="text-[10px] font-bold text-white uppercase tracking-wider px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 shadow-xs">
                      {currentDocType}
                    </span>
                  </div>

                  {/* Hover Overlay with Zoom Button */}
                  <div className="absolute inset-0 bg-primary-950/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      type="button"
                      className="px-4 py-2 bg-white text-slate-900 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xl hover:bg-slate-100 transition-colors pointer-events-none"
                    >
                      <ZoomIn size={14} className="text-primary-600" />
                      <span>{t("Agrandir l'élément")}</span>
                    </button>
                  </div>

                  {/* Bottom Image Tag */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="text-xs font-bold text-white drop-shadow-md flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{t("Élément certifié avec logo officiel")}</span>
                    </span>
                    <span className="text-white/80 group-hover:text-white transition-colors">
                      <Eye size={16} />
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Category and Icon */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${feature.badgeBg}`}>
                        <IconComponent size={13} />
                        {currentCategoryLabel}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-black text-slate-900 leading-snug group-hover:text-primary-600 transition-colors">
                      {currentTitle}
                    </h3>
                    <p className="text-xs font-medium text-slate-500 mt-1 mb-3">
                      {currentSubtitle}
                    </p>

                    {/* Description */}
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mb-4">
                      {currentDesc}
                    </p>

                    {/* Key Highlights */}
                    <div className="space-y-1.5 pt-3 border-t border-slate-100">
                      {currentPoints.map((point, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action */}
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveModalFeature(feature)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 group/btn"
                    >
                      <span>{t("Examiner le visuel")}</span>
                      <ArrowRight size={13} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {t("Homologué ERP")}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Lightbox / Modal for Full-Size Image Inspection */}
      <AnimatePresence>
        {activeModalFeature && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 md:p-10 flex items-center justify-center overflow-y-auto"
            onClick={() => setActiveModalFeature(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/20 rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-slate-950/80 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full p-0.5 flex items-center justify-center shadow-md">
                    <img 
                      src={logoOfficial} 
                      alt="Logo MégafixaEduc Pro" 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/LOGO_MEGFIXAEDEUC_PRO.png';
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-black text-base sm:text-lg flex items-center gap-2">
                      <span>{getTitle(activeModalFeature)}</span>
                    </h4>
                    <span className="text-xs text-amber-400 font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={13} />
                      <span>{t("Document officiel & élément intégrant le Logo Mégafixa")}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveModalFeature(null)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  aria-label={t("Fermer")}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Full Image */}
              <div className="relative p-3 sm:p-6 bg-slate-950 flex items-center justify-center">
                <img
                  src={activeModalFeature.image}
                  alt={getTitle(activeModalFeature)}
                  referrerPolicy="no-referrer"
                  className="max-h-[60vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                />
              </div>

              {/* Modal Details Footer */}
              <div className="p-5 sm:p-6 bg-slate-900 border-t border-white/10 text-white">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {t("Descriptif Fonctionnel")}
                    </span>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {getDescription(activeModalFeature)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {t("Conformité & Intégration Mégafixa")}
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {getKeyPoints(activeModalFeature).map((pt, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
