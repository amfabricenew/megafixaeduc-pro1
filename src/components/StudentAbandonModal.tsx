import React from 'react';
import { X, UserX, UserCheck, AlertTriangle, Calendar, FileText } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';

interface StudentAbandonModalProps {
  student: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function StudentAbandonModal({ student, isOpen, onClose, onSuccess }: StudentAbandonModalProps) {
  const isCurrentlyAbandoned = student?.statut_scolaire === 'Abandon' || student?.est_abandonne === 1;
  const [action, setAction] = React.useState<'abandon' | 'reprise'>(isCurrentlyAbandoned ? 'reprise' : 'abandon');
  const [date, setDate] = React.useState<string>(new Date().toISOString().split('T')[0]);
  const [motif, setMotif] = React.useState<string>('Déménagement');
  const [customMotif, setCustomMotif] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (student) {
      const isAbandoned = student?.statut_scolaire === 'Abandon' || student?.est_abandonne === 1;
      setAction(isAbandoned ? 'reprise' : 'abandon');
      setDate(new Date().toISOString().split('T')[0]);
      setMotif('Déménagement');
      setCustomMotif('');
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const studentId = student?.id ?? student?.eleve_id ?? student?.id_eleve;
    if (!studentId) {
      toast.error("Identifiant de l'élève introuvable");
      return;
    }

    setIsLoading(true);
    const finalMotif = motif === 'Autre' ? (customMotif || 'Autre motif') : motif;

    try {
      const res = await apiFetch(`/api/eleves/${studentId}/statut-scolaire`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statut_scolaire: action === 'abandon' ? 'Abandon' : 'Actif',
          motif_abandon: action === 'abandon' ? finalMotif : null,
          date: date
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || (action === 'abandon' ? "Élève marqué en abandon" : "Reprise enregistrée avec succès"));
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Erreur lors de la mise à jour");
      }
    } catch (err: any) {
      console.error("Error updating abandon status:", err);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className={`p-6 text-white flex items-center justify-between ${
          action === 'abandon' ? 'bg-gradient-to-r from-red-600 to-rose-700' : 'bg-gradient-to-r from-emerald-600 to-teal-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              {action === 'abandon' ? <UserX size={24} /> : <UserCheck size={24} />}
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {action === 'abandon' ? "Déclarer un Abandon d'Élève" : "Enregistrer la Reprise de l'Élève"}
              </h2>
              <p className="text-xs text-white/80">
                {student?.nom || ''} {student?.prenom || ''} ({student?.matricule || 'Sans matricule'})
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {/* Action Choice Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setAction('abandon')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                action === 'abandon'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserX size={15} />
              Déclarer Abandon
            </button>
            <button
              type="button"
              onClick={() => setAction('reprise')}
              className={`py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                action === 'reprise'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck size={15} />
              Marquer la Reprise
            </button>
          </div>

          {/* Student Banner */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 font-medium">Classe:</span>
              <p className="font-bold text-slate-800">{student.classe_nom || 'Non assigné'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Statut Actuel:</span>
              <p className={`font-bold ${isCurrentlyAbandoned ? 'text-red-600' : 'text-emerald-600'}`}>
                {isCurrentlyAbandoned ? 'En Abandon' : 'Actif'}
              </p>
            </div>
            {student.date_abandon && (
              <div>
                <span className="text-slate-400 font-medium">Date d'abandon:</span>
                <p className="font-mono text-slate-700">{student.date_abandon}</p>
              </div>
            )}
          </div>

          {action === 'abandon' && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800 leading-relaxed">
                L'élève sera marqué comme <strong>ayant abandonné</strong>. Il sera exclu des calculs de présences courantes et mis en évidence dans le bilan mensuel d'établissement.
              </p>
            </div>
          )}

          {action === 'reprise' && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3">
              <UserCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-800 leading-relaxed">
                L'élève sera <strong>réintégré comme Actif</strong> dans la classe. Son suivi des présences et ses relevés reprendront à partir de la date sélectionnée.
              </p>
            </div>
          )}

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" />
              {action === 'abandon' ? "Date effective de l'abandon" : "Date de reprise des cours"}
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {/* Motif (Only for Abandon) */}
          {action === 'abandon' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-slate-500" />
                Motif de l'abandon
              </label>
              <select
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
              >
                <option value="Déménagement">Déménagement / Changement de localité</option>
                <option value="Difficultés financières">Difficultés financières des parents</option>
                <option value="Santé / Maladie">Raison de santé / Maladie prolongée</option>
                <option value="Travail / Apprentissage">Orientation professionnelle / Travail</option>
                <option value="Mariage / Raison familiale">Situation familiale / Mariage précoce</option>
                <option value="Transfert non finalisé">Transfert vers un autre établissement</option>
                <option value="Autre">Autre motif personnalisé...</option>
              </select>

              {motif === 'Autre' && (
                <input
                  type="text"
                  placeholder="Précisez le motif..."
                  value={customMotif}
                  onChange={(e) => setCustomMotif(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none transition-all"
                />
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-2 ${
                action === 'abandon'
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
              } disabled:opacity-50`}
            >
              {isLoading ? "Enregistrement..." : action === 'abandon' ? "Confirmer l'abandon" : "Confirmer la reprise"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
