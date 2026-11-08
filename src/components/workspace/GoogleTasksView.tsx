import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  CheckCircle, 
  ListFilter
} from 'lucide-react';
import { 
  listTaskLists, 
  listTasks, 
  createGoogleTask, 
  updateGoogleTaskStatus, 
  deleteGoogleTask, 
  GoogleTaskItem, 
  GoogleTaskList,
  getWorkspaceAccessToken 
} from '../../lib/google-workspace';
import { WorkspaceConfirmDialog } from './WorkspaceConfirmDialog';
import { toast } from 'react-hot-toast';

export const GoogleTasksView: React.FC = () => {
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('@default');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New task modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    isDestructive?: boolean;
    confirmLabel?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchListsAndTasks = async () => {
    if (!getWorkspaceAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const lists = await listTaskLists();
      setTaskLists(lists);
      const activeListId = selectedListId || (lists[0]?.id || '@default');
      const items = await listTasks(activeListId);
      setTasks(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de charger vos tâches Google Tasks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListsAndTasks();
  }, [selectedListId]);

  const handleApplyPreset = (t: string, n: string) => {
    setTitle(t);
    setNotes(n);
  };

  const handleToggleTask = (task: GoogleTaskItem) => {
    const nextStatus = task.status === 'completed' ? false : true;
    const actionLabel = nextStatus ? 'Marquer comme terminée' : 'Marquer comme à faire';

    setConfirmDialog({
      isOpen: true,
      title: `${actionLabel} cette tâche Google ?`,
      description: `Vous allez mettre à jour le statut de "${task.title}" dans votre liste Google Tasks.`,
      confirmLabel: actionLabel,
      isDestructive: false,
      action: async () => {
        setIsProcessing(true);
        try {
          await updateGoogleTaskStatus(selectedListId, task.id, nextStatus);
          setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus ? 'completed' : 'needsAction' } : t));
          toast.success(`Tâche ${nextStatus ? 'terminée' : 'réouverte'} !`);
        } catch (err: any) {
          toast.error(err.message || 'Erreur mise à jour');
        } finally {
          setIsProcessing(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteTask = (task: GoogleTaskItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer cette tâche Google Tasks ?',
      description: `Voulez-vous supprimer définitivement "${task.title}" ? Cette tâche sera retirée de vos listes Google.`,
      confirmLabel: 'Supprimer la tâche',
      isDestructive: true,
      action: async () => {
        setIsProcessing(true);
        try {
          await deleteGoogleTask(selectedListId, task.id);
          toast.success('Tâche supprimée avec succès.');
          setTasks(prev => prev.filter(t => t.id !== task.id));
        } catch (err: any) {
          toast.error(err.message || 'Erreur lors de la suppression');
        } finally {
          setIsProcessing(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Veuillez spécifier le titre de la tâche.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Créer une tâche dans Google Tasks ?',
      description: `Une nouvelle tâche "${title}" sera ajoutée à votre liste Google Tasks "${taskLists.find(l => l.id === selectedListId)?.title || 'Principale'}".`,
      confirmLabel: 'Créer la tâche',
      isDestructive: false,
      action: async () => {
        setIsProcessing(true);
        try {
          const dueISO = dueDate ? new Date(dueDate).toISOString() : undefined;
          await createGoogleTask(selectedListId, {
            title,
            notes,
            due: dueISO,
          });
          toast.success('Tâche scolaire ajoutée à Google Tasks !');
          setIsModalOpen(false);
          setTitle('');
          setNotes('');
          setDueDate('');
          fetchListsAndTasks();
        } catch (err: any) {
          toast.error(err.message || 'Erreur lors de la création');
        } finally {
          setIsProcessing(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
            <CheckSquare size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tâches & To-Do Google Tasks</h2>
            <p className="text-xs text-slate-500">Suivez les jalons administratifs et pédagogiques de l'établissement</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {taskLists.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <ListFilter size={13} className="text-slate-400" />
              <select
                value={selectedListId}
                onChange={e => setSelectedListId(e.target.value)}
                className="bg-transparent font-medium text-slate-700 focus:outline-none"
              >
                {taskLists.map(l => (
                  <option key={l.id} value={l.id}>{l.title}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={fetchListsAndTasks}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <a
            href="https://tasks.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            <span>Ouvrir Google Tasks</span>
          </a>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-md shadow-teal-100 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Nouvelle Tâche</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Liste des Tâches ({tasks.length})
          </span>
          <span className="text-xs text-slate-400">Synchronisé avec votre compte Google</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Chargement de vos tâches Google Tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckSquare size={38} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Aucune tâche enregistrée dans cette liste</p>
            <p className="text-xs text-slate-400">Ajoutez des rappels de saisie de notes, de préparation de relevés ou de réunions.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map(t => {
              const isDone = t.status === 'completed';
              return (
                <div 
                  key={t.id} 
                  className={`p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4 ${isDone ? 'bg-slate-50/40' : ''}`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTask(t)}
                      className={`mt-0.5 text-slate-400 hover:text-teal-600 transition-colors flex-shrink-0`}
                    >
                      {isDone ? (
                        <CheckSquare size={20} className="text-teal-600" />
                      ) : (
                        <Square size={20} />
                      )}
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className={`text-sm font-bold leading-snug break-words ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {t.title}
                      </h4>
                      {t.notes && (
                        <p className={`text-xs break-words ${isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                          {t.notes}
                        </p>
                      )}
                      {t.due && (
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-amber-600 font-medium">
                          <Calendar size={12} />
                          <span>Échéance : {new Date(t.due).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteTask(t)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                    title="Supprimer la tâche"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: New Google Task */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-teal-600 to-emerald-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Nouvelle Tâche Google Tasks</h3>
                <p className="text-xs text-teal-100">Ajoutée instantanément à votre To-Do Google</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {/* Presets */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Suggestions de tâches scolaires :
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { title: 'Saisie et validation des notes du trimestre', note: 'Vérifier la conformité des moyennes et des coefficients.' },
                    { title: 'Impression des bulletins scolaires', note: 'Générer les bulletins officiels signés par la Direction.' },
                    { title: 'Bilan des absences des enseignants', note: 'Contrôler les fiches de présence de la semaine.' },
                    { title: 'Préparation du relevé des paiements', note: 'Pointer les écolages restants et relancer les parents.' },
                  ].map(p => (
                    <button
                      key={p.title}
                      type="button"
                      onClick={() => handleApplyPreset(p.title, p.note)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-200 transition-colors"
                    >
                      {p.title.slice(0, 32)}...
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Intitulé de la tâche *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Valider les notes de mathématiques 3ème A"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date d'échéance (optionnel)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Remarques
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Détails, consignes ou personnes responsables..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md shadow-teal-200 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>Enregistrer la tâche</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <WorkspaceConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        isProcessing={isProcessing}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
