import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BellOff,
  BookOpen,
  Building2,
  Calendar,
  CalendarClock,
  Clock,
  GraduationCap,
  Layers,
  Megaphone,
  UserSquare2,
  Users,
  X
} from 'lucide-react';
import { apiFetch } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export interface OnboardingStep {
  key: string;
  priority: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  ctaLabel: string;
  route: string;
  tickerText: string;
  completed: boolean;
  dismissedPermanently: boolean;
  snoozeUntilMs: number;
  accent: string;
}

interface OnboardingStatusResponse {
  eligible: boolean;
  reason?: string;
  schoolId?: number;
  schoolName?: string;
  defaultPasswordChanged?: boolean;
  counts?: Record<string, number>;
  steps: OnboardingStep[];
}

interface LocalStepPref {
  dismissedPermanently?: boolean;
  snoozeUntilMs?: number;
}

const POSTER_AUTO_HIDE_SECONDS = 20;
const SNOOZE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const INTER_POSTER_COOLDOWN_MS = 40 * 1000; // 40 seconds pause before suggesting another distinct step
const TICKER_VISIBLE_DURATION_MS = 45 * 1000; // Visible 45s per cycle
const TICKER_REST_DURATION_MS = 150 * 1000; // Reappears every 2m30s ("de temps en temps")

const ACCENT_STYLES: Record<string, { bar: string; iconBg: string; ctaBg: string; line: string }> = {
  indigo: {
    bar: 'bg-indigo-600',
    iconBg: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    ctaBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    line: 'text-indigo-600 dark:text-indigo-400'
  },
  emerald: {
    bar: 'bg-emerald-600',
    iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    ctaBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    line: 'text-emerald-600 dark:text-emerald-400'
  },
  amber: {
    bar: 'bg-amber-600',
    iconBg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    ctaBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    line: 'text-amber-600 dark:text-amber-400'
  },
  sky: {
    bar: 'bg-sky-600',
    iconBg: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    ctaBg: 'bg-sky-600 hover:bg-sky-700 text-white',
    line: 'text-sky-600 dark:text-sky-400'
  },
  violet: {
    bar: 'bg-violet-600',
    iconBg: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
    ctaBg: 'bg-violet-600 hover:bg-violet-700 text-white',
    line: 'text-violet-600 dark:text-violet-400'
  },
  teal: {
    bar: 'bg-teal-600',
    iconBg: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
    ctaBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    line: 'text-teal-600 dark:text-teal-400'
  },
  blue: {
    bar: 'bg-blue-600',
    iconBg: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    ctaBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    line: 'text-blue-600 dark:text-blue-400'
  },
  orange: {
    bar: 'bg-orange-600',
    iconBg: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
    ctaBg: 'bg-orange-600 hover:bg-orange-700 text-white',
    line: 'text-orange-600 dark:text-orange-400'
  }
};

function getStepIcon(key: string) {
  switch (key) {
    case 'academic_year':
      return Calendar;
    case 'classes':
      return Layers;
    case 'year_planning':
      return CalendarClock;
    case 'school_identity':
      return Building2;
    case 'subjects':
      return BookOpen;
    case 'teachers':
      return UserSquare2;
    case 'students':
      return Users;
    case 'timetable':
      return GraduationCap;
    default:
      return Calendar;
  }
}

function getStorageKey(schoolId?: number, userId?: number) {
  return `megafixa_onboarding_prefs_${schoolId || 0}_${userId || 0}`;
}

function readLocalPrefs(schoolId?: number, userId?: number): Record<string, LocalStepPref> {
  if (!schoolId || !userId) return {};
  try {
    const raw = localStorage.getItem(getStorageKey(schoolId, userId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeLocalPrefs(schoolId: number | undefined, userId: number | undefined, prefs: Record<string, LocalStepPref>) {
  if (!schoolId || !userId) return;
  try {
    localStorage.setItem(getStorageKey(schoolId, userId), JSON.stringify(prefs));
  } catch {
    // ignore storage quota failures
  }
}

export const SchoolOnboardingReminders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [statusData, setStatusData] = React.useState<OnboardingStatusResponse | null>(null);
  const [localPrefs, setLocalPrefs] = React.useState<Record<string, LocalStepPref>>({});
  const [activePosterKey, setActivePosterKey] = React.useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = React.useState<number>(POSTER_AUTO_HIDE_SECONDS);
  const [tickerVisible, setTickerVisible] = React.useState<boolean>(false);

  const globalCooldownUntilRef = React.useRef<number>(0);
  const lastFetchedSchoolRef = React.useRef<number>(0);
  const lastFetchedUserRef = React.useRef<number>(0);

  const localUser = React.useMemo(() => {
    if (user) return user as any;
    try {
      const saved = localStorage.getItem('user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [user]);

  const roleLower = String(localUser?.role || '').toLowerCase();
  const isAdminCandidate = ['admin', 'direction', 'fonde'].includes(roleLower);
  const mustChangeClient =
    localUser?.must_change_password === 1 ||
    localUser?.must_change_password === true ||
    localUser?.is_first_login === 1 ||
    localUser?.is_first_login === true ||
    localUser?.is_first_login === '1';

  const fetchStatus = React.useCallback(async () => {
    if (!localUser?.id || !isAdminCandidate || mustChangeClient) {
      setStatusData(null);
      setActivePosterKey(null);
      setTickerVisible(false);
      return;
    }

    try {
      const res = await apiFetch('/api/school/onboarding-status');
      if (!res.ok) return;
      const data: OnboardingStatusResponse = await res.json();
      setStatusData(data);

      const sId = Number(data.schoolId || localUser?.school_id || localUser?.schoolId || 0);
      const uId = Number(localUser?.id || 0);
      if (sId && uId && (lastFetchedSchoolRef.current !== sId || lastFetchedUserRef.current !== uId)) {
        lastFetchedSchoolRef.current = sId;
        lastFetchedUserRef.current = uId;
        setLocalPrefs(readLocalPrefs(sId, uId));
      }
    } catch {
      // silent non-blocking failure
    }
  }, [localUser?.id, localUser?.school_id, localUser?.schoolId, isAdminCandidate, mustChangeClient]);

  // Initial load + listen to data mutations, route changes, window focus, and periodic status check
  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus, location.pathname, location.search]);

  React.useEffect(() => {
    if (!isAdminCandidate || mustChangeClient) return;

    const handleDataUpdated = () => {
      window.setTimeout(() => {
        fetchStatus();
      }, 250);
    };

    window.addEventListener('app:data-updated', handleDataUpdated);
    window.addEventListener('schoolInfoChanged', handleDataUpdated);
    window.addEventListener('focus', handleDataUpdated);

    const pollInterval = window.setInterval(fetchStatus, 25000);

    return () => {
      window.removeEventListener('app:data-updated', handleDataUpdated);
      window.removeEventListener('schoolInfoChanged', handleDataUpdated);
      window.removeEventListener('focus', handleDataUpdated);
      window.clearInterval(pollInterval);
    };
  }, [fetchStatus, isAdminCandidate, mustChangeClient]);

  const effectiveSteps = React.useMemo(() => {
    if (!statusData?.eligible || !Array.isArray(statusData.steps)) return [];
    return statusData.steps.map((step) => {
      const lp = localPrefs[step.key];
      const dismissedPermanently = Boolean(step.dismissedPermanently || lp?.dismissedPermanently);
      const snoozeUntilMs = Math.max(Number(step.snoozeUntilMs || 0), Number(lp?.snoozeUntilMs || 0));
      return {
        ...step,
        dismissedPermanently,
        snoozeUntilMs
      };
    });
  }, [statusData, localPrefs]);

  const remainingTickerSteps = React.useMemo(
    () => effectiveSteps.filter((s) => !s.completed && !s.dismissedPermanently),
    [effectiveSteps]
  );

  const persistPreference = React.useCallback(
    async (stepKey: string, action: 'snooze_later' | 'dismiss_permanently') => {
      const sId = Number(statusData?.schoolId || localUser?.school_id || localUser?.schoolId || 0);
      const uId = Number(localUser?.id || 0);
      const nextPref: LocalStepPref =
        action === 'dismiss_permanently'
          ? { dismissedPermanently: true, snoozeUntilMs: 0 }
          : { dismissedPermanently: false, snoozeUntilMs: Date.now() + SNOOZE_DURATION_MS };

      setLocalPrefs((prev) => {
        const merged = { ...prev, [stepKey]: { ...(prev[stepKey] || {}), ...nextPref } };
        writeLocalPrefs(sId, uId, merged);
        return merged;
      });

      setStatusData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map((s) =>
            s.key === stepKey
              ? {
                  ...s,
                  dismissedPermanently: nextPref.dismissedPermanently ?? s.dismissedPermanently,
                  snoozeUntilMs: nextPref.snoozeUntilMs ?? s.snoozeUntilMs
                }
              : s
          )
        };
      });

      try {
        await apiFetch('/api/school/onboarding-preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            step_key: stepKey,
            action,
            snooze_minutes: 5
          })
        });
      } catch {
        // local persistence keeps working even if offline momentarily
      }
    },
    [statusData?.schoolId, localUser?.id, localUser?.school_id, localUser?.schoolId]
  );

  const closeAndSnoozeCurrent = React.useCallback(
    (stepKey: string, applyInterCooldown = true) => {
      setActivePosterKey(null);
      if (applyInterCooldown) {
        globalCooldownUntilRef.current = Date.now() + INTER_POSTER_COOLDOWN_MS;
      }
      void persistPreference(stepKey, 'snooze_later');
    },
    [persistPreference]
  );

  const dismissStepPermanently = React.useCallback(
    (stepKey: string) => {
      setActivePosterKey(null);
      globalCooldownUntilRef.current = Date.now() + INTER_POSTER_COOLDOWN_MS;
      void persistPreference(stepKey, 'dismiss_permanently');
    },
    [persistPreference]
  );

  // Close poster immediately if the active step becomes completed or dismissed
  React.useEffect(() => {
    if (!activePosterKey) return;
    const current = effectiveSteps.find((s) => s.key === activePosterKey);
    if (!current || current.completed || current.dismissedPermanently) {
      setActivePosterKey(null);
    }
  }, [activePosterKey, effectiveSteps]);

  // Scheduler loop: check every 5s if a due uncompleted step should appear as the poster card
  const evaluateNextPoster = React.useCallback(() => {
    if (!statusData?.eligible || activePosterKey) return;
    const now = Date.now();
    if (now < globalCooldownUntilRef.current) return;

    const dueStep = effectiveSteps.find(
      (s) => !s.completed && !s.dismissedPermanently && now >= (s.snoozeUntilMs || 0)
    );
    if (dueStep) {
      setSecondsLeft(POSTER_AUTO_HIDE_SECONDS);
      setActivePosterKey(dueStep.key);
    }
  }, [statusData?.eligible, activePosterKey, effectiveSteps]);

  React.useEffect(() => {
    if (!statusData?.eligible) return;

    const initialTimer = window.setTimeout(evaluateNextPoster, 1200);
    const checkTimer = window.setInterval(evaluateNextPoster, 5000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(checkTimer);
    };
  }, [statusData?.eligible, evaluateNextPoster]);

  // 20-second auto-dismiss timer when a poster window is open
  React.useEffect(() => {
    if (!activePosterKey) return;
    setSecondsLeft(POSTER_AUTO_HIDE_SECONDS);

    const tick = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(tick);
          closeAndSnoozeCurrent(activePosterKey, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(tick);
  }, [activePosterKey, closeAndSnoozeCurrent]);

  // Periodic scrolling announcement banner ("Faire de temps en temps des rappel par bande d'annonce défilante")
  const hasTickerItems = Boolean(statusData?.eligible && remainingTickerSteps.length > 0);
  React.useEffect(() => {
    if (!hasTickerItems) {
      setTickerVisible(false);
      return;
    }

    let hideTimeout: number | undefined;
    let cycleInterval: number | undefined;

    const showCycle = () => {
      setTickerVisible(true);
      if (hideTimeout) window.clearTimeout(hideTimeout);
      hideTimeout = window.setTimeout(() => {
        setTickerVisible(false);
      }, TICKER_VISIBLE_DURATION_MS);
    };

    const initialDelay = window.setTimeout(showCycle, 2200);
    cycleInterval = window.setInterval(showCycle, TICKER_VISIBLE_DURATION_MS + TICKER_REST_DURATION_MS);

    return () => {
      window.clearTimeout(initialDelay);
      if (hideTimeout) window.clearTimeout(hideTimeout);
      if (cycleInterval) window.clearInterval(cycleInterval);
    };
  }, [hasTickerItems]);

  const activePoster = React.useMemo(
    () => (activePosterKey ? effectiveSteps.find((s) => s.key === activePosterKey) || null : null),
    [activePosterKey, effectiveSteps]
  );

  if (!isAdminCandidate || mustChangeClient || !statusData?.eligible) {
    return null;
  }

  const remainingCount = remainingTickerSteps.length;
  const completedCount = effectiveSteps.filter((s) => s.completed).length;
  const totalCount = effectiveSteps.length;

  const openStepRoute = (step: OnboardingStep) => {
    setActivePosterKey(null);
    globalCooldownUntilRef.current = Date.now() + INTER_POSTER_COOLDOWN_MS;
    void persistPreference(step.key, 'snooze_later');
    navigate(step.route);
  };

  const accentStyle = activePoster ? ACCENT_STYLES[activePoster.accent] || ACCENT_STYLES.indigo : ACCENT_STYLES.indigo;
  const PosterIcon = activePoster ? getStepIcon(activePoster.key) : Calendar;

  return (
    <>
      {/* Bande d'annonce défilante périodique */}
      {tickerVisible && remainingTickerSteps.length > 0 && (
        <div
          role="region"
          aria-label="Rappels de configuration de l'établissement"
          className="w-full h-9 bg-slate-900 dark:bg-slate-950 text-slate-100 border-b border-slate-800 flex items-center px-3 sm:px-5 gap-3 shrink-0 z-20"
        >
          <div className="flex items-center gap-2 shrink-0 text-amber-400">
            <Megaphone size={14} className="shrink-0" />
            <span className="text-[11px] font-semibold tracking-tight whitespace-nowrap hidden sm:inline">
              Annonce configuration
            </span>
          </div>

          <div className="flex-1 min-w-0 overflow-hidden megafixa-marquee-group">
            <div className="animate-megafixa-marquee items-center text-xs font-medium text-slate-200">
              {[0, 1].map((dupIndex) => (
                <div key={dupIndex} className="flex items-center shrink-0" aria-hidden={dupIndex === 1}>
                  {remainingTickerSteps.map((step) => (
                    <React.Fragment key={`${dupIndex}-${step.key}`}>
                      <button
                        type="button"
                        onClick={() => openStepRoute(step)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-slate-100 hover:text-amber-300 transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:underline"
                        title={`Aller vers : ${step.ctaLabel}`}
                      >
                        <span className="font-semibold text-amber-300">{step.title}</span>
                        <span aria-hidden="true" className="text-slate-500">
                          —
                        </span>
                        <span className="text-slate-300">{step.tickerText}</span>
                        <span className="text-sky-300 underline underline-offset-2 ml-1">{step.ctaLabel}</span>
                      </button>
                      <span aria-hidden="true" className="text-slate-600 px-2 select-none">
                        ·
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!activePoster && remainingTickerSteps[0] && (
              <button
                type="button"
                onClick={() => {
                  setSecondsLeft(POSTER_AUTO_HIDE_SECONDS);
                  setActivePosterKey(remainingTickerSteps[0].key);
                }}
                className="hidden md:inline-flex items-center px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                Afficher l'affiche
              </button>
            )}
            <button
              type="button"
              onClick={() => setTickerVisible(false)}
              aria-label="Masquer la bande d'annonce pour le moment"
              className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Fermer la bande d'annonce"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Petite fenêtre sous forme d'affiche (disparaît après 20s ou fermeture, revient après 5 min) */}
      {activePoster && (
        <aside
          role="dialog"
          aria-live="polite"
          aria-label={activePoster.title}
          className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-[410px] z-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden text-left animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Bande supérieure de l'affiche */}
          <div className={`h-1.5 w-full ${accentStyle.bar}`} />

          {/* Barre de progression du compte à rebours (20s -> 0s) animée par scaleX uniquement */}
          <div className="h-0.5 w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={`h-full w-full origin-left transition-transform duration-1000 ease-linear ${accentStyle.bar}`}
              style={{ transform: `scaleX(${Math.max(0, Math.min(1, secondsLeft / POSTER_AUTO_HIDE_SECONDS))})` }}
            />
          </div>

          <div className="p-5 space-y-4">
            {/* Métadonnées sans pilules (séparateurs typographiques) */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${accentStyle.iconBg}`}>
                  <PosterIcon size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className={`font-semibold ${accentStyle.line}`}>{activePoster.badge}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {completedCount}/{totalCount} configurés
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {statusData.schoolName || 'Votre établissement'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums"
                  title="Fermeture automatique dans 20 secondes"
                >
                  {secondsLeft}s
                </span>
                <button
                  type="button"
                  onClick={() => closeAndSnoozeCurrent(activePoster.key, true)}
                  aria-label="Fermer ce rappel"
                  title="Fermer (reviendra dans 5 min si non créé)"
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Corps éditorial de l'affiche */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug text-balance">
                {activePoster.title}
              </h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {activePoster.subtitle}
              </p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {activePoster.description}
              </p>
            </div>

            {/* Action principale */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <button
                type="button"
                onClick={() => openStepRoute(activePoster)}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${accentStyle.ctaBg}`}
              >
                <span>{activePoster.ctaLabel}</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Pied d'affiche : Me le rappeler plus tard / Ne plus afficher */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => closeAndSnoozeCurrent(activePoster.key, true)}
                className="inline-flex items-center gap-1.5 py-1.5 px-2.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Clock size={13} />
                <span>Me le rappeler plus tard</span>
              </button>

              <button
                type="button"
                onClick={() => dismissStepPermanently(activePoster.key)}
                className="inline-flex items-center gap-1.5 py-1.5 px-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BellOff size={13} />
                <span>Ne plus afficher</span>
              </button>
            </div>

            {remainingCount > 1 && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 tabular-nums">
                {remainingCount} étapes de démarrage restantes · Rappel automatique toutes les 5 min tant que non créé
              </p>
            )}
          </div>
        </aside>
      )}
    </>
  );
};

export default SchoolOnboardingReminders;
