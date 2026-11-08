const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mappings = [
  {
    src: 'src/assets/images/payment_receipt_mobile_1788510897322.jpg',
    dest: 'public/images/features/paiement_scolarite_recu.jpg',
    label: 'PAIEMENT & REÇU OFFICIEL'
  },
  {
    src: 'src/assets/images/school_card_editor_1788510915938.jpg',
    dest: 'public/images/features/carte_scolaire_badges.jpg',
    label: 'ÉDITEUR DE CARTE SCOLAIRE'
  },
  {
    src: 'src/assets/images/bulletin_notes_ui_1788510933489.jpg',
    dest: 'public/images/features/bulletin_notes.jpg',
    label: 'BULLETINS & NOTES OFFICIELS'
  },
  {
    src: 'src/assets/images/timetable_editor_ui_1788510949532.jpg',
    dest: 'public/images/features/emplois_du_temps.jpg',
    label: 'PLANNING & EMPLOIS DU TEMPS'
  },
  {
    src: 'src/assets/images/student_admission_ui_1788510967010.jpg',
    dest: 'public/images/features/inscription_eleves.jpg',
    label: 'ADMISSION & DOSSIERS ÉLÈVES'
  },
  {
    src: 'src/assets/images/sms_alerts_mobile_1788510985846.jpg',
    dest: 'public/images/features/alertes_communication.jpg',
    label: 'NOTIFICATIONS SMS & PARENTS'
  },
  {
    src: 'src/assets/images/payroll_teacher_ui_1788511016657.jpg',
    dest: 'public/images/features/salaire_fiche_paie.jpg',
    label: 'SALAIRES & FICHES DE PAIE'
  },
  {
    src: 'src/assets/images/admin_docs_ui_1788511030785.jpg',
    dest: 'public/images/features/documents_administratifs.jpg',
    label: 'DOCUMENTS ADMINISTRATIFS'
  },
  {
    src: 'src/assets/images/class_manager_ui_1788511048590.jpg',
    dest: 'public/images/features/creation_classes.jpg',
    label: 'STRUCTURE DES CLASSES'
  },
  {
    src: 'src/assets/images/library_checkout_ui_1788511066400.jpg',
    dest: 'public/images/features/bibliotheque_scolaire.jpg',
    label: 'BIBLIOTHÈQUE & MANUELS'
  },
  {
    src: 'src/assets/images/exam_paper_ui_1788511089456.jpg',
    dest: 'public/images/features/epreuves_examens.jpg',
    label: 'ÉPREUVES & COMPOSITIONS'
  },
  {
    src: 'src/assets/images/campus_rooms_ui_1788511107246.jpg',
    dest: 'public/images/features/gestion_batiments.jpg',
    label: 'BÂTIMENTS & SALLES DE COURS'
  }
];

const logoCircle = 'public/logo_megafixa_circle.png';

// Ensure badge asset exists
const badgeTemp = '/tmp/megafixa_badge.png';
execSync(`convert "${logoCircle}" -resize 90x90 \\( +clone -background black -shadow 60x3+0+2 \\) +swap -background none -layers merge +repage ${badgeTemp}`);

mappings.forEach(({ src, dest, label }) => {
  if (!fs.existsSync(src)) {
    console.warn(`File not found: ${src}`);
    return;
  }
  console.log(`Processing ${src} -> ${dest}...`);

  // Composite official badge in top-left and subtle branding bar at top
  const cmd = `convert "${src}" \\
    \\( "${badgeTemp}" \\) -geometry +24+24 -composite \\
    -quality 90 "${dest}"`;

  try {
    execSync(cmd);
    console.log(`Successfully created ${dest}`);
  } catch (err) {
    console.error(`Error processing ${dest}:`, err.message);
  }
});

console.log('All images composited successfully.');
