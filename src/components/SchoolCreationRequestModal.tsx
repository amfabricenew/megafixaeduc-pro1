import React, { useState, useEffect } from 'react';
import { 
  X, 
  School, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  CreditCard, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  ShieldCheck, 
  ArrowRight, 
  MessageSquare,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SchoolCreationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: string;
  defaultEmail?: string;
  defaultNom?: string;
}

export default function SchoolCreationRequestModal({
  isOpen,
  onClose,
  defaultPlan = 'PRO',
  defaultEmail = '',
  defaultNom = ''
}: SchoolCreationRequestModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // App & Payment config loaded from server
  const [config, setConfig] = useState<{
    app_name: string;
    currency: string;
    payment_methods: any[];
    plan_payment_links: any;
    plans: any[];
    support_contacts: {
      email: string;
      phone: string;
      whatsapp: string;
      delai_max: string;
    };
  }>({
    app_name: 'MégafixaEduc Pro',
    currency: 'FCFA',
    payment_methods: [],
    plan_payment_links: {},
    plans: [],
    support_contacts: {
      email: 'contact@megafixa.com',
      phone: '(+229) 0161107918',
      whatsapp: '+2290161107918',
      delai_max: '24H'
    }
  });

  // Step 1: Form state
  const [form, setForm] = useState({
    nom_ecole: '',
    type_etablissement: 'Maternelle & Primaire & Secondaire',
    pays: 'Bénin',
    ville: '',
    adresse: '',
    telephone_ecole: '',
    email_ecole: '',
    plan_souhaite: defaultPlan,
    demandeur_nom: defaultNom,
    demandeur_fonction: 'Directeur / Promoteur',
    demandeur_email: defaultEmail,
    demandeur_telephone: '',
    demandeur_whatsapp: '',
    sameAsPhone: true,
    notes: ''
  });

  // Created request state (after submission)
  const [createdRequest, setCreatedRequest] = useState<any | null>(null);

  // Step 2: Payment state
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Load config on mount or open
  useEffect(() => {
    if (isOpen) {
      fetch('/api/public/school-requests/config')
        .then(res => res.json())
        .then(data => {
          if (data && data.support_contacts) {
            setConfig(data);
            if (data.payment_methods && data.payment_methods.length > 0) {
              setSelectedMethodId(data.payment_methods[0].id);
            }
          }
        })
        .catch(err => console.warn('Could not load public school request config:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copié dans le presse-papier !`);
    setTimeout(() => setCopied(null), 2500);
  };

  // Get active price based on selected plan
  const getSelectedPlanDetails = () => {
    const p = config.plans.find(x => x.id === form.plan_souhaite);
    if (p) return p;
    if (form.plan_souhaite === 'DECOUVERTE') return { name: 'Formule Découverte', price: 0 };
    if (form.plan_souhaite === 'EXCELLENCE') return { name: 'Excellence Illimitée', price: 350000 };
    return { name: 'Formule Pro', price: 150000 };
  };

  const selectedPlanDetails = getSelectedPlanDetails();
  const selectedPaymentMethod = config.payment_methods.find(m => m.id === selectedMethodId) || config.payment_methods[0];

  // Submit Step 1: Create request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom_ecole.trim()) return toast.error("Veuillez saisir le nom de l'établissement.");
    if (!form.demandeur_nom.trim()) return toast.error("Veuillez saisir votre nom complet.");
    if (!form.demandeur_email.trim()) return toast.error("Veuillez saisir votre adresse email.");
    if (!form.demandeur_telephone.trim()) return toast.error("Veuillez renseigner votre numéro de téléphone.");

    setLoading(true);
    try {
      const whatsapp = form.sameAsPhone ? form.demandeur_telephone : (form.demandeur_whatsapp || form.demandeur_telephone);
      const res = await fetch('/api/public/school-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          demandeur_whatsapp: whatsapp,
          montant_estime: selectedPlanDetails.price
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de l'envoi de la demande");
      }

      setCreatedRequest(data.request);
      setPaymentPhone(form.demandeur_telephone);
      toast.success("Demande enregistrée ! Procédez au paiement Mobile Money.");
      setStep(2);
    } catch (err: any) {
      toast.error(err.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  // Submit Step 2: Confirm Mobile Money Payment
  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createdRequest) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch(`/api/public/school-requests/${createdRequest.reference}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: selectedPaymentMethod?.name || 'Mobile Money',
          payment_phone: paymentPhone || form.demandeur_telephone,
          payment_reference: paymentRef.trim() || `MOMO-${Date.now().toString(36).toUpperCase()}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Échec de la validation du paiement");
      }

      toast.success("Paiement signalé avec succès !");
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || "Erreur de validation");
    } finally {
      setSubmittingPayment(false);
    }
  };

  // WhatsApp quick contact URL with pre-filled message
  const getWhatsAppLink = (reference: string) => {
    const rawNumber = config.support_contacts.whatsapp.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Bonjour l'équipe ${config.app_name}, je vous contacte concernant ma demande de création de compte école pour « ${form.nom_ecole} » (Référence : ${reference}). Pouvez-vous vérifier mon dossier ? Merci !`
    );
    return `https://wa.me/${rawNumber}?text=${message}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto font-sans">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-white my-8 overflow-hidden">
        
        {/* Header with Steps */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-slate-800 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <School size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Adhésion Officielle
                </span>
                <span className="text-xs text-slate-400">Étape {step} sur 3</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                {step === 1 && "Demande de création de compte école"}
                {step === 2 && "Paiement Mobile Money"}
                {step === 3 && "Vérification en cours (Sous 24H)"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="w-full bg-slate-800 h-1.5 flex">
          <div className={`h-full bg-emerald-500 transition-all duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`} />
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto space-y-6">

          {/* ============================================================== */}
          {/* STEP 1: INFORMATIONS DE L'ÉCOLE ET DU DEMANDEUR */}
          {/* ============================================================== */}
          {step === 1 && (
            <form onSubmit={handleSubmitRequest} className="space-y-6">
              
              {/* Formule souhaitée banner */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Formule d'abonnement sélectionnée</p>
                    <p className="text-xs text-indigo-300">{selectedPlanDetails.name} • {selectedPlanDetails.price === 0 ? 'Gratuit' : `${Number(selectedPlanDetails.price).toLocaleString()} FCFA / an`}</p>
                  </div>
                </div>
                <select
                  value={form.plan_souhaite}
                  onChange={(e) => setForm({ ...form, plan_souhaite: e.target.value })}
                  className="px-3 py-1.5 bg-slate-900 border border-indigo-500/40 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400 font-semibold"
                >
                  <option value="PRO">Formule Pro (150 000 F)</option>
                  <option value="EXCELLENCE">Excellence Illimitée (350 000 F)</option>
                  <option value="DECOUVERTE">Découverte (Gratuit)</option>
                </select>
              </div>

              {/* Section 1: Informations de l'école */}
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <School size={15} className="text-indigo-400" />
                  <span>1. Informations sur l'Établissement Scolaire</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Nom complet de l'école <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.nom_ecole}
                      onChange={(e) => setForm({ ...form, nom_ecole: e.target.value })}
                      placeholder="ex: Complexe Scolaire Saint-Joseph, Groupe Scolaire ..."
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Type d'enseignement</label>
                    <select
                      value={form.type_etablissement}
                      onChange={(e) => setForm({ ...form, type_etablissement: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Maternelle & Primaire & Secondaire</option>
                      <option>Collège & Lycée Général</option>
                      <option>Lycée Technique & Professionnel</option>
                      <option>Enseignement Supérieur / Université</option>
                      <option>Primaire uniquement</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Pays de situation</label>
                    <select
                      value={form.pays}
                      onChange={(e) => setForm({ ...form, pays: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option>Bénin</option>
                      <option>Togo</option>
                      <option>Côte d'Ivoire</option>
                      <option>Sénégal</option>
                      <option>Cameroun</option>
                      <option>Burkina Faso</option>
                      <option>Mali</option>
                      <option>Niger</option>
                      <option>Autre pays</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Ville / Commune</label>
                    <input
                      type="text"
                      value={form.ville}
                      onChange={(e) => setForm({ ...form, ville: e.target.value })}
                      placeholder="ex: Cotonou, Lomé, Abidjan..."
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Quartier / Adresse physique</label>
                    <input
                      type="text"
                      value={form.adresse}
                      onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                      placeholder="ex: Quartier Akpakpa, Rue 125..."
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Téléphone officiel de l'école</label>
                    <input
                      type="text"
                      value={form.telephone_ecole}
                      onChange={(e) => setForm({ ...form, telephone_ecole: e.target.value })}
                      placeholder="(+229) 21 00 00 00"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Email officiel de l'école (optionnel)</label>
                    <input
                      type="email"
                      value={form.email_ecole}
                      onChange={(e) => setForm({ ...form, email_ecole: e.target.value })}
                      placeholder="contact@ecole.com"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Informations du demandeur */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <User size={15} className="text-emerald-400" />
                  <span>2. Informations Personnelles du Demandeur</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Nom et prénom(s) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.demandeur_nom}
                      onChange={(e) => setForm({ ...form, demandeur_nom: e.target.value })}
                      placeholder="ex: Dr. Mensah Koffi"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Fonction / Titre</label>
                    <select
                      value={form.demandeur_fonction}
                      onChange={(e) => setForm({ ...form, demandeur_fonction: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option>Fondateur / Promoteur</option>
                      <option>Directeur Général</option>
                      <option>Directeur des Études / Censeur</option>
                      <option>Administrateur Délégué</option>
                      <option>Secrétaire Général</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Adresse Email personnelle <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={form.demandeur_email}
                      onChange={(e) => setForm({ ...form, demandeur_email: e.target.value })}
                      placeholder="votre.email@gmail.com"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-slate-400">Vos identifiants administrateur vous seront transmis à cette adresse.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Numéro Téléphone direct <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={form.demandeur_telephone}
                      onChange={(e) => setForm({ ...form, demandeur_telephone: e.target.value })}
                      placeholder="(+229) 01 61 00 00"
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.sameAsPhone}
                        onChange={(e) => setForm({ ...form, sameAsPhone: e.target.checked })}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                      />
                      <span>Mon numéro WhatsApp est identique à mon numéro de téléphone</span>
                    </label>

                    {!form.sameAsPhone && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-300">Numéro WhatsApp spécifique</label>
                        <input
                          type="text"
                          value={form.demandeur_whatsapp}
                          onChange={(e) => setForm({ ...form, demandeur_whatsapp: e.target.value })}
                          placeholder="+229 01 61 00 00"
                          className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Notes ou besoins spécifiques (optionnel)</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Précisez ici toute information utile (effectif estimé d'élèves, filières particulières, etc.)..."
                      className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <span>Envoyer la demande & Payer</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ============================================================== */}
          {/* STEP 2: PAIEMENT MOBILE MONEY (CONFIGURÉ PAR LE SUPER ADMIN) */}
          {/* ============================================================== */}
          {step === 2 && createdRequest && (
            <div className="space-y-6">
              
              {/* Request Success Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <p className="font-bold text-emerald-300">
                    Demande enregistrée avec succès ! (Réf : <span className="font-mono">{createdRequest.reference}</span>)
                  </p>
                  <p className="text-slate-300 mt-1">
                    Pour valider l'initialisation de votre établissement <strong className="text-white">{form.nom_ecole}</strong>, effectuez votre règlement Mobile Money ci-dessous.
                  </p>
                </div>
              </div>

              {/* Amount to Pay */}
              <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">Montant d'adhésion</span>
                  <h3 className="text-2xl font-black text-white mt-0.5">
                    {selectedPlanDetails.price === 0 ? 'Gratuit (0 FCFA)' : `${Number(selectedPlanDetails.price).toLocaleString()} FCFA`}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Formule {selectedPlanDetails.name}</p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                  <Clock size={15} className="text-indigo-400" />
                  <span>Validation sous {config.support_contacts.delai_max}</span>
                </div>
              </div>

              {/* Payment Methods Selection */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Smartphone size={16} className="text-indigo-400" />
                  <span>Choisissez votre moyen Mobile Money :</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {config.payment_methods.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-start gap-3 ${
                        selectedMethodId === method.id
                          ? 'bg-indigo-600/15 border-indigo-500 shadow-md shadow-indigo-600/10'
                          : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800/80'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedMethodId === method.id ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}>
                        {method.type === 'mobile_money' ? <Smartphone size={16} /> : <CreditCard size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{method.name}</p>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{method.number || method.provider}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Method Details & Instructions */}
              {selectedPaymentMethod && (
                <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">{selectedPaymentMethod.name}</h4>
                      <p className="text-xs text-indigo-300">Bénéficiaire : {selectedPaymentMethod.owner || config.app_name}</p>
                    </div>
                    {selectedPaymentMethod.url && (
                      <a
                        href={selectedPaymentMethod.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                      >
                        <span>Payer en ligne</span>
                        <ExternalLink size={13} />
                      </a>
                    )}
                  </div>

                  {/* Merchant Number with Copy */}
                  {selectedPaymentMethod.number && (
                    <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-700 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Numéro Marchand / Réception</p>
                        <p className="text-sm sm:text-base font-black font-mono text-emerald-400 tracking-wide mt-0.5">
                          {selectedPaymentMethod.number}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedPaymentMethod.number, 'Numéro de paiement')}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 rounded-lg transition-colors shrink-0"
                      >
                        {copied === 'Numéro de paiement' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        <span>{copied === 'Numéro de paiement' ? 'Copié' : 'Copier'}</span>
                      </button>
                    </div>
                  )}

                  {/* USSD Code button if available */}
                  {selectedPaymentMethod.ussd && (
                    <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs">
                      <div className="text-amber-300">
                        <span className="font-bold">Code USSD direct :</span>{' '}
                        <span className="font-mono font-bold text-white">
                          {selectedPaymentMethod.ussd.replace('MONTANT', String(selectedPlanDetails.price))}
                        </span>
                      </div>
                      <a
                        href={`tel:${encodeURIComponent(selectedPaymentMethod.ussd.replace('MONTANT', String(selectedPlanDetails.price)))}`}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[11px] transition-colors shrink-0"
                      >
                        Composer
                      </a>
                    </div>
                  )}

                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    {selectedPaymentMethod.instructions || "Effectuez le transfert vers ce numéro avec la référence de votre dossier en description."}
                  </p>
                </div>
              )}

              {/* Confirmation Form */}
              <form onSubmit={handleConfirmPayment} className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>Confirmation de votre versement</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">Numéro de téléphone payeur</label>
                    <input
                      type="text"
                      required
                      value={paymentPhone}
                      onChange={(e) => setPaymentPhone(e.target.value)}
                      placeholder="Numéro utilisé pour le paiement"
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">ID / Référence de transaction (SMS reçu)</label>
                    <input
                      type="text"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="ex: TxId 12458902 ou MOMO-..."
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-xs font-bold text-slate-400 hover:text-white"
                  >
                    ← Modifier ma demande
                  </button>

                  <button
                    type="submit"
                    disabled={submittingPayment}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submittingPayment ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    ) : (
                      <>
                        <span>J'ai effectué le paiement</span>
                        <Check size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>

            </div>
          )}

          {/* ============================================================== */}
          {/* STEP 3: MESSAGE D'ATTENTE 24H AVEC CONTACTS DE L'ÉQUIPE */}
          {/* ============================================================== */}
          {step === 3 && createdRequest && (
            <div className="space-y-6 text-center py-4">
              
              {/* Big Animated Icon */}
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/20 animate-pulse">
                <Clock size={40} />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                  Dossier en cours de traitement
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Votre demande a été transmise avec succès !
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
                  Nos équipes techniques et pédagogiques procèdent aux vérifications réglementaires. Votre compte école sera configuré et vos accès administrateurs vous seront transmis <strong className="text-emerald-400">dans les 24 heures au plus</strong>.
                </p>
              </div>

              {/* Reference Card */}
              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-2xl max-w-md mx-auto flex items-center justify-between gap-3 text-left">
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Référence unique de dossier</p>
                  <p className="text-base font-mono font-bold text-indigo-400 mt-0.5">{createdRequest.reference}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{form.nom_ecole} • {selectedPlanDetails.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdRequest.reference, 'Référence de dossier')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs font-bold text-white rounded-xl transition-colors shrink-0"
                >
                  {copied === 'Référence de dossier' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copied === 'Référence de dossier' ? 'Copié' : 'Copier'}</span>
                </button>
              </div>

              {/* Support Contacts Section */}
              <div className="p-6 bg-gradient-to-b from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl text-left space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Besoin d'informations ou d'assistance immédiate ?</h4>
                    <p className="text-xs text-slate-400">Contactez directement notre équipe d'assistance MégafixaEduc Pro :</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {/* WhatsApp */}
                  <a
                    href={getWhatsAppLink(createdRequest.reference)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 hover:border-emerald-500 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <MessageSquare size={18} />
                    </div>
                    <span className="text-xs font-black text-white">WhatsApp Direct</span>
                    <span className="text-[11px] text-emerald-300 font-mono">{config.support_contacts.whatsapp}</span>
                  </a>

                  {/* Telephone */}
                  <a
                    href={`tel:${config.support_contacts.phone.replace(/[^0-9+]/g, '')}`}
                    className="p-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Phone size={18} />
                    </div>
                    <span className="text-xs font-black text-white">Appel Téléphonique</span>
                    <span className="text-[11px] text-indigo-300 font-mono">{config.support_contacts.phone}</span>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:${config.support_contacts.email}?subject=Demande%20de%20compte%20école%20${createdRequest.reference}`}
                    className="p-3.5 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition-all group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                      <Mail size={18} />
                    </div>
                    <span className="text-xs font-black text-white">Courrier Email</span>
                    <span className="text-[11px] text-slate-300 truncate max-w-[150px]">{config.support_contacts.email}</span>
                  </a>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Fermer cette fenêtre
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
