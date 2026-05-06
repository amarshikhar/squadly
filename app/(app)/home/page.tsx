import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getVaultBalance,
  listActiveGoals,
  listRequestsForCreator,
  listRequestsForBuyer,
  listCreatorServices,
  listMyGoalContributions,
  listMyLobbyBids,
  listOpenPasses,
} from '@/lib/db/queries';
import { GoalBar } from '@/components/squadly/goal-bar';
import { formatInr, formatCoins, GAME_LABELS } from '@/lib/utils';
import { touch, getStreak } from '@/lib/streaks';
import { db, badgeAwards } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';
import { PurchasesCarousel, type CarouselSlide } from '@/components/squadly/purchases-carousel';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/home');

  const userId = session.user.id;

  // Touch streak — tracks daily engagement
  await touch(userId).catch(() => null);

  const [
    vault,
    myGoals,
    incomingRequests,
    myServices,
    outgoingRequestsAll,
    myContributions,
    myLobbyBids,
    myPasses,
    streak,
    badges,
  ] = await Promise.all([
    getVaultBalance(userId),
    listActiveGoals(userId),
    listRequestsForCreator(userId),
    listCreatorServices(userId),
    listRequestsForBuyer(userId),
    listMyGoalContributions(userId, 6),
    listMyLobbyBids(userId, 6),
    listOpenPasses({ creatorId: userId, limit: 6 }),
    getStreak(userId),
    db.query.badgeAwards.findMany({
      where: eq(badgeAwards.userId, userId),
      orderBy: [desc(badgeAwards.awardedAt)],
      limit: 6,
    }),
  ]);

  // Hide bookings the buyer abandoned at the Razorpay modal — those never
  // captured payment so they shouldn't show up as "booked" in the outgoing list.
  const outgoingRequests = outgoingRequestsAll.filter(
    (r) => !(r.request.status === 'cancelled' && r.request.cancelReason === 'payment_abandoned'),
  );

  const pendingIncoming = incomingRequests.filter((r) => r.request.status === 'pending').length;
  const pendingOutgoing = outgoingRequests.filter((r) => r.request.status === 'pending').length;
  const pendingCount = pendingIncoming + pendingOutgoing;

  // Build the three carousel slides — Services Purchased, Goal Contributions,
  // Lobby Pass Bids — only including ones that have data, but keeping all
  // three slots so the carousel UI stays consistent.
  const purchaseSlides: CarouselSlide[] = [
    {
      id: 'services-purchased',
      title: 'Services purchased',
      count: outgoingRequests.length,
      content: (
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Services purchased</div>
            <Badge variant="muted">{outgoingRequests.length}</Badge>
          </div>
          {outgoingRequests.length === 0 ? (
            <p className="font-mono text-xs text-text-3">No purchases yet. Browse services to get started.</p>
          ) : (
            <ul className="divide-y divide-border">
              {outgoingRequests.slice(0, 5).map((p) => (
                <li key={p.request.id} className="py-3">
                  <Link href={`/requests/${p.request.id}`} className="block hover:text-neon-cyan">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-sm text-text-0">{p.service.title}</div>
                        <div className="truncate font-mono text-[11px] text-text-3">
                          @{p.creator.handle} · {formatInr(p.request.priceInrPaid)}
                        </div>
                      </div>
                      <Badge variant={p.request.status === 'completed' ? 'green' : 'muted'}>
                        {p.request.status}
                      </Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <Link href="/me/purchases" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
              See all →
            </Link>
          </div>
        </Card>
      ),
    },
    {
      id: 'goal-contributions',
      title: 'Goal contributions',
      count: myContributions.length,
      content: (
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Goal contributions</div>
            <Badge variant="muted">{myContributions.length}</Badge>
          </div>
          {myContributions.length === 0 ? (
            <p className="font-mono text-xs text-text-3">You haven&apos;t backed any goals yet. Find one to support.</p>
          ) : (
            <ul className="divide-y divide-border">
              {myContributions.map((c) => (
                <li key={c.goalId} className="py-3">
                  <Link href={`/goals/${c.goalId}`} className="block hover:text-neon-cyan">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-mono text-sm text-text-0">{c.goalTitle}</div>
                        <div className="truncate font-mono text-[11px] text-text-3">@{c.creator.handle}</div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="font-mono text-sm text-neon-cyan">{formatCoins(Number(c.myCoins))}</div>
                        <div className="font-mono text-[10px] text-text-3">contributed</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <GoalBar current={c.goalCurrentCoins} target={c.goalTargetCoins} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <Link href="/me/purchases" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
              See all →
            </Link>
          </div>
        </Card>
      ),
    },
    {
      id: 'lobby-bids',
      title: 'Lobby Pass bids',
      count: myLobbyBids.length,
      content: (
        <Card className="h-full p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-widest text-text-2">Lobby Pass bids</div>
            <Badge variant="muted">{myLobbyBids.length}</Badge>
          </div>
          {myLobbyBids.length === 0 ? (
            <p className="font-mono text-xs text-text-3">No bids yet. Find a live auction and grab a slot.</p>
          ) : (
            <ul className="divide-y divide-border">
              {myLobbyBids.slice(0, 5).map((b) => {
                const isOpen =
                  b.passStatus === 'open' && new Date(b.passEndsAt as any) > new Date();
                const won = b.myBidStatus === 'won' || b.myBidStatus === 'winning';
                return (
                  <li key={b.passId} className="py-3">
                    <Link href={`/passes/${b.passId}`} className="block hover:text-neon-magenta">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-mono text-sm text-text-0">{b.passTitle}</div>
                          <div className="truncate font-mono text-[11px] text-text-3">
                            @{b.creator.handle} · {GAME_LABELS[b.passGame as any] ?? b.passGame}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="font-mono text-sm text-neon-magenta">
                            {formatCoins(Number(b.myTopBid))}
                          </div>
                          <Badge variant={isOpen ? 'magenta' : won ? 'green' : 'muted'}>
                            {isOpen ? 'Live' : won ? 'Won' : b.passStatus}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-4 flex justify-end border-t border-border pt-3">
            <Link href="/me/purchases" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
              See all →
            </Link>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Hub</Badge>
        <h1 className="mt-6 font-display text-display-lg text-text-0">
          Welcome back, {session.user.name?.split(' ')[0] ?? 'player'}.
        </h1>

        {/* Streak + quick links */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {streak && streak.currentDays > 0 && (
            <div className="flex items-center gap-2 rounded-full border border-neon-amber/30 bg-neon-amber/10 px-4 py-2">
              <span className="text-neon-amber">🔥</span>
              <span className="font-mono text-sm text-text-0">
                <span className="text-neon-amber font-semibold">{streak.currentDays}</span>-day streak
              </span>
              {streak.longestDays > streak.currentDays && (
                <span className="font-mono text-[11px] text-text-3">· best {streak.longestDays}</span>
              )}
            </div>
          )}
          <Link href="/referrals" className="rounded-full border border-border-bright bg-neon-cyan/5 px-4 py-2 font-mono text-xs text-neon-cyan hover:bg-neon-cyan/10">
            🎁 Invite & earn coins
          </Link>
          <Link href="/feed" className="rounded-full border border-border bg-bg-2 px-4 py-2 font-mono text-xs text-text-2 hover:border-border-bright hover:text-text-0">
            What&apos;s happening →
          </Link>
        </div>

        {/* KPI row */}
        <div className="mt-10 grid gap-6 md:grid-cols-3 md:auto-rows-fr">
          <Link href="/vault" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Vault — Coins</div>
              <div className="mt-2 font-display text-3xl text-neon-magenta glow-magenta-text">
                {formatCoins(vault.coinBalance)}
              </div>
              <div className="mt-2 font-mono text-xs text-text-3">Spend on Goals · Lobby Passes · Tips</div>
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Open Vault →</div>
            </Card>
          </Link>

          <Link href="/me/listings" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Goals you&apos;re running</div>
              <div className="mt-2 font-display text-3xl text-text-0">{myGoals.length}</div>
              {myContributions.length > 0 && (
                <div className="mt-2 font-mono text-xs text-text-3">
                  + {myContributions.length} you&apos;ve backed
                </div>
              )}
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Manage listings →</div>
            </Card>
          </Link>

          <Link href="/requests" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Pending Requests</div>
              <div className="mt-2 font-display text-3xl text-text-0">{pendingCount}</div>
              <div className="mt-2 font-mono text-xs text-text-3">
                {pendingIncoming} incoming · {pendingOutgoing} outgoing
              </div>
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Review requests →</div>
            </Card>
          </Link>
        </div>

        {/* Secondary KPI row — Payouts, Profile, Notifications */}
        <div className="mt-6 grid gap-6 md:grid-cols-3 md:auto-rows-fr">
          <Link href="/payouts" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Payouts</div>
              <div className="mt-2 font-display text-2xl text-neon-cyan">
                {formatInr(vault.inrBalance)}
              </div>
              <div className="mt-2 font-mono text-xs text-text-3">
                {vault.inrPending > 0 ? `+ ${formatInr(vault.inrPending)} pending` : 'Available to withdraw'}
              </div>
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Withdraw → Stripe →</div>
            </Card>
          </Link>

          <Link href="/profile" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Profile</div>
              <div className="mt-2 font-display text-2xl text-text-0">@{session.user.name?.split(' ')[0]?.toLowerCase() ?? 'you'}</div>
              <div className="mt-2 font-mono text-xs text-text-3">Avatar · games · ranks · payout setup</div>
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Edit profile →</div>
            </Card>
          </Link>

          <Link href="/notifications" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Notifications</div>
              <div className="mt-2 font-display text-2xl text-text-0">Inbox</div>
              <div className="mt-2 font-mono text-xs text-text-3">Bids · contributions · DMs · updates</div>
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Open inbox →</div>
            </Card>
          </Link>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <section className="mt-14">
            <h2 className="mb-4 font-display text-2xl text-text-0">Your badges</h2>
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <Badge key={b.id} variant="amber">
                  {b.code.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Purchases & Contributions — looping carousel with 3 slides.
            Heading is a clickable link to the dedicated /me/purchases view. */}
        <div className="mt-16">
          <PurchasesCarousel
            heading="Purchases & Contributions"
            headingHref="/me/purchases"
            slides={purchaseSlides}
          />
        </div>

        {/* Quick create row — moved up here so it sits above ALL the
            "Your X" sections. All three buttons share one outline style so
            no single one stands out as the bright/primary CTA. */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl text-text-0">Open something new</h2>
            <Link href="/me/listings" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
              View all your listings →
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="outline">
              <Link href="/goals/create">+ Goal</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/passes/create">+ Lobby Pass</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/services/create">+ New service</Link>
            </Button>
          </div>
        </section>

        {/* Your Squad Goals — only show when user has any. Title is clickable,
            cards too. */}
        {myGoals.length > 0 && (
          <section className="mt-16">
            <div className="mb-5 flex items-center justify-between">
              <Link
                href="/me/listings"
                className="group inline-flex items-center gap-2 font-display text-2xl text-text-0 transition-colors hover:text-neon-cyan"
              >
                Your Squad Goals
                <span className="font-mono text-base text-text-3 transition-all group-hover:translate-x-0.5 group-hover:text-neon-cyan">
                  →
                </span>
              </Link>
              <Link href="/me/listings" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
                See all →
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {myGoals.slice(0, 6).map(({ goal: g }) => (
                <Link key={g.id} href={`/goals/${g.id}`} className="block group">
                  <Card className="h-full p-5 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <Badge variant="default">{g.status}</Badge>
                      <span className="font-mono text-[11px] text-text-3">
                        ends {formatDistanceToNow(new Date(g.deadline), { addSuffix: true })}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">
                      {g.title}
                    </h3>
                    <div className="mt-4">
                      <GoalBar current={g.currentCoins} target={g.targetCoins} />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Your Lobby Passes — title clickable */}
        {myPasses.length > 0 && (
          <section className="mt-16">
            <div className="mb-5 flex items-center justify-between">
              <Link
                href="/me/listings"
                className="group inline-flex items-center gap-2 font-display text-2xl text-text-0 transition-colors hover:text-neon-cyan"
              >
                Your Lobby Passes
                <span className="font-mono text-base text-text-3 transition-all group-hover:translate-x-0.5 group-hover:text-neon-cyan">
                  →
                </span>
              </Link>
              <Link href="/me/listings" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
                See all →
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {myPasses.slice(0, 6).map(({ pass }) => (
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
          </section>
        )}

        {/* Your services — title clickable, cards fully clickable. The
            create buttons now live in the row above so this section is a
            pure listing view. */}
        <section className="mt-16">
          <div className="mb-5 flex items-center justify-between">
            <Link
              href="/me/listings"
              className="group inline-flex items-center gap-2 font-display text-2xl text-text-0 transition-colors hover:text-neon-cyan"
            >
              Your services
              <span className="font-mono text-base text-text-3 transition-all group-hover:translate-x-0.5 group-hover:text-neon-cyan">
                →
              </span>
            </Link>
            <Link href="/me/listings" className="font-mono text-xs text-text-2 hover:text-neon-cyan">
              See all →
            </Link>
          </div>

          {myServices.length === 0 ? (
            <Card className="p-10 text-center text-text-3">
              <p className="font-mono text-sm">No services yet. List your first to start earning.</p>
              <Button asChild className="mt-5" variant="outline">
                <Link href="/services/create">Create your first service</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myServices.map((s) => (
                <Link key={s.id} href={`/services/${s.id}`} className="block group">
                  <Card className="h-full p-5 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5">
                    <Badge variant={s.status === 'live' ? 'green' : 'muted'}>{s.status}</Badge>
                    <h3 className="mt-3 line-clamp-2 font-display text-lg text-text-0">{s.title}</h3>
                    <div className="mt-1 font-mono text-xs text-text-2">{s.durationMin} min</div>
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <div className="font-display text-xl text-neon-cyan">{formatInr(s.priceInr)}</div>
                      <span className="font-mono text-xs text-text-2 group-hover:text-neon-cyan">
                        View →
                      </span>
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
