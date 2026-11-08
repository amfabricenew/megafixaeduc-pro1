import React, { useState, useEffect } from 'react';
import { 
  Repeat, X, ArrowRight, CheckCircle2, AlertCircle, 
  Calendar, Users, Briefcase, Clock, ShieldCheck, Check, Sparkles 
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

interface StaffMember {
  id: number;
  nom: string;
  prenom: string;
  poste: string;
  telephone?: string;
  email?: string;
  matricule?: string;
  date_embauche?: string;
  anciennete_texte?: string;
  est_reconduit?: boolean;
}

interface ReconduirePersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedStaff: number[];
  allStaff: StaffMember[];
}

export const ReconduirePersonnelModal: React.FC<ReconduirePersonnelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedStaff,
  allStaff
}) => {
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [loadingAnnees, setLoadingAnnees] = useState(false);
  const [fromYearId, setFromYearId] = useState<number | null>(null);
  const [toYearId, setToYearId] = useState<number | null>(null);
  
  // Options
  const [targetScope, setTargetScope] = useState<'selected' | 'all'>(
    selectedStaff.length > 0 ? 'selected' : 'all'
  );
  const [reconduirePostes, setReconduirePostes] = useState(true);
  const [reconduireSalaires, setReconduireSalaires] = useState(true);

  // States for process & results
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    staff_count: number;
    from_year: string;
    to_year: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAnnees();
      setResultSummary(null);
      setTargetScope(selectedStaff.length > 0 ? 'selected' : 'all');
    }
  }, [isOpen, selectedStaff.length]);

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

  const targetStaffCount = targetScope === 'selected' && selectedStaff.length > 0
    ? selectedStaff.length
    : allStaff.length;

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
        reconduire_postes: reconduirePostes,
        reconduire_salaires: reconduireSalaires
      };

      if (targetScope === 'selected' && selectedStaff.length > 0) {
        payload.staff_ids = selectedStaff;
      }

      const res = await apiFetch('/api/personnel-administratif/reconduire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(data.error || "Échec de la reconduction du personnel");
      } else {
        toast.success(data.message || "Personnel reconduit avec succès !");
        setResultSummary({
          staff_count: data.stats?.staff_count || targetStaffCount,
          from_year: data.from_year || 'Année précédente',
          to_year: data.to_year || 'Nouvelle année'
        });
        onSuccess();
      }
    } catch (e) {
      console.error("Erreur reconduction:", e);
      toast.error("Une erreur réseau est survenue lors de la reconduction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromYear = annees.find(a => a.id === fromYearId);
  const toYear = annees.find(a => a.id === toYearId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-6 text-white flex items-start justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <Repeat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Reconduire le Personnel Administratif</h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                Rollover et reconduction des informations du personnel vers la nouvelle année scolaire
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {resultSummary ? (
            /* Result Summary View */
            <div className="space-y-6 py-2">
              <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-emerald-950">Reconduction effectuée avec succès !</h3>
                <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto">
                  Le personnel a été reconduit vers l'année scolaire <strong>{resultSummary.to_year}</strong>. Leurs informations et ancienneté (années et mois) sont mises à jour automatiquement.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Personnel reconduit</span>
                    <p className="text-lg font-bold text-slate-900">{resultSummary.staff_count} membre(s)</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Calcul ancienneté</span>
                    <p className="text-lg font-bold text-slate-900">Actif (+1 an / mois)</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Continuité des services administratifs</span>
                </div>
                <p className="leading-relaxed">
                  Les membres du personnel reconduits conservent leur matricule, leurs coordonnées et leurs postes. Leurs identifiants de connexion et leurs droits d'accès restent opérationnels dans la nouvelle année.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            /* Form View */
            <>
              {/* Year Selection */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    Transition d'années scolaires
                  </span>
                  {loadingAnnees && <span className="text-xs text-slate-400">Chargement...</span>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Année de départ (Source)
                    </label>
                    <select
                      value={fromYearId || ''}
                      onChange={e => setFromYearId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {annees.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.libelle} {a.est_active ? '(Actuelle)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-center pt-4 sm:pt-4 text-slate-400 sm:col-span-1">
                    <div className="p-2 bg-white rounded-full border border-slate-200 shadow-2xs">
                      <ArrowRight className="w-4 h-4 text-indigo-600" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Année cible (Destination)
                    </label>
                    <select
                      value={toYearId || ''}
                      onChange={e => setToYearId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-indigo-300 ring-2 ring-indigo-50 rounded-xl text-sm font-semibold text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      {annees.map(a => (
                        <option key={a.id} value={a.id} disabled={a.id === fromYearId}>
                          {a.libelle} {a.id === fromYearId ? '(Source)' : (a.est_active ? '(Active)' : '')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {fromYear && toYear && (
                  <p className="text-xs text-indigo-800 bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>
                      Reconduction du personnel de <strong>{fromYear.libelle}</strong> vers <strong>{toYear.libelle}</strong> avec mise à jour automatique de l'ancienneté.
                    </span>
                  </p>
                )}
              </div>

              {/* Scope Selection (Selected vs All) */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Périmètre de reconduction
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                      targetScope === 'all'
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${targetScope === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Tout le personnel</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Reconduire l'ensemble des {allStaff.length} membres administratifs.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={selectedStaff.length === 0}
                    onClick={() => setTargetScope('selected')}
                    className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                      selectedStaff.length === 0
                        ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
                        : targetScope === 'selected'
                        ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl shrink-0 ${targetScope === 'selected' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">
                        Sélection uniquement ({selectedStaff.length})
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {selectedStaff.length > 0
                          ? `Reconduire les ${selectedStaff.length} membres sélectionnés.`
                          : 'Aucun membre sélectionné.'}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Options of Reconduction */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-700 block">
                  Paramètres de transfert des informations
                </span>

                <div className="space-y-2.5">
                  <label className="flex items-start gap-3 p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={reconduirePostes}
                      onChange={e => setReconduirePostes(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                        Reconduire les postes et attributions de fonctions
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Conserver le titre du poste (ex. Secrétaire, Surveillant, Censeur, Comptable) pour la nouvelle année.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-slate-50/80 hover:bg-slate-50 rounded-xl border border-slate-200 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={reconduireSalaires}
                      onChange={e => setReconduireSalaires(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        Calculer et actualiser l'ancienneté du personnel
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        L'ancienneté sera calculée depuis la date d'embauche et affichée en nombre d'années et de mois dans la nouvelle année.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Intégrité garantie :</strong> Le personnel reconduit aura son statut mis à jour en <em>Reconduit</em> dans la nouvelle année scolaire sans altérer les archives des années antérieures.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                >
                  Annuler
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || !fromYearId || !toYearId || fromYearId === toYearId}
                  onClick={handleSubmit}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Reconduction en cours...</span>
                    </>
                  ) : (
                    <>
                      <Repeat className="w-4 h-4" />
                      <span>Confirmer la reconduction ({targetStaffCount})</span>
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
