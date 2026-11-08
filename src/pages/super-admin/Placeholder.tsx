import React from 'react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminPlaceholder({ title }: { title: string }) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 mb-6">
        <Construction size={40} />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-500 text-center max-w-md mb-8">
        Cette section du back-office super-admin est en cours de développement. 
        Elle permettra de gérer les {title.toLowerCase()} de la plateforme.
      </p>
      <button 
        onClick={() => navigate('/super-admin')}
        className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all"
      >
        <ArrowLeft size={18} />
        Retour au tableau de bord
      </button>
    </div>
  );
}
