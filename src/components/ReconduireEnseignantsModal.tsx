import React, { useState, useEffect } from 'react';
import { 
  Repeat, X, ArrowRight, CheckCircle2, AlertCircle, 
  Calendar, Users, BookOpen, Clock, ShieldCheck, Check, Sparkles 
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

interface AnneeScolaire {
  id: number;
  libelle: string;
  est_active: number | boolean;
  date_debut?: string;
  date_fin?: string;
}

interface Teacher {
  id: number;
  nom: string;
  prenom: string;
  telephone?: string;
  email?: string;
  classes_noms?: string;
  cycle?: string;
}

interface ReconduireEnseignantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedTeachers: number[];
  allTeachers: Teacher[];
  cycleFilter?: string;
}

export const ReconduireEnseignantsModal: React.FC<ReconduireEnseignantsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedTeachers,
  allTeachers,
  cycleFilter
}) => {
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [loadingAnnees, setLoadingAnnees] = useState(false);
  const [fromYearId, setFromYearId] = useState<number | null>(null);
  const [toYearId, setToYearId] = useState<number | null>(null);
  
  // Options
  const [targetScope, setTargetScope] = useState<'selected' | 'all'>(
    selectedTeachers.length > 0 ? 'selected' : 'all'
  );
  const [reconduireTitulariat, setReconduireTitulariat] = useState(true);
  const [reconduireMatieres, setReconduireMatieres] = useState(true);
  const [reconduireEmploisDuTemps, setReconduireEmploisDuTemps] = useState(true);
  const [creerClassesManquantes, setCreerClassesManquantes] = useState(true);

  // States for process & results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    teachers_count: number;
    classes_assigned: number;
    matieres_assigned: number;
    timetable_assigned: number;
    created_classes_count: number;
    from_year: string;
    to_year: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAnnees();
      setResultSummary(null);
      setTargetScope(selectedTeachers.length > 0 ? 'selected' : 'all');
    }
  }, [isOpen, selectedTeachers.length]);

  const fetchAnnees = async () => {
    setLoadingAnnees(true);
    try {
      const res = await apiFetch('/api/annees');
      const data = await res.json();
      if (Array.isArray(data)) {
        setAnnees(data);
        
        // Trouver l'année active
        const active = data.find((a: AnneeScolaire) => a.est_active === 1 || a.est_active === true);
        if (active) {
          setFromYearId(active.id);
          // Choisir la prochaine année si disponible, ou la première différente
          const other = data.find((a: AnneeScolaire) => a.id !== active.id);
          if (other) {
            setToYearId(other.id);
          }
        } else if (data.length > 0) {
          setFromYearId(data[0].id);
          if (data.length > 1) setToYearId(data[1].id);
        }
      }
    } catch (e) {
      console.error("Erreur chargement années:", e);
      toast.error("Impossible de charger les années scolaires");
    } finally {
      setLoadingAnnees(false);
    }
  };

  if (!isOpen) return null;

  const targetTeachersCount = targetScope === 'selected' && selectedTeachers.length > 0
    ? selectedTeachers.length
    : allTeachers.length;

  const handleSubmit = async () => {
    if (!fromYearId || !toYearId) {
      toast.error("Veuillez sélectionner l'année source et l'année cible");
      return;
    }

    if (fromYearId === toYearId) {
      toast.error("L'année de départ et l'année de destination doivent être différentes");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        from_year_id: fromYearId,
        to_year_id: toYearId,
        reconduire_titulariat: reconduireTitulariat,
        reconduire_matieres: reconduireMatieres,
        reconduire_emplois_du_temps: reconduireEmploisDuTemps,
        creer_classes_manquantes: creerClassesManquantes,
        cycle: cycleFilter || 'all'
      };

      if (targetScope === 'selected' && selectedTeachers.length > 0) {
        payload.teacher_ids = selectedTeachers;
      }

      const res = await apiFetch('/api/enseignants/reconduire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Échec de la reconduction des enseignants");
      } else {
        toast.success(data.message || "Reconduction effectuée avec succès !");
        setResultSummary({
          ...data.stats,
          from_year: data.from_year,
          to_year: data.to_year
        });
        onSuccess();
      }
    } catch (e: any) {
      console.error("Erreur reconduction:", e);
      toast.error(e.message || "Erreur réseau lors de la reconduction");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div 
        id="reconduire-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* En-tête */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-xs border border-white/20">
              <Repeat className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Reconduire les enseignants</h2>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Transférer les enseignants et leurs affectations vers une nouvelle année scolaire
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {resultSummary ? (
            /* Résumé après succès */
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-emerald-900">Reconduction réussie avec succès !</h3>
                <p className="text-sm text-emerald-700 mt-1">
                  Les enseignants et leurs affectations ont été reconduits de l'année{' '}
                  <span className="font-semibold">{resultSummary.from_year}</span> vers{' '}
                  <span className="font-semibold">{resultSummary.to_year}</span>.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">Enseignants</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{resultSummary.teachers_count}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Reconduits</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">Classes</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{resultSummary.classes_assigned}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Assignations</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">Matières</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{resultSummary.matieres_assigned}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Attributions</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs text-slate-500 font-medium">Emplois du temps</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{resultSummary.timetable_assigned}</p>
                  <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Créneaux</p>
                </div>
              </div>

              {resultSummary.created_classes_count > 0 && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>{resultSummary.created_classes_count} classe(s)</strong> ont été automatiquement synchronisées et créées dans l'année cible.
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            /* Formulaire de configuration */
            <>
              {/* Sélecteur des années avec flèche */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  Années scolaires
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                  {/* Année source */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Année d'origine (Source)
                    </label>
                    <select
                      value={fromYearId || ''}
                      onChange={(e) => setFromYearId(Number(e.target.value))}
                      disabled={loadingAnnees}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    >
                      {annees.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.libelle} {a.est_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Flèche */}
                  <div className="flex justify-center items-center py-1 sm:py-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs border border-emerald-200">
                      <ArrowRight size={18} />
                    </div>
                  </div>

                  {/* Année cible */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Année de destination (Cible)
                    </label>
                    <select
                      value={toYearId || ''}
                      onChange={(e) => setToYearId(Number(e.target.value))}
                      disabled={loadingAnnees}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    >
                      {annees.map(a => (
                        <option 
                          key={a.id} 
                          value={a.id}
                          disabled={a.id === fromYearId}
                        >
                          {a.libelle} {a.est_active ? '(Active)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {fromYearId === toYearId && (
                  <p className="text-xs text-amber-600 mt-2.5 flex items-center gap-1.5 font-medium">
                    <AlertCircle size={14} />
                    L'année d'origine et l'année de destination doivent être différentes.
                  </p>
                )}
              </div>

              {/* Périmètre des enseignants */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Users size={14} className="text-slate-400" />
                  Périmètre des enseignants
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {selectedTeachers.length > 0 && (
                    <label 
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        targetScope === 'selected' 
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="targetScope"
                        checked={targetScope === 'selected'}
                        onChange={() => setTargetScope('selected')}
                        className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          Sélection actuelle ({selectedTeachers.length})
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Uniquement les {selectedTeachers.length} enseignant(s) cochés
                        </p>
                      </div>
                    </label>
                  )}

                  <label 
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      targetScope === 'all' 
                        ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    } ${selectedTeachers.length === 0 ? 'sm:col-span-2' : ''}`}
                  >
                    <input
                      type="radio"
                      name="targetScope"
                      checked={targetScope === 'all'}
                      onChange={() => setTargetScope('all')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Tous les enseignants ({allTeachers.length})
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Reconduire l'ensemble du corps professoral de l'établissement
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Options de reconduction */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-slate-400" />
                  Données et affectations à reconduire
                </h3>

                <div className="space-y-2.5">
                  {/* Option Titulariat */}
                  <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={reconduireTitulariat}
                      onChange={(e) => setReconduireTitulariat(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Titulaires & Professeurs Principaux
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Recommandé
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Affecter les enseignants aux mêmes classes en tant que titulaires ou professeurs principaux dans la nouvelle année.
                      </p>
                    </div>
                  </label>

                  {/* Option Matières */}
                  <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={reconduireMatieres}
                      onChange={(e) => setReconduireMatieres(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Attribution des Matières par Classe
                        </span>
                        <BookOpen size={14} className="text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Transférer les affectations de matières de chaque enseignant dans les classes correspondantes (avec leurs coefficients et heures).
                      </p>
                    </div>
                  </label>

                  {/* Option Emplois du temps */}
                  <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={reconduireEmploisDuTemps}
                      onChange={(e) => setReconduireEmploisDuTemps(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Emplois du temps & Horaires
                        </span>
                        <Clock size={14} className="text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Recopier les créneaux horaires des enseignants vers l'année scolaire cible.
                      </p>
                    </div>
                  </label>

                  {/* Option Classes Manquantes */}
                  <label className="flex items-start gap-3 p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={creerClassesManquantes}
                      onChange={(e) => setCreerClassesManquantes(e.target.checked)}
                      className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          Création automatique des classes manquantes
                        </span>
                        <Sparkles size={14} className="text-amber-500" />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Si une classe de l'année précédente n'existe pas encore dans la nouvelle année, elle sera créée automatiquement pour accueillir l'enseignant.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Note informative sur les notes */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Information importante :</strong> Conformément à la règle de transition scolaire, seules les fiches et affectations des enseignants sont reportées. Les notes et évaluations de la nouvelle année restent vierges.
                </span>
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || loadingAnnees || !fromYearId || !toYearId || fromYearId === toYearId}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Reconduction en cours...</span>
                    </>
                  ) : (
                    <>
                      <Repeat size={16} />
                      <span>Confirmer la reconduction ({targetTeachersCount})</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
