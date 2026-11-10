import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  Settings, 
  Globe, 
  Mail, 
  Lock, 
  CreditCard, 
  Bell, 
  Database, 
  Shield, 
  Save,
  CheckCircle2,
  AlertCircle,
  Link2,
  Smartphone,
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Copy,
  ExternalLink,
  X,
  Check,
  School,
  Search,
  Filter,
  Server,
  RefreshCw,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import SchoolMessagingModal from '../../components/super-admin/SchoolMessagingModal';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_PLANS = [
  { id: 'DECOUVERTE', name: 'Découverte (Gratuit)', price: 0, student_limit: 100, staff_limit: 10, active: true },
  { id: 'PRO', name: 'Formule Pro', price: 150000, student_limit: 500, staff_limit: 30, active: true },
  { id: 'EXCELLENCE', name: 'Excellence Illimitée', price: 350000, student_limit: 2000, staff_limit: 100, active: true },
];

const DEFAULT_PAYMENT_METHODS = [
  {
    id: 'pay_mtn_bj',
    name: 'MTN Mobile Money Bénin',
    type: 'mobile_money',
    provider: 'MTN',
    number: '(+229) 0161107918',
    owner: 'AnScolar Smart',
    url: '',
    ussd: '*880*41*0161107918*MONTANT#',
    instructions: 'Envoyez le montant exact sur le numéro marchand via le menu MTN Momo ou en composant le code USSD rapide.',
    active: true,
    formulas: ['DECOUVERTE', 'PRO', 'EXCELLENCE']
  },
  {
    id: 'pay_moov_bj',
    name: 'Moov Money Bénin',
    type: 'mobile_money',
    provider: 'Moov',
    number: '(+229) 95000000',
    owner: 'AnScolar Smart',
    url: '',
    ussd: '*155*1*1*95000000*MONTANT#',
    instructions: 'Effectuez le transfert vers notre compte marchand Moov Money.',
    active: true,
    formulas: ['DECOUVERTE', 'PRO', 'EXCELLENCE']
  },
  {
    id: 'pay_celtiis_bj',
    name: 'Celtiis Cash Bénin',
    type: 'mobile_money',
    provider: 'Celtiis',
    number: '(+229) 40000000',
    owner: 'AnScolar Smart',
    url: '',
    ussd: '*889#',
    instructions: 'Effectuez le paiement via le menu Celtiis Cash (*889#) ou confirmez la notification push sur votre numéro Celtiis.',
    active: true,
    formulas: ['DECOUVERTE', 'PRO', 'EXCELLENCE']
  },
  {
    id: 'pay_card_visa_mc',
    name: 'Carte Bancaire (Visa & MasterCard)',
    type: 'card',
    provider: 'Visa / MasterCard',
    number: 'Paiement Sécurisé 3D-Secure',
    owner: 'AnScolar Smart',
    url: 'https://checkout.fedapay.com/pay/anscolar-smart',
    ussd: '',
    instructions: 'Paiement direct et sécurisé par carte bancaire internationale Visa ou MasterCard (débit ou crédit) avec confirmation 3D-Secure.',
    active: true,
    formulas: ['DECOUVERTE', 'PRO', 'EXCELLENCE']
  },
  {
    id: 'pay_fedapay',
    name: 'Passerelle FedaPay (Cartes & Mobile Money)',
    type: 'online',
    provider: 'FedaPay',
    number: 'Compte Marchand FedaPay',
    owner: 'AnScolar Smart',
    url: 'https://checkout.fedapay.com/pay/anscolar-smart',
    ussd: '',
    instructions: 'Paiement en ligne sécurisé par carte bancaire Visa/Mastercard ou Mobile Money.',
    active: true,
    formulas: ['PRO', 'EXCELLENCE']
  },
  {
    id: 'pay_bank',
    name: 'Virement Bancaire (BOA / Ecobank)',
    type: 'bank',
    provider: 'Banque',
    number: 'BJ066 01001 001234567890 12',
    owner: 'AnScolar Technologies SARL',
    url: '',
    ussd: '',
    instructions: 'Envoyez l\'ordre de virement avec le nom de l\'école en libellé puis transmettez le bordereau.',
    active: true,
    formulas: ['PRO', 'EXCELLENCE']
  }
];

const DEFAULT_PLAN_PAYMENT_LINKS: Record<string, { acompte?: string; annuel?: string; mensuel?: string }> = {
  DECOUVERTE: {
    acompte: '',
    annuel: '',
    mensuel: ''
  },
  PRO: {
    acompte: 'https://checkout.fedapay.com/pay/pro-acompte-45',
    annuel: 'https://checkout.fedapay.com/pay/pro-annuel',
    mensuel: 'https://checkout.fedapay.com/pay/pro-mensuel'
  },
  EXCELLENCE: {
    acompte: 'https://checkout.fedapay.com/pay/excellence-acompte-45',
    annuel: 'https://checkout.fedapay.com/pay/excellence-annuel',
    mensuel: 'https://checkout.fedapay.com/pay/excellence-mensuel'
  }
};

export default function SuperAdminSettings() {
  const { tab } = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = React.useState(
    tab === 'payments' || tab === 'payment' ? 'payment' : (tab || 'general')
  );
  const [settings, setSettings] = React.useState<any>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Plans & Payments State
  const [plans, setPlans] = React.useState<any[]>(DEFAULT_PLANS);
  const [paymentMethods, setPaymentMethods] = React.useState<any[]>(DEFAULT_PAYMENT_METHODS);
  const [planPaymentLinks, setPlanPaymentLinks] = React.useState<Record<string, any>>(DEFAULT_PLAN_PAYMENT_LINKS);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
  const [editingPayment, setEditingPayment] = React.useState<any>(null);

  // School Messaging Configuration State
  const [schoolsMessagingList, setSchoolsMessagingList] = React.useState<any[]>([]);
  const [messagingGlobalDefaults, setMessagingGlobalDefaults] = React.useState<any>(null);
  const [loadingSchoolsMessaging, setLoadingSchoolsMessaging] = React.useState(false);
  const [schoolMessagingSearch, setSchoolMessagingSearch] = React.useState('');
  const [schoolMessagingFilter, setSchoolMessagingFilter] = React.useState<'all' | 'custom' | 'default'>('all');
  const [selectedSchoolIdForMessaging, setSelectedSchoolIdForMessaging] = React.useState<number | null>(null);
  const [isMessagingModalOpen, setIsMessagingModalOpen] = React.useState(false);

  const fetchSchoolsMessaging = async () => {
    try {
      setLoadingSchoolsMessaging(true);
      const res = await fetch('/api/super-admin/messaging/schools', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchoolsMessagingList(data.schools || []);
        setMessagingGlobalDefaults(data.globalDefaults || null);
      }
    } catch (e) {
      console.error("Error fetching schools messaging:", e);
    } finally {
      setLoadingSchoolsMessaging(false);
    }
  };

  React.useEffect(() => {
    if (tab === 'payments' || tab === 'payment') {
      setActiveTab('payment');
    } else if (tab) {
      setActiveTab(tab);
    }
  }, [tab]);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/super-admin/plans', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        }
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/super-admin/settings', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSettings(data);

        // Load payment methods if saved
        if (data.payment_methods) {
          try {
            const parsed = typeof data.payment_methods === 'string' ? JSON.parse(data.payment_methods) : data.payment_methods;
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Ensure default methods like Celtiis and Card Visa/Mastercard exist if not present
              const existingIds = new Set(parsed.map((p: any) => p.id));
              const missingDefaults = DEFAULT_PAYMENT_METHODS.filter(d => !existingIds.has(d.id));
              setPaymentMethods([...parsed, ...missingDefaults]);
            }
          } catch (e) {
            console.error(e);
          }
        }

        // Load plan payment links if saved
        if (data.plan_payment_links) {
          try {
            const parsed = typeof data.plan_payment_links === 'string' ? JSON.parse(data.plan_payment_links) : data.plan_payment_links;
            if (parsed && typeof parsed === 'object') {
              setPlanPaymentLinks(parsed);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSettings();
    fetchPlans();
  }, []);

  React.useEffect(() => {
    if (activeTab === 'schools_messaging') {
      fetchSchoolsMessaging();
    }
  }, [activeTab]);

  const handleSave = async (customSettings?: any, customMethods?: any[], customLinks?: any) => {
    setSaving(true);
    try {
      const currentMethods = customMethods !== undefined ? customMethods : paymentMethods;
      const currentLinks = customLinks !== undefined ? customLinks : planPaymentLinks;
      const payload = {
        ...(customSettings || settings),
        payment_methods: JSON.stringify(currentMethods),
        plan_payment_links: JSON.stringify(currentLinks)
      };
      const response = await fetch('/api/super-admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        toast.success("Paramètres et moyens de paiement enregistrés avec succès");
        setSettings((prev: any) => ({ ...prev, ...payload }));
      } else {
        toast.error("Erreur lors de l'enregistrement");
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const [testEmailAddress, setTestEmailAddress] = React.useState('');
  const [testEmailLoading, setTestEmailLoading] = React.useState(false);
  const [testSmsPhone, setTestSmsPhone] = React.useState('');
  const [testSmsLoading, setTestSmsLoading] = React.useState(false);

  const handleTestEmail = async () => {
    setTestEmailLoading(true);
    try {
      const response = await fetch('/api/super-admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ toEmail: testEmailAddress || undefined })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.simulated) {
          toast(data.message, { icon: 'ℹ️' });
        } else {
          toast.success(data.message || "Email de test envoyé avec succès !");
        }
      } else {
        toast.error(data.error || "Échec de l'envoi de l'email de test");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du test d'envoi");
    } finally {
      setTestEmailLoading(false);
    }
  };

  const handleTestSms = async () => {
    if (!testSmsPhone.trim()) {
      toast.error("Veuillez entrer un numéro de téléphone");
      return;
    }
    setTestSmsLoading(true);
    try {
      const response = await fetch('/api/super-admin/test-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ phone: testSmsPhone })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        if (data.simulated) {
          toast(data.message, { icon: 'ℹ️' });
        } else {
          toast.success(data.message || "SMS de test envoyé avec succès !");
        }
      } else {
        toast.error(data.error || "Échec de l'envoi du SMS de test");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du test d'envoi SMS");
    } finally {
      setTestSmsLoading(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const openPaymentModal = (method?: any) => {
    setEditingPayment(method ? { ...method } : {
      id: `pay_${Date.now()}`,
      name: '',
      type: 'mobile_money',
      provider: 'MTN',
      number: '',
      owner: '',
      url: '',
      ussd: '',
      instructions: '',
      active: true,
      formulas: ['DECOUVERTE', 'PRO', 'EXCELLENCE']
    });
    setIsPaymentModalOpen(true);
  };

  const savePaymentMethod = () => {
    if (!editingPayment.name?.trim()) {
      toast.error("Le nom public est requis");
      return;
    }
    
    let updatedList: any[] = [];
    setPaymentMethods(prev => {
      const exists = prev.find(p => p.id === editingPayment.id);
      if (exists) {
        updatedList = prev.map(p => p.id === editingPayment.id ? editingPayment : p);
      } else {
        updatedList = [...prev, editingPayment];
      }
      return updatedList;
    });

    setIsPaymentModalOpen(false);
    setEditingPayment(null);
    toast.success("Moyen de paiement enregistré");
    
    setTimeout(() => {
      handleSave(undefined, updatedList);
    }, 100);
  };

  const removePaymentMethod = (id: string) => {
    if (window.confirm("Supprimer ce moyen de paiement ?")) {
      const updated = paymentMethods.filter(p => p.id !== id);
      setPaymentMethods(updated);
      toast.success("Moyen de paiement supprimé");
      handleSave(undefined, updated);
    }
  };

  const toggleMethodActive = (id: string) => {
    const updated = paymentMethods.map(m => m.id === id ? { ...m, active: !m.active } : m);
    setPaymentMethods(updated);
    toast.success("Statut mis à jour");
    handleSave(undefined, updated);
  };

  const updatePlanPaymentLink = (planId: string, type: string, value: string) => {
    setPlanPaymentLinks(prev => ({
      ...prev,
      [planId]: {
        ...(prev[planId] || {}),
        [type]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'payment', label: 'Moyens de Paiement', icon: CreditCard },
    { id: 'email', label: 'Emails & Notifications', icon: Mail },
    { id: 'schools_messaging', label: 'Passerelles Écoles (SMTP & SMS)', icon: Smartphone },
    { id: 'security', label: 'Sécurité & API', icon: Shield },
    { id: 'maintenance', label: 'Maintenance', icon: Database },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Configuration Système</h1>
          <p className="text-slate-500">Gérez les paramètres globaux de la plateforme SaaS.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50"
        >
          {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={18} />}
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left",
                activeTab === tab.id 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {activeTab === 'general' && (
            <div className="p-8 space-y-8">
              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Infos Plateforme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Nom de l'application</label>
                    <input 
                      type="text" 
                      value={settings.app_name || 'MégafixaEduc Pro'} 
                      onChange={(e) => handleChange('app_name', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">URL du site public</label>
                    <input 
                      type="text" 
                      value={settings.public_url || 'https://megafixa.com'} 
                      onChange={(e) => handleChange('public_url', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Localisation par défaut</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Pays par défaut</label>
                    <select 
                      value={settings.default_country || 'Bénin'}
                      onChange={(e) => handleChange('default_country', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    >
                      <option>Bénin</option>
                      <option>Togo</option>
                      <option>Sénégal</option>
                      <option>Côte d'Ivoire</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Devise</label>
                    <input 
                      type="text" 
                      value={settings.default_currency || 'XOF'} 
                      onChange={(e) => handleChange('default_currency', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Contacts Support & Demandes Écoles</h3>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    Affichés sur l'écran d'attente client (24H)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Email d'assistance officiel</label>
                    <input 
                      type="email" 
                      value={settings.support_email || 'contact@megafixa.com'} 
                      onChange={(e) => handleChange('support_email', e.target.value)}
                      placeholder="contact@megafixa.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Numéro Téléphone d'assistance</label>
                    <input 
                      type="text" 
                      value={settings.support_phone || '(+229) 0161107918'} 
                      onChange={(e) => handleChange('support_phone', e.target.value)}
                      placeholder="(+229) 0161107918"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Numéro WhatsApp direct (avec indicatif pays)</label>
                    <input 
                      type="text" 
                      value={settings.support_whatsapp || '+2290161107918'} 
                      onChange={(e) => handleChange('support_whatsapp', e.target.value)}
                      placeholder="+2290161107918"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Délai maximal de validation promis</label>
                    <input 
                      type="text" 
                      value={settings.support_delai_validation || '24H'} 
                      onChange={(e) => handleChange('support_delai_validation', e.target.value)}
                      placeholder="24H"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="p-6 md:p-8 space-y-10">
              {/* Section 1: Liens de Paiement Directs par Formule d'Abonnement */}
              <div className="bg-slate-900 rounded-3xl p-6 md:p-8 border border-slate-800 text-white space-y-6 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      <Link2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        Liens de Paiement Directs par Formule d'Abonnement
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                        Ces liens URL (ex: FedaPay, Kkiapay, Stripe Checkout, Wave) seront directement associés aux boutons « Payer l'acompte (45%) » et « Payer en ligne ».
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
                  >
                    <Save size={16} />
                    <span>{saving ? 'Enregistrement...' : 'Enregistrer tous les liens'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const links = planPaymentLinks[plan.id] || {};
                    return (
                      <div key={plan.id} className="bg-[#0b1329] border border-slate-800/80 rounded-2xl p-5 space-y-4">
                        <div>
                          <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 block">
                            {plan.id}
                          </span>
                          <h4 className="text-sm font-bold text-white mt-0.5">{plan.name}</h4>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            {plan.price === 0 ? '0 F / an' : `${Number(plan.price).toLocaleString()} F / an`}
                          </p>
                        </div>

                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400">Lien Acompte 45%</label>
                            <input
                              type="url"
                              value={links.acompte || ''}
                              onChange={(e) => updatePlanPaymentLink(plan.id, 'acompte', e.target.value)}
                              placeholder="https://checkout.fedapay.com/pay/..."
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400">Lien Annuel Complet</label>
                            <input
                              type="url"
                              value={links.annuel || ''}
                              onChange={(e) => updatePlanPaymentLink(plan.id, 'annuel', e.target.value)}
                              placeholder="https://checkout.fedapay.com/pay/..."
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-400">Lien Mensualité</label>
                            <input
                              type="url"
                              value={links.mensuel || ''}
                              onChange={(e) => updatePlanPaymentLink(plan.id, 'mensuel', e.target.value)}
                              placeholder="https://checkout.fedapay.com/pay/..."
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Moyens de Paiement Proposés aux Établissements */}
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Moyens de Paiement Proposés aux Établissements ({paymentMethods.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Ces canaux s'affichent sur le portail de facturation et souscription de chaque école.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => openPaymentModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0"
                  >
                    <Plus size={16} />
                    <span>Ajouter un Moyen de Paiement</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {paymentMethods.map((method) => (
                    <div 
                      key={method.id} 
                      className="bg-[#0b1329] border border-slate-800 rounded-2xl p-5 text-white space-y-4 hover:border-slate-700 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                            {method.type === 'bank' ? (
                              <Landmark size={20} />
                            ) : (method.type === 'card' || method.type === 'online') ? (
                              <CreditCard size={20} />
                            ) : (
                              <Smartphone size={20} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-white">{method.name}</h4>
                              <span className={cn(
                                "px-2 py-0.5 text-[10px] font-bold rounded-full",
                                method.active 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                  : "bg-slate-700/50 text-slate-400 border border-slate-600/30"
                              )}>
                                {method.active ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {method.number} {method.owner ? `• ${method.owner}` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openPaymentModal(method)}
                            title="Modifier"
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => removePaymentMethod(method.id)}
                            title="Supprimer"
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* USSD Box */}
                      {method.ussd && (
                        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Code USSD Rapide :</span>
                            <code className="text-xs text-amber-300 font-mono font-bold">{method.ussd}</code>
                          </div>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(method.ussd);
                              toast.success("Code USSD copié !");
                            }}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all shrink-0 flex items-center gap-1"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      )}

                      {/* URL Box */}
                      {method.url && (
                        <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                          <div className="truncate">
                            <span className="text-[10px] text-slate-500 font-bold uppercase block">Lien direct :</span>
                            <span className="text-xs text-indigo-300 truncate block">{method.url}</span>
                          </div>
                          <a
                            href={method.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all shrink-0"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      )}

                      {/* Instructions */}
                      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 text-xs text-slate-300 leading-relaxed">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Instructions :</span>
                        {method.instructions || "Aucune consigne spécifiée."}
                      </div>

                      {/* Formulas + Toggle Active */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(method.formulas || []).map((formulaId: string) => (
                            <span key={formulaId} className="px-2 py-0.5 text-[10px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 rounded-md">
                              {formulaId}
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => toggleMethodActive(method.id)}
                          className={cn(
                            "text-xs font-bold transition-all hover:underline",
                            method.active ? "text-slate-400 hover:text-rose-400" : "text-amber-400 hover:text-amber-300"
                          )}
                        >
                          {method.active ? 'Désactiver' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Passerelles de Paiement Automatisées & Clés d'API */}
              <div className="space-y-6 pt-6 border-t border-slate-200">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4">
                  <CreditCard size={24} className="text-slate-600 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Passerelles Automatisées & Clés d'API</h4>
                    <p className="text-xs text-slate-500 mt-1">Configurez les identifiants techniques des passerelles directes (Stripe, FedaPay, PayPal, Mobile Money Direct).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {/* Stripe */}
                  <section className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#635BFF] rounded-xl flex items-center justify-center text-white font-bold italic shadow-sm">S</div>
                      <div>
                        <h3 className="text-sm font-black text-[#635BFF] uppercase tracking-widest">Stripe</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Paiement International (Cartes)</p>
                      </div>
                      <button 
                        onClick={() => handleChange('stripe_enabled', settings.stripe_enabled === 'true' ? 'false' : 'true')}
                        className={cn(
                          "ml-auto w-10 h-5 rounded-full transition-all relative",
                          settings.stripe_enabled === 'true' ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                          settings.stripe_enabled === 'true' ? "right-0.5" : "left-0.5"
                        )} />
                      </button>
                    </div>
                    {settings.stripe_enabled === 'true' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Publishable Key</label>
                          <input 
                            type="password" 
                            value={settings.stripe_public_key || ''} 
                            onChange={(e) => handleChange('stripe_public_key', e.target.value)}
                            placeholder="pk_live_..." 
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#635BFF]/20 font-medium" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Secret Key</label>
                          <input 
                            type="password" 
                            value={settings.stripe_secret_key || ''} 
                            onChange={(e) => handleChange('stripe_secret_key', e.target.value)}
                            placeholder="sk_live_..." 
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#635BFF]/20 font-medium" 
                          />
                        </div>
                      </div>
                    )}
                  </section>

                  {/* PayPal */}
                  <section className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#003087] rounded-xl flex items-center justify-center text-white shadow-sm">
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#003087] uppercase tracking-widest">PayPal</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Paiement Global (PayPal/Cartes)</p>
                      </div>
                      <button 
                        onClick={() => handleChange('paypal_enabled', settings.paypal_enabled === 'true' ? 'false' : 'true')}
                        className={cn(
                          "ml-auto w-10 h-5 rounded-full transition-all relative",
                          settings.paypal_enabled === 'true' ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                          settings.paypal_enabled === 'true' ? "right-0.5" : "left-0.5"
                        )} />
                      </button>
                    </div>
                    {settings.paypal_enabled === 'true' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Client ID</label>
                          <input 
                            type="password" 
                            value={settings.paypal_client_id || ''} 
                            onChange={(e) => handleChange('paypal_client_id', e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#003087]/20 font-medium" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Secret Key</label>
                          <input 
                            type="password" 
                            value={settings.paypal_secret_key || ''} 
                            onChange={(e) => handleChange('paypal_secret_key', e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#003087]/20 font-medium" 
                          />
                        </div>
                      </div>
                    )}
                  </section>

                  {/* FedaPay (UEMOA Mobile Money + Cards) */}
                  <section className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center p-1 shadow-sm">
                        <img src="https://fedapay.com/assets/images/logo.png" alt="FedaPay" className="w-full h-auto" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-[#FF6B6B] uppercase tracking-widest">FedaPay</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Zone UEMOA (Mobile Money & Cartes)</p>
                      </div>
                      <button 
                        onClick={() => handleChange('fedapay_enabled', settings.fedapay_enabled === 'true' ? 'false' : 'true')}
                        className={cn(
                          "ml-auto w-10 h-5 rounded-full transition-all relative",
                          settings.fedapay_enabled === 'true' ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                          settings.fedapay_enabled === 'true' ? "right-0.5" : "left-0.5"
                        )} />
                      </button>
                    </div>
                    {settings.fedapay_enabled === 'true' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Clé Publique</label>
                          <input 
                            type="password" 
                            value={settings.fedapay_public_key || ''} 
                            onChange={(e) => handleChange('fedapay_public_key', e.target.value)}
                            placeholder="pk_..." 
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B6B]/20 font-medium" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Clé Secrète</label>
                          <input 
                            type="password" 
                            value={settings.fedapay_secret_key || ''} 
                            onChange={(e) => handleChange('fedapay_secret_key', e.target.value)}
                            placeholder="sk_..." 
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#FF6B6B]/20 font-medium" 
                          />
                        </div>
                      </div>
                    )}
                  </section>

                  {/* Mobile Money Direct (Manuel/Opérateur) */}
                  <section className="space-y-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-sm">
                        <Globe size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">Mobile Money Direct</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Flooz, T-Money, Orange Money, MTN</p>
                      </div>
                      <button 
                        onClick={() => handleChange('mobile_money_enabled', settings.mobile_money_enabled === 'true' ? 'false' : 'true')}
                        className={cn(
                          "ml-auto w-10 h-5 rounded-full transition-all relative",
                          settings.mobile_money_enabled === 'true' ? "bg-emerald-500" : "bg-slate-300"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                          settings.mobile_money_enabled === 'true' ? "right-0.5" : "left-0.5"
                        )} />
                      </button>
                    </div>
                    {settings.mobile_money_enabled === 'true' && (
                      <div className="space-y-4 pt-4 border-t border-slate-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Numéro de Réception Principal</label>
                            <input 
                              type="text" 
                              value={settings.mm_phone || ''} 
                              onChange={(e) => handleChange('mm_phone', e.target.value)}
                              placeholder="+228 90 00 00 00" 
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 font-medium" 
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500">Nom du Détenteur</label>
                            <input 
                              type="text" 
                              value={settings.mm_name || ''} 
                              onChange={(e) => handleChange('mm_name', e.target.value)}
                              placeholder="Ex: MEGAFIXA SARL" 
                              className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 font-medium" 
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500">Instructions de Paiement (affichées à l'école)</label>
                          <textarea 
                            value={settings.mm_instructions || ''} 
                            onChange={(e) => handleChange('mm_instructions', e.target.value)}
                            placeholder="Ex: Envoyez le montant par Flooz puis contactez le support avec votre ID de transaction." 
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 font-medium min-h-[100px]" 
                          />
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="p-8 space-y-8">
              {/* Bridge banner to per-school gateways */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <School size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-indigo-950">Passerelles Dédiées par Établissement</h4>
                    <p className="text-[11px] text-indigo-700/80 mt-0.5">
                      Besoin qu'une école envoie ses emails ou SMS avec ses propres identifiants ? Vous pouvez configurer des passerelles spécifiques école par école avec repli automatique sur ces paramètres globaux.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('schools_messaging')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Passerelles par école</span>
                  <ExternalLink size={14} />
                </button>
              </div>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Configuration SMTP (Google Mail / Pro)</h3>
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                    Recommandé : Gmail (smtp.gmail.com)
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">💡 Astuce Google Mail (Gmail) :</p>
                  <p>
                    Pour utiliser votre adresse Gmail professionnelle ou personnelle, activez la validation en 2 étapes sur votre compte Google, puis générez un <strong>Mot de passe d'application</strong> (16 caractères) dans la sécurité de votre compte Google et saisissez-le dans le champ "Mot de passe SMTP".
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Serveur SMTP</label>
                    <input 
                      type="text" 
                      value={settings.smtp_host || ''} 
                      onChange={(e) => handleChange('smtp_host', e.target.value)}
                      placeholder="smtp.gmail.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Port (587 ou 465 pour SSL)</label>
                    <input 
                      type="text" 
                      value={settings.smtp_port || '587'} 
                      onChange={(e) => handleChange('smtp_port', e.target.value)}
                      placeholder="587"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Utilisateur / Adresse Gmail</label>
                    <input 
                      type="text" 
                      value={settings.smtp_user || ''} 
                      onChange={(e) => handleChange('smtp_user', e.target.value)}
                      placeholder="ex: direction@ecole.com ou ecole@gmail.com"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Mot de passe SMTP / Mot de passe d'application Google</label>
                    <input 
                      type="password" 
                      value={settings.smtp_pass || ''} 
                      onChange={(e) => handleChange('smtp_pass', e.target.value)}
                      placeholder="Mot de passe d'application (16 caractères)"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-bold text-slate-500">Nom & Adresse Expéditeur (From)</label>
                    <input 
                      type="text" 
                      value={settings.email_from || ''} 
                      onChange={(e) => handleChange('email_from', e.target.value)}
                      placeholder='"MégafixaEduc Pro" <direction@ecole.com>'
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>

                {/* Test Email Section */}
                <div className="mt-4 p-5 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider">
                    <Mail size={16} />
                    <span>Tester la délivrabilité d'envoi d'email (Réel)</span>
                  </div>
                  <p className="text-xs text-indigo-700/80">
                    Enregistrez d'abord vos paramètres ci-dessus, puis saisissez votre adresse pour recevoir un email de confirmation immédiat.
                  </p>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <input
                      type="email"
                      placeholder="votre-adresse-email@gmail.com"
                      value={testEmailAddress}
                      onChange={(e) => setTestEmailAddress(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleTestEmail}
                      disabled={testEmailLoading}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                      {testEmailLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Envoi en cours...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={15} />
                          <span>Envoyer l'email de test</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Passerelle SMS & WhatsApp</h3>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                    Délivrabilité Mobile
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Service Provider SMS</label>
                    <select 
                      value={settings.sms_provider || 'simulation'} 
                      onChange={(e) => handleChange('sms_provider', e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    >
                      <option value="simulation">Simulation (Log console uniquement)</option>
                      <option value="twilio">Twilio (International)</option>
                      <option value="infobip">Infobip</option>
                      <option value="orange">Orange SMS API</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Sender ID (Nom d'expéditeur)</label>
                    <input 
                      type="text" 
                      value={settings.sms_sender_id || ''} 
                      onChange={(e) => handleChange('sms_sender_id', e.target.value)}
                      placeholder="MEGAFIXA"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">API Key / Account SID</label>
                    <input 
                      type="password" 
                      value={settings.sms_api_key || ''} 
                      onChange={(e) => handleChange('sms_api_key', e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500">Auth Token / Secret</label>
                    <input 
                      type="password" 
                      value={settings.sms_auth_token || ''} 
                      onChange={(e) => handleChange('sms_auth_token', e.target.value)}
                      placeholder="••••••••••••••••••••"
                      className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium" 
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 space-y-4">
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-amber-900 flex items-center gap-2">
                      <Smartphone size={16} />
                      Configuration WhatsApp & SMS
                    </h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Le service WhatsApp utilise par défaut la simulation ou la passerelle configurée. Pour un envoi réel, assurez-vous que les informations d'authentification ci-dessus sont valides pour le provider choisi.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-amber-200">
                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Tester l'envoi SMS / WhatsApp</p>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="text"
                        placeholder="+2290100000000"
                        value={testSmsPhone}
                        onChange={(e) => setTestSmsPhone(e.target.value)}
                        className="flex-1 px-4 py-2 bg-white border border-amber-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleTestSms}
                        disabled={testSmsLoading}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                      >
                        {testSmsLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                            <span>Envoi...</span>
                          </>
                        ) : (
                          <>
                            <Smartphone size={15} />
                            <span>Tester le SMS</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB: PASSERELLES PAR ETABLISSEMENT (SMTP & SMS) */}
          {activeTab === 'schools_messaging' && (
            <div className="p-8 space-y-8">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Smartphone className="text-indigo-600" size={20} />
                    <span>Passerelles SMTP & SMS par Établissement</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                    Permettez à chaque école de configurer son propre serveur SMTP (ex: son propre compte Gmail professionnel ou serveur de messagerie) et sa passerelle SMS (Twilio, SMS-Gateway local), tout en garantissant un repli automatique et transparent sur les valeurs globales pour les écoles sans configuration.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchSchoolsMessaging}
                  disabled={loadingSchoolsMessaging}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shrink-0 transition-colors cursor-pointer self-start md:self-auto"
                >
                  <RefreshCw size={14} className={loadingSchoolsMessaging ? 'animate-spin' : ''} />
                  <span>Actualiser</span>
                </button>
              </div>

              {/* Global Defaults Informational Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Global SMTP */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Mail size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                        Serveur SMTP Global (Repli)
                      </span>
                      <span className="text-[10px] bg-indigo-200/70 text-indigo-900 font-extrabold px-2 py-0.5 rounded-md">
                        Système
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                      {messagingGlobalDefaults?.smtp?.host || 'smtp.gmail.com'}:{messagingGlobalDefaults?.smtp?.port || '587'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Expéditeur : {messagingGlobalDefaults?.smtp?.from || messagingGlobalDefaults?.smtp?.user || 'Non configuré'}
                    </p>
                  </div>
                </div>

                {/* Global SMS */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Smartphone size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                        Passerelle SMS Globale (Repli)
                      </span>
                      <span className="text-[10px] bg-emerald-200/70 text-emerald-900 font-extrabold px-2 py-0.5 rounded-md">
                        Système
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-1 truncate uppercase">
                      Fournisseur : {messagingGlobalDefaults?.sms?.provider || 'Simulation'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Sender ID : {messagingGlobalDefaults?.sms?.senderId || 'MEGAFIXA'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Search & Filters */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-2">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher une école par nom, ville, email..."
                    value={schoolMessagingSearch}
                    onChange={(e) => setSchoolMessagingSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:bg-white outline-none"
                  />
                  {schoolMessagingSearch && (
                    <button
                      onClick={() => setSchoolMessagingSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSchoolMessagingFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      schoolMessagingFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Toutes ({schoolsMessagingList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolMessagingFilter('custom')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      schoolMessagingFilter === 'custom'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Personnalisées ({schoolsMessagingList.filter((s: any) => s.custom_smtp_enabled || s.custom_sms_enabled).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSchoolMessagingFilter('default')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      schoolMessagingFilter === 'default'
                        ? 'bg-slate-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Par défaut ({schoolsMessagingList.filter((s: any) => !s.custom_smtp_enabled && !s.custom_sms_enabled).length})
                  </button>
                </div>
              </div>

              {/* Schools Messaging List */}
              {loadingSchoolsMessaging ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <RefreshCw size={28} className="animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-semibold">Chargement des établissements...</p>
                </div>
              ) : schoolsMessagingList.length === 0 ? (
                <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <School size={36} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-bold text-slate-700">Aucun établissement enregistré</p>
                  <p className="text-[11px] text-slate-400 mt-1">Créez des écoles pour configurer leurs passerelles.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schoolsMessagingList
                    .filter((s: any) => {
                      const matchesSearch = 
                        (s.nom || '').toLowerCase().includes(schoolMessagingSearch.toLowerCase()) ||
                        (s.email || '').toLowerCase().includes(schoolMessagingSearch.toLowerCase()) ||
                        (s.adresse || '').toLowerCase().includes(schoolMessagingSearch.toLowerCase());
                      
                      if (!matchesSearch) return false;
                      if (schoolMessagingFilter === 'custom') {
                        return Boolean(s.custom_smtp_enabled || s.custom_sms_enabled);
                      }
                      if (schoolMessagingFilter === 'default') {
                        return !s.custom_smtp_enabled && !s.custom_sms_enabled;
                      }
                      return true;
                    })
                    .map((school: any) => {
                      const hasCustomSmtp = Boolean(school.custom_smtp_enabled);
                      const hasCustomSms = Boolean(school.custom_sms_enabled);

                      return (
                        <div
                          key={school.id}
                          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          {/* School Identity */}
                          <div className="flex items-start gap-3.5 min-w-[240px]">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                              {school.nom?.charAt(0)?.toUpperCase() || 'E'}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 truncate">
                                {school.nom}
                              </h4>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {school.email || 'Aucun email'} {school.telephone ? `• ${school.telephone}` : ''}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-400">
                                <span>{school.adresse ? `${school.adresse}, ` : ''}{school.pays || 'Bénin'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Gateway Badges */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 lg:max-w-xl">
                            {/* SMTP Status */}
                            <div className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                              hasCustomSmtp
                                ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                  <Mail size={12} />
                                  <span>Serveur SMTP</span>
                                </span>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  hasCustomSmtp
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {hasCustomSmtp ? 'Personnalisé' : 'Par défaut'}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium truncate">
                                {hasCustomSmtp 
                                  ? `${school.smtp_host || 'Non spécifié'} (${school.smtp_user || ''})`
                                  : `Repli : ${messagingGlobalDefaults?.smtp?.host || 'smtp.gmail.com'}`}
                              </p>
                            </div>

                            {/* SMS Status */}
                            <div className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                              hasCustomSms
                                ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                                  <Smartphone size={12} />
                                  <span>Passerelle SMS</span>
                                </span>
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  hasCustomSms
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}>
                                  {hasCustomSms ? 'Personnalisé' : 'Par défaut'}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium truncate">
                                {hasCustomSms 
                                  ? `${school.sms_provider?.toUpperCase()} • Sender: ${school.sms_sender_id || 'MEGAFIXA'}`
                                  : `Repli : ${messagingGlobalDefaults?.sms?.provider?.toUpperCase() || 'Simulation'}`}
                              </p>
                            </div>
                          </div>

                          {/* Configure Button */}
                          <div className="shrink-0 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSchoolIdForMessaging(school.id);
                                setIsMessagingModalOpen(true);
                              }}
                              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <SlidersHorizontal size={14} />
                              <span>Configurer</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-8 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Clés API Système</h3>
                  <button className="text-xs font-bold text-indigo-600 hover:underline">Générer une nouvelle clé</button>
                </div>
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-900">API Key Back-office</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">sk_live_************************</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="p-2 text-slate-400 hover:text-slate-600"><Lock size={16} /></button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Politique de Sécurité</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Double Authentification (2FA)</p>
                      <p className="text-xs text-slate-500">Exiger le 2FA pour tous les super-administrateurs</p>
                    </div>
                    <button 
                      onClick={() => handleChange('require_2fa', settings.require_2fa === 'true' ? 'false' : 'true')}
                      className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        settings.require_2fa === 'true' ? "bg-indigo-600" : "bg-slate-300"
                      )}
                    >
                      <div className={cn(
                        "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                        settings.require_2fa === 'true' ? "right-0.5" : "left-0.5"
                      )} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="p-8 space-y-8">
              <div className="p-6 bg-rose-50 rounded-2xl border border-rose-100 flex items-start gap-4">
                <AlertCircle size={24} className="text-rose-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-rose-900">Mode Maintenance</h4>
                  <p className="text-xs text-rose-600 mt-1">Activer ce mode affichera une page d'attente à tous les utilisateurs. Seuls les super-admins pourront accéder au back-office.</p>
                  <button 
                    onClick={() => handleChange('maintenance_mode', settings.maintenance_mode === 'true' ? 'false' : 'true')}
                    className={cn(
                      "mt-4 px-4 py-2 text-white text-xs font-bold rounded-xl transition-all",
                      settings.maintenance_mode === 'true' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
                    )}
                  >
                    {settings.maintenance_mode === 'true' ? 'Désactiver la maintenance' : 'Activer la maintenance'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Ajouter / Modifier un Moyen de Paiement */}
      {isPaymentModalOpen && editingPayment && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1329] border border-slate-800 text-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {paymentMethods.some(p => p.id === editingPayment.id) ? 'Modifier le Moyen de Paiement' : 'Ajouter un Moyen de Paiement'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configurez les informations qui seront transmises à l'école pour effectuer son règlement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setEditingPayment(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Nom public */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Nom public du moyen <span className="text-amber-400">*</span></label>
                <input
                  type="text"
                  value={editingPayment.name || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, name: e.target.value })}
                  placeholder="Ex: MTN Mobile Money Bénin"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Type et Opérateur */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Type de canal</label>
                  <select
                    value={editingPayment.type || 'mobile_money'}
                    onChange={(e) => setEditingPayment({ ...editingPayment, type: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="mobile_money">Mobile Money</option>
                    <option value="card">Carte Bancaire (Visa / MasterCard)</option>
                    <option value="bank">Virement Bancaire</option>
                    <option value="online">Paiement en Ligne (Passerelle)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Opérateur / Provider</label>
                  <select
                    value={editingPayment.provider || 'MTN'}
                    onChange={(e) => setEditingPayment({ ...editingPayment, provider: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="MTN">MTN</option>
                    <option value="Moov">Moov</option>
                    <option value="Celtiis">Celtiis</option>
                    <option value="Visa / MasterCard">Visa / MasterCard</option>
                    <option value="Wave">Wave</option>
                    <option value="Orange">Orange</option>
                    <option value="FedaPay">FedaPay</option>
                    <option value="Kkiapay">Kkiapay</option>
                    <option value="Stripe">Stripe</option>
                    <option value="Banque">Banque</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>
              </div>

              {/* Numéro et Titulaire */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Numéro Marchand / RIB / Tél</label>
                  <input
                    type="text"
                    value={editingPayment.number || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, number: e.target.value })}
                    placeholder="Ex: (+229) 0161107918"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Titulaire du Compte</label>
                  <input
                    type="text"
                    value={editingPayment.owner || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, owner: e.target.value })}
                    placeholder="Ex: AnScolar Smart"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Lien direct URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Lien direct de paiement URL (Optionnel)</label>
                <input
                  type="url"
                  value={editingPayment.url || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, url: e.target.value })}
                  placeholder="https://checkout.fedapay.com/pay/..."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Code USSD */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Code USSD Rapide (Optionnel)</label>
                <input
                  type="text"
                  value={editingPayment.ussd || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, ussd: e.target.value })}
                  placeholder="*880*41*0161107918*MONTANT#"
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Consignes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Consignes d'envoi affichées à l'école</label>
                <textarea
                  rows={3}
                  value={editingPayment.instructions || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, instructions: e.target.value })}
                  placeholder="Ex: Envoyez le montant exact sur le numéro marchand via le menu MTN Momo ou en composant le code USSD rapide."
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Formules applicables */}
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-300 block">Formules applicables</label>
                <div className="flex flex-wrap gap-4">
                  {plans.map((p) => {
                    const checked = (editingPayment.formulas || []).includes(p.id);
                    return (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = editingPayment.formulas || [];
                            const updated = e.target.checked
                              ? [...current, p.id]
                              : current.filter((fid: string) => fid !== p.id);
                            setEditingPayment({ ...editingPayment, formulas: updated });
                          }}
                          className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 w-4 h-4"
                        />
                        <span>{p.name} ({p.id})</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Activer immédiatement */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={editingPayment.active !== false}
                    onChange={(e) => setEditingPayment({ ...editingPayment, active: e.target.checked })}
                    className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0 w-4 h-4"
                  />
                  <span className="font-bold">Activer immédiatement ce moyen de paiement</span>
                </label>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setEditingPayment(null);
                }}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={savePaymentMethod}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                <Check size={16} />
                <span>Enregistrer le moyen de paiement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Messaging Configuration Modal */}
      <SchoolMessagingModal
        schoolId={selectedSchoolIdForMessaging}
        isOpen={isMessagingModalOpen}
        onClose={() => {
          setIsMessagingModalOpen(false);
          setSelectedSchoolIdForMessaging(null);
        }}
        onUpdated={fetchSchoolsMessaging}
      />
    </div>
  );
}
