export interface AppFeatureDefinition {
  id: string;
  name: string;
  category:
    | 'Niveaux'
    | 'Pédagogie'
    | 'Administration'
    | 'Finance'
    | 'Communication & Ressources'
    | 'Intégrations & IA';
  paths: string[];
  aliases?: string[];
}

export const APP_FEATURES: AppFeatureDefinition[] = [
  // Niveaux / Cycles
  {
    id: 'cycle_primaire',
    name: 'Cycle Maternelle & Primaire',
    category: 'Niveaux',
    paths: ['/accueil-primaire', '/tableau-de-bord-primaire'],
    aliases: ['primaire', 'maternelle', 'cycle primaire'],
  },
  {
    id: 'cycle_secondaire',
    name: 'Cycle Secondaire',
    category: 'Niveaux',
    paths: ['/accueil-secondaire', '/tableau-de-bord-secondaire'],
    aliases: ['secondaire', 'college', 'lycee', 'cycle secondaire'],
  },

  // Pédagogie
  {
    id: 'dashboard',
    name: 'Tableau de bord & Statistiques',
    category: 'Pédagogie',
    paths: ['/tableau-de-bord', '/tableau-de-bord-primaire', '/tableau-de-bord-secondaire'],
    aliases: ['tableau de bord', 'dashboard', 'statistiques'],
  },
  {
    id: 'classes',
    name: 'Classes & Effectifs',
    category: 'Pédagogie',
    paths: ['/classes', '/classes-primaire', '/classes-secondaire', '/mes-classes', '/ma-classe'],
    aliases: ['classes', 'niveaux scolaires', 'gestion des classes'],
  },
  {
    id: 'students',
    name: 'Élèves & Inscriptions',
    category: 'Pédagogie',
    paths: ['/eleves', '/eleves-primaire', '/eleves-secondaire'],
    aliases: ['eleves', 'élèves', 'inscriptions élèves', 'dossiers élèves'],
  },
  {
    id: 'teachers',
    name: 'Enseignants & Cours',
    category: 'Pédagogie',
    paths: ['/enseignants', '/enseignants-primaire', '/enseignants-secondaire', '/mes-cours'],
    aliases: ['enseignants', 'professeurs', 'maitres', 'corps professoral'],
  },
  {
    id: 'subjects',
    name: 'Matières & Coefficients',
    category: 'Pédagogie',
    paths: ['/matieres', '/matieres-primaire', '/matieres-secondaire'],
    aliases: ['matieres', 'matières', 'coefficients'],
  },
  {
    id: 'grades',
    name: 'Notes & Bulletins Officiels',
    category: 'Pédagogie',
    paths: ['/notes', '/notes-primaire', '/notes-secondaire', '/mon-enfant'],
    aliases: ['notes', 'bulletins', 'génération bulletins', 'moyennes', 'mon enfant'],
  },
  {
    id: 'timetable',
    name: 'Emploi du Temps',
    category: 'Pédagogie',
    paths: ['/emploi-du-temps', '/emploi-du-temps-primaire', '/emploi-du-temps-secondaire'],
    aliases: ['emploi du temps', 'edt', 'plannings'],
  },
  {
    id: 'promotions',
    name: 'Passages & Redoublements',
    category: 'Pédagogie',
    paths: ['/promotions', '/promotions-primaire', '/promotions-secondaire'],
    aliases: ['passages', 'redoublements', 'promotions'],
  },
  {
    id: 'exams_space',
    name: 'Espace Examens',
    category: 'Pédagogie',
    paths: ['/examens-primaire', '/examens-secondaire'],
    aliases: ['espace examens', 'examens'],
  },
  {
    id: 'teacher_collection',
    name: 'Collecte Enseignants',
    category: 'Pédagogie',
    paths: ['/collecte-enseignants', '/collecte-enseignants-secondaire'],
    aliases: ['collecte enseignants', 'formulaires enseignants'],
  },

  // Administration
  {
    id: 'sessions',
    name: 'Sessions Actives',
    category: 'Administration',
    paths: ['/admin/sessions-actives'],
    aliases: ['sessions actives', 'sessions'],
  },
  {
    id: 'buildings',
    name: 'Bâtiments & Salles',
    category: 'Administration',
    paths: ['/batiments-salles'],
    aliases: ['batiments', 'bâtiments', 'salles'],
  },
  {
    id: 'resources',
    name: 'Ressources Matérielles',
    category: 'Administration',
    paths: ['/ressources-materielles', '/materiels'],
    aliases: ['ressources matérielles', 'materiels', 'inventaire'],
  },
  {
    id: 'badges',
    name: 'Cartes & Badges',
    category: 'Administration',
    paths: ['/cartes-et-badges'],
    aliases: ['cartes', 'badges', 'cartes scolaires', 'qr code'],
  },
  {
    id: 'recruitment',
    name: 'Recrutement & Inscriptions',
    category: 'Administration',
    paths: ['/recrutement-inscriptions'],
    aliases: ['recrutement', 'campagnes inscription'],
  },
  {
    id: 'admin_staff',
    name: 'Personnel Admin.',
    category: 'Administration',
    paths: ['/personnel-administratif'],
    aliases: ['personnel administratif', 'personnel admin', 'staff'],
  },
  {
    id: 'school_info',
    name: 'Info École & Identité',
    category: 'Administration',
    paths: ['/ecole'],
    aliases: ['info ecole', 'info école', 'informations établissement'],
  },
  {
    id: 'audit_logs',
    name: "Journal d'Audit",
    category: 'Administration',
    paths: ['/audit-logs'],
    aliases: ['audit', 'audit logs', 'traçabilité'],
  },

  // Finance
  {
    id: 'fees',
    name: 'Paiements Scolarité',
    category: 'Finance',
    paths: ['/paiements', '/paiements-primaire', '/paiements-secondaire'],
    aliases: ['paiements', 'scolarite', 'scolarité', 'écolages', 'paiements mobiles'],
  },
  {
    id: 'payroll',
    name: 'Salaires & Paie',
    category: 'Finance',
    paths: ['/salaires-enseignants', '/salaires'],
    aliases: ['salaires', 'paie', 'rémunérations'],
  },
  {
    id: 'accounting',
    name: 'Trésorerie & Dépenses',
    category: 'Finance',
    paths: ['/finances', '/finances-primaire', '/finances-secondaire', '/tresorerie'],
    aliases: ['trésorerie', 'dépenses', 'finances', 'comptabilité'],
  },

  // Communication & Ressources
  {
    id: 'digital_lib',
    name: 'Bibliothèque Numérique',
    category: 'Communication & Ressources',
    paths: ['/bibliotheque', '/bibliotheque-primaire', '/bibliotheque-secondaire'],
    aliases: ['bibliothèque numérique', 'ressources numériques'],
  },
  {
    id: 'school_lib',
    name: 'Bibliothèque Scolaire',
    category: 'Communication & Ressources',
    paths: [
      '/bibliotheque-physique',
      '/bibliotheque-physique-primaire',
      '/bibliotheque-physique-secondaire',
    ],
    aliases: ['bibliothèque scolaire', 'livres physiques', 'emprunts'],
  },
  {
    id: 'exam_bank',
    name: "Banque d'Épreuves",
    category: 'Communication & Ressources',
    paths: ['/epreuves', '/epreuves-primaire', '/epreuves-secondaire'],
    aliases: ["banque d'épreuves", 'banque épreuves', 'gestion épreuves'],
  },
  {
    id: 'exams',
    name: 'Épreuves Compositions',
    category: 'Communication & Ressources',
    paths: ['/epreuves-composition'],
    aliases: ['épreuves compositions', 'compositions officielles'],
  },
  {
    id: 'sms_messaging',
    name: 'Messagerie & SMS',
    category: 'Communication & Ressources',
    paths: ['/messagerie'],
    aliases: ['messagerie', 'sms', 'sms notifications'],
  },
  {
    id: 'alerts',
    name: 'Alertes',
    category: 'Communication & Ressources',
    paths: ['/alertes'],
    aliases: ['alertes', 'notifications'],
  },
  {
    id: 'docs_requests',
    name: 'Documents & Demandes',
    category: 'Communication & Ressources',
    paths: ['/documents-demandes', '/documents-administratifs'],
    aliases: ['documents', 'demandes', 'certificats', 'attestations'],
  },
  {
    id: 'edt_requests',
    name: 'Demandes EDT',
    category: 'Communication & Ressources',
    paths: ['/emploi-du-temps-requests'],
    aliases: ['demandes edt', 'révisions notes'],
  },

  // Intégrations & IA
  {
    id: 'google_workspace',
    name: 'Suite Google Workspace & Gmail',
    category: 'Intégrations & IA',
    paths: ['/workspace', '/gmail', '/google-workspace'],
    aliases: ['google workspace', 'gmail', 'calendar', 'google docs', 'google sheets'],
  },
  {
    id: 'ai_lab',
    name: 'Assistant IA & Laboratoire IA',
    category: 'Intégrations & IA',
    paths: ['/lab-ia'],
    aliases: ['assistant ia', 'laboratoire ia', 'analyse prédictive ia', 'gemini', 'ia'],
  },
];

export const ALL_APP_FEATURE_IDS = APP_FEATURES.map((f) => f.id);

export const ALWAYS_ALLOWED_SYSTEM_PATHS = [
  '/',
  '/accueil',
  '/mon-compte',
  '/parametres',
  '/settings',
  '/annees-scolaires',
  '/annees',
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function isUnlimitedLimit(limit: any): boolean {
  if (limit === null || limit === undefined || limit === '') return true;
  const num = Number(limit);
  if (Number.isNaN(num)) return true;
  return num <= 0 || num >= 999999;
}

export function formatStudentLimit(limit: any): string {
  if (isUnlimitedLimit(limit)) return 'Élèves illimités';
  return `Jusqu'à ${Number(limit).toLocaleString('fr-FR')} élèves`;
}

export function formatStaffLimit(limit: any): string {
  if (isUnlimitedLimit(limit)) return 'Staff illimité';
  return `Jusqu'à ${Number(limit).toLocaleString('fr-FR')} membres`;
}

/**
 * Matches a free-text feature label or ID against APP_FEATURES.
 */
export function matchFeatureDefinition(input: string): AppFeatureDefinition | undefined {
  const norm = normalizeText(String(input || ''));
  if (!norm) return undefined;
  return APP_FEATURES.find((f) => {
    if (normalizeText(f.id) === norm) return true;
    if (normalizeText(f.name) === norm) return true;
    if (f.aliases && f.aliases.some((al) => norm === normalizeText(al) || norm.includes(normalizeText(al)))) {
      return true;
    }
    return false;
  });
}

/**
 * Resolves exact active feature IDs for a subscription plan.
 * Priority:
 *  1) Explicit `explicitFeatureIds` if configured in product_feature_matrix (even if `[]`!)
 *  2) Matching entries inside `planFeatures` against APP_FEATURES
 *  3) Legacy seed defaults ONLY if `planFeatures` exclusively contains legacy seed descriptors
 *     like "Accès complet" / "Toutes les fonctions de base" without individual feature toggles.
 */
export function resolvePlanFeatureIds(
  planFeatures?: string[] | null,
  explicitFeatureIds?: string[] | null,
  planName?: string | null
): string[] {
  if (Array.isArray(explicitFeatureIds)) {
    const validSet = new Set(ALL_APP_FEATURE_IDS);
    return Array.from(new Set(explicitFeatureIds.filter((id) => validSet.has(id))));
  }

  const list = Array.isArray(planFeatures) ? planFeatures : [];
  const matched = new Set<string>();

  for (const item of list) {
    const norm = normalizeText(String(item || ''));
    if (!norm) continue;

    if (
      norm.includes('acces complet') ||
      norm.includes('tout-en-un') ||
      norm.includes('toutes les fonctionnalites') ||
      norm.includes('toutes les fonctions premium')
    ) {
      return [...ALL_APP_FEATURE_IDS];
    }

    if (norm.includes('toutes les fonctions de base')) {
      [
        'cycle_primaire',
        'cycle_secondaire',
        'dashboard',
        'classes',
        'students',
        'teachers',
        'subjects',
        'grades',
        'timetable',
        'digital_lib',
        'alerts',
        'docs_requests',
        'school_info',
      ].forEach((id) => matched.add(id));
      continue;
    }

    if (norm.includes('fonctions avancees')) {
      [
        'cycle_primaire',
        'cycle_secondaire',
        'dashboard',
        'classes',
        'students',
        'teachers',
        'subjects',
        'grades',
        'timetable',
        'promotions',
        'exams_space',
        'teacher_collection',
        'sessions',
        'buildings',
        'resources',
        'badges',
        'recruitment',
        'admin_staff',
        'school_info',
        'digital_lib',
        'school_lib',
        'exam_bank',
        'exams',
        'alerts',
        'docs_requests',
        'edt_requests',
      ].forEach((id) => matched.add(id));
      continue;
    }

    const def = matchFeatureDefinition(item);
    if (def) {
      matched.add(def.id);
    }
  }

  // If list was non-empty and nothing matched (pure legacy text plan before matrix configuration),
  // avoid silently breaking unmigrated legacy names unless matrix is explicitly configured.
  if (matched.size === 0 && list.length > 0 && planName) {
    const pNorm = normalizeText(planName);
    if (pNorm === 'excellence' || pNorm === 'premium plus') {
      return [...ALL_APP_FEATURE_IDS];
    }
  }

  return Array.from(matched);
}

/**
 * Determines which feature ID(s) govern a given route path.
 */
export function getRequiredFeaturesForPath(path: string): {
  cycleFeature?: 'cycle_primaire' | 'cycle_secondaire';
  moduleFeature?: string;
} {
  const cleanPath = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';

  if (ALWAYS_ALLOWED_SYSTEM_PATHS.includes(cleanPath)) {
    return {};
  }

  let cycleFeature: 'cycle_primaire' | 'cycle_secondaire' | undefined;
  if (cleanPath.endsWith('-primaire') || cleanPath.includes('-primaire/')) {
    cycleFeature = 'cycle_primaire';
  } else if (cleanPath.endsWith('-secondaire') || cleanPath.includes('-secondaire/')) {
    cycleFeature = 'cycle_secondaire';
  }

  if (cleanPath === '/accueil-primaire') {
    return { cycleFeature: 'cycle_primaire' };
  }
  if (cleanPath === '/accueil-secondaire') {
    return { cycleFeature: 'cycle_secondaire' };
  }

  const matched = APP_FEATURES.find((f) => {
    if (f.id === 'cycle_primaire' || f.id === 'cycle_secondaire') return false;
    return f.paths.some((fp) => cleanPath === fp || cleanPath.startsWith(fp + '/'));
  });

  return {
    cycleFeature,
    moduleFeature: matched?.id,
  };
}

export function isFeatureAllowedInList(
  activeFeatureIds: string[] | null | undefined,
  featureId: string
): boolean {
  if (!Array.isArray(activeFeatureIds)) return true;
  return activeFeatureIds.includes(featureId);
}

export function isPathAllowedByFeatures(
  activeFeatureIds: string[] | null | undefined,
  path: string
): boolean {
  if (!Array.isArray(activeFeatureIds)) return true;
  const cleanPath = (path || '/').split('?')[0].replace(/\/+$/, '') || '/';
  if (ALWAYS_ALLOWED_SYSTEM_PATHS.includes(cleanPath)) return true;

  const { cycleFeature, moduleFeature } = getRequiredFeaturesForPath(cleanPath);
  if (cycleFeature && !activeFeatureIds.includes(cycleFeature)) {
    return false;
  }
  if (moduleFeature && !activeFeatureIds.includes(moduleFeature)) {
    return false;
  }
  return true;
}
