import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import {
  BookOpenCheck,
  ShieldCheck,
  Plus,
  Trash2,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  School,
  AlertTriangle,
  Layers,
  Search,
  RefreshCw,
  X,
  FileCode,
  Lock,
  Tag,
  GraduationCap
} from 'lucide-react';

interface EpreuveComposition {
  id: number;
  epreuve_id: number;
  annee_id?: number;
  session_nom: string;
  cycle: string;
  matiere_id?: number;
  classe_id?: number;
  date_composition?: string;
  heure_debut?: string;
  duree_minutes?: number;
  nb_copies_prevu?: number;
  statut_impression?: 'a_imprimer' | 'imprime' | 'sous_pli' | 'distribue';
  notes_organisation?: string;
  selectionne_par?: number;
  date_selection?: string;
  // Joins from epreuves
  titre?: string;
  matiere_nom?: string;
  classe_nom?: string;
  duree_originale?: number;
  bareme?: number;
  type_evaluation?: string;
  trimestre?: number;
  fichier_epreuve_url?: string;
  fichier_epreuve_nom?: string;
  fichier_epreuve_type?: string;
  fichier_corrige_url?: string;
  fichier_corrige_nom?: string;
  enseignant_nom?: string;
  selectionneur_nom?: string;
}

interface BankEpreuve {
  id: number;
  titre: string;
  matiere_nom: string;
  classe_nom?: string;
  cycle: string;
  type_evaluation: string;
  trimestre?: number;
  duree_minutes: number;
  bareme: number;
  enseignant_nom: string;
  date_soumission: string;
  date_analyse?: string;
  analyste_nom?: string;
  fichier_epreuve_url: string;
  fichier_epreuve_nom: string;
  fichier_epreuve_type: string;
  fichier_corrige_url?: string;
  fichier_corrige_nom?: string;
  statut: string;
}

export const EpreuvesComposition: React.FC = () => {
  const { user, years } = useAuth();
  const [compositions, setCompositions] = useState<EpreuveComposition[]>([]);
  const [bankEpreuves, setBankEpreuves] = useState<BankEpreuve[]>([]);
  const [loading, setLoading] = useState(true);
  const [bankLoading, setBankLoading] = useState(false);
  
  // Filters
  const [selectedCycle, setSelectedCycle] = useState<'all' | 'primaire' | 'secondaire'>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedStatutImpression, setSelectedStatutImpression] = useState<string>('all');
  const [selectedYearIdFilter, setSelectedYearIdFilter] = useState<string | number>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBankEpreuve, setSelectedBankEpreuve] = useState<BankEpreuve | null>(null);
  const [editingItem, setEditingItem] = useState<EpreuveComposition | null>(null);

  // Form states for adding / editing composition selection
  const [formData, setFormData] = useState({
    session_nom: 'Composition Trimestrielle 1',
    date_composition: '',
    heure_debut: '08:00',
    duree_minutes: 120,
    nb_copies_prevu: 50,
    statut_impression: 'a_imprimer' as 'a_imprimer' | 'imprime' | 'sous_pli' | 'distribue',
    notes_organisation: ''
  });

  // Success / Error messages
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Bank search & filter in modal
  const [bankSearch, setBankSearch] = useState('');
  const [bankCycleFilter, setBankCycleFilter] = useState<'all' | 'primaire' | 'secondaire'>('all');

  const fetchCompositions = async () => {
    try {
      setLoading(true);
      let url = `/api/epreuves-composition?`;
      if (selectedCycle !== 'all') url += `cycle=${selectedCycle}&`;
      if (selectedSession !== 'all') url += `session=${encodeURIComponent(selectedSession)}&`;
      if (selectedStatutImpression !== 'all') url += `statut_impression=${selectedStatutImpression}&`;
      if (selectedYearIdFilter !== 'all') url += `annee_id=${selectedYearIdFilter}&`;
      if (searchTerm.trim()) url += `search=${encodeURIComponent(searchTerm.trim())}&`;

      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        setCompositions(Array.isArray(data) ? data : []);
      } else {
        setCompositions([]);
      }
    } catch (err) {
      console.error('Error fetching composition exams:', err);
      setCompositions([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankEpreuves = async () => {
    try {
      setBankLoading(true);
      const res = await apiFetch(`/api/epreuves?statut=validee&filter=bank`);
      if (res.ok) {
        const data = await res.json();
        setBankEpreuves(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Error fetching bank exams:', err);
    } finally {
      setBankLoading(false);
    }
  };

  useEffect(() => {
    fetchCompositions();
  }, [selectedCycle, selectedSession, selectedStatutImpression, selectedYearIdFilter]);

  // Extract unique sessions for filter
  const uniqueSessions = Array.from(new Set(compositions.map(c => c.session_nom).filter(Boolean)));

  const handleOpenSelectModal = () => {
    fetchBankEpreuves();
    setSelectedBankEpreuve(null);
    setFormData({
      session_nom: 'Composition Trimestre 1',
      date_composition: new Date().toISOString().split('T')[0],
      heure_debut: '08:00',
      duree_minutes: 120,
      nb_copies_prevu: 45,
      statut_impression: 'a_imprimer',
      notes_organisation: ''
    });
    setErrorMsg('');
    setIsSelectModalOpen(true);
  };

  const handleChooseBankEpreuve = (epreuve: BankEpreuve) => {
    setSelectedBankEpreuve(epreuve);
    setFormData(prev => ({
      ...prev,
      duree_minutes: epreuve.duree_minutes || 120
    }));
  };

  const handleSaveSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankEpreuve) {
      setErrorMsg('Veuillez sélectionner une épreuve validée dans la banque.');
      return;
    }
    if (!formData.session_nom.trim()) {
      setErrorMsg('Veuillez indiquer le nom de la session (ex: Composition Trimestre 1).');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await apiFetch('/api/epreuves-composition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epreuve_id: selectedBankEpreuve.id,
          session_nom: formData.session_nom.trim(),
          cycle: selectedBankEpreuve.cycle,
          date_composition: formData.date_composition,
          heure_debut: formData.heure_debut,
          duree_minutes: formData.duree_minutes,
          nb_copies_prevu: formData.nb_copies_prevu,
          statut_impression: formData.statut_impression,
          notes_organisation: formData.notes_organisation
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur lors de l\'enregistrement.');
      }

      setSuccessMsg(`L'épreuve "${selectedBankEpreuve.titre}" a été retenue avec succès pour la session "${formData.session_nom}".`);
      setIsSelectModalOpen(false);
      fetchCompositions();
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: number, statut_impression: 'a_imprimer' | 'imprime' | 'sous_pli' | 'distribue') => {
    try {
      const res = await apiFetch(`/api/epreuves-composition/${id}/statut-impression`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut_impression })
      });
      if (res.ok) {
        setCompositions(prev => prev.map(c => c.id === id ? { ...c, statut_impression } : c));
        setSuccessMsg('Statut de tirage / conditionnement mis à jour.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number, titre?: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir retirer cette épreuve (${titre || ''}) de la session de composition ?`)) {
      return;
    }
    try {
      const res = await apiFetch(`/api/epreuves-composition/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCompositions(prev => prev.filter(c => c.id !== id));
        setSuccessMsg('Épreuve retirée de la composition.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownload = (fileUrl?: string, fileName?: string) => {
    if (!fileUrl) return;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'epreuve_composition.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Filtered bank exams in selection modal
  const filteredBank = bankEpreuves.filter(b => {
    if (bankCycleFilter !== 'all' && b.cycle !== bankCycleFilter) return false;
    if (bankSearch.trim()) {
      const q = bankSearch.toLowerCase();
      return (
        b.titre.toLowerCase().includes(q) ||
        b.matiere_nom.toLowerCase().includes(q) ||
        (b.classe_nom && b.classe_nom.toLowerCase().includes(q)) ||
        b.enseignant_nom.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getStatusBadge = (statut?: string) => {
    switch (statut) {
      case 'a_imprimer':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            À Imprimer / En attente
          </span>
        );
      case 'imprime':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Printer className="w-3.5 h-3.5 text-blue-700" />
            Tirages Effectués ({compositions.find(c => c.statut_impression === 'imprime')?.nb_copies_prevu || 0} copies)
          </span>
        );
      case 'sous_pli':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-300">
            <Lock className="w-3.5 h-3.5 text-purple-700" />
            Sous Pli Scellé / Coffre
          </span>
        );
      case 'distribue':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
            Distribué aux Salles
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            En préparation
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner - Personnel Security Badge */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-900/40">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
          <ShieldCheck className="w-96 h-96 -mr-20 -mt-20 text-indigo-400" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full text-xs font-bold tracking-wide w-fit mb-3 border border-rose-500/30">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            ESPACE STRICTEMENT CONFIDENTIEL — PERSONNEL & DIRECTION
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
            Épreuves Retenues pour les Compositions
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
            Espace sécurisé réservé à l'administration, la direction et au censeur pour sélectionner les sujets officiels d'examen et de composition parmi la <strong>Banque d'Épreuves Validées</strong>, organiser les sessions de tirage, gérer les quotas de copies et le conditionnement sous pli scellé.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOpenSelectModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition duration-150 text-sm"
            >
              <Plus className="w-4 h-4" />
              Retenir une épreuve pour la composition
            </button>

            <button
              onClick={fetchCompositions}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-xs font-semibold border border-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </button>

            <div className="text-xs text-indigo-200 bg-indigo-950/80 px-3.5 py-2 rounded-xl border border-indigo-800/60 font-medium">
              <strong className="text-white font-bold">{compositions.length}</strong> épreuve(s) programmée(s)
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, matière, session, classe, enseignant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCompositions()}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Year Selector */}
            <select
              value={selectedYearIdFilter}
              onChange={(e) => setSelectedYearIdFilter(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes les années scolaires</option>
              {years.map((y: any) => (
                <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
              ))}
            </select>

            {/* Cycle Selector */}
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(e.target.value as any)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les cycles (Primaire & Secondaire)</option>
              <option value="primaire">🌿 Maternelle & Primaire</option>
              <option value="secondaire">🎓 Secondaire (Collège/Lycée)</option>
            </select>

            {/* Session Selector */}
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Toutes les sessions de composition</option>
              {uniqueSessions.map((sess, idx) => (
                <option key={idx} value={sess}>{sess}</option>
              ))}
            </select>

            {/* Status Impression Selector */}
            <select
              value={selectedStatutImpression}
              onChange={(e) => setSelectedStatutImpression(e.target.value)}
              className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tous les statuts de tirage</option>
              <option value="a_imprimer">⏳ À imprimer</option>
              <option value="imprime">🖨️ Tirages effectués</option>
              <option value="sous_pli">🔒 Sous pli scellé</option>
              <option value="distribue">✅ Distribué en salle</option>
            </select>
          </div>
        </div>
      </div>

      {/* List of Composition Exams */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Chargement des épreuves retenues...</p>
        </div>
      ) : compositions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <BookOpenCheck className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Aucune épreuve retenue pour l'instant</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Sélectionnez les sujets validés déposés par les professeurs pour constituer les livrets de composition trimestrielle ou d'examen blanc.
          </p>
          <button
            onClick={handleOpenSelectModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow transition"
          >
            <Plus className="w-4 h-4" />
            Sélectionner depuis la banque validée
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {compositions.map((comp) => {
            const isWord = comp.fichier_epreuve_type === 'doc' || comp.fichier_epreuve_type === 'docx';

            return (
              <div
                key={comp.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm hover:shadow-md transition duration-150 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Bar: Session and Cycle */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-900 rounded-full text-xs font-extrabold tracking-wide uppercase">
                        {comp.session_nom}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        comp.cycle === 'primaire' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-indigo-50 text-indigo-800'
                      }`}>
                        {comp.cycle === 'primaire' ? 'Primaire' : 'Secondaire'}
                      </span>
                    </div>

                    <div>{getStatusBadge(comp.statut_impression)}</div>
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <h3 className="text-base md:text-lg font-bold text-slate-900 leading-snug">
                      {comp.titre || 'Épreuve de composition'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-1 font-medium">
                      <span>Matière : <strong className="text-slate-800">{comp.matiere_nom}</strong></span>
                      {comp.classe_nom && <span>Classe : <strong className="text-slate-800">{comp.classe_nom}</strong></span>}
                      <span>Durée : <strong className="text-slate-800">{comp.duree_minutes} min</strong></span>
                      <span>Barème : <strong className="text-slate-800">/{comp.bareme || 20}</strong></span>
                    </div>
                  </div>

                  {/* Composition Timing & Quota Info */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block font-medium">Date & Heure programmée :</span>
                      <span className="font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {comp.date_composition ? new Date(comp.date_composition).toLocaleDateString('fr-FR') : 'Non définie'} à {comp.heure_debut || '08:00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block font-medium">Nombre de copies :</span>
                      <span className="font-bold text-indigo-700 flex items-center gap-1.5 mt-0.5">
                        <Printer className="w-3.5 h-3.5 text-indigo-600" />
                        {comp.nb_copies_prevu || 0} exemplaires
                      </span>
                    </div>
                  </div>

                  {/* Notes d'organisation secrètes */}
                  {comp.notes_organisation && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-800">
                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                        <span>Consignes d'organisation / Tirage :</span>
                      </div>
                      <p className="italic text-amber-950 pl-5 leading-relaxed">{comp.notes_organisation}</p>
                    </div>
                  )}

                  {/* Author / Reviewer footer */}
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                    <span>Auteur du sujet : <strong>{comp.enseignant_nom}</strong></span>
                    {comp.selectionneur_nom && <span>Retenu par : <strong>{comp.selectionneur_nom}</strong></span>}
                  </div>
                </div>

                {/* Actions & Print Workflow */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Download Subject */}
                    {comp.fichier_epreuve_url && (
                      <button
                        onClick={() => handleDownload(comp.fichier_epreuve_url, comp.fichier_epreuve_nom)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition"
                        title="Télécharger le sujet pour impression"
                      >
                        {isWord ? <FileCode className="w-3.5 h-3.5 text-blue-600" /> : <FileText className="w-3.5 h-3.5 text-rose-600" />}
                        <span>Sujet ({isWord ? 'Word' : 'PDF'})</span>
                      </button>
                    )}

                    {/* Download Answer Key / Corrigé */}
                    {comp.fichier_corrige_url && (
                      <button
                        onClick={() => handleDownload(comp.fichier_corrige_url, comp.fichier_corrige_nom || 'corrige.pdf')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200 transition"
                        title="Télécharger le corrigé type"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Corrigé</span>
                      </button>
                    )}
                  </div>

                  {/* Status update menu & delete */}
                  <div className="flex items-center gap-2">
                    <select
                      value={comp.statut_impression || 'a_imprimer'}
                      onChange={(e) => handleUpdateStatus(comp.id, e.target.value as any)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="a_imprimer">⏳ À imprimer</option>
                      <option value="imprime">🖨️ Tirages faits</option>
                      <option value="sous_pli">🔒 Sous pli scellé</option>
                      <option value="distribue">✅ Distribué</option>
                    </select>

                    <button
                      onClick={() => handleDelete(comp.id, comp.titre)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Retirer de la composition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Select Exam from Validated Bank */}
      {isSelectModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-100 flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Sélectionner une Épreuve Validée pour la Composition
                  </h2>
                  <p className="text-xs text-slate-500">
                    Banque d'épreuves pédagogiques vérifiées et validées par la direction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSelectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Pick an Exam from the Bank */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpenCheck className="w-4 h-4 text-indigo-600" />
                    1. Choisir le sujet dans la banque validée *
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={bankCycleFilter}
                      onChange={(e) => setBankCycleFilter(e.target.value as any)}
                      className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
                    >
                      <option value="all">Tous cycles</option>
                      <option value="primaire">Primaire</option>
                      <option value="secondaire">Secondaire</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrer la banque par titre, matière, classe, enseignant..."
                    value={bankSearch}
                    onChange={(e) => setBankSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Bank list */}
                <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                  {bankLoading ? (
                    <div className="p-8 text-center text-slate-500 text-xs font-medium">
                      Chargement de la banque d'épreuves...
                    </div>
                  ) : filteredBank.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      Aucune épreuve validée trouvée. Validez d'abord des soumissions d'enseignants dans la page Épreuves.
                    </div>
                  ) : (
                    filteredBank.map((epreuve) => {
                      const isSelected = selectedBankEpreuve?.id === epreuve.id;
                      return (
                        <div
                          key={epreuve.id}
                          onClick={() => handleChooseBankEpreuve(epreuve)}
                          className={`p-3.5 cursor-pointer transition flex items-center justify-between gap-3 ${
                            isSelected 
                              ? 'bg-indigo-50 border-l-4 border-indigo-600' 
                              : 'hover:bg-white bg-white/60'
                          }`}
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                epreuve.cycle === 'primaire' ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                              }`}>
                                {epreuve.cycle === 'primaire' ? 'Primaire' : 'Secondaire'}
                              </span>
                              <span className="text-xs font-bold text-slate-900">{epreuve.titre}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3">
                              <span>Matière : <strong>{epreuve.matiere_nom}</strong></span>
                              {epreuve.classe_nom && <span>Classe : <strong>{epreuve.classe_nom}</strong></span>}
                              <span>Auteur : <strong>{epreuve.enseignant_nom}</strong></span>
                              <span>Durée : <strong>{epreuve.duree_minutes} min</strong></span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isSelected ? (
                              <span className="px-3 py-1 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Sélectionnée
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
                              >
                                Choisir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Step 2: Composition Session & Logistics Form */}
              <form onSubmit={handleSaveSelection} className="space-y-4 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  2. Paramètres de la Session de Composition
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nom de la Session *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Composition du 1er Trimestre 2025"
                      value={formData.session_nom}
                      onChange={(e) => setFormData({ ...formData, session_nom: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Date de Composition Prévue
                    </label>
                    <input
                      type="date"
                      value={formData.date_composition}
                      onChange={(e) => setFormData({ ...formData, date_composition: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Heure de Début
                    </label>
                    <input
                      type="time"
                      value={formData.heure_debut}
                      onChange={(e) => setFormData({ ...formData, heure_debut: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Nombre d'Exemplaires / Copies à Tirer
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={2000}
                      value={formData.nb_copies_prevu}
                      onChange={(e) => setFormData({ ...formData, nb_copies_prevu: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Consignes Secrètes de Tirage / Conditionnement (Optionnel)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Ex: Tirer en recto-verso, agrafer par 2 pages, mettre sous pli scellé dans le coffre du censeur..."
                    value={formData.notes_organisation}
                    onChange={(e) => setFormData({ ...formData, notes_organisation: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSelectModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !selectedBankEpreuve}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
                  >
                    {submitting ? 'Enregistrement...' : 'Valider & Retenir pour la composition'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EpreuvesComposition;
