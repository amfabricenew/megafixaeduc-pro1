import React from 'react';
import { 
  Shield, 
  Lock, 
  Database, 
  Activity, 
  Key, 
  Eye, 
  Globe, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Server,
  ShieldCheck
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TABS = [
  { id: 'infrastructure', label: 'Infrastructure', icon: Server },
  { id: 'logs', label: 'Journal d\'activité', icon: Activity },
  { id: 'sessions', label: 'Sessions actives', icon: Clock },
  { id: 'permissions', label: 'Rôles & Permissions', icon: ShieldCheck },
];

export default function SuperAdminSecurity() {
  const [activeTab, setActiveTab] = React.useState('infrastructure');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sécurité & Infrastructure</h1>
          <p className="text-slate-500">Supervisez l'intégrité du système et la protection des données.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg shadow-slate-200">
            <Shield size={18} />
            Audit de Sécurité
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

      {activeTab === 'infrastructure' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <Server size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">État Serveurs</p>
                <h3 className="text-lg font-black text-slate-900">En Ligne</h3>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600">99.9% Uptime</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Dernière Sauvegarde</p>
                <h3 className="text-lg font-black text-slate-900">Il y a 4h</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Automatique</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Lock size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase">Certificats SSL</p>
                <h3 className="text-lg font-black text-slate-900">Valides</h3>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Expirent dans 245j</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Tentatives de Connexion Suspectes</h3>
                <ShieldAlert className="text-rose-500" size={20} />
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {[
                    { ip: '185.23.12.98', location: 'Moscou, RU', date: 'Aujourd\'hui, 04:12', attempts: 15, status: 'blocked' },
                    { ip: '45.122.34.1', location: 'Lagos, NG', date: 'Hier, 22:30', attempts: 3, status: 'monitored' },
                  ].map((attempt, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg text-slate-400 shadow-sm">
                          <Globe size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{attempt.ip}</h4>
                          <p className="text-[10px] text-slate-500 font-medium">{attempt.location} • {attempt.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          attempt.status === 'blocked' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {attempt.status}
                        </span>
                        <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">{attempt.attempts} essais</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Intégrité des Données</h3>
                <CheckCircle2 className="text-emerald-500" size={20} />
              </div>
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  {[
                    { label: 'Chiffrement au repos', status: 'active', desc: 'AES-256 GCM sur toutes les DB' },
                    { label: 'Authentification 2FA', status: 'partial', desc: 'Activé pour 85% des Admins' },
                    { label: 'Audit Logs', status: 'active', desc: 'Conservation pendant 1 an' },
                    { label: 'Firewall (WAF)', status: 'active', desc: 'Cloudflare Proxy actif' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={cn(
                        "p-1 rounded-full mt-0.5",
                        item.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {item.status === 'active' ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{item.label}</h4>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="pt-4 border-t border-slate-100">
                  <button className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    <Shield size={16} />
                    Lancer un scan complet du système
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab !== 'infrastructure' && (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-4">
            <Shield size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-900">Module de Sécurité : {TABS.find(t => t.id === activeTab)?.label}</h3>
          <p className="text-slate-500 max-w-md mt-2">
            La gestion approfondie des {TABS.find(t => t.id === activeTab)?.label.toLowerCase()} est en cours de déploiement.
          </p>
        </div>
      )}
    </div>
  );
}
