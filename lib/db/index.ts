import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Single connection for serverless functions; reuse on warm starts
const queryClient = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
});

export const db = drizzle(queryClient, { schema });

export type DB = typeof db;
export * from './schema';
