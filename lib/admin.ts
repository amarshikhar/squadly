/**
 * Admin authorization helpers.
 *
 * Dual gate:
 *  - users.is_admin column (set via SQL or admin tooling)
 *  - ADMIN_USER_IDS env var (comma-separated UUIDs) — emergency override / bootstrap
 */

import { eq } from 'drizzle-orm';
import { db, users } from './db';
import { auth } from './auth';

export async function isAdmin(userId: string): Promise<boolean> {
  const envList = (process.env.ADMIN_USER_IDS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (envList.includes(userId)) return true;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isAdmin: true },
  });
  return Boolean(user?.isAdmin);
}

/** Throws Response (401/403) for use inside API route handlers. */
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'content-type': 'application/json' },
    });
  }
  const ok = await isAdmin(session.user.id);
  if (!ok) {
    throw new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403, headers: { 'content-type': 'application/json' },
    });
  }
  return { userId: session.user.id };
}
