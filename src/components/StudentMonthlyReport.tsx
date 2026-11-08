import React from 'react';
import { 
  FileText, Download, Printer, Calendar, Users, Percent, CheckCircle2, 
  XCircle, Clock, AlertTriangle, RefreshCw, BarChart2
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { jsPDF } from '../utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { getPrimaryColor, hexToRgb } from '../utils/theme';
import { toast } from 'react-hot-toast';

interface StudentMonthlyReportProps {
  classes: any[];
  schoolInfo: any;
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function StudentMonthlyReport({ classes, schoolInfo, cycle = 'all' }: StudentMonthlyReportProps) {
  const [selectedClasseId, setSelectedClasseId] = React.useState<string>('');
  const [selectedMonth, setSelectedMonth] = React.useState<string>(() => {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  });
  const [reportData, setReportData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  // Filter classes according to cycle safely
  const availableClasses = React.useMemo(() => {
    return (Array.isArray(classes) ? classes : []).filter((c: any) => {
      if (!c) return false;
      const niveau = (c.niveau || '').toLowerCase();
      const nom = (c.nom || '').toLowerCase();
      const isPrimaire = (
        niveau.includes('maternelle') ||
        niveau.includes('primaire') ||
        nom.includes('maternelle') ||
        nom.includes('ci') || nom.includes('cp') ||
        nom.includes('ce1') || nom.includes('ce2') ||
        nom.includes('cm1') || nom.includes('cm2')
      );
      if (cycle === 'primaire') return isPrimaire;
      if (cycle === 'secondaire') return !isPrimaire;
      return true;
    });
  }, [classes, cycle]);

  React.useEffect(() => {
    if (availableClasses.length > 0 && !selectedClasseId) {
      setSelectedClasseId(String(availableClasses[0].id));
    }
  }, [availableClasses, selectedClasseId]);

  const fetchMonthlyReport = React.useCallback(async () => {
    if (!selectedClasseId || !selectedMonth) return;
    setIsLoading(true);

    try {
      const res = await apiFetch(`/api/suivi-eleves/bilan-mensuel?classe_id=${selectedClasseId}&mois=${selectedMonth}`);
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        toast.error(data.error || "Erreur lors de la récupération du bilan mensuel");
      }
    } catch (err) {
      console.error("Error fetching monthly report:", err);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  }, [selectedClasseId, selectedMonth]);

  React.useEffect(() => {
    fetchMonthlyReport();
  }, [fetchMonthlyReport]);

  // Overall Statistics computation
  const overallStats = React.useMemo(() => {
    if (!reportData || !reportData.elevesStats) return null;
    const list = reportData.elevesStats;
    const totalStudents = list.length;
    const totalDaysRecorded = reportData.totalDaysCount || 0;

    let sumPresences = 0;
    let sumAbsJustifiees = 0;
    let sumAbsInjustifiees = 0;
    let sumRetards = 0;
    let abandonCount = 0;

    list.forEach((st: any) => {
      if (st.statut_scolaire === 'Abandon') abandonCount++;
      sumPresences += st.presences || 0;
      sumAbsJustifiees += st.absencesJustifiees || 0;
      sumAbsInjustifiees += st.absencesInjustifiees || 0;
      sumRetards += st.retards || 0;
    });

    const activeStudents = totalStudents - abandonCount;
    const totalPossibleAttendances = activeStudents * totalDaysRecorded;
    const globalAttendanceRate = totalPossibleAttendances > 0 
      ? Math.round(((sumPresences + sumRetards) / totalPossibleAttendances) * 100)
      : (totalDaysRecorded === 0 ? 100 : 0);

    return {
      totalStudents,
      activeStudents,
      abandonCount,
      totalDaysRecorded,
      sumPresences,
      sumAbsJustifiees,
      sumAbsInjustifiees,
      totalAbsences: sumAbsJustifiees + sumAbsInjustifiees,
      sumRetards,
      globalAttendanceRate
    };
  }, [reportData]);

  // PDF Generation function
  const handleExportPDF = () => {
    if (!reportData || !overallStats) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const primaryColor = getPrimaryColor();
      const rgb = hexToRgb(primaryColor);
      const s = reportData.school || schoolInfo;
      const c = reportData.classe;

      const [year, month] = selectedMonth.split('-');
      const monthNames = [
        "Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
      ];
      const monthLabel = `${monthNames[parseInt(month, 10) - 1]} ${year}`;

      // 1. Header
      if (s?.logo) {
        try {
          doc.addImage(s.logo, 'PNG', 14, 12, 22, 22);
        } catch (e) {
          // ignore logo error
        }
      }

      doc.setFontSize(14);
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(s?.nom || 'ÉTABLISSEMENT SCOLAIRE', 40, 18);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      if (s?.adresse || s?.telephone) {
        doc.text(`${s.adresse || ''} | Tél: ${s.telephone || 'N/A'} | Email: ${s.email || 'N/A'}`, 40, 24);
      }
      doc.text("RÉPUBLIQUE DU BÉNIN - MINISTÈRE DE L'ENSEIGNEMENT", 40, 29);

      doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
      doc.setLineWidth(0.4);
      doc.line(14, 36, 196, 36);

      // 2. Title Box
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 40, 182, 20, 3, 3, 'F');

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("RAPPORT MENSUEL DE FRÉQUENTATION & SUIVI DES ÉLÈVES", 105, 48, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(`Classe : ${c?.nom || 'N/A'} (${c?.niveau || ''})   |   Période : ${monthLabel.toUpperCase()}`, 105, 55, { align: 'center' });

      // 3. Stats Summary Cards
      const statsY = 64;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70);

      // Box 1: Effectif
      doc.rect(14, statsY, 42, 14);
      doc.text("Effectif total / Actifs", 16, statsY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${overallStats.totalStudents} élèves (${overallStats.activeStudents} actifs)`, 16, statsY + 10);

      // Box 2: Jours ouvrés
      doc.setFont('helvetica', 'normal');
      doc.rect(60, statsY, 42, 14);
      doc.text("Jours enregistrés", 62, statsY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${overallStats.totalDaysRecorded} jours de cours`, 62, statsY + 10);

      // Box 3: Absences
      doc.setFont('helvetica', 'normal');
      doc.rect(106, statsY, 44, 14);
      doc.text("Total Absences (Just/Injust)", 108, statsY + 5);
      doc.setFont('helvetica', 'bold');
      doc.text(`${overallStats.totalAbsences} (${overallStats.sumAbsJustifiees}J / ${overallStats.sumAbsInjustifiees}I)`, 108, statsY + 10);

      // Box 4: Taux global
      doc.setFont('helvetica', 'normal');
      doc.rect(154, statsY, 42, 14);
      doc.text("Taux de présence", 156, statsY + 5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(`${overallStats.globalAttendanceRate}%`, 156, statsY + 10);

      // 4. Students Table
      const tableRows = (reportData.elevesStats || []).map((st: any, idx: number) => {
        return [
          idx + 1,
          st.matricule,
          `${st.nom} ${st.prenom}`,
          st.sexe || 'M',
          st.statut_scolaire === 'Abandon' ? 'ABANDON' : `${st.presences} j`,
          st.absencesJustifiees || 0,
          st.absencesInjustifiees || 0,
          st.retards || 0,
          st.statut_scolaire === 'Abandon' ? '-' : `${st.attendanceRate}%`,
          st.statut_scolaire || 'Actif'
        ];
      });

      autoTable(doc, {
        startY: 83,
        head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Prés.', 'Abs. J', 'Abs. IJ', 'Ret.', 'Taux', 'Statut']],
        body: tableRows,
        theme: 'grid',
        headStyles: {
          fillColor: rgb as any,
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: 50
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          1: { halign: 'center', cellWidth: 24, font: 'courier' },
          2: { cellWidth: 50, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 10 },
          4: { halign: 'center', cellWidth: 14 },
          5: { halign: 'center', cellWidth: 14 },
          6: { halign: 'center', cellWidth: 14 },
          7: { halign: 'center', cellWidth: 12 },
          8: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
          9: { halign: 'center', cellWidth: 20 }
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.row.raw[9] === 'Abandon') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 12;

      // Ensure space for signatures
      const pageHeight = doc.internal.pageSize.height;
      const signatureY = finalY > pageHeight - 35 ? pageHeight - 35 : finalY;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30);
      
      doc.text("Le Professeur Principal / Titulaire", 30, signatureY);
      doc.text("Le Directeur des Études / Chef d'Établissement", 120, signatureY);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120);
      doc.text("(Signature & Date)", 30, signatureY + 5);
      doc.text("(Signature & Cachet)", 120, signatureY + 5);

      doc.save(`Rapport_Mensuel_Suivi_${c?.nom || 'Classe'}_${selectedMonth}.pdf`);
      toast.success("Rapport PDF généré et téléchargé avec succès");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Erreur lors de la génération du rapport PDF");
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Classe
            </label>
            <select
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
            >
              {availableClasses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.niveau})
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Calendar size={13} />
              Mois & Année
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            onClick={fetchMonthlyReport}
            disabled={isLoading}
            className="mt-5 p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            title="Actualiser le bilan"
          >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* PDF Export Button */}
        <div>
          <button
            onClick={handleExportPDF}
            disabled={!reportData || !overallStats}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-primary-200 disabled:opacity-50"
          >
            <FileText size={16} />
            Télécharger Rapport Mensuel PDF
          </button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      {overallStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Effectif</span>
              <p className="text-lg font-extrabold text-slate-800">
                {overallStats.totalStudents} <span className="text-xs font-medium text-slate-500">({overallStats.activeStudents} actifs)</span>
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Percent size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taux Présence</span>
              <p className="text-lg font-extrabold text-emerald-600">
                {overallStats.globalAttendanceRate}%
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jours Suivis</span>
              <p className="text-lg font-extrabold text-blue-700">
                {overallStats.totalDaysRecorded} jours
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Absences</span>
              <p className="text-lg font-extrabold text-rose-600">
                {overallStats.totalAbsences} <span className="text-xs font-medium text-slate-400">({overallStats.sumAbsJustifiees}J / {overallStats.sumAbsInjustifiees}IJ)</span>
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Abandons</span>
              <p className="text-lg font-extrabold text-red-600">
                {overallStats.abandonCount}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BarChart2 size={16} className="text-primary-600" />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Récapitulatif Mensuel Individuel par Élève
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {reportData?.datesRecorded?.length || 0} séances enregistrées dans le mois
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-primary-600" size={24} />
            <p className="text-xs font-medium">Calcul du bilan mensuel...</p>
          </div>
        ) : !reportData || !Array.isArray(reportData.elevesStats) || reportData.elevesStats.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic text-xs">
            Aucun enregistrement disponible pour cette classe sur le mois sélectionné.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3.5 w-12 text-center">N°</th>
                  <th className="px-4 py-3.5">Matricule</th>
                  <th className="px-4 py-3.5">Nom & Prénoms</th>
                  <th className="px-4 py-3.5 text-center">Sexe</th>
                  <th className="px-4 py-3.5 text-center">Présences</th>
                  <th className="px-4 py-3.5 text-center">Abs. Justifiées</th>
                  <th className="px-4 py-3.5 text-center">Abs. Injustifiées</th>
                  <th className="px-4 py-3.5 text-center">Retards</th>
                  <th className="px-4 py-3.5 text-center">Taux Mensuel</th>
                  <th className="px-4 py-3.5 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {(reportData.elevesStats || []).map((st: any, idx: number) => {
                  const isAbandon = st.statut_scolaire === 'Abandon';

                  return (
                    <tr 
                      key={st.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isAbandon ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center font-mono text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 font-medium text-[11px]">
                        {st.matricule}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {st.nom} {st.prenom}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {st.sexe}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700">
                        {isAbandon ? '-' : `${st.presences} j`}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-amber-700">
                        {st.absencesJustifiees}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-rose-700">
                        {st.absencesInjustifiees}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-indigo-700">
                        {st.retards}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isAbandon ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full font-extrabold text-[11px] ${
                            st.attendanceRate >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : st.attendanceRate >= 75
                              ? 'bg-blue-100 text-blue-800'
                              : st.attendanceRate >= 50
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {st.attendanceRate}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isAbandon ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {st.statut_scolaire || 'Actif'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
