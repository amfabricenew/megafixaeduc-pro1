import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, 
  Users, 
  Hash, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  ChevronRight,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  GraduationCap,
  Calendar,
  Layers,
  ArrowRight,
  Lock,
  Unlock,
  Upload,
  Send,
  X,
  FileSpreadsheet,
  Eye,
  ShieldCheck
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useTranslation } from '../contexts/TranslationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { exportExamResultsToPDF, exportBulletinPDF } from '../utils/pdfExport';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';

interface ExamSession {
  id: number;
  nom: string;
  cycle: string;
  type_examen: 'blanc' | 'officiel';
  trimestre: number;
  annee_id: number;
  date_debut: string;
  date_fin: string;
  statut: 'ouvert' | 'ferme' | 'termine';
  est_publie: number;
  bulletin_telechargeable?: number;
  created_at: string;
}

interface ExamEpreuve {
  id: number;
  titre: string;
  matiere_id: number;
  matiere_nom: string;
  coefficient: number;
}

interface Candidate {
  id: number;
  session_id: number;
  eleve_id: number;
  numero_table: string;
  nom: string;
  prenom: string;
  matricule: string;
  classe_nom: string;
  niveau: string;
}

interface ExamResultNote {
  matiere_id: number;
  matiere_nom: string;
  coefficient: number;
  note: number | null;
}

interface ExamResult {
  eleve_id: number;
  nom: string;
  prenom: string;
  numero_table: string;
  classe_nom: string;
  moyenne: number;
  total_points: number;
  total_coeffs: number;
  rang?: number;
  notes?: ExamResultNote[];
}

interface ExamensProps {
  cycle: 'primaire' | 'secondaire';
}

const Examens: React.FC<ExamensProps> = ({ cycle }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ExamSession | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [matieres, setMatieres] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'sessions' | 'candidates' | 'epreuves' | 'notes' | 'results'>('sessions');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showCandidateSelection, setShowCandidateSelection] = useState(false);
  const [selectedClassForSelection, setSelectedClassForSelection] = useState<number | null>(null);
  const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [allEpreuves, setAllEpreuves] = useState<ExamEpreuve[]>([]);
  const [sessionEpreuveIds, setSessionEpreuveIds] = useState<number[]>([]);
  const [newSession, setNewSession] = useState({
    nom: '',
    type_examen: 'blanc' as const,
    trimestre: 1,
    date_debut: '',
    date_fin: ''
  });
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishBulletinLockOption, setPublishBulletinLockOption] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('');

  const isAdmin = ['admin', 'super_admin', 'direction', 'censeur'].includes(user?.role || '');
  const isTeacher = user?.role === 'enseignant';
  const isParentOrStudent = ['parent', 'eleve'].includes(user?.role || '');

  // Fetch initial data
  useEffect(() => {
    fetchSessions();
    if (isAdmin) {
      fetchClasses();
      fetchMatieres();
    }
  }, [cycle, user]);

  const fetchSessions = async () => {
    try {
      const res = await apiFetch(`/api/examen/sessions?cycle=${cycle}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // If parent, student, or teacher, only show published sessions
          const visibleSessions = (isParentOrStudent || isTeacher) 
            ? data.filter(s => s.est_publie === 1)
            : data;
          setSessions(visibleSessions);
        } else {
          setSessions([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiFetch(`/api/classes?cycle=${cycle}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllEpreuves = async () => {
    try {
      const res = await apiFetch(`/api/epreuves?cycle=${cycle}`);
      if (res.ok) {
        const data = await res.json();
        setAllEpreuves(Array.isArray(data) ? data : []);
      } else {
        setAllEpreuves([]);
      }
    } catch (e) {
      console.error(e);
      setAllEpreuves([]);
    }
  };

  const fetchSessionEpreuves = async (sessionId: number) => {
    try {
      const res = await apiFetch(`/api/examen/sessions/${sessionId}/epreuves`);
      if (res.ok) {
        const data = await res.json();
        setSessionEpreuveIds(Array.isArray(data) ? data.map((e: any) => e.id) : []);
      } else {
        setSessionEpreuveIds([]);
      }
    } catch (e) {
      console.error(e);
      setSessionEpreuveIds([]);
    }
  };

  const fetchMatieres = async () => {
    try {
      const res = await apiFetch(`/api/matieres`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setMatieres(data);
        } else {
          setMatieres([]);
        }
      } else {
        setMatieres([]);
      }
    } catch (e) {
      console.error(e);
      setMatieres([]);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/examen/sessions', {
        method: 'POST',
        body: JSON.stringify({ ...newSession, cycle })
      });
      if (res.ok) {
        setShowNewSessionModal(false);
        fetchSessions();
        setNewSession({ nom: '', type_examen: 'blanc', trimestre: 1, date_debut: '', date_fin: '' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectSession = async (session: ExamSession) => {
    setSelectedSession(session);
    
    if (isParentOrStudent || isTeacher || session.est_publie === 1) {
      setActiveTab('results');
      fetchResults(session.id);
    } else {
      setActiveTab('candidates');
    }

    setIsLoading(true);
    const promises: Promise<any>[] = [fetchCandidates(session.id), fetchSessionEpreuves(session.id)];
    if (isAdmin) {
      promises.push(fetchAllEpreuves());
    }
    await Promise.all(promises);
    setIsLoading(false);
  };

  const fetchCandidates = async (sessionId: number) => {
    try {
      const res = await apiFetch(`/api/examen/sessions/${sessionId}/candidats`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCandidates(data);
        } else {
          setCandidates([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchResults = async (sessionId: number) => {
    try {
      const res = await apiFetch(`/api/examen/sessions/${sessionId}/results`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setResults(data);
        } else {
          setResults([]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const generateTableNumbers = async () => {
    if (!selectedSession) return;
    if (!window.confirm("Générer les numéros de table pour tous les candidats ?")) return;

    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/generate-numbers`, {
        method: 'POST',
        body: JSON.stringify({ prefix: cycle === 'primaire' ? 'P' : 'S', startAt: 1 })
      });
      if (res.ok) {
        fetchCandidates(selectedSession.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const registerAllStudents = async (classIds: number[]) => {
    if (!selectedSession) return;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/candidats/batch`, {
        method: 'POST',
        body: JSON.stringify({ classIds })
      });
      if (res.ok) {
        fetchCandidates(selectedSession.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const removeCandidate = async (candidateId: number) => {
    if (!selectedSession || !window.confirm("Voulez-vous vraiment retirer ce candidat ?")) return;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/candidats/${candidateId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchCandidates(selectedSession.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudentsByClass = async (classId: number) => {
    try {
      const res = await apiFetch(`/api/eleves?classeId=${classId}`);
      if (res.ok) {
        const data = await res.json();
        setStudentsInClass(Array.isArray(data) ? data : []);
      } else {
        setStudentsInClass([]);
      }
    } catch (e) {
      console.error(e);
      setStudentsInClass([]);
    }
  };

  const registerSelectedStudents = async () => {
    if (!selectedSession || selectedStudentIds.length === 0) return;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/candidats/batch-select`, {
        method: 'POST',
        body: JSON.stringify({ eleveIds: selectedStudentIds })
      });
      if (res.ok) {
        setShowCandidateSelection(false);
        setSelectedStudentIds([]);
        fetchCandidates(selectedSession.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const saveSessionEpreuves = async () => {
    if (!selectedSession) return;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/epreuves`, {
        method: 'POST',
        body: JSON.stringify({ epreuveIds: sessionEpreuveIds })
      });
      if (res.ok) {
        alert("Épreuves de session mises à jour !");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const confirmPublishSession = async () => {
    if (!selectedSession) return;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletin_telechargeable: publishBulletinLockOption ? 1 : 0 })
      });
      if (res.ok) {
        toast.success("Résultats d'examen publiés avec succès !");
        setShowPublishModal(false);
        fetchSessions();
        setSelectedSession({
          ...selectedSession,
          est_publie: 1,
          statut: 'termine',
          bulletin_telechargeable: publishBulletinLockOption ? 1 : 0
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la publication");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur de connexion");
    }
  };

  const handleToggleExamBulletinLock = async () => {
    if (!selectedSession) return;
    const newLock = selectedSession.bulletin_telechargeable === 1 ? 0 : 1;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/toggle-bulletin-lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletin_telechargeable: newLock })
      });
      if (res.ok) {
        setSelectedSession({ ...selectedSession, bulletin_telechargeable: newLock });
        fetchSessions();
        toast.success(newLock === 1 
          ? "Téléchargement du relevé d'examen DÉVERROUILLÉ pour les parents" 
          : "Téléchargement du relevé d'examen VERROUILLÉ pour les parents"
        );
      }
    } catch (e: any) {
      toast.error("Erreur lors de la mise à jour du verrouillage");
    }
  };

  const handleUnpublishSession = async () => {
    if (!selectedSession) return;
    if (!window.confirm("Êtes-vous sûr de vouloir dépublier cette session d'examen ? Les parents ne pourront plus consulter les résultats.")) return;
    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/unpublish`, { method: 'POST' });
      if (res.ok) {
        setSelectedSession({ ...selectedSession, est_publie: 0 });
        fetchSessions();
        toast.success("Session d'examen dépubliée.");
      }
    } catch (e: any) {
      toast.error("Erreur lors de la dépublication");
    }
  };

  const [selectedMatiereForNotes, setSelectedMatiereForNotes] = useState<number | null>(null);
  const [notesData, setNotesData] = useState<Record<number, string>>({}); // eleve_id -> note

  const sessionMatieres = useMemo(() => {
    const mids = allEpreuves
      .filter(e => sessionEpreuveIds.includes(e.id))
      .map(e => e.matiere_id);
    const uniqueMids = [...new Set(mids)];
    return matieres.filter(m => uniqueMids.includes(m.id));
  }, [allEpreuves, sessionEpreuveIds, matieres]);

  const fetchExistingNotes = async (sessionId: number, matiereId: number) => {
    try {
      const res = await apiFetch(`/api/examen/sessions/${sessionId}/notes`);
      if (res.ok) {
        const data = await res.json();
        const mapped: Record<number, string> = {};
        const notesArr = Array.isArray(data) ? data : [];
        notesArr.filter((n: any) => n.matiere_id === matiereId).forEach((n: any) => {
          mapped[n.eleve_id] = String(n.note);
        });
        setNotesData(mapped);
      }
    } catch (e) {
      console.error(e);
      setNotesData({});
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedSession || !selectedMatiereForNotes) return;
    
    const notesToSave = Object.entries(notesData).map(([eleveId, note]) => ({
      eleve_id: parseInt(eleveId),
      matiere_id: selectedMatiereForNotes,
      note: parseFloat(note as string) || 0
    }));

    try {
      const res = await apiFetch(`/api/examen/sessions/${selectedSession.id}/notes/batch`, {
        method: 'POST',
        body: JSON.stringify({ notes: notesToSave })
      });
      if (res.ok) {
        toast.success("Notes enregistrées avec succès !");
        if (selectedSession.est_publie === 0) {
          setShowPublishModal(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadNotesTemplate = () => {
    if (!selectedSession || !selectedMatiereForNotes) {
      toast.error("Veuillez sélectionner une matière");
      return;
    }
    const matiere = matieres.find(m => m.id === selectedMatiereForNotes);
    const rows = candidates.map(c => ({
      "N° Table": c.numero_table || '',
      "Matricule": c.matricule || '',
      "Nom": c.nom,
      "Prénom": c.prenom,
      "Classe": c.classe_nom,
      "Matière": matiere?.nom || '',
      "Note / 20": notesData[c.eleve_id] || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Notes");
    XLSX.writeFile(wb, `Notes_Examen_${selectedSession.nom}_${matiere?.nom || 'Matiere'}.xlsx`);
    toast.success("Modèle Excel téléchargé !");
  };

  const handleExcelNotesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const newNotes = { ...notesData };
        let count = 0;
        data.forEach((row: any) => {
          const tableNum = (row["N° Table"] || row["Numero Table"] || row["numero_table"] || row["Table"] || '')?.toString().trim();
          const mat = (row["Matricule"] || row["matricule"] || '')?.toString().trim().toLowerCase();
          const rawNote = row["Note / 20"] ?? row["Note"] ?? row["note"];
          if (rawNote !== undefined && rawNote !== '') {
            const val = parseFloat(rawNote);
            if (!isNaN(val) && val >= 0 && val <= 20) {
              const cand = candidates.find(c => 
                (tableNum && c.numero_table && c.numero_table.trim() === tableNum) ||
                (mat && c.matricule && c.matricule.trim().toLowerCase() === mat)
              );
              if (cand) {
                newNotes[cand.eleve_id] = val.toString();
                count++;
              }
            }
          }
        });
        setNotesData(newNotes);
        toast.success(`${count} note(s) importée(s) depuis le fichier Excel ! Pensez à enregistrer.`);
      } catch (err: any) {
        toast.error("Erreur lors de la lecture du fichier Excel: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const filteredCandidatesForNotes = candidates;

  // Distinct subjects present across results
  const resultSubjects = useMemo(() => {
    const map = new Map<number, { id: number, nom: string, coefficient: number }>();
    results.forEach(r => {
      if (Array.isArray(r.notes)) {
        r.notes.forEach(n => {
          if (n.matiere_id && !map.has(n.matiere_id)) {
            map.set(n.matiere_id, {
              id: n.matiere_id,
              nom: n.matiere_nom,
              coefficient: n.coefficient || 1
            });
          }
        });
      }
    });
    return Array.from(map.values());
  }, [results]);

  const uniqueResultClasses = useMemo(() => {
    return Array.from(new Set(results.map(r => r.classe_nom).filter(Boolean)));
  }, [results]);

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const matchesSearch = !searchQuery || 
        `${r.nom} ${r.prenom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.numero_table && r.numero_table.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesClass = !selectedClassFilter || r.classe_nom === selectedClassFilter;
      return matchesSearch && matchesClass;
    });
  }, [results, searchQuery, selectedClassFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-indigo-600" />
            Espace Examen — {cycle === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire'}
          </h1>
          <p className="text-slate-500">
            {isParentOrStudent 
              ? "Consultez vos résultats d'examens et sessions publiées" 
              : "Gestion des candidats, numéros de table et résultats d'examen"}
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowNewSessionModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nouvelle Session
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sessions Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-indigo-600" />
                Sessions
              </h2>
            </div>
            <div className="p-2 space-y-1">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs italic">
                  {isParentOrStudent ? "Aucun résultat d'examen publié" : "Aucune session créée"}
                </div>
              ) : (
                sessions.map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s)}
                    className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                      selectedSession?.id === s.id 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100 border' 
                        : 'hover:bg-slate-50 text-slate-600 border-transparent border'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">{s.nom}</p>
                        {s.est_publie === 1 && (
                          <span className="bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase">Publié</span>
                        )}
                      </div>
                      <p className="text-[10px] opacity-70 flex items-center gap-1 mt-0.5">
                        <Layers className="w-3 h-3" />
                        T{s.trimestre} • {s.type_examen === 'blanc' ? 'Blanc' : 'Officiel'}
                      </p>
                    </div>
                    <ChevronRight className={`w-4 h-4 transition ${selectedSession?.id === s.id ? 'translate-x-1' : 'opacity-0 group-hover:opacity-100'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div className="lg:col-span-3 space-y-6">
          {!selectedSession ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-4 h-full min-h-[400px]">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <ArrowRight className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-bold text-slate-900">Sélectionnez une session</h3>
                <p className="text-slate-500 text-sm mt-1">Choisissez une session dans la barre latérale pour gérer les candidats et les résultats.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Session Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Candidats</p>
                    <p className="text-2xl font-bold text-slate-900">{candidates.length}</p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Hash className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">N° Table</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {candidates.filter(c => !!c.numero_table).length} / {candidates.length}
                    </p>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Notes Saisies</p>
                    <p className="text-2xl font-bold text-slate-900">Calcul en cours...</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex border-b border-slate-100">
                  {isAdmin && (
                    <>
                      <button 
                        onClick={() => setActiveTab('candidates')}
                        className={`flex-1 py-4 text-sm font-semibold border-b-2 transition ${activeTab === 'candidates' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                        Candidats & N° Table
                      </button>
                      <button 
                        onClick={() => setActiveTab('epreuves')}
                        className={`flex-1 py-4 text-sm font-semibold border-b-2 transition ${activeTab === 'epreuves' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                        Épreuves
                      </button>
                      <button 
                        onClick={() => setActiveTab('notes')}
                        className={`flex-1 py-4 text-sm font-semibold border-b-2 transition ${activeTab === 'notes' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                      >
                        Saisie & Import Notes
                      </button>
                    </>
                  )}
                  <button 
                    onClick={() => { setActiveTab('results'); fetchResults(selectedSession.id); }}
                    className={`flex-1 py-4 text-sm font-semibold border-b-2 transition ${activeTab === 'results' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}
                  >
                    Résultats & Rapports
                  </button>
                </div>

                <div className="p-6">
                  {activeTab === 'candidates' && isAdmin && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="text-lg font-bold text-slate-900">Liste des Candidats</h3>
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={generateTableNumbers}
                              className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition text-sm"
                            >
                              <Hash className="w-4 h-4" />
                              Générer N° Table
                            </button>
                            <button 
                              onClick={() => setShowCandidateSelection(true)}
                              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-sm font-semibold shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
                              Inscrire Candidats
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-100">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50">
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidat</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Classe</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Matricule</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">N° Table</th>
                              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {candidates.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-400 italic text-sm">
                                  Aucun candidat inscrit à cette session
                                </td>
                              </tr>
                            ) : (
                              candidates.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-4">
                                    <p className="font-bold text-slate-900 text-sm">{c.nom} {c.prenom}</p>
                                    <p className="text-[10px] text-slate-500 font-medium">ID: #{c.id}</p>
                                  </td>
                                  <td className="p-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                      {c.classe_nom}
                                    </span>
                                  </td>
                                  <td className="p-4 text-xs font-mono text-slate-500">{c.matricule || '—'}</td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-2">
                                      <Hash className="w-3 h-3 text-indigo-400" />
                                      <span className="font-mono text-sm font-bold text-indigo-600">{c.numero_table || 'En attente'}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-right">
                                    {isAdmin && selectedSession.est_publie === 0 && (
                                      <button 
                                        onClick={() => removeCandidate(c.id)}
                                        className="p-2 text-slate-400 hover:text-red-500 transition"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'epreuves' && isAdmin && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">Choix des Épreuves d'Examen</h3>
                        <button 
                          onClick={saveSessionEpreuves}
                          className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition text-sm"
                        >
                          Enregistrer la sélection
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allEpreuves.map(e => (
                          <div 
                            key={e.id}
                            onClick={() => {
                              if (sessionEpreuveIds.includes(e.id)) {
                                setSessionEpreuveIds(sessionEpreuveIds.filter(id => id !== e.id));
                              } else {
                                setSessionEpreuveIds([...sessionEpreuveIds, e.id]);
                              }
                            }}
                            className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                              sessionEpreuveIds.includes(e.id)
                                ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-600 ring-offset-2'
                                : 'bg-white border-slate-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-sm truncate">{e.titre}</p>
                              <p className="text-xs text-slate-500">{e.matiere_nom} • Coeff: {e.coefficient}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                              sessionEpreuveIds.includes(e.id)
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300'
                            }`}>
                              {sessionEpreuveIds.includes(e.id) && <CheckCircle2 className="w-4 h-4" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'results' && (
                    <div className="space-y-6">
                      {/* Teacher View Banner */}
                      {isTeacher && (
                        <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs text-indigo-900 flex items-center gap-2.5">
                          <Eye size={18} className="text-indigo-600 flex-shrink-0" />
                          <span>
                            <strong>Mode Consultation Enseignant :</strong> Vous visualisez la liste officielle des élèves avec leurs notes par matière et moyennes générales de cette session. La modification et le téléchargement des relevés sont réservés à l'administration.
                          </span>
                        </div>
                      )}

                      {/* Header & Publication Controls */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-900">Rapport des Résultats</h3>
                            {selectedSession.est_publie === 1 ? (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                                <CheckCircle2 size={12} />
                                Publié aux parents
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Brouillon non publié
                              </span>
                            )}
                            {selectedSession.est_publie === 1 && (
                              selectedSession.bulletin_telechargeable === 1 ? (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1 border border-blue-200">
                                  <Unlock size={12} />
                                  Relevés téléchargeables
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                                  <Lock size={12} />
                                  Téléchargement verrouillé
                                </span>
                              )
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Cycle : <strong className="text-slate-700">{selectedSession.cycle === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire'}</strong> • Session : <strong className="text-slate-700">{selectedSession.nom}</strong>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isAdmin && (
                            <>
                              {selectedSession.est_publie === 0 ? (
                                <button 
                                  onClick={() => setShowPublishModal(true)}
                                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition text-xs font-bold shadow-sm"
                                >
                                  <Send className="w-4 h-4" />
                                  Publier les Résultats
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={handleToggleExamBulletinLock}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                                      selectedSession.bulletin_telechargeable === 1
                                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                                    }`}
                                    title={selectedSession.bulletin_telechargeable === 1 ? "Verrouiller le téléchargement pour les parents" : "Déverrouiller le téléchargement pour les parents"}
                                  >
                                    {selectedSession.bulletin_telechargeable === 1 ? <Lock size={14} /> : <Unlock size={14} />}
                                    <span>{selectedSession.bulletin_telechargeable === 1 ? "Verrouiller relevé" : "Déverrouiller relevé"}</span>
                                  </button>
                                  <button
                                    onClick={handleUnpublishSession}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold border border-slate-200 transition"
                                  >
                                    Dépublier
                                  </button>
                                </>
                              )}
                            </>
                          )}

                          {/* Exporter PDF is strictly reserved to Admin, NOT teacher */}
                          {isAdmin && (
                            <button 
                              onClick={() => exportExamResultsToPDF(selectedSession.nom, results)}
                              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition text-xs font-bold shadow-sm"
                            >
                              <Download className="w-4 h-4" />
                              Exporter Rapport PDF
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stat summary cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1">Moyenne Générale</p>
                          <p className="text-2xl font-black text-indigo-900">
                            {results.length > 0 
                              ? (results.reduce((acc, r) => acc + (r.moyenne || 0), 0) / results.length).toFixed(2)
                              : '0.00'}
                          </p>
                        </div>
                        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Taux de Réussite</p>
                          <p className="text-2xl font-black text-emerald-900">
                            {results.length > 0 
                              ? ((results.filter(r => r.moyenne >= 10).length / results.length) * 100).toFixed(1)
                              : '0'}%
                          </p>
                        </div>
                        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Meilleure Moyenne</p>
                          <p className="text-2xl font-black text-amber-900">
                            {results.length > 0 ? Math.max(...results.map(r => r.moyenne || 0)).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      </div>

                      {/* Search and class filter */}
                      <div className="flex flex-wrap items-center gap-3 bg-slate-50/70 p-3 rounded-2xl border border-slate-100">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Rechercher par nom, prénom ou N° de table..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        {uniqueResultClasses.length > 1 && (
                          <select
                            value={selectedClassFilter}
                            onChange={e => setSelectedClassFilter(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                          >
                            <option value="">Toutes les classes</option>
                            {uniqueResultClasses.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        )}
                        <span className="text-xs text-slate-400 font-medium">
                          {filteredResults.length} / {results.length} candidat(s)
                        </span>
                      </div>

                      {/* Results Table with subject averages and general average */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px]">
                              <th className="p-3 w-12 text-center">Rang</th>
                              <th className="p-3">Candidat</th>
                              <th className="p-3">Classe</th>
                              <th className="p-3">N° Table</th>
                              {resultSubjects.map(sub => (
                                <th key={sub.id} className="p-3 text-center min-w-[90px]">
                                  <span className="block truncate max-w-[110px]" title={sub.nom}>{sub.nom}</span>
                                  <span className="text-[10px] text-slate-400 font-normal">coeff {sub.coefficient}</span>
                                </th>
                              ))}
                              <th className="p-3 text-center font-black">Moyenne Gén.</th>
                              {!isTeacher && (
                                <th className="p-3 text-right">Relevé</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredResults.length === 0 ? (
                              <tr>
                                <td colSpan={5 + resultSubjects.length + (!isTeacher ? 1 : 0)} className="p-12 text-center text-slate-400 italic">
                                  Aucun résultat d'examen à afficher
                                </td>
                              </tr>
                            ) : (
                              filteredResults.map((r, idx) => (
                                <tr key={r.eleve_id} className="hover:bg-slate-50/50 transition">
                                  <td className="p-3 text-center">
                                    <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center font-bold text-[11px] ${
                                      idx === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                                      idx === 1 ? 'bg-slate-100 text-slate-800 border border-slate-300' :
                                      idx === 2 ? 'bg-orange-100 text-orange-800 border border-orange-300' :
                                      'text-slate-600 bg-slate-50'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <p className="font-bold text-slate-900 text-xs">{r.nom} {r.prenom}</p>
                                  </td>
                                  <td className="p-3">
                                    <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                      {r.classe_nom}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono text-xs text-indigo-600 font-bold">{r.numero_table || '—'}</td>

                                  {/* Marks per subject */}
                                  {resultSubjects.map(sub => {
                                    const noteObj = r.notes?.find(n => n.matiere_id === sub.id);
                                    const val = noteObj?.note !== undefined && noteObj?.note !== null ? Number(noteObj.note) : null;
                                    return (
                                      <td key={sub.id} className="p-3 text-center font-mono text-xs">
                                        {val !== null ? (
                                          <span className={`font-bold ${val >= 10 ? 'text-slate-900' : 'text-rose-600 font-semibold'}`}>
                                            {val.toFixed(2)}
                                          </span>
                                        ) : (
                                          <span className="text-slate-300">—</span>
                                        )}
                                      </td>
                                    );
                                  })}

                                  {/* Moyenne générale */}
                                  <td className="p-3 text-center">
                                    <span className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                                      r.moyenne >= 10 
                                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                                        : 'text-rose-700 bg-rose-50 border border-rose-200'
                                    }`}>
                                      {r.moyenne ? r.moyenne.toFixed(2) : '0.00'} / 20
                                    </span>
                                  </td>

                                  {/* Download button (Admin or Parent if unlocked) */}
                                  {!isTeacher && (
                                    <td className="p-3 text-right">
                                      {isAdmin ? (
                                        <button 
                                          onClick={() => exportBulletinPDF(selectedSession.nom, r, cycle)}
                                          className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition ml-auto"
                                          title="Télécharger le relevé (Admin)"
                                        >
                                          <FileText className="w-3.5 h-3.5" />
                                          Télécharger
                                        </button>
                                      ) : isParentOrStudent ? (
                                        selectedSession.bulletin_telechargeable === 1 ? (
                                          <button 
                                            onClick={() => exportBulletinPDF(selectedSession.nom, r, cycle)}
                                            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition ml-auto"
                                          >
                                            <FileText className="w-3.5 h-3.5" />
                                            Télécharger
                                          </button>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 ml-auto">
                                            <Lock size={12} className="text-amber-600" />
                                            Verrouillé
                                          </span>
                                        )
                                      ) : null}
                                    </td>
                                  )}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {activeTab === 'notes' && isAdmin && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">Saisie et Import des Notes</h3>
                          <p className="text-xs text-slate-500">Saisissez les notes manuellement ou importez-les depuis un fichier Excel</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                            <Users className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold text-indigo-700">{candidates.length} Candidats inscrits</span>
                          </div>
                          <select 
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition shadow-sm min-w-[200px]"
                            value={selectedMatiereForNotes || ''}
                            onChange={e => {
                              const mid = e.target.value ? parseInt(e.target.value) : null;
                              setSelectedMatiereForNotes(mid);
                              if (mid && selectedSession) fetchExistingNotes(selectedSession.id, mid);
                            }}
                          >
                            <option value="">Sélectionner une matière</option>
                            {sessionMatieres.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                          </select>
                        </div>
                      </div>

                      {!selectedMatiereForNotes ? (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <p className="text-slate-500 italic">Veuillez sélectionner une matière pour commencer la saisie ou l'import</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Import / Export Excel toolbar */}
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleDownloadNotesTemplate}
                                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
                              >
                                <Download size={14} className="text-indigo-600" />
                                Modèle Excel
                              </button>
                              <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm">
                                <Upload size={14} className="text-indigo-600" />
                                Importer Notes Excel
                                <input
                                  type="file"
                                  accept=".xlsx, .xls, .csv"
                                  className="hidden"
                                  onChange={handleExcelNotesUpload}
                                />
                              </label>
                            </div>
                            <span className="text-xs text-slate-500">
                              Matière : <strong className="text-slate-800">{matieres.find(m => m.id === selectedMatiereForNotes)?.nom}</strong>
                            </span>
                          </div>

                          <div className="overflow-x-auto rounded-xl border border-slate-100">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50/50">
                                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">N° Table</th>
                                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Candidat</th>
                                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Note / 20</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {filteredCandidatesForNotes.map(c => (
                                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                                    <td className="p-4 font-mono text-xs text-indigo-600 font-bold">{c.numero_table || '—'}</td>
                                    <td className="p-4">
                                      <p className="font-bold text-slate-900 text-sm">{c.nom} {c.prenom}</p>
                                      <p className="text-[10px] text-slate-500 font-medium">{c.classe_nom}</p>
                                    </td>
                                    <td className="p-4">
                                      <input 
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.25"
                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={notesData[c.eleve_id] || ''}
                                        onChange={e => setNotesData({...notesData, [c.eleve_id]: e.target.value})}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="flex justify-end">
                            <button 
                              onClick={handleSaveNotes}
                              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition flex items-center gap-2"
                            >
                              <CheckCircle2 className="w-5 h-5" />
                              Enregistrer toutes les notes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      <AnimatePresence>
        {showNewSessionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 bg-indigo-600">
                <h3 className="text-xl font-bold text-white">Nouvelle Session d'Examen</h3>
                <p className="text-indigo-100 text-xs">Configurez les détails de la session pour {cycle}</p>
              </div>
              <form onSubmit={handleCreateSession} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nom de la session</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ex: Examen Blanc Janvier 2024"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={newSession.nom}
                    onChange={e => setNewSession({...newSession, nom: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={newSession.type_examen}
                      onChange={e => setNewSession({...newSession, type_examen: e.target.value as any})}
                    >
                      <option value="blanc">Examen Blanc</option>
                      <option value="officiel">Examen Officiel</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trimestre</label>
                    <select 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={newSession.trimestre}
                      onChange={e => setNewSession({...newSession, trimestre: parseInt(e.target.value)})}
                    >
                      <option value={1}>Trimestre 1</option>
                      <option value={2}>Trimestre 2</option>
                      <option value={3}>Trimestre 3</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date début</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={newSession.date_debut}
                      onChange={e => setNewSession({...newSession, date_debut: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date fin</label>
                    <input 
                      type="date"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                      value={newSession.date_fin}
                      onChange={e => setNewSession({...newSession, date_fin: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowNewSessionModal(false)}
                    className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition"
                  >
                    Créer la session
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Candidate Selection Modal */}
      <AnimatePresence>
        {showCandidateSelection && (
          <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col my-auto max-h-[95vh] sm:max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 bg-indigo-600 flex items-center justify-between flex-none">
                <div>
                  <h3 className="text-xl font-bold text-white">Inscription des Candidats</h3>
                  <p className="text-indigo-100 text-xs">Sélectionnez une classe puis les élèves à inscrire</p>
                </div>
                <button 
                  onClick={() => setShowCandidateSelection(false)}
                  className="text-white/80 hover:text-white"
                >
                  <Plus className="w-6 h-6 rotate-45" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden flex-1">
                {/* Classes Column */}
                <div className="border-r border-slate-100 pr-4 overflow-y-auto max-h-[200px] md:max-h-full">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Classes ({cycle})</p>
                  <div className="space-y-1">
                    {classes.map(c => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedClassForSelection(c.id);
                          fetchStudentsByClass(c.id);
                        }}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group ${
                          selectedClassForSelection === c.id 
                            ? 'bg-indigo-50 text-indigo-700 font-bold' 
                            : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <span className="text-sm">{c.nom}</span>
                        <ChevronRight className={`w-4 h-4 ${selectedClassForSelection === c.id ? 'opacity-100' : 'opacity-0'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Students Column */}
                <div className="md:col-span-2 flex flex-col overflow-hidden h-full min-h-[400px] md:min-h-0">
                  <div className="flex-none flex items-center justify-between mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      Élèves {studentsInClass.length > 0 ? `(${studentsInClass.length})` : ''}
                    </p>
                    {studentsInClass.length > 0 && (
                      <button 
                        onClick={() => {
                          if (selectedStudentIds.length === studentsInClass.length) {
                            setSelectedStudentIds([]);
                          } else {
                            setSelectedStudentIds(studentsInClass.map(s => s.id));
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        {selectedStudentIds.length === studentsInClass.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                      </button>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {studentsInClass.length === 0 ? (
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                        <Users className="w-12 h-12 opacity-20" />
                        <p className="italic text-sm">Sélectionnez une classe pour voir les élèves</p>
                      </div>
                    ) : (
                      studentsInClass.map(s => (
                          <div key={s.id} className={`p-3 rounded-xl border transition flex items-center justify-between ${
                            candidates.some(c => c.eleve_id === s.id)
                              ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                              : selectedStudentIds.includes(s.id)
                                ? 'bg-indigo-50 border-indigo-200 cursor-pointer'
                                : 'bg-white border-slate-100 hover:bg-slate-50 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (candidates.some(c => c.eleve_id === s.id)) return;
                            if (selectedStudentIds.includes(s.id)) {
                              setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                            } else {
                              setSelectedStudentIds([...selectedStudentIds, s.id]);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md border-2 transition flex items-center justify-center ${
                              candidates.some(c => c.eleve_id === s.id)
                                ? 'bg-slate-200 border-slate-200 text-slate-500'
                                : selectedStudentIds.includes(s.id)
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'border-slate-300'
                            }`}>
                              {candidates.some(c => c.eleve_id === s.id) ? <CheckCircle2 className="w-3.5 h-3.5" /> : (selectedStudentIds.includes(s.id) && <CheckCircle2 className="w-3.5 h-3.5" />)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900 text-sm">{s.nom} {s.prenom}</p>
                                {candidates.some(c => c.eleve_id === s.id) && (
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">Déjà inscrit</span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-mono">{s.matricule}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex-none mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      <span className="font-bold text-indigo-600">{selectedStudentIds.length}</span> élève(s) sélectionné(s)
                    </p>
                    <button 
                      onClick={registerSelectedStudents}
                      disabled={selectedStudentIds.length === 0}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition disabled:opacity-50 disabled:shadow-none"
                    >
                      Inscrire les candidats
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Modal Publication d'Examen */}
        {showPublishModal && selectedSession && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Publier les résultats</h3>
                    <p className="text-xs text-slate-500">
                      Cycle {cycle === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire'} • {selectedSession.nom}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPublishModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-900">À quoi s'attendre lors de la publication :</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Les parents pourront consulter en direct les notes et moyennes de leur enfant.</li>
                    <li>Les enseignants pourront consulter la liste globale et les moyennes sans droit de modification ou de téléchargement.</li>
                    <li>Cette publication s'applique uniquement à l'espace <strong>{cycle === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire'}</strong>.</li>
                  </ul>
                </div>

                {/* Option Téléchargement Bulletin pour les Parents */}
                <div className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 transition">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={publishBulletinLockOption}
                      onChange={e => setPublishBulletinLockOption(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {publishBulletinLockOption ? <Unlock size={15} className="text-emerald-600" /> : <Lock size={15} className="text-amber-600" />}
                        Autoriser le téléchargement du relevé par les parents
                      </span>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {publishBulletinLockOption 
                          ? "Les parents pourront télécharger le bulletin/relevé officiel de l'examen en PDF depuis leur compte."
                          : "Les parents pourront consulter les notes en ligne, mais le bouton de téléchargement du bulletin restera verrouillé."}
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition text-sm"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmPublishSession}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 text-sm flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Confirmer la publication
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Examens;
