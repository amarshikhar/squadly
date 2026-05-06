import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import {
  listRequestsForBuyer,
  listMyGoalContributions,
  listMyLobbyBids,
} from '@/lib/db/queries';
import { formatInr, formatCoins, GAME_LABELS } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

/**
 * /me/purchases — Fan-facing aggregated view of everything you've spent on.
 *
 * Three sections:
 *   1. Services purchased (real money, INR via Razorpay)
 *   2. Goal contributions (coins, recurring micro-spend)
 *   3. Lobby Pass bids (coins, time-boxed auctions)
 *
 * Hub also surfaces the same three as a carousel; this page is the "deep-dive"
 * view with the full lists and richer per-row info.
 */
export default async function MyPurchasesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/me/purchases');

  const userId = session.user.id;

  const [outgoingRequestsAll, myContributions, myLobbyBids] = await Promise.all([
    listRequestsForBuyer(userId),
    listMyGoalContributions(userId, 50),
    listMyLobbyBids(userId, 50),
  ]);

  // Hide bookings the buyer abandoned at the Razorpay modal (no money moved).
  const outgoingRequests = outgoingRequestsAll.filter(
    (r) => !(r.request.status === 'cancelled' && r.request.cancelReason === 'payment_abandoned'),
  );

  // Total spent only counts requests that actually went through (i.e., not
  // cancelled). Otherwise abandoned/refunded bookings would inflate the figure.
  const totalSpent = outgoingRequests
    .filter((r) => r.request.status !== 'cancelled')
    .reduce((sum, r) => sum + r.request.priceInrPaid, 0);
  const totalContribCoins = myContributions.reduce((sum, c) => sum + Number(c.myCoins), 0);
  const totalBidCoins = myLobbyBids.reduce((sum, b) => sum + Number(b.myTopBid), 0);

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Purchases &amp; Contributions</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Your Purchases &amp; Contributions</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Everything you&apos;ve spent on Squadly — services, goal contributions, and lobby bids — in one place.
        </p>

        {/* Top KPI strip */}
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Spent on services</div>
            <div className="mt-2 font-display text-3xl text-neon-cyan">{formatInr(totalSpent)}</div>
            <div className="mt-1 font-mono text-xs text-text-3">{outgoingRequests.length} bookings</div>
          </Card>
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Coins on goals</div>
            <div className="mt-2 font-display text-3xl text-neon-cyan glow-cyan-text">{formatCoins(totalContribCoins)}</div>
            <div className="mt-1 font-mono text-xs text-text-3">{myContributions.length} goals backed</div>
          </Card>
          <Card className="p-6">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Coins in bids</div>
            <div className="mt-2 font-display text-3xl text-neon-magenta glow-magenta-text">{formatCoins(totalBidCoins)}</div>
            <div className="mt-1 font-mono text-xs text-text-3">{myLobbyBids.length} passes</div>
          </Card>
        </div>

        {/* Section 1 — services purchased */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Services purchased</h2>
            <Badge variant="muted">{outgoingRequests.length}</Badge>
          </div>
          {outgoingRequests.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-mono text-sm text-text-3">No services purchased yet.</p>
              <Button asChild className="mt-5" variant="outline">
                <Link href="/services">Browse services →</Link>
              </Button>
            </Card>
          ) : (
            // Scrollable container — keeps the page scannable when the user has
            // many purchases. Always sorted newest-first by listRequestsForBuyer.
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
              {outgoingRequests.map((p) => (
                <Link key={p.request.id} href={`/requests/${p.request.id}`} className="block group">
                  <Card className="h-full p-5 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={p.request.status === 'completed' ? 'green' : 'muted'}>
                        {p.request.status.replace('_', ' ')}
                      </Badge>
                      <div className="font-mono text-[11px] text-text-3">
                        {formatDistanceToNow(new Date(p.request.requestedAt), { addSuffix: true })}
                      </div>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">
                      {p.service.title}
                    </h3>
                    <div className="mt-2 font-mono text-xs text-text-3">@{p.creator.handle}</div>
                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div className="font-display text-lg text-neon-cyan">{formatInr(p.request.priceInrPaid)}</div>
                      <span className="font-mono text-xs text-text-2 group-hover:text-neon-cyan">View →</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 2 — goal contributions */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Goal contributions</h2>
            <Badge variant="muted">{myContributions.length}</Badge>
          </div>
          {myContributions.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-mono text-sm text-text-3">You haven&apos;t backed any Squad Goals yet.</p>
              <Button asChild className="mt-5" variant="outline">
                <Link href="/goals">Find a Squad Goal →</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2">
              {myContributions.map((c) => (
                <Link key={c.goalId} href={`/goals/${c.goalId}`} className="block group">
                  <Card className="h-full p-5 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <Badge variant={c.goalStatus === 'funded' ? 'green' : c.goalStatus === 'active' ? 'default' : 'muted'}>
                        {c.goalStatus}
                      </Badge>
                      <div className="font-mono text-[11px] text-text-3">@{c.creator.handle}</div>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{c.goalTitle}</h3>
                    <div className="mt-4">
                      <GoalBar current={c.goalCurrentCoins} target={c.goalTargetCoins} />
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="font-mono text-text-3">You contributed</span>
                      <span className="font-mono text-neon-cyan">{formatCoins(Number(c.myCoins))}</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — lobby pass bids */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Lobby Pass bids</h2>
            <Badge variant="muted">{myLobbyBids.length}</Badge>
          </div>
          {myLobbyBids.length === 0 ? (
            <Card className="p-10 text-center">
              <p className="font-mono text-sm text-text-3">No bids yet. Find a live auction.</p>
              <Button asChild variant="magenta" className="mt-5">
                <Link href="/passes">Browse Lobby Passes →</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid max-h-[70vh] gap-4 overflow-y-auto pr-2 md:grid-cols-2 lg:grid-cols-3">
              {myLobbyBids.map((b) => {
                const isOpen = b.passStatus === 'open' && new Date(b.passEndsAt as any) > new Date();
                const won = b.myBidStatus === 'won' || b.myBidStatus === 'winning';
                return (
                  <Link key={b.passId} href={`/passes/${b.passId}`} className="block group">
                    <Card className="h-full p-5 transition-all group-hover:border-border-magenta group-hover:-translate-y-0.5">
                      <div className="flex items-center justify-between">
                        <Badge variant={isOpen ? 'magenta' : won ? 'green' : 'muted'}>
                          {isOpen ? 'Live' : won ? 'Won' : b.passStatus}
                        </Badge>
                        <Badge variant="amber">{GAME_LABELS[b.passGame as any] ?? b.passGame}</Badge>
                      </div>
                      <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">
                        {b.passTitle}
                      </h3>
                      <div className="mt-1 font-mono text-[11px] text-text-3">@{b.creator.handle}</div>
                      <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                        <div>
                          <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Your top bid</div>
                          <div className="font-display text-lg text-neon-magenta">{formatCoins(Number(b.myTopBid))}</div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-text-3">
                          {isOpen
                            ? `ends ${formatDistanceToNow(new Date(b.passEndsAt as any), { addSuffix: true })}`
                            : 'closed'}
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
