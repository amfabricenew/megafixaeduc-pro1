import React from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertCircle, 
  MoreVertical, 
  Search, 
  Filter,
  Calendar,
  ArrowRight,
  ExternalLink,
  Download,
  KeyRound,
  Plus,
  Send,
  FileText,
  Copy,
  CheckCheck,
  X,
  Sparkles
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SubscriptionsManagement() {
  const [activeTab, setActiveTab] = React.useState<'subscriptions' | 'licenses'>('subscriptions');
  const [subscriptions, setSubscriptions] = React.useState<any[]>([]);
  const [licenses, setLicenses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState<any>(null);
  const [searchTerm, setSearchTerm] = React.useState('');

  // Modals state
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [previewFicheHtml, setPreviewFicheHtml] = React.useState<string | null>(null);

  // New License Form State
  const [newLicForm, setNewLicForm] = React.useState({
    school_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    plan_name: 'Formule Excellence (Intégrale Pro)',
    amount: 150000,
    duration_days: 365,
    send_email: true
  });

  const fetchData = async () => {
    try {
      const [subsRes, statsRes, licRes] = await Promise.all([
        fetch('/api/super-admin/subscriptions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/super-admin/stats', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/super-admin/licenses', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (licRes.ok) setLicenses(await licRes.json());
    } catch (error) {
      console.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("Clé copiée !");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLicForm.school_name || !newLicForm.client_email) {
      toast.error("Veuillez renseigner le nom de l'école et l'email");
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/super-admin/licenses/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newLicForm)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de la génération");
      }

      toast.success(`Clé ${data.license_key} générée avec succès !`);
      setShowGenerateModal(false);
      setNewLicForm({
        school_name: '',
        client_name: '',
        client_email: '',
        client_phone: '',
        plan_name: 'Formule Excellence (Intégrale Pro)',
        amount: 150000,
        duration_days: 365,
        send_email: true
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleResendEmail = async (id: number, email: string) => {
    try {
      const res = await fetch(`/api/super-admin/licenses/${id}/resend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error);
      toast.success(data.message || `Fiche d'abonnement renvoyée à ${email}`);
    } catch (err: any) {
      toast.error(err.message || "Erreur de renvoi");
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.id?.toString().includes(searchTerm)
  );

  const filteredLicenses = licenses.filter(lic =>
    lic.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lic.license_key?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lic.client_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion des Abonnements & Licences</h1>
          <p className="text-slate-500">Suivez les souscriptions, générez des clés d'activation et gérez les fiches d'abonnement.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <Plus size={18} />
            <span>Générer une Clé d'Abonnement</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('subscriptions')}
          className={cn(
            "pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === 'subscriptions' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <CreditCard size={18} />
          <span>Abonnements des Écoles ({subscriptions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('licenses')}
          className={cn(
            "pb-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2",
            activeTab === 'licenses' 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-slate-500 hover:text-slate-800"
          )}
        >
          <KeyRound size={18} />
          <span>Clés d'Abonnement & Licences Émises ({licenses.length})</span>
        </button>
      </div>

      {/* Subscription Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Abonnements Actifs</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {subscriptions.filter(s => s.status === 'actif').length}
            </h3>
            <span className="text-xs font-bold text-emerald-600">+100%</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Clés Émises & Licences</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-indigo-600">
              {licenses.length}
            </h3>
            <span className="text-xs font-bold text-indigo-600">SaaS</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">En période d'essai</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {subscriptions.filter(s => s.status === 'essai').length}
            </h3>
            <span className="text-xs font-bold text-amber-600">14 jours</span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MRR estimé</p>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">
              {stats?.mrr?.toLocaleString() || '150 000'} FCFA
            </h3>
            <span className="text-xs font-bold text-emerald-600">+0%</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder={activeTab === 'subscriptions' ? "Rechercher une école ou un ID d'abonnement..." : "Rechercher par clé, école ou email..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* TAB 1: Subscriptions Table */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Client / École</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Prochaine Échéance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSubscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-900">{sub.school_name}</span>
                        <span className="text-[10px] text-slate-400 font-medium">ID: SUB-{sub.id.toString().padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase",
                        sub.plan?.toLowerCase().includes('excellence') || sub.plan?.toLowerCase().includes('premium') ? "bg-amber-50 text-amber-700 border border-amber-200" : 
                        sub.plan?.toLowerCase().includes('standard') ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-50 text-slate-600 border border-slate-200"
                      )}>
                        {sub.plan || 'Standard'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "w-2 h-2 rounded-full",
                          sub.status === 'actif' ? "bg-emerald-500" : 
                          sub.status === 'essai' ? "bg-amber-500" : "bg-rose-500"
                        )}></span>
                        <span className="text-xs font-bold text-slate-700 capitalize">
                          {sub.status === 'essai' ? 'Essai' : sub.status || 'Inconnu'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">
                      {sub.price ? `${sub.price.toLocaleString()} FCFA / ${sub.period}` : '75 000 FCFA / an'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Calendar size={14} className="text-slate-400" />
                        {sub.next_billing ? new Date(sub.next_billing).toLocaleDateString() : 'Non définie'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Licenses Table */}
      {activeTab === 'licenses' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Clé d'Abonnement</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Établissement & Client</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Formule</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statut & Échéance</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLicenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                      Aucune licence trouvée. Cliquez sur « Générer une Clé d'Abonnement » pour en émettre une.
                    </td>
                  </tr>
                ) : (
                  filteredLicenses.map((lic) => (
                    <tr key={lic.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <code className="px-2.5 py-1.5 bg-slate-900 text-amber-400 rounded-lg text-xs font-mono font-bold">
                            {lic.license_key}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopy(lic.license_key)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-all"
                            title="Copier la clé"
                          >
                            {copiedKey === lic.license_key ? <CheckCheck size={15} className="text-emerald-600" /> : <Copy size={15} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{lic.school_name || 'Établissement non assigné'}</span>
                          <span className="text-xs text-slate-500">{lic.client_name} ({lic.client_email})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {lic.plan_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {lic.amount ? `${lic.amount.toLocaleString()} ${lic.currency || 'FCFA'}` : '0 FCFA'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              lic.status === 'active' ? "bg-emerald-500" : "bg-slate-400"
                            )}></span>
                            <span className="font-bold text-slate-700 capitalize">{lic.status}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Expire le {lic.expires_at || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              window.open(`/api/subscriptions/fiche/${lic.license_key}`, '_blank');
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                            title="Consulter la Fiche d'Abonnement"
                          >
                            <FileText size={16} />
                            <span>Fiche</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResendEmail(lic.id, lic.client_email)}
                            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg text-xs font-bold transition-all"
                            title="Renvoyer par email"
                          >
                            <Send size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Generate License Key */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowGenerateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <KeyRound size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Émettre une Clé d'Abonnement</h3>
                <p className="text-xs text-slate-500">Crée une nouvelle licence et génère la fiche d'abonnement officielle.</p>
              </div>
            </div>

            <form onSubmit={handleGenerateLicense} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Nom de l'Établissement *</label>
                <input
                  type="text"
                  required
                  value={newLicForm.school_name}
                  onChange={(e) => setNewLicForm({ ...newLicForm, school_name: e.target.value })}
                  placeholder="ex: Complexe Scolaire Saint-Joseph"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Nom du Responsable</label>
                  <input
                    type="text"
                    value={newLicForm.client_name}
                    onChange={(e) => setNewLicForm({ ...newLicForm, client_name: e.target.value })}
                    placeholder="M. Koffi Mensah"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Email Client (Envoi Fiche) *</label>
                  <input
                    type="email"
                    required
                    value={newLicForm.client_email}
                    onChange={(e) => setNewLicForm({ ...newLicForm, client_email: e.target.value })}
                    placeholder="directeur@ecole.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Formule d'Abonnement</label>
                  <select
                    value={newLicForm.plan_name}
                    onChange={(e) => {
                      const val = e.target.value;
                      let amt = 150000;
                      if (val.includes('Starter')) amt = 25000;
                      else if (val.includes('Standard')) amt = 75000;
                      setNewLicForm({ ...newLicForm, plan_name: val, amount: amt });
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value="Formule Starter (Base)">Formule Starter (Base)</option>
                    <option value="Formule Académique (Standard)">Formule Académique (Standard)</option>
                    <option value="Formule Excellence (Intégrale Pro)">Formule Excellence (Intégrale Pro)</option>
                    <option value="Formule Premium Plus (Élite)">Formule Premium Plus (Élite)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase">Durée de Validité</label>
                  <select
                    value={newLicForm.duration_days}
                    onChange={(e) => setNewLicForm({ ...newLicForm, duration_days: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  >
                    <option value={30}>1 mois (30 jours)</option>
                    <option value={90}>3 mois (1 trimestre)</option>
                    <option value={365}>1 an (365 jours)</option>
                    <option value={730}>2 ans</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase">Montant Réglé (FCFA)</label>
                <input
                  type="number"
                  value={newLicForm.amount}
                  onChange={(e) => setNewLicForm({ ...newLicForm, amount: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="send_email"
                  checked={newLicForm.send_email}
                  onChange={(e) => setNewLicForm({ ...newLicForm, send_email: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <label htmlFor="send_email" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Envoyer immédiatement la <strong>Fiche d'Abonnement officielle</strong> avec le mot de félicitations et la clé par email
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={generating}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Émettre la Clé</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

