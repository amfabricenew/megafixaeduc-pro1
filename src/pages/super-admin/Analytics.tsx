import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  UserMinus, 
  PieChart, 
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOCK_DATA = [
  { name: 'Jan', value: 400, retention: 85, churn: 2 },
  { name: 'Feb', value: 300, retention: 82, churn: 3 },
  { name: 'Mar', value: 600, retention: 88, churn: 1 },
  { name: 'Apr', value: 800, retention: 90, churn: 1.5 },
  { name: 'May', value: 500, retention: 86, churn: 2.5 },
  { name: 'Jun', value: 900, retention: 92, churn: 1.2 },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: BarChart3 },
  { id: 'acquisition', label: 'Acquisition', icon: TrendingUp },
  { id: 'engagement', label: 'Engagement', icon: Users },
  { id: 'retention', label: 'Rétention', icon: PieChart },
  { id: 'churn', label: 'Churn', icon: UserMinus },
];

export default function SuperAdminAnalytics() {
  const [activeTab, setActiveTab] = React.useState('overview');

  const stats = [
    { label: 'Taux de Rétention', value: '88.5%', trend: '+2.4%', up: true, icon: Users },
    { label: 'Taux de Churn', value: '1.8%', trend: '-0.5%', up: false, icon: UserMinus },
    { label: 'Croissance Mensuelle', value: '+15.2%', trend: '+4.1%', up: true, icon: TrendingUp },
    { label: 'LTV Moyen', value: '1.2M FCFA', trend: '+85k', up: true, icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analyses Globales</h1>
          <p className="text-slate-500">Suivi des indicateurs de performance clés du SaaS.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50">
            <Calendar size={18} />
            Derniers 30 jours
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700">
            <Download size={18} />
            Exporter Rapport
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeTab === tab.id 
                ? "bg-white text-indigo-600 shadow-sm" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
                    <stat.icon size={20} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold ${stat.up ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {stat.trend}
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900">Évolution de la Rétention</h3>
                <select className="text-sm border-none bg-slate-50 rounded-lg font-bold text-slate-600">
                  <option>Cohorte Mensuelle</option>
                  <option>Cohorte Hebdomadaire</option>
                </select>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MOCK_DATA}>
                    <defs>
                      <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Area type="monotone" dataKey="retention" stroke="#6366f1" fillOpacity={1} fill="url(#colorRetention)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-slate-900">Répartition par Plan</h3>
                <div className="p-1 bg-slate-100 rounded-lg flex gap-1">
                  <button className="px-3 py-1 bg-white text-xs font-bold rounded-md shadow-sm">Volume</button>
                  <button className="px-3 py-1 text-xs font-bold text-slate-500 rounded-md">Revenu</button>
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Trial', count: 45 },
                    { name: 'Standard', count: 120 },
                    { name: 'Premium', count: 85 },
                    { name: 'Enterprise', count: 12 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {[0, 1, 2, 3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab !== 'overview' && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
            <BarChart3 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Analyse détaillée : {TABS.find(t => t.id === activeTab)?.label}</h3>
          <p className="text-slate-500 max-w-md mt-2">
            Cette section affiche des données approfondies sur {TABS.find(t => t.id === activeTab)?.label.toLowerCase()}.
            Les rapports détaillés et les segmentations seront bientôt disponibles.
          </p>
        </div>
      )}
    </div>
  );
}
