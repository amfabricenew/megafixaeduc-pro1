import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  Settings2, 
  ShieldCheck, 
  Globe, 
  Smartphone, 
  Building, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw, 
  Plus, 
  Check, 
  X, 
  Info,
  HelpCircle,
  QrCode,
  Lock
} from 'lucide-react';
import { apiFetch } from '../../utils/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface PaymentMethod {
  id: number;
  school_id: number;
  provider: string;
  label: string;
  description: string;
  is_active: number | boolean;
  mode: 'test' | 'live';
  public_key?: string;
  secret_key?: string;
  merchant_id?: string;
  merchant_phone?: string;
  account_name?: string;
  bank_rib?: string;
  bank_name?: string;
  payment_link?: string;
  instructions?: string;
  updated_at?: string;
}

const PROVIDER_METADATA: Record<string, {
  name: string;
  badge: string;
  color: string;
  icon: any;
  type: 'gateway' | 'mobile_direct' | 'bank' | 'custom';
  supportedCountries: string;
}> = {
  fedapay: {
    name: 'FedaPay',
    badge: 'Automatisé (API)',
    color: 'from-blue-600 to-indigo-700',
    icon: CreditCard,
    type: 'gateway',
    supportedCountries: 'Bénin, Togo, Côte d\'Ivoire, Sénégal, Niger'
  },
  kkiapay: {
    name: 'KKiaPay',
    badge: 'Automatisé (API)',
    color: 'from-emerald-600 to-teal-700',
    icon: Wallet,
    type: 'gateway',
    supportedCountries: 'Bénin, Côte d\'Ivoire, Togo, Sénégal'
  },
  wave: {
    name: 'Wave Mobile Money',
    badge: 'QR Code & Lien',
    color: 'from-sky-500 to-blue-600',
    icon: Smartphone,
    type: 'mobile_direct',
    supportedCountries: 'Côte d\'Ivoire, Sénégal, Mali, Burkina'
  },
  mtn_momo: {
    name: 'MTN Mobile Money',
    badge: 'Direct MoMo',
    color: 'from-amber-500 to-yellow-600',
    icon: Smartphone,
    type: 'mobile_direct',
    supportedCountries: 'Bénin, Côte d\'Ivoire, Cameroun, Congo, Guinée'
  },
  moov_money: {
    name: 'Moov Money / Flooz',
    badge: 'Direct Flooz',
    color: 'from-blue-700 to-cyan-700',
    icon: Smartphone,
    type: 'mobile_direct',
    supportedCountries: 'Bénin, Togo, Côte d\'Ivoire, Niger'
  },
  celtiis_cash: {
    name: 'Celtiis Cash',
    badge: 'Direct Celtiis (*889#)',
    color: 'from-sky-500 to-blue-600',
    icon: Smartphone,
    type: 'mobile_direct',
    supportedCountries: 'Bénin'
  },
  visa_mastercard: {
    name: 'Carte Bancaire (Visa & MasterCard)',
    badge: 'Cartes Visa / MC',
    color: 'from-amber-600 to-rose-700',
    icon: CreditCard,
    type: 'gateway',
    supportedCountries: 'Zone UEMOA / International'
  },
  orange_money: {
    name: 'Orange Money',
    badge: 'Direct USSD / Marchand',
    color: 'from-orange-500 to-amber-600',
    icon: Smartphone,
    type: 'mobile_direct',
    supportedCountries: 'Sénégal, Côte d\'Ivoire, Mali, Guinée'
  },
  bank_transfer: {
    name: 'Virement & Dépôt Bancaire',
    badge: 'Banque & RIB',
    color: 'from-slate-700 to-slate-900',
    icon: Building,
    type: 'bank',
    supportedCountries: 'Zone UEMOA / International'
  },
  custom: {
    name: 'Lien Externe / Autre',
    badge: 'Personnalisé',
    color: 'from-purple-600 to-indigo-800',
    icon: Globe,
    type: 'custom',
    supportedCountries: 'Tous pays'
  }
};

export default function PaymentSettingsTab() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/payment-settings');
      const data = await res.json();
      if (Array.isArray(data)) {
        setMethods(data);
      } else if (data.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      console.error("Error fetching payment methods:", err);
      toast.error("Impossible de charger les moyens de paiement");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleToggleActive = async (method: PaymentMethod) => {
    try {
      // Optimistic update
      setMethods(prev => prev.map(m => m.id === method.id ? { ...m, is_active: !m.is_active } : m));

      const res = await apiFetch(`/api/payment-settings/${method.id}/toggle`, {
        method: 'PATCH'
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          data.is_active 
            ? `${method.label} activé pour les parents` 
            : `${method.label} désactivé`
        );
      } else {
        toast.error(data.error || "Erreur lors de la mise à jour");
        fetchMethods();
      }
    } catch (e: any) {
      toast.error("Erreur de connexion");
      fetchMethods();
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    try {
      setSaving(true);
      const res = await apiFetch('/api/payment-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingMethod)
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configuration enregistrée avec succès !");
        setEditingMethod(null);
        fetchMethods();
      } else {
        toast.error(data.error || "Erreur lors de l'enregistrement");
      }
    } catch (e: any) {
      toast.error("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = methods.filter(m => !!m.is_active).length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-wider text-emerald-100 border border-white/20">
              <ShieldCheck size={14} /> Espace Fondé — Moyens de Paiement en Ligne
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Passerelles & Modalités de Paiement Scolaire
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Configurez ici les passerelles de paiement (FedaPay, KKiaPay, Wave, Mobile Money direct, Virement bancaire). 
              Les méthodes activées s'afficheront instantanément sur les boutons de paiement en ligne dans l'Espace Parent.
            </p>
          </div>

          <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
            <span className="text-xs font-medium text-emerald-100">Statut des passerelles</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white">{activeCount}</span>
              <span className="text-xs text-emerald-200">/ {methods.length} activé{activeCount > 1 ? 's' : ''}</span>
            </div>
            <button 
              onClick={fetchMethods}
              className="p-2 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold"
              title="Actualiser les données"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* Quick Security & Guide Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <Lock size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Sécurité Chiffrée</h4>
            <p className="text-xs text-slate-500 mt-1">Vos clés secrètes API restent strictement confinées sur le serveur et ne sont jamais exposées aux navigateurs.</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Smartphone size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Passerelles & MoMo</h4>
            <p className="text-xs text-slate-500 mt-1">Activez les solutions adaptées à vos parents : Mobile Money automatique ou virement direct sur le compte de l'école.</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-start gap-3">
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">Application Instantanée</h4>
            <p className="text-xs text-slate-500 mt-1">Toute modification enregistrée met immédiatement à jour les options de paiement dans l'Espace des Parents.</p>
          </div>
        </div>
      </div>

      {/* Payment Methods Grid */}
      {loading && methods.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Chargement des passerelles de paiement...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {methods.map((method) => {
            const meta = PROVIDER_METADATA[method.provider] || {
              name: method.label,
              badge: 'Option',
              color: 'from-slate-700 to-slate-900',
              icon: CreditCard,
              type: 'custom',
              supportedCountries: 'Tous pays'
            };
            const Icon = meta.icon;
            const isActive = !!method.is_active;

            return (
              <div 
                key={method.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden shadow-sm flex flex-col justify-between ${
                  isActive 
                    ? 'border-emerald-200 ring-2 ring-emerald-500/10' 
                    : 'border-slate-200 opacity-80 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-2xl bg-gradient-to-br ${meta.color} text-white shadow-md`}>
                        <Icon size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-slate-900 text-base">{method.label || meta.name}</h3>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                            {meta.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{meta.supportedCountries}</p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(method)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isActive ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                      title={isActive ? 'Désactiver' : 'Activer'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 space-y-4 text-xs text-slate-600">
                    <p className="text-slate-600 leading-relaxed">{method.description}</p>

                    {/* Mode tag for APIs */}
                    {(method.provider === 'fedapay' || method.provider === 'kkiapay') && (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Environnement :</span>
                        <span className={`px-2 py-0.5 rounded-md font-black uppercase text-[10px] ${
                          method.mode === 'live' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {method.mode === 'live' ? 'Production (En direct)' : 'Test / Sandbox'}
                        </span>
                      </div>
                    )}

                    {/* Key summary details */}
                    <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
                      {method.provider === 'fedapay' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Clé Secrète :</span>
                            <span className="font-mono text-slate-700">
                              {method.secret_key ? '••••••••' + method.secret_key.slice(-6) : <span className="text-amber-600 font-bold">Non configurée (utilise défaut)</span>}
                            </span>
                          </div>
                          {method.public_key && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Clé Publique :</span>
                              <span className="font-mono text-slate-700">{method.public_key.slice(0, 10)}...</span>
                            </div>
                          )}
                        </>
                      )}

                      {method.provider === 'kkiapay' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Clé Publique :</span>
                            <span className="font-mono text-slate-700">
                              {method.public_key ? method.public_key.slice(0, 12) + '...' : <span className="text-amber-600 font-bold">Non configurée</span>}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Clé Secrète :</span>
                            <span className="font-mono text-slate-700">
                              {method.secret_key ? '••••••••' + method.secret_key.slice(-6) : <span className="text-slate-400">Optionnel</span>}
                            </span>
                          </div>
                        </>
                      )}

                      {(method.provider === 'mtn_momo' || method.provider === 'moov_money' || method.provider === 'orange_money' || method.provider === 'celtiis_cash') && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Numéro Marchand / Téléphone :</span>
                            <span className="font-bold text-slate-800">{method.merchant_phone || <span className="text-amber-600">Non renseigné</span>}</span>
                          </div>
                          {method.account_name && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Nom du Compte :</span>
                              <span className="font-medium text-slate-700">{method.account_name}</span>
                            </div>
                          )}
                        </>
                      )}

                      {method.provider === 'visa_mastercard' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Protocole :</span>
                            <span className="font-bold text-emerald-700">3D-Secure Vérifié (Visa / MasterCard)</span>
                          </div>
                          {method.payment_link && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Lien Direct :</span>
                              <span className="font-mono text-slate-700 truncate max-w-[200px]">{method.payment_link}</span>
                            </div>
                          )}
                        </>
                      )}

                      {method.provider === 'wave' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Lien Wave :</span>
                            <span className="font-mono text-slate-700 truncate max-w-[200px]">
                              {method.payment_link || <span className="text-slate-400">Non configuré</span>}
                            </span>
                          </div>
                          {method.merchant_phone && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Téléphone Wave :</span>
                              <span className="font-bold text-slate-800">{method.merchant_phone}</span>
                            </div>
                          )}
                        </>
                      )}

                      {method.provider === 'bank_transfer' && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Banque :</span>
                            <span className="font-bold text-slate-800">{method.bank_name || <span className="text-amber-600">Non renseignée</span>}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">RIB / IBAN :</span>
                            <span className="font-mono text-slate-700">{method.bank_rib || <span className="text-amber-600">Non renseigné</span>}</span>
                          </div>
                          {method.account_name && (
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400">Titulaire :</span>
                              <span className="font-medium text-slate-700">{method.account_name}</span>
                            </div>
                          )}
                        </>
                      )}

                      {method.provider === 'custom' && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Lien :</span>
                          <span className="font-mono text-slate-700 truncate max-w-[200px]">
                            {method.payment_link || <span className="text-amber-600">Non renseigné</span>}
                          </span>
                        </div>
                      )}

                      {method.instructions && (
                        <div className="pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400 block mb-0.5">Instructions parents :</span>
                          <p className="text-slate-600 italic text-[11px] line-clamp-2">"{method.instructions}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-6 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                    isActive ? 'text-emerald-700' : 'text-slate-400'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    {isActive ? 'Visible aux parents' : 'Désactivé'}
                  </span>

                  <button
                    onClick={() => {
                      setEditingMethod({ ...method });
                      setShowSecret(false);
                    }}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Settings2 size={14} />
                    Configurer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <AnimatePresence>
        {editingMethod && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 my-8"
            >
              <form onSubmit={handleSaveEdit}>
                {/* Modal Header */}
                <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-2xl">
                      <Settings2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        Configurer : {editingMethod.label}
                      </h3>
                      <p className="text-xs text-slate-300">
                        Paramètres spécifiques au compte de votre établissement
                      </p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditingMethod(null)}
                    className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Form Content */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* General settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Libellé affiché aux parents *
                      </label>
                      <input 
                        type="text" 
                        required
                        value={editingMethod.label}
                        onChange={e => setEditingMethod({ ...editingMethod, label: e.target.value })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Statut d'activation
                      </label>
                      <select 
                        value={editingMethod.is_active ? '1' : '0'}
                        onChange={e => setEditingMethod({ ...editingMethod, is_active: e.target.value === '1' })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                      >
                        <option value="1">✅ Activé (Visible aux parents)</option>
                        <option value="0">❌ Désactivé (Masqué)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Courte description
                    </label>
                    <input 
                      type="text" 
                      value={editingMethod.description || ''}
                      onChange={e => setEditingMethod({ ...editingMethod, description: e.target.value })}
                      placeholder="Ex: Paiement direct par Mobile Money MTN ou Moov"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                    />
                  </div>

                  {/* Provider specific inputs */}
                  {(editingMethod.provider === 'fedapay' || editingMethod.provider === 'kkiapay') && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={16} className="text-emerald-600" />
                        Paramètres d'API de la Passerelle
                      </h4>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Environnement
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input 
                              type="radio" 
                              name="mode" 
                              value="test"
                              checked={editingMethod.mode === 'test'}
                              onChange={() => setEditingMethod({ ...editingMethod, mode: 'test' })}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            Mode Test (Sandbox)
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                            <input 
                              type="radio" 
                              name="mode" 
                              value="live"
                              checked={editingMethod.mode === 'live'}
                              onChange={() => setEditingMethod({ ...editingMethod, mode: 'live' })}
                              className="text-emerald-600 focus:ring-emerald-500"
                            />
                            Mode Production (En Direct)
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Clé Secrète (Secret Key) *
                        </label>
                        <div className="relative">
                          <input 
                            type={showSecret ? 'text' : 'password'}
                            value={editingMethod.secret_key || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, secret_key: e.target.value })}
                            placeholder={editingMethod.provider === 'fedapay' ? 'sk_live_... ou sk_sandbox_...' : 'Clé privée KKiaPay'}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-10"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowSecret(!showSecret)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">Obtenez cette clé depuis votre tableau de bord {editingMethod.label}.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Clé Publique (Public Key)
                        </label>
                        <input 
                          type="text" 
                          value={editingMethod.public_key || ''}
                          onChange={e => setEditingMethod({ ...editingMethod, public_key: e.target.value })}
                          placeholder={editingMethod.provider === 'fedapay' ? 'pk_live_... ou pk_sandbox_...' : 'Clé publique KKiaPay'}
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Direct Mobile Money fields */}
                  {(editingMethod.provider === 'mtn_momo' || editingMethod.provider === 'moov_money' || editingMethod.provider === 'orange_money' || editingMethod.provider === 'wave' || editingMethod.provider === 'celtiis_cash') && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Smartphone size={16} className="text-blue-600" />
                        Coordonnées de Réception Mobile Money
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Numéro Marchand / Téléphone MoMo / Celtiis *
                          </label>
                          <input 
                            type="text" 
                            value={editingMethod.merchant_phone || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, merchant_phone: e.target.value })}
                            placeholder="Ex: +229 40 00 00 00 / 0140000000"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Nom du Titulaire du Compte
                          </label>
                          <input 
                            type="text" 
                            value={editingMethod.account_name || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, account_name: e.target.value })}
                            placeholder="Ex: Complexe Scolaire Le Savoir"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {editingMethod.provider === 'wave' && (
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Lien de Paiement Wave (Wave Link / QR Code)
                          </label>
                          <input 
                            type="url" 
                            value={editingMethod.payment_link || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, payment_link: e.target.value })}
                            placeholder="Ex: https://pay.wave.com/m/..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visa & MasterCard fields */}
                  {editingMethod.provider === 'visa_mastercard' && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={16} className="text-rose-600" />
                        Configuration Carte Bancaire Visa / MasterCard (3D-Secure)
                      </h4>
                      <p className="text-xs text-slate-500">
                        Paiements sécurisés par carte bancaire internationale Visa et MasterCard avec protocole 3D-Secure.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Lien Direct de Paiement ou Passerelle (Optionnel)
                          </label>
                          <input 
                            type="url" 
                            value={editingMethod.payment_link || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, payment_link: e.target.value })}
                            placeholder="Ex: https://checkout.fedapay.com/pay/..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Passerelle ou Établissement Bancaire Partenaire
                          </label>
                          <input 
                            type="text" 
                            value={editingMethod.account_name || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, account_name: e.target.value })}
                            placeholder="Ex: FedaPay / Stripe / BOA / Ecobank"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank transfer fields */}
                  {editingMethod.provider === 'bank_transfer' && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Building size={16} className="text-slate-700" />
                        Coordonnées Bancaires de l'Établissement
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Nom de la Banque *
                          </label>
                          <input 
                            type="text" 
                            value={editingMethod.bank_name || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, bank_name: e.target.value })}
                            placeholder="Ex: Bank of Africa (BOA), Ecobank, BSIC..."
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Titulaire du Compte (Bénéficiaire) *
                          </label>
                          <input 
                            type="text" 
                            value={editingMethod.account_name || ''}
                            onChange={e => setEditingMethod({ ...editingMethod, account_name: e.target.value })}
                            placeholder="Ex: Établissement Scolaire X"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          RIB / Numéro de Compte / IBAN *
                        </label>
                        <input 
                          type="text" 
                          value={editingMethod.bank_rib || ''}
                          onChange={e => setEditingMethod({ ...editingMethod, bank_rib: e.target.value })}
                          placeholder="Ex: BJ061 01001 00123456789 22"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Custom link field */}
                  {editingMethod.provider === 'custom' && (
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe size={16} className="text-indigo-600" />
                        Lien URL Externe
                      </h4>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Adresse Web du Lien de Paiement *
                        </label>
                        <input 
                          type="url" 
                          value={editingMethod.payment_link || ''}
                          onChange={e => setEditingMethod({ ...editingMethod, payment_link: e.target.value })}
                          placeholder="https://votre-page-de-paiement.com"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Parent Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Instructions personnalisées pour les parents
                    </label>
                    <textarea 
                      rows={3}
                      value={editingMethod.instructions || ''}
                      onChange={e => setEditingMethod({ ...editingMethod, instructions: e.target.value })}
                      placeholder="Ex: Précisez impérativement le Nom, Prénom et Matricule de votre enfant lors du transfert pour validation immédiate."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Ce texte sera affiché aux parents lorsqu'ils choisiront ce moyen de paiement.</p>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingMethod(null)}
                    className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors text-sm"
                  >
                    Annuler
                  </button>

                  <button 
                    type="submit" 
                    disabled={saving}
                    className="px-6 py-2.5 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 text-sm disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving ? 'Enregistrement...' : 'Enregistrer la configuration'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
