import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import {
  listCreatorServices,
  listActiveGoals,
  listOpenPasses,
} from '@/lib/db/queries';
import { formatInr, formatCoins, GAME_LABELS } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * /me/listings — Creator-facing aggregated view of everything you've put up
 * for sale or for fans to fund.
 *
 * Three sections:
 *   1. Your services (live listings)
 *   2. Your Squad Goals (currently active)
 *   3. Your Lobby Passes (currently open)
 *
 * Hub gives you a glance + quick actions; this page is the manage view.
 */
export default async function MyListingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/me/listings');

  const userId = session.user.id;

  const [myServices, myGoals, myPasses] = await Promise.all([
    listCreatorServices(userId),
    listActiveGoals(userId),
    listOpenPasses({ creatorId: userId, limit: 50 }),
  ]);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Listings</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Your Listings</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Everything you&apos;ve put up for fans — services, Squad Goals, and Lobby Passes — in one place.
        </p>

        {/* Quick-create row */}
        <div className="mt-8 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href="/goals/create">+ Goal</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/passes/create">+ Lobby Pass</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/services/create">+ New service</Link>
          </Button>
        </div>

        {/* KPI strip */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Live services</div>
            <div className="mt-2 font-display text-3xl text-text-0">{myServices.length}</div>
          </Card>
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Active goals</div>
            <div className="mt-2 font-display text-3xl text-text-0">{myGoals.length}</div>
          </Card>
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Open Lobby Passes</div>
            <div className="mt-2 font-display text-3xl text-text-0">{myPasses.length}</div>
          </Card>
        </div>

        {/* Section 1 — services */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Your services</h2>
            <Button asChild size="sm">
              <Link href="/services/create">+ New service</Link>
            </Button>
          </div>
          {myServices.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-mono text-sm text-text-3">No services yet. List your first to start earning.</p>
              <Button asChild className="mt-5">
                <Link href="/services/create">Create your first service</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myServices.map((s) => (
                <Card key={s.id} className="p-5">
                  <Badge variant={s.status === 'live' ? 'green' : 'muted'}>{s.status}</Badge>
                  <h3 className="mt-3 line-clamp-2 font-display text-lg text-text-0">{s.title}</h3>
                  <div className="mt-1 font-mono text-xs text-text-2">{s.durationMin} min · {s.deliveryWindowHours}h delivery</div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <div className="font-display text-xl text-neon-cyan">{formatInr(s.priceInr)}</div>
                    <Link href={`/services/${s.id}`} className="font-mono text-xs text-text-2 hover:text-neon-cyan">
                      View →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Section 2 — goals */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Your Squad Goals</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/goals/create">+ Goal</Link>
            </Button>
          </div>
          {myGoals.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-mono text-sm text-text-3">No active Squad Goals. Rally your fans for a push.</p>
              <Button asChild className="mt-5">
                <Link href="/goals/create">Open your first goal</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {myGoals.map(({ goal: g }) => (
                <Link key={g.id} href={`/goals/${g.id}`} className="block group">
                  <Card className="h-full p-5 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={g.status === 'funded' ? 'green' : 'default'}>{g.status}</Badge>
                      <span className="font-mono text-[11px] text-text-3">
                        ends {formatDistanceToNow(new Date(g.deadline), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{g.title}</h3>
                    <div className="mt-4">
                      <GoalBar current={g.currentCoins} target={g.targetCoins} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 font-mono text-xs">
                      <span className="text-text-3">{g.contributorsCount} contributors</span>
                      <span className="text-text-2 group-hover:text-neon-cyan">Manage →</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — passes */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Your Lobby Passes</h2>
            <Button asChild size="sm" variant="outline">
              <Link href="/passes/create">+ Lobby Pass</Link>
            </Button>
          </div>
          {myPasses.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-mono text-sm text-text-3">No open Lobby Passes. Open one for your next stream.</p>
              <Button asChild variant="magenta" className="mt-5">
                <Link href="/passes/create">Open your first pass</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myPasses.map(({ pass }) => (
                <Link key={pass.id} href={`/passes/${pass.id}`} className="block group">
                  <Card className="h-full p-5 transition-all group-hover:border-border-magenta group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="magenta">{pass.slotCount} slot{pass.slotCount > 1 ? 's' : ''}</Badge>
                      <Badge variant="amber">{GAME_LABELS[pass.game] ?? pass.game}</Badge>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">
                      {pass.title}
                    </h3>
                    <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                      <div>
                        <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Min bid</div>
                        <div className="font-display text-lg text-neon-magenta">{formatCoins(pass.minBidCoins)}</div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-text-3">
                        ends {formatDistanceToNow(new Date(pass.endsAt), { addSuffix: true })}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
