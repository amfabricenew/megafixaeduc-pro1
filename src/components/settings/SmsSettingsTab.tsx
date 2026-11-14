import React from 'react';
import { apiFetch } from '../../utils/api';
import { toast } from 'react-hot-toast';
import { Smartphone, Save, Key, Shield, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { SmsConfig } from '../../types';

export default function SmsSettingsTab() {
  const [config, setConfig] = React.useState<SmsConfig>({
    school_id: 1,
    provider: 'simulation',
    is_active: 1,
    account_sid: '',
    auth_token: '',
    sender_number_or_name: 'MEGAFIXA',
    credit_balance: 1000
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/sms/config');
      if (res.ok) {
        const data = await res.json();
        if (data) setConfig(data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await apiFetch('/api/sms/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        toast.success("Passerelle SMS mise à jour avec succès !");
      } else {
        const err = await res.json();
        toast.error(err.error || "Erreur lors de l'enregistrement de la configuration SMS.");
      }
    } catch (err: any) {
      toast.error("Erreur réseau: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Chargement des paramètres SMS...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Configuration des Alertes & Passerelles SMS
          </h2>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Configurez le routage officiel des notifications par SMS envoyées aux parents d'élèves et au corps professoral.
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/20 text-center shrink-0">
          <div className="text-[10px] uppercase font-bold text-emerald-200">Solde SMS Actuel</div>
          <div className="text-2xl font-black">{config.credit_balance ?? 1000} <span className="text-xs font-normal">SMS</span></div>
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-5 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Fournisseur Passerelle SMS
            </label>
            <select
              value={config.provider}
              onChange={e => setConfig({ ...config, provider: e.target.value as any })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="simulation">Passerelle Intelligente / Simulation Directe (Inclus)</option>
              <option value="brevo">Brevo Transactional SMS (API v3)</option>
              <option value="twilio">Twilio Cloud SMS (International / Afrique)</option>
              <option value="orange_sms">Orange SMS Gateway Africa</option>
              <option value="mtn_sms">MTN MoMo SMS Gateway</option>
              <option value="custom_gateway">Passerelle API Webhook Personnalisée</option>
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              En mode Simulation, les SMS sont instantanément validés et tracés dans le journal sans coût opérateur.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Nom d'expéditeur (Sender ID)
            </label>
            <input
              type="text"
              value={config.sender_number_or_name || ''}
              onChange={e => setConfig({ ...config, sender_number_or_name: e.target.value })}
              placeholder="Ex: MEGAFIXA ou ECOLE-PRO"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 uppercase font-bold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Jusqu'à 11 caractères alphanumériques visibles comme expéditeur sur le téléphone.
            </p>
          </div>
        </div>

        {/* Provider Specific Settings */}
        {config.provider === 'brevo' && (
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-3">
            <h3 className="font-bold text-emerald-900 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              Identifiants Brevo Transactional SMS (API v3)
            </h3>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Clé API Brevo (xkeysib-...)</label>
              <input
                type="password"
                value={config.api_key || ''}
                onChange={e => setConfig({ ...config, api_key: e.target.value })}
                placeholder="xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full p-2.5 rounded-lg border border-emerald-200 font-mono bg-white"
              />
            </div>
          </div>
        )}

        {config.provider === 'twilio' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-emerald-600" />
              Identifiants Twilio Cloud
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Account SID</label>
                <input
                  type="text"
                  value={config.account_sid || ''}
                  onChange={e => setConfig({ ...config, account_sid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full p-2 rounded-lg border border-slate-200 font-mono bg-white"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 mb-1">Auth Token</label>
                <input
                  type="password"
                  value={config.auth_token || ''}
                  onChange={e => setConfig({ ...config, auth_token: e.target.value })}
                  placeholder="••••••••••••••••••••••••••••••••"
                  className="w-full p-2 rounded-lg border border-slate-200 font-mono bg-white"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Crédits SMS alloués
            </label>
            <input
              type="number"
              value={config.credit_balance ?? 1000}
              onChange={e => setConfig({ ...config, credit_balance: parseInt(e.target.value) || 0 })}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white font-bold"
            />
          </div>

          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={config.is_active === 1}
                onChange={e => setConfig({ ...config, is_active: e.target.checked ? 1 : 0 })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
              />
              <span className="font-semibold text-slate-700">Activer le service d'envoi SMS</span>
            </label>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
