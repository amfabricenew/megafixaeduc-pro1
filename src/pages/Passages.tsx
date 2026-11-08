import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  ArrowRightCircle, 
  Users, 
  GraduationCap, 
  Calendar, 
  CheckCircle2, 
  AlertCircle,
  Search,
  ChevronRight,
  UserCheck,
  Zap,
  RotateCcw,
  Ban,
  History,
  AlertTriangle,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatClassName } from '../utils/format';
import ArrieresAnterieursStats from '../components/ArrieresAnterieursStats';
import ScolaritePaymentModal from '../components/ScolaritePaymentModal';

interface PassagesProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Passages({ cycle: initialCycle = 'all' }: PassagesProps) {
  const [cycle, setCycle] = React.useState(initialCycle);
  const [annees, setAnnees] = React.useState<any[]>([]);
  const [activeYear, setActiveYear] = React.useState<any>(null);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);

  // Arrears Payment Modal state
  const [showScolariteModal, setShowScolariteModal] = React.useState(false);
  const [scolaritePreselectedEleveId, setScolaritePreselectedEleveId] = React.useState<number | undefined>(undefined);
  const [scolariteInitialIsArrieres, setScolariteInitialIsArrieres] = React.useState(false);
  const [scolariteInitialAnneeConcerneeId, setScolariteInitialAnneeConcerneeId] = React.useState<number | undefined>(undefined);
  const [scolariteInitialAnneeConcerneeLibelle, setScolariteInitialAnneeConcerneeLibelle] = React.useState<string | undefined>(undefined);
  const [statsRefreshKey, setStatsRefreshKey] = React.useState(0);
  
  const [sourceYearId, setSourceYearId] = React.useState<string>('');
  const [sourceClasseId, setSourceClasseId] = React.useState<string>('');
  const [autoSourceClasseId, setAutoSourceClasseId] = React.useState<string>('');
  const [targetYearId, setTargetYearId] = React.useState<string>('');
  const [targetClasseId, setTargetClasseId] = React.useState<string>('');
  
  const [sourceClasses, setSourceClasses] = React.useState<any[]>([]);
  const [targetClasses, setTargetClasses] = React.useState<any[]>([]);
  const [eleves, setEleves] = React.useState<any[]>([]);
  const [selectedEleveIds, setSelectedEleveIds] = React.useState<number[]>([]);
  
  const [loading, setLoading] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = React.useState<'manual' | 'auto' | 'historique' | 'arrieres'>('manual');
  const [autoSuggestions, setAutoSuggestions] = React.useState<any[]>([]);
  const [autoLoading, setAutoLoading] = React.useState(false);

  // Reversion & Historique state
  const [revertModalData, setRevertModalData] = React.useState<{
    isOpen: boolean;
    eleves: any[];
    targetYearId: string;
  } | null>(null);
  const [reverting, setReverting] = React.useState(false);
  const [historiquePassages, setHistoriquePassages] = React.useState<any[]>([]);
  const [loadingHistorique, setLoadingHistorique] = React.useState(false);
  const [historySearch, setHistorySearch] = React.useState('');
  const [selectedHistoryIds, setSelectedHistoryIds] = React.useState<number[]>([]);

  // Redoublements (< 10) state
  const [redoublementModalOpen, setRedoublementModalOpen] = React.useState(false);
  const [redoublementSelectedIds, setRedoublementSelectedIds] = React.useState<number[]>([]);
  const [redoublementLoading, setRedoublementLoading] = React.useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/promotions' : p.path === '/promotions'));
  const canWrite = user.role === 'admin' || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  React.useEffect(() => {
    setCycle(initialCycle);
  }, [initialCycle]);

  React.useEffect(() => {
    apiFetch('/api/school-info')
      .then(res => res.json())
      .then(data => setSchoolInfo(data))
      .catch(() => {});

    apiFetch('/api/annees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAnnees(data);
          const active = data.find((a: any) => a.est_active_effective);
          if (active) {
            setActiveYear(active);
            const activeIndex = data.findIndex((a: any) => a.id === active.id);
            if (activeIndex < data.length - 1) {
              setSourceYearId(data[activeIndex + 1].id.toString());
              setTargetYearId(active.id.toString());
            } else if (activeIndex > 0) {
              setSourceYearId(data[activeIndex - 1].id.toString());
              setTargetYearId(active.id.toString());
            } else if (data.length > 1) {
              const other = data.find((a: any) => a.id !== active.id);
              setSourceYearId(other.id.toString());
              setTargetYearId(active.id.toString());
            } else {
              setSourceYearId(active.id.toString());
              setTargetYearId('');
            }
          }
        } else {
          setAnnees([]);
        }
      })
      .catch(() => setAnnees([]));
  }, []);

  React.useEffect(() => {
    if (sourceYearId) {
      const cycleQuery = cycle !== 'all' ? `&cycle=${cycle}` : '';
      apiFetch(`/api/classes?annee_id=${sourceYearId}${cycleQuery}`)
        .then(res => res.json())
        .then(data => setSourceClasses(Array.isArray(data) ? data : []))
        .catch(() => setSourceClasses([]));
    }
  }, [sourceYearId, cycle]);

  React.useEffect(() => {
    if (targetYearId) {
      const cycleQuery = cycle !== 'all' ? `&cycle=${cycle}` : '';
      apiFetch(`/api/classes?annee_id=${targetYearId}${cycleQuery}`)
        .then(res => res.json())
        .then(data => setTargetClasses(Array.isArray(data) ? data : []))
        .catch(() => setTargetClasses([]));
    }
  }, [targetYearId, cycle]);

  React.useEffect(() => {
    if (sourceClasseId) {
      apiFetch(`/api/eleves/by-year/${sourceYearId}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            const filtered = data
              .filter((e: any) => e.classe_id.toString() === sourceClasseId)
              .sort((a: any, b: any) => (b.moyenne || 0) - (a.moyenne || 0));
            setEleves(filtered);
            setSelectedEleveIds(filtered.map((e: any) => e.id));
            
            // Auto-match target class
            const sourceClasse = sourceClasses.find(c => c.id.toString() === sourceClasseId);
            if (sourceClasse) {
              const sequences: Record<string, string[]> = {
                maternelle: ['Petite Section', 'Moyenne Section', 'Grande Section'],
                primaire: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
                secondaire: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle']
              };
              
              let activeSequence: string[] = [];
              const lowerCycle = (sourceClasse.cycle || cycle || '').toLowerCase();

              if (lowerCycle === 'primaire' || lowerCycle === 'maternelle' || lowerCycle === 'primaire_maternelle') {
                activeSequence = [...sequences.maternelle, ...sequences.primaire];
              } else if (lowerCycle && sequences[lowerCycle]) {
                activeSequence = sequences[lowerCycle];
              } else {
                for (const seq of Object.values(sequences)) {
                  if (seq.some(level => sourceClasse.nom.startsWith(level))) {
                    activeSequence = seq;
                    break;
                  }
                }
              }

              const currentIndex = activeSequence.findIndex(level => sourceClasse.nom.startsWith(level));
              if (currentIndex !== -1 && currentIndex < activeSequence.length - 1) {
                const prefix = activeSequence[currentIndex];
                const nextLevel = activeSequence[currentIndex + 1];
                const suffix = sourceClasse.nom.replace(prefix, '').trim();
                const match = targetClasses.find(c => c.nom.startsWith(nextLevel) && (suffix ? c.nom.endsWith(suffix) : true)) 
                            || targetClasses.find(c => c.nom.startsWith(nextLevel));
                if (match) {
                  setTargetClasseId(match.id.toString());
                }
              }
            }
          } else {
            setEleves([]);
            setSelectedEleveIds([]);
          }
        })
        .catch(() => {
          setEleves([]);
          setSelectedEleveIds([]);
        });
    } else {
      setEleves([]);
      setSelectedEleveIds([]);
    }
  }, [sourceClasseId, sourceYearId, sourceClasses, targetClasses, cycle]);


  const handleToggleSelect = (id: number) => {
    setSelectedEleveIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedEleveIds.length === eleves.length) {
      setSelectedEleveIds([]);
    } else {
      setSelectedEleveIds(eleves.map(e => e.id));
    }
  };

  const handleSelectAdmitted = () => {
    const admittedIds = eleves
      .filter(e => (e.moyenne || 0) >= 10)
      .map(e => e.id);
    setSelectedEleveIds(admittedIds);
    showToast(`${admittedIds.length} élèves admis sélectionnés`);
  };

  const redoublantsList = React.useMemo(() => {
    return eleves.filter(e => e.moyenne !== null && e.moyenne < 10);
  }, [eleves]);

  const handleSelectRedoublants = () => {
    const repeatingIds = redoublantsList.map(e => e.id);
    setSelectedEleveIds(repeatingIds);
    // Auto-match same class in destination year (same class name)
    const sourceClasse = sourceClasses.find(c => c.id.toString() === sourceClasseId);
    if (sourceClasse) {
      const sameClass = targetClasses.find(c => c.nom === sourceClasse.nom);
      if (sameClass) {
        setTargetClasseId(sameClass.id.toString());
      }
    }
    showToast(`${repeatingIds.length} élève(s) avec moyenne < 10 sélectionné(s)`);
  };

  const handleOpenRedoublementModal = () => {
    if (!sourceYearId || !targetYearId) {
      showToast("Veuillez sélectionner l'année source et l'année de destination", "error");
      return;
    }
    if (sourceYearId === targetYearId) {
      showToast("Action bloquée : Le passage ou redoublement d'une année vers la même année est strictement interdit.", "error");
      return;
    }
    if (!sourceClasseId) {
      showToast("Veuillez d'abord sélectionner une classe source", "error");
      return;
    }
    if (redoublantsList.length === 0) {
      showToast("Aucun élève avec moyenne annuelle < 10 dans cette classe.", "error");
      return;
    }
    const unprocessed = redoublantsList.filter(e => !e.passage_effectue);
    setRedoublementSelectedIds(unprocessed.length > 0 ? unprocessed.map(e => e.id) : redoublantsList.map(e => e.id));
    setRedoublementModalOpen(true);
  };

  const handleConfirmRedoublement = async () => {
    if (redoublementSelectedIds.length === 0) {
      showToast("Veuillez sélectionner au moins un élève à maintenir", "error");
      return;
    }

    setRedoublementLoading(true);
    try {
      const res = await apiFetch('/api/promotions/redoublements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_classe_id: parseInt(sourceClasseId),
          source_year_id: parseInt(sourceYearId),
          target_year_id: parseInt(targetYearId),
          eleve_ids: redoublementSelectedIds
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la gestion des redoublements");
      }

      showToast(data.message || `${data.count} élève(s) maintenu(s) avec mention Redoublant(e)`);
      setRedoublementModalOpen(false);

      // Refresh student list
      const updatedListRes = await apiFetch(`/api/eleves/by-year/${sourceYearId}`);
      const updatedList = await updatedListRes.json();
      if (Array.isArray(updatedList)) {
        const filtered = updatedList
          .filter((e: any) => e.classe_id.toString() === sourceClasseId)
          .sort((a: any, b: any) => (b.moyenne || 0) - (a.moyenne || 0));
        setEleves(filtered);
      }

      // Refresh target classes in case a class was created
      const cycleQuery = cycle !== 'all' ? `&cycle=${cycle}` : '';
      const tClassesRes = await apiFetch(`/api/classes?annee_id=${targetYearId}${cycleQuery}`);
      const tClasses = await tClassesRes.json();
      if (Array.isArray(tClasses)) {
        setTargetClasses(tClasses);
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setRedoublementLoading(false);
    }
  };

  const handlePromote = () => {
    if (!sourceYearId || !targetYearId) {
      showToast("Veuillez sélectionner l'année source et l'année de destination", "error");
      return;
    }
    if (sourceYearId === targetYearId) {
      showToast("Action bloquée : Le passage d'une année vers la même année scolaire est strictement interdit.", "error");
      return;
    }
    if (selectedEleveIds.length === 0) {
      showToast("Veuillez sélectionner au moins un élève", "error");
      return;
    }
    if (!targetClasseId) {
      showToast("Veuillez sélectionner une classe de destination", "error");
      return;
    }

    setLoading(true);
    apiFetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eleve_ids: selectedEleveIds,
        target_classe_id: parseInt(targetClasseId),
        target_year_id: parseInt(targetYearId),
        source_year_id: parseInt(sourceYearId)
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`${data.count} élève(s) promu(s) avec succès`);
          // Refresh list to show statuses instead of removing
          apiFetch(`/api/eleves/by-year/${sourceYearId}`)
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data)) {
                const filtered = data
                  .filter((e: any) => e.classe_id.toString() === sourceClasseId)
                  .sort((a: any, b: any) => (b.moyenne || 0) - (a.moyenne || 0));
                setEleves(filtered);
              }
            });
          setSelectedEleveIds([]);
        } else {
          throw new Error(data.error || "Erreur lors de la promotion");
        }
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  };

  const handleRevertPassage = (eleve: any) => {
    const destYearId = eleve.destination_annee_id ? eleve.destination_annee_id.toString() : targetYearId;
    setRevertModalData({
      isOpen: true,
      eleves: [eleve],
      targetYearId: destYearId
    });
  };

  const handleRevertSelectedPassages = () => {
    const promotedSelected = eleves.filter(e => selectedEleveIds.includes(e.id) && e.passage_effectue);
    if (promotedSelected.length === 0) {
      showToast("Aucun élève avec passage effectué n'est sélectionné.", "error");
      return;
    }
    setRevertModalData({
      isOpen: true,
      eleves: promotedSelected,
      targetYearId: targetYearId
    });
  };

  const confirmRevert = async (force: boolean = false) => {
    if (!revertModalData || revertModalData.eleves.length === 0) return;
    setReverting(true);

    try {
      const res = await apiFetch('/api/promotions/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eleve_ids: revertModalData.eleves.map(e => e.id || e.eleve_id),
          target_year_id: parseInt(revertModalData.targetYearId),
          force
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'annulation du passage");
      }

      showToast(data.message || `${data.count} passage(s) annulé(s) avec succès.`);
      setRevertModalData(null);

      // Refresh student list for source class
      if (sourceClasseId && sourceYearId) {
        apiFetch(`/api/eleves/by-year/${sourceYearId}`)
          .then(r => r.json())
          .then(list => {
            if (Array.isArray(list)) {
              const filtered = list
                .filter((e: any) => e.classe_id.toString() === sourceClasseId)
                .sort((a: any, b: any) => (b.moyenne || 0) - (a.moyenne || 0));
              setEleves(filtered);
            }
          });
      }

      // Refresh history if active
      if (activeTab === 'historique') {
        fetchHistorique();
      }
    } catch (err: any) {
      showToast(err.message, "error");
    } finally {
      setReverting(false);
    }
  };

  const fetchHistorique = React.useCallback(() => {
    if (!targetYearId) return;
    setLoadingHistorique(true);
    const cycleQuery = cycle !== 'all' ? `&cycle=${cycle}` : '';
    const srcQuery = sourceYearId && sourceYearId !== targetYearId ? `&source_year_id=${sourceYearId}` : '';
    apiFetch(`/api/promotions/historique?target_year_id=${targetYearId}${cycleQuery}${srcQuery}`)
      .then(res => res.json())
      .then(data => {
        setHistoriquePassages(Array.isArray(data) ? data : []);
        setSelectedHistoryIds([]);
      })
      .catch(() => setHistoriquePassages([]))
      .finally(() => setLoadingHistorique(false));
  }, [targetYearId, sourceYearId, cycle]);

  React.useEffect(() => {
    if (activeTab === 'historique') {
      fetchHistorique();
    }
  }, [activeTab, fetchHistorique]);

  const handleAutoMatch = () => {
    if (!sourceClasseId) return;
    const sourceClasse = sourceClasses.find(c => c.id.toString() === sourceClasseId);
    if (!sourceClasse) return;

    const sequences: Record<string, string[]> = {
      maternelle: ['Petite Section', 'Moyenne Section', 'Grande Section'],
      primaire: ['CI', 'CP', 'CE1', 'CE2', 'CM1', 'CM2'],
      secondaire: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle']
    };
    
    let activeSequence: string[] = [];
    const lowerCycle = (sourceClasse.cycle || cycle || '').toLowerCase();

    if (lowerCycle === 'primaire' || lowerCycle === 'maternelle' || lowerCycle === 'primaire_maternelle') {
      activeSequence = [...sequences.maternelle, ...sequences.primaire];
    } else if (lowerCycle && sequences[lowerCycle]) {
      activeSequence = sequences[lowerCycle];
    } else {
      for (const seq of Object.values(sequences)) {
        if (seq.some(level => sourceClasse.nom.startsWith(level))) {
          activeSequence = seq;
          break;
        }
      }
    }

    const currentIndex = activeSequence.findIndex(level => sourceClasse.nom.startsWith(level));
    if (currentIndex !== -1 && currentIndex < activeSequence.length - 1) {
      const prefix = activeSequence[currentIndex];
      const nextLevel = activeSequence[currentIndex + 1];
      const suffix = sourceClasse.nom.replace(prefix, '').trim();
      const match = targetClasses.find(c => c.nom.startsWith(nextLevel) && (suffix ? c.nom.endsWith(suffix) : true)) 
                  || targetClasses.find(c => c.nom.startsWith(nextLevel));
      if (match) {
        setTargetClasseId(match.id.toString());
        showToast(`Classe suivante suggérée : ${match.nom}`);
        return;
      } else {
        const intended = nextLevel + (suffix ? ' ' + suffix : '');
        showToast(`Classe attendue "${intended}" non trouvée. Initialisez l'année cible.`, "error");
      }
    }

    // Fallback: same name
    const sameName = targetClasses.find(c => c.nom === sourceClasse.nom);
    if (sameName) {
      setTargetClasseId(sameName.id.toString());
      showToast(`Même classe suggérée : ${sameName.nom}`);
    } else {
      showToast("Aucune correspondance automatique trouvée", "error");
    }
  };

  const handleInitializeTargetYear = () => {
    if (!sourceYearId || !targetYearId) {
      showToast("Veuillez sélectionner l'année source et l'année cible.", "error");
      return;
    }

    if (!window.confirm("Voulez-vous copier la structure des classes de l'année source vers l'année cible ? Les données des élèves ne seront pas encore transférées.")) {
      return;
    }

    setLoading(true);
    apiFetch('/api/annees/copy-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_year_id: sourceYearId,
        to_year_id: targetYearId,
        config: {
          classes: true,
          matieres: true,
          timetable: true,
          evaluation_configs: true,
          eleves: false,
          activities: true,
          epreuves: true
        }
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast("Année cible initialisée avec succès.");
          // Refresh target classes
          const cycleQuery = cycle !== 'all' ? `&cycle=${cycle}` : '';
          apiFetch(`/api/classes?annee_id=${targetYearId}${cycleQuery}`)
            .then(res => res.json())
            .then(data => setTargetClasses(Array.isArray(data) ? data : []));
        } else {
          showToast(data.error || "Erreur lors de l'initialisation", "error");
        }
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  };

  const fetchAutoPreview = () => {
    if (!sourceYearId || !targetYearId) {
      showToast("Veuillez sélectionner les années source et destination", "error");
      return;
    }
    if (sourceYearId === targetYearId) {
      showToast("Action bloquée : L'année source et l'année destination ne peuvent pas être identiques pour un passage.", "error");
      return;
    }
    setAutoLoading(true);
    const cycleParam = cycle !== 'all' ? `&cycle=${cycle}` : '';
    const classParam = autoSourceClasseId ? `&source_classe_id=${autoSourceClasseId}` : '';
    apiFetch(`/api/promotions/automatique/preview?source_year_id=${sourceYearId}&target_year_id=${targetYearId}${cycleParam}${classParam}`)
      .then(res => res.json())
      .then(data => setAutoSuggestions(data))
      .catch(err => showToast(err.message, "error"))
      .finally(() => setAutoLoading(false));
  };

  const executeAutoPromotion = () => {
    if (autoSuggestions.length === 0) return;
    if (sourceYearId === targetYearId) {
      showToast("Action bloquée : impossible d'exécuter un passage au sein de la même année scolaire.", "error");
      return;
    }
    
    setLoading(true);
    apiFetch('/api/promotions/automatique/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        suggestions: autoSuggestions,
        target_year_id: parseInt(targetYearId),
        source_year_id: parseInt(sourceYearId)
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast(`${data.count} élèves promus automatiquement`);
          setAutoSuggestions([]);
        } else {
          throw new Error(data.error);
        }
      })
      .catch(err => showToast(err.message, "error"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-8 relative pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {cycle === 'primaire' ? 'Passages & Redoublements : Maternelle & Primaire' : cycle === 'secondaire' ? 'Passages & Redoublements : Secondaire' : 'Gestion des Passages & Redoublements'}
          </h1>
          <p className="text-sm text-slate-500">Gérez les promotions, les redoublements (&lt; 10) et transitions entre années scolaires.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {initialCycle === 'all' && (
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button 
                onClick={() => setCycle('primaire')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${cycle === 'primaire' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Primaire & Mat.
              </button>
              <button 
                onClick={() => setCycle('secondaire')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${cycle === 'secondaire' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Secondaire
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2 bg-primary-50 px-4 py-2.5 rounded-xl border border-primary-100">
            <Calendar size={18} className="text-primary-600" />
            <span className="text-sm font-bold text-primary-700">Année Active : {activeYear?.libelle}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 w-fit">
        <button 
          onClick={() => setActiveTab('manual')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'manual' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Passages & Redoublements
        </button>
        <button 
          onClick={() => setActiveTab('auto')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'auto' ? 'bg-primary-600 text-white shadow-lg shadow-primary-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          Passage Automatique
        </button>
        <button 
          onClick={() => setActiveTab('historique')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'historique' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <RotateCcw size={15} />
          Passages & Redoublements Effectués (Annulation)
        </button>
        <button 
          onClick={() => setActiveTab('arrieres')}
          className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 ${activeTab === 'arrieres' ? 'bg-amber-600 text-white shadow-lg shadow-amber-100' : 'text-amber-800 hover:text-amber-900 hover:bg-amber-50'}`}
        >
          <AlertCircle size={15} />
          Statistiques des Arriérés Antérieurs
        </button>
      </div>

      {activeTab === 'manual' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Source & Selection (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Users size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Source</h2>
                  <p className="text-xs text-slate-500">Année et classe d'origine</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Année Scolaire</label>
                  <select 
                    value={sourceYearId}
                    onChange={e => setSourceYearId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="">Sélectionner une année</option>
                    {annees.map(a => (
                      <option key={a.id} value={a.id}>{a.libelle} {a.archivee ? '(Archivée)' : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classe</label>
                  <select 
                    value={sourceClasseId}
                    onChange={e => setSourceClasseId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                    disabled={!sourceYearId}
                  >
                    <option value="">Sélectionner une classe</option>
                    {sourceClasses.map(c => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)} ({c.niveau})</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                  <ArrowRightCircle size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Destination</h2>
                  <p className="text-xs text-slate-500">Où les élèves seront transférés</p>
                </div>
              </div>

              {sourceYearId && targetYearId && sourceYearId === targetYearId && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 font-bold animate-in fade-in">
                  <Ban size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span>Passage bloqué : L'année source et l'année de destination sont identiques.</span>
                    <p className="font-normal text-[11px] text-red-600 mt-0.5">Veuillez choisir une année de destination différente.</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Année Scolaire</label>
                  <select 
                    value={targetYearId}
                    onChange={e => setTargetYearId(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:ring-2 transition-all font-medium ${
                      sourceYearId === targetYearId ? 'border-red-300 focus:ring-red-400 bg-red-50/30' : 'border-transparent focus:ring-primary-500'
                    }`}
                  >
                    <option value="">Sélectionner une année</option>
                    {annees.map(a => (
                      <option 
                        key={a.id} 
                        value={a.id}
                        disabled={a.id.toString() === sourceYearId}
                      >
                        {a.libelle} {a.id.toString() === sourceYearId ? '(Identique à la source - Bloqué)' : (a.est_active_effective ? '(Active)' : '')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classe</label>
                    <div className="flex gap-2">
                      {targetClasses.length === 0 && sourceYearId && targetYearId && sourceYearId !== targetYearId && (
                        <button 
                          onClick={handleInitializeTargetYear}
                          className="text-[10px] font-bold text-amber-600 flex items-center gap-1 hover:underline"
                        >
                          <Zap size={10} /> Initialiser
                        </button>
                      )}
                      <button 
                        onClick={handleAutoMatch}
                        disabled={!sourceClasseId || sourceYearId === targetYearId}
                        className="text-[10px] font-bold text-primary-600 flex items-center gap-1 hover:underline disabled:opacity-50"
                      >
                        <Zap size={10} /> Auto-correspondance
                      </button>
                    </div>
                  </div>
                  <select 
                    value={targetClasseId}
                    onChange={e => setTargetClasseId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                    disabled={!targetYearId || sourceYearId === targetYearId}
                  >
                    <option value="">Sélectionner une classe</option>
                    {targetClasses.map(c => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)} ({c.niveau})</option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {canWrite && (
              <div className="space-y-3">
                <button 
                  onClick={handlePromote}
                  disabled={loading || selectedEleveIds.length === 0 || !targetClasseId || sourceYearId === targetYearId}
                  className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold shadow-xl shadow-primary-200 hover:bg-primary-700 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <UserCheck size={20} />
                      Valider le passage ({selectedEleveIds.length})
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleOpenRedoublementModal}
                  disabled={loading || !sourceClasseId || !sourceYearId || !targetYearId || sourceYearId === targetYearId}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-2xl font-bold shadow-lg shadow-amber-200 hover:from-amber-700 hover:to-amber-800 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2.5 text-sm"
                  title="Maintenir tous les élèves dont la moyenne annuelle est inférieure à 10 dans la même classe de l'année suivante avec mention Redoublant(e)"
                >
                  <RotateCcw size={17} />
                  <span>Gérer les redoublements (&lt; 10)</span>
                  {redoublantsList.length > 0 && (
                    <span className="bg-amber-900/60 text-amber-100 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                      {redoublantsList.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Student List (8/12) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Élèves de la classe</h2>
                  <p className="text-xs text-slate-400">{eleves.length} élèves au total</p>
                </div>
              </div>
              
              {eleves.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  {(() => {
                    const selectedPromoted = eleves.filter(e => selectedEleveIds.includes(e.id) && e.passage_effectue);
                    return selectedPromoted.length > 0 && canWrite ? (
                      <button 
                        onClick={handleRevertSelectedPassages}
                        className="text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                        title="Annuler le passage des élèves sélectionnés"
                      >
                        <RotateCcw size={14} />
                        Annuler passage ({selectedPromoted.length})
                      </button>
                    ) : null;
                  })()}
                  <button 
                    onClick={handleSelectAdmitted}
                    className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <UserCheck size={14} />
                    Sélectionner admis (≥ 10)
                  </button>
                  <button 
                    onClick={handleSelectRedoublants}
                    className="text-xs font-bold text-amber-700 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Sélectionner les élèves ayant une moyenne annuelle inférieure à 10"
                  >
                    <AlertTriangle size={14} className="text-amber-600" />
                    Sélectionner redoublants (&lt; 10)
                  </button>
                  {canWrite && (
                    <button
                      onClick={handleOpenRedoublementModal}
                      className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                      title="Gérer les redoublements : maintenir les élèves ayant une moyenne < 10 dans la même classe de l'année suivante avec mention Redoublant(e)"
                    >
                      <RotateCcw size={14} className="text-amber-600" />
                      Gérer les redoublements (&lt; 10)
                      {redoublantsList.length > 0 && (
                        <span className="bg-amber-200 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                          {redoublantsList.length}
                        </span>
                      )}
                    </button>
                  )}
                  <div className="w-px h-4 bg-slate-100 hidden sm:block"></div>
                  <button 
                    onClick={handleSelectAll}
                    className="text-xs font-bold text-slate-600 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    {selectedEleveIds.length === eleves.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
              {!sourceClasseId ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200">
                    <Search size={40} />
                  </div>
                  <div className="max-w-xs">
                    <p className="font-bold text-slate-800">Prêt à commencer ?</p>
                    <p className="text-sm text-slate-500 mt-1">Sélectionnez une année et une classe source pour charger les élèves éligibles au passage.</p>
                  </div>
                </div>
              ) : eleves.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4">
                  <div className="w-20 h-20 bg-primary-50 rounded-3xl flex items-center justify-center text-primary-200">
                    <CheckCircle2 size={40} />
                  </div>
                  <div className="max-w-xs">
                    <p className="font-bold text-slate-800">Classe traitée</p>
                    <p className="text-sm text-slate-500 mt-1">Tous les élèves de cette classe ont déjà été promus ou il n'y a aucun élève inscrit.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {eleves.map((eleve) => (
                    <div 
                      key={eleve.id}
                      onClick={() => handleToggleSelect(eleve.id)}
                      className={`p-5 flex items-center gap-5 cursor-pointer transition-all ${
                        selectedEleveIds.includes(eleve.id) ? 'bg-primary-50/40' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                        selectedEleveIds.includes(eleve.id) 
                          ? 'bg-primary-600 border-primary-600 text-white' 
                          : 'border-slate-200 bg-white'
                      }`}>
                        {selectedEleveIds.includes(eleve.id) && <CheckCircle2 size={14} />}
                      </div>
                      
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold overflow-hidden border border-slate-50 shadow-sm">
                        {eleve.photo ? (
                          <img src={eleve.photo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg">{eleve.nom.charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900">{eleve.nom} {eleve.prenom}</p>
                          {eleve.passage_effectue && (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                eleve.destination_statut === 'Redoublant(e)'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                <CheckCircle2 size={10} />
                                {eleve.destination_statut === 'Redoublant(e)'
                                  ? `Maintenu(e) → ${eleve.destination_classe_nom} (Redoublant(e))`
                                  : `Passage effectué → ${eleve.destination_classe_nom}`}
                                {eleve.destination_annee_libelle ? ` (${eleve.destination_annee_libelle})` : ''}
                              </span>
                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleRevertPassage(eleve);
                                  }}
                                  className="text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md transition-all flex items-center gap-1 shadow-xs hover:scale-105 active:scale-95"
                                  title="Annuler le passage ou maintien de cet élève et le réintégrer dans sa classe d'origine"
                                >
                                  <RotateCcw size={10} />
                                  Annuler
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="text-xs text-slate-500">Matricule: {eleve.matricule}</p>
                          {eleve.moyenne !== null && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              eleve.moyenne >= 10 ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                            }`}>
                              Moy: {eleve.moyenne.toFixed(2)}
                            </span>
                          )}
                          {Number(eleve.arrieres_calcules || eleve.reste_total_scolarite || 0) > 0 ? (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle size={10} />
                              Arriéré à reporter : {Number(eleve.arrieres_calcules || eleve.reste_total_scolarite).toLocaleString()} FCFA
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Scolarité soldée (0 F)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg">
                          {eleve.sexe === 'M' ? 'Garçon' : 'Fille'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'auto' ? (
        <div className="space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
              <div className="w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
                <Zap size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Passage Automatique</h2>
                <p className="text-sm text-slate-500">Générez une proposition de passage pour {autoSourceClasseId ? 'la classe sélectionnée' : 'tout le cycle'} basée sur les moyennes.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Année Source</label>
                <select 
                  value={sourceYearId}
                  onChange={e => setSourceYearId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                >
                  <option value="">Sélectionner l'année source</option>
                  {annees.map(a => (
                    <option key={a.id} value={a.id}>{a.libelle} {a.archivee ? '(Archivée)' : ''}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Classe Source</label>
                <select 
                  value={autoSourceClasseId}
                  onChange={e => setAutoSourceClasseId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                  disabled={!sourceYearId}
                >
                  <option value="">Toutes les classes</option>
                  {sourceClasses.map(c => (
                    <option key={c.id} value={c.id}>{formatClassName(c.nom)} ({c.niveau})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Année Destination</label>
                <select 
                  value={targetYearId}
                  onChange={e => setTargetYearId(e.target.value)}
                  className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:ring-2 transition-all font-medium ${
                    sourceYearId === targetYearId ? 'border-red-300 focus:ring-red-400 bg-red-50/30' : 'border-transparent focus:ring-primary-500'
                  }`}
                >
                  <option value="">Sélectionner l'année destination</option>
                  {annees.map(a => (
                    <option 
                      key={a.id} 
                      value={a.id}
                      disabled={a.id.toString() === sourceYearId}
                    >
                      {a.libelle} {a.id.toString() === sourceYearId ? '(Identique à la source - Bloqué)' : (a.est_active_effective ? '(Active)' : '')}
                    </option>
                  ))}
                </select>
              </div>

              <button 
                onClick={fetchAutoPreview}
                disabled={autoLoading || !sourceYearId || !targetYearId || sourceYearId === targetYearId}
                className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-slate-200"
              >
                {autoLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Zap size={18} />}
                Générer l'aperçu
              </button>
            </div>

            {sourceYearId && targetYearId && sourceYearId === targetYearId && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 animate-in fade-in">
                <Ban size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Passage automatique bloqué</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    L'année source et l'année de destination sont identiques ({annees.find(a => a.id.toString() === sourceYearId)?.libelle}). 
                    Veuillez choisir deux années différentes pour générer une proposition de passage.
                  </p>
                </div>
              </div>
            )}

            {autoSuggestions.length > 0 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-primary-50 rounded-3xl border border-primary-100 gap-4">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="w-12 h-12 bg-primary-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary-200">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-primary-900 text-lg">{autoSuggestions.length} élèves analysés</p>
                      <p className="text-sm text-primary-700 font-medium">
                        {autoSuggestions.filter(s => s.status === 'Passant').length} Passants • {autoSuggestions.filter(s => s.status === 'Redoublant(e)').length} Redoublant(e)s
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={executeAutoPromotion}
                    disabled={loading}
                    className="w-full sm:w-auto px-8 py-3.5 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-200 flex items-center justify-center gap-2"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <CheckCircle2 size={18} />}
                    Confirmer les Passages
                  </button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Élève</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Moyenne</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Classe Actuelle</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Décision</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest">Classe Future</th>
                          <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Arriéré à reporter</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {autoSuggestions.map((s, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-6">
                              <p className="font-bold text-slate-900">{s.nom} {s.prenom}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{s.matricule}</p>
                            </td>
                            <td className="py-4 px-6">
                              {s.moyenne !== null ? (
                                <span className={`font-mono font-bold text-lg ${s.moyenne >= 10 ? 'text-primary-600' : 'text-red-600'}`}>
                                  {s.moyenne.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-xs italic">N/A</span>
                              )}
                            </td>
                            <td className="py-4 px-6 text-sm text-slate-600 font-medium">{formatClassName(s.source_classe_nom)}</td>
                            <td className="py-4 px-6">
                              <span className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider ${
                                s.status === 'Passant' ? 'bg-primary-100 text-primary-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {s.status}
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${s.target_classe_id ? 'text-slate-900' : 'text-amber-600'}`}>
                                  {formatClassName(s.target_classe_nom)}
                                </span>
                                {!s.target_classe_id && <AlertCircle size={14} className="text-amber-500" title="Classe non trouvée dans l'année de destination" />}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right">
                              {Number(s.arrieres || 0) > 0 ? (
                                <span className="font-mono font-bold text-rose-600 text-xs bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                                  {Number(s.arrieres).toLocaleString()} FCFA
                                </span>
                              ) : (
                                <span className="text-emerald-600 text-xs font-medium">0 FCFA</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : activeTab === 'historique' ? (
        <div className="space-y-6">
          <section className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Passages Effectués & Annulation</h2>
                  <p className="text-xs text-slate-500">
                    Consultez tous les passages d'élèves enregistrés et annulez-les en un clic pour les réintégrer.
                  </p>
                </div>
              </div>

              <button
                onClick={fetchHistorique}
                disabled={loadingHistorique}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 transition-colors self-start sm:self-auto"
              >
                <RotateCcw size={14} className={loadingHistorique ? 'animate-spin' : ''} />
                Actualiser la liste
              </button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Année de Destination</label>
                <select
                  value={targetYearId}
                  onChange={e => setTargetYearId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                >
                  {annees.map(a => (
                    <option key={a.id} value={a.id}>{a.libelle} {a.est_active_effective ? '(Active)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtrer par Année Source</label>
                <select
                  value={sourceYearId}
                  onChange={e => setSourceYearId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                >
                  <option value="">Toutes les années sources</option>
                  {annees.filter(a => a.id.toString() !== targetYearId).map(a => (
                    <option key={a.id} value={a.id}>{a.libelle}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rechercher un élève</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nom, prénom ou matricule..."
                    value={historySearch}
                    onChange={e => setHistorySearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bulk Toolbar */}
            {selectedHistoryIds.length > 0 && canWrite && (
              <div className="flex flex-wrap items-center justify-between p-4 bg-rose-50 border border-rose-200 rounded-2xl gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-800 text-sm font-bold">
                  <AlertCircle size={18} className="text-rose-600" />
                  <span>{selectedHistoryIds.length} élève(s) sélectionné(s) pour annulation de passage</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedHistoryIds([])}
                    className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                  >
                    Désélectionner
                  </button>
                  <button
                    onClick={() => {
                      const selectedItems = historiquePassages.filter(p => selectedHistoryIds.includes(p.eleve_id));
                      setRevertModalData({
                        isOpen: true,
                        eleves: selectedItems,
                        targetYearId: targetYearId
                      });
                    }}
                    className="px-4 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1.5 shadow-sm shadow-rose-200"
                  >
                    <RotateCcw size={14} />
                    Annuler les passages sélectionnés ({selectedHistoryIds.length})
                  </button>
                </div>
              </div>
            )}

            {/* List / Table */}
            {loadingHistorique ? (
              <div className="py-16 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm">Chargement de l'historique des passages...</p>
              </div>
            ) : (() => {
              const filteredList = historiquePassages.filter(p => {
                if (!historySearch) return true;
                const q = historySearch.toLowerCase();
                return (
                  (p.nom || '').toLowerCase().includes(q) ||
                  (p.prenom || '').toLowerCase().includes(q) ||
                  (p.matricule || '').toLowerCase().includes(q)
                );
              });

              if (filteredList.length === 0) {
                return (
                  <div className="py-16 text-center text-slate-400 space-y-3">
                    <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl mx-auto flex items-center justify-center">
                      <History size={32} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-700 text-base">Aucun passage trouvé</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Aucun élève n'a été enregistré pour un passage vers cette année scolaire avec les critères sélectionnés.
                      </p>
                    </div>
                  </div>
                );
              }

              const allSelected = filteredList.length > 0 && selectedHistoryIds.length === filteredList.length;

              return (
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold">
                          <th className="py-3.5 px-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={allSelected}
                              onChange={() => {
                                if (allSelected) {
                                  setSelectedHistoryIds([]);
                                } else {
                                  setSelectedHistoryIds(filteredList.map(p => p.eleve_id));
                                }
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </th>
                          <th className="py-3.5 px-4">Élève</th>
                          <th className="py-3.5 px-4">Origine</th>
                          <th className="py-3.5 px-4">Destination</th>
                          <th className="py-3.5 px-4">Statut</th>
                          <th className="py-3.5 px-4">Sécurité Annulation</th>
                          <th className="py-3.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredList.map((item) => {
                          const isSelected = selectedHistoryIds.includes(item.eleve_id);
                          const hasData = (item.notes_count || 0) > 0 || (item.paiements_count || 0) > 0;

                          return (
                            <tr key={item.eleve_id} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                              <td className="py-3 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {
                                    setSelectedHistoryIds(prev =>
                                      prev.includes(item.eleve_id)
                                        ? prev.filter(id => id !== item.eleve_id)
                                        : [...prev, item.eleve_id]
                                    );
                                  }}
                                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                                    {(item.nom || '')[0]}{(item.prenom || '')[0]}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs">{item.nom} {item.prenom}</p>
                                    <p className="text-[10px] text-slate-400">Mat: {item.matricule}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <p className="font-semibold text-slate-800">{formatClassName(item.source_classe_nom) || 'Non définie'}</p>
                                <p className="text-[10px] text-slate-400">{item.source_annee_libelle || '-'}</p>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 font-bold text-primary-700">
                                  <span>{formatClassName(item.target_classe_nom)}</span>
                                </div>
                                <p className="text-[10px] text-slate-400">{item.target_annee_libelle}</p>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  item.statut === 'Passant' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {item.statut || 'Passant'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                {!hasData ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Sans données associées
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1" title={`${item.notes_count || 0} note(s), ${item.paiements_count || 0} paiement(s)`}>
                                    <AlertTriangle size={10} /> {item.notes_count || 0} note(s), {item.paiements_count || 0} paiement(s)
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {canWrite && (
                                  <button
                                    onClick={() => handleRevertPassage(item)}
                                    className="px-3 py-1.5 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all inline-flex items-center gap-1.5 shadow-xs hover:scale-105 active:scale-95"
                                    title="Annuler le passage de cet élève"
                                  >
                                    <RotateCcw size={12} />
                                    Annuler le passage
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </section>
        </div>
      ) : (
        <div key={statsRefreshKey} className="space-y-6">
          <ArrieresAnterieursStats 
            cycle={cycle} 
            onEncaisserArriere={(el) => {
              setScolaritePreselectedEleveId(el.eleve_id || el.id);
              setScolariteInitialIsArrieres(true);
              setScolariteInitialAnneeConcerneeId(el.annee_precedente_id);
              setScolariteInitialAnneeConcerneeLibelle(el.annee_precedente_libelle);
              setShowScolariteModal(true);
            }}
          />
        </div>
      )}

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <div className="text-sm text-amber-800">
          <p className="font-bold">Important (Passages & Arriérés) :</p>
          <p>
            Le passage ou le redoublement déplace l'élève vers une nouvelle classe (supérieure ou identique). 
            <strong> Le système calcule et applique automatiquement les arriérés de scolarité non soldés de l'année précédente</strong> dans le dossier de l'élève pour la nouvelle année scolaire. Vous pouvez consulter et exporter la statistique globale des restes des années antérieures à tout moment via l'onglet dédié.
          </p>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-primary-900 border-primary-700 text-primary-50' 
                : 'bg-red-900 border-red-700 text-red-50'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} className="text-primary-400" /> : <AlertCircle size={20} className="text-red-400" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal d'enregistrement des paiements de scolarité et arriérés avec reçu PDF */}
      <ScolaritePaymentModal
        isOpen={showScolariteModal}
        onClose={() => {
          setShowScolariteModal(false);
          setScolaritePreselectedEleveId(undefined);
          setScolariteInitialIsArrieres(false);
          setScolariteInitialAnneeConcerneeId(undefined);
          setScolariteInitialAnneeConcerneeLibelle(undefined);
        }}
        onSuccess={() => {
          setStatsRefreshKey(k => k + 1);
          showToast("Paiement d'arriéré validé avec succès ! Reçu PDF généré.");
        }}
        schoolInfo={schoolInfo}
        preselectedEleveId={scolaritePreselectedEleveId}
        initialCycle={cycle}
        initialIsArrieres={scolariteInitialIsArrieres}
        initialAnneeConcerneeId={scolariteInitialAnneeConcerneeId}
        initialAnneeConcerneeLibelle={scolariteInitialAnneeConcerneeLibelle}
      />

      {/* Modal de Confirmation d'Annulation de Passage */}
      {revertModalData?.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className="p-6 bg-rose-50 text-center border-b border-rose-100 relative">
              <button 
                onClick={() => setRevertModalData(null)}
                className="absolute top-4 right-4 p-2 text-rose-400 hover:text-rose-700 hover:bg-rose-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <RotateCcw size={30} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Annulation de passage</h3>
              <p className="text-xs text-rose-700 font-medium mt-1">
                {revertModalData.eleves.length === 1 
                  ? `Élève : ${revertModalData.eleves[0].nom} ${revertModalData.eleves[0].prenom}`
                  : `${revertModalData.eleves.length} élèves sélectionnés`}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-600 space-y-2 border border-slate-100">
                <p className="font-bold text-slate-800 text-sm">Action réversible :</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>L'inscription dans l'année de destination sera <strong>supprimée</strong>.</li>
                  <li>L'élève sera <strong>réintégré dans sa classe d'origine</strong> avec son statut et ses arriérés initiaux.</li>
                  <li>L'élève sera de nouveau disponible pour un futur passage.</li>
                </ul>
              </div>

              {revertModalData.eleves.length > 1 && (
                <div className="max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl space-y-1 text-xs text-slate-700">
                  {revertModalData.eleves.map((el: any) => (
                    <div key={el.id || el.eleve_id} className="flex justify-between items-center py-1 px-2 hover:bg-white rounded">
                      <span className="font-semibold">{el.nom} {el.prenom}</span>
                      <span className="text-slate-400">{el.matricule}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRevertModalData(null)}
                  disabled={reverting}
                  className="flex-1 py-3 rounded-2xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
                >
                  Garder le passage
                </button>
                <button
                  type="button"
                  onClick={() => confirmRevert(false)}
                  disabled={reverting}
                  className="flex-1 py-3 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {reverting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <RotateCcw size={16} />
                      Confirmer l'annulation
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal de Gestion des Redoublements (< 10) */}
      {redoublementModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
          >
            <div className="p-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white relative">
              <button 
                onClick={() => setRedoublementModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-amber-100 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
                  <RotateCcw size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Gestion des Redoublements (Moyenne &lt; 10)</h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Maintien dans la même classe de l'année suivante avec mention officielle <strong>« Redoublant(e) »</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Informations récapitulatives */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-amber-50/60 rounded-2xl border border-amber-200/70 text-xs">
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Classe & Année d'Origine :</span>
                  <span className="font-bold text-slate-800 text-sm">
                    {formatClassName(sourceClasses.find(c => c.id.toString() === sourceClasseId)?.nom)} ({annees.find(a => a.id.toString() === sourceYearId)?.libelle})
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-semibold block text-[11px]">Classe de Maintien (Année Cible) :</span>
                  <span className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-amber-600" />
                    {formatClassName(sourceClasses.find(c => c.id.toString() === sourceClasseId)?.nom)} ({annees.find(a => a.id.toString() === targetYearId)?.libelle})
                  </span>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-amber-200/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">Mention appliquée :</span>
                    <span className="bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded-full text-[11px]">
                      Redoublant(e)
                    </span>
                  </div>
                  <div className="text-emerald-700 font-medium text-[11px] flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    Report automatique des arriérés scolaires
                  </div>
                </div>
              </div>

              {/* Sélection / Liste des élèves */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Élèves concernés ({redoublementSelectedIds.length} / {redoublantsList.length} sélectionnés)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (redoublementSelectedIds.length === redoublantsList.length) {
                        setRedoublementSelectedIds([]);
                      } else {
                        setRedoublementSelectedIds(redoublantsList.map(e => e.id));
                      }
                    }}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 hover:underline"
                  >
                    {redoublementSelectedIds.length === redoublantsList.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>

                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto bg-slate-50/50">
                  {redoublantsList.map((st) => {
                    const isChecked = redoublementSelectedIds.includes(st.id);
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          setRedoublementSelectedIds(prev =>
                            prev.includes(st.id) ? prev.filter(i => i !== st.id) : [...prev, st.id]
                          );
                        }}
                        className={`p-3.5 flex items-center gap-3.5 cursor-pointer transition-colors ${
                          isChecked ? 'bg-amber-50/80 hover:bg-amber-100/60' : 'hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                        <div className="w-9 h-9 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs shrink-0 overflow-hidden">
                          {st.photo ? (
                            <img src={st.photo} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span>{st.nom?.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 text-xs truncate">
                            {st.nom} {st.prenom}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>Mat: {st.matricule}</span>
                            <span>•</span>
                            <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                              Moy: {st.moyenne !== null ? st.moyenne.toFixed(2) : '-'} / 20
                            </span>
                            {st.passage_effectue && (
                              <span className="text-amber-700 font-semibold">(Déjà traité)</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            Redoublant(e)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 text-center sm:text-left">
                Les élèves sélectionnés seront inscrits en <strong>{formatClassName(sourceClasses.find(c => c.id.toString() === sourceClasseId)?.nom)}</strong> pour l'année <strong>{annees.find(a => a.id.toString() === targetYearId)?.libelle}</strong>.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setRedoublementModalOpen(false)}
                  disabled={redoublementLoading}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 text-xs transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRedoublement}
                  disabled={redoublementLoading || redoublementSelectedIds.length === 0}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200 text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {redoublementLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <RotateCcw size={14} />
                      Confirmer le maintien ({redoublementSelectedIds.length} redoublant(e)s)
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
