import {
  resolvePlanFeatureIds,
  isPathAllowedByFeatures,
  isFeatureAllowedInList,
  isUnlimitedLimit,
  formatStudentLimit,
  formatStaffLimit,
} from '../constants/productFeatures';

export type SubscriptionPlan = 'starter' | 'standard' | 'excellence' | string;

export interface PlanFeature {
  id: string;
  name: string;
  included: boolean;
}

export interface SchoolPlanDetails {
  name: string;
  plan_id?: number | string | null;
  statut?: string;
  date_fin?: string | null;
  school_nom?: string;
  featureIds: string[];
  features: string[];
  student_limit: number;
  staff_limit: number;
  current_students?: number;
  current_staff?: number;
  strictFormulaConfigured?: boolean;
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
  '/collecte-enseignants',
  '/collecte-enseignants-secondaire',
  '/personnel-administratif',
  '/matieres',
  '/matieres-primaire',
  '/matieres-secondaire',
  '/notes',
  '/notes-primaire',
  '/notes-secondaire',
  '/examens-primaire',
  '/examens-secondaire',
  '/paiements',
  '/paiements-primaire',
  '/paiements-secondaire',
  '/finances',
  '/finances-primaire',
  '/finances-secondaire',
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
  '/epreuves-composition',
  '/recrutement-inscriptions',
  '/admin/sessions-actives',
  '/documents-demandes',
  '/documents-administratifs',
  '/ecole',
  '/alertes',
  '/messagerie',
  '/workspace',
  '/gmail',
  '/lab-ia',
  '/audit-logs',
  '/parametres',
  '/mon-enfant',
  '/mon-compte',
];

export {
  resolvePlanFeatureIds,
  isUnlimitedLimit,
  formatStudentLimit,
  formatStaffLimit,
};

export function isFeatureAllowedByPlan(
  planOrDetails: SchoolPlanDetails | SubscriptionPlan | null | undefined,
  featureId: string
): boolean {
  if (!planOrDetails) return true;

  if (typeof planOrDetails === 'object') {
    if (Array.isArray(planOrDetails.featureIds)) {
      return isFeatureAllowedInList(planOrDetails.featureIds, featureId);
    }
    if (Array.isArray(planOrDetails.features)) {
      const ids = resolvePlanFeatureIds(planOrDetails.features, null, planOrDetails.name);
      return isFeatureAllowedInList(ids, featureId);
    }
    return true;
  }

  const p = String(planOrDetails).toLowerCase().trim();
  if (p === 'excellence' || p === 'premium plus') return true;
  if (p === 'standard') {
    return !['accounting', 'payroll', 'ai_lab'].includes(featureId);
  }
  if (p === 'starter') {
    return ![
      'badges',
      'promotions',
      'admin_staff',
      'buildings',
      'resources',
      'exam_bank',
      'exams',
      'fees',
      'accounting',
      'payroll',
      'ai_lab',
      'audit_logs',
    ].includes(featureId);
  }
  return true;
}

/**
 * Checks if a specific route path is permitted under a school subscription plan.
 * Strictly honors Super Admin configured featureIds when present.
 */
export function isPathAllowedByPlan(
  planOrDetails: SchoolPlanDetails | SubscriptionPlan | null | undefined,
  path: string
): boolean {
  if (!planOrDetails) return true;
  const cleanPath = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';

  // 1) Dynamic formula configuration from backend / Super Admin
  if (typeof planOrDetails === 'object') {
    const activeIds = Array.isArray(planOrDetails.featureIds)
      ? planOrDetails.featureIds
      : resolvePlanFeatureIds(planOrDetails.features, null, planOrDetails.name);
    return isPathAllowedByFeatures(activeIds, cleanPath);
  }

  // 2) Fallback for plain legacy string plan names when planDetails isn't loaded yet
  const p = planOrDetails.toString().toLowerCase().trim();
  if (p === 'excellence' || p === 'premium plus') {
    return true;
  }

  if (p === 'standard') {
    const gatedForStandard = [
      '/finances',
      '/finances-primaire',
      '/finances-secondaire',
      '/salaires',
      '/salaires-enseignants',
      '/lab-ia',
    ];
    return !gatedForStandard.some((fp) => cleanPath === fp || cleanPath.startsWith(fp + '/'));
  }

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
      '/audit-logs',
    ];
    return !gatedForStarter.some((fp) => cleanPath === fp || cleanPath.startsWith(fp + '/'));
  }

  return true;
}
