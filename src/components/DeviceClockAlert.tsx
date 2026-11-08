import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, RefreshCw, X } from 'lucide-react';
import { apiFetch } from '../utils/api';

export interface ClockInfo {
  timezone: string;
  pays: string;
  dateStr: string;
  timeStr: string;
  dayFr: string;
  serverTimestamp: number;
}

export function useSchoolClock() {
  const [clockInfo, setClockInfo] = useState<ClockInfo | null>(null);
  const [diffMinutes, setDiffMinutes] = useState<number>(0);
  const [isClockMismatch, setIsClockMismatch] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkClock = async () => {
    try {
      const res = await apiFetch('/api/current-time');
      if (res.ok) {
        const data: ClockInfo = await res.json();
        setClockInfo(data);
        const clientNow = Date.now();
        const diffMs = Math.abs(clientNow - data.serverTimestamp);
        const diffMins = Math.round(diffMs / 60000);
        setDiffMinutes(diffMins);
        // Alert if device differs by 5 minutes or more
        setIsClockMismatch(diffMins >= 5);
      }
    } catch (err) {
      console.error('Error fetching school current time:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkClock();
    const interval = setInterval(checkClock, 60000);
    return () => clearInterval(interval);
  }, []);

  return { clockInfo, diffMinutes, isClockMismatch, checkClock, loading };
}

export default function DeviceClockAlert() {
  const { clockInfo, diffMinutes, isClockMismatch, checkClock } = useSchoolClock();
  const [dismissed, setDismissed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!isClockMismatch || dismissed || !clockInfo) {
    return null;
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkClock();
    setRefreshing(false);
  };

  return (
    <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white p-4 rounded-3xl shadow-xl shadow-rose-900/10 border border-rose-400/40 animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 bg-white/20 rounded-2xl shrink-0 backdrop-blur-sm shadow-inner mt-0.5 sm:mt-0">
            <AlertTriangle className="w-5 h-5 text-amber-200 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 bg-white/25 rounded-md">
                Horloge de l'appareil incorrecte
              </span>
              <span className="text-xs font-bold text-amber-200">
                Décalage détecté : ~{diffMinutes} min
              </span>
            </div>
            <p className="text-xs text-white/95 leading-relaxed">
              L'heure de votre appareil ne correspond pas au fuseau horaire de l'école (<strong>{clockInfo.pays}</strong> - {clockInfo.timezone}). 
              Heure officielle établissement : <strong>{clockInfo.dayFr} {clockInfo.timeStr}</strong> ({clockInfo.dateStr}).
            </p>
            <p className="text-[11px] text-white/80">
              Veuillez ajuster la date et l'heure de votre appareil afin d'éviter tout blocage de cours ou calcul de retard erroné.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all backdrop-blur-sm"
            title="Revérifier l'horloge"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            Revérifier
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-all text-white/80 hover:text-white"
            title="Ignorer pour le moment"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
