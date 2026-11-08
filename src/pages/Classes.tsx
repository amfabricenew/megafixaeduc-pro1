import { apiFetch, useAppSync } from '../utils/api';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, BookOpen, User, Users, Trash2, Edit2, GraduationCap, X, ChevronLeft, Calendar, Printer, FileText, Check, UserCheck, UserX, DoorOpen, Building2 } from 'lucide-react';
import jsPDF from '../utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import StudentAbandonModal from '../components/StudentAbandonModal';
import { ClassDuplicateModal } from '../components/ClassDuplicateModal';

import { isPrimarySubject } from '../utils/subjectCatalog';

const NIVEAU_TYPES = ["Maternelle", "Primaire", "Secondaire"];

const CLASSES_BY_NIVEAU: Record<string, string[]> = {
  "Maternelle": ["Maternelle I", "Maternelle II"],
  "Primaire": ["CI", "CP", "CE1", "CE2", "CM1", "CM2"],
  "Premier Cycle": ["6ème", "5ème", "4ème", "3ème"],
  "Second Cycle": ["2nd", "1ère", "Tle"],
  "Technique": ["1ère Technique", "Tle Technique"]
};

const CYCLES_SECONDAIRE = ["Premier Cycle", "Second Cycle"];
const CLASSES_PREMIER_CYCLE = CLASSES_BY_NIVEAU["Premier Cycle"];
const CLASSES_SECOND_CYCLE = CLASSES_BY_NIVEAU["Second Cycle"];
const SERIES = ["A", "C", "D", "G"];

interface ClassesProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Classes({ cycle = 'all' }: ClassesProps) {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [classes, setClasses] = React.useState([]);
  const [view, setView] = React.useState<'main' | 'mat_primaire' | 'secondaire'>(
    cycle === 'primaire' ? 'mat_primaire' : cycle === 'secondaire' ? 'secondaire' : 'main'
  );
  const [showModal, setShowModal] = React.useState(false);
  const [allowedNiveaux, setAllowedNiveaux] = React.useState<string[]>(
    cycle === 'primaire' ? ["Maternelle", "Primaire"] : cycle === 'secondaire' ? ["Secondaire"] : []
  );

  React.useEffect(() => {
    if (cycle === 'primaire') {
      setView('mat_primaire');
      setAllowedNiveaux(["Maternelle", "Primaire"]);
    } else if (cycle === 'secondaire') {
      setView('secondaire');
      setAllowedNiveaux(["Secondaire"]);
    }
  }, [cycle]);

  const isClassePrim = (c: any) => {
    if (!c) return cycle === 'primaire' || view === 'mat_primaire';
    const niv = (c.niveau || c.cycle || '').toLowerCase();
    const nom = (c.nom || '').toLowerCase();
    const isPrimKW = ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2", "petite", "moyenne", "grande", "sil", "ps", "ms", "gs", "creche", "prescolaire"].some(l => niv.includes(l) || nom.includes(l));
    return isPrimKW || cycle === 'primaire' || view === 'mat_primaire';
  };
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [showSeriesModal, setShowSeriesModal] = React.useState(false);
  const [seriesInput, setSeriesInput] = React.useState("");
  const [pendingGeneration, setPendingGeneration] = React.useState<{niveau: string, classList: string[]} | null>(null);
  const [editingClasse, setEditingClasse] = React.useState<any>(null);
  const [viewingClasse, setViewingClasse] = React.useState<any>(null);
  const [classeDetails, setClasseDetails] = React.useState<any>(null);
  const [activeTab, setActiveTab] = React.useState("eleves");
  const [classeStudentsTab, setClasseStudentsTab] = React.useState<'actifs' | 'abandons'>('actifs');
  const [abandonModalStudent, setAbandonModalStudent] = React.useState<any>(null);
  const [duplicateClasseInfo, setDuplicateClasseInfo] = React.useState<{ baseNom: string; dataToSubmit?: any } | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = React.useState(false);
  const [isSubmittingSuffix, setIsSubmittingSuffix] = React.useState(false);

  React.useEffect(() => {
    setClasseStudentsTab('actifs');
  }, [viewingClasse?.id]);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/classes' : p.path === '/classes'));
  const canWrite = user.role === 'admin' || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [allMatieres, setAllMatieres] = React.useState([]);
  const [allEnseignants, setAllEnseignants] = React.useState([]);
  const [salles, setSalles] = React.useState<any[]>([]);
  const [batiments, setBatiments] = React.useState<any[]>([]);
  const [editingAssignment, setEditingAssignment] = React.useState<any>(null);

  const [assignData, setAssignData] = React.useState({
    matiere_id: '',
    matiere_ids: [] as number[],
    enseignant_id: '',
    heures_hebdo: 0,
    coefficient: 1,
    assignments: {} as Record<number, { enseignant_id: string, heures_hebdo: number, coefficient: number }>
  });

  const isPrimaireLevel = (niveauOrNom?: string) => {
    if (!niveauOrNom) return false;
    const str = niveauOrNom.toLowerCase();
    return ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2"].some(lvl => str.includes(lvl));
  };

  const [teachersByMatiere, setTeachersByMatiere] = React.useState<Record<number, any[]>>({});

  const fetchTeachersForMatiere = (matiereId: number) => {
    if (teachersByMatiere[matiereId]) return;
    const isPrim = isPrimaireLevel(viewingClasse?.niveau || viewingClasse?.nom || '');
    const cycleParam = isPrim ? 'primaire' : 'secondaire';
    apiFetch(`/api/enseignants/par-matiere/${matiereId}?cycle=${cycleParam}`)
      .then(res => res.json())
      .then(data => {
        setTeachersByMatiere(prev => ({ ...prev, [matiereId]: data }));
      });
  };

  const handleToggleMatiere = (id: number) => {
    const matiere = allMatieres.find((m: any) => m.id === id);
    const isPremierCycle = viewingClasse?.niveau === "Premier Cycle" || CLASSES_BY_NIVEAU["Premier Cycle"].includes(viewingClasse?.niveau);
    
    setAssignData(prev => {
      const exists = prev.matiere_ids.includes(id);
      let newMatiereIds = [...prev.matiere_ids];
      let newAssignments = { ...prev.assignments };

      if (exists) {
        newMatiereIds = newMatiereIds.filter(i => i !== id);
        delete newAssignments[id];
        
        // If it's a parent subject, also remove children
        const children = allMatieres.filter((m: any) => m.parent_id === id);
        if (children.length > 0) {
          children.forEach((c: any) => {
            newMatiereIds = newMatiereIds.filter(i => i !== c.id);
            delete newAssignments[c.id];
          });
        }
      } else {
        newMatiereIds.push(id);
        newAssignments[id] = { enseignant_id: '', heures_hebdo: 0, coefficient: 1 };
        fetchTeachersForMatiere(id);
        
        // If it's a parent subject, also add children
        const children = allMatieres.filter((m: any) => m.parent_id === id);
        if (children.length > 0) {
          children.forEach((c: any) => {
            if (!newMatiereIds.includes(c.id)) {
              newMatiereIds.push(c.id);
              newAssignments[c.id] = { enseignant_id: '', heures_hebdo: 0, coefficient: 1 };
              fetchTeachersForMatiere(c.id);
            }
          });
        }
      }

      return {
        ...prev,
        matiere_ids: newMatiereIds,
        assignments: newAssignments
      };
    });
  };

  const matieresByCategory = React.useMemo(() => {
    const groups: Record<string, any[]> = {};
    const isPrimaryViewing = viewingClasse 
      ? ["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase()))
      : (cycle === 'primaire' || view === 'mat_primaire');

    const filteredMatieres = allMatieres.filter((m: any) => {
      const isPrimarySubj = isPrimarySubject(m);
      return isPrimaryViewing ? isPrimarySubj : !isPrimarySubj;
    });

    filteredMatieres.forEach((m: any) => {
      const cat = m.categorie || "Autres";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [allMatieres, cycle, view, viewingClasse]) as Record<string, any[]>;

  const [selectedClasse, setSelectedClasse] = React.useState("");
  const [selectedCycle, setSelectedCycle] = React.useState("");
  const [selectedSerie, setSelectedSerie] = React.useState("");
  const [niveauType, setNiveauType] = React.useState("");
  const [suffixe, setSuffixe] = React.useState("");
  const [sectionsInput, setSectionsInput] = React.useState("");
  const [selectedSections, setSelectedSections] = React.useState<{section: string, frais_scolarite: number, frais_inscription: number}[]>([]);

  const [formData, setFormData] = React.useState({
    nom: '',
    niveau: '',
    salle_id: '',
    frais_scolarite: 0,
    frais_inscription: 0,
    plafond_conduite: 20,
    plafond_conduite_t1: 20,
    plafond_conduite_t2: 20,
    plafond_conduite_t3: 20,
    tranche1_montant: 0,
    tranche1_date_limite: '',
    tranche2_montant: 0,
    tranche2_date_limite: '',
    tranche3_montant: 0,
    tranche3_date_limite: '',
    devise: 'FCFA',
    annee_id: 1,
    enseignant_id: ''
  });

  const filteredClasses = React.useMemo(() => {
    const activeView = cycle === 'primaire' ? 'mat_primaire' : cycle === 'secondaire' ? 'secondaire' : view;
    if (activeView === 'main') return [];
    
    return classes.filter((c: any) => {
      const niveau = c.niveau || "";
      const nom = c.nom || "";
      const niveauLower = (niveau + " " + nom).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      const isSecKeywords = ["secondaire", "premier cycle", "second cycle", "technique", "6eme", "6ème", "5eme", "5ème", "4eme", "4ème", "3eme", "3ème", "2nd", "1ere", "1ère", "tle"].some(n => niveauLower.includes(n));
      const isMatOrPrimKeywords = ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2"].some(n => niveauLower.includes(n));

      if (activeView === 'mat_primaire') {
        const isInMatList = CLASSES_BY_NIVEAU["Maternelle"].some(m => niveau.includes(m) || nom.includes(m));
        const isInPrimList = CLASSES_BY_NIVEAU["Primaire"].some(p => niveau.includes(p) || nom.includes(p));
        return (isMatOrPrimKeywords || isInMatList || isInPrimList) && !isSecKeywords;
      } else if (activeView === 'secondaire') {
        const isInPremCycle = CLASSES_BY_NIVEAU["Premier Cycle"].some(pc => niveau.includes(pc) || nom.includes(pc));
        const isInSecCycle = CLASSES_BY_NIVEAU["Second Cycle"].some(sc => niveau.includes(sc) || nom.includes(sc));
        const isInTech = CLASSES_BY_NIVEAU["Technique"].some(t => niveau.includes(t) || nom.includes(t));
        return (isSecKeywords || isInPremCycle || isInSecCycle || isInTech) && !isMatOrPrimKeywords;
      }
      return false;
    });
  }, [classes, view, cycle]);

  const sortClasses = (a: any, b: any) => {
    const allNiveaux = [
      ...CLASSES_BY_NIVEAU["Maternelle"],
      ...CLASSES_BY_NIVEAU["Primaire"],
      ...CLASSES_BY_NIVEAU["Premier Cycle"],
      ...CLASSES_BY_NIVEAU["Second Cycle"],
      ...CLASSES_BY_NIVEAU["Technique"]
    ];
    
    const nomA = a?.nom || '';
    const nomB = b?.nom || '';
    const nivA = a?.niveau || '';
    const nivB = b?.niveau || '';

    const indexA = allNiveaux.findIndex(n => nivA === n || nomA.includes(n));
    const indexB = allNiveaux.findIndex(n => nivB === n || nomB.includes(n));
    
    if (indexA !== -1 && indexB !== -1 && indexA !== indexB) {
      return indexA - indexB;
    }
    
    return nomA.localeCompare(nomB);
  };

  const groupedClasses = React.useMemo(() => {
    const activeView = cycle === 'primaire' ? 'mat_primaire' : cycle === 'secondaire' ? 'secondaire' : view;
    if (activeView === 'main') return [];
    
    const groups: { title: string, classes: any[] }[] = [];
    const list = Array.isArray(filteredClasses) ? filteredClasses : [];
    
    if (activeView === 'mat_primaire') {
      groups.push({ 
        title: "Maternelle", 
        classes: list.filter((c: any) => (c?.niveau || '').includes("Maternelle") || (CLASSES_BY_NIVEAU["Maternelle"] || []).some(m => c?.niveau === m || (c?.nom || '').startsWith(m))).sort(sortClasses) 
      });
      groups.push({ 
        title: "Primaire", 
        classes: list.filter((c: any) => (c?.niveau || '').includes("Primaire") || (CLASSES_BY_NIVEAU["Primaire"] || []).some(p => c?.niveau === p || (c?.nom || '').startsWith(p))).sort(sortClasses) 
      });
    } else if (activeView === 'secondaire') {
      groups.push({ 
        title: "Premier Cycle", 
        classes: list.filter((c: any) => (c?.niveau || '').includes("Premier Cycle") || (CLASSES_BY_NIVEAU["Premier Cycle"] || []).some(pc => c?.niveau === pc || (c?.nom || '').startsWith(pc))).sort(sortClasses) 
      });
      
      // Group Second Cycle by series
      const secondCycleClasses = list.filter((c: any) => (c?.niveau || '').includes("Second Cycle") || (CLASSES_BY_NIVEAU["Second Cycle"] || []).some(sc => c?.niveau === sc || (c?.nom || '').startsWith(sc)));
      const series = Array.from(new Set(secondCycleClasses.map((c: any) => (c?.nom || '').split(' ').pop()))).filter(Boolean).sort();
      series.forEach(s => {
          if (s) {
            groups.push({ title: `Série ${s}`, classes: secondCycleClasses.filter((c: any) => (c?.nom || '').endsWith(s)).sort(sortClasses) });
          }
      });
      
      groups.push({ 
        title: "Technique", 
        classes: list.filter((c: any) => (c?.niveau || '').includes("Technique") || (CLASSES_BY_NIVEAU["Technique"] || []).some(t => c?.niveau === t || (c?.nom || '').startsWith(t))).sort(sortClasses) 
      });
    }

    return groups.filter(g => (g?.classes || []).length > 0);
  }, [filteredClasses, view, cycle]);

  const fetchClasses = () => {
    apiFetch('/api/classes')
      .then(res => {
        if (!res.ok) throw new Error("Erreur chargement classes");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(err => {
        console.error("fetchClasses error:", err);
        setClasses([]);
      });
  };

  const getTeacherPPClassCount = (enseignantId: number | string, excludeClasseId?: number | string) => {
    if (!enseignantId) return 0;
    return classes.filter((c: any) => 
      c.enseignant_id && 
      String(c.enseignant_id) === String(enseignantId) && 
      String(c.id) !== String(excludeClasseId)
    ).length;
  };

  useAppSync(() => {
    fetchClasses();
  }, 30000);

  React.useEffect(() => {
    fetchClasses();
    apiFetch('/api/matieres')
      .then(res => {
        if (!res.ok) throw new Error("Erreur chargement matières");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAllMatieres(data);
        } else {
          setAllMatieres([]);
        }
      })
      .catch(err => {
        console.error("fetchMatieres error:", err);
        setAllMatieres([]);
      });
    apiFetch('/api/enseignants')
      .then(res => {
        if (!res.ok) throw new Error("Erreur chargement enseignants");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setAllEnseignants(data);
        } else {
          setAllEnseignants([]);
        }
      })
      .catch(err => {
        console.error("fetchEnseignants error:", err);
        setAllEnseignants([]);
      });
    apiFetch('/api/salles')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setSalles(data);
      })
      .catch(err => console.error("fetchSalles error:", err));
    apiFetch('/api/batiments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBatiments(data);
      })
      .catch(err => console.error("fetchBatiments error:", err));
  }, []);

  // Update final class name and level whenever selections change
  React.useEffect(() => {
    if (!niveauType && !selectedClasse && !selectedCycle && !selectedSerie && !suffixe) return;

    let finalNiveau = selectedClasse;
    if (niveauType === "Secondaire" && selectedCycle === "Second Cycle" && selectedSerie) {
      finalNiveau = `${selectedClasse} ${selectedSerie}`;
    }
    
    const finalNom = suffixe ? `${finalNiveau} ${suffixe}` : finalNiveau;
    
    setFormData(prev => ({
      ...prev,
      nom: finalNom || prev.nom,
      niveau: finalNiveau || prev.niveau
    }));
  }, [niveauType, selectedClasse, selectedCycle, selectedSerie, suffixe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingClasse) {
        const res = await apiFetch(`/api/classes/${editingClasse.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Erreur lors de la modification");
        }
      } else {
        if (selectedSections.length > 0) {
          for (const s of selectedSections) {
            const nom = `${formData.niveau} ${s.section}`.trim();
            const res = await apiFetch('/api/classes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...formData, nom, niveau: formData.niveau, frais_scolarite: s.frais_scolarite, frais_inscription: s.frais_inscription })
            });
            if (!res.ok) {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const data = await res.json();
                throw new Error(data.error || "Erreur lors de la création");
              } else {
                const text = await res.text();
                console.error("Non-JSON error response:", text);
                throw new Error(`Erreur serveur (${res.status}). Veuillez contacter l'administrateur.`);
              }
            }
          }
        } else {
          const res = await apiFetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (!res.ok) {
            if (res.status === 409) {
              const data = await res.json().catch(() => ({}));
              setDuplicateClasseInfo({ baseNom: data.baseNom || formData.nom, dataToSubmit: formData });
              setShowDuplicateModal(true);
              return;
            }
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              const data = await res.json();
              throw new Error(data.error || "Erreur lors de la création");
            } else {
              const text = await res.text();
              console.error("Non-JSON error response:", text);
              throw new Error(`Erreur serveur (${res.status}). Veuillez contacter l'administrateur.`);
            }
          }
        }
      }
      
      setShowModal(false);
      fetchClasses();
      resetForm();
    } catch (err: any) {
      console.error("Submit error:", err);
      toast.error(err.message);
    }
  };

  const handleCreateWithSuffix = async (newClassName: string) => {
    try {
      setIsSubmittingSuffix(true);
      const payload = {
        ...(duplicateClasseInfo?.dataToSubmit || formData),
        nom: newClassName,
        force: true
      };
      const res = await apiFetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la création");
      }
      toast.success(`Classe « ${newClassName} » créée avec succès !`);
      setShowDuplicateModal(false);
      setDuplicateClasseInfo(null);
      setShowModal(false);
      fetchClasses();
      resetForm();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmittingSuffix(false);
    }
  };

  const handleEdit = (c: any) => {
    setEditingClasse(c);
    
    // Parsing logic to pre-fill fields
    let foundNiveauType = "";
    let foundSelectedClasse = "";
    let foundSelectedCycle = "";
    let foundSelectedSerie = "";
    let foundSuffixe = "";

    const checkNiveau = (niveau: string) => {
      if (CLASSES_BY_NIVEAU["Maternelle"].includes(niveau)) return { type: "Maternelle", cycle: "" };
      if (CLASSES_BY_NIVEAU["Primaire"].includes(niveau)) return { type: "Primaire", cycle: "" };
      if (CLASSES_BY_NIVEAU["Premier Cycle"].includes(niveau)) return { type: "Secondaire", cycle: "Premier Cycle" };
      if (CLASSES_BY_NIVEAU["Second Cycle"].includes(niveau)) return { type: "Secondaire", cycle: "Second Cycle" };
      if (CLASSES_BY_NIVEAU["Technique"].includes(niveau)) return { type: "Technique", cycle: "" };
      return null;
    };

    const res = checkNiveau(c.niveau);
    if (res) {
      foundNiveauType = res.type;
      foundSelectedCycle = res.cycle;
      foundSelectedClasse = c.niveau;
    } else {
      // Try to split if it's Second Cycle with serie
      const parts = c.niveau.split(' ');
      if (parts.length > 1) {
        const base = parts[0];
        const serie = parts[1];
        const res2 = checkNiveau(base);
        if (res2 && res2.cycle === "Second Cycle") {
          foundNiveauType = res2.type;
          foundSelectedCycle = res2.cycle;
          foundSelectedClasse = base;
          foundSelectedSerie = serie;
        }
      }
    }

    // Extract suffixe from nom
    if (c.nom.startsWith(c.niveau)) {
      foundSuffixe = c.nom.replace(c.niveau, "").trim();
    }

    setNiveauType(foundNiveauType);
    setSelectedCycle(foundSelectedCycle);
    setSelectedClasse(foundSelectedClasse);
    setSelectedSerie(foundSelectedSerie);
    setSuffixe(foundSuffixe);

    setFormData({
      nom: c.nom ?? '',
      niveau: c.niveau ?? '',
      frais_scolarite: c.frais_scolarite ?? 0,
      frais_inscription: c.frais_inscription ?? 0,
      plafond_conduite: c.plafond_conduite ?? 20,
      plafond_conduite_t1: c.plafond_conduite_t1 ?? c.plafond_conduite ?? 20,
      plafond_conduite_t2: c.plafond_conduite_t2 ?? c.plafond_conduite ?? 20,
      plafond_conduite_t3: c.plafond_conduite_t3 ?? c.plafond_conduite ?? 20,
      tranche1_montant: c.tranche1_montant ?? 0,
      tranche1_date_limite: c.tranche1_date_limite ?? '',
      tranche2_montant: c.tranche2_montant ?? 0,
      tranche2_date_limite: c.tranche2_date_limite ?? '',
      tranche3_montant: c.tranche3_montant ?? 0,
      tranche3_date_limite: c.tranche3_date_limite ?? '',
      devise: c.devise ?? 'FCFA',
      annee_id: c.annee_id ?? 1,
      enseignant_id: c.enseignant_id ?? '',
      salle_id: c.salle_id ? String(c.salle_id) : ''
    });
    
    setShowModal(true);
  };

  const fetchDetails = (id: number) => {
    apiFetch(`/api/classes/${id}/details`)
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object') {
          setClasseDetails({
            ...data,
            eleves: Array.isArray(data.eleves) ? data.eleves : [],
            matieres: Array.isArray(data.matieres) ? data.matieres : [],
            notes: Array.isArray(data.notes) ? data.notes : []
          });
        }
      })
      .catch(err => {
        console.error("fetchDetails error:", err);
      });
  };

  const handleOpen = (c: any) => {
    setViewingClasse(c);
    setClasseDetails(null);
    fetchDetails(c.id);
  };

  const handleAssignMatiere = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment && (assignData.matiere_ids || []).length === 0) {
      toast.error("Veuillez sélectionner au moins une matière.");
      return;
    }

    const isPrimaryViewing = ["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase()));
    const classTeacherId = viewingClasse?.enseignant_id || null;

    const payload = editingAssignment ? {
      enseignant_id: isPrimaryViewing ? classTeacherId : assignData.enseignant_id,
      heures_hebdo: assignData.heures_hebdo,
      coefficient: assignData.coefficient
    } : {
      assignments: Object.entries(assignData.assignments).map(([mId, data]) => {
        const d = data as { enseignant_id: string, heures_hebdo: number, coefficient: number };
        return {
          matiere_id: parseInt(mId),
          enseignant_id: isPrimaryViewing ? classTeacherId : d.enseignant_id,
          heures_hebdo: d.heures_hebdo,
          coefficient: d.coefficient
        };
      })
    };

    const url = editingAssignment 
      ? `/api/classes/${viewingClasse.id}/matieres/${editingAssignment.matiere_id}` 
      : `/api/classes/${viewingClasse.id}/matieres`;
    const method = editingAssignment ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(async (res) => {
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erreur lors de l'assignation");
      }
      
      // If it's a parent subject, also update children
      if (editingAssignment) {
        const children = allMatieres.filter((m: any) => m.parent_id === editingAssignment.matiere_id);
        if (children.length > 0) {
          const childUpdates = children.map(child => {
            const existingChild = classeDetails?.matieres.find((am: any) => am.matiere_id === child.id);
            const childPayload = {
              enseignant_id: isPrimaryViewing ? classTeacherId : (assignData.assignments[child.id]?.enseignant_id || payload.enseignant_id),
              heures_hebdo: assignData.assignments[child.id]?.heures_hebdo ?? existingChild?.heures_hebdo ?? 0,
              coefficient: assignData.assignments[child.id]?.coefficient || 1
            };
            return apiFetch(`/api/classes/${viewingClasse.id}/matieres/${child.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(childPayload)
            });
          });
          await Promise.all(childUpdates);
        }
      }
      
      setShowAssignModal(false);
      setEditingAssignment(null);
      fetchDetails(viewingClasse.id);
      setAssignData({ matiere_id: '', matiere_ids: [], enseignant_id: '', heures_hebdo: 0, coefficient: 1, assignments: {} });
    }).catch(err => {
      toast.error(err.message);
    });
  };

  const handleEditAssignment = (m: any) => {
    setEditingAssignment(m);
    
    const children = allMatieres.filter((mat: any) => mat.parent_id === m.matiere_id);
    const initialAssignments: any = {
      [m.matiere_id]: {
        enseignant_id: m.enseignant_id || '',
        heures_hebdo: m.heures_hebdo || 0,
        coefficient: m.coefficient || 1
      }
    };
    
    // Populate children assignments
    children.forEach(child => {
      const existingChild = classeDetails?.matieres.find((am: any) => am.matiere_id === child.id);
      initialAssignments[child.id] = {
        enseignant_id: existingChild?.enseignant_id || m.enseignant_id || '',
        heures_hebdo: existingChild?.heures_hebdo || 0,
        coefficient: existingChild?.coefficient || 1
      };
    });

    setAssignData({
      matiere_id: m.matiere_id,
      matiere_ids: [m.matiere_id],
      enseignant_id: m.enseignant_id || '',
      heures_hebdo: m.heures_hebdo || 0,
      coefficient: m.coefficient || 1,
      assignments: initialAssignments
    });
    fetchTeachersForMatiere(m.matiere_id);
    setShowAssignModal(true);
  };

  const handleDeleteAssignment = async (matiereId: number) => {
    if (await confirm({
      title: "Retirer la matière",
      message: "Voulez-vous vraiment retirer cette matière de la classe ?",
      confirmText: "Retirer",
      variant: "danger",
      icon: "trash"
    })) {
      await apiFetch(`/api/classes/${viewingClasse.id}/matieres/${matiereId}`, {
        method: 'DELETE'
      });

      // If it's a parent subject, also remove children
      const children = allMatieres.filter((m: any) => m.parent_id === matiereId);
      if (children.length > 0) {
        const childDeletes = children.map(child => {
          return apiFetch(`/api/classes/${viewingClasse.id}/matieres/${child.id}`, {
            method: 'DELETE'
          });
        });
        await Promise.all(childDeletes);
      }
      
      fetchDetails(viewingClasse.id);
    }
  };

  const isEleveAbandoned = (e: any) => Boolean(e && (e.statut_scolaire === 'Abandon' || e.est_abandonne === 1));

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

  const handleExportPDF = () => {
    if (!classeDetails || !viewingClasse) return;
    
    const doc = new jsPDF();
    const elevesList = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    const elevesActifs = elevesList.filter((e: any) => !isEleveAbandoned(e));
    const elevesAbandons = elevesList.filter((e: any) => isEleveAbandoned(e));
    
    const isAbandonsTab = classeStudentsTab === 'abandons';
    const targetList = isAbandonsTab ? elevesAbandons : elevesActifs;
    const sortedEleves = [...targetList].sort((a, b) => (a?.nom || '').localeCompare(b?.nom || ''));
    
    const title = isAbandonsTab 
      ? `Liste des Élèves en Abandon - ${viewingClasse.nom}`
      : `Liste des Élèves Actifs - ${viewingClasse.nom}`;
    
    doc.setFontSize(16);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Année scolaire: ${viewingClasse.annee_nom || 'En cours'} | ${isAbandonsTab ? `Effectif en abandon : ${elevesAbandons.length} élève(s)` : `Effectif actif : ${elevesActifs.length} élève(s)`}`, 14, 27);
    
    const tableData = sortedEleves.map((e, index) => isAbandonsTab ? [
      index + 1,
      e.matricule || '-',
      `${e?.nom || ''} ${e?.prenom || ''}`.trim() || 'Sans nom',
      e.sexe || '-',
      formatDateSafe(e.date_abandon, '-'),
      e.motif_abandon || 'Non spécifié'
    ] : [
      index + 1,
      e.matricule || '-',
      `${e?.nom || ''} ${e?.prenom || ''}`.trim() || 'Sans nom',
      e.sexe || '-',
      e.tel_parent || '-'
    ]);
    
    autoTable(doc, {
      startY: 33,
      head: isAbandonsTab 
        ? [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Date Abandon', 'Motif Déclaré']]
        : [['N°', 'Matricule', 'Nom & Prénoms', 'Sexe', 'Contact Parent']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: isAbandonsTab ? '#e11d48' : '#10b981', textColor: '#ffffff' }
    });
    
    doc.save(isAbandonsTab 
      ? `abandons_${viewingClasse.nom.replace(/\s+/g, '_')}.pdf`
      : `eleves_actifs_${viewingClasse.nom.replace(/\s+/g, '_')}.pdf`);
  };

  const handlePrint = () => {
    if (!classeDetails || !viewingClasse) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const elevesList = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
    const elevesActifs = elevesList.filter((e: any) => !isEleveAbandoned(e));
    const elevesAbandons = elevesList.filter((e: any) => isEleveAbandoned(e));
    
    const isAbandonsTab = classeStudentsTab === 'abandons';
    const targetList = isAbandonsTab ? elevesAbandons : elevesActifs;
    const sortedEleves = [...targetList].sort((a, b) => (a?.nom || '').localeCompare(b?.nom || ''));
    
    const title = isAbandonsTab 
      ? `Liste des élèves en abandon - ${viewingClasse.nom}`
      : `Liste des élèves actifs - ${viewingClasse.nom}`;
    
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            h1 { text-align: center; color: #1e293b; margin-bottom: 4px; }
            .subtitle { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: ${isAbandonsTab ? '#ffe4e6' : '#ecfdf5'}; color: ${isAbandonsTab ? '#9f1239' : '#065f46'}; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <div class="subtitle">
            ${isAbandonsTab ? `Effectif en abandon : ${elevesAbandons.length} élève(s)` : `Effectif actif : ${elevesActifs.length} élève(s)`} | Édité le : ${new Date().toLocaleDateString('fr-FR')}
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: center;">N°</th>
                <th>Matricule</th>
                <th>Nom & Prénoms</th>
                <th style="width: 60px; text-align: center;">Sexe</th>
                ${isAbandonsTab ? '<th>Date Abandon</th><th>Motif Déclaré</th>' : '<th>Contact Parent</th>'}
              </tr>
            </thead>
            <tbody>
              ${sortedEleves.map((e, index) => `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${e.matricule || '-'}</td>
                  <td><strong>${e?.nom || ''} ${e?.prenom || ''}</strong></td>
                  <td style="text-align: center;">${e.sexe || '-'}</td>
                  ${isAbandonsTab ? `<td>${formatDateSafe(e.date_abandon, '-')}</td><td>${e.motif_abandon || 'Non spécifié'}</td>` : `<td>${e.tel_parent || '-'}</td>`}
                </tr>
              `).join('')}
              ${sortedEleves.length === 0 ? `<tr><td colspan="${isAbandonsTab ? 6 : 5}" style="text-align: center; color: #94a3b8; padding: 20px;">Aucun élève trouvé</td></tr>` : ''}
            </tbody>
          </table>
          <script>
            window.onload = () => {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleReintegrer = async (eleve: any) => {
    if (await confirm({
      title: "Réintégrer l'élève",
      message: `Voulez-vous réintégrer ${eleve.nom} ${eleve.prenom} dans les effectifs actifs de la classe ${viewingClasse?.nom || ''} ?`,
      confirmText: "Réintégrer l'élève",
      variant: "success",
      icon: "check"
    })) {
      try {
        const res = await apiFetch(`/api/eleves/${eleve.id}/reintegrer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        if (res.ok) {
          toast.success(`${eleve.nom} ${eleve.prenom} a été réintégré(e) avec succès dans les effectifs actifs !`);
          if (viewingClasse?.id) {
            fetchDetails(viewingClasse.id);
          }
          fetchClasses();
        } else {
          const data = await res.json();
          toast.error(data.error || "Erreur lors de la réintégration");
        }
      } catch (err: any) {
        toast.error("Erreur de connexion au serveur");
      }
    }
  };

  const resetForm = () => {
    setEditingClasse(null);
    setNiveauType("");
    setSelectedClasse("");
    setSelectedCycle("");
    setSelectedSerie("");
    setSuffixe("");
    setSectionsInput("");
    setSelectedSections([]);
    setFormData({ 
      nom: '', 
      niveau: '', 
      frais_scolarite: 0, 
      frais_inscription: 0, 
      plafond_conduite: 20,
      plafond_conduite_t1: 20,
      plafond_conduite_t2: 20,
      plafond_conduite_t3: 20,
      tranche1_montant: 0,
      tranche1_date_limite: '',
      tranche2_montant: 0,
      tranche2_date_limite: '',
      tranche3_montant: 0,
      tranche3_date_limite: '',
      devise: 'FCFA', 
      annee_id: 1, 
      enseignant_id: '', 
      salle_id: '' 
    });
  };

  const handleDelete = async (id: number) => {
    if (await confirm({
      title: "Supprimer la classe",
      message: "Voulez-vous vraiment supprimer cette classe ? Toutes les affectations associées seront effacées.",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      apiFetch(`/api/classes/${id}`, { method: 'DELETE' }).then(() => fetchClasses());
    }
  };

  const handleGenerateClasses = async (niveau: string, classList: string[]) => {
    if (!await confirm({
      title: "Génération automatique des classes",
      message: `Voulez-vous vraiment générer les classes pour ${niveau} ?`,
      confirmText: "Générer les classes",
      cancelText: "Annuler",
      variant: "primary",
      icon: "help"
    })) return;

    if (niveau === "Second Cycle") {
      setPendingGeneration({ niveau, classList });
      setShowSeriesModal(true);
      return;
    }

    await performGeneration(niveau, classList);
  };

  const performGeneration = async (niveau: string, classList: string[], serie?: string) => {
    try {
      for (const nom of classList) {
        const finalNom = serie ? `${nom} ${serie}` : nom;
        // Check if exists
        if (classes.some((c: any) => c.nom === finalNom)) continue;

        const res = await apiFetch('/api/classes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nom: finalNom,
            niveau: nom,
            frais_scolarite: 0, // Default value 0
            frais_inscription: 0, // Default value 0
            devise: 'FCFA',
            annee_id: 1
          })
        });
        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            throw new Error(data.error || "Erreur lors de la génération");
          } else {
            const text = await res.text();
            console.error("Non-JSON error response:", text);
            throw new Error(`Erreur serveur (${res.status}). Veuillez contacter l'administrateur.`);
          }
        }
      }
      fetchClasses();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {view === 'main' && cycle === 'all' ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Gestion des Classes</h1>
          <button onClick={() => setView('mat_primaire')} className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-lg transition-all text-center text-xl font-bold text-slate-900">
            Maternelle & Primaire
          </button>
          <button onClick={() => setView('secondaire')} className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-sm hover:shadow-lg transition-all text-center text-xl font-bold text-slate-900">
            Secondaire
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {cycle === 'all' && (
                <button onClick={() => setView('main')} className="p-2 hover:bg-slate-100 rounded-full">
                  <ChevronLeft size={24} />
                </button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {cycle === 'primaire' ? 'Classes Maternelle & Primaire' : cycle === 'secondaire' ? 'Classes Secondaire' : (view === 'mat_primaire' ? 'Maternelle & Primaire' : 'Secondaire')}
                </h1>
                <p className="text-slate-500">
                  {cycle === 'primaire' || view === 'mat_primaire' ? 'Gérez les classes de la Maternelle et du Primaire.' : 'Gérez les classes du Collège et du Lycée.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canWrite && (cycle === 'primaire' || (cycle === 'all' && view === 'mat_primaire')) && (
                <>
                  <button onClick={() => handleGenerateClasses("Maternelle", CLASSES_BY_NIVEAU["Maternelle"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Générer Maternelle</button>
                  <button onClick={() => handleGenerateClasses("Primaire", CLASSES_BY_NIVEAU["Primaire"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Générer Primaire</button>
                </>
              )}
              {canWrite && (cycle === 'secondaire' || (cycle === 'all' && view === 'secondaire')) && (
                <>
                  <button onClick={() => handleGenerateClasses("Premier Cycle", CLASSES_BY_NIVEAU["Premier Cycle"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">1er Cycle</button>
                  <button onClick={() => handleGenerateClasses("Second Cycle", CLASSES_BY_NIVEAU["Second Cycle"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">2nd Cycle</button>
                  <button onClick={() => handleGenerateClasses("Technique", CLASSES_BY_NIVEAU["Technique"])} className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">Technique</button>
                </>
              )}
              {canWrite && (
                <button 
                  onClick={() => {
                    resetForm();
                    const isPrim = cycle === 'primaire' || (cycle === 'all' && view === 'mat_primaire');
                    const isSec = cycle === 'secondaire' || (cycle === 'all' && view === 'secondaire');
                    setAllowedNiveaux(isPrim ? ["Maternelle", "Primaire"] : isSec ? ["Secondaire"] : []);
                    if (isSec) {
                      setNiveauType("Secondaire");
                    } else if (isPrim) {
                      setNiveauType("Primaire");
                    }
                    setShowModal(true);
                  }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors"
                >
                  <Plus size={20} />
                  Créer une classe
                </button>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {groupedClasses.map((group) => (
              <div key={group.title} className="space-y-4">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  {group.title}
                  <div className="h-px flex-1 bg-slate-100"></div>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {(group.classes || []).map((c: any) => (
                    <div key={c.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                          <BookOpen size={20} />
                        </div>
                        <div className="flex gap-1">
                          {canWrite && (
                            <>
                              <button 
                                onClick={() => handleEdit(c)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                title="Modifier les frais"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{c.nom}</h3>
                      <p className="text-sm text-slate-500 mb-2">{c.niveau}</p>
                      <div className="flex flex-col gap-1 mb-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Scolarité</p>
                        <p className="text-xs font-bold text-primary-600">
                          {c.frais_scolarite?.toLocaleString()} {c.devise || 'FCFA'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Inscription</p>
                        <p className="text-xs font-bold text-blue-600">
                          {c.frais_inscription?.toLocaleString()} {c.devise || 'FCFA'}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                          <User size={14} className="text-slate-400" />
                          <span className="font-semibold text-slate-700">{c.nombre_eleves || 0} actif{c.nombre_eleves > 1 ? 's' : ''}</span>
                          {Number(c.nombre_abandons || 0) > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]" title="Élèves en abandon (non comptabilisés)">
                              {c.nombre_abandons} abandon{c.nombre_abandons > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 overflow-hidden">
                          <GraduationCap size={14} className="text-slate-400 shrink-0" />
                          {(c.niveau?.includes("Maternelle") || c.niveau?.includes("Primaire") || cycle === 'primaire' || view === 'mat_primaire') ? (
                            <span className="font-semibold text-slate-700 truncate" title={c.enseignant_nom ? `Titulaire: ${c.enseignant_nom} ${c.enseignant_prenom}` : 'Aucun titulaire'}>
                              {c.enseignant_nom ? `${c.enseignant_nom} ${c.enseignant_prenom}` : 'Aucun titulaire'}
                            </span>
                          ) : (
                            <span>Profs Secondaire</span>
                          )}
                        </div>
                      </div>

                      {c.salle_nom ? (
                        <div className="mt-3 px-2.5 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 flex items-center gap-2 text-xs font-medium">
                          <DoorOpen size={14} className="text-emerald-600 shrink-0" />
                          <span className="truncate">{c.batiment_nom ? `${c.batiment_nom} • ` : ''}{c.salle_nom}</span>
                        </div>
                      ) : (
                        <div className="mt-3 px-2.5 py-1.5 bg-slate-50 text-slate-400 rounded-xl border border-slate-100 flex items-center gap-2 text-[11px]">
                          <DoorOpen size={13} className="text-slate-400 shrink-0" />
                          <span>Aucune salle attribuée</span>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <button 
                          onClick={() => handleOpen(c)}
                          className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-sm font-bold hover:bg-primary-50 hover:text-primary-600 transition-colors"
                        >
                          Ouvrir la classe
                        </button>
                        <button 
                          onClick={() => navigate(isClassePrim(c) ? `/notes-primaire?classeId=${c.id}` : `/notes?classeId=${c.id}`)}
                          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          title="Notes & Bulletins"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => navigate(isClassePrim(c) ? `/emploi-du-temps-primaire?classeId=${c.id}` : `/emploi-du-temps?classeId=${c.id}`)}
                          className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-purple-50 hover:text-purple-600 transition-colors"
                          title="Emploi du temps"
                        >
                          <Calendar size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredClasses.length === 0 && (
              <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                <BookOpen size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400">Aucune classe créée pour ce niveau.</p>
              </div>
            )}
          </div>
        </>
      )}


      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {editingClasse ? 'Modifier la Classe' : 'Nouvelle Classe'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 border-2 border-[#150f0f]">
              {/* 1: Niveau Type */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Niveau</label>
                <select 
                  required
                  value={niveauType}
                  onChange={e => {
                    setNiveauType(e.target.value);
                    setSelectedClasse("");
                    setSelectedCycle("");
                    setSelectedSerie("");
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un niveau</option>
                  {NIVEAU_TYPES.filter(n => {
                    if (cycle === 'primaire') return n === 'Maternelle' || n === 'Primaire';
                    if (cycle === 'secondaire') return n === 'Secondaire';
                    return allowedNiveaux.length === 0 || allowedNiveaux.includes(n);
                  }).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* 2: Cycle (if Secondaire) */}
              {niveauType === "Secondaire" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Cycle</label>
                  <select 
                    required
                    value={selectedCycle}
                    onChange={e => {
                      setSelectedCycle(e.target.value);
                      setSelectedClasse("");
                      setSelectedSerie("");
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner le cycle</option>
                    {CYCLES_SECONDAIRE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* 3: Classe */}
              {((niveauType && niveauType !== "Secondaire") || (niveauType === "Secondaire" && selectedCycle)) && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Classe</label>
                  <select 
                    required
                    value={selectedClasse}
                    onChange={e => setSelectedClasse(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner la classe</option>
                    {niveauType === "Maternelle" && CLASSES_BY_NIVEAU["Maternelle"].map(c => <option key={c} value={c}>{c}</option>)}
                    {niveauType === "Primaire" && CLASSES_BY_NIVEAU["Primaire"].map(c => <option key={c} value={c}>{c}</option>)}
                    {niveauType === "Secondaire" && selectedCycle === "Premier Cycle" && CLASSES_PREMIER_CYCLE.map(c => <option key={c} value={c}>{c}</option>)}
                    {niveauType === "Secondaire" && selectedCycle === "Second Cycle" && CLASSES_SECOND_CYCLE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}

              {/* 4: Série (if Second Cycle) */}
              {niveauType === "Secondaire" && selectedCycle === "Second Cycle" && selectedClasse && selectedClasse !== "2nd" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Série</label>
                  <select 
                    required
                    value={selectedSerie}
                    onChange={e => setSelectedSerie(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner la série</option>
                    {SERIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* 5: Sections / Suffixe */}
              {selectedClasse && (
                <div className="space-y-2">
                  {editingClasse ? (
                    <>
                      <label className="text-sm font-medium text-slate-700">Suffixe / Section (ex: A, B, Rouge)</label>
                      <input 
                        type="text"
                        placeholder="Ex: A"
                        value={suffixe}
                        onChange={e => setSuffixe(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-medium text-slate-700">Sections (Séparées par des virgules, ex: A, B, C)</label>
                      <input 
                        type="text"
                        placeholder="Ex: A, B, C"
                        value={sectionsInput}
                        onChange={e => {
                            setSectionsInput(e.target.value);
                            const sections = e.target.value.split(',').map(s => s.trim()).filter(s => s !== '');
                            // Update selectedSections while keeping existing fees
                            const newSelectedSections = sections.map(s => {
                                const existing = selectedSections.find(x => x.section === s);
                                return existing ? existing : {section: s, frais_scolarite: formData.frais_scolarite, frais_inscription: formData.frais_inscription};
                            });
                            setSelectedSections(newSelectedSections);
                        }}
                        className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {selectedSections.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {selectedSections.map(s => (
                                <div key={s.section} className="grid grid-cols-3 gap-2 items-center">
                                    <span className="font-bold">{s.section}</span>
                                    <input type="number" value={s.frais_scolarite} onChange={e => setSelectedSections(selectedSections.map(x => x.section === s.section ? {...x, frais_scolarite: parseFloat(e.target.value)} : x))} className="px-2 py-1 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                                    <input type="number" value={s.frais_inscription} onChange={e => setSelectedSections(selectedSections.map(x => x.section === s.section ? {...x, frais_inscription: parseFloat(e.target.value)} : x))} className="px-2 py-1 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" />
                                </div>
                            ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Aperçu du nom */}
              {selectedClasse && (
                <div className="p-3 bg-primary-50 rounded-2xl border border-primary-100 space-y-1">
                  <p className="text-[10px] font-bold text-primary-600 uppercase">Aperçu du nom final</p>
                  <p className="text-lg font-bold text-primary-700">{formData.nom}</p>
                </div>
              )}

              {(niveauType === "Maternelle" || niveauType === "Primaire") && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Enseignant Titulaire de la Classe</label>
                  <select 
                    value={formData.enseignant_id || ''}
                    onChange={e => setFormData(prev => ({...prev, enseignant_id: e.target.value}))}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="">Sélectionner un enseignant...</option>
                    {allEnseignants.filter((e: any) => {
                      const c = (e.cycle || 'secondaire').toLowerCase();
                      return c === 'primaire' || c === 'maternelle';
                    }).map((ens: any) => (
                      <option key={ens.id} value={ens.id}>{ens.nom} {ens.prenom}</option>
                    ))}
                  </select>
                </div>
              )}

              {niveauType === "Secondaire" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">Professeur Principal (Optionnel)</label>
                    <span className="text-[11px] text-slate-500 font-medium">Max 3 classes / professeur</span>
                  </div>
                  <select 
                    value={formData.enseignant_id || ''}
                    onChange={e => {
                      const selId = e.target.value;
                      if (selId) {
                        const count = getTeacherPPClassCount(selId, editingClasse?.id);
                        if (count >= 3) {
                          toast.error("Cet enseignant est déjà professeur principal de 3 classes (maximum autorisé).");
                          return;
                        }
                      }
                      setFormData(prev => ({...prev, enseignant_id: selId}));
                    }}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  >
                    <option value="">Sélectionner un professeur principal...</option>
                    {allEnseignants.filter((e: any) => {
                      const c = (e.cycle || 'secondaire').toLowerCase();
                      return c === 'secondaire' || c === 'all' || !c;
                    }).map((ens: any) => {
                      const count = getTeacherPPClassCount(ens.id, editingClasse?.id);
                      const isCurrent = String(formData.enseignant_id) === String(ens.id);
                      const isFull = count >= 3 && !isCurrent;
                      return (
                        <option key={ens.id} value={ens.id} disabled={isFull}>
                          {ens.nom} {ens.prenom} {ens.specialite ? `(${ens.specialite})` : ''} - {count}/3 classes {isFull ? '(Complet)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Frais de scolarité</label>
                  <input 
                    required
                    type="number"
                    value={formData.frais_scolarite}
                    onChange={e => setFormData(prev => ({...prev, frais_scolarite: parseFloat(e.target.value) || 0}))}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Frais d'inscription</label>
                  <input 
                    required
                    type="number"
                    value={formData.frais_inscription}
                    onChange={e => setFormData(prev => ({...prev, frais_inscription: parseFloat(e.target.value) || 0}))}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500" 
                  />
                </div>
                {!isClassePrim(null) && (
                  <div className="col-span-full p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                        Plafond de Conduite par Trimestre
                        <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">SECONDAIRE</span>
                      </label>
                      <span className="text-[11px] text-amber-700 font-medium">Base de calcul pour pénalités / ajouts</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Trimestre 1 (sur 20)</label>
                        <input 
                          type="number"
                          min="10"
                          max="20"
                          step="0.5"
                          value={formData.plafond_conduite_t1}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 20;
                            setFormData(prev => ({...prev, plafond_conduite_t1: val, plafond_conduite: val}));
                          }}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-center text-sm text-slate-800"
                          placeholder="20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Trimestre 2 (sur 20)</label>
                        <input 
                          type="number"
                          min="10"
                          max="20"
                          step="0.5"
                          value={formData.plafond_conduite_t2}
                          onChange={e => setFormData(prev => ({...prev, plafond_conduite_t2: parseFloat(e.target.value) || 20}))}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-center text-sm text-slate-800"
                          placeholder="20"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Trimestre 3 (sur 20)</label>
                        <input 
                          type="number"
                          min="10"
                          max="20"
                          step="0.5"
                          value={formData.plafond_conduite_t3}
                          onChange={e => setFormData(prev => ({...prev, plafond_conduite_t3: parseFloat(e.target.value) || 20}))}
                          className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-bold text-center text-sm text-slate-800"
                          placeholder="20"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configuration des Tranches</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 1 (Montant)</label>
                    <input 
                      type="number"
                      value={formData.tranche1_montant}
                      onChange={e => setFormData(prev => ({...prev, tranche1_montant: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 1 (Date Limite)</label>
                    <input 
                      type="date"
                      value={formData.tranche1_date_limite}
                      onChange={e => setFormData(prev => ({...prev, tranche1_date_limite: e.target.value}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 2 (Montant)</label>
                    <input 
                      type="number"
                      value={formData.tranche2_montant}
                      onChange={e => setFormData(prev => ({...prev, tranche2_montant: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 2 (Date Limite)</label>
                    <input 
                      type="date"
                      value={formData.tranche2_date_limite}
                      onChange={e => setFormData(prev => ({...prev, tranche2_date_limite: e.target.value}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 3 (Montant)</label>
                    <input 
                      type="number"
                      value={formData.tranche3_montant}
                      onChange={e => setFormData(prev => ({...prev, tranche3_montant: parseFloat(e.target.value) || 0}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tranche 3 (Date Limite)</label>
                    <input 
                      type="date"
                      value={formData.tranche3_date_limite}
                      onChange={e => setFormData(prev => ({...prev, tranche3_date_limite: e.target.value}))}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 italic">
                  Total tranches: {(formData.tranche1_montant + formData.tranche2_montant + formData.tranche3_montant).toLocaleString()} {formData.devise} 
                  { (formData.tranche1_montant + formData.tranche2_montant + formData.tranche3_montant) !== formData.frais_scolarite && 
                    <span className="text-amber-600 ml-1">(!= Frais de scolarité)</span>
                  }
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Devise</label>
                <select 
                  value={formData.devise}
                  onChange={e => setFormData(prev => ({...prev, devise: e.target.value}))}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="FCFA">FCFA</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GNF">GNF</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <DoorOpen size={16} className="text-primary-600" />
                    Salle de classe attribuée
                  </span>
                  <span className="text-xs text-slate-400 font-normal">Optionnel</span>
                </label>
                <select
                  value={formData.salle_id}
                  onChange={e => setFormData(prev => ({ ...prev, salle_id: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                >
                  <option value="">-- Aucune salle attribuée --</option>
                  {batiments.map((b: any) => {
                    const batSalles = salles.filter((s: any) => s.batiment_id === b.id);
                    if (batSalles.length === 0) return null;
                    return (
                      <optgroup key={b.id} label={`Bâtiment ${b.nom} (${b.code})`}>
                        {batSalles.map((s: any) => {
                          const occupiedBy = s.classe_nom && (!editingClasse || s.classe_id !== editingClasse.id) ? ` [Occupée par ${s.classe_nom}]` : '';
                          return (
                            <option key={s.id} value={s.id}>
                              {s.nom} ({s.code}) - Capacité: {s.capacite} places{s.etage ? ` - ${s.etage}` : ''}{occupiedBy}
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })}
                  {salles.filter((s: any) => !s.batiment_id).length > 0 && (
                    <optgroup key="others" label="Autres salles">
                      {salles.filter((s: any) => !s.batiment_id).map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.nom} ({s.code}) - Capacité: {s.capacite} places
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Preview */}
              {formData.nom && (
                <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
                  <p className="text-xs text-primary-600 font-bold uppercase mb-1">Aperçu du nom :</p>
                  <p className="text-primary-900 font-bold">{formData.nom}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={!formData.nom}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingClasse ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View */}
      {viewingClasse && (
        <div className="fixed inset-0 z-[70] bg-slate-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => setViewingClasse(null)} className="p-2 hover:bg-slate-100 rounded-full">
                <ChevronLeft size={24} />
              </button>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-900">{viewingClasse.nom}</h2>
                  {viewingClasse.salle_nom && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <DoorOpen size={12} />
                      {viewingClasse.batiment_nom ? `${viewingClasse.batiment_nom} • ` : ''}{viewingClasse.salle_nom}
                    </span>
                  )}
                  {!isClassePrim(viewingClasse) && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200" title="Plafond de conduite par trimestre">
                      Plafond Conduite : T1: {viewingClasse.plafond_conduite_t1 ?? viewingClasse.plafond_conduite ?? 20} | T2: {viewingClasse.plafond_conduite_t2 ?? viewingClasse.plafond_conduite ?? 20} | T3: {viewingClasse.plafond_conduite_t3 ?? viewingClasse.plafond_conduite ?? 20}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-slate-500">{viewingClasse.niveau}</p>
                  <span className="text-slate-300">•</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <Users size={12} />
                    Effectif actif : {(Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : []).filter((e: any) => !isEleveAbandoned(e)).length} élève(s)
                  </span>
                  {(Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : []).filter((e: any) => isEleveAbandoned(e)).length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800" title="Élèves déclarés en abandon (non comptabilisés dans l'effectif)">
                      <UserX size={12} />
                      {(Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : []).filter((e: any) => isEleveAbandoned(e)).length} abandon(s) exclu(s)
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(isClassePrim(viewingClasse) ? `/emploi-du-temps-primaire?classeId=${viewingClasse.id}` : `/emploi-du-temps?classeId=${viewingClasse.id}`)}
                className="hidden sm:flex items-center gap-2 px-4 py-1.5 bg-purple-50 text-purple-600 rounded-xl text-sm font-bold hover:bg-purple-100 transition-colors"
              >
                <Calendar size={16} />
                Emploi du temps
              </button>
              <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-hide max-w-[calc(100vw-2rem)] sm:max-w-none">
                {[
                  { id: "eleves", label: "Élèves" },
                  { id: "matieres", label: "Matières & Enseignants" },
                  isClassePrim(viewingClasse) ? { id: "notes", label: "Notes & Bulletins" } : null
                ].filter(Boolean).map((tab: any) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!classeDetails ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto">
                {activeTab === "eleves" && (() => {
                  const allEleves = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
                  const activeEleves = allEleves.filter((e: any) => !isEleveAbandoned(e)).slice().sort((a: any, b: any) => (a?.nom || '').localeCompare(b?.nom || ''));
                  const abandonEleves = allEleves.filter((e: any) => isEleveAbandoned(e)).slice().sort((a: any, b: any) => (a?.nom || '').localeCompare(b?.nom || ''));

                  return (
                    <div className="space-y-4">
                      {/* Sub-tab Switcher & Actions */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setClasseStudentsTab('actifs')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                              classeStudentsTab === 'actifs'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <Users size={14} />
                            <span>Élèves Actifs</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                              classeStudentsTab === 'actifs' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {activeEleves.length}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setClasseStudentsTab('abandons')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                              classeStudentsTab === 'abandons'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            <UserX size={14} />
                            <span>Élèves en Abandon</span>
                            {abandonEleves.length > 0 && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                classeStudentsTab === 'abandons' ? 'bg-rose-700 text-white' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {abandonEleves.length}
                              </span>
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button 
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                            title={classeStudentsTab === 'actifs' ? "Imprimer la liste des élèves actifs" : "Imprimer la liste des abandons"}
                          >
                            <Printer size={16} />
                            <span>Imprimer {classeStudentsTab === 'actifs' ? 'actifs' : 'abandons'}</span>
                          </button>
                          <button 
                            onClick={handleExportPDF}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer text-white shadow-xs ${
                              classeStudentsTab === 'actifs' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                            }`}
                            title={classeStudentsTab === 'actifs' ? "Télécharger le PDF des élèves actifs" : "Télécharger le PDF des abandons"}
                          >
                            <FileText size={16} />
                            <span>PDF {classeStudentsTab === 'actifs' ? 'Élèves Actifs' : 'Abandons'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Info Alert if abandons exist when viewing active tab */}
                      {classeStudentsTab === 'actifs' && abandonEleves.length > 0 && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-3 text-xs text-rose-800">
                          <div className="flex items-center gap-2">
                            <UserX size={16} className="text-rose-600 shrink-0" />
                            <span>
                              <strong>{abandonEleves.length} élève{abandonEleves.length > 1 ? 's' : ''}</strong> de cette classe {abandonEleves.length > 1 ? 'ont abandonné et sont exclus' : 'a abandonné et est exclu'} de cette liste active et de l'effectif.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setClasseStudentsTab('abandons')}
                            className="text-xs font-bold text-rose-700 underline hover:text-rose-900 whitespace-nowrap cursor-pointer"
                          >
                            Voir les abandons ({abandonEleves.length})
                          </button>
                        </div>
                      )}

                      {/* Table for Active Students */}
                      {classeStudentsTab === 'actifs' && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">N°</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Matricule</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Nom & Prénoms</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Sexe</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Statut Scolaire</th>
                                {canWrite && <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {activeEleves.map((e: any, eIdx: number) => (
                                <tr key={e.id || e.matricule || `eleve-${eIdx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{eIdx + 1}</td>
                                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{e.matricule}</td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                    <span>{e.nom} {e.prenom}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-600">{e.sexe}</td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold text-xs rounded-full border border-emerald-200">
                                      <Check size={12} />
                                      <span>Actif</span>
                                    </span>
                                  </td>
                                  {canWrite && (
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={() => setAbandonModalStudent(e)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200"
                                        title="Déclarer l'abandon de cet élève"
                                      >
                                        <UserX size={13} />
                                        <span>Déclarer Abandon</span>
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                              {activeEleves.length === 0 && (
                                <tr key="empty-eleves">
                                  <td colSpan={canWrite ? 6 : 5} className="px-6 py-8 text-center text-slate-400 italic">
                                    Aucun élève actif dans cette classe
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Table for Abandoned Students */}
                      {classeStudentsTab === 'abandons' && (
                        <div className="bg-white rounded-2xl border border-rose-200 overflow-hidden shadow-xs">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-rose-50/70 border-b border-rose-200">
                                <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase">N°</th>
                                <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase">Matricule</th>
                                <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase">Nom & Prénoms</th>
                                <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase">Sexe</th>
                                <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase">Date d'abandon</th>
                                <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase">Motif d'abandon</th>
                                {canWrite && <th className="px-6 py-4 text-xs font-bold text-rose-900 uppercase text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {abandonEleves.map((e: any, eIdx: number) => (
                                <tr key={e.id || e.matricule || `abandon-${eIdx}`} className="border-b border-rose-50 hover:bg-rose-50/40 transition-colors">
                                  <td className="px-6 py-4 text-xs font-bold text-slate-400">{eIdx + 1}</td>
                                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{e.matricule}</td>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                    <span>{e.nom} {e.prenom}</span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-slate-600">{e.sexe}</td>
                                  <td className="px-6 py-4 text-sm text-slate-700">
                                    {formatDateSafe(e.date_abandon, 'Non renseignée')}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-semibold text-rose-600">
                                    {e.motif_abandon || 'Non spécifié'}
                                  </td>
                                  {canWrite && (
                                    <td className="px-6 py-4 text-right">
                                      <button
                                        onClick={() => handleReintegrer(e)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                        title="Réintégrer cet élève dans les effectifs actifs"
                                      >
                                        <UserCheck size={13} />
                                        <span>Réintégrer l'élève</span>
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              ))}
                              {abandonEleves.length === 0 && (
                                <tr key="empty-abandons">
                                  <td colSpan={canWrite ? 7 : 6} className="px-6 py-8 text-center text-slate-400 italic">
                                    Excellente nouvelle ! Aucun élève n'a abandonné dans cette classe.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {activeTab === "matieres" && (
                  <div className="space-y-4">
                    {["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase())) ? (
                      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-primary-900 text-sm flex items-center gap-2">
                            <User size={16} className="text-primary-600" />
                            Enseignant Titulaire de la Classe
                          </h3>
                          <p className="text-xs text-primary-700 mt-0.5">
                            Pour le primaire et la maternelle, un enseignant unique est assigné à la classe.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <select
                            value={viewingClasse?.enseignant_id || ''}
                            onChange={async (e) => {
                              const newEnsId = e.target.value;
                              await apiFetch(`/api/classes/${viewingClasse.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...viewingClasse, enseignant_id: newEnsId })
                              });
                              setViewingClasse((prev: any) => ({ ...prev, enseignant_id: newEnsId }));
                              fetchDetails(viewingClasse.id);
                              fetchClasses();
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-white border border-primary-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-primary-500 shadow-sm"
                          >
                            <option value="">Sélectionner un enseignant...</option>
                            {allEnseignants.filter((e: any) => {
                              const c = (e.cycle || 'secondaire').toLowerCase();
                              return c === 'primaire' || c === 'maternelle';
                            }).map((ens: any) => (
                              <option key={ens.id} value={ens.id}>{ens.nom} {ens.prenom}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold text-indigo-950 text-sm flex items-center gap-2">
                            <UserCheck size={16} className="text-indigo-600" />
                            Professeur Principal de la Classe (Secondaire)
                          </h3>
                          <p className="text-xs text-indigo-700 mt-0.5">
                            Enseignant référent pour le suivi pédagogique et les bulletins de cette classe (max 3 classes / professeur).
                          </p>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <select
                            value={viewingClasse?.enseignant_id || ''}
                            onChange={async (e) => {
                              const newEnsId = e.target.value;
                              if (newEnsId) {
                                const count = getTeacherPPClassCount(newEnsId, viewingClasse.id);
                                if (count >= 3) {
                                  toast.error("Cet enseignant est déjà professeur principal de 3 classes (maximum autorisé).");
                                  return;
                                }
                              }
                              await apiFetch(`/api/classes/${viewingClasse.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ...viewingClasse, enseignant_id: newEnsId })
                              });
                              setViewingClasse((prev: any) => ({ ...prev, enseignant_id: newEnsId }));
                              toast.success("Professeur principal mis à jour");
                              fetchDetails(viewingClasse.id);
                              fetchClasses();
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-white border border-indigo-300 rounded-xl text-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            <option value="">Sélectionner un professeur principal...</option>
                            {allEnseignants.filter((e: any) => {
                              const c = (e.cycle || 'secondaire').toLowerCase();
                              return c === 'secondaire' || c === 'all' || !c;
                            }).map((ens: any) => {
                              const count = getTeacherPPClassCount(ens.id, viewingClasse.id);
                              const isCurrent = String(viewingClasse?.enseignant_id) === String(ens.id);
                              const isFull = count >= 3 && !isCurrent;
                              return (
                                <option key={ens.id} value={ens.id} disabled={isFull}>
                                  {ens.nom} {ens.prenom} {ens.specialite ? `(${ens.specialite})` : ''} - {count}/3 classes {isFull ? '(Complet)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button 
                        onClick={() => setShowAssignModal(true)}
                        className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-700 transition-colors"
                      >
                        <Plus size={18} />
                        Assigner une matière
                      </button>
                    </div>
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Matière</th>
                          {!["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase())) && (
                            <>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Enseignant</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Heures / Sem</th>
                              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-center">Coef</th>
                            </>
                          )}
                          <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const matieres = Array.isArray(classeDetails?.matieres) ? classeDetails.matieres : [];
                          const isPrimaryClass = ["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase()));
                          
                          const parentMatieres = matieres.filter(m => !m.parent_id);
                          const childMatieres = matieres.filter(m => m.parent_id);
                          const orphanMatieres = childMatieres.filter(c => !parentMatieres.some(p => p.matiere_id === c.parent_id));
                          
                          const allRows: React.ReactNode[] = [];
                          
                          parentMatieres.forEach((m, mIdx) => {
                            const children = childMatieres.filter(c => c.parent_id === m.matiere_id);
                            const hasChildren = children.length > 0;
                            
                            allRows.push(
                              <tr key={m.matiere_id || m.id || `mat-row-${mIdx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                  {m.matiere_nom}
                                  {m.categorie && (
                                    <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-bold rounded uppercase">
                                      {m.categorie}
                                    </span>
                                  )}
                                  {hasChildren && <span className="ml-2 text-[10px] text-slate-400 font-normal italic">(Matière principale)</span>}
                                </td>
                                {!isPrimaryClass && (
                                  <td className="px-6 py-4 text-sm text-slate-600">
                                    {m.enseignant_nom ? `${m.enseignant_nom} ${m.enseignant_prenom}` : 'Non assigné'}
                                  </td>
                                )}
                                {!isPrimaryClass && <td className="px-6 py-4 text-sm text-center font-mono text-slate-600">{m.heures_hebdo}h</td>}
                                {!isPrimaryClass && (
                                  <td className="px-6 py-4 text-sm text-center font-mono text-slate-600">
                                    {hasChildren ? <span className="text-slate-300 italic">-</span> : m.coefficient}
                                  </td>
                                )}
                                <td className="px-6 py-4 text-sm text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleEditAssignment(m)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteAssignment(m.matiere_id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                            
                            children.forEach((c, cIdx) => {
                              allRows.push(
                                <tr key={c.matiere_id || c.id || `child-row-${mIdx}-${cIdx}`} className="border-b border-slate-50 bg-slate-50/30 hover:bg-slate-100/50 transition-colors">
                                  <td className="px-12 py-3 text-sm text-slate-600 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                    {c.matiere_nom}
                                  </td>
                                  {!isPrimaryClass && (
                                    <td className="px-6 py-3 text-xs text-slate-500 italic">
                                      {c.enseignant_nom ? `${c.enseignant_nom} ${c.enseignant_prenom}` : 'Même enseignant'}
                                    </td>
                                  )}
                                  {!isPrimaryClass && <td className="px-6 py-3 text-xs text-center font-mono text-slate-500">{c.heures_hebdo}h</td>}
                                  {!isPrimaryClass && <td className="px-6 py-3 text-sm text-center font-bold text-primary-600">{c.coefficient}</td>}
                                  <td className="px-6 py-3 text-sm text-right">
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => handleEditAssignment(c)}
                                        className="p-1 text-slate-400 hover:text-blue-600 opacity-60 hover:opacity-100"
                                      >
                                        <Edit2 size={14} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteAssignment(c.matiere_id)}
                                        className="p-1 text-slate-400 hover:text-red-600 opacity-60 hover:opacity-100"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          });
                          
                          orphanMatieres.forEach((c, cIdx) => {
                            allRows.push(
                              <tr key={c.matiere_id || c.id || `orphan-row-${cIdx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                                  {c.matiere_nom}
                                  <span className="ml-2 text-[10px] text-slate-400 font-normal italic">(Sous-matière)</span>
                                </td>
                                {!isPrimaryClass && (
                                  <td className="px-6 py-4 text-sm text-slate-600">
                                    {c.enseignant_nom ? `${c.enseignant_nom} ${c.enseignant_prenom}` : 'Non assigné'}
                                  </td>
                                )}
                                {!isPrimaryClass && <td className="px-6 py-4 text-sm text-center font-mono text-slate-600">{c.heures_hebdo}h</td>}
                                {!isPrimaryClass && <td className="px-6 py-4 text-sm text-center font-mono text-slate-600">{c.coefficient}</td>}
                                <td className="px-6 py-4 text-sm text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleEditAssignment(c)}
                                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteAssignment(c.matiere_id)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });

                          return allRows;
                        })()}
                        {(!Array.isArray(classeDetails?.matieres) || classeDetails.matieres.length === 0) && (
                          <tr key="empty-matieres">
                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Aucune matière assignée</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

                {activeTab === "notes" && (
                  <div className="space-y-8">
                    {[1, 2, 3].map(trim => {
                      const isPrimaryClass = ["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase()));
                      const matieresList = Array.isArray(classeDetails?.matieres) ? classeDetails.matieres : [];
                      const elevesList = Array.isArray(classeDetails?.eleves) ? classeDetails.eleves : [];
                      return (
                      <div key={trim} className="space-y-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-8 h-8 bg-primary-600 text-white rounded-lg flex items-center justify-center text-sm">{trim}</span>
                          Trimestre {trim}
                        </h3>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase sticky left-0 bg-slate-50 z-10">Élève</th>
                                {matieresList
                                  .filter((m: any) => !matieresList.some((other: any) => other.parent_id === m.matiere_id))
                                  .map((m: any, mIdx: number) => (
                                  <th key={m.matiere_id || m.id || `m-th-${mIdx}`} colSpan={isPrimaryClass ? 2 : 6} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center border-l border-slate-200">
                                    {m.matiere_nom}
                                  </th>
                                ))}
                              </tr>
                              <tr className="bg-slate-50/50 border-b border-slate-200">
                                <th className="px-4 py-2 sticky left-0 bg-slate-50 z-10"></th>
                                {matieresList
                                  .filter((m: any) => !matieresList.some((other: any) => other.parent_id === m.matiere_id))
                                  .map((m: any, mIdx: number) => (
                                  isPrimaryClass ? (
                                    <React.Fragment key={m.matiere_id || m.id || `m-sub-${mIdx}`}>
                                      <th className="px-2 py-2 text-[9px] font-bold text-slate-400 text-center border-l border-slate-200">Obtenue</th>
                                      <th className="px-2 py-2 text-[9px] font-bold text-slate-400 text-center">Perf.</th>
                                    </React.Fragment>
                                  ) : (
                                    <React.Fragment key={m.matiere_id || m.id || `m-sub-${mIdx}`}>
                                      <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center border-l border-slate-200">I1</th>
                                      <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">I2</th>
                                      <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">I3</th>
                                      <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">I4</th>
                                      <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">D1</th>
                                      <th className="px-1 py-2 text-[9px] font-bold text-slate-400 text-center">D2</th>
                                    </React.Fragment>
                                  )
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {elevesList.slice().sort((a: any, b: any) => (a?.nom || '').localeCompare(b?.nom || '')).map((e: any, eIdx: number) => (
                                <tr key={e.id || e.matricule || `eleve-note-${eIdx}`} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                  <td className="px-4 py-3 text-sm font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50 z-10 whitespace-nowrap">
                                    {e.nom} {e.prenom}
                                  </td>
                                  {matieresList
                                    .filter((m: any) => !matieresList.some((other: any) => other.parent_id === m.matiere_id))
                                    .map((m: any, mIdx: number) => {
                                    const getNote = (type: string) => {
                                      const notesList = Array.isArray(classeDetails.notes) ? classeDetails.notes : [];
                                      return notesList.find((n: any) => 
                                        n.eleve_id === e.id && 
                                        n.matiere_id === m.matiere_id && 
                                        n.trimestre === trim && 
                                        n.type_evaluation === type
                                      )?.note;
                                    };
                                    if (isPrimaryClass) {
                                      const obt = getNote('NoteObtenue') ?? getNote('note_obtenue');
                                      const perf = getNote('NotePerfectionnement') ?? getNote('note_perfectionnement');
                                      return (
                                        <React.Fragment key={m.matiere_id || m.id || `note-p-${mIdx}`}>
                                          <td className="px-2 py-3 text-xs text-center border-l border-slate-100 font-bold text-primary-600">{obt !== undefined && obt !== null ? obt : '-'}</td>
                                          <td className="px-2 py-3 text-xs text-center font-bold text-primary-600">{perf !== undefined && perf !== null ? perf : '-'}</td>
                                        </React.Fragment>
                                      );
                                    }
                                    return (
                                      <React.Fragment key={m.matiere_id || m.id || `note-s-${mIdx}`}>
                                        <td className="px-1 py-3 text-xs text-center border-l border-slate-100">{getNote('I1') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center">{getNote('I2') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center">{getNote('I3') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center">{getNote('I4') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center font-bold text-primary-600">{getNote('Dev1') ?? '-'}</td>
                                        <td className="px-1 py-3 text-xs text-center font-bold text-primary-600">{getNote('Dev2') ?? '-'}</td>
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign Matiere Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[80] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">
                {editingAssignment ? 'Modifier l\'assignation' : 'Assigner une Matière'}
              </h2>
              <button 
                onClick={() => {
                  setShowAssignModal(false);
                  setEditingAssignment(null);
                  setAssignData({ matiere_id: '', matiere_ids: [], enseignant_id: '', heures_hebdo: 0, coefficient: 1 });
                }} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAssignMatiere} className="p-6 space-y-6">
              {!editingAssignment && (
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-700">Matières & Enseignants</label>
                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {Object.entries(matieresByCategory).map(([category, matieres]) => (
                      <div key={category} className="space-y-2">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-2 py-1 rounded">
                          {category}
                        </h3>
                        <div className="space-y-3">
                          {matieres
                            .filter((m: any) => !m.parent_id)
                            .map((m: any) => {
                            const isSelected = assignData.matiere_ids.includes(m.id);
                            return (
                              <div key={m.id} className="space-y-2">
                                <div 
                                  onClick={() => handleToggleMatiere(m.id)}
                                  className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${
                                    isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isSelected 
                                      ? 'bg-primary-600 border-primary-600 text-white' 
                                      : 'border-slate-200 bg-white'
                                  }`}>
                                    {isSelected && <Check size={12} strokeWidth={3} />}
                                  </div>
                                  <span className="text-sm font-medium">{m.nom}</span>
                                </div>

                                {isSelected && (
                                  <div className="ml-8 p-3 bg-white border border-primary-100 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {!["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase())) ? (
                                      <>
                                        {(() => {
                                          const children = allMatieres.filter((mat: any) => mat.parent_id === m.id);
                                          const hasChildren = children.length > 0;
                                          
                                          return (
                                            <>
                                              <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Enseignant {hasChildren ? 'Principal' : ''}</label>
                                                <select 
                                                  value={assignData.assignments[m.id]?.enseignant_id || ''}
                                                  onChange={e => {
                                                    const enseignant_id = e.target.value;
                                                    setAssignData(prev => {
                                                      const newAssignments = { ...prev.assignments };
                                                      newAssignments[m.id] = { ...newAssignments[m.id], enseignant_id };
                                                      
                                                      // Apply same teacher to children
                                                      children.forEach((c: any) => {
                                                        if (newAssignments[c.id]) {
                                                          newAssignments[c.id] = { ...newAssignments[c.id], enseignant_id };
                                                        }
                                                      });
                                                      
                                                      return { ...prev, assignments: newAssignments };
                                                    });
                                                  }}
                                                  className="w-full px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                                >
                                                  <option value="">Sélectionner un enseignant</option>
                                                  {(teachersByMatiere[m.id] || [])
                                                    .filter((e: any) => {
                                                      // Don't show teachers already assigned to OTHER subjects in this class
                                                      const otherMatiereTeachers = (classeDetails?.matieres || [])
                                                        .filter((am: any) => am.matiere_id !== m.id)
                                                        .map((am: any) => String(am.enseignant_id));
                                                      return !otherMatiereTeachers.includes(String(e.id));
                                                    })
                                                    .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                                                    .map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)
                                                  }
                                                </select>
                                                {(!teachersByMatiere[m.id] || teachersByMatiere[m.id].length === 0) && (
                                                  <p className="text-[9px] text-amber-600 italic">Aucun enseignant trouvé pour cette matière.</p>
                                                )}
                                              </div>

                                              {!hasChildren ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                  <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Heures / Sem</label>
                                                    <input 
                                                      type="number"
                                                      min="0"
                                                      value={assignData.assignments[m.id]?.heures_hebdo || 0}
                                                      onChange={e => setAssignData({
                                                        ...assignData,
                                                        assignments: {
                                                          ...assignData.assignments,
                                                          [m.id]: { ...assignData.assignments[m.id], heures_hebdo: parseInt(e.target.value) || 0 }
                                                        }
                                                      })}
                                                      className="w-full px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Coefficient</label>
                                                    <input 
                                                      type="number"
                                                      min="1"
                                                      value={assignData.assignments[m.id]?.coefficient || 1}
                                                      onChange={e => setAssignData({
                                                        ...assignData,
                                                        assignments: {
                                                          ...assignData.assignments,
                                                          [m.id]: { ...assignData.assignments[m.id], coefficient: parseInt(e.target.value) || 1 }
                                                        }
                                                      })}
                                                      className="w-full px-3 py-1.5 bg-slate-50 border-none rounded-lg text-xs outline-none focus:ring-2 focus:ring-primary-500"
                                                    />
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="space-y-3 pt-2 border-t border-slate-100">
                                                  <div className="space-y-1 bg-primary-50/60 p-2.5 rounded-xl border border-primary-100">
                                                    <label className="text-[10px] font-bold text-primary-900 uppercase flex items-center justify-between">
                                                      <span>Nombre d'heures / semaine</span>
                                                      <span className="text-[9px] bg-primary-200 text-primary-800 px-1.5 py-0.5 rounded font-bold">Matière principale</span>
                                                    </label>
                                                    <div className="flex items-center gap-2">
                                                      <input 
                                                        type="number"
                                                        min="0"
                                                        value={assignData.assignments[m.id]?.heures_hebdo ?? 0}
                                                        onChange={e => setAssignData({
                                                          ...assignData,
                                                          assignments: {
                                                            ...assignData.assignments,
                                                            [m.id]: { ...assignData.assignments[m.id], heures_hebdo: parseInt(e.target.value) || 0 }
                                                          }
                                                        })}
                                                        className="w-full px-3 py-1.5 bg-white border border-primary-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500 text-slate-800"
                                                        placeholder="Ex: 5"
                                                      />
                                                      <span className="text-xs text-primary-700 font-semibold whitespace-nowrap">h / sem</span>
                                                    </div>
                                                  </div>
                                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Sous-matières (Coefficients)</label>
                                                  <div className="space-y-2">
                                                    {children.map((c: any) => (
                                                      <div key={c.id} className="flex items-center justify-between gap-4 p-2 bg-slate-50 rounded-lg">
                                                        <span className="text-[11px] font-medium text-slate-700 truncate">{c.nom}</span>
                                                        <div className="flex items-center gap-2">
                                                          <span className="text-[10px] text-slate-400 font-bold">COEFF</span>
                                                          <input 
                                                            type="number"
                                                            min="1"
                                                            value={assignData.assignments[c.id]?.coefficient || 1}
                                                            onChange={e => setAssignData({
                                                              ...assignData,
                                                              assignments: {
                                                                ...assignData.assignments,
                                                                [c.id]: { ...assignData.assignments[c.id], coefficient: parseInt(e.target.value) || 1 }
                                                              }
                                                            })}
                                                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-bold outline-none focus:ring-2 focus:ring-primary-500"
                                                          />
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          );
                                        })()}
                                      </>
                                    ) : (
                                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg italic">
                                        Pas d'enseignant, d'heures ou de coefficient par matière en Primaire & Maternelle
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

               {editingAssignment && (
                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Matière</p>
                    <p className="text-lg font-bold text-slate-900">{editingAssignment.matiere_nom}</p>
                  </div>
                  {!["Maternelle", "Maternelle I", "Maternelle II", "Primaire", "CI", "CP", "CE1", "CE2", "CM1", "CM2"].some(lvl => (viewingClasse?.niveau || '').toLowerCase().includes(lvl.toLowerCase())) ? (
                    <>
                      {(() => {
                        const children = allMatieres.filter((mat: any) => mat.parent_id === editingAssignment.matiere_id);
                        const hasChildren = children.length > 0;

                        return (
                          <>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-700">Enseignant {hasChildren ? 'Principal' : ''}</label>
                              <select 
                                value={assignData.enseignant_id}
                                onChange={e => setAssignData({...assignData, enseignant_id: e.target.value})}
                                className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                              >
                                <option value="">Sélectionner un enseignant</option>
                                {(teachersByMatiere[editingAssignment.matiere_id] || [])
                                  .filter((e: any) => {
                                    const isPrim = isPrimaireLevel(viewingClasse?.niveau || viewingClasse?.nom || '');
                                    const c = (e.cycle || 'secondaire').toLowerCase();
                                    const eIsPrim = c === 'primaire' || c === 'maternelle';
                                    const correctCycle = isPrim ? eIsPrim : !eIsPrim;
                                    if (!correctCycle) return false;

                                    const otherMatiereTeachers = (classeDetails?.matieres || [])
                                      .filter((am: any) => am.matiere_id !== editingAssignment?.matiere_id)
                                      .map((am: any) => String(am.enseignant_id));
                                    return !otherMatiereTeachers.includes(String(e.id));
                                  })
                                  .sort((a: any, b: any) => a.nom.localeCompare(b.nom))
                                  .map((e: any) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
                              </select>
                              {(!teachersByMatiere[editingAssignment.matiere_id] || teachersByMatiere[editingAssignment.matiere_id].length === 0) && (
                                <p className="text-[10px] text-amber-600 italic mt-1 px-1">Aucun enseignant trouvé pour cette matière.</p>
                              )}
                            </div>

                            {!hasChildren ? (
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700">Heures / Sem</label>
                                  <input 
                                    required
                                    type="number"
                                    min="0"
                                    value={assignData.heures_hebdo}
                                    onChange={e => setAssignData({...assignData, heures_hebdo: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium text-slate-700">Coefficient</label>
                                  <input 
                                    required
                                    type="number"
                                    min="1"
                                    value={assignData.coefficient}
                                    onChange={e => setAssignData({...assignData, coefficient: parseInt(e.target.value)})}
                                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3 pt-4 border-t border-slate-100">
                                <div className="space-y-2 bg-primary-50/60 p-3.5 rounded-2xl border border-primary-100">
                                  <label className="text-sm font-medium text-primary-900 flex items-center justify-between">
                                    <span>Nombre d'heures par semaine</span>
                                    <span className="text-xs bg-primary-200/80 text-primary-800 px-2 py-0.5 rounded-full font-bold">Matière principale</span>
                                  </label>
                                  <div className="flex items-center gap-3">
                                    <input 
                                      type="number"
                                      min="0"
                                      value={assignData.heures_hebdo}
                                      onChange={e => setAssignData({...assignData, heures_hebdo: parseInt(e.target.value) || 0})}
                                      className="w-full px-4 py-2 bg-white border border-primary-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-semibold text-slate-800"
                                      placeholder="Ex: 5"
                                    />
                                    <span className="text-sm text-primary-700 font-medium whitespace-nowrap">h / sem</span>
                                  </div>
                                </div>
                                <label className="text-sm font-bold text-slate-600 uppercase tracking-tight">Sous-matières (Coefficients)</label>
                                <div className="space-y-2">
                                  {children.map((c: any) => {
                                    // In editing mode, we might not have a separate entry for each child in assignData yet
                                    // if the modal was just opened. But editingAssignment usually refers to a single row.
                                    // If it's a parent, we might need to handle children separately.
                                    return (
                                      <div key={c.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50 rounded-xl">
                                        <span className="text-sm font-medium text-slate-700">{c.nom}</span>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs text-slate-400 font-bold">COEFF</span>
                                          <input 
                                            type="number"
                                            min="1"
                                            value={assignData.assignments[c.id]?.coefficient || 1}
                                            onChange={e => {
                                              const val = parseInt(e.target.value) || 1;
                                              setAssignData(prev => ({
                                                ...prev,
                                                assignments: {
                                                  ...prev.assignments,
                                                  [c.id]: { ...prev.assignments[c.id], coefficient: val }
                                                }
                                              }));
                                            }}
                                            className="w-20 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-primary-500"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-xl italic">
                      En Maternelle & Primaire, il n'y a pas d'enseignant par matière, d'heures par semaine ni de coefficient.
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setEditingAssignment(null);
                    setAssignData({ matiere_id: '', matiere_ids: [], enseignant_id: '', heures_hebdo: 0, coefficient: 1, assignments: {} });
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  disabled={!editingAssignment && (assignData.matiere_ids || []).length === 0}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {editingAssignment ? 'Enregistrer' : `Assigner ${(assignData.matiere_ids || []).length > 0 ? `(${(assignData.matiere_ids || []).length})` : ''}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showSeriesModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">Entrer la série</h2>
            <input 
              type="text"
              className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 mb-4"
              placeholder="Ex: A1, C, D"
              value={seriesInput}
              onChange={e => setSeriesInput(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setShowSeriesModal(false)} className="flex-1 px-4 py-2 bg-slate-100 rounded-xl">Annuler</button>
              <button onClick={() => {
                if (pendingGeneration) {
                  performGeneration(pendingGeneration.niveau, pendingGeneration.classList, seriesInput);
                  setShowSeriesModal(false);
                  setSeriesInput("");
                  setPendingGeneration(null);
                }
              }} className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl">Générer</button>
            </div>
          </div>
        </div>
      )}

      {/* Student Abandon / Reprise Modal */}
      {abandonModalStudent && (
        <StudentAbandonModal
          student={abandonModalStudent}
          isOpen={Boolean(abandonModalStudent)}
          onClose={() => setAbandonModalStudent(null)}
          onSuccess={() => {
            if (viewingClasse?.id) {
              fetchDetails(viewingClasse.id);
            }
            fetchClasses();
          }}
        />
      )}

      {/* Class Duplicate with Suffix Modal */}
      {showDuplicateModal && duplicateClasseInfo && (
        <ClassDuplicateModal
          isOpen={showDuplicateModal}
          onClose={() => {
            setShowDuplicateModal(false);
            setDuplicateClasseInfo(null);
          }}
          baseClassName={duplicateClasseInfo.baseNom}
          onConfirmWithSuffix={handleCreateWithSuffix}
          isSubmitting={isSubmittingSuffix}
        />
      )}
    </div>
  );
}

