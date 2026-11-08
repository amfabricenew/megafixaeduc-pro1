/**
 * Utility functions for school subjects and abbreviations on cards/badges
 */

/**
 * Intelligently abbreviates a subject name for school badges and compact displays.
 * Example:
 * - "Histoire Géographie" -> "H-G"
 * - "Sciences de la Vie et de la Terre" -> "SVT"
 * - "Éducation Physique et Sportive" -> "EPS"
 * - "Sciences Économiques et Sociales" -> "SES"
 */
export function abbreviateSubjectName(subject?: string | null): string {
  if (!subject) return 'Enseignant';
  const trimmed = subject.trim();
  if (!trimmed) return 'Enseignant';

  // Check if subject has an explicit abbreviation in parentheses like "Matière (SVT)" or "(EPS)"
  const matchParen = trimmed.match(/\(([A-Z0-9\-_]{2,8})\)/i);
  if (matchParen && matchParen[1]) {
    return matchParen[1].toUpperCase();
  }

  // Normalized lower string without accents
  const lower = trimmed.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Exact or keyword matches for common secondary subjects
  if (lower.includes('histoire') && (lower.includes('geographie') || lower.includes('geo'))) {
    return 'H-G';
  }
  if ((lower.includes('vie') && lower.includes('terre')) || lower === 'svt' || lower.startsWith('svt ')) {
    return 'SVT';
  }
  if (lower.includes('physique') && lower.includes('chimie')) {
    return 'Physique-Chimie';
  }
  if (lower.includes('education physique') || lower.includes('sportive') || lower === 'eps') {
    return 'EPS';
  }
  if ((lower.includes('economiques') || lower.includes('economie')) && lower.includes('sociales')) {
    return 'SES';
  }
  if (lower.includes('civique') || lower.includes('morale')) {
    return 'ECM';
  }
  if (lower.includes('scientifique') && lower.includes('technologique')) {
    return 'EST';
  }
  if (lower === 'education sociale' || lower === 'es') {
    return 'ES';
  }
  if (lower.includes('information') && lower.includes('communication')) {
    return 'TIC';
  }
  if (lower.includes('arts plastiques') || lower.includes('arts visuels')) {
    return 'Arts Plast.';
  }
  if (lower.includes('education musicale')) {
    return 'Musique';
  }
  if (lower.includes('mathematiques') || lower === 'maths' || lower === 'math') {
    return 'Mathématiques';
  }
  if (lower.includes('francais')) {
    return 'Français';
  }
  if (lower.includes('anglais')) {
    return 'Anglais';
  }
  if (lower.includes('espagnol')) {
    return 'Espagnol';
  }
  if (lower.includes('allemand')) {
    return 'Allemand';
  }
  if (lower.includes('philosophie') || lower === 'philo') {
    return 'Philosophie';
  }
  if (lower.includes('informatique')) {
    return 'Informatique';
  }

  // 2. Primary subjects acronyms & abbreviations
  if (lower.includes('expression ecrite')) {
    return 'Expr. Écrite';
  }
  if (lower.includes('communication orale')) {
    return 'Comm. Orale';
  }
  if (lower.includes('comprehension de l ecrit') || lower.includes('lecture')) {
    return 'Lecture / Comp.';
  }

  // 3. Fallback: if length exceeds 16 characters, shorten safely
  if (trimmed.length > 16) {
    const parts = trimmed.split(/[\s\-_]+/);
    if (parts.length >= 2) {
      return parts.map(p => {
        if (p.length <= 3) return p;
        return p.slice(0, 4) + '.';
      }).join(' ');
    }
  }

  return trimmed;
}
