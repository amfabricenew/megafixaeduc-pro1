import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Smartphone, 
  Server, 
  ShieldCheck, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Globe, 
  Key, 
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  MessageCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SchoolMessagingModalProps {
  schoolId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function SchoolMessagingModal({
  schoolId,
  isOpen,
  onClose,
  onUpdated
}: SchoolMessagingModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);

  // Active sub-tab in modal
  const [activeSection, setActiveSection] = useState<'smtp' | 'sms' | 'whatsapp'>('smtp');

  // SMTP / Brevo Email Form State
  const [smtpForm, setSmtpForm] = useState({
    custom_smtp_enabled: false,
    email_provider: 'smtp',
    brevo_api_key: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    smtp_secure: 'false',
    email_from: ''
  });

  // SMS Form State
  const [smsForm, setSmsForm] = useState({
    custom_sms_enabled: false,
    provider: 'simulation',
    sender_number_or_name: 'MEGAFIXA',
    account_sid: '',
    auth_token: '',
    api_url: '',
    api_key: '',
    credit_balance: 1000,
    is_active: 1
  });

  // WhatsApp Form State
  const [whatsappForm, setWhatsappForm] = useState({
    custom_whatsapp_enabled: false,
    provider: 'simulation',
    is_active: 1,
    account_sid: '',
    auth_token: '',
    phone_number_id: '',
    sender_number: '',
    api_url: '',
    api_key: ''
  });

  // Global Defaults Info
  const [globalDefaults, setGlobalDefaults] = useState<any>(null);

  // Test states
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<any>(null);

  const [testPhone, setTestPhone] = useState('');
  const [testingSms, setTestingSms] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<any>(null);

  const [testWhatsappPhone, setTestWhatsappPhone] = useState('');
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);
  const [testWhatsappResult, setTestWhatsappResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && schoolId) {
      loadConfig();
    } else {
      setSchoolData(null);
      setTestEmailResult(null);
      setTestSmsResult(null);
      setTestWhatsappResult(null);
    }
  }, [isOpen, schoolId]);

  const loadConfig = async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${schoolId}/messaging-config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Impossible de charger la configuration.");

      const data = await res.json();
      setSchoolData(data.school);
      setGlobalDefaults(data.globalDefaults);

      setSmtpForm({
        custom_smtp_enabled: Boolean(data.smtp?.custom_smtp_enabled),
        email_provider: data.smtp?.email_provider || 'smtp',
        brevo_api_key: '',
        smtp_host: data.smtp?.smtp_host || '',
        smtp_port: data.smtp?.smtp_port || '587',
        smtp_user: data.smtp?.smtp_user || '',
        smtp_pass: '', // Don't expose password plain
        smtp_secure: String(data.smtp?.smtp_secure || 'false'),
        email_from: data.smtp?.email_from || ''
      });

      setSmsForm({
        custom_sms_enabled: Boolean(data.sms?.custom_sms_enabled),
        provider: data.sms?.provider || 'simulation',
        sender_number_or_name: data.sms?.sender_number_or_name || 'MEGAFIXA',
        account_sid: data.sms?.account_sid || '',
        auth_token: '', // Don't expose token plain
        api_url: data.sms?.api_url || '',
        api_key: '',
        credit_balance: data.sms?.credit_balance ?? 1000,
        is_active: data.sms?.is_active ?? 1
      });

      setWhatsappForm({
        custom_whatsapp_enabled: Boolean(data.whatsapp?.custom_whatsapp_enabled),
        provider: data.whatsapp?.provider || 'simulation',
        is_active: data.whatsapp?.is_active ?? 1,
        account_sid: data.whatsapp?.account_sid || '',
        auth_token: '',
        phone_number_id: data.whatsapp?.phone_number_id || '',
        sender_number: data.whatsapp?.sender_number || '',
        api_url: data.whatsapp?.api_url || '',
        api_key: ''
      });

      setTestEmail(data.school?.email || '');
      setTestPhone(data.school?.telephone || '');
      setTestWhatsappPhone(data.school?.telephone || '');
    } catch (err: any) {
      toast.error(err.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!schoolId) return;
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${schoolId}/messaging-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          smtp: smtpForm,
          sms: smsForm,
          whatsapp: whatsappForm
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la sauvegarde.");
      }

      toast.success("Passerelles enregistrées avec succès !");
      if (onUpdated) onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!schoolId || !testEmail) {
      toast.error("Veuillez renseigner une adresse email de test.");
      return;
    }
    try {
      setTestingEmail(true);
      setTestEmailResult(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${schoolId}/test-smtp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testEmail })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestEmailResult({ success: true, message: data.message, simulated: data.simulated });
        toast.success(data.message);
      } else {
        setTestEmailResult({ success: false, message: data.error || data.message || "Échec de l'envoi." });
        toast.error(data.error || "Échec de l'envoi du mail test.");
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message });
      toast.error(err.message || "Erreur lors du test SMTP");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!schoolId || !testPhone) {
      toast.error("Veuillez renseigner un numéro de téléphone de test.");
      return;
    }
    try {
      setTestingSms(true);
      setTestSmsResult(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${schoolId}/test-sms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testPhone })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestSmsResult({ success: true, message: data.message, status: data.status });
        toast.success(data.message);
      } else {
        setTestSmsResult({ success: false, message: data.error || data.message || "Échec d'envoi du SMS." });
        toast.error(data.error || "Échec du test SMS");
      }
    } catch (err: any) {
      setTestSmsResult({ success: false, message: err.message });
      toast.error(err.message || "Erreur lors du test SMS");
    } finally {
      setTestingSms(false);
    }
  };

  const handleTestWhatsapp = async () => {
    if (!schoolId || !testWhatsappPhone) {
      toast.error("Veuillez renseigner un numéro WhatsApp de test.");
      return;
    }
    try {
      setTestingWhatsapp(true);
      setTestWhatsappResult(null);
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/super-admin/schools/${schoolId}/test-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testPhone: testWhatsappPhone })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestWhatsappResult({ success: true, message: data.message });
        toast.success(data.message);
      } else {
        setTestWhatsappResult({ success: false, message: data.error || data.message || "Échec d'envoi WhatsApp." });
        toast.error(data.error || "Échec du test WhatsApp");
      }
    } catch (err: any) {
      setTestWhatsappResult({ success: false, message: err.message });
      toast.error(err.message || "Erreur lors du test WhatsApp");
    } finally {
      setTestingWhatsapp(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Server size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Passerelles SMTP & SMS de l'Établissement
                </h3>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>École :</span>
                <span className="font-bold text-slate-200">{schoolData?.nom || 'Chargement...'}</span>
                {schoolData?.email && <span className="text-slate-500">• {schoolData.email}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('smtp')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition-all border-b-2 ${
              activeSection === 'smtp'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Mail size={16} />
            <span>Serveur Mail (SMTP)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              smtpForm.custom_smtp_enabled ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {smtpForm.custom_smtp_enabled ? 'Personnalisé' : 'Par défaut'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('sms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition-all border-b-2 ${
              activeSection === 'sms'
                ? 'bg-white text-emerald-600 border-emerald-600 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <Smartphone size={16} />
            <span>Passerelle SMS</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              smsForm.custom_sms_enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {smsForm.custom_sms_enabled ? 'Personnalisé' : 'Par défaut'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition-all border-b-2 ${
              activeSection === 'whatsapp'
                ? 'bg-white text-teal-600 border-teal-600 shadow-xs'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            <MessageCircle size={16} />
            <span>Passerelle WhatsApp</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              whatsappForm.custom_whatsapp_enabled ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-600'
            }`}>
              {whatsappForm.custom_whatsapp_enabled ? 'Personnalisé' : 'Par défaut'}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <RefreshCw size={32} className="animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-semibold">Chargement des paramètres de messagerie...</p>
            </div>
          ) : (
            <>
              {/* Informative fallback card */}
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100/80 flex items-start gap-3">
                <Sparkles size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 space-y-1">
                  <p className="font-bold">Système Hybride avec Dégradé Intelligent (Fallback automatique)</p>
                  <p className="text-indigo-800/90 leading-relaxed">
                    Si une école ne dispose pas de serveur SMTP ou de passerelle SMS personnalisée, elle utilise sans interruption les <strong>identifiants par défaut globaux de la plateforme</strong> configurés par le Super Admin.
                  </p>
                </div>
              </div>

              {/* SECTION: SMTP */}
              {activeSection === 'smtp' && (
                <div className="space-y-6">
                  {/* Custom SMTP Toggle */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Activer un serveur SMTP personnalisé pour cette école</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {smtpForm.custom_smtp_enabled
                          ? "Cette école enverra ses emails avec ses propres identifiants SMTP (ex: son propre compte Gmail Pro ou serveur de domaine)."
                          : "Désactivé : Cette école utilise automatiquement les identifiants SMTP globaux de la plateforme."}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={smtpForm.custom_smtp_enabled}
                        onChange={(e) => setSmtpForm({ ...smtpForm, custom_smtp_enabled: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  {!smtpForm.custom_smtp_enabled ? (
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Globe size={16} className="text-indigo-600" />
                        <span>Paramètres Globaux Actifs (Plateforme MégafixaEduc)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Mode / Hôte</span>
                          <span className="font-semibold text-slate-800">
                            {globalDefaults?.smtp?.provider === 'brevo_api'
                              ? 'Brevo API v3 (HTTPS)'
                              : (globalDefaults?.smtp?.host || 'smtp.gmail.com')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Port / Protocole</span>
                          <span className="font-semibold text-slate-800">
                            {globalDefaults?.smtp?.provider === 'brevo_api'
                              ? 'API v3 (443)'
                              : (globalDefaults?.smtp?.port || '587')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Utilisateur / Expéditeur</span>
                          <span className="font-semibold text-slate-800 truncate block">{globalDefaults?.smtp?.from || globalDefaults?.smtp?.user || 'Par défaut plateforme'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Statut</span>
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle2 size={12} /> Opérationnel
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                        <div className="flex items-center gap-2 text-xs text-emerald-900 font-semibold">
                          <span>Mode d'envoi :</span>
                          <select
                            value={smtpForm.email_provider}
                            onChange={(e) => setSmtpForm({ ...smtpForm, email_provider: e.target.value })}
                            className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-white text-xs font-bold"
                          >
                            <option value="smtp">Serveur SMTP (Brevo Relais / Gmail / Custom)</option>
                            <option value="brevo_api">Brevo API Transactionnelle v3 (HTTPS)</option>
                          </select>
                        </div>
                        {smtpForm.email_provider === 'smtp' && (
                          <button
                            type="button"
                            onClick={() => setSmtpForm({
                              ...smtpForm,
                              smtp_host: 'smtp-relay.brevo.com',
                              smtp_port: '587',
                              smtp_secure: 'false'
                            })}
                            className="text-[11px] font-bold text-emerald-700 bg-white hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            Pré-remplir Relais Brevo
                          </button>
                        )}
                      </div>

                      {smtpForm.email_provider === 'brevo_api' ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Clé API Brevo (xkeysib-...)</label>
                            <input
                              type="password"
                              placeholder="Laisser vide pour conserver la clé actuelle"
                              value={smtpForm.brevo_api_key}
                              onChange={(e) => setSmtpForm({ ...smtpForm, brevo_api_key: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              Nom & Adresse Expéditeur vérifiée sur Brevo
                            </label>
                            <input
                              type="text"
                              placeholder={`"${schoolData?.nom || 'École'}" <contact@ecole.com>`}
                              value={smtpForm.email_from}
                              onChange={(e) => setSmtpForm({ ...smtpForm, email_from: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Serveur SMTP</label>
                            <input
                              type="text"
                              placeholder="smtp-relay.brevo.com ou smtp.gmail.com"
                              value={smtpForm.smtp_host}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Port (587 ou 465)</label>
                            <input
                              type="text"
                              placeholder="587"
                              value={smtpForm.smtp_port}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">Utilisateur / Login SMTP</label>
                            <input
                              type="text"
                              placeholder="direction@ecole.com ou login Brevo"
                              value={smtpForm.smtp_user}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700">
                              Mot de passe SMTP / Clé SMTP Brevo
                            </label>
                            <input
                              type="password"
                              placeholder="Laisser vide pour conserver l'actuel"
                              value={smtpForm.smtp_pass}
                              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_pass: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700">
                              Nom & Adresse Expéditeur (From Header)
                            </label>
                            <input
                              type="text"
                              placeholder={`"${schoolData?.nom || 'École'}" <contact@ecole.com>`}
                              value={smtpForm.email_from}
                              onChange={(e) => setSmtpForm({ ...smtpForm, email_from: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Test SMTP Box */}
                  <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                        <Send size={14} />
                        Tester l'envoi d'email pour cet établissement
                      </span>
                      <span className="text-[10px] text-indigo-600 font-bold uppercase">
                        Mode : {smtpForm.custom_smtp_enabled ? 'SMTP École' : 'Plateforme par défaut'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="email"
                        placeholder="email-destinataire@gmail.com"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        className="flex-1 px-3.5 py-2 bg-white border border-indigo-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleTestSmtp}
                        disabled={testingEmail}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        {testingEmail ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Envoi en cours...</span>
                          </>
                        ) : (
                          <>
                            <Send size={13} />
                            <span>Envoyer test</span>
                          </>
                        )}
                      </button>
                    </div>
                    {testEmailResult && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        testEmailResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {testEmailResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        <span>{testEmailResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: SMS & WHATSAPP */}
              {activeSection === 'sms' && (
                <div className="space-y-6">
                  {/* Custom SMS Toggle */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Activer une passerelle SMS personnalisée pour cette école</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {smsForm.custom_sms_enabled
                          ? "Cette école utilisera ses propres identifiants API (Twilio, SMS-Gateway local ou autre) et son propre Sender ID."
                          : "Désactivé : Cette école utilise automatiquement la passerelle SMS globale de la plateforme."}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        type="checkbox" 
                        checked={smsForm.custom_sms_enabled}
                        onChange={(e) => setSmsForm({ ...smsForm, custom_sms_enabled: e.target.checked })}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {!smsForm.custom_sms_enabled ? (
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <Smartphone size={16} className="text-emerald-600" />
                        <span>Passerelle Globale SMS Active (Plateforme MégafixaEduc)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Fournisseur</span>
                          <span className="font-semibold text-slate-800 uppercase">{globalDefaults?.sms?.provider || 'Simulation'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Sender ID</span>
                          <span className="font-semibold text-slate-800">{globalDefaults?.sms?.senderId || 'MEGAFIXA'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Clé API / SID</span>
                          <span className="font-semibold text-slate-800">{globalDefaults?.sms?.has_apiKey ? 'Configuré ✅' : 'Simulation'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Délivrabilité</span>
                          <span className="text-emerald-600 font-bold">Active pour tous les comptes</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Fournisseur SMS</label>
                          <select
                            value={smsForm.provider}
                            onChange={(e) => setSmsForm({ ...smsForm, provider: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          >
                            <option value="simulation">Simulation (Journal interne)</option>
                            <option value="brevo">Brevo Transactional SMS (API v3)</option>
                            <option value="twilio">Twilio Cloud SMS (International)</option>
                            <option value="custom_gateway">SMS-Gateway local / API HTTP Webhook</option>
                            <option value="orange_sms">Orange SMS Gateway</option>
                            <option value="mtn_sms">MTN MoMo SMS</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Sender ID (Nom d'expéditeur)</label>
                          <input
                            type="text"
                            placeholder="ex: ECOLE-NAME (Max 11 car.)"
                            value={smsForm.sender_number_or_name}
                            onChange={(e) => setSmsForm({ ...smsForm, sender_number_or_name: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>

                        {smsForm.provider === 'brevo' && (
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700">Clé API Brevo (xkeysib-...)</label>
                            <input
                              type="password"
                              placeholder="Laisser vide pour conserver la clé actuelle"
                              value={smsForm.api_key}
                              onChange={(e) => setSmsForm({ ...smsForm, api_key: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                            />
                          </div>
                        )}

                        {smsForm.provider === 'twilio' && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Twilio Account SID</label>
                              <input
                                type="text"
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={smsForm.account_sid}
                                onChange={(e) => setSmsForm({ ...smsForm, account_sid: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Twilio Auth Token</label>
                              <input
                                type="password"
                                placeholder="Laisser vide pour conserver l'actuel"
                                value={smsForm.auth_token}
                                onChange={(e) => setSmsForm({ ...smsForm, auth_token: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                              />
                            </div>
                          </>
                        )}

                        {smsForm.provider === 'custom_gateway' && (
                          <>
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-bold text-slate-700">
                                URL de l'API / Webhook SMS Gateway Local (POST)
                              </label>
                              <input
                                type="text"
                                placeholder="http://192.168.1.100:8080/v1/sms/send ou https://api.sms-local.com/send"
                                value={smsForm.api_url}
                                onChange={(e) => setSmsForm({ ...smsForm, api_url: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-bold text-slate-700">Clé d'authentification API (Bearer Token / Secret)</label>
                              <input
                                type="password"
                                placeholder="Optionnel si la passerelle locale utilise un token Bearer"
                                value={smsForm.api_key}
                                onChange={(e) => setSmsForm({ ...smsForm, api_key: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none font-mono"
                              />
                            </div>
                          </>
                        )}

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Solde de crédits SMS attribués</label>
                          <input
                            type="number"
                            value={smsForm.credit_balance}
                            onChange={(e) => setSmsForm({ ...smsForm, credit_balance: parseInt(e.target.value, 10) || 0 })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Test SMS Box */}
                  <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <Smartphone size={14} />
                        Tester l'envoi SMS pour cet établissement
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">
                        Mode : {smsForm.custom_sms_enabled ? smsForm.provider : 'Plateforme par défaut'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="+2290100000000"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        className="flex-1 px-3.5 py-2 bg-white border border-emerald-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleTestSms}
                        disabled={testingSms}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        {testingSms ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Envoi...</span>
                          </>
                        ) : (
                          <>
                            <Send size={13} />
                            <span>Tester le SMS</span>
                          </>
                        )}
                      </button>
                    </div>
                    {testSmsResult && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        testSmsResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {testSmsResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        <span>{testSmsResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION: WHATSAPP */}
              {activeSection === 'whatsapp' && (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Activer une passerelle WhatsApp personnalisée pour cette école</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {whatsappForm.custom_whatsapp_enabled
                          ? "Cette école utilisera ses propres identifiants Meta Cloud API, Twilio WhatsApp ou Webhook personnalisé."
                          : "Désactivé : Cette école utilise automatiquement la passerelle WhatsApp globale de la plateforme."}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={whatsappForm.custom_whatsapp_enabled}
                        onChange={(e) => setWhatsappForm({ ...whatsappForm, custom_whatsapp_enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>

                  {!whatsappForm.custom_whatsapp_enabled ? (
                    <div className="p-5 rounded-2xl border border-slate-200 bg-white space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                        <MessageCircle size={16} className="text-teal-600" />
                        <span>Passerelle Globale WhatsApp Active (Plateforme MégafixaEduc)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Fournisseur</span>
                          <span className="font-semibold text-slate-800 uppercase">{globalDefaults?.whatsapp?.provider || 'Simulation'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Numéro Expéditeur</span>
                          <span className="font-semibold text-slate-800">{globalDefaults?.whatsapp?.senderNumber || 'Non défini'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Statut API</span>
                          <span className="font-semibold text-slate-800">{globalDefaults?.whatsapp?.has_authToken ? 'Configuré ✅' : 'Simulation'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold">Délivrabilité</span>
                          <span className="text-teal-600 font-bold">Automatisations prêtes</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Fournisseur WhatsApp</label>
                          <select
                            value={whatsappForm.provider}
                            onChange={(e) => setWhatsappForm({ ...whatsappForm, provider: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-teal-500/20 outline-none"
                          >
                            <option value="simulation">Simulation (Journal interne)</option>
                            <option value="brevo_whatsapp">Brevo WhatsApp Business API (v3)</option>
                            <option value="meta_cloud_api">Meta WhatsApp Cloud API (Officiel)</option>
                            <option value="twilio_whatsapp">Twilio WhatsApp Business API</option>
                            <option value="custom_webhook">Webhook / Passerelle locale (Evolution, UltraMsg, etc.)</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Numéro WhatsApp expéditeur</label>
                          <input
                            type="text"
                            placeholder="+2290100000000"
                            value={whatsappForm.sender_number}
                            onChange={(e) => setWhatsappForm({ ...whatsappForm, sender_number: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-teal-500/20 outline-none"
                          />
                        </div>

                        {whatsappForm.provider === 'brevo_whatsapp' && (
                          <div className="space-y-1.5 sm:col-span-2">
                            <label className="text-xs font-bold text-slate-700">Clé API Brevo (xkeysib-...)</label>
                            <input
                              type="password"
                              placeholder="Laisser vide pour conserver la clé actuelle"
                              value={whatsappForm.api_key}
                              onChange={(e) => setWhatsappForm({ ...whatsappForm, api_key: e.target.value })}
                              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                            />
                          </div>
                        )}

                        {whatsappForm.provider === 'twilio_whatsapp' && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Twilio Account SID</label>
                              <input
                                type="text"
                                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                value={whatsappForm.account_sid}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, account_sid: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Twilio Auth Token</label>
                              <input
                                type="password"
                                placeholder="Laisser vide pour conserver l'actuel"
                                value={whatsappForm.auth_token}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, auth_token: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                              />
                            </div>
                          </>
                        )}

                        {whatsappForm.provider === 'meta_cloud_api' && (
                          <>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Meta Phone Number ID</label>
                              <input
                                type="text"
                                placeholder="109283746512345"
                                value={whatsappForm.phone_number_id}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, phone_number_id: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-700">Meta Access Token (Permanent)</label>
                              <input
                                type="password"
                                placeholder="Laisser vide pour conserver le token actuel"
                                value={whatsappForm.auth_token}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, auth_token: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                              />
                            </div>
                          </>
                        )}

                        {whatsappForm.provider === 'custom_webhook' && (
                          <>
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-bold text-slate-700">URL Webhook WhatsApp (POST JSON)</label>
                              <input
                                type="text"
                                placeholder="https://api.whatsapp-gateway.com/send"
                                value={whatsappForm.api_url}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, api_url: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                              />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                              <label className="text-xs font-bold text-slate-700">Clé API / Bearer Token</label>
                              <input
                                type="password"
                                placeholder="Laisser vide pour conserver la clé actuelle"
                                value={whatsappForm.api_key}
                                onChange={(e) => setWhatsappForm({ ...whatsappForm, api_key: e.target.value })}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono outline-none"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Test WhatsApp Box */}
                  <div className="p-4 rounded-2xl bg-teal-50/40 border border-teal-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                        <MessageCircle size={14} />
                        Tester l'envoi WhatsApp pour cet établissement
                      </span>
                      <span className="text-[10px] text-teal-600 font-bold uppercase">
                        Mode : {whatsappForm.custom_whatsapp_enabled ? whatsappForm.provider : 'Plateforme par défaut'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <input
                        type="text"
                        placeholder="+2290100000000"
                        value={testWhatsappPhone}
                        onChange={(e) => setTestWhatsappPhone(e.target.value)}
                        className="flex-1 px-3.5 py-2 bg-white border border-teal-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-teal-500/20"
                      />
                      <button
                        type="button"
                        onClick={handleTestWhatsapp}
                        disabled={testingWhatsapp}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        {testingWhatsapp ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Envoi...</span>
                          </>
                        ) : (
                          <>
                            <Send size={13} />
                            <span>Tester WhatsApp</span>
                          </>
                        )}
                      </button>
                    </div>
                    {testWhatsappResult && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        testWhatsappResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}>
                        {testWhatsappResult.success ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                        <span>{testWhatsappResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Fermer
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 transition-all cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Enregistrement en cours...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Enregistrer la configuration</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
