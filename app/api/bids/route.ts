import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, lobbyPassBids, lobbyPasses } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';

const PlaceBidSchema = z.object({
  passId: z.string().uuid(),
  coinAmount: z.number().int().positive(),
});

/** GET /api/bids?pass_id=... — list bids on a Lobby Pass (top → bottom) */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const passId = url.searchParams.get('pass_id');
  if (!passId) return NextResponse.json({ error: 'missing pass_id' }, { status: 400 });

  const bids = await db.query.lobbyPassBids.findMany({
    where: eq(lobbyPassBids.passId, passId),
    orderBy: [desc(lobbyPassBids.coinAmount)],
    limit: 50,
  });

  return NextResponse.json({ bids });
}

/** POST /api/bids — place a bid (escrow coins) */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parse = PlaceBidSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  // TODO:
  // 1. Load the pass; check it's still 'open' and ends_at > now
  // 2. Check user's coin balance >= coinAmount
  // 3. In a transaction:
  //    a. Debit coins from vault_balances → escrow
  //    b. Insert bid row
  //    c. Update prior winning bid → 'outbid'
  //    d. This bid → 'winning'
  // 4. Trigger Pusher event for real-time UI update
  // 5. Return updated leaderboard

  return NextResponse.json({ ok: true, todo: 'wire escrow + transaction' });
}
