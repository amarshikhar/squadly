import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db, users, lobbyPassBids } from '@/lib/db';
import { auth } from '@/lib/auth';
import { placeBid, LobbyPassError } from '@/lib/lobby-pass';
import { publish, channels, events } from '@/lib/pusher';

const BidSchema = z.object({ coinAmount: z.number().int().positive() });

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = BidSchema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });

  try {
    const result = await placeBid({
      passId: params.id,
      bidderId: session.user.id,
      coinAmount: parse.data.coinAmount,
    });

    // Determine top bid for broadcast
    const top = result.topBids[0];
    const bidder = top
      ? await db.query.users.findFirst({
          where: eq(users.id, top.bidderId),
          columns: { handle: true },
        })
      : null;

    const activeBidderCount = await db
      .selectDistinct({ b: lobbyPassBids.bidderId })
      .from(lobbyPassBids)
      .where(
        and(
          eq(lobbyPassBids.passId, params.id),
          sql`${lobbyPassBids.status} IN ('active', 'winning', 'outbid')`,
        ),
      );

    await publish(channels.pass(params.id), events.PASS_BID_PLACED, {
      passId: params.id,
      topAmount: top?.coinAmount ?? 0,
      topBidderHandle: bidder?.handle ?? '',
      bidderCount: activeBidderCount.length,
    });

    return NextResponse.json({ bid: result.bid });
  } catch (e: any) {
    if (e instanceof LobbyPassError) {
      return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
    }
    throw e;
  }
}
