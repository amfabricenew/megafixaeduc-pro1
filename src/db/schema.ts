import {
  bigint,
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Authenticated Firebase / App users registry
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  nom: text('nom'),
  role: text('role').default('admin'),
  schoolId: integer('school_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Registered schools (tenants)
export const schools = pgTable('schools', {
  id: integer('id').primaryKey(),
  nom: text('nom').notNull(),
  codeEcole: text('code_ecole'),
  email: text('email'),
  telephone: text('telephone'),
  adresse: text('adresse'),
  pays: text('pays'),
  devise: text('devise'),
  planAbonnement: text('plan_abonnement'),
  statutAbonnement: text('statut_abonnement'),
  dateFinAbonnement: text('date_fin_abonnement'),
  subscriptionKey: text('subscription_key'),
  payloadJson: text('payload_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// School creation requests
export const schoolRequests = pgTable('school_requests', {
  id: integer('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  nomEcole: text('nom_ecole').notNull(),
  emailEcole: text('email_ecole'),
  demandeurNom: text('demandeur_nom').notNull(),
  demandeurEmail: text('demandeur_email').notNull(),
  demandeurTelephone: text('demandeur_telephone').notNull(),
  planSouhaite: text('plan_souhaite'),
  statut: text('statut').notNull(),
  schoolId: integer('school_id'),
  motifRejet: text('motif_rejet'),
  payloadJson: text('payload_json').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// SaaS subscription plans configured by Super Admin
export const subscriptionPlans = pgTable('subscription_plans', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
  price: doublePrecision('price').default(0),
  period: text('period'),
  type: text('type'),
  color: text('color'),
  isRecommended: integer('is_recommended').default(0),
  studentLimit: integer('student_limit'),
  staffLimit: integer('staff_limit'),
  featuresJson: text('features_json'),
  payloadJson: text('payload_json').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Super Admin global configuration settings (key-value)
export const superAdminSettings = pgTable('super_admin_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Archived deleted school accounts
export const deletedSchoolArchives = pgTable('deleted_school_archives', {
  id: integer('id').primaryKey(),
  originalSchoolId: integer('original_school_id'),
  nom: text('nom').notNull(),
  codeEcole: text('code_ecole'),
  deletedBy: text('deleted_by'),
  reason: text('reason'),
  snapshotJson: text('snapshot_json').notNull(),
  deletedAt: timestamp('deleted_at').defaultNow(),
});

// Authoritative full database checkpoint (survives container restarts & multi-instance deploys)
export const cloudCheckpoints = pgTable('cloud_checkpoints', {
  id: text('id').primaryKey(),
  version: bigint('version', { mode: 'number' }).notNull().default(1),
  encoding: text('encoding').notNull().default('gzip-base64'),
  checksum: text('checksum').notNull(),
  payload: text('payload').notNull(),
  schoolCount: integer('school_count').notNull().default(0),
  nonDefaultSchoolCount: integer('non_default_school_count').notNull().default(0),
  userCount: integer('user_count').notNull().default(0),
  nonTestUserCount: integer('non_test_user_count').notNull().default(0),
  studentCount: integer('student_count').notNull().default(0),
  requestCount: integer('request_count').notNull().default(0),
  superAdminCustomized: boolean('super_admin_customized').notNull().default(false),
  superAdminConfigUpdatedAt: text('super_admin_config_updated_at'),
  hasRealData: boolean('has_real_data').notNull().default(false),
  buildId: text('build_id'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// School-scoped manual and scheduled backup snapshots
export const cloudBackupSnapshots = pgTable('cloud_backup_snapshots', {
  id: serial('id').primaryKey(),
  schoolId: integer('school_id').notNull(),
  label: text('label'),
  backupType: text('backup_type').notNull(),
  format: text('format').notNull(),
  checksumSha256: text('checksum_sha256'),
  sizeBytes: integer('size_bytes').default(0),
  payload: text('payload').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
