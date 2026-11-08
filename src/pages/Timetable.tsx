import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  Calendar as CalendarIcon, Clock, Plus, Trash2, Printer, Download, 
  X as XIcon, FileText, Sparkles, Send, Lock, CheckCircle2, AlertCircle, Edit3, ShieldAlert
} from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import jsPDF from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import { formatClassName } from '../utils/format';
import { useConfirm } from '../contexts/ConfirmContext';
import { useNotifications } from '../contexts/NotificationContext';
import { toast } from 'react-hot-toast';

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const HEURES = [
  '07h - 08h', '08h - 09h', '09h - 10h', '10h - 11h', '11h - 12h',
  '12h - 13h', '13h - 14h', '14h - 15h', '15h - 16h', '16h - 17h',
  '17h - 18h', '18h - 19h'
];

const HEURES_VALS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

export const isClassPrimary = (c: any): boolean => {
  if (!c) return false;
  const cycle = (c.cycle || '').toLowerCase();
  const niveau = (c.niveau || '').toLowerCase();
  const nom = (c.nom || '').toLowerCase();

  if (cycle.includes('primaire') || cycle.includes('maternelle') || niveau.includes('primaire') || niveau.includes('maternelle')) {
    return true;
  }
  if (['creche', 'crèche', 'garderie', 'prescolaire', 'préscolaire'].some(k => cycle.includes(k) || niveau.includes(k) || nom.includes(k))) {
    return true;
  }
  const pattern = /\b(ci|cp|cp1|cp2|ce1|ce2|cm1|cm2|sil|ps|ms|gs|tps|maternelle|primaire)\b/i;
  if (pattern.test(nom) || pattern.test(niveau) || pattern.test(cycle)) {
    return true;
  }
  if (nom.includes('section') || niveau.includes('section')) {
    return true;
  }
  return false;
};

interface TimetableProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Timetable({ cycle = 'all' }: TimetableProps) {
  const confirm = useConfirm();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = React.useState<'classe' | 'enseignant'>('classe');
  const [activeSpaceState, setActiveSpaceState] = React.useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeSpace') || '';
    }
    return '';
  });

  React.useEffect(() => {
    const handler = () => {
      if (typeof window !== 'undefined') {
        setActiveSpaceState(localStorage.getItem('activeSpace') || '');
      }
    };
    window.addEventListener('activeSpaceChanged', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('activeSpaceChanged', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [selectedClasse, setSelectedClasse] = React.useState(searchParams.get('classeId') || '');
  const [enseignants, setEnseignants] = React.useState<any[]>([]);
  const [selectedEnseignant, setSelectedEnseignant] = React.useState<string>('');
  const [teacherEmplois, setTeacherEmplois] = React.useState<any[]>([]);
  const [matieres, setMatieres] = React.useState<any[]>([]);
  const [classMatieres, setClassMatieres] = React.useState<any[]>([]);
  const [emplois, setEmplois] = React.useState<any[]>([]);
  const [showModal, setShowModal] = React.useState(false);
  const [user, setUser] = React.useState<any>(null);
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);
  const [currentUser, setCurrentUser] = React.useState<any>(null);
  const [teacherAuthorizations, setTeacherAuthorizations] = React.useState<any[]>([]);
  const [teacherClasses, setTeacherClasses] = React.useState<any[]>([]);
  
  // Request Modal State
  const [showRequestModal, setShowRequestModal] = React.useState(false);
  const [requestFormData, setRequestFormData] = React.useState({
    type_modification: 'emploi_du_temps',
    classe_id: '',
    matiere_id: '',
    jour: '',
    heure_debut: '',
    heure_fin: '',
    description: ''
  });
  const [isSubmittingEdtRequest, setIsSubmittingEdtRequest] = React.useState(false);
  const [conflictAlert, setConflictAlert] = React.useState<{ message: string } | null>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    Promise.all([
      apiFetch('/api/school-info', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }).then(r => r.json()),
      apiFetch('/api/auth/me', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }).then(r => r.json())
    ]).then(([school, u]) => {
      setSchoolInfo(school);
      setCurrentUser(u);
    }).catch(console.error);
  }, []);

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [formData, setFormData] = React.useState({
    classe_id: '',
    jour: '',
    heure_debut: '',
    heure_fin: '',
    matiere_id: '',
    enseignant_id: ''
  });

  const pathPermission = user?.permissions?.find((p: any) => (typeof p === 'string' ? p === '/emplois-du-temps' : p.path === '/emplois-du-temps'));
  const canWrite = user && (['admin', 'super_admin'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true)));
  const isTeacher = user?.role === 'enseignant';

  const fetchEmplois = (classeId: string) => {
    apiFetch(`/api/emplois/${classeId}`)
      .then(res => res.json())
      .then(data => setEmplois(Array.isArray(data) ? data : []))
      .catch(() => setEmplois([]));
  };

  const fetchTeacherEmplois = (teacherId: string) => {
    if (!teacherId) return setTeacherEmplois([]);
    apiFetch(`/api/emplois/enseignant/${teacherId}`)
      .then(res => res.json())
      .then(data => setTeacherEmplois(Array.isArray(data) ? data : []))
      .catch(() => setTeacherEmplois([]));
  };

  const loadTeacherData = () => {
    const token = localStorage.getItem('token');
    apiFetch('/api/teacher-authorizations', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => setTeacherAuthorizations(Array.isArray(data) ? data : []))
      .catch(() => setTeacherAuthorizations([]));

    apiFetch('/api/teacher-classes', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setTeacherClasses(list);
        const hasPrim = list.some((tc: any) => isClassPrimary(tc));
        const storedSpace = typeof window !== 'undefined' ? (localStorage.getItem('activeSpace') || '').toLowerCase() : '';
        const pathIsPrim = typeof window !== 'undefined' && (window.location.pathname.includes('primaire') || window.location.pathname.includes('maternelle'));
        if (hasPrim || cycle === 'primaire' || pathIsPrim || storedSpace.includes('primaire') || storedSpace.includes('maternelle')) {
          setViewMode('classe');
          if (list.length > 0 && !selectedClasse) {
            setSelectedClasse(String(list[0].id));
          }
        }
      })
      .catch(() => setTeacherClasses([]));
  };

  React.useEffect(() => {
    const loggedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(loggedUser);

    apiFetch('/api/classes')
      .then(res => res.json())
      .then(data => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));

    apiFetch('/api/enseignants')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setEnseignants(list);
        if (loggedUser.role === 'enseignant' && loggedUser.enseignant_id) {
          const uCycle = (loggedUser.cycle || '').toLowerCase();
          const pathIsPrim = window.location.pathname.includes('primaire') || window.location.pathname.includes('maternelle');
          const storedSpace = typeof window !== 'undefined' ? (localStorage.getItem('activeSpace') || '').toLowerCase() : '';
          const isPrimaryOrMaternelle = cycle === 'primaire' || pathIsPrim || uCycle.includes('primaire') || uCycle.includes('maternelle') || storedSpace.includes('primaire') || storedSpace.includes('maternelle');
          if (isPrimaryOrMaternelle) {
            setViewMode('classe');
          } else if (cycle === 'secondaire') {
            setViewMode('enseignant');
          } else {
            setViewMode('classe');
          }
          setSelectedEnseignant(String(loggedUser.enseignant_id));
          loadTeacherData();
        } else if (list.length > 0) {
          setSelectedEnseignant(String(list[0].id));
        }
      })
      .catch(() => setEnseignants([]));

    apiFetch('/api/matieres')
      .then(res => res.json())
      .then(data => setMatieres(Array.isArray(data) ? data : []))
      .catch(() => setMatieres([]));
  }, []);

  React.useEffect(() => {
    if (user?.role === 'enseignant' && (user.cycle?.toLowerCase().includes('primaire') || user.cycle?.toLowerCase().includes('maternelle'))) {
      if (!selectedClasse && teacherClasses.length > 0) {
        setSelectedClasse(String(teacherClasses[0].id));
      }
    }
  }, [teacherClasses, selectedClasse, user]);

  React.useEffect(() => {
    if (selectedEnseignant && viewMode === 'enseignant') {
      fetchTeacherEmplois(selectedEnseignant);
    }
  }, [selectedEnseignant, viewMode]);

  React.useEffect(() => {
    if (selectedClasse) {
      fetchEmplois(selectedClasse);
      apiFetch(`/api/classes/${selectedClasse}/details`)
        .then(res => res.json())
        .then(data => setClassMatieres(data.matieres || []));
    } else {
      setClassMatieres([]);
    }
  }, [selectedClasse]);

  // Deep Link handler from notification clicks (e.g. approved timetable requests)
  React.useEffect(() => {
    const qClasseId = searchParams.get('classeId') || searchParams.get('classe_id');
    const qJour = searchParams.get('jour');
    const qHeureDebut = searchParams.get('heureDebut') || searchParams.get('heure_debut');
    const qHeureFin = searchParams.get('heureFin') || searchParams.get('heure_fin');
    const qMatiereId = searchParams.get('matiereId') || searchParams.get('matiere_id');

    if (qClasseId) {
      setSelectedClasse(qClasseId);
      setViewMode('classe');
    }

    if (qJour && qHeureDebut) {
      setEditingId(null);
      setFormData({
        classe_id: qClasseId || selectedClasse || '',
        jour: qJour,
        heure_debut: qHeureDebut,
        heure_fin: qHeureFin || `${parseInt(qHeureDebut.split('h')[0]) + 1}h`,
        matiere_id: qMatiereId || '',
        enseignant_id: ''
      });
      setShowModal(true);
    }
  }, [searchParams]);

  // Authorization helper functions
  const isMyCourse = (course: any) => {
    if (!isTeacher || !course) return false;
    return course.enseignant_id && Number(course.enseignant_id) === Number(user?.enseignant_id);
  };

  const isOtherCourse = (course: any) => {
    if (!isTeacher || !course) return false;
    return course.enseignant_id && Number(course.enseignant_id) !== Number(user?.enseignant_id);
  };

  const isAuthorizedForCourse = (course: any) => {
    if (canWrite) return true;
    if (!isTeacher || !course) return false;
    return teacherAuthorizations.some((auth: any) =>
      auth.status === 'approved' &&
      auth.type_modification === 'emploi_du_temps' &&
      (!auth.classe_id || Number(auth.classe_id) === Number(course.classe_id)) &&
      (!auth.jour || auth.jour.toLowerCase() === (course.jour || '').toLowerCase()) &&
      (!auth.heure_debut || auth.heure_debut === course.heure_debut) &&
      (!auth.heure_fin || auth.heure_fin === course.heure_fin)
    );
  };

  const isAuthorizedForSlot = (jour: string, heureDebut: string, heureFin: string, classeId: string | number) => {
    if (canWrite) return true;
    if (!isTeacher) return false;
    return teacherAuthorizations.some((auth: any) =>
      auth.status === 'approved' &&
      auth.type_modification === 'emploi_du_temps' &&
      (!auth.classe_id || Number(auth.classe_id) === Number(classeId)) &&
      (!auth.jour || auth.jour.toLowerCase() === jour.toLowerCase()) &&
      (!auth.heure_debut || auth.heure_debut === heureDebut) &&
      (!auth.heure_fin || auth.heure_fin === heureFin)
    );
  };

  const openRequestForCourse = (course: any) => {
    setRequestFormData({
      type_modification: 'emploi_du_temps',
      classe_id: String(course.classe_id || selectedClasse),
      matiere_id: String(course.matiere_id || ''),
      jour: course.jour || '',
      heure_debut: course.heure_debut || '',
      heure_fin: course.heure_fin || '',
      description: `Demande de modification du créneau de ${course.matiere_nom || 'cours'} le ${course.jour} de ${course.heure_debut} à ${course.heure_fin}`
    });
    setShowRequestModal(true);
  };

  const openRequestForSlot = (jour?: string, startH?: string, endH?: string) => {
    setRequestFormData({
      type_modification: 'emploi_du_temps',
      classe_id: selectedClasse || '',
      matiere_id: '',
      jour: jour || '',
      heure_debut: startH || '',
      heure_fin: endH || '',
      description: jour && startH ? `Demande de programmation sur le créneau du ${jour} de ${startH} à ${endH}` : ''
    });
    setShowRequestModal(true);
  };

  const handleRequest = async () => {
    if (!requestFormData.description.trim()) {
      toast.error("Veuillez préciser le motif de votre demande");
      return;
    }
    setIsSubmittingEdtRequest(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/timetable-requests', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          enseignant_id: user?.enseignant_id,
          type_modification: requestFormData.type_modification || 'emploi_du_temps',
          classe_id: requestFormData.classe_id ? Number(requestFormData.classe_id) : null,
          matiere_id: requestFormData.matiere_id ? Number(requestFormData.matiere_id) : null,
          jour: requestFormData.jour || null,
          heure_debut: requestFormData.heure_debut || null,
          heure_fin: requestFormData.heure_fin || null,
          description: requestFormData.description
        })
      });
      if (res.ok) {
        setShowRequestModal(false);
        setRequestFormData({
          type_modification: 'emploi_du_temps',
          classe_id: '',
          matiere_id: '',
          jour: '',
          heure_debut: '',
          heure_fin: '',
          description: ''
        });
        toast.success("Demande de modification d'EDT transmise à la direction avec succès.");
        loadTeacherData();
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Erreur lors de l'envoi de la demande");
      }
    } catch (e) {
      toast.error("Erreur de connexion");
    } finally {
      setIsSubmittingEdtRequest(false);
    }
  };

  const checkConflict = (jour: string, debut: string, fin: string, excludeId?: number) => {
    const start = parseInt(debut.split('h')[0]);
    const end = parseInt(fin.split('h')[0]);

    return emplois.some((e: any) => {
      if (excludeId && e.id === excludeId) return false;
      if (e.jour !== jour) return false;

      const eStart = parseInt(e.heure_debut.split('h')[0]);
      const eEnd = parseInt(e.heure_fin.split('h')[0]);

      // Overlap check: (start < eEnd) && (end > eStart)
      return (start < eEnd) && (end > eStart);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (checkConflict(formData.jour, formData.heure_debut, formData.heure_fin, editingId || undefined)) {
      toast.error("Attention : Ce créneau horaire est déjà occupé par un autre cours !");
      return;
    }

    const url = editingId ? `/api/emplois/${editingId}` : '/api/emplois';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const targetClasse = formData.classe_id || selectedClasse;
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, classe_id: targetClasse })
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 409) {
          setConflictAlert({ message: err.error });
        } else {
          toast.error(err.error || "Erreur lors de l'enregistrement du cours");
        }
        return;
      }
      setShowModal(false);
      setEditingId(null);
      if (targetClasse) fetchEmplois(targetClasse);
      setFormData({
        classe_id: '', jour: '', heure_debut: '', heure_fin: '', matiere_id: '', enseignant_id: ''
      });
      toast.success(editingId ? "Cours modifié avec succès" : "Cours programmé avec succès");
      if (isTeacher) loadTeacherData();
    } catch (e) {
      toast.error("Erreur de connexion");
    }
  };

  const handleEdit = (course: any) => {
    setEditingId(course.id);
    setFormData({
      classe_id: course.classe_id.toString(),
      jour: course.jour || '',
      heure_debut: course.heure_debut || '',
      heure_fin: course.heure_fin || '',
      matiere_id: course.matiere_id.toString(),
      enseignant_id: (course.enseignant_id || '').toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (await confirm({
      title: "Supprimer le cours",
      message: "Voulez-vous vraiment supprimer ce cours de l'emploi du temps ?",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      try {
        const res = await apiFetch(`/api/emplois/${id}`, { method: 'DELETE' });
        if (res.ok) {
          fetchEmplois(selectedClasse);
          toast.success("Cours supprimé");
          if (isTeacher) loadTeacherData();
        } else {
          const err = await res.json();
          toast.error(err.error || "Erreur lors de la suppression");
        }
      } catch (e) {
        toast.error("Erreur de connexion");
      }
    }
  };

  const generatePDF = (autoPrint: boolean = false) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const classe = classes?.find((c: any) => c.id.toString() === selectedClasse) as any;
    
    // School Info
    if (schoolInfo?.logo) {
      doc.addImage(schoolInfo.logo, 'PNG', 10, 10, 20, 20);
    }
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105);
    doc.text(schoolInfo?.nom || "Établissement Scolaire", 35, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(schoolInfo?.slogan || "", 35, 23);
    doc.text(`${schoolInfo?.adresse || ""} | Tél: ${schoolInfo?.telephone || ""} | Email: ${schoolInfo?.email || ""}`, 35, 28);

    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(`EMPLOI DU TEMPS - ${classe?.nom || ""}`, 148, 45, { align: 'center' });

    const tableData: any[] = [];
    
    HEURES.forEach((heure) => {
      const row: any[] = [{ content: heure, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'center', valign: 'middle' } }];
      
      JOURS.forEach(jour => {
        if (isHourCovered(jour, heure)) return;
        
        const course = getCourse(jour, heure);
        const span = getCourseSpan(jour, heure);
        
        if (course) {
          const profStr = !isSelectedClassePrimaire && course.enseignant_nom ? `\n(${course.enseignant_nom} ${course.enseignant_prenom || ''})` : '';
          row.push({
            content: `${course.matiere_nom}${profStr}\n${course.heure_debut} - ${course.heure_fin}`,
            rowSpan: span,
            styles: { 
              fillColor: [209, 250, 229], 
              textColor: [6, 78, 59],
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle'
            }
          });
        } else {
          row.push({ content: '', styles: { fillColor: [255, 255, 255] } });
        }
      });
      tableData.push(row);
    });

    autoTable(doc, {
      startY: 55,
      head: [['Heure', ...JOURS]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle', overflow: 'linebreak' },
      styles: { 
        fontSize: 8, 
        cellPadding: 2.5, 
        halign: 'center', 
        valign: 'middle', 
        overflow: 'linebreak',
        cellWidth: 'auto',
        minCellHeight: 10
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 42 },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 42 },
        5: { cellWidth: 42 },
        6: { cellWidth: 42 }
      }
    });

    if (autoPrint) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Emploi_du_temps_${classe?.nom || "classe"}.pdf`);
    }
  };

  const generateTeacherPDF = (autoPrint = false) => {
    const teacher = enseignants?.find((t: any) => String(t.id) === String(selectedEnseignant));
    const doc = new jsPDF('landscape');
    const s = schoolInfo;

    if (s?.logo) {
      try { doc.addImage(s.logo, 'PNG', 15, 10, 20, 20); } catch(e){}
    }
    doc.setFontSize(16);
    doc.text(s?.nom || 'Établissement Scolaire', 40, 18);
    doc.setFontSize(9);
    doc.text(`${s?.adresse || ''} | Tél: ${s?.telephone || ''} | Email: ${s?.email || ''}`, 40, 24);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`EMPLOI DU TEMPS INDIVIDUEL ENSEIGNANT`, 148, 35, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Enseignant: ${teacher ? `${teacher.nom} ${teacher.prenom}` : ''}`, 148, 42, { align: 'center' });

    const tableData: any[] = [];
    HEURES.forEach(heure => {
      const row: any[] = [{ content: heure, styles: { fontStyle: 'bold', fillColor: [248, 250, 252], halign: 'center', valign: 'middle' } }];
      JOURS.forEach(jour => {
        if (isTeacherHourCovered(jour, heure)) return;

        const course = getTeacherCourse(jour, heure);
        const span = getTeacherCourseSpan(jour, heure);

        if (course) {
          row.push({
            content: `${course.matiere_nom}\nClasse: ${course.classe_nom || ''}\n${course.heure_debut} - ${course.heure_fin}`,
            rowSpan: span,
            styles: { 
              fillColor: [224, 231, 255], 
              textColor: [30, 58, 138],
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle'
            }
          });
        } else {
          row.push({ content: '', styles: { fillColor: [255, 255, 255] } });
        }
      });
      tableData.push(row);
    });

    autoTable(doc, {
      startY: 48,
      head: [['Heure', ...JOURS]],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center', valign: 'middle' },
      styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle' },
      margin: { left: 10, right: 10 },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 42 },
        2: { cellWidth: 42 },
        3: { cellWidth: 42 },
        4: { cellWidth: 42 },
        5: { cellWidth: 42 },
        6: { cellWidth: 42 }
      }
    });

    if (autoPrint) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Emploi_du_temps_${teacher?.nom}_${teacher?.prenom}.pdf`);
    }
  };

  const parseHour = (val: string | number): number => {
    if (typeof val === 'number') return val;
    if (!val) return -1;
    const match = String(val).match(/\d+/);
    return match ? parseInt(match[0], 10) : -1;
  };

  const getSlotStartHour = (heure: string): number => {
    const [hStart] = heure.split(' - ');
    return parseHour(hStart);
  };

  const getCourseForSlot = (courseList: any[], jour: string, heure: string) => {
    const slotStart = getSlotStartHour(heure);
    if (slotStart < 0) return null;
    return courseList?.find((e: any) => {
      if ((e.jour || '').trim().toLowerCase() !== (jour || '').trim().toLowerCase()) return false;
      const cStart = parseHour(e.heure_debut);
      return cStart === slotStart;
    });
  };

  const getCourseSpanForSlot = (courseList: any[], jour: string, heure: string) => {
    const course = getCourseForSlot(courseList, jour, heure);
    if (!course) return 1;
    const cStart = parseHour(course.heure_debut);
    const cEnd = parseHour(course.heure_fin);
    if (cStart < 0 || cEnd <= cStart) return 1;
    return Math.max(1, cEnd - cStart);
  };

  const isHourCoveredInList = (courseList: any[], jour: string, heure: string) => {
    const slotStart = getSlotStartHour(heure);
    if (slotStart < 0) return false;
    return courseList?.some((e: any) => {
      if ((e.jour || '').trim().toLowerCase() !== (jour || '').trim().toLowerCase()) return false;
      const cStart = parseHour(e.heure_debut);
      const cEnd = parseHour(e.heure_fin);
      return slotStart > cStart && slotStart < cEnd;
    });
  };

  const getCourse = (jour: string, heure: string) => {
    return getCourseForSlot(emplois, jour, heure);
  };

  const getCourseSpan = (jour: string, heure: string) => {
    return getCourseSpanForSlot(emplois, jour, heure);
  };

  const isHourCovered = (jour: string, heure: string) => {
    return isHourCoveredInList(emplois, jour, heure);
  };

  const getTeacherCourse = (jour: string, heure: string) => {
    return getCourseForSlot(teacherEmplois, jour, heure);
  };

  const getTeacherCourseSpan = (jour: string, heure: string) => {
    return getCourseSpanForSlot(teacherEmplois, jour, heure);
  };

  const isTeacherHourCovered = (jour: string, heure: string) => {
    return isHourCoveredInList(teacherEmplois, jour, heure);
  };

  const filteredEnseignants = React.useMemo(() => {
    return enseignants.filter((prof: any) => {
      const profCycle = (prof.cycle || 'secondaire').toLowerCase();
      if (cycle === 'primaire') {
        return profCycle === 'primaire' || profCycle === 'maternelle';
      }
      if (cycle === 'secondaire') {
        return profCycle !== 'primaire' && profCycle !== 'maternelle';
      }
      return true;
    });
  }, [enseignants, cycle]);

  const filteredClasses = React.useMemo(() => {
    return classes.filter((c: any) => {
      const isPrimaire = isClassPrimary(c);
      if (cycle === 'primaire' || activeSpaceState === 'primaire') {
        return isPrimaire;
      }
      if (cycle === 'secondaire' || activeSpaceState === 'secondaire') {
        return !isPrimaire;
      }
      return true;
    });
  }, [classes, cycle, activeSpaceState]);

  const selectedClasseObj = React.useMemo(() => {
    return classes.find((c: any) => c.id.toString() === selectedClasse);
  }, [classes, selectedClasse]);

  const isSelectedClassePrimaire = React.useMemo(() => {
    if (!selectedClasse) return false;
    if (selectedClasseObj) return isClassPrimary(selectedClasseObj);
    const found = classes.find((c: any) => String(c.id) === String(selectedClasse));
    if (found) return isClassPrimary(found);
    const foundTeacherCls = teacherClasses.find((c: any) => String(c.id) === String(selectedClasse));
    if (foundTeacherCls) return isClassPrimary(foundTeacherCls);
    return false;
  }, [selectedClasseObj, selectedClasse, classes, teacherClasses]);

  // Comprehensive determination of Maternelle & Primaire context
  const isPrimaryContext = React.useMemo(() => {
    if (cycle === 'primaire') return true;
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('primaire') || path.includes('maternelle')) return true;
      if (activeSpaceState === 'primaire') return true;
      const storedSpace = (localStorage.getItem('activeSpace') || '').toLowerCase();
      if (storedSpace.includes('primaire') || storedSpace.includes('maternelle')) return true;
    }
    const storedUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const uCycle = (user?.cycle || currentUser?.cycle || storedUser?.cycle || '').toLowerCase();
    if (uCycle.includes('primaire') || uCycle.includes('maternelle')) {
      return true;
    }
    if (teacherClasses && teacherClasses.length > 0) {
      if (teacherClasses.some((tc: any) => isClassPrimary(tc))) return true;
    }
    if (isSelectedClassePrimaire) return true;
    if (cycle !== 'secondaire' && filteredClasses.length > 0 && filteredClasses.every((c: any) => isClassPrimary(c))) {
      return true;
    }
    return false;
  }, [cycle, user, currentUser, teacherClasses, isSelectedClassePrimaire, filteredClasses, activeSpaceState]);

  // Enforce viewMode = 'classe' in Maternelle & Primaire space at all times
  React.useEffect(() => {
    if ((isPrimaryContext || isSelectedClassePrimaire) && viewMode !== 'classe') {
      setViewMode('classe');
    }
  }, [isPrimaryContext, isSelectedClassePrimaire, viewMode]);

  // Auto-select class in Maternelle & Primaire
  React.useEffect(() => {
    if ((isPrimaryContext || cycle === 'primaire') && !selectedClasse) {
      if (teacherClasses.length > 0) {
        setSelectedClasse(String(teacherClasses[0].id));
      } else if (filteredClasses.length > 0) {
        setSelectedClasse(String(filteredClasses[0].id));
      }
    }
  }, [isPrimaryContext, cycle, teacherClasses, filteredClasses, selectedClasse]);

  const teachersForSubject = React.useMemo(() => {
    if (!formData.matiere_id) return [];
    return enseignants.filter((ens: any) => {
      const mIds = (ens.matieres_ids || '').split(',').map((id: string) => id.trim());
      return mIds.includes(formData.matiere_id.toString());
    });
  }, [enseignants, formData.matiere_id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {cycle === 'primaire' ? 'Emploi du Temps (Primaire & Maternelle)' : cycle === 'secondaire' ? 'Emploi du Temps (Secondaire)' : 'Emploi du Temps'}
          </h1>
          <p className="text-slate-500">Planifiez les cours par classe et par jour.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {user?.role === 'enseignant' && (
            <>
              <button 
                onClick={() => openRequestForSlot()}
                className="bg-amber-600 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-amber-700 shadow-md shadow-amber-600/20 transition-all active:scale-95 text-xs"
              >
                <Clock size={16} />
                Demander un ajustement EDT
              </button>

              <Link 
                to="/emploi-du-temps-requests"
                onClick={() => {
                  if (getUnreadCountForPath('/emploi-du-temps-requests') > 0) {
                    markPathNotificationsAsRead('/emploi-du-temps-requests');
                  }
                }}
                className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors text-xs relative"
              >
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Mes Autorisations EDT</span>
                {getUnreadCountForPath('/emploi-du-temps-requests') > 0 ? (
                  <span 
                    title={`${getUnreadCountForPath('/emploi-du-temps-requests')} notification(s) non lue(s)`}
                    className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse"
                  >
                    {getUnreadCountForPath('/emploi-du-temps-requests')} nouv.
                  </span>
                ) : teacherAuthorizations.length > 0 && (
                  <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {teacherAuthorizations.length}
                  </span>
                )}
              </Link>
            </>
          )}

          {canWrite && (
            <button 
              onClick={() => setShowModal(true)}
              disabled={!selectedClasse}
              className="bg-primary-600 text-white px-4 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 transition-colors disabled:opacity-50 text-xs"
            >
              <Plus size={16} />
              Ajouter un cours
            </button>
          )}
        </div>
      </div>

      {/* DEDICATED TIMETABLE ADJUSTMENT REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 my-8">
            <div className="p-5 border-b flex items-center justify-between bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Clock size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold">Demande de modification d'Emploi du Temps</h2>
                  <p className="text-xs text-amber-100">Transmise au Censeur et à la Direction des Études</p>
                </div>
              </div>
              <button onClick={() => setShowRequestModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white">
                <XIcon size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Classe concernée
                  </label>
                  <select
                    value={requestFormData.classe_id}
                    onChange={e => setRequestFormData({ ...requestFormData, classe_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="">Sélectionner une classe</option>
                    {filteredClasses.map((c: any) => (
                      <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Matière
                  </label>
                  <select
                    value={requestFormData.matiere_id}
                    onChange={e => setRequestFormData({ ...requestFormData, matiere_id: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="">Sélectionner la matière</option>
                    {matieres.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jour
                  </label>
                  <select
                    value={requestFormData.jour}
                    onChange={e => setRequestFormData({ ...requestFormData, jour: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="">Jour...</option>
                    {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Début
                  </label>
                  <select
                    value={requestFormData.heure_debut}
                    onChange={e => setRequestFormData({ ...requestFormData, heure_debut: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="">Début...</option>
                    {HEURES.map(h => h.split(' - ')[0]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fin
                  </label>
                  <select
                    value={requestFormData.heure_fin}
                    onChange={e => setRequestFormData({ ...requestFormData, heure_fin: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                  >
                    <option value="">Fin...</option>
                    {HEURES.map(h => h.split(' - ')[1]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Détails et motif de l'ajustement souhaité *
                </label>
                <textarea 
                  value={requestFormData.description}
                  onChange={e => setRequestFormData({ ...requestFormData, description: e.target.value })}
                  className="w-full h-28 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all leading-relaxed"
                  placeholder="Ex : Je souhaiterais échanger mon créneau du mardi 10h-12h en 3ème A avec le vendredi 08h-10h en raison d'une indisponibilité pédagogique..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleRequest}
                  disabled={isSubmittingEdtRequest}
                  className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Send size={15} />
                  {isSubmittingEdtRequest ? 'Transmission...' : 'Envoyer la Demande'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode Selector - strictly removed in Maternelle & Primaire: only the class timetable is displayed */}
      {!isPrimaryContext && cycle !== 'primaire' && !isSelectedClassePrimaire && (
        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setViewMode('classe')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'classe' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vue par Classe
          </button>
          <button
            onClick={() => setViewMode('enseignant')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              viewMode === 'enseignant' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vue par Enseignant
          </button>
        </div>
      )}

      {(viewMode === 'classe' || isPrimaryContext || isSelectedClassePrimaire) ? (
        <>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 w-full">
                <select 
                  value={selectedClasse}
                  onChange={e => setSelectedClasse(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une classe</option>
                  {filteredClasses.map((c: any) => <option key={c.id} value={c.id}>{formatClassName(c.nom)}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => generatePDF(true)}
                  disabled={!selectedClasse}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Imprimer
                </button>
                <button 
                  onClick={() => generatePDF(false)}
                  disabled={!selectedClasse}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 disabled:opacity-50"
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </div>
          </div>

          {selectedClasse ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="p-4 bg-slate-50 border-b border-r text-slate-500 text-xs uppercase font-bold w-24">Heure</th>
                      {JOURS.map(jour => (
                        <th key={jour} className="p-4 bg-slate-50 border-b border-r text-slate-900 text-sm font-bold w-[15%]">
                          {jour}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HEURES.map(heure => (
                      <tr key={heure}>
                        <td className="p-4 border-b border-r bg-slate-50/50 text-xs font-bold text-slate-500 flex items-center gap-2">
                          <Clock size={14} />
                          {heure}
                        </td>
                        {JOURS.map(jour => {
                          if (isHourCovered(jour, heure)) return null;
                          
                          const course = getCourse(jour, heure);
                          const span = getCourseSpan(jour, heure);
                          const [startH, endH] = heure.split(' - ');
                          
                          const isOther = isOtherCourse(course);
                          const isMine = isMyCourse(course);
                          const isAuthorizedCourse = isAuthorizedForCourse(course);
                          const isAuthorizedEmptySlot = isAuthorizedForSlot(jour, startH, endH, selectedClasse);
                          
                          // Check if this course has a teacher conflict (marked by backend)
                          const hasConflict = course && course.conflict_info;
                          
                          return (
                            <td 
                              key={`${jour}-${heure}`} 
                              rowSpan={span}
                              className={`p-2 border-b border-r group relative min-h-[80px] ${
                                course 
                                  ? hasConflict
                                    ? 'bg-rose-50'
                                    : isOther 
                                      ? 'bg-slate-100/70' 
                                      : isAuthorizedCourse 
                                        ? 'bg-emerald-50/60' 
                                        : 'bg-primary-50/30' 
                                  : ''
                              }`}
                            >
                              {course ? (
                                hasConflict ? (
                                  /* CONFLICTING COURSE -> RED BACKGROUND WITH WARNING */
                                  <div className="bg-white border-2 border-rose-500 p-2.5 rounded-xl relative group/item h-full flex flex-col justify-between shadow-md animate-pulse">
                                    <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-1 rounded-full shadow-lg z-10">
                                      <ShieldAlert size={14} />
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md uppercase">
                                          CONFLIT D'HORAIRE
                                        </span>
                                      </div>
                                      <p className="text-xs font-black text-slate-900 leading-tight">
                                        {course.matiere_nom}
                                      </p>
                                      <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded-lg">
                                        <p className="text-[10px] text-rose-700 font-bold leading-tight">
                                          Attention : Cet enseignant est déjà occupé en {course.conflict_info.classe_nom} à ces heures.
                                        </p>
                                      </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                      {!isSelectedClassePrimaire && (
                                        <p className="text-[10px] text-slate-500 font-medium truncate">
                                          {course.enseignant_nom ? `${course.enseignant_nom} ${course.enseignant_prenom}` : 'Enseignant non défini'}
                                        </p>
                                      )}
                                      {canWrite && (
                                        <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                          <button onClick={() => handleEdit(course)} className="p-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded-lg shadow-sm border border-blue-100">
                                            <Edit3 size={12} />
                                          </button>
                                          <button onClick={() => handleDelete(course.id)} className="p-1.5 bg-white text-rose-600 hover:bg-rose-50 rounded-lg shadow-sm border border-rose-100">
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : isOther ? (
                                  /* OTHER TEACHER'S PROGRAM -> GRAYED OUT, READ ONLY */
                                  <div className="bg-slate-200/60 border border-slate-300/80 p-2.5 rounded-xl h-full flex flex-col justify-between select-none opacity-85">
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-slate-500 uppercase">
                                          <Lock size={10} className="text-slate-400" />
                                          Occupé
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-semibold">
                                          {course.heure_debut} - {course.heure_fin}
                                        </span>
                                      </div>
                                      <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">
                                        {course.matiere_nom}
                                      </p>
                                    </div>
                                    {!isSelectedClassePrimaire && (
                                      <p className="text-[10px] text-slate-500 font-medium truncate mt-1">
                                        {course.enseignant_nom ? `${course.enseignant_nom} ${course.enseignant_prenom}` : 'Autre enseignant'}
                                      </p>
                                    )}
                                  </div>
                                ) : isMine && isAuthorizedCourse ? (
                                  /* LOGGED IN TEACHER'S APPROVED COURSE -> HIGHLIGHTED WITH EDIT / DELETE ACCESS */
                                  <div className="bg-emerald-50 border-2 border-emerald-400 p-2.5 rounded-xl relative group/item h-full flex flex-col justify-between shadow-sm">
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                                          <CheckCircle2 size={10} className="text-emerald-600" />
                                          Modif. Autorisée
                                        </span>
                                        <span className="text-[9px] text-emerald-700 font-bold">
                                          {course.heure_debut} - {course.heure_fin}
                                        </span>
                                      </div>
                                      <p className="text-xs font-black text-emerald-950 leading-tight">
                                        {course.matiere_nom}
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-emerald-200/60">
                                      <p className="text-[10px] text-emerald-700 font-bold">
                                        Mon créneau
                                      </p>
                                      <div className="flex gap-1">
                                        <button 
                                          onClick={() => handleEdit(course)}
                                          title="Modifier ce cours"
                                          className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                        >
                                          <Edit3 size={11} />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(course.id)}
                                          title="Supprimer ce cours"
                                          className="p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ) : isTeacher && isMine ? (
                                  /* LOGGED IN TEACHER'S COURSE WITHOUT APPROVAL -> READ ONLY WITH REQUEST BUTTON */
                                  <div className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl relative group/item h-full flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md">
                                          Mon cours
                                        </span>
                                        <span className="text-[9px] text-blue-500 font-semibold">
                                          {course.heure_debut} - {course.heure_fin}
                                        </span>
                                      </div>
                                      <p className="text-xs font-black text-blue-950 leading-tight">
                                        {course.matiere_nom}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => openRequestForCourse(course)}
                                      className="mt-2 w-full py-1 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors"
                                    >
                                      <Clock size={10} className="text-amber-600" />
                                      Demander modif
                                    </button>
                                  </div>
                                ) : (
                                  /* STAFF / ADMIN VIEW OR GENERAL VIEW */
                                  <div className="bg-primary-50 border border-primary-100 p-3 rounded-xl relative group/item h-full flex flex-col justify-center overflow-hidden">
                                    <p className="text-xs font-black text-primary-900 leading-tight whitespace-normal" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                      {course.matiere_nom}
                                    </p>
                                    {!isSelectedClassePrimaire && (
                                      <p className="text-[10px] text-primary-600 font-medium mt-1 break-words">
                                        {course.enseignant_nom ? `${course.enseignant_nom} ${course.enseignant_prenom}` : 'Aucun prof'}
                                      </p>
                                    )}
                                    <p className="text-[9px] text-primary-400 mt-1 font-bold">
                                      {course.heure_debut} - {course.heure_fin}
                                    </p>
                                    {canWrite && (
                                      <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity z-20">
                                        <button 
                                          onClick={() => handleEdit(course)}
                                          className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                        >
                                          <Edit3 size={11} />
                                        </button>
                                        <button 
                                          onClick={() => handleDelete(course.id)}
                                          className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )
                              ) : (
                                /* EMPTY SLOT */
                                canWrite ? (
                                  <div 
                                    onClick={() => {
                                      setFormData({ ...formData, jour, heure_debut: startH, heure_fin: endH });
                                      setShowModal(true);
                                    }}
                                    className="h-full min-h-[60px] rounded-lg border border-dashed border-slate-100 flex items-center justify-center transition-colors group-hover:bg-slate-50 cursor-pointer"
                                  >
                                    <Plus size={16} className="text-slate-200 group-hover:text-primary-400" />
                                  </div>
                                ) : isTeacher && isAuthorizedEmptySlot ? (
                                  <div 
                                    onClick={() => {
                                      setFormData({ ...formData, jour, heure_debut: startH, heure_fin: endH });
                                      setShowModal(true);
                                    }}
                                    className="h-full min-h-[60px] rounded-xl border-2 border-dashed border-emerald-400 bg-emerald-50/60 hover:bg-emerald-100/70 p-2 cursor-pointer flex flex-col items-center justify-center text-center transition-all"
                                  >
                                    <span className="text-[10px] font-black text-emerald-800 flex items-center gap-1">
                                      <Plus size={12} />
                                      Programmer
                                    </span>
                                    <span className="text-[9px] text-emerald-600 font-semibold">Autorisé</span>
                                  </div>
                                ) : isTeacher ? (
                                  <div 
                                    onClick={() => openRequestForSlot(jour, startH, endH)}
                                    title="Faire une demande pour ce créneau"
                                    className="h-full min-h-[60px] rounded-xl border border-dashed border-slate-100 hover:border-amber-300 hover:bg-amber-50/40 p-1.5 cursor-pointer flex flex-col items-center justify-center text-center transition-all group/empty"
                                  >
                                    <span className="text-[9px] font-medium text-slate-300 group-hover/empty:text-amber-700 flex items-center gap-1">
                                      <Clock size={10} />
                                      Demander
                                    </span>
                                  </div>
                                ) : (
                                  <div className="h-full min-h-[60px] rounded-lg border border-dashed border-slate-50" />
                                )
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <CalendarIcon size={64} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400">Sélectionnez une classe pour afficher son emploi du temps.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Teacher Timetable View */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full max-w-md">
                <label className="text-xs font-bold text-slate-500 block mb-1">Sélectionner l'enseignant</label>
                <select 
                  value={selectedEnseignant}
                  onChange={e => setSelectedEnseignant(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl text-sm px-4 py-2 outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                >
                  <option value="">Sélectionnez un enseignant...</option>
                  {filteredEnseignants.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.nom} {t.prenom} ({t.matieres_noms || 'Toutes matières'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => generateTeacherPDF(true)}
                  disabled={!selectedEnseignant}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 flex items-center gap-2 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Imprimer
                </button>
                <button 
                  onClick={() => generateTeacherPDF(false)}
                  disabled={!selectedEnseignant}
                  className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50 shadow-md shadow-primary-200"
                >
                  <Download size={16} />
                  Télécharger PDF
                </button>
              </div>
            </div>
          </div>

          {selectedEnseignant ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
                <h3 className="font-bold text-slate-800">
                  Emploi du temps personnel de{' '}
                  <span className="text-primary-600">
                    {enseignants?.find(t => String(t.id) === String(selectedEnseignant))?.nom}{' '}
                    {enseignants?.find(t => String(t.id) === String(selectedEnseignant))?.prenom}
                  </span>
                </h3>
                <span className="text-xs bg-primary-100 text-primary-800 font-bold px-3 py-1 rounded-full">
                  {teacherEmplois.length} cours programmé(s)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse table-fixed">
                  <thead>
                    <tr>
                      <th className="p-4 bg-slate-50 border-b border-r text-slate-500 text-xs uppercase font-bold w-24">Heure</th>
                      {JOURS.map(jour => (
                        <th key={jour} className="p-4 bg-slate-50 border-b border-r text-slate-900 text-sm font-bold w-[15%]">
                          {jour}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {HEURES.map(heure => (
                      <tr key={heure}>
                        <td className="p-4 border-b border-r bg-slate-50/50 text-xs font-bold text-slate-500 flex items-center gap-2">
                          <Clock size={14} />
                          {heure}
                        </td>
                        {JOURS.map(jour => {
                          if (isTeacherHourCovered(jour, heure)) return null;

                          const course = getTeacherCourse(jour, heure);
                          const span = getTeacherCourseSpan(jour, heure);

                          return (
                            <td 
                              key={`${jour}-${heure}`} 
                              rowSpan={span}
                              className={`p-2 border-b border-r align-top ${course ? 'bg-blue-50/40' : ''}`}
                              style={span > 1 ? { height: `${span * 75}px` } : undefined}
                            >
                              {course ? (
                                <div 
                                  className="bg-blue-50 border border-blue-200 p-3 rounded-xl h-full flex flex-col justify-between"
                                  style={span > 1 ? { minHeight: `${span * 75 - 16}px` } : undefined}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-xs text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md w-fit">
                                        Classe: {course.classe_nom}
                                      </span>
                                      <span className="text-[10px] text-blue-600 font-bold">
                                        {course.heure_debut} - {course.heure_fin}
                                      </span>
                                    </div>
                                    <p className="text-xs font-black text-blue-900 leading-tight mt-1">{course.matiere_nom}</p>
                                  </div>
                                  {span > 1 && (
                                    <div className="mt-2 pt-1 border-t border-blue-200/60 flex items-center justify-between text-[10px] text-blue-700 font-semibold">
                                      <span>Durée : {span} heure(s)</span>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
              <CalendarIcon size={64} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-400">Sélectionnez un enseignant pour afficher son emploi du temps personnel.</p>
            </div>
          )}
        </>
      )}
      {/* Conflict Alert Modal */}
      {conflictAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-rose-100 scale-in-center animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center space-y-6">
              <div className="mx-auto w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 animate-bounce">
                <ShieldAlert size={40} strokeWidth={2.5} />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Conflit de Programmation</h3>
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                  <p className="text-sm font-bold text-rose-800 leading-relaxed">
                    {conflictAlert.message}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setConflictAlert(null)}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-base transition-all shadow-xl shadow-slate-900/20 active:scale-[0.98]"
              >
                J'ai compris (OK)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Modifier le cours' : 'Ajouter un cours'}</h2>
              <button onClick={() => { setShowModal(false); setEditingId(null); }} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <XIcon size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Jour</label>
                <select 
                  required
                  value={formData.jour}
                  onChange={e => setFormData({...formData, jour: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un jour</option>
                  {JOURS.map(j => <option key={j} value={j}>{j}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Heure Début</label>
                  <select 
                    required
                    value={formData.heure_debut}
                    onChange={e => setFormData({...formData, heure_debut: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Début</option>
                    {HEURES.map(h => h.split(' - ')[0]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Heure Fin</label>
                  <select 
                    required
                    value={formData.heure_fin}
                    onChange={e => setFormData({...formData, heure_fin: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Fin</option>
                    {HEURES.map(h => h.split(' - ')[1]).map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Matière</label>
                <select 
                  required
                  value={formData.matiere_id}
                  onChange={e => {
                    const mId = e.target.value;
                    const association = classMatieres.find((cm: any) => String(cm.matiere_id || cm.id) === String(mId));
                    let nextEnsId = association?.enseignant_id ? String(association.enseignant_id) : formData.enseignant_id;
                    
                    // Validate if teacher teaches this subject
                    const canTeach = enseignants.some(ens => {
                      if (ens.id.toString() !== nextEnsId) return false;
                      const mIds = (ens.matieres_ids || '').split(',').map((id: string) => id.trim());
                      return mIds.includes(mId.toString());
                    });
                    
                    if (!canTeach) nextEnsId = '';

                    setFormData({
                      ...formData, 
                      matiere_id: mId,
                      enseignant_id: nextEnsId
                    });
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner une matière</option>
                  {classMatieres && classMatieres.length > 0
                    ? classMatieres.map((m: any) => (
                        <option key={m.matiere_id || m.id} value={m.matiere_id || m.id}>
                          {m.matiere_nom || m.nom}
                        </option>
                      ))
                    : matieres.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.nom} {m.sigle ? `(${m.sigle})` : ''}
                        </option>
                      ))
                  }
                </select>
              </div>

              {canWrite && !isSelectedClassePrimaire && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Enseignant (Optionnel)</label>
                  <select 
                    value={formData.enseignant_id}
                    onChange={e => setFormData({...formData, enseignant_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Sélectionner un enseignant</option>
                    {teachersForSubject.map((ens: any) => (
                      <option key={ens.id} value={ens.id}>
                        {ens.nom} {ens.prenom}
                      </option>
                    ))}
                  </select>
                  {teachersForSubject.length === 0 && formData.matiere_id && (
                    <p className="text-[10px] text-amber-600 font-medium">
                      Aucun enseignant n'est configuré pour cette matière.
                    </p>
                  )}
                  <p className="text-[10px] text-slate-400 italic">
                    Si laissé vide, l'enseignant associé à cette matière dans cette classe sera utilisé.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setEditingId(null); }}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  {editingId ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function X({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
