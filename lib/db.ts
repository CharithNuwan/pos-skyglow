import * as libsql from '@libsql/client';

// ✅ Safe import pattern — avoids named import issues across runtimes
// Same approach used in working projects: require the module first,
// then call .createClient() on it rather than using { createClient }

let client: ReturnType<typeof libsql.createClient> | null = null;

export function getDB() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL
             || process.env.STORAGE_URL;           // fallback alias
    const authToken = process.env.TURSO_AUTH_TOKEN
                   || process.env.STORAGE_AUTH_TOKEN; // fallback alias
    if (!url) throw new Error('TURSO_DATABASE_URL is not set');
    client = libsql.createClient({ url, authToken: authToken || undefined });
  }
  return client;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T[]> {
  const db = getDB();
  const result = await db.execute({ sql, args });
  return result.rows as unknown as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export async function execute(
  sql: string,
  args: (string | number | null | boolean)[] = []
): Promise<{ lastInsertRowid: number | bigint; rowsAffected: number }> {
  const db = getDB();
  const result = await db.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid ?? 0,
    rowsAffected: result.rowsAffected,
  };
}

export async function transaction(
  statements: { sql: string; args?: (string | number | null | boolean)[] }[]
): Promise<void> {
  const db = getDB();
  await db.batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    'write'
  );
}
