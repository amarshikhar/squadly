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
} from '@/lib/db/queries';
import { GoalBar } from '@/components/squadly/goal-bar';
import { formatInr, formatCoins, GAME_LABELS } from '@/lib/utils';
import { touch, getStreak } from '@/lib/streaks';
import { db, badgeAwards } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { formatDistanceToNow } from 'date-fns';

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
    outgoingRequests,
    myContributions,
    myLobbyBids,
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
    getStreak(userId),
    db.query.badgeAwards.findMany({
      where: eq(badgeAwards.userId, userId),
      orderBy: [desc(badgeAwards.awardedAt)],
      limit: 6,
    }),
  ]);

  // Pending = both sides — what you owe a buyer + what you're waiting for from a creator.
  const pendingIncoming = incomingRequests.filter((r) => r.request.status === 'pending').length;
  const pendingOutgoing = outgoingRequests.filter((r) => r.request.status === 'pending').length;
  const pendingCount = pendingIncoming + pendingOutgoing;

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

          <Link href="/goals" className="block group h-full">
            <Card className="flex h-full flex-col p-6 transition-all group-hover:border-border-bright group-hover:-translate-y-0.5 cursor-pointer">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Goals you&apos;re running</div>
              <div className="mt-2 font-display text-3xl text-text-0">{myGoals.length}</div>
              {myContributions.length > 0 && (
                <div className="mt-2 font-mono text-xs text-text-3">
                  + {myContributions.length} you&apos;ve backed
                </div>
              )}
              <div className="mt-auto pt-4 font-mono text-xs text-text-2 group-hover:text-neon-cyan">Manage goals →</div>
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

        {/* Secondary KPI row — Payouts, Profile, quick links */}
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

        {/* Lobby Pass bids — what the user is currently bidding on */}
        {myLobbyBids.length > 0 && (
          <section className="mt-16">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-2xl text-text-0">Your Lobby Pass bids</h2>
              <Badge variant="muted">{myLobbyBids.length}</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myLobbyBids.map((b) => {
                const isOpen = b.passStatus === 'open' && new Date(b.passEndsAt as any) > new Date();
                const won = b.myBidStatus === 'won' || b.myBidStatus === 'winning';
                return (
                  <Link key={b.passId} href={`/passes/${b.passId}`} className="block group">
                    <Card className="p-5 transition-all group-hover:border-border-magenta group-hover:-translate-y-0.5">
                      <div className="flex items-center justify-between">
                        <Badge variant={isOpen ? 'magenta' : won ? 'green' : 'muted'}>
                          {isOpen ? 'Live' : won ? 'Won' : b.passStatus}
                        </Badge>
                        <Badge variant="amber">{GAME_LABELS[b.passGame as any] ?? b.passGame}</Badge>
                      </div>
                      <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{b.passTitle}</h3>
                      <div className="mt-1 font-mono text-xs text-text-3">@{b.creator.handle}</div>
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
          </section>
        )}

        {/* Purchases & Contributions */}
        {(outgoingRequests.length > 0 || myContributions.length > 0) && (
          <section className="mt-16">
            <h2 className="mb-5 font-display text-2xl text-text-0">Purchases &amp; Contributions</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Services purchased */}
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-mono text-xs uppercase tracking-widest text-text-2">Services purchased</div>
                  <Badge variant="muted">{outgoingRequests.length}</Badge>
                </div>
                {outgoingRequests.length === 0 ? (
                  <p className="font-mono text-xs text-text-3">No purchases yet.</p>
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
                {outgoingRequests.length > 5 && (
                  <Link href="/requests?role=buyer" className="mt-3 inline-block font-mono text-xs text-text-2 hover:text-neon-cyan">
                    See all {outgoingRequests.length} purchases →
                  </Link>
                )}
              </Card>

              {/* Goal contributions */}
              <Card className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-mono text-xs uppercase tracking-widest text-text-2">Goal contributions</div>
                  <Badge variant="muted">{myContributions.length}</Badge>
                </div>
                {myContributions.length === 0 ? (
                  <p className="font-mono text-xs text-text-3">You haven&apos;t backed any goals yet.</p>
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
              </Card>
            </div>
          </section>
        )}

        {/* Services + create buttons (Goal / Pass / Service) */}
        <section className="mt-16">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl text-text-0">Your services</h2>
            <div className="flex flex-wrap gap-2">
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
          </div>

          {myServices.length === 0 ? (
            <Card className="p-10 text-center text-text-3">
              <p className="font-mono text-sm">No services yet. List your first to start earning.</p>
              <Button asChild className="mt-5">
                <Link href="/services/create">Create your first service</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {myServices.map((s) => (
                <Card key={s.id} className="p-5">
                  <Badge variant={s.status === 'live' ? 'green' : 'muted'}>{s.status}</Badge>
                  <h3 className="mt-3 font-display text-lg text-text-0">{s.title}</h3>
                  <div className="mt-1 font-mono text-xs text-text-2">{s.durationMin} min</div>
                  <div className="mt-3 flex items-center justify-between">
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
      </main>
    </div>
  );
}
