/**
 * Mode Strict Hors-Ligne (100% Autonome & Local)
 * L'accès à Internet est formellement interdit et neutralisé même si une connexion
 * physique ou réseau est présente sur l'appareil.
 */
export const IS_STRICT_OFFLINE = true;

export function useOnlineStatus() {
  // L'application fonctionne exclusivement hors-ligne (accès Internet interdit)
  return false;
}

