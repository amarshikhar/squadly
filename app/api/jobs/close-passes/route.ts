import { NextResponse } from 'next/server';
import { eq, and, lt } from 'drizzle-orm';
import { db, lobbyPasses, users } from '@/lib/db';
import { closePass } from '@/lib/lobby-pass';
import { publish, channels, events } from '@/lib/pusher';

/**
 * GET /api/jobs/close-passes
 *
 * Cron job: finds passes whose ends_at has elapsed but status is still 'open',
 * then runs closePass() on each. Configure in vercel.json:
 *
 *   { "crons": [{ "path": "/api/jobs/close-passes", "schedule": "* * * * *" }] }
 *
 * Auth: Vercel Cron sends a Bearer token via `CRON_SECRET`. We verify it.
 */
export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`;
  if (process.env.CRON_SECRET && auth !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const expiredPasses = await db
    .select()
    .from(lobbyPasses)
    .where(and(eq(lobbyPasses.status, 'open'), lt(lobbyPasses.endsAt, now)))
    .limit(50);

  const results: any[] = [];

  for (const pass of expiredPasses) {
    try {
      const r = await closePass(pass.id);
      results.push({ passId: pass.id, ...r });

      // Hydrate winner handles for broadcast
      if (r && 'winners' in r && r.winners && r.winners.length > 0) {
        const winnerIds = r.winners.map((w) => w.bidderId);
        const winnerUsers = await db.query.users.findMany({
          where: (u, { inArray }) => inArray(u.id, winnerIds),
          columns: { id: true, handle: true },
        });
        const handleById: Record<string, string> = {};
        winnerUsers.forEach((u) => (handleById[u.id] = u.handle));

        await publish(channels.pass(pass.id), events.PASS_CLOSED, {
          passId: pass.id,
          winners: r.winners.map((w) => ({
            handle: handleById[w.bidderId] ?? '?',
            amount: w.amount,
          })),
        });
      }
    } catch (e: any) {
      results.push({ passId: pass.id, error: e.message });
    }
  }

  return NextResponse.json({ closed: results.length, results });
}
