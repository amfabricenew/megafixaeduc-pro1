import React from 'react';
import { 
  Users2, 
  UserPlus, 
  Mail, 
  Shield, 
  MoreVertical, 
  Search,
  Filter,
  CheckCircle2,
  Clock,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TEAM_MEMBERS = [
  { id: 1, name: 'Ayedegue Koffi', email: 'ayedeguef@gmail.com', role: 'Propriétaire', status: 'active', lastActive: 'En ligne' },
  { id: 2, name: 'Marie Dupont', email: 'marie@megafixa.com', role: 'Support Client', status: 'active', lastActive: 'Il y a 2h' },
  { id: 3, name: 'Jean Sossou', email: 'jean@megafixa.com', role: 'Comptable SaaS', status: 'active', lastActive: 'Hier' },
  { id: 4, name: 'Paul Atayi', email: 'paul@megafixa.com', role: 'Développeur', status: 'inactive', lastActive: 'Il y a 5 jours' },
];

export default function SuperAdminTeam() {
  const [activeTab, setActiveTab] = React.useState('members');
  const [showInviteModal, setShowInviteModal] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestion de l'Équipe</h1>
          <p className="text-slate-500">Gérez les collaborateurs ayant accès au back-office SaaS.</p>
        </div>
        <button 
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all"
        >
          <UserPlus size={18} />
          Inviter un membre
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un collaborateur..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <div className="flex gap-2">
            <div className="p-1 bg-slate-100 rounded-lg flex gap-1">
              <button 
                onClick={() => setActiveTab('members')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'members' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Membres
              </button>
              <button 
                onClick={() => setActiveTab('invites')}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-all",
                  activeTab === 'invites' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                Invitations
              </button>
            </div>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl">
              <Filter size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Membre</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rôle</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dernière activité</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {TEAM_MEMBERS.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600 font-black text-xs border-2 border-white shadow-sm">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{member.name}</p>
                        <p className="text-[10px] text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className="text-slate-400" />
                      <span className="text-xs font-medium text-slate-600">{member.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase",
                      member.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {member.status === 'active' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {member.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-slate-500">
                    {member.lastActive}
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                      <MoreVertical size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Inviter un collaborateur</h3>
              <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email de l'invité</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="email" 
                    placeholder="exemple@megafixa.com"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle attribué</label>
                <select className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20">
                  <option>Support Client</option>
                  <option>Comptable SaaS</option>
                  <option>Administrateur Système</option>
                  <option>Marketing</option>
                </select>
              </div>
              <div className="pt-2">
                <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                  <UserPlus size={18} />
                  Envoyer l'invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
