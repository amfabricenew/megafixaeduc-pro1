import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../../contexts/ConfirmContext';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cloud,
  FileCode,
  FileText,
  Users,
  Settings as SettingsIcon,
  Trash2,
  Play,
  RotateCcw,
  Sparkles,
  Save,
  Calendar,
  Lock,
  Copy,
  Layers,
  ArrowDownToLine,
  Activity,
  Check,
  Info,
  Github
} from 'lucide-react';
import { BackupConfig, BackupSnapshot } from '../../types';
import { GitHubPublishModal } from '../GitHubPublishModal';

export default function BackupSettingsTab() {
  const confirm = useConfirm();
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [config, setConfig] = useState<BackupConfig>({
    school_id: 1,
    auto_backup_enabled: 1,
    frequency: 'daily',
    backup_time: '02:00',
    retention_count: 14,
    include_users: 1,
    include_students: 1,
    include_grades: 1,
    include_financials: 1,
    include_documents: 1,
    include_audit_logs: 1,
    encryption_enabled: 0,
    storage_location: 'local_and_cloud',
    cloud_provider: 'firestore_snapshot',
    cloud_endpoint: '',
    cloud_api_key: '',
    notification_email: '',
    notify_on_success: 0,
    notify_on_failure: 1
  });

  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [testingCloud, setTestingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<any>(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    backup_type: 'full',
    format: 'sql',
    label: '',
    notes: ''
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFileContent, setUploadFileContent] = useState<string>('');
  const [uploadFileName, setUploadFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, snapshotsRes] = await Promise.all([
        apiFetch('/api/backups/config'),
        apiFetch('/api/backups/snapshots')
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        if (configData) setConfig(configData);
      }

      if (snapshotsRes.ok) {
        const snapData = await snapshotsRes.json();
        setSnapshots(snapData.snapshots || []);
        setSummary(snapData.summary || null);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur de chargement des paramètres de sauvegarde.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      const res = await apiFetch('/api/backups/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success("Paramètres de sauvegarde automatique enregistrés !");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'enregistrement de la configuration.");
      }
    } catch (err: any) {
      toast.error("Erreur réseau: " + err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingBackup(true);
      const res = await apiFetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm)
      });
      if (res.ok) {
        toast.success("Nouvelle archive de sauvegarde générée avec succès !");
        setShowCreateModal(false);
        setCreateForm({ backup_type: 'full', format: 'sql', label: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Échec de la génération de la sauvegarde.");
      }
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownload = (snapshot: BackupSnapshot) => {
    window.location.href = `/api/backups/download/${snapshot.id}`;
    toast.success(`Téléchargement de ${snapshot.filename} démarré...`);
  };

  const handleExportUsersJson = () => {
    window.location.href = `/api/backups/export-users`;
    toast.success("Exportation des comptes utilisateurs en cours...");
  };

  const handleRestore = async (snapshot: BackupSnapshot) => {
    const isConfirmed = await confirm({
      title: "Restauration des données",
      message: `Attention : Vous êtes sur le point de restaurer la sauvegarde "${snapshot.filename}" créée le ${new Date(snapshot.created_at).toLocaleString('fr-FR')}.\n\nLes données actuelles de l'établissement seront synchronisées et mises à jour selon l'état de cette archive.\n\nVoulez-vous continuer ?`,
      confirmText: "Oui, restaurer cette sauvegarde",
      confirmVariant: "danger"
    });

    if (!isConfirmed) return;

    try {
      setRestoringId(snapshot.id);
      const res = await apiFetch(`/api/backups/restore/${snapshot.id}`, {
        method: 'POST'
      });
      if (res.ok) {
        toast.success("Données restaurées avec succès ! Le système est à jour.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la restauration.");
      }
    } catch (err: any) {
      toast.error("Erreur lors de la restauration: " + err.message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleDelete = async (snapshot: BackupSnapshot) => {
    const isConfirmed = await confirm({
      title: "Supprimer la sauvegarde",
      message: `Êtes-vous sûr de vouloir supprimer définitivement l'archive "${snapshot.filename}" ?`,
      confirmText: "Supprimer",
      confirmVariant: "danger"
    });

    if (!isConfirmed) return;

    try {
      const res = await apiFetch(`/api/backups/${snapshot.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success("Archive de sauvegarde supprimée.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de la suppression.");
      }
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    }
  };

  const handleTestCloud = async () => {
    try {
      setTestingCloud(true);
      setCloudStatus(null);
      const res = await apiFetch('/api/backups/cloud-sync-test', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCloudStatus(data);
        toast.success(data.message || "Passerelle Cloud opérationnelle !");
      } else {
        toast.error("Échec de la communication avec la passerelle Cloud.");
      }
    } catch (err: any) {
      toast.error("Erreur Cloud: " + err.message);
    } finally {
      setTestingCloud(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadFileContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleExecuteUploadRestore = async () => {
    if (!uploadFileContent) {
      toast.error("Veuillez sélectionner un fichier valide (.sql ou .json).");
      return;
    }

    const isConfirmed = await confirm({
      title: "Restaurer le fichier importé",
      message: `Voulez-vous vraiment importer et restaurer les données du fichier "${uploadFileName}" ?`,
      confirmText: "Confirmer la restauration",
      confirmVariant: "danger"
    });

    if (!isConfirmed) return;

    try {
      setUploading(true);
      const res = await apiFetch('/api/backups/upload-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_name: uploadFileName,
          file_content: uploadFileContent,
          file_format: uploadFileName.endsWith('.json') ? 'json' : 'sql'
        })
      });

      if (res.ok) {
        toast.success("Archive importée et restaurée avec succès !");
        setShowUploadModal(false);
        setUploadFileContent('');
        setUploadFileName('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Échec de la restauration du fichier.");
      }
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const copyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(checksum);
    toast.success("Empreinte SHA-256 copiée dans le presse-papier !");
    setTimeout(() => setCopiedChecksum(null), 3000);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-sm text-slate-500 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        <p className="font-medium">Chargement du centre de sauvegarde et de restauration des données...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold tracking-tight">Sauvegarde & Protection des Données Utilisateurs</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Configurez les sauvegardes automatiques de la base de données, sécurisez les comptes utilisateurs, exportez des archives conformes et restaurez vos données en un clic.
          </p>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] uppercase font-bold text-slate-400">Dernière Sauvegarde</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {config.last_backup_at ? new Date(config.last_backup_at).toLocaleString('fr-FR') : 'Aucune'}
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/10 text-left">
            <div className="text-[10px] uppercase font-bold text-slate-400">Archives Disponibles</div>
            <div className="text-xs font-bold text-indigo-300 mt-0.5">
              {summary?.count || snapshots.length} ({summary?.total_size_display || '0 Ko'})
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Créer une sauvegarde maintenant</span>
          </button>

          <button
            onClick={handleExportUsersJson}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
          >
            <Users className="w-4 h-4" />
            <span>Exporter les utilisateurs (.JSON)</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Importer & Restaurer un fichier</span>
          </button>

          <a
            href="/api/code/download-zip"
            download="megafixaeduc-code.zip"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-sm"
            title="Télécharger l'intégralité du code source compressé (< 25 Mo)"
          >
            <FileCode className="w-4 h-4 text-purple-600" />
            <span>Télécharger le code source (ZIP &lt; 25 Mo)</span>
          </a>

          <button
            onClick={() => setShowGitHubModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Publier directement sur GitHub en 1 clic"
          >
            <Github className="w-4 h-4 text-white" />
            <span>Publier sur GitHub (1 Clic)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestCloud}
            disabled={testingCloud}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all disabled:opacity-50"
            title="Tester la connectivité de la synchronisation distante"
          >
            <Cloud className="w-4 h-4 text-indigo-600" />
            <span>{testingCloud ? 'Test en cours...' : 'Tester le Cloud'}</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Actualiser la liste des sauvegardes"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {cloudStatus && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold">Passerelle de stockage Cloud : </span>
              {cloudStatus.message} (Latence : {cloudStatus.latency_ms} ms)
            </div>
          </div>
          <button onClick={() => setCloudStatus(null)} className="text-emerald-700 hover:text-emerald-900 font-bold ml-4">
            Fermer
          </button>
        </div>
      )}

      {/* Main Grid: Config Form + Snapshots List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Automated Backup Configuration (5 cols) */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-5 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">Planification Automatique</h3>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_backup_enabled === 1}
                onChange={e => setConfig({ ...config, auto_backup_enabled: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="font-bold text-slate-700 text-xs">Actif</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Fréquence du cycle</label>
              <select
                value={config.frequency}
                onChange={e => setConfig({ ...config, frequency: e.target.value as any })}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
              >
                <option value="hourly">Toutes les heures</option>
                <option value="daily">Quotidienne (Chaque nuit)</option>
                <option value="weekly">Hebdomadaire (Dimanche)</option>
                <option value="monthly">Mensuelle (1er du mois)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Heure d'exécution</label>
              <input
                type="time"
                value={config.backup_time || '02:00'}
                onChange={e => setConfig({ ...config, backup_time: e.target.value })}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
              >
              </input>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rétention (Archives)</label>
              <input
                type="number"
                min="3"
                max="90"
                value={config.retention_count || 14}
                onChange={e => setConfig({ ...config, retention_count: parseInt(e.target.value) || 14 })}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
              />
              <span className="text-[10px] text-slate-400">Conserver les N plus récents</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Emplacement</label>
              <select
                value={config.storage_location}
                onChange={e => setConfig({ ...config, storage_location: e.target.value as any })}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
              >
                <option value="local">Serveur Local Uniquement</option>
                <option value="cloud">Cloud Firestore Distant</option>
                <option value="local_and_cloud">Hybride (Local + Cloud)</option>
              </select>
            </div>
          </div>

          {/* Scope of Included Data */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <label className="block font-bold text-slate-800 text-xs">Périmètre des données sauvegardées :</label>
            <div className="grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.include_users === 1}
                  onChange={e => setConfig({ ...config, include_users: e.target.checked ? 1 : 0 })}
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                />
                <span className="text-slate-700 font-medium">Utilisateurs, Rôles & Permissions de sécurité</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.include_students === 1}
                  onChange={e => setConfig({ ...config, include_students: e.target.checked ? 1 : 0 })}
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                />
                <span className="text-slate-700 font-medium">Élèves, Inscriptions, Classes & Enseignants</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.include_grades === 1}
                  onChange={e => setConfig({ ...config, include_grades: e.target.checked ? 1 : 0 })}
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                />
                <span className="text-slate-700 font-medium">Notes, Évaluations, Bulletins & Présences</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.include_financials === 1}
                  onChange={e => setConfig({ ...config, include_financials: e.target.checked ? 1 : 0 })}
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                />
                <span className="text-slate-700 font-medium">Comptabilité, Paiements d'écolage & Salaires</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.include_audit_logs === 1}
                  onChange={e => setConfig({ ...config, include_audit_logs: e.target.checked ? 1 : 0 })}
                  className="w-3.5 h-3.5 rounded text-emerald-600 border-slate-300"
                />
                <span className="text-slate-700 font-medium">Journal d'audit & Historique des actions</span>
              </label>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <label className="block font-semibold text-slate-700">Email d'alerte en cas d'anomalie</label>
            <input
              type="email"
              value={config.notification_email || ''}
              onChange={e => setConfig({ ...config, notification_email: e.target.value })}
              placeholder="ex: admin.sauvegardes@ecole.com"
              className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={savingConfig}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingConfig ? 'Enregistrement...' : 'Enregistrer la planification'}
            </button>
          </div>
        </form>

        {/* Right Column: Snapshots History & Management (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-sm">Historique des Archives & Restauration</h3>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-bold text-[11px]">
              {snapshots.length} archive(s)
            </span>
          </div>

          {snapshots.length === 0 ? (
            <div className="py-12 text-center space-y-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Database className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 font-medium">Aucune archive de sauvegarde enregistrée pour l'instant.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Générer la première sauvegarde
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {snapshots.map((snap) => {
                const isRestoringThis = restoringId === snap.id;
                return (
                  <div
                    key={snap.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-all shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            snap.format === 'json' 
                              ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                          }`}>
                            {snap.format}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {snap.label || snap.filename}
                          </span>
                          {snap.backup_type === 'automated' && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-semibold">
                              Automatique
                            </span>
                          )}
                          {snap.backup_type === 'users_only' && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-semibold">
                              Utilisateurs
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(snap.created_at).toLocaleString('fr-FR')}
                          </span>
                          <span>•</span>
                          <span>
                            {(snap.size_bytes > 1024 * 1024)
                              ? `${(snap.size_bytes / (1024 * 1024)).toFixed(2)} Mo`
                              : `${(snap.size_bytes / 1024).toFixed(1)} Ko`}
                          </span>
                          {snap.created_by_name && (
                            <>
                              <span>•</span>
                              <span>Par : {snap.created_by_name}</span>
                            </>
                          )}
                          {snap.restored_at && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-semibold">
                                Restaurée le {new Date(snap.restored_at).toLocaleDateString('fr-FR')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDownload(snap)}
                          className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Télécharger l'archive"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleRestore(snap)}
                          disabled={isRestoringThis}
                          className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Restaurer cette sauvegarde"
                        >
                          <RotateCcw className={`w-4 h-4 ${isRestoringThis ? 'animate-spin text-emerald-600' : ''}`} />
                        </button>

                        <button
                          onClick={() => handleDelete(snap)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Supprimer cette archive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Checksum and details row */}
                    {snap.checksum_sha256 && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1.5 font-mono truncate max-w-md">
                          <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>SHA256 : {snap.checksum_sha256.substring(0, 24)}...</span>
                        </div>
                        <button
                          onClick={() => copyChecksum(snap.checksum_sha256!)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 shrink-0"
                        >
                          {copiedChecksum === snap.checksum_sha256 ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copier l'empreinte</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Backup */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-800 text-sm">Créer une Sauvegarde Instantanée</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBackup} className="space-y-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Libellé / Titre de la sauvegarde</label>
                <input
                  type="text"
                  value={createForm.label}
                  onChange={e => setCreateForm({ ...createForm, label: e.target.value })}
                  placeholder="Ex: Avant clôture 1er trimestre 2026"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type de périmètre</label>
                  <select
                    value={createForm.backup_type}
                    onChange={e => setCreateForm({ ...createForm, backup_type: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
                  >
                    <option value="full">Base Complète (Recommandé)</option>
                    <option value="users_only">Utilisateurs & Rôles seuls</option>
                    <option value="pedagogical">Données Pédagogiques</option>
                    <option value="financial">Données Financières</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Format de fichier</label>
                  <select
                    value={createForm.format}
                    onChange={e => setCreateForm({ ...createForm, format: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-medium"
                  >
                    <option value="sql">SQL Dump (.sql)</option>
                    <option value="json">JSON Structuré (.json)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Note explicative (optionnelle)</label>
                <textarea
                  rows={2}
                  value={createForm.notes}
                  onChange={e => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Détails sur l'état de l'école lors de cette sauvegarde..."
                  className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingBackup}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {creatingBackup ? 'Génération en cours...' : 'Générer la sauvegarde'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Upload & Restore Backup */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 text-xs animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800 text-sm">Importer & Restaurer un Fichier de Sauvegarde</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50 relative">
                <input
                  type="file"
                  accept=".sql,.json,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <ArrowDownToLine className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                <p className="font-bold text-slate-800">
                  {uploadFileName ? uploadFileName : "Cliquez ou glissez-déposez votre archive ici"}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">Formats supportés : .sql, .json (sauvegarde MégafixaEduc)</p>
              </div>

              {uploadFileContent && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-emerald-900">{uploadFileName} chargé ({uploadFileContent.length} octets)</span>
                  </div>
                  <button
                    onClick={() => { setUploadFileContent(''); setUploadFileName(''); }}
                    className="text-emerald-700 hover:text-emerald-900 font-bold"
                  >
                    Changer
                  </button>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Avertissement de sécurité :</span> L'importation réécrira ou insérera les tables correspondantes dans la base de données. Assurez-vous d'avoir téléchargé une sauvegarde de secours récente.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleExecuteUploadRestore}
                  disabled={!uploadFileContent || uploading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm transition-all disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {uploading ? 'Restauration en cours...' : 'Lancer la restauration'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GitHubPublishModal isOpen={showGitHubModal} onClose={() => setShowGitHubModal(false)} />
    </div>
  );
}
