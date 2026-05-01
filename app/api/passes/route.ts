import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq, desc, and, gt } from 'drizzle-orm';
import { db, lobbyPasses, users } from '@/lib/db';
import { auth } from '@/lib/auth';

const CreatePassSchema = z.object({
  title: z.string().min(5).max(140),
  description: z.string().max(2000).optional(),
  game: z.enum(['bgmi', 'valorant', 'free_fire', 'dota2', 'cs2', 'cod_mobile', 'fortnite', 'mobile_legends', 'other']),
  slotCount: z.number().int().min(1).max(10),
  minBidCoins: z.number().int().min(1).max(50000),
  bidIncrementCoins: z.number().int().min(1).max(5000),
  endsInMinutes: z.number().int().min(15).max(48 * 60),
  sessionInMinutes: z.number().int().min(60).max(7 * 24 * 60),
  sessionDurationMin: z.number().int().min(15).max(480),
});

/** GET /api/passes — list open passes */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game');
  const creatorId = url.searchParams.get('creator_id');

  const conds = [eq(lobbyPasses.status, 'open'), gt(lobbyPasses.endsAt, new Date())];
  if (game) conds.push(eq(lobbyPasses.game, game as any));
  if (creatorId) conds.push(eq(lobbyPasses.creatorId, creatorId));

  const passes = await db
    .select({
      pass: lobbyPasses,
      creator: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
    })
    .from(lobbyPasses)
    .innerJoin(users, eq(users.id, lobbyPasses.creatorId))
    .where(and(...conds))
    .orderBy(desc(lobbyPasses.createdAt))
    .limit(50);

  return NextResponse.json({ passes });
}

/** POST /api/passes — creator creates a new lobby pass */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await request.json();
  const parse = CreatePassSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parse.error.flatten() }, { status: 400 });
  }

  const now = Date.now();
  const endsAt = new Date(now + parse.data.endsInMinutes * 60 * 1000);
  const sessionAt = new Date(now + parse.data.sessionInMinutes * 60 * 1000);

  if (sessionAt < endsAt) {
    return NextResponse.json({ error: 'session_before_auction_end' }, { status: 400 });
  }

  const [pass] = await db
    .insert(lobbyPasses)
    .values({
      creatorId: session.user.id,
      title: parse.data.title,
      description: parse.data.description,
      game: parse.data.game,
      slotCount: parse.data.slotCount,
      minBidCoins: parse.data.minBidCoins,
      bidIncrementCoins: parse.data.bidIncrementCoins,
      startsAt: new Date(now),
      endsAt,
      sessionAt,
      sessionDurationMin: parse.data.sessionDurationMin,
      status: 'open',
    })
    .returning();

  return NextResponse.json({ pass }, { status: 201 });
}
