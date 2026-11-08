// Catalog of standardized school subjects, acronyms (sigles), and duplicate detection utilities
// With strict separation between Primary/Kindergarten (Primaire & Maternelle) and Secondary (Collège & Lycée)

export interface StandardSubject {
  code: string;
  sigle: string;
  nom: string;
  categorie: string;
  coefficient: number;
  cycle: 'secondaire' | 'primaire' | 'technique' | 'tous';
  aliases: string[];
  description: string;
  iconName?: string;
  color?: string;
  est_disciplinaire?: boolean;
}

export interface SubjectCategory {
  id: string;
  label: string;
  cycle: 'primaire' | 'secondaire' | 'tous';
  icon: string;
  color: string;
  badgeClass: string;
  headerBg: string;
}

export const SUBJECT_CATEGORIES: SubjectCategory[] = [
  // === CATEGORIES SECONDAIRE ===
  {
    id: 'Sciences & Technologies',
    label: 'Sciences & Technologies',
    cycle: 'secondaire',
    icon: 'Atom',
    color: 'emerald',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    headerBg: 'bg-gradient-to-r from-emerald-600 to-teal-700'
  },
  {
    id: 'Lettres & Langues',
    label: 'Lettres & Langues',
    cycle: 'secondaire',
    icon: 'BookOpen',
    color: 'indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerBg: 'bg-gradient-to-r from-indigo-600 to-blue-700'
  },
  {
    id: 'Sciences Humaines & Sociales',
    label: 'Sciences Humaines & Sociales',
    cycle: 'secondaire',
    icon: 'Globe',
    color: 'amber',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    headerBg: 'bg-gradient-to-r from-amber-600 to-orange-700'
  },
  {
    id: 'Arts, Culture & Sports',
    label: 'Arts, Culture & Sports',
    cycle: 'secondaire',
    icon: 'Palette',
    color: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    headerBg: 'bg-gradient-to-r from-rose-600 to-pink-700'
  },
  {
    id: 'Enseignement Technique & Pratique',
    label: 'Enseignement Technique & Pratique',
    cycle: 'secondaire',
    icon: 'Cpu',
    color: 'cyan',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    headerBg: 'bg-gradient-to-r from-cyan-600 to-sky-700'
  },

  // === CATEGORIES PRIMAIRE & MATERNELLE ===
  {
    id: 'Langage, Lecture & Français (Primaire)',
    label: 'Langage, Lecture & Français',
    cycle: 'primaire',
    icon: 'BookOpen',
    color: 'purple',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    headerBg: 'bg-gradient-to-r from-purple-600 to-violet-700'
  },
  {
    id: 'Calcul & Mathématiques (Primaire)',
    label: 'Calcul & Mathématiques',
    cycle: 'primaire',
    icon: 'Calculator',
    color: 'indigo',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    headerBg: 'bg-gradient-to-r from-indigo-600 to-violet-700'
  },
  {
    id: 'Éveil Scientifique & Social (Primaire)',
    label: 'Éveil Scientifique & Social (EST / ES)',
    cycle: 'primaire',
    icon: 'Sparkles',
    color: 'teal',
    badgeClass: 'bg-teal-50 text-teal-700 border-teal-200',
    headerBg: 'bg-gradient-to-r from-teal-600 to-emerald-700'
  },
  {
    id: 'Arts, Motricité & Développement (Primaire)',
    label: 'Arts, Motricité & Éducation Physique',
    cycle: 'primaire',
    icon: 'Palette',
    color: 'rose',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    headerBg: 'bg-gradient-to-r from-rose-600 to-amber-700'
  },
  {
    id: 'Maternelle (Éveil & Activités Sensorielles)',
    label: 'Maternelle (Éveil & Motricité)',
    cycle: 'primaire',
    icon: 'Heart',
    color: 'pink',
    badgeClass: 'bg-pink-50 text-pink-700 border-pink-200',
    headerBg: 'bg-gradient-to-r from-pink-600 to-rose-700'
  }
];

export const STANDARDIZED_SUBJECTS_CATALOG: StandardSubject[] = [
  // =========================================================================
  // 🎓 CYCLE SECONDAIRE (COLLÈGE & LYCÉE)
  // =========================================================================

  // 🔬 Sciences & Technologies (Secondaire)
  {
    code: 'MAT-MATH-SEC',
    sigle: 'MATHS',
    nom: 'Mathématiques',
    categorie: 'Sciences & Technologies',
    coefficient: 3,
    cycle: 'secondaire',
    aliases: ['math', 'maths', 'mathématique', 'mathematiques', 'algebre', 'geometrie', 'analyse', 'trigonometrie'],
    description: 'Algèbre, analyse, géométrie vectorielle et probabilités pour le collège et lycée.',
    color: '#059669'
  },
  {
    code: 'MAT-PCT',
    sigle: 'PCT',
    nom: 'Physique Chimie et Technologie (PCT)',
    categorie: 'Sciences & Technologies',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['pct', 'pc', 'physique chimie', 'physique-chimie', 'sciences physiques', 'sp', 'physique', 'chimie', 'technologie physique'],
    description: 'Étude des phénomènes physiques, chimie générale et organique, mécanique et électricité.',
    color: '#0d9488'
  },
  {
    code: 'MAT-SVT',
    sigle: 'SVT',
    nom: 'Science de la Vie et de la Terre (SVT)',
    categorie: 'Sciences & Technologies',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['svt', 'science de la vie et de la terre', 'sciences de la vie et de la terre', 'science et vie de la terre', 'biologie', 'biologie-geologie', 'sciences naturelles', 'sn', 'bio', 'geologie', 'botanique'],
    description: 'Biologie cellulaire, génétique, géologie, écologie et fonctionnement du corps humain.',
    color: '#10b981'
  },
  {
    code: 'MAT-INFO-SEC',
    sigle: 'INFO',
    nom: 'Informatique & TIC',
    categorie: 'Sciences & Technologies',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['informatique', 'info', 'tic', 'tice', 'bureautique', 'technologies de l information', 'algorithmique', 'programmation', 'ordinateur', 'coding'],
    description: 'Bureautique avancée, algorithmique, programmation et sécurité numérique.',
    color: '#0284c7'
  },
  {
    code: 'MAT-COND-SEC',
    sigle: 'COND',
    nom: 'Conduite',
    categorie: 'Sciences Humaines & Sociales',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['conduite', 'comportement', 'discipline', 'civisme', 'moral'],
    description: 'Matière disciplinaire pour évaluer le comportement et l\'assiduité de l\'élève.',
    color: '#f59e0b',
    est_disciplinaire: true
  },
  {
    code: 'MAT-TECH',
    sigle: 'TECH',
    nom: 'Technologie & Sciences de l\'Ingénieur',
    categorie: 'Sciences & Technologies',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['technologie', 'techno', 'si', 'sciences de l ingenieur', 'ingenierie', 'mecanisme'],
    description: 'Conception assistée, automatismes, robotique et analyse des systèmes techniques.',
    color: '#0891b2'
  },
  {
    code: 'MAT-SES',
    sigle: 'SES',
    nom: 'Sciences Économiques et Sociales (SES)',
    categorie: 'Sciences & Technologies',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['ses', 'sciences economiques et sociales', 'sciences eco', 'sciences economiques'],
    description: 'Mécanismes macroéconomiques, monnaie, sociologie et politiques publiques.',
    color: '#14b8a6'
  },

  // 📚 Lettres & Langues (Secondaire)
  {
    code: 'MAT-FR-SEC',
    sigle: 'FR',
    nom: 'Français',
    categorie: 'Lettres & Langues',
    coefficient: 3,
    cycle: 'secondaire',
    aliases: ['francais', 'français', 'fr', 'langue francaise', 'lettres', 'litterature', 'dissertation', 'commentaire compose'],
    description: 'Littérature, analyse textuelle, grammaire, dissertation et culture littéraire.',
    color: '#4f46e5'
  },
  {
    code: 'MAT-ANG-SEC',
    sigle: 'ANG',
    nom: 'Anglais (LV1)',
    categorie: 'Lettres & Langues',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['anglais', 'ang', 'english', 'lv1 anglais', 'langue anglaise', 'en'],
    description: 'Grammaire anglaise, expression écrite et orale, civilisation anglophone.',
    color: '#6366f1'
  },
  {
    code: 'MAT-ESP',
    sigle: 'ESP',
    nom: 'Espagnol (LV2)',
    categorie: 'Lettres & Langues',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['espagnol', 'esp', 'spanish', 'espanol', 'lv2 espagnol', 'es'],
    description: 'Langue vivante 2 : vocabulaire, conversation et civilisation hispanique.',
    color: '#3b82f6'
  },
  {
    code: 'MAT-ALL',
    sigle: 'ALL',
    nom: 'Allemand (LV2)',
    categorie: 'Lettres & Langues',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['allemand', 'all', 'german', 'deutsch', 'lv2 allemand', 'de'],
    description: 'Langue vivante 2 : grammaire, expression et culture germanophone.',
    color: '#4338ca'
  },
  {
    code: 'MAT-LAT',
    sigle: 'LAT',
    nom: 'Latin & Langues Anciennes',
    categorie: 'Lettres & Langues',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['latin', 'lat', 'grec', 'lettres classiques', 'langues anciennes'],
    description: 'Étude des racines gréco-latines, étymologie et culture antique.',
    color: '#3730a3'
  },

  // 🌍 Sciences Humaines & Sociales (Secondaire)
  {
    code: 'MAT-HG',
    sigle: 'HG',
    nom: 'Histoire-Géographie',
    categorie: 'Sciences Humaines & Sociales',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['histoire-geographie', 'histoire geographie', 'hg', 'histoire-geo', 'histoire geo', 'hist-geo', 'histoire', 'geographie', 'geo'],
    description: 'Grandes périodes historiques nationales et mondiales, géopolitique et cartographie.',
    color: '#d97706'
  },
  {
    code: 'MAT-PHIL',
    sigle: 'PHIL',
    nom: 'Philosophie',
    categorie: 'Sciences Humaines & Sociales',
    coefficient: 2,
    cycle: 'secondaire',
    aliases: ['philosophie', 'philo', 'phil', 'pensee critique', 'epistemologie'],
    description: 'Réflexion conceptuelle, logique, éthique, métaphysique et pensée critique.',
    color: '#b45309'
  },
  {
    code: 'MAT-ECM-SEC',
    sigle: 'ECM',
    nom: 'Éducation Civique et Morale (ECM)',
    categorie: 'Sciences Humaines & Sociales',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['ecm', 'education civique et morale', 'éducation civique et morale', 'instruction civique', 'civisme', 'education civique', 'citoyennete', 'emc'],
    description: 'Institutions républicaines, droits humains, démocratie et devoir civique.',
    color: '#c2410c'
  },

  // 🎨 Arts, Culture & Sports (Secondaire)
  {
    code: 'MAT-EPS-SEC',
    sigle: 'EPS',
    nom: 'Éducation Physique et Sportive (EPS)',
    categorie: 'Arts, Culture & Sports',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['eps', 'education physique et sportive', 'éducation physique et sportive', 'sport', 'gymnastique', 'athletisme', 'eps/sport', 'football'],
    description: 'Athlétisme, sports collectifs, gymnastique, endurance et arbitrage sportif.',
    color: '#e11d48'
  },
  {
    code: 'MAT-ART-SEC',
    sigle: 'ART',
    nom: 'Arts Plastiques & Dessin',
    categorie: 'Arts, Culture & Sports',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['arts plastiques', 'arts', 'art', 'dessin', 'education artistique', 'arts visuels', 'peinture'],
    description: 'Composition plastique, techniques picturales et histoire de l\'art.',
    color: '#be123c'
  },
  {
    code: 'MAT-MUS-SEC',
    sigle: 'MUS',
    nom: 'Éducation Musicale & Chant',
    categorie: 'Arts, Culture & Sports',
    coefficient: 1,
    cycle: 'secondaire',
    aliases: ['education musicale', 'musique', 'mus', 'chant', 'solfege', 'rythme'],
    description: 'Théorie musicale, chant choral, écoute critique et instruments.',
    color: '#f43f5e'
  },

  // ⚙️ Enseignement Technique & Pratique (Secondaire / Technique)
  {
    code: 'MAT-CPT',
    sigle: 'CPT',
    nom: 'Comptabilité Générale',
    categorie: 'Enseignement Technique & Pratique',
    coefficient: 3,
    cycle: 'technique',
    aliases: ['comptabilite', 'comptabilité', 'cpt', 'comptabilite generale', 'gestion comptable', 'finance'],
    description: 'Écritures comptables, journal, grand livre, bilan et compte de résultat.',
    color: '#0891b2'
  },
  {
    code: 'MAT-GEST',
    sigle: 'GEST',
    nom: 'Gestion & Organisation des Entreprises',
    categorie: 'Enseignement Technique & Pratique',
    coefficient: 2,
    cycle: 'technique',
    aliases: ['gestion', 'gest', 'management', 'organisation des entreprises', 'commerce', 'marketing'],
    description: 'Stratégie commerciale, logistique, ressources humaines et entrepreneuriat.',
    color: '#0284c7'
  },
  {
    code: 'MAT-DT',
    sigle: 'DT',
    nom: 'Dessin Technique / DAO',
    categorie: 'Enseignement Technique & Pratique',
    coefficient: 2,
    cycle: 'technique',
    aliases: ['dessin technique', 'dt', 'dao', 'cao', 'dessin industriel', 'geometrie descriptive'],
    description: 'Projections orthogonales, cotation normalisée, coupes et schémas.',
    color: '#0369a1'
  },
  {
    code: 'MAT-ELEC',
    sigle: 'ELEC',
    nom: 'Électrotechnique & Électricité',
    categorie: 'Enseignement Technique & Pratique',
    coefficient: 2,
    cycle: 'technique',
    aliases: ['electricite', 'électricité', 'electrotechnique', 'elec', 'electronique'],
    description: 'Circuits de puissance, bobinages, transformateurs et maintenance.',
    color: '#0e7490'
  },
  {
    code: 'MAT-MEC',
    sigle: 'MEC',
    nom: 'Construction Mécanique',
    categorie: 'Enseignement Technique & Pratique',
    coefficient: 2,
    cycle: 'technique',
    aliases: ['mecanique', 'mécanique', 'mec', 'construction mecanique', 'usinage'],
    description: 'Cinématique, statique des solides, résistance des matériaux et usinage.',
    color: '#155e75'
  },
  {
    code: 'MAT-AGRI',
    sigle: 'AGRI',
    nom: 'Agriculture & Élevage',
    categorie: 'Enseignement Technique & Pratique',
    coefficient: 1,
    cycle: 'technique',
    aliases: ['agriculture', 'agri', 'agronomie', 'elevage', 'production vegetale', 'production animale', 'horticulture'],
    description: 'Techniques culturales, maraîchage, protection des sols et élevage.',
    color: '#16a34a'
  },

  // =========================================================================
  // 👶 CYCLE PRIMAIRE & MATERNELLE
  // =========================================================================

  // 📖 Langage, Lecture & Français (Primaire)
  {
    code: 'MAT-CO',
    sigle: 'CO',
    nom: 'Communication Orale & Langage',
    categorie: 'Langage, Lecture & Français (Primaire)',
    coefficient: 2,
    cycle: 'primaire',
    aliases: ['communication orale', 'co', 'langage', 'expression orale', 'causerie', 'recitation', 'poesie', 'elocution', 'parole'],
    description: 'Développement du vocabulaire, élocution, écoute active, contes et récitation.',
    color: '#9333ea'
  },
  {
    code: 'MAT-LEC',
    sigle: 'LEC',
    nom: 'Lecture & Écriture (Graphisme)',
    categorie: 'Langage, Lecture & Français (Primaire)',
    coefficient: 3,
    cycle: 'primaire',
    aliases: ['lecture', 'lec', 'ecriture', 'écriture', 'graphisme', 'apprentissage de la lecture', 'sons et lettres', 'alphabetisation', 'lecture courante'],
    description: 'Décodage phonétique, syllabique, fluidité de lecture, tracé des lettres et calligraphie.',
    color: '#7e22ce'
  },
  {
    code: 'MAT-EE',
    sigle: 'EE',
    nom: 'Expression Écrite & Production de textes',
    categorie: 'Langage, Lecture & Français (Primaire)',
    coefficient: 2,
    cycle: 'primaire',
    aliases: ['expression ecrite', 'expression écrite', 'ee', 'production d ecrits', 'redaction', 'texte libre', 'redaction primaire'],
    description: 'Construction de phrases complètes, petits paragraphes, description et imagination écrite.',
    color: '#6b21a8'
  },
  {
    code: 'MAT-DICT',
    sigle: 'DICT',
    nom: 'Dictée & Orthographe (Primaire)',
    categorie: 'Langage, Lecture & Français (Primaire)',
    coefficient: 2,
    cycle: 'primaire',
    aliases: ['dictee', 'dictée', 'orthographe', 'dictee et questions', 'grammaire primaire', 'conjugaison primaire', 'vocabulaire'],
    description: 'Accords grammaticaux de base, dictée préparée et mémorisation orthographique.',
    color: '#581c87'
  },
  {
    code: 'MAT-POES',
    sigle: 'POES',
    nom: 'Poésie & Récitation',
    categorie: 'Langage, Lecture & Français (Primaire)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['poesie', 'poésie', 'recitation', 'récitation', 'chants et poesies'],
    description: 'Mémorisation, expressivité vocale, intonation et sensibilité poétique.',
    color: '#a855f7'
  },

  // 🔢 Calcul & Mathématiques (Primaire)
  {
    code: 'MAT-CALC',
    sigle: 'CALC',
    nom: 'Calcul & Mathématiques (Primaire)',
    categorie: 'Calcul & Mathématiques (Primaire)',
    coefficient: 3,
    cycle: 'primaire',
    aliases: ['calcul', 'mathematiques primaire', 'maths primaire', 'operations', 'numeration', 'calcul mental', 'geometrie primaire', 'mesures', 'problemes'],
    description: 'Numération, 4 opérations de base, calcul mental, géométrie intuitive et résolution de problèmes de la vie quotidienne.',
    color: '#4338ca'
  },

  // 🔬 Éveil Scientifique & Social (Primaire)
  {
    code: 'MAT-EST',
    sigle: 'EST',
    nom: 'Éveil Scientifique et Technologique (EST)',
    categorie: 'Éveil Scientifique & Social (Primaire)',
    coefficient: 2,
    cycle: 'primaire',
    aliases: ['est', 'eveil scientifique et technologique', 'éveil scientifique et technologique', 'sciences d observation', 'hygiene', 'environnement primaire', 'lecons de choses', 'sciences naturelles primaire'],
    description: 'Observation de la nature, hygiène corporelle, saisons, nutrition et manipulation de petits objets techniques.',
    color: '#0d9488'
  },
  {
    code: 'MAT-ES',
    sigle: 'ES',
    nom: 'Éducation Sociale (ES - Histoire/Géo)',
    categorie: 'Éveil Scientifique & Social (Primaire)',
    coefficient: 2,
    cycle: 'primaire',
    aliases: ['es', 'education sociale', 'éducation sociale', 'milieu de vie', 'histoire primaire', 'geographie primaire', 'vivre ensemble'],
    description: 'Découverte du milieu immédiat, repères temporels, famille, village/quartier et communauté.',
    color: '#059669'
  },
  {
    code: 'MAT-ECM-PRIM',
    sigle: 'ECM-P',
    nom: 'Éducation Civique & Morale (Primaire)',
    categorie: 'Éveil Scientifique & Social (Primaire)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['ecm primaire', 'morale', 'civisme primaire', 'regles de vie', 'bonne conduite'],
    description: 'Politesse, respect d\'autrui, propreté, sécurité routière et respect des biens publics.',
    color: '#0f766e'
  },

  // 🎨 Arts, Motricité & Développement (Primaire)
  {
    code: 'MAT-EA',
    sigle: 'EA',
    nom: 'Éducation Artistique & Activités Manuelles (EA)',
    categorie: 'Arts, Motricité & Développement (Primaire)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['ea', 'education artistique', 'éducation artistique', 'dessin primaire', 'chant primaire', 'bricolage', 'coloriage', 'pliage', 'modelage'],
    description: 'Coloriage, découpage, pliage, chant, modelage et expression créative.',
    color: '#c084fc'
  },
  {
    code: 'MAT-EPS-PRIM',
    sigle: 'EPS-P',
    nom: 'Éducation Physique & Jeux Sportifs (Primaire)',
    categorie: 'Arts, Motricité & Développement (Primaire)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['eps primaire', 'sport primaire', 'jeux collectifs', 'gymnastique primaire', 'motricite'],
    description: 'Jeux de course, motricité globale, équilibre, rondes et coordination motrice.',
    color: '#e11d48'
  },
  {
    code: 'MAT-LN',
    sigle: 'LN',
    nom: 'Langue Nationale & Culture locale',
    categorie: 'Arts, Motricité & Développement (Primaire)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['langue nationale', 'ln', 'langues nationales', 'culture locale', 'fon', 'yoruba', 'baatonu', 'dendi', 'adja'],
    description: 'Initiation orale à la langue nationale, proverbes, contes et traditions locales.',
    color: '#d97706'
  },
  {
    code: 'MAT-ANG-PRIM',
    sigle: 'ANG-P',
    nom: 'Anglais d\'Initiation (Primaire)',
    categorie: 'Langage, Lecture & Français (Primaire)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['anglais primaire', 'anglais initiation', 'english kids', 'early english'],
    description: 'Comptines en anglais, salutations, couleurs et nombres en anglais pour les enfants.',
    color: '#6366f1'
  },

  // 👶 Maternelle
  {
    code: 'MAT-GRAPH',
    sigle: 'GRAPH',
    nom: 'Graphisme & Motricité fine (Maternelle)',
    categorie: 'Maternelle (Éveil & Activités Sensorielles)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['graphisme', 'motricite fine', 'lignes et ronds', 'tenue du crayon', 'pre-ecriture'],
    description: 'Lignes, ponts, spirales, motricité des doigts et tenue du crayon.',
    color: '#db2777'
  },
  {
    code: 'MAT-CONTES',
    sigle: 'CONT',
    nom: 'Contes, Chants & Éveil sensoriel (Maternelle)',
    categorie: 'Maternelle (Éveil & Activités Sensorielles)',
    coefficient: 1,
    cycle: 'primaire',
    aliases: ['contes', 'comptines', 'eveil sensoriel', 'rondes', 'jeux d imitation'],
    description: 'Découverte des sons, toucher, vue, contes mimés et socialisation.',
    color: '#ec4899'
  }
];

/**
 * Normalizes text for robust comparisons: removes accents, lowers case, strips punctuation and spaces.
 */
export function normalizeString(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // keep only alphanumeric
    .trim();
}

/**
 * Returns subjects filtered by cycle ('primaire', 'secondaire', or 'all')
 */
export function getCatalogByCycle(cycle: 'primaire' | 'secondaire' | 'all' = 'all'): StandardSubject[] {
  if (cycle === 'primaire') {
    return STANDARDIZED_SUBJECTS_CATALOG.filter(s => s.cycle === 'primaire');
  }
  if (cycle === 'secondaire') {
    return STANDARDIZED_SUBJECTS_CATALOG.filter(s => s.cycle === 'secondaire' || s.cycle === 'technique');
  }
  return STANDARDIZED_SUBJECTS_CATALOG;
}

/**
 * Returns categories filtered by cycle
 */
export function getCategoriesByCycle(cycle: 'primaire' | 'secondaire' | 'all' = 'all'): SubjectCategory[] {
  if (cycle === 'primaire') {
    return SUBJECT_CATEGORIES.filter(c => c.cycle === 'primaire');
  }
  if (cycle === 'secondaire') {
    return SUBJECT_CATEGORIES.filter(c => c.cycle === 'secondaire');
  }
  return SUBJECT_CATEGORIES;
}

/**
 * Matches an input text against the standardized catalog, optionally restricted to a specific cycle.
 */
export function findCatalogMatch(inputText: string, targetCycle?: 'primaire' | 'secondaire' | 'all'): StandardSubject | null {
  if (!inputText || !inputText.trim()) return null;
  const cleanInput = normalizeString(inputText);
  if (!cleanInput) return null;

  const catalog = targetCycle && targetCycle !== 'all' ? getCatalogByCycle(targetCycle) : STANDARDIZED_SUBJECTS_CATALOG;

  // 1. Direct code/sigle match
  for (const item of catalog) {
    if (normalizeString(item.sigle) === cleanInput || normalizeString(item.code) === cleanInput) {
      return item;
    }
  }

  // 2. Direct name match
  for (const item of catalog) {
    if (normalizeString(item.nom) === cleanInput) {
      return item;
    }
  }

  // 3. Aliases match
  for (const item of catalog) {
    for (const alias of item.aliases) {
      if (normalizeString(alias) === cleanInput) {
        return item;
      }
    }
  }

  // 4. Substring / fuzzy match
  for (const item of catalog) {
    const normNom = normalizeString(item.nom);
    if (cleanInput.length >= 3 && (normNom.includes(cleanInput) || cleanInput.includes(normNom))) {
      return item;
    }
  }

  // If not found in cycle-specific catalog, do not fallback to conflicting cycles
  return null;
}

/**
 * Generates an automatic uppercase sigle from a subject name.
 */
export function extractOrGenerateSigle(name: string, customSigle?: string, targetCycle?: 'primaire' | 'secondaire' | 'all'): string {
  if (customSigle && customSigle.trim()) {
    return customSigle.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  }

  // Check if there is a parenthesized acronym in the name: e.g. "Science de la Vie et de la Terre (SVT)"
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1] && parenMatch[1].trim().length <= 6) {
    return parenMatch[1].trim().toUpperCase();
  }

  // Check catalog match first
  const catalogMatch = findCatalogMatch(name, targetCycle);
  if (catalogMatch) {
    return catalogMatch.sigle;
  }

  // Stop words in French
  const stopWords = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'et', 'en', 'au', 'aux', 'd', 'l', 'un', 'une', 'sur', 'pour', 'a', 'à']);
  const words = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0 && !stopWords.has(w.toLowerCase()));

  if (words.length === 1) {
    const single = words[0].toUpperCase();
    return single.length <= 4 ? single : single.substring(0, 4);
  }

  if (words.length >= 2) {
    const initials = words.map(w => w[0].toUpperCase()).join('');
    if (initials.length >= 2 && initials.length <= 5) {
      return initials;
    }
  }

  return name.substring(0, 4).toUpperCase();
}

/**
 * Generates a clean unique ID / Code for a subject:
 * Format: MAT-[SIGLE] or MAT-[SIGLE]-01
 */
export function generateSubjectCode(
  nom: string,
  sigle?: string,
  existingSubjects: Array<{ id?: number; code?: string; nom?: string }> = [],
  excludeId?: number | null
): string {
  const actualSigle = extractOrGenerateSigle(nom, sigle) || 'MAT';
  const prefix = `MAT-${actualSigle}`;

  const existingCodes = new Set(
    existingSubjects
      .filter(s => !excludeId || Number(s.id) !== Number(excludeId))
      .map(s => (s.code || '').trim().toUpperCase())
      .filter(Boolean)
  );

  if (!existingCodes.has(prefix)) {
    return prefix;
  }

  let counter = 1;
  while (existingCodes.has(`${prefix}-${counter.toString().padStart(2, '0')}`)) {
    counter++;
  }
  return `${prefix}-${counter.toString().padStart(2, '0')}`;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  matchedSubject?: any;
  standardCatalogMatch?: StandardSubject | null;
}

export interface SubSubjectTemplate {
  nom: string;
  sigle: string;
  coefficient: number;
  description: string;
}

export const PREDEFINED_SUB_SUBJECTS: Record<string, SubSubjectTemplate[]> = {
  'francais': [
    { nom: 'Communication écrite', sigle: 'CE', coefficient: 1, description: 'Rédaction, dissertation, production écrite et expression structurée.' },
    { nom: 'Lecture & Étude de texte', sigle: 'LEC', coefficient: 1, description: 'Compréhension de texte, analyse littéraire et vocabulaire.' },
    { nom: 'Orthographe & Grammaire', sigle: 'ORTHO', coefficient: 1, description: 'Dictée, accords grammaticaux, conjugaison et syntaxe.' },
    { nom: 'Expression orale', sigle: 'EO', coefficient: 1, description: 'Élocution, récitation, débat et prise de parole en public.' }
  ],
  'anglais': [
    { nom: 'Writing (Expression écrite)', sigle: 'WRIT', coefficient: 1, description: 'Composition, syntaxe, rédaction guidée et créative.' },
    { nom: 'Reading & Comprehension', sigle: 'READ', coefficient: 1, description: 'Compréhension écrite, vocabulaire et étude de textes.' },
    { nom: 'Listening & Speaking (Oral)', sigle: 'ORAL', coefficient: 1, description: 'Écoute audio, prononciation et prise de parole.' },
    { nom: 'Grammar & Vocabulary', sigle: 'GRAM', coefficient: 1, description: 'Structures grammaticales, temps verbaux et lexique.' }
  ],
  'espagnol': [
    { nom: 'Expresión escrita', sigle: 'EE', coefficient: 1, description: 'Rédaction, grammaire et vocabulaire espagnols.' },
    { nom: 'Comprensión lectora', sigle: 'CL', coefficient: 1, description: 'Compréhension de texte et analyse lexicale.' },
    { nom: 'Expresión oral', sigle: 'EO', coefficient: 1, description: 'Conversation, écoute et prononciation.' }
  ],
  'pct': [
    { nom: 'Physique', sigle: 'PHYS', coefficient: 1, description: 'Mécanique, électricité, optique, énergie et thermodynamique.' },
    { nom: 'Chimie', sigle: 'CHIM', coefficient: 1, description: 'Solutions, réactions, atomes, molécules et dosages.' },
    { nom: 'Technologie', sigle: 'TECH', coefficient: 1, description: 'Travaux pratiques, expérimentations et démarche technologique.' }
  ],
  'physique': [
    { nom: 'Physique', sigle: 'PHYS', coefficient: 1, description: 'Mécanique, électricité, optique, énergie et thermodynamique.' },
    { nom: 'Chimie', sigle: 'CHIM', coefficient: 1, description: 'Solutions, réactions, atomes, molécules et dosages.' }
  ],
  'histoire': [
    { nom: 'Histoire', sigle: 'HIST', coefficient: 1, description: 'Chronologie, civilisations, événements historiques et mémoire.' },
    { nom: 'Géographie', sigle: 'GEO', coefficient: 1, description: 'Espaces, cartes, mondialisation et démographie.' },
    { nom: 'Éducation Civique & Morale (ECM)', sigle: 'ECM', coefficient: 1, description: 'Citoyenneté, institutions, droits et devoirs républicains.' }
  ],
  'hg': [
    { nom: 'Histoire', sigle: 'HIST', coefficient: 1, description: 'Chronologie, civilisations, événements historiques et mémoire.' },
    { nom: 'Géographie', sigle: 'GEO', coefficient: 1, description: 'Espaces, cartes, mondialisation et démographie.' },
    { nom: 'Éducation Civique & Morale (ECM)', sigle: 'ECM', coefficient: 1, description: 'Citoyenneté, institutions, droits et devoirs républicains.' }
  ],
  'mathematiques': [
    { nom: 'Algèbre & Numérique', sigle: 'ALG', coefficient: 1, description: 'Calcul littéral, équations, fonctions et suites.' },
    { nom: 'Géométrie & Espace', sigle: 'GEOM', coefficient: 1, description: 'Figures, trigonométrie, théorèmes et vecteurs.' },
    { nom: 'Statistiques & Probabilités', sigle: 'STAT', coefficient: 1, description: 'Traitement de données, fréquences et probabilités.' }
  ],
  'svt': [
    { nom: 'Biologie & Sciences du Vivant', sigle: 'BIO', coefficient: 1, description: 'Génétique, biologie humaine, écologie et physiologie.' },
    { nom: 'Géologie & Sciences de la Terre', sigle: 'GEOL', coefficient: 1, description: 'Tectonique, roches, ères géologiques et dynamique terrestre.' }
  ]
};

/**
 * Returns suggested sub-subjects for a given parent subject name or sigle
 */
export function getSubSubjectSuggestions(parentNomOrSigle: string): SubSubjectTemplate[] {
  if (!parentNomOrSigle) return [];
  const clean = normalizeString(parentNomOrSigle);
  for (const [key, list] of Object.entries(PREDEFINED_SUB_SUBJECTS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return list;
    }
  }
  return [];
}

/**
 * Helper to check if a subject record belongs to primary cycle
 */
export function isPrimarySubject(s: any): boolean {
  if (!s) return false;
  // If subject has a parent_id, it is a sub-subject belonging to the secondary cycle structure
  if (s.parent_id) return false;
  if (s.cycle === 'primaire') return true;
  if (s.cycle === 'secondaire' || s.cycle === 'technique') return false;
  const cat = (s.categorie || '').toLowerCase();
  if (cat.includes('primaire') || cat.includes('maternelle')) return true;
  const nom = (s.nom || '').toLowerCase();
  if (['expression écrite', 'calcul', 'éveil', 'eveil', 'communication orale', 'dictée', 'dictee', 'es -', 'est -', 'ea/'].some(k => nom.includes(k))) {
    return true;
  }
  return false;
}

/**
 * Checks if a proposed subject is a duplicate of any existing subject in the school,
 * taking cycle into account and allowing sub-subjects under parent subjects.
 */
export function checkSubjectDuplicate(
  candidate: { nom: string; code?: string; sigle?: string; id?: number; cycle?: string; categorie?: string; parent_id?: string | number | null },
  existingSubjects: any[],
  excludeId?: number | null,
  targetCycle?: 'primaire' | 'secondaire' | 'all'
): DuplicateCheckResult {
  if (!candidate || !candidate.nom || !candidate.nom.trim()) {
    return { isDuplicate: false };
  }

  const candidateNomNorm = normalizeString(candidate.nom);
  const candidateSigleNorm = normalizeString(candidate.sigle || extractOrGenerateSigle(candidate.nom, candidate.sigle, targetCycle));
  const candidateCodeNorm = normalizeString(candidate.code || '');
  const candidateParentId = candidate.parent_id ? Number(candidate.parent_id) : null;
  const candidateCatalogMatch = findCatalogMatch(candidate.nom, targetCycle) || (candidate.sigle ? findCatalogMatch(candidate.sigle, targetCycle) : null);
  const candidateIsPrimary = candidate.cycle === 'primaire' || isPrimarySubject(candidate) || (targetCycle === 'primaire');

  const filteredExisting = existingSubjects.filter((s: any) => {
    if (!s) return false;
    if (excludeId && Number(s.id) === Number(excludeId)) return false;
    if (candidate.id && Number(s.id) === Number(candidate.id)) return false;
    return true;
  });

  for (const existing of filteredExisting) {
    const existingIsPrimary = isPrimarySubject(existing);
    const existingParentId = existing.parent_id ? Number(existing.parent_id) : null;
    
    // Cycle separation: If candidate is primary and existing is secondary (or vice-versa), allow distinct records
    if (targetCycle && targetCycle !== 'all') {
      if (targetCycle === 'primaire' && !existingIsPrimary) continue;
      if (targetCycle === 'secondaire' && existingIsPrimary) continue;
    }

    const existingNomNorm = normalizeString(existing.nom || '');
    const existingSigleNorm = normalizeString(existing.sigle || extractOrGenerateSigle(existing.nom || ''));
    const existingCodeNorm = normalizeString(existing.code || '');
    const existingCatalogMatch = findCatalogMatch(existing.nom || '', existingIsPrimary ? 'primaire' : 'secondaire');

    // 1. Code collision is always strictly forbidden across the whole school
    if (candidateCodeNorm && candidateCodeNorm === existingCodeNorm) {
      return {
        isDuplicate: true,
        reason: `Le code/identifiant "${candidate.code}" est déjà utilisé par la matière "${existing.nom}".`,
        matchedSubject: existing,
        standardCatalogMatch: candidateCatalogMatch
      };
    }

    // 2. Sub-subject specific duplicate check:
    if (candidateParentId) {
      // If candidate is a sub-subject of candidateParentId:
      // A duplicate only occurs if another sub-subject under the SAME parent has the exact same name
      if (existingParentId === candidateParentId && candidateNomNorm === existingNomNorm) {
        return {
          isDuplicate: true,
          reason: `La sous-matière "${existing.nom}" est déjà enregistrée sous cette discipline parente.`,
          matchedSubject: existing,
          standardCatalogMatch: null
        };
      }
      // Continue checking other existing items for code collisions
      continue;
    }

    // 3. Top-level subjects (no parent_id):
    // Only compare against other top-level subjects (or sub-subjects if same cycle)
    if (candidateNomNorm === existingNomNorm && !existingParentId) {
      if (candidateIsPrimary === existingIsPrimary || !targetCycle || targetCycle === 'all') {
        return {
          isDuplicate: true,
          reason: `Une matière portant exactement ce nom existe déjà dans ce cycle : "${existing.nom}" (ID: ${existing.code || existing.id}).`,
          matchedSubject: existing,
          standardCatalogMatch: candidateCatalogMatch
        };
      }
    }

    // 4. Check sigle collision for top-level subjects if both have explicit sigles and they are identical in the same cycle
    if (!candidateParentId && !existingParentId && candidateSigleNorm && existingSigleNorm && candidateSigleNorm === existingSigleNorm && candidateSigleNorm.length >= 2) {
      if (candidateIsPrimary === existingIsPrimary) {
        return {
          isDuplicate: true,
          reason: `Le sigle "${candidate.sigle || candidateSigleNorm.toUpperCase()}" correspond déjà à la matière "${existing.nom}" (${existing.sigle || ''}) dans ce cycle.`,
          matchedSubject: existing,
          standardCatalogMatch: candidateCatalogMatch
        };
      }
    }

    // 5. Check equivalence through standard catalog for top-level subjects within the same cycle
    if (!candidateParentId && !existingParentId && candidateCatalogMatch && existingCatalogMatch && candidateCatalogMatch.code === existingCatalogMatch.code) {
      return {
        isDuplicate: true,
        reason: `Cette discipline correspond à la matière déjà enregistrée : "${existing.nom}" (${candidateCatalogMatch.sigle} = ${candidateCatalogMatch.nom}).`,
        matchedSubject: existing,
        standardCatalogMatch: candidateCatalogMatch
      };
    }
  }

  return {
    isDuplicate: false,
    standardCatalogMatch: candidateParentId ? null : candidateCatalogMatch
  };
}
