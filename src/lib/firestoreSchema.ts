import firebaseConfig from '../../firebase-applet-config.json';

/**
 * Shared Cloud Firestore Storage Structure Configuration.
 * Replaces local file-based DATABASE_PATH references with a coherent
 * Cloud Firestore database & collection hierarchy synchronized across
 * client and server persistence layers.
 */
export const FIRESTORE_STORAGE_CONFIG = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  storageProvider: 'cloud_firestore_primary' as const,
  fallbackProvider: 'cloudsql_and_local_cache' as const,
} as const;

export const FIRESTORE_COLLECTIONS = {
  schools: 'schools',
  users: 'users',
  superAdminSettings: 'super_admin_settings',
  plans: 'plans',
  schoolRequests: 'school_requests',
  classes: 'classes',
  students: 'students',
  grades: 'grades',
  settings: 'settings',
  appData: 'app_data',
  backups: 'backups',
  test: 'test',
} as const;

export type FirestoreCollectionName =
  (typeof FIRESTORE_COLLECTIONS)[keyof typeof FIRESTORE_COLLECTIONS];

/**
 * Sanitizes any identifier into a safe Firestore document ID
 * matching `^[a-zA-Z0-9_-]+$` and `<= 128` characters.
 */
export function sanitizeFirestoreDocId(raw: string | number, prefix = ''): string {
  const normalized = String(raw ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const full = prefix ? `${prefix}_${normalized || 'item'}` : normalized || 'item';
  return full.slice(0, 128);
}

export function buildSchoolDocId(schoolId: number | string): string {
  return sanitizeFirestoreDocId(schoolId, 'school');
}

export function buildSuperAdminSettingDocId(settingKey: string): string {
  return sanitizeFirestoreDocId(settingKey, 'setting');
}

export function buildPlanDocId(planId: number | string): string {
  return sanitizeFirestoreDocId(planId, 'plan');
}

export function buildSchoolRequestDocId(requestIdOrRef: number | string): string {
  return sanitizeFirestoreDocId(requestIdOrRef, 'request');
}

export function buildSchoolSettingDocId(schoolId: number | string, scope = 'config'): string {
  return sanitizeFirestoreDocId(`${schoolId}_${scope}`, 'school');
}

export function buildClassDocId(schoolId: number | string, scope = 'classes'): string {
  return sanitizeFirestoreDocId(`${schoolId}_${scope}`, 'school');
}

export function buildStudentDocId(schoolId: number | string, scope = 'students'): string {
  return sanitizeFirestoreDocId(`${schoolId}_${scope}`, 'school');
}

export function buildGradeDocId(schoolId: number | string, scope = 'grades'): string {
  return sanitizeFirestoreDocId(`${schoolId}_${scope}`, 'school');
}

export function buildAppDataDocId(schoolId: number | string, scopeKey: string): string {
  return sanitizeFirestoreDocId(`${schoolId}_${scopeKey}`, 'appdata');
}
