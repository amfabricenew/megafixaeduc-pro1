import React, { useState, useEffect } from 'react';
import { Lock, Unlock, AlertCircle, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface FeatureLockInfo {
  feature_key: string;
  is_locked: boolean;
  reason?: string;
  updated_at?: string;
}

interface FeatureLockBannerProps {
  featureKey: string;
  label: string;
  onLockStatusChange?: (isLocked: boolean) => void;
}

export default function FeatureLockBanner({ featureKey, label, onLockStatusChange }: FeatureLockBannerProps) {
  const { user } = useAuth();
  const [lockInfo, setLockInfo] = useState<FeatureLockInfo>({
    feature_key: featureKey,
    is_locked: false,
    reason: ''
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isFondeOrAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'fonde';

  const fetchLockStatus = async () => {
    try {
      const res = await apiFetch(`/api/feature-locks/${featureKey}`);
      if (res.ok) {
        const data = await res.json();
        setLockInfo(data);
        if (onLockStatusChange) {
          onLockStatusChange(Boolean(data.is_locked));
        }
      }
    } catch (e) {
      console.warn('Feature lock check error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLockStatus();
  }, [featureKey]);

  const handleToggleLock = async () => {
    if (!isFondeOrAdmin) return;
    setUpdating(true);
    const newStatus = !lockInfo.is_locked;

    try {
      const res = await apiFetch(`/api/feature-locks/${featureKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_locked: newStatus ? 1 : 0,
          reason: newStatus ? `Modifications suspendues par le Fondé / la Direction (${new Date().toLocaleDateString('fr-FR')})` : ''
        })
      });

      if (res.ok) {
        setLockInfo(prev => ({
          ...prev,
          is_locked: newStatus,
          reason: newStatus ? 'Modifications suspendues par le Fondé / la Direction' : ''
        }));
        if (onLockStatusChange) {
          onLockStatusChange(newStatus);
        }
        toast.success(newStatus ? `Fonctionnalité "${label}" momentanément fermée` : `Fonctionnalité "${label}" ouverte aux modifications`);
      } else {
        toast.error('Erreur lors du changement de statut');
      }
    } catch (e) {
      toast.error('Erreur de communication avec le serveur');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return null;

  // If unlocked and user is not admin, we can display a discreet indicator or nothing
  if (!lockInfo.is_locked && !isFondeOrAdmin) {
    return (
      <div className="mb-4 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium">Statut d'écriture :</span>
          <span className="font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px]">
            🟢 Ouvert aux modifications
          </span>
        </div>
        <span className="text-[11px] text-emerald-600 hidden sm:inline">
          Vous êtes autorisé à ajouter et modifier des données
        </span>
      </div>
    );
  }

  // If locked, show high-visibility warning banner
  if (lockInfo.is_locked) {
    return (
      <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-700 rounded-xl flex-shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 bg-amber-500 text-white font-black text-[11px] uppercase tracking-wider rounded-md flex items-center gap-1 shadow-sm">
                <Lock className="w-3 h-3" />
                Momentanément fermé
              </span>
              <h4 className="font-bold text-sm text-amber-950">
                {label} — Modifications temporairement suspendues
              </h4>
            </div>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              {lockInfo.reason || 'Cette fonctionnalité a été temporairement verrouillée en écriture par le Fondé / la Direction. Les données restent consultables en lecture seule.'}
            </p>
          </div>
        </div>

        {isFondeOrAdmin && (
          <button
            type="button"
            disabled={updating}
            onClick={handleToggleLock}
            className="flex-shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {updating ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>Ouvrir l'accès en écriture</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // If unlocked and user IS Admin/Fondé, show admin control bar
  return (
    <div className="mb-4 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="font-medium text-slate-600">Autorisation d'écriture ({label}) :</span>
        <span className="font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px]">
          🟢 Ouvert
        </span>
      </div>

      <button
        type="button"
        disabled={updating}
        onClick={handleToggleLock}
        className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/60 font-bold text-[11px] rounded-lg transition-all flex items-center gap-1.5"
        title="Fermer temporairement la modification pour les enseignants et le personnel"
      >
        {updating ? (
          <span className="w-3 h-3 border-2 border-amber-800 border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Lock className="w-3 h-3" />
            <span>Fermer momentanément</span>
          </>
        )}
      </button>
    </div>
  );
}
