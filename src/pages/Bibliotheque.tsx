import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Eye, 
  FileText, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle,
  X,
  Upload,
  BookMarked,
  Sparkles,
  Layers,
  GraduationCap,
  FileCode,
  Globe,
  Music,
  Video,
  Calendar
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface BibliothequeProps {
  cycleProp?: 'primaire' | 'secondaire' | 'tous';
}

interface Resource {
  id: number;
  titre: string;
  auteur: string | null;
  editeur: string | null;
  annee_publication: string | null;
  categorie: string;
  cycle: string;
  niveau_classe: string | null;
  matiere_id: number | null;
  matiere_nom: string | null;
  matiere_associee_nom?: string;
  description: string | null;
  format_fichier: string;
  fichier_url: string | null;
  fichier_nom: string | null;
  taille_fichier: string | null;
  lien_externe: string | null;
  couverture_url: string | null;
  telechargements: number;
  vues: number;
  publie_par: number | null;
  publie_par_nom?: string;
  auteur_nom?: string;
  date_publication: string;
  school_id: number;
}

const CATEGORIES = [
  { id: 'all', label: 'Toutes les catégories' },
  { id: 'manuel_scolaire', label: 'Manuels Scolaires', icon: BookOpen, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'livre_lecture', label: 'Livres de Lecture & Romans', icon: BookMarked, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'cours_resume', label: 'Résumés & Fiches de Cours', icon: Layers, color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'exercices_corriges', label: 'Exercices & Corrigés', icon: CheckCircle2, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'fiche_pedagogique', label: 'Fiches Pédagogiques Enseignants', icon: GraduationCap, color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'annales_examen', label: 'Annales & Sujets d\'Examens', icon: Sparkles, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'revue_magazine', label: 'Revues & Documentaires', icon: Globe, color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'autre', label: 'Autres Ressources', icon: FileText, color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

export const Bibliotheque: React.FC<BibliothequeProps> = ({ cycleProp = 'tous' }) => {
  const { years } = useAuth();
  const [selectedYearId, setSelectedYearId] = useState<string | number>('all');
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCycle, setSelectedCycle] = useState(cycleProp);
  const [selectedFormat, setSelectedFormat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [viewingResource, setViewingResource] = useState<Resource | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    titre: '',
    auteur: '',
    editeur: '',
    annee_publication: new Date().getFullYear().toString(),
    categorie: 'manuel_scolaire',
    cycle: cycleProp === 'tous' ? 'tous' : cycleProp,
    niveau_classe: '',
    matiere_nom: '',
    description: '',
    format_fichier: 'pdf',
    fichier_url: '',
    fichier_nom: '',
    taille_fichier: '1.2 Mo',
    lien_externe: '',
    couverture_url: ''
  });

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error(e);
      }
    }
    fetchResources();
  }, [selectedCycle, selectedCategory, selectedFormat, selectedYearId]);

  const fetchResources = async () => {
    try {
      setLoading(true);
      let url = `/api/bibliotheque?cycle=${selectedCycle}&categorie=${selectedCategory}&format=${selectedFormat}&annee_id=${selectedYearId}`;
      if (searchTerm.trim()) {
        url += `&search=${encodeURIComponent(searchTerm.trim())}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setResources(data);
        } else {
          setResources([]);
        }
      } else {
        setResources([]);
      }
    } catch (err: any) {
      console.error("Error fetching library resources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchResources();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Estimate file size
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeInMb} Mo`;

    // Detect format
    let format = 'pdf';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'doc' || ext === 'docx') format = 'word';
    else if (ext === 'mp3' || ext === 'wav') format = 'audio';
    else if (ext === 'mp4' || ext === 'avi') format = 'video';
    else if (ext === 'epub') format = 'epub';

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        fichier_url: event.target?.result as string,
        fichier_nom: file.name,
        taille_fichier: sizeStr,
        format_fichier: format
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData(prev => ({
        ...prev,
        couverture_url: event.target?.result as string
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!formData.titre.trim()) {
      setErrorMsg('Le titre de la ressource est obligatoire.');
      return;
    }

    try {
      setSubmitting(true);
      if (editingResource) {
        await apiFetch(`/api/bibliotheque/${editingResource.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        setSuccessMsg('Ressource pédagogique mise à jour avec succès.');
      } else {
        await apiFetch('/api/bibliotheque', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        setSuccessMsg('Nouvelle ressource ajoutée à la bibliothèque avec succès.');
      }

      setIsModalOpen(false);
      setEditingResource(null);
      resetForm();
      fetchResources();
    } catch (err: any) {
      setErrorMsg(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      auteur: '',
      editeur: '',
      annee_publication: new Date().getFullYear().toString(),
      categorie: 'manuel_scolaire',
      cycle: cycleProp === 'tous' ? 'tous' : cycleProp,
      niveau_classe: '',
      matiere_nom: '',
      description: '',
      format_fichier: 'pdf',
      fichier_url: '',
      fichier_nom: '',
      taille_fichier: '1.2 Mo',
      lien_externe: '',
      couverture_url: ''
    });
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setFormData({
      titre: resource.titre,
      auteur: resource.auteur || '',
      editeur: resource.editeur || '',
      annee_publication: resource.annee_publication || '',
      categorie: resource.categorie,
      cycle: resource.cycle || 'tous',
      niveau_classe: resource.niveau_classe || '',
      matiere_nom: resource.matiere_nom || '',
      description: resource.description || '',
      format_fichier: resource.format_fichier || 'pdf',
      fichier_url: resource.fichier_url || '',
      fichier_nom: resource.fichier_nom || '',
      taille_fichier: resource.taille_fichier || '1.2 Mo',
      lien_externe: resource.lien_externe || '',
      couverture_url: resource.couverture_url || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette ressource de la bibliothèque ?")) {
      return;
    }
    try {
      await apiFetch(`/api/bibliotheque/${id}`, { method: 'DELETE' });
      setResources(prev => prev.filter(r => r.id !== id));
      setSuccessMsg('Ressource supprimée avec succès.');
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression.");
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      await apiFetch(`/api/bibliotheque/${resource.id}/download`, { method: 'POST' });
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, telechargements: r.telechargements + 1 } : r));
      
      if (resource.fichier_url) {
        const link = document.createElement('a');
        link.href = resource.fichier_url;
        link.download = resource.fichier_nom || `${resource.titre}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (resource.lien_externe) {
        window.open(resource.lien_externe, '_blank');
      } else {
        alert("Téléchargement du document : " + resource.titre);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleView = async (resource: Resource) => {
    try {
      await apiFetch(`/api/bibliotheque/${resource.id}/view`, { method: 'POST' });
      setResources(prev => prev.map(r => r.id === resource.id ? { ...r, vues: r.vues + 1 } : r));
      setViewingResource(resource);
    } catch (e) {
      setViewingResource(resource);
    }
  };

  const canManage = currentUser?.role === 'admin' || 
                    currentUser?.role === 'direction' || 
                    currentUser?.role === 'censeur' || 
                    currentUser?.role === 'super_admin' ||
                    currentUser?.role === 'secretariat';

  const getFormatBadge = (fmt: string) => {
    switch (fmt) {
      case 'pdf':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><FileText className="w-3.5 h-3.5" /> PDF</span>;
      case 'word':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><FileCode className="w-3.5 h-3.5" /> Word</span>;
      case 'audio':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><Music className="w-3.5 h-3.5" /> Audio</span>;
      case 'video':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Video className="w-3.5 h-3.5" /> Vidéo</span>;
      case 'lien_web':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><Globe className="w-3.5 h-3.5" /> Lien Web</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800"><BookOpen className="w-3.5 h-3.5" /> Document</span>;
    }
  };

  const getCategoryLabel = (catKey: string) => {
    const cat = CATEGORIES.find(c => c.id === catKey);
    return cat ? cat.label : catKey;
  };

  const getCycleBadge = (cycle: string) => {
    if (cycle === 'primaire') return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Maternelle & Primaire</span>;
    if (cycle === 'secondaire') return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">Secondaire</span>;
    return <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">Tous cycles</span>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none pr-8">
          <BookOpen className="w-96 h-96 -mr-20 -mt-20" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-semibold tracking-wide w-fit mb-3 border border-emerald-400/30">
            <BookMarked className="w-3.5 h-3.5" />
            Bibliothèque Pédagogique & Ressources Numériques
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-2">
            {cycleProp === 'primaire' ? 'Bibliothèque Scolaire — Maternelle & Primaire' : 
             cycleProp === 'secondaire' ? 'Bibliothèque & Médiathèque — Secondaire' : 
             'Bibliothèque Numérique & Pédagogique'}
          </h1>
          <p className="text-slate-200 text-sm md:text-base leading-relaxed mb-6">
            Espace documentaire complet contenant les manuels scolaires, fiches de préparation pour les enseignants, annales d'examens, résumés de cours et livres de lecture pour les apprenants.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {canManage && (
              <button
                id="btn-ajouter-ressource"
                onClick={() => {
                  resetForm();
                  setEditingResource(null);
                  setIsModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-lg transition duration-150 text-sm"
              >
                <Plus className="w-4 h-4" />
                Ajouter une ressource
              </button>
            )}
            <div className="text-xs text-emerald-200 bg-emerald-950/50 px-3 py-2 rounded-lg border border-emerald-700/50 flex items-center gap-2">
              <Calendar size={14} className="text-emerald-400" />
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-xs font-bold text-white bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
              >
                <option value="all" className="text-slate-900">Toutes les années</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id} className="text-slate-900">Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
              <span className="mx-1 opacity-30">|</span>
              <span className="font-bold text-white">{resources.length}</span> documents disponibles
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center justify-between text-sm shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 md:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, auteur, matière, classe, mot-clé..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-xl transition shrink-0"
          >
            Rechercher
          </button>
        </form>

        {/* Filter Badges & Selects */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filtres :
          </div>

          {cycleProp === 'tous' && (
            <select
              value={selectedCycle}
              onChange={(e: any) => setSelectedCycle(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="tous">Tous les cycles</option>
              <option value="primaire">Maternelle & Primaire</option>
              <option value="secondaire">Secondaire (Collège/Lycée)</option>
            </select>
          )}

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">Tous formats</option>
            <option value="pdf">Format PDF</option>
            <option value="word">Format Word (.docx)</option>
            <option value="audio">Format Audio (.mp3)</option>
            <option value="video">Format Vidéo</option>
            <option value="lien_web">Lien externe</option>
          </select>

          {(selectedCategory !== 'all' || selectedFormat !== 'all' || searchTerm !== '' || (cycleProp === 'tous' && selectedCycle !== 'tous')) && (
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedCycle(cycleProp);
                setSelectedFormat('all');
                setSearchTerm('');
              }}
              className="text-rose-600 hover:text-rose-700 underline font-medium ml-auto"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <div className="animate-spin w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Chargement des ressources pédagogiques...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700 mb-1">Aucune ressource trouvée</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Aucun manuel ou document ne correspond aux filtres sélectionnés. Vous pouvez ajuster vos critères ou ajouter de nouvelles ressources.
          </p>
          {canManage && (
            <button
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition"
            >
              <Plus className="w-4 h-4" />
              Ajouter le premier document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between overflow-hidden group"
            >
              <div>
                {/* Card Top: Cover / Subject banner */}
                <div className="relative h-36 bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden border-b border-slate-100">
                  {resource.couverture_url ? (
                    <img
                      src={resource.couverture_url}
                      alt={resource.titre}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-400 bg-slate-800 text-white">
                      <BookOpen className="w-10 h-10 mb-1 opacity-40" />
                      <span className="text-[11px] font-medium tracking-wide uppercase text-slate-300">
                        {resource.matiere_nom || resource.categorie}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    {getFormatBadge(resource.format_fichier)}
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    {getCycleBadge(resource.cycle)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                    <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {getCategoryLabel(resource.categorie)}
                    </span>
                    {resource.niveau_classe && (
                      <span className="text-slate-600 font-semibold truncate">
                        • {resource.niveau_classe}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2 hover:text-emerald-700 transition cursor-pointer" onClick={() => handleView(resource)}>
                    {resource.titre}
                  </h3>

                  {(resource.auteur || resource.editeur) && (
                    <p className="text-xs text-slate-500 truncate">
                      {resource.auteur && <span>Par <strong className="text-slate-700">{resource.auteur}</strong></span>}
                      {resource.editeur && <span> — {resource.editeur}</span>}
                    </p>
                  )}

                  {resource.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {resource.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1" title="Téléchargements">
                    <Download className="w-3.5 h-3.5 text-slate-400" />
                    {resource.telechargements}
                  </span>
                  <span className="flex items-center gap-1" title="Vues">
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    {resource.vues}
                  </span>
                  {resource.taille_fichier && (
                    <span className="text-slate-400">• {resource.taille_fichier}</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleView(resource)}
                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                    title="Aperçu rapide"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDownload(resource)}
                    className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-lg transition font-medium"
                    title="Télécharger le fichier"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  {canManage && (
                    <>
                      <button
                        onClick={() => handleEdit(resource)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Resource Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingResource ? 'Modifier la ressource pédagogique' : 'Ajouter une ressource à la bibliothèque'}
                  </h2>
                  <p className="text-xs text-slate-500">Mettez à disposition des manuels, cours et exercices pour l'école</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingResource(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Titre du document / Manuel *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mathématiques CE2 - Cahier d'exercices & cours complet"
                  value={formData.titre}
                  onChange={e => setFormData({ ...formData, titre: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Auteur(s) / Collectif</label>
                  <input
                    type="text"
                    placeholder="Ex: Pr. Akindélé, Inspecteur Dossou"
                    value={formData.auteur}
                    onChange={e => setFormData({ ...formData, auteur: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Maison d'édition / Source</label>
                  <input
                    type="text"
                    placeholder="Ex: Éditions Nationales, Nathan, Hachette"
                    value={formData.editeur}
                    onChange={e => setFormData({ ...formData, editeur: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Catégorie *</label>
                  <select
                    value={formData.categorie}
                    onChange={e => setFormData({ ...formData, categorie: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cycle ciblé *</label>
                  <select
                    value={formData.cycle}
                    onChange={e => setFormData({ ...formData, cycle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="tous">Tous les cycles</option>
                    <option value="primaire">Maternelle & Primaire</option>
                    <option value="secondaire">Secondaire (Collège/Lycée)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Niveau / Classe</label>
                  <input
                    type="text"
                    placeholder="Ex: CM2, 3ème, Terminale D"
                    value={formData.niveau_classe}
                    onChange={e => setFormData({ ...formData, niveau_classe: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Discipline / Matière</label>
                  <input
                    type="text"
                    placeholder="Ex: Français, Mathématiques, SVT, Philosophie"
                    value={formData.matiere_nom}
                    onChange={e => setFormData({ ...formData, matiere_nom: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Format du document</label>
                  <select
                    value={formData.format_fichier}
                    onChange={e => setFormData({ ...formData, format_fichier: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="pdf">Document PDF (.pdf)</option>
                    <option value="word">Document Word (.doc, .docx)</option>
                    <option value="audio">Fichier Audio (.mp3)</option>
                    <option value="video">Fichier Vidéo (.mp4)</option>
                    <option value="lien_web">Lien / Portail web externe</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fichier de la ressource (PDF, Word, Audio...)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-sm font-medium text-slate-700 transition">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Choisir le fichier</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.epub,.mp3,.mp4"
                      onChange={handleFileUpload}
                    />
                  </label>
                  <span className="text-xs text-slate-500 truncate max-w-xs">
                    {formData.fichier_nom || 'Aucun fichier sélectionné'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Image de couverture (Optionnel)</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-medium text-slate-700 transition">
                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                    <span>Charger une couverture</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleCoverUpload}
                    />
                  </label>
                  {formData.couverture_url && (
                    <img src={formData.couverture_url} alt="Cover Preview" className="w-8 h-10 object-cover rounded border" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lien web externe (Optionnel)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.lien_externe}
                  onChange={e => setFormData({ ...formData, lien_externe: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Description pédagogique & Sommaire</label>
                <textarea
                  rows={3}
                  placeholder="Présentation synthétique du contenu du livre, des thèmes abordés et des objectifs d'apprentissage..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingResource(null);
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
                  <span>{editingResource ? 'Mettre à jour' : 'Enregistrer la ressource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Viewer Modal */}
      {viewingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-100 p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {getFormatBadge(viewingResource.format_fichier)}
                  {getCycleBadge(viewingResource.cycle)}
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                    {getCategoryLabel(viewingResource.categorie)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {viewingResource.titre}
                </h2>
                {(viewingResource.auteur || viewingResource.editeur) && (
                  <p className="text-xs text-slate-600">
                    {viewingResource.auteur && <span>Auteur : <strong>{viewingResource.auteur}</strong></span>}
                    {viewingResource.editeur && <span> • Éditeur : {viewingResource.editeur}</span>}
                    {viewingResource.annee_publication && <span> ({viewingResource.annee_publication})</span>}
                  </p>
                )}
              </div>
              <button
                onClick={() => setViewingResource(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {viewingResource.couverture_url && (
              <div className="h-48 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
                <img src={viewingResource.couverture_url} alt={viewingResource.titre} className="h-full object-contain" />
              </div>
            )}

            {viewingResource.description && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Résumé pédagogique</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {viewingResource.description}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 text-slate-600">
              <div>
                <span className="text-slate-400 block">Niveau :</span>
                <strong className="text-slate-800">{viewingResource.niveau_classe || 'Tous niveaux'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Matière :</span>
                <strong className="text-slate-800">{viewingResource.matiere_nom || 'Générale'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Taille fichier :</span>
                <strong className="text-slate-800">{viewingResource.taille_fichier || 'Standard'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Consultations :</span>
                <strong className="text-slate-800">{viewingResource.vues} vues / {viewingResource.telechargements} téléchargements</strong>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setViewingResource(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-medium transition"
              >
                Fermer
              </button>
              {viewingResource.lien_externe && (
                <a
                  href={viewingResource.lien_externe}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-medium transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ouvrir le portail externe
                </a>
              )}
              <button
                onClick={() => handleDownload(viewingResource)}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm shadow transition"
              >
                <Download className="w-4 h-4" />
                Télécharger le document ({viewingResource.format_fichier.toUpperCase()})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
