import { jsPDF } from './compressedPdf';
import autoTable from 'jspdf-autotable';
import { generateQRCodeDataUrl } from './qrAuth';

export const generateReceiptPDF = async (payment: any, schoolInfo: any): Promise<jsPDF> => {
    // Format A5 portrait (148mm x 210mm)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a5'
    });

    const p = payment || {};
    const s = schoolInfo || {};
    const pageWidth = doc.internal.pageSize.getWidth(); // ~148mm
    const pageHeight = doc.internal.pageSize.getHeight(); // ~210mm

    // 1. Cadre décoratif extérieur fin (format A5)
    doc.setDrawColor(203, 213, 225); // Slate-300
    doc.setLineWidth(0.35);
    doc.rect(6, 6, pageWidth - 12, pageHeight - 12);

    // Cadre intérieur subtil
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.rect(7.5, 7.5, pageWidth - 15, pageHeight - 15);

    // 2. En-tête de l'établissement
    const headerY = 11;
    let textStartX = 11;

    if (s?.logo) {
      try {
        doc.addImage(s.logo, 'PNG', 11, headerY, 15, 15);
        textStartX = 28;
      } catch (e) {
        console.warn("Logo non chargeable dans le PDF:", e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // Slate-900
    const schoolName = (s?.nom || s?.nom_ecole || 'ÉTABLISSEMENT SCOLAIRE').toUpperCase();
    doc.text(schoolName, textStartX, headerY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105); // Slate-600
    if (s?.slogan) {
      doc.setFont('helvetica', 'italic');
      doc.text(s.slogan, textStartX, headerY + 7.5);
      doc.setFont('helvetica', 'normal');
    }
    const contactLine = `${s?.adresse || 'Adresse de l\'établissement'} ${s?.telephone ? '• Tél: ' + s.telephone : ''}`;
    doc.text(contactLine, textStartX, headerY + 11);
    if (s?.email || s?.site_web) {
      doc.text(`${s?.email || ''} ${s?.site_web ? '• ' + s.site_web : ''}`, textStartX, headerY + 14.5);
    }

    // Ligne de séparation
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.4);
    doc.line(11, 28, pageWidth - 11, 28);

    // 3. Titre du Reçu & Métadonnées
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.roundedRect(11, 31, pageWidth - 22, 13, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(11, 31, pageWidth - 22, 13, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text('REÇU OFFICIEL DE PAIEMENT', 15, 39);

    const receiptNum = p.id ? `REÇU-N°${String(p.id).padStart(5, '0')}` : `REF-${Date.now().toString().slice(-6)}`;
    const dateFormatted = p.date_paiement || new Date().toISOString().split('T')[0];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(receiptNum, pageWidth - 15, 36.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date : ${dateFormatted}`, pageWidth - 15, 41, { align: 'right' });

    // 4. Informations de l'Élève
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('BÉNÉFICIAIRE / ÉLÈVE', 11, 48);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(11, 50, pageWidth - 22, 19, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Nom & Prénoms :', 14, 55);
    doc.text('Matricule :', 14, 60);
    doc.text('Classe :', 14, 65);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const fullName = `${(p.eleve_nom || '').toUpperCase()} ${p.eleve_prenom || ''}`.trim() || 'NON DÉFINI';
    doc.text(fullName.length > 25 ? fullName.substring(0, 24) + '...' : fullName, 37, 55);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(p.eleve_matricule || 'N/A', 37, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(p.eleve_classe || 'N/A', 37, 65);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Mode de règlement :', 78, 55);
    doc.text('Année Scolaire :', 78, 60);
    doc.text('Statut :', 78, 65);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text(p.methode || 'Espèces', 104, 55);
    doc.text(s.annee_active || s.active_year || '2025-2026', 104, 60);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text('Encaissé & Validé', 104, 65);

    let currentY = 72;
    if (p.numero_adherent) {
      doc.setFillColor(238, 242, 255); // indigo-50
      doc.roundedRect(11, 71, pageWidth - 22, 6, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(79, 70, 229); // indigo-600
      doc.text(`CODE ADHÉRENT BIBLIOTHÈQUE : ${p.numero_adherent} (Adhésion active - Valable 1 an)`, 14, 75);
      doc.setTextColor(15, 23, 42);
      currentY = 79;
    }

    // 5. Tableau des détails du paiement (largeur totale adaptée à A5 : 126 mm)
    const amountVal = parseInt(p.montant || 0);
    const formatAmount = (val: number) => {
      return new Intl.NumberFormat('de-DE').format(val);
    };
    const amountFormatted = `${formatAmount(amountVal)} FCFA`;

    let motifDescription = '';
    if (p.type_paiement === 'Adhésion Bibliothèque') {
      motifDescription = p.numero_adherent ? `Carte Adhérent N° ${p.numero_adherent}` : 'Abonnement / Accès annuel';
    } else if (p.annee_concernee_libelle) {
      motifDescription = `Année concernée : ${p.annee_concernee_libelle} (${p.eleve_classe || 'Classe'})`;
    } else if (p.tranche) {
      motifDescription = `${p.tranche} (${p.eleve_classe || 'Classe'})`;
    } else {
      motifDescription = `Paiement régulier - ${p.eleve_classe || 'Classe'}`;
    }

    const designationOperation = p.annee_concernee_libelle 
      ? `Arriérés de scolarité (${p.annee_concernee_libelle})`
      : (p.type_paiement || 'Frais de scolarité');

    autoTable(doc, {
      startY: currentY,
      margin: { left: 11, right: 11 },
      head: [['Désignation de l\'opération', 'Période / Tranche / Motif', 'Montant Encaissé']],
      body: [
        [
          designationOperation, 
          motifDescription, 
          amountFormatted
        ]
      ],
      theme: 'grid',
      headStyles: { 
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 52, fontStyle: 'bold' },
        1: { cellWidth: 44 },
        2: { cellWidth: 30, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        textColor: [30, 41, 59]
      }
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 92;

    // 6. Récapitulatif & Reste à Payer (format A5)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(11, finalY + 3, pageWidth - 22, 23, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(11, finalY + 3, pageWidth - 22, 23, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);

    const resteScol = p.reste_scolarite !== undefined ? `${formatAmount(Number(p.reste_scolarite))} FCFA` : '0 FCFA';
    const resteInsc = p.reste_inscription !== undefined ? `${formatAmount(Number(p.reste_inscription))} FCFA` : '0 FCFA';
    const inscStatus = p.inscription_payee ? 'SOLDE PAYÉ' : 'RELIQUAT À PAYER';

    doc.text('Reste à solder (Scolarité) :', 14, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(p.reste_scolarite > 0 ? 225 : 16, p.reste_scolarite > 0 ? 29 : 185, p.reste_scolarite > 0 ? 72 : 129);
    doc.text(resteScol, 50, finalY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Reste à solder (Inscription) :', 14, finalY + 13.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(p.reste_inscription > 0 ? 225 : 16, p.reste_inscription > 0 ? 29 : 185, p.reste_inscription > 0 ? 72 : 129);
    doc.text(resteInsc, 50, finalY + 13.5);

    const arrieresVal = Number(p.reste_arrieres ?? p.arrieres_anterieurs ?? p.eleve_arrieres ?? 0);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Arriérés années antérieures :', 14, finalY + 19);
    doc.setFont('helvetica', 'bold');
    if (arrieresVal > 0) {
      doc.setTextColor(225, 29, 72); // rose-600
      doc.text(`${formatAmount(arrieresVal)} FCFA`, 50, finalY + 19);
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text('0 FCFA (AUCUN)', 50, finalY + 19);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Frais d\'inscription :', 76, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(p.inscription_payee ? 16 : 217, p.inscription_payee ? 185 : 119, p.inscription_payee ? 129 : 6);
    doc.text(inscStatus, 104, finalY + 8);

    // Adhésion Bibliothèque status / dette
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Adhésion Bibliothèque :', 76, finalY + 13.5);
    doc.setFont('helvetica', 'bold');
    const resteBiblio = Number(p.reste_bibliotheque || 0);
    if (p.numero_adherent || p.est_adherent_bibliotheque || resteBiblio > 0 || p.type_paiement === 'Adhésion Bibliothèque') {
      if (resteBiblio > 0) {
        doc.setTextColor(225, 29, 72); // rose-600
        doc.text(`DETTE: ${formatAmount(resteBiblio)} FCFA`, 104, finalY + 13.5);
      } else {
        doc.setTextColor(16, 185, 129); // emerald-600
        doc.text('COTISATION SOLDÉE', 104, finalY + 13.5);
      }
    } else {
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('Non inscrit', 104, finalY + 13.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Observation :', 76, finalY + 19);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    const obsText = p.note ? (p.note.length > 20 ? p.note.substring(0, 19) + '...' : p.note) : 'Règlement validé';
    doc.text(obsText, 104, finalY + 19);

    // =========================================================================
    // 7. ZONE D'AUTHENTIFICATION AVEC CODE QR & SIGNATURE OFFICIELLE (A5)
    // =========================================================================
    const authBoxY = finalY + 29;

    // Génération du QR code d'authentification
    let qrDataUrl = '';
    try {
      qrDataUrl = await generateQRCodeDataUrl({
        docType: 'recu_paiement',
        docTitle: 'Reçu Officiel de Paiement',
        reference: receiptNum,
        schoolName: s.nom || s.nom_ecole || 'Établissement Scolaire',
        beneficiaryNom: p.eleve_nom,
        beneficiaryPrenom: p.eleve_prenom,
        matricule: p.eleve_matricule,
        classe: p.eleve_classe,
        montant: amountVal,
        dateEmission: dateFormatted,
        signataire: 'Service de la Comptabilité et Caisse'
      }, { size: 160, margin: 0 });
    } catch (e) {
      console.warn("Erreur génération QR Code:", e);
    }

    // Bloc QR Code à gauche
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(11, authBoxY, 56, 26, 1.5, 1.5, 'S');

    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, 'PNG', 13, authBoxY + 2, 22, 22);
      } catch (e) {
        console.warn("Erreur injection QR image:", e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text('AUTHENTIFICATION', 37, authBoxY + 6.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Scannez pour vérifier', 37, authBoxY + 10.5);
    doc.text('la validité du reçu.', 37, authBoxY + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(16, 185, 129);
    doc.text('Sceau Sécurisé', 37, authBoxY + 21);

    // Bloc Signature Caisse à droite
    doc.roundedRect(71, authBoxY, pageWidth - 82, 26, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('Pour l\'Établissement / La Caisse', pageWidth - 14, authBoxY + 6.5, { align: 'right' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('[Cachet & Signature]', pageWidth - 14, authBoxY + 21, { align: 'right' });

    // 8. Pied de page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(`Document officiel infalsifiable • Réf : ${receiptNum} • Émis le ${dateFormatted}`, pageWidth / 2, pageHeight - 9, { align: 'center' });

    return doc;
};

/**
 * Télécharge de façon robuste le reçu au format A5 (148mm x 210mm)
 * Compatible navigateurs de bureau, mobiles et iFrames
 */
export const downloadReceiptPDF = async (
  paymentOrDoc: any, 
  schoolInfo?: any, 
  customFilename?: string
): Promise<void> => {
  let doc: jsPDF;
  let p: any = {};
  
  if (paymentOrDoc instanceof jsPDF || (paymentOrDoc && typeof paymentOrDoc.save === 'function')) {
    doc = paymentOrDoc;
  } else {
    p = paymentOrDoc || {};
    doc = await generateReceiptPDF(p, schoolInfo);
  }

  const safeName = `${p.eleve_nom || ''}_${p.eleve_prenom || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_') || 'Eleve';
  const defaultFilename = p.annee_concernee_libelle 
    ? `Recu_A5_Arrieres_${p.annee_concernee_libelle}_${safeName}_${p.id || Date.now()}.pdf`
    : `Recu_A5_Paiement_${safeName}_${p.id || Date.now()}.pdf`;
  const filename = customFilename || defaultFilename;

  // Méthode prioritaire : Téléchargement direct via Blob (évite les blocages d'iFrame)
  try {
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  } catch (blobErr) {
    console.warn("Échec du téléchargement blob, repli sur doc.save():", blobErr);
    doc.save(filename);
  }
};

/**
 * Impression sécurisée du reçu A5 sans utiliser window.open bloqué en iframe
 */
export const printReceiptPDF = async (paymentOrDoc: any, schoolInfo?: any): Promise<void> => {
  let doc: jsPDF;
  if (paymentOrDoc instanceof jsPDF || (paymentOrDoc && typeof paymentOrDoc.save === 'function')) {
    doc = paymentOrDoc;
  } else {
    doc = await generateReceiptPDF(paymentOrDoc, schoolInfo);
  }

  doc.autoPrint();
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.warn("Erreur impression iframe:", e);
    }
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60000);
  };
};


