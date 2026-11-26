import { pgDb, isCloudSqlConfigured } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  extra?: { nom?: string | null; role?: string | null; schoolId?: number | null }
) {
  if (!isCloudSqlConfigured()) {
    return null;
  }
  try {
    const result = await pgDb
      .insert(users)
      .values({
        uid,
        email,
        nom: extra?.nom ?? null,
        role: extra?.role ?? 'admin',
        schoolId: extra?.schoolId ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(extra?.nom !== undefined ? { nom: extra.nom } : {}),
          ...(extra?.role !== undefined ? { role: extra.role || 'admin' } : {}),
          ...(extra?.schoolId !== undefined ? { schoolId: extra.schoolId } : {}),
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Database user synchronization failed.', { cause: error });
  }
}

export async function getUsers() {
  if (!isCloudSqlConfigured()) {
    return [];
  }
  try {
    return await pgDb.select().from(users);
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed. Please try again later.', { cause: error });
  }
}
