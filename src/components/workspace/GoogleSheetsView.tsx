import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  ExternalLink, 
  RefreshCw, 
  AlertCircle, 
  Download, 
  Users, 
  GraduationCap, 
  CreditCard, 
  BookOpen, 
  CheckCircle,
  Eye,
  Table
} from 'lucide-react';
import { 
  listGoogleSheets, 
  createGoogleSpreadsheetWithData, 
  readSpreadsheetValues,
  GoogleDriveSheetFile,
  getWorkspaceAccessToken 
} from '../../lib/google-workspace';
import { WorkspaceConfirmDialog } from './WorkspaceConfirmDialog';
import { getCloudTables } from '../../utils/cloudFallback';
import { toast } from 'react-hot-toast';

export const GoogleSheetsView: React.FC = () => {
  const [sheets, setSheets] = useState<GoogleDriveSheetFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Spreadsheet preview
  const [previewSheet, setPreviewSheet] = useState<{ id: string; name: string } | null>(null);
  const [previewValues, setPreviewValues] = useState<string[][]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Export Modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'eleves' | 'classes' | 'matieres' | 'paiements'>('eleves');
  const [customTitle, setCustomTitle] = useState('');

  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    affectedItemsCount?: number;
    affectedItemLabel?: string;
    confirmLabel?: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: async () => {},
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchSheets = async () => {
    if (!getWorkspaceAccessToken()) return;
    setIsLoading(true);
    setError(null);
    try {
      const items = await listGoogleSheets();
      setSheets(items);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Impossible de charger vos tableurs Google Sheets.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSheets();
  }, []);

  const handlePreviewSheet = async (sheet: GoogleDriveSheetFile) => {
    setPreviewSheet(sheet);
    setIsPreviewLoading(true);
    try {
      const res = await readSpreadsheetValues(sheet.id, 'A1:Z30');
      setPreviewValues(res.values);
    } catch (err: any) {
      toast.error(err.message || 'Impossible de lire les cellules de ce tableur.');
      setPreviewValues([]);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleOpenExportModal = (type: 'eleves' | 'classes' | 'matieres' | 'paiements') => {
    setExportType(type);
    const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    if (type === 'eleves') setCustomTitle(`Liste des Élèves - ${dateStr}`);
    if (type === 'classes') setCustomTitle(`Effectifs et Classes - ${dateStr}`);
    if (type === 'matieres') setCustomTitle(`Programme des Matières - ${dateStr}`);
    if (type === 'paiements') setCustomTitle(`Journal des Paiements - ${dateStr}`);
    setIsExportModalOpen(true);
  };

  const handleExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) {
      toast.error('Veuillez spécifier le titre du tableur.');
      return;
    }

    // Load table data from school state
    const tables = await getCloudTables();
    let headers: string[] = [];
    let rows: any[][] = [];
    let rowCount = 0;

    if (exportType === 'eleves') {
      const eleves = tables['eleves'] || [];
      const classes = tables['classes'] || [];
      headers = ['Matricule', 'Nom', 'Prénoms', 'Sexe', 'Classe', 'Date Naissance', 'Téléphone Parent', 'Statut'];
      rows = eleves.map(el => {
        const cl = classes.find(c => c.id === el.classe_id);
        return [
          el.matricule || 'N/A',
          el.nom || '',
          el.prenom || '',
          el.sexe || '',
          cl?.nom || el.classe_nom || 'Non assigné',
          el.date_naissance || '',
          el.telephone_parent || '',
          el.statut || 'Inscrit'
        ];
      });
      rowCount = rows.length;
    } else if (exportType === 'classes') {
      const classes = tables['classes'] || [];
      headers = ['Identifiant', 'Nom de la Classe', 'Cycle / Niveau', 'Effectif Estimé', 'Salle'];
      rows = classes.map(cl => [
        cl.id,
        cl.nom || cl.libelle || '',
        cl.cycle || cl.niveau || 'Secondaire',
        cl.effectif || 0,
        cl.salle || 'Bâtiment Principal'
      ]);
      rowCount = rows.length;
    } else if (exportType === 'matieres') {
      const matieres = tables['matieres'] || [];
      headers = ['Matière', 'Code', 'Coefficient', 'Pôle d\'Enseignement'];
      rows = matieres.map(m => [
        m.nom || m.libelle || '',
        m.code || '',
        m.coefficient || 1,
        m.pole || 'Général'
      ]);
      rowCount = rows.length;
    } else {
      const paiements = tables['paiements'] || [];
      headers = ['Date', 'Reçu N°', 'Élève / Matricule', 'Motif', 'Montant Payé (FCFA)', 'Mode de Paiement'];
      rows = paiements.map(p => [
        p.date_paiement || p.created_at || '',
        p.numero_recu || p.id,
        p.eleve_nom || p.matricule || 'Élève',
        p.motif || 'Scolarité',
        p.montant || 0,
        p.mode_paiement || 'Espèces'
      ]);
      rowCount = rows.length;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Exporter les données vers Google Sheets ?',
      description: `Un nouveau classeur Google Sheets intitulé "${customTitle}" sera créé sur votre compte Google Drive avec ${rowCount} lignes de données de l'établissement.`,
      affectedItemsCount: rowCount,
      affectedItemLabel: 'lignes exportées',
      confirmLabel: 'Créer le Tableur Google',
      action: async () => {
        setIsProcessing(true);
        try {
          const res = await createGoogleSpreadsheetWithData(customTitle, headers, rows);
          toast.success('Tableur Google Sheets généré avec succès !');
          setIsExportModalOpen(false);
          fetchSheets();
          if (res.spreadsheetUrl) {
            window.open(res.spreadsheetUrl, '_blank');
          }
        } catch (err: any) {
          toast.error(err.message || 'Erreur lors de l\'export');
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
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Tableurs & Exports Google Sheets</h2>
            <p className="text-xs text-slate-500">Exportez listes scolaires, effectifs et finances directement en ligne</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchSheets}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Rafraîchir"
          >
            <RefreshCw size={17} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <a
            href="https://sheets.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          >
            <ExternalLink size={14} />
            <span>Ouvrir Google Sheets</span>
          </a>

          <button
            onClick={() => handleOpenExportModal('eleves')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-100 flex items-center gap-1.5 transition-all"
          >
            <Plus size={16} />
            <span>Nouvel Export Sheets</span>
          </button>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            type: 'eleves' as const,
            title: 'Exporter les Élèves',
            desc: 'Matricule, nom, classe, contact parents...',
            icon: Users,
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            buttonColor: 'bg-emerald-600 hover:bg-emerald-700'
          },
          {
            type: 'classes' as const,
            title: 'Exporter les Classes',
            desc: 'Niveaux, effectifs et salles de cours...',
            icon: GraduationCap,
            color: 'text-blue-600 bg-blue-50 border-blue-200',
            buttonColor: 'bg-blue-600 hover:bg-blue-700'
          },
          {
            type: 'matieres' as const,
            title: 'Exporter les Matières',
            desc: 'Coefficients et filières d\'enseignement...',
            icon: BookOpen,
            color: 'text-purple-600 bg-purple-50 border-purple-200',
            buttonColor: 'bg-purple-600 hover:bg-purple-700'
          },
          {
            type: 'paiements' as const,
            title: 'Exporter les Finances',
            desc: 'Reçus, frais de scolarité et paiements...',
            icon: CreditCard,
            color: 'text-amber-600 bg-amber-50 border-amber-200',
            buttonColor: 'bg-amber-600 hover:bg-amber-700'
          },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div 
              key={card.type}
              className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl border ${card.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{card.title}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{card.desc}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenExportModal(card.type)}
                className={`w-full py-2 px-3 rounded-xl text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 ${card.buttonColor}`}
              >
                <Download size={13} />
                <span>Exporter vers Google Sheets</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Sheets List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Tableurs Google Sheets récents ({sheets.length})
          </span>
          <span className="text-xs text-slate-400">Synchronisé avec votre Google Drive</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Chargement de vos tableurs Google Sheets...</p>
          </div>
        ) : sheets.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileSpreadsheet size={38} className="mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Aucun tableur Google Sheets trouvé récemment</p>
            <p className="text-xs text-slate-400">Utilisez un des boutons d'export ci-dessus pour générer votre premier tableur scolaire en ligne.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sheets.map(sheet => (
              <div 
                key={sheet.id} 
                className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">{sheet.name}</h4>
                    <p className="text-xs text-slate-400">
                      Modifié le {sheet.modifiedTime ? new Date(sheet.modifiedTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'récemment'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handlePreviewSheet(sheet)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors flex items-center gap-1.5"
                    title="Aperçu rapide"
                  >
                    <Eye size={13} />
                    <span>Aperçu</span>
                  </button>

                  <a
                    href={sheet.webViewLink || `https://docs.google.com/spreadsheets/d/${sheet.id}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink size={13} />
                    <span>Ouvrir Sheets</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Quick Cell Preview */}
      {previewSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Table size={18} />
                <h3 className="font-bold text-sm truncate max-w-md">{previewSheet.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${previewSheet.id}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs bg-white/20 hover:bg-white/30 text-white rounded-lg flex items-center gap-1 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>Ouvrir</span>
                </a>
                <button
                  onClick={() => setPreviewSheet(null)}
                  className="text-white/80 hover:text-white p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 overflow-auto flex-1 bg-slate-50">
              {isPreviewLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Lecture des cellules en direct depuis l'API Google Sheets...</p>
                </div>
              ) : previewValues.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <p className="text-xs">Aucune cellule non vide trouvée sur la première feuille.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-xs text-left border-collapse">
                    <tbody>
                      {previewValues.map((row, rIdx) => (
                        <tr 
                          key={rIdx} 
                          className={rIdx === 0 ? 'bg-slate-100 font-bold border-b border-slate-300' : 'border-b border-slate-100 hover:bg-slate-50'}
                        >
                          <td className="px-2 py-1.5 text-center text-slate-400 bg-slate-50 border-r border-slate-200 font-mono text-[10px] w-8">
                            {rIdx + 1}
                          </td>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-3 py-2 border-r border-slate-100 text-slate-700 whitespace-nowrap">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Export Configuration */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Générer un Tableur Google Sheets</h3>
                <p className="text-xs text-emerald-100">Synchronisé avec votre Google Drive</p>
              </div>
              <button 
                onClick={() => setIsExportModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExportSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catégorie de données à exporter *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'eleves', label: 'Élèves & Effectifs' },
                    { id: 'classes', label: 'Classes & Salles' },
                    { id: 'matieres', label: 'Matières & Coeff' },
                    { id: 'paiements', label: 'Paiements & Écolages' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setExportType(opt.id as any);
                        const dateStr = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
                        if (opt.id === 'eleves') setCustomTitle(`Liste des Élèves - ${dateStr}`);
                        if (opt.id === 'classes') setCustomTitle(`Effectifs et Classes - ${dateStr}`);
                        if (opt.id === 'matieres') setCustomTitle(`Programme des Matières - ${dateStr}`);
                        if (opt.id === 'paiements') setCustomTitle(`Journal des Paiements - ${dateStr}`);
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                        exportType === opt.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nom du classeur Google Sheets *
                </label>
                <input
                  type="text"
                  required
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Ex: Liste des Élèves 2025/2026"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <span className="font-semibold text-slate-700">Comprend :</span>
                <p className="text-[11px] text-slate-500">
                  Création d'un nouveau classeur sur votre Drive Google, formatage automatique de l'en-tête et remplissage instantané des lignes actuelles.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center gap-1.5"
                >
                  <Download size={15} />
                  <span>Lancer l'export vers Google Sheets</span>
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
        affectedItemsCount={confirmDialog.affectedItemsCount}
        affectedItemLabel={confirmDialog.affectedItemLabel}
        confirmLabel={confirmDialog.confirmLabel}
        isProcessing={isProcessing}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
