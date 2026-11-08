import { apiFetch } from '../utils/api';
import React, { useState, useEffect } from 'react';
import { AlertCircle, Check, X, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Alerts() {
  const { years } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string | number>('all');

  useEffect(() => {
    // Fetch alerts from API
    const url = `/api/alertes?annee_id=${selectedYearId}`;
    const timetableUrl = `/api/timetable-requests?annee_id=${selectedYearId}`;

    Promise.all([
      apiFetch(url).then(res => res.json()).catch(() => []),
      apiFetch(timetableUrl).then(res => res.json()).catch(() => [])
    ]).then(([alertsData, requestsData]) => {
      const validAlerts = Array.isArray(alertsData) ? alertsData : [];
      const validRequests = Array.isArray(requestsData) ? requestsData : [];
      const formattedAlerts = validAlerts.map((a: any) => ({
        ...a,
        title: a.title || a.titre,
        message: a.message || a.description
      }));
      const formattedRequests = validRequests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          id: `req-${r.id}`,
          title: `Demande de modification d'emploi du temps`,
          message: `${r.enseignant_nom} ${r.enseignant_prenom}: ${r.description}`,
          type: 'timetable',
          requestId: r.id
        }));
      setAlerts([...formattedAlerts, ...formattedRequests]);
    }).catch(err => {
      console.error(err);
      setAlerts([]);
    });
  }, [selectedYearId]);

  const handleApprove = (alert: any) => {
    if (alert.type === 'timetable') {
      apiFetch(`/api/timetable-requests/${alert.requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      }).then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    } else {
      apiFetch(`/api/alertes/${alert.id}/approve`, { method: 'POST' })
        .then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    }
  };

  const handleRefuse = (alert: any) => {
    if (alert.type === 'timetable') {
      apiFetch(`/api/timetable-requests/${alert.requestId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      }).then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    } else {
      apiFetch(`/api/alertes/${alert.id}/refuse`, { method: 'POST' })
        .then(() => setAlerts(alerts.filter(a => a.id !== alert.id)));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Alertes</h1>
        
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
          <Filter size={16} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Année :</span>
          <select
            value={selectedYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            className="text-sm font-semibold text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer"
          >
            <option value="all">Toutes les années</option>
            {years.map((y: any) => (
              <option key={y.id} value={y.id}>Année {y.libelle} {y.est_active ? '(Active)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((alert: any) => (
          <div key={alert.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="text-amber-500" size={24} />
              <div>
                <h3 className="font-bold text-slate-900">{alert.title}</h3>
                <p className="text-sm text-slate-500">{alert.message}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {['manual', 'timetable'].includes(alert.type) && (
                <>
                  <button onClick={() => handleApprove(alert)} className="p-2 bg-primary-100 text-primary-600 rounded-lg hover:bg-primary-200">
                    <Check size={18} />
                  </button>
                  <button onClick={() => handleRefuse(alert)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200">
                    <X size={18} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
