import jsPDF from '@/src/utils/compressedPdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { generateQRCodeDataUrl } from './qrAuth';

export interface DocumentData {
  schoolInfo?: {
    nom?: string;
    slogan?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    pays?: string;
    numero_enregistrement?: string;
    logo?: string;
    nom_directeur?: string;
    headerLines?: string[];
  };
  nom: string;
  prenom: string;
  role?: string;
  type: string;
  reference?: string;
  issueDate?: string;
  isVierge?: boolean;
  specificData?: {
    reference?: string;
    assiduite?: string;
    discipline?: string;
    travail?: string;
    matricule?: string;
    poste?: string;
    classe?: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    nomPere?: string;
    nomMere?: string;
    classeInscription?: string;
    anneeInscription?: string;
    anneeScolaire?: string;
    mentionSpeciale?: string;
    startDate?: string;
    endDate?: string;
    salaire?: string;
    typeContrat?: string;
    volumeHoraire?: string;
    objet?: string;
    lieu?: string;
    frais?: string;
    moyenTransport?: string;
    motifAbsence?: string;
    mentor?: string;
    service?: string;
    contenu?: string;
    observations?: string;
    titrePerso?: string;
    signataireNom?: string;
    signataireTitre?: string;
    lieuSignature?: string;
    isVierge?: boolean;
  };
}

/**
 * Formate le nom d'une classe pour afficher correctement les ordinaux (ex: 6ème, 5ème, 1ère, Tle)
 * Résout définitivement les duplications de suffixes (comme "6èmeme")
 */
export const formatClasseDisplay = (className?: string): string => {
  if (!className) return '';
  let res = className.trim();
  
  // 1. Dédoublonnage d'erreurs historiques comme "6èmeme", "5èmememe", "4ememe"
  res = res.replace(/([0-9]+)\s*(?:è|e|ième|ieme|é)?(?:me)+/gi, '$1ème');

  // 2. Remplacement propre des ordinaux
  res = res.replace(/\b([6543])\s*(?:[eèé]me?s?|i[eèé]me?s?|[eèé]|e)(?=[^a-zA-Z]|$)/gi, '$1ème');
  res = res.replace(/\b2\s*(?:nde?s?|nd)(?=[^a-zA-Z]|$)/gi, '2nde');
  res = res.replace(/\b1\s*(?:[eèé]re?s?|er?s?)(?=[^a-zA-Z]|$)/gi, '1ère');
  res = res.replace(/\bseconde\b/gi, '2nde');
  res = res.replace(/\bpremi[eèé]re\b/gi, '1ère');
  res = res.replace(/\bterminale\b/gi, 'Terminale');
  res = res.replace(/\btle\b/gi, 'Tle');

  // 3. Nettoyage de sécurité final si "ème" ou "me" a encore été collé
  res = res.replace(/(6ème|5ème|4ème|3ème|2nde|1ère)(?:me|ème|eme)+/gi, '$1');

  return res;
};

export const generateDocumentPdf = async (data: DocumentData): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - (margin * 2);

  const school = data.schoolInfo || {};
  const schoolName = (school.nom || 'ÉTABLISSEMENT SCOLAIRE').toUpperCase();
  const schoolSlogan = school.slogan || '';
  const schoolAddress = school.adresse || '';
  const schoolPhone = school.telephone ? `Tél : ${school.telephone}` : '';
  const schoolEmail = school.email ? `Email : ${school.email}` : '';
  const schoolPays = (school.pays || 'RÉPUBLIQUE DU BÉNIN').toUpperCase();
  const numEnreg = school.numero_enregistrement ? `Arrêté / N° Enreg. : ${school.numero_enregistrement}` : '';
  
  const issueDateFormatted = data.issueDate 
    ? format(new Date(data.issueDate), 'dd MMMM yyyy', { locale: fr })
    : format(new Date(), 'dd MMMM yyyy', { locale: fr });

  const sData = data.specificData || {};
  const isVierge = Boolean(data.isVierge || sData.isVierge);

  // Construction de la Référence Administrative Officielle
  const currentYear = new Date().getFullYear();
  const typePrefixMap: Record<string, string> = {
    certificat_scolarite: 'CS',
    certificat_travail: 'CT',
    attestation_travail: 'AT',
    contrat_travail: 'CTR',
    fiche_mission: 'OM',
    attestation_stage: 'STG',
    autorisation_absence: 'ABS',
    attestation_frequentation: 'AF',
    attestation_reussite: 'AR',
    recommandation: 'LR',
    autre: 'DOC'
  };
  const docPrefix = typePrefixMap[data.type] || 'DOC';
  const rawSuffix = sData.matricule ? sData.matricule.replace(/[^A-Za-z0-9]/g, '') : `${Math.floor(100 + Math.random() * 900)}`;
  const defaultRef = `${currentYear}/${docPrefix}-${rawSuffix}`;
  const rawRef = (data.reference || sData.reference || defaultRef).trim();
  const refNumber = rawRef.startsWith('N°') ? rawRef : `N° ${rawRef}`;

  // ==================== 1. CADRE DÉCORATIF ====================
  doc.setDrawColor(30, 41, 59); // Slate-800
  doc.setLineWidth(0.7);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // ==================== 2. EN-TÊTE OFFICIEL (3 COLONNES) ====================
  let curY = 16;
  const leftBlockX = 46; // Center X for left block
  const rightBlockX = pageWidth - 46; // Center X for right block

  // Left side: Official info (Centered relative to leftBlockX)
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(schoolPays, leftBlockX, curY, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text("MINISTÈRE DES ENSEIGNEMENTS", leftBlockX, curY + 3.8, { align: 'center' });
  doc.text("DIRECTION DÉPARTEMENTALE", leftBlockX, curY + 7.6, { align: 'center' });
  if (numEnreg) {
    doc.setFontSize(6.8);
    doc.text(numEnreg, leftBlockX, curY + 11.4, { align: 'center' });
  }
  
  // Devise Pays
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(71, 85, 105);
  doc.text("Fraternité - Justice - Travail", leftBlockX, curY + 15.5, { align: 'center' });

  // Middle: Logo
  if (school.logo) {
    try {
      if (school.logo.startsWith('data:image')) {
        doc.addImage(school.logo, 'PNG', pageWidth / 2 - 11, curY - 2, 22, 22);
      }
    } catch (e) {
      console.warn("Could not add logo to PDF", e);
    }
  }

  // Right side: School info (Centered relative to rightBlockX)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(schoolName, rightBlockX, curY, { align: 'center' });
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  if (schoolSlogan) {
    doc.text(`« ${schoolSlogan} »`, rightBlockX, curY + 3.8, { align: 'center' });
  }
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  if (schoolAddress) doc.text(schoolAddress, rightBlockX, curY + 7.6, { align: 'center' });
  
  const contactLines = [schoolPhone, schoolEmail].filter(Boolean);
  if (contactLines.length > 0) {
    doc.text(contactLines.join(' | '), rightBlockX, curY + 11.4, { align: 'center' });
  }

  curY += 22;

  // Ligne de séparation sous en-tête
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(16, curY, pageWidth - 16, curY);
  curY += 4.5;

  // ==================== ESPACE DE RÉFÉRENCE ADMINISTRATIVE OFFICIELLE ====================
  const lieuSignature = sData.lieuSignature || schoolAddress.split(',')[0] || 'Cotonou';

  // Cadre officiel à gauche pour la référence administrative
  const refBoxWidth = 88;
  const refBoxHeight = 11;
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(148, 163, 184); // Slate-400
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, curY, refBoxWidth, refBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text("RÉFÉRENCE ADMINISTRATIVE :", margin + 3.5, curY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(refNumber, margin + 3.5, curY + 8.5);

  // Lieu et Date à droite, alignés verticalement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Fait à ${lieuSignature}, le ${issueDateFormatted}`, pageWidth - margin, curY + 6.5, { align: 'right' });

  curY += refBoxHeight + 5;

  // ==================== 3. TITRE DU DOCUMENT ====================
  let docTitle = "DOCUMENT ADMINISTRATIF OFFICIEL";
  if (data.type === 'certificat_travail') docTitle = "CERTIFICAT DE TRAVAIL";
  else if (data.type === 'attestation_travail') docTitle = "ATTESTATION DE TRAVAIL";
  else if (data.type === 'contrat_travail') docTitle = `CONTRAT DE TRAVAIL (${(sData.typeContrat || 'CDD').toUpperCase()})`;
  else if (data.type === 'certificat_scolarite') docTitle = "CERTIFICAT DE SCOLARITÉ";
  else if (data.type === 'fiche_mission') docTitle = "ORDRE ET FICHE DE MISSION";
  else if (data.type === 'attestation_stage') docTitle = "ATTESTATION DE FIN DE STAGE";
  else if (data.type === 'autorisation_absence') docTitle = "AUTORISATION D'ABSENCE / CONGÉ";
  else if (sData.titrePerso) docTitle = sData.titrePerso.toUpperCase();

  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(margin + 8, curY - 4.5, contentWidth - 16, 12, 1.5, 1.5, 'F');
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 8, curY - 4.5, contentWidth - 16, 12, 1.5, 1.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, pageWidth / 2, curY + 1.8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Réf. : ${refNumber}`, pageWidth / 2, curY + 5.8, { align: 'center' });

  curY += 15;

  // ==================== 4. CORPS DU TEXTE ====================
  const beneficiaryNom = isVierge ? '' : (data.nom || '').toUpperCase();
  const beneficiaryPrenom = isVierge ? '' : (data.prenom || '');
  const beneficiaryRole = sData.poste || (data.role === 'enseignant' ? 'Enseignant(e)' : (data.role === 'eleve' ? 'Élève' : 'Personnel Administratif'));

  const signNom = sData.signataireNom || school.nom_directeur || '........................................';
  const signTitre = sData.signataireTitre || "Directeur / Chef d'établissement";

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);

  interface TextSpan {
    text: string;
    bold?: boolean;
    italic?: boolean;
    color?: [number, number, number];
  }

  const writeRichParagraph = (spans: TextSpan[], spaceAfter = 3.8, lineSpacing = 5.0) => {
    let curX = margin;
    const defaultColor: [number, number, number] = [15, 23, 42];

    for (const span of spans) {
      if (!span.text) continue;
      const style = span.bold && span.italic ? 'bolditalic' : span.bold ? 'bold' : span.italic ? 'italic' : 'normal';
      const color = span.color || defaultColor;

      // Tokenize preserving spaces
      const tokens = span.text.split(/( +)/);
      for (const token of tokens) {
        if (!token) continue;
        doc.setFont('helvetica', style);
        doc.setFontSize(10);
        const tokenWidth = doc.getTextWidth(token);

        // Word wrap check
        if (curX + tokenWidth > margin + contentWidth && curX > margin && token.trim().length > 0) {
          curY += lineSpacing;
          curX = margin;
        }

        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(token, curX, curY);
        curX += tokenWidth;
      }
    }

    curY += lineSpacing + spaceAfter;
    // Reset to defaults
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
  };

  const writeParagraph = (text: string, spaceAfter = 3.8, lineSpacing = 5.0) => {
    writeRichParagraph([{ text }], spaceAfter, lineSpacing);
  };

  if (data.type === 'certificat_scolarite') {
    // 1. Déclaration de signature
    writeRichParagraph([
      { text: "Je soussigné(e), " },
      { text: signNom, bold: !isVierge && !signNom.includes('...'), italic: !isVierge && !signNom.includes('...') },
      { text: `, ${signTitre} de l'école ou complexe mentionné ci-dessus, certifie que :` }
    ], 3.2);

    // 2. Nom de l'élève (sans parenthèses) - en gras et en italique
    const elNom = isVierge ? '................................................................................' : `${beneficiaryNom} ${beneficiaryPrenom}`.trim();
    writeRichParagraph([
      { text: "L'élève : ", bold: true },
      { text: elNom || '................................................................................', bold: !isVierge && Boolean(elNom), italic: !isVierge && Boolean(elNom) }
    ], 3.2);

    // 3. Né(e) le ... à ... - en gras et en italique
    const naissDate = (!isVierge && sData.dateNaissance) ? format(new Date(sData.dateNaissance), 'dd/MM/yyyy') : '.....................';
    const naissLieu = (!isVierge && sData.lieuNaissance) ? sData.lieuNaissance : '..............................';
    writeRichParagraph([
      { text: "Né(e) le : ", bold: true },
      { text: naissDate, bold: !isVierge && Boolean(sData.dateNaissance), italic: !isVierge && Boolean(sData.dateNaissance) },
      { text: "  à : ", bold: true },
      { text: naissLieu, bold: !isVierge && Boolean(sData.lieuNaissance), italic: !isVierge && Boolean(sData.lieuNaissance) }
    ], 3.2);

    // 4. Parents sur LA MÊME LIGNE - en gras et en italique
    const nomPere = (!isVierge && sData.nomPere) ? sData.nomPere : '.........................................';
    const nomMere = (!isVierge && sData.nomMere) ? sData.nomMere : '.............................................';
    writeRichParagraph([
      { text: "Fils / Fille de : ", bold: true },
      { text: nomPere, bold: !isVierge && Boolean(sData.nomPere), italic: !isVierge && Boolean(sData.nomPere) },
      { text: "  et de : ", bold: true },
      { text: nomMere, bold: !isVierge && Boolean(sData.nomMere), italic: !isVierge && Boolean(sData.nomMere) }
    ], 3.2);

    // 5. Inscription & Classe avec formatage propre "6ème" et Matricule en ROUGE gras italique
    const anneeInsc = (!isVierge && sData.anneeInscription) ? sData.anneeInscription : '20...... - 20......';
    const rawClasseInsc = (!isVierge && sData.classeInscription) ? formatClasseDisplay(sData.classeInscription) : '.......(Classe à l\'inscription).........';
    const mat = (!isVierge && sData.matricule) ? sData.matricule : '.................................';
    const rawClasseAct = (!isVierge && sData.classe) ? formatClasseDisplay(sData.classe) : '.........(Classe actuelle de l\'élève)';

    const matColor: [number, number, number] = (!isVierge && sData.matricule) ? [220, 38, 38] : [15, 23, 42]; // Rouge vif

    writeRichParagraph([
      { text: "Est régulièrement inscrit(e) dans mon établissement au titre de l'année scolaire " },
      { text: anneeInsc, bold: !isVierge && Boolean(sData.anneeInscription), italic: !isVierge && Boolean(sData.anneeInscription) },
      { text: ", dans la classe de : " },
      { text: rawClasseInsc, bold: !isVierge && Boolean(sData.classeInscription), italic: !isVierge && Boolean(sData.classeInscription) },
      { text: ", sous le matricule : " },
      { text: mat, bold: !isVierge && Boolean(sData.matricule), italic: !isVierge && Boolean(sData.matricule), color: matColor },
      { text: " et poursuit actuellement les cours en classe de " },
      { text: rawClasseAct, bold: !isVierge && Boolean(sData.classe), italic: !isVierge && Boolean(sData.classe) },
      { text: "." }
    ], 3.8);

    // 6. APPRÉCIATIONS (Avant Mention Spéciale)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("APPRÉCIATIONS :", margin, curY);
    curY += 4.2;

    const assidVal = (!isVierge && sData.assiduite) ? sData.assiduite : '........................................................................................................................';
    writeRichParagraph([
      { text: "ASSIDUITÉ : ", bold: true },
      { text: assidVal, bold: !isVierge && Boolean(sData.assiduite), italic: !isVierge && Boolean(sData.assiduite) }
    ], 1.2, 4.5);

    const discVal = (!isVierge && sData.discipline) ? sData.discipline : '........................................................................................................................';
    writeRichParagraph([
      { text: "DISCIPLINE : ", bold: true },
      { text: discVal, bold: !isVierge && Boolean(sData.discipline), italic: !isVierge && Boolean(sData.discipline) }
    ], 1.2, 4.5);

    const travVal = (!isVierge && sData.travail) ? sData.travail : '........................................................................................................................';
    writeRichParagraph([
      { text: "TRAVAIL : ", bold: true },
      { text: travVal, bold: !isVierge && Boolean(sData.travail), italic: !isVierge && Boolean(sData.travail) }
    ], 2.8, 4.5);

    // 7. MENTION SPÉCIALE
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("MENTION SPÉCIALE :", margin, curY);
    curY += 4.2;
    doc.setFont('helvetica', 'normal');
    
    if (sData.mentionSpeciale && !isVierge) {
      writeRichParagraph([
        { text: sData.mentionSpeciale, bold: true, italic: true }
      ], 3.2, 4.6);
    } else {
      const dotLine = "........................................................................................................................................................................";
      doc.setTextColor(100, 116, 139);
      doc.text(dotLine, margin, curY);
      doc.text(dotLine, margin, curY + 4.2);
      curY += 8.4;
      doc.setTextColor(15, 23, 42);
    }

    // 8. Formule finale
    writeParagraph("Ce certificat de scolarité est délivré pour servir et valoir ce que de droit, notamment auprès des organismes sociaux, assurances et administrations.", 3.2);

  } else if (data.type === 'certificat_travail') {
    writeRichParagraph([
      { text: "Je soussigné(e), " },
      { text: signNom, bold: !isVierge && !signNom.includes('...'), italic: !isVierge && !signNom.includes('...') },
      { text: `, ${signTitre} de l'établissement ${schoolName}, certifie par la présente que :` }
    ], 3.5);
    
    const nomAffiche = isVierge ? 'M. / Mme ................................................................................' : `M. / Mme ${beneficiaryNom} ${beneficiaryPrenom}`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: nomAffiche, bold: !isVierge, italic: !isVierge },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : [])
    ], 3.5);

    const startDate = (!isVierge && sData.startDate) ? format(new Date(sData.startDate), 'dd MMMM yyyy', { locale: fr }) : '.....................';
    const endDate = (!isVierge && sData.endDate) ? format(new Date(sData.endDate), 'dd MMMM yyyy', { locale: fr }) : (isVierge ? '.....................' : 'la date de ce jour');
    const postDisplay = isVierge ? '............................................................' : beneficiaryRole.toUpperCase();

    writeRichParagraph([
      { text: "A été employé(e) au sein de notre établissement scolaire en qualité de : " },
      { text: postDisplay, bold: !isVierge, italic: !isVierge },
      { text: "." }
    ], 3.2);

    writeRichParagraph([
      { text: "Durant la période du " },
      { text: startDate, bold: !isVierge && Boolean(sData.startDate), italic: !isVierge && Boolean(sData.startDate) },
      { text: " au " },
      { text: endDate, bold: !isVierge, italic: !isVierge },
      { text: "." }
    ], 3.2);

    writeParagraph(`Pendant toute la durée de son engagement, l'intéressé(e) a accompli ses fonctions avec dévouement, professionnalisme et probité, libre de tout engagement envers notre institution.`, 3.2);
    writeParagraph("En foi de quoi, ce certificat de travail lui est délivré pour servir et valoir ce que de droit.", 3.2);

  } else if (data.type === 'attestation_travail') {
    writeParagraph(`La Direction de l'établissement ${schoolName} atteste par la présente que :`);

    const nomAffiche = isVierge ? 'M. / Mme ................................................................................' : `M. / Mme ${beneficiaryNom} ${beneficiaryPrenom}`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: nomAffiche, bold: !isVierge, italic: !isVierge },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : [])
    ], 3.5);

    const startDate = (!isVierge && sData.startDate) ? format(new Date(sData.startDate), 'dd MMMM yyyy', { locale: fr }) : '.....................';
    const postDisplay = isVierge ? '............................................................' : beneficiaryRole.toUpperCase();

    writeRichParagraph([
      { text: "Est actuellement en service actif au sein de notre établissement en qualité de " },
      { text: postDisplay, bold: !isVierge, italic: !isVierge },
      { text: ", depuis le " },
      { text: startDate, bold: !isVierge && Boolean(sData.startDate), italic: !isVierge && Boolean(sData.startDate) },
      { text: "." }
    ], 3.2);
    
    if (sData.salaire && !isVierge) {
      writeRichParagraph([
        { text: "L'intéressé(e) perçoit une rémunération mensuelle nette de : " },
        { text: sData.salaire, bold: true, italic: true },
        { text: "." }
      ], 3.2);
    }

    writeParagraph("La présente attestation est délivrée à la demande de l'intéressé(e) pour accomplir toutes formalités administratives, bancaires ou consulaires utiles.", 3.2);
    writeParagraph("Fait pour servir et valoir ce que de droit.", 3.2);

  } else if (data.type === 'contrat_travail') {
    writeParagraph(`ENTRE LES SOUSSIGNÉS :`);
    writeParagraph(`1. L'Établissement ${schoolName}, représenté par sa Direction.`);
    const nomAffiche = isVierge ? 'M./Mme ................................................................................' : `M./Mme ${beneficiaryNom} ${beneficiaryPrenom}, demeurant à ${schoolAddress || 'adresse déclarée'}`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: `2. ${nomAffiche}` },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : []),
      { text: "." }
    ], 3.5);
    
    doc.setFont('helvetica', 'bold');
    doc.text("IL A ÉTÉ CONVENU CE QUI SUIT :", margin, curY);
    curY += 5;
    doc.setFont('helvetica', 'normal');

    const typeContrat = (sData.typeContrat || 'CDD').toUpperCase();
    const startDate = (!isVierge && sData.startDate) ? format(new Date(sData.startDate), 'dd/MM/yyyy') : '.....................';
    const endDate = (!isVierge && sData.endDate) ? format(new Date(sData.endDate), 'dd/MM/yyyy') : (isVierge ? '.....................' : 'Indéterminée');
    const vol = (!isVierge && sData.volumeHoraire) ? sData.volumeHoraire : 'Conforme au planning officiel';
    const sal = (!isVierge && sData.salaire) ? sData.salaire : 'Selon la grille indiciaire';
    const postDisplay = isVierge ? '....................................' : beneficiaryRole;

    writeRichParagraph([
      { text: "Article 1 - Engagement : L'employé(e) est engagé(e) sous contrat " },
      { text: typeContrat, bold: true, italic: true },
      { text: " au poste de " },
      { text: postDisplay, bold: !isVierge, italic: !isVierge },
      { text: "." }
    ], 2.8);

    writeRichParagraph([
      { text: "Article 2 - Durée : Le présent contrat prend effet le " },
      { text: startDate, bold: !isVierge && Boolean(sData.startDate), italic: !isVierge && Boolean(sData.startDate) },
      { text: " et se terminera le " },
      { text: endDate, bold: !isVierge, italic: !isVierge },
      { text: "." }
    ], 2.8);

    writeRichParagraph([
      { text: "Article 3 - Volume horaire : Le temps de travail est fixé à " },
      { text: vol, bold: !isVierge && Boolean(sData.volumeHoraire), italic: !isVierge && Boolean(sData.volumeHoraire) },
      { text: "." }
    ], 2.8);

    writeRichParagraph([
      { text: "Article 4 - Rémunération : Rémunération fixée à " },
      { text: sal, bold: !isVierge && Boolean(sData.salaire), italic: !isVierge && Boolean(sData.salaire) },
      { text: "." }
    ], 2.8);

    writeParagraph(`Article 5 - Obligations : Respect scrupuleux du règlement intérieur et des directives pédagogiques.`, 2.8);

  } else if (data.type === 'fiche_mission') {
    writeParagraph(`L'Établissement ${schoolName} confie une mission officielle à :`);

    const nomAffiche = isVierge ? 'M. / Mme ................................................................................' : `M. / Mme ${beneficiaryNom} ${beneficiaryPrenom} - ${beneficiaryRole}`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: nomAffiche, bold: !isVierge, italic: !isVierge },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : [])
    ], 3.5);

    const startDate = (!isVierge && sData.startDate) ? format(new Date(sData.startDate), 'dd/MM/yyyy') : '.....................';
    const endDate = (!isVierge && sData.endDate) ? format(new Date(sData.endDate), 'dd/MM/yyyy') : '.....................';
    const objet = (!isVierge && sData.objet) ? sData.objet : '................................................................................';
    const lieu = (!isVierge && sData.lieu) ? sData.lieu : '............................................................';
    const transport = (!isVierge && sData.moyenTransport) ? sData.moyenTransport : 'Véhicule de service / Transport en commun';
    const frais = (!isVierge && sData.frais === 'non') ? 'À la charge du missionnaire' : 'Prise en charge intégrale par l\'établissement';

    writeRichParagraph([
      { text: "• Objet de la mission : " },
      { text: objet, bold: !isVierge && Boolean(sData.objet), italic: !isVierge && Boolean(sData.objet) }
    ], 2.8);

    writeRichParagraph([
      { text: "• Lieu de destination : " },
      { text: lieu, bold: !isVierge && Boolean(sData.lieu), italic: !isVierge && Boolean(sData.lieu) }
    ], 2.8);

    writeRichParagraph([
      { text: "• Période : du " },
      { text: startDate, bold: !isVierge && Boolean(sData.startDate), italic: !isVierge && Boolean(sData.startDate) },
      { text: " au " },
      { text: endDate, bold: !isVierge && Boolean(sData.endDate), italic: !isVierge && Boolean(sData.endDate) }
    ], 2.8);

    writeRichParagraph([
      { text: "• Moyen de transport : " },
      { text: transport, bold: !isVierge && Boolean(sData.moyenTransport), italic: !isVierge && Boolean(sData.moyenTransport) }
    ], 2.8);

    writeRichParagraph([
      { text: "• Prise en charge des frais : " },
      { text: frais, bold: !isVierge, italic: !isVierge }
    ], 2.8);

    writeParagraph("Les autorités civiles et militaires sont priées de faciliter l'accomplissement de cette mission.", 3.2);

  } else if (data.type === 'attestation_stage') {
    writeParagraph(`La Direction de ${schoolName} certifie que le/la stagiaire :`);

    const nomAffiche = isVierge ? 'M. / Mme ................................................................................' : `M. / Mme ${beneficiaryNom} ${beneficiaryPrenom}`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: nomAffiche, bold: !isVierge, italic: !isVierge },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : [])
    ], 3.5);

    const startDate = (!isVierge && sData.startDate) ? format(new Date(sData.startDate), 'dd/MM/yyyy') : '.....................';
    const endDate = (!isVierge && sData.endDate) ? format(new Date(sData.endDate), 'dd/MM/yyyy') : '.....................';
    const service = (!isVierge && sData.service) ? sData.service : 'Département Pédagogique';

    writeRichParagraph([
      { text: "A effectué avec succès un stage pratique au sein du service : " },
      { text: service, bold: !isVierge && Boolean(sData.service), italic: !isVierge && Boolean(sData.service) },
      { text: "." }
    ], 3.0);

    writeRichParagraph([
      { text: "Période de stage : du " },
      { text: startDate, bold: !isVierge && Boolean(sData.startDate), italic: !isVierge && Boolean(sData.startDate) },
      { text: " au " },
      { text: endDate, bold: !isVierge && Boolean(sData.endDate), italic: !isVierge && Boolean(sData.endDate) },
      { text: "." }
    ], 3.0);

    writeParagraph("Durant cette période, le/la stagiaire a démontré de solides compétences techniques et un excellent esprit de collaboration.", 3.0);
    writeParagraph("La présente attestation est délivrée pour valoir ce que de droit.", 3.0);

  } else if (data.type === 'autorisation_absence') {
    writeParagraph(`La Direction de ${schoolName} accorde par la présente une autorisation d'absence à :`);

    const nomAffiche = isVierge ? 'M. / Mme ................................................................................' : `M. / Mme ${beneficiaryNom} ${beneficiaryPrenom} (${beneficiaryRole})`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: nomAffiche, bold: !isVierge, italic: !isVierge },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : [])
    ], 3.5);

    const startDate = (!isVierge && sData.startDate) ? format(new Date(sData.startDate), 'dd/MM/yyyy') : '.....................';
    const endDate = (!isVierge && sData.endDate) ? format(new Date(sData.endDate), 'dd/MM/yyyy') : '.....................';
    const motif = (!isVierge && (sData.motifAbsence || sData.contenu)) ? (sData.motifAbsence || sData.contenu) : '................................................................................';

    writeRichParagraph([
      { text: "Période autorisée : du " },
      { text: startDate, bold: !isVierge && Boolean(sData.startDate), italic: !isVierge && Boolean(sData.startDate) },
      { text: " au " },
      { text: endDate, bold: !isVierge && Boolean(sData.endDate), italic: !isVierge && Boolean(sData.endDate) },
      { text: "." }
    ], 3.0);

    writeRichParagraph([
      { text: "Motif de l'absence : " },
      { text: motif, bold: !isVierge && Boolean(sData.motifAbsence || sData.contenu), italic: !isVierge && Boolean(sData.motifAbsence || sData.contenu) },
      { text: "." }
    ], 3.0);

    writeParagraph("L'intéressé(e) est tenu(e) de reprendre ses fonctions dès l'expiration de cette période.", 3.0);

  } else {
    // Document personnalisé
    writeParagraph(`Document officiel délivré à :`);
    const nomAffiche = isVierge ? 'M. / Mme ................................................................................' : `M. / Mme ${beneficiaryNom} ${beneficiaryPrenom} (${beneficiaryRole})`;
    const matAffiche = isVierge ? '' : (sData.matricule ? ` (Matricule : ${sData.matricule})` : '');
    
    writeRichParagraph([
      { text: nomAffiche, bold: !isVierge, italic: !isVierge },
      ...(matAffiche ? [{ text: matAffiche, bold: true, italic: true, color: [220, 38, 38] as [number, number, number] }] : [])
    ], 3.5);

    if (sData.contenu && !isVierge) {
      writeParagraph(sData.contenu, 3.2);
    } else {
      writeParagraph("Le présent document administratif officiel est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.", 3.2);
    }
  }

  // ==================== 5. BLOC SIGNATURES & QR AUTHENTIFICATION (GARANTI 1 SEULE PAGE) ====================
  // On place le bloc signature entre Y = 236 et Y = 270 (toujours sur la page 1)
  curY = Math.max(curY + 6, pageHeight - 56);
  if (curY > pageHeight - 50) {
    curY = pageHeight - 50;
  }

  // Signature Bénéficiaire / Intéressé(e) à gauche
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("L'Intéressé(e) / Le Titulaire", margin + 6, curY);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.text("(Lu et approuvé)", margin + 6, curY + 4);

  // QR Code d'Authentification Officielle au Centre
  try {
    const docTitle = DOCUMENT_LABELS[data.type] || 'Document Administratif';
    const qrDataUrl = await generateQRCodeDataUrl({
      docType: data.type as any,
      docTitle: docTitle,
      reference: refNumber,
      schoolName: schoolName,
      beneficiaryNom: isVierge ? 'Document en blanc' : (data.nom || beneficiaryNom),
      beneficiaryPrenom: isVierge ? '' : (data.prenom || beneficiaryPrenom),
      matricule: sData.matricule || '',
      classe: sData.classe || '',
      anneeScolaire: sData.anneeScolaire || '',
      dateEmission: issueDateFormatted,
      signataire: signNom || signTitre
    }, { size: 160, margin: 0 });

    if (qrDataUrl) {
      const qrSize = 16;
      const qrX = pageWidth / 2 - qrSize / 2;
      const qrY = curY - 3;
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("SCAN D'AUTHENTICITÉ", pageWidth / 2, qrY + qrSize + 2.5, { align: 'center' });
      doc.setFontSize(4.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("Vérification numérique", pageWidth / 2, qrY + qrSize + 4.5, { align: 'center' });
    }
  } catch (qrErr) {
    console.warn("QR code generation error for administrative document:", qrErr);
  }

  // Signature Direction à droite
  const signataireTitreComplet = signTitre;
  const signataireNomAffiche = (signNom && !signNom.includes('...')) ? signNom : '';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`Pour ${schoolName}`, pageWidth - margin - 45, curY, { align: 'center' });
  doc.text(signataireTitreComplet, pageWidth - margin - 45, curY + 4, { align: 'center' });
  if (signataireNomAffiche) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(signataireNomAffiche, pageWidth - margin - 45, curY + 8, { align: 'center' });
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("[Cachet & Signature]", pageWidth - margin - 45, curY + (signataireNomAffiche ? 16 : 13), { align: 'center' });

  // Bas de page avec numéro d'authenticité et instruction de vérification
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Document officiel certifié • Réf. Administrative : ${refNumber} • Scannez le QR Code pour vérifier l'authenticité`, pageWidth / 2, pageHeight - 12, { align: 'center' });

  return doc;
};

const DOCUMENT_LABELS: Record<string, string> = {
  certificat_scolarite: 'Certificat de Scolarité',
  certificat_travail: 'Certificat de Travail',
  contrat_travail: 'Contrat de Travail',
  attestation_travail: 'Attestation de Travail',
  attestation_frequentation: 'Attestation de Fréquentation',
  attestation_reussite: 'Attestation de Réussite',
  recommandation: 'Lettre de Recommandation',
  ordre_mission: 'Ordre de Mission',
  fiche_mission: 'Fiche & Ordre de Mission',
  attestation_stage: 'Attestation de Stage',
  autorisation_absence: "Autorisation d'Absence"
};

/**
 * Téléchargement direct 100% robuste sur PC et Mobile
 */
export const downloadDocumentPdfDirectly = async (data: DocumentData, filenameOverride?: string): Promise<void> => {
  try {
    const doc = await generateDocumentPdf(data);
    const fileName = filenameOverride || `${data.type}_${(data.nom || 'Document').replace(/\s+/g, '_')}_${(data.prenom || '').replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
  } catch (err) {
    console.error("Échec de la méthode doc.save(), tentative via Blob:", err);
    try {
      const doc = await generateDocumentPdf(data);
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filenameOverride || `${data.type}_document.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (innerErr) {
      console.error("Échec final du téléchargement PDF:", innerErr);
    }
  }
};
