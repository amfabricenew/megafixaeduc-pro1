import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Clock, 
  MapPin, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  CalendarDays
} from 'lucide-react';
import { 
  listCalendarEvents, 
  createCalendarEvent, 
  deleteCalendarEvent, 
  CalendarEvent,
  getWorkspaceAccessToken 
} from '../../lib/google-workspace';
import { WorkspaceConfirmDialog } from './WorkspaceConfirmDialog';
import { toast } from 'react-hot-toast';

export const GoogleCalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Event Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Complexe Scolaire');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(11, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

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

  const fetchEvents = async () => {
    if (!getWorkspaceAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await listCalendarEvents();
      setEvents(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de charger les événements Google Calendar.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleApplyPreset = (title: string, desc: string, loc: string) => {
    setSummary(title);
    setDescription(desc);
    setLocation(loc);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) {
      toast.error('Veuillez renseigner le titre de l\'événement.');
      return;
    }

    const startISO = new Date(startDate).toISOString();
    const endISO = new Date(endDate).toISOString();

    setConfirmDialog({
      isOpen: true,
      title: 'Ajouter cet événement à Google Calendar ?',
      description: `Vous vous apprêtez à créer l'événement "${summary}" du ${new Date(startDate).toLocaleString('fr-FR')} au ${new Date(endDate).toLocaleString('fr-FR')} dans votre agenda principal Google.`,
      confirmLabel: 'Créer dans Calendar',
      isDestructive: false,
      action: async () => {
        setIsProcessing(true);
        try {
          await createCalendarEvent({
            summary,
            description,
            location,
            startDateTime: startISO,
            endDateTime: endISO,
          });
          toast.success('Événement scolaire synchronisé dans Google Calendar !');
          setIsModalOpen(false);
          setSummary('');
          setDescription('');
          fetchEvents();
        } catch (err: any) {
          toast.error(err.message || 'Erreur lors de la création');
        } finally {
          setIsProcessing(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteClick = (event: CalendarEvent) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Supprimer cet événement Google Calendar ?',
      description: `Êtes-vous sûr de vouloir supprimer définitivement "${event.summary}" de votre agenda Google ? Cette action est irréversible.`,
      confirmLabel: 'Supprimer l\'événement',
      isDestructive: true,
      action: async () => {
        setIsProcessing(true);
        try {
          await deleteCalendarEvent(event.id);
          toast.success('Événement supprimé avec succès.');
          setEvents(prev => prev.filter(e => e.id !== event.id));
        } catch (err: any) {
          toast.error(err.message || 'Erreur lors de la suppression');
        } finally {
          setIsProcessing(false);
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <CalendarIcon size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Événements & Agenda Google</h2>
            <p className="text-xs text-slate-500">Planifiez conseils, réunions de parents et examens scolaires</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <a
            href="https://calendar.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            <span>Ouvrir Google Calendar</span>
          </a>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-100 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Nouvel Événement</span>
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

      {/* Events List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <CalendarDays size={14} className="text-blue-500" />
            Événements planifiés ({events.length})
          </span>
          <span className="text-xs text-slate-400">Synchronisé en temps réel avec Google Calendar</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Chargement de votre agenda Google...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CalendarIcon size={38} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Aucun événement à venir trouvé dans cet agenda</p>
            <p className="text-xs text-slate-400">Cliquez sur « Nouvel Événement » pour programmer votre première activité scolaire.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {events.map(ev => {
              const startStr = ev.start.dateTime || ev.start.date;
              const endStr = ev.end.dateTime || ev.end.date;
              const d = startStr ? new Date(startStr) : null;

              return (
                <div key={ev.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-center min-w-[55px]">
                      <div className="text-[10px] uppercase font-semibold text-blue-500">
                        {d ? d.toLocaleString('fr-FR', { month: 'short' }) : '---'}
                      </div>
                      <div className="text-lg leading-tight font-extrabold text-blue-700">
                        {d ? d.getDate() : '--'}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">{ev.summary}</h4>
                      {ev.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{ev.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                        {startStr && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} className="text-slate-400" />
                            {new Date(startStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            {endStr && ` - ${new Date(endStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1 text-slate-500">
                            <MapPin size={12} className="text-slate-400" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {ev.htmlLink && (
                      <a
                        href={ev.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir dans Calendar"
                      >
                        <ExternalLink size={15} />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteClick(ev)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: New School Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Programmer un Événement Scolaire</h3>
                <p className="text-xs text-blue-100">Synchronisé directement avec Google Calendar</p>
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
                  Modèles d'événements rapides :
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Conseil de Classe', desc: 'Délibération des résultats scolaires et bilans trimestriels.', loc: 'Salle des Professeurs' },
                    { label: 'Réunion des Parents', desc: 'Rencontre générale direction, enseignants et parents d\'élèves.', loc: 'Grand Amphithéâtre' },
                    { label: 'Examen Blanc', desc: 'Épreuve générale de préparation aux examens nationaux.', loc: 'Salles d\'examen' },
                    { label: 'Journée Pédagogique', desc: 'Session de formation continue et harmonisation des programmes.', loc: 'Direction Pédagogique' },
                  ].map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleApplyPreset(p.label, p.desc, p.loc)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titre de l'événement *
                </label>
                <input
                  type="text"
                  required
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Ex: Conseil de classe - 3ème A (Trimestre 2)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Début *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fin *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lieu
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Ex: Salle de réunion, Cotonou"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Ordre du jour
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Détails de la réunion, ordre du jour, participants conviés..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
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
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-200 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle size={15} />
                  <span>Enregistrer dans Calendar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory confirmation dialog */}
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
