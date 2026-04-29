import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, gameRanks } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { verifyValorantRank, RiotError } from '@/lib/games/riot';

const VerifySchema = z.object({
  game: z.enum(['valorant', 'bgmi', 'free_fire']),
  // For Valorant: gameName + tagLine (Riot ID)
  // For BGMI / Free Fire: in-game ID + screenshot upload (manual review for now)
  gameName: z.string().min(1).max(40).optional(),
  tagLine: z.string().min(1).max(10).optional(),
  inGameId: z.string().min(1).max(40).optional(),
  proofUrl: z.string().url().optional(),
});

/**
 * POST /api/ranks/verify
 * Valorant: live verification via Riot API.
 * BGMI / Free Fire: stores rank as `pending` for manual review.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parse = VerifySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'invalid_payload', details: parse.error.flatten() }, { status: 400 });
  }

  const { game } = parse.data;

  // Drop any existing row for this (user, game) — we replace
  await db
    .delete(gameRanks)
    .where(and(eq(gameRanks.userId, session.user.id), eq(gameRanks.game, game)));

  if (game === 'valorant') {
    const { gameName, tagLine } = parse.data;
    if (!gameName || !tagLine) {
      return NextResponse.json({ error: 'gameName + tagLine required for Valorant' }, { status: 400 });
    }

    try {
      const result = await verifyValorantRank({ gameName, tagLine });
      const [row] = await db
        .insert(gameRanks)
        .values({
          userId: session.user.id,
          game: 'valorant',
          rankLabel: result.rank,
          inGameId: result.riotId,
          verifiedAt: new Date(),
          verifiedVia: result.source,
        })
        .returning();
      return NextResponse.json({ rank: row, result });
    } catch (e) {
      if (e instanceof RiotError) {
        return NextResponse.json({ error: e.code, message: e.message }, { status: 400 });
      }
      throw e;
    }
  }

  // BGMI / Free Fire — manual review
  const { inGameId, proofUrl } = parse.data;
  if (!inGameId) {
    return NextResponse.json({ error: 'inGameId required' }, { status: 400 });
  }

  const [row] = await db
    .insert(gameRanks)
    .values({
      userId: session.user.id,
      game,
      rankLabel: 'Pending review',
      inGameId,
      proofUrl,
      verifiedVia: 'self_reported',
    })
    .returning();

  return NextResponse.json({ rank: row, queuedForReview: true });
}
