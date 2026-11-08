import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  ClipboardList, 
  BookOpenCheck, 
  Library, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  UserCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  School, 
  Sparkles, 
  ChevronRight, 
  FileSpreadsheet,
  Download,
  Eye,
  RefreshCw,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export default function HomeTeacher() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch('/api/teacher/dashboard-data');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching teacher dashboard data:', err);
    } finally {
      setLoading(false);
      if (isManual) {
        setRefreshing(false);
        toast.success('Données actualisées avec succès !');
      }
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const teacher = data?.teacher || user;
  const classes = data?.classes || [];
  const matieres = data?.matieres || [];
  const examStats = data?.examStats || { total: 0, validees: 0, en_attente: 0, rejetees: 0 };
  const todaySchedule = data?.todaySchedule || [];
  const recentExams = data?.exams || [];
  const schoolInfo = data?.schoolInfo;
  const activeYear = data?.activeYear;

  const isPrimary = (teacher?.cycle || user?.cycle || '').toLowerCase().includes('primaire') || 
                    (teacher?.cycle || user?.cycle || '').toLowerCase().includes('maternelle') ||
                    (typeof window !== 'undefined' && localStorage.getItem('activeSpace') === 'primaire') ||
                    classes.some((c: any) => {
                      const nom = (c.nom || '').toLowerCase();
                      const niv = (c.niveau || c.cycle || '').toLowerCase();
                      return ["maternelle", "primaire", "ci", "cp", "ce1", "ce2", "cm1", "cm2", "petite", "moyenne", "grande", "sil"].some(l => nom.includes(l) || niv.includes(l));
                    });
  const isLocked = schoolInfo?.notes_verrouillees === 1 || (isPrimary ? schoolInfo?.notes_verrouillees_primaire === 1 : schoolInfo?.notes_verrouillees_secondaire === 1);

  const actionCards = [
    {
      title: 'Emploi du Temps',
      desc: isPrimary ? 'Consulter le planning officiel de la classe' : 'Consulter mes créneaux, salles et horaires hebdomadaires',
      icon: Calendar,
      path: isPrimary ? '/emploi-du-temps-primaire' : '/emploi-du-temps',
      color: 'from-indigo-600 to-blue-600',
      badge: `${todaySchedule.length} cours aujourd'hui`,
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      title: 'Saisie des Notes',
      desc: 'Évaluations, devoirs, interrogations et moyennes des classes',
      icon: FileSpreadsheet,
      path: '/notes',
      color: 'from-emerald-600 to-teal-600',
      badge: `${classes.length} classes`,
      badgeColor: 'bg-emerald-100 text-emerald-800'
    },
    {
      title: 'Dépôt & Banque d\'Épreuves',
      desc: 'Déposer vos sujets d\'évaluation (Word / PDF) pour validation',
      icon: BookOpenCheck,
      path: '/epreuves',
      color: 'from-violet-600 to-purple-600',
      badge: `${examStats.validees}/${examStats.total} validées`,
      badgeColor: 'bg-violet-100 text-violet-800'
    },
    {
      title: 'Bibliothèque Numérique',
      desc: 'Manuels scolaires officiels, guides et cours numériques',
      icon: Library,
      path: '/bibliotheque',
      color: 'from-amber-600 to-orange-600',
      badge: 'Mode Lecture',
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      title: 'Demandes de Changement EDT',
      desc: 'Signaler une indisponibilité ou solliciter un échange d\'horaire',
      icon: Clock,
      path: '/emploi-du-temps-requests',
      color: 'from-slate-700 to-slate-800',
      badge: 'Direction',
      badgeColor: 'bg-slate-100 text-slate-800'
    },
    {
      title: 'Messagerie & Alertes',
      desc: 'Communications officielles et échanges avec l\'administration',
      icon: MessageSquare,
      path: '/messagerie',
      color: 'from-cyan-600 to-sky-600',
      badge: 'Direct',
      badgeColor: 'bg-cyan-100 text-cyan-800'
    },
    {
      title: 'Documents Administratifs',
      desc: 'Demandes d\'attestations, certificats de travail et autorisations',
      icon: FileText,
      path: '/documents-administratifs',
      color: 'from-blue-600 to-indigo-700',
      badge: 'Demandes',
      badgeColor: 'bg-blue-100 text-blue-800'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Teacher Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-indigo-900/50 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/3 -mb-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4 md:gap-5">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-indigo-500 to-emerald-400 p-0.5 shadow-lg">
                <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl md:text-3xl">
                  {teacher?.nom ? teacher.nom.charAt(0).toUpperCase() : 'E'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-[10px] text-white">
                ✓
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {isPrimary ? '🌿 Cycle Primaire & Maternelle' : '🎓 Cycle Secondaire (Collège / Lycée)'}
                </span>
                {activeYear && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
                    Année : {activeYear.libelle}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Bonjour, {teacher ? `${teacher.nom} ${teacher.prenom || ''}`.trim() : user?.nom} !
              </h1>

              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
                Bienvenue sur votre espace d'enseignement sécurisé. Accédez directement à votre emploi du temps, vos évaluations de classe et déposez vos épreuves officielles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs transition border border-white/10"
              title="Actualiser les données"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>

            <Link
              to="/mon-compte"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-indigo-500/25 transition"
            >
              <UserCheck className="w-4 h-4" />
              <span>Mon Profil</span>
            </Link>
          </div>
        </div>

        {/* Assigned context strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-400">Classes assignées :</span>
            {classes.length > 0 ? (
              classes.map((c: any) => (
                <span key={c.id || c.nom} className="px-2.5 py-1 bg-white/10 text-white rounded-lg font-medium border border-white/10">
                  {c.nom} {c.student_count ? `(${c.student_count} él.)` : ''}
                </span>
              ))
            ) : (
              <span className="italic text-slate-500">Toutes les classes autorisées</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-400">Discipline(s) :</span>
            {matieres.length > 0 ? (
              matieres.map((m: any) => (
                <span key={m.id || m.nom} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg font-medium border border-emerald-500/30">
                  {m.nom}
                </span>
              ))
            ) : (
              <span className="italic text-slate-500">Matières assignées</span>
            )}
          </div>
        </div>
      </div>

      {/* Notes Locked Warning */}
      {isLocked && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-4 text-rose-800 shadow-sm"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Saisie des notes verrouillée</h3>
            <p className="text-xs text-rose-700 mt-0.5 leading-relaxed">
              L'administration a verrouillé la saisie des notes pour le cycle {isPrimary ? 'Primaire & Maternelle' : 'Secondaire'}. 
              Vous ne pouvez plus modifier ou importer de notes sans une permission spéciale.
            </p>
          </div>
        </motion.div>
      )}
 
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Mes Classes</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{classes.length || '—'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Classes attribuées</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Matières</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1">{matieres.length || '—'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Matières enseignées</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Épreuves Déposées</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{examStats.total}</span>
              <span className="text-xs font-bold text-emerald-600">({examStats.validees} validées)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">{examStats.en_attente} en analyse</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <BookOpenCheck className="w-6 h-6" />
          </div>
        </div>
 
        {!isPrimary && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Aujourd'hui</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{todaySchedule.length} séance(s)</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{data?.todayDay || 'Ce jour'}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        )}
      </div>
 
      {/* Main Content Grid: Schedule & Action Cards */}
      <div className={`grid grid-cols-1 ${isPrimary ? 'lg:grid-cols-2' : 'lg:grid-cols-3'} gap-6`}>
        {/* Left Column: Quick Action Cards (2 cols on large) */}
        <div className={`${isPrimary ? 'lg:col-span-1' : 'lg:col-span-2'} space-y-4`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Modules & Actions Pédagogiques
            </h2>
            <span className="text-xs text-slate-500">Accès rapide</span>
          </div>
 
          <div className={`grid grid-cols-1 ${isPrimary ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-4`}>
            {actionCards.map((card, idx) => {
              const Icon = card.icon;
              const notifCount = getUnreadCountForPath(card.path);
              return (
                <Link
                  key={idx}
                  to={card.path}
                  onClick={() => {
                    if (notifCount > 0) {
                      markPathNotificationsAsRead(card.path);
                    }
                  }}
                  className={`group relative bg-white p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                    notifCount > 0 
                      ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200' 
                      : 'border-slate-200/80 hover:border-indigo-300 hover:shadow-md'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {notifCount > 0 && (
                          <span 
                            title={`${notifCount} nouvelle(s) notification(s)`}
                            className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-600 text-white shadow-sm animate-pulse"
                          >
                            {notifCount} nouv.
                          </span>
                        )}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${card.badgeColor}`}>
                          {card.badge}
                        </span>
                      </div>
                    </div>
 
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>
 
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-600 group-hover:text-indigo-700">
                    <span>Ouvrir le module</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
 
          {/* Quick Exam Submission Callout */}
          <div className="p-5 bg-gradient-to-r from-violet-900 to-indigo-900 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/10 rounded-xl">
                <BookOpenCheck className="w-6 h-6 text-violet-300" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Soumettre un sujet d'évaluation</h4>
                <p className="text-xs text-violet-200 mt-0.5">
                  Fichier Word ou PDF transmis directement aux censeurs et directeurs pour analyse.
                </p>
              </div>
            </div>
            <Link
              to="/epreuves"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-violet-950 font-bold rounded-xl text-xs hover:bg-violet-50 transition shrink-0 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Déposer une épreuve
            </Link>
          </div>
        </div>
 
        {/* Right Column: Today's Schedule & Recent Exams */}
        <div className="space-y-6">
          {/* Today's Schedule Widget */}
          {!isPrimary && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Emploi du Temps ({data?.todayDay || 'Aujourd\'hui'})</h3>
                </div>
                <Link to={isPrimary ? "/emploi-du-temps-primaire" : "/emploi-du-temps"} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                  Tout voir
                </Link>
              </div>
 
              {todaySchedule.length > 0 ? (
                <div className="space-y-2.5">
                  {todaySchedule.map((slot: any, sIdx: number) => (
                    <div key={sIdx} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="px-2 py-1 bg-indigo-100 text-indigo-800 font-extrabold text-[11px] rounded-lg">
                          {slot.heure_debut} - {slot.heure_fin}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{slot.matiere_nom || 'Matière'}</p>
                          <p className="text-[11px] text-slate-500">Classe : {slot.classe_nom || '—'}</p>
                        </div>
                      </div>
                      {slot.salle_nom && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md">
                          {slot.salle_nom}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Aucun cours planifié aujourd'hui</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Profitez de votre journée pour préparer vos cours.</p>
                  <Link
                    to={isPrimary ? "/emploi-du-temps-primaire" : "/emploi-du-temps"}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700"
                  >
                    <span>Consulter le planning hebdomadaire</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          )}
 
          {/* Recent Exam Submissions */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-bold text-slate-900">Mes Dernières Épreuves</h3>
              </div>
              <Link to="/epreuves" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                Gérer
              </Link>
            </div>

            {recentExams.length > 0 ? (
              <div className="space-y-2.5">
                {recentExams.slice(0, 4).map((ex: any) => {
                  let statusBadge = (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                      En attente
                    </span>
                  );
                  if (ex.statut === 'validee') {
                    statusBadge = (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                        ✓ Validée
                      </span>
                    );
                  } else if (ex.statut === 'rejetee') {
                    statusBadge = (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                        À corriger
                      </span>
                    );
                  }

                  return (
                    <div key={ex.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{ex.titre}</p>
                        <p className="text-[11px] text-slate-500">
                          {ex.classe_nom} • {ex.matiere_nom}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {statusBadge}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <BookOpenCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Aucune épreuve soumise</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Déposez votre première épreuve pour validation.</p>
                <Link
                  to="/epreuves"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:text-violet-700"
                >
                  <span>Déposer un sujet</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
