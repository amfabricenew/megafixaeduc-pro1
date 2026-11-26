import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useFirebase } from '../contexts/FirebaseContext';
import { firestoreDbService } from '../services/firestoreDbService';

export interface SchoolSettingsExportSnapshot {
  schemaVersion: number;
  exportedAt: string;
  school_id: number;
  schoolInfo: {
    id?: number;
    nom: string;
    slogan?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    site_web?: string;
    numero_enregistrement?: string;
    pays?: string;
    devise?: string;
    logo?: string;
    langue?: string;
    couleur_primaire?: string;
    police?: string;
    taille_police?: number;
    timezone?: string;
    periode_active?: number;
    latitude?: number | null;
    longitude?: number | null;
    geofence_radius?: number;
    code_ecole?: string;
    plan_abonnement?: string;
    statut_abonnement?: string;
    date_fin_abonnement?: string | null;
    espace_primaire_actif?: number;
    espace_secondaire_actif?: number;
  };
  notesLock?: Record<string, unknown> | null;
  academicYears?: Array<{
    id: number;
    libelle: string;
    date_debut?: string;
    date_fin?: string;
    est_active?: number;
    est_active_effective?: boolean | number;
    cloturee?: number;
    archivee?: number;
  }>;
}

export interface SchoolSettingsCloudExporterProps {
  mode?: 'headless' | 'panel';
  intervalMs?: number;
  onRestored?: () => void;
}

const WRITE_ROLES = new Set([
  'super_admin',
  'admin',
  'fonde',
  'direction',
  'directeur',
  'fondateur',
]);

const DEFAULT_EXPORT_INTERVAL_MS = 60_000;
const PERIODIC_CHECKPOINT_AGE_MS = 5 * 60_000;

function stableHash(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getLocalStorageItem(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function setLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // Ignore restricted storage errors
  }
}

function isDefaultSeedSchoolInfo(info: any): boolean {
  if (!info || typeof info !== 'object') return true;
  const nom = String(info.nom || '').trim();
  const hasAddress = Boolean(String(info.adresse || '').trim());
  const hasEmail = Boolean(String(info.email || '').trim());
  const hasPhone = Boolean(String(info.telephone || '').trim());
  return (nom === '' || nom === 'MégafixaEduc') && !hasAddress && !hasEmail && !hasPhone;
}

function isCustomizedSchoolInfo(info: any): boolean {
  if (!info || typeof info !== 'object') return false;
  const nom = String(info.nom || '').trim();
  if (!nom) return false;
  return (
    nom !== 'MégafixaEduc' ||
    Boolean(String(info.adresse || '').trim()) ||
    Boolean(String(info.email || '').trim()) ||
    Boolean(String(info.telephone || '').trim()) ||
    Boolean(String(info.slogan || '').trim())
  );
}

async function fetchCurrentSchoolSettingsSnapshot(
  schoolId: number
): Promise<SchoolSettingsExportSnapshot | null> {
  const token = getLocalStorageItem('token');
  if (!token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const [schoolRes, notesLockRes, yearsRes] = await Promise.all([
    apiFetch('/api/school-info', { headers }),
    apiFetch('/api/notes-lock-status', { headers }).catch(() => null),
    apiFetch('/api/annees', { headers }).catch(() => null),
  ]);

  if (!schoolRes.ok) return null;
  const schoolData = await schoolRes.json().catch(() => null);
  if (!schoolData || schoolData.error || !schoolData.nom) return null;

  const notesLock =
    notesLockRes && notesLockRes.ok ? await notesLockRes.json().catch(() => null) : null;
  const rawYears = yearsRes && yearsRes.ok ? await yearsRes.json().catch(() => []) : [];
  const academicYears = Array.isArray(rawYears)
    ? rawYears.slice(0, 50).map((y: any) => ({
        id: Number(y.id),
        libelle: String(y.libelle || ''),
        date_debut: y.date_debut ? String(y.date_debut) : undefined,
        date_fin: y.date_fin ? String(y.date_fin) : undefined,
        est_active: y.est_active !== undefined ? Number(y.est_active) : undefined,
        est_active_effective: y.est_active_effective,
        cloturee: y.cloturee !== undefined ? Number(y.cloturee) : undefined,
        archivee: y.archivee !== undefined ? Number(y.archivee) : undefined,
      }))
    : [];

  const compactLogo =
    typeof schoolData.logo === 'string' && schoolData.logo.length <= 150000
      ? schoolData.logo
      : undefined;

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    school_id: Number(schoolData.id) || schoolId,
    schoolInfo: {
      id: Number(schoolData.id) || schoolId,
      nom: String(schoolData.nom),
      slogan: schoolData.slogan ?? '',
      adresse: schoolData.adresse ?? '',
      telephone: schoolData.telephone ?? '',
      email: schoolData.email ?? '',
      site_web: schoolData.site_web ?? '',
      numero_enregistrement: schoolData.numero_enregistrement ?? '',
      pays: schoolData.pays ?? '',
      devise: schoolData.devise ?? 'FCFA',
      ...(compactLogo ? { logo: compactLogo } : {}),
      langue: schoolData.langue ?? 'fr',
      couleur_primaire: schoolData.couleur_primaire ?? '#013efb',
      police: schoolData.police ?? 'inter',
      taille_police: Number(schoolData.taille_police) || 16,
      timezone: schoolData.timezone ?? 'Africa/Abidjan',
      periode_active: Number(schoolData.periode_active) || 1,
      latitude: schoolData.latitude ?? null,
      longitude: schoolData.longitude ?? null,
      geofence_radius: Number(schoolData.geofence_radius) || 200,
      code_ecole: schoolData.code_ecole ?? '',
      plan_abonnement: schoolData.plan_abonnement ?? 'standard',
      statut_abonnement: schoolData.statut_abonnement ?? 'actif',
      date_fin_abonnement: schoolData.date_fin_abonnement ?? null,
      espace_primaire_actif:
        schoolData.espace_primaire_actif !== undefined
          ? Number(schoolData.espace_primaire_actif)
          : 1,
      espace_secondaire_actif:
        schoolData.espace_secondaire_actif !== undefined
          ? Number(schoolData.espace_secondaire_actif)
          : 1,
    },
    notesLock,
    academicYears,
  };
}

export async function exportSchoolSettingsToFirestore(
  schoolId: number,
  options: { force?: boolean; throwOnError?: boolean } = {}
): Promise<{ exported: boolean; skipped?: boolean; hash?: string }> {
  const snapshot = await fetchCurrentSchoolSettingsSnapshot(schoolId);
  if (!snapshot) {
    return { exported: false, skipped: true };
  }

  const targetSchoolId = snapshot.school_id || schoolId;
  const comparablePayload = JSON.stringify({
    schoolInfo: snapshot.schoolInfo,
    notesLock: snapshot.notesLock,
    academicYears: snapshot.academicYears,
  });
  const contentHash = stableHash(comparablePayload);

  // Maintain lightweight local backup so theme/settings survive immediate reloads even before cloud sync finishes
  setLocalStorageItem(
    `megafixa_school_settings_backup_${targetSchoolId}`,
    JSON.stringify(snapshot)
  );

  const perms = await firestoreDbService.canSyncSchoolSettingsWithFirestore(targetSchoolId);
  if (!perms.canWrite) {
    return { exported: false, skipped: true, hash: contentHash };
  }

  const hashStorageKey = `megafixa_firestore_settings_hash_${targetSchoolId}`;
  const timeStorageKey = `megafixa_firestore_settings_ts_${targetSchoolId}`;
  const lastHash = getLocalStorageItem(hashStorageKey);
  const lastTs = Number(getLocalStorageItem(timeStorageKey) || '0');
  const elapsed = Date.now() - lastTs;

  if (!options.force && lastHash === contentHash && elapsed < PERIODIC_CHECKPOINT_AGE_MS) {
    return { exported: false, skipped: true, hash: contentHash };
  }

  const saved = await firestoreDbService.saveSchoolConfigSnapshot(
    targetSchoolId,
    snapshot as unknown as Record<string, unknown>,
    { throwOnError: options.throwOnError ?? false }
  );

  if (saved) {
    setLocalStorageItem(hashStorageKey, contentHash);
    setLocalStorageItem(timeStorageKey, String(Date.now()));
  }

  return { exported: saved, hash: contentHash };
}

export const SchoolSettingsCloudExporter: React.FC<SchoolSettingsCloudExporterProps> = ({
  mode = 'headless',
  intervalMs = DEFAULT_EXPORT_INTERVAL_MS,
  onRestored,
}) => {
  const { user } = useAuth();
  const { firebaseReady, firebaseUser } = useFirebase();
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [canCloudWrite, setCanCloudWrite] = useState(false);
  const [, setLastSavedLabel] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const hasReconciledOnBootRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);

  const resolvedUser =
    user ||
    (() => {
      try {
        const raw = getLocalStorageItem('user');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  const schoolId = Number((resolvedUser as any)?.school_id) || 1;
  const userRole = String((resolvedUser as any)?.role || '').toLowerCase();
  const hasServerWriteRole = WRITE_ROLES.has(userRole);

  const restoreToServer = useCallback(
    async (
      remoteInfo: SchoolSettingsExportSnapshot['schoolInfo'],
      notifyUser = false
    ): Promise<boolean> => {
      const token = getLocalStorageItem('token');
      if (!token || !hasServerWriteRole || !remoteInfo?.nom) return false;

      const putRes = await apiFetch('/api/school-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(remoteInfo),
      });

      if (putRes.ok) {
        window.dispatchEvent(new CustomEvent('schoolInfoChanged'));
        onRestored?.();
        if (notifyUser) {
          toast.success("Paramètres de l'école restaurés depuis Cloud Firestore !");
        }
        return true;
      }
      return false;
    },
    [hasServerWriteRole, onRestored]
  );

  const runPeriodicExport = useCallback(
    async (options: { force?: boolean; notify?: boolean } = {}) => {
      if (inFlightRef.current) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (!getLocalStorageItem('token')) return;

      inFlightRef.current = true;
      if (options.notify) setBusy(true);
      try {
        const perms = await firestoreDbService.canSyncSchoolSettingsWithFirestore(schoolId);
        setCanCloudWrite(perms.canWrite);

        // On first hydration after page load/refresh, check if server settings were reset and restore from Firestore
        if (!hasReconciledOnBootRef.current && perms.canRead) {
          hasReconciledOnBootRef.current = true;
          const [currentSnapshot, remoteSnapshot] = await Promise.all([
            fetchCurrentSchoolSettingsSnapshot(schoolId),
            firestoreDbService.getSchoolConfigSnapshot<SchoolSettingsExportSnapshot>(schoolId, {
              throwOnError: false,
            }),
          ]);

          const remoteData: any = remoteSnapshot?.data;
          const remoteSchoolInfo = remoteData?.schoolInfo || (remoteData?.nom ? remoteData : undefined);
          if (
            hasServerWriteRole &&
            remoteSchoolInfo &&
            isCustomizedSchoolInfo(remoteSchoolInfo) &&
            isDefaultSeedSchoolInfo(currentSnapshot?.schoolInfo)
          ) {
            const restored = await restoreToServer(remoteSchoolInfo, false);
            if (restored) {
              setLastSavedLabel(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
              return;
            }
          }
        }

        const result = await exportSchoolSettingsToFirestore(schoolId, {
          force: options.force,
          throwOnError: Boolean(options.notify),
        });

        if (result.exported) {
          setLastSavedLabel(
            new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          );
          if (options.notify) {
            toast.success("Paramètres de l'école sauvegardés dans Cloud Firestore !");
          }
        } else if (options.notify && !perms.canWrite) {
          toast.error(
            'Connectez votre compte Google administrateur autorisé pour exporter vers Cloud Firestore.'
          );
        } else if (options.notify) {
          toast.success('Paramètres déjà synchronisés dans Cloud Firestore.');
        }
      } catch (err: any) {
        if (options.notify) {
          toast.error(err?.message || "Erreur lors de l'exportation vers Cloud Firestore.");
        }
      } finally {
        inFlightRef.current = false;
        if (options.notify) setBusy(false);
      }
    },
    [hasServerWriteRole, restoreToServer, schoolId]
  );

  useEffect(() => {
    hasReconciledOnBootRef.current = false;
  }, [schoolId, firebaseUser?.uid]);

  useEffect(() => {
    if (!firebaseReady || !resolvedUser) return;

    void runPeriodicExport({ force: false });

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void runPeriodicExport({ force: false });
    }, intervalMs);

    const scheduleExport = (delayMs = 400) => {
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        void runPeriodicExport({ force: true });
      }, delayMs);
    };

    const handleSchoolInfoChanged = () => scheduleExport(350);
    const handleYearChanged = () => scheduleExport(350);
    const handleDataUpdated = () => scheduleExport(600);
    const handleVisibilityOrHide = () => {
      if (document.visibilityState === 'hidden') {
        void runPeriodicExport({ force: false });
      }
    };
    const handlePageHide = () => {
      void runPeriodicExport({ force: false });
    };

    window.addEventListener('schoolInfoChanged', handleSchoolInfoChanged);
    window.addEventListener('academic_year_changed', handleYearChanged);
    window.addEventListener('app:data-updated', handleDataUpdated);
    document.addEventListener('visibilitychange', handleVisibilityOrHide);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener('schoolInfoChanged', handleSchoolInfoChanged);
      window.removeEventListener('academic_year_changed', handleYearChanged);
      window.removeEventListener('app:data-updated', handleDataUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityOrHide);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [firebaseReady, firebaseUser?.uid, intervalMs, resolvedUser?.id, runPeriodicExport]);

  const handleManualRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      const snapshot = await firestoreDbService.getSchoolConfigSnapshot<SchoolSettingsExportSnapshot>(
        schoolId,
        { throwOnError: true }
      );
      const remoteData: any = snapshot?.data;
      const remoteInfo = remoteData?.schoolInfo || (remoteData?.nom ? remoteData : undefined);
      if (!remoteInfo) {
        toast.error('Aucune sauvegarde Cloud Firestore trouvée pour cet établissement.');
        return;
      }
      const ok = await restoreToServer(remoteInfo, true);
      if (!ok) {
        toast.error('Impossible de restaurer les paramètres sur le serveur.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la restauration Cloud Firestore.');
    } finally {
      setRestoring(false);
    }
  };

  if (mode === 'headless') {
    return null;
  }

  return (
    <div className="bg-indigo-50/70 p-6 rounded-3xl border border-indigo-100 space-y-4">
      <div className="flex items-start gap-3 text-indigo-900">
        <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 shadow-xs flex items-center justify-center shrink-0">
          <Cloud size={22} />
        </div>
        <div>
          <h4 className="font-bold text-lg leading-tight">
            Sauvegarde Automatique Cloud (SQL & Firestore)
          </h4>
          <p className="text-xs text-indigo-700/80 mt-0.5">
            Réplication automatique et continue par le système sans aucune action manuelle requise.
          </p>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        Les coordonnées, l&apos;identité visuelle, la localisation et les années scolaires de votre
        établissement sont sauvegardées automatiquement par le système à chaque modification et
        répliquées dans le Cloud pour garantir qu&apos;aucune donnée ne soit perdue.
      </p>

      {firebaseUser?.emailVerified && canCloudWrite && hasServerWriteRole && (
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={handleManualRestore}
            disabled={busy || restoring}
            className="px-5 py-3 bg-white text-indigo-700 border border-indigo-200 rounded-2xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
          >
            <RotateCcw size={17} className={restoring ? 'animate-spin' : ''} />
            <span>{restoring ? 'Restauration en cours...' : 'Restaurer les paramètres depuis le Cloud'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SchoolSettingsCloudExporter;
