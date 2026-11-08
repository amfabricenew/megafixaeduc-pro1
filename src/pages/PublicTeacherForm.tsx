import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  GraduationCap, BookOpen, Clock, Calendar, CheckCircle2, AlertCircle, AlertTriangle,
  Send, Plus, Trash2, ArrowRight, ArrowLeft, ShieldCheck, School,
  User, Mail, Phone, Lock, Sparkles, Check, Download, Printer, ShieldAlert,
  Search, X, CheckSquare, Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { jsPDF } from '../utils/compressedPdf';
import autoTable from 'jspdf-autotable';

const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const SUGGESTIONS_MATIERES = [
  'Mathématiques', 'Français', 'Physique-Chimie', 'Sciences de la Vie et de la Terre (SVT)',
  'Histoire-Géographie', 'Anglais', 'Allemand', 'Espagnol', 'Philosophie',
  'Éducation Physique et Sportive (EPS)', 'Informatique', 'Économie',
  'Comptabilité', 'Dessin / Arts Plastiques', 'Musique'
];

export interface TimeSlot {
  id: string;
  classe_id: number;
  classe_nom: string;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  salle?: string;
}

export interface OverlapConflict {
  slot1: TimeSlot;
  slot2: TimeSlot;
  message: string;
}

/**
 * Detect time collisions/overlaps for the same teacher across all classes.
 * Overlap condition for two slots on the same day:
 * StartA < EndB && EndA > StartB
 */
export function detectTimetableConflicts(slots: TimeSlot[]): {
  conflicts: OverlapConflict[];
  conflictingSlotIds: Set<string>;
} {
  const conflicts: OverlapConflict[] = [];
  const conflictingSlotIds = new Set<string>();

  for (let i = 0; i < slots.length; i++) {
    const s1 = slots[i];
    if (!s1.jour || !s1.heure_debut || !s1.heure_fin) continue;

    if (s1.heure_debut >= s1.heure_fin) {
      conflictingSlotIds.add(s1.id);
      conflicts.push({
        slot1: s1,
        slot2: s1,
        message: `${s1.classe_nom} (${s1.jour}) : L'heure de début (${s1.heure_debut}) doit précéder l'heure de fin (${s1.heure_fin}).`
      });
      continue;
    }

    for (let j = i + 1; j < slots.length; j++) {
      const s2 = slots[j];
      if (!s2.jour || !s2.heure_debut || !s2.heure_fin) continue;

      if (s1.jour === s2.jour) {
        if (s1.heure_debut < s2.heure_fin && s1.heure_fin > s2.heure_debut) {
          conflictingSlotIds.add(s1.id);
          conflictingSlotIds.add(s2.id);

          const isSameClass = s1.classe_id === s2.classe_id;
          const msg = isSameClass
            ? `Conflit interne en ${s1.classe_nom} le ${s1.jour} : Les créneaux ${s1.heure_debut}-${s1.heure_fin} et ${s2.heure_debut}-${s2.heure_fin} se chevauchent.`
            : `Chevauchement interdit le ${s1.jour} : Cours en ${s1.classe_nom} (${s1.heure_debut} - ${s1.heure_fin}) chevauche le cours en ${s2.classe_nom} (${s2.heure_debut} - ${s2.heure_fin}).`;

          conflicts.push({
            slot1: s1,
            slot2: s2,
            message: msg
          });
        }
      }
    }
  }

  return { conflicts, conflictingSlotIds };
}

/**
 * Generates an initial non-colliding default slot for a newly added class
 */
function getSmartInitialSlot(cls: { id: number; nom: string }, existingSlots: TimeSlot[]): TimeSlot {
  const defaultHours = [
    { start: '08:00', end: '10:00' },
    { start: '10:00', end: '12:00' },
    { start: '15:00', end: '17:00' },
    { start: '17:00', end: '19:00' }
  ];

  for (const jour of JOURS_SEMAINE) {
    for (const h of defaultHours) {
      const hasConflict = existingSlots.some(s => 
        s.jour === jour && s.heure_debut < h.end && s.heure_fin > h.start
      );
      if (!hasConflict) {
        return {
          id: Math.random().toString(36).substring(2, 9),
          classe_id: cls.id,
          classe_nom: cls.nom,
          jour,
          heure_debut: h.start,
          heure_fin: h.end
        };
      }
    }
  }

  return {
    id: Math.random().toString(36).substring(2, 9),
    classe_id: cls.id,
    classe_nom: cls.nom,
    jour: 'Lundi',
    heure_debut: '08:00',
    heure_fin: '10:00'
  };
}

export default function PublicTeacherForm() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form data - Step 1: Info & Subjects & Classes
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [matierePrincipale, setMatierePrincipale] = useState('');
  const [matiereSecondaire, setMatiereSecondaire] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<{ id: number; nom: string; niveau?: string }[]>([]);
  const [classSearch, setClassSearch] = useState('');

  // Form data - Step 2: Timetable slots
  const [timetableSlots, setTimetableSlots] = useState<TimeSlot[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<any>(null);

  // Real-time conflict detection across all classes
  const { conflicts, conflictingSlotIds } = useMemo(() => {
    return detectTimetableConflicts(timetableSlots);
  }, [timetableSlots]);

  // Fetch form data & verify blocking status
  useEffect(() => {
    if (!token) return;

    // Check if this respondent device was flagged as blocked
    const isTokenBlocked = localStorage.getItem(`blocked_collecte_${token}`);
    const isUserBlocked = localStorage.getItem('megafixa_blocked_respondent');
    if (isTokenBlocked || isUserBlocked) {
      setIsBlocked(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/public/collecte-enseignant/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (data.isBlocked) {
            localStorage.setItem(`blocked_collecte_${token}`, 'true');
            localStorage.setItem('megafixa_blocked_respondent', 'true');
            setIsBlocked(true);
            return;
          }
          throw new Error(data.error || "Impossible de charger le formulaire");
        }
        if (data.isBlocked) {
          localStorage.setItem(`blocked_collecte_${token}`, 'true');
          localStorage.setItem('megafixa_blocked_respondent', 'true');
          setIsBlocked(true);
          return;
        }
        setFormConfig(data);
      })
      .catch((err) => {
        console.error(err);
        setLoadError(err.message);
      })
      .finally(() => setLoading(false));
  }, [token]);

  // Toggle class selection with non-conflicting default slot allocation
  const toggleClassSelection = (cls: { id: number; nom: string; niveau?: string }) => {
    const exists = selectedClasses.some(c => c.id === cls.id);
    if (exists) {
      setSelectedClasses(prev => prev.filter(c => c.id !== cls.id));
      setTimetableSlots(prev => prev.filter(slot => slot.classe_id !== cls.id));
    } else {
      setSelectedClasses(prev => [...prev, cls]);
      setTimetableSlots(prev => {
        const smartSlot = getSmartInitialSlot(cls, prev);
        return [...prev, smartSlot];
      });
    }
  };

  // Select all available classes
  const selectAllClasses = (classList: any[]) => {
    setSelectedClasses(classList);
    let slots: TimeSlot[] = [];
    for (const cls of classList) {
      const existing = timetableSlots.filter(s => s.classe_id === cls.id);
      if (existing.length > 0) {
        slots.push(...existing);
      } else {
        const smart = getSmartInitialSlot(cls, slots);
        slots.push(smart);
      }
    }
    setTimetableSlots(slots);
  };

  // Deselect all classes
  const deselectAllClasses = () => {
    setSelectedClasses([]);
    setTimetableSlots([]);
  };

  // Add slot for a specific class with smart non-colliding default
  const addSlotForClass = (cls: { id: number; nom: string }) => {
    setTimetableSlots(prev => {
      const smartSlot = getSmartInitialSlot(cls, prev);
      return [...prev, smartSlot];
    });
  };

  const removeSlot = (slotId: string) => {
    setTimetableSlots(prev => prev.filter(s => s.id !== slotId));
  };

  const updateSlot = (slotId: string, field: keyof TimeSlot, value: any) => {
    setTimetableSlots(prev => prev.map(s => s.id === slotId ? { ...s, [field]: value } : s));
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!nom.trim()) {
      toast.error("Veuillez saisir votre nom de famille.");
      return false;
    }
    if (!prenom.trim()) {
      toast.error("Veuillez saisir votre prénom.");
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error("Veuillez saisir une adresse email valide.");
      return false;
    }
    if (!matierePrincipale.trim()) {
      toast.error("Veuillez renseigner votre matière principale d'enseignement.");
      return false;
    }
    if (selectedClasses.length === 0) {
      toast.error("Veuillez sélectionner au moins une classe tenue.");
      return false;
    }
    return true;
  };

  // Step 2 Validation: Check existence of slots & enforce NO time overlaps
  const validateStep2 = () => {
    // 1. Check that each selected class has at least 1 slot configured
    for (const cls of selectedClasses) {
      const slots = timetableSlots.filter(s => s.classe_id === cls.id);
      if (slots.length === 0) {
        toast.error(`Veuillez définir au moins un créneau horaire pour la classe ${cls.nom}.`);
        return false;
      }
      for (const slot of slots) {
        if (!slot.heure_debut || !slot.heure_fin) {
          toast.error(`Horaires incomplets pour la classe ${cls.nom}.`);
          return false;
        }
        if (slot.heure_debut >= slot.heure_fin) {
          toast.error(`L'heure de début (${slot.heure_debut}) doit précéder l'heure de fin (${slot.heure_fin}) pour la classe ${cls.nom}.`);
          return false;
        }
      }
    }

    // 2. Strict overlap detection
    const { conflicts: detectedConflicts } = detectTimetableConflicts(timetableSlots);
    if (detectedConflicts.length > 0) {
      const first = detectedConflicts[0];
      toast.error(
        `Chevauchement interdit : ${first.message}`,
        { duration: 6000, icon: '⚠️' }
      );
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/public/collecte-enseignant/${token}/soumettre`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nom.trim(),
          prenom: prenom.trim(),
          email: email.trim(),
          telephone: telephone.trim(),
          matiere_principale: matierePrincipale.trim(),
          matiere_secondaire: matiereSecondaire.trim() || null,
          classes_tenues: selectedClasses,
          emploi_du_temps: timetableSlots
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.isBlocked) {
          localStorage.setItem(`blocked_collecte_${token}`, 'true');
          localStorage.setItem('megafixa_blocked_respondent', 'true');
          setIsBlocked(true);
          return;
        }
        throw new Error(data.error || "Une erreur est survenue lors de l'envoi.");
      }

      setSubmissionSuccess(data);
      toast.success("Fiche d'informations transmise avec succès !");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur de transmission");
    } finally {
      setIsSubmitting(false);
    }
  };

  // PDF Download helper
  const handleDownloadPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const schoolName = formConfig?.school_nom || "ÉTABLISSEMENT SCOLAIRE";

      // Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(schoolName.toUpperCase(), 14, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text("FICHE DE RENSEIGNEMENT ENSEIGNANT & EMPLOI DU TEMPS (SECONDAIRE)", 14, 23);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`CODE : ${submissionSuccess?.code_suivi || 'COL-ENS'}`, 210 - 14, 23, { align: 'right' });

      // Teacher Info Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 38, 182, 36, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, 38, 182, 36, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${nom.toUpperCase()} ${prenom}`, 20, 47);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Email : ${email}  |  Téléphone : ${telephone || 'Non renseigné'}`, 20, 54);
      doc.text(`Matière Principale : ${matierePrincipale}  ${matiereSecondaire ? `|  Matière Secondaire : ${matiereSecondaire}` : ''}`, 20, 61);
      doc.text(`Classes Tenues : ${selectedClasses.map(c => c.nom).join(', ')}`, 20, 68);

      // Timetable Table
      const tableData = timetableSlots.map((slot, index) => [
        index + 1,
        slot.classe_nom,
        slot.jour,
        `${slot.heure_debut} à ${slot.heure_fin}`,
        slot.salle || 'Salle de classe',
        matierePrincipale
      ]);

      autoTable(doc, {
        startY: 80,
        head: [['N°', 'Classe', 'Jour', 'Plage Horaire', 'Salle', 'Matière']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [13, 148, 136], // Teal-600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: {
          fontSize: 8.5,
          cellPadding: 3
        }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      if (finalY < 250) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Document soumis le ${new Date().toLocaleDateString('fr-FR')} - En attente de validation par la direction / le censeur.`, 14, finalY);
      }

      doc.save(`Fiche_Enseignant_${nom}_${prenom}_${submissionSuccess?.code_suivi || 'COL'}.pdf`);
      toast.success("Document PDF téléchargé !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du PDF");
    }
  };

  // Blocked View
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-rose-200 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-rose-100">
            <ShieldAlert size={36} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-rose-950">
              Lien résilié & Accès Révoqué
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Votre accès à ce formulaire a été suspendu par l'administration de l'établissement. Ce lien n'est plus accessible depuis cet utilisateur.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Pour toute réclamation, veuillez contacter directement la direction ou le secrétariat de l'école.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Chargement du formulaire de collecte...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (loadError || !formConfig) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-lg font-bold text-slate-800">Formulaire Inaccessible</h2>
          <p className="text-sm text-slate-600">{loadError || "Ce formulaire n'est plus disponible."}</p>
        </div>
      </div>
    );
  }

  // Success State
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white max-w-xl w-full p-8 rounded-3xl border border-teal-100 shadow-2xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 size={44} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 uppercase tracking-wider">
              Transmission Effectuée
            </span>
            <h1 className="text-2xl font-black text-slate-900">
              Merci, {prenom} {nom} !
            </h1>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Votre fiche d'informations et vos propositions d'emploi du temps ont été transmises à l'administration de <strong>{formConfig.school_nom}</strong>.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Référence de suivi :</span>
              <span className="font-mono font-black text-teal-700 text-sm">{submissionSuccess.code_suivi}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Matière principale :</span>
              <span className="font-bold text-slate-800">{matierePrincipale}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Classes assignées :</span>
              <span className="font-bold text-slate-800">{selectedClasses.map(c => c.nom).join(', ')}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Statut actuel :</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold text-[11px]">
                En cours de vérification par le censeur / la direction
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold rounded-xl transition-all shadow-md shadow-teal-600/20 text-sm cursor-pointer"
            >
              <Download size={18} />
              Télécharger ma fiche (PDF)
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all text-sm cursor-pointer"
            >
              <Printer size={18} />
              Imprimer
            </button>
          </div>
        </div>
      </div>
    );
  }

  const availableClassesList: any[] = formConfig.available_classes || [];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {formConfig.school_logo ? (
              <img src={formConfig.school_logo} alt={formConfig.school_nom} className="w-10 h-10 object-contain rounded-xl" />
            ) : (
              <div className="w-10 h-10 bg-teal-600 text-white rounded-xl flex items-center justify-center font-black">
                <School size={20} />
              </div>
            )}
            <div>
              <h2 className="font-black text-sm text-slate-900 leading-tight">
                {formConfig.school_nom || "Établissement Scolaire"}
              </h2>
              <p className="text-xs text-teal-700 font-semibold">
                Portail Enseignant • Secondaire
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <ShieldCheck size={14} className="text-teal-600" />
            <span>Formulaire officiel sécurisé</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 my-4 flex-1">
        {/* Banner card */}
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden mb-6">
          <div className="relative z-10 max-w-2xl space-y-2">
            <span className="px-3 py-1 bg-white/15 backdrop-blur-md text-teal-200 text-xs font-bold rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
              <Sparkles size={13} /> Collecte Fiches & Emplois du Temps
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {formConfig.titre}
            </h1>
            {formConfig.description && (
              <p className="text-teal-100 text-sm leading-relaxed">
                {formConfig.description}
              </p>
            )}
          </div>
          <GraduationCap size={150} className="absolute -right-6 -bottom-6 text-white/5 pointer-events-none" />
        </div>

        {/* Stepper Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs mb-6">
          <div className="flex items-center justify-between">
            {/* Step 1 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                currentStep >= 1 ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}>
                1
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Coordonnées & Matières</p>
                <p className="text-[10px] text-slate-500 hidden sm:block">Profil & classes tenues</p>
              </div>
            </div>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${currentStep >= 2 ? 'bg-teal-600' : 'bg-slate-200'}`} />

            {/* Step 2 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                currentStep >= 2 ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}>
                2
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Emploi du Temps</p>
                <p className="text-[10px] text-slate-500 hidden sm:block">Créneaux par classe</p>
              </div>
            </div>

            <div className={`h-0.5 flex-1 mx-2 sm:mx-4 ${currentStep >= 3 ? 'bg-teal-600' : 'bg-slate-200'}`} />

            {/* Step 3 */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                currentStep === 3 ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'
              }`}>
                3
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Validation</p>
                <p className="text-[10px] text-slate-500 hidden sm:block">Relecture & envoi</p>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: Personal Info, Subjects & Classes */}
        {currentStep === 1 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <User className="text-teal-600" size={20} />
                Vos Informations Personnelles
              </h2>
              <p className="text-xs text-slate-500">Renseignez vos coordonnées de contact pour l'établissement.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nom de famille <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: KODJO"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Prénoms <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Jean-Luc Mensah"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Adresse Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="jeanluc@exemple.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Numéro Téléphone / WhatsApp
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="Ex: +229 97 00 00 00"
                    value={telephone}
                    onChange={e => setTelephone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-1">
                <BookOpen className="text-teal-600" size={20} />
                Matières Enseignées
              </h2>
              <p className="text-xs text-slate-500 mb-4">Précisez votre discipline principale et secondaire.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Matière principale <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="suggestions-matieres-principale"
                    placeholder="Saisissez ou choisissez la matière (ex: Mathématiques)"
                    value={matierePrincipale}
                    onChange={e => setMatierePrincipale(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <datalist id="suggestions-matieres-principale">
                    {SUGGESTIONS_MATIERES.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Matière secondaire (Optionnelle)
                  </label>
                  <input
                    type="text"
                    list="suggestions-matieres-secondaire"
                    placeholder="Ex: Informatique (optionnel)"
                    value={matiereSecondaire}
                    onChange={e => setMatiereSecondaire(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <datalist id="suggestions-matieres-secondaire">
                    {SUGGESTIONS_MATIERES.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Classes selection (Multiple choice) */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <GraduationCap className="text-teal-600" size={20} />
                    Classes tenues (Choix multiple) <span className="text-rose-500">*</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sélectionnez toutes les classes dans lesquelles vous intervenez. Vous définirez ensuite l'emploi du temps pour chacune d'elles.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border transition-all notranslate ${
                    selectedClasses.length > 0
                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {selectedClasses.length === 0
                      ? "Aucune classe sélectionnée"
                      : selectedClasses.length === 1
                      ? "1 classe sélectionnée"
                      : `${selectedClasses.length} classes sélectionnées`}
                  </span>
                </div>
              </div>

              {/* Class Search & Bulk Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                <div className="relative flex-1 max-w-sm">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={classSearch}
                    onChange={e => setClassSearch(e.target.value)}
                    placeholder="Filtrer les classes (ex: 6ème, 3ème, Seconde)..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  {classSearch ? (
                    <button
                      type="button"
                      onClick={() => setClassSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    key="btn-select-all"
                    type="button"
                    onClick={() => selectAllClasses(availableClassesList)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckSquare size={14} className="text-teal-600" />
                    <span>Tout cocher</span>
                  </button>
                  {selectedClasses.length > 0 ? (
                    <button
                      key="btn-deselect-all"
                      type="button"
                      onClick={deselectAllClasses}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Square size={14} className="text-slate-400" />
                      <span>Tout décocher</span>
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Classes Grid */}
              {availableClassesList.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  Aucune classe n'a été rattachée à ce formulaire par l'établissement.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {availableClassesList
                    .filter(cls => 
                      cls.nom.toLowerCase().includes(classSearch.toLowerCase()) ||
                      (cls.niveau && cls.niveau.toLowerCase().includes(classSearch.toLowerCase()))
                    )
                    .map((cls) => {
                      const isChecked = selectedClasses.some(c => c.id === cls.id);
                      return (
                        <button
                          key={`btn-class-${cls.id}`}
                          type="button"
                          onClick={() => toggleClassSelection(cls)}
                          className={`p-3.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isChecked 
                              ? 'bg-teal-50/90 border-teal-500 text-teal-950 ring-2 ring-teal-500/25 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="truncate flex-1">
                            <span className="text-sm font-black block truncate leading-tight">{cls.nom}</span>
                            <span className="text-[11px] text-slate-500 block truncate mt-0.5">{cls.niveau || 'Secondaire'}</span>
                          </div>
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition-all ${
                            isChecked 
                              ? 'bg-teal-600 border-teal-600 text-white shadow-xs' 
                              : 'border-slate-300 bg-slate-50 text-transparent'
                          }`}>
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Selected classes preview tags in a stable container */}
              <div className="pt-2 min-h-[32px]">
                {selectedClasses.length > 0 ? (
                  <div key="chips-list-wrapper" className="flex items-center gap-1.5 flex-wrap">
                    <span key="chips-header" className="text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                      {"Choix retenus :"}
                    </span>
                    <div key="chips-items" className="flex items-center gap-1.5 flex-wrap">
                      {selectedClasses.map(c => (
                        <span 
                          key={`chip-class-${c.id}`} 
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-teal-100/70 text-teal-900 border border-teal-200 text-xs font-extrabold rounded-lg"
                        >
                          <span>{c.nom}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleClassSelection(c);
                            }}
                            className="text-teal-700 hover:text-rose-600 ml-0.5 cursor-pointer"
                            title="Retirer cette classe"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Next button */}
            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-7 py-3 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-md shadow-teal-600/25 text-sm transition-all cursor-pointer"
              >
                <span>{`Étape Suivante : Emploi du Temps (${selectedClasses.length} ${selectedClasses.length > 1 ? 'classes' : 'classe'})`}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Timetable Configuration per selected class */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Clock className="text-teal-600" size={20} />
                    Configuration de l'Emploi du Temps par Classe
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Définissez les jours et créneaux horaires (ex: 08h à 10h) pour chaque classe tenue. Les chevauchements d'horaires sont interdits.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-teal-50 text-teal-800 px-3.5 py-2 rounded-xl border border-teal-200 text-xs font-bold shrink-0">
                  <Calendar size={15} />
                  <span>{selectedClasses.length} classe(s) • {timetableSlots.length} créneau(x)</span>
                </div>
              </div>

              {/* Real-time Conflict Alert Banner */}
              {conflicts.length > 0 && (
                <div className="mb-6 p-4 sm:p-5 bg-rose-50/90 border-2 border-rose-300 rounded-2xl flex items-start gap-3.5 text-rose-950 shadow-xs animate-in fade-in">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 border border-rose-200 shadow-inner">
                    <AlertTriangle size={22} className="animate-pulse" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <h4 className="font-black text-sm text-rose-900 notranslate">
                        {`Chevauchement d'horaires interdit (${conflicts.length} ${conflicts.length > 1 ? 'conflits détectés' : 'conflit détecté'})`}
                      </h4>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded-md border border-rose-300">
                        Correction Requise
                      </span>
                    </div>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      Un même enseignant ne peut pas être programmé dans plusieurs classes au même moment ou avec des heures qui se croisent. Veuillez ajuster les horaires des créneaux surlignés en rouge ci-dessous.
                    </p>
                    <div className="mt-2.5 pt-2.5 border-t border-rose-200 space-y-1.5">
                      {conflicts.map((c, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs font-bold text-rose-950 bg-rose-100/70 p-2 rounded-xl border border-rose-200/80">
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-1"></span>
                          <span>{c.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Class Sections */}
              <div className="space-y-6">
                {selectedClasses.map((cls) => {
                  const classSlots = timetableSlots.filter(s => s.classe_id === cls.id);
                  const hasClassConflict = classSlots.some(s => conflictingSlotIds.has(s.id));

                  return (
                    <div 
                      key={cls.id} 
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        hasClassConflict 
                          ? 'border-rose-300 bg-rose-50/20 shadow-xs' 
                          : 'border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      {/* Class header */}
                      <div className="bg-white px-5 py-3.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                            hasClassConflict 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-teal-100 text-teal-800'
                          }`}>
                            {cls.nom.slice(0, 2)}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-slate-900 text-sm">{cls.nom}</h3>
                              {hasClassConflict && (
                                <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
                                  <AlertCircle size={11} /> Conflit horaire
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400">{cls.niveau || 'Secondaire'} • Matière : {matierePrincipale}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addSlotForClass(cls)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold rounded-xl border border-teal-200 transition-all cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Ajouter un créneau pour {cls.nom}</span>
                        </button>
                      </div>

                      {/* Slots list */}
                      <div className="p-4 space-y-3">
                        {classSlots.length === 0 ? (
                          <div className="p-5 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-dashed border-slate-200">
                            Aucun créneau configuré pour {cls.nom}. Cliquez sur "Ajouter un créneau" ci-dessus pour définir son horaire.
                          </div>
                        ) : (
                          classSlots.map((slot, sIdx) => {
                            const isConflicting = conflictingSlotIds.has(slot.id);

                            return (
                              <div 
                                key={slot.id} 
                                className={`p-4 rounded-xl border transition-all ${
                                  isConflicting 
                                    ? 'bg-rose-50/70 border-rose-400 ring-2 ring-rose-400/25 shadow-xs' 
                                    : 'bg-white border-slate-200 shadow-xs'
                                }`}
                              >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 ${
                                      isConflicting ? 'bg-rose-200 text-rose-900' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {sIdx + 1}
                                    </span>
                                    <span className="text-xs font-bold text-slate-800">
                                      Créneau {cls.nom} :
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 flex-1">
                                    {/* Jour */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Jour</label>
                                      <select
                                        value={slot.jour}
                                        onChange={e => updateSlot(slot.id, 'jour', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                      >
                                        {JOURS_SEMAINE.map(j => (
                                          <option key={j} value={j}>{j}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Heure Début */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Début</label>
                                      <input
                                        type="time"
                                        value={slot.heure_debut}
                                        onChange={e => updateSlot(slot.id, 'heure_debut', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                      />
                                    </div>

                                    {/* Heure Fin */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fin</label>
                                      <input
                                        type="time"
                                        value={slot.heure_fin}
                                        onChange={e => updateSlot(slot.id, 'heure_fin', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                      />
                                    </div>

                                    {/* Salle (Optionnel) */}
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salle (Opt.)</label>
                                      <input
                                        type="text"
                                        placeholder="Ex: Salle 04"
                                        value={slot.salle || ''}
                                        onChange={e => updateSlot(slot.id, 'salle', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs font-medium focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Delete button */}
                                  <button
                                    type="button"
                                    onClick={() => removeSlot(slot.id)}
                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors self-end md:self-center cursor-pointer"
                                    title="Supprimer ce créneau"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                {/* Quick slot presets & warning message */}
                                <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Créneaux types :</span>
                                    {[
                                      { l: '08h - 10h', d: '08:00', f: '10:00' },
                                      { l: '10h - 12h', d: '10:00', f: '12:00' },
                                      { l: '15h - 17h', d: '15:00', f: '17:00' },
                                      { l: '17h - 19h', d: '17:00', f: '19:00' }
                                    ].map((preset, pIdx) => (
                                      <button
                                        key={pIdx}
                                        type="button"
                                        onClick={() => {
                                          updateSlot(slot.id, 'heure_debut', preset.d);
                                          updateSlot(slot.id, 'heure_fin', preset.f);
                                        }}
                                        className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 rounded-md border border-slate-200 text-slate-600 transition-colors cursor-pointer"
                                      >
                                        {preset.l}
                                      </button>
                                    ))}
                                  </div>

                                  {isConflicting && (
                                    <span className="text-[11px] font-black text-rose-700 flex items-center gap-1">
                                      <AlertTriangle size={12} /> Heure en conflit le {slot.jour}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-all cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>Retour aux classes & coordonnées</span>
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className={`inline-flex items-center gap-2 px-7 py-3 font-extrabold rounded-2xl shadow-md text-sm transition-all cursor-pointer ${
                    conflicts.length > 0 
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25 ring-2 ring-rose-400/40' 
                      : 'bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 active:scale-95'
                  }`}
                >
                  {conflicts.length > 0 ? (
                    <>
                      <AlertTriangle size={16} />
                      <span>Corriger les chevauchements ({conflicts.length})</span>
                    </>
                  ) : (
                    <>
                      <span>Étape Suivante : Relecture & Validation</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Review & Final Confirmation */}
        {currentStep === 3 && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
            <div>
              <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full border border-teal-200 uppercase tracking-wider">
                Étape 3 • Relecture finale
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                Vérification et Confirmation de votre Fiche
              </h2>
              <p className="text-xs text-slate-500">
                Veuillez relire attentivement l'ensemble des données saisies avant de confirmer l'envoi vers la base de l'établissement.
              </p>
            </div>

            {/* Profile summary card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white font-black text-base flex items-center justify-center">
                    {nom.charAt(0)}{prenom.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{nom.toUpperCase()} {prenom}</h3>
                    <p className="text-xs text-slate-500">{email} • {telephone || 'Sans numéro'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-teal-600 hover:underline font-bold"
                >
                  Modifier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Matière Principale</span>
                  <span className="font-bold text-slate-800 text-sm">{matierePrincipale}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Matière Secondaire</span>
                  <span className="font-bold text-slate-800 text-sm">{matiereSecondaire || 'Aucune'}</span>
                </div>
              </div>
            </div>

            {/* Classes & Timetable summary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Calendar size={18} className="text-teal-600" />
                  <span>Emploi du temps proposé par classe ({timetableSlots.length} créneaux au total)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="text-xs text-teal-600 hover:underline font-bold"
                >
                  Modifier les créneaux
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedClasses.map((cls) => {
                  const slots = timetableSlots.filter(s => s.classe_id === cls.id);
                  return (
                    <div key={cls.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                        <span className="font-black text-slate-900 text-sm">{cls.nom}</span>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 notranslate">
                          {`${slots.length} ${slots.length > 1 ? 'créneaux' : 'créneau'}`}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {slots.map(s => (
                          <div key={s.id} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100">
                            <span className="font-bold text-slate-700">{s.jour}</span>
                            <span className="font-mono text-teal-800 font-semibold">{s.heure_debut} - {s.heure_fin}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Timetable Validation Status */}
            {conflicts.length === 0 ? (
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5 shadow-2xs">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={18} />
                <span className="font-bold">
                  Aucun chevauchement d'horaires détecté : votre emploi du temps est cohérent pour l'ensemble des classes sélectionnées.
                </span>
              </div>
            ) : (
              <div className="p-4 bg-rose-50 rounded-2xl border-2 border-rose-300 text-xs text-rose-900 flex items-start gap-3 shadow-xs">
                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <span className="font-black block text-rose-950 notranslate">
                    {`Chevauchement d'horaires détecté (${conflicts.length} ${conflicts.length > 1 ? 'conflits' : 'conflit'})`}
                  </span>
                  <p className="text-rose-800">
                    Vous devez corriger les horaires en conflit avant de pouvoir soumettre votre fiche.
                  </p>
                </div>
              </div>
            )}

            {/* Terms notice */}
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
              <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <p>
                En cliquant sur "Confirmer et Envoyer", vos informations seront soumises directement à la direction, au secrétaire et au censeur de l'école pour vérification et enregistrement.
              </p>
            </div>

            {/* Navigation & Submit buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-sm transition-all cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Modifier les horaires</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || conflicts.length > 0}
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-extrabold rounded-2xl shadow-lg shadow-teal-600/30 text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Envoi en cours...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Confirmer et Envoyer la Fiche</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 bg-white">
        <p>
          Plateforme MégafixaEduc Pro • Système d'information et de gestion pédagogique du secondaire.
        </p>
      </footer>
    </div>
  );
}
