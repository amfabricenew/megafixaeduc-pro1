import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  CreditCard, 
  Smartphone, 
  Landmark, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Copy, 
  Check, 
  Sparkles, 
  Crown, 
  Mail, 
  Building2, 
  User, 
  Phone, 
  Lock, 
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  Award,
  Zap,
  HelpCircle,
  Download,
  FileText,
  X,
  XCircle,
  AlertOctagon,
  Clock,
  Radio
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../utils/api';
import { useTranslation } from '../contexts/TranslationContext';
import { LanguageSelector } from '../components/LanguageSelector';
import logoOfficial from '../LOGO_MEGFIXAEDEUC_PRO.png';

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  provider: string;
  number: string;
  owner: string;
  url: string;
  ussd: string;
  instructions: string;
  active: boolean;
}

interface PlanInfo {
  id: string;
  name: string;
  price: number;
  period: string;
  student_limit: string | number;
  description: string;
  features: string[];
  is_recommended?: boolean;
}

export default function SubscriptionPayment() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // Search parameters
  const params = new URLSearchParams(location.search);
  const initialPlanId = params.get('plan') || 'standard';
  const initialSchoolName = params.get('schoolName') || params.get('school') || '';
  const initialEmail = params.get('email') || '';
  const initialAdminNom = params.get('adminNom') || params.get('nom') || '';
  const initialPhone = params.get('phone') || '';

  // Form states
  const locationState = (location.state as any) || {};
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId);
  const [selectedModality, setSelectedModality] = useState<'annuel' | 'semestriel' | 'trimestriel' | 'mensuel'>('annuel');
  const [schoolName, setSchoolName] = useState(initialSchoolName);
  const [adminNom, setAdminNom] = useState(initialAdminNom);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [password, setPassword] = useState(locationState.password || '');
  const [showPassword, setShowPassword] = useState(false);

  // Config data from backend
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Email uniqueness validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Failure handling states
  const [failureReason, setFailureReason] = useState<string | null>(null);
  const [failureCode, setFailureCode] = useState<'insufficient_funds' | 'non_confirmation' | 'general' | null>(null);
  const [countdown, setCountdown] = useState(120);

  // Transaction execution states
  const [step, setStep] = useState<'info' | 'payment' | 'ussd_wait' | 'success' | 'failed'>('info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [txReference, setTxReference] = useState<string | null>(null);
  const [txDetails, setTxDetails] = useState<any>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [ficheHtml, setFicheHtml] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Payer details modal states (Mobile Money & Card)
  const [showPayerModal, setShowPayerModal] = useState(false);
  const [payerFullName, setPayerFullName] = useState(initialAdminNom || '');
  const [payerEmail, setPayerEmail] = useState(initialEmail || '');
  const [payerOperator, setPayerOperator] = useState('MTN');
  const [payerPhoneNumber, setPayerPhoneNumber] = useState(initialPhone || '');

  // Card specific state
  const [cardHolder, setCardHolder] = useState(initialAdminNom || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardBrand, setCardBrand] = useState<'visa' | 'mastercard' | 'cb'>('cb');

  // Load configured payment methods from Super Admin settings
  useEffect(() => {
    let isMounted = true;
    const fetchMethods = async () => {
      try {
        setLoadingConfig(true);
        const res = await apiFetch('/api/public/subscription-payment-methods');
        const data = await res.json();

        if (isMounted && data.success) {
          if (data.plans && data.plans.length > 0) {
            setPlans(data.plans);
          }
          if (data.paymentMethods && data.paymentMethods.length > 0) {
            setPaymentMethods(data.paymentMethods);
            // Default select the first active method
            setSelectedMethodId(data.paymentMethods[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic payment methods, using defaults:", err);
      } finally {
        if (isMounted) setLoadingConfig(false);
      }
    };

    fetchMethods();
    return () => { isMounted = false; };
  }, []);

  // Selected plan calculation
  const currentPlan = plans.find(p => p.id.toLowerCase() === selectedPlanId.toLowerCase()) || {
    id: selectedPlanId,
    name: selectedPlanId === 'starter' ? 'Starter' : selectedPlanId === 'excellence' ? 'Excellence' : 'Standard',
    price: selectedPlanId === 'starter' ? 25000 : selectedPlanId === 'excellence' ? 150000 : 75000,
    period: selectedPlanId === 'starter' ? 'trimestre' : 'an',
    student_limit: selectedPlanId === 'starter' ? 300 : selectedPlanId === 'excellence' ? 'Illimité' : 1000,
    description: "Formule tout-en-un pour la gestion informatisée de l'établissement",
    features: [
      'Gestion des notes et calcul des moyennes',
      'Bulletins et fiches élèves numérisées',
      'Accès Espace Parents et Enseignants'
    ]
  };

  // Helper to calculate pricing, 45% initial payment and installment schedule for each modality
  const getModalityDetails = (planId: string, modality: 'annuel' | 'semestriel' | 'trimestriel' | 'mensuel') => {
    const pId = planId.toLowerCase();
    
    // Base annual price of the subscription plan
    const totalPlanPrice = pId === 'starter' ? 80000 : pId === 'excellence' ? 150000 : 75000;
    const isUnique = modality === 'annuel';
    const initialPercentage = isUnique ? 100 : 45;
    const initialAmount = isUnique ? totalPlanPrice : Math.round(totalPlanPrice * 0.45);
    const remainingPercentage = isUnique ? 0 : 55;
    const remainingAmount = totalPlanPrice - initialAmount;

    let name = 'Annuel (Paiement unique)';
    let periodText = '/ an (Paiement unique)';
    let durationText = '1 an (365 jours)';
    let discountBadge: string | null = '-25% Réduction';
    let badge = 'Paiement Unique (100%)';
    let subtext = "1 seul règlement pour toute l'année scolaire (sans mensualités ultérieures)";
    let remainingScheduleText = "Aucun solde restant - Formule intégralement soldée";
    let installments: Array<{ title: string; percentage: number; amount: number; dueText: string; isPaidNow: boolean }> = [];

    if (modality === 'annuel') {
      name = 'Annuel (Paiement unique)';
      periodText = '/ an (Paiement unique)';
      durationText = '1 an (365 jours)';
      discountBadge = pId === 'starter' ? '-20% Réduction' : pId === 'excellence' ? '-22% Économie' : '-26% Économie';
      badge = 'Paiement Unique (100%)';
      subtext = `Règlement intégral de ${totalPlanPrice.toLocaleString('fr-FR')} FCFA à la souscription sans solde ultérieur`;
      remainingScheduleText = "Aucun solde restant - Licence annuelle acquittée intégralement à 100%";
      installments = [
        {
          title: "Règlement unique intégral (100%)",
          percentage: 100,
          amount: totalPlanPrice,
          dueText: "À la création du compte école (aujourd'hui)",
          isPaidNow: true
        }
      ];
    } else if (modality === 'semestriel') {
      name = 'Semestriel (2 tranches)';
      periodText = ' (Acompte 45% + Solde 55%)';
      durationText = 'Couverture annuelle (2 tranches de 6 mois)';
      discountBadge = '-15% Économie';
      badge = 'Acompte Initial de 45%';
      subtext = `45% (${initialAmount.toLocaleString('fr-FR')} FCFA) à la création, puis 55% (${remainingAmount.toLocaleString('fr-FR')} FCFA) au 2nd semestre`;
      remainingScheduleText = `2ème tranche de 55% (${remainingAmount.toLocaleString('fr-FR')} FCFA) exigible au début du 2ème semestre (à 6 mois)`;
      installments = [
        {
          title: "1ère tranche - Acompte initial obligatoire (45%)",
          percentage: 45,
          amount: initialAmount,
          dueText: "À la création du compte école (aujourd'hui)",
          isPaidNow: true
        },
        {
          title: "2ème tranche - Solde semestriel (55%)",
          percentage: 55,
          amount: remainingAmount,
          dueText: "Au début du 2ème semestre (dans 6 mois)",
          isPaidNow: false
        }
      ];
    } else if (modality === 'trimestriel') {
      name = 'Trimestriel (3 échéances)';
      periodText = ' (Acompte 45% + 2 trimestres)';
      durationText = 'Couverture annuelle (3 échéances trimestrielles)';
      discountBadge = null;
      badge = 'Acompte Initial de 45%';
      const t2Amount = Math.round(totalPlanPrice * 0.275);
      const t3Amount = remainingAmount - t2Amount;
      subtext = `45% (${initialAmount.toLocaleString('fr-FR')} FCFA) à la création, puis 27,5% au T2 et 27,5% au T3`;
      remainingScheduleText = `Solde de 55% réparti en 2 trimestres : T2 de ${t2Amount.toLocaleString('fr-FR')} FCFA (dans 3 mois) et T3 de ${t3Amount.toLocaleString('fr-FR')} FCFA (dans 6 mois)`;
      installments = [
        {
          title: "1er versement - Acompte initial obligatoire (45%)",
          percentage: 45,
          amount: initialAmount,
          dueText: "À la création du compte école (aujourd'hui)",
          isPaidNow: true
        },
        {
          title: "2ème versement - Trimestre 2 (27,5%)",
          percentage: 27.5,
          amount: t2Amount,
          dueText: "Au début du 2ème trimestre (dans 3 mois)",
          isPaidNow: false
        },
        {
          title: "3ème versement - Trimestre 3 (27,5%)",
          percentage: 27.5,
          amount: t3Amount,
          dueText: "Au début du 3ème trimestre (dans 6 mois)",
          isPaidNow: false
        }
      ];
    } else {
      // Mensuel
      name = 'Mensuel (Échéancier)';
      periodText = ' (Acompte 45% + Mensualités)';
      durationText = 'Couverture annuelle (Échéancier mensualisé)';
      discountBadge = null;
      badge = 'Acompte Initial de 45%';
      const monthlyCount = 8;
      const monthlyAmount = Math.round(remainingAmount / monthlyCount);
      subtext = `45% (${initialAmount.toLocaleString('fr-FR')} FCFA) à la création, puis 8 mensualités de ~${monthlyAmount.toLocaleString('fr-FR')} FCFA`;
      remainingScheduleText = `Solde de 55% (${remainingAmount.toLocaleString('fr-FR')} FCFA) lissé sur 8 mensualités scolaires (~${monthlyAmount.toLocaleString('fr-FR')} FCFA/mois)`;
      installments = [
        {
          title: "1er versement - Acompte initial obligatoire (45%)",
          percentage: 45,
          amount: initialAmount,
          dueText: "À la création du compte école (aujourd'hui)",
          isPaidNow: true
        },
        {
          title: "8 mensualités suivantes pour le solde (55%)",
          percentage: 55,
          amount: remainingAmount,
          dueText: `8 prélèvements mensuels de ${monthlyAmount.toLocaleString('fr-FR')} FCFA/mois`,
          isPaidNow: false
        }
      ];
    }

    return {
      id: modality,
      name,
      isUnique,
      totalPlanPrice,
      initialPercentage,
      initialAmount, // Amount required to be paid today at account creation
      remainingPercentage,
      remainingAmount,
      remainingScheduleText,
      installments,
      periodText,
      durationText,
      discountBadge,
      badge,
      subtext
    };
  };

  const currentModality = getModalityDetails(selectedPlanId, selectedModality);
  // Final amount payable TODAY: 100% for unique, 45% for all other modalities
  const finalPrice = currentModality.initialAmount;

  const selectedMethod = paymentMethods.find(m => m.id === selectedMethodId) || paymentMethods[0];

  // Timer for USSD waiting step: auto-timeout to failure if not confirmed
  useEffect(() => {
    let timer: any = null;
    if (step === 'ussd_wait' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // If timer runs out without user confirmation, interrupt and fail
            handleTriggerPaymentFailure('non_confirmation', "Délai d'attente USSD expiré. La demande de débit n'a pas été confirmée.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const notice = "momentanément indisponible, les créations de compte sont temporairement suspendues. Veuillez contacter l'administration.";
    setEmailError(notice);
    toast.error(notice);
    return;
  };

  const handleProceedToPaymentOld = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim()) {
      toast.error("Veuillez renseigner le nom de l'établissement scolaire.");
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error("Veuillez renseigner une adresse email valide pour recevoir la clé.");
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error("Veuillez définir un mot de passe administrateur d'au moins 6 caractères pour votre compte école.");
      return;
    }
    if (!adminNom.trim()) {
      toast.error("Veuillez renseigner le nom du responsable ou directeur.");
      return;
    }

    // Règle stricte : Une adresse email ne peut être associée qu'à un seul compte école
    setIsCheckingEmail(true);
    try {
      const checkRes = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const checkData = await checkRes.json();
      if (!checkData.available) {
        const errorMsg = checkData.message || "Cette adresse email est déjà associée à un compte école existant. Une adresse email ne peut être associée qu'à un seul compte école.";
        setEmailError(errorMsg);
        toast.error(errorMsg);
        setIsCheckingEmail(false);
        return;
      }
      setEmailError(null);
    } catch (err) {
      console.warn("Could not check email availability:", err);
    } finally {
      setIsCheckingEmail(false);
    }

    setStep('payment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep payer details in sync with school info
  useEffect(() => {
    if (adminNom && !payerFullName) setPayerFullName(adminNom);
    if (email && !payerEmail) setPayerEmail(email);
    if (phone && !payerPhoneNumber) setPayerPhoneNumber(phone);
    if (adminNom && !cardHolder) setCardHolder(adminNom);
  }, [adminNom, email, phone]);

  const handleSelectMethod = (method: PaymentMethod) => {
    setSelectedMethodId(method.id);
    if (method.type === 'card' || method.id.includes('card')) {
      if (method.id.includes('visa')) setCardBrand('visa');
      else if (method.id.includes('mastercard')) setCardBrand('mastercard');
    } else if (method.provider) {
      const prov = method.provider.toUpperCase();
      if (['MTN', 'MOOV', 'CELTIIS', 'ORANGE', 'WAVE'].includes(prov)) {
        setPayerOperator(prov);
      }
    }
    // Automatically open the payer info modal after choosing payment method
    setShowPayerModal(true);
  };

  const handleCardNumberInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
    if (raw.startsWith('4')) {
      setCardBrand('visa');
    } else if (/^(5[1-5]|2[2-7])/.test(raw)) {
      setCardBrand('mastercard');
    } else {
      setCardBrand('cb');
    }
  };

  const handleCardExpInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      setCardExp(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExp(raw);
    }
  };

  const handleCardCvcInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    setCardCvc(raw);
  };

  // Initiate transaction
  const handleInitiatePayment = async (isTestMode = false, overrideData?: any) => {
    setIsProcessing(true);
    setEmailError(null);
    try {
      const isCard = (selectedMethod?.type === 'card' || selectedMethod?.id?.includes('card') || overrideData?.paymentMethodType === 'card');
      const effectiveOperator = isTestMode ? 'TEST' : (isCard ? (cardBrand || 'CARTE').toUpperCase() : (overrideData?.operator || payerOperator || selectedMethod?.provider || 'MTN'));
      const effectivePayerName = (overrideData?.payerName || (isCard ? cardHolder : payerFullName) || adminNom || '').trim();
      const effectivePhone = (overrideData?.payerPhone || (isCard ? 'CARTE' : payerPhoneNumber) || phone || '01000000').trim();
      const effectivePayerEmail = (overrideData?.payerEmail || payerEmail || email || '').trim().toLowerCase();

      const payload = {
        schoolName: schoolName.trim(),
        adminNom: adminNom.trim(),
        email: email.trim().toLowerCase(),
        password: password || 'Admin@2026',
        planId: currentPlan.id,
        planName: currentPlan.name,
        amount: finalPrice, // Amount payable today (45% for non-unique, 100% for unique)
        totalPlanAmount: currentModality.totalPlanPrice,
        initialPercentage: currentModality.initialPercentage,
        initialAmount: currentModality.initialAmount,
        remainingPercentage: currentModality.remainingPercentage,
        remainingAmount: currentModality.remainingAmount,
        modalityName: currentModality.name,
        remainingSchedule: currentModality.remainingScheduleText,
        billingCycle: selectedModality,
        modalite: selectedModality,
        paymentMethodId: selectedMethod?.id || (isCard ? 'card' : 'momo'),
        paymentMethodType: isCard ? 'card' : 'mobile_money',
        operator: effectiveOperator,
        payerName: effectivePayerName,
        payerPhone: effectivePhone,
        payerEmail: effectivePayerEmail,
        cardNumber: isCard ? (overrideData?.cardNumber || cardNumber).replace(/\s/g, '') : undefined,
        cardExp: isCard ? (overrideData?.cardExp || cardExp) : undefined,
        cardCvc: isCard ? (overrideData?.cardCvc || cardCvc) : undefined,
        cardBrand: isCard ? (overrideData?.cardBrand || cardBrand.toUpperCase()) : undefined,
        isTest: isTestMode
      };

      const initRes = await apiFetch('/api/payments/mobile-money/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const initData = await initRes.json();

      if (!initRes.ok || !initData.success) {
        if (initData.code === 'EMAIL_ALREADY_EXISTS') {
          setEmailError(initData.error);
        }
        throw new Error(initData.error || "Impossible d'initialiser le paiement.");
      }

      setTxReference(initData.reference);
      setTxDetails({
        ...initData,
        payerPhone: effectivePhone,
        payerName: effectivePayerName,
        operator: effectiveOperator,
        isCard
      });
      setShowPayerModal(false);

      if (isCard) {
        // Direct validation for Card
        await handleConfirmSuccessfulPayment(initData.reference);
      } else {
        // Mobile Money: switch to USSD prompt waiting step
        setCountdown(120);
        setStep('ussd_wait');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        toast.success("Demande transmise : ce numéro recevra la demande de confirmation (prompt USSD) pour valider le débit.");
      }

    } catch (err: any) {
      console.error("Payment initiation error:", err);
      toast.error(err.message || "Échec de l'opération de paiement.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm payment when USSD is approved by the user
  const handleConfirmSuccessfulPayment = async (refToConfirm?: string) => {
    const ref = refToConfirm || txReference;
    if (!ref) {
      toast.error("Référence de transaction introuvable.");
      return;
    }
    setIsProcessing(true);
    try {
      const confirmRes = await apiFetch('/api/payments/mobile-money/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref })
      });
      const confirmData = await confirmRes.json();

      if (!confirmRes.ok || !confirmData.success) {
        if (confirmData.code === 'EMAIL_ALREADY_EXISTS') {
          setEmailError(confirmData.error);
          setFailureCode('general');
          setFailureReason(confirmData.error);
          setStep('failed');
          return;
        }
        throw new Error(confirmData.error || "Erreur lors de la validation du paiement.");
      }

      setLicenseKey(confirmData.license_key);
      setFicheHtml(confirmData.fiche_html);
      setStep('success');
      toast.success("Paiement validé avec succès ! Votre compte école a été créé et activé.");
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (err: any) {
      console.error("Payment confirmation error:", err);
      setFailureReason(err.message || "Échec de paiement : la transaction a été rejetée ou non confirmée.");
      setFailureCode('general');
      setStep('failed');
      toast.error(err.message || "Échec de paiement : création du compte interrompue.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle and report payment failure (Fonds insuffisants, Non confirmation, Rejet)
  const handleTriggerPaymentFailure = async (code: 'insufficient_funds' | 'non_confirmation' | 'general', customReason?: string) => {
    setIsProcessing(true);
    const ref = txReference;
    try {
      if (ref) {
        await apiFetch('/api/payments/mobile-money/fail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: ref,
            failure_code: code,
            reason: customReason
          })
        });
      }
    } catch (e) {
      console.warn("Could not register failure with backend:", e);
    } finally {
      setIsProcessing(false);
      setFailureCode(code);
      setFailureReason(
        code === 'insufficient_funds'
          ? "Fonds insuffisants sur le compte de paiement Mobile Money."
          : code === 'non_confirmation'
            ? "Non-confirmation de la demande de débit (prompt USSD) sur le téléphone."
            : (customReason || "Opération non validée par l'opérateur.")
      );
      setStep('failed');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toast.error("Échec de paiement : l'opération de création du compte école a été interrompue.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success("Clé d'abonnement copiée dans le presse-papier !");
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-primary-500 selection:text-white">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img 
              src={logoOfficial} 
              alt="Logo MégafixaEduc Pro" 
              className="w-12 h-12 object-contain rounded-xl shadow-xs" 
            />
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight block">
                Mégafixa<span className="text-primary-600">Educ</span> <span className="text-amber-500 font-extrabold text-sm uppercase">Pro</span>
              </span>
              <span className="text-[11px] text-slate-400 font-semibold block -mt-1">
                Portail Officiel de Souscription & Règlement
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <ShieldCheck size={16} />
              <span>{t("Paiement 100% Sécurisé & Certifié")}</span>
            </div>
            <Link
              to="/login"
              className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              {t("Déjà un compte ? Se connecter")}
            </Link>
            <LanguageSelector variant="pill" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        {/* Breadcrumb Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xs font-bold uppercase tracking-wider">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step === 'info' ? 'bg-primary-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
              <span>1. Plan & École</span>
            </div>
            <ArrowRight size={14} className="text-slate-400" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step === 'payment' ? 'bg-primary-600 text-white' : step === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
              <span>2. Règlement Sécurisé</span>
            </div>
            <ArrowRight size={14} className="text-slate-400" />
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${step === 'success' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
              <span>3. Clé & Activation</span>
            </div>
          </div>
        </div>

        {/* ================= STEP 1: Plan & School Info ================= */}
        {step === 'info' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Form Info */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                Informations de votre Établissement
              </h1>
              <p className="text-xs text-slate-500 mb-6">
                Renseignez ces détails. Votre clé d'activation officielle et votre reçu de conformité y seront rattachés et envoyés.
              </p>

              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-medium flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="font-bold text-amber-950 text-sm">momentanément indisponible</p>
                  <p>Les créations de compte sont temporairement suspendues. Veuillez contacter l'administration pour toute demande d'accès.</p>
                </div>
              </div>

              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nom Officiel de l'École / Complexe Scolaire *
                  </label>
                  <div className="relative">
                    <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Complexe Scolaire d'Excellence La Victoire"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nom & Prénom du Responsable *
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Ex: Dr. Martin KOFFI"
                        value={adminNom}
                        onChange={(e) => setAdminNom(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Téléphone de Contact / Mobile Money
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="Ex: (+229) 01 61 10 79"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Adresse Email Officielle (Réception Clé d'Activation) *
                  </label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="direction@mon-ecole.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError(null);
                      }}
                      onBlur={async () => {
                        if (email.trim() && email.includes('@')) {
                          try {
                            const res = await apiFetch(`/api/auth/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
                            const data = await res.json();
                            if (!data.available) {
                              setEmailError(data.message || "Cette adresse email est déjà associée à un compte école existant. Une adresse email ne peut être associée qu'à un seul compte école.");
                            } else {
                              setEmailError(null);
                            }
                          } catch (err) {}
                        }
                      }}
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 ${
                        emailError 
                          ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-rose-500' 
                          : 'border-slate-300 focus:ring-primary-500'
                      }`}
                    />
                  </div>
                  {emailError ? (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl mt-2 flex items-start gap-2 text-xs text-rose-800 animate-shake">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">{emailError}</p>
                        <p className="text-[11px] text-rose-600 mt-0.5">
                          Règle : une adresse email ne peut être associée qu'à un seul compte école. Si vous avez déjà un compte, connectez-vous directement.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 font-medium mt-1 flex items-center gap-1">
                      <Sparkles size={12} />
                      Une adresse email ne peut être associée qu'à un seul compte école. Votre clé d'activation officielle y sera transmise.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mot de passe Administrateur de l'École *
                  </label>
                  <div className="relative">
                    <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      placeholder="Créer un mot de passe sécurisé (min. 6 caractères)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Ce mot de passe et votre adresse email ci-dessus seront vos identifiants autorisés pour vous connecter à votre compte école après activation manuelle de votre clé.
                  </p>
                </div>

                {/* Plan selector pills */}
                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    1. Sélectionnez la Formule d'Abonnement Souhaitée :
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { id: 'starter', name: 'Starter', price: '25 000 FCFA', cycle: 'Entrée de gamme' },
                      { id: 'standard', name: 'Standard', price: '75 000 FCFA', cycle: 'Le plus populaire', rec: true },
                      { id: 'excellence', name: 'Excellence', price: '150 000 FCFA', cycle: 'Intégrale & IA' }
                    ].map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedPlanId(p.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all relative ${
                          selectedPlanId.toLowerCase() === p.id
                            ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        {p.rec && (
                          <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs">
                            Recommandé
                          </span>
                        )}
                        <span className="block font-black text-sm text-slate-900">{p.name}</span>
                        <span className="block font-extrabold text-primary-700 text-xs mt-1">{p.price}</span>
                        <span className="block text-[10px] text-slate-400 font-medium">{p.cycle}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Modalities Selector (Annuel paiement unique, Semestriel, Trimestriel, Mensuel) */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      2. Modalité de Règlement Souhaitée :
                    </label>
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {currentModality.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {(['annuel', 'semestriel', 'trimestriel', 'mensuel'] as const).map((mod) => {
                      const details = getModalityDetails(selectedPlanId, mod);
                      const isSelected = selectedModality === mod;

                      return (
                        <button
                          key={mod}
                          type="button"
                          onClick={() => setSelectedModality(mod)}
                          className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-500/30 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span className={`absolute -top-2.5 right-2 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-xs ${
                            details.isUnique ? 'bg-primary-600' : 'bg-amber-600'
                          }`}>
                            {details.badge}
                          </span>

                          <div>
                            <span className="block font-black text-xs text-slate-900">{details.name}</span>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mt-1">
                              {details.isUnique ? 'Montant à payer aujourd\'hui :' : 'Acompte 45% à la création :'}
                            </span>
                            <span className="block font-black text-base text-emerald-700">
                              {details.initialAmount.toLocaleString('fr-FR')} FCFA
                            </span>

                            <div className="mt-1 pt-1 border-t border-slate-200/60 text-[10px] space-y-0.5">
                              <span className="block text-slate-500 font-semibold">
                                Total formule : <strong>{details.totalPlanPrice.toLocaleString('fr-FR')} FCFA</strong>
                              </span>
                              {!details.isUnique && (
                                <span className="block text-amber-700 font-bold">
                                  Solde 55% : {details.remainingAmount.toLocaleString('fr-FR')} FCFA
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="block text-[9px] text-slate-500 mt-2 leading-tight">
                            {details.subtext}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to="/#tarifs"
                    className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft size={16} />
                    Retour aux tarifs
                  </Link>

                  <button
                    type="submit"
                    disabled={isCheckingEmail || !!emailError}
                    className="px-6 py-3.5 bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary-600/30 flex items-center gap-2 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
                  >
                    {isCheckingEmail ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Vérification de l'email...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuer vers le Paiement ({Number(finalPrice).toLocaleString('fr-FR')} FCFA)</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Plan Summary Card */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary-400">
                    Récapitulatif de Commande
                  </span>
                  <span className="text-xs font-extrabold bg-primary-500/20 text-primary-300 px-2.5 py-1 rounded-full border border-primary-500/30">
                    {currentPlan.name}
                  </span>
                </div>

                {/* Financial breakdown */}
                <div className="mb-5 space-y-2">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Modalité : {currentModality.name}
                  </div>

                  <div className="p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>Total annuel de la formule :</span>
                      <strong className="text-white">{currentModality.totalPlanPrice.toLocaleString('fr-FR')} FCFA</strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-emerald-400 border-t border-slate-700/60 pt-2">
                      <span className="font-extrabold">
                        {currentModality.isUnique ? 'Règlement unique (100%) :' : 'Acompte initial de 45% à la création :'}
                      </span>
                      <strong className="text-base font-black text-emerald-400">
                        {Number(finalPrice).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>

                    {!currentModality.isUnique && (
                      <div className="border-t border-slate-700/60 pt-2 text-[11px] text-amber-300 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Solde restant dû (55%) :</span>
                          <strong className="text-amber-300">{currentModality.remainingAmount.toLocaleString('fr-FR')} FCFA</strong>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight">
                          📅 {currentModality.remainingScheduleText}
                        </p>
                      </div>
                    )}
                  </div>

                  <span className="text-xs text-slate-400 font-medium block">
                    Validité de la licence : <strong>{currentModality.durationText}</strong>
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Inclus dans votre formule :</p>
                  {(currentPlan.features || []).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 text-xs text-slate-300 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck size={16} />
                  <span>Activation Immédiate dès l'Acompte de 45%</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  La clé d'activation officielle du compte école et tous les modules de votre formule sont déverrouillés dès la confirmation de votre paiement initial de 45% (ou 100% en règlement unique).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: Payment Execution ================= */}
        {step === 'payment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Select configured payment methods */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    Moyens de Paiement Autorisés
                  </h2>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Configuration Super Admin Active
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-6">
                  Sélectionnez votre moyen de paiement configuré par notre administration centrale.
                </p>

                {/* Methods List */}
                <div className="space-y-3 mb-6">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedMethodId === method.id;
                    const isMoMo = method.type === 'mobile_money';
                    const isCard = method.type === 'card' || method.type === 'online';
                    const isBank = method.type === 'bank';

                    return (
                      <div
                        key={method.id}
                        onClick={() => handleSelectMethod(method)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3.5 ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/50 shadow-sm ring-2 ring-primary-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          isMoMo ? 'bg-amber-100 text-amber-700' : isCard ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {isMoMo && <Smartphone size={20} />}
                          {isCard && <CreditCard size={20} />}
                          {isBank && <Landmark size={20} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-slate-900 truncate">
                              {method.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isSelected ? (
                                <div className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center">
                                  <Check size={12} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-5 h-5 rounded-full border border-slate-300" />
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                            {method.instructions || "Paiement direct et sécurisé."}
                          </p>

                          {method.number && (
                            <div className="mt-2 text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                              Numéro / Coordonnées : {method.number}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Method Specific Actions */}
                {selectedMethod && (
                  <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 mb-6 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                      <Sparkles size={14} className="text-primary-600" />
                      Instructions pour {selectedMethod.name}
                    </h3>

                    {selectedMethod.ussd && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] font-bold text-slate-500 uppercase block">Code USSD Rapide :</span>
                          <span className="text-base font-black font-mono text-primary-700 block">
                            {selectedMethod.ussd.replace('MONTANT', String(finalPrice))}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedMethod.ussd.replace('MONTANT', String(finalPrice)))}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 self-start sm:self-auto"
                        >
                          <Copy size={13} />
                          <span>Copier le code</span>
                        </button>
                      </div>
                    )}

                    <div className="text-xs text-slate-600 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Bénéficiaire :</span>
                        <span>{selectedMethod.owner || "Mégafixa Technologies"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">Modalité choisie :</span>
                        <span className="font-extrabold text-emerald-700">{currentModality.name} ({currentModality.durationText})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {currentModality.isUnique ? 'Montant intégral à transférer :' : 'Acompte initial (45%) à transférer :'}
                        </span>
                        <span className="font-black text-slate-900 text-sm">{Number(finalPrice).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      {!currentModality.isUnique && (
                        <div className="pt-1 text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                          <strong>Solde restant de 55% : {currentModality.remainingAmount.toLocaleString('fr-FR')} FCFA</strong>
                          <p className="mt-0.5 text-[10px] text-slate-600">
                            {currentModality.remainingScheduleText}. Votre compte école est activé dès la confirmation de cet acompte.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Primary Payment Action Buttons */}
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setShowPayerModal(true)}
                    className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Validation et émission de votre clé d'activation...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={18} />
                        <span>
                          {currentModality.isUnique
                            ? `Saisir les informations & Valider le Règlement (${Number(finalPrice).toLocaleString('fr-FR')} FCFA)`
                            : `Saisir les informations & Valider l'Acompte de 45% (${Number(finalPrice).toLocaleString('fr-FR')} FCFA)`}
                        </span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  {/* Fast Test / Demo Option for immediate preview of license key & congratulations email */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleInitiatePayment(true)}
                      className="w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                    >
                      <Sparkles size={15} className="text-emerald-600" />
                      <span>
                        {currentModality.isUnique
                          ? "Mode Démonstration : Valider le paiement unique & recevoir la clé"
                          : "Mode Démonstration : Valider l'acompte de 45% & activer le compte école"}
                      </span>
                    </button>
                    <p className="text-[10px] text-slate-400 text-center mt-1">
                      Génère immédiatement la vraie clé d'abonnement et déclenche l'envoi de l'email officiel à {email}.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => setStep('info')}
                    className="inline-flex items-center gap-1.5 font-bold text-slate-500 hover:text-slate-800"
                  >
                    <ArrowLeft size={15} />
                    <span>Modifier les informations</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Security & Summary */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-extrabold text-sm text-slate-900 mb-3 border-b border-slate-100 pb-2">
                  Détails du Destinataire & Règlement
                </h3>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Établissement</span>
                    <span className="font-black text-slate-800">{schoolName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Responsable</span>
                    <span className="font-bold text-slate-700">{adminNom}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email de Réception</span>
                    <span className="font-bold text-primary-700 break-all">{email}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Formule & Modalité</span>
                    <span className="font-bold text-slate-800">{currentPlan.name} • {currentModality.name}</span>
                    <div className="mt-1 flex items-baseline justify-between">
                      <span className="text-slate-500 text-[11px]">Débité ce jour :</span>
                      <strong className="text-emerald-700 font-black text-sm">
                        {Number(finalPrice).toLocaleString('fr-FR')} FCFA
                      </strong>
                    </div>
                    {!currentModality.isUnique && (
                      <div className="mt-1 text-[10px] text-amber-700 bg-amber-50/70 p-2 rounded-lg border border-amber-200/60">
                        Solde restant (55%) : <strong>{currentModality.remainingAmount.toLocaleString('fr-FR')} FCFA</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-lg space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs">
                  <Award size={16} />
                  <span>Notification par Email Réel</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dès la validation, un email officiel de félicitations contenant votre <strong>Fiche d'Abonnement Certifiée</strong>, votre <strong>Clé de Licence (« MEG-... »)</strong> et votre code d'accès sera délivré à votre boîte de réception.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP: USSD Prompt Waiting & Validation ================= */}
        {step === 'ussd_wait' && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-amber-200 p-6 sm:p-10 shadow-xl relative overflow-hidden">
            {/* Top pulse accent */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 animate-pulse" />

            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner ring-4 ring-amber-50">
                <Smartphone size={40} className="animate-bounce" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider mb-2">
                <Radio size={14} className="animate-pulse text-amber-600" />
                <span>Demande de confirmation transmise</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Validation du Paiement Mobile Money
              </h1>

              <p className="text-slate-600 text-xs sm:text-sm max-w-lg mx-auto mt-2">
                Une demande de prélèvement sécurisée a été émise vers l'opérateur <strong>{txDetails?.operator || payerOperator}</strong>.
              </p>
            </div>

            {/* MANDATORY PROMPT NOTICE BANNER */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 mb-8 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <Smartphone size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-black text-amber-950 tracking-tight">
                    Ce numéro recevra la demande de confirmation (prompt USSD) pour valider le débit.
                  </h3>
                  <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                    Vérifiez l'écran du téléphone <strong>{txDetails?.payerPhone || payerPhoneNumber}</strong>. Saisissez votre code PIN secret Mobile Money sur le prompt qui apparaît pour autoriser le paiement de <strong>{Number(finalPrice).toLocaleString('fr-FR')} FCFA</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction summary box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                Détails de l'autorisation de débit
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Téléphone de débit :</span>
                  <strong className="text-slate-900 font-mono text-sm">{txDetails?.payerPhone || payerPhoneNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Opérateur Mobile Money :</span>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white border border-slate-200 rounded-md font-extrabold text-slate-800">
                    {txDetails?.operator || payerOperator}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Montant à prélever :</span>
                  <strong className="text-emerald-700 font-black text-base">{Number(finalPrice).toLocaleString('fr-FR')} FCFA</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-semibold mb-0.5">Établissement rattaché :</span>
                  <strong className="text-slate-800">{schoolName}</strong>
                </div>
              </div>

              {txReference && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <span>Réf. Transaction : {txReference}</span>
                  <span className="flex items-center gap-1 text-amber-700 font-bold">
                    <Clock size={12} />
                    Temps restant : {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>

            {/* Step-by-step instructions */}
            <div className="space-y-3 mb-8">
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                Instructions de validation :
              </h4>
              <div className="flex items-start gap-3 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                <span>Déverrouillez le téléphone <strong>{txDetails?.payerPhone || payerPhoneNumber}</strong>.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                <span>Sur la fenêtre contextuelle (prompt USSD) de <strong>{txDetails?.operator || payerOperator}</strong>, entrez votre code PIN de validation.</span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-600">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                <span>Dès que le débit est effectué, cliquez ci-dessous pour confirmer et activer votre compte école.</span>
              </div>
            </div>

            {/* Validation Action */}
            <div className="space-y-3">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleConfirmSuccessfulPayment()}
                className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Vérification auprès de l'opérateur...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>J'ai validé le débit sur mon téléphone (Confirmer)</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              {/* Simulation buttons: Échec pour fonds insuffisants ou non-confirmation */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-[11px] font-bold text-slate-400 text-center mb-2 uppercase tracking-wider">
                  Simulation & Tests de scénarios d'échec
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTriggerPaymentFailure('insufficient_funds')}
                    className="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <XCircle size={14} className="text-rose-500" />
                    <span>Simuler Échec : Fonds Insuffisants</span>
                  </button>

                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={() => handleTriggerPaymentFailure('non_confirmation')}
                    className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <AlertOctagon size={14} className="text-amber-600" />
                    <span>Simuler Échec : Non-confirmation</span>
                  </button>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('payment');
                    setShowPayerModal(true);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Modifier le numéro ou choisir un autre moyen de paiement</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP: Payment Failure & Account Creation Aborted ================= */}
        {step === 'failed' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-rose-200 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Top Red Alert Banner */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-rose-500 via-red-600 to-rose-700" />

            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-inner ring-4 ring-rose-50">
                <XCircle size={44} strokeWidth={2.5} />
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-1 rounded-full inline-block mb-2">
                Transaction Interrompue
              </span>

              <h1 className="text-3xl sm:text-4xl font-black text-rose-950 tracking-tight">
                Échec de paiement
              </h1>

              <p className="text-slate-600 text-sm max-w-md mx-auto mt-2">
                La transaction n'a pas pu être validée par l'opérateur de paiement.
              </p>
            </div>

            {/* CRITICAL STATEMENT: Account creation aborted */}
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 mb-6 text-left">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                  <AlertOctagon size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-950">
                    L'opération de création du compte école a été interrompue.
                  </h3>
                  <p className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">
                    Conformément aux règles de sécurité, aucun montant n'a été débité, aucun compte établissement n'a été créé et aucune clé d'activation n'a été délivrée.
                  </p>
                </div>
              </div>
            </div>

            {/* Failure Reason Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-8 text-left space-y-3">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Motif de l'échec constaté :
              </h4>
              <div className="p-3.5 bg-white border border-rose-200 rounded-xl">
                <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm mb-1">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>
                    {failureCode === 'insufficient_funds'
                      ? "Fonds insuffisants sur le compte de paiement"
                      : failureCode === 'non_confirmation'
                        ? "Non-confirmation ou délai de validation USSD dépassé"
                        : (failureReason || "Rejet de la demande de prélèvement")}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">
                  {failureCode === 'insufficient_funds'
                    ? `Le solde disponible sur votre compte Mobile Money (${txDetails?.payerPhone || payerPhoneNumber}) est inférieur au montant exigible de ${Number(finalPrice).toLocaleString('fr-FR')} FCFA. Veuillez recharger votre compte avant de réessayer.`
                    : failureCode === 'non_confirmation'
                      ? `La demande de débit USSD transmise au numéro ${txDetails?.payerPhone || payerPhoneNumber} n'a pas été confirmée avec le code secret dans le délai réglementaire.`
                      : (failureReason || "La demande de règlement n'a pas pu aboutir auprès de votre opérateur.")}
                </p>
              </div>

              {txReference && (
                <p className="text-[11px] text-slate-400 font-mono">
                  Référence de la tentative interrompue : {txReference}
                </p>
              )}
            </div>

            {/* Recovery Action Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => {
                  setFailureReason(null);
                  setFailureCode(null);
                  setStep('payment');
                  setShowPayerModal(true);
                }}
                className="w-full py-4 px-6 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw size={18} />
                <span>Réessayer avec un autre numéro ou opérateur</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setFailureReason(null);
                  setFailureCode(null);
                  setStep('info');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Modifier les informations de l'établissement</span>
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: Success & Official Key Delivery ================= */}
        {step === 'success' && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-emerald-200 p-8 sm:p-10 shadow-2xl relative overflow-hidden">
            {/* Top Confetti / Glow Banner */}
            <div className="absolute top-0 left-0 right-0 h-3 bg-gradient-to-r from-emerald-500 via-teal-500 to-primary-600" />
            
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
                <CheckCircle2 size={44} strokeWidth={2.5} />
              </div>

              <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block mb-2">
                Paiement Validé & Compte Activé
              </span>

              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Félicitations pour votre Souscription !
              </h1>

              <p className="text-slate-600 text-sm max-w-xl mx-auto mt-2">
                Nous vous remercions pour votre confiance en <strong>MégafixaEduc Pro</strong> pour la gestion académique et administrative de <strong>{schoolName}</strong>.
              </p>
            </div>

            {/* License Key Box */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl mb-6 relative">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-400 block mb-1">
                Votre Clé d'Activation Officielle
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/10 p-4 rounded-2xl border border-white/15">
                <span className="text-xl sm:text-2xl font-mono font-black tracking-wider text-amber-300 break-all select-all">
                  {licenseKey || 'MEG-EXCELLENCE-OFFICIEL'}
                </span>

                <button
                  type="button"
                  onClick={() => copyToClipboard(licenseKey || '')}
                  className="px-4 py-2 bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs rounded-xl flex items-center gap-2 shrink-0 shadow-md transition-all active:scale-95"
                >
                  {copiedKey ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedKey ? "Copié !" : "Copier la clé"}</span>
                </button>
              </div>

              <div className="text-[11px] text-slate-300 mt-3 space-y-1">
                <p className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <Sparkles size={13} className="text-amber-400" />
                  Cette clé officielle est immédiatement active pour l'établissement {schoolName} ({currentPlan.name} • {currentModality.name}).
                </p>
                <p className="text-slate-400">
                  {currentModality.isUnique
                    ? `Paiement unique annuel de 100% (${Number(finalPrice).toLocaleString('fr-FR')} FCFA) soldé intégralement.`
                    : `Acompte initial de 45% (${Number(finalPrice).toLocaleString('fr-FR')} FCFA) acquitté avec succès sur un total de ${currentModality.totalPlanPrice.toLocaleString('fr-FR')} FCFA. Solde restant de 55% (${currentModality.remainingAmount.toLocaleString('fr-FR')} FCFA) : ${currentModality.remainingScheduleText}.`}
                </p>
              </div>
            </div>

            {/* Activation Alert & Single Use Key Directive */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Activation Manuelle Requise (Usage Unique)
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Pour finaliser la mise en service de votre établissement, vous devez insérer la clé d'activation ci-dessus.
                    Cette clé n'est utilisable <strong>qu'une seule fois</strong> pour activer votre école. Dès son activation, vous utiliserez <strong>librement votre adresse email ({email}) et votre mot de passe</strong> pour vous connecter sans aucune erreur d'identifiants.
                  </p>
                </div>
              </div>
              <Link
                to={`/login?schoolKey=${encodeURIComponent(licenseKey || '')}&email=${encodeURIComponent(email)}`}
                className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <KeyRound size={16} />
                <span>Activer mon Compte École maintenant avec ma Clé</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Confirmation Email Notice with 2 PDF Attachments */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 mb-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Mail size={24} />
                </div>
                <div className="text-xs text-emerald-950 space-y-1.5">
                  <h4 className="font-black text-base text-emerald-900">
                    Email Réel de Félicitations & Clé Transmis avec Succès !
                  </h4>
                  <p className="leading-relaxed text-emerald-900/90 text-xs">
                    Un message officiel a été expédié à l'adresse <strong>{email}</strong> avec un bref message de félicitation, votre <strong>Clé d'Activation du Compte École</strong>, le lien d'accès direct et <strong>2 fichiers PDF officiels en pièces jointes</strong> :
                  </p>
                </div>
              </div>

              {/* 2 Attached PDF Documents Cards & Instant Download */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                      <FileText size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-primary-600 block">Pièce Jointe 1 (PDF)</span>
                      <h5 className="font-extrabold text-xs text-slate-900">Reçu Officiel de Paiement</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Quittance certifiée de {Number(finalPrice).toLocaleString('fr-FR')} FCFA ({currentModality.isUnique ? '100% Unique' : 'Acompte 45%'}).
                      </p>
                    </div>
                  </div>
                  {txReference && (
                    <a
                      href={`/api/subscriptions/receipt-pdf/${txReference}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-primary-50 hover:text-primary-700 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200/70"
                    >
                      <Download size={14} />
                      <span>Télécharger le Reçu PDF</span>
                    </a>
                  )}
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-xs flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                      <Award size={18} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-600 block">Pièce Jointe 2 (PDF)</span>
                      <h5 className="font-extrabold text-xs text-slate-900">Fiche d'Abonnement École</h5>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Fiche officielle avec félicitations & clé d'accès.
                      </p>
                    </div>
                  </div>
                  {txReference && (
                    <a
                      href={`/api/subscriptions/fiche-pdf/${txReference}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-slate-100 hover:bg-amber-50 hover:text-amber-800 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors border border-slate-200/70"
                    >
                      <Download size={14} />
                      <span>Télécharger la Fiche PDF</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Next Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to={`/login?schoolKey=${encodeURIComponent(licenseKey || '')}`}
                className="w-full sm:flex-1 py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-primary-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <span>Accéder à mon Compte École</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/"
                className="w-full sm:w-auto py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm rounded-2xl transition-colors text-center"
              >
                Retour à l'Accueil
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ================= MODAL: Payer Information & Confirmation ================= */}
      {showPayerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className={`p-5 sm:p-6 text-white relative ${
              selectedMethod?.type === 'card' || selectedMethod?.id?.includes('card')
                ? 'bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900'
                : 'bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900'
            }`}>
              <button
                type="button"
                onClick={() => setShowPayerModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  {selectedMethod?.type === 'card' || selectedMethod?.id?.includes('card') ? (
                    <CreditCard className="w-6 h-6 text-indigo-300" />
                  ) : (
                    <Smartphone className="w-6 h-6 text-amber-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">
                    {selectedMethod?.type === 'card' || selectedMethod?.id?.includes('card')
                      ? 'Paiement Sécurisé par Carte Bancaire'
                      : 'Paiement par Mobile Money'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    {currentModality.isUnique
                      ? `Règlement unique : ${Number(finalPrice).toLocaleString('fr-FR')} FCFA`
                      : `Acompte initial de 45% : ${Number(finalPrice).toLocaleString('fr-FR')} FCFA`}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body / Form */}
            <div className="p-6 overflow-y-auto space-y-4 text-slate-800">
              
              {/* Conditional Form: Card vs Mobile Money */}
              {selectedMethod?.type === 'card' || selectedMethod?.id?.includes('card') ? (
                /* Card Payment Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cardHolder.trim()) {
                      toast.error("Veuillez renseigner le nom complet du titulaire de la carte.");
                      return;
                    }
                    if (!payerEmail.trim() || !payerEmail.includes('@')) {
                      toast.error("Veuillez renseigner une adresse email valide pour le reçu.");
                      return;
                    }
                    const cleanCard = cardNumber.replace(/\s/g, '');
                    if (cleanCard.length < 15) {
                      toast.error("Veuillez renseigner un numéro de carte bancaire valide.");
                      return;
                    }
                    if (!cardExp.trim() || !cardExp.includes('/') || cardExp.length < 5) {
                      toast.error("Veuillez renseigner la date d'expiration (MM/AA).");
                      return;
                    }
                    if (!cardCvc.trim() || cardCvc.length < 3) {
                      toast.error("Veuillez renseigner le code de sécurité CVC/CVV.");
                      return;
                    }

                    handleInitiatePayment(false, {
                      paymentMethodType: 'card',
                      payerName: cardHolder.trim(),
                      payerEmail: payerEmail.trim(),
                      cardNumber: cleanCard,
                      cardExp: cardExp.trim(),
                      cardCvc: cardCvc.trim(),
                      cardBrand: cardBrand.toUpperCase()
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nom complet sur la carte *
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Ex: JEAN DUPONT"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Adresse Email pour le reçu officiel *
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="direction@mon-ecole.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Numéro de carte bancaire *
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          cardBrand === 'visa' ? 'bg-blue-600 text-white' : cardBrand === 'mastercard' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {cardBrand === 'visa' ? 'Visa' : cardBrand === 'mastercard' ? 'Mastercard' : 'CB'}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <CreditCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={cardNumber}
                        onChange={handleCardNumberInput}
                        placeholder="4532 0000 0000 0000"
                        maxLength={19}
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold tracking-wider"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Expiration (MM/AA) *
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExp}
                        onChange={handleCardExpInput}
                        placeholder="12/28"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        CVC / CVV *
                      </label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          required
                          value={cardCvc}
                          onChange={handleCardCvcInput}
                          placeholder="•••"
                          maxLength={4}
                          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-[11px] text-slate-600">
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                    <span>Chiffrement bancaire SSL 256 bits et authentification sécurisée 3D-Secure.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Sécurisation & Débit carte en cours...</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Payer par Carte ({Number(finalPrice).toLocaleString('fr-FR')} FCFA)</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Mobile Money Payment Form */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!payerFullName.trim()) {
                      toast.error("Veuillez renseigner le nom complet de la personne effectuant le paiement.");
                      return;
                    }
                    if (!payerEmail.trim() || !payerEmail.includes('@')) {
                      toast.error("Veuillez renseigner une adresse email valide pour le reçu.");
                      return;
                    }
                    if (!payerPhoneNumber.trim()) {
                      toast.error("Veuillez renseigner le numéro de téléphone Mobile Money.");
                      return;
                    }

                    handleInitiatePayment(false, {
                      paymentMethodType: 'mobile_money',
                      payerName: payerFullName.trim(),
                      payerEmail: payerEmail.trim(),
                      operator: payerOperator,
                      payerPhone: payerPhoneNumber.trim()
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nom complet de celui qui effectue le paiement *
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={payerFullName}
                        onChange={(e) => setPayerFullName(e.target.value)}
                        placeholder="Ex: Jean DUPONT (ou Directeur / Trésorier)"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Adresse Email pour le reçu de paiement *
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="direction@mon-ecole.com"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Choix de l'opérateur Mobile Money *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { id: 'MTN', name: 'MTN MoMo', color: 'border-yellow-400 bg-yellow-50 text-yellow-900', badge: '🟡' },
                        { id: 'MOOV', name: 'Moov Money', color: 'border-blue-400 bg-blue-50 text-blue-900', badge: '🔵' },
                        { id: 'CELTIIS', name: 'Celtiis Cash', color: 'border-emerald-400 bg-emerald-50 text-emerald-900', badge: '🟢' },
                        { id: 'ORANGE', name: 'Orange Money', color: 'border-orange-400 bg-orange-50 text-orange-900', badge: '🟠' },
                        { id: 'WAVE', name: 'Wave Money', color: 'border-cyan-400 bg-cyan-50 text-cyan-900', badge: '🌊' }
                      ].map((op) => (
                        <button
                          type="button"
                          key={op.id}
                          onClick={() => setPayerOperator(op.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                            payerOperator === op.id
                              ? `${op.color} ring-2 ring-primary-500 font-extrabold shadow-xs`
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="text-base">{op.badge}</span>
                          <span className="text-xs truncate">{op.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Numéro de téléphone de paiement (Mobile Money) *
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={payerPhoneNumber}
                        onChange={(e) => setPayerPhoneNumber(e.target.value)}
                        placeholder="Ex: (+229) 01 61 10 79 ou 95 00 00 00"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                      />
                    </div>
                    <div className="mt-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-950">
                      <Smartphone size={18} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                      <div>
                        <p className="font-bold">
                          Ce numéro recevra la demande de confirmation (prompt USSD) pour valider le débit.
                        </p>
                        <p className="text-[11px] text-amber-700 mt-0.5 font-medium">
                          En cas de solde insuffisant ou de non-confirmation, l'opération affichera un échec de paiement et la création du compte école sera immédiatement interrompue.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Envoi de la demande sur votre téléphone...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuer vers le paiement ({Number(finalPrice).toLocaleString('fr-FR')} FCFA)</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Fast Test / Demo button inside modal */}
              <div className="pt-2 border-t border-slate-100 text-center">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => {
                    handleInitiatePayment(true, {
                      paymentMethodType: selectedMethod?.type === 'card' || selectedMethod?.id?.includes('card') ? 'card' : 'mobile_money',
                      payerName: payerFullName || adminNom || 'Directeur Test',
                      payerEmail: payerEmail || email,
                      operator: 'TEST',
                      payerPhone: '99999999'
                    });
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Mode Test / Démo : Valider immédiatement sans débit réel</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-400 font-medium">
          © {new Date().getFullYear()} Mégafixa Technologies. Tous droits réservés. Plateforme sécurisée MégafixaEduc Pro SaaS.
        </div>
      </footer>
    </div>
  );
}
