import { NextResponse } from 'next/server';
import { eq, desc, sql, inArray } from 'drizzle-orm';
import { db, disputes, users, serviceRequests } from '@/lib/db';
import { requireAdmin } from '@/lib/admin';

/** GET /api/admin/disputes — list disputes (default: open + investigating) */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');

  const rows = await db
    .select({ dispute: disputes })
    .from(disputes)
    .where(status ? eq(disputes.status, status as any) : sql`${disputes.status} IN ('open', 'investigating')`)
    .orderBy(desc(disputes.createdAt))
    .limit(100);

  // Hydrate participants
  const userIds = Array.from(new Set(rows.flatMap((r) => [r.dispute.creatorId, r.dispute.buyerId])));
  const userRows = userIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, userIds),
        columns: { id: true, handle: true, displayName: true, avatarUrl: true },
      })
    : [];
  const byId: Record<string, any> = {};
  userRows.forEach((u) => (byId[u.id] = u));

  return NextResponse.json({
    disputes: rows.map((r) => ({
      ...r.dispute,
      creator: byId[r.dispute.creatorId] ?? null,
      buyer: byId[r.dispute.buyerId] ?? null,
    })),
  });
}
