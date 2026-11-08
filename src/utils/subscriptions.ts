export type SubscriptionPlan = 'starter' | 'standard' | 'excellence';

export interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
}

export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  badge: string;
  tagline: string;
  price: string;
  period: string;
  color: string;
  border: string;
  bgGradient: string;
  allowedPaths: string[];
  features: string[];
  maxStudents: string;
  supportLevel: string;
}

export const ALL_SYSTEM_PATHS = [
  '/',
  '/accueil',
  '/accueil-primaire',
  '/accueil-secondaire',
  '/tableau-de-bord',
  '/tableau-de-bord-primaire',
  '/tableau-de-bord-secondaire',
  '/classes',
  '/classes-primaire',
  '/classes-secondaire',
  '/batiments-salles',
  '/ressources-materielles',
  '/eleves',
  '/eleves-primaire',
  '/eleves-secondaire',
  '/promotions',
  '/promotions-primaire',
  '/promotions-secondaire',
  '/enseignants',
  '/enseignants-primaire',
  '/enseignants-secondaire',
  '/personnel-administratif',
  '/matieres',
  '/matieres-primaire',
  '/matieres-secondaire',
  '/notes',
  '/notes-primaire',
  '/notes-secondaire',
  '/paiements',
  '/salaires-enseignants',
  '/salaires',
  '/cartes-et-badges',
  '/emploi-du-temps',
  '/emploi-du-temps-primaire',
  '/emploi-du-temps-secondaire',
  '/emploi-du-temps-requests',
  '/bibliotheque',
  '/bibliotheque-primaire',
  '/bibliotheque-secondaire',
  '/bibliotheque-physique',
  '/bibliotheque-physique-primaire',
  '/bibliotheque-physique-secondaire',
  '/epreuves',
  '/epreuves-primaire',
  '/epreuves-secondaire',
  '/documents-demandes',
  '/ecole',
  '/alertes',
  '/messagerie',
  '/audit-logs',
  '/parametres',
  '/mon-enfant',
  '/mon-compte'
];

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDetails> = {
  starter: {
    id: 'starter',
    name: 'Formule Starter (Base)',
    badge: 'Découverte',
    tagline: 'Essentiel pour démarrer la gestion académique de base',
    price: '25 000 FCFA',
    period: '/ trimestre',
    color: 'text-blue-500',
    border: 'border-blue-500/30',
    bgGradient: 'from-blue-500/10 to-indigo-500/5',
    maxStudents: 'Jusqu\'à 300 élèves',
    supportLevel: 'Support standard par email',
    allowedPaths: ALL_SYSTEM_PATHS,
    features: [
      'Gestion des classes, matières et coefficients',
      'Fiches et inscriptions des élèves',
      'Saisie des notes et calcul des moyennes',
      'Emplois du temps hebdomadaires',
      'Espace individuel Parent sécurisé (Mon Enfant)'
    ]
  },
  standard: {
    id: 'standard',
    name: 'Formule Académique (Standard)',
    badge: 'Populaire',
    tagline: 'Organisation scolaire avancée & badges officiels',
    price: '75 000 FCFA',
    period: '/ an',
    color: 'text-emerald-500',
    border: 'border-emerald-500/40',
    bgGradient: 'from-emerald-500/15 to-teal-500/5',
    maxStudents: 'Jusqu\'à 1 000 élèves',
    supportLevel: 'Support prioritaire WhatsApp & Email',
    allowedPaths: ALL_SYSTEM_PATHS,
    features: [
      'Toutes les fonctionnalités Starter incluses',
      'Génération & Impression des Cartes Scolaires & Badges QR Code',
      'Gestion des Passages & Redoublements de fin d\'année',
      'Gestion du Personnel Administratif et des Postes',
      'Demandes d\'ajustement d\'horaires et documents administratifs',
      'Paramétrage complet des années scolaires & rôles'
    ]
  },
  excellence: {
    id: 'excellence',
    name: 'Formule Excellence (Intégrale Pro)',
    badge: 'Tout-en-un',
    tagline: 'Gestion intégrale : Académique, Finances, Salaires & IA',
    price: '150 000 FCFA',
    period: '/ an',
    color: 'text-amber-500',
    border: 'border-amber-500/50',
    bgGradient: 'from-amber-500/20 to-orange-500/10',
    maxStudents: 'Élèves illimités',
    supportLevel: 'Support dédié 24/7 + Formations',
    allowedPaths: ALL_SYSTEM_PATHS,
    features: [
      'Toutes les fonctionnalités de la formule Standard',
      'Module Finances & Paiements de scolarité (tranches, reçus officiels)',
      'Gestion des Salaires & Paie (enseignants permanents/vacataires, bilans)',
      'Journal d\'audit & Traçabilité complète des opérations',
      'Assistant IA Gemini pour analyses pédagogiques et bilans scolaires',
      'Sauvegardes automatiques et gestion multi-utilisateurs illimitée'
    ]
  }
};

/**
 * Checks if a specific route path is permitted under a school subscription plan.
 * Restores functional tiering between Starter, Standard, and Excellence formulas.
 */
export function isPathAllowedByPlan(plan: SubscriptionPlan | string | undefined, path: string): boolean {
  if (!plan) return true;
  const p = plan.toString().toLowerCase().trim();

  // Excellence formula has 100% full access to all features
  if (p === 'excellence') {
    return true;
  }

  // Normalize path without query parameters or trailing slashes
  const cleanPath = path.split('?')[0].replace(/\/+$/, '') || '/';

  // Standard formula excludes financial cashflow, teacher salaries, and AI Lab
  if (p === 'standard') {
    const gatedForStandard = [
      '/finances',
      '/finances-primaire',
      '/finances-secondaire',
      '/salaires',
      '/salaires-enseignants',
      '/lab-ia'
    ];
    return !gatedForStandard.some(fp => cleanPath === fp || cleanPath.startsWith(fp + '/'));
  }

  // Starter formula only includes core teaching, classes, students, grades & schedule
  if (p === 'starter') {
    const gatedForStarter = [
      '/cartes-et-badges',
      '/promotions',
      '/promotions-primaire',
      '/promotions-secondaire',
      '/personnel-administratif',
      '/batiments-salles',
      '/ressources-materielles',
      '/epreuves',
      '/epreuves-primaire',
      '/epreuves-secondaire',
      '/epreuves-composition',
      '/paiements',
      '/paiements-primaire',
      '/paiements-secondaire',
      '/finances',
      '/finances-primaire',
      '/finances-secondaire',
      '/salaires',
      '/salaires-enseignants',
      '/lab-ia',
      '/audit-logs'
    ];
    return !gatedForStarter.some(fp => cleanPath === fp || cleanPath.startsWith(fp + '/'));
  }

  return true;
}
