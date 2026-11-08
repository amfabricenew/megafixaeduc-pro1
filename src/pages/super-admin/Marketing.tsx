import React from 'react';
import { 
  Megaphone, 
  Target, 
  Users, 
  Ticket, 
  Share2, 
  TrendingUp,
  Mail,
  Send,
  Plus,
  BarChart3
} from 'lucide-react';

export default function SuperAdminMarketing() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Marketing & Acquisition</h1>
          <p className="text-slate-500">Gérez vos campagnes et optimisez la croissance du SaaS.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">
          <Plus size={18} />
          Nouvelle Campagne
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Leads Actifs</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">124</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+18%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Taux de Conversion</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">4.2%</h3>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+0.8%</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Coût Acquisition (CAC)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-black text-slate-900">12,500 FCFA</h3>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">-5%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Campagnes en Cours</h3>
            <button className="text-xs font-bold text-indigo-600 hover:underline">Tout voir</button>
          </div>
          <div className="p-6 space-y-4">
            {[
              { name: 'Rentrée Scolaire 2024', platform: 'Email/Social', spend: '150k', leads: 45, roi: '3.2x' },
              { name: 'Webinaire Direction', platform: 'LinkedIn', spend: '45k', leads: 12, roi: '2.1x' },
              { name: 'Promotion Premium', platform: 'In-app', spend: '0', leads: 67, roi: '∞' },
            ].map((campaign, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{campaign.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-500 font-bold">{campaign.platform}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{campaign.leads} leads acquis</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">{campaign.roi}</p>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase">ROI</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-900">Codes Promotionnels</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl relative overflow-hidden group cursor-pointer">
                <div className="relative z-10">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">CODE ACTIF</p>
                  <h4 className="text-lg font-black text-indigo-600 mt-1">WELCOME20</h4>
                  <p className="text-xs text-indigo-500 mt-1">-20% sur le plan Standard</p>
                </div>
                <Share2 className="absolute -right-2 -bottom-2 text-indigo-100 group-hover:text-indigo-200 transition-all" size={64} />
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 border-dashed rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all cursor-pointer group">
                <Plus size={24} className="mb-1 group-hover:scale-110 transition-all" />
                <span className="text-xs font-bold uppercase tracking-wider text-[10px]">Créer un code</span>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Dernières Utilisations</h4>
              <div className="space-y-3">
                {[
                  { school: 'Collège Horizon', code: 'WELCOME20', date: 'Aujourd\'hui, 10:24' },
                  { school: 'École Saint-Michel', code: 'PROMO2024', date: 'Hier, 16:45' },
                ].map((usage, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="font-medium text-slate-700">{usage.school}</span>
                    </div>
                    <span className="font-bold text-slate-400">{usage.date}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
