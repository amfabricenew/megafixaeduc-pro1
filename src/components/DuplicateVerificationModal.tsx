import React from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  ArrowRight, 
  UserCheck, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  ShieldAlert, 
  Layers,
  X
} from 'lucide-react';

export interface DuplicateAnalysisResult {
  total: number;
  validCount: number;
  suspectCount: number;
  duplicateCount: number;
  validItems?: any[];
  suspects?: Array<{
    row?: number;
    nom?: string;
    prenom?: string;
    date_naissance?: string;
    lieu_naissance?: string;
    matricule?: string;
    telephone?: string;
    email?: string;
    reason?: string;
    candidate?: any;
    existing?: any;
    item?: any;
  }>;
  duplicates?: Array<{
    row?: number;
    nom?: string;
    prenom?: string;
    date_naissance?: string;
    lieu_naissance?: string;
    matricule?: string;
    telephone?: string;
    email?: string;
    reason?: string;
    candidate?: any;
    existing?: any;
  }>;
  warnings?: string[];
}

interface DuplicateVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  analysis: DuplicateAnalysisResult | null;
  singleCandidate?: any;
  singleExisting?: any;
  singleReason?: string;
  isSingleMode?: boolean;
  onContinueAll: () => void;
  onContinueValidOnly?: () => void;
  isSubmitting?: boolean;
  entityName?: string; // 'élève' | 'enseignant' | 'membre du personnel'
}

export const DuplicateVerificationModal: React.FC<DuplicateVerificationModalProps> = ({
  isOpen,
  onClose,
  title = "Vérification des doublons & Analyse de conformité",
  analysis,
  singleCandidate,
  singleExisting,
  singleReason,
  isSingleMode = false,
  onContinueAll,
  onContinueValidOnly,
  isSubmitting = false,
  entityName = "enregistrement"
}) => {
  if (!isOpen) return null;

  // Single Record Mode
  if (isSingleMode && singleCandidate) {
    const cand = singleCandidate;
    const exist = singleExisting || {};
    const hasLieuDiff = (cand.lieu_naissance || exist.lieu_naissance) && 
      (cand.lieu_naissance || '').trim().toLowerCase() !== (exist.lieu_naissance || '').trim().toLowerCase();

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-amber-200 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Vérification de conformité requise</h3>
                <p className="text-xs text-amber-100 font-medium">
                  Similarité détectée avec un {entityName} existant
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-amber-950">
                  {singleReason || "Le nom, le prénom et la date de naissance sont identiques à un enregistrement existant, mais le lieu de naissance diffère."}
                </p>
                <p className="text-amber-800">
                  Veuillez vérifier attentivement le tableau de comparaison ci-dessous avant de décider si vous souhaitez enregistrer ce profil ou annuler.
                </p>
              </div>
            </div>

            {/* Side by side comparison */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                <span>Critère comparé</span>
                <div className="grid grid-cols-2 gap-4 w-2/3 text-center">
                  <span className="text-indigo-600">Nouvelle saisie</span>
                  <span className="text-slate-600">Enregistrement existant</span>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {/* Nom */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Nom
                  </span>
                  <div className="grid grid-cols-2 gap-4 w-2/3">
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg font-bold text-indigo-950 text-center">
                      {cand.nom || '—'}
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-center">
                      {exist.nom || '—'}
                    </div>
                  </div>
                </div>

                {/* Prénom */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Prénom(s)
                  </span>
                  <div className="grid grid-cols-2 gap-4 w-2/3">
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg font-bold text-indigo-950 text-center">
                      {cand.prenom || '—'}
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-center">
                      {exist.prenom || '—'}
                    </div>
                  </div>
                </div>

                {/* Date Naissance */}
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date de naissance
                  </span>
                  <div className="grid grid-cols-2 gap-4 w-2/3">
                    <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg font-bold text-indigo-950 text-center">
                      {cand.date_naissance || 'Non renseignée'}
                    </div>
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800 text-center">
                      {exist.date_naissance || 'Non renseignée'}
                    </div>
                  </div>
                </div>

                {/* Lieu Naissance */}
                <div className={`px-4 py-3 flex items-center justify-between ${hasLieuDiff ? 'bg-amber-50/60' : ''}`}>
                  <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                    <MapPin className={`w-3.5 h-3.5 ${hasLieuDiff ? 'text-amber-600' : 'text-slate-400'}`} /> 
                    Lieu de naissance
                    {hasLieuDiff && (
                      <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-md">
                        Différence
                      </span>
                    )}
                  </span>
                  <div className="grid grid-cols-2 gap-4 w-2/3">
                    <div className={`p-2 rounded-lg font-bold text-center border ${
                      hasLieuDiff ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-indigo-50/50 border-indigo-100 text-indigo-950'
                    }`}>
                      {cand.lieu_naissance || 'Non renseigné'}
                    </div>
                    <div className={`p-2 rounded-lg font-bold text-center border ${
                      hasLieuDiff ? 'bg-amber-100/70 border-amber-300 text-amber-950' : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}>
                      {exist.lieu_naissance || 'Non renseigné'}
                    </div>
                  </div>
                </div>

                {/* Contact ou matricule si présent */}
                {(cand.telephone || exist.telephone || cand.matricule || exist.matricule) && (
                  <div className="px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact / Identifiant
                    </span>
                    <div className="grid grid-cols-2 gap-4 w-2/3">
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-center">
                        {cand.telephone || cand.matricule || '—'}
                      </div>
                      <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-center">
                        {exist.telephone || exist.matricule || '—'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onContinueAll}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Enregistrement...' : 'Continuer l\'enregistrement'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Bulk Import Analysis Mode
  if (!analysis) return null;

  const { total, validCount, suspectCount, duplicateCount, suspects = [], duplicates = [] } = analysis;
  const hasSuspects = suspectCount > 0;
  const hasDuplicates = duplicateCount > 0;
  const hasValids = validCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/40 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">{title}</h3>
              <p className="text-xs text-slate-300">
                Rapport de vérification par niveau de conformité (Nom, Prénom, Date et Lieu de naissance)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total analysé</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{total}</div>
            <span className="text-[11px] text-slate-400">lignes dans le fichier</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sans doublon
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-1">{validCount}</div>
            <span className="text-[11px] text-emerald-700/80 font-medium">prêts à importer</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> À vérifier
            </span>
            <div className="text-2xl font-black text-amber-600 mt-1">{suspectCount}</div>
            <span className="text-[11px] text-amber-700/80 font-medium">différence de lieu</span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Doublons stricts
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">{duplicateCount}</div>
            <span className="text-[11px] text-rose-700/80 font-medium">rejetés (conformes)</span>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* 1. SUSPECT ITEMS SECTION (Différence négligeable / Lieu de naissance) */}
          {hasSuspects && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Cas à vérifier : Conformité avec différence du lieu de naissance ({suspects.length})
                </h4>
                <span className="text-[11px] text-amber-700 font-semibold bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Action requise
                </span>
              </div>

              <p className="text-xs text-slate-600">
                Pour les lignes ci-dessous, le <strong>Nom</strong>, le <strong>Prénom</strong> et la <strong>Date de naissance</strong> sont strictement identiques à un enregistrement existant, mais le <strong>Lieu de naissance</strong> diffère. Comparez les données avant de valider :
              </p>

              <div className="space-y-4">
                {suspects.map((s, idx) => {
                  const cand = s.candidate || s;
                  const exist = s.existing || {};
                  return (
                    <div key={idx} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-amber-600 text-white font-extrabold text-[11px] rounded-md">
                            Ligne {s.row || idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">
                            {cand.nom} {cand.prenom}
                          </span>
                        </div>
                        <span className="text-[11px] text-amber-800 font-medium italic">
                          Lieu diffère
                        </span>
                      </div>

                      {/* Side by side comparison table */}
                      <div className="bg-white rounded-lg border border-amber-200/80 overflow-hidden text-xs">
                        <div className="grid grid-cols-3 bg-slate-50 font-bold text-slate-600 px-3 py-2 border-b border-slate-200 text-[11px]">
                          <div>Information</div>
                          <div className="text-indigo-700">Fichier à importer</div>
                          <div className="text-slate-700">Enregistrement existant (École)</div>
                        </div>

                        <div className="divide-y divide-slate-100">
                          <div className="grid grid-cols-3 px-3 py-2 items-center">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> Nom & Prénom
                            </span>
                            <span className="font-bold text-indigo-900">{cand.nom} {cand.prenom}</span>
                            <span className="font-bold text-slate-800">{exist.nom || '—'} {exist.prenom || ''}</span>
                          </div>

                          <div className="grid grid-cols-3 px-3 py-2 items-center">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" /> Date naissance
                            </span>
                            <span className="font-medium text-indigo-900">{cand.date_naissance || 'Non renseignée'}</span>
                            <span className="font-medium text-slate-800">{exist.date_naissance || 'Non renseignée'}</span>
                          </div>

                          <div className="grid grid-cols-3 px-3 py-2 items-center bg-amber-50/80">
                            <span className="font-bold text-amber-900 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-amber-600" /> Lieu naissance
                            </span>
                            <span className="font-black text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200 w-fit">
                              {cand.lieu_naissance || 'Non renseigné'}
                            </span>
                            <span className="font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 w-fit">
                              {exist.lieu_naissance || 'Non renseigné'}
                            </span>
                          </div>

                          {(cand.telephone || exist.telephone || cand.matricule || exist.matricule) && (
                            <div className="grid grid-cols-3 px-3 py-2 items-center text-slate-600">
                              <span className="font-semibold flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" /> Contact / ID
                              </span>
                              <span>{cand.telephone || cand.matricule || '—'}</span>
                              <span>{exist.telephone || exist.matricule || '—'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. STRICT DUPLICATES SECTION (Rejetés automatiquement) */}
          {hasDuplicates && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-900 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Doublons stricts rejetés — Conformité totale ({duplicates.length})
                </h4>
                <span className="text-[11px] text-rose-700 font-semibold bg-rose-100 px-2.5 py-0.5 rounded-full">
                  Non importés
                </span>
              </div>

              <div className="border border-rose-200 bg-rose-50/30 rounded-xl overflow-hidden divide-y divide-rose-100 text-xs">
                {duplicates.map((d, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-md shrink-0">
                        Ligne {d.row || idx + 1}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900">
                          {d.nom} {d.prenom}
                        </div>
                        <div className="text-[11px] text-rose-800">
                          {d.reason || "Nom, Prénom, Date et Lieu de naissance strictement identiques à un enregistrement existant."}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-1 rounded-md shrink-0">
                      Rejeté
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. CLEAN ITEMS SECTION */}
          {hasValids && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold">{validCount} profil(s) sans aucun doublon</span>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Ces enregistrements sont valides et prêts à être intégrés dans la base de données.
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-600 text-white font-bold rounded-lg text-[11px] shrink-0">
                100% Conforme
              </span>
            </div>
          )}

          {/* If completely clean */}
          {!hasSuspects && !hasDuplicates && (
            <div className="text-center py-6 space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">Toutes les données sont conformes !</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Aucun doublon strict ni suspect n'a été détecté dans votre fichier d'importation.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons as explicitly requested */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition order-3 sm:order-1"
          >
            Annuler
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            {/* Button 3: Continuer avec les sans doublons */}
            {hasValids && (
              <button
                type="button"
                onClick={onContinueValidOnly}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Continuer avec les sans doublons ({validCount})
              </button>
            )}

            {/* Button 1: Continuer l'importation */}
            <button
              type="button"
              onClick={onContinueAll}
              disabled={isSubmitting || (validCount === 0 && suspectCount === 0)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              {isSubmitting 
                ? 'Importation en cours...' 
                : hasSuspects 
                  ? `Continuer l'importation (${validCount + suspectCount})` 
                  : `Continuer l'importation (${validCount})`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
