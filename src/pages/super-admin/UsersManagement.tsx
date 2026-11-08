import React from 'react';
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  Plus,
  Clock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOCK_USERS = [
  { 
    id: 1, 
    nom: 'Jean Dupont', 
    email: 'jean.dupont@ecole-excellence.com', 
    role: 'admin', 
    status: 'active', 
    school: 'École Excellence', 
    last_login: 'Il y a 5 min',
    trial: false
  },
  { 
    id: 2, 
    nom: 'Marie Koné', 
    email: 'm.kone@lycee-moderne.edu', 
    role: 'admin', 
    status: 'trial', 
    school: 'Lycée Moderne de la Paix', 
    last_login: 'Il y a 2 heures',
    trial: true
  },
  { 
    id: 3, 
    nom: 'Paul Kouassi', 
    email: 'paul.k@megafixa.com', 
    role: 'super_admin', 
    status: 'active', 
    school: 'Mégafixa HQ', 
    last_login: 'En ligne',
    trial: false
  },
  { 
    id: 4, 
    nom: 'Sophie Bernard', 
    email: 's.bernard@institut-st-joseph.org', 
    role: 'admin', 
    status: 'inactive', 
    school: 'Institut Saint Joseph', 
    last_login: 'Le 10 Sep 2026',
    trial: false
  },
];

export default function UsersManagement() {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/super-admin/users', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(u => 
    u.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.school_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Utilisateurs & Clients</h1>
          <p className="text-slate-500">Gérez les comptes écoles et les administrateurs du système.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
          <Plus size={18} />
          Ajouter un utilisateur
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par nom, email ou école..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-slate-50 border-none rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20">
            <option>Tous les rôles</option>
            <option>Administrateurs</option>
            <option>Super Admins</option>
          </select>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Utilisateur</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">École / Client</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dernière Connexion</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                        {u.nom?.charAt(0) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{u.nom}</p>
                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase",
                      u.role === 'super_admin' ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-600"
                    )}>
                      {u.role === 'super_admin' ? <Shield size={12} /> : null}
                      {u.role === 'super_admin' ? 'Super Admin' : 'Admin École'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {u.school_name || 'Global'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase",
                      "bg-emerald-50 text-emerald-600"
                    )}>
                      <CheckCircle2 size={12} />
                      Actif
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : 'Jamais'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Détails">
                        <ExternalLink size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                        <MoreVertical size={16} />
                      </button>
                    </div>
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
