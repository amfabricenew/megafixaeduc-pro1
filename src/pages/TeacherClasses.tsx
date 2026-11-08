import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Calendar, 
  ClipboardList, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  X,
  ChevronRight,
  BookOpen,
  Users,
  Save,
  Send,
  Loader2,
  FileSpreadsheet,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { formatClassName } from '../utils/format';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirm } from '../contexts/ConfirmContext';

interface ClassItem {
  id: number;
  nom: string;
  niveau: string;
  student_count: number;
}

interface ScheduleItem {
  id: number;
  classe_id: number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  matiere_id: number;
  matiere_nom: string;
  salle_nom: string;
}

export default function TeacherClasses() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [teacher, setTeacher] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'classes' | 'planning' | 'results'>('classes');
  
  // Grade Entry State
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedClassForNotes, setSelectedClassForNotes] = useState<ClassItem | null>(null);
  const [selectedMatiere, setSelectedMatiere] = useState<string>('');
  const [selectedTrimestre, setSelectedTrimestre] = useState<number>(1);
  const [selectedTypeEval, setSelectedTypeEval] = useState<string>('D1');
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [gradesData, setGradesData] = useState<Record<number, string>>({});
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSavingGrades, setIsSavingGrades] = useState(false);

  // Published Results State (Teacher View Only)
  const [publicationsList, setPublicationsList] = useState<any[]>([]);
  const [selectedClassForResults, setSelectedClassForResults] = useState<ClassItem | null>(null);
  const [selectedPeriodForResults, setSelectedPeriodForResults] = useState<string>('1');
  const [publishedResultsData, setPublishedResultsData] = useState<any>(null);
  const [isLoadingPublishedResults, setIsLoadingPublishedResults] = useState(false);

  const isClassPrimary = (c: any): boolean => {
    if (!c) return false;
    const niv = (c.niveau || c.cycle || '').toLowerCase();
    const nom = (c.nom || '').toLowerCase();
    const isPrimKW = ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2", "petite", "moyenne", "grande", "sil", "ps", "ms", "gs", "creche", "prescolaire"].some(l => niv.includes(l) || nom.includes(l));
    return isPrimKW || (user?.cycle || '').toLowerCase().includes('primaire') || (user?.cycle || '').toLowerCase().includes('maternelle');
  };

  const fetchDashboardData = async () => {
    try {
      const res = await apiFetch('/api/teacher/dashboard-data');
      if (res.ok) {
        const json = await res.json();
        setClasses(json.classes || []);
        setSchedule(json.schedule || []);
        setMatieres(json.matieres || []);
        setTeacher(json.teacher);
        if (json.classes && json.classes.length > 0 && !selectedClassForResults) {
          setSelectedClassForResults(json.classes[0]);
        }
      }

      // Fetch publications to know locked periods
      const pubRes = await apiFetch('/api/publications');
      if (pubRes.ok) {
        const pubData = await pubRes.json();
        setPublicationsList(Array.isArray(pubData) ? pubData : []);
      }
    } catch (err) {
      console.error('Error fetching teacher data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublishedResults = async (clsId: number, period: string, isPrim: boolean) => {
    setIsLoadingPublishedResults(true);
    try {
      const q = isPrim 
        ? `classe_id=${clsId}&evaluation=${encodeURIComponent(period)}`
        : `classe_id=${clsId}&trimestre=${encodeURIComponent(period)}`;
      const res = await apiFetch(`/api/teacher/published-results?${q}`);
      if (res.ok) {
        const data = await res.json();
        setPublishedResultsData(data);
      } else {
        setPublishedResultsData(null);
      }
    } catch (err) {
      console.error('Error fetching published results:', err);
      setPublishedResultsData(null);
    } finally {
      setIsLoadingPublishedResults(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'results' && selectedClassForResults) {
      const isPrim = isClassPrimary(selectedClassForResults);
      fetchPublishedResults(selectedClassForResults.id, selectedPeriodForResults, isPrim);
    }
  }, [selectedTab, selectedClassForResults, selectedPeriodForResults]);

  const isSelectedPeriodPublished = React.useMemo(() => {
    if (!selectedClassForNotes) return false;
    const isPrim = isClassPrimary(selectedClassForNotes);
    if (isPrim) {
      return publicationsList.some((p: any) => 
        p.type_periode === 'evaluation' && 
        p.periode_valeur === selectedTypeEval && 
        p.est_publie === 1 && 
        (!p.classe_id || p.classe_id === selectedClassForNotes.id)
      );
    } else {
      return publicationsList.some((p: any) => 
        p.type_periode === 'trimestre' && 
        p.periode_valeur === selectedTrimestre.toString() && 
        p.est_publie === 1 && 
        (!p.classe_id || p.classe_id === selectedClassForNotes.id)
      );
    }
  }, [publicationsList, selectedClassForNotes, selectedTypeEval, selectedTrimestre]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isSecondary = (teacher?.cycle || '').toLowerCase().includes('secondaire');
  const pageTitle = isSecondary ? 'Mes classes' : 'Ma classe';

  const handleOpenNotes = async (cls: ClassItem) => {
    setSelectedClassForNotes(cls);
    setShowGradeModal(true);
    
    // Auto-select first subject taught by this teacher in this class from schedule
    const teacherClassMatieres = schedule
      .filter(s => s.classe_id === cls.id)
      .map(s => ({ id: s.matiere_id, nom: s.matiere_nom }));
    
    // Deduplicate
    const uniqueMatieres = Array.from(new Set(teacherClassMatieres.map(m => m.id)))
      .map(id => teacherClassMatieres.find(m => m.id === id));

    if (uniqueMatieres.length > 0) {
      setSelectedMatiere(uniqueMatieres[0]!.id.toString());
    } else {
      // Fallback to assigned subjects if not in schedule
      const fallback = matieres.filter(m => m.cycle === (teacher?.cycle || 'secondaire'));
      if (fallback.length > 0) {
        setSelectedMatiere(fallback[0].id.toString());
      }
    }
  };

  useEffect(() => {
    if (showGradeModal && selectedClassForNotes && selectedMatiere && selectedTrimestre && selectedTypeEval) {
      const loadStudentsAndExistingNotes = async () => {
        setIsLoadingStudents(true);
        try {
          const res = await apiFetch(`/api/classes/${selectedClassForNotes.id}/details`);
          if (res.ok) {
            const data = await res.json();
            const eleves = Array.isArray(data.eleves) ? data.eleves : [];
            setStudents(eleves);

            // Fetch existing notes for this class and filter client-side for maximum reliability
            const notesRes = await apiFetch(`/api/notes/${selectedClassForNotes.id}`);
            if (notesRes.ok) {
              const allNotes = await notesRes.json();
              
              // Handle aliases for evaluation types client-side
              const getAliases = (type: string) => {
                const t = type.toUpperCase();
                if (t === 'D1' || t === 'DEV1') return ['D1', 'DEV1', 'DEVOIR 1', 'DEVOIR1', 'DEVOIR_1'];
                if (t === 'D2' || t === 'DEV2') return ['D2', 'DEV2', 'DEVOIR 2', 'DEVOIR2', 'DEVOIR_2'];
                if (t === 'COMPOSITION' || t === 'C1') return ['COMPOSITION', 'C1', 'COMPO', 'EXAMEN'];
                if (t === 'I1') return ['I1', 'INT1', 'INTERRO1', 'INTERROGATION 1'];
                if (t === 'I2') return ['I2', 'INT2', 'INTERRO2', 'INTERROGATION 2'];
                if (t === 'I3') return ['I3', 'INT3', 'INTERRO3', 'INTERROGATION 3'];
                if (t === 'I4') return ['I4', 'INT4', 'INTERRO4', 'INTERROGATION 4'];
                return [t];
              };

              const activeAliases = getAliases(selectedTypeEval);
              const targetMatiereId = parseInt(selectedMatiere);

              const filteredNotes = allNotes.filter((n: any) => {
                const noteType = (n.type_evaluation || '').toString().toUpperCase();
                const isCorrectType = activeAliases.some(alias => noteType === alias || noteType.startsWith(`${alias}_`));
                const isCorrectMatiere = parseInt(n.matiere_id) === targetMatiereId;
                const isCorrectTrimestre = parseInt(n.trimestre) === selectedTrimestre;
                return isCorrectType && isCorrectMatiere && isCorrectTrimestre;
              });

              const newGradesData: Record<number, string> = {};
              filteredNotes.forEach((n: any) => {
                // If there are multiple components (e.g. D1_NoteObtenue + D1_NotePerfectionnement), sum them
                const studentId = n.eleve_id;
                const currentNote = parseFloat(newGradesData[studentId] || '0');
                const newNote = n.note !== null ? parseFloat(n.note) : 0;
                
                if (n.type_evaluation?.toString().toUpperCase().includes('_NOTEPERFECTIONNEMENT')) {
                  newGradesData[studentId] = (currentNote + newNote).toString();
                } else if (n.type_evaluation?.toString().toUpperCase().includes('_NOTEOBTENUE')) {
                  newGradesData[studentId] = (currentNote + newNote).toString();
                } else {
                  newGradesData[studentId] = n.note !== null ? n.note.toString() : '';
                }
              });
              setGradesData(newGradesData);
            } else {
              setGradesData({});
            }
          }
        } catch (err) {
          console.error('Error loading students:', err);
        } finally {
          setIsLoadingStudents(false);
        }
      };
      loadStudentsAndExistingNotes();
    }
  }, [showGradeModal, selectedClassForNotes, selectedMatiere, selectedTrimestre, selectedTypeEval]);

  const handleGradeChange = (studentId: number, value: string) => {
    // Only allow valid grade input (0-20, up to 2 decimals)
    if (value === '' || (/^\d*[.,]?\d{0,2}$/.test(value) && parseFloat(value.replace(',', '.')) <= 20)) {
      setGradesData(prev => ({ ...prev, [studentId]: value }));
    }
  };

  const handleSaveGrades = async () => {
    if (!selectedMatiere) {
      toast.error('Veuillez sélectionner une matière');
      return;
    }

    setIsSavingGrades(true);
    try {
      const bulkData = Object.entries(gradesData)
        .filter(([_, val]) => val !== '')
        .map(([id, val]) => ({
          eleve_id: parseInt(id),
          notes: [{
            matiere_id: parseInt(selectedMatiere),
            type: selectedTypeEval,
            note: parseFloat(String(val).replace(',', '.'))
          }]
        }));

      if (bulkData.length === 0) {
        toast.error('Veuillez saisir au moins une note');
        setIsSavingGrades(false);
        return;
      }

      const res = await apiFetch('/api/notes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: bulkData,
          trimestre: selectedTrimestre,
          date_evaluation: evalDate,
          enseignant_id: teacher?.id
        })
      });

      if (res.ok) {
        toast.success('Notes enregistrées avec succès');
        setShowGradeModal(false);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (err) {
      console.error('Error saving grades:', err);
      toast.error('Une erreur est survenue');
    } finally {
      setIsSavingGrades(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{pageTitle}</h1>
          <p className="text-slate-500">Gérez vos classes, consultez vos programmes et saisissez les notes.</p>
        </div>

        <div className="flex p-1 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            onClick={() => setSelectedTab('classes')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              selectedTab === 'classes' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Liste des Classes
          </button>
          <button
            onClick={() => setSelectedTab('results')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              selectedTab === 'results' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList size={14} />
            Résultats Publiés
          </button>
          <button
            onClick={() => setSelectedTab('planning')}
            className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
              selectedTab === 'planning' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Mon Emploi du Temps
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedTab === 'classes' ? (
          <motion.div 
            key="classes-grid"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {classes.length > 0 ? (
              classes.map((cls) => {
                const classSchedule = schedule.filter(s => s.classe_id === cls.id);
                // Group by day for the horizontal summary
                const groupedSchedule = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => ({
                  day,
                  slots: classSchedule.filter(s => s.jour === day)
                }));

                return (
                  <motion.div 
                    key={cls.id}
                    className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow"
                  >
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                          <GraduationCap size={28} />
                        </div>
                        <div>
                          <h3 className="text-xl font-extrabold text-slate-900">{formatClassName(cls.nom)}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cls.niveau}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">{cls.student_count} élèves</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300" size={20} />
                    </div>

                    <div className="p-6 flex-1 space-y-6">
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Calendar size={14} className="text-indigo-500" />
                          Programme Hebdomadaire dans cette classe
                        </h4>
                        
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {groupedSchedule.map((group) => (
                            <div key={group.day} className={`p-2 rounded-2xl border text-center transition-all ${
                              group.slots.length > 0 
                                ? 'bg-indigo-50/50 border-indigo-100' 
                                : 'bg-slate-50/30 border-slate-100 opacity-40'
                            }`}>
                              <p className={`text-[10px] font-black uppercase mb-1 ${group.slots.length > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {group.day.substring(0, 3)}
                              </p>
                              {group.slots.length > 0 ? (
                                <div className="space-y-1">
                                  {group.slots.map(s => (
                                    <div key={s.id} className="bg-white rounded-lg p-1.5 shadow-xs border border-indigo-100/50">
                                      <p className="text-[9px] font-extrabold text-indigo-900 leading-tight">{s.matiere_nom}</p>
                                      <p className="text-[8px] text-indigo-400 font-bold mt-0.5">{s.heure_debut}</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-10 flex items-center justify-center">
                                  <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <ClipboardList size={14} className="text-emerald-500" />
                          Détails des créneaux
                        </h4>
                        <div className="space-y-2">
                          {classSchedule.slice(0, 3).map((s) => (
                            <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-600">
                                  <Clock size={14} />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-800">{s.matiere_nom}</p>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                    {s.jour} • {s.heure_debut} - {s.heure_fin}
                                  </p>
                                </div>
                              </div>
                              {s.salle_nom && (
                                <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                                  {s.salle_nom}
                                </span>
                              )}
                            </div>
                          ))}
                          {classSchedule.length > 3 && (
                            <p className="text-[10px] text-center text-slate-400 font-bold italic pt-1">
                              + {classSchedule.length - 3} autres créneaux
                            </p>
                          )}
                          {classSchedule.length === 0 && (
                            <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                              <AlertCircle size={24} className="mx-auto text-slate-200 mb-2" />
                              <p className="text-xs text-slate-400 italic">Aucun cours programmé dans cette classe</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border-t grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button 
                        onClick={() => handleOpenNotes(cls)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-100 hover:scale-[1.02] active:scale-95"
                      >
                        <FileSpreadsheet size={16} />
                        Saisir Notes
                      </button>
                      <button 
                        onClick={() => {
                          setSelectedClassForResults(cls);
                          const isPrim = isClassPrimary(cls);
                          setSelectedPeriodForResults(isPrim ? 'EvalSommative1' : '1');
                          setSelectedTab('results');
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
                      >
                        <ClipboardList size={16} />
                        Résultats
                      </button>
                      <button 
                        onClick={() => navigate(isClassPrimary(cls) ? `/emploi-du-temps-primaire?classeId=${cls.id}` : `/emploi-du-temps?classeId=${cls.id}`)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 shadow-sm"
                      >
                        <Calendar size={16} className="text-indigo-500" />
                        Planning
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="lg:col-span-2 py-20 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner">
                <GraduationCap size={64} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-500 font-bold text-lg">Aucune classe assignée</p>
                <p className="text-sm text-slate-400 mt-1">Contactez l'administration pour configurer vos attributions.</p>
              </div>
            )}
          </motion.div>
        ) : selectedTab === 'results' ? (
          <motion.div 
            key="published-results"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm p-6 sm:p-8 space-y-6"
          >
            {/* Header & Filter Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <ClipboardList className="text-indigo-600" size={24} />
                  Résultats Publiés des Élèves
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Consultez les moyennes officielles par matière et la moyenne générale ou annuelle.
                </p>
              </div>

              {/* Selectors */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Classe</label>
                  <select
                    value={selectedClassForResults?.id || ''}
                    onChange={(e) => {
                      const found = classes.find(c => c.id === parseInt(e.target.value));
                      if (found) {
                        setSelectedClassForResults(found);
                        const isPrim = isClassPrimary(found);
                        setSelectedPeriodForResults(isPrim ? 'EvalSommative1' : '1');
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Période</label>
                  {selectedClassForResults && isClassPrimary(selectedClassForResults) ? (
                    <select
                      value={selectedPeriodForResults}
                      onChange={(e) => setSelectedPeriodForResults(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="EvalSommative1">Évaluation Sommative 1</option>
                      <option value="EvalSommative2">Évaluation Sommative 2</option>
                      <option value="EvalSommative3">Évaluation Sommative 3</option>
                      <option value="EvalSommative4">Évaluation Sommative 4</option>
                      <option value="EvalSommative5">Évaluation Sommative 5</option>
                      <option value="EvalFormative">Évaluation Formative</option>
                    </select>
                  ) : (
                    <select
                      value={selectedPeriodForResults}
                      onChange={(e) => setSelectedPeriodForResults(e.target.value)}
                      className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1">1er Trimestre</option>
                      <option value="2">2ème Trimestre</option>
                      <option value="3">3ème Trimestre</option>
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Read-Only Notice */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div className="text-xs text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-800">Mode Consultation Seule — Espace Enseignant</p>
                <p>
                  Les résultats publiés sont consultables sous forme de liste des élèves avec leurs moyennes par matière et leur moyenne générale ou annuelle. Conformément aux règles administratives, les enseignants ne peuvent ni modifier les notes, ni télécharger les bulletins.
                </p>
              </div>
            </div>

            {/* Content Table or Empty State */}
            {isLoadingPublishedResults ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                <p className="text-xs font-bold text-slate-500">Chargement des résultats officiels...</p>
              </div>
            ) : !publishedResultsData?.isPublished ? (
              <div className="py-16 text-center bg-slate-50/60 rounded-3xl border border-dashed border-slate-200 space-y-3">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle size={28} />
                </div>
                <h4 className="text-base font-bold text-slate-800">Résultats non publiés</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Les résultats de <strong>{selectedClassForResults?.nom}</strong> pour cette période n'ont pas encore été publiés par la direction de l'établissement.
                </p>
              </div>
            ) : Array.isArray(publishedResultsData?.results) && publishedResultsData.results.length > 0 ? (
              <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 uppercase tracking-wider font-extrabold border-b border-slate-200">
                      <tr>
                        <th rowSpan={2} className="px-4 py-3.5 text-center w-16 border-b border-slate-200">Rang</th>
                        <th rowSpan={2} className="px-4 py-3.5 min-w-[180px] border-b border-slate-200">Élève</th>
                        {(() => {
                          const parents = publishedResultsData.matieres?.filter((m: any) => !m.parent_id) || [];
                          const children = publishedResultsData.matieres?.filter((m: any) => !!m.parent_id) || [];
                          
                          return parents.map((p: any) => {
                            const pChildren = children.filter((c: any) => c.parent_id === p.matiere_id);
                            if (pChildren.length > 0) {
                              return (
                                <th key={p.matiere_id} colSpan={pChildren.length} className="px-3 py-2 text-center border-l border-b border-slate-200 bg-slate-100/50">
                                  <span className="block truncate font-black text-[10px]" title={p.matiere_nom}>{p.matiere_nom}</span>
                                </th>
                              );
                            }
                            return (
                              <th key={p.matiere_id} rowSpan={2} className="px-3 py-3.5 text-center min-w-[90px] border-l border-b border-slate-200">
                                <span className="block truncate" title={p.matiere_nom}>{p.matiere_nom}</span>
                                <span className="text-[10px] text-slate-400 font-normal">coeff {p.coefficient || 1}</span>
                              </th>
                            );
                          });
                        })()}
                        <th rowSpan={2} className="px-4 py-3.5 text-center bg-indigo-50/50 font-bold text-indigo-900 min-w-[100px] border-b border-slate-200">
                          Moyenne
                        </th>
                        {publishedResultsData.trimestre === 3 && (
                          <th rowSpan={2} className="px-4 py-3.5 text-center bg-teal-50/50 font-bold text-teal-900 min-w-[110px] border-b border-slate-200">
                            Moy. Annuelle
                          </th>
                        )}
                      </tr>
                      <tr className="bg-white text-slate-500 font-bold text-[9px]">
                        {(() => {
                          const parents = publishedResultsData.matieres?.filter((m: any) => !m.parent_id) || [];
                          const children = publishedResultsData.matieres?.filter((m: any) => !!m.parent_id) || [];
                          
                          return parents.flatMap((p: any) => {
                            const pChildren = children.filter((c: any) => c.parent_id === p.matiere_id);
                            if (pChildren.length > 0) {
                              return pChildren.map((c: any) => (
                                <th key={c.matiere_id} className="px-2 py-1.5 text-center border-l border-slate-200 min-w-[80px]">
                                  <span className="block truncate" title={c.matiere_nom}>{c.matiere_nom}</span>
                                  <span className="text-[8px] opacity-70">coeff {c.coefficient || 1}</span>
                                </th>
                              ));
                            }
                            return [];
                          });
                        })()}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {publishedResultsData.results.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 text-center font-extrabold text-slate-500">
                            {r.rang ? (
                              <span className={`px-2 py-0.5 rounded-lg text-xs ${
                                r.rang === 1 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                              }`}>
                                {r.rang}
                              </span>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-800">{r.nom} {r.prenom}</p>
                            <p className="text-[11px] font-mono text-slate-400">{r.matricule || '—'}</p>
                          </td>
                          {(() => {
                             const parents = publishedResultsData.matieres?.filter((m: any) => !m.parent_id) || [];
                             const children = publishedResultsData.matieres?.filter((m: any) => !!m.parent_id) || [];
                             
                             return parents.flatMap((p: any) => {
                               const pChildren = children.filter((c: any) => c.parent_id === p.matiere_id);
                               if (pChildren.length > 0) {
                                 return pChildren.map((c: any) => {
                                   const moy = r.moyennes_matieres?.[c.matiere_id];
                                   return (
                                     <td key={c.matiere_id} className="px-3 py-3 text-center font-bold border-l border-slate-50">
                                       {moy !== undefined && moy !== null ? (
                                         <span className={moy >= 10 ? 'text-slate-800' : 'text-rose-600'}>
                                           {Number(moy).toFixed(2)}
                                         </span>
                                       ) : (
                                         <span className="text-slate-300">—</span>
                                       )}
                                     </td>
                                   );
                                 });
                               } else {
                                 const moy = r.moyennes_matieres?.[p.matiere_id];
                                 return (
                                   <td key={p.matiere_id} className="px-3 py-3 text-center font-bold border-l border-slate-50">
                                     {moy !== undefined && moy !== null ? (
                                       <span className={moy >= 10 ? 'text-slate-800' : 'text-rose-600'}>
                                         {Number(moy).toFixed(2)}
                                       </span>
                                     ) : (
                                       <span className="text-slate-300">—</span>
                                     )}
                                   </td>
                                 );
                               }
                             });
                          })()}
                          <td className="px-4 py-3 text-center bg-indigo-50/30 font-black text-sm border-l border-slate-100">
                            <span className={r.moyenne_generale >= 10 ? 'text-emerald-700' : 'text-rose-600'}>
                              {r.moyenne_generale !== null ? Number(r.moyenne_generale).toFixed(2) : '—'}
                            </span>
                          </td>
                          {publishedResultsData.trimestre === 3 && (
                            <td className="px-4 py-3 text-center bg-teal-50/30 font-black text-sm text-teal-800">
                              {r.moyenne_annuelle !== null ? Number(r.moyenne_annuelle).toFixed(2) : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-medium">Aucun élève trouvé dans cette classe.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="full-schedule"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-[3rem] border border-slate-200/60 shadow-sm overflow-hidden p-8"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Mon Emploi du Temps Hebdomadaire</h3>
                  <p className="text-sm text-slate-500 font-medium">Récapitulatif de tous vos cours par jour</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(classes.some(c => isClassPrimary(c)) ? '/emploi-du-temps-primaire' : '/emploi-du-temps')}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
              >
                Vue Calendrier Détaillée
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map(day => {
                const daySlots = schedule.filter(s => s.jour === day);
                return (
                  <div key={day} className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{day}</h4>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">
                        {daySlots.length} cours
                      </span>
                    </div>

                    <div className="space-y-2">
                      {daySlots.length > 0 ? (
                        daySlots.map(slot => (
                          <div key={slot.id} className="p-4 bg-slate-50 border border-slate-100 rounded-[1.5rem] hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-2">
                              <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{slot.matiere_nom}</p>
                              <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                                {slot.heure_debut} - {slot.heure_fin}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                                <GraduationCap size={12} className="text-slate-400" />
                                {slot.classe_nom}
                              </p>
                              {slot.salle_nom && (
                                <p className="text-[10px] font-bold text-slate-400 italic">Salle : {slot.salle_nom}</p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center border-2 border-dashed border-slate-50 rounded-[1.5rem]">
                          <p className="text-[10px] text-slate-400 italic font-bold">Aucun cours</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grade Entry Modal */}
      <AnimatePresence>
        {showGradeModal && selectedClassForNotes && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Saisie des notes : {formatClassName(selectedClassForNotes.nom)}</h2>
                    <p className="text-xs text-slate-500 font-medium">Trimestre {selectedTrimestre} • {selectedTypeEval}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowGradeModal(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {isSelectedPeriodPublished && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800">
                    <AlertCircle size={20} className="shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs font-bold">Période verrouillée : Résultats officiellement publiés</p>
                      <p className="text-[11px] text-amber-700">
                        Cette période a été publiée par la direction. Les notes sont verrouillées en consultation seule et ne peuvent plus être modifiées.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Matière</label>
                    <select
                      value={selectedMatiere}
                      onChange={(e) => setSelectedMatiere(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm"
                    >
                      <option value="">Sélectionner</option>
                      {matieres
                        .filter(m => {
                          if (!selectedClassForNotes) return false;
                          // Show only subjects the teacher teaches in this class (from schedule)
                          return schedule.some(s => s.classe_id === selectedClassForNotes.id && s.matiere_id === m.id);
                        })
                        .map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Trimestre</label>
                    <select
                      value={selectedTrimestre}
                      onChange={(e) => setSelectedTrimestre(parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm"
                    >
                      <option value={1}>1er Trimestre</option>
                      <option value={2}>2ème Trimestre</option>
                      <option value={3}>3ème Trimestre</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Type d'éval.</label>
                    <select
                      value={selectedTypeEval}
                      onChange={(e) => setSelectedTypeEval(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm"
                    >
                      <option value="I1">Interrogation 1 (I1)</option>
                      <option value="I2">Interrogation 2 (I2)</option>
                      <option value="I3">Interrogation 3 (I3)</option>
                      <option value="I4">Interrogation 4 (I4)</option>
                      <option value="D1">Devoir 1 (D1)</option>
                      <option value="D2">Devoir 2 (D2)</option>
                      <option value="Composition">Composition</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">Date d'éval.</label>
                    <input
                      type="date"
                      value={evalDate}
                      onChange={(e) => setEvalDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-indigo-500 font-bold shadow-sm"
                    />
                  </div>
                </div>

                {isLoadingStudents ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500">Chargement de la liste des élèves...</p>
                  </div>
                ) : students.length > 0 ? (
                  <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                          <th className="px-6 py-4">Matricule</th>
                          <th className="px-6 py-4">Nom & Prénoms</th>
                          <th className="px-6 py-4 w-40 text-center">Note (/20)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {students.map((s) => (
                          <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-xs font-mono text-slate-500">{s.matricule || '-'}</td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-800">{s.nom} {s.prenom}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center">
                                <input
                                  type="text"
                                  value={gradesData[s.id] || ''}
                                  placeholder="--"
                                  disabled={isSelectedPeriodPublished}
                                  readOnly={isSelectedPeriodPublished}
                                  onChange={(e) => handleGradeChange(s.id, e.target.value)}
                                  className={`w-20 text-center border rounded-xl py-2 text-sm font-black outline-none transition-all ${
                                    isSelectedPeriodPublished
                                      ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                      : 'bg-slate-50 border-slate-200 text-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-500'
                                  }`}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <Users size={48} className="mx-auto text-slate-200 mb-3" />
                    <p className="text-slate-400 italic">Aucun élève trouvé dans cette classe.</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-slate-50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100">
                  <AlertCircle size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-tight">
                    {isSelectedPeriodPublished ? 'Mode lecture seule • Résultats officiels publiés' : 'Saisie en temps réel • Vérifiez avant de valider'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setShowGradeModal(false)}
                    className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Fermer
                  </button>
                  <button 
                    onClick={handleSaveGrades}
                    disabled={isSavingGrades || students.length === 0 || isSelectedPeriodPublished}
                    className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 transition-all"
                  >
                    {isSavingGrades ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSelectedPeriodPublished ? 'Période Verrouillée' : 'Enregistrer les notes'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
