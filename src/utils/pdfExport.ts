import jsPDF from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';

export const exportExamResultsToPDF = (sessionName: string, results: any[]) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.text(`Rapport des Résultats: ${sessionName}`, 14, 22);
  
  // Date
  doc.setFontSize(11);
  doc.text(`Généré le: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Table
  const tableColumn = ["Rang", "Candidat", "N° Table", "Classe", "Moyenne"];
  const tableRows = results.map((r, index) => [
    index + 1,
    `${r.nom} ${r.prenom}`,
    r.numero_table,
    r.classe_nom,
    r.moyenne ? r.moyenne.toFixed(2) : '0.00'
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 40,
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] } // indigo-600
  });

  doc.save(`resultats_${sessionName.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

export const exportBulletinPDF = (sessionName: string, student: any, cycle: string) => {
    const doc = new jsPDF();
    const isPrimaire = cycle === 'primaire';
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("BULLETIN D'EXAMEN", 105, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(sessionName, 105, 30, { align: 'center' });
    
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(20, 35, 190, 35);
    
    // Student Info
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text("INFORMATIONS DU CANDIDAT", 20, 45);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Nom & Prénom: ${student.nom} ${student.prenom}`, 20, 52);
    doc.text(`N° Table: ${student.numero_table || 'N/A'}`, 20, 58);
    doc.text(`Classe: ${student.classe_nom}`, 20, 64);
    doc.text(`Cycle: ${isPrimaire ? 'Primaire' : 'Secondaire'}`, 20, 70);

    // Marks Table
    const marksHeaders = [["Matière", "Note / 20", "Coeff.", "Total"]];
    const marksRows = (student.notes || []).map((n: any) => [
        n.matiere_nom,
        n.note !== null ? n.note.toFixed(2) : '—',
        n.coefficient || 1,
        n.note !== null ? (n.note * (n.coefficient || 1)).toFixed(2) : '—'
    ]);

    autoTable(doc, {
        head: marksHeaders,
        body: marksRows,
        startY: 80,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 10, cellPadding: 4 }
    });
    
    // Summary Performance
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    
    doc.setFontSize(11);
    doc.setTextColor(71, 85, 105);
    doc.text("RÉSULTAT GLOBAL", 20, finalY);
    
    const summaryTable = [
        ["Total des points", `${(student.total_points || 0).toFixed(2)} / ${(student.total_coeffs || 0) * 20}`],
        ["Moyenne Générale", `${(student.moyenne || 0).toFixed(2)} / 20`],
        ["Rang", student.rang || 'N/A'],
        ["Décision", (student.moyenne || 0) >= 10 ? 'ADMIS' : 'REFUSÉ']
    ];
    
    autoTable(doc, {
        body: summaryTable,
        startY: finalY + 5,
        margin: { left: 20 },
        tableWidth: 100,
        theme: 'plain',
        styles: { fontSize: 11, cellPadding: 3, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 50, halign: 'right' }
        }
    });

    // Signature Area
    const signatureY = finalY + 50;
    doc.setFontSize(10);
    doc.text("Le Directeur / Chef d'Établissement", 140, signatureY, { align: 'center' });
    doc.text("(Signature & Cachet)", 140, signatureY + 20, { align: 'center' });
    
    const safeNom = (student.nom || '').replace(/\s+/g, '_').toUpperCase();
    const safePrenom = (student.prenom || '').replace(/\s+/g, '_');
    const safeSession = (sessionName || '').replace(/\s+/g, '_');
    
    doc.save(`BULLETIN_${safeSession}.pdf`);
};
