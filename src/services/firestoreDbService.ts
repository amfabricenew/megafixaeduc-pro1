import {
  auth,
  db,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  FIRESTORE_STORAGE_CONFIG,
  FIRESTORE_COLLECTIONS,
  sanitizeFirestoreDocId,
  buildSchoolDocId,
  buildSuperAdminSettingDocId,
  buildPlanDocId,
  buildSchoolRequestDocId,
  buildSchoolSettingDocId,
  buildAppDataDocId,
} from '../lib/firestoreSchema';

const SERVER_ONLY_SECRET_KEYS = new Set([
  'brevo_api_key',
  'smtp_pass',
  'sms_api_key',
  'sms_auth_token',
  'whatsapp_auth_token',
  'whatsapp_api_key',
  'fedapay_secret_key',
  'stripe_secret_key',
  'paypal_secret_key',
  'openai_api_key',
  'system_jwt_secret',
  'cloud_api_key',
  'jwt_secret',
]);

const BOOTSTRAPPED_SUPER_ADMIN_EMAILS = new Set([
  'ayedeguef@gmail.com',
  'amfabricenew@gmail.com',
]);

const SCHOOL_ADMIN_FIRESTORE_ROLES = new Set([
  'super_admin',
  'admin',
  'fonde',
  'direction',
  'directeur',
  'fondateur',
]);

export function isBootstrappedSuperAdminEmail(email?: string | null): boolean {
  return Boolean(email && BOOTSTRAPPED_SUPER_ADMIN_EMAILS.has(email.trim().toLowerCase()));
}

function clampStr(val: unknown, maxLength: number, fallback = ''): string {
  const s = val == null ? fallback : String(val);
  return s.slice(0, maxLength);
}

function sanitizeNestedConfigValue(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    if (value.startsWith('data:image/') && value.length > 150000) {
      return undefined;
    }
    return value.slice(0, 150000);
  }
  if (typeof value !== 'object' || depth > 5) return value;
  if (Array.isArray(value)) {
    return value.slice(0, 200).map((item) => sanitizeNestedConfigValue(item, depth + 1));
  }
  const cleanObj: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SERVER_ONLY_SECRET_KEYS.has(key) || key.endsWith('_secret') || key.endsWith('_api_key')) {
      continue;
    }
    const sanitized = sanitizeNestedConfigValue(val, depth + 1);
    if (sanitized !== undefined) {
      cleanObj[key] = sanitized;
    }
  }
  return cleanObj;
}

export function sanitizeSchoolConfigPayload(configData: Record<string, unknown>): string {
  const sanitized = sanitizeNestedConfigValue(configData ?? {}) as Record<string, unknown>;
  let jsonStr = JSON.stringify(sanitized);
  if (jsonStr.length > 790000) {
    const compact: Record<string, unknown> = {
      schoolInfo: sanitized.schoolInfo && typeof sanitized.schoolInfo === 'object'
        ? { ...(sanitized.schoolInfo as Record<string, unknown>), logo: undefined }
        : undefined,
      notesLock: sanitized.notesLock,
      exportedAt: sanitized.exportedAt,
      schemaVersion: sanitized.schemaVersion,
    };
    jsonStr = JSON.stringify(compact);
  }
  return jsonStr.length <= 800000 ? jsonStr : '{}';
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 64);
}

function assertSignedInAndVerified(): boolean {
  const user = auth.currentUser;
  return Boolean(user && user.uid && user.emailVerified);
}

function safeReportError(
  error: unknown,
  op: OperationType,
  path: string,
  throwOnError = true
): void {
  try {
    handleFirestoreError(error, op, path);
  } catch (wrapped) {
    if (throwOnError) {
      throw wrapped;
    }
  }
}

export interface FirestoreUserProfileInput {
  uid?: string;
  email: string;
  role: string;
  school_id?: number;
  nom?: string;
}

export interface FirestoreSchoolInput {
  id?: number;
  nom: string;
  code_ecole?: string;
  email?: string;
  telephone?: string;
  pays?: string;
  devise?: string;
  plan_abonnement?: string;
  statut_abonnement?: string;
  date_fin_abonnement?: string;
  espace_primaire_actif?: number;
  espace_secondaire_actif?: number;
}

export interface FirestorePlanInput {
  id: number;
  name: string;
  price: number;
  period?: string;
  type?: string;
  color?: string;
  student_limit?: number | null;
  staff_limit?: number | null;
  is_recommended?: boolean | number;
  is_active?: boolean | number;
  features?: string[] | string;
}

export interface FirestoreSchoolRequestInput {
  id?: number;
  reference: string;
  nom_ecole: string;
  email_ecole?: string;
  demandeur_nom?: string;
  demandeur_email?: string;
  plan_souhaite?: string;
  statut: string;
  school_id?: number | null;
}

/**
 * Cloud Firestore Database Management Service
 * Uses database ID `ai-studio-complexescolaire-58020480-d049-4084-942d-a5a7b046898c`
 * to persist user profiles, schools, subscription plans, school creation requests,
 * and platform settings durably across sessions and deployments.
 */
export const firestoreDbService = {
  config: FIRESTORE_STORAGE_CONFIG,
  collections: FIRESTORE_COLLECTIONS,

  async verifyConnection(): Promise<boolean> {
    const path = `${FIRESTORE_COLLECTIONS.test}/connection`;
    try {
      await getDocFromServer(doc(db, FIRESTORE_COLLECTIONS.test, 'connection'));
      return true;
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('the client is offline')) {
        console.error('Please check your Firebase configuration.');
      }
      return false;
    }
  },

  async getUserProfile(uid: string, options: { throwOnError?: boolean } = {}) {
    const cleanUid = sanitizeFirestoreDocId(uid);
    const path = `${FIRESTORE_COLLECTIONS.users}/${cleanUid}`;
    try {
      const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.users, cleanUid));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      safeReportError(error, OperationType.GET, path, options.throwOnError ?? true);
      return null;
    }
  },

  async upsertUserProfile(
    uid: string,
    profile: FirestoreUserProfileInput,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const cleanUid = sanitizeFirestoreDocId(uid);
    const path = `${FIRESTORE_COLLECTIONS.users}/${cleanUid}`;

    const email = clampStr(profile.email, 254).trim().toLowerCase();
    const currentFbEmail = auth.currentUser?.email?.trim().toLowerCase() || '';
    const isSelfBootstrappedAdmin = isBootstrappedSuperAdminEmail(currentFbEmail);
    const requestedRole = clampStr(profile.role || 'user', 40).trim();
    const safeInitialRole = isSelfBootstrappedAdmin ? requestedRole : 'user';
    if (email.length < 3 || safeInitialRole.length < 2) return false;

    const payload: Record<string, any> = {
      uid: cleanUid,
      email,
      role: safeInitialRole,
      updatedAt: nowIso(),
    };
    if (profile.nom && String(profile.nom).trim()) {
      payload.nom = clampStr(profile.nom.trim(), 150);
    }
    if (profile.school_id != null && Number.isFinite(Number(profile.school_id))) {
      payload.school_id = Math.trunc(Number(profile.school_id));
    }

    try {
      const ref = doc(db, FIRESTORE_COLLECTIONS.users, cleanUid);
      const existingSnap = await getDoc(ref).catch(() => null);
      if (existingSnap?.exists()) {
        await updateDoc(ref, {
          ...(payload.nom ? { nom: payload.nom } : {}),
          updatedAt: payload.updatedAt,
        });
      } else {
        await setDoc(ref, payload);
      }
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? false);
      return false;
    }
  },

  async getSchoolRecord(schoolId: number | string, options: { throwOnError?: boolean } = {}) {
    const docId = buildSchoolDocId(schoolId);
    const path = `${FIRESTORE_COLLECTIONS.schools}/${docId}`;
    try {
      const snap = await getDoc(doc(db, FIRESTORE_COLLECTIONS.schools, docId));
      return snap.exists() ? snap.data() : null;
    } catch (error) {
      safeReportError(error, OperationType.GET, path, options.throwOnError ?? true);
      return null;
    }
  },

  async upsertSchoolRecord(
    school: FirestoreSchoolInput,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const schoolIdVal = school.id != null ? Math.trunc(Number(school.id)) : 1;
    const docId = buildSchoolDocId(schoolIdVal);
    const path = `${FIRESTORE_COLLECTIONS.schools}/${docId}`;

    const nom = clampStr(school.nom || `École ${schoolIdVal}`, 200).trim();
    if (!nom) return false;

    const payload: Record<string, any> = {
      id: schoolIdVal,
      nom,
      updatedAt: nowIso(),
    };
    if (school.code_ecole) payload.code_ecole = clampStr(school.code_ecole, 64);
    if (school.email) payload.email = clampStr(school.email, 254);
    if (school.telephone) payload.telephone = clampStr(school.telephone, 40);
    if (school.pays) payload.pays = clampStr(school.pays, 80);
    if (school.devise) payload.devise = clampStr(school.devise, 16);
    if (school.plan_abonnement) payload.plan_abonnement = clampStr(school.plan_abonnement, 80);
    if (school.statut_abonnement) payload.statut_abonnement = clampStr(school.statut_abonnement, 40);
    if (school.date_fin_abonnement) payload.date_fin_abonnement = clampStr(school.date_fin_abonnement, 64);
    if (school.espace_primaire_actif != null) {
      payload.espace_primaire_actif = Math.trunc(Number(school.espace_primaire_actif));
    }
    if (school.espace_secondaire_actif != null) {
      payload.espace_secondaire_actif = Math.trunc(Number(school.espace_secondaire_actif));
    }

    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.schools, docId), payload, { merge: true });
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? true);
      return false;
    }
  },

  async upsertSuperAdminSetting(
    key: string,
    value: unknown,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const cleanKey = clampStr(String(key || '').trim(), 100);
    if (!cleanKey || SERVER_ONLY_SECRET_KEYS.has(cleanKey)) {
      return false;
    }

    const strValue = clampStr(typeof value === 'string' ? value : JSON.stringify(value ?? ''), 200000);
    if (/^[•*]+$/.test(strValue.trim())) {
      return false;
    }

    const docId = buildSuperAdminSettingDocId(cleanKey);
    const path = `${FIRESTORE_COLLECTIONS.superAdminSettings}/${docId}`;

    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.superAdminSettings, docId), {
        key: cleanKey,
        value: strValue,
        is_secret: false,
        updatedAt: nowIso(),
      });
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? true);
      return false;
    }
  },

  async saveSuperAdminSettingsMap(
    settingsMap: Record<string, unknown>,
    options: { throwOnError?: boolean } = {}
  ): Promise<number> {
    if (!assertSignedInAndVerified() || !settingsMap) return 0;
    let saved = 0;
    for (const [k, v] of Object.entries(settingsMap)) {
      if (k.startsWith('has_') || SERVER_ONLY_SECRET_KEYS.has(k)) continue;
      const ok = await this.upsertSuperAdminSetting(k, v, options);
      if (ok) saved++;
    }
    return saved;
  },

  async upsertPlanRecord(
    plan: FirestorePlanInput,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const planId = Math.trunc(Number(plan.id));
    if (!Number.isFinite(planId) || !plan.name) return false;

    const docId = buildPlanDocId(planId);
    const path = `${FIRESTORE_COLLECTIONS.plans}/${docId}`;

    let rawFeatures: string[] = [];
    if (Array.isArray(plan.features)) {
      rawFeatures = plan.features.map((f) => clampStr(f, 120)).filter(Boolean).slice(0, 60);
    } else if (typeof plan.features === 'string' && plan.features.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(plan.features);
        if (Array.isArray(parsed)) {
          rawFeatures = parsed.map((f) => clampStr(f, 120)).filter(Boolean).slice(0, 60);
        }
      } catch {
        rawFeatures = [];
      }
    }

    const payload: Record<string, any> = {
      id: planId,
      name: clampStr(plan.name, 120),
      price: Number(plan.price ?? 0),
      period: clampStr(plan.period || 'mois', 40),
      type: clampStr(plan.type || 'paid', 40),
      color: clampStr(plan.color || 'indigo', 40),
      is_recommended: Boolean(plan.is_recommended),
      is_active: plan.is_active !== undefined ? Boolean(plan.is_active) : true,
      features: rawFeatures,
      updatedAt: nowIso(),
    };
    if (plan.student_limit != null && Number.isFinite(Number(plan.student_limit))) {
      payload.student_limit = Math.trunc(Number(plan.student_limit));
    }
    if (plan.staff_limit != null && Number.isFinite(Number(plan.staff_limit))) {
      payload.staff_limit = Math.trunc(Number(plan.staff_limit));
    }

    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.plans, docId), payload, { merge: true });
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? true);
      return false;
    }
  },

  async upsertSchoolRequestRecord(
    req: FirestoreSchoolRequestInput,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const keyId = req.id != null ? req.id : req.reference;
    if (!keyId || !req.reference || !req.nom_ecole) return false;

    const docId = buildSchoolRequestDocId(keyId);
    const path = `${FIRESTORE_COLLECTIONS.schoolRequests}/${docId}`;

    const payload: Record<string, any> = {
      reference: clampStr(req.reference, 64),
      nom_ecole: clampStr(req.nom_ecole, 200),
      statut: clampStr(req.statut || 'pending', 40),
      updatedAt: nowIso(),
    };
    if (req.id != null && Number.isFinite(Number(req.id))) {
      payload.id = Math.trunc(Number(req.id));
    }
    if (req.email_ecole) payload.email_ecole = clampStr(req.email_ecole, 254);
    if (req.demandeur_nom) payload.demandeur_nom = clampStr(req.demandeur_nom, 150);
    if (req.demandeur_email) payload.demandeur_email = clampStr(req.demandeur_email, 254);
    if (req.plan_souhaite) payload.plan_souhaite = clampStr(req.plan_souhaite, 120);
    if (req.school_id != null && Number.isFinite(Number(req.school_id))) {
      payload.school_id = Math.trunc(Number(req.school_id));
    }

    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.schoolRequests, docId), payload, { merge: true });
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? true);
      return false;
    }
  },

  async canSyncSchoolSettingsWithFirestore(
    schoolId: number | string
  ): Promise<{ canRead: boolean; canWrite: boolean; isSuperAdmin: boolean }> {
    if (!assertSignedInAndVerified() || !auth.currentUser) {
      return { canRead: false, canWrite: false, isSuperAdmin: false };
    }
    if (isBootstrappedSuperAdminEmail(auth.currentUser.email)) {
      return { canRead: true, canWrite: true, isSuperAdmin: true };
    }

    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) {
      return { canRead: false, canWrite: false, isSuperAdmin: false };
    }

    try {
      const profile = await this.getUserProfile(auth.currentUser.uid, { throwOnError: false });
      if (!profile) {
        return { canRead: false, canWrite: false, isSuperAdmin: false };
      }
      const role = String(profile.role || '').trim().toLowerCase();
      if (role === 'super_admin') {
        return { canRead: true, canWrite: true, isSuperAdmin: true };
      }
      const sameSchool = profile.school_id != null && Number(profile.school_id) === numericSchoolId;
      return {
        canRead: sameSchool,
        canWrite: sameSchool && SCHOOL_ADMIN_FIRESTORE_ROLES.has(role),
        isSuperAdmin: false,
      };
    } catch {
      return { canRead: false, canWrite: false, isSuperAdmin: false };
    }
  },

  async getSchoolConfigSnapshot<T = Record<string, any>>(
    schoolId: number | string,
    options: { throwOnError?: boolean; fromServer?: boolean } = {}
  ): Promise<{ school_id: number; data: T; updatedAt: string | null } | null> {
    if (!assertSignedInAndVerified()) return null;
    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return null;

    const docId = buildSchoolSettingDocId(numericSchoolId, 'config');
    const path = `${FIRESTORE_COLLECTIONS.settings}/${docId}`;
    const docRef = doc(db, FIRESTORE_COLLECTIONS.settings, docId);

    try {
      let snap;
      if (options.fromServer !== false) {
        try {
          snap = await getDocFromServer(docRef);
        } catch (serverErr: any) {
          const code = String(serverErr?.code || '');
          if (code === 'permission-denied' || code.includes('permission')) {
            throw serverErr;
          }
          snap = await getDoc(docRef);
        }
      } else {
        snap = await getDoc(docRef);
      }

      if (!snap.exists()) return null;
      const raw = snap.data();
      if (!raw || typeof raw.payload !== 'string') return null;

      try {
        const parsed = JSON.parse(raw.payload) as T;
        return {
          school_id: numericSchoolId,
          data: parsed,
          updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
        };
      } catch {
        return null;
      }
    } catch (error) {
      safeReportError(error, OperationType.GET, path, options.throwOnError ?? true);
      return null;
    }
  },

  async saveSchoolConfigSnapshot(
    schoolId: number | string,
    configData: Record<string, unknown>,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return false;

    const docId = buildSchoolSettingDocId(numericSchoolId, 'config');
    const path = `${FIRESTORE_COLLECTIONS.settings}/${docId}`;
    const payloadStr = sanitizeSchoolConfigPayload(configData);

    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.settings, docId), {
        school_id: numericSchoolId,
        payload: payloadStr,
        status: 'active',
        updatedAt: nowIso(),
      });
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? true);
      return false;
    }
  },

  async saveTenantAppData(
    schoolId: number | string,
    scopeKey: string,
    data: unknown,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return false;

    const docId = buildAppDataDocId(numericSchoolId, scopeKey);
    const path = `${FIRESTORE_COLLECTIONS.appData}/${docId}`;
    const payloadStr = clampStr(typeof data === 'string' ? data : JSON.stringify(data ?? {}), 800000);

    try {
      await setDoc(doc(db, FIRESTORE_COLLECTIONS.appData, docId), {
        school_id: numericSchoolId,
        payload: payloadStr,
        updatedAt: nowIso(),
      });
      return true;
    } catch (error) {
      safeReportError(error, OperationType.WRITE, path, options.throwOnError ?? true);
      return false;
    }
  },

  async deleteDocumentById(
    collectionName: string,
    docId: string,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const cleanId = sanitizeFirestoreDocId(docId);
    const path = `${collectionName}/${cleanId}`;
    try {
      await deleteDoc(doc(db, collectionName, cleanId));
      return true;
    } catch (error) {
      safeReportError(error, OperationType.DELETE, path, options.throwOnError ?? true);
      return false;
    }
  },

  /**
   * Synchronizes normalized school records, subscription plans, school creation requests,
   * and non-secret Super Admin settings into dedicated Cloud Firestore collections.
   */
  async syncNormalizedEntitiesFromVault(
    vault: {
      tables?: {
        school_info?: FirestoreSchoolInput[];
        plans?: FirestorePlanInput[];
        super_admin_settings?: Array<{ key: string; value: string }>;
        school_creation_requests?: FirestoreSchoolRequestInput[];
      };
    },
    options: { throwOnError?: boolean } = {}
  ): Promise<{ schools: number; plans: number; settings: number; requests: number }> {
    const counts = { schools: 0, plans: 0, settings: 0, requests: 0 };
    if (!assertSignedInAndVerified() || !vault?.tables) return counts;

    const {
      school_info = [],
      plans = [],
      super_admin_settings = [],
      school_creation_requests = [],
    } = vault.tables;

    for (const sc of school_info) {
      if (await this.upsertSchoolRecord(sc, { throwOnError: options.throwOnError ?? false })) {
        counts.schools++;
      }
    }

    for (const p of plans) {
      if (await this.upsertPlanRecord(p, { throwOnError: options.throwOnError ?? false })) {
        counts.plans++;
      }
    }

    for (const s of super_admin_settings) {
      if (!s?.key) continue;
      if (await this.upsertSuperAdminSetting(s.key, s.value, { throwOnError: options.throwOnError ?? false })) {
        counts.settings++;
      }
    }

    for (const r of school_creation_requests) {
      if (await this.upsertSchoolRequestRecord(r, { throwOnError: options.throwOnError ?? false })) {
        counts.requests++;
      }
    }

    return counts;
  },

  subscribeToSchoolRecord(
    schoolId: number | string,
    onData: (school: Record<string, any> | null) => void
  ): () => void {
    if (!assertSignedInAndVerified()) return () => {};
    const docId = buildSchoolDocId(schoolId);
    const path = `${FIRESTORE_COLLECTIONS.schools}/${docId}`;
    return onSnapshot(
      doc(db, FIRESTORE_COLLECTIONS.schools, docId),
      (snap) => {
        onData(snap.exists() ? snap.data() : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },

  subscribeToSuperAdminSetting(
    settingKey: string,
    onData: (setting: Record<string, any> | null) => void
  ): () => void {
    if (!assertSignedInAndVerified()) return () => {};
    const docId = buildSuperAdminSettingDocId(settingKey);
    const path = `${FIRESTORE_COLLECTIONS.superAdminSettings}/${docId}`;
    return onSnapshot(
      doc(db, FIRESTORE_COLLECTIONS.superAdminSettings, docId),
      (snap) => {
        onData(snap.exists() ? snap.data() : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, path);
      }
    );
  },
};
