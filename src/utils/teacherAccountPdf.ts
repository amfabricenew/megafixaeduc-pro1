import { jsPDF } from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';

export interface TeacherAccountData {
  id?: number | string;
  nom: string;
  prenom: string;
  matricule?: string;
  telephone?: string;
  email?: string;
  matiere?: string;
  matieres_noms?: string;
  classes_noms?: string;
  identifiant?: string;
  username?: string;
  password?: string;
  mot_de_passe_initial?: string;
  role?: string;
  schoolName?: string;
  schoolCode?: string;
  schoolLoginUrl?: string;
}

export function cleanStringForUsername(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Generate PDF for an individual teacher access voucher
 */
export function generateSingleTeacherAccessPdf(
  teacher: TeacherAccountData,
  schoolInfo?: any
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const schoolName = schoolInfo?.nom || teacher.schoolName || 'Établissement Scolaire';
  const schoolCode = schoolInfo?.code_ecole || teacher.schoolCode || `SCH-${schoolInfo?.id || '0001'}`;
  const schoolCity = schoolInfo?.ville || '';
  const schoolPhone = schoolInfo?.telephone || '';
  const schoolEmail = schoolInfo?.email || '';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const loginUrl = teacher.schoolLoginUrl 
    ? (teacher.schoolLoginUrl.startsWith('http') ? teacher.schoolLoginUrl : `${origin}${teacher.schoolLoginUrl}`)
    : `${origin}/login?code=${encodeURIComponent(schoolCode)}`;

  const identifiant = teacher.identifiant || teacher.username || `${cleanStringForUsername(teacher.prenom)}.${cleanStringForUsername(teacher.nom)}`;
  const password = teacher.password || teacher.mot_de_passe_initial || '••••••••';

  // 1. Header with decorative top bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 8, 'F');

  doc.setFillColor(14, 165, 233); // sky-500
  doc.rect(0, 8, 210, 2, 'F');

  // School info & National banner
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolName.toUpperCase(), 14, 22);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const subInfo = [
    schoolCode ? `Code Établissement : ${schoolCode}` : '',
    schoolCity ? `Ville : ${schoolCity}` : '',
    schoolPhone ? `Tél : ${schoolPhone}` : '',
    schoolEmail ? `Email : ${schoolEmail}` : ''
  ].filter(Boolean).join('  |  ');
  doc.text(subInfo, 14, 28);

  // Date and doc badge
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 196, 22, { align: 'right' });
  
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 32, 196, 32);

  // Document Title Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 36, 182, 14, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 36, 182, 14, 3, 3, 'D');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("FICHE OFFICIELLE D'ACCÈS & IDENTIFIANTS ENSEIGNANT", 105, 45, { align: 'center' });

  // Teacher Profile Section
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 55, 182, 34, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 55, 182, 34, 3, 3, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text("1. IDENTITÉ DE L'ENSEIGNANT", 20, 62);

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nom & Prénom :`, 20, 70);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${teacher.nom.toUpperCase()} ${teacher.prenom}`, 55, 70);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Matricule :`, 20, 77);
  doc.setFont('helvetica', 'normal');
  doc.text(teacher.matricule || 'N/A', 55, 77);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Téléphone :`, 20, 84);
  doc.setFont('helvetica', 'normal');
  doc.text(teacher.telephone || 'N/A', 55, 84);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Matière(s) :`, 110, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(teacher.matieres_noms || teacher.matiere || 'Toutes matières / Polyvalent', 135, 70);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Classes :`, 110, 77);
  doc.setFont('helvetica', 'normal');
  doc.text(teacher.classes_noms || 'Selon affectation', 135, 77);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`Rôle :`, 110, 84);
  doc.setFont('helvetica', 'normal');
  doc.text(teacher.role ? teacher.role.toUpperCase() : 'ENSEIGNANT', 135, 84);

  // Credentials Section (High-Contrast Highlighted Box)
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.roundedRect(14, 95, 182, 50, 4, 4, 'F');
  doc.setDrawColor(34, 197, 94); // green-500
  doc.setLineWidth(0.6);
  doc.roundedRect(14, 95, 182, 50, 4, 4, 'D');
  doc.setLineWidth(0.2);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(21, 128, 61); // green-700
  doc.text("2. PARAMÈTRES DE CONNEXION & IDENTIFIANTS SÉCURISÉS", 20, 103);

  // Box for Identifiant
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 108, 84, 28, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(20, 108, 84, 28, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("IDENTIFIANT DE CONNEXION :", 24, 115);

  doc.setFontSize(12);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(identifiant, 24, 126);

  // Box for Mot de Passe
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(108, 108, 82, 28, 2, 2, 'F');
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(108, 108, 82, 28, 2, 2, 'D');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text("MOT DE PASSE INITIAL :", 112, 115);

  doc.setFontSize(12);
  doc.setFont('courier', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(password, 112, 126);

  // School Exclusive Login URL Box
  doc.setFillColor(240, 249, 255); // sky-50
  doc.roundedRect(14, 151, 182, 38, 3, 3, 'F');
  doc.setDrawColor(56, 189, 248); // sky-400
  doc.roundedRect(14, 151, 182, 38, 3, 3, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(3, 105, 161);
  doc.text("3. LIEN DE CONNEXION EXCLUSIF DE L'ÉCOLE", 20, 158);

  doc.setFillColor(255, 255, 255);
  doc.roundedRect(20, 162, 170, 14, 2, 2, 'F');
  doc.setDrawColor(186, 230, 253);
  doc.roundedRect(20, 162, 170, 14, 2, 2, 'D');

  doc.setFontSize(10);
  doc.setFont('courier', 'bold');
  doc.setTextColor(2, 132, 199);
  doc.text(loginUrl, 24, 171);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text("Ce lien ouvre directement la page de connexion rattachée au compte de votre établissement.", 20, 183);

  // Steps / Instructions Section
  doc.setFillColor(254, 243, 199); // amber-100/50
  doc.roundedRect(14, 195, 182, 45, 3, 3, 'F');
  doc.setDrawColor(245, 158, 11); // amber-500
  doc.roundedRect(14, 195, 182, 45, 3, 3, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text("4. GUIDE DE PREMIÈRE CONNEXION ET SÉCURITÉ", 20, 203);

  const instructions = [
    "Étape 1 : Ouvrez le lien de connexion exclusif ci-dessus dans votre navigateur Web.",
    "Étape 2 : Saisissez votre identifiant et votre mot de passe initial indiqués dans l'encadré vert.",
    "Étape 3 : Une fois connecté, vous accédez à votre espace enseignant (classes, notes, cahier de texte).",
    "Étape 4 : MODIFICATION DU MOT DE PASSE : Rendez-vous dans vos 'Paramètres' ou 'Mon Profil' pour",
    "           définir votre mot de passe personnel et sécuriser votre compte."
  ];

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  let instY = 210;
  instructions.forEach(inst => {
    doc.text(inst, 22, instY);
    instY += 6;
  });

  // Footer & Signature
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 248, 196, 248);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text("L'Enseignant (Accusé de réception)", 30, 256);
  doc.text("La Direction de l'Établissement (Cachet & Signature)", 120, 256);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  doc.text("Document officiel strictement confidentiel généré par MégafixaEduc Pro.", 105, 287, { align: 'center' });

  const cleanNom = cleanStringForUsername(teacher.nom) || 'enseignant';
  const cleanPrenom = cleanStringForUsername(teacher.prenom) || 'acces';
  doc.save(`Fiche_Acces_Enseignant_${cleanNom}_${cleanPrenom}.pdf`);
}

/**
 * Generate grouped PDF cards for multiple teachers (2 vouchers per page)
 */
export function generateBatchTeachersAccessPdf(
  teachers: TeacherAccountData[],
  schoolInfo?: any
) {
  if (!teachers || teachers.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const schoolName = schoolInfo?.nom || 'Établissement Scolaire';
  const schoolCode = schoolInfo?.code_ecole || `SCH-${schoolInfo?.id || '0001'}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const defaultLoginUrl = `${origin}/login?code=${encodeURIComponent(schoolCode)}`;

  teachers.forEach((teacher, index) => {
    // 2 vouchers per A4 page
    const isSecondOnPage = index % 2 === 1;
    if (index > 0 && !isSecondOnPage) {
      doc.addPage();
    }

    const startY = isSecondOnPage ? 148 : 8;

    const identifiant = teacher.identifiant || teacher.username || `${cleanStringForUsername(teacher.prenom)}.${cleanStringForUsername(teacher.nom)}`;
    const password = teacher.password || teacher.mot_de_passe_initial || '••••••••';
    const loginUrl = teacher.schoolLoginUrl 
      ? (teacher.schoolLoginUrl.startsWith('http') ? teacher.schoolLoginUrl : `${origin}${teacher.schoolLoginUrl}`)
      : defaultLoginUrl;

    // Voucher Border Container
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(10, startY, 190, 135, 3, 3, 'F');
    doc.setDrawColor(14, 165, 233);
    doc.setLineWidth(0.5);
    doc.roundedRect(10, startY, 190, 135, 3, 3, 'D');
    doc.setLineWidth(0.2);

    // Header strip inside voucher
    doc.setFillColor(15, 23, 42);
    doc.rect(10, startY, 190, 14, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${schoolName.toUpperCase()}  •  PLANCHE D'IDENTIFIANTS ENSEIGNANT`, 15, startY + 9);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Code : ${schoolCode}`, 190, startY + 9, { align: 'right' });

    // Teacher Info Row
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`ENSEIGNANT : ${teacher.nom.toUpperCase()} ${teacher.prenom}`, 15, startY + 23);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    const subInfo = [
      teacher.matricule ? `Matricule : ${teacher.matricule}` : '',
      teacher.matieres_noms || teacher.matiere ? `Matière : ${teacher.matieres_noms || teacher.matiere}` : '',
      teacher.telephone ? `Tél : ${teacher.telephone}` : '',
      `Rôle : ${teacher.role ? teacher.role.toUpperCase() : 'ENSEIGNANT'}`
    ].filter(Boolean).join('   |   ');
    doc.text(subInfo, 15, startY + 29);

    // Credentials Box (Emerald)
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(15, startY + 34, 180, 28, 2, 2, 'F');
    doc.setDrawColor(34, 197, 94);
    doc.roundedRect(15, startY + 34, 180, 28, 2, 2, 'D');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 101, 52);
    doc.text("IDENTIFIANTS DE CONNEXION INDIVIDUELS :", 20, startY + 41);

    // Identifiant sub-box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(20, startY + 44, 82, 14, 1, 1, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(20, startY + 44, 82, 14, 1, 1, 'D');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Identifiant :", 24, startY + 49);
    doc.setFontSize(10);
    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(identifiant, 24, startY + 55);

    // Password sub-box
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(108, startY + 44, 82, 14, 1, 1, 'F');
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(108, startY + 44, 82, 14, 1, 1, 'D');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Mot de passe initial :", 112, startY + 49);
    doc.setFontSize(10);
    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(password, 112, startY + 55);

    // School Login Link Box
    doc.setFillColor(240, 249, 255);
    doc.roundedRect(15, startY + 66, 180, 20, 2, 2, 'F');
    doc.setDrawColor(186, 230, 253);
    doc.roundedRect(15, startY + 66, 180, 20, 2, 2, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161);
    doc.text("LIEN DE CONNEXION EXCLUSIF DE L'ÉTABLISSEMENT :", 20, startY + 72);

    doc.setFontSize(9);
    doc.setFont('courier', 'bold');
    doc.setTextColor(2, 132, 199);
    doc.text(loginUrl, 20, startY + 80);

    // Security & First login Notice
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(15, startY + 89, 180, 22, 2, 2, 'F');
    doc.setDrawColor(251, 191, 36);
    doc.roundedRect(15, startY + 89, 180, 22, 2, 2, 'D');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(146, 64, 14);
    doc.text("IMPORTANT - PREMIÈRE CONNEXION & MODIFICATION DU MOT DE PASSE :", 20, startY + 95);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text("1. Rendez-vous sur le lien exclusif ci-dessus et connectez-vous avec vos identifiants.", 20, startY + 101);
    doc.text("2. Dès votre première connexion, modifiez immédiatement votre mot de passe dans vos paramètres.", 20, startY + 106);

    // Signatures footer inside voucher
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("Signature Enseignant :", 25, startY + 122);
    doc.text("Cachet Direction :", 125, startY + 122);

    // Dotted cutting line between vouchers
    if (!isSecondOnPage) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(5, 145, 205, 145);
      doc.setLineDashPattern([], 0);
    }
  });

  const cleanSchool = cleanStringForUsername(schoolName) || 'etablissement';
  doc.save(`Planche_Identifiants_Enseignants_${cleanSchool}.pdf`);
}
