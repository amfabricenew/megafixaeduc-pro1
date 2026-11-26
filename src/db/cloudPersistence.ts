import zlib from 'zlib';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { pgDb, isCloudSqlConfigured } from './index.ts';
import {
  cloudCheckpoints,
  cloudBackupSnapshots,
  deletedSchoolArchives,
  schoolRequests,
  schools,
  subscriptionPlans,
  superAdminSettings,
  users,
} from './schema.ts';

export interface CloudCheckpointMeta {
  id: string;
  version: number;
  checksum: string;
  encoding: string;
  schoolCount: number;
  nonDefaultSchoolCount: number;
  userCount: number;
  nonTestUserCount: number;
  studentCount: number;
  requestCount: number;
  superAdminCustomized: boolean;
  superAdminConfigUpdatedAt: string | null;
  hasRealData: boolean;
  buildId: string | null;
  updatedAt: Date | null;
}

export interface SaveMasterCheckpointInput {
  sqlDump: string;
  stats: {
    schoolCount: number;
    nonDefaultSchoolCount: number;
    userCount: number;
    nonTestUserCount: number;
    studentCount: number;
    requestCount: number;
    hasRealData: boolean;
  };
  superAdminCustomized: boolean;
  superAdminConfigUpdatedAt: string | null;
  buildId: string;
  allowShrink: boolean;
  normalized?: {
    settingsRows: Array<{ key: string; value: string }>;
    planRows: Array<Record<string, any>>;
    schoolRows: Array<Record<string, any>>;
    requestRows: Array<Record<string, any>>;
    userRows: Array<Record<string, any>>;
    archiveRows: Array<Record<string, any>>;
  };
}

export async function getMasterCheckpointMeta(): Promise<CloudCheckpointMeta | null> {
  if (!isCloudSqlConfigured()) return null;
  try {
    const rows = await pgDb
      .select({
        id: cloudCheckpoints.id,
        version: cloudCheckpoints.version,
        checksum: cloudCheckpoints.checksum,
        encoding: cloudCheckpoints.encoding,
        schoolCount: cloudCheckpoints.schoolCount,
        nonDefaultSchoolCount: cloudCheckpoints.nonDefaultSchoolCount,
        userCount: cloudCheckpoints.userCount,
        nonTestUserCount: cloudCheckpoints.nonTestUserCount,
        studentCount: cloudCheckpoints.studentCount,
        requestCount: cloudCheckpoints.requestCount,
        superAdminCustomized: cloudCheckpoints.superAdminCustomized,
        superAdminConfigUpdatedAt: cloudCheckpoints.superAdminConfigUpdatedAt,
        hasRealData: cloudCheckpoints.hasRealData,
        buildId: cloudCheckpoints.buildId,
        updatedAt: cloudCheckpoints.updatedAt,
      })
      .from(cloudCheckpoints)
      .where(eq(cloudCheckpoints.id, 'master'))
      .limit(1);

    return rows[0] || null;
  } catch (error) {
    console.error('Failed to read Cloud SQL checkpoint metadata:', error);
    throw new Error('Cloud SQL metadata query failed.', { cause: error });
  }
}

export async function loadMasterCheckpoint(): Promise<(CloudCheckpointMeta & { sqlDump: string }) | null> {
  if (!isCloudSqlConfigured()) return null;
  try {
    const rows = await pgDb
      .select()
      .from(cloudCheckpoints)
      .where(eq(cloudCheckpoints.id, 'master'))
      .limit(1);

    const row = rows[0];
    if (!row || !row.payload) return null;

    let sqlDump = '';
    if (row.encoding === 'gzip-base64') {
      sqlDump = zlib.gunzipSync(Buffer.from(row.payload, 'base64')).toString('utf8');
    } else {
      sqlDump = row.payload;
    }

    if (row.checksum) {
      const actualChecksum = crypto.createHash('sha256').update(sqlDump, 'utf8').digest('hex');
      if (actualChecksum !== row.checksum) {
        console.warn('[Cloud SQL] Checksum mismatch on master checkpoint.');
        return null;
      }
    }

    return {
      id: row.id,
      version: Number(row.version || 1),
      checksum: row.checksum,
      encoding: row.encoding,
      schoolCount: Number(row.schoolCount || 0),
      nonDefaultSchoolCount: Number(row.nonDefaultSchoolCount || 0),
      userCount: Number(row.userCount || 0),
      nonTestUserCount: Number(row.nonTestUserCount || 0),
      studentCount: Number(row.studentCount || 0),
      requestCount: Number(row.requestCount || 0),
      superAdminCustomized: Boolean(row.superAdminCustomized),
      superAdminConfigUpdatedAt: row.superAdminConfigUpdatedAt || null,
      hasRealData: Boolean(row.hasRealData),
      buildId: row.buildId || null,
      updatedAt: row.updatedAt || null,
      sqlDump,
    };
  } catch (error) {
    console.error('Failed to load Cloud SQL master checkpoint:', error);
    throw new Error('Cloud SQL checkpoint load failed.', { cause: error });
  }
}

export async function loadNormalizedRelationalState(): Promise<{
  settingsRows: Array<{ key: string; value: string }>;
  planRows: Array<Record<string, any>>;
  schoolRows: Array<Record<string, any>>;
  requestRows: Array<Record<string, any>>;
  archiveRows: Array<Record<string, any>>;
} | null> {
  if (!isCloudSqlConfigured()) return null;
  try {
    const [settingsList, plansList, schoolsList, requestsList, archivesList] = await Promise.all([
      pgDb.select().from(superAdminSettings),
      pgDb.select().from(subscriptionPlans),
      pgDb.select().from(schools),
      pgDb.select().from(schoolRequests),
      pgDb.select().from(deletedSchoolArchives),
    ]);

    const parsePayload = (raw: string | null | undefined): Record<string, any> | null => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    return {
      settingsRows: settingsList.map((s) => ({ key: s.key, value: s.value })),
      planRows: plansList
        .map((p) => parsePayload(p.payloadJson))
        .filter((x): x is Record<string, any> => Boolean(x)),
      schoolRows: schoolsList
        .map((s) => parsePayload(s.payloadJson))
        .filter((x): x is Record<string, any> => Boolean(x)),
      requestRows: requestsList
        .map((r) => parsePayload(r.payloadJson))
        .filter((x): x is Record<string, any> => Boolean(x)),
      archiveRows: archivesList
        .map((a) => parsePayload(a.snapshotJson))
        .filter((x): x is Record<string, any> => Boolean(x)),
    };
  } catch (error) {
    console.error('Failed to read relational Cloud SQL state:', error);
    throw new Error('Cloud SQL relational read failed.', { cause: error });
  }
}

export async function saveMasterCheckpointToCloudSql(
  input: SaveMasterCheckpointInput
): Promise<{ saved: boolean; version: number; skippedReason?: string }> {
  if (!isCloudSqlConfigured()) {
    return { saved: false, version: 0, skippedReason: 'not_configured' };
  }

  try {
    const existingMeta = await getMasterCheckpointMeta();
    if (existingMeta && !input.allowShrink) {
      const wouldShrink =
        (!input.stats.hasRealData && existingMeta.hasRealData) ||
        existingMeta.nonDefaultSchoolCount > input.stats.nonDefaultSchoolCount ||
        existingMeta.schoolCount > input.stats.schoolCount ||
        existingMeta.nonTestUserCount > input.stats.nonTestUserCount ||
        existingMeta.requestCount > input.stats.requestCount ||
        (existingMeta.studentCount > input.stats.studentCount && input.stats.studentCount === 0);

      if (wouldShrink) {
        return {
          saved: false,
          version: existingMeta.version,
          skippedReason: 'anti_shrink_protection',
        };
      }
    }

    const checksum = crypto.createHash('sha256').update(input.sqlDump, 'utf8').digest('hex');
    const compressedPayload = zlib.gzipSync(Buffer.from(input.sqlDump, 'utf8')).toString('base64');
    const nextVersion = existingMeta ? Number(existingMeta.version || 0) + 1 : 1;
    const now = new Date();

    await pgDb.transaction(async (tx) => {
      // Preserve a rolling previous checkpoint whenever data shrinks explicitly (deletion)
      if (existingMeta && input.allowShrink) {
        const prevRows = await tx
          .select()
          .from(cloudCheckpoints)
          .where(eq(cloudCheckpoints.id, 'master'))
          .limit(1);
        if (prevRows[0]) {
          await tx
            .insert(cloudCheckpoints)
            .values({
              ...prevRows[0],
              id: 'previous',
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: cloudCheckpoints.id,
              set: {
                version: prevRows[0].version,
                encoding: prevRows[0].encoding,
                checksum: prevRows[0].checksum,
                payload: prevRows[0].payload,
                schoolCount: prevRows[0].schoolCount,
                nonDefaultSchoolCount: prevRows[0].nonDefaultSchoolCount,
                userCount: prevRows[0].userCount,
                nonTestUserCount: prevRows[0].nonTestUserCount,
                studentCount: prevRows[0].studentCount,
                requestCount: prevRows[0].requestCount,
                superAdminCustomized: prevRows[0].superAdminCustomized,
                superAdminConfigUpdatedAt: prevRows[0].superAdminConfigUpdatedAt,
                hasRealData: prevRows[0].hasRealData,
                buildId: prevRows[0].buildId,
                updatedAt: now,
              },
            });
        }
      }

      await tx
        .insert(cloudCheckpoints)
        .values({
          id: 'master',
          version: nextVersion,
          encoding: 'gzip-base64',
          checksum,
          payload: compressedPayload,
          schoolCount: input.stats.schoolCount,
          nonDefaultSchoolCount: input.stats.nonDefaultSchoolCount,
          userCount: input.stats.userCount,
          nonTestUserCount: input.stats.nonTestUserCount,
          studentCount: input.stats.studentCount,
          requestCount: input.stats.requestCount,
          superAdminCustomized: input.superAdminCustomized,
          superAdminConfigUpdatedAt: input.superAdminConfigUpdatedAt,
          hasRealData: input.stats.hasRealData,
          buildId: input.buildId,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: cloudCheckpoints.id,
          set: {
            version: nextVersion,
            encoding: 'gzip-base64',
            checksum,
            payload: compressedPayload,
            schoolCount: input.stats.schoolCount,
            nonDefaultSchoolCount: input.stats.nonDefaultSchoolCount,
            userCount: input.stats.userCount,
            nonTestUserCount: input.stats.nonTestUserCount,
            studentCount: input.stats.studentCount,
            requestCount: input.stats.requestCount,
            superAdminCustomized: input.superAdminCustomized,
            superAdminConfigUpdatedAt: input.superAdminConfigUpdatedAt,
            hasRealData: input.stats.hasRealData,
            buildId: input.buildId,
            updatedAt: now,
          },
        });

      if (input.normalized) {
        // Sync Super Admin settings key-value table
        if (input.normalized.settingsRows.length > 0) {
          for (const s of input.normalized.settingsRows) {
            await tx
              .insert(superAdminSettings)
              .values({
                key: String(s.key),
                value: String(s.value ?? ''),
                updatedAt: now,
              })
              .onConflictDoUpdate({
                target: superAdminSettings.key,
                set: {
                  value: String(s.value ?? ''),
                  updatedAt: now,
                },
              });
          }
        }

        // Sync subscription plans (authoritative replace when customized or explicit changes)
        if (input.normalized.planRows.length > 0 || input.allowShrink) {
          await tx.delete(subscriptionPlans);
          for (const p of input.normalized.planRows) {
            if (p.id == null || !p.name) continue;
            await tx.insert(subscriptionPlans).values({
              id: Number(p.id),
              name: String(p.name),
              price: Number(p.price ?? 0),
              period: p.period ? String(p.period) : 'mois',
              type: p.type ? String(p.type) : 'paid',
              color: p.color ? String(p.color) : 'indigo',
              isRecommended: Number(p.is_recommended || 0),
              studentLimit: p.student_limit != null ? Number(p.student_limit) : null,
              staffLimit: p.staff_limit != null ? Number(p.staff_limit) : null,
              featuresJson: typeof p.features === 'string' ? p.features : JSON.stringify(p.features || []),
              payloadJson: JSON.stringify(p),
              updatedAt: now,
            });
          }
        }

        // Sync schools registry
        if (input.normalized.schoolRows.length > 0 || input.allowShrink) {
          await tx.delete(schools);
          for (const sc of input.normalized.schoolRows) {
            if (sc.id == null || !sc.nom) continue;
            await tx.insert(schools).values({
              id: Number(sc.id),
              nom: String(sc.nom),
              codeEcole: sc.code_ecole ? String(sc.code_ecole) : null,
              email: sc.email ? String(sc.email) : null,
              telephone: sc.telephone ? String(sc.telephone) : null,
              adresse: sc.adresse ? String(sc.adresse) : null,
              pays: sc.pays ? String(sc.pays) : null,
              devise: sc.devise ? String(sc.devise) : null,
              planAbonnement: sc.plan_abonnement ? String(sc.plan_abonnement) : null,
              statutAbonnement: sc.statut_abonnement ? String(sc.statut_abonnement) : null,
              dateFinAbonnement: sc.date_fin_abonnement ? String(sc.date_fin_abonnement) : null,
              subscriptionKey: sc.subscription_key ? String(sc.subscription_key) : null,
              payloadJson: JSON.stringify(sc),
              updatedAt: now,
            });
          }
        }

        // Sync school creation requests
        if (input.normalized.requestRows.length > 0 || input.allowShrink) {
          await tx.delete(schoolRequests);
          for (const r of input.normalized.requestRows) {
            if (r.id == null || !r.reference) continue;
            await tx.insert(schoolRequests).values({
              id: Number(r.id),
              reference: String(r.reference),
              nomEcole: String(r.nom_ecole || ''),
              emailEcole: r.email_ecole ? String(r.email_ecole) : null,
              demandeurNom: String(r.demandeur_nom || ''),
              demandeurEmail: String(r.demandeur_email || ''),
              demandeurTelephone: String(r.demandeur_telephone || ''),
              planSouhaite: r.plan_souhaite ? String(r.plan_souhaite) : null,
              statut: String(r.statut || 'pending'),
              schoolId: r.school_id != null ? Number(r.school_id) : null,
              motifRejet: r.motif_rejet ? String(r.motif_rejet) : null,
              payloadJson: JSON.stringify(r),
              updatedAt: now,
            });
          }
        }

        // Sync deleted school archives (append/upsert, never purge)
        for (const arch of input.normalized.archiveRows) {
          if (arch.id == null) continue;
          await tx
            .insert(deletedSchoolArchives)
            .values({
              id: Number(arch.id),
              originalSchoolId: arch.original_school_id != null ? Number(arch.original_school_id) : null,
              nom: String(arch.nom || arch.school_name || 'École archivée'),
              codeEcole: arch.code_ecole ? String(arch.code_ecole) : null,
              deletedBy: arch.deleted_by ? String(arch.deleted_by) : null,
              reason: arch.reason ? String(arch.reason) : null,
              snapshotJson: JSON.stringify(arch),
              deletedAt: now,
            })
            .onConflictDoUpdate({
              target: deletedSchoolArchives.id,
              set: {
                snapshotJson: JSON.stringify(arch),
              },
            });
        }

        // Sync user directory into PostgreSQL users table
        for (const u of input.normalized.userRows) {
          if (!u.email) continue;
          const uid = u.google_id
            ? String(u.google_id)
            : `local_${u.id ?? crypto.createHash('md5').update(String(u.email)).digest('hex')}`;
          await tx
            .insert(users)
            .values({
              uid,
              email: String(u.email),
              nom: u.nom ? String(u.nom) : null,
              role: u.role ? String(u.role) : 'user',
              schoolId: u.school_id != null ? Number(u.school_id) : null,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: users.uid,
              set: {
                email: String(u.email),
                nom: u.nom ? String(u.nom) : null,
                role: u.role ? String(u.role) : 'user',
                schoolId: u.school_id != null ? Number(u.school_id) : null,
                updatedAt: now,
              },
            });
        }
      }
    });

    return { saved: true, version: nextVersion };
  } catch (error) {
    console.error('Failed to persist checkpoint to Cloud SQL:', error);
    throw new Error('Cloud SQL persistence write failed.', { cause: error });
  }
}

export async function saveSchoolBackupToCloudSql(params: {
  schoolId: number;
  label: string;
  backupType: string;
  format: string;
  checksumSha256: string;
  sizeBytes: number;
  payload: string;
}): Promise<number | null> {
  if (!isCloudSqlConfigured()) return null;
  try {
    const inserted = await pgDb
      .insert(cloudBackupSnapshots)
      .values({
        schoolId: params.schoolId,
        label: params.label,
        backupType: params.backupType,
        format: params.format,
        checksumSha256: params.checksumSha256,
        sizeBytes: params.sizeBytes,
        payload: params.payload,
      })
      .returning({ id: cloudBackupSnapshots.id });

    return inserted[0]?.id ?? null;
  } catch (error) {
    console.error('Failed to save school backup snapshot to Cloud SQL:', error);
    throw new Error('Cloud SQL snapshot save failed.', { cause: error });
  }
}
