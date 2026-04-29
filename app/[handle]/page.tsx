import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import { LobbyPassCard } from '@/components/squadly/lobby-pass-card';
import { RankBadge } from '@/components/squadly/rank-badge';
import { formatInr, GAME_LABELS } from '@/lib/utils';
import {
  getCreatorProfile,
  listCreatorServices,
  listActiveGoals,
  getTopFansForCreator,
  listReviewsForCreator,
} from '@/lib/db/queries';
import type { RankTier } from '@/lib/utils';

export const revalidate = 60;

export default async function StreamerHub({ params }: { params: { handle: string } }) {
  const profile = await getCreatorProfile(params.handle);
  if (!profile || !profile.user.isProvider) notFound();

  const { user, profile: provider, ranks } = profile;

  const [services, goals, topFans, reviews] = await Promise.all([
    listCreatorServices(user.id),
    listActiveGoals(user.id),
    getTopFansForCreator(user.id, 5),
    listReviewsForCreator(user.id, 6),
  ]);

  const primaryRank = ranks.find((r) => r.game === provider?.primaryGame);

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="container-x py-12">
        {/* Profile header */}
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-neon-cyan shadow-glow-cyan">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatarUrl ?? `https://i.pravatar.cc/200?u=${user.id}`} alt={user.displayName} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-text-0">{user.displayName}</h1>
              {user.isVerified && <Badge variant="default">✓ Verified</Badge>}
            </div>
            <div className="mt-1 font-mono text-sm text-text-2">@{user.handle}</div>
            {user.bio && <p className="mt-3 max-w-xl text-text-1">{user.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {provider?.primaryGame && primaryRank && (
                <Badge variant="amber">
                  {GAME_LABELS[provider.primaryGame] ?? provider.primaryGame} · {primaryRank.rankLabel}
                </Badge>
              )}
              {provider?.avgRating && (
                <Badge variant="muted">★ {Number(provider.avgRating).toFixed(1)} · {provider.totalCompleted} completed</Badge>
              )}
            </div>
          </div>
          <Button variant="outline">Tip @{user.handle}</Button>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          {/* LEFT */}
          <div className="space-y-12">
            {/* Services */}
            <section>
              <h2 className="mb-6 font-display text-2xl text-text-0">Services</h2>
              {services.length === 0 ? (
                <Card className="p-8 text-center text-text-3">
                  <p className="font-mono text-sm">No live services yet.</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {services.map((s) => (
                    <Card key={s.id} className="p-6 transition-colors hover:border-border-bright">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <Badge variant="muted">{s.type}</Badge>
                          <h3 className="mt-2 font-display text-lg text-text-0">{s.title}</h3>
                          <div className="mt-1 font-mono text-xs text-text-2">{s.durationMin} min · {s.deliveryWindowHours}h delivery</div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-2xl text-neon-cyan">{formatInr(s.priceInr)}</div>
                          <Button asChild size="sm" className="mt-2">
                            <Link href={`/services/${s.id}`}>Book now</Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Active goals */}
            {goals.length > 0 && (
              <section>
                <h2 className="mb-6 font-display text-2xl text-text-0">Active Squad Goal</h2>
                <Card className="p-7">
                  <div className="font-mono text-xs uppercase tracking-widest text-neon-cyan">
                    Squad Goal
                  </div>
                  <h3 className="mt-2 font-display text-xl text-text-0">{goals[0].goal.title}</h3>
                  <div className="mt-6">
                    <GoalBar current={goals[0].goal.currentCoins} target={goals[0].goal.targetCoins} />
                  </div>
                  <Button asChild className="mt-6 w-full" variant="outline">
                    <Link href="/goals">Contribute coins</Link>
                  </Button>
                </Card>
              </section>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <section>
                <h2 className="mb-6 font-display text-2xl text-text-0">Reviews</h2>
                <div className="space-y-4">
                  {reviews.map((r) => (
                    <Card key={r.review.id} className="p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="font-mono text-sm text-text-1">@{r.reviewer.handle}</div>
                          <div className="font-mono text-xs text-neon-amber">
                            {'★'.repeat(r.review.rating)}{'☆'.repeat(5 - r.review.rating)}
                          </div>
                        </div>
                      </div>
                      {r.review.body && <p className="mt-2 text-sm text-text-1">{r.review.body}</p>}
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            {/* Top fans */}
            {topFans.length > 0 && (
              <Card className="p-6">
                <h3 className="font-display text-lg text-text-0">Top Squad</h3>
                <p className="mt-1 text-xs text-text-2">Top fans by coin spend (this quarter)</p>
                <div className="mt-5 space-y-4">
                  {topFans.map((f, i) => (
                    <div key={f.fan.id} className="flex items-center gap-3">
                      <RankBadge tier={f.rank.currentTier as RankTier} size="sm" />
                      <div className="flex-1">
                        <div className="font-mono text-sm text-text-0">@{f.fan.handle}</div>
                        <div className="font-mono text-xs text-text-2">{f.rank.periodCoinsSpent.toLocaleString()} coins</div>
                      </div>
                      <div className="font-mono text-xs text-text-3">#{i + 1}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
