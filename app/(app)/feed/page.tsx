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

export default async function FeedPage() {
  // Trending services (recent + active passes + ending-soon goals)
  const [endingGoals, openPasses, freshServices] = await Promise.all([
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
    listServices({ limit: 6 }),
  ]);

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
            <h2 className="mb-4 font-display text-2xl text-text-0">
              <span className="text-neon-magenta">●</span> Live bidding
            </h2>
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
            <h2 className="mb-4 font-display text-2xl text-text-0">
              <span className="text-neon-cyan">●</span> Squad Goals ending soon
            </h2>
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

        {/* Fresh services */}
        {freshServices.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-4 font-display text-2xl text-text-0">
              <span className="text-neon-amber">●</span> Fresh services
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {freshServices.slice(0, 6).map(({ service, creator }) => (
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
