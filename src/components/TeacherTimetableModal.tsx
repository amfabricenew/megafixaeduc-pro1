import React, { useEffect, useState } from 'react';
import { X, Calendar, Download, Printer, Clock, BookOpen, GraduationCap, User, RefreshCw } from 'lucide-react';
import jsPDF from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { apiFetch } from '../utils/api';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = [
  '07h - 08h', '08h - 09h', '09h - 10h', '10h - 11h',
  '11h - 12h', '12h - 13h', '13h - 14h', '14h - 15h',
  '15h - 16h', '16h - 17h', '17h - 18h', '18h - 19h'
];

const parseHour = (val: string | number): number => {
  if (typeof val === 'number') return val;
  if (!val) return -1;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : -1;
};

const getSlotStartHour = (heure: string): number => {
  const [hStart] = heure.split(' - ');
  return parseHour(hStart);
};

const getCourseForSlot = (courseList: any[], jour: string, heure: string) => {
  const slotStart = getSlotStartHour(heure);
  if (slotStart < 0) return null;
  return courseList?.find((e: any) => {
    if ((e.jour || '').trim().toLowerCase() !== (jour || '').trim().toLowerCase()) return false;
    const cStart = parseHour(e.heure_debut);
    return cStart === slotStart;
  });
};

const getCourseSpanForSlot = (courseList: any[], jour: string, heure: string) => {
  const course = getCourseForSlot(courseList, jour, heure);
  if (!course) return 1;
  const cStart = parseHour(course.heure_debut);
  const cEnd = parseHour(course.heure_fin);
  if (cStart < 0 || cEnd <= cStart) return 1;
  return Math.max(1, cEnd - cStart);
};

const isHourCoveredInList = (courseList: any[], jour: string, heure: string) => {
  const slotStart = getSlotStartHour(heure);
  if (slotStart < 0) return false;
  return courseList?.some((e: any) => {
    if ((e.jour || '').trim().toLowerCase() !== (jour || '').trim().toLowerCase()) return false;
    const cStart = parseHour(e.heure_debut);
    const cEnd = parseHour(e.heure_fin);
    return slotStart > cStart && slotStart < cEnd;
  });
};

interface TeacherTimetableModalProps {
  teacher: any;
  isOpen: boolean;
  onClose: () => void;
  schoolInfo?: any;
}

export function generateTeacherTimetablePDF(teacher: any, slots: any[], schoolInfo?: any, autoPrint = false) {
  if (!teacher) return;
  const doc = new jsPDF('landscape');
  const s = schoolInfo || {};

  if (s.logo) {
    try { doc.addImage(s.logo, 'PNG', 15, 10, 20, 20); } catch (e) {}
  }
  doc.setFontSize(16);
  doc.text(s.nom || 'Établissement Scolaire', 40, 18);
  doc.setFontSize(9);
  doc.text(`${s.adresse || ''} | Tél: ${s.telephone || ''} | Email: ${s.email || ''}`, 40, 24);

  const isPrimaire = teacher.cycle === 'primaire' || teacher.cycle === 'maternelle';
  const isFemme = teacher.sexe === 'F';
  const titlePrefix = isPrimaire ? (isFemme ? 'Maîtresse' : 'Maître') : (isFemme ? 'Professeure' : 'Professeur');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`EMPLOI DU TEMPS INDIVIDUEL (TOUTES CLASSES)`, 148, 35, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`${titlePrefix} ${teacher.nom} ${teacher.prenom} | Discipline: ${teacher.matieres_noms || 'Enseignant'}`, 148, 42, { align: 'center' });

  const tableData: any[] = [];
  HEURES.forEach(heure => {
    const row: any[] = [{ content: heure, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'center', valign: 'middle' } }];
    JOURS.forEach(jour => {
      if (isHourCoveredInList(slots, jour, heure)) return;

      const course = getCourseForSlot(slots, jour, heure);
      const span = getCourseSpanForSlot(slots, jour, heure);

      if (course) {
        row.push({
          content: `${course.matiere_nom || ''}\nClasse: ${course.classe_nom || ''}\n${course.heure_debut} - ${course.heure_fin}`,
          rowSpan: span,
          styles: { 
            fillColor: [224, 231, 255], 
            textColor: [30, 58, 138], 
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle'
          }
        });
      } else {
        row.push({ content: '', styles: { fillColor: [255, 255, 255] } });
      }
    });
    tableData.push(row);
  });

  autoTable(doc, {
    startY: 48,
    head: [['Heure', ...JOURS]],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle' },
    styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
    margin: { left: 10, right: 10 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 42 },
      2: { cellWidth: 42 },
      3: { cellWidth: 42 },
      4: { cellWidth: 42 },
      5: { cellWidth: 42 },
      6: { cellWidth: 42 }
    }
  });

  if (autoPrint) {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(`Emploi_du_temps_${teacher.nom}_${teacher.prenom}.pdf`);
  }
}

export default function TeacherTimetableModal({ teacher, isOpen, onClose, schoolInfo }: TeacherTimetableModalProps) {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [infoSchool, setInfoSchool] = useState<any>(schoolInfo || null);

  useEffect(() => {
    if (isOpen && teacher) {
      setLoading(true);
      apiFetch(`/api/emplois/enseignant/${teacher.id}`)
        .then(res => res.json())
        .then(data => {
          setSlots(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => {
          setSlots([]);
          setLoading(false);
        });

      if (!infoSchool) {
        apiFetch('/api/ecole')
          .then(res => res.json())
          .then(setInfoSchool)
          .catch(() => {});
      }
    }
  }, [isOpen, teacher]);

  if (!isOpen || !teacher) return null;

  const isPrimaire = teacher.cycle === 'primaire' || teacher.cycle === 'maternelle';
  const isFemme = teacher.sexe === 'F';
  const titlePrefix = isPrimaire ? (isFemme ? 'Maîtresse' : 'Maître') : (isFemme ? 'Professeure' : 'Professeur');

  // Group classes assigned to teacher
  const assignedClasses = Array.from(new Set(slots.map(s => s.classe_nom).filter(Boolean)));

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-5xl w-full p-6 md:p-8 shadow-2xl space-y-6 max-h-[90vh] flex flex-col my-auto border border-slate-100">
        
        {/* Modal Header */}
        <div className="flex justify-between items-start border-b pb-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                <Calendar size={22} />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  Emploi du Temps — {titlePrefix} {teacher.nom} {teacher.prenom}
                </h2>
                <p className="text-xs font-semibold text-blue-600">
                  Discipline : {teacher.matieres_noms || 'Enseignant'}
                </p>
              </div>
            </div>
            {assignedClasses.length > 0 && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs font-bold text-slate-500">Classes enseignées :</span>
                <div className="flex flex-wrap gap-1">
                  {assignedClasses.map((cls, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md text-[11px] border">
                      {cls}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => generateTeacherTimetablePDF(teacher, slots, infoSchool, false)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Download size={15} />
              <span>Télécharger PDF</span>
            </button>
            <button
              onClick={() => generateTeacherTimetablePDF(teacher, slots, infoSchool, true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={15} />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body / Timetable Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="animate-spin text-blue-600" size={32} />
              <p className="text-xs font-bold">Chargement du planning de l'enseignant...</p>
            </div>
          ) : slots.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Clock className="mx-auto text-slate-400" size={40} />
              <p className="text-sm font-bold text-slate-700">Aucun créneau d'emploi du temps trouvé</p>
              <p className="text-xs text-slate-500">
                Cet enseignant n'a pas encore de cours attribués dans l'emploi du temps des classes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-center border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-blue-900 text-white text-xs font-bold">
                    <th className="p-3 border-r border-blue-800 w-28">Heure</th>
                    {JOURS.map(j => (
                      <th key={j} className="p-3 border-r border-blue-800 uppercase">{j}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-medium">
                  {HEURES.map((heure, hIdx) => {
                    return (
                      <tr key={hIdx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 bg-slate-50 font-bold text-slate-700 border-r border-slate-200 text-[11px] whitespace-nowrap">
                          {heure}
                        </td>
                        {JOURS.map(jour => {
                          if (isHourCoveredInList(slots, jour, heure)) return null;

                          const course = getCourseForSlot(slots, jour, heure);
                          const span = getCourseSpanForSlot(slots, jour, heure);

                          if (course) {
                            return (
                              <td 
                                key={jour} 
                                rowSpan={span}
                                className="p-1.5 border-r border-b border-slate-200 bg-indigo-50/80 text-indigo-950 font-bold text-left align-top"
                                style={span > 1 ? { height: `${span * 70}px` } : undefined}
                              >
                                <div 
                                  className="p-2.5 bg-white rounded-xl border border-indigo-200 shadow-2xs flex flex-col justify-between h-full"
                                  style={span > 1 ? { minHeight: `${span * 70 - 16}px` } : undefined}
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-indigo-900 font-black text-xs">
                                      <span>{course.matiere_nom}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-blue-700 mt-1">
                                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                                        {course.classe_nom}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-semibold">
                                        {course.heure_debut} - {course.heure_fin}
                                      </span>
                                    </div>
                                  </div>
                                  {span > 1 && (
                                    <div className="mt-2 pt-1 border-t border-indigo-100 flex items-center justify-between text-[10px] text-indigo-600 font-semibold">
                                      <span>Durée : {span}h</span>
                                    </div>
                                  )}
                                </div>
                              </td>
                            );
                          }
                          return (
                            <td key={jour} className="p-2 border-r border-b border-slate-200 text-slate-300">
                              -
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 shrink-0">
          <span>{slots.length} créneau(x) configuré(s) au total sur l'ensemble des classes</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
