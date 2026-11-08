import React, { useState, useEffect } from 'react';
import { 
  User, 
  GraduationCap, 
  BookOpen, 
  ClipboardList, 
  CreditCard, 
  Calendar, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  FileText, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  Sparkles, 
  ChevronRight, 
  ShieldCheck, 
  School,
  RefreshCw,
  Phone,
  Mail,
  Receipt,
  Download,
  Info
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { apiFetch } from '../utils/api';
import toast from 'react-hot-toast';

export default function HomeParent() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getUnreadCountForPath, markPathNotificationsAsRead } = useNotifications();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  const fetchDashboardData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await apiFetch('/api/parent/dashboard-data');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching parent dashboard data:', err);
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

  const parent = data?.parent || user;
  const children = data?.children || [];
  const selectedChild = children[selectedChildIndex] || children[0] || null;
  const schoolInfo = data?.schoolInfo;
  const activeYear = data?.activeYear;

  const quickActions = [
    {
      title: 'Notes & Bulletins',
      desc: 'Consulter les notes détaillées, devoirs et appréciations',
      icon: ClipboardList,
      path: '/mon-enfant',
      color: 'from-blue-600 to-indigo-600',
      badge: 'Académique'
    },
    {
      title: 'Paiement de la Scolarité',
      desc: 'Règlement sécurisé en ligne (Mobile Money, Carte, FedaPay)',
      icon: CreditCard,
      path: '/mon-enfant',
      color: 'from-emerald-600 to-teal-600',
      badge: selectedChild?.resteAPayer > 0 ? `Reste: ${selectedChild.resteAPayer.toLocaleString()} FCFA` : 'À jour'
    },
    {
      title: 'Emploi du Temps',
      desc: 'Horaires des cours, matières et enseignants par jour',
      icon: Calendar,
      path: '/emploi-du-temps',
      color: 'from-purple-600 to-violet-600',
      badge: 'Planning'
    },
    {
      title: 'Messagerie avec l\'École',
      desc: 'Contacter la direction, le censeur ou les professeurs',
      icon: MessageSquare,
      path: '/messagerie',
      color: 'from-cyan-600 to-sky-600',
      badge: 'Direct'
    },
    {
      title: 'Alertes & Retards',
      desc: 'Suivi de l\'assiduité, présences et notifications officielles',
      icon: AlertCircle,
      path: '/alertes',
      color: 'from-amber-600 to-orange-600',
      badge: `${selectedChild?.totalAbsences || 0} absence(s)`
    },
    {
      title: 'Demande de Documents',
      desc: 'Certificats de scolarité, attestations et reçus officiels',
      icon: FileText,
      path: '/documents-demandes',
      color: 'from-slate-700 to-slate-800',
      badge: 'Secrétariat'
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Parent Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white shadow-xl border border-emerald-900/40 p-6 md:p-8">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-60 h-60 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4 md:gap-5">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-300 p-0.5 shadow-lg">
              <div className="w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl md:text-3xl">
                {parent?.nom ? parent.nom.charAt(0).toUpperCase() : 'P'}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  👨‍👩‍👧 Espace Famille & Suivi Parental
                </span>
                {activeYear && (
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-200 border border-white/10">
                    Année : {activeYear.libelle}
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Bienvenue, {parent?.nom || user?.nom} !
              </h1>

              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
                Suivez en temps réel la scolarité de vos enfants : résultats scolaires, devoirs, assiduité et règlement sécurisé des frais d'inscription et de scolarité.
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
              to="/mon-enfant"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-md transition"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Dossier Scolaire</span>
            </Link>
          </div>
        </div>

        {/* Children selector tab if multiple children */}
        {children.length > 1 && (
          <div className="mt-6 pt-5 border-t border-emerald-800/60 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-emerald-300">Enfants inscrits :</span>
            {children.map((ch: any, idx: number) => (
              <button
                key={ch.id}
                onClick={() => setSelectedChildIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  selectedChildIndex === idx
                    ? 'bg-white text-slate-900 shadow-md scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <span>{ch.prenom} {ch.nom}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${selectedChildIndex === idx ? 'bg-slate-100 text-slate-700' : 'bg-white/10'}`}>
                  {ch.classe_nom}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedChild ? (
        <>
          {/* Selected Child Academic & Financial Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Child Profile Snapshot */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Élève sélectionné</p>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  {selectedChild.prenom} {selectedChild.nom}
                </h3>
                <p className="text-xs font-semibold text-emerald-600 mt-0.5">
                  Classe : {selectedChild.classe_nom || '—'}
                </p>
                <p className="text-[11px] text-slate-400">Matricule : {selectedChild.matricule || '—'}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>

            {/* Academic Performance */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Moyenne Actuelle</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {selectedChild.moyenneActuelle !== null ? `${selectedChild.moyenneActuelle}/20` : '—'}
                  </span>
                  {selectedChild.moyenneActuelle >= 10 && (
                    <span className="text-xs font-bold text-emerald-600">Favorable</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  T1: {selectedChild.moyT1 ?? '—'} | T2: {selectedChild.moyT2 ?? '—'} | T3: {selectedChild.moyT3 ?? '—'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            {/* Financial Status */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Frais de Scolarité</p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedChild.totalPaye?.toLocaleString()} / {selectedChild.totalDu?.toLocaleString()} FCFA
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {selectedChild.resteAPayer === 0 ? (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Totalement réglé
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Reste : {selectedChild.resteAPayer?.toLocaleString()} FCFA
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>

            {/* Attendance & Alerts */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Assiduité & Retards</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">
                  {selectedChild.totalAbsences || 0}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {selectedChild.totalAbsences === 0 ? 'Excellente régularité' : 'Absence(s) enregistrée(s)'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Services & Modules de Suivi
              </h2>
              <span className="text-xs text-slate-500">Accès rapide</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                const notifCount = getUnreadCountForPath(action.path);
                return (
                  <Link
                    key={idx}
                    to={action.path}
                    onClick={() => {
                      if (notifCount > 0) {
                        markPathNotificationsAsRead(action.path);
                      }
                    }}
                    className={`group relative bg-white p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                      notifCount > 0 
                        ? 'border-rose-300 bg-rose-50/40 ring-1 ring-rose-200' 
                        : 'border-slate-200/80 hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${action.color} text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform`}>
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
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            {action.badge}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {action.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                      <span>Accéder au service</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Details Grid: Recent Grades & Payment Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Grades Feed */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900">Dernières Notes Reçues</h3>
                </div>
                <Link to="/mon-enfant" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
                  Consulter tout le relevé
                </Link>
              </div>

              {Array.isArray(selectedChild?.recentNotes) && selectedChild.recentNotes.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedChild.recentNotes.map((note: any) => (
                    <div key={note.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{note.matiere_nom || 'Matière'}</p>
                        <p className="text-[11px] text-slate-500">
                          {note.type_evaluation || 'Évaluation'} • Trimestre {note.trimestre || 1} • Coef: {note.coefficient || 1}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          parseFloat(note.valeur || note.note || 0) >= 10
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {note.valeur || note.note}/20
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Aucune note enregistrée pour le moment</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Les notes publiées par les enseignants apparaîtront ici.</p>
                </div>
              )}
            </div>

            {/* Payments & Tuition status card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-900">Historique des Règlements</h3>
                </div>
                <Link to="/mon-enfant" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
                  Payer en ligne
                </Link>
              </div>

              {Array.isArray(selectedChild?.payments) && selectedChild.payments.length > 0 ? (
                <div className="space-y-2.5">
                  {(selectedChild.payments || []).slice(0, 4).map((pay: any) => (
                    <div key={pay.id} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{pay.type_paiement || 'Frais de scolarité'}</p>
                        <p className="text-[11px] text-slate-500">
                          {pay.date_paiement ? new Date(pay.date_paiement).toLocaleDateString('fr-FR') : '—'} • Réf: {pay.reference || `PAY-${pay.id}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-xs text-emerald-700">
                          +{parseFloat(pay.montant).toLocaleString()} FCFA
                        </span>
                        <p className="text-[10px] text-emerald-600 font-semibold">Validé ✓</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-600">Aucun paiement enregistré</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Effectuez votre premier règlement sécurisé en ligne.</p>
                  <Link
                    to="/mon-enfant"
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                  >
                    <span>Régler la scolarité</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* Empty State if no child found */
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center max-w-lg mx-auto shadow-xs">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">Aucun élève rattaché</h3>
          <p className="text-xs text-slate-500 mt-1">
            Votre compte parent n'est pas encore associé à un élève inscrit. Veuillez contacter le secrétariat de l'école pour finaliser la liaison de votre dossier.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              to="/messagerie"
              className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
            >
              Contacter le secrétariat
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
