/**
 * MégafixaEduc Pro - Granular Role and User Permission Management System
 * Conforms to the Fondé (Founder / Sole School Administrator) security specification.
 */

export type AccessMode = 'read_write' | 'read_only' | 'none';

export interface PagePermission {
  path: string;
  label?: string;
  can_read?: boolean;
  can_write?: boolean;
  access_type?: AccessMode;
}

export interface PageDefinition {
  path: string;
  label: string;
  category: 'general' | 'pedagogique' | 'finance' | 'administration';
  description: string;
}

export const SYSTEM_PAGES: PageDefinition[] = [
  { path: '/', label: 'Tableau de bord', category: 'general', description: 'Statistiques globales, effectifs et indicateurs clés' },
  { path: '/mon-compte', label: 'Mon Compte', category: 'general', description: 'Gestion du profil et changement de mot de passe' },
  { path: '/classes', label: 'Classes & Niveaux', category: 'pedagogique', description: 'Gestion des classes, effectifs et salles' },
  { path: '/batiments-salles', label: 'Bâtiments & Salles', category: 'pedagogique', description: 'Gestion des bâtiments, salles de classe, affectations et événements' },
  { path: '/ressources-materielles', label: 'Ressources Matérielles', category: 'pedagogique', description: 'Inventaire du mobilier scolaire (tables-bancs, bureaux, tableaux craie/marqueur/numérique, informatique, sport, magasin, archivage défectueux)' },
  { path: '/eleves', label: 'Élèves & Inscriptions', category: 'pedagogique', description: 'Dossiers des élèves, inscriptions et fiches' },
  { path: '/promotions', label: 'Gestion des Passages & Redoublements', category: 'pedagogique', description: 'Décisions de passage ou redoublement basées sur la moyenne annuelle' },
  { path: '/enseignants', label: 'Enseignants', category: 'pedagogique', description: 'Corps professoral, affectations et contacts' },
  { path: '/personnel-administratif', label: 'Personnel Administratif', category: 'administration', description: 'Membres administratifs, postes et contrats' },
  { path: '/matieres', label: 'Matières & Coefficients', category: 'pedagogique', description: 'Configuration des matières et barèmes' },
  { path: '/notes', label: 'Notes & Bulletins', category: 'pedagogique', description: 'Saisie des notes, calculs et génération des bulletins' },
  { path: '/paiements', label: 'Paiements & Écolages', category: 'finance', description: 'Frais de scolarité, encaissements et reçus' },
  { path: '/salaires-enseignants', label: 'Salaires & Paie', category: 'finance', description: 'Gestion des rémunérations et fiches de paie' },
  { path: '/finances', label: 'Trésorerie & Dépenses (Entrées/Sorties)', category: 'finance', description: 'Rapprochement scolarités, salaires, dépenses de fonctionnement et flux net' },
  { path: '/cartes-et-badges', label: 'Cartes Scolaires & Badges', category: 'pedagogique', description: 'Génération et impression des cartes élèves et enseignants' },
  { path: '/emploi-du-temps', label: 'Emploi du temps', category: 'pedagogique', description: 'Planification des cours et créneaux horaires' },
  { path: '/emploi-du-temps-requests', label: 'Demandes EDT', category: 'pedagogique', description: 'Demandes d\'ajustement d\'horaires par les enseignants' },
  { path: '/bibliotheque', label: 'Bibliothèque Numérique', category: 'pedagogique', description: 'Ressources pédagogiques, manuels scolaires et livres numériques' },
  { path: '/bibliotheque-physique', label: 'Bibliothèque Scolaire (Livres physiques)', category: 'pedagogique', description: 'Gestion des livres physiques, emplacements (armoires, casiers, tables), état, inscriptions élèves, suivi des emprunts et consultations sur place' },
  { path: '/epreuves', label: 'Gestion des Épreuves', category: 'pedagogique', description: 'Dépôt des épreuves par les enseignants, analyse/validation admin et banque d\'épreuves' },
  { path: '/epreuves-composition', label: 'Épreuves de Composition', category: 'pedagogique', description: 'Sélection, tirage et conditionnement des épreuves retenues pour les compositions officielles (Strictement réservé au personnel)' },
  { path: '/documents-demandes', label: 'Documents & Demandes', category: 'administration', description: 'Demandes de certificats, attestations et contrats' },
  { path: '/ecole', label: 'Infos École', category: 'administration', description: 'Coordonnées, logo, signature et en-têtes officiels' },
  { path: '/alertes', label: 'Alertes & Notifications', category: 'general', description: 'Alertes académiques et rappels' },
  { path: '/messagerie', label: 'Messagerie & SMS', category: 'general', description: 'Messagerie interne, communication parents et diffusion SMS' },
  { path: '/gmail', label: 'Google Gmail', category: 'general', description: 'Accès et envoi officiel via Google Gmail' },
  { path: '/workspace', label: 'Suite Google Workspace', category: 'general', description: 'Google Calendar, Tasks, Docs, Sheets et Gmail synchronisés' },
  { path: '/audit-logs', label: 'Journal d\'audit', category: 'administration', description: 'Historique et traçabilité des opérations' },
  { path: '/parametres', label: 'Paramètres du Système', category: 'administration', description: 'Configuration générale, années et comptes utilisateurs' },
  { path: '/collecte-enseignants', label: 'Collecte Enseignants (Secondaire)', category: 'pedagogique', description: 'Formulaires de collecte d\'informations enseignants, voeux d\'emploi du temps et validation' },
];

export interface RoleDefinition {
  id: string;
  value: string;
  label: string;
  description: string;
  desc?: string;
  color: string;
  defaultAccess: Record<string, AccessMode>;
}

export const SYSTEM_ROLES: RoleDefinition[] = [
  { 
    id: 'admin', 
    value: 'admin', 
    label: 'Fondé / Administrateur', 
    description: 'Fondateur seul administrateur avec plein pouvoir sur tous les paramètres du système', 
    desc: 'Fondateur seul administrateur avec plein pouvoir sur tous les paramètres', 
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    defaultAccess: {
      '/': 'read_write',
      '/classes': 'read_write',
      '/batiments-salles': 'read_write',
      '/ressources-materielles': 'read_write',
      '/eleves': 'read_write',
      '/promotions': 'read_write',
      '/enseignants': 'read_write',
      '/personnel-administratif': 'read_write',
      '/matieres': 'read_write',
      '/notes': 'read_write',
      '/paiements': 'read_write',
      '/salaires-enseignants': 'read_write',
      '/finances': 'read_write',
      '/cartes-et-badges': 'read_write',
      '/emploi-du-temps': 'read_write',
      '/emploi-du-temps-requests': 'read_write',
      '/bibliotheque': 'read_write',
      '/bibliotheque-physique': 'read_write',
      '/epreuves': 'read_write',
      '/epreuves-composition': 'read_write',
      '/documents-demandes': 'read_write',
      '/ecole': 'read_write',
      '/alertes': 'read_write',
      '/messagerie': 'read_write',
      '/gmail': 'read_write',
      '/workspace': 'read_write',
      '/audit-logs': 'read_write',
      '/parametres': 'read_write',
    }
  },
  { 
    id: 'direction', 
    value: 'direction', 
    label: 'Direction Générale', 
    description: 'Gestion et supervision générale des opérations scolaires et du personnel', 
    desc: 'Gestion et supervision des opérations scolaires', 
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultAccess: {
      '/': 'read_write',
      '/classes': 'read_write',
      '/batiments-salles': 'read_write',
      '/ressources-materielles': 'read_write',
      '/eleves': 'read_write',
      '/promotions': 'read_write',
      '/enseignants': 'read_write',
      '/personnel-administratif': 'read_only',
      '/matieres': 'read_write',
      '/notes': 'read_write',
      '/paiements': 'read_only',
      '/salaires-enseignants': 'read_only',
      '/finances': 'read_write',
      '/cartes-et-badges': 'read_write',
      '/emploi-du-temps': 'read_write',
      '/emploi-du-temps-requests': 'read_write',
      '/bibliotheque': 'read_write',
      '/bibliotheque-physique': 'read_write',
      '/epreuves': 'read_write',
      '/epreuves-composition': 'read_write',
      '/documents-demandes': 'read_write',
      '/ecole': 'read_write',
      '/alertes': 'read_write',
      '/messagerie': 'read_write',
      '/gmail': 'read_write',
      '/workspace': 'read_write',
      '/audit-logs': 'read_only',
      '/parametres': 'none',
    }
  },
  { 
    id: 'censeur', 
    value: 'censeur', 
    label: 'Censeur / Directeur des Études', 
    description: 'Gestion pédagogique, emploi du temps, notes, matières et classes', 
    desc: 'Gestion pédagogique des classes, matières, notes et emplois du temps', 
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    defaultAccess: {
      '/': 'read_only',
      '/classes': 'read_write',
      '/batiments-salles': 'read_write',
      '/ressources-materielles': 'read_write',
      '/eleves': 'read_write',
      '/promotions': 'read_write',
      '/enseignants': 'read_write',
      '/personnel-administratif': 'none',
      '/matieres': 'read_write',
      '/notes': 'read_write',
      '/paiements': 'none',
      '/salaires-enseignants': 'none',
      '/finances': 'none',
      '/cartes-et-badges': 'read_write',
      '/emploi-du-temps': 'read_write',
      '/emploi-du-temps-requests': 'read_write',
      '/bibliotheque': 'read_write',
      '/bibliotheque-physique': 'read_write',
      '/epreuves': 'read_write',
      '/epreuves-composition': 'read_write',
      '/documents-demandes': 'read_write',
      '/ecole': 'read_only',
      '/alertes': 'read_write',
      '/messagerie': 'read_write',
      '/gmail': 'read_write',
      '/workspace': 'read_write',
      '/audit-logs': 'none',
      '/parametres': 'none',
    }
  },
  { 
    id: 'surveillant', 
    value: 'surveillant', 
    label: 'Surveillant Général / Discipline', 
    description: 'Suivi de la discipline, présences, cartes élèves et badges', 
    desc: 'Suivi de la discipline, présences, cartes élèves et emploi du temps', 
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultAccess: {
      '/': 'read_only',
      '/classes': 'read_only',
      '/batiments-salles': 'read_only',
      '/ressources-materielles': 'read_write',
      '/eleves': 'read_write',
      '/promotions': 'none',
      '/enseignants': 'read_only',
      '/personnel-administratif': 'none',
      '/matieres': 'none',
      '/notes': 'read_only',
      '/paiements': 'none',
      '/salaires-enseignants': 'none',
      '/finances': 'none',
      '/cartes-et-badges': 'read_write',
      '/emploi-du-temps': 'read_only',
      '/emploi-du-temps-requests': 'none',
      '/bibliotheque': 'read_only',
      '/bibliotheque-physique': 'read_only',
      '/epreuves': 'read_only',
      '/documents-demandes': 'read_write',
      '/ecole': 'read_only',
      '/alertes': 'read_write',
      '/messagerie': 'read_write',
      '/audit-logs': 'none',
      '/parametres': 'none',
    }
  },
  { 
    id: 'secretariat', 
    value: 'secretariat', 
    label: 'Secrétariat / Administration', 
    description: 'Inscriptions des élèves, fiches, certificats, bulletins et courriers', 
    desc: 'Inscriptions, bulletins, dossiers élèves et documents administratifs', 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultAccess: {
      '/': 'read_only',
      '/classes': 'read_only',
      '/batiments-salles': 'read_only',
      '/ressources-materielles': 'read_only',
      '/eleves': 'read_write',
      '/promotions': 'read_write',
      '/enseignants': 'read_only',
      '/personnel-administratif': 'none',
      '/matieres': 'read_only',
      '/notes': 'read_write',
      '/paiements': 'read_only',
      '/salaires-enseignants': 'none',
      '/finances': 'none',
      '/cartes-et-badges': 'read_write',
      '/emploi-du-temps': 'read_only',
      '/emploi-du-temps-requests': 'none',
      '/bibliotheque': 'read_write',
      '/bibliotheque-physique': 'read_write',
      '/epreuves': 'read_only',
      '/epreuves-composition': 'read_write',
      '/documents-demandes': 'read_write',
      '/ecole': 'read_only',
      '/alertes': 'read_write',
      '/messagerie': 'read_write',
      '/audit-logs': 'none',
      '/parametres': 'none',
    }
  },
  { 
    id: 'comptable', 
    value: 'comptable', 
    label: 'Comptable / Économe', 
    description: 'Encaissements des frais de scolarité, salaires du personnel et reçus', 
    desc: 'Encaissement des écolages, comptabilité et salaires du personnel', 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    defaultAccess: {
      '/': 'read_only',
      '/classes': 'read_only',
      '/batiments-salles': 'read_only',
      '/ressources-materielles': 'read_write',
      '/eleves': 'read_only',
      '/promotions': 'none',
      '/enseignants': 'read_only',
      '/personnel-administratif': 'read_only',
      '/matieres': 'none',
      '/notes': 'none',
      '/paiements': 'read_write',
      '/salaires-enseignants': 'read_write',
      '/finances': 'read_write',
      '/cartes-et-badges': 'none',
      '/emploi-du-temps': 'none',
      '/emploi-du-temps-requests': 'none',
      '/bibliotheque': 'read_only',
      '/bibliotheque-physique': 'read_only',
      '/epreuves': 'none',
      '/epreuves-composition': 'none',
      '/documents-demandes': 'read_write',
      '/ecole': 'read_only',
      '/alertes': 'read_write',
      '/messagerie': 'read_write',
      '/audit-logs': 'none',
      '/parametres': 'none',
    }
  },
  { 
    id: 'enseignant', 
    value: 'enseignant', 
    label: 'Enseignant / Professeur', 
    description: 'Saisie des notes de ses élèves, fiches d\'évaluation, bibliothèque et épreuves', 
    desc: 'Saisie des notes de ses classes, consultation emploi du temps, bibliothèque et dépôt épreuves', 
    color: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    defaultAccess: {
      '/': 'read_only',
      '/classes': 'read_only',
      '/batiments-salles': 'read_only',
      '/ressources-materielles': 'read_only',
      '/eleves': 'read_only',
      '/promotions': 'none',
      '/enseignants': 'none',
      '/personnel-administratif': 'none',
      '/matieres': 'read_only',
      '/notes': 'read_write',
      '/paiements': 'none',
      '/salaires-enseignants': 'none',
      '/finances': 'none',
      '/cartes-et-badges': 'none',
      '/emploi-du-temps': 'read_only',
      '/emploi-du-temps-requests': 'read_write',
      '/bibliotheque': 'read_only',
      '/bibliotheque-physique': 'none',
      '/epreuves': 'read_write',
      '/epreuves-composition': 'none',
      '/documents-demandes': 'read_write',
      '/ecole': 'none',
      '/alertes': 'read_only',
      '/messagerie': 'read_write',
      '/audit-logs': 'none',
      '/parametres': 'none',
    }
  },
];

/**
 * Normalizes any permission object or string into a standard AccessMode
 */
export function normalizeAccessMode(perm: any): AccessMode {
  if (!perm) return 'none';
  if (typeof perm === 'string') return 'read_write';
  if (perm.access_type === 'read_write' || perm.access_type === 'read_only' || perm.access_type === 'none') {
    return perm.access_type;
  }
  if (perm.access_type === 'write_only') {
    return 'read_write';
  }
  
  const canRead = perm.can_read !== false;
  const canWrite = Boolean(perm.can_write);

  if (canRead && canWrite) return 'read_write';
  if (canRead && !canWrite) return 'read_only';
  if (!canRead && canWrite) return 'read_write';
  return 'none';
}

/**
 * Converts access mode into boolean flags for storage/compatibility
 */
export function accessModeToBooleans(mode: AccessMode): { can_read: boolean; can_write: boolean; access_type: AccessMode } {
  switch (mode) {
    case 'read_write':
      return { can_read: true, can_write: true, access_type: 'read_write' };
    case 'read_only':
      return { can_read: true, can_write: false, access_type: 'read_only' };
    case 'none':
    default:
      return { can_read: false, can_write: false, access_type: 'none' };
  }
}

/**
 * Checks if a user has access to a specific page path.
 * If user has no access, returns false (page is strictly hidden).
 */
export function hasPageAccess(permissions: any[] | undefined, targetPath: string, userRole?: string): boolean {
  // Mon compte is accessible to all authenticated users
  if (targetPath === '/mon-compte' || targetPath.startsWith('/mon-compte/')) {
    return true;
  }

  // CRITICAL REQUIREMENT: "Mon enfant" is strictly and exclusively reserved for the parent account
  if (targetPath === '/mon-enfant' || targetPath.startsWith('/mon-enfant/')) {
    return userRole === 'parent';
  }

  // Parent special portal: only has access to accueil, alertes and mon-enfant (STRICTLY NO ACCESS TO EPREUVES)
  if (userRole === 'parent') {
    if (targetPath.startsWith('/epreuves')) return false;
    return ['/accueil', '/accueil-primaire', '/accueil-secondaire', '/alertes', '/mon-enfant', '/mon-compte', '/bibliotheque', '/bibliotheque-primaire', '/bibliotheque-secondaire'].includes(targetPath);
  }

  // Teacher special portal: timetable, grades, requests, alerts, messagerie, documents, mon-compte, bibliotheque & epreuves
  if (userRole === 'enseignant') {
    const teacherBasePaths = [
      '/emploi-du-temps', 
      '/emploi-du-temps-primaire', 
      '/emploi-du-temps-secondaire', 
      '/mes-classes',
      '/ma-classe',
      '/mes-cours',
      '/admin/sessions-actives',
      '/notes', 
      '/notes-primaire', 
      '/notes-secondaire', 
      '/emploi-du-temps-requests', 
      '/messagerie',
      '/alertes', 
      '/mon-compte',
      '/accueil',
      '/accueil-primaire',
      '/accueil-secondaire',
      '/bibliotheque',
      '/bibliotheque-primaire',
      '/bibliotheque-secondaire',
      '/epreuves',
      '/epreuves-primaire',
      '/epreuves-secondaire'
    ];
    if (teacherBasePaths.includes(targetPath)) return true;
  }

  // Fondé / Admin has unrestricted access to all school administration pages
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'fonde') return true;

  // Administrative personnel access to live sessions
  if (targetPath === '/admin/sessions-actives' && ['direction', 'censeur', 'surveillant', 'secretariat', 'personnel', 'comptable'].includes(userRole || '')) {
    return true;
  }

  // Collecte Enseignants (Secondaire): admin de l'école, le secrétaire et les censeurs reçoivent et valident les formulaires
  if (targetPath.startsWith('/collecte-enseignants')) {
    if (['admin', 'super_admin', 'fonde', 'direction', 'censeur', 'secretariat'].includes(userRole || '')) {
      return true;
    }
  }

  // Public/shared portal entrypoints are always accessible
  if (['/accueil', '/accueil-primaire', '/accueil-secondaire'].includes(targetPath)) return true;

  if (!permissions || !Array.isArray(permissions) || permissions.length === 0) return false;

  const normalizedTargetPath = targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');
  const baseTarget = '/' + normalizedTargetPath.split('-')[0].replace(/^\//, '');

  return permissions.some(p => {
    const pPath = typeof p === 'string' ? p : p.path;
    const normPath = pPath === '/' ? '/' : (pPath || '').replace(/\/$/, '');
    const normBase = '/' + normPath.split('-')[0].replace(/^\//, '');

    const matches =
      normPath === normalizedTargetPath ||
      (normalizedTargetPath === '/tableau-de-bord' && (normPath === '/' || normPath === '/tableau-de-bord')) ||
      (normalizedTargetPath.startsWith('/tableau-de-bord-') && (normPath === '/' || normPath === '/tableau-de-bord')) ||
      (baseTarget && baseTarget !== '/' && (normPath === baseTarget || normBase === baseTarget)) ||
      (normPath === '/salaires' && normalizedTargetPath === '/salaires-enseignants') ||
      (normPath === '/salaires-enseignants' && normalizedTargetPath === '/salaires');

    if (!matches) return false;
    const mode = normalizeAccessMode(p);
    return mode !== 'none';
  });
}

/**
 * Gets the granular access mode ('read_write' | 'read_only' | 'none') for a specific page path.
 */
export function getPageAccessMode(permissions: any[] | undefined, targetPath: string, userRole?: string): AccessMode {
  if (userRole === 'admin' || userRole === 'super_admin' || userRole === 'fonde') return 'read_write';
  if (targetPath === '/mon-compte' || targetPath.startsWith('/mon-compte/')) return 'read_write';
  
  // STRICT REQUIREMENT: Teachers, Parents, and Students NEVER have access to the personnel composition space!
  if (userRole === 'enseignant' || userRole === 'parent' || userRole === 'eleve') {
    if (targetPath.startsWith('/epreuves-composition')) {
      return 'none';
    }
  }

  if (userRole === 'parent') {
    if (targetPath.startsWith('/epreuves')) {
      return 'none';
    }
    if (['/mon-enfant', '/alertes', '/accueil', '/accueil-primaire', '/accueil-secondaire', '/bibliotheque', '/bibliotheque-primaire', '/bibliotheque-secondaire', '/bibliotheque-physique'].includes(targetPath)) {
      return 'read_only';
    }
    return 'none';
  }

  // Look in user permissions array first
  if (permissions && Array.isArray(permissions) && permissions.length > 0) {
    const normalizedTargetPath = targetPath === '/' ? '/' : targetPath.replace(/\/$/, '');
    const baseTarget = '/' + normalizedTargetPath.split('-')[0].replace(/^\//, '');

    const perm = permissions.find(p => {
      const pPath = typeof p === 'string' ? p : p.path;
      const normPath = pPath === '/' ? '/' : (pPath || '').replace(/\/$/, '');
      const normBase = '/' + normPath.split('-')[0].replace(/^\//, '');

      return (
        normPath === normalizedTargetPath ||
        (normalizedTargetPath === '/tableau-de-bord' && (normPath === '/' || normPath === '/tableau-de-bord')) ||
        (normalizedTargetPath.startsWith('/tableau-de-bord-') && (normPath === '/' || normPath === '/tableau-de-bord')) ||
        (baseTarget && baseTarget !== '/' && (normPath === baseTarget || normBase === baseTarget)) ||
        (normPath === '/salaires' && normalizedTargetPath === '/salaires-enseignants') ||
        (normPath === '/salaires-enseignants' && normalizedTargetPath === '/salaires')
      );
    });

    if (perm) {
      return normalizeAccessMode(perm);
    }
  }

  // Role defaults fallback
  if (userRole === 'enseignant') {
    if (['/notes', '/notes-primaire', '/notes-secondaire', '/mes-classes', '/ma-classe', '/mes-cours', '/emploi-du-temps-requests', '/messagerie', '/gmail', '/workspace', '/documents-demandes', '/documents-administratifs', '/epreuves', '/epreuves-primaire', '/epreuves-secondaire'].includes(targetPath)) {
      return 'read_write';
    }
    if (['/emploi-du-temps', '/emploi-du-temps-primaire', '/emploi-du-temps-secondaire', '/alertes', '/accueil', '/accueil-primaire', '/accueil-secondaire', '/bibliotheque', '/bibliotheque-primaire', '/bibliotheque-secondaire'].includes(targetPath)) {
      return 'read_only';
    }
  }

  if (['direction', 'admin', 'censeur', 'surveillant', 'secretariat', 'personnel', 'comptable'].includes(userRole || '')) {
    if (['/admin/sessions-actives'].includes(targetPath)) {
      return 'read_write';
    }
  }

  const roleDef = SYSTEM_ROLES.find(r => r.value === userRole);
  if (roleDef && roleDef.defaultAccess && roleDef.defaultAccess[targetPath]) {
    return roleDef.defaultAccess[targetPath];
  }

  return 'none';
}

/**
 * Returns the list of all granted pages for the user with their access type
 */
export function getUserGrantedPages(permissions: any[] | undefined, userRole?: string): Array<PageDefinition & { access_type: AccessMode; can_write: boolean; can_read: boolean }> {
  return SYSTEM_PAGES.map(page => {
    const accessMode = getPageAccessMode(permissions, page.path, userRole);
    return {
      ...page,
      access_type: accessMode,
      can_read: accessMode !== 'none',
      can_write: accessMode === 'read_write'
    };
  }).filter(page => page.access_type !== 'none');
}

/**
 * Checks if a user has write permissions for a specific page path.
 */
export function canWritePage(permissions: any[] | undefined, targetPath: string, userRole?: string): boolean {
  return getPageAccessMode(permissions, targetPath, userRole) === 'read_write';
}
