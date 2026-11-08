import React, { useState, useMemo } from 'react';
import { 
  UserX, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  RefreshCw, 
  UserCheck, 
  AlertCircle, 
  Calendar, 
  Phone, 
  Users, 
  FileText, 
  GraduationCap,
  ChevronRight,
  PlusCircle
} from 'lucide-react';
import jsPDF from '../utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';

// Safe date formatter that never throws Invalid Date or RangeError
const formatDateSafe = (dateVal: any, fallback = '-'): string => {
  if (!dateVal) return fallback;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('fr-FR');
  } catch {
    return fallback;
  }
};

interface StudentAbandonListProps {
  eleves: any[];
  classes: any[];
  schoolInfo: any;
  cycle?: 'all' | 'primaire' | 'secondaire';
  onRefresh: () => void;
  onOpenAbandonModal: (student: any) => void;
}

export default function StudentAbandonList({
  eleves,
  classes,
  schoolInfo,
  cycle = 'all',
  onRefresh,
  onOpenAbandonModal
}: StudentAbandonListProps) {
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedMotif, setSelectedMotif] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'grouped' | 'table'>('grouped');

  // Cycle determination helper
  const isPrimaireClass = (c: any) => {
    if (!c) return false;
    const niveau = (c.niveau || '').toLowerCase();
    const nom = (c.nom || '').toLowerCase();
    return (
      niveau.includes('maternelle') ||
      niveau.includes('primaire') ||
      nom.includes('maternelle') ||
      nom.includes('ci') ||
      nom.includes('cp') ||
      nom.includes('ce1') ||
      nom.includes('ce2') ||
      nom.includes('cm1') ||
      nom.includes('cm2')
    );
  };

  // Filter classes according to cycle safely
  const availableClasses = useMemo(() => {
    return (Array.isArray(classes) ? classes : []).filter((c: any) => {
      if (!c) return false;
      if (cycle === 'primaire') return isPrimaireClass(c);
      if (cycle === 'secondaire') return !isPrimaireClass(c);
      return true;
    });
  }, [classes, cycle]);

  // Strict cycle segregation for students safely
  const cycleEleves = useMemo(() => {
    const classList = Array.isArray(classes) ? classes : [];
    return (Array.isArray(eleves) ? eleves : []).filter((e: any) => {
      if (!e) return false;
      const cls = classList.find((c: any) => c && String(c.id) === String(e.classe_id));
      if (cycle === 'primaire') {
        if (cls) return isPrimaireClass(cls);
        const cNom = (e.classe_nom || '').toLowerCase();
        return isPrimaireClass({ nom: cNom, niveau: '' });
      }
      if (cycle === 'secondaire') {
        if (cls) return !isPrimaireClass(cls);
        const cNom = (e.classe_nom || '').toLowerCase();
        return !isPrimaireClass({ nom: cNom, niveau: '' });
      }
      return true;
    });
  }, [eleves, classes, cycle]);

  // Filter students who are in abandon strictly within the current cycle
  const abandonedStudents = useMemo(() => {
    return cycleEleves.filter((e) => Boolean(e && (e.statut_scolaire === 'Abandon' || e.est_abandonne === 1)));
  }, [cycleEleves]);

  // Filtered by selected class, motif and search term
  const filteredStudents = useMemo(() => {
    return abandonedStudents.filter((e) => {
      if (!e) return false;
      const matchClass = selectedClassId === 'all' || String(e.classe_id) === String(selectedClassId);
      const matchMotif = selectedMotif === 'all' || (e.motif_abandon && String(e.motif_abandon).toLowerCase().includes(selectedMotif.toLowerCase()));
      const searchLower = (searchTerm || '').toLowerCase().trim();
      const parentTel = e.tel_parent || e.telephone_parent || '';
      const matchSearch = !searchLower || 
        (e.nom && String(e.nom).toLowerCase().includes(searchLower)) ||
        (e.prenom && String(e.prenom).toLowerCase().includes(searchLower)) ||
        (e.matricule && String(e.matricule).toLowerCase().includes(searchLower)) ||
        (e.classe_nom && String(e.classe_nom).toLowerCase().includes(searchLower)) ||
        (e.nom_parent && String(e.nom_parent).toLowerCase().includes(searchLower)) ||
        (parentTel && String(parentTel).toLowerCase().includes(searchLower));

      return matchClass && matchMotif && matchSearch;
    });
  }, [abandonedStudents, selectedClassId, selectedMotif, searchTerm]);

  // Group by class (only for available classes in this cycle)
  const studentsByClass = useMemo(() => {
    const map: { [classId: string]: { classe: any; students: any[] } } = {};
    
    // Initialize for classes with abandons or all classes if selected
    availableClasses.forEach(c => {
      if (c && (selectedClassId === 'all' || String(c.id) === String(selectedClassId))) {
        map[c.id] = { classe: c, students: [] };
      }
    });

    filteredStudents.forEach(st => {
      if (!st) return;
      const cid = st.classe_id || 'other';
      if (!map[cid]) {
        map[cid] = {
          classe: availableClasses.find(c => c && String(c.id) === String(cid)) || { id: cid, nom: st.classe_nom || 'Classe non assignée', niveau: '' },
          students: []
        };
      }
      map[cid].students.push(st);
    });

    return Object.values(map).filter(group => group && group.classe && group.students && group.students.length > 0);
  }, [filteredStudents, availableClasses, selectedClassId]);

  // KPI calculations for this cycle
  const totalAbandons = abandonedStudents.length;
  const totalElevesGlobal = cycleEleves.length;
  const tauxAbandon = totalElevesGlobal > 0 ? ((totalAbandons / totalElevesGlobal) * 100).toFixed(1) : '0';
  const garconsAbandons = abandonedStudents.filter(e => e.sexe === 'M' || e.sexe === 'Masculin').length;
  const fillesAbandons = abandonedStudents.filter(e => e.sexe === 'F' || e.sexe === 'Féminin').length;

  // Most impacted class in this cycle
  const classCounts: { [name: string]: number } = {};
  abandonedStudents.forEach(e => {
    const cName = e.classe_nom || 'Inconnue';
    classCounts[cName] = (classCounts[cName] || 0) + 1;
  });
  let maxImpactedClass = '-';
  let maxImpactedCount = 0;
  Object.entries(classCounts).forEach(([name, cnt]) => {
    if (cnt > maxImpactedCount) {
      maxImpactedCount = cnt;
      maxImpactedClass = `${name} (${cnt})`;
    }
  });

  // Export PDF Officiel
  const handleExportPDF = () => {
    if (filteredStudents.length === 0) {
      toast.error("Aucun élève en abandon à exporter");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const schoolName = schoolInfo?.nom || 'ÉTABLISSEMENT SCOLAIRE';
      const schoolAddress = schoolInfo?.adresse || '';
      const schoolPhone = schoolInfo?.telephone || '';
      const anneeScolaire = schoolInfo?.annee_scolaire_active || 'Année Scolaire en cours';

      // Header background
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 297, 35, 'F');
      
      // Top accent line
      doc.setFillColor(225, 29, 72); // Rose/Red
      doc.rect(0, 0, 297, 4, 'F');

      // School Info
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(schoolName.toUpperCase(), 14, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${schoolAddress} | Tél: ${schoolPhone}`, 14, 22);

      // Title & Badge on the right
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(225, 29, 72);
      
      const cycleSuffix = cycle === 'secondaire' ? ' - SECONDAIRE' : cycle === 'primaire' ? ' - PRIMAIRE / MATERNELLE' : '';
      const title = selectedClassId === 'all' 
        ? `REGISTRE DES ABANDONS SCOLAIRES${cycleSuffix}` 
        : `REGISTRE DES ABANDONS - CLASSE DE ${availableClasses.find(c => String(c.id) === String(selectedClassId))?.nom || ''}`.toUpperCase();
      doc.text(title, 297 - 14, 16, { align: 'right' });

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Année: ${anneeScolaire} | Édité le: ${new Date().toLocaleDateString('fr-FR')}`, 297 - 14, 22, { align: 'right' });

      // Summary sub-bar
      doc.setFillColor(254, 242, 242);
      doc.roundedRect(14, 38, 269, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(159, 18, 57);
      doc.text(`EFFECTIF EN ABANDON : ${filteredStudents.length} élève(s)  |  Garçons : ${filteredStudents.filter(e => e.sexe === 'M' || e.sexe === 'Masculin').length}  |  Filles : ${filteredStudents.filter(e => e.sexe === 'F' || e.sexe === 'Féminin').length}`, 18, 45);

      // Table preparation
      const tableData = filteredStudents.map((st, index) => {
        const parentPhone = st.tel_parent || st.telephone_parent || '';
        const parentContact = st.nom_parent ? `${st.nom_parent} (${parentPhone || 'Sans tél'})` : (parentPhone || '-');
        return [
          index + 1,
          st.matricule || '-',
          `${st.nom || ''} ${st.prenom || ''}`.toUpperCase(),
          st.sexe || '-',
          st.classe_nom || '-',
          formatDateSafe(st.date_abandon, '-'),
          st.motif_abandon || 'Non spécifié',
          parentContact
        ];
      });

      autoTable(doc, {
        head: [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Classe', 'Date Abandon', 'Motif Déclaré', 'Contact Parent / Tuteur']],
        body: tableData,
        startY: 54,
        theme: 'grid',
        headStyles: {
          fillColor: [225, 29, 72],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
          halign: 'center'
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 2.5,
          textColor: [30, 41, 59]
        },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 26, halign: 'center' },
          2: { cellWidth: 55, fontStyle: 'bold' },
          3: { cellWidth: 14, halign: 'center' },
          4: { cellWidth: 28, halign: 'center' },
          5: { cellWidth: 26, halign: 'center' },
          6: { cellWidth: 50 },
          7: { cellWidth: 60 }
        },
        alternateRowStyles: {
          fillColor: [255, 241, 242]
        }
      });

      // Signatures at the end
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < 185) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Le Professeur Principal / Surveillant Général", 25, finalY);
        doc.text("La Direction de l'Établissement", 200, finalY);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("(Signature & Date)", 25, finalY + 15);
        doc.text("(Signature & Cachet)", 200, finalY + 15);
      }

      doc.save(`Liste_Eleves_Abandons_${cycle}_${selectedClassId === 'all' ? 'Toutes_Classes' : 'Classe'}_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Document PDF généré avec succès !");
    } catch (e: any) {
      console.error("PDF generation error:", e);
      toast.error("Erreur lors de la génération du document");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-rose-50 to-red-100/60 p-5 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Total Abandons</span>
            <span className="p-2 bg-rose-200/80 rounded-xl text-rose-800">
              <UserX className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-950">{totalAbandons}</span>
            <span className="text-xs font-medium text-rose-700">({tauxAbandon}% des inscrits)</span>
          </div>
          <p className="text-[11px] text-rose-600/90 mt-1">Élèves ayant interrompu leur scolarité</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Garçons en abandon</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{garconsAbandons}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalAbandons > 0 ? `${((garconsAbandons / totalAbandons) * 100).toFixed(0)}% du total des abandons` : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filles en abandon</span>
            <span className="p-2 bg-pink-50 text-pink-600 rounded-xl">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <div className="text-3xl font-black text-slate-800">{fillesAbandons}</div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalAbandons > 0 ? `${((fillesAbandons / totalAbandons) * 100).toFixed(0)}% du total des abandons` : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Classe la plus touchée</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <GraduationCap className="w-5 h-5" />
            </span>
          </div>
          <div className="text-xl font-bold text-slate-800 truncate" title={maxImpactedClass}>
            {maxImpactedClass}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Nécessite une attention particulière</p>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class selector */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <GraduationCap className="w-4 h-4 text-slate-500" />
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Toutes les classes ({abandonedStudents.length})</option>
              {availableClasses.map((c) => {
                const countInClass = abandonedStudents.filter(st => String(st.classe_id) === String(c.id)).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.nom} {countInClass > 0 ? `(${countInClass} abandon${countInClass > 1 ? 's' : ''})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Motif filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={selectedMotif}
              onChange={(e) => setSelectedMotif(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Tous les motifs</option>
              <option value="Déménagement">Déménagement</option>
              <option value="Santé">Santé / Maladie</option>
              <option value="Financier">Difficultés financières</option>
              <option value="Travail">Travail / Emploi</option>
              <option value="Familial">Raisons familiales</option>
              <option value="Autre">Autre motif</option>
            </select>
          </div>

          {/* Search input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par élève, matricule..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          {/* View toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('grouped')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'grouped' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Par Classe
            </button>
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tableau Global
            </button>
          </div>

          <button
            onClick={onRefresh}
            title="Actualiser la liste"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {filteredStudents.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserX className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">Aucun élève en abandon trouvé</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm || selectedClassId !== 'all' || selectedMotif !== 'all'
              ? "Aucun résultat ne correspond à vos filtres actuels. Essayez de réinitialiser la recherche."
              : "Excellente nouvelle ! Aucun abandon n'a été enregistré pour le moment."}
          </p>
          {(searchTerm || selectedClassId !== 'all' || selectedMotif !== 'all') && (
            <button
              onClick={() => {
                setSelectedClassId('all');
                setSelectedMotif('all');
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition-all"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      ) : activeTab === 'grouped' ? (
        /* Grouped by Class View */
        <div className="space-y-6">
          {studentsByClass.map(({ classe, students }) => (
            <div key={classe.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Class Header Banner */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{classe.nom}</h3>
                    <p className="text-xs text-slate-500">
                      Niveau: {classe.niveau || 'Général'} | {students.length} élève{students.length > 1 ? 's' : ''} en abandon
                    </p>
                  </div>
                </div>

                <span className="px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full border border-rose-200">
                  {students.length} Abandon{students.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Student Cards in Grid */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-sm">
                            {st.photo ? (
                              <img src={st.photo} alt={st.nom} className="w-full h-full object-cover" />
                            ) : (
                              <span>{st.nom?.charAt(0) || 'E'}</span>
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm leading-snug">
                              {st.nom} {st.prenom}
                            </h4>
                            <span className="text-[11px] font-mono text-slate-500">
                              Mat: {st.matricule || 'N/A'} • Sexe: {st.sexe || '-'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded-md">
                          Abandon
                        </span>
                      </div>

                      {/* Abandonment Details */}
                      <div className="space-y-1.5 my-3 text-xs bg-white p-3 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-3.5 h-3.5 text-rose-500" />
                          <span>Date : <strong>{formatDateSafe(st.date_abandon, 'Non renseignée')}</strong></span>
                        </div>
                        <div className="flex items-start gap-2 text-slate-600">
                          <FileText className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                          <span>Motif : <strong className="text-slate-800">{st.motif_abandon || 'Non spécifié'}</strong></span>
                        </div>
                        {(st.tel_parent || st.telephone_parent || st.nom_parent) && (
                          <div className="flex items-center gap-2 text-slate-600 pt-1 border-t border-slate-100">
                            <Phone className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Parent : {st.nom_parent || 'Tuteur'} ({st.tel_parent || st.telephone_parent || 'Sans tél'})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => onOpenAbandonModal(st)}
                      className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Enregistrer Reprise / Réintégrer</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 text-center">N°</th>
                  <th className="py-3.5 px-4">Élève & Matricule</th>
                  <th className="py-3.5 px-4 text-center">Classe</th>
                  <th className="py-3.5 px-4 text-center">Sexe</th>
                  <th className="py-3.5 px-4 text-center">Date Abandon</th>
                  <th className="py-3.5 px-4">Motif d'abandon</th>
                  <th className="py-3.5 px-4">Contact Parent</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 text-center text-xs font-bold text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                          {st.photo ? (
                            <img src={st.photo} alt={st.nom} className="w-full h-full object-cover" />
                          ) : (
                            <span>{st.nom?.charAt(0) || 'E'}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{st.nom} {st.prenom}</div>
                          <div className="text-[11px] font-mono text-slate-400">{st.matricule || 'N/A'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg text-xs font-bold">
                        {st.classe_nom}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs font-semibold">
                      {st.sexe || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-700 font-medium">
                      {formatDateSafe(st.date_abandon, '-')}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-rose-700">
                      {st.motif_abandon || 'Non spécifié'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {st.nom_parent ? (
                        <div>
                          <div>{st.nom_parent}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{st.tel_parent || st.telephone_parent || '-'}</div>
                        </div>
                      ) : (
                        <span>{st.tel_parent || st.telephone_parent || '-'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onOpenAbandonModal(st)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white font-bold text-xs rounded-xl border border-emerald-200 transition-all cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Réintégrer</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
