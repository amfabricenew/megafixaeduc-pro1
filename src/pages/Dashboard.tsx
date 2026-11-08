import { apiFetch } from '../utils/api';
import React from 'react';
import { 
  Users, 
  GraduationCap, 
  School, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  AlertCircle,
  Plus,
  X,
  Trash2,
  BookOpen,
  Building2,
  Calendar,
  ChevronRight,
  Wallet,
  Sparkles,
  LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useConfirm } from '../contexts/ConfirmContext';
import { toast } from 'react-hot-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface DashboardProps {
  cycle?: 'all' | 'primaire' | 'secondaire';
}

export default function Dashboard({ cycle = 'all' }: DashboardProps) {
  const confirm = useConfirm();
  const [stats, setStats] = React.useState<any>({
    elevesCount: 0,
    enseignantsCount: 0,
    classesCount: 0,
    recentPaiements: [],
    monthlyRevenue: 0,
    dailyRevenue: 0,
    weeklyRevenue: 0,
    totalRevenue: 0,
    registrationStats: []
  });
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [alertes, setAlertes] = React.useState<any[]>([]);
  const [showAlertModal, setShowAlertModal] = React.useState(false);
  const [editingAlerte, setEditingAlerte] = React.useState<any>(null);
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const pathPermission = user.permissions?.find((p: any) => (typeof p === 'string' ? p === '/' : p.path === '/'));
  const canWrite = user.role === 'admin' || (pathPermission && (typeof pathPermission === 'object' ? pathPermission.can_write : true));

  const [alerteForm, setAlerteForm] = React.useState({
    titre: '',
    description: '',
    importance: 'normal'
  });

  const [selectedAlerte, setSelectedAlerte] = React.useState<any>(null);
  const [showDetailModal, setShowDetailModal] = React.useState(false);

  const fetchAlertes = () => {
    apiFetch('/api/alertes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setAlertes(data);
        } else {
          setAlertes([]);
        }
      })
      .catch(err => {
        console.warn("Unable to fetch alertes:", err);
        setAlertes([]);
      });
  };

  React.useEffect(() => {
    const cycleParam = cycle && cycle !== 'all' ? `?cycle=${cycle}` : '';
    
    apiFetch(`/api/stats${cycleParam}`)
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setStats(data);
        }
      })
      .catch(err => console.warn("Unable to fetch stats:", err));

    apiFetch(`/api/stats/chart${cycleParam}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setChartData(data);
        }
      })
      .catch(err => console.warn("Unable to fetch chart:", err));

    fetchAlertes();
  }, [cycle]);

  const handleViewDetails = (alerte: any) => {
    setSelectedAlerte(alerte);
    setShowDetailModal(true);
  };

  const handleAlerteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAlerte ? `/api/alertes/${editingAlerte.id}` : '/api/alertes';
    const method = editingAlerte ? 'PUT' : 'POST';

    apiFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alerteForm)
    })
      .then(res => res.json())
      .then(() => {
        toast.success(editingAlerte ? "Alerte modifiée" : "Alerte créée");
        setShowAlertModal(false);
        setEditingAlerte(null);
        setAlerteForm({ titre: '', description: '', importance: 'normal' });
        fetchAlertes();
      })
      .catch(err => {
        console.error("Error saving alerte:", err);
        toast.error("Erreur lors de l'enregistrement de l'alerte");
      });
  };

  const handleEditAlerte = (alerte: any) => {
    setEditingAlerte(alerte);
    setAlerteForm({
      titre: alerte.titre,
      description: alerte.description,
      importance: alerte.importance || 'normal'
    });
    setShowAlertModal(true);
  };

  const handleDeleteAlerte = async (id: number) => {
    const isConfirmed = await confirm({
      title: "Supprimer l'alerte",
      message: "Êtes-vous sûr de vouloir supprimer cette alerte ?",
      confirmText: "Supprimer",
      confirmVariant: "danger"
    });
    if (!isConfirmed) return;

    apiFetch(`/api/alertes/${id}`, { method: 'DELETE' })
      .then(res => res.json())
      .then(() => {
        toast.success("Alerte supprimée");
        fetchAlertes();
      })
      .catch(err => {
        console.error("Error deleting alerte:", err);
        toast.error("Erreur lors de la suppression de l'alerte");
      });
  };

  // Dynamic content depending on cycle
  const headerInfo = {
    all: {
      title: "Tableau de Bord Général",
      subtitle: "Vue d'ensemble consolidée de tous les cycles (Maternelle, Primaire & Secondaire).",
      badge: "Vue Globale de l'Établissement",
      badgeColor: "bg-primary-50 text-primary-700 border-primary-200",
      teacherLabel: "Corps Enseignant (Total)",
      classLabel: "Classes (Tous Cycles)",
      studentLabel: "Élèves (Tous Cycles)",
      paymentLink: "/paiements",
      paymentLabel: "Paiements Scolarité Globaux",
      themeColor: "from-primary-600 to-indigo-700"
    },
    primaire: {
      title: "Tableau de Bord — Maternelle & Primaire",
      subtitle: "Indicateurs pédagogiques, effectifs et finances spécifiques au cycle Maternelle & Primaire.",
      badge: "Espace Maternelle & Primaire",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      teacherLabel: "Maîtres & Maîtresses",
      classLabel: "Classes (Maternelle à CM2)",
      studentLabel: "Élèves (Primaire & Maternelle)",
      paymentLink: "/paiements-primaire",
      paymentLabel: "Paiements Scolarité (Primaire)",
      themeColor: "from-emerald-600 to-teal-700"
    },
    secondaire: {
      title: "Tableau de Bord — Secondaire",
      subtitle: "Indicateurs académiques, effectifs et finances spécifiques au Collège et au Lycée.",
      badge: "Espace Secondaire (Collège & Lycée)",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      teacherLabel: "Professeurs du Secondaire",
      classLabel: "Classes (6ème à Terminale)",
      studentLabel: "Élèves (Secondaire)",
      paymentLink: "/paiements-secondaire",
      paymentLabel: "Paiements Scolarité (Secondaire)",
      themeColor: "from-blue-600 to-indigo-800"
    }
  }[cycle] || {
    title: "Tableau de Bord",
    subtitle: "Bienvenue dans votre espace de gestion.",
    badge: "Espace Scolaire",
    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
    teacherLabel: "Enseignants",
    classLabel: "Classes",
    studentLabel: "Total Élèves",
    paymentLink: "/paiements",
    paymentLabel: "Paiements",
    themeColor: "from-slate-700 to-slate-900"
  };

  return (
    <div className="space-y-8 pb-16 md:pb-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={cn("px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full border", headerInfo.badgeColor)}>
              {headerInfo.badge}
            </span>
            {cycle !== 'all' && (
              <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" /> Données filtrées
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {headerInfo.title}
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            {headerInfo.subtitle}
          </p>
        </div>

        {/* Quick Cycle Navigation Tabs */}
        <div className="flex items-center bg-slate-100/80 p-1.5 rounded-2xl shrink-0 gap-1 self-start md:self-auto">
          <Link
            to="/tableau-de-bord"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
              cycle === 'all' 
                ? "bg-white text-slate-900 shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Tous les Cycles
          </Link>
          <Link
            to="/tableau-de-bord-primaire"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
              cycle === 'primaire' 
                ? "bg-emerald-600 text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Maternelle & Primaire
          </Link>
          <Link
            to="/tableau-de-bord-secondaire"
            className={cn(
              "px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
              cycle === 'secondaire' 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            Secondaire
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title={headerInfo.studentLabel}
          value={stats.elevesCount || 0} 
          icon={Users} 
          subtitle={stats.abandonsCount ? `Actifs (${stats.abandonsCount} abandon${stats.abandonsCount > 1 ? 's' : ''} non compté${stats.abandonsCount > 1 ? 's' : ''})` : "Élèves actifs"}
          color={cycle === 'primaire' ? "bg-emerald-500" : cycle === 'secondaire' ? "bg-blue-500" : "bg-primary-500"}
        />
        <StatCard 
          title={headerInfo.teacherLabel}
          value={stats.enseignantsCount || 0} 
          icon={GraduationCap} 
          subtitle="Affectés à ce cycle"
          color={cycle === 'primaire' ? "bg-teal-500" : cycle === 'secondaire' ? "bg-indigo-500" : "bg-blue-500"}
        />
        <StatCard 
          title={headerInfo.classLabel}
          value={stats.classesCount || 0} 
          icon={School} 
          subtitle="Salles actives"
          color="bg-amber-500"
        />
        <StatCard 
          title="Recouvrement Global" 
          value={`${Number(stats.totalRevenue || 0).toLocaleString()} FCFA`}
          icon={Wallet} 
          subtitle={`Ce mois: ${Number(stats.monthlyRevenue || 0).toLocaleString()} F`}
          color="bg-violet-600"
        />
      </div>

      {/* Charts & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Registration Distribution Chart */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Répartition des Inscriptions</h3>
                <p className="text-xs text-slate-500">Nouveaux vs Anciens élèves inscrits ({headerInfo.badge})</p>
              </div>
              <Link 
                to={headerInfo.paymentLink} 
                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-xl transition-colors"
              >
                Gérer les paiements <ChevronRight size={14} />
              </Link>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 py-2">
              <div className="w-full h-[240px] md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Nouveaux', value: Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Nouveau')?.count || 0 : 0 },
                        { name: 'Anciens', value: Array.isArray(stats.registrationStats) ? (stats.registrationStats.find((s: any) => s.statut === 'Ancien' || s.statut === 'Passant')?.count || 0) : 0 }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full md:w-1/2 space-y-5">
                {[
                  { label: 'Nouveaux Élèves', count: Array.isArray(stats.registrationStats) ? stats.registrationStats.find((s: any) => s.statut === 'Nouveau')?.count || 0 : 0, color: 'bg-blue-500', percent: stats.elevesCount > 0 ? Math.round(((stats as any).registrationStats?.find((s: any) => s.statut === 'Nouveau')?.count || 0) / stats.elevesCount * 100) : 0 },
                  { label: 'Anciens Élèves', count: Array.isArray(stats.registrationStats) ? (stats.registrationStats.find((s: any) => s.statut === 'Ancien' || s.statut === 'Passant')?.count || 0) : 0, color: 'bg-emerald-500', percent: stats.elevesCount > 0 ? Math.round(((stats as any).registrationStats?.find((s: any) => s.statut === 'Ancien' || s.statut === 'Passant')?.count || 0) / stats.elevesCount * 100) : 0 }
                ].map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-sm font-bold text-slate-700">{item.label}</span>
                      </div>
                      <span className="text-sm font-black text-slate-900">{item.count} ({item.percent}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percent}%` }}
                        className={`h-full ${item.color}`}
                      />
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <span>Effectif total calculé</span>
                  <span className="font-bold text-slate-900">{stats.elevesCount || 0} élèves</span>
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          {chartData && chartData.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-100">
              <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider mb-4">Évolution des Encaissements Mensuels ({headerInfo.badge})</h4>
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip 
                      formatter={(val: any) => [`${Number(val).toLocaleString()} FCFA`, 'Paiements']}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="paiements" fill={cycle === 'primaire' ? '#10b981' : cycle === 'secondaire' ? '#3b82f6' : '#6366f1'} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Alerts & Notifications */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Alertes Importantes</h3>
                <p className="text-xs text-slate-500">Messages & notifications du système</p>
              </div>
              {canWrite && (
                <button 
                  onClick={() => { setEditingAlerte(null); setAlerteForm({ titre: '', description: '', importance: 'normal' }); setShowAlertModal(true); }}
                  className="p-2 hover:bg-slate-100 rounded-xl text-primary-600 transition-colors"
                  title="Ajouter une alerte"
                >
                  <Plus size={20} />
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {(Array.isArray(alertes) ? alertes : []).map((alerte: any) => (
                <AlertItem 
                  key={alerte.id}
                  type={alerte.importance === 'high' ? 'error' : alerte.importance === 'medium' ? 'warning' : 'info'} 
                  title={alerte.titre} 
                  desc={alerte.description}
                  isManual={alerte.type === 'manual'}
                  onViewDetails={() => handleViewDetails(alerte)}
                  onEdit={canWrite ? () => handleEditAlerte(alerte) : undefined}
                  onDelete={canWrite ? () => handleDeleteAlerte(alerte.id) : undefined}
                />
              ))}
              {(!Array.isArray(alertes) || alertes.length === 0) && (
                <p className="text-center text-slate-400 text-sm py-12 italic border-2 border-dashed border-slate-100 rounded-3xl">
                  Aucune alerte active pour le moment
                </p>
              )}
            </div>
          </div>
          
          <div className="pt-6 border-t border-slate-100 mt-4">
            <Link 
              to="/alertes" 
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl text-xs font-bold transition-colors"
            >
              Voir toutes les alertes <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Payments for this cycle */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Derniers Paiements Encaissés</h3>
            <p className="text-xs text-slate-500">Transactions récentes associées à ce cycle ({headerInfo.badge})</p>
          </div>
          <Link
            to={headerInfo.paymentLink}
            className="inline-flex items-center gap-2 text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-4 py-2 rounded-xl transition-colors self-start sm:self-auto"
          >
            Accéder à {headerInfo.paymentLabel}
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-black uppercase text-slate-400">
                <th className="pb-3">Date</th>
                <th className="pb-3">Élève</th>
                <th className="pb-3">Classe</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Méthode</th>
                <th className="pb-3 text-right">Montant</th>
                <th className="pb-3 text-center">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {stats.recentPaiements && stats.recentPaiements.length > 0 ? (
                stats.recentPaiements.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 text-xs text-slate-500 font-mono">{p.date_paiement}</td>
                    <td className="py-3 font-bold text-slate-800">{p.nom} {p.prenom}</td>
                    <td className="py-3 text-xs text-slate-600">{p.classe_nom || '-'}</td>
                    <td className="py-3 text-xs font-medium text-slate-600">{p.type_paiement}</td>
                    <td className="py-3 text-xs text-slate-500">{p.methode || 'Espèces'}</td>
                    <td className="py-3 text-right font-black text-slate-900">{Number(p.montant).toLocaleString()} FCFA</td>
                    <td className="py-3 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {p.status || 'Terminé'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic text-sm">
                    Aucun paiement récent enregistré pour ce cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAlerte && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">Détails de l'alerte</h2>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  selectedAlerte.importance === 'high' ? "bg-red-100 text-red-600" :
                  selectedAlerte.importance === 'medium' ? "bg-amber-100 text-amber-600" :
                  "bg-blue-100 text-blue-600"
                )}>
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{selectedAlerte.titre}</h3>
                  <p className="text-sm text-slate-500">Importance: {selectedAlerte.importance.toUpperCase()}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedAlerte.description}</p>
              </div>

              <button 
                onClick={() => setShowDetailModal(false)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerte Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h2 className="text-xl font-bold text-slate-900">{editingAlerte ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</h2>
              <button onClick={() => setShowAlertModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAlerteSubmit} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Titre</label>
                <input 
                  type="text"
                  required
                  value={alerteForm.titre}
                  onChange={e => setAlerteForm({...alerteForm, titre: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ex: Retard de paiement"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Description</label>
                <textarea 
                  required
                  value={alerteForm.description}
                  onChange={e => setAlerteForm({...alerteForm, description: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                  placeholder="Détails de l'alerte..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Importance</label>
                <select 
                  value={alerteForm.importance}
                  onChange={e => setAlerteForm({...alerteForm, importance: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="normal">Normale (Bleu)</option>
                  <option value="medium">Moyenne (Orange)</option>
                  <option value="high">Haute (Rouge)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAlertModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors"
                >
                  {editingAlerte ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, subtitle, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-200 transition-all">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm", color)}>
        <Icon size={26} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider truncate">{title}</p>
        <h4 className="text-2xl font-black text-slate-900 tracking-tight my-0.5 truncate">{value}</h4>
        {subtitle && <p className="text-xs text-slate-500 font-medium truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

function AlertItem({ type, title, desc, isManual, onViewDetails, onEdit, onDelete }: any) {
  const colors = {
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
    error: "bg-red-50 text-red-800 border-red-200"
  };
  return (
    <div className={cn("p-4 rounded-2xl border flex flex-col gap-2 group relative", colors[type as keyof typeof colors])}>
      <div className="flex gap-3 items-start">
        <AlertCircle size={18} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black uppercase tracking-tight">{title}</p>
          <p className="text-xs opacity-90 line-clamp-2 mt-0.5">{desc}</p>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1 pt-2 border-t border-black/5">
        <button 
          onClick={onViewDetails}
          className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-white/70 rounded-lg hover:bg-white transition-colors"
        >
          Voir détails
        </button>
        {isManual && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={onEdit} className="p-1 hover:bg-white/50 rounded text-slate-600">
              <Plus size={14} className="rotate-45" />
            </button>
            <button onClick={onDelete} className="p-1 hover:bg-white/50 rounded text-red-600">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
