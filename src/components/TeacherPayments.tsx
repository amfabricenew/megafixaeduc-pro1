import React from 'react';
import { apiFetch } from '../utils/api';
import { generateSchoolYearWeeks, MonthGroup, WeekItem } from '../utils/weeks';
import { 
  CheckCircle, Lock, Unlock, AlertTriangle, Calendar, DollarSign, 
  Save, Download, Printer, User, Clock, Check, Edit2, ShieldAlert, FileText, ArrowRight, ArrowLeft,
  Plus, Trash2, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { jsPDF } from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import TeacherTimetableModal, { generateTeacherTimetablePDF } from './TeacherTimetableModal';

interface TeacherPaymentsProps {
  schoolInfo: any;
}

export interface TimetableSlotItem {
  id: string | number;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  classe_nom: string;
  matiere_nom: string;
  heures_prevues: number;
  heures_effectuees: number;
  checked: boolean;
  isCustom?: boolean;
}

function parseSlotDuration(heureDebut: string, heureFin: string): number {
  if (!heureDebut || !heureFin) return 1;
  const cleanStart = String(heureDebut).toLowerCase().replace('h', ':');
  const cleanEnd = String(heureFin).toLowerCase().replace('h', ':');
  const [h1, m1 = 0] = cleanStart.split(':').map(n => parseInt(n) || 0);
  const [h2, m2 = 0] = cleanEnd.split(':').map(n => parseInt(n) || 0);
  const startMins = h1 * 60 + m1;
  const endMins = h2 * 60 + m2;
  const diffHours = (endMins - startMins) / 60;
  return diffHours > 0 ? diffHours : 1;
}

const formatFCFA = (val: number | string): string => {
  const num = typeof val === 'number' ? val : (parseFloat(val) || 0);
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
};

export default function TeacherPayments({ schoolInfo }: TeacherPaymentsProps) {
  const [activeCycle, setActiveCycle] = React.useState<'primaire' | 'secondaire'>('primaire');
  const [activeYear, setActiveYear] = React.useState<any>(null);
  const [teachers, setTeachers] = React.useState<any[]>([]);
  const [validatedWeeks, setValidatedWeeks] = React.useState<Set<number>>(new Set());
  const [selectedWeek, setSelectedWeek] = React.useState<WeekItem | null>(null);
  
  // Primaire State
  const [selectedMonth, setSelectedMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [monthlyPayments, setMonthlyPayments] = React.useState<any[]>([]);
  const [editingTeacherId, setEditingTeacherId] = React.useState<number | null>(null);
  const [fixedSalaryInput, setFixedSalaryInput] = React.useState<string>('');
  
  // Payment Modal State
  const [showPayModal, setShowPayModal] = React.useState(false);
  const [payModalTeacher, setPayModalTeacher] = React.useState<any>(null);
  const [payModalPaidAmount, setPayModalPaidAmount] = React.useState<string>('');
  const [payModalMethod, setPayModalMethod] = React.useState<string>('Espèces');
  const [payModalComments, setPayModalComments] = React.useState<string>('');

  // Secondaire State
  const [secondaireSubView, setSecondaireSubView] = React.useState<'hebdo' | 'mensuel'>('hebdo');
  const [selectedSecondaryMonth, setSelectedSecondaryMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [weeklyBilans, setWeeklyBilans] = React.useState<any[]>([]);
  const [bilanDraft, setBilanDraft] = React.useState<Record<number, { heures_prevues: number; heures_effectuees: number; taux_horaire: number; commentaires: string }>>({});
  const [slotsDraft, setSlotsDraft] = React.useState<Record<number, TimetableSlotItem[]>>({});
  const [expandedTeachers, setExpandedTeachers] = React.useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = React.useState(false);

  // Timetable modal state
  const [timetableTeacher, setTimetableTeacher] = React.useState<any>(null);
  const [showTimetableModal, setShowTimetableModal] = React.useState<boolean>(false);
  const currentMonthKey = React.useMemo(() => new Date().toISOString().slice(0, 7), []);

  // Personnel Administratif State
  const [adminStaffList, setAdminStaffList] = React.useState<any[]>([]);
  const [adminPaymentsList, setAdminPaymentsList] = React.useState<any[]>([]);
  const [selectedAdminMonth, setSelectedAdminMonth] = React.useState<string>(new Date().toISOString().slice(0, 7));
  const [showAdminPayModal, setShowAdminPayModal] = React.useState(false);
  const [adminPayMember, setAdminPayMember] = React.useState<any>(null);
  const [adminPayBaseSalary, setAdminPayBaseSalary] = React.useState<string>('0');
  const [adminPayPrime, setAdminPayPrime] = React.useState<string>('0');
  const [adminPayRetenue, setAdminPayRetenue] = React.useState<string>('0');
  const [adminPayPaidAmount, setAdminPayPaidAmount] = React.useState<string>('0');
  const [adminPayMethod, setAdminPayMethod] = React.useState<string>('Espèces');
  const [adminPayComments, setAdminPayComments] = React.useState<string>('');

  // Fetch active school year
  const fetchActiveYear = () => {
    apiFetch('/api/annees/active')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setActiveYear(data);
        }
      })
      .catch(err => console.error(err));
  };

  // Fetch all teachers
  const fetchTeachers = () => {
    apiFetch('/api/enseignants')
      .then(res => res.json())
      .then(data => setTeachers(Array.isArray(data) ? data : []))
      .catch(() => setTeachers([]));
  };

  // Fetch monthly payments for Primaire & Secondaire
  const fetchMonthlyPayments = () => {
    if (!activeYear?.id) return;
    apiFetch(`/api/enseignant-paiements-mensuels?annee_id=${activeYear.id}`)
      .then(res => res.json())
      .then(data => setMonthlyPayments(Array.isArray(data) ? data : []))
      .catch(() => setMonthlyPayments([]));
  };

  // Fetch validated weeks for Secondaire
  const fetchWeeklyBilansForYear = () => {
    if (!activeYear?.id) return;
    apiFetch(`/api/enseignant-bilans-hebdo?annee_id=${activeYear.id}`)
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        const validatedNums = new Set<number>();
        list.forEach((b: any) => {
          if (b.statut === 'Validé' || b.statut === 'Payé') {
            validatedNums.add(b.semaine_numero);
          }
        });
        setValidatedWeeks(validatedNums);
        setWeeklyBilans(list);
      })
      .catch(() => setWeeklyBilans([]));
  };

  // Fetch Admin staff & payments
  const fetchAdminStaff = () => {
    apiFetch('/api/personnel-administratif')
      .then(res => res.json())
      .then(data => setAdminStaffList(Array.isArray(data) ? data : []))
      .catch(() => setAdminStaffList([]));
  };

  const fetchAdminPayments = () => {
    if (!activeYear?.id) return;
    apiFetch(`/api/personnel-paiements?annee_id=${activeYear.id}&mois=${selectedAdminMonth}`)
      .then(res => res.json())
      .then(data => setAdminPaymentsList(Array.isArray(data) ? data : []))
      .catch(() => setAdminPaymentsList([]));
  };

  React.useEffect(() => {
    fetchActiveYear();
    fetchTeachers();
    fetchAdminStaff();
  }, []);

  React.useEffect(() => {
    if (activeYear?.id) {
      fetchMonthlyPayments();
      fetchWeeklyBilansForYear();
      fetchAdminPayments();
    }
  }, [activeYear, selectedAdminMonth]);

  const handleOpenAdminPayModal = (member: any) => {
    setAdminPayMember(member);
    const existing = adminPaymentsList.find((p: any) => p.personnel_id === member.id);
    const baseSalary = existing ? String(existing.montant) : String(member.salaire_mensuel || 0);
    const primeVal = existing ? String(existing.prime || 0) : '0';
    const retenueVal = existing ? String(existing.retenue || 0) : '0';
    const netToPay = Math.max(0, parseFloat(baseSalary) + parseFloat(primeVal) - parseFloat(retenueVal));
    const paidVal = existing ? String(existing.montant_paye) : String(netToPay);

    setAdminPayBaseSalary(baseSalary);
    setAdminPayPrime(primeVal);
    setAdminPayRetenue(retenueVal);
    setAdminPayPaidAmount(paidVal);
    setAdminPayMethod(existing?.methode || 'Espèces');
    setAdminPayComments(existing?.commentaires || '');
    setShowAdminPayModal(true);
  };

  const handleAdminPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear?.id || !adminPayMember) return;

    try {
      const res = await apiFetch('/api/personnel-paiements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annee_id: activeYear.id,
          personnel_id: adminPayMember.id,
          mois: selectedAdminMonth,
          montant: parseFloat(adminPayBaseSalary) || 0,
          prime: parseFloat(adminPayPrime) || 0,
          retenue: parseFloat(adminPayRetenue) || 0,
          montant_paye: parseFloat(adminPayPaidAmount) || 0,
          date_paiement: new Date().toISOString().split('T')[0],
          methode: adminPayMethod,
          commentaires: adminPayComments
        })
      });
      if (res.ok) {
        toast.success(`Paiement enregistré pour ${adminPayMember.nom} ${adminPayMember.prenom}`);
        setShowAdminPayModal(false);
        fetchAdminPayments();
      } else {
        toast.error("Erreur lors de l'enregistrement du paiement");
      }
    } catch(err) {
      toast.error("Erreur réseau");
    }
  };

  const generateAdminSalaryReceiptPDF = (member: any, payment: any) => {
    const doc = new jsPDF();
    const s = schoolInfo;

    if (s?.logo) {
      try { doc.addImage(s.logo, 'PNG', 15, 12, 22, 22); } catch(e){}
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(s?.nom || 'Établissement Scolaire', 42, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s?.adresse || ''} | Tél: ${s?.telephone || ''}`, 42, 26);
    doc.text(`Email: ${s?.email || ''}`, 42, 31);

    doc.setDrawColor(220);
    doc.line(15, 38, 195, 38);

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('BULLETIN DE PAIE - PERSONNEL ADMINISTRATIF', 105, 48, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date de règlement: ${payment?.date_paiement || new Date().toLocaleDateString('fr-FR')}`, 135, 58);
    doc.text(`Période / Mois: ${selectedAdminMonth}`, 135, 64);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS DE L\'AGENT', 15, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom & Prénom: ${member.nom} ${member.prenom}`, 15, 68);
    doc.text(`Poste / Fonction: ${member.poste}`, 15, 74);
    doc.text(`Contrat: ${member.type_contrat || 'CDI'}`, 15, 80);

    const baseSalary = payment?.montant ?? member.salaire_mensuel ?? 0;
    const prime = payment?.prime ?? 0;
    const retenue = payment?.retenue ?? 0;
    const netToPay = payment?.net_a_payer ?? Math.max(0, baseSalary + prime - retenue);
    const paid = payment?.montant_paye ?? 0;
    const remaining = payment?.reste_a_payer ?? Math.max(0, netToPay - paid);

    autoTable(doc, {
      startY: 88,
      head: [['Élément de Paie', 'Détail', 'Montant']],
      body: [
        ['Salaire de base contractuel', 'Mensuel', formatFCFA(baseSalary)],
        ['Primes & Gratifications', 'Supplément', `+ ${formatFCFA(prime)}`],
        ['Retenues & Avances', 'Déduction', `- ${formatFCFA(retenue)}`],
        ['NET À PAYER', 'Salaire Net', formatFCFA(netToPay)],
        ['Montant Effectif Versé', payment?.methode || 'Espèces', formatFCFA(paid)],
        ['Solde Restant Dû', remaining === 0 ? 'Réglé à 100%' : 'Reste à payer', formatFCFA(remaining)]
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature de l\'Agent', 20, finalY + 25);
    doc.text('Signature de la Direction / Comptabilité', 125, finalY + 25);

    doc.save(`Bulletin_Paie_Admin_${member.nom}_${member.prenom}_${selectedAdminMonth}.pdf`);
  };

  // Filter teachers by cycle
  const primaireTeachers = React.useMemo(() => {
    return teachers.filter(t => (t.cycle || '').toLowerCase() === 'primaire' || (t.cycle || '').toLowerCase() === 'maternelle');
  }, [teachers]);

  const secondaireTeachers = React.useMemo(() => {
    return teachers.filter(t => (t.cycle || '').toLowerCase() !== 'primaire' && (t.cycle || '').toLowerCase() !== 'maternelle');
  }, [teachers]);

  // Generate week groups
  const monthGroups: MonthGroup[] = React.useMemo(() => {
    return generateSchoolYearWeeks(activeYear?.date_debut, activeYear?.date_fin, validatedWeeks);
  }, [activeYear, validatedWeeks]);

  // Map week number to monthKey
  const weekToMonthMap = React.useMemo(() => {
    const map: Record<number, { monthKey: string; monthLabel: string }> = {};
    (monthGroups || []).forEach(g => {
      (g?.weeks || []).forEach(w => {
        map[w.number] = { monthKey: g.monthKey, monthLabel: g.monthLabel };
      });
    });
    return map;
  }, [monthGroups]);

  // When a week is selected, compute scheduled hours and load slot details for each secondaire teacher
  const loadWeekBilans = async (week: WeekItem) => {
    setSelectedWeek(week);
    if (!activeYear?.id) return;

    // Existing saved bilans for this week
    const existing = weeklyBilans.filter((b: any) => b.semaine_numero === week.number);
    const draft: Record<number, { heures_prevues: number; heures_effectuees: number; taux_horaire: number; commentaires: string }> = {};
    const slotsDraftData: Record<number, TimetableSlotItem[]> = {};
    const expandedData: Record<number, boolean> = {};

    // Determine which teachers need their timetable fetched
    const teachersToFetch = secondaireTeachers.filter(t => {
      const savedBilan = existing.find((b: any) => b.enseignant_id === t.id);
      let hasSavedSlots = false;
      if (savedBilan && savedBilan.details_creneaux) {
        try {
          const parsed = typeof savedBilan.details_creneaux === 'string' ? JSON.parse(savedBilan.details_creneaux) : savedBilan.details_creneaux;
          if (Array.isArray(parsed) && parsed.length > 0) hasSavedSlots = true;
        } catch(e) {}
      }
      return !hasSavedSlots;
    });

    let bulkTimetable: any[] = [];
    if (teachersToFetch.length > 0) {
      try {
        const ids = teachersToFetch.map(t => t.id).join(',');
        const res = await apiFetch(`/api/emplois/enseignants/bulk?ids=${ids}`);
        bulkTimetable = await res.json();
      } catch(e) {
        console.error("Bulk fetch error:", e);
      }
    }

    for (const t of secondaireTeachers) {
      expandedData[t.id] = true; // Expanded by default
      const savedBilan = existing.find((b: any) => b.enseignant_id === t.id);

      // Check if saved slot details exist
      let savedSlots: TimetableSlotItem[] = [];
      if (savedBilan && savedBilan.details_creneaux) {
        try {
          const parsed = typeof savedBilan.details_creneaux === 'string' ? JSON.parse(savedBilan.details_creneaux) : savedBilan.details_creneaux;
          if (Array.isArray(parsed) && parsed.length > 0) {
            savedSlots = parsed;
          }
        } catch(e) {}
      }

      if (savedSlots.length > 0) {
        slotsDraftData[t.id] = savedSlots;
        const totalEffectuees = savedSlots.reduce((sum, s) => sum + (s.checked ? (parseFloat(s.heures_effectuees as any) || 0) : 0), 0);
        const totalPrevues = savedSlots.reduce((sum, s) => sum + (parseFloat(s.heures_prevues as any) || 0), 0);

        draft[t.id] = {
          heures_prevues: totalPrevues,
          heures_effectuees: totalEffectuees,
          taux_horaire: savedBilan?.taux_horaire || t.taux_horaire || 2500,
          commentaires: savedBilan?.commentaires || ''
        };
      } else {
        // Use from bulkTimetable
        const emplois = bulkTimetable.filter((e: any) => e.enseignant_id === t.id);
        const teacherSlots: TimetableSlotItem[] = [];
        let totalPrevues = 0;

        if (Array.isArray(emplois)) {
          emplois.forEach((e: any) => {
            const dur = parseSlotDuration(e.heure_debut, e.heure_fin);
            totalPrevues += dur;
            teacherSlots.push({
              id: e.id || `slot-${Math.random()}`,
              jour: e.jour || 'Lundi',
              heure_debut: e.heure_debut || '08h00',
              heure_fin: e.heure_fin || '10h00',
              classe_nom: e.classe_nom || 'Classe',
              matiere_nom: e.matiere_nom || 'Matière',
              heures_prevues: dur,
              heures_effectuees: dur,
              checked: true
            });
          });
        }

        slotsDraftData[t.id] = teacherSlots;
        const totalEffectuees = teacherSlots.reduce((sum, s) => sum + (s.checked ? s.heures_effectuees : 0), 0);

        draft[t.id] = {
          heures_prevues: savedBilan?.heures_prevues ?? totalPrevues,
          heures_effectuees: savedBilan?.heures_effectuees ?? totalEffectuees,
          taux_horaire: savedBilan?.taux_horaire ?? (t.taux_horaire || 2500),
          commentaires: savedBilan?.commentaires || ''
        };
      }
    }

    setExpandedTeachers(expandedData);
    setSlotsDraft(slotsDraftData);
    setBilanDraft(draft);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const applyTimetableToTeacher = async (teacherId: number) => {
    try {
      const res = await apiFetch(`/api/emplois/enseignant/${teacherId}`);
      const emplois = await res.json();
      const teacherSlots: TimetableSlotItem[] = [];
      let totalPrevues = 0;

      if (Array.isArray(emplois)) {
        emplois.forEach((e: any) => {
          const dur = parseSlotDuration(e.heure_debut, e.heure_fin);
          totalPrevues += dur;
          teacherSlots.push({
            id: e.id || `slot-${Math.random()}`,
            jour: e.jour || 'Lundi',
            heure_debut: e.heure_debut || '08h00',
            heure_fin: e.heure_fin || '10h00',
            classe_nom: e.classe_nom || 'Classe',
            matiere_nom: e.matiere_nom || 'Matière',
            heures_prevues: dur,
            heures_effectuees: dur,
            checked: true
          });
        });
      }

      setSlotsDraft(prev => ({ ...prev, [teacherId]: teacherSlots }));
      setBilanDraft(prev => ({
        ...prev,
        [teacherId]: {
          ...prev[teacherId],
          heures_prevues: totalPrevues,
          heures_effectuees: totalPrevues
        }
      }));
      toast.success("Emploi du temps appliqué !");
    } catch(err) {
      toast.error("Erreur lors de la récupération de l'emploi du temps.");
    }
  };

  const applyTimetableToAll = async () => {
    if (!confirm("Voulez-vous écraser les saisies actuelles par les heures programmées de l'emploi du temps pour tous les enseignants ?")) return;
    setIsSaving(true);
    try {
      const ids = secondaireTeachers.map(t => t.id).join(',');
      const res = await apiFetch(`/api/emplois/enseignants/bulk?ids=${ids}`);
      const bulkData = await res.json();

      const newSlots: Record<number, TimetableSlotItem[]> = {};
      const newDraft: Record<number, any> = { ...bilanDraft };

      for (const teacher of secondaireTeachers) {
        const emplois = bulkData.filter((e: any) => e.enseignant_id === teacher.id);
        const teacherSlots: TimetableSlotItem[] = [];
        let totalPrevues = 0;

        emplois.forEach((e: any) => {
          const dur = parseSlotDuration(e.heure_debut, e.heure_fin);
          totalPrevues += dur;
          teacherSlots.push({
            id: e.id || `slot-${Math.random()}`,
            jour: e.jour || 'Lundi',
            heure_debut: e.heure_debut || '08h00',
            heure_fin: e.heure_fin || '10h00',
            classe_nom: e.classe_nom || 'Classe',
            matiere_nom: e.matiere_nom || 'Matière',
            heures_prevues: dur,
            heures_effectuees: dur,
            checked: true
          });
        });

        newSlots[teacher.id] = teacherSlots;
        newDraft[teacher.id] = {
          ...newDraft[teacher.id],
          heures_prevues: totalPrevues,
          heures_effectuees: totalPrevues
        };
      }

      setSlotsDraft(newSlots);
      setBilanDraft(newDraft);
      toast.success("Emploi du temps appliqué à tous !");
    } catch(err) {
      toast.error("Erreur lors de l'application groupée.");
    } finally {
      setIsSaving(false);
    }
  };

  // Slot interaction handlers
  const updateSlotChecked = (teacherId: number, slotIndex: number, checked: boolean) => {
    setSlotsDraft(prev => {
      const list = [...(prev[teacherId] || [])];
      if (!list[slotIndex]) return prev;

      const slot = { ...list[slotIndex], checked };
      if (checked && (slot.heures_effectuees <= 0)) {
        slot.heures_effectuees = slot.heures_prevues;
      }
      list[slotIndex] = slot;

      const newTotalEffectuees = list.reduce((sum, s) => sum + (s.checked ? (parseFloat(s.heures_effectuees as any) || 0) : 0), 0);
      setBilanDraft(bPrev => ({
        ...bPrev,
        [teacherId]: {
          ...bPrev[teacherId],
          heures_effectuees: newTotalEffectuees
        }
      }));

      return { ...prev, [teacherId]: list };
    });
  };

  const updateSlotHours = (teacherId: number, slotIndex: number, hours: number) => {
    setSlotsDraft(prev => {
      const list = [...(prev[teacherId] || [])];
      if (!list[slotIndex]) return prev;

      const slot = { ...list[slotIndex], heures_effectuees: hours, checked: hours > 0 };
      list[slotIndex] = slot;

      const newTotalEffectuees = list.reduce((sum, s) => sum + (s.checked ? (parseFloat(s.heures_effectuees as any) || 0) : 0), 0);
      setBilanDraft(bPrev => ({
        ...bPrev,
        [teacherId]: {
          ...bPrev[teacherId],
          heures_effectuees: newTotalEffectuees
        }
      }));

      return { ...prev, [teacherId]: list };
    });
  };

  const toggleAllSlotsForTeacher = (teacherId: number, checkAll: boolean) => {
    setSlotsDraft(prev => {
      const list = (prev[teacherId] || []).map(s => ({
        ...s,
        checked: checkAll,
        heures_effectuees: checkAll ? (s.heures_effectuees > 0 ? s.heures_effectuees : s.heures_prevues) : 0
      }));

      const newTotalEffectuees = list.reduce((sum, s) => sum + (s.checked ? s.heures_effectuees : 0), 0);
      setBilanDraft(bPrev => ({
        ...bPrev,
        [teacherId]: {
          ...bPrev[teacherId],
          heures_effectuees: newTotalEffectuees
        }
      }));

      return { ...prev, [teacherId]: list };
    });
  };

  const handleAddCustomSlot = (teacherId: number) => {
    const newSlot: TimetableSlotItem = {
      id: `custom-${Date.now()}`,
      jour: 'Lundi',
      heure_debut: '08h00',
      heure_fin: '10h00',
      classe_nom: 'Intervention Exceptionnelle',
      matiere_nom: 'Remplacement / Cours',
      heures_prevues: 2,
      heures_effectuees: 2,
      checked: true,
      isCustom: true
    };

    setSlotsDraft(prev => {
      const list = [...(prev[teacherId] || []), newSlot];
      const newTotalEffectuees = list.reduce((sum, s) => sum + (s.checked ? (parseFloat(s.heures_effectuees as any) || 0) : 0), 0);
      const newTotalPrevues = list.reduce((sum, s) => sum + (parseFloat(s.heures_prevues as any) || 0), 0);

      setBilanDraft(bPrev => ({
        ...bPrev,
        [teacherId]: {
          ...bPrev[teacherId],
          heures_prevues: newTotalPrevues,
          heures_effectuees: newTotalEffectuees
        }
      }));

      return { ...prev, [teacherId]: list };
    });
  };

  const handleDeleteCustomSlot = (teacherId: number, slotIndex: number) => {
    setSlotsDraft(prev => {
      const list = (prev[teacherId] || []).filter((_, idx) => idx !== slotIndex);
      const newTotalEffectuees = list.reduce((sum, s) => sum + (s.checked ? (parseFloat(s.heures_effectuees as any) || 0) : 0), 0);
      const newTotalPrevues = list.reduce((sum, s) => sum + (parseFloat(s.heures_prevues as any) || 0), 0);

      setBilanDraft(bPrev => ({
        ...bPrev,
        [teacherId]: {
          ...bPrev[teacherId],
          heures_prevues: newTotalPrevues,
          heures_effectuees: newTotalEffectuees
        }
      }));

      return { ...prev, [teacherId]: list };
    });
  };

  // Save weekly bilans
  const handleSaveWeeklyBilans = async () => {
    if (!selectedWeek || !activeYear?.id) return;
    setIsSaving(true);

    const items = secondaireTeachers.map(t => {
      const d = bilanDraft[t.id] || { heures_prevues: 0, heures_effectuees: 0, taux_horaire: 0, commentaires: '' };
      const existing = weeklyBilans.find((b: any) => b.semaine_numero === selectedWeek.number && b.enseignant_id === t.id);
      return {
        id: existing?.id,
        enseignant_id: t.id,
        heures_prevues: d.heures_prevues,
        heures_effectuees: d.heures_effectuees,
        taux_horaire: d.taux_horaire,
        statut: 'Validé',
        commentaires: d.commentaires,
        details_creneaux: slotsDraft[t.id] || []
      };
    });

    try {
      const res = await apiFetch('/api/enseignant-bilans-hebdo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          annee_id: activeYear.id,
          semaine_numero: selectedWeek.number,
          date_debut: selectedWeek.startDate,
          date_fin: selectedWeek.endDate
        })
      });
      if (res.ok) {
        toast.success(`Bilan de la semaine ${selectedWeek.number} enregistré et validé !`);
        fetchWeeklyBilansForYear();
      } else {
        toast.error("Erreur lors de la validation des bilans.");
      }
    } catch(err) {
      toast.error("Erreur réseau.");
    } finally {
      setIsSaving(false);
    }
  };

  // Save Fixed Salary for Primaire Teacher
  const handleSaveFixedSalary = async (teacherId: number) => {
    const val = parseFloat(fixedSalaryInput);
    if (isNaN(val) || val < 0) {
      toast.error("Veuillez saisir un montant valide.");
      return;
    }
    try {
      const teacher = teachers.find(t => t.id === teacherId);
      const res = await apiFetch(`/api/enseignants/${teacherId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle: teacher?.cycle || 'primaire',
          salaire_fixe: val,
          taux_horaire: teacher?.taux_horaire || 0,
          statut: teacher?.statut || 'Permanent'
        })
      });
      if (res.ok) {
        toast.success("Salaire fixe mis à jour !");
        setEditingTeacherId(null);
        fetchTeachers();
      }
    } catch(err) {
      toast.error("Erreur réseau.");
    }
  };

  // Open Payment Modal
  const openPaymentModal = (teacher: any, targetMonthStr?: string, customCalculatedSalary?: number) => {
    const monthKeyToUse = targetMonthStr || selectedMonth;
    if (teacher.cycle?.toLowerCase() === 'primaire' || teacher.cycle?.toLowerCase() === 'maternelle') {
      if (!teacher.salaire_fixe || teacher.salaire_fixe <= 0) {
        toast.error("Veuillez d'abord définir le salaire mensuel fixe de cet enseignant.");
        return;
      }
    }

    const paymentRecord = monthlyPayments.find(
      (p: any) => p.enseignant_id === teacher.id && p.mois === monthKeyToUse
    );

    const fullSalaryToUse = customCalculatedSalary !== undefined ? customCalculatedSalary : (teacher.salaire_fixe || 0);

    setPayModalTeacher({ ...teacher, targetMonth: monthKeyToUse, calculatedSalary: fullSalaryToUse });
    const existingPaid = paymentRecord
      ? (paymentRecord.montant_paye !== undefined ? paymentRecord.montant_paye : paymentRecord.montant)
      : fullSalaryToUse;

    setPayModalPaidAmount(String(existingPaid));
    setPayModalMethod(paymentRecord?.methode || 'Espèces');
    setPayModalComments(paymentRecord?.commentaires || '');
    setShowPayModal(true);
  };

  // Save Monthly Payment (Primaire & Secondaire)
  const handleSaveMonthlyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeYear?.id || !payModalTeacher) return;

    const isSecondary = payModalTeacher.cycle?.toLowerCase() !== 'primaire' && payModalTeacher.cycle?.toLowerCase() !== 'maternelle';
    const targetMonth = payModalTeacher.targetMonth || selectedMonth;
    const fullSalary = isSecondary ? (payModalTeacher.calculatedSalary || 0) : (payModalTeacher.salaire_fixe || 0);
    const paid = parseFloat(payModalPaidAmount) || 0;

    if (paid < 0) {
      toast.error("Le montant payé ne peut pas être négatif.");
      return;
    }

    try {
      const res = await apiFetch('/api/enseignant-paiements-mensuels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annee_id: activeYear.id,
          enseignant_id: payModalTeacher.id,
          mois: targetMonth,
          type_cycle: isSecondary ? 'secondaire' : 'primaire',
          montant: fullSalary,
          montant_paye: paid,
          date_paiement: new Date().toISOString().split('T')[0],
          methode: payModalMethod,
          commentaires: payModalComments
        })
      });
      if (res.ok) {
        toast.success(`Paiement de ${paid.toLocaleString('fr-FR')} FCFA enregistré pour ${payModalTeacher.nom} ${payModalTeacher.prenom} !`);
        setShowPayModal(false);
        fetchMonthlyPayments();
      } else {
        toast.error("Erreur lors de l'enregistrement du paiement.");
      }
    } catch(err) {
      toast.error("Erreur réseau lors de l'enregistrement.");
    }
  };

  // PDF Generation for Primaire Salary Receipt
  const generateSalaryReceiptPDF = (teacher: any, payment: any) => {
    const doc = new jsPDF();
    const s = schoolInfo;

    if (s?.logo) {
      try { doc.addImage(s.logo, 'PNG', 15, 12, 22, 22); } catch(e){}
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(s?.nom || 'Établissement Scolaire', 42, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s?.adresse || ''} | Tél: ${s?.telephone || ''}`, 42, 26);
    doc.text(`Email: ${s?.email || ''}`, 42, 31);

    doc.setDrawColor(220);
    doc.line(15, 38, 195, 38);

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('BULLETIN DE PAIE / REÇU DE SALAIRE', 105, 48, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date de paiement: ${payment?.date_paiement || new Date().toLocaleDateString('fr-FR')}`, 140, 58);
    doc.text(`Période / Mois: ${payment?.mois || selectedMonth}`, 140, 64);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS ENSEIGNANT', 15, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom & Prénom: ${teacher.nom} ${teacher.prenom}`, 15, 68);
    doc.text(`Cycle: ${teacher.cycle?.toUpperCase() || 'PRIMAIRE / MATERNELLE'}`, 15, 74);
    doc.text(`Téléphone: ${teacher.telephone || 'N/A'}`, 15, 80);

    const fullSalary = teacher.salaire_fixe || payment?.montant || 0;
    const paid = payment ? (payment.montant_paye !== undefined ? payment.montant_paye : payment.montant) : 0;
    const remaining = payment ? (payment.reste_a_payer !== undefined ? payment.reste_a_payer : Math.max(0, fullSalary - paid)) : fullSalary;
    
    let statusText = 'Non réglé';
    if (payment) {
      if (paid >= fullSalary) statusText = 'PAYÉ EN TOTALITÉ';
      else if (paid > 0) statusText = 'PAIEMENT PARTIEL';
      else statusText = 'NON PAYÉ';
    }

    autoTable(doc, {
      startY: 88,
      head: [['Désignation', 'Période', 'Salaire Fixe', 'Montant Versé', 'Solde Restant', 'Statut']],
      body: [
        [
          'Salaire Mensuel Fixe',
          payment?.mois || selectedMonth,
          formatFCFA(fullSalary),
          formatFCFA(paid),
          formatFCFA(remaining),
          statusText
        ]
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Montant Réellement Versé: ${formatFCFA(paid)}`, 15, finalY);
    if (remaining > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Solde Restant à Payer: ${formatFCFA(remaining)}`, 15, finalY + 7);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setTextColor(16, 185, 129);
      doc.text(`Solde de Tout Compte: Réglé à 100%`, 15, finalY + 7);
      doc.setTextColor(0, 0, 0);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature de l\'Enseignant', 20, finalY + 30);
    doc.text('Signature du Comptable / Direction', 130, finalY + 30);

    doc.save(`Fiche_Paie_${teacher.nom}_${teacher.prenom}_${selectedMonth}.pdf`);
  };

  // PDF Generation for Weekly Bilan
  const generateWeeklyBilanPDF = () => {
    if (!selectedWeek) return;
    const doc = new jsPDF();
    const s = schoolInfo;

    if (s?.logo) {
      try { doc.addImage(s.logo, 'PNG', 15, 12, 22, 22); } catch(e){}
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(s?.nom || 'Établissement Scolaire', 42, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s?.adresse || ''} | Tél: ${s?.telephone || ''}`, 42, 26);

    doc.setDrawColor(220);
    doc.line(15, 34, 195, 34);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`BILAN HEBDOMADAIRE DES HEURES - SECONDAIRE`, 105, 43, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Semaine ${selectedWeek.number}: Du ${selectedWeek.formattedStart} au ${selectedWeek.formattedEnd}`, 105, 50, { align: 'center' });

    let grandTotalHours = 0;
    let grandTotalAmount = 0;

    const body = secondaireTeachers.map(t => {
      const d = bilanDraft[t.id] || { heures_prevues: 0, heures_effectuees: 0, taux_horaire: 0, commentaires: '' };
      const total = d.heures_effectuees * d.taux_horaire;
      grandTotalHours += d.heures_effectuees;
      grandTotalAmount += total;
      return [
        `${t.nom} ${t.prenom}`,
        `${d.heures_prevues} h`,
        `${d.heures_effectuees} h`,
        formatFCFA(d.taux_horaire),
        formatFCFA(total),
        d.commentaires || '-'
      ];
    });

    autoTable(doc, {
      startY: 56,
      head: [['Enseignant', 'Prévues (E.D.T.)', 'Effectuées (Cochées)', 'Taux/h', 'Total à Payer', 'Remarques']],
      body: body,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL CUMULÉ DE LA SEMAINE ${selectedWeek.number}:`, 15, finalY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Heures Effectuées Validées : ${grandTotalHours} h`, 20, finalY + 6);
    doc.text(`• Total Budget Salarial Semaine : ${formatFCFA(grandTotalAmount)}`, 20, finalY + 12);

    doc.save(`Bilan_Hebdo_Semaine_${selectedWeek.number}.pdf`);
  };

  // PDF Generation for Secondary Monthly Salary
  const generateSecondaryMonthlySalaryPDF = (
    teacher: any,
    monthKey: string,
    monthLabel: string,
    monthBilans: any[],
    paymentRecord: any,
    calculatedSalary: number
  ) => {
    const doc = new jsPDF();
    const s = schoolInfo;

    if (s?.logo) {
      try { doc.addImage(s.logo, 'PNG', 15, 12, 22, 22); } catch(e){}
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(s?.nom || 'Établissement Scolaire', 42, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${s?.adresse || ''} | Tél: ${s?.telephone || ''}`, 42, 26);
    doc.text(`Email: ${s?.email || ''}`, 42, 31);

    doc.setDrawColor(220);
    doc.line(15, 38, 195, 38);

    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('BULLETIN DE PAIE MENSUEL - ENSEIGNANT SECONDAIRE', 105, 48, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mois de paie: ${monthLabel}`, 140, 58);
    doc.text(`Date d'édition: ${new Date().toLocaleDateString('fr-FR')}`, 140, 64);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS ENSEIGNANT', 15, 60);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nom & Prénom: ${teacher.nom} ${teacher.prenom}`, 15, 68);
    doc.text(`Discipline / Spécialité: ${teacher.matieres_noms || 'Secondaire'}`, 15, 74);
    doc.text(`Taux Horaire: ${formatFCFA(teacher.taux_horaire || 2500)}/h`, 15, 80);

    let totalPrevues = 0;
    let totalEffectuees = 0;

    const tableBody = monthBilans.map(b => {
      totalPrevues += (b.heures_prevues || 0);
      totalEffectuees += (b.heures_effectuees || 0);
      const subTotal = (b.heures_effectuees || 0) * (b.taux_horaire || teacher.taux_horaire || 2500);
      return [
        `Semaine ${b.semaine_numero}`,
        `Du ${b.date_debut || ''} au ${b.date_fin || ''}`,
        `${b.heures_prevues || 0} h`,
        `${b.heures_effectuees || 0} h`,
        formatFCFA(b.taux_horaire || teacher.taux_horaire || 2500),
        formatFCFA(subTotal)
      ];
    });

    autoTable(doc, {
      startY: 88,
      head: [['Semaine', 'Période', 'Prévues', 'Effectuées (Cochées)', 'Taux/h', 'Montant Dû']],
      body: tableBody.length > 0 ? tableBody : [['-', 'Aucun bilan validé pour ce mois', '0 h', '0 h', '-', '0 FCFA']],
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' }
    });

    const paid = paymentRecord ? (paymentRecord.montant_paye !== undefined ? paymentRecord.montant_paye : paymentRecord.montant) : 0;
    const remaining = paymentRecord ? (paymentRecord.reste_a_payer !== undefined ? paymentRecord.reste_a_payer : Math.max(0, calculatedSalary - paid)) : calculatedSalary;

    let finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`RÉCAPITULATIF FINANCIER DU MOIS DE ${monthLabel}:`, 15, finalY);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`• Total Quota Heures Prévues (E.D.T.) : ${totalPrevues} heures`, 20, finalY + 7);
    doc.text(`• Total Heures Réellement Effectuées (Cochées) : ${totalEffectuees} heures`, 20, finalY + 13);
    doc.text(`• Salaire Brut Calculé : ${formatFCFA(calculatedSalary)}`, 20, finalY + 19);
    doc.text(`• Montant Déjà Versé / Réglé : ${formatFCFA(paid)}`, 20, finalY + 25);
    doc.text(`• Solde Restant à Payer : ${formatFCFA(remaining)}`, 20, finalY + 31);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Signature de l\'Enseignant', 20, finalY + 50);
    doc.text('Signature du Comptable / Direction', 130, finalY + 50);

    doc.save(`Fiche_Paie_Secondaire_${teacher.nom}_${teacher.prenom}_${monthKey}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER TABS & CYCLE SELECTOR */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign className="text-emerald-600" size={28} />
            Gestion des Salaires Enseignants
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion distincte pour le Primaire/Maternelle (Salaire Fixe) et le Secondaire (Décompte des Heures Executées)
          </p>
        </div>

        {/* Cycle Switcher */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0">
          <button
            onClick={() => {
              setActiveCycle('primaire');
              setSelectedWeek(null);
            }}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeCycle === 'primaire'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Maternelle & Primaire</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
              {primaireTeachers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveCycle('secondaire');
              setSelectedWeek(null);
            }}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeCycle === 'secondaire'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Secondaire (Vacation / Taux h)</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
              {secondaireTeachers.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveCycle('administratif' as any);
              setSelectedWeek(null);
            }}
            className={`px-5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              (activeCycle as string) === 'administratif'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Personnel Administratif</span>
            <span className="bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px]">
              {adminStaffList.length}
            </span>
          </button>
        </div>
      </div>

      {/* LEVEL 1: PRIMAIRE & MATERNELLE */}
      {activeCycle === 'primaire' && (
        <div className="space-y-6">
          {/* School Year Months Grid */}
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="text-emerald-600" size={22} />
                  Mois de l'Année Scolaire — Maternelle & Primaire
                </h2>
                <p className="text-xs text-slate-500">
                  Cliquez sur un mois pour ouvrir le tableau des salaires correspondants.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-slate-600">Saisie directe :</label>
                <input 
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Grid of Months */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-1">
              {monthGroups.map((group) => {
                const isSelected = selectedMonth === group.monthKey;
                const isCurrentMonth = group.monthKey === currentMonthKey;

                const monthRecords = monthlyPayments.filter((p: any) => p.mois === group.monthKey);
                const paidTeachersCount = primaireTeachers.filter((t: any) => {
                  const rec = monthRecords.find((p: any) => p.enseignant_id === t.id);
                  if (!rec) return false;
                  const paid = rec.montant_paye !== undefined ? rec.montant_paye : rec.montant;
                  const fullSalary = t.salaire_fixe || 0;
                  return paid >= fullSalary && fullSalary > 0;
                }).length;

                const isFullyPaid = primaireTeachers.length > 0 && paidTeachersCount >= primaireTeachers.length;
                const hasPartial = monthRecords.some((p: any) => (p.montant_paye || p.montant || 0) > 0);

                return (
                  <div
                    key={group.monthKey}
                    onClick={() => setSelectedMonth(group.monthKey)}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[110px] relative ${
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/30 shadow-md scale-[1.02]'
                        : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-black text-xs text-slate-900 truncate">{group.monthLabel}</span>
                        {isCurrentMonth && (
                          <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-black shrink-0">
                            En cours
                          </span>
                        )}
                      </div>

                      {isCurrentMonth && (
                        <span className="text-[10px] font-bold text-blue-700 block">
                          📌 Mois en cours
                        </span>
                      )}
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      {isFullyPaid ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                          <CheckCircle size={12} className="text-emerald-600" />
                          Réglé
                        </span>
                      ) : hasPartial ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                          <AlertTriangle size={12} className="text-amber-600" />
                          Partiel ({paidTeachersCount}/{primaireTeachers.length})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600 flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          Non réglé
                        </span>
                      )}

                      {isSelected && (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-200/80 px-1.5 py-0.5 rounded-md">
                          Ouvert
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Primaire Teachers Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                    <th className="p-4">Enseignant</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Salaire Fixe</th>
                    <th className="p-4">Montant Payé ({selectedMonth})</th>
                    <th className="p-4">Reste à Payer ({selectedMonth})</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {primaireTeachers.length > 0 ? (
                    primaireTeachers.map((teacher: any) => {
                      const paymentRecord = monthlyPayments.find(
                        (p: any) => p.enseignant_id === teacher.id && p.mois === selectedMonth
                      );
                      const fullSalary = teacher.salaire_fixe || 0;
                      const paidAmount = paymentRecord
                        ? (paymentRecord.montant_paye !== undefined ? paymentRecord.montant_paye : paymentRecord.montant)
                        : 0;
                      const remaining = paymentRecord
                        ? (paymentRecord.reste_a_payer !== undefined ? paymentRecord.reste_a_payer : Math.max(0, fullSalary - paidAmount))
                        : fullSalary;

                      return (
                        <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-bold text-slate-900">
                            <div>
                              <span>{teacher.nom} {teacher.prenom}</span>
                              <span className="block text-xs font-normal text-slate-400">{teacher.statut || 'Permanent'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600 font-medium">{teacher.telephone || 'N/A'}</td>
                          <td className="p-4">
                            {editingTeacherId === teacher.id ? (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number"
                                  value={fixedSalaryInput}
                                  onFocus={(e) => e.target.select()}
                                  onChange={e => setFixedSalaryInput(e.target.value)}
                                  className="w-28 px-3 py-1 bg-slate-50 border rounded-lg text-sm font-bold"
                                />
                                <button 
                                  onClick={() => handleSaveFixedSalary(teacher.id)}
                                  className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                                >
                                  <Save size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{fullSalary ? `${fullSalary.toLocaleString('fr-FR')} FCFA` : 'Non défini'}</span>
                                <button 
                                  onClick={() => {
                                    setEditingTeacherId(teacher.id);
                                    setFixedSalaryInput(String(teacher.salaire_fixe || ''));
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                >
                                  <Edit2 size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-bold text-emerald-700">
                            {paymentRecord ? `${paidAmount.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                          </td>
                          <td className="p-4 font-bold text-amber-700">
                            {remaining > 0 ? `${remaining.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                          </td>
                          <td className="p-4">
                            {paymentRecord ? (
                              paidAmount >= fullSalary ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle size={14} />
                                  Payé (Total)
                                </span>
                              ) : paidAmount > 0 ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800" title={`Reste: ${remaining.toLocaleString()} FCFA`}>
                                  <AlertTriangle size={14} />
                                  Partiel
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                  <Clock size={14} />
                                  Non payé
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                <Clock size={14} />
                                Non réglé
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => openPaymentModal(teacher)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <DollarSign size={14} />
                                {paymentRecord ? 'Éditer' : 'Régler'}
                              </button>
                              {paymentRecord && (
                                <button 
                                  onClick={() => generateSalaryReceiptPDF(teacher, paymentRecord)}
                                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
                                >
                                  <Download size={14} />
                                  Fiche PDF
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Aucun enseignant configuré dans le cycle Primaire / Maternelle.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL 2: SECONDAIRE */}
      {activeCycle === 'secondaire' && (
        <div className="space-y-6">
          {/* Sub-View Switcher for Secondaire */}
          {!selectedWeek && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2">
              <button
                onClick={() => setSecondaireSubView('hebdo')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                  secondaireSubView === 'hebdo'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Clock size={16} />
                <span>📅 Saisie Hebdomadaire & Emploi du Temps</span>
              </button>

              <button
                onClick={() => setSecondaireSubView('mensuel')}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
                  secondaireSubView === 'mensuel'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <FileText size={16} />
                <span>📊 Point Récapitulatif Mensuel & Paie</span>
              </button>
            </div>
          )}

          {/* SUB-VIEW 1: HEBDO LIST OF WEEKS */}
          {secondaireSubView === 'hebdo' && !selectedWeek && (
            <>
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="text-blue-600" size={22} />
                  Découpage des Semaines & Bilan Hebdomadaire (Secondaire)
                </h2>
                <p className="text-xs text-slate-500">
                  Les semaines de l'année scolaire sont générées automatiquement. Cliquez sur "Ouvrir Bilan" pour accéder au tableau de pointage des heures par emploi du temps.
                </p>
              </div>

              {/* Weeks Display Grouped By Month */}
              <div className="space-y-6">
                {monthGroups.map((group: MonthGroup) => {
                  const monthRecords = monthlyPayments.filter((p: any) => p.mois === group.monthKey);
                  const fullyPaidTeachersCount = secondaireTeachers.filter((t: any) => {
                    const rec = monthRecords.find((p: any) => p.enseignant_id === t.id);
                    if (!rec) return false;
                    const paid = rec.montant_paye !== undefined ? rec.montant_paye : rec.montant;
                    return paid > 0 && rec.reste_a_payer === 0;
                  }).length;
                  const isMonthFullyPaid = secondaireTeachers.length > 0 && fullyPaidTeachersCount >= secondaireTeachers.length;
                  const hasPartialPayments = monthRecords.some((p: any) => (p.montant_paye || p.montant || 0) > 0);

                  return (
                    <div key={group.monthKey} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={18} className="text-blue-600" />
                          <h3 className="text-base font-black text-slate-800">{group.monthLabel}</h3>
                          {isMonthFullyPaid ? (
                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 border border-emerald-200">
                              <CheckCircle size={14} className="text-emerald-600" />
                              ✓ Mois Réglé
                            </span>
                          ) : hasPartialPayments ? (
                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1 border border-amber-200">
                              <AlertTriangle size={14} className="text-amber-600" />
                              Partiellement réglé ({fullyPaidTeachersCount}/{secondaireTeachers.length})
                            </span>
                          ) : (
                            <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600 flex items-center gap-1">
                              <Clock size={14} className="text-slate-400" />
                              Non réglé
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSecondaryMonth(group.monthKey);
                            setSecondaireSubView('mensuel');
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm self-start sm:self-auto"
                        >
                          <FileText size={15} />
                          <span>Point Récapitulatif Mensuel</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(group.weeks || []).map((week: WeekItem) => {
                          const isSelected = selectedWeek?.number === week.number;

                          let cardBg = 'bg-slate-50 border-slate-200 text-slate-500';
                          let icon = <Lock size={18} className="text-slate-400" />;
                          let badgeText = '🔒 Verrouillée (À venir)';
                          let badgeStyle = 'bg-slate-200 text-slate-600';

                          if (week.status === 'current') {
                            cardBg = 'bg-emerald-50/60 border-emerald-300 text-emerald-900 ring-2 ring-emerald-500/30';
                            icon = <Unlock size={20} className="text-emerald-600" />;
                            badgeText = '🔓 En cours (Déverrouillée)';
                            badgeStyle = 'bg-emerald-100 text-emerald-800 font-bold';
                          } else if (week.status === 'completed_done') {
                            cardBg = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                            icon = <CheckCircle size={20} className="text-emerald-600" />;
                            badgeText = '✓ Bilan Validé';
                            badgeStyle = 'bg-emerald-600 text-white font-bold';
                          } else if (week.status === 'completed_pending') {
                            cardBg = 'bg-rose-50 border-rose-300 text-rose-900';
                            icon = <AlertTriangle size={20} className="text-rose-600" />;
                            badgeText = '❌ Bilan à faire';
                            badgeStyle = 'bg-rose-600 text-white font-bold';
                          }

                          return (
                            <div
                              key={week.number}
                              onClick={() => loadWeekBilans(week)}
                              className={`p-4 rounded-2xl border text-left transition-all hover:shadow-md cursor-pointer flex flex-col justify-between min-h-[160px] ${cardBg} ${
                                isSelected ? 'shadow-lg ring-2 ring-blue-600 bg-blue-50/20' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start w-full">
                                <span className="font-black text-sm">Semaine {week.number}</span>
                                {icon}
                              </div>

                              <div>
                                <p className="text-xs font-bold text-slate-700">
                                  du {week.formattedStart} au {week.formattedEnd}
                                </p>
                              </div>

                              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/60">
                                <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${badgeStyle}`}>
                                  {badgeText}
                                </span>
                                
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    loadWeekBilans(week);
                                  }}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shrink-0"
                                >
                                  <FileText size={13} />
                                  <span>Ouvrir Bilan</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Month Card Bottom Banner with Point Récapitulatif Button & Month Status */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          {isMonthFullyPaid ? (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5 border border-emerald-200">
                              <CheckCircle size={14} className="text-emerald-600" />
                              ✓ Mois Réglé
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 flex items-center gap-1.5 border border-amber-200">
                              <Clock size={14} className="text-amber-600" />
                              Mois non soldé
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSecondaryMonth(group.monthKey);
                            setSecondaireSubView('mensuel');
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                        >
                          <FileText size={14} />
                          <span>Point récapitulatif {group.monthLabel}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SUB-VIEW 1 (FULL SCREEN DETAILED WEEKLY BILAN CHECKLIST) */}
          {secondaireSubView === 'hebdo' && selectedWeek && (
            <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md space-y-6">
              {/* Header & Actions */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedWeek(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 mb-2 w-fit"
                  >
                    <ArrowLeft size={16} />
                    <span>Retour à la liste des semaines</span>
                  </button>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Clock size={24} className="text-blue-600" />
                    Bilan des Heures — Semaine {selectedWeek.number} (du {selectedWeek.formattedStart} au {selectedWeek.formattedEnd})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cochez ou ajustez les heures exécutées pour chaque créneau d'emploi du temps. Seules les heures cochées sont comptabilisées.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0">
                  <button
                    onClick={applyTimetableToAll}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-200 disabled:opacity-50"
                  >
                    <Clock size={16} />
                    Appliquer l'EDT à tous
                  </button>
                  <button
                    onClick={generateWeeklyBilanPDF}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    PDF Bilan
                  </button>
                  <button
                    onClick={handleSaveWeeklyBilans}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-md shadow-blue-200 disabled:opacity-50"
                  >
                    <Check size={16} />
                    {isSaving ? 'Enregistrement...' : 'Valider le Bilan Hebdomadaire'}
                  </button>
                </div>
              </div>

              {/* TEACHERS DETAILED TIMETABLE CHECKLIST */}
              <div className="space-y-6">
                {secondaireTeachers.length > 0 ? (
                  secondaireTeachers.map((teacher: any) => {
                    const draft = bilanDraft[teacher.id] || {
                      heures_prevues: 0,
                      heures_effectuees: 0,
                      taux_horaire: teacher.taux_horaire || 2500,
                      commentaires: ''
                    };

                    const slots = slotsDraft[teacher.id] || [];
                    const isExpanded = expandedTeachers[teacher.id] !== false;
                    const calculatedWeeklySalary = draft.heures_effectuees * draft.taux_horaire;

                    return (
                      <div key={teacher.id} className="bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                        {/* Teacher Header Bar */}
                        <div 
                          onClick={() => setExpandedTeachers(prev => ({ ...prev, [teacher.id]: !isExpanded }))}
                          className="p-4 bg-white hover:bg-slate-50/80 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors border-b border-slate-200"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl font-bold">
                              <User size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-slate-900 text-base">{teacher.nom} {teacher.prenom}</h4>
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold">
                                  {teacher.matieres_noms || 'Secondaire'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Taux horaire: <span className="font-bold text-slate-800">{draft.taux_horaire.toLocaleString()} FCFA/h</span> | {slots.length} créneau(x) au planning
                              </p>

                              {/* Timetable Buttons */}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setTimetableTeacher(teacher);
                                    setShowTimetableModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold border border-blue-200/80 flex items-center gap-1 transition-colors"
                                >
                                  <Calendar size={13} />
                                  <span>Afficher l'EDT</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await apiFetch(`/api/emplois/enseignant/${teacher.id}`);
                                      const slotsData = await res.json();
                                      generateTeacherTimetablePDF(teacher, Array.isArray(slotsData) ? slotsData : [], schoolInfo);
                                    } catch(err) {
                                      generateTeacherTimetablePDF(teacher, [], schoolInfo);
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors"
                                  title="Télécharger l'emploi du temps au format PDF"
                                >
                                  <Download size={13} />
                                  <span>PDF EDT</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-xs">
                            <div className="bg-slate-100 px-3 py-1.5 rounded-xl">
                              <span className="text-slate-500">Prévu (E.D.T.) : </span>
                              <span className="font-bold text-slate-800">{draft.heures_prevues} h</span>
                            </div>

                            <div className="bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <span className="text-emerald-800">Effectué (Coché) : </span>
                              <span className="font-black text-emerald-900 text-sm">{draft.heures_effectuees} h</span>
                            </div>

                            <div className="bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200">
                              <span className="text-blue-800">Salaire : </span>
                              <span className="font-black text-blue-950 text-sm">{calculatedWeeklySalary.toLocaleString('fr-FR')} FCFA</span>
                            </div>

                            <div className="p-1 text-slate-400 hover:text-slate-700">
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable Timetable Slot Checklist */}
                        {isExpanded && (
                          <div className="p-4 space-y-4 bg-white">
                            <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-slate-100 text-xs">
                              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                                <Clock size={14} className="text-blue-600" />
                                Tableau Bilan des Créneaux pour la Semaine {selectedWeek.number}
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleAllSlotsForTeacher(teacher.id, true)}
                                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold transition-all border border-emerald-200"
                                >
                                  ✓ Tout cocher
                                </button>

                                <button
                                  type="button"
                                  onClick={() => toggleAllSlotsForTeacher(teacher.id, false)}
                                  className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg font-bold transition-all border border-rose-200"
                                >
                                  ✕ Tout décocher
                                </button>

                                <button
                                  type="button"
                                  onClick={() => applyTimetableToTeacher(teacher.id)}
                                  className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold transition-all border border-indigo-200 flex items-center gap-1"
                                  title="Réinitialiser les heures à partir de l'emploi du temps"
                                >
                                  <Clock size={13} />
                                  <span>Appliquer l'EDT</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAddCustomSlot(teacher.id)}
                                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold transition-all border border-blue-200 flex items-center gap-1"
                                >
                                  <Plus size={13} />
                                  <span>+ Créneau Spécial</span>
                                </button>
                              </div>
                            </div>

                            {/* Slot Items Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {slots.length > 0 ? (
                                slots.map((slot, sIdx) => {
                                  const isChecked = slot.checked;

                                  return (
                                    <div 
                                      key={slot.id || sIdx}
                                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between gap-2 ${
                                        isChecked 
                                          ? 'bg-emerald-50/40 border-emerald-200 text-slate-900 shadow-sm'
                                          : 'bg-rose-50/50 border-rose-200 text-slate-500'
                                      }`}
                                    >
                                      <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-black text-xs text-slate-900">{slot.jour} ({slot.heure_debut} - {slot.heure_fin})</span>
                                            {slot.isCustom && (
                                              <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">Hors EDT</span>
                                            )}
                                          </div>
                                          <p className="text-xs font-semibold text-slate-600 mt-0.5">
                                            {slot.classe_nom} — <span className="text-blue-700">{slot.matiere_nom}</span>
                                          </p>
                                        </div>

                                        {/* Toggle Executed (Check / Red Cross) */}
                                        <div className="flex items-center gap-1">
                                          <button
                                            type="button"
                                            onClick={() => updateSlotChecked(teacher.id, sIdx, !isChecked)}
                                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                                              isChecked 
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                                : 'bg-rose-600 text-white hover:bg-rose-700'
                                            }`}
                                          >
                                            {isChecked ? <Check size={14} /> : <X size={14} />}
                                            <span>{isChecked ? 'Exécuté' : 'Non fait'}</span>
                                          </button>

                                          {slot.isCustom && (
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCustomSlot(teacher.id, sIdx)}
                                              className="p-1 text-slate-400 hover:text-rose-600"
                                              title="Supprimer ce créneau"
                                            >
                                              <Trash2 size={14} />
                                            </button>
                                          )}
                                        </div>
                                      </div>

                                      {/* Hours Selector Pill Buttons */}
                                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs">
                                        <span className="text-[11px] font-bold text-slate-500">
                                          Prévu : {slot.heures_prevues}h | Saisie heures effectuées :
                                        </span>

                                        <div className="flex items-center gap-1">
                                          {[0.5, 1, 1.5, 2, 2.5, 3, 4].map(h => (
                                            <button
                                              key={h}
                                              type="button"
                                              onClick={() => updateSlotHours(teacher.id, sIdx, h)}
                                              className={`px-2 py-0.5 rounded-lg text-[11px] font-black transition-all ${
                                                isChecked && slot.heures_effectuees === h
                                                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-700'
                                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                              }`}
                                            >
                                              {h}h
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="col-span-2 p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400 border border-dashed">
                                  Aucun créneau d'emploi du temps trouvé pour cet enseignant. Vous pouvez en ajouter avec le bouton "+ Créneau Spécial".
                                </div>
                              )}
                            </div>

                            {/* Comments & Hourly Rate Adjustment */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Taux Horaire Réel (FCFA / h)</label>
                                <input 
                                  type="number"
                                  min="0"
                                  value={draft.taux_horaire}
                                  onChange={e => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setBilanDraft(prev => ({
                                      ...prev,
                                      [teacher.id]: { ...prev[teacher.id], taux_horaire: val }
                                    }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Remarques / Absences / Justificatifs</label>
                                <input 
                                  type="text"
                                  placeholder="Motif d'absence, remplacement..."
                                  value={draft.commentaires}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setBilanDraft(prev => ({
                                      ...prev,
                                      [teacher.id]: { ...prev[teacher.id], commentaires: val }
                                    }));
                                  }}
                                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 bg-slate-50 rounded-2xl text-center text-slate-400">
                    Aucun enseignant configuré dans le cycle Secondaire.
                  </div>
                )}
              </div>

              {/* GRAND TOTAL ROW AT BOTTOM OF WEEKLY BILAN */}
              {secondaireTeachers.length > 0 && (
                <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-slate-300">
                      Total Récapitulatif — Semaine {selectedWeek.number}
                    </h4>
                    <p className="text-xs text-slate-400">
                      Cumul des heures cochées comme exécutées sur la semaine
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Total Heures Cochées</span>
                      <span className="text-xl font-black text-emerald-400">
                        {secondaireTeachers.reduce((sum, t) => sum + (bilanDraft[t.id]?.heures_effectuees || 0), 0)} heures
                      </span>
                    </div>

                    <div className="text-right border-l border-slate-700 pl-6">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold">Montant Total à Payer</span>
                      <span className="text-xl font-black text-blue-300">
                        {secondaireTeachers.reduce((sum, t) => {
                          const d = bilanDraft[t.id] || { heures_effectuees: 0, taux_horaire: 0 };
                          return sum + (d.heures_effectuees * d.taux_horaire);
                        }, 0).toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SUB-VIEW 2: POINT RÉCAPITULATIF MENSUEL & PAIE SECONDAIRE */}
          {secondaireSubView === 'mensuel' && !selectedWeek && (
            <div className="space-y-6">
              {/* Header & Month Selector */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="text-blue-600" size={22} />
                    Point Récapitulatif Mensuel des Salaires (Secondaire)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Bilan cumulé de l'ensemble des heures cochées et des bilans hebdomadaires validés sur le mois sélectionné.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-slate-700">Mois de récapitulatif :</label>
                  <select
                    value={selectedSecondaryMonth}
                    onChange={e => setSelectedSecondaryMonth(e.target.value)}
                    className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {monthGroups.map(g => (
                      <option key={g.monthKey} value={g.monthKey}>{g.monthLabel}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of Secondary Monthly Aggregated Salary */}
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                        <th className="p-4">Enseignant</th>
                        <th className="p-4">Discipline</th>
                        <th className="p-4">Taux Horaire</th>
                        <th className="p-4">Quota Prévu (E.D.T.)</th>
                        <th className="p-4">Heures Effectuées (Cochées)</th>
                        <th className="p-4">Salaire Calculé</th>
                        <th className="p-4">Montant Versé</th>
                        <th className="p-4">Solde Restant</th>
                        <th className="p-4">Statut</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {secondaireTeachers.length > 0 ? (
                        (() => {
                          let grandQuota = 0;
                          let grandEffectuees = 0;
                          let grandCalculated = 0;
                          let grandPaid = 0;
                          let grandRemaining = 0;

                          // Find week numbers belonging to selectedSecondaryMonth
                          const group = monthGroups.find(g => g.monthKey === selectedSecondaryMonth);
                          const weekNums = group && Array.isArray(group.weeks) ? group.weeks.map(w => w.number) : [];

                          return (
                            <>
                              {secondaireTeachers.map((teacher: any) => {
                                // Bilans of this teacher for weeks in selected month
                                const tBilans = weeklyBilans.filter(
                                  (b: any) => b.enseignant_id === teacher.id && weekNums.includes(b.semaine_numero)
                                );

                                const totalQuotaMonth = tBilans.reduce((sum: number, b: any) => sum + (b.heures_prevues || 0), 0);
                                const totalEffectueesMonth = tBilans.reduce((sum: number, b: any) => sum + (b.heures_effectuees || 0), 0);
                                const taux = teacher.taux_horaire || 2500;
                                const calculatedSalary = totalEffectueesMonth * taux;

                                const paymentRecord = monthlyPayments.find(
                                  (p: any) => p.enseignant_id === teacher.id && p.mois === selectedSecondaryMonth
                                );

                                const paidAmount = paymentRecord
                                  ? (paymentRecord.montant_paye !== undefined ? paymentRecord.montant_paye : paymentRecord.montant)
                                  : 0;

                                const remaining = paymentRecord
                                  ? (paymentRecord.reste_a_payer !== undefined ? paymentRecord.reste_a_payer : Math.max(0, calculatedSalary - paidAmount))
                                  : calculatedSalary;

                                grandQuota += totalQuotaMonth;
                                grandEffectuees += totalEffectueesMonth;
                                grandCalculated += calculatedSalary;
                                grandPaid += paidAmount;
                                grandRemaining += remaining;

                                return (
                                  <tr key={teacher.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 font-bold text-slate-900">
                                      {teacher.nom} {teacher.prenom}
                                    </td>
                                    <td className="p-4 text-slate-600 font-medium">
                                      {teacher.matieres_noms || 'Secondaire'}
                                    </td>
                                    <td className="p-4 font-bold text-slate-700">
                                      {taux.toLocaleString('fr-FR')} FCFA/h
                                    </td>
                                    <td className="p-4 font-bold text-slate-500">
                                      {totalQuotaMonth} h
                                    </td>
                                    <td className="p-4 font-black text-emerald-800 text-base">
                                      {totalEffectueesMonth} h
                                    </td>
                                    <td className="p-4 font-black text-blue-900 text-base">
                                      {calculatedSalary.toLocaleString('fr-FR')} FCFA
                                    </td>
                                    <td className="p-4 font-bold text-emerald-700">
                                      {paymentRecord ? `${paidAmount.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                                    </td>
                                    <td className="p-4 font-bold text-amber-700">
                                      {remaining > 0 ? `${remaining.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}
                                    </td>
                                    <td className="p-4">
                                      {paymentRecord ? (
                                        paidAmount >= calculatedSalary ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                                            <CheckCircle size={14} />
                                            Payé (Total)
                                          </span>
                                        ) : paidAmount > 0 ? (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                            <AlertTriangle size={14} />
                                            Partiel
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800">
                                            <Clock size={14} />
                                            Non payé
                                          </span>
                                        )
                                      ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                                          <Clock size={14} />
                                          {calculatedSalary > 0 ? 'Non réglé' : '0 h'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => openPaymentModal(teacher, selectedSecondaryMonth, calculatedSalary)}
                                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                          <DollarSign size={14} />
                                          {paymentRecord ? 'Éditer' : 'Régler'}
                                        </button>

                                        <button
                                          onClick={() => generateSecondaryMonthlySalaryPDF(
                                            teacher,
                                            selectedSecondaryMonth,
                                            group?.monthLabel || selectedSecondaryMonth,
                                            tBilans,
                                            paymentRecord,
                                            calculatedSalary
                                          )}
                                          className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                          <Download size={14} />
                                          Fiche PDF
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}

                              {/* Table Footer / Total Row */}
                              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700">
                                <td colSpan={3} className="p-4 font-black uppercase text-xs tracking-wider">
                                  TOTAL GÉNÉRAL DU MOIS ({group?.monthLabel})
                                </td>
                                <td className="p-4 text-slate-300 font-bold">{grandQuota} h</td>
                                <td className="p-4 text-emerald-400 font-black text-base">{grandEffectuees} h</td>
                                <td className="p-4 text-blue-300 font-black text-base">{grandCalculated.toLocaleString('fr-FR')} FCFA</td>
                                <td className="p-4 text-emerald-400 font-black">{grandPaid.toLocaleString('fr-FR')} FCFA</td>
                                <td className="p-4 text-amber-400 font-black">{grandRemaining.toLocaleString('fr-FR')} FCFA</td>
                                <td colSpan={2} className="p-4 text-right text-xs text-slate-400 font-normal">
                                  Synthèse du mois
                                </td>
                              </tr>
                            </>
                          );
                        })()
                      ) : (
                        <tr>
                          <td colSpan={10} className="p-8 text-center text-slate-400">
                            Aucun enseignant trouvé pour le cycle Secondaire.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEVEL 3: PERSONNEL ADMINISTRATIF */}
      {(activeCycle as string) === 'administratif' && (
        <div className="space-y-6">
          <div className="bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="text-purple-600" size={22} />
                  Paiement des Salaires du Personnel Administratif
                </h2>
                <p className="text-xs text-slate-500">
                  Sélectionnez un mois de paie pour gérer les salaires, primes, retenues et générer les reçus.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <label className="text-xs font-bold text-slate-600">Mois de Paie :</label>
                <input 
                  type="month"
                  value={selectedAdminMonth}
                  onChange={e => setSelectedAdminMonth(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Summary Stats */}
            {(() => {
              const totalPaid = adminPaymentsList.reduce((sum, p) => sum + (p.montant_paye || 0), 0);
              const totalNet = adminStaffList.reduce((sum, m) => {
                const rec = adminPaymentsList.find((p: any) => p.personnel_id === m.id);
                if (rec) return sum + (rec.net_a_payer ?? (rec.montant + rec.prime - rec.retenue));
                return sum + (m.salaire_mensuel || 0);
              }, 0);

              const totalRemaining = Math.max(0, totalNet - totalPaid);

              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-700 uppercase">Masse Salariale Net ({selectedAdminMonth})</p>
                    <p className="text-2xl font-black text-purple-900 mt-1">{totalNet.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-xs font-bold text-emerald-700 uppercase">Montant Total Versé</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{totalPaid.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <p className="text-xs font-bold text-amber-700 uppercase">Solde Restant à Régler</p>
                    <p className="text-2xl font-black text-amber-900 mt-1">{totalRemaining.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                </div>
              );
            })()}

            {/* Admin Staff Payment Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                    <th className="p-3.5">Agent / Membre</th>
                    <th className="p-3.5">Poste / Fonction</th>
                    <th className="p-3.5">Contrat</th>
                    <th className="p-3.5">Salaire de Base</th>
                    <th className="p-3.5">Prime / Retenue</th>
                    <th className="p-3.5">Net à Payer</th>
                    <th className="p-3.5">Montant Versé</th>
                    <th className="p-3.5">Reste à Payer</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminStaffList.map(member => {
                    const payment = adminPaymentsList.find((p: any) => p.personnel_id === member.id);
                    const baseSalary = payment ? payment.montant : (member.salaire_mensuel || 0);
                    const prime = payment ? (payment.prime || 0) : 0;
                    const retenue = payment ? (payment.retenue || 0) : 0;
                    const netToPay = payment ? (payment.net_a_payer ?? (baseSalary + prime - retenue)) : baseSalary;
                    const paid = payment ? (payment.montant_paye || 0) : 0;
                    const remaining = payment ? (payment.reste_a_payer ?? Math.max(0, netToPay - paid)) : netToPay;

                    let statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        Non réglé
                      </span>
                    );
                    if (payment) {
                      if (paid >= netToPay && netToPay > 0) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Payé
                          </span>
                        );
                      } else if (paid > 0) {
                        statusBadge = (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Partiel
                          </span>
                        );
                      }
                    }

                    return (
                      <tr key={member.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-bold text-slate-900">
                          {member.nom} {member.prenom}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-md border border-purple-100">
                            {member.poste}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">
                          {member.type_contrat || 'CDI'}
                        </td>
                        <td className="p-3.5 font-medium text-slate-800">
                          {formatFCFA(baseSalary)}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {prime > 0 ? <span className="text-emerald-600 font-bold">+{formatFCFA(prime)} </span> : null}
                          {retenue > 0 ? <span className="text-red-600 font-bold">-{formatFCFA(retenue)}</span> : null}
                          {prime === 0 && retenue === 0 ? '-' : null}
                        </td>
                        <td className="p-3.5 font-black text-purple-900">
                          {formatFCFA(netToPay)}
                        </td>
                        <td className="p-3.5 font-bold text-emerald-700">
                          {formatFCFA(paid)}
                        </td>
                        <td className="p-3.5 font-bold text-amber-700">
                          {formatFCFA(remaining)}
                        </td>
                        <td className="p-3.5">
                          {statusBadge}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenAdminPayModal(member)}
                              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs transition-colors flex items-center gap-1 shadow-xs"
                            >
                              <DollarSign size={14} />
                              <span>Régler</span>
                            </button>
                            {payment && (
                              <button
                                onClick={() => generateAdminSalaryReceiptPDF(member, payment)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors flex items-center gap-1"
                              >
                                <Download size={14} />
                                <span>Reçu PDF</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {adminStaffList.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-400">
                        Aucun membre du personnel administratif enregistré.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal for Administrative Staff */}
      {showAdminPayModal && adminPayMember && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="text-purple-600" size={20} />
                Paiement Agent — {adminPayMember.nom} {adminPayMember.prenom}
              </h3>
              <button onClick={() => setShowAdminPayModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleAdminPaymentSubmit} className="space-y-3">
              <div className="bg-purple-50/80 p-3 rounded-2xl text-xs space-y-1 border border-purple-100">
                <p className="text-slate-600">Poste: <strong>{adminPayMember.poste}</strong> ({adminPayMember.type_contrat || 'CDI'})</p>
                <p className="text-slate-600">Mois de paie: <strong>{selectedAdminMonth}</strong></p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Salaire Base</label>
                  <input
                    type="number"
                    required
                    value={adminPayBaseSalary}
                    onChange={e => setAdminPayBaseSalary(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Prime (+)</label>
                  <input
                    type="number"
                    min="0"
                    value={adminPayPrime}
                    onChange={e => setAdminPayPrime(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Retenue (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={adminPayRetenue}
                    onChange={e => setAdminPayRetenue(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="p-2.5 bg-purple-100/70 rounded-2xl flex justify-between items-center text-xs font-bold text-purple-900">
                <span>NET À PAYER :</span>
                <span className="text-sm font-black text-purple-950">
                  {formatFCFA(Math.max(0, (parseFloat(adminPayBaseSalary) || 0) + (parseFloat(adminPayPrime) || 0) - (parseFloat(adminPayRetenue) || 0)))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Montant Réellement Versé (FCFA)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={adminPayPaidAmount}
                  onChange={e => setAdminPayPaidAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-lg outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mode de règlement</label>
                <select
                  value={adminPayMethod}
                  onChange={e => setAdminPayMethod(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Commentaires</label>
                <input
                  type="text"
                  placeholder="Ex: Prime d'efficacité, acompte..."
                  value={adminPayComments}
                  onChange={e => setAdminPayComments(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminPayModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 transition-colors shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal for Primaire & Secondaire */}
      {showPayModal && payModalTeacher && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <DollarSign className="text-emerald-600" size={20} />
                Saisie de Paie — {payModalTeacher.nom} {payModalTeacher.prenom}
              </h3>
              <button onClick={() => setShowPayModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">✕</button>
            </div>

            <form onSubmit={handleSaveMonthlyPayment} className="space-y-4">
              <div className="bg-emerald-50/60 p-3 rounded-2xl text-xs space-y-1.5 border border-emerald-100">
                <div className="flex justify-between text-slate-600">
                  <span>Mois de paie :</span>
                  <span className="font-bold text-slate-900">{payModalTeacher.targetMonth || selectedMonth}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>
                    {payModalTeacher.cycle?.toLowerCase() !== 'primaire' && payModalTeacher.cycle?.toLowerCase() !== 'maternelle' 
                      ? 'Salaire Calculé (Heures Effectuées) :' 
                      : 'Salaire Mensuel Fixe :'}
                  </span>
                  <span className="font-bold text-emerald-800">
                    {(payModalTeacher.calculatedSalary !== undefined ? payModalTeacher.calculatedSalary : (payModalTeacher.salaire_fixe || 0)).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Montant Réellement Versé (FCFA)</label>
                <input 
                  type="number"
                  required
                  min="0"
                  value={payModalPaidAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={e => setPayModalPaidAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-lg outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 flex justify-between items-center text-xs font-bold text-amber-900">
                <span>Reste à Payer (Solde Restant) :</span>
                <span className="text-sm font-black text-amber-700">
                  {formatFCFA(Math.max(
                    0, 
                    (payModalTeacher.calculatedSalary !== undefined ? payModalTeacher.calculatedSalary : (payModalTeacher.salaire_fixe || 0)) - (parseFloat(payModalPaidAmount) || 0)
                  ))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mode de règlement</label>
                <select 
                  value={payModalMethod}
                  onChange={e => setPayModalMethod(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Virement bancaire">Virement bancaire</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Mobile Money">Mobile Money</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Commentaires / Remarques</label>
                <input 
                  type="text"
                  placeholder="Ex: Acompte sur salaire, virement partiel..."
                  value={payModalComments}
                  onChange={e => setPayModalComments(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowPayModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md"
                >
                  Valider le paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Timetable Modal */}
      <TeacherTimetableModal 
        teacher={timetableTeacher}
        isOpen={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
      />
    </div>
  );
}
