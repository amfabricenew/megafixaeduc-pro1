import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  GraduationCap, 
  Search, 
  User, 
  Check, 
  DollarSign, 
  Calendar, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Clock, 
  CreditCard, 
  FileText,
  AlertTriangle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch, notifyAppUpdate } from '../utils/api';
import { generateReceiptPDF, downloadReceiptPDF, printReceiptPDF } from '../utils/receipt';

interface ScolaritePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentResult?: any) => void;
  classes?: any[];
  schoolInfo?: any;
  preselectedEleveId?: number;
  initialCycle?: 'all' | 'primaire' | 'secondaire';
  initialIsArrieres?: boolean;
  initialAnneeConcerneeId?: number;
  initialAnneeConcerneeLibelle?: string;
}

export default function ScolaritePaymentModal({
  isOpen,
  onClose,
  onSuccess,
  classes: propClasses,
  schoolInfo,
  preselectedEleveId,
  initialCycle = 'all',
  initialIsArrieres = false,
  initialAnneeConcerneeId,
  initialAnneeConcerneeLibelle
}: ScolaritePaymentModalProps) {
  // Classes list
  const [classes, setClasses] = useState<any[]>(propClasses || []);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Form states
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [studentsInClass, setStudentsInClass] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Student selection & autocomplete
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Arrears per year state
  const [arrieresData, setArrieresData] = useState<any>(null);
  const [loadingArrieres, setLoadingArrieres] = useState(false);
  const [selectedAnneeConcerneeId, setSelectedAnneeConcerneeId] = useState<number | string>(initialAnneeConcerneeId || '');
  const [selectedAnneeConcerneeLibelle, setSelectedAnneeConcerneeLibelle] = useState<string>(initialAnneeConcerneeLibelle || '');

  // Payment details
  const [selectedTranche, setSelectedTranche] = useState<string>(initialIsArrieres ? 'Arriérés de scolarité (années antérieures)' : 'Tranche 1');
  const [montant, setMontant] = useState<string>('');
  const [methode, setMethode] = useState<string>('Espèces');
  const [datePaiement, setDatePaiement] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Submission & Post-action state
  const [submitting, setSubmitting] = useState(false);
  const [successPayment, setSuccessPayment] = useState<any | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Direct student load when preselectedEleveId is provided
  useEffect(() => {
    if (isOpen && preselectedEleveId) {
      apiFetch(`/api/eleves/${preselectedEleveId}`)
        .then(res => res.json())
        .then(st => {
          if (st && st.id) {
            setSelectedStudent(st);
            setStudentSearch(`${st.nom} ${st.prenom}`);
            if (st.classe_id) {
              setSelectedClasseId(st.classe_id.toString());
            }
            if (initialIsArrieres || Number(st.arrieres_scolarite || 0) > 0) {
              setSelectedTranche('Arriérés de scolarité (années antérieures)');
              setMontant(Number(st.arrieres_scolarite || 0).toString());
            }
          }
        })
        .catch(err => console.error("Erreur chargement élève préselectionné:", err));
    }
  }, [isOpen, preselectedEleveId, initialIsArrieres]);

  // Load classes if not provided or empty
  useEffect(() => {
    if (isOpen) {
      if (!propClasses || propClasses.length === 0) {
        setLoadingClasses(true);
        const cycleQuery = initialCycle !== 'all' ? `?cycle=${initialCycle}` : '';
        apiFetch(`/api/classes${cycleQuery}`)
          .then(res => res.json())
          .then(data => {
            if (Array.isArray(data)) setClasses(data);
          })
          .catch(err => console.error("Erreur chargement classes:", err))
          .finally(() => setLoadingClasses(false));
      } else {
        setClasses(propClasses);
      }
    }
  }, [isOpen, propClasses, initialCycle]);

  // Fetch arrears breakdown per year whenever selected student changes
  useEffect(() => {
    if (!selectedStudent?.id) {
      setArrieresData(null);
      return;
    }

    setLoadingArrieres(true);
    apiFetch(`/api/eleves/${selectedStudent.id}/arrieres-par-annee`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setArrieresData(data);
          // Auto-select initial year if specified, or first year with outstanding balance
          if (initialAnneeConcerneeId) {
            setSelectedAnneeConcerneeId(initialAnneeConcerneeId);
            const found = data.arrieres_detail?.find((y: any) => y.annee_id === initialAnneeConcerneeId);
            if (found) {
              setSelectedAnneeConcerneeLibelle(found.libelle);
              if (initialIsArrieres && found.reste_a_payer > 0) {
                setMontant(found.reste_a_payer.toString());
              }
            } else if (initialAnneeConcerneeLibelle) {
              setSelectedAnneeConcerneeLibelle(initialAnneeConcerneeLibelle);
            }
          } else if (data.arrieres_detail && data.arrieres_detail.length > 0) {
            const withDebt = data.arrieres_detail.find((y: any) => y.reste_a_payer > 0);
            if (withDebt) {
              setSelectedAnneeConcerneeId(withDebt.annee_id);
              setSelectedAnneeConcerneeLibelle(withDebt.libelle);
              if (selectedTranche === 'Arriérés de scolarité (années antérieures)') {
                setMontant(withDebt.reste_a_payer.toString());
              }
            } else {
              setSelectedAnneeConcerneeId(data.arrieres_detail[0].annee_id);
              setSelectedAnneeConcerneeLibelle(data.arrieres_detail[0].libelle);
            }
          } else if (data.annees_anterieures && data.annees_anterieures.length > 0) {
            setSelectedAnneeConcerneeId(data.annees_anterieures[0].id);
            setSelectedAnneeConcerneeLibelle(data.annees_anterieures[0].libelle);
          }
        }
      })
      .catch(err => console.error("Erreur chargement arriérés par année:", err))
      .finally(() => setLoadingArrieres(false));
  }, [selectedStudent?.id, initialAnneeConcerneeId, initialAnneeConcerneeLibelle, initialIsArrieres]);

  // When class changes, automatically fetch all students of that class
  useEffect(() => {
    if (!selectedClasseId) {
      setStudentsInClass([]);
      if (!preselectedEleveId) {
        setSelectedStudent(null);
        setStudentSearch('');
      }
      return;
    }

    setLoadingStudents(true);
    apiFetch(`/api/eleves?classeId=${selectedClasseId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudentsInClass(data);
          // If there was a preselected student, find it
          if (preselectedEleveId) {
            const match = data.find((e: any) => e.id === preselectedEleveId);
            if (match) {
              setSelectedStudent(match);
              setStudentSearch(`${match.nom} ${match.prenom}`);
            }
          }
        } else {
          setStudentsInClass([]);
        }
      })
      .catch(err => {
        console.error("Erreur chargement élèves de la classe:", err);
        setStudentsInClass([]);
      })
      .finally(() => setLoadingStudents(false));
  }, [selectedClasseId, preselectedEleveId]);

  // Filter students based on user typing (first letters or name/matricule)
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return studentsInClass;
    const query = studentSearch.toLowerCase().trim();
    return studentsInClass.filter((st: any) => {
      const fullName = `${st.nom || ''} ${st.prenom || ''}`.toLowerCase();
      const reverseName = `${st.prenom || ''} ${st.nom || ''}`.toLowerCase();
      const matricule = (st.matricule || '').toLowerCase();
      return fullName.includes(query) || reverseName.includes(query) || matricule.includes(query);
    });
  }, [studentsInClass, studentSearch]);

  // Selected class object
  const currentClasse = useMemo(() => {
    return classes.find(c => c.id.toString() === selectedClasseId);
  }, [classes, selectedClasseId]);

  // Handle year selection for arrears
  const handleSelectAnneeConcernee = (yearId: number | string, yearLibelle: string, suggestedAmount?: number) => {
    setSelectedAnneeConcerneeId(yearId);
    setSelectedAnneeConcerneeLibelle(yearLibelle);
    setSelectedTranche('Arriérés de scolarité (années antérieures)');
    
    if (suggestedAmount !== undefined && suggestedAmount > 0) {
      setMontant(suggestedAmount.toString());
    } else if (Number(selectedStudent?.arrieres_scolarite || 0) > 0) {
      setMontant(Number(selectedStudent.arrieres_scolarite).toString());
    }

    setNote(`Règlement arriérés de scolarité - Année ${yearLibelle}`);
  };

  // Update suggested amount when student or tranche changes
  const applyTrancheAmount = (trancheName: string, student = selectedStudent, cls = currentClasse) => {
    setSelectedTranche(trancheName);
    if (!student && !cls) return;

    const t1 = Number(cls?.tranche1_montant || 0);
    const t2 = Number(cls?.tranche2_montant || 0);
    const t3 = Number(cls?.tranche3_montant || 0);
    const totalDue = Number(cls?.frais_scolarite || student?.frais_scolarite || 0);
    const alreadyPaid = Number(student?.total_paye_scolarite || 0);
    const resteScol = Math.max(0, totalDue - alreadyPaid);
    const arrieres = Number(student?.arrieres_scolarite || 0);

    if (trancheName === 'Tranche 1') {
      if (t1 > 0) {
        const remainingT1 = Math.max(0, t1 - alreadyPaid);
        setMontant(remainingT1 > 0 ? remainingT1.toString() : t1.toString());
      } else {
        setMontant(Math.min(resteScol, Math.round(totalDue / 3)).toString());
      }
    } else if (trancheName === 'Tranche 2') {
      if (t2 > 0) {
        setMontant(t2.toString());
      } else {
        setMontant(Math.min(resteScol, Math.round(totalDue / 3)).toString());
      }
    } else if (trancheName === 'Tranche 3') {
      if (t3 > 0) {
        setMontant(t3.toString());
      } else {
        setMontant(resteScol.toString());
      }
    } else if (trancheName === 'Solde total scolarité') {
      setMontant(resteScol.toString());
    } else if (trancheName === 'Arriérés de scolarité (années antérieures)') {
      // Find selected year remainder if available
      const selYearObj = arrieresData?.arrieres_detail?.find((y: any) => y.annee_id.toString() === selectedAnneeConcerneeId?.toString());
      if (selYearObj && selYearObj.reste_a_payer > 0) {
        setMontant(selYearObj.reste_a_payer.toString());
      } else {
        setMontant(arrieres.toString());
      }
      if (selectedAnneeConcerneeLibelle) {
        setNote(`Règlement arriérés scolarité - Année ${selectedAnneeConcerneeLibelle}`);
      }
    } else if (trancheName === 'Tout solder (Scolarité + Arriérés)') {
      setMontant((resteScol + arrieres).toString());
    }
  };

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.nom} ${student.prenom}`);
    setIsDropdownOpen(false);

    // Auto-select tranche based on what is pending
    const arrieres = Number(student.arrieres_scolarite || 0);
    const totalPaid = Number(student.total_paye_scolarite || 0);
    const t1 = Number(currentClasse?.tranche1_montant || 0);
    const t2 = Number(currentClasse?.tranche2_montant || 0);

    if (initialIsArrieres || (arrieres > 0 && totalPaid === 0)) {
      applyTrancheAmount('Arriérés de scolarité (années antérieures)', student);
    } else if (totalPaid < t1) {
      applyTrancheAmount('Tranche 1', student);
    } else if (t2 > 0 && totalPaid < (t1 + t2)) {
      applyTrancheAmount('Tranche 2', student);
    } else {
      applyTrancheAmount('Solde total scolarité', student);
    }
  };

  // Submit payment & trigger PDF download
  const handleValidatePayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClasseId) {
      toast.error("Veuillez sélectionner une classe.");
      return;
    }

    if (!selectedStudent) {
      toast.error("Veuillez sélectionner un élève.");
      return;
    }

    const isArrieresOnly = selectedTranche === 'Arriérés de scolarité (années antérieures)';
    if (isArrieresOnly && !selectedAnneeConcerneeId && !selectedAnneeConcerneeLibelle) {
      toast.error("Veuillez sélectionner l'année scolaire concernée par les arriérés.");
      return;
    }

    const montantNum = Number(montant);
    if (isNaN(montantNum) || montantNum <= 0) {
      toast.error("Veuillez saisir un montant valide supérieur à 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        eleve_id: selectedStudent.id,
        classe_nom: currentClasse?.nom || selectedStudent.classe_nom,
        type_paiement: isArrieresOnly ? 'Arriérés de scolarité' : 'Frais de scolarité',
        tranche: isArrieresOnly && selectedAnneeConcerneeLibelle
          ? `Arriérés (Année ${selectedAnneeConcerneeLibelle})`
          : selectedTranche,
        montant: montantNum,
        date_paiement: datePaiement,
        methode: methode,
        reference_transaction: reference || undefined,
        note: note || (isArrieresOnly && selectedAnneeConcerneeLibelle ? `Règlement arriérés scolarité ${selectedAnneeConcerneeLibelle}` : undefined),
        annee_id: schoolInfo?.active_year_id || undefined,
        annee_concernee_id: isArrieresOnly ? selectedAnneeConcerneeId : undefined,
        annee_concernee_libelle: isArrieresOnly ? selectedAnneeConcerneeLibelle : undefined
      };

      const res = await apiFetch('/api/paiements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'enregistrement du paiement");
      }

      toast.success("Paiement validé avec succès ! Génération du reçu...");

      // Calculate remaining amounts for the receipt
      const priorPaidScol = Number(selectedStudent.total_paye_scolarite || 0);
      const totalScolDue = Number(currentClasse?.frais_scolarite || selectedStudent.frais_scolarite || 0);
      const paymentForScol = isArrieresOnly ? 0 : montantNum;
      const newPaidScol = priorPaidScol + paymentForScol;
      const newResteScol = Math.max(0, totalScolDue - newPaidScol);

      const priorArrieres = Number(selectedStudent.arrieres_scolarite || 0);
      const paymentForArrieres = isArrieresOnly ? montantNum : 0;
      const newResteArrieres = data.nouveau_solde_arrieres !== undefined 
        ? data.nouveau_solde_arrieres 
        : Math.max(0, priorArrieres - paymentForArrieres);

      const paymentForReceipt = {
        ...payload,
        id: data.id,
        eleve_nom: selectedStudent.nom,
        eleve_prenom: selectedStudent.prenom,
        eleve_matricule: selectedStudent.matricule,
        eleve_classe: currentClasse?.nom || selectedStudent.classe_nom,
        annee_concernee_id: isArrieresOnly ? selectedAnneeConcerneeId : undefined,
        annee_concernee_libelle: isArrieresOnly ? (data.annee_concernee_libelle || selectedAnneeConcerneeLibelle) : undefined,
        reste_scolarite: newResteScol,
        reste_inscription: Math.max(0, (selectedStudent.frais_inscription || 0) - (selectedStudent.total_paye_inscription || 0)),
        inscription_payee: (selectedStudent.total_paye_inscription || 0) >= (selectedStudent.frais_inscription || 0),
        arrieres_anterieurs: priorArrieres,
        reste_arrieres: newResteArrieres,
        eleve_arrieres: newResteArrieres
      };

      // Set success payment state
      setSuccessPayment(paymentForReceipt);

      // Trigger automatic receipt PDF download immediately (Format A5)!
      try {
        setGeneratingPdf(true);
        const doc = await generateReceiptPDF(paymentForReceipt, schoolInfo);
        const safeName = `${selectedStudent.nom || ''}_${selectedStudent.prenom || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
        const filename = isArrieresOnly && selectedAnneeConcerneeLibelle
          ? `Recu_A5_Arrieres_${selectedAnneeConcerneeLibelle}_${safeName}_${data.id || Date.now()}.pdf`
          : `Recu_A5_Paiement_${safeName}_${data.id || Date.now()}.pdf`;
        await downloadReceiptPDF(doc, schoolInfo, filename);
        toast.success("Reçu de paiement A5 téléchargé en PDF !");
      } catch (pdfErr) {
        console.error("Erreur génération PDF auto:", pdfErr);
        toast.error("Paiement enregistré, mais erreur lors du téléchargement auto du PDF.");
      } finally {
        setGeneratingPdf(false);
      }

      notifyAppUpdate();
      onSuccess(paymentForReceipt);

    } catch (err: any) {
      console.error("Erreur validation paiement:", err);
      toast.error(err.message || "Impossible d'enregistrer le paiement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPdfAgain = async () => {
    if (!successPayment) return;
    try {
      setGeneratingPdf(true);
      const safeName = `${successPayment.eleve_nom || ''}_${successPayment.eleve_prenom || ''}`.trim().replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Recu_A5_Paiement_${safeName}_${successPayment.id || Date.now()}.pdf`;
      await downloadReceiptPDF(successPayment, schoolInfo, filename);
      toast.success("Reçu A5 téléchargé !");
    } catch (e) {
      console.error("Erreur téléchargement PDF:", e);
      toast.error("Erreur téléchargement PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!successPayment) return;
    try {
      setGeneratingPdf(true);
      await printReceiptPDF(successPayment, schoolInfo);
    } catch (e) {
      console.error("Erreur impression PDF:", e);
      toast.error("Erreur impression PDF.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleResetForNewPayment = () => {
    setSuccessPayment(null);
    setSelectedStudent(null);
    setStudentSearch('');
    setMontant('');
    setSelectedTranche('Tranche 1');
    setReference('');
    setNote('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white shadow-inner">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">
                  Enregistrer un Paiement de Scolarité
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  Encaissement sécurisé avec calcul des tranches, arriérés et reçu officiel PDF
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content body: If payment completed successfully, show success summary & actions */}
        {successPayment ? (
          <div className="p-6 sm:p-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <h4 className="text-2xl font-black text-slate-900">
                Paiement Encaissé avec Succès !
              </h4>
              <p className="text-sm text-slate-500">
                Reçu officiel N° <span className="font-bold text-slate-800">REC-{String(successPayment.id).padStart(5, '0')}</span> pour <span className="font-bold text-slate-800">{successPayment.eleve_nom} {successPayment.eleve_prenom}</span>
              </p>
            </div>

            {/* Receipt Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Montant Encaissé</span>
                <span className="text-lg font-black text-emerald-600">{Number(successPayment.montant).toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Élève & Classe</span>
                  <span className="font-bold text-slate-800">{successPayment.eleve_nom} {successPayment.eleve_prenom} ({successPayment.eleve_classe})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Tranche / Motif</span>
                  <span className="font-bold text-slate-800">{successPayment.tranche || 'Scolarité'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Reste Scolarité (Année en cours)</span>
                  <span className={`font-bold ${successPayment.reste_scolarite > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {Number(successPayment.reste_scolarite).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Arriérés Années Antérieures</span>
                  <span className={`font-bold ${successPayment.reste_arrieres > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {successPayment.reste_arrieres > 0 ? `${Number(successPayment.reste_arrieres).toLocaleString('fr-FR')} FCFA` : 'Aucun (0 FCFA)'}
                  </span>
                </div>

                {successPayment.annee_concernee_libelle && (
                  <div className="col-span-2 mt-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                    <span className="text-amber-800 font-bold text-xs">Année scolaire concernée par les arriérés :</span>
                    <span className="font-black text-amber-950 px-2.5 py-0.5 rounded-lg bg-amber-200 text-xs">
                      {successPayment.annee_concernee_libelle}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleDownloadPdfAgain}
                disabled={generatingPdf}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-200 transition-all"
              >
                <Download size={18} />
                {generatingPdf ? 'Génération...' : 'Télécharger le Reçu PDF'}
              </button>

              <button
                onClick={handlePrintReceipt}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <Printer size={18} />
                Imprimer
              </button>

              <button
                onClick={handleResetForNewPayment}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw size={18} />
                Nouvel Encaissement
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleValidatePayment} className="p-5 sm:p-7 space-y-5">
            {/* Step 1: Choix de la classe */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Choisir la classe <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedClasseId}
                onChange={(e) => {
                  setSelectedClasseId(e.target.value);
                  setSelectedStudent(null);
                  setStudentSearch('');
                }}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-sm text-slate-900 shadow-xs"
              >
                <option value="">-- Sélectionner une classe --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    {c.nom} {c.frais_scolarite ? `(Scolarité: ${Number(c.frais_scolarite).toLocaleString()} FCFA)` : ''}
                  </option>
                ))}
              </select>

              {loadingClasses && (
                <p className="text-xs text-slate-400">Chargement des classes...</p>
              )}
            </div>

            {/* Step 2: Sélection de l'élève avec autocomplétion instantanée */}
            <div className="space-y-1.5 relative">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  2. Sélection de l'élève <span className="text-rose-500">*</span>
                </label>
                {selectedClasseId && (
                  <span className="text-xs text-slate-400">
                    {loadingStudents ? 'Chargement des élèves...' : `${studentsInClass.length} élève(s) dans cette classe`}
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Search size={18} />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={selectedClasseId ? "Tapez les premières lettres du nom ou le matricule..." : "Sélectionnez d'abord une classe..."}
                  disabled={!selectedClasseId || loadingStudents}
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setIsDropdownOpen(true);
                    if (selectedStudent && e.target.value !== `${selectedStudent.nom} ${selectedStudent.prenom}`) {
                      setSelectedStudent(null);
                    }
                  }}
                  onFocus={() => {
                    if (selectedClasseId && studentsInClass.length > 0) {
                      setIsDropdownOpen(true);
                    }
                  }}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-sm text-slate-900 shadow-xs disabled:bg-slate-50 disabled:text-slate-400"
                />
                {studentSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentSearch('');
                      setSelectedStudent(null);
                    }}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Autocomplete Suggestions Dropdown */}
              {isDropdownOpen && selectedClasseId && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-xl divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Aucun élève trouvé correspondant à "{studentSearch}"
                    </div>
                  ) : (
                    filteredStudents.map((st: any) => {
                      const arrieres = Number(st.arrieres_scolarite || 0);
                      const isSelected = selectedStudent?.id === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleSelectStudent(st)}
                          className={`w-full px-4 py-2.5 text-left flex items-center justify-between hover:bg-emerald-50/70 transition-colors ${
                            isSelected ? 'bg-emerald-50 text-emerald-900' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                              {st.nom?.charAt(0) || 'E'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">
                                {st.nom} {st.prenom}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                Mat: {st.matricule || 'N/A'} • Scolarité payée: {Number(st.total_paye_scolarite || 0).toLocaleString()} F
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {arrieres > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Arriérés: {arrieres.toLocaleString()} F
                              </span>
                            )}
                            {isSelected && <Check size={16} className="text-emerald-600" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* Selected Student Financial Snapshot */}
              {selectedStudent && (
                <div className="mt-2 p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
                        <User size={16} />
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-slate-900">
                          {selectedStudent.nom} {selectedStudent.prenom}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Matricule: {selectedStudent.matricule} • Classe: {currentClasse?.nom || selectedStudent.classe_nom}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-white text-emerald-700 border border-emerald-200 shadow-2xs">
                      Élève sélectionné
                    </span>
                  </div>

                  {/* Financial breakdown chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-100/80 text-[11px]">
                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-400 block text-[10px]">Scolarité totale</span>
                      <span className="font-bold text-slate-800">
                        {Number(currentClasse?.frais_scolarite || selectedStudent.frais_scolarite || 0).toLocaleString()} F
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-400 block text-[10px]">Déjà encaissé</span>
                      <span className="font-bold text-emerald-600">
                        {Number(selectedStudent.total_paye_scolarite || 0).toLocaleString()} F
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-400 block text-[10px]">Reste année en cours</span>
                      <span className={`font-bold ${selectedStudent.reste_scolarite > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {Number(selectedStudent.reste_scolarite ?? Math.max(0, (currentClasse?.frais_scolarite || 0) - (selectedStudent.total_paye_scolarite || 0))).toLocaleString()} F
                      </span>
                    </div>
                    <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                      <span className="text-slate-400 block text-[10px]">Arriérés antérieurs</span>
                      <span className={`font-bold ${Number(selectedStudent.arrieres_scolarite || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {Number(selectedStudent.arrieres_scolarite || 0) > 0 
                          ? `${Number(selectedStudent.arrieres_scolarite).toLocaleString()} F` 
                          : '0 F'}
                      </span>
                    </div>
                  </div>

                  {/* Arrears notification banner if applicable */}
                  {Number(selectedStudent.arrieres_scolarite || 0) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-900 text-xs">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                      <span>
                        <strong>Attention :</strong> Cet élève a un arriéré de <strong>{Number(selectedStudent.arrieres_scolarite).toLocaleString()} FCFA</strong> reporté de l'année précédente.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Choix de la tranche de scolarité */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Choix de la tranche de scolarité <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { 
                    id: 'Tranche 1', 
                    label: 'Tranche 1', 
                    sub: currentClasse?.tranche1_montant ? `${Number(currentClasse.tranche1_montant).toLocaleString()} F` : '1ère part'
                  },
                  { 
                    id: 'Tranche 2', 
                    label: 'Tranche 2', 
                    sub: currentClasse?.tranche2_montant ? `${Number(currentClasse.tranche2_montant).toLocaleString()} F` : '2ème part'
                  },
                  { 
                    id: 'Tranche 3', 
                    label: 'Tranche 3', 
                    sub: currentClasse?.tranche3_montant ? `${Number(currentClasse.tranche3_montant).toLocaleString()} F` : '3ème part'
                  },
                  { 
                    id: 'Solde total scolarité', 
                    label: 'Solde Année', 
                    sub: 'Tout solder'
                  },
                  { 
                    id: 'Arriérés de scolarité (années antérieures)', 
                    label: 'Arriérés Antérieurs', 
                    sub: Number(selectedStudent?.arrieres_scolarite || 0) > 0 
                      ? `${Number(selectedStudent.arrieres_scolarite).toLocaleString()} F`
                      : 'Année passée',
                    highlight: Number(selectedStudent?.arrieres_scolarite || 0) > 0 || initialIsArrieres
                  },
                  { 
                    id: 'Autre montant libre', 
                    label: 'Montant libre', 
                    sub: 'Saisie manuelle'
                  }
                ].map((tr) => (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => applyTrancheAmount(tr.id)}
                    className={`p-2.5 rounded-2xl border text-left transition-all ${
                      selectedTranche === tr.id
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : tr.highlight
                          ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                          : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/30'
                    }`}
                  >
                    <span className="block text-xs font-bold leading-tight">{tr.label}</span>
                    <span className={`block text-[10px] mt-0.5 ${selectedTranche === tr.id ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {tr.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3.1: Sélection de l'année scolaire concernée par les arriérés */}
            {selectedTranche === 'Arriérés de scolarité (années antérieures)' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-amber-700" />
                    <label className="text-xs font-black uppercase tracking-wider text-amber-950">
                      Sélectionner l'Année Scolaire Concernée par les Arriérés <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  {loadingArrieres && (
                    <span className="text-[11px] text-amber-700 font-semibold animate-pulse">
                      Chargement de l'historique...
                    </span>
                  )}
                </div>

                <p className="text-xs text-amber-900 leading-relaxed">
                  Indiquez précisément au titre de quelle année scolaire les arriérés sont encaissés. Le reçu officiel PDF et les rapports financiers mentionneront explicitement cette année.
                </p>

                {/* Si on a les détails par année de l'élève */}
                {arrieresData?.arrieres_detail && arrieresData.arrieres_detail.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {arrieresData.arrieres_detail.map((yearItem: any) => {
                      const isSelected = selectedAnneeConcerneeId?.toString() === yearItem.annee_id?.toString();
                      return (
                        <button
                          key={yearItem.annee_id}
                          type="button"
                          onClick={() => handleSelectAnneeConcernee(yearItem.annee_id, yearItem.libelle, yearItem.reste_a_payer)}
                          className={`p-3 rounded-xl border text-left transition-all relative ${
                            isSelected
                              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-300'
                              : 'bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:bg-amber-100/60'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm tracking-wide">
                              Année {yearItem.libelle}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-white text-amber-600 flex items-center justify-center shadow-xs">
                                <Check size={13} strokeWidth={3} />
                              </div>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                            {yearItem.classe_nom && (
                              <span className={`px-2 py-0.5 rounded-md font-semibold ${
                                isSelected ? 'bg-amber-700/60 text-white' : 'bg-slate-100 text-slate-700'
                              }`}>
                                Classe : {yearItem.classe_nom}
                              </span>
                            )}
                            {yearItem.reste_a_payer > 0 ? (
                              <span className={`px-2 py-0.5 rounded-md font-black ${
                                isSelected ? 'bg-white text-amber-900' : 'bg-rose-100 text-rose-800'
                              }`}>
                                Reste dû : {Number(yearItem.reste_a_payer).toLocaleString()} FCFA
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-md font-bold ${
                                isSelected ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                Soldé (0 F)
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Sélecteur de repli pour toutes les années antérieures */
                  <select
                    value={selectedAnneeConcerneeId}
                    onChange={(e) => {
                      const yId = e.target.value;
                      const yObj = arrieresData?.annees_anterieures?.find((a: any) => a.id.toString() === yId);
                      handleSelectAnneeConcernee(yId, yObj?.libelle || `Année ${yId}`);
                    }}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white font-bold text-sm text-slate-900 shadow-xs"
                  >
                    <option value="">-- Choisir une année scolaire antérieure --</option>
                    {arrieresData?.annees_anterieures?.map((y: any) => (
                      <option key={y.id} value={y.id.toString()}>
                        Année Scolaire {y.libelle}
                      </option>
                    ))}
                  </select>
                )}

                {selectedAnneeConcerneeLibelle ? (
                  <div className="text-xs text-amber-950 bg-white/90 p-2.5 rounded-xl border border-amber-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Sparkles size={14} className="text-amber-600" />
                      Année ciblée : <strong className="font-black text-amber-950">{selectedAnneeConcerneeLibelle}</strong>
                    </span>
                    <span className="text-[11px] text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                      Mentionné sur le Reçu PDF
                    </span>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    * Veuillez cliquer sur une année scolaire ci-dessus pour la sélectionner.
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Entrée du montant à encaisser */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  4. Montant à encaisser (FCFA) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-xs">
                    FCFA
                  </div>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    required
                    placeholder="Ex: 25000"
                    value={montant}
                    onChange={(e) => setMontant(e.target.value)}
                    className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-bold text-base text-slate-900 shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Mode de règlement
                </label>
                <select
                  value={methode}
                  onChange={(e) => setMethode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-sm text-slate-900 shadow-xs"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Mobile Money (MTN / Moov / Wave)">Mobile Money (MTN / Moov / Wave)</option>
                  <option value="Carte Bancaire">Carte Bancaire</option>
                </select>
              </div>
            </div>

            {/* Date & Référence facultative */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Date de paiement
                </label>
                <input
                  type="date"
                  value={datePaiement}
                  onChange={(e) => setDatePaiement(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-sm text-slate-900 shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  N° Reçu bordereau / Réf. (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: CHQ-88902 ou BOR-2025"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium text-sm text-slate-900 shadow-xs"
                />
              </div>
            </div>

            {/* Note additionnelle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Observation / Remarque (optionnel)
              </label>
              <input
                type="text"
                placeholder="Ex: Versé par la mère, reste à payer avant fin du mois"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-xs text-slate-700 shadow-xs"
              />
            </div>

            {/* Submit & Cancel Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={submitting || !selectedClasseId || !selectedStudent || !montant}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Validation en cours...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Valider le Paiement & Télécharger le Reçu PDF
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
