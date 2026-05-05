import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Build-time-safe DB client.
 *
 * Why this looks weird: Next.js's "Collecting page data" build step imports
 * every route to inspect its exports. NextAuth + @auth/drizzle-adapter, when
 * configured, binds adapter methods against `db` at import time. If we threw
 * here when DATABASE_URL was missing, the build would fail on Vercel preview
 * environments that don't have DB access (even though no actual query runs
 * during the build).
 *
 * postgres-js does NOT open a connection at construction — it just parses the
 * URL string. So we feed it a placeholder URL when DATABASE_URL isn't set,
 * which lets module evaluation succeed. At runtime, if DATABASE_URL is still
 * missing, the first real query will surface the misconfiguration as a normal
 * connection error.
 */
const PLACEHOLDER_URL =
  'postgres://placeholder:placeholder@localhost:5432/placeholder';

const url = process.env.DATABASE_URL || PLACEHOLDER_URL;

if (!process.env.DATABASE_URL) {
  // Visible in build logs and runtime logs, but doesn't break the build.
  // eslint-disable-next-line no-console
  console.warn(
    '[db] DATABASE_URL is not set — using placeholder; queries will fail at runtime',
  );
}

// Single connection for serverless functions; reuse on warm starts
const queryClient = postgres(url, {
  prepare: false,
  max: 1,
});

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
export * from './schema';
