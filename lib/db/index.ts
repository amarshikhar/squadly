import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Lazy postgres client — only connects on the first DB call, never at module
 * load time. This matters because Next.js's "Collecting page data" build step
 * imports every route file to inspect its exports. If this module threw on
 * import (e.g. DATABASE_URL not set in a preview build env), the whole build
 * would fail even though no DB query is actually being made.
 *
 * The Proxy keeps the public surface identical: `import { db } from '@/lib/db'`
 * still gives you a `PostgresJsDatabase<typeof schema>` you can use with all
 * the usual Drizzle helpers (`db.query.x.findFirst`, `db.select(...)`,
 * `db.transaction(...)`, etc).
 */

let _db: PostgresJsDatabase<typeof schema> | null = null;

function getDb(): PostgresJsDatabase<typeof schema> {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }
  // Single connection for serverless functions; reuse on warm starts
  const client = postgres(url, { prepare: false, max: 1 });
  _db = drizzle(client, { schema });
  return _db;
}

export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real, prop, receiver);
    // Bind functions so `this` stays the real Drizzle instance even when
    // callers do `const fn = db.transaction; fn(...)` style detachment.
    return typeof value === 'function' ? value.bind(real) : value;
  },
});

export type DB = typeof db;
export * from './schema';
