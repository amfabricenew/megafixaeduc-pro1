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
  testFirestoreConnection,
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
  buildClassDocId,
  buildStudentDocId,
  buildGradeDocId,
  buildAppDataDocId,
} from '../lib/firestoreSchema';
import { apiFetch } from '../utils/api';

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

const operationalDomainHashes = new Map<string, string>();
const operationalDomainLastPushTs = new Map<string, number>();

function fastDigest(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function getLocalStorageStr(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function sanitizeArrayPayload(items: unknown[], maxJsonBytes = 760000): string {
  if (!Array.isArray(items)) return '[]';
  const cleaned = items.slice(0, 1500).map((item) => sanitizeNestedConfigValue(item, 0));
  let jsonStr = JSON.stringify(cleaned);
  if (jsonStr.length <= maxJsonBytes) return jsonStr;

  // Progressively trim large base64 photos or heavy fields if payload approaches 800KB limit
  const compact = cleaned.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...(item as Record<string, unknown>) };
    if (typeof copy.photo === 'string' && copy.photo.length > 256) {
      delete copy.photo;
    }
    if (typeof copy.logo === 'string' && copy.logo.length > 256) {
      delete copy.logo;
    }
    return copy;
  });
  jsonStr = JSON.stringify(compact);
  if (jsonStr.length <= maxJsonBytes) return jsonStr;

  // Binary trim array count to stay safely under Firestore document limit
  let keep = compact.length;
  while (keep > 1 && jsonStr.length > maxJsonBytes) {
    keep = Math.floor(keep * 0.75);
    jsonStr = JSON.stringify(compact.slice(0, keep));
  }
  return jsonStr.length <= maxJsonBytes ? jsonStr : '[]';
}

/**
 * Cloud Firestore Primary Database Management Service
 * Uses database ID `ai-studio-complexescolaire-58020480-d049-4084-942d-a5a7b046898c`
 * as the primary persistence layer for user profiles, schools, subscription plans,
 * school requests, platform settings, classes, students, grades, and operational state.
 */
export const firestoreDbService = {
  config: FIRESTORE_STORAGE_CONFIG,
  collections: FIRESTORE_COLLECTIONS,

  async verifyConnection(): Promise<boolean> {
    return testFirestoreConnection();
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
    if (!cleanUid || cleanUid.length > 128) return false;
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
        if (isSelfBootstrappedAdmin) {
          await updateDoc(ref, {
            email: payload.email,
            role: payload.role,
            ...(payload.school_id !== undefined ? { school_id: payload.school_id } : {}),
            ...(payload.nom ? { nom: payload.nom } : {}),
            updatedAt: payload.updatedAt,
          });
        } else {
          await updateDoc(ref, {
            ...(payload.nom ? { nom: payload.nom } : {}),
            updatedAt: payload.updatedAt,
          });
        }
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

    const currentEmail = auth.currentUser?.email?.trim().toLowerCase() || '';
    const isSuper = isBootstrappedSuperAdminEmail(currentEmail);

    const payload: Record<string, any> = {
      id: schoolIdVal,
      nom,
      updatedAt: nowIso(),
    };
    if (school.email) payload.email = clampStr(school.email, 254);
    if (school.telephone) payload.telephone = clampStr(school.telephone, 40);
    if (school.pays) payload.pays = clampStr(school.pays, 80);
    if (school.devise) payload.devise = clampStr(school.devise, 16);

    if (isSuper) {
      if (school.code_ecole) payload.code_ecole = clampStr(school.code_ecole, 64);
      if (school.plan_abonnement) payload.plan_abonnement = clampStr(school.plan_abonnement, 80);
      if (school.statut_abonnement) payload.statut_abonnement = clampStr(school.statut_abonnement, 40);
      if (school.date_fin_abonnement) payload.date_fin_abonnement = clampStr(school.date_fin_abonnement, 64);
      if (school.espace_primaire_actif != null) {
        payload.espace_primaire_actif = Math.trunc(Number(school.espace_primaire_actif));
      }
      if (school.espace_secondaire_actif != null) {
        payload.espace_secondaire_actif = Math.trunc(Number(school.espace_secondaire_actif));
      }
    }

    try {
      const docRef = doc(db, FIRESTORE_COLLECTIONS.schools, docId);
      if (isSuper) {
        await setDoc(docRef, payload, { merge: true });
        return true;
      }
      // School admin can only update allowed mutable fields when the school document already exists
      const existing = await getDoc(docRef).catch(() => null);
      if (!existing?.exists()) return false;
      const updateFields: Record<string, any> = {
        nom: payload.nom,
        updatedAt: payload.updatedAt,
      };
      if (payload.email !== undefined) updateFields.email = payload.email;
      if (payload.telephone !== undefined) updateFields.telephone = payload.telephone;
      if (payload.pays !== undefined) updateFields.pays = payload.pays;
      if (payload.devise !== undefined) updateFields.devise = payload.devise;
      await updateDoc(docRef, updateFields);
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

  async getTenantAppData<T = Record<string, any>>(
    schoolId: number | string,
    scopeKey: string,
    options: { throwOnError?: boolean; fromServer?: boolean } = {}
  ): Promise<{ school_id: number; data: T; updatedAt: string | null } | null> {
    if (!assertSignedInAndVerified()) return null;
    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return null;

    const docId = buildAppDataDocId(numericSchoolId, scopeKey);
    const path = `${FIRESTORE_COLLECTIONS.appData}/${docId}`;
    const docRef = doc(db, FIRESTORE_COLLECTIONS.appData, docId);

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
        return {
          school_id: numericSchoolId,
          data: JSON.parse(raw.payload) as T,
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
    const sanitized =
      typeof data === 'string'
        ? data
        : JSON.stringify(sanitizeNestedConfigValue(data ?? {}, 0));
    const payloadStr = clampStr(sanitized, 790000);

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

  async getScopedCollectionSnapshot<T = any[]>(
    collectionName: 'classes' | 'students' | 'grades',
    schoolId: number | string,
    docId: string,
    options: { throwOnError?: boolean; fromServer?: boolean } = {}
  ): Promise<{ school_id: number; data: T; updatedAt: string | null } | null> {
    if (!assertSignedInAndVerified()) return null;
    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return null;

    const cleanId = sanitizeFirestoreDocId(docId);
    const path = `${collectionName}/${cleanId}`;
    const docRef = doc(db, collectionName, cleanId);

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
        return {
          school_id: numericSchoolId,
          data: JSON.parse(raw.payload) as T,
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

  async saveScopedCollectionSnapshot(
    collectionName: 'classes' | 'students' | 'grades',
    schoolId: number | string,
    docId: string,
    items: unknown,
    options: { throwOnError?: boolean } = {}
  ): Promise<boolean> {
    if (!assertSignedInAndVerified()) return false;
    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return false;

    const cleanId = sanitizeFirestoreDocId(docId);
    const path = `${collectionName}/${cleanId}`;
    const payloadStr = Array.isArray(items)
      ? sanitizeArrayPayload(items, 780000)
      : clampStr(JSON.stringify(sanitizeNestedConfigValue(items ?? {}, 0)), 780000);

    try {
      await setDoc(doc(db, collectionName, cleanId), {
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

  async syncSchoolOperationalDomainToFirestore(
    schoolId: number | string,
    options: { force?: boolean; throwOnError?: boolean } = {}
  ): Promise<{ syncedSlices: number; skippedSlices: number }> {
    const result = { syncedSlices: 0, skippedSlices: 0 };
    if (!assertSignedInAndVerified()) return result;
    const token = getLocalStorageStr('token');
    if (!token) return result;

    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return result;

    const perms = await this.canSyncSchoolSettingsWithFirestore(numericSchoolId);
    if (!perms.canWrite) return result;

    const headers = { Authorization: `Bearer ${token}` };
    const snapRes = await apiFetch('/api/school/firestore-snapshot', { headers }).catch(() => null);
    if (!snapRes || !snapRes.ok) return result;
    const snapData = await snapRes.json().catch(() => null);
    if (!snapData || !snapData.success) return result;

    const schoolInfo = snapData.schoolInfo || null;
    const classes = Array.isArray(snapData.classes) ? snapData.classes : [];
    const students = Array.isArray(snapData.students) ? snapData.students : [];
    const teachers = Array.isArray(snapData.enseignants) ? snapData.enseignants : [];
    const subjects = Array.isArray(snapData.matieres) ? snapData.matieres : [];
    const years = Array.isArray(snapData.academicYears) ? snapData.academicYears : [];
    const grades = Array.isArray(snapData.grades) ? snapData.grades : [];

    const now = Date.now();
    const shouldPush = (sliceKey: string, digest: string): boolean => {
      const mapKey = `${numericSchoolId}:${sliceKey}`;
      const lastHash = operationalDomainHashes.get(mapKey);
      const lastTs = operationalDomainLastPushTs.get(mapKey) || 0;
      if (!options.force && lastHash === digest && now - lastTs < 300_000) {
        return false;
      }
      return true;
    };
    const markPushed = (sliceKey: string, digest: string) => {
      const mapKey = `${numericSchoolId}:${sliceKey}`;
      operationalDomainHashes.set(mapKey, digest);
      operationalDomainLastPushTs.set(mapKey, Date.now());
    };

    if (schoolInfo && schoolInfo.nom) {
      const schoolDigest = fastDigest(JSON.stringify({
        nom: schoolInfo.nom,
        email: schoolInfo.email,
        telephone: schoolInfo.telephone,
        pays: schoolInfo.pays,
        devise: schoolInfo.devise,
      }));
      if (shouldPush('school', schoolDigest)) {
        const ok = await this.upsertSchoolRecord(
          {
            id: numericSchoolId,
            nom: schoolInfo.nom,
            code_ecole: schoolInfo.code_ecole,
            email: schoolInfo.email,
            telephone: schoolInfo.telephone,
            pays: schoolInfo.pays,
            devise: schoolInfo.devise,
            plan_abonnement: schoolInfo.plan_abonnement,
            statut_abonnement: schoolInfo.statut_abonnement,
            date_fin_abonnement: schoolInfo.date_fin_abonnement,
            espace_primaire_actif: schoolInfo.espace_primaire_actif,
            espace_secondaire_actif: schoolInfo.espace_secondaire_actif,
          },
          { throwOnError: false }
        );
        if (ok) {
          markPushed('school', schoolDigest);
          result.syncedSlices++;
        }
      } else {
        result.skippedSlices++;
      }
    }

    if (classes.length > 0 || shouldPush('classes', 'empty')) {
      const digest = fastDigest(JSON.stringify(classes));
      if (shouldPush('classes', digest)) {
        const ok = await this.saveScopedCollectionSnapshot(
          'classes',
          numericSchoolId,
          buildClassDocId(numericSchoolId, 'classes'),
          classes,
          { throwOnError: options.throwOnError ?? false }
        );
        if (ok) {
          markPushed('classes', digest);
          result.syncedSlices++;
        }
      } else {
        result.skippedSlices++;
      }
    }

    if (students.length > 0 || shouldPush('students', 'empty')) {
      const digest = fastDigest(JSON.stringify(students));
      if (shouldPush('students', digest)) {
        const ok = await this.saveScopedCollectionSnapshot(
          'students',
          numericSchoolId,
          buildStudentDocId(numericSchoolId, 'students'),
          students,
          { throwOnError: options.throwOnError ?? false }
        );
        if (ok) {
          markPushed('students', digest);
          result.syncedSlices++;
        }
      } else {
        result.skippedSlices++;
      }
    }

    if (grades.length > 0 || shouldPush('grades', 'empty')) {
      const digest = fastDigest(JSON.stringify(grades));
      if (shouldPush('grades', digest)) {
        const ok = await this.saveScopedCollectionSnapshot(
          'grades',
          numericSchoolId,
          buildGradeDocId(numericSchoolId, 'grades'),
          grades,
          { throwOnError: options.throwOnError ?? false }
        );
        if (ok) {
          markPushed('grades', digest);
          result.syncedSlices++;
        }
      } else {
        result.skippedSlices++;
      }
    }

    const operationalPayload = {
      schemaVersion: 1,
      school_id: numericSchoolId,
      academicYears: years,
      enseignants: teachers,
      matieres: subjects,
      updatedAt: nowIso(),
    };
    const opDigest = fastDigest(JSON.stringify({
      academicYears: years,
      enseignants: teachers,
      matieres: subjects,
    }));
    if (shouldPush('operational', opDigest)) {
      const ok = await this.saveTenantAppData(
        numericSchoolId,
        'operational',
        operationalPayload,
        { throwOnError: options.throwOnError ?? false }
      );
      if (ok) {
        markPushed('operational', opDigest);
        result.syncedSlices++;
      }
    } else {
      result.skippedSlices++;
    }

    return result;
  },

  async restoreSchoolOperationalDomainFromFirestore(
    schoolId: number | string,
    options: { throwOnError?: boolean } = {}
  ): Promise<{ restored: boolean; counts?: Record<string, number> }> {
    if (!assertSignedInAndVerified()) return { restored: false };
    const token = getLocalStorageStr('token');
    if (!token) return { restored: false };

    const numericSchoolId = Math.trunc(Number(schoolId));
    if (!Number.isFinite(numericSchoolId)) return { restored: false };

    const perms = await this.canSyncSchoolSettingsWithFirestore(numericSchoolId);
    if (!perms.canRead) return { restored: false };

    const [configSnap, classesSnap, studentsSnap, gradesSnap, operationalSnap] = await Promise.all([
      this.getSchoolConfigSnapshot(numericSchoolId, { throwOnError: false }),
      this.getScopedCollectionSnapshot(
        'classes',
        numericSchoolId,
        buildClassDocId(numericSchoolId, 'classes'),
        { throwOnError: false }
      ),
      this.getScopedCollectionSnapshot(
        'students',
        numericSchoolId,
        buildStudentDocId(numericSchoolId, 'students'),
        { throwOnError: false }
      ),
      this.getScopedCollectionSnapshot(
        'grades',
        numericSchoolId,
        buildGradeDocId(numericSchoolId, 'grades'),
        { throwOnError: false }
      ),
      this.getTenantAppData(numericSchoolId, 'operational', { throwOnError: false }),
    ]);

    const hasAnyRemote = Boolean(
      configSnap?.data ||
      (Array.isArray(classesSnap?.data) && classesSnap.data.length > 0) ||
      (Array.isArray(studentsSnap?.data) && studentsSnap.data.length > 0) ||
      (Array.isArray(gradesSnap?.data) && gradesSnap.data.length > 0) ||
      operationalSnap?.data
    );
    if (!hasAnyRemote) return { restored: false };

    try {
      const res = await apiFetch('/api/school/firestore-reconcile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schoolInfo: configSnap?.data?.schoolInfo || (configSnap?.data?.nom ? configSnap.data : undefined),
          academicYears: operationalSnap?.data?.academicYears || configSnap?.data?.academicYears || [],
          classes: Array.isArray(classesSnap?.data) ? classesSnap.data : [],
          students: Array.isArray(studentsSnap?.data) ? studentsSnap.data : [],
          grades: Array.isArray(gradesSnap?.data) ? gradesSnap.data : [],
          enseignants: Array.isArray(operationalSnap?.data?.enseignants) ? operationalSnap.data.enseignants : [],
          matieres: Array.isArray(operationalSnap?.data?.matieres) ? operationalSnap.data.matieres : [],
          updatedAt:
            configSnap?.updatedAt ||
            operationalSnap?.updatedAt ||
            studentsSnap?.updatedAt ||
            classesSnap?.updatedAt ||
            nowIso(),
        }),
      });
      if (!res.ok) return { restored: false };
      const data = await res.json().catch(() => ({}));
      const counts = data?.counts || {};
      const totalChanged = Object.values(counts).reduce<number>(
        (acc, val) => acc + (Number(val) || 0),
        0
      );
      return { restored: totalChanged > 0 || Boolean(data?.restored), counts };
    } catch (err) {
      if (options.throwOnError) throw err;
      return { restored: false };
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
   * Synchronizes normalized school records, Google-linked user profiles,
   * subscription plans, school creation requests, and non-secret Super Admin settings
   * into dedicated Cloud Firestore collections.
   */
  async syncNormalizedEntitiesFromVault(
    vault: {
      tables?: {
        school_info?: FirestoreSchoolInput[];
        utilisateurs?: Array<{
          email?: string;
          role?: string;
          school_id?: number;
          nom?: string;
          google_id?: string | null;
        }>;
        plans?: FirestorePlanInput[];
        super_admin_settings?: Array<{ key: string; value: string }>;
        school_creation_requests?: FirestoreSchoolRequestInput[];
      };
    },
    options: { throwOnError?: boolean } = {}
  ): Promise<{ schools: number; users: number; plans: number; settings: number; requests: number }> {
    const counts = { schools: 0, users: 0, plans: 0, settings: 0, requests: 0 };
    if (!assertSignedInAndVerified() || !vault?.tables) return counts;

    const {
      school_info = [],
      utilisateurs = [],
      plans = [],
      super_admin_settings = [],
      school_creation_requests = [],
    } = vault.tables;

    for (const sc of school_info) {
      if (await this.upsertSchoolRecord(sc, { throwOnError: options.throwOnError ?? false })) {
        counts.schools++;
      }
      const sid = Number(sc.id);
      if (Number.isFinite(sid) && sid > 0) {
        const snapshotPayload = {
          schemaVersion: 1,
          exportedAt: nowIso(),
          school_id: sid,
          schoolInfo: sc,
        };
        const digest = sanitizeSchoolConfigPayload({ schoolInfo: sc });
        const hashKey = `${sid}:config_vault`;
        if (operationalDomainHashes.get(hashKey) !== digest) {
          const savedCfg = await this.saveSchoolConfigSnapshot(sid, snapshotPayload, {
            throwOnError: options.throwOnError ?? false,
          });
          if (savedCfg) {
            operationalDomainHashes.set(hashKey, digest);
          }
        }
      }
    }

    for (const u of utilisateurs) {
      const uid = String(u?.google_id || '').trim();
      if (!uid || !/^[a-zA-Z0-9_-]{1,128}$/.test(uid) || !u?.email) continue;
      const userDigest = fastDigest(JSON.stringify({ uid, email: u.email, role: u.role, school_id: u.school_id, nom: u.nom }));
      const uHashKey = `user:${uid}`;
      if (operationalDomainHashes.get(uHashKey) === userDigest) continue;
      const ok = await this.upsertUserProfile(
        uid,
        {
          uid,
          email: u.email,
          role: u.role || 'user',
          school_id: u.school_id,
          nom: u.nom,
        },
        { throwOnError: options.throwOnError ?? false }
      );
      if (ok) {
        operationalDomainHashes.set(uHashKey, userDigest);
        counts.users++;
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
