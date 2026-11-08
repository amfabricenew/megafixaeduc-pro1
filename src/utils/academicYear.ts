/**
 * Utilitaires pour la gestion et la normalisation des années scolaires.
 * Règle métier : une année scolaire ne peut pas être "2025-2025" ; elle s'étend
 * toujours sur deux années civiles consécutives (ex: "2025-2026").
 */

/**
 * Normalise automatiquement le libellé d'une année scolaire.
 * - "2025-2025" => "2025-2026"
 * - "2025" => "2025-2026"
 * - "2025-2024" => "2025-2026"
 * - "2025/2025" => "2025-2026"
 * - "2024 - 2024" => "2024-2025"
 */
export function formatAcademicYearLibelle(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // Cas YYYY-YYYY ou YYYY/YYYY (avec ou sans espaces)
  const rangeMatch = trimmed.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1], 10);
    let endYear = parseInt(rangeMatch[2], 10);
    // Si l'année de fin est égale ou antérieure à l'année de début, corriger immédiatement
    if (endYear <= startYear) {
      endYear = startYear + 1;
    }
    return `${startYear}-${endYear}`;
  }

  // Cas année unique à 4 chiffres (ex: "2025")
  const singleMatch = trimmed.match(/^(\d{4})$/);
  if (singleMatch) {
    const startYear = parseInt(singleMatch[1], 10);
    return `${startYear}-${startYear + 1}`;
  }

  // Cas préfixe "YYYY-" ou "YYYY/"
  const prefixMatch = trimmed.match(/^(\d{4})\s*[-/]\s*$/);
  if (prefixMatch) {
    const startYear = parseInt(prefixMatch[1], 10);
    return `${startYear}-${startYear + 1}`;
  }

  return trimmed;
}

/**
 * Déduit automatiquement le libellé de l'année scolaire à partir d'une date de début.
 * Si dateDebut = "2025-09-01", renvoie "2025-2026".
 */
export function getLibelleFromDateDebut(dateDebutStr: string): string {
  if (!dateDebutStr) return '';
  const date = new Date(dateDebutStr);
  if (isNaN(date.getTime())) return '';
  const startYear = date.getFullYear();
  return `${startYear}-${startYear + 1}`;
}

/**
 * Calcule les dates par défaut (1er septembre au 31 juillet) associées à un libellé
 */
export function getDefaultDatesForAcademicYear(libelle: string): { date_debut: string; date_fin: string } {
  const normalized = formatAcademicYearLibelle(libelle);
  const parts = normalized.split('-');
  if (parts.length === 2 && parts[0].length === 4 && parts[1].length === 4) {
    return {
      date_debut: `${parts[0]}-09-01`,
      date_fin: `${parts[1]}-07-31`
    };
  }
  const currentYear = new Date().getFullYear();
  return {
    date_debut: `${currentYear}-09-01`,
    date_fin: `${currentYear + 1}-07-31`
  };
}

/**
 * Calcule le libellé de l'année suivante
 */
export function getNextAcademicYearLibelle(currentLibelle: string): string {
  const formatted = formatAcademicYearLibelle(currentLibelle);
  const parts = formatted.split('-');
  if (parts.length === 2) {
    const nextStart = parseInt(parts[1], 10);
    const nextEnd = nextStart + 1;
    return `${nextStart}-${nextEnd}`;
  }
  const year = new Date().getFullYear();
  return `${year}-${year + 1}`;
}
