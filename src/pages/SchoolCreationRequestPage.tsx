import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SchoolCreationRequestModal from '../components/SchoolCreationRequestModal';
import logo from '../LOGO_MEGFIXAEDEUC_PRO.png';

export default function SchoolCreationRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('action') === 'track' ? 'tracking' : 'creation';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-6">
        <img src={logo} alt="MégafixaEduc Pro" className="h-14 mx-auto mb-3 object-contain" />
        <h1 className="text-xl font-black text-white">Adhésion & Ouverture de Compte École</h1>
        <p className="text-xs text-slate-400 mt-1">Plateforme SaaS de Gestion Scolaire Intelligente</p>
      </div>

      <SchoolCreationRequestModal
        isOpen={true}
        onClose={() => navigate('/login')}
        initialMode={initialMode as any}
      />
    </div>
  );
}
