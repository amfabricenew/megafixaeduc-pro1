import React from 'react';
import { 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TICKETS = [
  { id: 'TKT-1240', school: 'Complexe Scolaire La Lumière', subject: 'Erreur génération bulletins', priority: 'high', status: 'open', date: 'Il y a 2h' },
  { id: 'TKT-1238', school: 'École Moderne Bénin', subject: 'Problème paiement T-Money', priority: 'medium', status: 'pending', date: 'Il y a 5h' },
  { id: 'TKT-1235', school: 'Lycée Technique du Nord', subject: 'Importation liste élèves', priority: 'low', status: 'closed', date: 'Hier' },
];

export default function SuperAdminSupport() {
  const [activeTab, setActiveTab] = React.useState('tickets');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Centre de Support</h1>
          <p className="text-slate-500">Gérez les demandes d'assistance des établissements.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
          <Plus size={18} />
          Nouveau Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
            <span className="text-xs font-bold text-rose-600">Urgent</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">12</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tickets Ouverts</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock size={20} />
            </div>
            <span className="text-xs font-bold text-amber-600">Moyen</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">8</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Attente</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-xs font-bold text-emerald-600">Traité</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">145</h3>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tickets Résolus (30j)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher par ticket, école..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold">Tous les statuts</button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl"><Filter size={18} /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket / Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sujet / École</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priorité</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TICKETS.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t.id}</p>
                      <p className="text-[10px] text-slate-500">{t.date}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{t.subject}</p>
                      <p className="text-[10px] text-slate-500">{t.school}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      t.priority === 'high' ? "bg-rose-50 text-rose-600" :
                      t.priority === 'medium' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        t.status === 'open' ? "bg-rose-500 animate-pulse" :
                        t.status === 'pending' ? "bg-amber-500" : "bg-emerald-500"
                      )} />
                      <span className="text-xs font-medium text-slate-600 capitalize">{t.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700">
                      Répondre
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
