import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Clock, RefreshCw, X, Globe } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface SchoolTimeResponse {
  serverTimestamp: number;
  serverIso: string;
  timezone: string;
  todayDateStr: string;
  currentTimeStr: string;
  currentDayFr: string;
  pays: string | null;
}

export default function DeviceTimeWarningBanner() {
  const [timeInfo, setTimeInfo] = useState<SchoolTimeResponse | null>(null);
  const [mismatchMinutes, setMismatchMinutes] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkDeviceTime = useCallback(async () => {
    setChecking(true);
    try {
      const clientNow = Date.now();
      const res = await apiFetch('/api/school-time');
      if (res.ok) {
        const data: SchoolTimeResponse = await res.json();
        setTimeInfo(data);
        const diffMs = Math.abs(clientNow - data.serverTimestamp);
        const diffMins = Math.round(diffMs / 60000);
        
        // Signal if off by 2 or more minutes
        if (diffMins >= 2) {
          setMismatchMinutes(diffMins);
        } else {
          setMismatchMinutes(null);
        }
      }
    } catch (err) {
      console.warn('Failed to check school server time:', err);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkDeviceTime();
    // Check every 2 minutes
    const interval = setInterval(checkDeviceTime, 120000);
    return () => clearInterval(interval);
  }, [checkDeviceTime]);

  if (dismissed || mismatchMinutes === null || !timeInfo) {
    return null;
  }

  const clientDate = new Date();
  const clientHours = String(clientDate.getHours()).padStart(2, '0');
  const clientMins = String(clientDate.getMinutes()).padStart(2, '0');
  const clientTimeStr = `${clientHours}:${clientMins}`;

  return (
    <div className="mb-6 bg-gradient-to-r from-amber-500 via-amber-600 to-rose-600 rounded-2xl p-4 sm:p-5 text-white shadow-xl border border-amber-300/40 animate-in fade-in slide-in-from-top-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 text-white shadow-inner">
            <AlertTriangle size={24} className="animate-bounce" />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-black text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
                Attention : Date & Heure de votre appareil incorrectes
              </h4>
              <span className="px-2 py-0.5 rounded-full bg-white/25 text-white text-[11px] font-black uppercase tracking-wider">
                Décalage : ~{mismatchMinutes} min
              </span>
            </div>
            <p className="text-xs sm:text-sm text-amber-50 leading-relaxed max-w-3xl">
              L'horloge de votre appareil ne concorde pas avec l'heure officielle de l'établissement. 
              Ce décalage peut <strong>bloquer le démarrage d'un cours</strong> ou provoquer son <strong>verrouillage automatique</strong> prématuré.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-white font-medium">
              <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                <Clock size={14} className="text-amber-200" />
                <span>Heure officielle école : <strong>{timeInfo.currentTimeStr}</strong> ({timeInfo.currentDayFr})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                <Clock size={14} className="text-rose-200" />
                <span>Heure de votre appareil : <strong>{clientTimeStr}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                <Globe size={14} className="text-indigo-200" />
                <span>Fuseau : <strong>{timeInfo.timezone}</strong>{timeInfo.pays ? ` (${timeInfo.pays})` : ''}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => checkDeviceTime()}
            disabled={checking}
            title="Re-vérifier l'heure"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setDismissed(true)}
            title="Masquer l'alerte"
            className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
