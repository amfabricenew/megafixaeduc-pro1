import React from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import {
  Zap,
  Smartphone,
  Mail,
  MessageCircle,
  Clock,
  Play,
  Save,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Search,
  Send,
  History,
  Settings,
  X,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AutomationRule, AutomationLog, WhatsAppConfig } from '../../types';
import { useConfirm } from '../../contexts/ConfirmContext';

const CATEGORY_LABELS: Record<string, string> = {
  all: 'Toutes',
  vie_scolaire: 'Vie scolaire',
  finances: 'Finances',
  pedagogie: 'Pédagogie',
  admissions: 'Admissions',
  bibliotheque: 'Bibliothèque',
  general: 'Personnalisées'
};

const TEMPLATE_VARIABLES = [
  { key: '{nom_eleve}', label: 'Nom élève' },
  { key: '{nom_parent}', label: 'Nom parent' },
  { key: '{classe}', label: 'Classe' },
  { key: '{montant}', label: 'Montant' },
  { key: '{reste_a_payer}', label: 'Reste à payer' },
  { key: '{tranche}', label: 'Tranche' },
  { key: '{date}', label: 'Date' },
  { key: '{periode}', label: 'Période' },
  { key: '{statut}', label: 'Statut' },
  { key: '{motif}', label: 'Motif' },
  { key: '{ecole}', label: 'École' }
];

const SAMPLE_PREVIEW_VALUES: Record<string, string> = {
  nom_eleve: 'Kossi Jean-Luc',
  nom_parent: 'M. Kossi',
  classe: '3ème A',
  montant: '45 000 FCFA',
  reste_a_payer: '30 000 FCFA',
  tranche: '2ème Tranche',
  date: '15/05/2026',
  periode: '1er Trimestre',
  statut: 'Validée',
  motif: 'Absence non justifiée',
  ecole: 'Complexe Scolaire Excellence'
};

function renderPreviewText(template: string) {
  if (!template) return '';
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => SAMPLE_PREVIEW_VALUES[key] || `{${key}}`);
}

export default function AutomationSettingsPanel() {
  const confirm = useConfirm();

  const [subView, setSubView] = React.useState<'rules' | 'whatsapp' | 'logs'>('rules');
  const [rules, setRules] = React.useState<AutomationRule[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [loadingRules, setLoadingRules] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [selectedRuleId, setSelectedRuleId] = React.useState<number | null>(null);
  const [editDraft, setEditDraft] = React.useState<AutomationRule | null>(null);
  const [savingRule, setSavingRule] = React.useState(false);
  const [runningRuleId, setRunningRuleId] = React.useState<number | null>(null);

  // Test rule drawer state
  const [showTestDrawer, setShowTestDrawer] = React.useState(false);
  const [testTarget, setTestTarget] = React.useState({ recipientName: 'M. Kossi', phone: '', whatsapp: '', email: '' });
  const [sendingTest, setSendingTest] = React.useState(false);
  const [testResults, setTestResults] = React.useState<any[] | null>(null);

  // Create custom rule modal state
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [newRuleForm, setNewRuleForm] = React.useState({
    name: '',
    description: '',
    category: 'general',
    trigger_type: 'scheduled' as 'event' | 'scheduled',
    is_active: true,
    channel_sms: true,
    channel_email: true,
    channel_whatsapp: true,
    subject_template: '[{ecole}] Information importante',
    message_template: 'Bonjour {nom_parent}, {ecole} vous informe que...',
    schedule_frequency: 'weekly' as 'hourly' | 'daily' | 'weekly' | 'monthly',
    schedule_time: '08:30',
    days_offset: 3
  });
  const [creatingRule, setCreatingRule] = React.useState(false);

  // WhatsApp config state
  const [waConfig, setWaConfig] = React.useState<WhatsAppConfig>({
    school_id: 1,
    custom_whatsapp_enabled: 0,
    provider: 'simulation',
    is_active: 1,
    account_sid: '',
    auth_token: '',
    phone_number_id: '',
    sender_number: '',
    api_url: '',
    api_key: ''
  });
  const [loadingWa, setLoadingWa] = React.useState(false);
  const [savingWa, setSavingWa] = React.useState(false);
  const [testWaPhone, setTestWaPhone] = React.useState('');
  const [testingWa, setTestingWa] = React.useState(false);

  // Logs state
  const [logs, setLogs] = React.useState<AutomationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = React.useState(false);
  const [logChannelFilter, setLogChannelFilter] = React.useState('all');
  const [logStatusFilter, setLogStatusFilter] = React.useState('all');
  const [logSearch, setLogSearch] = React.useState('');

  const fetchRules = async () => {
    try {
      setLoadingRules(true);
      const res = await apiFetch('/api/automations/rules');
      if (res.ok) {
        const data = await res.json();
        const list: AutomationRule[] = Array.isArray(data?.rules) ? data.rules : [];
        setRules(list);
        setStats(data?.stats || null);
        if (list.length > 0) {
          const currentExists = list.find(r => r.id === selectedRuleId);
          const initial = currentExists || list[0];
          setSelectedRuleId(initial.id);
          setEditDraft({ ...initial });
        }
      }
    } catch (err: any) {
      toast.error('Impossible de charger les règles d\'automatisation.');
    } finally {
      setLoadingRules(false);
    }
  };

  const fetchWhatsAppConfig = async () => {
    try {
      setLoadingWa(true);
      const res = await apiFetch('/api/whatsapp/config');
      if (res.ok) {
        const data = await res.json();
        if (data) setWaConfig({ ...data, auth_token: '', api_key: '' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingWa(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const params = new URLSearchParams();
      if (logChannelFilter !== 'all') params.append('channel', logChannelFilter);
      if (logStatusFilter !== 'all') params.append('status', logStatusFilter);
      if (logSearch.trim()) params.append('search', logSearch.trim());
      const res = await apiFetch(`/api/automations/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  React.useEffect(() => {
    fetchRules();
    fetchWhatsAppConfig();
  }, []);

  React.useEffect(() => {
    if (subView === 'logs') {
      fetchLogs();
    }
  }, [subView, logChannelFilter, logStatusFilter]);

  const handleSelectRule = (rule: AutomationRule) => {
    setSelectedRuleId(rule.id);
    setEditDraft({ ...rule });
    setShowTestDrawer(false);
    setTestResults(null);
  };

  const handleQuickToggleRule = async (rule: AutomationRule, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = rule.is_active ? 0 : 1;
    try {
      const res = await apiFetch(`/api/automations/rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextState })
      });
      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r => (r.id === rule.id ? data.rule : r)));
        if (editDraft?.id === rule.id) {
          setEditDraft(data.rule);
        }
        toast.success(nextState ? `Règle « ${rule.name} » activée` : `Règle « ${rule.name} » mise en pause`);
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la mise à jour');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur réseau');
    }
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft) return;
    if (!editDraft.channel_sms && !editDraft.channel_email && !editDraft.channel_whatsapp) {
      toast.error('Activez au moins un canal (SMS, Email ou WhatsApp).');
      return;
    }
    try {
      setSavingRule(true);
      const res = await apiFetch(`/api/automations/rules/${editDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editDraft)
      });
      if (res.ok) {
        const data = await res.json();
        setRules(prev => prev.map(r => (r.id === editDraft.id ? data.rule : r)));
        setEditDraft(data.rule);
        toast.success('Règle d\'automatisation enregistrée.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Échec de l\'enregistrement');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur réseau');
    } finally {
      setSavingRule(false);
    }
  };

  const handleRunRuleNow = async (rule: AutomationRule) => {
    const ok = await confirm({
      title: 'Exécuter l\'automatisation maintenant',
      message: `Voulez-vous analyser les dossiers éligibles et envoyer les notifications pour « ${rule.name} » sur les canaux activés ?`,
      confirmText: 'Exécuter',
      cancelText: 'Annuler',
      type: 'info'
    });
    if (!ok) return;

    try {
      setRunningRuleId(rule.id);
      const res = await apiFetch(`/api/automations/rules/${rule.id}/run`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Exécution terminée.');
        fetchRules();
      } else {
        toast.error(data.error || 'Erreur lors de l\'exécution');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur réseau');
    } finally {
      setRunningRuleId(null);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDraft) return;
    if (!testTarget.phone.trim() && !testTarget.email.trim() && !testTarget.whatsapp.trim()) {
      toast.error('Saisissez un numéro ou un email pour le test.');
      return;
    }
    try {
      setSendingTest(true);
      setTestResults(null);
      const res = await apiFetch(`/api/automations/rules/${editDraft.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testTarget)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResults(data.results || []);
        toast.success('Test multi-canaux exécuté.');
        fetchRules();
      } else {
        toast.error(data.error || 'Échec du test');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur réseau');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDeleteCustomRule = async (rule: AutomationRule) => {
    const ok = await confirm({
      title: 'Supprimer la règle personnalisée',
      message: `Supprimer définitivement la règle « ${rule.name} » ?`,
      confirmText: 'Supprimer',
      confirmVariant: 'danger'
    });
    if (!ok) return;

    try {
      const res = await apiFetch(`/api/automations/rules/${rule.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Règle supprimée.');
        fetchRules();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Impossible de supprimer cette règle');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateCustomRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleForm.name.trim() || !newRuleForm.message_template.trim()) {
      toast.error('Le nom et le message sont requis.');
      return;
    }
    try {
      setCreatingRule(true);
      const res = await apiFetch('/api/automations/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRuleForm)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Règle personnalisée créée.');
        setShowCreateModal(false);
        setNewRuleForm({
          name: '',
          description: '',
          category: 'general',
          trigger_type: 'scheduled',
          is_active: true,
          channel_sms: true,
          channel_email: true,
          channel_whatsapp: true,
          subject_template: '[{ecole}] Information importante',
          message_template: 'Bonjour {nom_parent}, {ecole} vous informe que...',
          schedule_frequency: 'weekly',
          schedule_time: '08:30',
          days_offset: 3
        });
        await fetchRules();
        if (data.rule) {
          setSelectedRuleId(data.rule.id);
          setEditDraft(data.rule);
        }
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur réseau');
    } finally {
      setCreatingRule(false);
    }
  };

  const handleSaveWhatsAppConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingWa(true);
      const res = await apiFetch('/api/whatsapp/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waConfig)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Passerelle WhatsApp enregistrée.');
        fetchWhatsAppConfig();
      } else {
        toast.error(data.error || 'Erreur lors de la sauvegarde');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingWa(false);
    }
  };

  const handleTestWhatsApp = async () => {
    if (!testWaPhone.trim()) {
      toast.error('Veuillez entrer un numéro WhatsApp.');
      return;
    }
    try {
      setTestingWa(true);
      const res = await apiFetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testWaPhone.trim() })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.simulated) toast(data.message, { icon: 'ℹ️' });
        else toast.success(data.message);
      } else {
        toast.error(data.error || data.message || 'Échec du test WhatsApp');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTestingWa(false);
    }
  };

  const insertVariable = (varToken: string) => {
    if (!editDraft) return;
    const current = editDraft.message_template || '';
    const sep = current && !current.endsWith(' ') ? ' ' : '';
    setEditDraft({ ...editDraft, message_template: current + sep + varToken });
  };

  const activeRulesCount = rules.filter(r => r.is_active === 1).length;
  const totalDispatches = stats?.total_dispatches || 0;
  const successRate = totalDispatches > 0 ? Math.round(((stats?.success_count || 0) / totalDispatches) * 100) : 100;

  const filteredRules = rules.filter(r => categoryFilter === 'all' || r.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Scénarios actifs</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {activeRulesCount} <span className="text-sm font-normal text-slate-400">/ {rules.length}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Déclencheurs temps réel & planifiés</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Envois automatisés (30j)</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{totalDispatches}</div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            SMS {stats?.sms_count || 0} · Email {stats?.email_count || 0} · WA {stats?.whatsapp_count || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Taux de délivrance</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{successRate}%</div>
          <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
            {stats?.failed_count || 0} échec(s) sur 30 jours
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Passerelle WhatsApp</div>
          <div className="text-sm font-bold text-slate-900 mt-2 truncate">
            {waConfig.custom_whatsapp_enabled
              ? (waConfig.provider === 'brevo_whatsapp' ? 'Brevo WhatsApp' : waConfig.provider === 'meta_cloud_api' ? 'Meta Cloud API' : waConfig.provider === 'twilio_whatsapp' ? 'Twilio WhatsApp' : waConfig.provider === 'custom_webhook' ? 'Webhook École' : 'Simulation')
              : `Défaut plateforme (${waConfig.global_provider || 'simulation'})`}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {waConfig.is_active !== 0 ? 'Canal opérationnel' : 'Canal suspendu'}
          </div>
        </div>
      </div>

      {/* Sub-navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubView('rules')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subView === 'rules' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Règles & Scénarios</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('whatsapp')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subView === 'whatsapp' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Passerelle WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('logs')}
            className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center gap-2 ${
              subView === 'logs' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span>Journal des envois</span>
          </button>
        </div>

        {subView === 'rules' && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle règle</span>
          </button>
        )}
      </div>

      {/* VIEW 1: RULES & SCENARIOS */}
      {subView === 'rules' && (
        <div className="space-y-4">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === key
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loadingRules ? (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
              Chargement des règles d'automatisation...
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Rules List */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {filteredRules.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    Aucune règle dans cette catégorie.
                  </div>
                ) : (
                  filteredRules.map(rule => {
                    const isSelected = editDraft?.id === rule.id;
                    return (
                      <div
                        key={rule.id}
                        onClick={() => handleSelectRule(rule)}
                        className={`p-4 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-slate-900 truncate">{rule.name}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                              <span>{CATEGORY_LABELS[rule.category] || rule.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>{rule.trigger_type === 'scheduled' ? 'Planifié' : 'Temps réel'}</span>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">{rule.total_sent || 0} envois</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleQuickToggleRule(rule, e)}
                            aria-label={rule.is_active ? 'Désactiver' : 'Activer'}
                            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                              rule.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                rule.is_active ? 'translate-x-4.5' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mt-2.5 text-[11px] text-slate-600">
                          <span className={rule.channel_sms ? 'font-semibold text-slate-900' : 'text-slate-400 line-through'}>
                            SMS
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className={rule.channel_email ? 'font-semibold text-slate-900' : 'text-slate-400 line-through'}>
                            Email
                          </span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className={rule.channel_whatsapp ? 'font-semibold text-emerald-700' : 'text-slate-400 line-through'}>
                            WhatsApp
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Selected Rule Editor */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6">
                {!editDraft ? (
                  <div className="py-16 text-center text-xs text-slate-500">
                    Sélectionnez une règle à gauche pour modifier ses canaux et son modèle.
                  </div>
                ) : (
                  <form onSubmit={handleSaveDraft} className="space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="text-xs text-slate-500">
                          {CATEGORY_LABELS[editDraft.category] || editDraft.category} · {editDraft.trigger_type === 'scheduled' ? 'Tâche planifiée' : 'Déclencheur instantané'}
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-0.5">{editDraft.name}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{editDraft.description}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editDraft.is_active === 1}
                            onChange={e => setEditDraft({ ...editDraft, is_active: e.target.checked ? 1 : 0 })}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                          />
                          <span>Règle active</span>
                        </label>
                      </div>
                    </div>

                    {/* Multi-Channel Selector */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-2">
                        Canaux de diffusion automatique
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, channel_sms: editDraft.channel_sms ? 0 : 1 })}
                          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                            editDraft.channel_sms
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Smartphone className="w-4 h-4" />
                          <span>SMS</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, channel_email: editDraft.channel_email ? 0 : 1 })}
                          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                            editDraft.channel_email
                              ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Mail className="w-4 h-4" />
                          <span>Email</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditDraft({ ...editDraft, channel_whatsapp: editDraft.channel_whatsapp ? 0 : 1 })}
                          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                            editDraft.channel_whatsapp
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-900'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Schedule Settings for Scheduled Rules */}
                    {editDraft.trigger_type === 'scheduled' && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Fréquence d'exécution
                          </label>
                          <select
                            value={editDraft.schedule_frequency || 'daily'}
                            onChange={e => setEditDraft({ ...editDraft, schedule_frequency: e.target.value as any })}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          >
                            <option value="hourly">Toutes les heures</option>
                            <option value="daily">Quotidienne</option>
                            <option value="weekly">Hebdomadaire</option>
                            <option value="monthly">Mensuelle</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            Heure cible
                          </label>
                          <input
                            type="time"
                            value={editDraft.schedule_time || '08:30'}
                            onChange={e => setEditDraft({ ...editDraft, schedule_time: e.target.value })}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white tabular-nums"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                            {editDraft.trigger_event === 'tuition_upcoming'
                              ? 'Jours avant échéance'
                              : 'Jours après échéance'}
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={60}
                            value={editDraft.days_offset ?? 3}
                            onChange={e => setEditDraft({ ...editDraft, days_offset: parseInt(e.target.value, 10) || 0 })}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-white tabular-nums"
                          />
                        </div>
                      </div>
                    )}

                    {/* Email Subject Template */}
                    {editDraft.channel_email === 1 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                          Objet de l'Email
                        </label>
                        <input
                          type="text"
                          value={editDraft.subject_template || ''}
                          onChange={e => setEditDraft({ ...editDraft, subject_template: e.target.value })}
                          className="w-full p-2.5 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          placeholder="Objet du message email..."
                        />
                      </div>
                    )}

                    {/* Message Body Template + Variable Chips */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700">
                          Modèle de message (SMS, Email & WhatsApp)
                        </label>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {(editDraft.message_template || '').length} caractères
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        value={editDraft.message_template || ''}
                        onChange={e => setEditDraft({ ...editDraft, message_template: e.target.value })}
                        className="w-full p-3 text-xs rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-500/20 outline-none leading-relaxed"
                        required
                      />

                      <div className="mt-2">
                        <span className="text-[11px] text-slate-500 block mb-1.5">
                          Variables dynamiques (cliquer pour insérer) :
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {TEMPLATE_VARIABLES.map(v => (
                            <button
                              key={v.key}
                              type="button"
                              onClick={() => insertVariable(v.key)}
                              className="px-2 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 transition-colors"
                              title={`Insérer ${v.label}`}
                            >
                              {v.key}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Live Preview */}
                    <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 mb-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Aperçu avec données exemple</span>
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {renderPreviewText(editDraft.message_template)}
                      </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowTestDrawer(v => !v)}
                          className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Tester l'envoi</span>
                        </button>

                        {editDraft.trigger_type === 'scheduled' && (
                          <button
                            type="button"
                            onClick={() => handleRunRuleNow(editDraft)}
                            disabled={runningRuleId === editDraft.id}
                            className="px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>{runningRuleId === editDraft.id ? 'Exécution...' : 'Exécuter maintenant'}</span>
                          </button>
                        )}

                        {editDraft.is_custom === 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomRule(editDraft)}
                            className="px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Supprimer</span>
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={savingRule}
                        className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingRule ? 'Enregistrement...' : 'Enregistrer'}</span>
                      </button>
                    </div>

                    {/* Inline Test Drawer */}
                    {showTestDrawer && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Envoyer un test sur les canaux activés de cette règle
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowTestDrawer(false)}
                            className="text-slate-400 hover:text-slate-700"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            placeholder="Nom destinataire"
                            value={testTarget.recipientName}
                            onChange={e => setTestTarget({ ...testTarget, recipientName: e.target.value })}
                            className="p-2 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                          <input
                            type="tel"
                            placeholder="Téléphone SMS / WhatsApp (+229...)"
                            value={testTarget.phone}
                            onChange={e => setTestTarget({ ...testTarget, phone: e.target.value, whatsapp: e.target.value })}
                            className="p-2 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                          <input
                            type="email"
                            placeholder="Adresse Email de test"
                            value={testTarget.email}
                            onChange={e => setTestTarget({ ...testTarget, email: e.target.value })}
                            className="p-2 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={handleSendTest}
                            disabled={sendingTest}
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{sendingTest ? 'Envoi en cours...' : 'Lancer le test'}</span>
                          </button>
                        </div>

                        {testResults && (
                          <div className="space-y-1.5 pt-2 border-t border-slate-200">
                            {testResults.map((r, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <span className="font-semibold uppercase text-slate-700">{r.channel}</span>
                                <span className={r.success ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                                  {r.success ? `Succès (${r.status} · ${r.provider})` : `Échec (${r.error || r.status})`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: WHATSAPP GATEWAY CONFIGURATION */}
      {subView === 'whatsapp' && (
        <div className="max-w-3xl bg-white rounded-xl border border-slate-200 p-6 space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              <span>Passerelle WhatsApp de l'Établissement</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1">
              Configurez vos propres identifiants WhatsApp Business (Meta Cloud API, Twilio WhatsApp ou Webhook) ou utilisez le mode par défaut de la plateforme.
            </p>
          </div>

          {loadingWa ? (
            <div className="py-8 text-center text-xs text-slate-500">Chargement de la configuration WhatsApp...</div>
          ) : (
            <form onSubmit={handleSaveWhatsAppConfig} className="space-y-5 text-xs">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-slate-900">Utiliser une passerelle WhatsApp dédiée à cette école</div>
                  <div className="text-slate-500 mt-0.5">
                    {waConfig.custom_whatsapp_enabled
                      ? 'Vos messages WhatsApp automatiques utilisent les identifiants configurés ci-dessous.'
                      : `Désactivé : repli automatique sur la configuration globale (${waConfig.global_provider || 'simulation'}).`}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={waConfig.custom_whatsapp_enabled === 1}
                    onChange={e => setWaConfig({ ...waConfig, custom_whatsapp_enabled: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                  />
                  <span className="font-semibold text-slate-700">Personnaliser</span>
                </label>
              </div>

              {waConfig.custom_whatsapp_enabled === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Fournisseur API WhatsApp</label>
                      <select
                        value={waConfig.provider}
                        onChange={e => setWaConfig({ ...waConfig, provider: e.target.value as any })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="simulation">Simulation (Journal interne)</option>
                        <option value="brevo_whatsapp">Brevo WhatsApp Business API (v3)</option>
                        <option value="meta_cloud_api">Meta WhatsApp Cloud API (Officiel)</option>
                        <option value="twilio_whatsapp">Twilio WhatsApp API</option>
                        <option value="custom_webhook">Passerelle HTTP / Webhook (Evolution API, Baileys, etc.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Numéro expéditeur WhatsApp</label>
                      <input
                        type="text"
                        placeholder="+2290100000000"
                        value={waConfig.sender_number || ''}
                        onChange={e => setWaConfig({ ...waConfig, sender_number: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {waConfig.provider === 'brevo_whatsapp' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1.5">Clé API Brevo (xkeysib-...)</label>
                      <input
                        type="password"
                        placeholder="Laisser vide pour conserver la clé actuelle"
                        value={waConfig.api_key || ''}
                        onChange={e => setWaConfig({ ...waConfig, api_key: e.target.value })}
                        className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                      />
                    </div>
                  )}

                  {waConfig.provider === 'meta_cloud_api' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Phone Number ID (Meta)</label>
                        <input
                          type="text"
                          placeholder="102938475610293"
                          value={waConfig.phone_number_id || ''}
                          onChange={e => setWaConfig({ ...waConfig, phone_number_id: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Token d'accès permanent Meta</label>
                        <input
                          type="password"
                          placeholder="Laisser vide pour conserver l'actuel"
                          value={waConfig.auth_token || ''}
                          onChange={e => setWaConfig({ ...waConfig, auth_token: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {waConfig.provider === 'twilio_whatsapp' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Twilio Account SID</label>
                        <input
                          type="text"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={waConfig.account_sid || ''}
                          onChange={e => setWaConfig({ ...waConfig, account_sid: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Twilio Auth Token</label>
                        <input
                          type="password"
                          placeholder="Laisser vide pour conserver l'actuel"
                          value={waConfig.auth_token || ''}
                          onChange={e => setWaConfig({ ...waConfig, auth_token: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {waConfig.provider === 'custom_webhook' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">URL Webhook / API POST</label>
                        <input
                          type="url"
                          placeholder="https://wa-gateway.ecole.com/message/send"
                          value={waConfig.api_url || ''}
                          onChange={e => setWaConfig({ ...waConfig, api_url: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1.5">Clé API (Bearer Token)</label>
                        <input
                          type="password"
                          placeholder="Laisser vide pour conserver l'actuelle"
                          value={waConfig.api_key || ''}
                          onChange={e => setWaConfig({ ...waConfig, api_key: e.target.value })}
                          className="w-full p-2.5 rounded-lg border border-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={waConfig.is_active === 1}
                      onChange={e => setWaConfig({ ...waConfig, is_active: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 rounded text-emerald-600 border-slate-300"
                    />
                    <span className="font-semibold text-slate-700">Activer l'envoi WhatsApp pour l'établissement</span>
                  </label>
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingWa}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingWa ? 'Enregistrement...' : 'Enregistrer la passerelle WhatsApp'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Test WhatsApp */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800">Tester l'envoi WhatsApp</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="tel"
                placeholder="+229 97 00 00 00"
                value={testWaPhone}
                onChange={e => setTestWaPhone(e.target.value)}
                className="flex-1 p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
              />
              <button
                type="button"
                onClick={handleTestWhatsApp}
                disabled={testingWa}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testingWa ? 'Envoi...' : 'Tester WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: AUTOMATION EXECUTION LOGS */}
      {subView === 'logs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher destinataire, règle..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none"
                />
              </div>

              <select
                value={logChannelFilter}
                onChange={e => setLogChannelFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">Tous les canaux</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="whatsapp">WhatsApp</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={e => setLogStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
              >
                <option value="all">Tous les statuts</option>
                <option value="delivered">Délivré</option>
                <option value="simulated">Simulé</option>
                <option value="failed">Échec</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchLogs}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <tr>
                  <th className="p-3.5">Date & Heure</th>
                  <th className="p-3.5">Règle</th>
                  <th className="p-3.5">Canal</th>
                  <th className="p-3.5">Destinataire</th>
                  <th className="p-3.5">Aperçu du message</th>
                  <th className="p-3.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-slate-500">
                      Aucun envoi automatisé enregistré pour ces critères.
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 text-slate-500 whitespace-nowrap font-mono tabular-nums">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{log.rule_name || log.rule_code}</div>
                        <div className="text-[11px] text-slate-400">
                          {log.execution_mode === 'test' ? 'Test' : log.execution_mode === 'manual' ? 'Manuel' : 'Automatique'}
                        </div>
                      </td>
                      <td className="p-3.5 font-semibold uppercase text-slate-700 whitespace-nowrap">
                        {log.channel}
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{log.recipient_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">{log.recipient_contact}</div>
                      </td>
                      <td className="p-3.5 text-slate-700 max-w-xs truncate" title={log.message_preview}>
                        {log.message_preview}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {log.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 text-rose-700 font-semibold" title={log.error_message || ''}>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Échec</span>
                          </span>
                        ) : log.status === 'delivered' || log.status === 'sent' ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Délivré</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Simulé ({log.provider})</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE CUSTOM RULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Nouvelle règle d'automatisation</h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRule} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom de la règle</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rappel hebdomadaire réunion parents"
                  value={newRuleForm.name}
                  onChange={e => setNewRuleForm({ ...newRuleForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Décrivez quand ce message doit être envoyé..."
                  value={newRuleForm.description}
                  onChange={e => setNewRuleForm({ ...newRuleForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Fréquence d'envoi</label>
                  <select
                    value={newRuleForm.schedule_frequency}
                    onChange={e => setNewRuleForm({ ...newRuleForm, schedule_frequency: e.target.value as any })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="daily">Quotidienne</option>
                    <option value="weekly">Hebdomadaire</option>
                    <option value="monthly">Mensuelle</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Heure d'envoi</label>
                  <input
                    type="time"
                    value={newRuleForm.schedule_time}
                    onChange={e => setNewRuleForm({ ...newRuleForm, schedule_time: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Canaux activés</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRuleForm.channel_sms}
                      onChange={e => setNewRuleForm({ ...newRuleForm, channel_sms: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>SMS</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRuleForm.channel_email}
                      onChange={e => setNewRuleForm({ ...newRuleForm, channel_email: e.target.checked })}
                      className="rounded text-indigo-600"
                    />
                    <span>Email</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRuleForm.channel_whatsapp}
                      onChange={e => setNewRuleForm({ ...newRuleForm, channel_whatsapp: e.target.checked })}
                      className="rounded text-emerald-600"
                    />
                    <span>WhatsApp</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Objet Email</label>
                <input
                  type="text"
                  value={newRuleForm.subject_template}
                  onChange={e => setNewRuleForm({ ...newRuleForm, subject_template: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Message type</label>
                <textarea
                  rows={3}
                  required
                  value={newRuleForm.message_template}
                  onChange={e => setNewRuleForm({ ...newRuleForm, message_template: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creatingRule}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50"
                >
                  {creatingRule ? 'Création...' : 'Créer la règle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
