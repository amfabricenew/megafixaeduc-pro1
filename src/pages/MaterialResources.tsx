import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../utils/api';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Archive, 
  RotateCcw, 
  ArrowRightLeft, 
  DoorOpen, 
  Warehouse, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Filter, 
  Printer, 
  Download, 
  SlidersHorizontal, 
  Check, 
  Monitor, 
  Trophy, 
  Tv, 
  Armchair, 
  Sparkles,
  Info,
  Calendar,
  DollarSign,
  Layers,
  FileSpreadsheet,
  AlertOctagon,
  Building2,
  RefreshCw,
  Eye,
  Box,
  Boxes
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  RessourceMaterielle, 
  CategorieMateriel, 
  TypeTableau, 
  EmplacementType, 
  EtatMateriel, 
  UniteMesureMateriel,
  Salle 
} from '../types';
import jsPDF from '@/src/utils/compressedPdf';
import autoTable from 'jspdf-autotable';
import logo from '../LOGO_MEGFIXAEDEUC_PRO.png';

// Configuration visuelle des catégories
export const CATEGORY_CONFIG: Record<CategorieMateriel, { label: string; icon: any; color: string; bgBadge: string }> = {
  table_banc: { label: 'Tables-bancs', icon: Armchair, color: 'text-amber-700', bgBadge: 'bg-amber-100 text-amber-800 border-amber-200' },
  bureau_chaise: { label: 'Table & Chaises Bureau', icon: Armchair, color: 'text-blue-700', bgBadge: 'bg-blue-100 text-blue-800 border-blue-200' },
  tableau: { label: 'Tableaux Scolaires', icon: Tv, color: 'text-emerald-700', bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  informatique: { label: 'Salle Informatique', icon: Monitor, color: 'text-purple-700', bgBadge: 'bg-purple-100 text-purple-800 border-purple-200' },
  sport: { label: 'Équipements de Sport', icon: Trophy, color: 'text-orange-700', bgBadge: 'bg-orange-100 text-orange-800 border-orange-200' },
  projecteur_audio: { label: 'Projecteurs & Multimédia', icon: Tv, color: 'text-rose-700', bgBadge: 'bg-rose-100 text-rose-800 border-rose-200' },
  autre: { label: 'Autre Matériel', icon: Package, color: 'text-slate-700', bgBadge: 'bg-slate-100 text-slate-800 border-slate-200' },
};

// Types de tableaux demandés explicitement par l'utilisateur
export const TABLEAU_TYPES: Record<TypeTableau, { label: string; desc: string; badge: string }> = {
  craie: { label: 'Mural à craie', desc: 'Tableau noir/vert pour écriture à la craie', badge: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  marqueur: { label: 'À marqueur (blanc)', desc: 'Tableau blanc magnétique effaçable à sec', badge: 'bg-sky-50 text-sky-700 border-sky-300' },
  numerique: { label: 'Numérique interactif (TNI)', desc: 'Écran tactile ou vidéoprojecteur interactif', badge: 'bg-purple-50 text-purple-700 border-purple-300' },
};

// Configuration des états
export const ETAT_CONFIG: Record<EtatMateriel, { label: string; badge: string; color: string }> = {
  neuf: { label: 'Neuf', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', color: 'emerald' },
  bon: { label: 'Bon état', badge: 'bg-blue-100 text-blue-800 border-blue-200', color: 'blue' },
  passable: { label: 'Passable', badge: 'bg-amber-100 text-amber-800 border-amber-200', color: 'amber' },
  a_reparer: { label: 'À réparer', badge: 'bg-orange-100 text-orange-800 border-orange-200', color: 'orange' },
  defectueux: { label: 'Défectueux (Hors service)', badge: 'bg-rose-100 text-rose-800 border-rose-200', color: 'rose' },
};

export default function MaterialResources() {
  const { user, years } = useAuth();
  const { confirm } = useConfirm();
  const [selectedYearId, setSelectedYearId] = useState<string | number>('all');

  // États principaux
  const [items, setItems] = useState<RessourceMaterielle[]>([]);
  const [salles, setSalles] = useState<Salle[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  // Filtres
  const [currentTab, setCurrentTab] = useState<'tous' | 'en_salle' | 'en_magasin' | 'defectueux'>('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTableauType, setSelectedTableauType] = useState<string>('all');
  const [selectedEtat, setSelectedEtat] = useState<string>('all');
  const [selectedSalleId, setSelectedSalleId] = useState<string>('all');

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RessourceMaterielle | null>(null);
  const [detailItem, setDetailItem] = useState<RessourceMaterielle | null>(null);

  // Modale Déplacement
  const [transferItem, setTransferItem] = useState<RessourceMaterielle | null>(null);
  const [transferTargetType, setTransferTargetType] = useState<EmplacementType>('salle');
  const [transferSalleId, setTransferSalleId] = useState<number | null>(null);
  const [transferMagasinNom, setTransferMagasinNom] = useState<string>('Magasin Central');
  const [transferDetail, setTransferDetail] = useState<string>('');

  // Modale Archivage Défectueux
  const [archiveItem, setArchiveItem] = useState<RessourceMaterielle | null>(null);
  const [archiveMotif, setArchiveMotif] = useState<string>('');
  const [archiveDate, setArchiveDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [archiveMagasinNom, setArchiveMagasinNom] = useState<string>('Magasin des Rebuts & Réparations');

  // Modale Restauration / Remise en service
  const [restoreItem, setRestoreItem] = useState<RessourceMaterielle | null>(null);
  const [restoreEtat, setRestoreEtat] = useState<EtatMateriel>('bon');
  const [restoreTargetType, setRestoreTargetType] = useState<EmplacementType>('salle');
  const [restoreSalleId, setRestoreSalleId] = useState<number | null>(null);
  const [restoreMagasinNom, setRestoreMagasinNom] = useState<string>('Magasin Central');

  // Formulaire d'ajout / modification
  const [formData, setFormData] = useState({
    nom: '',
    code_inventaire: '',
    categorie: 'table_banc' as CategorieMateriel,
    type_tableau: 'craie' as TypeTableau,
    quantite: 1,
    unite_mesure: 'unite' as UniteMesureMateriel,
    unites_par_paquet: 1,
    emplacement_type: 'salle' as EmplacementType,
    salle_id: '' as string | number,
    salle_nom_libre: '',
    magasin_nom: 'Magasin Central',
    emplacement_detail: '',
    etat: 'bon' as EtatMateriel,
    valeur_unitaire: 0,
    date_acquisition: new Date().toISOString().split('T')[0],
    fournisseur: '',
    responsable: '',
    description: '',
    cycle: 'all' as 'all' | 'primaire' | 'secondaire'
  });

  // Chargement des données
  const fetchData = async () => {
    try {
      setLoading(true);
      const yearParam = selectedYearId !== 'all' ? `&annee_id=${selectedYearId}` : '';
      const statsYearParam = selectedYearId !== 'all' ? `?annee_id=${selectedYearId}` : '';
      
      const [respItems, respSalles, respStats, respInfo] = await Promise.all([
        apiFetch(`/api/ressources-materielles?include_archived=true${yearParam}`),
        apiFetch('/api/salles'),
        apiFetch(`/api/ressources-materielles/stats${statsYearParam}`),
        apiFetch('/api/ecole')
      ]);

      const resItems = await respItems.json();
      const resSalles = await respSalles.json();
      const resStats = await respStats.json();
      const resInfo = await respInfo.json();

      if (Array.isArray(resItems)) setItems(resItems);
      if (Array.isArray(resSalles)) setSalles(resSalles);
      if (resStats && !resStats.error) setStats(resStats);
      if (resInfo && !resInfo.error) setSchoolInfo(resInfo);
    } catch (err: any) {
      console.error("Error fetching material resources:", err);
      toast.error("Impossible de charger les ressources matérielles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYearId]);

  // Filtrage des éléments selon les onglets et critères
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filtre d'onglet
      if (currentTab === 'en_salle') {
        if (item.est_archive_defectueux === 1 || item.emplacement_type !== 'salle') return false;
      } else if (currentTab === 'en_magasin') {
        if (item.est_archive_defectueux === 1 || item.emplacement_type !== 'magasin') return false;
      } else if (currentTab === 'defectueux') {
        if (item.est_archive_defectueux !== 1) return false;
      } else {
        // 'tous' : afficher tout le matériel actif (non archivé défectueux)
        if (item.est_archive_defectueux === 1) return false;
      }

      // Filtre catégorie
      if (selectedCategory !== 'all' && item.categorie !== selectedCategory) return false;

      // Filtre type de tableau
      if (item.categorie === 'tableau' && selectedTableauType !== 'all') {
        if (item.type_tableau !== selectedTableauType) return false;
      }

      // Filtre état
      if (selectedEtat !== 'all' && item.etat !== selectedEtat) return false;

      // Filtre salle
      if (selectedSalleId !== 'all') {
        if (item.emplacement_type !== 'salle' || item.salle_id?.toString() !== selectedSalleId) return false;
      }

      // Filtre recherche textuelle
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = item.nom.toLowerCase().includes(query);
        const matchCode = item.code_inventaire?.toLowerCase().includes(query);
        const matchSalle = item.salle_nom?.toLowerCase().includes(query);
        const matchMag = item.magasin_nom?.toLowerCase().includes(query);
        const matchFourn = item.fournisseur?.toLowerCase().includes(query);
        const matchResp = item.responsable?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchMotif = item.motif_archivage?.toLowerCase().includes(query);
        if (!matchName && !matchCode && !matchSalle && !matchMag && !matchFourn && !matchResp && !matchDesc && !matchMotif) {
          return false;
        }
      }

      return true;
    });
  }, [items, currentTab, selectedCategory, selectedTableauType, selectedEtat, selectedSalleId, searchQuery]);

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      nom: '',
      code_inventaire: '',
      categorie: 'table_banc',
      type_tableau: 'craie',
      quantite: 1,
      unite_mesure: 'unite',
      unites_par_paquet: 1,
      emplacement_type: 'salle',
      salle_id: salles.length > 0 ? salles[0].id : '',
      salle_nom_libre: '',
      magasin_nom: 'Magasin Central',
      emplacement_detail: '',
      etat: 'bon',
      valeur_unitaire: 0,
      date_acquisition: new Date().toISOString().split('T')[0],
      fournisseur: '',
      responsable: '',
      description: '',
      cycle: 'all'
    });
  };

  // Ouvrir formulaire d'ajout
  const handleOpenCreate = () => {
    resetForm();
    setEditingItem(null);
    setIsCreateOpen(true);
  };

  // Ouvrir formulaire d'édition
  const handleOpenEdit = (item: RessourceMaterielle) => {
    setEditingItem(item);
    setFormData({
      nom: item.nom,
      code_inventaire: item.code_inventaire || '',
      categorie: item.categorie,
      type_tableau: item.type_tableau || 'craie',
      quantite: item.quantite || 1,
      unite_mesure: item.unite_mesure || 'unite',
      unites_par_paquet: item.unites_par_paquet || 1,
      emplacement_type: item.emplacement_type,
      salle_id: item.salle_id || (salles[0]?.id || ''),
      salle_nom_libre: item.salle_nom_libre || '',
      magasin_nom: item.magasin_nom || 'Magasin Central',
      emplacement_detail: item.emplacement_detail || '',
      etat: item.etat || 'bon',
      valeur_unitaire: item.valeur_unitaire || 0,
      date_acquisition: item.date_acquisition || new Date().toISOString().split('T')[0],
      fournisseur: item.fournisseur || '',
      responsable: item.responsable || '',
      description: item.description || '',
      cycle: item.cycle || 'all'
    });
    setIsCreateOpen(true);
  };

  // Soumission Ajout / Modification
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom.trim()) {
      toast.error("Veuillez indiquer la désignation du matériel.");
      return;
    }
    if (formData.emplacement_type === 'salle' && !formData.salle_id && !formData.salle_nom_libre.trim()) {
      if (salles.length > 0) {
        formData.salle_id = salles[0].id;
      } else {
        toast.error("Veuillez préciser le nom de la salle ou choisir 'Dans le Magasin'.");
        return;
      }
    }

    try {
      const qte = Math.max(1, parseInt(String(formData.quantite), 10) || 1);
      const uParPqt = formData.unite_mesure === 'paquet' ? Math.max(1, parseInt(String(formData.unites_par_paquet), 10) || 1) : 1;

      const payload = {
        ...formData,
        quantite: qte,
        unite_mesure: formData.unite_mesure,
        unites_par_paquet: uParPqt,
        salle_id: formData.emplacement_type === 'salle' && formData.salle_id ? Number(formData.salle_id) : null,
        salle_nom_libre: formData.emplacement_type === 'salle' && formData.salle_nom_libre ? formData.salle_nom_libre.trim() : null,
        magasin_nom: formData.emplacement_type === 'magasin' ? (formData.magasin_nom || 'Magasin Central') : null,
        type_tableau: formData.categorie === 'tableau' ? formData.type_tableau : null,
        valeur_unitaire: Number(formData.valeur_unitaire) || 0
      };

      if (editingItem) {
        const res = await apiFetch(`/api/ressources-materielles/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Erreur lors de la modification");
        toast.success("Ressource matérielle modifiée avec succès !");
      } else {
        const res = await apiFetch('/api/ressources-materielles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error("Erreur lors de l'ajout");
        toast.success(
          formData.unite_mesure === 'paquet'
            ? `Nouveau matériel ajouté : ${qte} paquet(s) (${(qte * uParPqt).toLocaleString('fr-FR')} unités au total) !`
            : "Nouveau matériel ajouté à l'inventaire !"
        );
      }

      setIsCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      console.error("Error saving material resource:", err);
      toast.error(err.message || "Une erreur est survenue lors de l'enregistrement.");
    }
  };

  // Déplacement / Transfert rapide
  const handleOpenTransfer = (item: RessourceMaterielle) => {
    setTransferItem(item);
    setTransferTargetType(item.emplacement_type === 'salle' ? 'magasin' : 'salle');
    setTransferSalleId(salles[0]?.id || null);
    setTransferMagasinNom(item.magasin_nom || 'Magasin Central');
    setTransferDetail(item.emplacement_detail || '');
  };

  const handleExecuteTransfer = async () => {
    if (!transferItem) return;
    if (transferTargetType === 'salle' && !transferSalleId) {
      toast.error("Veuillez choisir la salle de destination.");
      return;
    }

    try {
      const res = await apiFetch(`/api/ressources-materielles/${transferItem.id}/deplacer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emplacement_type: transferTargetType,
          salle_id: transferTargetType === 'salle' ? transferSalleId : null,
          magasin_nom: transferTargetType === 'magasin' ? transferMagasinNom : null,
          emplacement_detail: transferDetail
        })
      });

      if (!res.ok) throw new Error("Erreur lors du déplacement");

      toast.success("Emplacement du matériel mis à jour avec succès !");
      setTransferItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du déplacement.");
    }
  };

  // Archivage comme matériel défectueux
  const handleOpenArchive = (item: RessourceMaterielle) => {
    setArchiveItem(item);
    setArchiveMotif('');
    setArchiveDate(new Date().toISOString().split('T')[0]);
    setArchiveMagasinNom('Magasin des Rebuts & Réparations');
  };

  const handleExecuteArchive = async () => {
    if (!archiveItem) return;
    if (!archiveMotif.trim()) {
      toast.error("Veuillez préciser la raison / motif de la défectuosité.");
      return;
    }

    try {
      const res = await apiFetch(`/api/ressources-materielles/${archiveItem.id}/archiver-defectueux`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          motif_archivage: archiveMotif,
          date_archivage: archiveDate,
          magasin_nom: archiveMagasinNom
        })
      });

      if (!res.ok) throw new Error("Erreur lors de l'archivage");

      toast.success("Matériel archivé comme défectueux et non fonctionnel.");
      setArchiveItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'archivage.");
    }
  };

  // Remise en service / Restauration après réparation
  const handleOpenRestore = (item: RessourceMaterielle) => {
    setRestoreItem(item);
    setRestoreEtat('bon');
    setRestoreTargetType('salle');
    setRestoreSalleId(salles[0]?.id || null);
    setRestoreMagasinNom('Magasin Central');
  };

  const handleExecuteRestore = async () => {
    if (!restoreItem) return;
    if (restoreTargetType === 'salle' && !restoreSalleId) {
      toast.error("Veuillez sélectionner la salle où réaffecter le matériel.");
      return;
    }

    try {
      const res = await apiFetch(`/api/ressources-materielles/${restoreItem.id}/restaurer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nouvel_etat: restoreEtat,
          emplacement_type: restoreTargetType,
          salle_id: restoreTargetType === 'salle' ? restoreSalleId : null,
          magasin_nom: restoreTargetType === 'magasin' ? restoreMagasinNom : null
        })
      });

      if (!res.ok) throw new Error("Erreur lors de la remise en service");

      toast.success("Matériel réparé, réhabilité et remis en service !");
      setRestoreItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la remise en service.");
    }
  };

  // Suppression définitive
  const handleDelete = async (item: RessourceMaterielle) => {
    const ok = await confirm({
      title: "Supprimer ce matériel de l'inventaire ?",
      message: `Êtes-vous sûr de vouloir supprimer définitivement « ${item.nom} » (Qté : ${item.quantite}) ? Cette action est irréversible.`,
      confirmText: "Supprimer définitivement",
      cancelText: "Annuler",
      type: "danger"
    });

    if (!ok) return;

    try {
      const res = await apiFetch(`/api/ressources-materielles/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Erreur lors de la suppression");
      toast.success("Matériel retiré de l'inventaire.");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression.");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      toast.error("Aucun matériel à exporter dans la vue actuelle.");
      return;
    }

    const headers = [
      "Code Inventaire",
      "Désignation",
      "Catégorie",
      "Type Tableau",
      "Conditionnement",
      "Quantité",
      "Unités par Paquet",
      "Total Unités Physiques",
      "Emplacement",
      "Salle / Magasin",
      "Détail Emplacement",
      "État",
      "Statut Fonctionnel",
      "Motif Défectueux",
      "Date Acquisition",
      "Valeur Unitaire / Paquet (FCFA)",
      "Valeur Totale (FCFA)",
      "Fournisseur",
      "Responsable"
    ];

    const rows = filteredItems.map(item => {
      const catLabel = CATEGORY_CONFIG[item.categorie]?.label || item.categorie;
      const typeTab = item.type_tableau ? TABLEAU_TYPES[item.type_tableau]?.label : '';
      const condLabel = item.unite_mesure === 'paquet' ? 'En Paquet' : 'À l\'Unité';
      const uParPqt = item.unite_mesure === 'paquet' ? (item.unites_par_paquet || 1) : 1;
      const totalUnites = item.quantite * uParPqt;
      const empLabel = item.emplacement_type === 'salle' ? 'En Salle' : 'Au Magasin';
      const locDetail = item.emplacement_type === 'salle' 
        ? `${item.salle_nom || 'Salle non définie'} (${item.batiment_nom || ''})` 
        : (item.magasin_nom || 'Magasin Central');
      const statutFonc = item.est_archive_defectueux === 1 ? 'DÉFECTUEUX / ARCHIVÉ' : 'FONCTIONNEL / ACTIF';
      const totalVal = (item.quantite || 1) * (item.valeur_unitaire || 0);

      return [
        `"${item.code_inventaire || ''}"`,
        `"${item.nom.replace(/"/g, '""')}"`,
        `"${catLabel}"`,
        `"${typeTab}"`,
        `"${condLabel}"`,
        item.quantite,
        uParPqt,
        totalUnites,
        `"${empLabel}"`,
        `"${locDetail.replace(/"/g, '""')}"`,
        `"${(item.emplacement_detail || '').replace(/"/g, '""')}"`,
        `"${ETAT_CONFIG[item.etat]?.label || item.etat}"`,
        `"${statutFonc}"`,
        `"${(item.motif_archivage || '').replace(/"/g, '""')}"`,
        `"${item.date_acquisition || ''}"`,
        item.valeur_unitaire || 0,
        totalVal,
        `"${(item.fournisseur || '').replace(/"/g, '""')}"`,
        `"${(item.responsable || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Inventaire_Materiel_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fichier CSV de l'inventaire exporté avec succès !");
  };

  // Export PDF / Impression Officielle
  const handlePrintPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();

      // En-tête officiel
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      const schoolName = schoolInfo?.nom_ecole || "MÉGAFIXAEDUC PRO";
      doc.text(schoolName.toUpperCase(), pageWidth / 2, 16, { align: 'center' });

      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.text("INVENTAIRE OFFICIEL DES RESSOURCES MATÉRIELLES & MOBILIER SCOLAIRE", pageWidth / 2, 23, { align: 'center' });

      const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      doc.setFontSize(9);
      doc.text(`Document généré le : ${dateStr}  |  Total matériels répertoriés : ${filteredItems.length}`, pageWidth / 2, 29, { align: 'center' });

      // Ligne séparatrice
      doc.setDrawColor(203, 213, 225);
      doc.line(14, 32, pageWidth - 14, 32);

      // Tableau des matériels
      const tableData = filteredItems.map((item, idx) => {
        const cat = CATEGORY_CONFIG[item.categorie]?.label || item.categorie;
        const sub = item.type_tableau ? ` (${TABLEAU_TYPES[item.type_tableau]?.label})` : '';
        const loc = item.emplacement_type === 'salle' 
          ? `Salle : ${item.salle_nom || 'Non spécifiée'}` 
          : `Magasin : ${item.magasin_nom || 'Magasin Central'}`;
        const detail = item.emplacement_detail ? ` [${item.emplacement_detail}]` : '';
        const statut = item.est_archive_defectueux === 1 
          ? `DÉFECTUEUX / ARCHIVÉ\nMotif: ${item.motif_archivage || 'Hors service'}` 
          : `${ETAT_CONFIG[item.etat]?.label || item.etat}`;
        const valTot = ((item.quantite || 1) * (item.valeur_unitaire || 0)).toLocaleString('fr-FR') + ' F';

        const qteStr = item.unite_mesure === 'paquet' 
          ? `${item.quantite} pqt (${item.quantite * (item.unites_par_paquet || 1)} u)` 
          : `${item.quantite} u`;

        return [
          idx + 1,
          item.code_inventaire || '-',
          item.nom,
          `${cat}${sub}`,
          qteStr,
          `${loc}${detail}`,
          statut,
          valTot
        ];
      });

      autoTable(doc, {
        startY: 36,
        head: [['N°', 'Code', 'Désignation du Matériel', 'Catégorie & Type', 'Qté', 'Emplacement (Salle / Magasin)', 'État / Statut', 'Valeur Estimée']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Pied de page
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 10);
        }
      });

      // Signatures au bas
      const finalY = (doc as any).lastAutoTable.finalY + 12;
      if (finalY + 30 < doc.internal.pageSize.getHeight()) {
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.text("L'Intendant / Responsable Matériel", 30, finalY);
        doc.text("Le Chef d'Établissement / Direction", pageWidth - 80, finalY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text("(Signature & Cachet)", 30, finalY + 6);
        doc.text("(Signature & Cachet)", pageWidth - 80, finalY + 6);
      }

      doc.save(`Inventaire_Mobilier_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success("Document PDF d'inventaire généré avec succès !");
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      toast.error("Erreur lors de la génération du document PDF.");
    }
  };

  return (
    <div id="material-resources-page" className="space-y-6 pb-16">
      {/* En-tête principal */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestion des Ressources Matérielles</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Inventaire & Mobilier
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 max-w-3xl">
                Suivi complet du mobilier scolaire, tables-bancs, bureaux, tableaux (craie, marqueur ou numérique), équipements informatiques, sport et projecteurs. Précision de l'affectation en salle ou au magasin et archivage du matériel défectueux.
              </p>
            </div>
          </div>

          {/* Actions globales */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              id="btn-refresh-inventory"
              onClick={fetchData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              title="Actualiser la liste"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
              <Filter size={14} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Année :</span>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
              >
                <option value="all">Toutes les années</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
            <button
              id="btn-export-csv"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Exporter CSV</span>
            </button>
            <button
              id="btn-print-pdf"
              onClick={handlePrintPDF}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm flex items-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Imprimer Inventaire</span>
            </button>
            <button
              id="btn-add-material"
              onClick={handleOpenCreate}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Matériel</span>
            </button>
          </div>
        </div>

        {/* Indicateurs statistiques en temps réel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Total Équipements</span>
              <Package className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{stats?.summary?.total_quantite || items.reduce((acc, i) => acc + (i.quantite || 1), 0)}</span>
              <span className="text-xs text-slate-500 font-medium">unités ({stats?.summary?.total_articles || items.length} articles)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Équipant une Salle</span>
              <DoorOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">
                {stats?.summary?.quantite_en_salle ?? items.filter(i => i.emplacement_type === 'salle' && i.est_archive_defectueux === 0).reduce((acc, i) => acc + i.quantite, 0)}
              </span>
              <span className="text-xs text-emerald-700 font-medium">en service actif</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/70">
            <div className="flex items-center justify-between text-blue-700 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Dans le Magasin</span>
              <Warehouse className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900">
                {stats?.summary?.quantite_en_magasin ?? items.filter(i => i.emplacement_type === 'magasin' && i.est_archive_defectueux === 0).reduce((acc, i) => acc + i.quantite, 0)}
              </span>
              <span className="text-xs text-blue-700 font-medium">en stock réserve</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/70">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider">Défectueux & Archivés</span>
              <AlertOctagon className="w-4 h-4 text-rose-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-900">
                {stats?.summary?.quantite_defectueux_archive ?? items.filter(i => i.est_archive_defectueux === 1).reduce((acc, i) => acc + i.quantite, 0)}
              </span>
              <span className="text-xs text-rose-700 font-medium">hors service / rebuts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barre d'onglets de navigation rapide */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="tab-all-active"
          onClick={() => setCurrentTab('tous')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            currentTab === 'tous'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Tout le Matériel Actif</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${currentTab === 'tous' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {items.filter(i => i.est_archive_defectueux === 0).length}
          </span>
        </button>

        <button
          id="tab-in-rooms"
          onClick={() => setCurrentTab('en_salle')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            currentTab === 'en_salle'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <DoorOpen className="w-4 h-4" />
          <span>Équipant une Salle</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${currentTab === 'en_salle' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {items.filter(i => i.emplacement_type === 'salle' && i.est_archive_defectueux === 0).length}
          </span>
        </button>

        <button
          id="tab-in-warehouse"
          onClick={() => setCurrentTab('en_magasin')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            currentTab === 'en_magasin'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Au Magasin (Stock Réserve)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${currentTab === 'en_magasin' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
            {items.filter(i => i.emplacement_type === 'magasin' && i.est_archive_defectueux === 0).length}
          </span>
        </button>

        <button
          id="tab-defective-archive"
          onClick={() => setCurrentTab('defectueux')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ml-auto ${
            currentTab === 'defectueux'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Défectueux & Non Fonctionnels (Archivés)</span>
          <span className={`px-2 py-0.5 rounded-full text-xs ${currentTab === 'defectueux' ? 'bg-rose-700 text-white' : 'bg-rose-200 text-rose-800'}`}>
            {items.filter(i => i.est_archive_defectueux === 1).length}
          </span>
        </button>
      </div>

      {/* Barre de Filtres Multi-critères */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Recherche */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-material"
              type="text"
              placeholder="Rechercher par nom, code inventaire, salle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filtre Catégorie */}
          <div>
            <select
              id="select-filter-category"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                if (e.target.value !== 'tableau') setSelectedTableauType('all');
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">Toutes les catégories</option>
              <option value="table_banc">Tables-bancs</option>
              <option value="bureau_chaise">Table et chaises bureau</option>
              <option value="tableau">Tableaux scolaires</option>
              <option value="informatique">Salle informatique</option>
              <option value="sport">Équipements de sport</option>
              <option value="projecteur_audio">Projecteurs & Multimédia</option>
              <option value="autre">Autres matériels</option>
            </select>
          </div>

          {/* Filtre Type Tableau (actif seulement si catégorie = tableau) */}
          <div>
            <select
              id="select-filter-tableau-type"
              value={selectedTableauType}
              onChange={(e) => setSelectedTableauType(e.target.value)}
              disabled={selectedCategory !== 'tableau'}
              className={`w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white ${
                selectedCategory !== 'tableau' ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''
              }`}
            >
              <option value="all">Tous types de tableaux</option>
              <option value="craie">Mural à craie</option>
              <option value="marqueur">À marqueur (blanc)</option>
              <option value="numerique">Numérique interactif (TNI)</option>
            </select>
          </div>

          {/* Filtre Salle spécifique */}
          <div>
            <select
              id="select-filter-salle"
              value={selectedSalleId}
              onChange={(e) => setSelectedSalleId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              <option value="all">Toutes les salles</option>
              {salles.map(s => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.code || 'Salle'})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtres secondaires (état d'usage) */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-700">Filtrer par état :</span>
            {(['all', 'neuf', 'bon', 'passable', 'a_reparer', 'defectueux'] as const).map(et => (
              <button
                key={et}
                onClick={() => setSelectedEtat(et)}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  selectedEtat === et 
                    ? 'bg-slate-900 text-white font-medium' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {et === 'all' ? 'Tous les états' : ETAT_CONFIG[et]?.label}
              </button>
            ))}
          </div>

          <div>
            <span className="font-semibold text-slate-800">{filteredItems.length}</span> matériel(s) trouvé(s)
          </div>
        </div>
      </div>

      {/* Liste des matériels (Tableau interactif) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500 font-medium">Chargement des ressources matérielles...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <Package className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Aucun matériel trouvé</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Aucun équipement ne correspond aux critères de recherche actuels. Modifiez vos filtres ou ajoutez un nouveau matériel.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium inline-flex items-center gap-2 hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un équipement</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Code & Désignation</th>
                  <th className="py-3.5 px-4">Catégorie & Type</th>
                  <th className="py-3.5 px-4 text-center">Quantité</th>
                  <th className="py-3.5 px-4">Emplacement (Salle / Magasin)</th>
                  <th className="py-3.5 px-4">État & Statut</th>
                  <th className="py-3.5 px-4">Valeur Estimée</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {filteredItems.map((item) => {
                  const catConfig = CATEGORY_CONFIG[item.categorie] || CATEGORY_CONFIG.autre;
                  const CatIcon = catConfig.icon;
                  const isDefectueux = item.est_archive_defectueux === 1;

                  return (
                    <tr 
                      key={item.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isDefectueux ? 'bg-rose-50/30' : ''
                      }`}
                    >
                      {/* Désignation & Code */}
                      <td className="py-4 px-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isDefectueux 
                              ? 'bg-rose-100 text-rose-700 border-rose-200' 
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{item.nom}</span>
                              {item.code_inventaire && (
                                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  {item.code_inventaire}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 max-w-xs">{item.description}</p>
                            )}
                            {isDefectueux && item.motif_archivage && (
                              <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-md border border-rose-200">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                <span className="line-clamp-1">Motif : {item.motif_archivage}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Catégorie & Type */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${catConfig.bgBadge}`}>
                            {catConfig.label}
                          </span>
                          {item.categorie === 'tableau' && item.type_tableau && (
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${TABLEAU_TYPES[item.type_tableau]?.badge}`}>
                                {TABLEAU_TYPES[item.type_tableau]?.label}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Quantité */}
                      <td className="py-4 px-4 text-center">
                        {item.unite_mesure === 'paquet' ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200">
                              <Boxes className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{item.quantite} {item.quantite > 1 ? 'paquets' : 'paquet'}</span>
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium mt-0.5 whitespace-nowrap">
                              {(item.quantite * (item.unites_par_paquet || 1)).toLocaleString('fr-FR')} unités ({item.unites_par_paquet || 1}/pqt)
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            <Box className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{item.quantite} {item.quantite > 1 ? 'unités' : 'unité'}</span>
                          </span>
                        )}
                      </td>

                      {/* Emplacement : Salle ou Magasin */}
                      <td className="py-4 px-4">
                        {item.emplacement_type === 'salle' ? (
                          <div className="flex items-start gap-2">
                            <DoorOpen className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-slate-900">
                                {item.salle_nom || 'Salle de classe'}
                              </span>
                              {item.batiment_nom && (
                                <span className="text-xs text-slate-500 block">
                                  {item.batiment_nom}
                                </span>
                              )}
                              {item.emplacement_detail && (
                                <span className="text-xs text-slate-400 italic block">
                                  ({item.emplacement_detail})
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <Warehouse className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-slate-900">
                                {item.magasin_nom || 'Magasin Central'}
                              </span>
                              <span className="text-xs text-blue-600 font-medium block">
                                En réserve / Stockage
                              </span>
                              {item.emplacement_detail && (
                                <span className="text-xs text-slate-400 italic block">
                                  ({item.emplacement_detail})
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* État & Statut */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          {isDefectueux ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
                              <AlertOctagon className="w-3.5 h-3.5" />
                              <span>Défectueux (Archivé)</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${ETAT_CONFIG[item.etat]?.badge}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              <span>{ETAT_CONFIG[item.etat]?.label || item.etat}</span>
                            </span>
                          )}
                          {item.date_acquisition && (
                            <span className="text-xs text-slate-400 block">
                              Acquis : {item.date_acquisition}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Valeur Estimée */}
                      <td className="py-4 px-4 font-mono text-xs">
                        <div className="text-slate-900 font-semibold">
                          {((item.quantite || 1) * (item.valeur_unitaire || 0)).toLocaleString('fr-FR')} FCFA
                        </div>
                        {item.valeur_unitaire ? (
                          <span className="text-slate-400 block text-[11px]">
                            {item.unite_mesure === 'paquet'
                              ? `${item.valeur_unitaire.toLocaleString('fr-FR')} F / pqt`
                              : `${item.valeur_unitaire.toLocaleString('fr-FR')} F / unité`}
                          </span>
                        ) : null}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Voir détails */}
                          <button
                            onClick={() => setDetailItem(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Consulter la fiche détaillée"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Déplacer vers salle ou magasin */}
                          {!isDefectueux && (
                            <button
                              onClick={() => handleOpenTransfer(item)}
                              className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Déplacer (changer d'emplacement)"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          {/* Archiver comme défectueux */}
                          {!isDefectueux ? (
                            <button
                              onClick={() => handleOpenArchive(item)}
                              className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Archiver comme défectueux et non fonctionnel"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          ) : (
                            /* Restaurer / Remettre en service */
                            <button
                              onClick={() => handleOpenRestore(item)}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Réhabiliter et remettre en service"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}

                          {/* Modifier */}
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Modifier ce matériel"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Supprimer */}
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODALE : CRÉATION / MODIFICATION D'UN MATÉRIEL            */}
      {/* ========================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {editingItem ? "Modifier la Ressource Matérielle" : "Ajouter une Ressource Matérielle"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Renseignez les détails du matériel, son type et son emplacement.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps formulaire */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Désignation & Code */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Désignation du Matériel *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Tables-bancs 2 places, Vidéoprojecteur Epson..."
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Code Inventaire</label>
                  <input
                    type="text"
                    placeholder="Ex: TB-101-01 (ou auto)"
                    value={formData.code_inventaire}
                    onChange={(e) => setFormData({ ...formData, code_inventaire: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Catégorie & Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Catégorie de Ressource *</label>
                <select
                  value={formData.categorie}
                  onChange={(e) => setFormData({ ...formData, categorie: e.target.value as CategorieMateriel })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                >
                  <option value="table_banc">Tables-bancs (Mobilier scolaire)</option>
                  <option value="bureau_chaise">Table et chaises bureau (Enseignant / Direction)</option>
                  <option value="tableau">Tableau (Mural à craie, marqueur ou numérique)</option>
                  <option value="informatique">Équipements salle d'informatique (Postes, onduleurs...)</option>
                  <option value="sport">Équipements de sport (Ballons, chasubles, plots...)</option>
                  <option value="projecteur_audio">Projecteur & Audiovisuel</option>
                  <option value="autre">Autre équipement</option>
                </select>
              </div>

              {/* Quantité & Conditionnement (Unité ou Paquet) */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">Conditionnement & Quantité *</label>
                    <span className="text-[11px] text-slate-500">Choisir si le matériel est compté à l'unité ou en paquets / cartons</span>
                  </div>
                  {/* Badge récapitulatif live */}
                  <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    Total : {formData.unite_mesure === 'paquet' 
                      ? `${(formData.quantite * formData.unites_par_paquet).toLocaleString('fr-FR')} unités (${formData.quantite} paquet${formData.quantite > 1 ? 's' : ''})` 
                      : `${formData.quantite} unité${formData.quantite > 1 ? 's' : ''}`}
                  </span>
                </div>

                {/* Sélecteur Unité vs Paquet */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/60 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unite_mesure: 'unite' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.unite_mesure === 'unite'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Box className="w-4 h-4 text-indigo-600" />
                    <span>À l'Unité (Pièce)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, unite_mesure: 'paquet' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      formData.unite_mesure === 'paquet'
                        ? 'bg-white text-indigo-700 shadow-sm font-bold border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Boxes className="w-4 h-4 text-amber-600" />
                    <span>En Paquet (Carton / Lot)</span>
                  </button>
                </div>

                {/* Champs de saisie selon le conditionnement */}
                {formData.unite_mesure === 'unite' ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-slate-700">Nombre d'unités (pièces individuelles) *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.quantite}
                      onChange={(e) => setFormData({ ...formData, quantite: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium"
                      placeholder="Ex: 25"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                          <Boxes className="w-3.5 h-3.5 text-amber-600" />
                          Nombre de paquets / boîtes *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.quantite}
                          onChange={(e) => setFormData({ ...formData, quantite: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-bold text-slate-900"
                          placeholder="Ex: 5"
                        />
                        <span className="text-[11px] text-amber-700 block">Nombre de contenants ou lots</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-amber-900 flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-amber-600" />
                          Unités par paquet (contenance) *
                        </label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={formData.unites_par_paquet}
                          onChange={(e) => setFormData({ ...formData, unites_par_paquet: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white font-bold text-slate-900"
                          placeholder="Ex: 10, 50, 100..."
                        />
                        <span className="text-[11px] text-amber-700 block">Pièces par boîte (ex: 10 craies/boîte)</span>
                      </div>
                    </div>

                    <div className="text-xs text-amber-900 bg-white/90 p-2.5 rounded-lg border border-amber-200/80 flex items-center justify-between">
                      <span>Équivalence globale :</span>
                      <span className="font-bold text-slate-900">
                        {formData.quantite || 1} paquet(s) de {formData.unites_par_paquet || 1} = <span className="text-indigo-600 font-extrabold">{((formData.quantite || 1) * (formData.unites_par_paquet || 1)).toLocaleString('fr-FR')}</span> unités physiques
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Si la catégorie est TABLEAU : Précision obligatoire du type de tableau */}
              {formData.categorie === 'tableau' && (
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-900 font-semibold text-xs uppercase tracking-wider">
                    <Tv className="w-4 h-4 text-indigo-600" />
                    <span>Type de Tableau Spécifique *</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {(['craie', 'marqueur', 'numerique'] as const).map(typeKey => (
                      <label
                        key={typeKey}
                        className={`flex items-start gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          formData.type_tableau === typeKey
                            ? 'bg-white border-indigo-600 shadow-sm ring-2 ring-indigo-500/20'
                            : 'bg-white/60 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name="type_tableau"
                          checked={formData.type_tableau === typeKey}
                          onChange={() => setFormData({ ...formData, type_tableau: typeKey })}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-bold text-slate-900 block">
                            {TABLEAU_TYPES[typeKey].label}
                          </span>
                          <span className="text-xs text-slate-500 block mt-0.5">
                            {TABLEAU_TYPES[typeKey].desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Emplacement : Équipe une salle OU se trouve dans le magasin */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <label className="text-xs font-semibold text-slate-700 block">
                  Emplacement du matériel (Salle ou Magasin) *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, emplacement_type: 'salle' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      formData.emplacement_type === 'salle'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <DoorOpen className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-left">
                      <span className="text-sm block">Équipe une Salle</span>
                      <span className="text-xs text-slate-500 font-normal">Déployé en classe ou labo</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, emplacement_type: 'magasin' })}
                    className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                      formData.emplacement_type === 'magasin'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Warehouse className="w-5 h-5 text-blue-600 shrink-0" />
                    <div className="text-left">
                      <span className="text-sm block">Dans le Magasin</span>
                      <span className="text-xs text-slate-500 font-normal">En stock / Réserve</span>
                    </div>
                  </button>
                </div>

                {/* Détails de l'emplacement */}
                {formData.emplacement_type === 'salle' ? (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-slate-700">Sélectionner la Salle équipée *</label>
                    {salles.length > 0 ? (
                      <select
                        value={formData.salle_id}
                        onChange={(e) => setFormData({ ...formData, salle_id: e.target.value, salle_nom_libre: '' })}
                        required={!formData.salle_nom_libre}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="">-- Choisir une salle existante --</option>
                        {salles.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nom} ({s.code || 'Salle'}) - {s.batiment_nom || 'Bâtiment'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        placeholder="Ex: Salle 101, Salle d'Informatique, Laboratoire..."
                        value={formData.salle_nom_libre}
                        onChange={(e) => setFormData({ ...formData, salle_nom_libre: e.target.value, salle_id: '' })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-slate-700">Nom du Magasin / Dépôt de Stockage *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Magasin Central, Dépôt EPS, Magasin Informatique..."
                      value={formData.magasin_nom}
                      onChange={(e) => setFormData({ ...formData, magasin_nom: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Précision de l'emplacement (optionnel)</label>
                  <input
                    type="text"
                    placeholder="Ex: Rangées 1 à 4, Mur frontal, Étagère B-3, Armoire blindée..."
                    value={formData.emplacement_detail}
                    onChange={(e) => setFormData({ ...formData, emplacement_detail: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* État & Valeur financière */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">État d'Usage</label>
                  <select
                    value={formData.etat}
                    onChange={(e) => setFormData({ ...formData, etat: e.target.value as EtatMateriel })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="neuf">Neuf</option>
                    <option value="bon">Bon état</option>
                    <option value="passable">Passable</option>
                    <option value="a_reparer">À réparer</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {formData.unite_mesure === 'paquet' ? 'Valeur par Paquet (FCFA)' : 'Valeur Unitaire (FCFA)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.valeur_unitaire}
                    onChange={(e) => setFormData({ ...formData, valeur_unitaire: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {formData.unite_mesure === 'paquet' && formData.valeur_unitaire > 0 && (
                    <span className="text-[11px] text-slate-500 block">
                      ≈ {Math.round(formData.valeur_unitaire / Math.max(1, formData.unites_par_paquet)).toLocaleString('fr-FR')} FCFA / unité
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date d'Acquisition</label>
                  <input
                    type="date"
                    value={formData.date_acquisition}
                    onChange={(e) => setFormData({ ...formData, date_acquisition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Fournisseur & Responsable */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Fournisseur / Fabricant</label>
                  <input
                    type="text"
                    placeholder="Ex: Menuiserie Centrale, TechPro SA..."
                    value={formData.fournisseur}
                    onChange={(e) => setFormData({ ...formData, fournisseur: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-700">Responsable / Affectataire</label>
                  <input
                    type="text"
                    placeholder="Ex: Intendant, Professeur EPS, Enseignant..."
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Description / Remarques</label>
                <textarea
                  rows={2}
                  placeholder="Caractéristiques, dimensions, numéro de série..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Actions modal */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-all"
                >
                  {editingItem ? "Enregistrer les modifications" : "Ajouter le matériel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE : DÉPLACEMENT RAPIDE DE MATÉRIEL                   */}
      {/* ========================================================= */}
      {transferItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Déplacer le matériel</h3>
                  <p className="text-xs text-slate-500">{transferItem.nom}</p>
                </div>
              </div>
              <button onClick={() => setTransferItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-semibold text-slate-700">Emplacement actuel : </span>
              {transferItem.emplacement_type === 'salle' ? (
                <span>En salle : {transferItem.salle_nom || 'Non spécifiée'}</span>
              ) : (
                <span>Au magasin : {transferItem.magasin_nom || 'Magasin Central'}</span>
              )}
            </div>

            {/* Choix destination */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700 block">Nouvel Emplacement :</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTransferTargetType('salle')}
                  className={`p-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 font-medium ${
                    transferTargetType === 'salle' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-500' 
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>Vers une Salle</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTransferTargetType('magasin')}
                  className={`p-2.5 rounded-xl border text-sm flex items-center justify-center gap-2 font-medium ${
                    transferTargetType === 'magasin' 
                      ? 'bg-blue-50 text-blue-700 border-blue-500' 
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <Warehouse className="w-4 h-4" />
                  <span>Vers le Magasin</span>
                </button>
              </div>

              {transferTargetType === 'salle' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Choisir la salle :</label>
                  <select
                    value={transferSalleId || ''}
                    onChange={(e) => setTransferSalleId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {salles.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nom} ({s.code || 'Salle'}) - {s.batiment_nom || 'Bâtiment'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nom du magasin :</label>
                  <input
                    type="text"
                    value={transferMagasinNom}
                    onChange={(e) => setTransferMagasinNom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Précision emplacement (optionnel) :</label>
                <input
                  type="text"
                  placeholder="Ex: Fond de la classe, Casier A..."
                  value={transferDetail}
                  onChange={(e) => setTransferDetail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setTransferItem(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
              >
                Confirmer le déplacement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE : ARCHIVAGE COMME MATÉRIEL DÉFECTUEUX             */}
      {/* ========================================================= */}
      {archiveItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Archiver comme défectueux</h3>
                  <p className="text-xs text-slate-500">Mise hors service & non fonctionnel</p>
                </div>
              </div>
              <button onClick={() => setArchiveItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 space-y-1">
              <p className="font-semibold">Matériel ciblé : {archiveItem.nom} (Qté : {archiveItem.quantite})</p>
              <p>Ce matériel sera retiré des salles actives et classé dans l'espace des matériels défectueux / rebuts.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Motif de la défectuosité / Panne constatée *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Armature métallique fêlée, carte mère brûlée, lampe vidéo HS, usure irréparable..."
                  value={archiveMotif}
                  onChange={(e) => setArchiveMotif(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Date de mise hors service</label>
                  <input
                    type="date"
                    value={archiveDate}
                    onChange={(e) => setArchiveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Dépôt / Magasin rebut</label>
                  <input
                    type="text"
                    value={archiveMagasinNom}
                    onChange={(e) => setArchiveMagasinNom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setArchiveItem(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteArchive}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium shadow-sm"
              >
                Confirmer l'archivage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE : RESTAURATION / REMISE EN SERVICE                */}
      {/* ========================================================= */}
      {restoreItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Remettre en service</h3>
                  <p className="text-xs text-slate-500">{restoreItem.nom}</p>
                </div>
              </div>
              <button onClick={() => setRestoreItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
              Ce matériel a été réparé ou réhabilité. Choisissez son nouvel état et son emplacement de réaffectation.
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Nouvel état après réparation :</label>
                <select
                  value={restoreEtat}
                  onChange={(e) => setRestoreEtat(e.target.value as EtatMateriel)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="bon">Bon état (Fonctionnel)</option>
                  <option value="neuf">Remis à neuf</option>
                  <option value="passable">Passable</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">Affectation :</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreTargetType('salle')}
                    className={`p-2 rounded-xl border text-xs font-semibold ${
                      restoreTargetType === 'salle' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-500' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    En Salle de classe
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreTargetType('magasin')}
                    className={`p-2 rounded-xl border text-xs font-semibold ${
                      restoreTargetType === 'magasin' 
                        ? 'bg-blue-50 text-blue-800 border-blue-500' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Au Magasin (Réserve)
                  </button>
                </div>
              </div>

              {restoreTargetType === 'salle' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Salle de réaffectation :</label>
                  <select
                    value={restoreSalleId || ''}
                    onChange={(e) => setRestoreSalleId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {salles.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nom} ({s.code || 'Salle'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Nom du magasin :</label>
                  <input
                    type="text"
                    value={restoreMagasinNom}
                    onChange={(e) => setRestoreMagasinNom(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreItem(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm"
              >
                Remettre en service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODALE : FICHE DÉTAILLÉE D'UN MATÉRIEL                   */}
      {/* ========================================================= */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{detailItem.nom}</h3>
                  <p className="text-xs font-mono text-slate-500">Code : {detailItem.code_inventaire || 'Non renseigné'}</p>
                </div>
              </div>
              <button onClick={() => setDetailItem(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Catégorie :</span>
                  <span className="font-semibold text-slate-800">{CATEGORY_CONFIG[detailItem.categorie]?.label}</span>
                </div>
                {detailItem.type_tableau && (
                  <div>
                    <span className="text-slate-500 block">Type de Tableau :</span>
                    <span className="font-semibold text-indigo-700">{TABLEAU_TYPES[detailItem.type_tableau]?.label}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 block">Quantité & Conditionnement :</span>
                  <span className="font-semibold text-slate-800">
                    {detailItem.unite_mesure === 'paquet'
                      ? `${detailItem.quantite} paquet(s) (${(detailItem.quantite * (detailItem.unites_par_paquet || 1)).toLocaleString('fr-FR')} unités au total - ${detailItem.unites_par_paquet || 1}/pqt)`
                      : `${detailItem.quantite} unité(s)`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">État actuel :</span>
                  <span className="font-semibold text-slate-800">{ETAT_CONFIG[detailItem.etat]?.label}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 space-y-1">
                <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Emplacement Actuel</span>
                {detailItem.emplacement_type === 'salle' ? (
                  <p className="text-slate-800 font-medium flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4 text-emerald-600" />
                    <span>Salle {detailItem.salle_nom || 'Non spécifiée'} {detailItem.batiment_nom ? `(${detailItem.batiment_nom})` : ''}</span>
                  </p>
                ) : (
                  <p className="text-slate-800 font-medium flex items-center gap-1.5">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    <span>Magasin : {detailItem.magasin_nom || 'Magasin Central'}</span>
                  </p>
                )}
                {detailItem.emplacement_detail && (
                  <p className="text-xs text-slate-500 pl-5">Détail : {detailItem.emplacement_detail}</p>
                )}
              </div>

              {detailItem.est_archive_defectueux === 1 && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <span className="font-bold flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-rose-600" />
                    <span>Matériel Défectueux & Non Fonctionnel (Archivé)</span>
                  </span>
                  <p className="pl-5">Motif : {detailItem.motif_archivage || 'Non spécifié'}</p>
                  <p className="pl-5 text-rose-600">Date d'arrêt : {detailItem.date_archivage || 'N/A'}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 block">Date d'acquisition :</span>
                  <span>{detailItem.date_acquisition || 'Non renseignée'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Valeur unitaire :</span>
                  <span>{(detailItem.valeur_unitaire || 0).toLocaleString('fr-FR')} FCFA</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Fournisseur :</span>
                  <span>{detailItem.fournisseur || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Responsable :</span>
                  <span>{detailItem.responsable || '-'}</span>
                </div>
              </div>

              {detailItem.description && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-semibold text-slate-500 block">Description :</span>
                  <p className="text-xs text-slate-700 mt-1">{detailItem.description}</p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
