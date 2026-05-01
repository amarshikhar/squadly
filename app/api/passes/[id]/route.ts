import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users, lobbyPasses } from '@/lib/db';
import { getPassWithBids } from '@/lib/lobby-pass';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const data = await getPassWithBids(params.id);
  if (!data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const creator = await db.query.users.findFirst({ where: eq(users.id, data.pass.creatorId) });

  // Hydrate bidder handles for the leaderboard (avoid N+1 in caller)
  const bidderIds = Array.from(new Set(data.bids.map((b) => b.bidderId)));
  const bidders = bidderIds.length
    ? await db.select({ id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, bidderIds[0])) // placeholder; map below
    : [];

  // Better: fetch all bidders in one query
  const bidderRows = bidderIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, bidderIds),
        columns: { id: true, handle: true, displayName: true, avatarUrl: true },
      })
    : [];
  const byId: Record<string, any> = {};
  bidderRows.forEach((b) => (byId[b.id] = b));

  const enrichedBids = data.bids.map((b) => ({ ...b, bidder: byId[b.bidderId] ?? null }));

  return NextResponse.json({ pass: data.pass, creator, bids: enrichedBids });
}
