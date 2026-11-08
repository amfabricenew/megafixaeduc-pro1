import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Hash, 
  Flag, 
  Clock,
  Palette, 
  Type, 
  Languages, 
  Save,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Camera,
  Sparkles,
  Calendar,
  ArrowRight,
  Trash2,
  Archive,
  Plus,
  AlertCircle,
  Edit,
  Loader2,
  Users,
  User,
  ClipboardList,
  FileText,
  Database,
  LocateFixed,
  BookOpen,
  Layers,
  CreditCard,
  KeyRound,
  Copy,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../contexts/TranslationContext';
import SchoolCarousel, { SCHOOL_SLIDES } from '../components/SchoolCarousel';
import { formatAcademicYearLibelle, getDefaultDatesForAcademicYear } from '../utils/academicYear';
import { APIProvider, Map, AdvancedMarker, useMap, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';

const GOOGLE_MAPS_API_KEY = "AIzaSyB3Q9f0Tyc8b6fMkZ0GfnkpaGsptig2P1Q";
const MAP_ID = "DEMO_MAP_ID"; // Use a demo map ID or real one if available

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' }
];

const FONTS = [
  { id: 'inter', label: 'Inter (Sans-serif)', family: '"Inter", sans-serif' },
  { id: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
  { id: 'playfair', label: 'Playfair Display (Serif)', family: '"Playfair Display", serif' },
  { id: 'mono', label: 'JetBrains Mono (Monospace)', family: '"JetBrains Mono", monospace' }
];

const COLORS = [
  { name: 'Emerald', value: '#10b981' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Slate', value: '#475569' }
];

interface MapErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

class MapErrorBoundary extends React.Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  constructor(props: MapErrorBoundaryProps) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.warn("Google Maps APIProvider error caught gracefully:", error);
  }

  render() {
    if ((this as any).state?.hasError) {
      return (this as any).props.fallback;
    }
    return (this as any).props.children;
  }
}

const SafeGoogleMap = ({ 
  initialPos, 
  hasValidPos, 
  lat, 
  lng, 
  setFormData 
}: { 
  initialPos: { lat: number; lng: number }; 
  hasValidPos: boolean; 
  lat: number; 
  lng: number; 
  setFormData: React.Dispatch<React.SetStateAction<any>>; 
}) => {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={['marker']}>
      <Map
        mapId={MAP_ID}
        defaultCenter={initialPos}
        center={hasValidPos ? { lat, lng } : undefined}
        defaultZoom={hasValidPos ? 17 : 13}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        onClick={(e) => {
          if (e.detail.latLng) {
            setFormData(prev => ({ 
              ...prev, 
              latitude: e.detail.latLng!.lat, 
              longitude: e.detail.latLng!.lng 
            }));
          }
        }}
      >
        {hasValidPos && (
          <AdvancedMarker
            position={{ lat, lng }}
            draggable={true}
            onDragEnd={(e) => {
              if (e.latLng) {
                setFormData(prev => ({ 
                  ...prev, 
                  latitude: e.latLng!.lat(), 
                  longitude: e.latLng!.lng() 
                }));
              }
            }}
          />
        )}
      </Map>
    </APIProvider>
  );
};

const MapComponent = ({ formData, setFormData }: { formData: any, setFormData: React.Dispatch<React.SetStateAction<any>> }) => {
  const lat = Number(formData.latitude);
  const lng = Number(formData.longitude);
  const hasValidPos = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;

  const initialPos = React.useMemo(() => (hasValidPos 
    ? { lat, lng } 
    : { lat: 6.3654, lng: 2.4183 }), [hasValidPos, lat, lng]);

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev: any) => ({
            ...prev,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          }));
        },
        (err) => {
          console.warn("Geolocation error:", err);
        }
      );
    }
  };

  const fallbackUI = (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-100 text-center relative">
      <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3 shadow-inner">
        <MapPin size={30} />
      </div>
      <h4 className="text-sm font-bold text-slate-800 mb-1">Positionnement GPS de l'établissement</h4>
      <p className="text-xs text-slate-500 max-w-sm mb-4">
        {hasValidPos 
          ? `Coordonnées enregistrées : ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : "Définissez les coordonnées GPS pour la localisation sur les cartes et badges scolaires."}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <LocateFixed size={14} />
          Détecter ma position GPS
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-80 rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 relative group">
      <MapErrorBoundary fallback={fallbackUI}>
        <SafeGoogleMap 
          initialPos={initialPos} 
          hasValidPos={hasValidPos} 
          lat={lat} 
          lng={lng} 
          setFormData={setFormData} 
        />
      </MapErrorBoundary>
      {!hasValidPos && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/5 backdrop-blur-[1px] pointer-events-none">
          <MapPin className="text-primary-600 animate-bounce mb-2" size={32} />
          <p className="text-sm font-bold text-slate-700">Cliquez pour définir la position</p>
        </div>
      )}
    </div>
  );
};

export default function SchoolInfo() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/ecole' : p.path === '/ecole'));
  const canWrite = ['admin', 'super_admin', 'directeur', 'fondateur', 'direction'].includes(user.role) || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));
  const { t, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = React.useState('general');
  const [loading, setLoading] = React.useState(true);
  const [selectedYearId, setSelectedYearId] = React.useState<string | number>('all');
  const [yearsList, setYearsList] = React.useState<any[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [toast, setToast] = React.useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // License & Subscription state
  const [licenseInfo, setLicenseInfo] = React.useState<any>(null);
  const [licenseKeyInput, setLicenseKeyInput] = React.useState('');
  const [activatingKey, setActivatingKey] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState(false);

  const fetchLicenseInfo = async () => {
    try {
      const res = await apiFetch('/api/school-subscription/my-license');
      if (res.ok) {
        const data = await res.json();
        setLicenseInfo(data);
      }
    } catch (e) {
      console.warn("Could not fetch license info:", e);
    }
  };

  const handleActivateNewKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      showToast("Veuillez saisir votre clé d'abonnement", 'error');
      return;
    }
    setActivatingKey(true);
    try {
      const res = await apiFetch('/api/subscriptions/activate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ license_key: licenseKeyInput.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Erreur lors de l'activation");
      }
      showToast(data.message || "Abonnement activé avec succès !");
      setLicenseKeyInput('');
      fetchLicenseInfo();
      fetchSchoolInfo();
    } catch (err: any) {
      showToast(err.message || "Erreur", 'error');
    } finally {
      setActivatingKey(false);
    }
  };
  
  const [formData, setFormData] = React.useState({
    nom: '',
    slogan: '',
    adresse: '',
    telephone: '',
    email: '',
    site_web: '',
    numero_enregistrement: '',
    pays: '',
    devise: 'FCFA',
    logo: '',
    langue: 'fr',
    couleur_primaire: '#10b981',
    police: 'inter',
    taille_police: 16,
    timezone: 'Africa/Abidjan',
    periode_active: 1
  });

  const [years, setYears] = React.useState<any[]>([]);
  const [loadingYears, setLoadingYears] = React.useState(false);
  const [showYearModal, setShowYearModal] = React.useState(false);
  const [editingYearId, setEditingYearId] = React.useState<number | null>(null);
  const [yearFormData, setYearFormData] = React.useState({
    libelle: '',
    date_debut: '',
    date_fin: ''
  });

  const fetchYears = async () => {
    setLoadingYears(true);
    try {
      const response = await apiFetch('/api/annees');
      const data = await response.json();
      if (response.ok) setYears(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingYears(false);
    }
  };

  const handleActivateYear = async (id: number) => {
    try {
      const res = await apiFetch(`/api/annees/${id}/activate`, { method: 'PATCH' });
      if (res.ok) {
        showToast(t('year_activated') || "Année scolaire activée (ancienne année désactivée)");
        fetchYears();
      }
    } catch (e) { console.error(e); }
  };

  const handleDecloturerYear = async (id: number) => {
    try {
      const res = await apiFetch(`/api/annees/${id}/decloturer`, { method: 'PATCH' });
      if (res.ok) {
        showToast("Clôture de l'année scolaire annulée avec succès");
        fetchYears();
      } else {
        const data = await res.json();
        showToast(data.error || "Erreur lors de la réouverture", "error");
      }
    } catch (e) { console.error(e); }
  };

  const handleArchiveYear = async (id: number, currentArchive: boolean) => {
    try {
      const endpoint = currentArchive ? `/api/annees/${id}/unarchive` : `/api/annees/${id}/archive`;
      const res = await apiFetch(endpoint, { method: 'PATCH' });
      if (res.ok) {
        showToast(currentArchive ? "Année désarchivée" : "Année archivée");
        fetchYears();
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteYear = async (id: number, force: boolean = false) => {
    if (!force && !window.confirm("Êtes-vous sûr de vouloir supprimer cette année scolaire ?")) return;
    if (force && !window.confirm("ATTENTION : Cette année contient des données (élèves, notes, paiements). Forcer la suppression supprimera TOUTES ces données définitivement. Continuer ?")) return;
    
    try {
      const res = await apiFetch(`/api/annees/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
      if (res.ok) {
        showToast("Année scolaire supprimée");
        fetchYears();
      } else {
        const data = await res.json();
        if (data.canForce) {
          handleDeleteYear(id, true);
        } else {
          showToast(data.error, "error");
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = editingYearId ? `/api/annees/${editingYearId}` : '/api/annees';
      const method = editingYearId ? 'PUT' : 'POST';
      
      const formattedLibelle = formatAcademicYearLibelle(yearFormData.libelle);
      let { date_debut, date_fin } = yearFormData;
      if (!date_debut || !date_fin) {
        const defDates = getDefaultDatesForAcademicYear(formattedLibelle);
        if (!date_debut) date_debut = defDates.date_debut;
        if (!date_fin) date_fin = defDates.date_fin;
      }

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...yearFormData,
          libelle: formattedLibelle,
          date_debut,
          date_fin
        })
      });
      if (res.ok) {
        showToast(editingYearId ? `Année scolaire ${formattedLibelle} modifiée` : `Année scolaire ${formattedLibelle} ajoutée`);
        setShowYearModal(false);
        setEditingYearId(null);
        setYearFormData({ libelle: '', date_debut: '', date_fin: '' });
        fetchYears();
      }
    } catch (e) { console.error(e); }
  };

  const openEditYear = (year: any) => {
    setEditingYearId(year.id);
    setYearFormData({
      libelle: year.libelle,
      date_debut: year.date_debut ? year.date_debut.split('T')[0] : '',
      date_fin: year.date_fin ? year.date_fin.split('T')[0] : ''
    });
    setShowYearModal(true);
  };

  const [showTransitionModal, setShowTransitionModal] = React.useState(false);
  const [isTransitioning, setIsTransitioning] = React.useState(false);
  const [transitionConfig, setTransitionConfig] = React.useState({
    classes: true,
    eleves: true,
    timetable: true,
    matieres: true,
    evaluation_configs: true,
    notes: false,
    sourceYearId: '',
    targetYearId: '',
    mode: 'automatic' as 'automatic' | 'manual'
  });

  React.useEffect(() => {
    // Set default source year when years are loaded
    if (years.length > 0 && !transitionConfig.sourceYearId) {
      const active = years.find(y => y.est_active_effective);
      if (active) {
        setTransitionConfig(prev => ({ ...prev, sourceYearId: active.id.toString() }));
      }
    }
  }, [years]);

  const handleTransition = async () => {
    const isManual = transitionConfig.mode === 'manual';
    const confirmMsg = isManual 
      ? "Êtes-vous sûr de vouloir copier les données entre ces deux années ?"
      : "Êtes-vous sûr de vouloir lancer la transition ? Cette action créera la nouvelle année et copiera les données sélectionnées.";
    
    if (!window.confirm(confirmMsg)) return;
    
    setIsTransitioning(true);
    try {
      const endpoint = isManual ? '/api/annees/copy-data' : '/api/annees/transition';
      const body = isManual ? {
        from_year_id: transitionConfig.sourceYearId,
        to_year_id: transitionConfig.targetYearId,
        config: transitionConfig
      } : { import_config: transitionConfig };

      const res = await apiFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(isManual ? "Données copiées avec succès !" : "Transition réussie ! La nouvelle année a été créée.");
        setShowTransitionModal(false);
        fetchYears();
      } else {
        const data = await res.json();
        showToast(data.error || "Erreur lors de l'opération", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Erreur réseau", "error");
    } finally {
      setIsTransitioning(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDetectPosition = () => {
    if (!navigator.geolocation) {
      showToast("La géolocalisation n'est pas supportée par votre navigateur.", "error");
      return;
    }

    showToast("Détection de votre position en cours...");
    
    const options = { 
      enableHighAccuracy: true, 
      timeout: 30000,
      maximumAge: 0 
    };

    const successCallback = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords;
      console.log(`Detected position: ${latitude}, ${longitude} (accuracy: ${accuracy}m)`);
      
      setFormData(prev => ({ ...prev, latitude, longitude }));
      showToast(`Position détectée avec une précision de ${Math.round(accuracy)}m !`);
    };

    const errorCallback = (error: GeolocationPositionError) => {
      if (error.code === 3 && options.enableHighAccuracy) {
        console.warn("High accuracy timeout, trying low accuracy fallback...");
        showToast("Signal GPS faible, tentative de détection simplifiée...");
        navigator.geolocation.getCurrentPosition(successCallback, finalErrorCallback, {
          enableHighAccuracy: false,
          timeout: 30000,
          maximumAge: 10000
        });
        return;
      }
      finalErrorCallback(error);
    };

    const finalErrorCallback = (error: GeolocationPositionError) => {
      let msg = "Impossible de détecter votre position.";
      if (error.code === 1) msg = "Accès à la géolocalisation refusé. Veuillez l'autoriser dans votre navigateur.";
      else if (error.code === 2) msg = "Position indisponible. Vérifiez votre signal GPS/réseau.";
      else if (error.code === 3) msg = "Délai d'attente dépassé pour la détection de position.";
      
      showToast(msg, "error");
      console.error("Geolocation error:", error.message || error);
    };

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options);
  };

  const fetchSchoolInfo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('/api/school-info', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await response.json();
      
      if (response.ok) {
        setFormData({
          nom: data.nom ?? '',
          slogan: data.slogan ?? '',
          adresse: data.adresse ?? '',
          telephone: data.telephone ?? '',
          email: data.email ?? '',
          site_web: data.site_web ?? '',
          numero_enregistrement: data.numero_enregistrement ?? '',
          pays: data.pays ?? '',
          devise: data.devise ?? 'FCFA',
          logo: data.logo ?? '',
          langue: data.langue ?? 'fr',
          couleur_primaire: data.couleur_primaire ?? '#10b981',
          police: data.police ?? 'inter',
          taille_police: Number(data.taille_police) || 16,
          timezone: data.timezone ?? 'Africa/Abidjan',
          periode_active: data.periode_active ?? 1,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          geofence_radius: data.geofence_radius ?? 200
        });
      }
    } catch (error) {
      console.error("Error fetching school info:", error);
    } finally {
      setLoading(false);
    }
  };


  React.useEffect(() => {
    fetchSchoolInfo();
    fetchYears();
    fetchLicenseInfo();
  }, [selectedYearId]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch('/api/school-info', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        showToast(t('success_update'));
        window.dispatchEvent(new CustomEvent('schoolInfoChanged'));
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error("Error updating school info:", error);
      showToast(error.message || t('error_update'), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('school_info')}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-slate-500">{t('school_identity_desc') || "Gérez l'identité visuelle et les coordonnées de votre école."}</p>
            <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              <Calendar size={12} className="text-slate-400" />
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="text-[10px] font-bold text-slate-600 bg-transparent border-none focus:ring-0 cursor-pointer p-0 h-auto"
              >
                <option value="all">Toutes les années</option>
                {yearsList.map((y: any) => (
                  <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => fetchSchoolInfo()}
            disabled={saving}
            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleSubmit}
            disabled={saving}
            className="bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50"
          >
            {saving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Save size={20} />}
            {t('save')}
          </button>
        </div>
      </header>

      {/* Carrousel d'immersion scolaire & administration */}
      <SchoolCarousel 
        compact={true}
        title="Immersion & Cadre de l'Établissement"
        subtitle="Aperçu des élèves en uniforme officiel Mégafixa, de l'administration et des équipements"
      />

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('general')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'general' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t('general_contacts')}
        </button>
        <button 
          onClick={() => setActiveTab('appearance')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'appearance' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t('appearance_language')}
        </button>
        <button 
          onClick={() => setActiveTab('gallery')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'gallery' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Camera size={16} />
          <span>Photos & Immersion</span>
          <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-extrabold">5</span>
        </button>
        <button 
          onClick={() => setActiveTab('academic_year')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'academic_year' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar size={18} />
          Année & Période
        </button>
        <button 
          onClick={() => setActiveTab('data_management')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'data_management' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Database size={18} />
          Gestion des Données
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {activeTab === 'general' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Building2 size={20} className="text-primary-600" />
                {t('school_identity')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('school_name')} *</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      required
                      value={formData.nom}
                      onChange={e => setFormData({...formData, nom: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: Complexe Scolaire Excellence"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('slogan')}</label>
                  <input 
                    value={formData.slogan}
                    onChange={e => setFormData({...formData, slogan: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Ex: Vers l'excellence et au-delà"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('registration_number')}</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={formData.numero_enregistrement}
                      onChange={e => setFormData({...formData, numero_enregistrement: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: CS-2024-001"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('country')}</label>
                  <div className="relative">
                    <Flag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={formData.pays}
                      onChange={e => {
                        const newPays = e.target.value;
                        let newTimezone = formData.timezone;
                        const lowerPays = newPays.toLowerCase();
                        if (['bénin', 'benin', 'togo', 'côte d\'ivoire', 'cote d\'ivoire', 'burkina faso', 'mali', 'sénégal', 'senegal'].some(c => lowerPays.includes(c))) {
                          newTimezone = 'Africa/Abidjan';
                        } else if (['nigéria', 'nigeria', 'cameroun', 'cameroon', 'gabon', 'congo', 'tchad', 'chad', 'niger'].some(c => lowerPays.includes(c))) {
                          newTimezone = 'Africa/Lagos';
                        }
                        setFormData({...formData, pays: newPays, timezone: newTimezone});
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: Bénin"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Fuseau Horaire (Timezone)</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select 
                      value={formData.timezone}
                      onChange={e => setFormData({...formData, timezone: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
                    >
                      <option value="Africa/Abidjan">Afrique de l'Ouest (GMT)</option>
                      <option value="Africa/Lagos">Afrique Centrale (GMT+1)</option>
                      <option value="Africa/Nairobi">Afrique de l'Est (GMT+3)</option>
                      <option value="Africa/Johannesburg">Afrique du Sud (GMT+2)</option>
                      <option value="UTC">UTC / GMT</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:col-span-2">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Phone size={20} className="text-blue-600" />
                {t('address_contacts') || 'Coordonnées & Localisation'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('address')}</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={formData.adresse}
                      onChange={e => setFormData({...formData, adresse: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: Rue 123, Quartier Latin, Cotonou"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('phone')}</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={formData.telephone}
                      onChange={e => setFormData({...formData, telephone: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: +229 00 00 00 00"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: contact@ecole.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">{t('website')}</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={formData.site_web}
                      onChange={e => setFormData({...formData, site_web: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Ex: www.ecole.com"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-800">Géolocalisation de l'Établissement</h3>
                      <p className="text-xs text-slate-500">Cliquez sur la carte ou déplacez le marqueur pour définir la position précise de l'école.</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleDetectPosition}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-all border border-blue-100"
                      >
                        <LocateFixed size={16} />
                        Détecter ma position
                      </button>
                      <div className="text-right">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rayon de contrôle (mètres)</label>
                        <div className="flex items-center gap-2">
                          <input 
                            type="range"
                            min="50"
                            max="1000"
                            step="50"
                            value={formData.geofence_radius}
                            onChange={(e) => setFormData({...formData, geofence_radius: parseInt(e.target.value)})}
                            className="w-32 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                          />
                          <span className="text-sm font-black text-primary-600 w-12">{formData.geofence_radius}m</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <MapComponent formData={formData} setFormData={setFormData} />

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Latitude</label>
                      <code className="text-sm font-mono text-slate-700">{formData.latitude?.toFixed(6) || '—'}</code>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Longitude</label>
                      <code className="text-sm font-mono text-slate-700">{formData.longitude?.toFixed(6) || '—'}</code>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'appearance' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Palette size={20} className="text-indigo-600" />
                Identité Visuelle
              </h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Logo de l'école</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                      {formData.logo ? (
                        <>
                          <img src={formData.logo} alt="Logo" className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setFormData({...formData, logo: ''})}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <X size={20} />
                          </button>
                        </>
                      ) : (
                        <ImageIcon className="text-slate-300" size={32} />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="inline-block px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold cursor-pointer hover:bg-primary-100 transition-colors">
                        Choisir une image
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleLogoUpload}
                        />
                      </label>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Format recommandé : PNG ou JPG carré.<br/>
                        Taille max : 2Mo.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">{t('primary_color')}</label>
                  <div className="grid grid-cols-7 gap-2">
                    {COLORS.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData({...formData, couleur_primaire: color.value})}
                        className={`w-full aspect-square rounded-lg transition-transform hover:scale-110 flex items-center justify-center`}
                        style={{ backgroundColor: color.value }}
                      >
                        {formData.couleur_primaire === color.value && <CheckCircle2 size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Type size={20} className="text-amber-600" />
                {t('typography_language') || 'Typographie & Langue'}
              </h2>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">{t('font_family')}</label>
                  <div className="space-y-2">
                    {FONTS.map(font => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setFormData({...formData, police: font.id})}
                        className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                          formData.police === font.id 
                            ? 'border-primary-500 bg-primary-50 text-primary-700' 
                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                        }`}
                      >
                        <span style={{ fontFamily: font.family }}>{font.label}</span>
                        {formData.police === font.id && <CheckCircle2 size={18} />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">{t('font_size_px')}</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="12" 
                      max="24" 
                      step="1"
                      value={formData.taille_police || 16}
                      onChange={e => setFormData({...formData, taille_police: parseInt(e.target.value) || 16})}
                      className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary-600"
                    />
                    <span className="text-lg font-bold text-primary-600 w-12 text-center">
                      {formData.taille_police}px
                    </span>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p style={{ fontSize: `${formData.taille_police}px` }} className="text-slate-600">
                      {t('font_preview')}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    <Languages size={18} className="text-slate-400" />
                    {t('system_language')}
                  </label>
                  <div className="flex gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => {
                          setFormData({...formData, langue: lang.code});
                          setLanguage(lang.code as any);
                        }}
                        className={`flex-1 py-3 rounded-2xl font-bold transition-all ${
                          formData.langue === lang.code 
                            ? 'bg-primary-600 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'gallery' ? (
          <div className="space-y-8">
            <SchoolCarousel 
              title="Immersion & Galerie Officielle de l'Établissement"
              subtitle="Apprenants en uniforme officiel avec écusson brodé, équipe administrative connectée sur ordinateurs et vie scolaire"
            />

            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    Catalogue des Espaces & Reportages Photos
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Images d'illustration officielles intégrées dans les présentations, documents et carrousels de l'application
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-primary-50 text-primary-700 rounded-full border border-primary-200/60 self-start sm:self-center">
                  5 photos HD
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SCHOOL_SLIDES.map((slide, idx) => (
                  <div key={slide.id} className="p-4 bg-slate-50 hover:bg-white rounded-2xl border border-slate-200/60 hover:border-primary-300 transition-all flex flex-col sm:flex-row gap-4 group shadow-2xs hover:shadow-md">
                    <div className="relative w-full sm:w-36 h-28 sm:h-auto rounded-xl overflow-hidden shrink-0">
                      <img 
                        src={slide.image} 
                        alt={slide.title} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md text-white rounded-lg text-[10px] font-black">
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${slide.tagColor}`} />
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          {slide.category}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 group-hover:text-primary-600 transition-colors">
                        {slide.title}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'academic_year' ? (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Clock size={20} className="text-indigo-600" />
                  Période Académique Active
                </h2>
                <p className="text-sm text-slate-500">Sélectionnez le trimestre ou semestre en cours pour l'ensemble de l'établissement.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormData({...formData, periode_active: p})}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                      formData.periode_active === p 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-3xl font-black">{p}</span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {p === 1 ? 'Premier' : p === 2 ? 'Deuxième' : 'Troisième'}
                    </span>
                    <span className="text-[10px] opacity-70">Trimestre / Semestre</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar size={20} className="text-primary-600" />
                    Années Scolaires
                  </h2>
                  <p className="text-sm text-slate-500">Historique et gestion des cycles académiques.</p>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setShowYearModal(true)}
                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-primary-100 transition-colors"
                  >
                    <Plus size={18} />
                    Nouvelle Année
                  </button>
                )}
              </div>

              {/* Sélecteur d'activation automatique de l'année scolaire */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-bold text-emerald-900">
                    Année scolaire active :
                  </span>
                  <span className="text-xs font-black text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                    {years.find(y => y.est_active_effective || y.est_active === 1)?.libelle || 'Aucune'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500 font-medium">Changer pour activer automatiquement :</span>
                  <select
                    value={years.find(y => y.est_active_effective || y.est_active === 1)?.id || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val) handleActivateYear(val);
                    }}
                    className="bg-white text-xs font-bold text-slate-800 border border-emerald-300 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer shadow-2xs"
                  >
                    {years.map((y: any) => (
                      <option key={y.id} value={y.id}>
                        Année {y.libelle} {y.est_active_effective ? '✓ (Active en cours)' : ''} {y.cloturee === 1 ? '🔒 (Clôturée)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                {years.map(year => (
                  <div 
                    key={year.id} 
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                      year.est_active_effective 
                        ? 'border-primary-200 bg-primary-50/30' 
                        : 'border-slate-100 bg-white hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        year.est_active_effective ? 'bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Calendar size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900">{year.libelle}</h4>
                          {year.est_active_effective && (
                            <span className="px-2 py-0.5 bg-primary-600 text-white text-[10px] font-black rounded-full uppercase">Actif</span>
                          )}
                          {year.cloturee === 1 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-full uppercase">Clôturée</span>
                          )}
                          {year.archivee === 1 && year.cloturee !== 1 && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 text-[10px] font-black rounded-full uppercase">Archivée</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {year.date_debut ? new Date(year.date_debut).toLocaleDateString() : 'N/A'} — {year.date_fin ? new Date(year.date_fin).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => openEditYear(year)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit size={18} />
                        </button>
                      )}
                      {year.cloturee === 1 && canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDecloturerYear(year.id)}
                            className="px-2.5 py-1 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                            title="Annuler la clôture (Rouvrir cette année)"
                          >
                            <RotateCcw size={14} className="text-emerald-600" />
                            <span>Annuler la clôture</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(year.id)}
                            className="px-2.5 py-1 text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                            title="Supprimer cette année scolaire clôturée"
                          >
                            <Trash2 size={14} className="text-red-600" />
                            <span>Supprimer</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleActivateYear(year.id)}
                            className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                            title="Activer cette année scolaire (désactive automatiquement l'ancienne et annule la clôture)"
                          >
                            <CheckCircle2 size={14} className="text-primary-600" />
                            <span>Activer</span>
                          </button>
                        </>
                      )}
                      {!year.est_active_effective && year.cloturee === 0 && canWrite && (
                        <button
                          type="button"
                          onClick={() => handleActivateYear(year.id)}
                          className="px-2.5 py-1 text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                          title="Activer cette année (désactive automatiquement l'ancienne)"
                        >
                          <CheckCircle2 size={14} className="text-primary-600" />
                          <span>Activer</span>
                        </button>
                      )}
                      {year.est_active_effective && (
                        <span className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-2xs">
                          <CheckCircle2 size={13} />
                          <span>Active</span>
                        </span>
                      )}
                      {canWrite && (
                        <>
                          {year.cloturee === 0 && (
                            <button
                              type="button"
                              onClick={() => handleArchiveYear(year.id, year.archivee === 1)}
                              className={`p-2 rounded-lg transition-colors ${year.archivee === 1 ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'}`}
                              title={year.archivee === 1 ? "Désarchiver" : "Archiver"}
                            >
                              <Archive size={18} />
                            </button>
                          )}
                          {year.cloturee === 0 && !year.est_active_effective && (
                            <button
                              type="button"
                              onClick={() => handleDeleteYear(year.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                
                {years.length === 0 && !loadingYears && (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Aucune année scolaire configurée.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'data_management' ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Database size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Gestion des Données</h2>
                <p className="text-sm text-slate-500">Gérez les transferts, les transitions et l'historique de vos données académiques.</p>
              </div>
            </div>

            {canWrite && years.some(y => y.est_active_effective) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 space-y-4">
                  <div className="flex items-center gap-3 text-amber-800">
                    <Sparkles size={24} className="text-amber-600" />
                    <h4 className="font-bold text-lg">Transition & Migration</h4>
                  </div>
                  <p className="text-sm text-amber-800/80 leading-relaxed">
                    Utilisez cet outil pour préparer la nouvelle année scolaire ou copier des données entre des années existantes. Vous pouvez transférer les classes, les élèves, les emplois du temps et même les notes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTransitionModal(true)}
                    className="w-full px-6 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={20} />
                    Ouvrir l'Espace de Transition
                  </button>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200/60 space-y-4">
                  <div className="flex items-center gap-3 text-slate-800">
                    <Archive size={24} className="text-slate-600" />
                    <h4 className="font-bold text-lg">Archives & Historique</h4>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Les données archivées restent consultables mais ne peuvent plus être modifiées. Assurez-vous d'avoir sauvegardé toutes les informations nécessaires avant d'archiver une année scolaire.
                  </p>
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs font-medium text-slate-600 flex items-center gap-3">
                    <AlertCircle size={16} className="text-amber-500" />
                    Une année active ne peut pas être archivée directement.
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <AlertCircle size={40} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-slate-800 font-bold mb-2">Configuration requise</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Vous devez avoir au moins une année scolaire active pour accéder aux outils de gestion des données.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </form>

      {/* Modal Transition */}
      <AnimatePresence>
        {showTransitionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isTransitioning && setShowTransitionModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-amber-600 text-white">
                <div className="flex items-center gap-3">
                  <Sparkles size={22} />
                  <h3 className="text-lg font-bold">Transition de fin d'année</h3>
                </div>
                <button 
                  onClick={() => !isTransitioning && setShowTransitionModal(false)} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
                  disabled={isTransitioning}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Mode Selection */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTransitionConfig({ ...transitionConfig, mode: 'automatic' })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${transitionConfig.mode === 'automatic' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Transition Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransitionConfig({ ...transitionConfig, mode: 'manual' })}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${transitionConfig.mode === 'manual' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Copie Manuelle
                  </button>
                </div>

                {transitionConfig.mode === 'manual' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Année Source</label>
                      <select
                        value={transitionConfig.sourceYearId}
                        onChange={e => setTransitionConfig({ ...transitionConfig, sourceYearId: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold"
                      >
                        <option value="">Sélectionner...</option>
                        {years.map(y => (
                          <option key={y.id} value={y.id}>{y.libelle}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Année Cible</label>
                      <select
                        value={transitionConfig.targetYearId}
                        onChange={e => setTransitionConfig({ ...transitionConfig, targetYearId: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold"
                      >
                        <option value="">Sélectionner...</option>
                        {years.map(y => (
                          <option key={y.id} value={y.id} disabled={y.id.toString() === transitionConfig.sourceYearId}>{y.libelle}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-sm text-emerald-800 leading-relaxed space-y-1">
                  <div className="font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    Transition automatique des données
                  </div>
                  <p className="text-xs text-emerald-700">
                    Toutes les informations enregistrées (classes, matières, emplois du temps, configurations et élèves) sont reconduites dans la nouvelle année scolaire. <strong>Les notes sont exclues</strong> afin de débuter la nouvelle année avec un carnet de notes vierge.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Données transférées</h4>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Notes exclues
                    </span>
                  </div>
                  
                  <div className="grid gap-3">
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                          <Users size={20} />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-800">Classes, Niveaux & Frais</span>
                          <span className="block text-[10px] text-slate-500">Recréer toutes les classes, niveaux et grilles de scolarité</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={transitionConfig.classes} 
                        onChange={e => setTransitionConfig({...transitionConfig, classes: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
                        disabled={isTransitioning}
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                          <User size={20} />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-800">Élèves & Inscriptions</span>
                          <span className="block text-[10px] text-slate-500">Transférer et réinscrire les élèves (Passants / Redoublant(e)s)</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={transitionConfig.eleves} 
                        onChange={e => setTransitionConfig({...transitionConfig, eleves: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
                        disabled={isTransitioning}
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow-sm">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-800">Matières & Affectations</span>
                          <span className="block text-[10px] text-slate-500">Attribution des matières par classe, coefficients et enseignants</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={transitionConfig.matieres} 
                        onChange={e => setTransitionConfig({...transitionConfig, matieres: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
                        disabled={isTransitioning}
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-violet-600 shadow-sm">
                          <ClipboardList size={20} />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-800">Emplois du temps</span>
                          <span className="block text-[10px] text-slate-500">Copier les programmations horaires et les salles</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={transitionConfig.timetable} 
                        onChange={e => setTransitionConfig({...transitionConfig, timetable: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
                        disabled={isTransitioning}
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-cyan-600 shadow-sm">
                          <Layers size={20} />
                        </div>
                        <div>
                          <span className="block font-bold text-slate-800">Configurations des Évaluations</span>
                          <span className="block text-[10px] text-slate-500">Périodes, séquences et barèmes de notation</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={transitionConfig.evaluation_configs} 
                        onChange={e => setTransitionConfig({...transitionConfig, evaluation_configs: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
                        disabled={isTransitioning}
                      />
                    </label>

                    {/* Bloc informatif pour les notes exclues */}
                    <div className="flex items-center justify-between p-4 bg-slate-100/70 rounded-2xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-slate-500 shadow-sm">
                          <FileText size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">Notes & Évaluations</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded uppercase">Exclu</span>
                          </div>
                          <span className="block text-[10px] text-slate-500">Non transmises : démarrage avec un carnet de notes vierge</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-400">Vierge</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTransitionModal(false)}
                    disabled={isTransitioning}
                    className="flex-1 px-4 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleTransition}
                    disabled={isTransitioning || (transitionConfig.mode === 'manual' && (!transitionConfig.sourceYearId || !transitionConfig.targetYearId))}
                    className="flex-[2] px-4 py-4 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isTransitioning ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Opération en cours...
                      </>
                    ) : (
                      <>
                        <ArrowRight size={20} />
                        {transitionConfig.mode === 'manual' ? 'Lancer la copie' : 'Lancer la transition'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Nouvelle Année */}
      <AnimatePresence>
        {showYearModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowYearModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary-600 text-white">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Calendar size={20} />
                  {editingYearId ? 'Modifier l\'Année Scolaire' : 'Nouvelle Année Scolaire'}
                </h3>
                <button onClick={() => { setShowYearModal(false); setEditingYearId(null); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddYear} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Libellé (ex: 2025-2026)</label>
                  <input
                    required
                    value={yearFormData.libelle}
                    onChange={e => {
                      const val = e.target.value;
                      const autoVal = formatAcademicYearLibelle(val);
                      if (val.match(/^(\d{4})[-/](\d{4})$/) && autoVal !== val) {
                        const defDates = getDefaultDatesForAcademicYear(autoVal);
                        setYearFormData(prev => ({
                          ...prev,
                          libelle: autoVal,
                          date_debut: prev.date_debut || defDates.date_debut,
                          date_fin: defDates.date_fin
                        }));
                      } else {
                        setYearFormData(prev => ({ ...prev, libelle: val }));
                      }
                    }}
                    onBlur={e => {
                      const formatted = formatAcademicYearLibelle(e.target.value);
                      if (formatted && formatted !== e.target.value) {
                        const defDates = getDefaultDatesForAcademicYear(formatted);
                        setYearFormData(prev => ({
                          ...prev,
                          libelle: formatted,
                          date_debut: prev.date_debut || defDates.date_debut,
                          date_fin: defDates.date_fin
                        }));
                      }
                    }}
                    placeholder="2025-2026"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 font-bold text-slate-800"
                  />
                  <p className="text-[11px] text-slate-500 font-normal">
                    Format automatique : une année scolaire s'étend sur deux années consécutives (ex: 2025-2026).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Date Début</label>
                    <input
                      type="date"
                      required
                      value={yearFormData.date_debut}
                      onChange={e => {
                        const dateVal = e.target.value;
                        const startYear = new Date(dateVal).getFullYear();
                        let updatedLibelle = yearFormData.libelle;
                        let updatedFin = yearFormData.date_fin;
                        if (!isNaN(startYear)) {
                          updatedLibelle = `${startYear}-${startYear + 1}`;
                          updatedFin = `${startYear + 1}-07-31`;
                        }
                        setYearFormData(prev => ({
                          ...prev,
                          date_debut: dateVal,
                          libelle: updatedLibelle,
                          date_fin: updatedFin
                        }));
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Date Fin</label>
                    <input
                      type="date"
                      required
                      value={yearFormData.date_fin}
                      onChange={e => setYearFormData({...yearFormData, date_fin: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowYearModal(false); setEditingYearId(null); }}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
                  >
                    {editingYearId ? 'Enregistrer les modifications' : 'Créer l\'année'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              toast.type === 'success' 
                ? 'bg-primary-900 border-primary-700 text-primary-50' 
                : 'bg-red-900 border-red-700 text-red-50'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} className="text-primary-400" /> : <X size={20} className="text-red-400" />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
