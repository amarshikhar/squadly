import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import { listActiveGoals, listServices } from '@/lib/db/queries';
import { db, lobbyPasses, users, lobbyPassBids } from '@/lib/db';
import { eq, and, gt, desc, sql } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { GAME_LABELS, formatInr, formatCoins } from '@/lib/utils';

export const revalidate = 30;

const FEED_SERVICE_LIMIT = 6;
const FRESH_WINDOW_DAYS = 14;

export default async function FeedPage() {
  // Trending services (recent + active passes + ending-soon goals)
  const [endingGoals, openPasses, freshFirst] = await Promise.all([
    listActiveGoals(),
    db
      .select({
        pass: lobbyPasses,
        creator: { id: users.id, handle: users.handle, displayName: users.displayName, avatarUrl: users.avatarUrl },
      })
      .from(lobbyPasses)
      .innerJoin(users, eq(users.id, lobbyPasses.creatorId))
      .where(and(eq(lobbyPasses.status, 'open'), gt(lobbyPasses.endsAt, new Date())))
      .orderBy(desc(lobbyPasses.createdAt))
      .limit(8),
    // First pass: services created in the last 14 days, newest first.
    listServices({
      limit: FEED_SERVICE_LIMIT,
      sort: 'recent',
      since: new Date(Date.now() - FRESH_WINDOW_DAYS * 24 * 60 * 60 * 1000),
    }),
  ]);

  // Fallback that the original code commented but never actually implemented:
  // if fewer than `FEED_SERVICE_LIMIT` services were posted in the fresh window,
  // top up the section with the most-recent services regardless of age. Without
  // this, the feed appears almost empty for projects whose seed/test services
  // were created more than 14 days ago.
  let recentServices: Awaited<ReturnType<typeof listServices>> = freshFirst;
  if (freshFirst.length < FEED_SERVICE_LIMIT) {
    const topUp = await listServices({ limit: FEED_SERVICE_LIMIT, sort: 'recent' });
    const seen = new Set(freshFirst.map((s) => s.service.id));
    for (const row of topUp) {
      if (recentServices.length >= FEED_SERVICE_LIMIT) break;
      if (!seen.has(row.service.id)) {
        recentServices = recentServices.concat(row);
        seen.add(row.service.id);
      }
    }
  }

  // Top current bid per pass (best-effort; one query per pass)
  const passBidStats = await Promise.all(
    openPasses.map(async (p) => {
      const top = await db.query.lobbyPassBids.findFirst({
        where: and(eq(lobbyPassBids.passId, p.pass.id), sql`${lobbyPassBids.status} IN ('winning','active')`),
        orderBy: [desc(lobbyPassBids.coinAmount)],
      });
      return { passId: p.pass.id, topAmount: top?.coinAmount ?? p.pass.minBidCoins };
    }),
  );
  const topByPass: Record<string, number> = {};
  passBidStats.forEach((s) => (topByPass[s.passId] = s.topAmount));

  // Sort goals by closeness to deadline (soonest first)
  const sortedGoals = endingGoals
    .slice()
    .sort((a, b) => new Date(a.goal.deadline).getTime() - new Date(b.goal.deadline).getTime())
    .slice(0, 6);

  const allServiceIdsAreFresh =
    recentServices.length > 0 &&
    recentServices.every((s) => freshFirst.some((f) => f.service.id === s.service.id));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="default">● Feed</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">What&apos;s happening</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Trending services, ending-soon goals, and live bidding wars across Squadly.
        </p>

        {/* Live bidding */}
        {openPasses.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl text-text-0">
                <span className="text-neon-magenta">●</span> Live bidding
              </h2>
              <Link href="/services?kind=passes" className="font-mono text-xs text-text-3 hover:text-neon-magenta">
                Browse all →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {openPasses.map(({ pass, creator }) => (
                <Card key={pass.id} className="p-5 transition-all hover:border-border-magenta hover:-translate-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="magenta">{pass.slotCount} slot{pass.slotCount > 1 ? 's' : ''}</Badge>
                    <span className="font-mono text-xs text-text-3">
                      ends {formatDistanceToNow(new Date(pass.endsAt), { addSuffix: true })}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{pass.title}</h3>
                  <Link href={`/${creator.handle}`} className="mt-2 block font-mono text-xs text-text-2 hover:text-neon-magenta">
                    @{creator.handle} · {GAME_LABELS[pass.game] ?? pass.game}
                  </Link>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Top bid</div>
                      <div className="font-display text-2xl text-neon-magenta">{formatCoins(topByPass[pass.id] ?? 0)}</div>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/passes/${pass.id}`}>Bid →</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Ending-soon goals */}
        {sortedGoals.length > 0 && (
          <section className="mt-16">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl text-text-0">
                <span className="text-neon-cyan">●</span> Squad Goals ending soon
              </h2>
              <Link href="/services?kind=goals" className="font-mono text-xs text-text-3 hover:text-neon-cyan">
                Browse all →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedGoals.map(({ goal, creator }) => (
                <Card key={goal.id} className="p-5">
                  <Link href={`/${creator.handle}`} className="font-mono text-xs text-neon-cyan hover:underline">
                    @{creator.handle}
                  </Link>
                  <h3 className="mt-2 line-clamp-2 font-display text-base leading-tight text-text-0">{goal.title}</h3>
                  <div className="mt-4">
                    <GoalBar current={goal.currentCoins} target={goal.targetCoins} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs font-mono">
                    <span className="text-text-2">{goal.contributorsCount} contributors</span>
                    <span className="text-neon-cyan">
                      ends {formatDistanceToNow(new Date(goal.deadline), { addSuffix: true })}
                    </span>
                  </div>
                  <Button asChild size="sm" className="mt-4 w-full">
                    <Link href={`/goals/${goal.id}`}>Contribute →</Link>
                  </Button>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Recent services — prefers last 14 days, falls back to most-recent overall */}
        {recentServices.length > 0 && (
          <section className="mt-16">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-2xl text-text-0">
                <span className="text-neon-amber">●</span>{' '}
                {allServiceIdsAreFresh ? 'Fresh services' : 'Recent services'}
                <span className="ml-3 align-middle font-mono text-[11px] text-text-3">
                  {allServiceIdsAreFresh
                    ? `listed in the last ${FRESH_WINDOW_DAYS} days`
                    : `newest ${FEED_SERVICE_LIMIT}`}
                </span>
              </h2>
              <Link href="/services" className="font-mono text-xs text-text-3 hover:text-neon-amber">
                Browse all →
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {recentServices.slice(0, FEED_SERVICE_LIMIT).map(({ service, creator }) => (
                <Card key={service.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="amber">{GAME_LABELS[service.game] ?? service.game}</Badge>
                    <Badge variant="muted">{service.type.replace('_', ' ')}</Badge>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{service.title}</h3>
                  <Link href={`/${creator.handle}`} className="mt-1 block font-mono text-xs text-text-2 hover:text-neon-cyan">
                    @{creator.handle}
                  </Link>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="font-display text-xl text-neon-cyan">{formatInr(service.priceInr)}</div>
                    <Button asChild size="sm">
                      <Link href={`/services/${service.id}`}>Book</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
