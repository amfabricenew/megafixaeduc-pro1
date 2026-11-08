import React from 'react';
import { X, Save, RefreshCw, Eye, Upload, Check, Sliders, Shield, Award, Image as ImageIcon, Sparkles, CheckCircle2, RotateCcw, BookOpen, UserCheck, Users, Info, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown, GripVertical, ListOrdered, Search } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';

interface BulletinHeaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCycle?: 'primaire' | 'secondaire' | 'all';
  schoolInfo?: any;
  onSaved?: (headerData: any) => void;
}

const COLOR_PRESETS = [
  { name: 'Blanc / Noir (Monochrome)', color: '#000000', isBlackWhite: true },
  { name: 'Vert Émeraude Officiel', color: '#059669' },
  { name: 'Vert Forêt République', color: '#15803d' },
  { name: 'Vert Pin Sombre', color: '#166534' },
  { name: 'Bleu Royal Institutionnel', color: '#2563eb' },
  { name: 'Bleu Marine / Nuit', color: '#1e3a8a' },
  { name: 'Indigo Impérial', color: '#4338ca' },
  { name: 'Violet / Pourpre', color: '#6d28d9' },
  { name: 'Bordeaux / Carmin', color: '#b91c1c' },
  { name: 'Rouge Sombre', color: '#991b1b' },
  { name: 'Ambre Doré', color: '#d97706' },
  { name: 'Cuivre Chaud', color: '#c2410c' },
  { name: 'Cyan Océan', color: '#0891b2' },
  { name: 'Ardoise / Slate', color: '#334155' },
  { name: 'Noir Anthracite', color: '#0f172a' },
];

export default function BulletinHeaderModal({
  isOpen,
  onClose,
  defaultCycle = 'primaire',
  schoolInfo,
  onSaved
}: BulletinHeaderModalProps) {
  const isLockedCycle = defaultCycle === 'primaire' || defaultCycle === 'secondaire';
  const initialCycle = defaultCycle === 'secondaire' ? 'secondaire' : 'primaire_maternelle';
  
  const [activeCycle, setActiveCycle] = React.useState<'primaire_maternelle' | 'secondaire'>(initialCycle);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [previewTab, setPreviewTab] = React.useState<'edit' | 'preview'>('edit');
  const [personnelList, setPersonnelList] = React.useState<any[]>([]);

  // Helper to extract school slogan safely
  const getSchoolSlogan = React.useCallback(() => {
    if (schoolInfo?.slogan && schoolInfo.slogan.trim().length > 0) {
      return schoolInfo.slogan.trim();
    }
    if (schoolInfo?.devise_ecole && schoolInfo.devise_ecole.trim().length > 0) {
      return schoolInfo.devise_ecole.trim();
    }
    // Only use devise if it is not a currency code like FCFA, EUR, etc.
    if (schoolInfo?.devise && !['fcfa', 'eur', 'usd', 'xof', 'cfa'].includes(schoolInfo.devise.toLowerCase().trim())) {
      return schoolInfo.devise.trim();
    }
    return '';
  }, [schoolInfo]);

  const getDefaultHeaderState = React.useCallback((cycleKey: 'primaire_maternelle' | 'secondaire') => {
    const isPrim = cycleKey === 'primaire_maternelle';
    const slogan = getSchoolSlogan();
    return {
      cycle: cycleKey,
      nom_pays: schoolInfo?.pays || 'RÉPUBLIQUE DU BÉNIN',
      devise_pays: 'Fraternité - Justice - Travail',
      ministere_tutelle: isPrim
        ? 'MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE'
        : 'MINISTÈRE DES ENSEIGNEMENTS SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE',
      direction_departementale: isPrim
        ? 'DIRECTION DÉPARTEMENTALE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE'
        : 'DIRECTION DÉPARTEMENTALE DES ENSEIGNEMENTS SECONDAIRE ET TECHNIQUE',
      inspection_zone: isPrim ? 'CIRCONSCRIPTION SCOLAIRE' : 'RÉGION PÉDAGOGIQUE',
      nom_ecole: schoolInfo?.nom || '',
      slogan_ecole: slogan,
      statut_ecole: slogan,
      adresse: schoolInfo?.adresse || '',
      telephone: schoolInfo?.telephone || '',
      email: schoolInfo?.email || '',
      boite_postale: schoolInfo?.boite_postale || '',
      logo: schoolInfo?.logo || '',
      drapeau_pays: '',
      titre_bulletin: 'BULLETIN DE NOTES',
      sous_titre: '',
      titre_directeur: isPrim ? 'Le Directeur' : "Le Chef d'Établissement",
      nom_directeur: schoolInfo?.nom_fondateur || '',
      signature_tampon: schoolInfo?.signature || '',
      devise_ecole: slogan,
      couleur_principale: schoolInfo?.couleur_primaire || '#059669',
      position_tutelle: 'gauche',
      alignement_tutelle: 'center',
      position_etablissement: 'droite',
      alignement_etablissement: 'center',
      position_logo: 'centre',
      afficher_nom_pays: 1,
      afficher_devise_pays: 0,
      afficher_ministere: 1,
      afficher_direction_departementale: 1,
      afficher_inspection_zone: 1,
      afficher_nom_ecole: 1,
      afficher_slogan_ecole: 1,
      afficher_statut_ecole: 1,
      afficher_adresse: 1,
      afficher_telephone: 1,
      afficher_email: 1,
      afficher_boite_postale: 1,
      afficher_logo: 1,
      afficher_drapeau: 1,
      afficher_signature: 1,
      afficher_observations: 1,
      show_photo_eleve: 1,
      show_statistiques: 1,
      show_appreciation: 1,
      show_rang: 1,
      matieres_visibles: [],
      matieres_ordre: [],
      titre_prof_principal: isPrim ? "L'Enseignant(e)" : "LE PROFESSEUR PRINCIPAL",
      nom_prof_principal: ''
    };
  }, [schoolInfo, getSchoolSlogan]);

  const [headerData, setHeaderData] = React.useState<any>(getDefaultHeaderState(initialCycle));
  const [matieresList, setMatieresList] = React.useState<any[]>([]);
  const [matieresSearch, setMatieresSearch] = React.useState('');

  // Automatic staff / signatory detection helper based on title
  const findMatchingPersonnel = React.useCallback((title: string, list: any[]) => {
    if (!title || !Array.isArray(list) || list.length === 0) return null;
    const t = title.toLowerCase().trim();

    // Priority 1: Exact / close keyword matches on poste
    if (t.includes('direct')) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes('direct'));
      if (found) return found;
    }
    if (t.includes('proviseur')) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes('proviseur'));
      if (found) return found;
    }
    if (t.includes('censeur')) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes('censeur'));
      if (found) return found;
    }
    if (t.includes('principal')) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes('principal'));
      if (found) return found;
    }
    if (t.includes('etude') || t.includes('études') || t.includes('pedagog')) {
      const found = list.find(p => {
        const pos = (p.poste || '').toLowerCase();
        return pos.includes('etude') || pos.includes('études') || pos.includes('pedagog');
      });
      if (found) return found;
    }
    if (t.includes('fondateur') || t.includes('fondé') || t.includes('fonde')) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes('fond'));
      if (found) return found;
    }
    if (t.includes('comptab') || t.includes('econome')) {
      const found = list.find(p => {
        const pos = (p.poste || '').toLowerCase();
        return pos.includes('comptab') || pos.includes('econome');
      });
      if (found) return found;
    }
    if (t.includes('secretaire') || t.includes('secrétaire')) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes('secr'));
      if (found) return found;
    }
    if (t.includes('chef') || t.includes('etablissement') || t.includes('établissement')) {
      const found = list.find(p => {
        const pos = (p.poste || '').toLowerCase();
        return pos.includes('chef') || pos.includes('direct') || pos.includes('proviseur');
      });
      if (found) return found;
    }

    // Fallback: check matching words
    const words = t.split(/[\s,/-]+/).filter(w => w.length > 3 && !['pour', 'dans', 'avec', 'sans', 'chef', 'signataire'].includes(w));
    for (const w of words) {
      const found = list.find(p => (p.poste || '').toLowerCase().includes(w));
      if (found) return found;
    }

    return null;
  }, []);

  const detectedSignatory = React.useMemo(() => {
    return findMatchingPersonnel(headerData.titre_directeur, personnelList);
  }, [headerData.titre_directeur, personnelList, findMatchingPersonnel]);

  const fetchPersonnel = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/personnel-administratif');
      if (res.ok) {
        const data = await res.json();
        setPersonnelList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erreur chargement personnel:", e);
    }
  }, []);

  const fetchMatieres = React.useCallback(async () => {
    try {
      const res = await apiFetch('/api/matieres');
      if (res.ok) {
        const data = await res.json();
        setMatieresList(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Erreur chargement matieres:", e);
    }
  }, []);

  const fetchHeader = React.useCallback(async (cycleKey: 'primaire_maternelle' | 'secondaire') => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/bulletin-headers/${cycleKey}`);
      if (res.ok) {
        const data = await res.json();
        if (data && !data.error) {
          const defaults = getDefaultHeaderState(cycleKey);
          
          let parsedMatieresVisibles: any = [];
          if (Array.isArray(data.matieres_visibles)) {
            parsedMatieresVisibles = data.matieres_visibles;
          } else if (typeof data.matieres_visibles === 'string' && data.matieres_visibles.trim().length > 0) {
            try {
              const parsed = JSON.parse(data.matieres_visibles);
              if (Array.isArray(parsed)) parsedMatieresVisibles = parsed;
            } catch (e) {}
          }

          let parsedMatieresOrdre: any = [];
          if (Array.isArray(data.matieres_ordre)) {
            parsedMatieresOrdre = data.matieres_ordre;
          } else if (typeof data.matieres_ordre === 'string' && data.matieres_ordre.trim().length > 0) {
            try {
              const parsed = JSON.parse(data.matieres_ordre);
              if (Array.isArray(parsed)) parsedMatieresOrdre = parsed;
            } catch (e) {}
          }

          const currentSlogan = data.slogan_ecole || data.devise_ecole || defaults.slogan_ecole;

          setHeaderData({
            ...defaults,
            ...data,
            matieres_visibles: parsedMatieresVisibles,
            matieres_ordre: parsedMatieresOrdre,
            titre_prof_principal: data.titre_prof_principal || defaults.titre_prof_principal,
            nom_prof_principal: data.nom_prof_principal || '',
            // Automatically fill from schoolInfo if empty in db
            nom_ecole: data.nom_ecole || schoolInfo?.nom || defaults.nom_ecole,
            slogan_ecole: currentSlogan,
            devise_ecole: currentSlogan,
            statut_ecole: currentSlogan,
            adresse: data.adresse || schoolInfo?.adresse || defaults.adresse,
            telephone: data.telephone || schoolInfo?.telephone || defaults.telephone,
            email: data.email || schoolInfo?.email || defaults.email,
            boite_postale: data.boite_postale || schoolInfo?.boite_postale || defaults.boite_postale,
            logo: data.logo || schoolInfo?.logo || defaults.logo,
            couleur_principale: data.couleur_principale || schoolInfo?.couleur_primaire || '#059669',
            position_tutelle: data.position_tutelle || 'gauche',
            alignement_tutelle: data.alignement_tutelle || 'center',
            position_etablissement: data.position_etablissement || 'droite',
            alignement_etablissement: data.alignement_etablissement || 'center',
            position_logo: data.position_logo || 'centre',
            afficher_nom_pays: data.afficher_nom_pays ?? 1,
            afficher_devise_pays: data.afficher_devise_pays ?? 0,
            afficher_ministere: data.afficher_ministere ?? 1,
            afficher_direction_departementale: data.afficher_direction_departementale ?? 1,
            afficher_inspection_zone: data.afficher_inspection_zone ?? 1,
            afficher_nom_ecole: data.afficher_nom_ecole ?? 1,
            afficher_slogan_ecole: data.afficher_slogan_ecole ?? data.afficher_statut_ecole ?? 1,
            afficher_adresse: data.afficher_adresse ?? 1,
            afficher_telephone: data.afficher_telephone ?? 1,
            afficher_email: data.afficher_email ?? 1,
            afficher_boite_postale: data.afficher_boite_postale ?? 1,
            afficher_logo: data.afficher_logo ?? 1,
            afficher_signature: data.afficher_signature ?? 1,
            afficher_observations: data.afficher_observations ?? 1,
            show_photo_eleve: data.show_photo_eleve ?? 1,
            show_statistiques: data.show_statistiques ?? 1,
            show_appreciation: data.show_appreciation ?? 1,
            show_rang: data.show_rang ?? 1,
          });
        }
      }
    } catch (e) {
      console.error("Erreur lors de la récupération de l'en-tête de bulletin:", e);
    } finally {
      setLoading(false);
    }
  }, [getDefaultHeaderState, schoolInfo]);

  React.useEffect(() => {
    if (isOpen) {
      const initial = defaultCycle === 'secondaire' ? 'secondaire' : 'primaire_maternelle';
      setActiveCycle(initial);
      fetchHeader(initial);
      fetchMatieres();
      fetchPersonnel();
    }
  }, [isOpen, defaultCycle, fetchHeader, fetchMatieres, fetchPersonnel]);

  // When personnelList is loaded and nom_directeur is empty or matches founder, auto-fill from detected signatory
  React.useEffect(() => {
    if (personnelList.length > 0 && (!headerData.nom_directeur || headerData.nom_directeur === schoolInfo?.nom_fondateur)) {
      const matched = findMatchingPersonnel(headerData.titre_directeur, personnelList);
      if (matched) {
        const formattedName = `${matched.nom} ${matched.prenom}`.trim();
        setHeaderData((prev: any) => ({
          ...prev,
          nom_directeur: formattedName,
          signature_tampon: matched.signature || prev.signature_tampon
        }));
      }
    }
  }, [personnelList, headerData.titre_directeur, findMatchingPersonnel, schoolInfo?.nom_fondateur]);

  const cycleMatieres = React.useMemo(() => {
    if (!Array.isArray(matieresList) || matieresList.length === 0) return [];
    if (activeCycle === 'primaire_maternelle') {
      const prims = matieresList.filter((m: any) => 
        m.categorie === 'Primaire & Maternelle' || 
        m.categorie === 'Primaire' ||
        m.categorie === 'Maternelle' ||
        ['expression écrite', 'lecture', 'est', 'edh', 'mathématiques', 'éducation artistique', 'ea/', 'eps', 'communication orale', 'dictée', 'poésie', 'conte', 'graphisme', 'dessin', 'écriture', 'anglais'].some(k => (m.nom || '').toLowerCase().includes(k))
      );
      return prims.length > 0 ? prims : matieresList;
    } else {
      return matieresList.filter((m: any) => m.categorie !== 'Primaire & Maternelle' && m.categorie !== 'Primaire' && m.categorie !== 'Maternelle');
    }
  }, [matieresList, activeCycle]);

  // Subjects sorted by user-customized order
  const orderedCycleMatieres = React.useMemo(() => {
    if (!Array.isArray(cycleMatieres) || cycleMatieres.length === 0) return [];
    const orderList: any[] = headerData.matieres_ordre || [];
    if (!Array.isArray(orderList) || orderList.length === 0) {
      return cycleMatieres;
    }
    
    const copy = [...cycleMatieres];
    return copy.sort((a, b) => {
      const idxA = orderList.indexOf(a.id) !== -1 ? orderList.indexOf(a.id) : orderList.indexOf(String(a.id));
      const idxB = orderList.indexOf(b.id) !== -1 ? orderList.indexOf(b.id) : orderList.indexOf(String(b.id));
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return (a.nom || '').localeCompare(b.nom || '');
    });
  }, [cycleMatieres, headerData.matieres_ordre]);

  // Filtered by search term for UI
  const filteredOrderedMatieres = React.useMemo(() => {
    if (!matieresSearch.trim()) return orderedCycleMatieres;
    const s = matieresSearch.toLowerCase().trim();
    return orderedCycleMatieres.filter((m: any) => 
      (m.nom || '').toLowerCase().includes(s) || 
      (m.categorie || '').toLowerCase().includes(s) ||
      (m.code || '').toLowerCase().includes(s)
    );
  }, [orderedCycleMatieres, matieresSearch]);

  const selectedMatiereIds = React.useMemo(() => {
    if (!headerData.matieres_visibles || !Array.isArray(headerData.matieres_visibles) || headerData.matieres_visibles.length === 0) {
      return cycleMatieres.map((m: any) => m.id);
    }
    return headerData.matieres_visibles;
  }, [headerData.matieres_visibles, cycleMatieres]);

  const toggleMatiereVisible = (id: number) => {
    const current = [...selectedMatiereIds];
    let updated: (number | string)[];
    if (current.includes(id)) {
      updated = current.filter(x => x !== id);
    } else {
      updated = [...current, id];
    }
    setHeaderData((prev: any) => ({ ...prev, matieres_visibles: updated }));
  };

  const selectAllMatieres = () => {
    setHeaderData((prev: any) => ({
      ...prev,
      matieres_visibles: cycleMatieres.map((m: any) => m.id)
    }));
  };

  const deselectAllMatieres = () => {
    setHeaderData((prev: any) => ({
      ...prev,
      matieres_visibles: []
    }));
  };

  const moveMatiere = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= orderedCycleMatieres.length || fromIndex === toIndex) return;
    const currentList = [...orderedCycleMatieres];
    const [moved] = currentList.splice(fromIndex, 1);
    currentList.splice(toIndex, 0, moved);
    const newOrdreIds = currentList.map(m => m.id);
    setHeaderData((prev: any) => ({ ...prev, matieres_ordre: newOrdreIds }));
  };

  const moveMatiereUp = (id: number) => {
    const idx = orderedCycleMatieres.findIndex(m => m.id === id);
    if (idx > 0) moveMatiere(idx, idx - 1);
  };

  const moveMatiereDown = (id: number) => {
    const idx = orderedCycleMatieres.findIndex(m => m.id === id);
    if (idx !== -1 && idx < orderedCycleMatieres.length - 1) moveMatiere(idx, idx + 1);
  };

  const moveMatiereToTop = (id: number) => {
    const idx = orderedCycleMatieres.findIndex(m => m.id === id);
    if (idx > 0) moveMatiere(idx, 0);
  };

  const moveMatiereToBottom = (id: number) => {
    const idx = orderedCycleMatieres.findIndex(m => m.id === id);
    if (idx !== -1 && idx < orderedCycleMatieres.length - 1) moveMatiere(idx, orderedCycleMatieres.length - 1);
  };

  const resetMatiereOrderAlphabetical = () => {
    const sorted = [...cycleMatieres].sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    setHeaderData((prev: any) => ({ ...prev, matieres_ordre: sorted.map(m => m.id) }));
    toast.success("Ordre alphabétique appliqué !");
  };

  const resetMatiereOrderDefault = () => {
    setHeaderData((prev: any) => ({ ...prev, matieres_ordre: [] }));
    toast.success("Ordre initial réinitialisé !");
  };

  const handleCycleChange = (newCycle: 'primaire_maternelle' | 'secondaire') => {
    setActiveCycle(newCycle);
    fetchHeader(newCycle);
  };

  const handleSyncWithSchoolInfo = () => {
    if (!schoolInfo) {
      toast.error("Aucune information de l'école disponible");
      return;
    }
    const slogan = getSchoolSlogan();
    setHeaderData((prev: any) => ({
      ...prev,
      nom_ecole: schoolInfo.nom || prev.nom_ecole,
      slogan_ecole: slogan || prev.slogan_ecole,
      devise_ecole: slogan || prev.devise_ecole,
      statut_ecole: slogan || prev.statut_ecole,
      adresse: schoolInfo.adresse || prev.adresse,
      telephone: schoolInfo.telephone || prev.telephone,
      email: schoolInfo.email || prev.email,
      boite_postale: schoolInfo.boite_postale || prev.boite_postale,
      logo: schoolInfo.logo || prev.logo,
      couleur_principale: schoolInfo.couleur_primaire || prev.couleur_principale || '#059669',
      nom_pays: schoolInfo.pays || prev.nom_pays
    }));
    toast.success("Informations synchronisées avec succès depuis Info École !");
  };

  const handleImageUpload = (field: 'logo' | 'signature_tampon', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderData((prev: any) => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const currentOrderedIds = orderedCycleMatieres.map(m => m.id);
      const payload = {
        ...headerData,
        matieres_visibles: selectedMatiereIds,
        matieres_ordre: headerData.matieres_ordre && headerData.matieres_ordre.length > 0 ? headerData.matieres_ordre : currentOrderedIds,
        slogan_ecole: headerData.slogan_ecole || '',
        devise_ecole: headerData.slogan_ecole || '',
        statut_ecole: headerData.slogan_ecole || '',
        cycle: activeCycle
      };

      const res = await apiFetch('/api/bulletin-headers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur d'enregistrement");
      }

      toast.success(`Configuration du bulletin (${activeCycle === 'primaire_maternelle' ? 'Maternelle & Primaire' : 'Secondaire'}) enregistrée avec succès !`);
      if (onSaved) {
        onSaved(payload);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur lors de l'enregistrement de l'en-tête.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Helper to render live preview blocks
  const renderTutelleBlock = (isLivePreview = false) => {
    const alignClass = headerData.alignement_tutelle === 'left' ? 'text-left items-start' : headerData.alignement_tutelle === 'right' ? 'text-right items-end' : 'text-center items-center';
    
    return (
      <div className={`flex flex-col ${alignClass} space-y-0.5 max-w-[280px]`}>
        {headerData.afficher_nom_pays === 1 && (
          <h4 className="font-black text-xs uppercase tracking-wider text-slate-900 leading-tight">
            {headerData.nom_pays || 'RÉPUBLIQUE DU BÉNIN'}
          </h4>
        )}
        {headerData.afficher_devise_pays === 1 && headerData.devise_pays && (
          <p className="text-[10px] font-semibold text-slate-600 italic leading-tight">
            {headerData.devise_pays}
          </p>
        )}
        {headerData.afficher_ministere === 1 && headerData.ministere_tutelle && (
          <p className="text-[9px] font-extrabold text-slate-800 uppercase leading-tight pt-0.5">
            {headerData.ministere_tutelle}
          </p>
        )}
        {headerData.afficher_direction_departementale === 1 && headerData.direction_departementale && (
          <p className="text-[8.5px] font-semibold text-slate-600 uppercase leading-tight">
            {headerData.direction_departementale}
          </p>
        )}
        {headerData.afficher_inspection_zone === 1 && headerData.inspection_zone && (
          <p className="text-[8.5px] font-medium text-slate-500 uppercase leading-tight">
            {headerData.inspection_zone}
          </p>
        )}
      </div>
    );
  };

  const renderEtablissementBlock = (isLivePreview = false) => {
    const alignClass = headerData.alignement_etablissement === 'left' ? 'text-left items-start' : headerData.alignement_etablissement === 'right' ? 'text-right items-end' : 'text-center items-center';
    const sloganVal = headerData.slogan_ecole || headerData.devise_ecole || schoolInfo?.devise || '';

    return (
      <div className={`flex flex-col ${alignClass} space-y-0.5 max-w-[280px]`}>
        {headerData.afficher_nom_ecole === 1 && (
          <h3 className="font-black text-sm uppercase tracking-tight text-slate-900 leading-tight">
            {headerData.nom_ecole || schoolInfo?.nom || 'COMPLEXE SCOLAIRE'}
          </h3>
        )}
        {(headerData.afficher_slogan_ecole === 1 || headerData.afficher_statut_ecole === 1) && sloganVal && (
          <p className="text-[10px] font-semibold text-slate-700 italic leading-tight">
            « {sloganVal} »
          </p>
        )}
        {headerData.afficher_adresse === 1 && headerData.adresse && (
          <p className="text-[9px] text-slate-700 font-medium pt-0.5 leading-tight">
            Add: {headerData.adresse}
          </p>
        )}
        {headerData.afficher_telephone === 1 && headerData.telephone && (
          <p className="text-[9px] text-slate-700 font-medium leading-tight">
            Tél: {headerData.telephone}
          </p>
        )}
        {headerData.afficher_email === 1 && headerData.email && (
          <p className="text-[9px] text-slate-700 font-medium leading-tight">
            Email: {headerData.email}
          </p>
        )}
        {headerData.afficher_boite_postale === 1 && headerData.boite_postale && (
          <p className="text-[9px] text-slate-600 font-medium leading-tight">
            BP: {headerData.boite_postale}
          </p>
        )}
      </div>
    );
  };

  const renderLogoBlock = () => {
    if (headerData.afficher_logo === 0 || headerData.position_logo === 'aucun') return null;
    const logoSrc = headerData.logo || schoolInfo?.logo;

    return (
      <div className="flex flex-col items-center justify-center shrink-0 px-2">
        {logoSrc ? (
          <img
            src={logoSrc}
            alt="Logo Établissement"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain border border-slate-200 rounded-2xl p-1 bg-white shadow-sm"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400 text-center font-bold bg-slate-50">
            LOGO
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh] my-auto">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-white/10 rounded-2xl border border-white/10 shadow-inner">
              <Sliders size={22} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Personnalisation de l'En-tête des Bulletins</h2>
              <p className="text-xs text-slate-300">
                Configurez l'en-tête officiel, les positions, l'alignement et la palette de couleurs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Live Preview / Edit Tab Toggle */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPreviewTab('edit')}
                className={`px-3 py-1.5 rounded-lg transition-all ${previewTab === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-200 hover:text-white'}`}
              >
                Formulaire
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('preview')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${previewTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-200 hover:text-white'}`}
              >
                <Eye size={14} />
                <span>Aperçu Réel</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-300 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cycle Switcher Tabs or Locked Banner */}
        {isLockedCycle ? (
          <div className="bg-slate-100 px-4 py-2.5 border-b flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${activeCycle === 'primaire_maternelle' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></span>
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {activeCycle === 'primaire_maternelle' ? "Cycle Maternelle & Primaire (Espace Maternelle & Primaire)" : "Cycle Secondaire (Collège & Lycée - Espace Secondaire)"}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs">
              Configuration isolée pour ce cycle
            </span>
          </div>
        ) : (
          <div className="bg-slate-100 p-2 border-b flex items-center justify-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleCycleChange('primaire_maternelle')}
              className={`flex-1 max-w-xs py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeCycle === 'primaire_maternelle'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-300"></span>
              <span>Primaire & Maternelle</span>
            </button>
            <button
              type="button"
              onClick={() => handleCycleChange('secondaire')}
              className={`flex-1 max-w-xs py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeCycle === 'secondaire'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-300"></span>
              <span>Secondaire (Collège & Lycée)</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 flex-1">
            <RefreshCw className="animate-spin text-primary-600" size={32} />
            <p className="text-xs font-semibold text-slate-500">Chargement de la configuration...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {previewTab === 'preview' ? (
              /* Live Bulletin Header Preview */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2">
                  <Eye size={16} className="text-emerald-600 shrink-0" />
                  <span>Aperçu fidèle de l'en-tête imprimé selon vos choix d'alignement, de position et de couleur ({activeCycle === 'primaire_maternelle' ? 'Primaire & Maternelle' : 'Secondaire'}).</span>
                </div>

                <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-md space-y-4 font-sans">
                  {/* Top Dynamic Header Layout */}
                  <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4 gap-4">
                    {/* Left Slot */}
                    <div className="flex-1 flex justify-start">
                      {headerData.position_tutelle === 'gauche' && renderTutelleBlock(true)}
                      {headerData.position_etablissement === 'gauche' && renderEtablissementBlock(true)}
                      {headerData.position_logo === 'gauche' && renderLogoBlock()}
                    </div>

                    {/* Center Slot */}
                    <div className="flex justify-center px-2">
                      {headerData.position_logo === 'centre' && renderLogoBlock()}
                      {headerData.position_tutelle === 'centre' && renderTutelleBlock(true)}
                      {headerData.position_etablissement === 'centre' && renderEtablissementBlock(true)}
                    </div>

                    {/* Right Slot */}
                    <div className="flex-1 flex justify-end">
                      {headerData.position_tutelle === 'droite' && renderTutelleBlock(true)}
                      {headerData.position_etablissement === 'droite' && renderEtablissementBlock(true)}
                      {headerData.position_logo === 'droite' && renderLogoBlock()}
                    </div>
                  </div>

                  {/* Bulletin Title Banner */}
                  <div 
                    className="py-2.5 px-4 rounded-xl text-center text-white font-extrabold uppercase tracking-widest text-sm shadow-sm"
                    style={{ backgroundColor: headerData.couleur_principale || '#059669' }}
                  >
                    {headerData.titre_bulletin || 'BULLETIN DE NOTES'}
                    {headerData.sous_titre && <span className="block text-[11px] font-normal lowercase tracking-normal">{headerData.sous_titre}</span>}
                  </div>

                  {/* Mock Student Row Preview */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Élève :</span> <strong className="text-slate-800">KOUASSI Koffi Jean</strong>
                      <span className="block text-slate-500 font-medium">Matricule : <strong className="text-slate-800">MAT-2024-001</strong></span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 font-medium">Classe :</span> <strong className="text-slate-800">{activeCycle === 'primaire_maternelle' ? 'CM2' : '3ème A'}</strong>
                      <span className="block text-slate-500 font-medium">Trimestre : <strong className="text-slate-800">1er Trimestre</strong></span>
                    </div>
                  </div>

                  {/* Grades Table Preview */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                    {activeCycle === 'primaire_maternelle' ? (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-white text-[11px]" style={{ backgroundColor: headerData.couleur_principale || '#059669' }}>
                            <th className="p-2 border-r border-emerald-400 font-bold">DISCIPLINE / ACTIVITÉ</th>
                            <th className="p-2 border-r border-emerald-400 text-center font-bold">NOTE OBT.</th>
                            <th className="p-2 border-r border-emerald-400 text-center font-bold">NOTE PERF.</th>
                            <th className="p-2 border-r border-emerald-400 text-center font-bold">NOTE TOTALE</th>
                            <th className="p-2 border-r border-emerald-400 text-center font-bold">SUR</th>
                            <th className="p-2 border-r border-emerald-400 text-center font-bold">VALIDATION</th>
                            <th className="p-2 text-center font-bold">APP.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px] bg-white">
                          {(cycleMatieres.filter(m => selectedMatiereIds.includes(m.id)).length > 0
                            ? cycleMatieres.filter(m => selectedMatiereIds.includes(m.id)).slice(0, 5)
                            : [
                                { id: 1, nom: "Communication écrite" },
                                { id: 2, nom: "Lecture (Compréhension)" },
                                { id: 3, nom: "Mathématiques" },
                                { id: 4, nom: "EST" },
                                { id: 5, nom: "EPS" }
                              ]
                          ).map((m: any, idx: number) => (
                            <tr key={m.id || idx} className="hover:bg-slate-50">
                              <td className="p-2 font-medium text-slate-800 border-r">{m.nom}</td>
                              <td className="p-2 text-center border-r">14.50</td>
                              <td className="p-2 text-center border-r">15.00</td>
                              <td className="p-2 text-center border-r font-bold text-emerald-700">14.75</td>
                              <td className="p-2 text-center border-r font-semibold text-slate-700">20</td>
                              <td className="p-2 text-center border-r text-emerald-600 font-semibold">Validé</td>
                              <td className="p-2 text-center text-slate-600">Bien</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-white text-[11px]" style={{ backgroundColor: headerData.couleur_principale || '#059669' }}>
                            <th className="p-2 border-r border-indigo-400 font-bold">MATIÈRE</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">MI</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">DEV 1</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">DEV 2</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">MOY</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">COEF.</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">MOY. COEF.</th>
                            <th className="p-2 border-r border-indigo-400 text-center font-bold">RANG</th>
                            <th className="p-2 text-center font-bold">APP. DU PROF</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-[11px] bg-white">
                          <tr className="hover:bg-slate-50">
                            <td className="p-2 font-medium text-slate-800 border-r">Français</td>
                            <td className="p-2 text-center border-r">14.00</td>
                            <td className="p-2 text-center border-r">13.50</td>
                            <td className="p-2 text-center border-r">15.00</td>
                            <td className="p-2 text-center border-r font-bold">14.25</td>
                            <td className="p-2 text-center border-r">3</td>
                            <td className="p-2 text-center border-r font-bold text-primary-700">42.75</td>
                            <td className="p-2 text-center border-r">3ème</td>
                            <td className="p-2 text-center text-slate-600">Bon travail</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Signatory Footer Preview */}
                  <div className="flex justify-between items-end pt-4 border-t border-slate-200 text-xs">
                    <div className="text-left text-slate-500 italic text-[11px]">
                      {headerData.afficher_observations === 1 && "Observations & appréciations affichées"}
                    </div>
                    <div className="text-center space-y-1">
                      <p className="font-bold text-slate-800">{headerData.titre_directeur || 'Le Directeur'}</p>
                      {headerData.afficher_signature === 1 && headerData.signature_tampon ? (
                        <img
                          src={headerData.signature_tampon}
                          alt="Signature"
                          className="h-12 mx-auto object-contain"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="h-10 flex items-center justify-center text-[10px] text-slate-400 italic">
                          (Signature & Tampon)
                        </div>
                      )}
                      <p className="font-semibold text-slate-700">{headerData.nom_directeur}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Form */
              <form id="bulletin-header-form" onSubmit={handleSave} className="space-y-6">
                
                {/* 1. Official National Tutelage */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Shield size={18} className="text-primary-600" />
                      <span>Tutelle Officielle & République</span>
                    </div>

                    {/* Position and Alignment controls for Tutelle */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Position :</span>
                        <select
                          value={headerData.position_tutelle || 'gauche'}
                          onChange={e => setHeaderData({ ...headerData, position_tutelle: e.target.value })}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="gauche">Gauche (Recommandé)</option>
                          <option value="centre">Centre</option>
                          <option value="droite">Droite</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Alignement :</span>
                        <select
                          value={headerData.alignement_tutelle || 'center'}
                          onChange={e => setHeaderData({ ...headerData, alignement_tutelle: e.target.value })}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="center">Centré entre les lignes (Recommandé)</option>
                          <option value="left">Aligné à Gauche</option>
                          <option value="right">Aligné à Droite</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes for Tutelle elements */}
                  <div className="flex flex-wrap gap-2 pt-1 pb-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_nom_pays === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_nom_pays: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Nom du Pays</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_ministere === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_ministere: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Ministère de Tutelle</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_direction_departementale === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_direction_departementale: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Direction Départementale</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_inspection_zone === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_inspection_zone: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Circonscription / Inspection</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_devise_pays === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_devise_pays: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Devise du Pays (Optionnel)</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Nom du Pays</label>
                      <input
                        type="text"
                        value={headerData.nom_pays}
                        onChange={e => setHeaderData({ ...headerData, nom_pays: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: RÉPUBLIQUE DU BÉNIN"
                      />
                    </div>
                    {headerData.afficher_devise_pays === 1 && (
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Devise du Pays</label>
                        <input
                          type="text"
                          value={headerData.devise_pays}
                          onChange={e => setHeaderData({ ...headerData, devise_pays: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Ex: Fraternité - Justice - Travail"
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Ministère de Tutelle</label>
                      <input
                        type="text"
                        value={headerData.ministere_tutelle}
                        onChange={e => setHeaderData({ ...headerData, ministere_tutelle: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={activeCycle === 'primaire_maternelle' ? "MINISTÈRE DES ENSEIGNEMENTS MATERNEL ET PRIMAIRE" : "MINISTÈRE DES ENSEIGNEMENTS SECONDAIRE, TECHNIQUE ET DE LA FORMATION PROFESSIONNELLE"}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Direction Départementale</label>
                        <input
                          type="text"
                          value={headerData.direction_departementale}
                          onChange={e => setHeaderData({ ...headerData, direction_departementale: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Ex: DIRECTION DÉPARTEMENTALE DES ENSEIGNEMENTS..."
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Circonscription Scolaire / Région Pédagogique</label>
                        <input
                          type="text"
                          value={headerData.inspection_zone}
                          onChange={e => setHeaderData({ ...headerData, inspection_zone: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder={activeCycle === 'primaire_maternelle' ? "Ex: CIRCONSCRIPTION SCOLAIRE D'ABOMEY-CALAVI" : "Ex: RÉGION PÉDAGOGIQUE N° 12"}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. School Identity & Contacts */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Award size={18} className="text-primary-600" />
                      <span>Identité de l'Établissement & Coordonnées</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Sync button with schoolInfo */}
                      <button
                        type="button"
                        onClick={handleSyncWithSchoolInfo}
                        className="px-3 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                        title="Recharger automatiquement les informations depuis Info École"
                      >
                        <Sparkles size={13} className="text-emerald-600" />
                        <span>Synchroniser avec Info École</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Position :</span>
                        <select
                          value={headerData.position_etablissement || 'droite'}
                          onChange={e => setHeaderData({ ...headerData, position_etablissement: e.target.value })}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="droite">Droite (Recommandé)</option>
                          <option value="centre">Centre</option>
                          <option value="gauche">Gauche</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Alignement :</span>
                        <select
                          value={headerData.alignement_etablissement || 'center'}
                          onChange={e => setHeaderData({ ...headerData, alignement_etablissement: e.target.value })}
                          className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="center">Centré entre les lignes (Recommandé)</option>
                          <option value="left">Aligné à Gauche</option>
                          <option value="right">Aligné à Droite</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes for School elements */}
                  <div className="flex flex-wrap gap-2 pt-1 pb-2">
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_nom_ecole === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_nom_ecole: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Nom de l'École</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={(headerData.afficher_slogan_ecole === 1 || headerData.afficher_statut_ecole === 1)}
                        onChange={e => {
                          const val = e.target.checked ? 1 : 0;
                          setHeaderData({ ...headerData, afficher_slogan_ecole: val, afficher_statut_ecole: val });
                        }}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Slogan de l'École</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_adresse === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_adresse: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Adresse</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_telephone === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_telephone: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Téléphone(s)</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_email === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_email: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Email</span>
                    </label>

                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer shadow-2xs hover:border-primary-400">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_boite_postale === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_boite_postale: e.target.checked ? 1 : 0 })}
                        className="w-3.5 h-3.5 text-primary-600 rounded"
                      />
                      <span>Boîte Postale</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-600 block mb-1">Nom de l'Établissement</label>
                      <input
                        type="text"
                        value={headerData.nom_ecole}
                        onChange={e => setHeaderData({ ...headerData, nom_ecole: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: COMPLEXE SCOLAIRE MONT SINAÏ"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600">Slogan de l'École</label>
                        {getSchoolSlogan() && (
                          <button
                            type="button"
                            onClick={() => {
                              const s = getSchoolSlogan();
                              setHeaderData({ ...headerData, slogan_ecole: s, statut_ecole: s, devise_ecole: s });
                              toast.success("Slogan chargé depuis Info École !");
                            }}
                            className="text-[10px] font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            title="Recharger le slogan depuis Info École"
                          >
                            <RotateCcw size={10} />
                            <span>Charger Info École</span>
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={headerData.slogan_ecole || headerData.statut_ecole || headerData.devise_ecole || ''}
                        onChange={e => setHeaderData({ ...headerData, slogan_ecole: e.target.value, statut_ecole: e.target.value, devise_ecole: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Discipline - Travail - Succès"
                      />
                      {getSchoolSlogan() && headerData.slogan_ecole !== getSchoolSlogan() && (
                        <p className="text-[10.5px] text-slate-500 mt-1 italic flex items-center gap-1">
                          <Info size={11} className="text-primary-600" />
                          <span>Slogan renseigné dans Info École : « {getSchoolSlogan()} »</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Téléphone(s)</label>
                      <input
                        type="text"
                        value={headerData.telephone}
                        onChange={e => setHeaderData({ ...headerData, telephone: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: 66 09 98 64 / 40 56 59 71"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Email Officiel</label>
                      <input
                        type="email"
                        value={headerData.email}
                        onChange={e => setHeaderData({ ...headerData, email: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: contact@ecole.bj"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Adresse Complète</label>
                      <input
                        type="text"
                        value={headerData.adresse}
                        onChange={e => setHeaderData({ ...headerData, adresse: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Agonmey / Akassato / Abomey-Calavi"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Boîte Postale (B.P.)</label>
                      <input
                        type="text"
                        value={headerData.boite_postale}
                        onChange={e => setHeaderData({ ...headerData, boite_postale: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: B.P. 123 Cotonou"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Logo & Layout Settings */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <ImageIcon size={18} className="text-primary-600" />
                      <span>Logo de l'Établissement</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Position du Logo :</span>
                      <select
                        value={headerData.position_logo || 'centre'}
                        onChange={e => setHeaderData({ ...headerData, position_logo: e.target.value })}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="centre">Centre (Recommandé)</option>
                        <option value="gauche">Gauche</option>
                        <option value="droite">Droite</option>
                        <option value="aucun">Masquer le logo</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {headerData.logo || schoolInfo?.logo ? (
                        <img 
                          src={headerData.logo || schoolInfo?.logo} 
                          alt="Logo" 
                          className="w-16 h-16 object-contain border border-slate-300 rounded-2xl bg-white p-1.5 shadow-sm" 
                          referrerPolicy="no-referrer" 
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400">
                          <ImageIcon size={24} />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Logo actif sur le bulletin</h4>
                        <p className="text-[11px] text-slate-500">
                          {headerData.logo ? "Logo personnalisé ou synchronisé depuis les paramètres de l'école." : "Aucun logo défini. Cliquez ci-dessous pour en ajouter un."}
                        </p>
                        {schoolInfo?.logo && headerData.logo !== schoolInfo.logo && (
                          <button
                            type="button"
                            onClick={() => setHeaderData({ ...headerData, logo: schoolInfo.logo })}
                            className="mt-1 text-[11px] text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1"
                          >
                            <RotateCcw size={12} />
                            <span>Utiliser le logo configuré dans Info École</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-2">
                        <Upload size={15} />
                        <span>Téléverser un logo</span>
                        <input type="file" accept="image/*" onChange={e => handleImageUpload('logo', e)} className="hidden" />
                      </label>
                      {headerData.logo && (
                        <button
                          type="button"
                          onClick={() => setHeaderData({ ...headerData, logo: '' })}
                          className="px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          Supprimer
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Rich Color Palette */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                      <Sparkles size={18} className="text-primary-600" />
                      <span>Couleur Principale du Bulletin & Thème Graphique</span>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: headerData.couleur_principale || '#059669' }}>
                      {headerData.couleur_principale === '#000000' ? 'Blanc / Noir (#000000)' : (headerData.couleur_principale || '#059669')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-2.5">
                    {COLOR_PRESETS.map((preset) => {
                      const isSelected = (headerData.couleur_principale || '#059669').toLowerCase() === preset.color.toLowerCase();
                      const isWhiteBlack = preset.color === '#000000';
                      return (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setHeaderData({ ...headerData, couleur_principale: preset.color })}
                          className={`p-2 rounded-xl border text-left transition-all flex flex-col items-center gap-1.5 group ${
                            isSelected 
                              ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div 
                            className="w-full h-7 rounded-lg shadow-2xs flex items-center justify-center text-white relative overflow-hidden border border-slate-200"
                            style={{ 
                              background: isWhiteBlack 
                                ? 'linear-gradient(135deg, #000000 50%, #ffffff 50%)' 
                                : preset.color 
                            }}
                          >
                            {isSelected && (
                              <Check 
                                size={14} 
                                className={`drop-shadow ${isWhiteBlack ? 'text-amber-400' : 'text-white'}`} 
                              />
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 text-center leading-tight truncate w-full" title={preset.name}>
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom color picker */}
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs font-bold text-slate-600">Couleur personnalisée :</span>
                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-3 py-1.5 shadow-2xs">
                      <input
                        type="color"
                        value={headerData.couleur_principale || '#059669'}
                        onChange={e => setHeaderData({ ...headerData, couleur_principale: e.target.value })}
                        className="w-7 h-7 rounded-lg cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={headerData.couleur_principale || '#059669'}
                        onChange={e => setHeaderData({ ...headerData, couleur_principale: e.target.value })}
                        className="w-20 text-xs font-mono font-bold text-slate-800 outline-none uppercase"
                        placeholder="#059669"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Titre du Bulletin & Signataire */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b pb-2">
                    <Award size={18} className="text-primary-600" />
                    <span>Titre du Bulletin & Responsable Signataire</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Titre Principal du Bulletin</label>
                      <input
                        type="text"
                        value={headerData.titre_bulletin}
                        onChange={e => setHeaderData({ ...headerData, titre_bulletin: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: BULLETIN DE NOTES"
                      />
                      <p className="text-[10.5px] text-slate-500 mt-1 italic leading-tight">
                        {activeCycle === 'secondaire' ? (
                          <>✨ Le trimestre sera automatiquement suffixé (ex: <strong>« {headerData.titre_bulletin || 'BULLETIN DE NOTES'} DE PREMIER TRIMESTRE »</strong>).</>
                        ) : (
                          <>✨ Le nom de l'évaluation sera automatiquement suffixé (ex: <strong>« {headerData.titre_bulletin || 'BULLETIN DE NOTES'} DE L'ÉVALUATION SOMMATIVE 1 »</strong>).</>
                        )}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600">Titre du Signataire</label>
                        {personnelList.length > 0 && (
                          <span className="text-[10px] text-primary-600 font-bold">Auto-détection active</span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={headerData.titre_directeur}
                        onChange={e => {
                          const newTitle = e.target.value;
                          const matched = findMatchingPersonnel(newTitle, personnelList);
                          setHeaderData({ 
                            ...headerData, 
                            titre_directeur: newTitle,
                            ...(matched && !headerData.nom_directeur ? { 
                              nom_directeur: `${matched.nom} ${matched.prenom}`.trim(),
                              signature_tampon: matched.signature || headerData.signature_tampon 
                            } : {})
                          });
                        }}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder={activeCycle === 'primaire_maternelle' ? "Ex: Le Directeur" : "Ex: Le Chef d'Établissement / Le Proviseur"}
                      />
                      {(() => {
                        const matched = findMatchingPersonnel(headerData.titre_directeur, personnelList);
                        if (matched) {
                          const fullName = `${matched.nom} ${matched.prenom}`.trim();
                          const isApplied = headerData.nom_directeur === fullName;
                          return (
                            <div className="mt-1 flex items-center justify-between gap-1 p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[10.5px] text-emerald-800">
                              <span className="truncate">👤 Détecté : <strong>{fullName}</strong> ({matched.poste || 'Personnel'})</span>
                              {!isApplied && (
                                <button
                                  type="button"
                                  onClick={() => setHeaderData({
                                    ...headerData,
                                    nom_directeur: fullName,
                                    signature_tampon: matched.signature || headerData.signature_tampon
                                  })}
                                  className="shrink-0 px-2 py-0.5 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors"
                                >
                                  Appliquer
                                </button>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-600">Nom du Signataire</label>
                        {personnelList.length > 0 && (
                          <select
                            onChange={e => {
                              const found = personnelList.find(p => String(p.id) === e.target.value);
                              if (found) {
                                setHeaderData({
                                  ...headerData,
                                  nom_directeur: `${found.nom} ${found.prenom}`.trim(),
                                  titre_directeur: found.poste || headerData.titre_directeur,
                                  signature_tampon: found.signature || headerData.signature_tampon
                                });
                                toast.success(`Signataire défini : ${found.nom} ${found.prenom}`);
                              }
                            }}
                            defaultValue=""
                            className="text-[10px] font-semibold text-primary-600 bg-transparent border-0 cursor-pointer outline-none hover:underline"
                          >
                            <option value="" disabled>Choisir dans le personnel...</option>
                            {personnelList.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.nom} {p.prenom} ({p.poste || 'Personnel'})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      <input
                        type="text"
                        value={headerData.nom_directeur}
                        onChange={e => setHeaderData({ ...headerData, nom_directeur: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Ex: Jean DUPONT"
                      />
                    </div>
                  </div>

                  {activeCycle === 'secondaire' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Titre du Professeur Principal
                        </label>
                        <input
                          type="text"
                          value={headerData.titre_prof_principal || 'LE PROFESSEUR PRINCIPAL'}
                          onChange={e => setHeaderData({ ...headerData, titre_prof_principal: e.target.value })}
                          className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Ex: LE PROFESSEUR PRINCIPAL"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">
                          Nom du Professeur Principal (Automatique)
                        </label>
                        <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                          <Info size={15} className="text-primary-600 shrink-0" />
                          <span>Extrait automatiquement du professeur assigné à la classe lors de l'impression.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-3">
                      {headerData.signature_tampon ? (
                        <img src={headerData.signature_tampon} alt="Signature" className="w-16 h-12 object-contain border rounded-xl bg-white p-1" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-16 h-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                          <Award size={20} />
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Signature & Tampon de Direction</h4>
                        <p className="text-[11px] text-slate-500">Apposée en bas de chaque bulletin imprimé entre le titre et le nom du signataire.</p>
                      </div>
                    </div>

                    <label className="cursor-pointer bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-2">
                      <Upload size={15} />
                      <span>{headerData.signature_tampon ? "Changer signature" : "Téléverser signature"}</span>
                      <input type="file" accept="image/*" onChange={e => handleImageUpload('signature_tampon', e)} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* 6. Matières & Ordre d'Affichage sur le Bulletin */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                        <ListOrdered size={18} className="text-primary-600" />
                        <span>Matières & Ordre d'affichage sur le Bulletin ({activeCycle === 'primaire_maternelle' ? 'Maternelle & Primaire' : 'Secondaire'})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Personnalisez l'ordre exact d'apparition et sélectionnez les matières affichées dans la grille des notes.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 rounded-full border border-primary-200">
                        {selectedMatiereIds.length} / {cycleMatieres.length} visible(s)
                      </span>
                      <button
                        type="button"
                        onClick={selectAllMatieres}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        Tout cocher
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllMatieres}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                      >
                        Tout décocher
                      </button>
                      <button
                        type="button"
                        onClick={resetMatiereOrderAlphabetical}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                        title="Trier de A à Z"
                      >
                        A-Z
                      </button>
                      <button
                        type="button"
                        onClick={resetMatiereOrderDefault}
                        className="px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                        title="Réinitialiser l'ordre"
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={matieresSearch}
                      onChange={e => setMatieresSearch(e.target.value)}
                      placeholder="Rechercher une matière par nom ou catégorie..."
                      className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {cycleMatieres.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-xl border border-dashed">
                      Aucune matière configurée pour ce cycle. Rendez-vous dans le menu "Matières" pour en ajouter.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                      {filteredOrderedMatieres.map((mat: any) => {
                        const isChecked = selectedMatiereIds.includes(mat.id);
                        const originalPos = orderedCycleMatieres.findIndex(m => m.id === mat.id);
                        const isFirst = originalPos === 0;
                        const isLast = originalPos === orderedCycleMatieres.length - 1;

                        return (
                          <div
                            key={mat.id}
                            className={`flex items-center justify-between gap-2 p-2 rounded-xl border transition-all ${
                              isChecked 
                                ? 'bg-white border-slate-200 hover:border-primary-300 shadow-2xs' 
                                : 'bg-slate-100/70 border-slate-200 opacity-60'
                            }`}
                          >
                            {/* Left: Position Badge & Checkbox & Name */}
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] shrink-0 border border-slate-200">
                                {originalPos + 1}
                              </span>

                              <label className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1 select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleMatiereVisible(mat.id)}
                                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 shrink-0"
                                />
                                <div className="min-w-0 flex-1 truncate">
                                  <span className="text-xs font-bold text-slate-800 block truncate">{mat.nom}</span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {mat.categorie || 'Discipline'} {mat.parent_id ? '• Sous-matière' : ''}
                                  </span>
                                </div>
                              </label>
                            </div>

                            {/* Right: Reordering Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => moveMatiereToTop(mat.id)}
                                disabled={isFirst}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Placer en première position"
                              >
                                <ChevronsUp size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveMatiereUp(mat.id)}
                                disabled={isFirst}
                                className="p-1 rounded-lg text-slate-600 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Monter d'une position"
                              >
                                <ArrowUp size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveMatiereDown(mat.id)}
                                disabled={isLast}
                                className="p-1 rounded-lg text-slate-600 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Descendre d'une position"
                              >
                                <ArrowDown size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveMatiereToBottom(mat.id)}
                                disabled={isLast}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                                title="Placer en dernière position"
                              >
                                <ChevronsDown size={15} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 7. Display Toggles */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="text-slate-900 font-bold text-sm border-b pb-2">
                    Options Générales d'Impression sur le Bulletin
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_signature === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_signature: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span>Afficher Visa Signataire</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={headerData.show_statistiques === 1}
                        onChange={e => setHeaderData({ ...headerData, show_statistiques: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span>Afficher Statistiques</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={headerData.show_rang === 1}
                        onChange={e => setHeaderData({ ...headerData, show_rang: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span>Afficher Rang</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs">
                      <input
                        type="checkbox"
                        checked={headerData.afficher_observations === 1}
                        onChange={e => setHeaderData({ ...headerData, afficher_observations: e.target.checked ? 1 : 0 })}
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span>Afficher Observations</span>
                    </label>
                  </div>
                </div>

              </form>
            )}

          </div>
        )}

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 text-xs transition-colors"
          >
            Fermer
          </button>
          <button
            type="submit"
            form="bulletin-header-form"
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-colors flex items-center gap-2"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            <span>{saving ? 'Enregistrement...' : 'Enregistrer la Configuration'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
