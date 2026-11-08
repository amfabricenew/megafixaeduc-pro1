import React from 'react';
import TeacherPayments from '../components/TeacherPayments';
import { apiFetch } from '../utils/api';

export default function TeacherSalaries() {
  const [schoolInfo, setSchoolInfo] = React.useState<any>(null);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    apiFetch('/api/school-info', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => setSchoolInfo(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Salaires Enseignants</h1>
          <p className="text-slate-500">Gestion des paies fixes (Primaire) et bilans d'heures (Secondaire)</p>
        </div>
      </div>

      <TeacherPayments schoolInfo={schoolInfo} />
    </div>
  );
}
