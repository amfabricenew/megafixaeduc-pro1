import crypto from 'crypto';

export interface PlanMeta {
  code: string;
  name: string;
  badge: string;
  tagline: string;
  priceFormatted: string;
  priceNumeric: number;
  period: string;
  color: string;
  maxStudents: string;
  features: string[];
}

export const KNOWN_PLANS: Record<string, PlanMeta> = {
  excellence: {
    code: 'excellence',
    name: 'Formule Excellence (Intégrale Pro)',
    badge: 'Tout-en-un & IA',
    tagline: 'Gestion intégrale : Académique, Finances, Salaires & Intelligence Artificielle',
    priceFormatted: '150 000 FCFA',
    priceNumeric: 150000,
    period: '/ an',
    color: '#f59e0b',
    maxStudents: 'Élèves illimités',
    features: [
      'Gestion complète des cycles Maternelle, Primaire et Secondaire',
      'Fiches d\'inscription, dossiers numériques et matricules automatiques des élèves',
      'Génération & Impression des Cartes Scolaires & Badges officiels avec QR Code',
      'Saisie des notes, calcul automatique des moyennes trimestrielles et rangs',
      'Génération instantanée des Bulletins de notes certifiés conformes',
      'Module Finances & Paiements de scolarité (tranches, relances, reçus officiels)',
      'Gestion des Salaires & Paie du personnel (enseignants permanents & vacataires)',
      'Emplois du temps hebdomadaires intelligents avec gestion des salles et disponibilités',
      'Bibliothèque numérique & gestion des emprunts d\'ouvrages physiques',
      'Messagerie interne sécurisée & Diffusion d\'annonces par SMS aux parents',
      'Assistant IA Gemini pour analyses pédagogiques et bilans automatisés',
      'Journal d\'audit, traçabilité des opérations et sauvegardes cloud & locales',
      'Support prioritaire VIP 24/7 et assistance au déploiement'
    ]
  },
  premium: {
    code: 'premium',
    name: 'Formule Premium Plus',
    badge: 'Populaire',
    tagline: 'Organisation scolaire avancée, finances & notifications SMS',
    priceFormatted: '100 000 FCFA',
    priceNumeric: 100000,
    period: '/ an',
    color: '#6366f1',
    maxStudents: 'Jusqu\'à 1 500 élèves',
    features: [
      'Gestion complète des classes, matières, coefficients et emplois du temps',
      'Fiches numériques des élèves et suivi des inscriptions',
      'Génération & Impression des Cartes Scolaires avec QR Code',
      'Saisie des notes et génération des Bulletins scolaires officiels',
      'Module Finances & Encaissements des frais de scolarité',
      'Messagerie interne et alertes SMS aux familles',
      'Gestion des passages de classe et redoublements de fin d\'année',
      'Gestion du personnel administratif et des enseignants',
      'Sauvegardes régulières de la base de données',
      'Support technique prioritaire WhatsApp & Email'
    ]
  },
  standard: {
    code: 'standard',
    name: 'Formule Académique (Standard)',
    badge: 'Essentiel Pro',
    tagline: 'Organisation scolaire structurée & badges officiels',
    priceFormatted: '75 000 FCFA',
    priceNumeric: 75000,
    period: '/ an',
    color: '#10b981',
    maxStudents: 'Jusqu\'à 1 000 élèves',
    features: [
      'Gestion des classes, matières, coefficients et emplois du temps',
      'Fiches complètes des élèves et dossiers scolaires',
      'Saisie des évaluations, calcul des moyennes et rangs',
      'Génération des Bulletins scolaires trimestriels',
      'Génération des Cartes scolaires pour tous les élèves',
      'Espace individuel Parent sécurisé (Mon Enfant)',
      'Gestion des enseignants et répartition pédagogique',
      'Support standard par email et WhatsApp'
    ]
  },
  starter: {
    code: 'starter',
    name: 'Formule Starter (Découverte)',
    badge: 'Démarrage',
    tagline: 'Idéal pour numériser la gestion académique de base',
    priceFormatted: '25 000 FCFA',
    priceNumeric: 25000,
    period: '/ trimestre',
    color: '#3b82f6',
    maxStudents: 'Jusqu\'à 300 élèves',
    features: [
      'Gestion des classes, matières et coefficients',
      'Inscriptions des élèves et fiches de base',
      'Saisie des notes et calcul des moyennes',
      'Génération des Bulletins de notes',
      'Emplois du temps hebdomadaires',
      'Espace Parent',
      'Support standard par email'
    ]
  }
};

/**
 * Resolves a plan code and metadata from any user/transaction input.
 */
export function getPlanMeta(planInput?: string): PlanMeta {
  if (!planInput) return KNOWN_PLANS.standard;
  const normalized = planInput.toString().toLowerCase().trim();

  if (normalized.includes('excellence') || normalized.includes('integral') || normalized.includes('tout-en-un')) {
    return KNOWN_PLANS.excellence;
  }
  if (normalized.includes('premium') || normalized.includes('plus')) {
    return KNOWN_PLANS.premium;
  }
  if (normalized.includes('starter') || normalized.includes('base') || normalized.includes('decouverte')) {
    return KNOWN_PLANS.starter;
  }
  return KNOWN_PLANS.standard;
}

/**
 * Generates a unique subscription license key relative to the subscription type.
 * e.g. MFX-EXC-2026-X8K2M-7P4Q
 */
export function generateSubscriptionLicenseKey(planCode: string): string {
  const meta = getPlanMeta(planCode);
  let prefix = 'STD';
  if (meta.code === 'excellence') prefix = 'EXC';
  else if (meta.code === 'premium') prefix = 'PRM';
  else if (meta.code === 'starter') prefix = 'STR';

  const year = new Date().getFullYear();
  const token1 = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars (e.g. A4F89D)
  const token2 = crypto.randomBytes(2).toString('hex').toUpperCase(); // 4 chars (e.g. 7E2B)
  return `MFX-${prefix}-${year}-${token1}-${token2}`;
}

export interface FicheAbonnementData {
  licenseKey: string;
  planName: string;
  planCode: string;
  badge: string;
  schoolName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  amount: number;
  currency: string;
  transactionRef: string;
  issuedAt: string;
  expiresAt: string;
  durationLabel: string;
  features: string[];
  maxStudents: string;
  activationUrl: string;
  congratulationsTitle: string;
  congratulationsBody: string;
}

/**
 * Builds the complete structured data, HTML document, and plain text for the subscription certificate.
 */
export function buildSubscriptionFiche(params: {
  licenseKey: string;
  planInput: string;
  schoolName: string;
  clientName?: string;
  clientEmail: string;
  clientPhone?: string;
  amount?: number;
  currency?: string;
  transactionRef?: string;
  durationDays?: number;
  appUrl?: string;
}): { fiche: FicheAbonnementData; html: string; text: string } {
  const meta = getPlanMeta(params.planInput);
  const appUrl = (params.appUrl || 'https://ais-pre-zd7qxhnwatli2x7sfezpbx-323991635372.europe-west2.run.app').replace(/\/$/, '');
  const now = new Date();
  const duration = params.durationDays || (meta.code === 'starter' ? 90 : 365);
  const expirationDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

  const issuedDateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const expiresDateStr = expirationDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const durationLabel = duration >= 365 ? '12 mois (1 an)' : `${Math.round(duration / 30)} mois`;
  const amount = params.amount || meta.priceNumeric;
  const currency = params.currency || 'FCFA';
  const transactionRef = params.transactionRef || `TX-REF-${Date.now()}`;
  const clientName = params.clientName || 'Direction de l\'Établissement';
  const schoolName = params.schoolName || 'Établissement Partenaire';
  const activationUrl = `${appUrl}/activer-abonnement?cle=${encodeURIComponent(params.licenseKey)}`;

  const congratulationsTitle = `Félicitations pour votre abonnement à la ${meta.name} !`;
  const congratulationsBody = 
    `Toute l'équipe de MégafixaEduc Pro vous adresse ses plus chaleureuses félicitations et vous témoigne sa profonde reconnaissance pour la confiance accordée à notre solution.\n\n` +
    `En choisissant notre plateforme pour la gestion et le pilotage numérique de votre établissement "${schoolName}", vous faites le choix de l'innovation, de la fiabilité et de la performance.\n\n` +
    `Votre formule vous donne accès à un ensemble complet d'outils professionnels spécialement calibrés pour simplifier votre quotidien scolaire et valoriser votre communauté éducative.`;

  const fiche: FicheAbonnementData = {
    licenseKey: params.licenseKey,
    planName: meta.name,
    planCode: meta.code,
    badge: meta.badge,
    schoolName,
    clientName,
    clientEmail: params.clientEmail,
    clientPhone: params.clientPhone || '',
    amount,
    currency,
    transactionRef,
    issuedAt: issuedDateStr,
    expiresAt: expiresDateStr,
    durationLabel,
    features: meta.features,
    maxStudents: meta.maxStudents,
    activationUrl,
    congratulationsTitle,
    congratulationsBody
  };

  // Build high-grade HTML template for email and printable certificate
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Fiche d'Abonnement Officielle - MégafixaEduc Pro</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      color: #1e293b;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 680px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #064e3b 0%, #047857 50%, #0f172a 100%);
      padding: 40px 32px;
      text-align: center;
      color: #ffffff;
    }
    .logo-badge {
      display: inline-block;
      padding: 8px 16px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 16px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.02em;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #a7f3d0;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px;
    }
    .congrats-card {
      background: linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 100%);
      border: 1px solid #a7f3d0;
      border-radius: 20px;
      padding: 24px;
      margin-bottom: 30px;
    }
    .congrats-card h2 {
      margin: 0 0 10px 0;
      font-size: 17px;
      font-weight: 800;
      color: #065f46;
    }
    .congrats-card p {
      margin: 0 0 10px 0;
      font-size: 13px;
      line-height: 1.6;
      color: #166534;
    }
    .congrats-card p:last-child {
      margin-bottom: 0;
    }
    .key-box {
      background: #0f172a;
      border: 2px dashed #10b981;
      border-radius: 20px;
      padding: 26px 20px;
      text-align: center;
      margin-bottom: 32px;
      color: #ffffff;
    }
    .key-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #34d399;
      margin-bottom: 8px;
    }
    .key-value {
      font-family: 'Courier New', Courier, monospace, 'Lucida Console';
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 0.15em;
      color: #ffffff;
      background: #1e293b;
      padding: 12px 18px;
      border-radius: 12px;
      display: inline-block;
      margin: 8px 0 12px 0;
      border: 1px solid #334155;
    }
    .key-note {
      font-size: 12px;
      color: #94a3b8;
      max-width: 480px;
      margin: 0 auto;
      line-height: 1.4;
    }
    .btn-activate {
      display: inline-block;
      background: #10b981;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 14px;
      font-size: 14px;
      font-weight: 800;
      margin-top: 16px;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
      transition: background 0.2s;
    }
    .section-title {
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
      margin: 28px 0 14px 0;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 8px;
    }
    .tech-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .tech-table td {
      padding: 10px 12px;
      font-size: 13px;
      border-bottom: 1px solid #f1f5f9;
    }
    .tech-table td:first-child {
      color: #64748b;
      font-weight: 600;
      width: 40%;
    }
    .tech-table td:last-child {
      color: #0f172a;
      font-weight: 700;
      text-align: right;
    }
    .features-list {
      list-style: none;
      padding: 0;
      margin: 0 0 28px 0;
    }
    .features-list li {
      padding: 7px 0;
      font-size: 13px;
      color: #334155;
      display: flex;
      align-items: center;
      line-height: 1.4;
    }
    .features-list li::before {
      content: "✓";
      display: inline-block;
      width: 18px;
      height: 18px;
      background: #dcfce7;
      color: #15803d;
      border-radius: 50%;
      text-align: center;
      line-height: 18px;
      font-size: 11px;
      font-weight: 900;
      margin-right: 10px;
      flex-shrink: 0;
    }
    .guide-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 28px;
    }
    .guide-step {
      display: flex;
      gap: 12px;
      margin-bottom: 12px;
    }
    .guide-step:last-child {
      margin-bottom: 0;
    }
    .step-num {
      width: 24px;
      height: 24px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
      flex-shrink: 0;
    }
    .step-text {
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .footer {
      background: #f8fafc;
      padding: 24px 32px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo-badge">MégafixaEduc Pro • SaaS Scolaire</div>
      <h1>FICHE OFFICIELLE D'ABONNEMENT</h1>
      <p>Attestation de souscription et clé de licence logicielle</p>
    </div>

    <div class="content">
      <!-- Congratulations card -->
      <div class="congrats-card">
        <h2>${congratulationsTitle}</h2>
        <p><strong>Cher(e) ${clientName},</strong></p>
        <p>Toute l'équipe de MégafixaEduc Pro vous adresse ses plus chaleureuses félicitations et vous témoigne sa profonde reconnaissance pour la confiance accordée à notre solution.</p>
        <p>En choisissant notre plateforme pour la gestion et le pilotage numérique de votre établissement <strong>« ${schoolName} »</strong>, vous faites le choix de l'excellence, de la conformité et d'une administration simplifiée.</p>
      </div>

      <!-- License Key Box -->
      <div class="key-box">
        <div class="key-label">Votre Clé d'Abonnement Officielle (${meta.name})</div>
        <div class="key-value">${params.licenseKey}</div>
        <div class="key-note">
          Cette clé d'activation est unique. Elle servira au <strong>premier accès</strong> de votre école pour débloquer automatiquement l'ensemble des modules inclus dans votre formule.
        </div>
        <div>
          <a href="${activationUrl}" class="btn-activate">Activer mon Établissement (Premier Accès) →</a>
        </div>
      </div>

      <!-- Technical breakdown -->
      <div class="section-title">Synthèse de votre Souscription</div>
      <table class="tech-table">
        <tr>
          <td>Établissement souscripteur</td>
          <td><strong>${schoolName}</strong></td>
        </tr>
        <tr>
          <td>Formule choisie</td>
          <td><span style="color:#059669; font-weight:800;">${meta.name}</span> (${meta.badge})</td>
        </tr>
        <tr>
          <td>Montant total réglé</td>
          <td><strong style="font-size:15px; color:#0f172a;">${amount.toLocaleString('fr-FR')} ${currency}</strong></td>
        </tr>
        <tr>
          <td>Statut du règlement</td>
          <td><span style="background:#dcfce7; color:#15803d; padding:2px 8px; border-radius:6px; font-weight:700;">Validé & Reçu</span></td>
        </tr>
        <tr>
          <td>Référence de transaction</td>
          <td><code style="font-family:monospace; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${transactionRef}</code></td>
        </tr>
        <tr>
          <td>Date d'émission</td>
          <td>${issuedDateStr}</td>
        </tr>
        <tr>
          <td>Validité & Échéance</td>
          <td>${durationLabel} (jusqu'au ${expiresDateStr})</td>
        </tr>
        <tr>
          <td>Capacité élèves</td>
          <td>${meta.maxStudents}</td>
        </tr>
      </table>

      <!-- Included Features -->
      <div class="section-title">Fonctionnalités attribuées par cette clé</div>
      <ul class="features-list">
        ${meta.features.map(f => `<li>${f}</li>`).join('')}
      </ul>

      <!-- First-access guide -->
      <div class="section-title">Comment utiliser votre clé lors du premier accès ?</div>
      <div class="guide-box">
        <div class="guide-step">
          <div class="step-num">1</div>
          <div class="step-text">Cliquez sur le lien direct d'activation : <a href="${activationUrl}" style="color:#059669; font-weight:700;">${activationUrl}</a></div>
        </div>
        <div class="guide-step">
          <div class="step-num">2</div>
          <div class="step-text">Vérifiez que votre clé d'abonnement <code>${params.licenseKey}</code> est pré-remplie et confirmez l'activation.</div>
        </div>
        <div class="guide-step">
          <div class="step-num">3</div>
          <div class="step-text">Connectez-vous à votre espace administrateur : toutes les fonctionnalités de votre formule sont instantanément opérationnelles !</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Document officiel émis par <strong>MégafixaEduc Pro SaaS</strong> — Tous droits réservés.</p>
      <p>Assistance & Support technique dédié : <a href="mailto:support@megafixa.com" style="color:#059669;">support@megafixa.com</a> • WhatsApp : +228 90 00 00 00</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = 
`============================================================
MÉGAFIXAEDUC PRO - FICHE OFFICIELLE D'ABONNEMENT
============================================================

${congratulationsTitle}

Cher(e) ${clientName},

${congratulationsBody}

------------------------------------------------------------
VOTRE CLÉ D'ABONNEMENT OFFICIELLE :
${params.licenseKey}
------------------------------------------------------------

Cette clé unique servira au premier accès de votre établissement pour lui attribuer toutes les fonctionnalités incluses dans sa formule.

LIEN DIRECT D'ACTIVATION EN 1 CLIC :
${activationUrl}

RÉSUMÉ DE LA SOUSCRIPTION :
- Établissement : ${schoolName}
- Formule : ${meta.name} (${meta.badge})
- Montant réglé : ${amount.toLocaleString('fr-FR')} ${currency}
- Statut : Validé & Encaissé
- Référence transaction : ${transactionRef}
- Date d'émission : ${issuedDateStr}
- Durée de validité : ${durationLabel} (jusqu'au ${expiresDateStr})
- Capacité : ${meta.maxStudents}

MODULES & FONCTIONNALITÉS ATTRIBUÉES :
${meta.features.map(f => `- ${f}`).join('\n')}

GUIDE DE PREMIER ACCÈS :
1. Rendez-vous sur ${activationUrl}
2. Entrez votre clé ${params.licenseKey}
3. Votre établissement et toutes les fonctionnalités de votre formule sont automatiquement activés !

L'équipe MégafixaEduc Pro
Support : support@megafixa.com
`;

  return { fiche, html, text };
}
