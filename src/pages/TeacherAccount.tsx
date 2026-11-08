import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/api';
import { toast } from 'react-hot-toast';
import PasswordStrengthMeter, { evaluatePassword } from '../components/PasswordStrengthMeter';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  BookOpen, 
  Phone, 
  Mail, 
  CheckCircle2, 
  AlertTriangle,
  KeyRound,
  GraduationCap,
  Layers,
  Edit3,
  ExternalLink,
  Search,
  Shield,
  FileSpreadsheet,
  Calendar,
  MessageSquare,
  AlertCircle,
  Clock,
  Home,
  Check
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { getUserGrantedPages } from '../utils/permissions';

export default function TeacherAccount() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [teacherDetails, setTeacherDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Active sub-tab in account page: 'pages' | 'profile' | 'password'
  const [activeSection, setActiveSection] = useState<'pages' | 'profile' | 'password'>('pages');

  // Search & filter for granted pages
  const [pageSearch, setPageSearch] = useState('');
  const [accessFilter, setAccessFilter] = useState<'all' | 'read_write' | 'read_only'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Password change form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        setLoading(true);
        if (user?.enseignant_id) {
          const res = await apiFetch(`/api/enseignants`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              const current = data.find((e: any) => Number(e.id) === Number(user.enseignant_id));
              setTeacherDetails(current || null);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching teacher details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherProfile();
  }, [user]);

  // Compute granted pages list
  const grantedPages = getUserGrantedPages(user?.permissions, user?.role);
  
  const readWriteCount = grantedPages.filter(p => p.access_type === 'read_write').length;
  const readOnlyCount = grantedPages.filter(p => p.access_type === 'read_only').length;

  const filteredPages = grantedPages.filter(page => {
    const matchesSearch = page.label.toLowerCase().includes(pageSearch.toLowerCase()) ||
                          page.path.toLowerCase().includes(pageSearch.toLowerCase()) ||
                          (page.description && page.description.toLowerCase().includes(pageSearch.toLowerCase()));
    if (!matchesSearch) return false;

    if (accessFilter === 'read_write' && page.access_type !== 'read_write') return false;
    if (accessFilter === 'read_only' && page.access_type !== 'read_only') return false;

    if (categoryFilter !== 'all' && page.category !== categoryFilter) return false;

    return true;
  });

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin':
      case 'fonde':
        return 'Fondateur / Administrateur Principal';
      case 'direction':
        return 'Direction & Administration';
      case 'censeur':
        return 'Censeur des Études';
      case 'surveillant':
        return 'Surveillant Général';
      case 'secretariat':
      case 'secretaire':
        return 'Secrétariat Administratif';
      case 'comptable':
        return 'Comptabilité & Finances';
      case 'enseignant':
        return 'Enseignant / Professeur';
      case 'parent':
        return 'Parent d\'élève';
      default:
        return role || 'Utilisateur';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'pedagogy': return 'Pédagogie & Évaluations';
      case 'administration': return 'Administration & Structure';
      case 'finance': return 'Finances & Écolages';
      case 'school_life': return 'Vie Scolaire & Emploi du temps';
      case 'communication': return 'Communication & Messagerie';
      case 'security': return 'Sécurité & Paramètres';
      case 'general': return 'Général & Accueil';
      default: return category;
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Veuillez saisir votre ancien mot de passe.");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    const evalRes = evaluatePassword(newPassword);
    if (!evalRes.isStrictValid) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Le nouveau mot de passe et la confirmation ne correspondent pas.");
      return;
    }

    if (newPassword === currentPassword) {
      toast.error("Le nouveau mot de passe doit être différent de l'ancien mot de passe.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la modification du mot de passe.");
      }

      toast.success("Mot de passe modifié avec succès ! Redirection vers la page de connexion...");

      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          parsed.is_first_login = 0;
          localStorage.setItem('user', JSON.stringify(parsed));
        } catch (e) {}
      }

      setTimeout(async () => {
        await logout();
        navigate('/login', { 
          replace: true, 
          state: { 
            loginIdentifier: user?.email || '',
            successMessage: "Votre mot de passe a été mis à jour avec succès. Veuillez vous connecter avec votre identifiant et votre nouveau mot de passe." 
          } 
        });
      }, 1500);

    } catch (error: any) {
      toast.error(error.message || "Erreur lors du changement de mot de passe");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="user-account-page" className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Profile Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-2xl sm:text-3xl font-bold border border-white/30 shadow-inner shrink-0 overflow-hidden">
              {teacherDetails?.photo ? (
                <img src={teacherDetails.photo} alt={user?.nom} className="w-full h-full object-cover" />
              ) : (
                user?.nom?.charAt(0).toUpperCase() || <User size={36} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-white/25 text-white backdrop-blur-sm shadow-sm">
                  {getRoleLabel(user?.role)}
                </span>
                {teacherDetails?.matricule && (
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-medium bg-emerald-900/60 text-emerald-100">
                    Matricule: {teacherDetails.matricule}
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold mt-1.5 tracking-tight">
                {teacherDetails ? `${teacherDetails.prenom || ''} ${teacherDetails.nom || ''}`.trim() : user?.nom}
              </h1>
              <p className="text-emerald-100 text-xs sm:text-sm flex items-center gap-2 mt-1">
                <Mail size={14} className="shrink-0" /> {user?.email}
              </p>
            </div>
          </div>

          {/* Quick Statistics in Header */}
          <div className="flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-md p-2 sm:p-3 rounded-2xl border border-white/20">
            <div className="px-3 py-1.5 text-center">
              <span className="block text-xl sm:text-2xl font-black text-white">{grantedPages.length}</span>
              <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">Pages accordées</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="px-3 py-1.5 text-center">
              <span className="block text-xl sm:text-2xl font-black text-emerald-200">{readWriteCount}</span>
              <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">Lecture & Écriture</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="px-3 py-1.5 text-center">
              <span className="block text-xl sm:text-2xl font-black text-teal-200">{readOnlyCount}</span>
              <span className="text-[10px] text-emerald-100 uppercase tracking-wider font-semibold">Lecture seule</span>
            </div>
          </div>
        </div>

        {/* Decorative background shapes */}
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-36 h-36 bg-teal-400/20 rounded-full blur-xl pointer-events-none" />
      </div>

      {/* Account Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          id="btn-tab-granted-pages"
          onClick={() => setActiveSection('pages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'pages'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers size={16} />
          <span>Pages & Droits d'Accès</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
            activeSection === 'pages' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
          }`}>
            {grantedPages.length}
          </span>
        </button>

        <button
          id="btn-tab-profile-info"
          onClick={() => setActiveSection('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'profile'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Informations du Compte</span>
        </button>

        <button
          id="btn-tab-change-pwd"
          onClick={() => setActiveSection('password')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeSection === 'password'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <KeyRound size={16} />
          <span>Sécurité & Mot de passe</span>
        </button>
      </div>

      {/* SECTION 1: GRANTED PAGES & ACCESS PERMISSIONS */}
      {activeSection === 'pages' && (
        <div className="space-y-6">
          {/* Summary Banner & Explanation */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-600" />
                  Pages et Modules Accordés à votre Compte
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Consultez la liste des pages auxquelles vous avez accès, ainsi que votre niveau d'autorisation (Lecture & Écriture ou Lecture Seule).
                </p>
              </div>

              {/* Badges Legend */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <Edit3 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Lecture & Écriture ({readWriteCount})</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 text-xs font-semibold">
                  <Eye className="w-3.5 h-3.5 text-sky-600" />
                  <span>Lecture seule ({readOnlyCount})</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="pt-2 flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Rechercher une page par son nom ou description..."
                  value={pageSearch}
                  onChange={e => setPageSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  onClick={() => setAccessFilter('all')}
                  className={`px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    accessFilter === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tous ({grantedPages.length})
                </button>
                <button
                  onClick={() => setAccessFilter('read_write')}
                  className={`px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    accessFilter === 'read_write'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  Lecture & Écriture ({readWriteCount})
                </button>
                <button
                  onClick={() => setAccessFilter('read_only')}
                  className={`px-3 py-2 rounded-xl font-semibold whitespace-nowrap transition-all ${
                    accessFilter === 'read_only'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                  }`}
                >
                  Lecture seule ({readOnlyCount})
                </button>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPages.map(page => {
              const isReadWrite = page.access_type === 'read_write';
              return (
                <div
                  key={page.path}
                  className={`rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                    isReadWrite
                      ? 'bg-white border-slate-200/90 hover:border-emerald-300 hover:shadow-md'
                      : 'bg-slate-50/70 border-slate-200 hover:border-sky-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Top Type Badge & Category */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">
                        {getCategoryLabel(page.category)}
                      </span>
                      {isReadWrite ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs shrink-0">
                          <Edit3 size={11} className="text-emerald-700" />
                          Lecture & Écriture
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200 shadow-2xs shrink-0">
                          <Eye size={11} className="text-sky-700" />
                          Lecture seule
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 text-base mb-1">
                      {page.label}
                    </h3>

                    {/* Path */}
                    <p className="text-[11px] font-mono text-slate-400 mb-2">
                      {page.path}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      {page.description || 'Module accessible pour la gestion scolaire.'}
                    </p>

                    {/* Permission details pill */}
                    <div className={`p-2.5 rounded-xl text-[11px] font-medium mb-4 ${
                      isReadWrite
                        ? 'bg-emerald-50/70 text-emerald-800 border border-emerald-100'
                        : 'bg-sky-50/70 text-sky-800 border border-sky-100'
                    }`}>
                      {isReadWrite ? (
                        <div className="flex items-center gap-1.5">
                          <Check size={13} className="text-emerald-600 shrink-0" />
                          <span>Plein accès : Consultation, saisie et enregistrement.</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Eye size={13} className="text-sky-600 shrink-0" />
                          <span>Consultation : Données protégées en écriture.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Direct Link button */}
                  <Link
                    to={page.path}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isReadWrite
                        ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                        : 'bg-white text-slate-700 hover:bg-sky-600 hover:text-white border border-slate-200'
                    }`}
                  >
                    <span>Accéder à la page</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              );
            })}
          </div>

          {filteredPages.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700 text-base">Aucune page trouvée</p>
              <p className="text-xs text-slate-500 mt-1">
                Aucune page ne correspond à vos critères de recherche.
              </p>
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: PROFILE & IDENTITY INFO */}
      {activeSection === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck size={18} className="text-emerald-600" />
              Informations d'identification
            </h3>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Nom complet</p>
                <p className="font-semibold text-slate-800">{teacherDetails ? `${teacherDetails.prenom || ''} ${teacherDetails.nom || ''}`.trim() : user?.nom}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Identifiant de connexion / Email</p>
                <p className="font-semibold text-slate-800 break-all select-all">{user?.email}</p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-medium">Rôle attribué dans le système</p>
                <p className="font-semibold text-emerald-700">{getRoleLabel(user?.role)}</p>
              </div>

              {teacherDetails?.telephone && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <Phone size={12} /> Téléphone
                  </p>
                  <p className="font-semibold text-slate-800">{teacherDetails.telephone}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 pb-3 border-b border-slate-100">
              <GraduationCap size={18} className="text-emerald-600" />
              Affectation & Pédagogie
            </h3>

            <div className="space-y-3 text-sm">
              {teacherDetails?.cycle ? (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <GraduationCap size={12} /> Cycle d'enseignement
                  </p>
                  <p className="font-semibold text-slate-800 capitalize">{teacherDetails.cycle}</p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium">Cycle d'enseignement</p>
                  <p className="font-semibold text-slate-700">Primaire & Secondaire</p>
                </div>
              )}

              {teacherDetails?.matieres_nom && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                    <BookOpen size={12} /> Matière(s) enseignée(s)
                  </p>
                  <p className="font-semibold text-slate-800">{teacherDetails.matieres_nom}</p>
                </div>
              )}

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
                <p className="font-bold mb-1">Validation administrative</p>
                <p>Votre compte est actif et géré sous l'autorité du Fondateur et de la Direction de l'établissement.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CHANGE PASSWORD */}
      {activeSection === 'password' && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3 pb-5 border-b border-slate-100 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <KeyRound size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Modifier mon mot de passe</h2>
                <p className="text-xs text-slate-500">
                  Saisissez votre ancien mot de passe puis choisissez un nouveau mot de passe sécurisé.
                </p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-5">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Ancien mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Entrez votre mot de passe actuel"
                    required
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Entrez le nouveau mot de passe (min. 8 caractères)"
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {newPassword && (
                  <PasswordStrengthMeter password={newPassword} />
                )}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Confirmer le nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmez le nouveau mot de passe"
                    required
                    minLength={4}
                    className="w-full px-4 py-3 pr-11 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {newPassword && confirmPassword && (
                  <p className={`text-xs mt-1.5 font-medium flex items-center gap-1 ${
                    newPassword === confirmPassword ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle2 size={13} /> Les mots de passe correspondent
                      </>
                    ) : (
                      'Les mots de passe ne correspondent pas'
                    )}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex flex-col sm:flex-row items-center gap-4 justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                  className="w-full sm:w-auto px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Modification en cours...
                    </>
                  ) : (
                    <>
                      <Lock size={18} />
                      Changer mon mot de passe
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
