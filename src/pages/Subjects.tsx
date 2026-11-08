import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  Plus, 
  BookOpen, 
  Trash2, 
  X, 
  Edit2, 
  Check, 
  Sparkles, 
  Loader2, 
  Search, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2, 
  SlidersHorizontal,
  ArrowRight,
  Info,
  Tag,
  Lightbulb,
  Filter,
  GraduationCap,
  Baby,
  Layers,
  School,
  CornerDownRight,
  GitBranch,
  Split
} from 'lucide-react';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { 
  SUBJECT_CATEGORIES, 
  STANDARDIZED_SUBJECTS_CATALOG,
  StandardSubject,
  checkSubjectDuplicate,
  extractOrGenerateSigle,
  generateSubjectCode,
  findCatalogMatch,
  DuplicateCheckResult,
  getCatalogByCycle,
  getCategoriesByCycle,
  isPrimarySubject,
  getSubSubjectSuggestions,
  SubSubjectTemplate
} from '../utils/subjectCatalog';
import { Matiere } from '../types';
import AssignSubjectsToClassesModal from '../components/AssignSubjectsToClassesModal';

interface SubjectsProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Subjects({ cycle = 'all' }: SubjectsProps) {
  const confirm = useConfirm();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/matieres' : p.path === '/matieres'));
  const canWrite = ['admin', 'super_admin', 'direction', 'censeur'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [matieres, setMatieres] = React.useState<Matiere[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = React.useState<string>('all');
  
  // Tab for cycle selection when cycle is 'all'
  const [activeCycleTab, setActiveCycleTab] = React.useState<'all' | 'secondaire' | 'primaire'>(
    cycle === 'primaire' ? 'primaire' : (cycle === 'secondaire' ? 'secondaire' : 'secondaire')
  );

  // Effective current cycle context
  const effectiveCycle = cycle !== 'all' ? cycle : activeCycleTab;

  // Modal State
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [modalTab, setModalTab] = React.useState<'propositions' | 'custom'>('propositions');
  const [catalogCategoryTab, setCatalogCategoryTab] = React.useState<string>('');
  const [catalogSearch, setCatalogSearch] = React.useState('');
  
  // Pack Modal
  const [showDefaultPackModal, setShowDefaultPackModal] = React.useState(false);
  const [clearExistingBeforePack, setClearExistingBeforePack] = React.useState(false);
  const [selectedDefaults, setSelectedDefaults] = React.useState<string[]>([]);
  const [loadingDefaults, setLoadingDefaults] = React.useState(false);

  // Bulk Assign Modal State
  const [showAssignModal, setShowAssignModal] = React.useState(false);
  const [assignInitialMatiereIds, setAssignInitialMatiereIds] = React.useState<number[]>([]);

  const handleOpenAssignModal = (singleMatiere?: Matiere) => {
    if (singleMatiere) {
      setAssignInitialMatiereIds([singleMatiere.id]);
    } else {
      setAssignInitialMatiereIds([]);
    }
    setShowAssignModal(true);
  };

  // Edit State
  const [editingMatiere, setEditingMatiere] = React.useState<Matiere | null>(null);

  // Custom / Form Data
  const [formData, setFormData] = React.useState({
    nom: '',
    code: '',
    sigle: '',
    categorie: '',
    coefficient: 2,
    parent_id: '',
    cycle: 'secondaire' as 'primaire' | 'secondaire' | 'technique' | 'tous',
    description: '',
    color: '#4f46e5',
    est_disciplinaire: false,
    heures_hebdo: 0
  });

  // Duplicate Check Result
  const [duplicateWarning, setDuplicateWarning] = React.useState<DuplicateCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const fetchMatieres = () => {
    setLoading(true);
    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(data => {
        setMatieres(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setMatieres([]);
        setLoading(false);
      });
  };

  React.useEffect(() => {
    fetchMatieres();
  }, []);

  // Update catalogCategoryTab when effective cycle changes
  React.useEffect(() => {
    const availableCats = getCategoriesByCycle(effectiveCycle);
    if (availableCats.length > 0 && (!catalogCategoryTab || !availableCats.some(c => c.id === catalogCategoryTab))) {
      setCatalogCategoryTab(availableCats[0].id);
    }
  }, [effectiveCycle, catalogCategoryTab]);

  // Filter based on effective cycle
  const cycleFilteredMatieres = React.useMemo(() => {
    const list = Array.isArray(matieres) ? matieres : [];
    if (effectiveCycle === 'primaire') {
      return list.filter((m: any) => isPrimarySubject(m));
    }
    if (effectiveCycle === 'secondaire') {
      return list.filter((m: any) => !isPrimarySubject(m));
    }
    return list;
  }, [matieres, effectiveCycle]);

  // Categories available for current view filter
  const currentViewCategories = React.useMemo(() => {
    return getCategoriesByCycle(effectiveCycle);
  }, [effectiveCycle]);

  // Search & category filter on the main list
  const filteredMatieres = React.useMemo(() => {
    return cycleFilteredMatieres.filter((m: Matiere) => {
      const matchSearch = 
        !searchTerm.trim() ||
        m.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.code && m.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.sigle && m.sigle.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (m.categorie && m.categorie.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCat = selectedCategoryFilter === 'all' || m.categorie === selectedCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [cycleFilteredMatieres, searchTerm, selectedCategoryFilter]);

  // Group into parents and sub-subjects
  const groupedMatieres = React.useMemo(() => {
    if (effectiveCycle === 'primaire') {
      return filteredMatieres.map((m: any) => ({
        ...m,
        displayName: m.nom,
        subSubjects: []
      }));
    }

    // Secondary cycle: gather all secondary subjects
    const allSecondary = cycleFilteredMatieres;
    const allChildren = allSecondary.filter((m: any) => !!m.parent_id);
    const parents = allSecondary.filter((m: any) => !m.parent_id);

    return parents
      .map(p => {
        const subSubjects = allChildren.filter((c: any) => Number(c.parent_id) === Number(p.id));
        const subNames = subSubjects.map((s: any) => s.sigle || s.nom).join(' & ');
        return {
          ...p,
          displayName: subNames ? `${p.nom} (${subNames})` : p.nom,
          subSubjects
        };
      })
      .filter(p => {
        // If no search filter is active, show all parents
        if (!searchTerm.trim() && selectedCategoryFilter === 'all') return true;

        const matchParentSearch = 
          !searchTerm.trim() ||
          p.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.sigle && p.sigle.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (p.categorie && p.categorie.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchParentCat = selectedCategoryFilter === 'all' || p.categorie === selectedCategoryFilter;

        const anyChildMatches = p.subSubjects.some((c: any) => {
          const matchChildSearch = 
            !searchTerm.trim() ||
            c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (c.sigle && c.sigle.toLowerCase().includes(searchTerm.toLowerCase()));
          return matchChildSearch;
        });

        return (matchParentSearch && matchParentCat) || anyChildMatches;
      });
  }, [cycleFilteredMatieres, filteredMatieres, effectiveCycle, searchTerm, selectedCategoryFilter]);

  // Real-time live duplicate validation when form data changes
  React.useEffect(() => {
    if (!formData.nom.trim()) {
      setDuplicateWarning(null);
      return;
    }
    const result = checkSubjectDuplicate(
      {
        nom: formData.nom,
        code: formData.code,
        sigle: formData.sigle,
        id: editingMatiere?.id,
        cycle: formData.cycle,
        categorie: formData.categorie,
        parent_id: formData.parent_id ? Number(formData.parent_id) : undefined
      },
      matieres,
      editingMatiere?.id,
      formData.cycle === 'primaire' ? 'primaire' : 'secondaire'
    );
    setDuplicateWarning(result);
  }, [formData.nom, formData.code, formData.sigle, formData.cycle, formData.categorie, formData.parent_id, matieres, editingMatiere]);

  // Auto-fill / update helpers when candidate changes
  const handleNomChange = (newNom: string) => {
    const isSub = !!formData.parent_id;
    const targetCycle = isSub ? 'secondaire' : (formData.cycle === 'primaire' ? 'primaire' : 'secondaire');
    const catalogMatch = isSub ? null : findCatalogMatch(newNom, targetCycle);
    const generatedSigle = extractOrGenerateSigle(newNom, formData.sigle, targetCycle);
    const generatedCode = generateSubjectCode(newNom, generatedSigle, matieres, editingMatiere?.id);

    setFormData(prev => ({
      ...prev,
      nom: newNom,
      sigle: prev.sigle && prev.sigle !== extractOrGenerateSigle(prev.nom) ? prev.sigle : generatedSigle,
      code: prev.code && prev.code !== generateSubjectCode(prev.nom, prev.sigle, matieres, editingMatiere?.id) ? prev.code : generatedCode,
      categorie: catalogMatch && (!prev.categorie || prev.categorie === 'Sciences & Technologies' || prev.categorie === 'Langage, Lecture & Français (Primaire)') ? catalogMatch.categorie : (prev.categorie || (targetCycle === 'primaire' ? 'Langage, Lecture & Français (Primaire)' : 'Sciences & Technologies')),
      coefficient: catalogMatch && prev.coefficient === 2 ? catalogMatch.coefficient : prev.coefficient,
      cycle: prev.parent_id ? 'secondaire' : (catalogMatch ? catalogMatch.cycle : prev.cycle)
    }));
  };

  // Add sub-subject directly for a given parent subject
  const handleAddSubSubject = (parentMatiere: Matiere) => {
    setEditingMatiere(null);
    const parentCycle = isPrimarySubject(parentMatiere) ? 'primaire' : 'secondaire';
    const suggestions = getSubSubjectSuggestions(parentMatiere.nom);
    const firstSugg = suggestions.length > 0 ? suggestions[0] : null;

    setFormData({
      nom: firstSugg ? firstSugg.nom : '',
      code: firstSugg ? generateSubjectCode(firstSugg.nom, firstSugg.sigle, matieres) : '',
      sigle: firstSugg ? firstSugg.sigle : '',
      categorie: parentMatiere.categorie || 'Lettres & Langues',
      coefficient: firstSugg ? firstSugg.coefficient : 1,
      parent_id: String(parentMatiere.id),
      cycle: parentCycle,
      description: firstSugg ? firstSugg.description : '',
      color: parentMatiere.color || '#4f46e5',
      est_disciplinaire: false,
      heures_hebdo: 0
    });
    setDuplicateWarning(null);
    setModalTab('custom');
    setShowAddModal(true);
  };

  const applySubSubjectTemplate = (template: SubSubjectTemplate) => {
    const code = generateSubjectCode(template.nom, template.sigle, matieres);
    setFormData(prev => ({
      ...prev,
      nom: template.nom,
      sigle: template.sigle,
      code,
      coefficient: template.coefficient,
      description: template.description || ''
    }));
  };

  const applyCatalogRecommendation = (std: StandardSubject) => {
    const code = generateSubjectCode(std.nom, std.sigle, matieres);
    setFormData({
      nom: std.nom,
      code,
      sigle: std.sigle,
      categorie: std.categorie,
      coefficient: std.coefficient,
      parent_id: '',
      cycle: std.cycle,
      description: std.description,
      color: std.color || '#4f46e5',
      est_disciplinaire: std.est_disciplinaire || false,
      heures_hebdo: 0
    });
    setModalTab('custom');
    toast.success(`Modèle "${std.sigle}" appliqué. Vous pouvez ajuster les informations.`);
  };

  // Direct 1-Click Add from Categorized Catalog
  const handleAddDirectFromCatalog = async (std: StandardSubject) => {
    const targetCycle = std.cycle === 'primaire' ? 'primaire' : 'secondaire';
    const dup = checkSubjectDuplicate({ nom: std.nom, code: std.code, sigle: std.sigle, cycle: std.cycle, categorie: std.categorie }, matieres, null, targetCycle);
    if (dup.isDuplicate) {
      toast.error(`Doublon détecté : ${dup.reason}`);
      return;
    }

    const code = generateSubjectCode(std.nom, std.sigle, matieres);
    try {
      const res = await apiFetch('/api/matieres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: std.nom,
          code,
          sigle: std.sigle,
          categorie: std.categorie,
          coefficient: std.coefficient,
          cycle: std.cycle,
          description: std.description,
          color: std.color
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de l'ajout");
      }

      toast.success(`Matière "${std.nom}" (${std.sigle}) ajoutée avec l'ID ${code}`);
      fetchMatieres();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      toast.error("Le nom de la matière est obligatoire.");
      return;
    }

    if (duplicateWarning?.isDuplicate) {
      toast.error(duplicateWarning.reason || "Impossible d'enregistrer : cette matière existe déjà.");
      return;
    }

    setIsSubmitting(true);
    const url = editingMatiere ? `/api/matieres/${editingMatiere.id}` : '/api/matieres';
    const method = editingMatiere ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'enregistrement");
      }

      setShowAddModal(false);
      setEditingMatiere(null);
      fetchMatieres();
      toast.success(editingMatiere ? "Matière mise à jour avec succès" : `Matière enregistrée avec le code ${data.code || formData.code}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (m: Matiere) => {
    setEditingMatiere(m);
    const isSub = !!m.parent_id;
    const mIsPrimary = !isSub && isPrimarySubject(m);
    const parentSubject = isSub ? matieres.find(p => Number(p.id) === Number(m.parent_id)) : null;

    setFormData({ 
      nom: m.nom ?? '', 
      code: m.code ?? `MAT-${m.sigle || 'MAT'}-${m.id}`,
      sigle: m.sigle ?? extractOrGenerateSigle(m.nom, '', mIsPrimary ? 'primaire' : 'secondaire'),
      categorie: m.categorie ?? (parentSubject?.categorie || (mIsPrimary ? 'Langage, Lecture & Français (Primaire)' : 'Sciences & Technologies')), 
      coefficient: m.coefficient ?? 1,
      parent_id: m.parent_id ? String(m.parent_id) : '',
      cycle: isSub ? 'secondaire' : (mIsPrimary ? 'primaire' : 'secondaire'),
      description: m.description ?? '',
      color: m.color ?? (parentSubject?.color || '#4f46e5'),
      est_disciplinaire: m.est_disciplinaire || false
    });
    setModalTab('custom');
    setShowAddModal(true);
  };

  const handleDelete = async (id: number, nom: string, code?: string) => {
    if (await confirm({
      title: "Supprimer la matière",
      message: `Voulez-vous vraiment supprimer la matière "${nom}" (${code || `ID: ${id}`}) ? Les notes et affectations liées seront détachées.`,
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      apiFetch(`/api/matieres/${id}`, { method: 'DELETE' })
        .then(async res => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Erreur lors de la suppression");
          }
          return res.json();
        })
        .then(() => {
          fetchMatieres();
          toast.success("Matière supprimée avec succès");
        })
        .catch(err => toast.error(err.message));
    }
  };

  const handleClearAllSubjects = async () => {
    const cycleName = effectiveCycle === 'primaire' ? 'du Primaire & Maternelle' : effectiveCycle === 'secondaire' ? 'du Secondaire (Collège & Lycée)' : 'de l\'établissement';
    if (await confirm({
      title: `Effacer les matières ${cycleName}`,
      message: `Êtes-vous sûr de vouloir supprimer toutes les matières du cycle sélectionné ? Cette action réinitialisera uniquement les matières de ce cycle sans affecter l'autre cycle.`,
      confirmText: "Tout effacer",
      variant: "danger",
      icon: "trash"
    })) {
      try {
        const res = await apiFetch(`/api/matieres/cycle/${effectiveCycle}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success(`Les matières ${cycleName} ont été effacées.`);
          fetchMatieres();
        } else {
          const err = await res.json();
          toast.error(err.error || "Erreur lors de la suppression des matières.");
        }
      } catch (e: any) {
        toast.error(e.message || "Erreur de connexion.");
      }
    }
  };

  // Open Default Pack with all relevant subjects preselected according to current cycle
  const handleOpenPackModal = () => {
    const catalog = getCatalogByCycle(effectiveCycle);
    setSelectedDefaults(catalog.map(s => s.nom));
    setShowDefaultPackModal(true);
  };

  const handleAddDefaultPack = async () => {
    const catalog = getCatalogByCycle(effectiveCycle);
    const toAdd = catalog.filter(s => selectedDefaults.includes(s.nom));
    if (toAdd.length === 0) {
      toast.error("Veuillez sélectionner au moins une matière.");
      return;
    }
    setLoadingDefaults(true);
    try {
      const res = await apiFetch('/api/matieres/default-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          matieresList: toAdd,
          clearExisting: clearExistingBeforePack,
          cycle: effectiveCycle
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(
          clearExistingBeforePack 
            ? `Anciennes matières réinitialisées et ${data.count || toAdd.length} matière(s) du ${effectiveCycle === 'primaire' ? 'Primaire' : 'Secondaire'} configurée(s) avec succès.`
            : `${data.count || 0} matière(s) ajoutée(s) sans doublon avec succès.`
        );
        setShowDefaultPackModal(false);
        fetchMatieres();
      } else {
        toast.error(data.error || "Erreur lors de l'ajout du pack.");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion.");
    } finally {
      setLoadingDefaults(false);
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingMatiere(null);
    const defaultCat = effectiveCycle === 'primaire' ? 'Langage, Lecture & Français (Primaire)' : 'Sciences & Technologies';
    setFormData({
      nom: '',
      code: '',
      sigle: '',
      categorie: defaultCat,
      coefficient: 2,
      parent_id: '',
      cycle: effectiveCycle === 'primaire' ? 'primaire' : 'secondaire',
      description: '',
      color: effectiveCycle === 'primaire' ? '#9333ea' : '#4f46e5',
      est_disciplinaire: false
    });
    setDuplicateWarning(null);
    setModalTab('propositions');
    const availableCats = getCategoriesByCycle(effectiveCycle);
    setCatalogCategoryTab(availableCats[0]?.id || defaultCat);
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
              effectiveCycle === 'primaire' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {effectiveCycle === 'primaire' ? <Baby size={22} /> : <BookOpen size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {cycle === 'primaire' 
                    ? 'Matières du Primaire & Maternelle' 
                    : cycle === 'secondaire' 
                    ? 'Matières du Secondaire (Collège & Lycée)' 
                    : 'Gestion des Matières'}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                  effectiveCycle === 'primaire'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {effectiveCycle === 'primaire' ? 'Cycle Primaire / Maternelle' : 'Cycle Secondaire'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Distinction stricte des cycles, correspondances des sigles officiels (ex: SVT = Sc. Vie & Terre, EST = Éveil Scientifique), identifiants uniques et prévention anti-doublons.
              </p>
            </div>
          </div>
        </div>

        {canWrite && (
          <div className="flex flex-wrap items-center gap-2.5">
            {groupedMatieres.length > 0 && (
              <button 
                id="btn-clear-subjects"
                onClick={handleClearAllSubjects}
                className="bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors shadow-xs text-xs"
              >
                <Trash2 size={16} />
                Effacer ({effectiveCycle === 'primaire' ? 'Primaire' : 'Secondaire'})
              </button>
            )}
            <button 
              id="btn-assign-subjects-to-classes"
              onClick={() => handleOpenAssignModal()}
              className="bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-colors shadow-xs text-xs"
              title="Sélectionner une ou plusieurs classes et leur assigner des matières en un clic"
            >
              <Layers size={16} />
              <span>Assigner aux classes</span>
            </button>
            <button 
              id="btn-load-default-pack"
              onClick={handleOpenPackModal}
              className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors shadow-xs text-xs"
            >
              <Sparkles size={16} />
              Pack par défaut ({effectiveCycle === 'primaire' ? 'Primaire' : 'Secondaire'})
            </button>
            <button 
              id="btn-add-subject"
              onClick={handleOpenAddModal}
              className={`text-white px-4 py-2.5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-md text-xs ${
                effectiveCycle === 'primaire' 
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200' 
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
              }`}
            >
              <Plus size={16} />
              Ajouter une matière
            </button>
          </div>
        )}
      </div>

      {/* Cycle Switcher Tabs (when global view) */}
      {cycle === 'all' && (
        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-2">
          <button
            id="tab-cycle-secondary"
            onClick={() => {
              setActiveCycleTab('secondaire');
              setSelectedCategoryFilter('all');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeCycleTab === 'secondaire'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <GraduationCap size={16} />
            <span>Matières Secondaire (Collège & Lycée)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeCycleTab === 'secondaire' ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {matieres.filter(m => !isPrimarySubject(m)).length}
            </span>
          </button>

          <button
            id="tab-cycle-primary"
            onClick={() => {
              setActiveCycleTab('primaire');
              setSelectedCategoryFilter('all');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeCycleTab === 'primaire'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Baby size={16} />
            <span>Matières Maternelle & Primaire</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeCycleTab === 'primaire' ? 'bg-purple-700/80 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              {matieres.filter(m => isPrimarySubject(m)).length}
            </span>
          </button>

          <button
            id="tab-cycle-all"
            onClick={() => {
              setActiveCycleTab('all');
              setSelectedCategoryFilter('all');
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeCycleTab === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers size={16} />
            <span>Toutes ({matieres.length})</span>
          </button>
        </div>
      )}

      {/* Info & Sigles Recognition Banner */}
      <div className={`border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs ${
        effectiveCycle === 'primaire'
          ? 'bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border-purple-100 text-purple-950'
          : 'bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border-indigo-100/80 text-slate-700'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 ${
            effectiveCycle === 'primaire' ? 'text-purple-600' : 'text-indigo-600'
          }`}>
            <Lightbulb size={18} />
          </div>
          <div>
            <span className="font-black block text-xs">
              {effectiveCycle === 'primaire' ? 'Référentiel Disciplinaire Primaire & Maternelle' : 'Référentiel Disciplinaire Secondaire (Collège & Lycée)'}
            </span>
            <span className="text-[11px] opacity-90">
              {effectiveCycle === 'primaire'
                ? 'Les matières fondamentales du primaire (Communication Orale, Lecture, Calcul, EST, ES, EA, EPS...) sont bien isolées du secondaire.'
                : 'Les sigles officiels (SVT, PCT, HG, EPS, ECM, INFO...) génèrent automatiquement leurs codes uniques et équivalences de noms.'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {effectiveCycle === 'primaire' ? (
            <>
              <span className="px-2 py-1 bg-white border border-purple-200 rounded-lg font-mono font-bold text-[10px] text-purple-700 shadow-2xs">CO = Comm. Orale</span>
              <span className="px-2 py-1 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-[10px] text-indigo-700 shadow-2xs">EST = Éveil Scient.</span>
              <span className="px-2 py-1 bg-white border border-teal-200 rounded-lg font-mono font-bold text-[10px] text-teal-700 shadow-2xs">ES = Éduc. Sociale</span>
              <span className="px-2 py-1 bg-white border border-pink-200 rounded-lg font-mono font-bold text-[10px] text-pink-700 shadow-2xs">EA = Éduc. Art.</span>
            </>
          ) : (
            <>
              <span className="px-2 py-1 bg-white border border-indigo-200 rounded-lg font-mono font-bold text-[10px] text-indigo-700 shadow-2xs">SVT = Sc. Vie & Terre</span>
              <span className="px-2 py-1 bg-white border border-teal-200 rounded-lg font-mono font-bold text-[10px] text-teal-700 shadow-2xs">PCT = Phys-Chimie</span>
              <span className="px-2 py-1 bg-white border border-amber-200 rounded-lg font-mono font-bold text-[10px] text-amber-700 shadow-2xs">HG = Hist-Géo</span>
              <span className="px-2 py-1 bg-white border border-rose-200 rounded-lg font-mono font-bold text-[10px] text-rose-700 shadow-2xs">EPS = Sport</span>
            </>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            id="input-search-subject"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par nom, sigle (ex: SVT, EST, CALC), code ou catégorie..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter size={14} className="text-slate-400 shrink-0 ml-1" />
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Toutes les catégories
          </button>
          {currentViewCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategoryFilter === cat.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="animate-spin text-indigo-600" size={32} />
            <p className="text-xs font-medium">Chargement des matières...</p>
          </div>
        ) : groupedMatieres.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {groupedMatieres.map((matiere: any) => {
              const isPrimary = isPrimarySubject(matiere);
              const isSecondary = !isPrimary;
              const hasSubSubjects = matiere.subSubjects && matiere.subSubjects.length > 0;

              return (
                <div 
                  key={matiere.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col gap-3 group"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-xs shadow-xs shrink-0 mt-0.5 sm:mt-0"
                        style={{ backgroundColor: matiere.color || (isPrimary ? '#9333ea' : '#4f46e5') }}
                      >
                        {matiere.sigle || extractOrGenerateSigle(matiere.nom)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 text-sm">
                            {matiere.nom}
                          </span>

                          {/* Distinct cycle badge */}
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                            isPrimary
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {isPrimary ? 'Primaire / Maternelle' : 'Secondaire'}
                          </span>

                          {matiere.sigle && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px] font-bold border border-slate-200">
                              Sigle : {matiere.sigle}
                            </span>
                          )}

                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-mono text-[10px] font-bold border border-indigo-100">
                            ID: {matiere.code || `MAT-${matiere.id}`}
                          </span>

                          {hasSubSubjects && (
                            <span className="px-2 py-0.5 bg-sky-50 text-sky-700 rounded-md text-[10px] font-bold border border-sky-200 flex items-center gap-1">
                              <Split size={11} />
                              {matiere.subSubjects.length} sous-matière{matiere.subSubjects.length > 1 ? 's' : ''}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(matiere)}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 transition-colors ${
                              ((matiere as any).assigned_classes_count || 0) > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={((matiere as any).assigned_classes_names) ? `Assignée aux classes: ${(matiere as any).assigned_classes_names}` : "Cliquer pour assigner à des classes en 1 clic"}
                          >
                            <School size={11} />
                            {((matiere as any).assigned_classes_count || 0) > 0 
                              ? `${(matiere as any).assigned_classes_count} classe${(matiere as any).assigned_classes_count > 1 ? 's' : ''}`
                              : '0 classe'
                            }
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium mt-1 flex-wrap">
                          <span className="text-slate-600 font-semibold">{matiere.categorie || 'Général'}</span>
                          <span>•</span>
                          {matiere.est_disciplinaire && (
                            <>
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">DISCIPLINAIRE</span>
                              <span>•</span>
                            </>
                          )}
                          {isSecondary && hasSubSubjects ? (
                            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                              Coefficients par sous-matière (aucun coef global)
                            </span>
                          ) : (
                            <span>Coefficient : <strong className="text-slate-800 font-bold">{matiere.coefficient}</strong></span>
                          )}
                          {matiere.description && (
                            <>
                              <span>•</span>
                              <span className="text-slate-400 italic truncate max-w-md">{matiere.description}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {canWrite && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {isSecondary && (
                          <button 
                            id={`btn-add-subsubject-${matiere.id}`}
                            onClick={() => handleAddSubSubject(matiere)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1 border border-indigo-200 shadow-2xs transition-colors"
                            title={`Ajouter une sous-matière à ${matiere.nom}`}
                          >
                            <Plus size={13} />
                            <span>Sous-matière</span>
                          </button>
                        )}
                        <button 
                          id={`btn-assign-classes-${matiere.id}`}
                          onClick={() => handleOpenAssignModal(matiere)}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-indigo-200 shadow-2xs transition-colors"
                          title={`Assigner ${matiere.nom} à une ou plusieurs classes en 1 clic`}
                        >
                          <Layers size={13} />
                          <span>Assigner aux classes</span>
                        </button>
                        <button 
                          id={`btn-edit-subject-${matiere.id}`}
                          onClick={() => handleEdit(matiere)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Modifier la matière principale"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          id={`btn-delete-subject-${matiere.id}`}
                          onClick={() => handleDelete(matiere.id, matiere.nom, matiere.code)}
                          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Supprimer la matière"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sub-subjects Section for Secondary */}
                  {isSecondary && (
                    <div className="mt-1 ml-4 sm:ml-12 pl-3 border-l-2 border-indigo-100 space-y-2">
                      {hasSubSubjects ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Sous-matières personnalisées :</span>
                            {canWrite && (
                              <button 
                                onClick={() => handleAddSubSubject(matiere)}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-bold hover:underline flex items-center gap-0.5"
                              >
                                <Plus size={12} />
                                Ajouter une sous-matière
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {matiere.subSubjects.map((sub: any) => (
                              <div 
                                key={sub.id} 
                                className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-indigo-200 hover:bg-white transition-all shadow-2xs group/sub"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <CornerDownRight size={13} className="text-indigo-400 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-bold text-xs text-slate-800 truncate">
                                        {sub.nom}
                                      </span>
                                      {sub.sigle && (
                                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-white text-indigo-700 border border-slate-200 rounded">
                                          {sub.sigle}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
                                      <span className="text-indigo-600 font-bold">Coef : {sub.coefficient}</span>
                                      <span>•</span>
                                      <span className="font-mono text-slate-400 text-[9px]">{sub.code || `ID:${sub.id}`}</span>
                                    </div>
                                  </div>
                                </div>

                                {canWrite && (
                                  <div className="flex items-center gap-0.5 opacity-80 group-hover/sub:opacity-100">
                                    <button 
                                      id={`btn-edit-sub-${sub.id}`}
                                      onClick={() => handleEdit(sub)}
                                      className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                      title="Modifier cette sous-matière"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button 
                                      id={`btn-delete-sub-${sub.id}`}
                                      onClick={() => handleDelete(sub.id, sub.nom, sub.code)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                      title="Supprimer cette sous-matière"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        canWrite && (
                          <div className="flex items-center justify-between text-xs text-slate-400 py-1">
                            <span className="text-[11px] italic">Discipline enseignée d'un seul bloc (sans sous-matières).</span>
                            <button 
                              onClick={() => handleAddSubSubject(matiere)}
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold hover:underline flex items-center gap-1"
                            >
                              <Plus size={12} />
                              Ajouter des sous-matières (ex: Communication écrite, Lecture...)
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <BookOpen size={24} />
            </div>
            <h3 className="font-black text-slate-800 text-sm">
              Aucune matière enregistrée pour le cycle {effectiveCycle === 'primaire' ? 'Primaire & Maternelle' : 'Secondaire'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Utilisez le pack standard pour initialiser les disciplines officielles en un clic, ou ajoutez vos matières personnalisées par catégorie.
            </p>
            {canWrite && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button 
                  onClick={handleOpenPackModal}
                  className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm text-xs"
                >
                  <Sparkles size={16} />
                  Charger le pack standard {effectiveCycle === 'primaire' ? 'Primaire' : 'Secondaire'}
                </button>
                <button 
                  onClick={handleOpenAddModal}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm text-xs"
                >
                  <Plus size={16} />
                  Ajouter par catégorie
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL AJOUT / MODIFICATION DE MATIÈRE (AVEC PROPOSITIONS PAR CATÉGORIE) */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-6 overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm ${
                  effectiveCycle === 'primaire' ? 'bg-purple-600' : 'bg-indigo-600'
                }`}>
                  {editingMatiere ? <Edit2 size={18} /> : <Plus size={20} />}
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {editingMatiere ? `Modifier : ${editingMatiere.nom}` : `Ajouter une Matière (${effectiveCycle === 'primaire' ? 'Primaire & Maternelle' : 'Secondaire'})`}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {editingMatiere ? 'Ajustez le nom, le sigle, l\'identifiant ou le coefficient' : 'Sélectionnez parmi les propositions par catégorie ou créez une matière sur-mesure'}
                  </p>
                </div>
              </div>
              <button 
                id="btn-close-modal-subject"
                onClick={() => { setShowAddModal(false); setEditingMatiere(null); }} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Navigation Tabs (Propositions par catégorie vs Personnalisée) */}
            {!editingMatiere && (
              <div className="flex border-b border-slate-100 bg-slate-50/50 p-2 gap-2">
                <button
                  id="tab-propositions"
                  type="button"
                  onClick={() => setModalTab('propositions')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    modalTab === 'propositions'
                      ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles size={15} className="text-indigo-600" />
                  Matières par Catégorie (Propositions Recommandées)
                </button>
                <button
                  id="tab-custom"
                  type="button"
                  onClick={() => setModalTab('custom')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    modalTab === 'custom'
                      ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <SlidersHorizontal size={15} className="text-indigo-600" />
                  Personnaliser une Matière (Sur mesure)
                </button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* VIEW 1: PROPOSITIONS PAR CATÉGORIE */}
              {modalTab === 'propositions' && !editingMatiere && (
                <div className="space-y-4">
                  {/* Search in catalog */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder="Filtrer les propositions par sigle (ex: SVT, EST, CO) ou mot-clé..."
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                    {catalogSearch && (
                      <button onClick={() => setCatalogSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Categories Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5">
                    {currentViewCategories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCatalogCategoryTab(cat.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          catalogCategoryTab === cat.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span>{cat.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Subject Proposals Grid/List */}
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {getCatalogByCycle(effectiveCycle)
                      .filter(std => {
                        const matchCat = catalogSearch.trim() ? true : std.categorie === catalogCategoryTab;
                        const matchQuery = 
                          !catalogSearch.trim() ||
                          std.nom.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                          std.sigle.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                          std.aliases.some(a => a.toLowerCase().includes(catalogSearch.toLowerCase()));
                        return matchCat && matchQuery;
                      })
                      .map(std => {
                        const dup = checkSubjectDuplicate(
                          { nom: std.nom, code: std.code, sigle: std.sigle, cycle: std.cycle, categorie: std.categorie }, 
                          matieres, 
                          null, 
                          effectiveCycle
                        );
                        const isAlreadyAdded = dup.isDuplicate;

                        return (
                          <div 
                            key={std.code}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              isAlreadyAdded
                                ? 'bg-slate-50/80 border-slate-200 opacity-80'
                                : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div 
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-2xs shrink-0"
                                style={{ backgroundColor: std.color || '#4f46e5' }}
                              >
                                {std.sigle}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-slate-900">{std.nom}</span>
                                  <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono text-[9px] font-bold">
                                    Sigle : {std.sigle}
                                  </span>
                                  <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded font-mono text-[9px] font-bold">
                                    ID: {std.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-normal truncate max-w-sm mt-0.5">
                                  {std.description}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              {isAlreadyAdded ? (
                                <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-200">
                                  <Check size={14} />
                                  Déjà enregistrée
                                </span>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => applyCatalogRecommendation(std)}
                                    className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                                    title="Personnaliser ce modèle avant d'enregistrer"
                                  >
                                    <SlidersHorizontal size={13} />
                                    Personnaliser
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleAddDirectFromCatalog(std)}
                                    className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
                                  >
                                    <Plus size={14} />
                                    Ajouter
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Bottom link to custom */}
                  <div className="pt-2 text-center border-t border-slate-100">
                    <p className="text-xs text-slate-500">
                      La matière que vous recherchez n'est pas dans les propositions ?{' '}
                      <button 
                        type="button"
                        onClick={() => setModalTab('custom')}
                        className="text-indigo-600 font-bold hover:underline inline-flex items-center gap-1 ml-1"
                      >
                        Créer une matière personnalisée <ArrowRight size={12} />
                      </button>
                    </p>
                  </div>
                </div>
              )}

              {/* VIEW 2: FORMULAIRE SUR-MESURE (PERSONNALISATION) */}
              {(modalTab === 'custom' || editingMatiere) && (
                <form id="form-subject-custom" onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Alert if duplicate detected live */}
                  {duplicateWarning?.isDuplicate && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-rose-800 animate-fade-in">
                      <ShieldAlert size={18} className="text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold block">Conflit ou doublon détecté :</span>
                        <p>{duplicateWarning.reason}</p>
                        {duplicateWarning.matchedSubject && (
                          <p className="text-[11px] text-rose-600 font-medium">
                            Correspondance trouvée avec : <strong>{duplicateWarning.matchedSubject.nom}</strong> ({duplicateWarning.matchedSubject.code || `ID: ${duplicateWarning.matchedSubject.id}`})
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Information / Recognition badge */}
                  {duplicateWarning?.standardCatalogMatch && !duplicateWarning.isDuplicate && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-800">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Correspondance reconnue avec le référentiel officiel :</span>
                        <p className="text-[11px] mt-0.5">
                          Discipline standardisée : <strong>{duplicateWarning.standardCatalogMatch.nom}</strong> (Sigle standard : <strong>{duplicateWarning.standardCatalogMatch.sigle}</strong>).
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Structure / Hiérarchie de la matière (Secondaire) */}
                  {formData.cycle !== 'primaire' && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Split size={14} className="text-indigo-600" />
                          Structure de la discipline (Secondaire)
                        </label>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white border border-slate-200 text-slate-600">
                          {formData.parent_id ? 'Sous-matière' : 'Matière Principale'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, parent_id: '' }))}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            !formData.parent_id
                              ? 'bg-white border-indigo-600 text-indigo-700 shadow-2xs ring-2 ring-indigo-500/10'
                              : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block">Discipline Principale</span>
                          <span className="text-[10px] font-normal text-slate-500 mt-0.5 block">
                            Matière globale (ex: Français, PCT, SVT, Anglais)
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const secParents = matieres.filter(m => !m.parent_id && !isPrimarySubject(m) && (!editingMatiere || m.id !== editingMatiere.id));
                            if (secParents.length > 0) {
                              const firstParent = secParents[0];
                              setFormData(prev => ({
                                ...prev,
                                parent_id: String(firstParent.id),
                                categorie: firstParent.categorie || prev.categorie,
                                color: firstParent.color || prev.color
                              }));
                            } else {
                              toast.error("Aucune matière principale disponible pour rattacher une sous-matière.");
                            }
                          }}
                          className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                            formData.parent_id
                              ? 'bg-white border-indigo-600 text-indigo-700 shadow-2xs ring-2 ring-indigo-500/10'
                              : 'bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="block">Sous-matière rattachée</span>
                          <span className="text-[10px] font-normal text-slate-500 mt-0.5 block">
                            Composante (ex: Communication écrite, Lecture...)
                          </span>
                        </button>
                      </div>

                      {/* Parent Selector when Sub-subject */}
                      {formData.parent_id && (
                        <div className="pt-2.5 border-t border-slate-200/70 space-y-2.5">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                              Matière Principale Parente <span className="text-rose-500">*</span>
                            </label>
                            <select
                              id="select-subject-parent"
                              value={formData.parent_id}
                              onChange={(e) => {
                                const pId = e.target.value;
                                const pObj = matieres.find(m => String(m.id) === String(pId));
                                setFormData(prev => ({
                                  ...prev,
                                  parent_id: pId,
                                  categorie: pObj?.categorie || prev.categorie,
                                  color: pObj?.color || prev.color
                                }));
                              }}
                              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                            >
                              {matieres
                                .filter(m => !m.parent_id && !isPrimarySubject(m) && (!editingMatiere || m.id !== editingMatiere.id))
                                .map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.nom} {p.sigle ? `(${p.sigle})` : ''} - {p.categorie || 'Général'}
                                  </option>
                                ))}
                            </select>
                          </div>

                          {/* Dynamic Sub-Subject Suggestions Chips */}
                          {(() => {
                            const selectedParent = matieres.find(m => String(m.id) === String(formData.parent_id));
                            const subSuggestions = selectedParent ? getSubSubjectSuggestions(selectedParent.nom) : [];
                            if (subSuggestions.length === 0) return null;
                            return (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                  <Lightbulb size={13} className="text-amber-500" />
                                  <span>Propositions rapides pour {selectedParent?.nom} :</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {subSuggestions.map((sugg) => (
                                    <button
                                      key={sugg.sigle}
                                      type="button"
                                      onClick={() => applySubSubjectTemplate(sugg)}
                                      className="px-2.5 py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-[11px] font-medium text-slate-700 hover:text-indigo-700 transition-all shadow-2xs flex items-center gap-1.5"
                                    >
                                      <Plus size={12} className="text-indigo-600" />
                                      <span className="font-bold">{sugg.nom}</span>
                                      <span className="text-slate-400 font-mono text-[9px]">({sugg.sigle}, Coef {sugg.coefficient})</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Nom de la matière */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {formData.parent_id ? 'Intitulé de la sous-matière' : 'Nom complet de la matière'} <span className="text-rose-500">*</span>
                    </label>
                    <input 
                      id="input-subject-name"
                      type="text"
                      required
                      value={formData.nom}
                      onChange={(e) => handleNomChange(e.target.value)}
                      placeholder={formData.parent_id ? "Ex: Communication écrite, Lecture, Orthographe..." : "Ex: Science de la Vie et de la Terre, Français, PCT..."}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-900"
                    />
                  </div>

                  {/* Sigle & Code Identifiant */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Sigle / Abréviation
                        </label>
                        <span className="text-[10px] text-slate-400">Généré auto si vide</span>
                      </div>
                      <input 
                        id="input-subject-sigle"
                        type="text"
                        value={formData.sigle}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setFormData({ ...formData, sigle: val, code: formData.code || generateSubjectCode(formData.nom, val, matieres) });
                        }}
                        placeholder="Ex: SVT, EST, PCT, CO"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-indigo-700 uppercase"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Code Unique / Identifiant
                        </label>
                        <span className="text-[10px] text-slate-400">Unique par école</span>
                      </div>
                      <input 
                        id="input-subject-code"
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="Ex: MAT-SVT-01"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  {/* Catégorie & Coefficient */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Catégorie de la matière
                      </label>
                      <select 
                        id="select-subject-category"
                        value={formData.categorie}
                        onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      >
                        {SUBJECT_CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label} ({cat.cycle === 'primaire' ? 'Primaire' : 'Secondaire'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {formData.parent_id ? 'Coefficient de la sous-matière' : 'Coefficient'}
                      </label>
                      {editingMatiere && !formData.parent_id && formData.cycle !== 'primaire' && matieres.some(m => Number(m.parent_id) === Number(editingMatiere.id)) ? (
                        <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-xs">
                          <span className="font-bold block text-[11px] text-amber-800">Aucun coefficient global</span>
                          <span className="text-[10px] text-amber-700 block mt-0.5">
                            Cette matière mère regroupe des sous-matières. Chaque sous-matière porte son propre coefficient individuel.
                          </span>
                        </div>
                      ) : (
                        <input 
                          id="input-subject-coefficient"
                          type="number"
                          min="0.5"
                          max="20"
                          step="0.5"
                          value={formData.coefficient}
                          onChange={(e) => setFormData({ ...formData, coefficient: parseFloat(e.target.value) || 1 })}
                          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                        />
                      )}
                    </div>
                  </div>

                  {/* Cycle & Couleur */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cycle d'application
                      </label>
                      <select 
                        id="select-subject-cycle"
                        value={formData.cycle}
                        onChange={(e) => setFormData({ ...formData, cycle: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      >
                        <option value="secondaire">Secondaire (Collège & Lycée)</option>
                        <option value="primaire">Maternelle & Primaire</option>
                        <option value="technique">Enseignement Technique & Pro</option>
                        <option value="tous">Tous les cycles (Polyvalent)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Couleur d'étiquette
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color"
                          value={formData.color}
                          onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                          className="w-10 h-10 rounded-xl border border-slate-200 p-1 cursor-pointer bg-white"
                        />
                        <span className="text-xs font-mono text-slate-600">{formData.color}</span>
                      </div>
                    </div>
                  </div>

                  {/* Matière Disciplinaire Toggle */}
                  {formData.cycle !== 'primaire' && !formData.parent_id && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                      <input
                        type="checkbox"
                        id="est_disciplinaire"
                        checked={formData.est_disciplinaire}
                        onChange={(e) => setFormData({ ...formData, est_disciplinaire: e.target.checked })}
                        className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-slate-300 rounded"
                      />
                      <label htmlFor="est_disciplinaire" className="text-xs font-bold text-amber-900 cursor-pointer leading-tight">
                        Matière disciplinaire (Note unique, coefficient personnalisable)
                        <span className="block text-[10px] font-medium text-amber-700 mt-1">
                          Cette matière n'aura qu'une seule note qui servira de moyenne directe pour les calculs. Utile pour les notes de conduite, sport hors-programme, etc.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description / Objectifs pédagogiques (Optionnel)
                    </label>
                    <textarea 
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brève description des compétences ou du programme..."
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-normal text-slate-800"
                    />
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => { setShowAddModal(false); setEditingMatiere(null); }}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      id="btn-save-subject"
                      type="submit"
                      disabled={isSubmitting || !!duplicateWarning?.isDuplicate}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                      {editingMatiere ? 'Enregistrer les modifications' : 'Créer la matière'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL DU PACK PAR DÉFAUT (AVEC SÉLECTION MULTIPLE & ISOLATION CYCLE) */}
      {/* ========================================================================= */}
      {showDefaultPackModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl my-6 overflow-hidden border border-slate-100">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    Pack Standard : {effectiveCycle === 'primaire' ? 'Maternelle & Primaire' : 'Secondaire (Collège & Lycée)'}
                  </h2>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Initialisez le programme officiel avec les sigles et coefficients recommandés
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowDefaultPackModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
                <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Sélection automatique et protection anti-doublons</span>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Seules les matières non existantes seront ajoutées. Les matières déjà présentes ne seront pas dupliquées.
                  </p>
                </div>
              </div>

              {/* Option to clear existing subjects */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50/50 cursor-pointer hover:bg-slate-50">
                <input 
                  type="checkbox"
                  checked={clearExistingBeforePack}
                  onChange={(e) => setClearExistingBeforePack(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Remplacer toutes les matières existantes du cycle {effectiveCycle === 'primaire' ? 'Primaire' : 'Secondaire'} par ce pack officiel
                </span>
              </label>

              {/* Select / Deselect all */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-bold text-slate-700">
                  Matières incluses ({selectedDefaults.length} sélectionnée(s)) :
                </span>
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setSelectedDefaults(getCatalogByCycle(effectiveCycle).map(s => s.nom))}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    Tout cocher
                  </button>
                  <span className="text-slate-300">•</span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedDefaults([])}
                    className="text-[11px] text-slate-500 font-medium hover:underline"
                  >
                    Tout décocher
                  </button>
                </div>
              </div>

              {/* List of items */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto border border-slate-100 rounded-2xl p-2 bg-slate-50/30">
                {getCatalogByCycle(effectiveCycle).map(std => {
                  const isChecked = selectedDefaults.includes(std.nom);
                  return (
                    <label 
                      key={std.code}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-white border-indigo-200 shadow-2xs' 
                          : 'bg-transparent border-transparent opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDefaults([...selectedDefaults, std.nom]);
                            } else {
                              setSelectedDefaults(selectedDefaults.filter(n => n !== std.nom));
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <div>
                          <span className="text-xs font-bold text-slate-900 block">{std.nom}</span>
                          <span className="text-[10px] text-slate-500">{std.categorie} • Coef {std.coefficient}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px] font-bold">
                        {std.sigle}
                      </span>
                    </label>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDefaultPackModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  id="btn-confirm-load-pack"
                  type="button"
                  onClick={handleAddDefaultPack}
                  disabled={loadingDefaults || selectedDefaults.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingDefaults && <Loader2 size={14} className="animate-spin" />}
                  Charger {selectedDefaults.length} matière(s)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Subjects to Multiple Classes Modal */}
      {showAssignModal && (
        <AssignSubjectsToClassesModal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            fetchMatieres();
          }}
          initialSelectedMatiereIds={assignInitialMatiereIds}
          allMatieres={matieres}
          activeCycle={effectiveCycle}
        />
      )}
    </div>
  );
}
