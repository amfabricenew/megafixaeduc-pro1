import jsPDF from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';

// Helper to load logo as base64 with multiple fallbacks
const loadLogoBase64 = (): Promise<string> => {
  return new Promise((resolve) => {
    const candidatePaths = ['/LOGO_MEGFIXAEDEUC_PRO.png', '/Logo_megafixa.png', '/logo_megafixa.png', 'LOGO_MEGFIXAEDEUC_PRO.png'];
    let pathIndex = 0;

    const tryNext = () => {
      if (pathIndex >= candidatePaths.length) {
        resolve('');
        return;
      }
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } else {
            resolve('');
          }
        } catch (e) {
          resolve('');
        }
      };
      img.onerror = () => {
        pathIndex++;
        tryNext();
      };
      img.src = candidatePaths[pathIndex];
    };

    tryNext();
  });
};

export const generateUserGuidePDF = async (autoPrint: boolean = false): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const base64Logo = await loadLogoBase64();
  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2; // 182mm
  let currentY = 20;

  // Harmonious, high-contrast professional color palette
  const primaryColor: [number, number, number] = [30, 58, 138]; // Deep Royal Blue
  const primaryLight: [number, number, number] = [238, 242, 255];
  const secondaryColor: [number, number, number] = [5, 150, 105]; // Emerald
  const secondaryLight: [number, number, number] = [236, 253, 245];
  const accentAmber: [number, number, number] = [217, 119, 6]; // Amber
  const accentLight: [number, number, number] = [254, 243, 199];
  const textDark: [number, number, number] = [15, 23, 42]; // Slate 900
  const textMuted: [number, number, number] = [71, 85, 105]; // Slate 600
  const borderGray: [number, number, number] = [226, 232, 240];

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 26) {
      doc.addPage();
      currentY = 22;
    }
  };

  const drawSectionHeader = (title: string, subtitle?: string, badge?: string) => {
    checkPageBreak(24);
    
    // Background bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(marginX, currentY, contentWidth, 9.5, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(title, marginX + 4, currentY + 6.4);

    if (badge) {
      doc.setFontSize(7.5);
      const badgeWidth = doc.getTextWidth(badge) + 6;
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(marginX + contentWidth - badgeWidth - 3, currentY + 2, badgeWidth, 5.5, 1.2, 1.2, 'F');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(badge, marginX + contentWidth - badgeWidth, currentY + 5.7);
    }

    currentY += 12;

    if (subtitle) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const lines = doc.splitTextToSize(subtitle, contentWidth);
      doc.text(lines, marginX, currentY);
      currentY += lines.length * 4 + 2;
    }
  };

  const drawSubSection = (title: string) => {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`▸ ${title}`, marginX, currentY);
    
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.3);
    doc.line(marginX, currentY + 1.2, marginX + contentWidth, currentY + 1.2);
    currentY += 5;
  };

  const drawParagraph = (text: string, isBoldPrefix: string = '') => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    const fullText = isBoldPrefix ? `${isBoldPrefix} ${text}` : text;
    const lines = doc.splitTextToSize(fullText, contentWidth);
    checkPageBreak(lines.length * 3.6 + 1.5);
    
    doc.text(lines, marginX, currentY);
    currentY += lines.length * 3.6 + 1.5;
  };

  const drawBullet = (boldTitle: string, description: string) => {
    doc.setFontSize(8);
    const bulletPrefix = `• ${boldTitle} : `;
    const fullText = `${bulletPrefix}${description}`;
    const lines = doc.splitTextToSize(fullText, contentWidth - 4);
    checkPageBreak(lines.length * 3.6 + 1.2);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('•', marginX + 1, currentY);

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(lines, marginX + 4, currentY);
    currentY += lines.length * 3.6 + 1.2;
  };

  const drawCallout = (title: string, message: string, type: 'info' | 'tip' | 'warning' = 'info') => {
    const lines = doc.splitTextToSize(message, contentWidth - 10);
    const boxHeight = lines.length * 3.6 + 9;
    checkPageBreak(boxHeight + 2);

    let bg = primaryLight;
    let stroke = primaryColor;
    let textC = primaryColor;

    if (type === 'tip') {
      bg = secondaryLight;
      stroke = secondaryColor;
      textC = secondaryColor;
    } else if (type === 'warning') {
      bg = accentLight;
      stroke = accentAmber;
      textC = accentAmber;
    }

    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.setDrawColor(stroke[0], stroke[1], stroke[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(marginX, currentY, contentWidth, boxHeight, 1.8, 1.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textC[0], textC[1], textC[2]);
    doc.text(title, marginX + 4, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(lines, marginX + 4, currentY + 8.6);

    currentY += boxHeight + 2.5;
  };

  // ==========================================
  // PAGE 1: COUVERTURE OFFICIELLE & SOMMAIRE
  // ==========================================
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.9);
  doc.roundedRect(marginX - 2, 12, contentWidth + 4, pageHeight - 24, 4, 4, 'D');

  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(marginX + 1, 15, contentWidth - 2, pageHeight - 30, 3, 3, 'D');

  // Header Banner on Cover
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(marginX + 4, 18, contentWidth - 8, 44, 3, 3, 'F');

  if (base64Logo) {
    try {
      doc.addImage(base64Logo, 'PNG', marginX + 9, 22, 36, 36);
    } catch (e) {}
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('MEGAFIXA EDUC PRO', marginX + 50, 32);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Plateforme Intégrée de Gestion Scolaire Multi-Cycles', marginX + 50, 40);

  doc.setFontSize(8.5);
  doc.setTextColor(219, 234, 254);
  doc.text('Maternelle • Primaire • Secondaire Général & Technique (Collège & Lycée)', marginX + 50, 47);
  doc.text('La technologie et le numérique au service de l\'excellence éducative.', marginX + 50, 53);

  currentY = 68;

  // Title Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX + 4, currentY, contentWidth - 8, 30, 2.5, 2.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("MANUEL D'UTILISATION OFFICIEL & GUIDE DE DÉMARRAGE", marginX + 8, currentY + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text("Manuel exhaustif : Règles de calcul, formulaires, barèmes, flux comptables et sécurité.", marginX + 8, currentY + 18);
  doc.text(`Édition Système 2026.1 Enterprise  •  Date d'édition : ${new Date().toLocaleDateString('fr-FR')}  •  Support 7j/7`, marginX + 8, currentY + 24);

  currentY += 36;

  // Table of contents / Summary table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(textDark[0], textDark[1], textDark[2]);
  doc.text('SOMMAIRE GÉNÉRAL DES 10 MODULES DU SYSTÈME', marginX + 4, currentY);
  currentY += 3;

  const sommaireData = [
    ['Mod. 1', 'Démarrage, Identité de l\'École & Années Scolaires', 'Logo officiel, coordonnées, trimestres/semestres, clôture'],
    ['Mod. 2', 'Gestion des Utilisateurs & Droits d\'Accès (RBAC)', 'Admin, Censeur, Surveillant, Secrétariat, Comptable, Profs, Parents'],
    ['Mod. 3', 'Cycle Maternelle & Primaire (Titulaire Unique)', 'Barème double Note /20 + Perfectionnement (0 à 2, max 20), bulletins'],
    ['Mod. 4', 'Cycle Secondaire Général & Technique (Collège/Lycée)', 'Professeurs spécialistes, coefficients, DS1/DS2, moyennes, rangs'],
    ['Mod. 5', 'Élèves, Inscriptions & Cartes Scolaires avec QR Code', 'Fiches complètes, import Excel, badges plastifiables avec QR Code'],
    ['Mod. 6', 'Enseignants, Personnel Administratif & Paie', 'Affectations des cours, suivi horaire, salaire fixe vs taux horaire'],
    ['Mod. 7', 'Emplois du Temps, Fusion Continue Multi-Heures & Salles', 'Grille 7h-19h, fusion verticale consécutive, détection de conflits'],
    ['Mod. 8', 'Finances, Frais de Scolarité & Paiement en ligne FedaPay', 'Échéanciers, encaissement au guichet, Mobile Money, reçus certifiés QR'],
    ['Mod. 9', 'Secrétariat, Documents Officiels & Banque d\'Épreuves', 'Certificats de scolarité, attestations, fiches radiation, épreuves & corrigés'],
    ['Mod. 10', 'Assiduité, Notifications SMS & Sauvegardes Système', 'Pointage retards/absences, SMS expéditeur MEGAFIXA, backup SQL 1 clic']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Module', 'Domaine Opérationnel', 'Description & Objectifs']],
    body: sommaireData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      cellPadding: 2
    },
    styles: {
      fontSize: 7.2,
      cellPadding: 1.8,
      textColor: textDark
    },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 80, fontStyle: 'bold' },
      2: { cellWidth: 86 }
    },
    margin: { left: marginX + 4, right: marginX + 4 }
  });

  // ==========================================
  // PAGE 2: MODULE 1 & MODULE 2
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionHeader('MODULE 1 : DÉMARRAGE, IDENTITÉ DE L\'ÉCOLE & GESTION DES CYCLES', 'Fondations administratives et structure institutionnelle.', 'CONFIGURATION');

  drawSubSection('1.1 Identité Institutionnelle & Logo Officiel (/parametres)');
  drawParagraph("Le paramétrage initial de l'établissement constitue la clé de voûte de tous vos documents officiels. Dès la première connexion, renseignez le nom complet, le sigle officiel, la devise, l'adresse géographique, les téléphones et l'adresse email.");
  drawBullet('Logo Haute Résolution', 'Téléversez l\'emblème officiel de l\'établissement. Il sera vectorisé et injecté sur tous les bulletins, reçus de caisse certifiés, cartes d\'élèves et attestations administratives.');
  drawBullet('Régime d\'Enseignement', 'Activez les cycles dispensés au sein de votre structure : Maternelle, Primaire, Collège, Lycée Général, et/ou Lycée Technique.');

  drawSubSection('1.2 Années Scolaires & Découpage Pédagogique (/annees-scolaires)');
  drawParagraph("L'architecture supporte le multi-années avec cloisonnement et archivage historique inaltérable.");
  drawBullet('Année Active', 'Une seule année est active pour les saisies quotidiennes. Les années antérieures restent consultables en mode lecture.');
  drawBullet('Découpage Temporel', 'Configurez le rythme scolaire : Système par Trimestres (T1, T2, T3) ou Système par Semestres selon votre cursus.');
  drawBullet('Clôture & Bascule', 'La clôture annuelle permet de faire passer automatiquement les élèves admis dans la classe supérieure tout en archivant les dossiers.');

  currentY += 2;

  drawSectionHeader('MODULE 2 : GESTION DES UTILISATEURS & MATRICE DES DROITS (RBAC)', 'Cloisonnement strict des accès pour garantir la sécurité et la confidentialité.', 'SÉCURITÉ & ACCÈS');

  drawParagraph("L'accès à la plateforme est strictement réglementé par rôle. Chaque profil ne voit que les menus et fonctionnalités liés à ses prérogatives :");

  const rolesTableData = [
    ['Direction / Super Admin', 'Plein pouvoir système', 'Clôture annuelle, sauvegardes SQL, audit logs, validation finale', 'Total (Tout)'],
    ['Censeur / Dir. Études', 'Organisation pédagogique', 'Validation épreuves, emplois du temps, autorisations d\'ajustement notes', 'Consultation'],
    ['Surveillant Général', 'Discipline & Assiduité', 'Pointage retards & absences, convocations parents, fiches sanctions', 'Aucun accès'],
    ['Secrétariat', 'Dossiers & Inscriptions', 'Inscriptions, certificats de scolarité, attestations de fréquentation, cartes', 'Reçus simples'],
    ['Comptable / Caissier', 'Finances & Scolarité', 'Encaissements, émission des reçus avec QR Code, journal de caisse, paie', 'Total (Caisse)'],
    ['Enseignant', 'Pédagogie & Évaluations', 'Saisie de ses notes, dépôt d\'épreuves d\'examen, requêtes d\'horaires EDT', 'Fiche de paie'],
    ['Parent & Élève', 'Suivi de scolarité', 'Consultation des bulletins QR, assiduité, paiement en ligne FedaPay Mobile Money', 'Paiement en ligne']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Rôle Applicatif', 'Mission Principale', 'Droits & Prérogatives Spécifiques', 'Périmètre Financier']],
    body: rolesTableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.6,
      textColor: textDark
    },
    columnStyles: {
      0: { cellWidth: 36, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 42 },
      2: { cellWidth: 76 },
      3: { cellWidth: 28, fontStyle: 'bold' }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 3;

  drawCallout('Règle d\'Intégrité', 'Ne transmettez jamais de compte administrateur aux opérateurs de saisie. Attribuez toujours le rôle le plus restrictif nécessaire pour assurer la traçabilité dans le Journal d\'Audit.', 'warning');

  // ==========================================
  // PAGE 3: MODULE 3 (PRIMAIRE) & MODULE 4 (SECONDAIRE)
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionHeader('MODULE 3 : CYCLE MATERNELLE & PRIMAIRE', 'Pédagogie élémentaire, Titulaire unique et double barème officiel.', 'CYCLE PRIMAIRE');

  drawSubSection('3.1 Architecture du Titulaire Unique & Disciplines Modulaires');
  drawParagraph("Dans l'espace Primaire (/accueil-primaire), chaque classe (Maternelle I, II, CI, CP, CE1, CE2, CM1, CM2) est confiée à un Enseignant Titulaire unique. Ce maître ou maîtresse coordonne l'ensemble des modules d'apprentissage :");
  drawBullet('Modules Pédagogiques', 'Français (Expression orale, Lecture, Écriture, Orthographe), Mathématiques, Éveil Scientifique, Dessin, EPS.');
  drawBullet('Gestion des Sous-Matières', 'Possibilité de ventiler une discipline globale en sous-matières avec pondération interne.');

  drawSubSection('3.2 Double Barème Officiel : Note /20 + Perfectionnement (0 à 2)');
  drawParagraph("Le primaire obéit à la règle ministérielle de valorisation des progrès de l'apprenant :");

  const primaireTableData = [
    ['Note Obtenue', 'Sur 20 points', 'Évaluation sommative des compétences acquises (ex: 17.5 / 20)'],
    ['Perfectionnement', 'De 0 à 2.0 points', 'Bonus récompensant l\'effort, la discipline, la propreté et la participation'],
    ['Note Finale Retenue', 'Plafonnée à 20/20', 'Formule exacte : Note Finale = Min(20, Note Obtenue + Perfectionnement)']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Élément d\'Évaluation', 'Échelle de Notation', 'Règle Mathématique Appliquée']],
    body: primaireTableData,
    theme: 'grid',
    headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2 },
    styles: { fontSize: 7, cellPadding: 1.6, textColor: textDark },
    columnStyles: {
      0: { cellWidth: 42, fontStyle: 'bold', textColor: secondaryColor },
      1: { cellWidth: 42, fontStyle: 'bold' },
      2: { cellWidth: 98 }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 4;

  drawSectionHeader('MODULE 4 : CYCLE SECONDAIRE GÉNÉRAL & TECHNIQUE', 'Professeurs spécialistes, coefficients officiels, DS1/DS2 et bulletins.', 'CYCLE SECONDAIRE');

  drawSubSection('4.1 Structure par Discipline & Coefficients par Série (/classes-secondaire)');
  drawParagraph("Le secondaire (de la 6ème à la Terminale) gère la pluralité des enseignants par classe et les spécificités des filières (Littéraires A, Économiques B, Scientifiques C & D, Technologiques TI) :");
  drawBullet('Affectation Spécialisée', 'Un professeur enseigne sa discipline spécifique au sein de la promotion.');
  drawBullet('Professeur Principal', 'Nomination d\'un enseignant référent chargé de la synthèse pédagogique trimestrielle.');

  drawSubSection('4.2 Typologie des Épreuves & Calcul des Moyennes Pondérées');

  const secondaireTableData = [
    ['Interrogations (I1..I4)', 'Coeff Interro (1)', 'Contrôles continus formatifs écrits et oraux. Moyenne arithmétique.'],
    ['Devoir Surveillé 1 (DS1)', 'Pondération DS (1)', 'Premier devoir trimestriel majeur sur table.'],
    ['Devoir Surveillé 2 (DS2)', 'Pondération DS (2)', 'Deuxième devoir trimestriel majeur sommatif.'],
    ['Moyenne Trimestrielle Matière', 'Sur 20 points', 'Moyenne = (Moyenne Interros + Note DS1 + 2 × Note DS2) ÷ Pondération'],
    ['Moyenne Générale Trimestre', 'Sur 20 points', 'Moyenne Générale = Σ (Moyenne Matière × Coeff) ÷ Σ (Coefficients)']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Type d\'Évaluation', 'Pondération / Échelle', 'Mode de Calcul Mathématique']],
    body: secondaireTableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2 },
    styles: { fontSize: 7, cellPadding: 1.6, textColor: textDark },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 96 }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 3;

  drawCallout('Saisie Rapide par Matière', 'Dans le menu Notes > Saisie Rapide, sélectionnez la classe et la matière : les notes déjà saisies sont automatiquement pré-chargées pour vous éviter toute ressaisie fastidieuse.', 'tip');

  // ==========================================
  // PAGE 4: MODULE 5 & MODULE 6
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionHeader('MODULE 5 : ÉLÈVES, INSCRIPTIONS & CARTES SCOLAIRES QR', 'Gestion du registre apprenants, dossiers médicaux et badges d\'identité.', 'REGISTRE APPRENANTS');

  drawSubSection('5.1 Inscriptions, Matricules Automatiques & Import Excel (/eleves)');
  drawParagraph("Le registre des élèves centralise l'intégralité du cursus scolaire :");
  drawBullet('Génération du Matricule', 'Attribution automatique d\'un matricule unique national ou interne lors de la validation.');
  drawBullet('Dossier Administratif', 'État civil, date et lieu de naissance, photo d\'identité, régime (externe, demi-pensionnaire, interne), coordonnées d\'urgence des tuteurs légaux.');
  drawBullet('Importation Massive Excel', 'Intégrez en 1 clic vos listes d\'élèves via le gabarit Excel (.xlsx) téléchargeable.');

  drawSubSection('5.2 Cartes d\'Élèves & Badges Sécurisés avec QR Code (/cartes-scolaires)');
  drawParagraph("Édition instantanée de badges scolaires conformes aux normes d'authentification modernes :");
  drawBullet('Format Plastifiable', 'Format carte de crédit international (85.6 × 54 mm) optimisé pour planche A4 prête au massicotage.');
  drawBullet('QR Code Anti-Fraude', 'Chaque badge intègre un QR Code scannable par tout smartphone ou agent de contrôle. Il renvoie vers la page de vérification sécurisée en ligne attestant de la validité de l\'inscription de l\'élève pour l\'année en cours.');

  currentY += 2;

  drawSectionHeader('MODULE 6 : ENSEIGNANTS, PERSONNEL ADMINISTRATIF & PAIE', 'Gestion des ressources humaines, attributions pédagogiques et états de salaires.', 'PERSONNEL & PAIE');

  drawSubSection('6.1 Fiches Enseignants & Volumes Horaires (/enseignants)');
  drawParagraph("Gestion du corps professoral permanent, contractuel et vacataire :");
  drawBullet('Affectation des Enseignements', 'Attribution des disciplines et des promotions avec décompte automatique de la charge horaire hebdomadaire.');
  drawBullet('Portail Mon Compte Enseignant', 'Espace réservé à chaque professeur pour consulter son emploi du temps personnel, ses classes et ses états de rémunération.');

  drawSubSection('6.2 Modes de Rémunération & Fiches de Paie Certifiées (/salaires)');

  const paieTableData = [
    ['Salaire Fixe Mensuel', 'Personnel permanent & direction', 'Montant contractuel fixe versé en fin de mois après déductions.'],
    ['Taux Horaire (Vacataires)', 'Professeurs vacataires', 'Calcul automatique : Montant = Nombre d\'heures effectives × Taux horaire.'],
    ['Primes & Déductions', 'Tous statuts', 'Gestion des primes d\'encadrement, indemnités, avances et retenues.'],
    ['Bulletins de Paie', 'Format officiel PDF', 'Édition instantanée de la fiche de paie individuelle avec reçu signé.']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Modalité de Rémunération', 'Bénéficiaires Ciblés', 'Mécanisme de Calcul & Preuve']],
    body: paieTableData,
    theme: 'grid',
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2 },
    styles: { fontSize: 7, cellPadding: 1.6, textColor: textDark },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold', textColor: primaryColor },
      1: { cellWidth: 46 },
      2: { cellWidth: 92 }
    },
    margin: { left: marginX, right: marginX }
  });

  // ==========================================
  // PAGE 5: MODULE 7 & MODULE 8
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionHeader('MODULE 7 : EMPLOIS DU TEMPS & SESSIONS CONTINUES', 'Planification hebdomadaire, fusion verticale multi-heures et gestion des salles.', 'PLANIFICATION');

  drawSubSection('7.1 Grille Interactive & Fusion Continue Multi-Heures (/emploi-du-temps)');
  drawParagraph("La grille temporelle couvre la semaine du Lundi au Samedi, de 07h00 à 19h00 :");
  drawBullet('Fusion Verticale Continue', 'Pour les cours de plusieurs heures d\'affilée (ex: SVT de 08h à 10h), l\'affichage regroupe l\'ensemble des créneaux en un bloc continu sans aucun trait de coupure horizontal.');
  drawBullet('Détection Temps Réel des Conflits', 'Blocage automatique de toute tentative de double affectation d\'un enseignant ou d\'une salle sur un même créneau horaire.');
  drawBullet('Demandes d\'Aménagement d\'Horaires', 'Les professeurs soumettent leurs requêtes de permutation ou d\'absence motivée directement dans l\'application, avec notification et validation par le Censeur.');

  currentY += 2;

  drawSectionHeader('MODULE 8 : FINANCES, FRAIS & PAIEMENT EN LIGNE FEDAPAY', 'Recouvrement des scolarités, tranches d\'échéances, Mobile Money et reçus QR.', 'COMPTABILITÉ SCOLAIRE');

  drawSubSection('8.1 Grille Tarifaire & Échéanciers par Promotion (/frais-scolarite)');
  drawParagraph("La politique financière s'adapte aux réalités de l'établissement :");

  const financeTableData = [
    ['Scolarité Générale', '3 tranches trimestrielles', 'Dates limites strictes avec alertes automatiques avant échéance.'],
    ['Frais d\'Inscription / Réinscr.', 'Paiement à l\'admission', 'Conditionne la validation définitive du dossier de l\'élève.'],
    ['Cantine & Transport Scolaire', 'Optionnel (Mois/Trimestre)', 'Gestion des cartes de cantine et des circuits de ramassage scolaire.'],
    ['Paiement en Ligne FedaPay', 'Mobile Money & Cartes', 'MTN MoMo, Moov Money, Celtiis Cash, Visa, Mastercard sécurisé.'],
    ['Reçus de Caisse avec QR Code', 'À chaque encaissement', 'Génération d\'un reçu officiel infalsifiable avec QR Code de preuve légale.']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Catégorie de Frais', 'Modalité d\'Exigibilité', 'Précisions Opérationnelles & Sécurité']],
    body: financeTableData,
    theme: 'grid',
    headStyles: { fillColor: secondaryColor, textColor: 255, fontStyle: 'bold', fontSize: 7.5, cellPadding: 2 },
    styles: { fontSize: 7, cellPadding: 1.6, textColor: textDark },
    columnStyles: {
      0: { cellWidth: 48, fontStyle: 'bold', textColor: secondaryColor },
      1: { cellWidth: 44, fontStyle: 'bold' },
      2: { cellWidth: 90 }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 3;

  drawSubSection('8.2 Encaissement au Guichet & Journal de Caisse');
  drawParagraph("À chaque encaissement au guichet, le caissier saisit le montant versé : le système calcule immédiatement le solde restant dû et imprime le reçu officiel certifié. Le Journal de Caisse offre une balance quotidienne inaltérable.");

  // ==========================================
  // PAGE 6: MODULE 9 & MODULE 10 + SUPPORT
  // ==========================================
  doc.addPage();
  currentY = 20;

  drawSectionHeader('MODULE 9 : SECRÉTARIAT, DOCUMENTS & BANQUE D\'ÉPREUVES', 'Délivrance instantanée d\'actes administratifs et gestion des examens.', 'SECRÉTARIAT & ÉPREUVES');

  drawSubSection('9.1 Actes Administratifs Certifiés en 1 Clic (/documents-demandes)');
  drawParagraph("Fini la saisie répétitive ! Les documents administratifs sont générés automatiquement avec les données officielles :");
  drawBullet('Certificats de Scolarité', 'Pour inscriptions aux examens nationaux, dossiers de bourses et allocations.');
  drawBullet('Attestations de Fréquentation', 'Délivrées aux parents d\'élèves pour les démarches administratives et consulaires.');
  drawBullet('Fiches de Radiation & Transfert', 'En cas de changement d\'école avec récapitulatif des notes et du solde de scolarité.');
  drawBullet('Attestations de Travail Enseignant', 'Certifiant de l\'état de service et du volume horaire assuré.');

  drawSubSection('9.2 Banque d\'Épreuves & Examens Officiels (/epreuves)');
  drawParagraph("Espace collaboratif de préparation des évaluations : les enseignants déposent leurs sujets avec barème détaillé et corrigé type. Le Censeur valide la qualité pédagogique avant le tirage des compositions.");

  currentY += 2;

  drawSectionHeader('MODULE 10 : ASSIDUITÉ, NOTIFICATIONS SMS & SÉCURITÉ SYSTÈME', 'Contrôle des présences, alertes SMS certifiées et pérennité des données.', 'SÉCURITÉ & CONTINUITÉ');

  drawSubSection('10.1 Pointage des Retards, Absences & Discipline (/absences)');
  drawParagraph("Suivi rigoureux de l'assiduité par demi-journée ou par cours. En cas d'absence injustifiée, une alerte est transmise automatiquement aux parents.");

  drawSubSection('10.2 Passerelle SMS & Expéditeur Certifié MEGAFIXA');
  drawParagraph("Les alertes SMS (bulletins disponibles, retards, relances d'échéances) sont expédiées sous le nom officiel certifié MEGAFIXA ou le sigle de l'école pour une crédibilité maximale auprès des familles.");

  drawSubSection('10.3 Sauvegardes SQL en 1 Clic & Journal d\'Audit Inaltérable (/parametres)');
  drawBullet('Sauvegarde SQL Complète', 'Téléchargez à tout moment une copie autonome de votre base de données pour archivage externe.');
  drawBullet('Journal d\'Audit', 'Enregistrement inaltérable de chaque action sensible (notes, encaissements, créations) avec date, heure et utilisateur.');

  currentY += 2;

  // Final Official Support Card
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(marginX, currentY, contentWidth, 34, 2.5, 2.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('ASSISTANCE TECHNIQUE, FORMATION & SUPPORT CLIENT 7J/7', marginX + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text('L\'équipe d\'ingénieurs et formateurs MEGAFIXA Tech accompagne vos directeurs, censeurs et comptables :', marginX + 6, currentY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('• Téléphone / WhatsApp : +229 0161107918 / +229 0141264238', marginX + 6, currentY + 20);
  doc.text('• Email officiel : megafixatecheduc@gmail.com', marginX + 6, currentY + 25.5);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text('MEGAFIXA Tech — La technologie et le numérique au service de l\'excellence éducative.', marginX + 6, currentY + 30.5);

  // =========================================================================
  // APPLY HEADERS, FOOTERS & WATERMARK TO ALL PAGES OF THE DOCUMENT
  // =========================================================================
  const totalPages = doc.getNumberOfPages();

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    doc.setPage(pageNum);

    // 1. WATERMARK LOGO IN CENTER OF PAGE (Faint subtle opacity ~0.06)
    if (base64Logo) {
      try {
        // @ts-ignore
        if (typeof doc.GState === 'function') {
          // @ts-ignore
          const faintState = new doc.GState({ opacity: 0.06 });
          // @ts-ignore
          const normalState = new doc.GState({ opacity: 1.0 });
          
          // @ts-ignore
          doc.setGState(faintState);
          const wmSize = 100;
          const wmX = (pageWidth - wmSize) / 2;
          const wmY = (pageHeight - wmSize) / 2;
          doc.addImage(base64Logo, 'PNG', wmX, wmY, wmSize, wmSize, undefined, 'FAST');
          // @ts-ignore
          doc.setGState(normalState);
        } else {
          const wmSize = 80;
          const wmX = (pageWidth - wmSize) / 2;
          const wmY = (pageHeight - wmSize) / 2;
          doc.addImage(base64Logo, 'PNG', wmX, wmY, wmSize, wmSize);
        }
      } catch (e) {
        console.warn('Watermark generation note:', e);
      }
    }

    // 2. HEADER (Top of Page) - Show app name on pages 2+
    if (pageNum > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('MEGAFIXA EDUC PRO — Guide d\'Utilisation & Manuel Opérationnel', marginX, 9);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      const headerSubtitle = 'Gestion Scolaire Multi-Cycles Intégrée';
      doc.text(headerSubtitle, pageWidth - marginX - doc.getTextWidth(headerSubtitle), 9);

      doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
      doc.setLineWidth(0.3);
      doc.line(marginX, 11.5, pageWidth - marginX, 11.5);
    }

    // 3. FOOTER (Bottom of Page) - Exact application footer mentions + page numbering
    const footerY = pageHeight - 12;
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.setLineWidth(0.35);
    doc.line(marginX, footerY - 3.5, pageWidth - marginX, footerY - 3.5);

    // Left & Center Footer Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text("MEGAFIXA Tech, La technologie et le numérique au service de l'excellence.", marginX, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text("Tél / WhatsApp : +229 0161107918 / +229 0141264238   •   Email : megafixatecheduc@gmail.com", marginX, footerY + 3.5);

    // Right Footer: Page Numbering
    const pageText = `Page ${pageNum} / ${totalPages}`;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(pageText, pageWidth - marginX - doc.getTextWidth(pageText), footerY + 1.5);
  }

  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`MEGAFIXA_Educ_Pro_Manuel_Utilisation_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  return doc;
};
