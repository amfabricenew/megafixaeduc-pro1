import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, useAppSync } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, 
  DoorOpen, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Sparkles, 
  X, 
  Filter, 
  Printer, 
  FileText, 
  Eye, 
  ArrowRight,
  ShieldAlert,
  SlidersHorizontal,
  BookmarkPlus,
  Check,
  Building,
  GraduationCap,
  Tag,
  Monitor,
  Wifi,
  Tv,
  Wind,
  FlaskConical,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { Batiment, Salle, EvenementSalle, ClasseItem } from '../types';
import jsPDF from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';

const ROOM_TYPES = [
  { id: 'cours', label: 'Salle de cours', icon: BookOpen, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'laboratoire', label: 'Laboratoire (Sciences/Chimie)', icon: FlaskConical, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'informatique', label: 'Salle Informatique & Multimédia', icon: Monitor, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'polyvalente', label: 'Grande Salle Polyvalente / Conférences', icon: Building2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'bibliotheque', label: 'Bibliothèque & Centre de documentation', icon: BookOpen, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'autre', label: 'Autre espace', icon: DoorOpen, color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

const EVENT_TYPES = [
  { id: 'reunion', label: 'Réunion administrative / Direction', color: 'bg-blue-100 text-blue-800' },
  { id: 'conseil_classe', label: 'Conseil de classe', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'examen', label: 'Examen / Composition / Concours', color: 'bg-red-100 text-red-800' },
  { id: 'formation', label: 'Formation des enseignants', color: 'bg-purple-100 text-purple-800' },
  { id: 'activite', label: 'Activité parascolaire / Club', color: 'bg-emerald-100 text-emerald-800' },
  { id: 'autre', label: 'Autre événement', color: 'bg-slate-100 text-slate-800' },
];

const COMMON_EQUIPMENTS = [
  "Tableau blanc",
  "Tableau noir",
  "Vidéoprojecteur",
  "Climatisation",
  "Ventilateurs",
  "Connexion Wifi",
  "Ordinateurs",
  "Prises électriques",
  "Sonorisation & Micro",
  "Paillasses de labo",
  "Microscopes",
  "Écran interactif",
  "Extincteur"
];

const PRESET_COLORS = [
  { name: 'Émeraude', hex: '#10b981' },
  { name: 'Bleu Océan', hex: '#3b82f6' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Ambre', hex: '#f59e0b' },
  { name: 'Rose', hex: '#ec4899' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Ardoise', hex: '#64748b' },
];

export default function BatimentsSalles() {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<'batiments' | 'salles' | 'attribution' | 'evenements'>('batiments');
  
  const [batiments, setBatiments] = useState<Batiment[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [evenements, setEvenements] = useState<EvenementSalle[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatimentFilter, setSelectedBatimentFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = useState<string | number>('all');

  // Modals
  const [showBatimentModal, setShowBatimentModal] = useState(false);
  const [editingBatiment, setEditingBatiment] = useState<Batiment | null>(null);
  const [batimentForm, setBatimentForm] = useState({
    nom: '',
    code: '',
    description: '',
    nombre_etages: 1,
    couleur: '#10b981'
  });

  const [showSalleModal, setShowSalleModal] = useState(false);
  const [editingSalle, setEditingSalle] = useState<Salle | null>(null);
  const [salleForm, setSalleForm] = useState({
    nom: '',
    code: '',
    batiment_id: '',
    etage: 'Rez-de-chaussée',
    capacite: 35,
    type_salle: 'cours',
    statut: 'disponible',
    equipements: [] as string[],
    description: '',
    customEquipmentInput: ''
  });

  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EvenementSalle | null>(null);
  const [eventForm, setEventForm] = useState({
    titre: '',
    type_evenement: 'reunion',
    salle_id: '',
    date_evenement: new Date().toISOString().split('T')[0],
    heure_debut: '08:00',
    heure_fin: '10:00',
    responsable: '',
    description: '',
    statut: 'confirme',
    force: false
  });

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    classe_id: '',
    classe_nom: '',
    salle_id: ''
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const canWrite = user.role === 'admin' || user.role === 'direction' || user.role === 'censeur';

  const fetchData = async () => {
    try {
      setLoading(true);
      const yearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      const [batRes, salRes, clsRes, evtRes] = await Promise.all([
        apiFetch(`/api/batiments${yearParam}`),
        apiFetch(`/api/salles${yearParam}`),
        apiFetch('/api/classes'),
        apiFetch(`/api/evenements-salles${yearParam}`)
      ]);

      if (batRes.ok) setBatiments(await batRes.json());
      if (salRes.ok) setSalles(await salRes.json());
      if (clsRes.ok) setClasses(await clsRes.json());
      if (evtRes.ok) setEvenements(await evtRes.json());
    } catch (err: any) {
      console.error("Error loading buildings and rooms:", err);
      toast.error("Erreur de chargement des données de l'infrastructure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYearId]);

  useAppSync(() => {
    fetchData();
  }, 60000);

  // Statistics
  const stats = useMemo(() => {
    const totalBatiments = batiments.length;
    const totalSalles = salles.length;
    const totalCapacite = salles.reduce((sum, s) => sum + (s.capacite || 0), 0);
    const assignedRooms = salles.filter(s => s.classe_attribuee_id).length;
    const availableRooms = totalSalles - assignedRooms;
    const upcomingEvents = evenements.filter(e => e.date_evenement >= new Date().toISOString().split('T')[0]).length;

    return {
      totalBatiments,
      totalSalles,
      totalCapacite,
      assignedRooms,
      availableRooms,
      upcomingEvents
    };
  }, [batiments, salles, evenements]);

  // Filtered Salles
  const filteredSalles = useMemo(() => {
    return salles.filter(s => {
      const matchSearch = (s.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.batiment_nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.classe_attribuee_nom || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchBatiment = selectedBatimentFilter === 'all' || 
        (selectedBatimentFilter === 'none' ? !s.batiment_id : String(s.batiment_id) === String(selectedBatimentFilter));

      const matchType = selectedTypeFilter === 'all' || s.type_salle === selectedTypeFilter;

      return matchSearch && matchBatiment && matchType;
    });
  }, [salles, searchTerm, selectedBatimentFilter, selectedTypeFilter]);

  // Handlers: Buildings
  const handleOpenBatimentModal = (bat?: Batiment) => {
    if (bat) {
      setEditingBatiment(bat);
      setBatimentForm({
        nom: bat.nom,
        code: bat.code || '',
        description: bat.description || '',
        nombre_etages: bat.nombre_etages || 1,
        couleur: bat.couleur || '#10b981'
      });
    } else {
      setEditingBatiment(null);
      setBatimentForm({
        nom: '',
        code: '',
        description: '',
        nombre_etages: 1,
        couleur: '#10b981'
      });
    }
    setShowBatimentModal(true);
  };

  const handleSaveBatiment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batimentForm.nom.trim()) {
      toast.error("Veuillez saisir le nom du bâtiment.");
      return;
    }

    try {
      const url = editingBatiment ? `/api/batiments/${editingBatiment.id}` : '/api/batiments';
      const method = editingBatiment ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batimentForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'enregistrement du bâtiment");
      }

      toast.success(editingBatiment ? "Bâtiment mis à jour avec succès !" : "Bâtiment créé avec succès !");
      setShowBatimentModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteBatiment = async (bat: Batiment) => {
    if (await confirm({
      title: `Supprimer ${bat.nom} ?`,
      message: "Les salles rattachées à ce bâtiment seront conservées mais déliées de celui-ci. Êtes-vous sûr ?",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      try {
        const res = await apiFetch(`/api/batiments/${bat.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Erreur de suppression");
        toast.success("Bâtiment supprimé.");
        fetchData();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  // Handlers: Salles
  const handleOpenSalleModal = (salle?: Salle, defaultBatId?: number) => {
    if (salle) {
      setEditingSalle(salle);
      let eqList: string[] = [];
      try {
        eqList = typeof salle.equipements === 'string' ? JSON.parse(salle.equipements) : (salle.equipements || []);
      } catch (e) {
        eqList = [];
      }

      setSalleForm({
        nom: salle.nom,
        code: salle.code || '',
        batiment_id: salle.batiment_id ? String(salle.batiment_id) : '',
        etage: salle.etage || 'Rez-de-chaussée',
        capacite: salle.capacite || 35,
        type_salle: salle.type_salle || 'cours',
        statut: salle.statut || 'disponible',
        equipements: eqList,
        description: salle.description || '',
        customEquipmentInput: ''
      });
    } else {
      setEditingSalle(null);
      setSalleForm({
        nom: '',
        code: '',
        batiment_id: defaultBatId ? String(defaultBatId) : (batiments[0] ? String(batiments[0].id) : ''),
        etage: 'Rez-de-chaussée',
        capacite: 35,
        type_salle: 'cours',
        statut: 'disponible',
        equipements: ["Tableau blanc", "Ventilateurs"],
        description: '',
        customEquipmentInput: ''
      });
    }
    setShowSalleModal(true);
  };

  const toggleEquipment = (eq: string) => {
    setSalleForm(prev => {
      const exists = prev.equipements.includes(eq);
      return {
        ...prev,
        equipements: exists ? prev.equipements.filter(i => i !== eq) : [...prev.equipements, eq]
      };
    });
  };

  const handleAddCustomEquipment = () => {
    if (!salleForm.customEquipmentInput.trim()) return;
    const val = salleForm.customEquipmentInput.trim();
    if (!salleForm.equipements.includes(val)) {
      setSalleForm(prev => ({
        ...prev,
        equipements: [...prev.equipements, val],
        customEquipmentInput: ''
      }));
    } else {
      setSalleForm(prev => ({ ...prev, customEquipmentInput: '' }));
    }
  };

  const handleSaveSalle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salleForm.nom.trim()) {
      toast.error("Veuillez saisir le nom de la salle.");
      return;
    }

    try {
      const url = editingSalle ? `/api/salles/${editingSalle.id}` : '/api/salles';
      const method = editingSalle ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salleForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'enregistrement de la salle");
      }

      toast.success(editingSalle ? "Salle mise à jour avec succès !" : "Salle créée avec succès !");
      setShowSalleModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteSalle = async (salle: Salle) => {
    if (await confirm({
      title: `Supprimer la salle ${salle.nom} ?`,
      message: "Cette salle sera retirée des attributions de classe et de tous les événements programmés. Continuer ?",
      confirmText: "Supprimer la salle",
      variant: "danger",
      icon: "trash"
    })) {
      try {
        const res = await apiFetch(`/api/salles/${salle.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Erreur de suppression");
        toast.success("Salle supprimée.");
        fetchData();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  // Handlers: Class Assignment
  const handleOpenAssignModal = (classe: ClasseItem) => {
    setAssignForm({
      classe_id: String(classe.id),
      classe_nom: classe.nom,
      salle_id: classe.salle_id ? String(classe.salle_id) : ''
    });
    setShowAssignModal(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/salles/attribuer-classe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classe_id: assignForm.classe_id,
          salle_id: assignForm.salle_id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'attribution");
      }

      toast.success("Attribution mise à jour avec succès !");
      setShowAssignModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Handlers: Room Events & Reservations
  const handleOpenEventModal = (evt?: EvenementSalle, defaultSalleId?: number) => {
    if (evt) {
      setEditingEvent(evt);
      setEventForm({
        titre: evt.titre,
        type_evenement: evt.type_evenement || 'reunion',
        salle_id: String(evt.salle_id),
        date_evenement: evt.date_evenement,
        heure_debut: evt.heure_debut,
        heure_fin: evt.heure_fin,
        responsable: evt.responsable || '',
        description: evt.description || '',
        statut: evt.statut || 'confirme',
        force: false
      });
    } else {
      setEditingEvent(null);
      setEventForm({
        titre: '',
        type_evenement: 'reunion',
        salle_id: defaultSalleId ? String(defaultSalleId) : (salles[0] ? String(salles[0].id) : ''),
        date_evenement: new Date().toISOString().split('T')[0],
        heure_debut: '09:00',
        heure_fin: '11:00',
        responsable: user.nom || '',
        description: '',
        statut: 'confirme',
        force: false
      });
    }
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent, forceSave = false) => {
    e.preventDefault();
    if (!eventForm.titre.trim() || !eventForm.salle_id) {
      toast.error("Veuillez renseigner le titre et sélectionner une salle.");
      return;
    }

    try {
      const url = editingEvent ? `/api/evenements-salles/${editingEvent.id}` : '/api/evenements-salles';
      const method = editingEvent ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventForm, force: forceSave || eventForm.force })
      });

      if (res.status === 409) {
        const data = await res.json();
        const shouldForce = await confirm({
          title: "Conflit d'occupation détecté !",
          message: `${data.error}\n\nSouhaitez-vous forcer la réservation malgré ce conflit ?`,
          confirmText: "Forcer la réservation",
          variant: "danger",
          icon: "alert"
        });

        if (shouldForce) {
          return handleSaveEvent(e, true);
        }
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'enregistrement de l'événement");
      }

      toast.success(editingEvent ? "Réservation mise à jour !" : "Événement programmé avec succès !");
      setShowEventModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteEvent = async (evt: EvenementSalle) => {
    if (await confirm({
      title: `Annuler l'événement "${evt.titre}" ?`,
      message: "Voulez-vous vraiment supprimer cette réservation de salle ?",
      confirmText: "Supprimer",
      variant: "danger",
      icon: "trash"
    })) {
      try {
        const res = await apiFetch(`/api/evenements-salles/${evt.id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error("Erreur de suppression");
        toast.success("Réservation supprimée.");
        fetchData();
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Planification & Attribution des Salles de Classe", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} • Infrastructure MégafixaEduc`, 14, 28);

    const tableData = salles.map((s, idx) => [
      idx + 1,
      s.nom,
      s.code || '-',
      s.batiment_nom || 'Non assigné',
      s.etage || 'RDC',
      `${s.capacite} places`,
      s.classe_attribuee_nom ? `${s.classe_attribuee_nom} (${s.classe_effectif || 0} él.)` : 'Salle libre / partagée',
      s.type_salle || 'cours'
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['N°', 'Nom de la salle', 'Code', 'Bâtiment', 'Étage', 'Capacité', 'Classe Attribuée', 'Type']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: '#10b981', textColor: '#ffffff' }
    });

    doc.save(`attribution_salles_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold">
              <Building2 size={14} />
              <span>Gestion Personnalisable des Espaces & Salles</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Bâtiments & Salles de Classe
            </h1>
            <p className="text-emerald-100 text-sm max-w-2xl">
              Organisez vos bâtiments, configurez les salles par capacité et équipements, affectez les classes et réservez des créneaux pour les réunions et événements scolaires.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/15 backdrop-blur-md rounded-xl text-white border border-white/10 shadow-sm">
              <Filter size={16} className="text-white/60" />
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">Année :</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-sm font-bold bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto text-white"
              >
                <option value="all" className="text-slate-900">Toutes les années</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id} className="text-slate-900">Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all"
            >
              <Printer size={16} />
              <span>Exporter PDF</span>
            </button>

            {canWrite && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenBatimentModal()}
                  className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all"
                >
                  <Plus size={16} />
                  <span>Nouveau Bâtiment</span>
                </button>
                <button
                  onClick={() => handleOpenSalleModal()}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all border border-emerald-400/40"
                >
                  <DoorOpen size={16} />
                  <span>Nouvelle Salle</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Global Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs text-emerald-100 font-medium">Bâtiments</p>
            <p className="text-xl font-extrabold mt-0.5">{stats.totalBatiments}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs text-emerald-100 font-medium">Total Salles</p>
            <p className="text-xl font-extrabold mt-0.5">{stats.totalSalles}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs text-emerald-100 font-medium">Capacité Totale</p>
            <p className="text-xl font-extrabold mt-0.5">{stats.totalCapacite} <span className="text-xs font-normal">places</span></p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs text-emerald-100 font-medium">Classes Attribuées</p>
            <p className="text-xl font-extrabold mt-0.5">{stats.assignedRooms}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs text-emerald-100 font-medium">Salles Disponibles</p>
            <p className="text-xl font-extrabold mt-0.5 text-emerald-200">{stats.availableRooms}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3">
            <p className="text-xs text-emerald-100 font-medium">Événements Prévus</p>
            <p className="text-xl font-extrabold mt-0.5 text-amber-200">{stats.upcomingEvents}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveTab('batiments')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeTab === 'batiments'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Building2 size={16} />
            <span>Architecture & Bâtiments ({batiments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('salles')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeTab === 'salles'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <DoorOpen size={16} />
            <span>Inventaire des Salles ({salles.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('attribution')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeTab === 'attribution'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <GraduationCap size={16} />
            <span>Attribution aux Classes ({classes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('evenements')}
            className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 transition-all whitespace-nowrap ${
              activeTab === 'evenements'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Calendar size={16} />
            <span>Réservations & Événements ({evenements.length})</span>
          </button>
        </div>

        {/* Global Search */}
        <div className="relative min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher salle, bâtiment, classe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* TAB 1: BÂTIMENTS & ARCHITECTURE */}
      {activeTab === 'batiments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batiments.map((bat) => {
              const buildingRooms = salles.filter(s => s.batiment_id === bat.id);
              const totalCap = buildingRooms.reduce((sum, r) => sum + (r.capacite || 0), 0);

              return (
                <div 
                  key={bat.id}
                  className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  {/* Header Color Accent */}
                  <div 
                    className="p-5 text-white flex items-start justify-between"
                    style={{ backgroundColor: bat.couleur || '#10b981' }}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-black/20 backdrop-blur-md rounded text-[11px] font-bold tracking-wider uppercase">
                          {bat.code || 'BÂTIMENT'}
                        </span>
                        <span className="text-xs text-white/90 font-medium">
                          {bat.nombre_etages} {bat.nombre_etages > 1 ? 'Étages' : 'Niveau'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold leading-snug drop-shadow-sm">{bat.nom}</h3>
                      {bat.description && (
                        <p className="text-xs text-white/90 line-clamp-2 mt-1 font-normal">
                          {bat.description}
                        </p>
                      )}
                    </div>

                    {canWrite && (
                      <div className="flex items-center gap-1 bg-black/15 backdrop-blur-sm rounded-lg p-1">
                        <button
                          onClick={() => handleOpenBatimentModal(bat)}
                          className="p-1.5 hover:bg-white/20 rounded text-white transition-colors"
                          title="Modifier le bâtiment"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteBatiment(bat)}
                          className="p-1.5 hover:bg-red-500/40 rounded text-white transition-colors"
                          title="Supprimer le bâtiment"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Summary Bar */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600 font-semibold">
                    <span>{buildingRooms.length} Salles configurées</span>
                    <span>Capacité totale : {totalCap} places</span>
                  </div>

                  {/* Rooms list inside building */}
                  <div className="p-5 flex-1 space-y-3">
                    {buildingRooms.length === 0 ? (
                      <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        <DoorOpen size={28} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-xs text-slate-400">Aucune salle rattachée</p>
                        {canWrite && (
                          <button
                            onClick={() => handleOpenSalleModal(undefined, bat.id)}
                            className="mt-3 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                          >
                            <Plus size={13} />
                            <span>Ajouter une salle</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                        {buildingRooms.map((room) => {
                          const typeInfo = ROOM_TYPES.find(t => t.id === room.type_salle) || ROOM_TYPES[0];
                          const IconComp = typeInfo.icon;

                          return (
                            <div 
                              key={room.id}
                              className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 transition-all flex items-center justify-between gap-3 group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                                  <IconComp size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-slate-800 truncate">{room.nom}</p>
                                    {room.code && (
                                      <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                        {room.code}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    <span>{room.capacite} places</span>
                                    <span>•</span>
                                    <span className="truncate">{room.etage}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {room.classe_attribuee_nom ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md">
                                    {room.classe_attribuee_nom}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[11px] font-medium rounded-md">
                                    Libre
                                  </span>
                                )}

                                {canWrite && (
                                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                                    <button
                                      onClick={() => handleOpenSalleModal(room)}
                                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                      title="Modifier salle"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  {canWrite && (
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenSalleModal(undefined, bat.id)}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                      >
                        <Plus size={14} />
                        <span>Ajouter une salle à ce bâtiment</span>
                      </button>

                      <button
                        onClick={() => handleOpenEventModal(undefined, buildingRooms[0]?.id)}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                      >
                        <Calendar size={13} />
                        <span>Réserver</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add Building CTA Card */}
            {canWrite && (
              <div
                onClick={() => handleOpenBatimentModal()}
                className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-500 p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-emerald-50/20 group min-h-[300px]"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 group-hover:text-emerald-700">
                  Créer un Nouveau Bâtiment
                </h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Définissez un bloc pédagogique, scientifique, administratif ou annexe pour regrouper vos salles.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INVENTAIRE COMPLET DES SALLES */}
      {activeTab === 'salles' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <Filter size={15} />
                <span>Filtrer par :</span>
              </div>

              {/* Filter: Building */}
              <select
                value={selectedBatimentFilter}
                onChange={(e) => setSelectedBatimentFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tous les Bâtiments</option>
                {batiments.map(b => (
                  <option key={b.id} value={b.id}>{b.nom}</option>
                ))}
                <option value="none">Sans bâtiment assigné</option>
              </select>

              {/* Filter: Room Type */}
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tous les Types d'espace</option>
                {ROOM_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              <span>{filteredSalles.length} salles trouvées</span>
            </div>
          </div>

          {/* Salles Table / Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4">Salle & Code</th>
                    <th className="px-6 py-4">Bâtiment & Étage</th>
                    <th className="px-6 py-4">Type d'espace</th>
                    <th className="px-6 py-4 text-center">Capacité</th>
                    <th className="px-6 py-4">Classe Attribuée</th>
                    <th className="px-6 py-4">Équipements</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredSalles.map((salle) => {
                    const typeObj = ROOM_TYPES.find(t => t.id === salle.type_salle) || ROOM_TYPES[0];
                    let eqList: string[] = [];
                    try {
                      eqList = typeof salle.equipements === 'string' ? JSON.parse(salle.equipements) : (salle.equipements || []);
                    } catch (e) {
                      eqList = [];
                    }

                    return (
                      <tr key={salle.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm">
                              <DoorOpen size={18} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{salle.nom}</p>
                              {salle.code && (
                                <p className="text-xs text-slate-400 font-mono">{salle.code}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {salle.batiment_nom ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full" 
                                  style={{ backgroundColor: salle.batiment_couleur || '#10b981' }}
                                />
                                <span className="font-bold text-slate-800">{salle.batiment_nom}</span>
                              </div>
                              <p className="text-xs text-slate-400 pl-4">{salle.etage || 'Rez-de-chaussée'}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Non rattaché</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${typeObj.color}`}>
                            {typeObj.label}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-slate-800 px-3 py-1 bg-slate-100 rounded-lg text-xs">
                            {salle.capacite} places
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {salle.classe_attribuee_nom ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg font-bold text-xs border border-emerald-200">
                                <GraduationCap size={13} />
                                {salle.classe_attribuee_nom}
                              </span>
                              {salle.classe_effectif !== undefined && (
                                <p className="text-[11px] text-slate-400 pl-1">
                                  Effectif: {salle.classe_effectif} él.
                                  {salle.classe_effectif > salle.capacite && (
                                    <span className="text-red-500 font-bold ml-1">(Dépassement !)</span>
                                  )}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                              Aucune classe
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {eqList.slice(0, 3).map((eq, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                                {eq}
                              </span>
                            ))}
                            {eqList.length > 3 && (
                              <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">
                                +{eqList.length - 3}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEventModal(undefined, salle.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Réserver pour une réunion ou événement"
                            >
                              <Calendar size={15} />
                            </button>

                            {canWrite && (
                              <>
                                <button
                                  onClick={() => handleOpenSalleModal(salle)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Modifier la salle"
                                >
                                  <Edit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteSalle(salle)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Supprimer la salle"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredSalles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <DoorOpen size={36} className="mx-auto text-slate-200 mb-2" />
                        <p>Aucune salle ne correspond à votre recherche.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ATTRIBUTION AUX CLASSES */}
      {activeTab === 'attribution' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Affectation des Salles de Classe</h2>
                <p className="text-xs text-slate-500">
                  Attribuez une salle fixe à chaque classe. Le système vérifie la capacité d'accueil par rapport à l'effectif réel des élèves.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classe) => {
                const assignedRoom = salles.find(s => s.id === classe.salle_id);
                const isOverCapacity = assignedRoom && (classe.nombre_eleves || 0) > (assignedRoom.capacite || 0);

                return (
                  <div 
                    key={classe.id}
                    className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 transition-all shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg">
                          {classe.niveau}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <Users size={14} className="text-slate-400" />
                          <span>{classe.nombre_eleves || 0} Élèves</span>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 mb-3">{classe.nom}</h3>

                      {assignedRoom ? (
                        <div className={`p-3 rounded-xl border space-y-1.5 ${
                          isOverCapacity ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm flex items-center gap-1.5">
                              <DoorOpen size={16} className="text-emerald-600" />
                              {assignedRoom.nom}
                            </span>
                            <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded border border-slate-200">
                              {assignedRoom.capacite} places
                            </span>
                          </div>

                          <p className="text-xs text-slate-500">
                            {assignedRoom.batiment_nom || 'Bâtiment standard'} • {assignedRoom.etage || 'RDC'}
                          </p>

                          {isOverCapacity && (
                            <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-bold mt-1">
                              <AlertTriangle size={13} className="shrink-0" />
                              <span>Attention : Effectif ({classe.nombre_eleves}) supérieur à la capacité ({assignedRoom.capacite})</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-red-50/60 border border-red-200/80 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                          <AlertTriangle size={15} className="shrink-0 text-red-500" />
                          <span>Aucune salle attitrée à cette classe</span>
                        </div>
                      )}
                    </div>

                    {canWrite && (
                      <button
                        onClick={() => handleOpenAssignModal(classe)}
                        className="mt-4 w-full py-2 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded-xl text-xs font-bold border border-slate-200 hover:border-emerald-300 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Edit2 size={13} />
                        <span>{assignedRoom ? 'Changer la salle' : 'Attribuer une salle'}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: RÉSERVATIONS & ÉVÉNEMENTS */}
      {activeTab === 'evenements' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Réservation de Salles pour Événements</h2>
                <p className="text-xs text-slate-500">
                  Planifiez des réunions de parents, conseils de classe, examens blancs ou conférences avec détection automatique des conflits.
                </p>
              </div>

              {canWrite && (
                <button
                  onClick={() => handleOpenEventModal()}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md flex items-center gap-2 transition-all shrink-0"
                >
                  <Plus size={16} />
                  <span>Programmer un Événement</span>
                </button>
              )}
            </div>

            {/* Events List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {evenements.map((evt) => {
                const typeObj = EVENT_TYPES.find(t => t.id === evt.type_evenement) || EVENT_TYPES[0];
                const isPast = evt.date_evenement < new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={evt.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      isPast ? 'bg-slate-50/80 border-slate-200 opacity-75' : 'bg-white border-slate-200 shadow-sm hover:border-emerald-400'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${typeObj.color}`}>
                          {typeObj.label}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          evt.statut === 'confirme' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {evt.statut === 'confirme' ? 'Confirmé' : evt.statut}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-snug">{evt.titre}</h3>

                      <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                          <DoorOpen size={15} className="text-emerald-600" />
                          <span>{evt.salle_nom || 'Salle'}</span>
                          {evt.batiment_nom && <span className="text-slate-400 font-normal">({evt.batiment_nom})</span>}
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span>{new Date(evt.date_evenement).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-slate-400" />
                          <span>{evt.heure_debut} - {evt.heure_fin}</span>
                        </div>

                        {evt.responsable && (
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                            <Users size={14} className="text-slate-400" />
                            <span>Resp. : <strong className="text-slate-800">{evt.responsable}</strong></span>
                          </div>
                        )}
                      </div>

                      {evt.description && (
                        <p className="text-xs text-slate-500 italic">
                          "{evt.description}"
                        </p>
                      )}
                    </div>

                    {canWrite && (
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleOpenEventModal(evt)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Edit2 size={13} />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(evt)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={13} />
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {evenements.length === 0 && (
                <div className="col-span-full py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar size={40} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-500">Aucun événement ou réunion programmé</p>
                  <p className="text-xs text-slate-400 mt-1">Réservez une salle pour vos assemblées, examens ou conseils de classe.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 1: BÂTIMENT */}
      {/* ==================================================== */}
      {showBatimentModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Building2 className="text-emerald-600" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingBatiment ? 'Modifier le Bâtiment' : 'Nouveau Bâtiment'}
                </h2>
              </div>
              <button 
                onClick={() => setShowBatimentModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBatiment} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nom du Bâtiment *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Bâtiment A - Principal, Bloc Scientifique..."
                  value={batimentForm.nom}
                  onChange={(e) => setBatimentForm({ ...batimentForm, nom: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Code / Réf.</label>
                  <input
                    type="text"
                    placeholder="Ex: BAT-A"
                    value={batimentForm.code}
                    onChange={(e) => setBatimentForm({ ...batimentForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nombre d'Étages</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={batimentForm.nombre_etages}
                    onChange={(e) => setBatimentForm({ ...batimentForm, nombre_etages: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Couleur d'identification</label>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      type="button"
                      key={c.hex}
                      onClick={() => setBatimentForm({ ...batimentForm, couleur: c.hex })}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                        batimentForm.couleur === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-emerald-500' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    >
                      {batimentForm.couleur === c.hex && <Check size={12} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description / Affectation</label>
                <textarea
                  rows={3}
                  placeholder="Ex: Salles de classe pour le cycle primaire et salle des professeurs..."
                  value={batimentForm.description}
                  onChange={(e) => setBatimentForm({ ...batimentForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowBatimentModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20"
                >
                  {editingBatiment ? 'Enregistrer' : 'Créer le Bâtiment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: SALLE DE CLASSE */}
      {/* ==================================================== */}
      {showSalleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <DoorOpen className="text-emerald-600" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingSalle ? 'Modifier la Salle' : 'Nouvelle Salle de Classe'}
                </h2>
              </div>
              <button 
                onClick={() => setShowSalleModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSalle} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nom de la Salle *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Salle 101, Labo SVT..."
                    value={salleForm.nom}
                    onChange={(e) => setSalleForm({ ...salleForm, nom: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Code / Réf.</label>
                  <input
                    type="text"
                    placeholder="Ex: S-101"
                    value={salleForm.code}
                    onChange={(e) => setSalleForm({ ...salleForm, code: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Bâtiment de rattachement</label>
                  <select
                    value={salleForm.batiment_id}
                    onChange={(e) => setSalleForm({ ...salleForm, batiment_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Aucun bâtiment (Indépendant)</option>
                    {batiments.map(b => (
                      <option key={b.id} value={b.id}>{b.nom} {b.code ? `(${b.code})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Étage / Emplacement</label>
                  <select
                    value={salleForm.etage}
                    onChange={(e) => setSalleForm({ ...salleForm, etage: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Rez-de-chaussée">Rez-de-chaussée</option>
                    <option value="1er étage">1er étage</option>
                    <option value="2ème étage">2ème étage</option>
                    <option value="3ème étage">3ème étage</option>
                    <option value="Sous-sol">Sous-sol</option>
                    <option value="Annexe extérieure">Annexe extérieure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Capacité (Places assises) *</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    required
                    value={salleForm.capacite}
                    onChange={(e) => setSalleForm({ ...salleForm, capacite: parseInt(e.target.value, 10) || 30 })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Type d'espace</label>
                  <select
                    value={salleForm.type_salle}
                    onChange={(e) => setSalleForm({ ...salleForm, type_salle: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {ROOM_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Equipments Chips */}
              <div className="space-y-2 pt-2 border-t">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Équipements disponibles dans cette salle</span>
                  <span className="text-slate-400 font-normal text-[11px]">{(salleForm.equipements || []).length} sélectionnés</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_EQUIPMENTS.map((eq) => {
                    const active = (salleForm.equipements || []).includes(eq);
                    return (
                      <button
                        type="button"
                        key={eq}
                        onClick={() => toggleEquipment(eq)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                          active
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {active && <Check size={12} />}
                        <span>{eq}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add custom equipment */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Autre équipement personnalisé..."
                    value={salleForm.customEquipmentInput}
                    onChange={(e) => setSalleForm({ ...salleForm, customEquipmentInput: e.target.value })}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEquipment(); } }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomEquipment}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    Ajouter
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700">Notes & Particularités</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Clé disponible auprès du gardien, projecteur télécommandé..."
                  value={salleForm.description}
                  onChange={(e) => setSalleForm({ ...salleForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowSalleModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20"
                >
                  {editingSalle ? 'Enregistrer' : 'Créer la Salle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 3: ATTRIBUTION RAPIDE DE SALLE À UNE CLASSE */}
      {/* ==================================================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <GraduationCap className="text-emerald-600" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  Attribuer une Salle : {assignForm.classe_nom}
                </h2>
              </div>
              <button 
                onClick={() => setShowAssignModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Sélectionner la salle de cours</label>
                <select
                  value={assignForm.salle_id}
                  onChange={(e) => setAssignForm({ ...assignForm, salle_id: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Aucune salle (Libérer) --</option>
                  {batiments.map(b => {
                    const bSalles = salles.filter(s => s.batiment_id === b.id);
                    if (bSalles.length === 0) return null;

                    return (
                      <optgroup key={b.id} label={b.nom}>
                        {bSalles.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nom} ({s.capacite} places) {s.classe_attribuee_nom && s.classe_attribuee_nom !== assignForm.classe_nom ? `- Occupée par ${s.classe_attribuee_nom}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {salles.filter(s => !s.batiment_id).length > 0 && (
                    <optgroup label="Salles sans bâtiment">
                      {salles.filter(s => !s.batiment_id).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.nom} ({s.capacite} places)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20"
                >
                  Confirmer l'attribution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 4: ÉVÉNEMENT / RÉSERVATION DE SALLE */}
      {/* ==================================================== */}
      {showEventModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar className="text-emerald-600" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  {editingEvent ? 'Modifier la Réservation' : 'Réserver une Salle pour un Événement'}
                </h2>
              </div>
              <button 
                onClick={() => setShowEventModal(false)} 
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveEvent(e, false)} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Titre de l'événement / Réunion *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Conseil de classe 3ème A, Réunion Parents-Profs, Examen Blanc..."
                  value={eventForm.titre}
                  onChange={(e) => setEventForm({ ...eventForm, titre: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Type d'événement</label>
                  <select
                    value={eventForm.type_evenement}
                    onChange={(e) => setEventForm({ ...eventForm, type_evenement: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {EVENT_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Salle réservée *</label>
                  <select
                    required
                    value={eventForm.salle_id}
                    onChange={(e) => setEventForm({ ...eventForm, salle_id: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Sélectionner une salle</option>
                    {salles.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nom} ({s.capacite} places) {s.batiment_nom ? `- ${s.batiment_nom}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Date *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date_evenement}
                    onChange={(e) => setEventForm({ ...eventForm, date_evenement: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Heure Début *</label>
                  <input
                    type="time"
                    required
                    value={eventForm.heure_debut}
                    onChange={(e) => setEventForm({ ...eventForm, heure_debut: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Heure Fin *</label>
                  <input
                    type="time"
                    required
                    value={eventForm.heure_fin}
                    onChange={(e) => setEventForm({ ...eventForm, heure_fin: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Responsable / Organisateur</label>
                <input
                  type="text"
                  placeholder="Ex: Censeur, Professeur Principal, Direction..."
                  value={eventForm.responsable}
                  onChange={(e) => setEventForm({ ...eventForm, responsable: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ordre du jour / Description</label>
                <textarea
                  rows={2}
                  placeholder="Détails de la réunion, matériel requis..."
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20"
                >
                  {editingEvent ? 'Mettre à jour' : 'Enregistrer la Réservation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
