import { jsPDF } from '@/src/utils/compressedPdf';
import { generateSingleCardImageDataUrl } from './cardImageGenerator';

export interface CardPdfItem {
  elementId: string;
  title?: string;
  subtitle?: string;
  filename?: string;
  nom?: string;
  prenom?: string;
  matricule?: string;
  classe?: string;
}

export interface PdfExportOptions {
  mode?: 'grouped_8_a4' | 'single_a4';
  showCropMarks?: boolean;
  showDashedBorders?: boolean;
  showCutBorder?: boolean;
  showPageHeaders?: boolean;
  includePageHeader?: boolean;
  showDimensionsLabel?: boolean;
  schoolName?: string;
  groupTitle?: string;
  academicYear?: string;
  quality?: number; // 0.85 to 1.0
}

export interface PdfProgressInfo {
  percent: number;
  current: number;
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Draws professional printer crop marks (repères de coupe) around a card rectangle
 */
function drawCardCropMarks(
  doc: jsPDF, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  markLength = 4, 
  offset = 1.5
) {
  // Set thin lines in slate gray
  doc.setDrawColor(100, 116, 139); // #64748b
  doc.setLineWidth(0.18);
  doc.setLineDashPattern([], 0); // Solid line

  // Top-Left Corner
  doc.line(x - offset - markLength, y, x - offset, y); // Horizontal left
  doc.line(x, y - offset - markLength, x, y - offset); // Vertical top

  // Top-Right Corner
  doc.line(x + w + offset, y, x + w + offset + markLength, y); // Horizontal right
  doc.line(x + w, y - offset - markLength, x + w, y - offset); // Vertical top

  // Bottom-Left Corner
  doc.line(x - offset - markLength, y + h, x - offset, y + h); // Horizontal left
  doc.line(x, y + h + offset, x, y + h + offset + markLength); // Vertical bottom

  // Bottom-Right Corner
  doc.line(x + w + offset, y + h, x + w + offset + markLength, y + h); // Horizontal right
  doc.line(x + w, y + h + offset, x + w, y + h + offset + markLength); // Vertical bottom
}

/**
 * Draws subtle dashed cutting guides around a card
 */
function drawDashedBorder(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(203, 213, 225); // #cbd5e1
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1.5, 1.5], 0);
  doc.rect(x, y, w, h);
  doc.setLineDashPattern([], 0); // Reset dash
}

/**
 * Generates a Single Card PDF on standard A4 page (centered with official dimensions and crop marks)
 */
export async function generateSingleCardPdf(
  elementId: string,
  filename: string,
  options: PdfExportOptions = {}
): Promise<void> {
  const {
    showCropMarks = true,
    showDashedBorders = true,
    showCutBorder = true,
    showPageHeaders = true,
    includePageHeader = true,
    showDimensionsLabel = true,
    schoolName = 'ÉTABLISSEMENT SCOLAIRE',
    groupTitle = 'CARTE SCOLAIRE OFFICIELLE',
    academicYear = '2025-2026',
    quality = 0.96
  } = options;

  const shouldShowHeader = showPageHeaders && includePageHeader;
  const shouldShowBorders = showDashedBorders || showCutBorder;

  // 1. Capture HD DataURL of the card (300 DPI)
  const imgData = await generateSingleCardImageDataUrl(elementId, 'jpeg', quality);

  // 2. Create A4 Portrait PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;

  // Standard Card dimensions in mm (ISO/CEI 7810 ID-1: 85.60 × 53.98 mm)
  const cardWidth = 85;
  const cardHeight = 54.5;

  // Center on A4 page
  const x = (pageWidth - cardWidth) / 2;
  const y = 80; // Placed at comfortable optical center

  // Header banner on A4
  if (shouldShowHeader) {
    // School Name & Doc Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // #0f172a
    doc.text(schoolName.toUpperCase(), pageWidth / 2, 25, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105); // #475569
    doc.text(`${groupTitle} — Année Scolaire : ${academicYear}`, pageWidth / 2, 31, { align: 'center' });

    // Decorative separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(25, 36, pageWidth - 25, 36);

    // Instruction pill
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("PLANCHE D'IMPRESSION INDIVIDUELLE (1 CARTE SUR FEUILLE A4)", pageWidth / 2, 45, { align: 'center' });
  }

  // Draw Crop Marks & Border
  if (showCropMarks) {
    drawCardCropMarks(doc, x, y, cardWidth, cardHeight, 5, 2);
  }

  if (shouldShowBorders) {
    drawDashedBorder(doc, x, y, cardWidth, cardHeight);
  }

  // Embed the Card Image at exact millimetric dimensions
  doc.addImage(imgData, 'JPEG', x, y, cardWidth, cardHeight, undefined, 'FAST');

  // Dimensions and Cutting Instructions below card
  if (showDimensionsLabel) {
    const infoY = y + cardHeight + 16;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(30, infoY - 6, pageWidth - 30, infoY - 6);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text("✂ RECOMMANDATIONS POUR L'IMPRESSION & LA DÉCOUPE", pageWidth / 2, infoY, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("• Dimensions réelles de la carte : 85 mm × 54.5 mm (Format Standard ISO/CEI 7810 ID-1)", pageWidth / 2, infoY + 5, { align: 'center' });
    doc.text("• Option d'impression : Dans les options de votre imprimante, sélectionnez « Échelle 100% » ou « Taille réelle ».", pageWidth / 2, infoY + 9, { align: 'center' });
    doc.text("• Découper soigneusement en suivant les repères de coupe situés aux 4 angles.", pageWidth / 2, infoY + 13, { align: 'center' });
  }

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Document généré le ${new Date().toLocaleDateString('fr-FR')} — Système de Gestion Scolaire`, pageWidth / 2, pageHeight - 12, { align: 'center' });

  // Save PDF
  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
}

/**
 * Generates a Batch Cards PDF on A4 pages:
 * - Either grouped 8 cards per page (4 rows × 2 columns)
 * - Or 1 card per page centered
 */
export async function generateBatchCardsPdf(
  items: CardPdfItem[],
  filename: string,
  options: PdfExportOptions = {},
  onProgress?: (progress: PdfProgressInfo) => void
): Promise<void> {
  if (items.length === 0) {
    throw new Error("Aucune carte à inclure dans le fichier PDF.");
  }

  const {
    mode = 'grouped_8_a4',
    showCropMarks = true,
    showDashedBorders = true,
    showCutBorder = true,
    showPageHeaders = true,
    includePageHeader = true,
    showDimensionsLabel = true,
    schoolName = 'ÉTABLISSEMENT SCOLAIRE',
    groupTitle = 'PLANCHE DE CARTES SCOLAIRES',
    academicYear = '2025-2026',
    quality = 0.95
  } = options;

  const shouldShowHeader = showPageHeaders && includePageHeader;
  const shouldShowBorders = showDashedBorders || showCutBorder;

  const pageWidth = 210;
  const pageHeight = 297;
  const cardWidth = 85;
  const cardHeight = 54.5;

  const isSingleMode = mode === 'single_a4';
  const numCols = isSingleMode ? 1 : 2;
  const numRows = isSingleMode ? 1 : 4;
  const cardsPerPage = numCols * numRows; // 8 or 1
  const totalPages = Math.ceil(items.length / cardsPerPage);

  // Grouped Grid: 2 cols x 4 rows
  const colGap = 12;
  const marginLeft = (pageWidth - (numCols * cardWidth + (numCols - 1) * colGap)) / 2;
  const rowGap = 8;
  const marginTop = isSingleMode ? 80 : 26;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const pageIndex = Math.floor(i / cardsPerPage);
    const slotOnPage = i % cardsPerPage;
    const colIndex = slotOnPage % numCols;
    const rowIndex = Math.floor(slotOnPage / numCols);

    // Add new page when starting a new batch page
    if (i > 0 && slotOnPage === 0) {
      doc.addPage();
    }

    // Add Header and Footer on new page
    if (slotOnPage === 0) {
      if (shouldShowHeader) {
        // Top Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(schoolName.toUpperCase(), marginLeft, 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`${groupTitle} (${items.length} cartes au total) • Année ${academicYear}`, marginLeft, 15.5);

        // Right side badge
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(5, 150, 105); // emerald-600
        doc.text(
          isSingleMode ? `CARTE INDIVIDUELLE (85 × 54.5 mm)` : `8 CARTES / FEUILLE A4 (85 × 54.5 mm)`,
          pageWidth - marginLeft,
          11,
          { align: 'right' }
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Page ${pageIndex + 1} sur ${totalPages}`, pageWidth - marginLeft, 15.5, { align: 'right' });

        // Header thin line
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.4);
        doc.line(marginLeft, 19, pageWidth - marginLeft, 19);
      }

      // Page Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Impression standard A4 (Échelle 100%) • Découper suivant les repères de coupe aux 4 angles • Page ${pageIndex + 1}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      );

      // Single card mode additional instructions
      if (isSingleMode && showDimensionsLabel) {
        const infoY = marginTop + cardHeight + 18;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.setLineDashPattern([2, 2], 0);
        doc.line(30, infoY - 6, pageWidth - 30, infoY - 6);
        doc.setLineDashPattern([], 0);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text("✂ RECOMMANDATIONS POUR L'IMPRESSION & LA DÉCOUPE", pageWidth / 2, infoY, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`• Carte pour : ${item.title || item.nom || 'Titulaire'} (${item.subtitle || ''})`, pageWidth / 2, infoY + 5, { align: 'center' });
        doc.text("• Dimensions réelles : 85 mm × 54.5 mm • Format Standard ISO/CEI 7810 ID-1", pageWidth / 2, infoY + 9, { align: 'center' });
        doc.text("• Option d'impression : Sélectionnez « Échelle 100% » ou « Taille réelle » sans ajustement.", pageWidth / 2, infoY + 13, { align: 'center' });
      }
    }

    // Calculate position for current card
    const cardX = isSingleMode ? (pageWidth - cardWidth) / 2 : marginLeft + colIndex * (cardWidth + colGap);
    const cardY = isSingleMode ? marginTop : marginTop + rowIndex * (cardHeight + rowGap);

    try {
      // Capture card image
      const imgData = await generateSingleCardImageDataUrl(item.elementId, 'jpeg', quality);

      // Draw Crop Marks & Border
      if (showCropMarks) {
        drawCardCropMarks(doc, cardX, cardY, cardWidth, cardHeight, isSingleMode ? 5 : 3.5, isSingleMode ? 2 : 1.2);
      }

      if (shouldShowBorders) {
        drawDashedBorder(doc, cardX, cardY, cardWidth, cardHeight);
      }

      // Place image into PDF
      doc.addImage(imgData, 'JPEG', cardX, cardY, cardWidth, cardHeight, undefined, 'FAST');
    } catch (err) {
      console.error(`Erreur lors de l'intégration de la carte ${item.elementId} au PDF:`, err);
    }

    // Update progress
    if (onProgress) {
      const percent = Math.round(((i + 1) / items.length) * 100);
      onProgress({
        percent,
        current: i + 1,
        total: items.length,
        page: pageIndex + 1,
        totalPages
      });
    }
  }

  // Save file
  const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(cleanFilename);
}
