import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Check, 
  Search, 
  Sparkles, 
  Loader2, 
  Layers, 
  School, 
  BookOpen, 
  CheckSquare, 
  Square, 
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Filter,
  ArrowRight
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';
import { Matiere } from '../types';
import { isPrimarySubject } from '../utils/subjectCatalog';

interface ClassItem {
  id: number;
  nom: string;
  niveau: string;
  cycle?: string;
  nombre_eleves?: number;
  matieres_count?: number;
}

interface AssignSubjectsToClassesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSelectedMatiereIds?: number[];
  allMatieres: Matiere[];
  activeCycle?: 'all' | 'secondaire' | 'primaire';
}

export default function AssignSubjectsToClassesModal({
  isOpen,
  onClose,
  onSuccess,
  initialSelectedMatiereIds = [],
  allMatieres,
  activeCycle = 'secondaire'
}: AssignSubjectsToClassesModalProps) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);
  const [selectedMatiereIds, setSelectedMatiereIds] = useState<number[]>([]);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [includeSubSubjects, setIncludeSubSubjects] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [classSearch, setClassSearch] = useState('');
  const [classCycleFilter, setClassCycleFilter] = useState<'all' | 'college' | 'lycee' | 'primaire'>('all');
  const [matiereSearch, setMatiereSearch] = useState('');
  const [matiereCategoryFilter, setMatiereCategoryFilter] = useState<string>('all');

  // Load classes overview
  useEffect(() => {
    if (!isOpen) return;

    setLoadingClasses(true);
    apiFetch('/api/matieres/classes-overview')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setClasses(data);
        } else {
          setClasses([]);
        }
      })
      .catch(() => {
        // Fallback to /api/classes
        apiFetch('/api/classes')
          .then(res => res.json())
          .then(data => setClasses(Array.isArray(data) ? data : []))
          .catch(() => setClasses([]));
      })
      .finally(() => setLoadingClasses(false));
  }, [isOpen]);

  // Initialize selected subjects when modal opens or initialSelectedMatiereIds changes
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedMatiereIds && initialSelectedMatiereIds.length > 0) {
        setSelectedMatiereIds(initialSelectedMatiereIds);
      } else {
        // Default to all secondary parent subjects if cycle is secondaire
        const defaultMatieres = allMatieres
          .filter(m => !m.parent_id && (activeCycle === 'secondaire' ? !isPrimarySubject(m) : true))
          .map(m => m.id);
        setSelectedMatiereIds(defaultMatieres);
      }
    }
  }, [isOpen, initialSelectedMatiereIds, allMatieres, activeCycle]);

  // Relevant subjects for current cycle
  const availableMatieres = useMemo(() => {
    const list = Array.isArray(allMatieres) ? allMatieres : [];
    // Only show parent subjects (sub-subjects are automatically attached or handled)
    return list.filter(m => {
      if (m.parent_id) return false;
      if (activeCycle === 'secondaire') return !isPrimarySubject(m);
      if (activeCycle === 'primaire') return isPrimarySubject(m);
      return true;
    });
  }, [allMatieres, activeCycle]);

  // Categories present in available subjects
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableMatieres.forEach(m => {
      if (m.categorie) set.add(m.categorie);
    });
    return Array.from(set);
  }, [availableMatieres]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const nom = (c.nom || '').toLowerCase();
      const niveau = (c.niveau || '').toLowerCase();
      const search = classSearch.toLowerCase().trim();

      const matchSearch = !search || nom.includes(search) || niveau.includes(search);

      let matchCycle = true;
      const isCollege = ['6', '5', '4', '3', 'sixi', 'cinq', 'quatr', 'trois'].some(k => nom.includes(k) || niveau.includes(k));
      const isLycee = ['2nd', '1er', 'tle', 'term', 'second', 'premi'].some(k => nom.includes(k) || niveau.includes(k));
      const isPrimaire = ['ci', 'cp', 'ce1', 'ce2', 'cm1', 'cm2', 'mater'].some(k => nom.includes(k) || niveau.includes(k));

      if (classCycleFilter === 'college') matchCycle = isCollege;
      else if (classCycleFilter === 'lycee') matchCycle = isLycee;
      else if (classCycleFilter === 'primaire') matchCycle = isPrimaire;

      return matchSearch && matchCycle;
    });
  }, [classes, classSearch, classCycleFilter]);

  // Filtered subjects
  const filteredMatieres = useMemo(() => {
    return availableMatieres.filter(m => {
      const search = matiereSearch.toLowerCase().trim();
      const matchSearch = !search ||
        m.nom.toLowerCase().includes(search) ||
        (m.sigle && m.sigle.toLowerCase().includes(search)) ||
        (m.code && m.code.toLowerCase().includes(search));

      const matchCat = matiereCategoryFilter === 'all' || m.categorie === matiereCategoryFilter;

      return matchSearch && matchCat;
    });
  }, [availableMatieres, matiereSearch, matiereCategoryFilter]);

  // Toggle class selection
  const toggleClass = (id: number) => {
    setSelectedClassIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle all filtered classes
  const toggleAllClasses = () => {
    const allFilteredIds = filteredClasses.map(c => c.id);
    const allSelected = allFilteredIds.every(id => selectedClassIds.includes(id));
    if (allSelected) {
      setSelectedClassIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedClassIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Quick 1-click select for class groups
  const selectClassesByGroup = (group: 'all' | 'college' | 'lycee') => {
    let target = classes;
    if (group === 'college') {
      target = classes.filter(c => {
        const nom = (c.nom || '').toLowerCase();
        const niveau = (c.niveau || '').toLowerCase();
        const cycle = (c.cycle || '').toLowerCase();
        return cycle === 'college' || ['6', '5', '4', '3', 'sixi', 'cinq', 'quatr', 'trois'].some(k => nom.includes(k) || niveau.includes(k));
      });
    } else if (group === 'lycee') {
      target = classes.filter(c => {
        const nom = (c.nom || '').toLowerCase();
        const niveau = (c.niveau || '').toLowerCase();
        const cycle = (c.cycle || '').toLowerCase();
        return cycle === 'lycee' || ['2nd', '1er', 'tle', 'term', 'second', 'premi'].some(k => nom.includes(k) || niveau.includes(k));
      });
    }
    const ids = target.map(c => c.id);
    setSelectedClassIds(ids);
    toast.success(`${ids.length} classe(s) sélectionnée(s) en 1 clic`);
  };

  // Toggle subject selection
  const toggleMatiere = (id: number) => {
    setSelectedMatiereIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Toggle all filtered subjects
  const toggleAllMatieres = () => {
    const allFilteredIds = filteredMatieres.map(m => m.id);
    const allSelected = allFilteredIds.every(id => selectedMatiereIds.includes(id));
    if (allSelected) {
      setSelectedMatiereIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedMatiereIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Quick packs for secondary subjects
  const applySubjectPack = (packType: 'all' | 'college' | 'lycee_scientifique' | 'lycee_litteraire') => {
    if (packType === 'all') {
      setSelectedMatiereIds(availableMatieres.map(m => m.id));
      return;
    }

    const collegeKeywords = ['français', 'math', 'anglais', 'svt', 'physique', 'chimie', 'histoire', 'géographie', 'eps', 'sport', 'espagnol', 'allemand', 'pct', 'conduite'];
    const scKeywords = ['math', 'physique', 'chimie', 'svt', 'anglais', 'français', 'philosophie', 'eps', 'informatique'];
    const litKeywords = ['français', 'philosophie', 'histoire', 'géographie', 'anglais', 'espagnol', 'allemand', 'littérature', 'eps', 'math'];

    let targetKeywords: string[] = [];
    if (packType === 'college') targetKeywords = collegeKeywords;
    else if (packType === 'lycee_scientifique') targetKeywords = scKeywords;
    else if (packType === 'lycee_litteraire') targetKeywords = litKeywords;

    const matchedIds = availableMatieres
      .filter(m => {
        const nom = m.nom.toLowerCase();
        const sigle = (m.sigle || '').toLowerCase();
        return targetKeywords.some(k => nom.includes(k) || sigle.includes(k));
      })
      .map(m => m.id);

    setSelectedMatiereIds(matchedIds);
    toast.success(`Pack appliqué : ${matchedIds.length} matières sélectionnées`);
  };

  // Submit bulk assignment
  const handleAssignSubmit = async () => {
    if (selectedClassIds.length === 0) {
      toast.error("Veuillez cocher au moins une classe.");
      return;
    }
    if (selectedMatiereIds.length === 0) {
      toast.error("Veuillez cocher au moins une matière.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/matieres/assign-to-classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_ids: selectedClassIds,
          matiere_ids: selectedMatiereIds,
          replace_existing: replaceExisting,
          include_sub_subjects: includeSubSubjects
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'assignation");
      }

      toast.success(
        `Succès ! ${data.matieresCount || selectedMatiereIds.length} matière(s) assignée(s) à ${data.classesCount || selectedClassIds.length} classe(s) en un clic.`,
        { duration: 4000 }
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Une erreur est survenue");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div 
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Layers size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Assignation des Matières aux Classes
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                  {activeCycle === 'secondaire' ? 'Secondaire' : 'Multi-Classes'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Sélectionnez une ou plusieurs classes et cochez les matières à leur affecter en 1 seul clic.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body: Two columns layout */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* COLUMN 1: TARGET CLASSES */}
          <div className="flex flex-col bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <School size={18} className="text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  1. Classes Cibles ({selectedClassIds.length} sélectionnée{selectedClassIds.length > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                type="button"
                onClick={toggleAllClasses}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                {filteredClasses.length > 0 && filteredClasses.every(c => selectedClassIds.includes(c.id)) ? (
                  <>
                    <Square size={13} />
                    Tout désélectionner
                  </>
                ) : (
                  <>
                    <CheckSquare size={13} />
                    Tout sélectionner ({filteredClasses.length})
                  </>
                )}
              </button>
            </div>

            {/* Quick Cycle Filters & 1-Click Select for Classes */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Filtrer:</span>
              <button
                type="button"
                onClick={() => setClassCycleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                  classCycleFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Toutes ({classes.length})
              </button>
              <button
                type="button"
                onClick={() => setClassCycleFilter('college')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                  classCycleFilter === 'college'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Collège (6e - 3e)
              </button>
              <button
                type="button"
                onClick={() => setClassCycleFilter('lycee')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${
                  classCycleFilter === 'lycee'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                Lycée (2nde - Tle)
              </button>
            </div>

            {/* 1-Click Multi-Class Select Action Bar */}
            <div className="flex items-center gap-1.5 mb-3 p-1.5 bg-white border border-slate-200/90 rounded-xl overflow-x-auto">
              <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap">
                <Sparkles size={11} /> 1 Clic:
              </span>
              <button
                type="button"
                onClick={() => selectClassesByGroup('college')}
                className="px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors whitespace-nowrap border border-slate-100"
                title="Cocher instantanément toutes les classes de collège"
              >
                Tout Collège
              </button>
              <button
                type="button"
                onClick={() => selectClassesByGroup('lycee')}
                className="px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors whitespace-nowrap border border-slate-100"
                title="Cocher instantanément toutes les classes de lycée"
              >
                Tout Lycée
              </button>
              <button
                type="button"
                onClick={() => selectClassesByGroup('all')}
                className="px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors whitespace-nowrap border border-slate-100"
                title="Cocher toutes les classes"
              >
                Toutes
              </button>
              {selectedClassIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedClassIds([])}
                  className="px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-md transition-colors whitespace-nowrap ml-auto"
                >
                  Effacer ({selectedClassIds.length})
                </button>
              )}
            </div>

            {/* Class Search Bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                value={classSearch}
                onChange={e => setClassSearch(e.target.value)}
                placeholder="Rechercher une classe (ex: 6ème A, 3ème...)"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
              />
            </div>

            {/* Classes List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
              {loadingClasses ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="animate-spin text-indigo-600" size={24} />
                  <p className="text-xs">Chargement des classes...</p>
                </div>
              ) : filteredClasses.length > 0 ? (
                filteredClasses.map(c => {
                  const isChecked = selectedClassIds.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      onClick={() => toggleClass(c.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs'
                          : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black truncate">{c.nom}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Niveau: {c.niveau || 'Standard'} • {c.nombre_eleves ?? 0} élèves
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {c.matieres_count !== undefined && (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            c.matieres_count > 0 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {c.matieres_count} matière{c.matieres_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Aucune classe ne correspond à votre filtre.
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 2: SUBJECTS TO ASSIGN */}
          <div className="flex flex-col bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">
                  2. Matières à Assigner ({selectedMatiereIds.length} sélectionnée{selectedMatiereIds.length > 1 ? 's' : ''})
                </h3>
              </div>
              <button
                type="button"
                onClick={toggleAllMatieres}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
              >
                {filteredMatieres.length > 0 && filteredMatieres.every(m => selectedMatiereIds.includes(m.id)) ? (
                  <>
                    <Square size={13} />
                    Tout désélectionner
                  </>
                ) : (
                  <>
                    <CheckSquare size={13} />
                    Tout sélectionner ({filteredMatieres.length})
                  </>
                )}
              </button>
            </div>

            {/* Quick Presets / Packs */}
            <div className="flex items-center gap-1.5 mb-2.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => applySubjectPack('all')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <Sparkles size={11} className="text-amber-500" />
                Toutes ({availableMatieres.length})
              </button>
              <button
                type="button"
                onClick={() => applySubjectPack('college')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                <GraduationCap size={11} className="text-indigo-600" />
                Pack Collège
              </button>
              <button
                type="button"
                onClick={() => applySubjectPack('lycee_scientifique')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                Pack Scientifique
              </button>
              <button
                type="button"
                onClick={() => applySubjectPack('lycee_litteraire')}
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1 whitespace-nowrap"
              >
                Pack Littéraire
              </button>
            </div>

            {/* Subject Search and Category Filter */}
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                <input
                  type="text"
                  value={matiereSearch}
                  onChange={e => setMatiereSearch(e.target.value)}
                  placeholder="Rechercher une matière (nom, sigle...)"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>

              {categories.length > 0 && (
                <select
                  value={matiereCategoryFilter}
                  onChange={e => setMatiereCategoryFilter(e.target.value)}
                  className="px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none max-w-[140px] truncate"
                >
                  <option value="all">Toutes cat.</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Subjects List */}
            <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
              {filteredMatieres.length > 0 ? (
                filteredMatieres.map(m => {
                  const isChecked = selectedMatiereIds.includes(m.id);
                  const childSubCount = allMatieres.filter(c => Number(c.parent_id) === Number(m.id)).length;

                  return (
                    <label
                      key={m.id}
                      onClick={() => toggleMatiere(m.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-indigo-50/80 border-indigo-300 text-indigo-950 shadow-2xs'
                          : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isChecked 
                            ? 'bg-indigo-600 border-indigo-600 text-white' 
                            : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check size={13} strokeWidth={3} />}
                        </div>

                        <div 
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] shadow-2xs shrink-0"
                          style={{ backgroundColor: m.color || '#4f46e5' }}
                        >
                          {m.sigle ? m.sigle.substring(0, 3) : m.nom.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black truncate">{m.nom}</span>
                            {m.sigle && (
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-bold font-mono">
                                {m.sigle}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {m.categorie || 'Matière'} • Coef: <strong className="text-slate-700">{m.coefficient}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {childSubCount > 0 && (
                          <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            +{childSubCount} sous-matière{childSubCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  Aucune matière trouvée.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Configuration & CTA */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1.5 w-full sm:w-auto">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={includeSubSubjects}
                onChange={e => setIncludeSubSubjects(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <span>Inclure automatiquement les sous-matières rattachées (ex: Dictée, Grammaire)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={e => setReplaceExisting(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
              />
              <span className={replaceExisting ? "text-rose-600 font-extrabold" : "text-slate-600 font-medium"}>
                Remplacer / écraser les matières existantes des classes sélectionnées
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
            >
              Annuler
            </button>

            <button
              type="button"
              onClick={handleAssignSubmit}
              disabled={isSubmitting || selectedClassIds.length === 0 || selectedMatiereIds.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Assignation en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-amber-300" />
                  <span>
                    Assigner {selectedMatiereIds.length} matière{selectedMatiereIds.length > 1 ? 's' : ''} à {selectedClassIds.length} classe{selectedClassIds.length > 1 ? 's' : ''} en 1 clic
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
