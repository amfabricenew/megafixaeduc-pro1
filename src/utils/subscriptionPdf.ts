import { jsPDF } from 'jspdf';

export interface SubscriptionPdfData {
  reference: string;
  schoolName: string;
  adminNom: string;
  email: string;
  phone?: string;
  planName: string;
  amount: number;
  totalPlanAmount?: number;
  initialPercentage?: number;
  initialAmount?: number;
  remainingPercentage?: number;
  remainingAmount?: number;
  modalityName?: string;
  remainingSchedule?: string;
  currency?: string;
  operator?: string;
  dateDebut?: string;
  dateFin?: string;
  durationText?: string;
  licenseKey: string;
  loginUrl: string;
  features?: string[];
  otp?: string;
}

/**
 * Generates an official payment receipt PDF as a binary Buffer
 */
export function generateReceiptPdfBuffer(data: SubscriptionPdfData): Buffer {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const currency = data.currency || 'FCFA';

  const paidNow = Number(data.initialAmount ?? data.amount ?? 0);
  const totalAmount = Number(data.totalPlanAmount ?? (data.remainingAmount ? paidNow + data.remainingAmount : paidNow));
  const remainingAmount = Number(data.remainingAmount ?? 0);
  const initialPct = data.initialPercentage ?? (remainingAmount > 0 ? 45 : 100);
  const isUnique = initialPct === 100 || remainingAmount <= 0;

  const formattedPaid = paidNow.toLocaleString('fr-FR');
  const formattedTotal = totalAmount.toLocaleString('fr-FR');
  const formattedRemaining = remainingAmount.toLocaleString('fr-FR');

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  // 1. Top Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, 'F');

  // Accent Line
  doc.setFillColor(16, 185, 129); // emerald-500
  doc.rect(0, 36, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MEGAFIXAEDUC PRO', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('SYSTÈME CENTRAL DE GESTION SCOLAIRE & ACADÉMIQUE', 14, 25);
  doc.text('MÉGAFIXA TECHNOLOGIES SARL • SERVICE DE FACTURATION', 14, 30);

  doc.setTextColor(52, 211, 153); // emerald-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('REÇU DE PAIEMENT OFFICIEL', 196, 18, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`RÉF : ${data.reference}`, 196, 25, { align: 'right' });
  doc.text(`ÉMIS LE : ${dateStr} à ${timeStr}`, 196, 30, { align: 'right' });

  // 2. Receipt Status Card
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, 45, 182, 19, 2.5, 2.5, 'FD');

  doc.setTextColor(22, 101, 52); // emerald-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);

  if (isUnique) {
    doc.text('PAIEMENT CONFIRMÉ & ACQUITTÉ À 100% (PAIEMENT UNIQUE)', 20, 53);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text('Ce reçu atteste de la réception intégrale des fonds pour l\'activation de la licence école annuelle.', 20, 59);
  } else {
    doc.text(`PAIEMENT INITIAL VALIDÉ (${initialPct}%) • ACTIVATION DU COMPTE ÉCOLE EFFECTIVE`, 20, 53);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(21, 128, 61);
    doc.text(`Acompte initial de ${initialPct}% encaissé (${formattedPaid} ${currency}). Clé émise avec succès. Solde dû : ${formattedRemaining} ${currency}.`, 20, 59);
  }

  // 3. Information Columns
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('IDENTIFICATION DU CLIENT & ÉTABLISSEMENT', 14, 72);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 75, 196, 75);

  let y = 82;
  const clientRows = [
    ['Établissement scolaire :', data.schoolName || 'Non spécifié'],
    ['Responsable / Souscripteur :', data.adminNom || 'Directeur d\'établissement'],
    ['Email de confirmation :', data.email || 'Non spécifié'],
    ['Moyen de règlement :', data.operator || 'Mobile Money / Virement Certifié'],
    ['Modalité de souscription :', data.modalityName || (isUnique ? 'Annuel (Paiement unique)' : 'Échelonné (45% initial)')]
  ];

  clientRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 68, y);
    y += 6;
  });

  // 4. Financial breakdown table
  y += 4;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DÉTAIL FINANCIER & MODALITÉ DU RÈGLEMENT', 14, y);
  y += 3;
  doc.line(14, y, 196, y);
  y += 5;

  // Header of table
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('ARTICLE & MODALITÉ', 18, y + 5.5);
  doc.text('TOTAL FORMULE', 105, y + 5.5);
  doc.text(isUnique ? 'MONTANT RÉGLÉ (100%)' : `ACOMPTE VERSÉ (${initialPct}%)`, 150, y + 5.5);
  doc.text('SOLDE RESTANT', 192, y + 5.5, { align: 'right' });
  y += 8;

  // Item row
  doc.setFillColor(255, 255, 255);
  doc.rect(14, y, 182, 18, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, y, 182, 18, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`Formule ${data.planName} • ${data.modalityName || (isUnique ? 'Paiement Unique' : 'Acompte 45%')}`, 18, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(data.durationText || 'Couverture de l\'année scolaire', 18, y + 11);
  if (!isUnique && data.remainingSchedule) {
    doc.text(`Échéancier solde : ${data.remainingSchedule}`, 18, y + 15);
  }

  // Column values
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`${formattedTotal} ${currency}`, 105, y + 7.5);

  doc.setTextColor(5, 150, 105);
  doc.text(`${formattedPaid} ${currency}`, 150, y + 7.5);

  doc.setTextColor(isUnique ? 100 : 220, isUnique ? 116 : 38, isUnique ? 139 : 38);
  doc.text(isUnique ? `0 ${currency}` : `${formattedRemaining} ${currency}`, 192, y + 7.5, { align: 'right' });

  y += 24;

  // Total summary cards
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 88, 22, 2, 2, 'FD');
  doc.roundedRect(108, y, 88, 22, 2, 2, 'FD');

  // Left summary box: Total de l'abonnement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Montant Global de l\'Abonnement :', 18, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`${formattedTotal} ${currency}`, 18, y + 15);

  // Right summary box: Montant réglé ce jour
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(22, 101, 52);
  doc.text(`Net Acquitté ce jour (${isUnique ? '100%' : `${initialPct}%`}) :`, 112, y + 7);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(5, 150, 105);
  doc.text(`${formattedPaid} ${currency}`, 112, y + 15);

  y += 28;

  // 5. Activation Key Attribution Box
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(14, y, 182, 32, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('CLÉ D\'ACTIVATION COMPTE ÉCOLE RATTACHÉE AU PAIEMENT :', 20, y + 9);

  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(data.licenseKey || 'MEG-OFFICIEL-2026', 20, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Réf Transaction : ${data.reference}  •  Statut : Compte validé dès ce versement`, 20, y + 27);
  y += 38;

  // 6. Security & Legal Seal
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICATION ÉLECTRONIQUE MÉGAFIXA TECHNOLOGIES', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Ce reçu numérique a été édité automatiquement par la passerelle de règlement MégafixaEduc Pro.', 14, y + 4.5);
  doc.text(`Il fait foi d'acquittement à hauteur de ${formattedPaid} ${currency} pour la création du compte école.`, 14, y + 8.5);
  doc.text('Pour toute réclamation ou assistance : megafixaservices01@gmail.com', 14, y + 12.5);

  // Bottom footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`MégafixaEduc Pro © ${now.getFullYear()} - Reçu généré électroniquement - Page 1/1`, 105, 286, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

/**
 * Generates the official Subscription & Activation Sheet PDF as a binary Buffer
 */
export function generateFicheAbonnementPdfBuffer(data: SubscriptionPdfData): Buffer {
  const doc = new jsPDF({ format: 'a4', unit: 'mm' });
  const currency = data.currency || 'FCFA';

  const paidNow = Number(data.initialAmount ?? data.amount ?? 0);
  const totalAmount = Number(data.totalPlanAmount ?? (data.remainingAmount ? paidNow + data.remainingAmount : paidNow));
  const remainingAmount = Number(data.remainingAmount ?? 0);
  const initialPct = data.initialPercentage ?? (remainingAmount > 0 ? 45 : 100);
  const isUnique = initialPct === 100 || remainingAmount <= 0;

  const formattedPaid = paidNow.toLocaleString('fr-FR');
  const formattedTotal = totalAmount.toLocaleString('fr-FR');
  const formattedRemaining = remainingAmount.toLocaleString('fr-FR');

  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  // 1. Top Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, 210, 42, 'F');

  // Accent Line
  doc.setFillColor(245, 158, 11); // amber-500
  doc.rect(0, 40, 210, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MEGAFIXAEDUC PRO', 14, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('DIRECTION DES SERVICES ÉDUCATIFS & CONTRATS DE LICENCE', 14, 25);
  doc.text('MÉGAFIXA TECHNOLOGIES SARL • DÉLIVRANCE OFFICIELLE', 14, 30);
  doc.text(`DATE D'ÉMISSION : ${dateStr}`, 14, 35);

  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FICHE OFFICIELLE D\'ABONNEMENT', 196, 18, { align: 'right' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`RÉF : ${data.reference}`, 196, 25, { align: 'right' });
  doc.text(`STATUT : ACTIVÉ & CONFORME`, 196, 30, { align: 'right' });

  // 2. Congratulatory & Gratitude Banner
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(14, 47, 182, 27, 3, 3, 'FD');

  doc.setTextColor(22, 101, 52); // emerald-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('🎉 FÉLICITATIONS POUR VOTRE SOUSCRIPTION !', 20, 54);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  const felicitationsMsg = `Toute l'équipe de MégafixaEduc Pro vous adresse ses plus chaleureuses félicitations et vous exprime sa sincère gratitude pour la confiance que vous accordez à notre plateforme. Votre établissement ${data.schoolName || 'scolaire'} dispose désormais de tous les outils numériques de pointe pour une gestion moderne et performante dès validation du versement initial de ${initialPct}%.`;
  const splitFeli = doc.splitTextToSize(felicitationsMsg, 170);
  doc.text(splitFeli, 20, 60);

  // 3. Central Activation Key & Direct School Account Link
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(14, 79, 182, 44, 4, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36); // amber-400
  doc.text('VOTRE CLÉ D\'ACTIVATION DE COMPTE ÉCOLE (CONFIDENTIEL & PERMANENT) :', 20, 88);

  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(data.licenseKey || 'MEG-EXCELLENCE-OFFICIEL', 20, 99);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('LIEN DIRECT POUR ACCÉDER À MON COMPTE ÉCOLE :', 20, 109);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(96, 165, 250); // blue-400
  const loginUrl = data.loginUrl || 'https://ais-dev-zd7qxhnwatli2x7sfezpbx-323991635372.europe-west2.run.app/login';
  doc.text(loginUrl, 20, 117);

  // 4. Subscription Characteristics Table
  let y = 130;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FICHE SIGNALÉTIQUE DE L\'ABONNEMENT', 14, y);
  y += 3;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);
  y += 6;

  const subItems = [
    ['Établissement Bénéficiaire :', data.schoolName || 'Établissement Scolaire'],
    ['Responsable Principal / Directeur :', data.adminNom || 'Directeur Général'],
    ['Email de Connexion :', data.email || 'direction@ecole.com'],
    ['Formule Souscrite :', `Formule ${data.planName || 'Standard'}`],
    ['Modalité de Règlement :', data.modalityName || (isUnique ? 'Annuel (Paiement unique)' : 'Échelonné (45% initial)')],
    ['Montant Total de l\'Abonnement :', `${formattedTotal} ${currency}`],
    ['Versement Initial à la Création :', `${formattedPaid} ${currency} (${initialPct}% - Acquitté)`],
    ['Solde Restant Dû :', isUnique ? `0 ${currency} (Intégralement soldé)` : `${formattedRemaining} ${currency} (55% - ${data.remainingSchedule || 'selon modalité'})`],
    ['Période de Validité :', `Du ${data.dateDebut || '2026-09-01'} au ${data.dateFin || '2027-08-31'} (${data.durationText || '1 an'})`],
    ['Référence Transaction :', data.reference || 'TX-OFFICIELLE']
  ];

  subItems.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(lbl, 16, y);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(val), 76, y);
    y += 5.8;
  });

  // 5. Unlocked Features Box
  y += 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 34, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('MODULES & FONCTIONNALITÉS DÉBLOQUÉS PAR CETTE CLÉ :', 20, y + 7);

  const defaultFeats = [
    'Gestion complète des inscriptions, élèves, classes et coefficients',
    'Saisie des notes, calcul des moyennes et génération des bulletins officiels',
    'Emploi du temps dynamique, gestion des retards, absences et alertes',
    'Comptabilité intégrée, suivi des frais de scolarité et salaires enseignants',
    'Portails dédiés Enseignants & Parents avec messagerie interne sécurisée'
  ];

  const displayFeats = (data.features && data.features.length > 0) ? data.features : defaultFeats;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);

  displayFeats.slice(0, 5).forEach((feat, idx) => {
    doc.text(`✔  ${feat}`, 22, y + 13 + (idx * 4));
  });

  y += 40;

  // 6. Official Stamp & Legal Footer
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, 196, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CERTIFICAT OFFICIEL D\'AUTHENTICITÉ', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Document officiel délivré par Mégafixa Technologies SARL certifiant l\'attribution de la licence d\'exploitation logicielle.', 14, y + 4.5);
  doc.text(`Conservez précieusement votre clé (${data.licenseKey}) pour tout renouvellement ou support.`, 14, y + 8.5);
  doc.text('Support & Assistance officielle : megafixaservices01@gmail.com', 14, y + 12.5);

  // Bottom footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`MégafixaEduc Pro © ${now.getFullYear()} - Fiche d'Abonnement Officielle - Page 1/1`, 105, 286, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
