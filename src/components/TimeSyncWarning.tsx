import React, { useState, useEffect } from 'react';
import { AlertCircle, Clock, RefreshCw, Globe, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function TimeSyncWarning() {
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  const [driftMinutes, setDriftMinutes] = useState<number>(0);
  const [schoolInfo, setSchoolInfo] = useState<{
    time: string;
    date: string;
    timezone: string;
    pays: string;
    dayFr: string;
  } | null>(null);
  const [deviceTimeStr, setDeviceTimeStr] = useState<string>('');
  const [checking, setChecking] = useState(false);

  const checkSync = async () => {
    setChecking(true);
    try {
      const start = Date.now();
      const res = await apiFetch('/api/server-time');
      const end = Date.now();
      
      if (res.ok) {
        const data = await res.json();
        const serverTs = new Date(data.timestamp).getTime();
        const localTs = (start + end) / 2;
        
        // Difference in minutes
        const diffMs = Math.abs(serverTs - localTs);
        const diffMins = Math.round(diffMs / 60000);
        
        // Format device local time in the school's timezone or system time
        const deviceNow = new Date();
        const devTime = deviceNow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const devDate = `${deviceNow.getFullYear()}-${String(deviceNow.getMonth() + 1).padStart(2, '0')}-${String(deviceNow.getDate()).padStart(2, '0')}`;
        
        setDeviceTimeStr(`${devDate} à ${devTime}`);
        setSchoolInfo({
          time: data.time,
          date: data.date,
          timezone: data.timezone || 'UTC',
          pays: data.pays || 'Non défini',
          dayFr: data.dayFr || ''
        });

        // Trigger warning if drift is 5 minutes or more, or if calendar date doesn't match
        const dateMismatch = devDate !== data.date;
        if (diffMins >= 5 || dateMismatch) {
          setIsOutOfSync(true);
          setDriftMinutes(diffMins);
        } else {
          setIsOutOfSync(false);
        }
      }
    } catch (err) {
      console.error('Failed to sync time:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkSync();
    const interval = setInterval(checkSync, 120000); // Check every 2 mins
    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {isOutOfSync && schoolInfo && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white overflow-hidden shadow-lg border-b border-rose-900 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                <AlertTriangle size={20} className="text-amber-300 animate-bounce" />
              </div>
              <div className="text-xs font-semibold leading-snug">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold uppercase tracking-wide text-amber-200">
                    ⚠️ Date / Heure appareil incorrecte
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Écart : ~{driftMinutes} min
                  </span>
                </div>
                <p className="mt-0.5 text-white/90">
                  Heure officielle de l'école ({schoolInfo.pays} - {schoolInfo.timezone}) :{' '}
                  <strong className="text-white underline">{schoolInfo.dayFr} {schoolInfo.date} à {schoolInfo.time}</strong>
                  {' • '}
                  Votre appareil indique : <span className="opacity-90">{deviceTimeStr}</span>
                </p>
                <p className="text-[11px] text-rose-200 mt-0.5">
                  Veuillez corriger l'heure et la date de votre appareil afin d'éviter tout blocage de cours ou incohérence d'émargement.
                </p>
              </div>
            </div>
            <button 
              onClick={checkSync}
              disabled={checking}
              className="self-end sm:self-center flex items-center gap-2 px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
              Re-vérifier
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
