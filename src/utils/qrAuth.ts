import QRCode from 'qrcode';

export interface DocumentAuthMetadata {
  docType: 'bulletin' | 'recu_paiement' | 'certificat_scolarite' | 'attestation_travail' | 'contrat_travail' | 'fiche_mission' | 'attestation_stage' | 'autorisation_absence' | 'carte_scolaire' | 'badge_enseignant' | 'badge_personnel' | 'rapport_mensuel' | 'fiche_paie' | 'autre';
  docTitle?: string;
  reference?: string;
  schoolName?: string;
  beneficiaryNom?: string;
  beneficiaryPrenom?: string;
  matricule?: string;
  classe?: string;
  anneeScolaire?: string;
  trimestre?: number | string;
  moyenne?: string | number;
  rang?: string | number;
  montant?: string | number;
  dateEmission?: string;
  signataire?: string;
  extra?: Record<string, any>;
}

/**
 * Construit l'URL publique de vérification avec les paramètres d'authentification encodés.
 */
export function buildVerificationUrl(meta: DocumentAuthMetadata): string {
  try {
    const origin = typeof window !== 'undefined' && window.location.origin 
      ? window.location.origin 
      : 'https://mon-etablissement.com';

    const params = new URLSearchParams();
    params.set('type', meta.docType);
    if (meta.reference) params.set('ref', meta.reference);
    if (meta.schoolName) params.set('school', meta.schoolName);
    if (meta.beneficiaryNom) params.set('nom', meta.beneficiaryNom);
    if (meta.beneficiaryPrenom) params.set('prenom', meta.beneficiaryPrenom);
    if (meta.matricule) params.set('mat', meta.matricule);
    if (meta.classe) params.set('cls', meta.classe);
    if (meta.anneeScolaire) params.set('annee', meta.anneeScolaire);
    if (meta.trimestre !== undefined) params.set('trim', String(meta.trimestre));
    if (meta.moyenne !== undefined) params.set('moy', String(meta.moyenne));
    if (meta.rang !== undefined) params.set('rang', String(meta.rang));
    if (meta.montant !== undefined) params.set('montant', String(meta.montant));
    if (meta.dateEmission) params.set('date', meta.dateEmission);
    if (meta.signataire) params.set('sign', meta.signataire);

    // Signature hash simple pour validation visuelle
    const rawData = `${meta.docType}|${meta.reference || ''}|${meta.matricule || ''}|${meta.beneficiaryNom || ''}|${meta.dateEmission || ''}`;
    let hash = 0;
    for (let i = 0; i < rawData.length; i++) {
      hash = ((hash << 5) - hash) + rawData.charCodeAt(i);
      hash |= 0;
    }
    const secureToken = Math.abs(hash).toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    params.set('token', secureToken);

    return `${origin}/verifier-document?${params.toString()}`;
  } catch (e) {
    return `https://mon-etablissement.com/verifier-document?type=${encodeURIComponent(meta.docType)}`;
  }
}

/**
 * Génère un DataURL (image base64 PNG) du code QR d'authentification
 */
export async function generateQRCodeDataUrl(
  textOrMeta: string | DocumentAuthMetadata,
  options?: { size?: number; margin?: number; colorDark?: string; colorLight?: string }
): Promise<string> {
  const content = typeof textOrMeta === 'string' ? textOrMeta : buildVerificationUrl(textOrMeta);
  
  try {
    const dataUrl = await QRCode.toDataURL(content, {
      width: options?.size || 256,
      margin: options?.margin ?? 1,
      color: {
        dark: options?.colorDark || '#0f172a',
        light: options?.colorLight || '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });
    return dataUrl;
  } catch (err) {
    console.error('Erreur génération QR Code:', err);
    // Fallback simple Canvas
    return createFallbackQRCode(content);
  }
}

/**
 * Fallback Canvas si la lib échoue
 */
function createFallbackQRCode(text: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 120, 120);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(10, 10, 100, 100);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px sans-serif';
    ctx.fillText('AUTH QR', 35, 65);
  }
  return canvas.toDataURL('image/png');
}
