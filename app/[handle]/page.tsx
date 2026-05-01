import { notFound } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import { LobbyPassCard } from '@/components/squadly/lobby-pass-card';
import { RankBadge } from '@/components/squadly/rank-badge';
import { formatInr, GAME_LABELS } from '@/lib/utils';

/**
 * Public Streamer Hub — the creator profile page.
 * Currently uses placeholder data; Phase 1 wires this to real DB queries.
 */
export default async function StreamerHub({ params }: { params: { handle: string } }) {
  // TODO: replace with real query
  // const user = await db.query.users.findFirst({ where: eq(users.handle, params.handle) });
  // if (!user) notFound();

  // Placeholder data for now
  const user = {
    handle: params.handle,
    displayName: params.handle.charAt(0).toUpperCase() + params.handle.slice(1),
    bio: 'Conqueror BGMI · Daily streams · Coaching for serious players',
    avatarUrl: `https://i.pravatar.cc/200?u=${params.handle}`,
    primaryGame: 'bgmi',
    rank: 'Conqueror',
    avgRating: 4.9,
    totalCompleted: 127,
  };

  const services = [
    { id: '1', title: '1-Hour BGMI Coaching', type: 'Coaching', price: 50000, duration: '60 min' },
    { id: '2', title: '5-Game Duo Push', type: 'Duo', price: 80000, duration: '120 min' },
    { id: '3', title: 'Crosshair Fix Session', type: 'Crosshair', price: 15000, duration: '30 min' },
  ];

  return (
    <div className="min-h-screen">
      <Nav />

      <main className="container-x py-12">
        {/* Profile header */}
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border-2 border-neon-cyan shadow-glow-cyan">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl font-bold text-text-0">{user.displayName}</h1>
              <Badge variant="default">✓ Verified</Badge>
            </div>
            <div className="mt-1 font-mono text-sm text-text-2">@{user.handle}</div>
            <p className="mt-3 max-w-xl text-text-1">{user.bio}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="amber">{GAME_LABELS[user.primaryGame] ?? user.primaryGame} · {user.rank}</Badge>
              <Badge variant="muted">★ {user.avgRating} · {user.totalCompleted} completed</Badge>
            </div>
          </div>
          <Button>Tip @{user.handle}</Button>
        </div>

        <div className="mt-16 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-12">
            {/* Services */}
            <section>
              <h2 className="mb-6 font-display text-2xl text-text-0">Services</h2>
              <div className="grid gap-4">
                {services.map((s) => (
                  <Card key={s.id} className="p-6 transition-colors hover:border-border-bright">
                    <div className="flex items-center justify-between">
                      <div>
                        <Badge variant="muted">{s.type}</Badge>
                        <h3 className="mt-2 font-display text-lg text-text-0">{s.title}</h3>
                        <div className="mt-1 font-mono text-xs text-text-2">{s.duration}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl text-neon-cyan">{formatInr(s.price)}</div>
                        <Button size="sm" className="mt-2">Book now</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </section>

            {/* Active goal */}
            <section>
              <h2 className="mb-6 font-display text-2xl text-text-0">Active Squad Goal</h2>
              <Card className="p-7">
                <div className="font-mono text-xs uppercase tracking-widest text-neon-cyan">Squad Goal · #482</div>
                <h3 className="mt-2 font-display text-xl text-text-0">Conqueror push tonight — full lobby, no leave</h3>
                <div className="mt-6">
                  <GoalBar current={1250} target={1500} />
                </div>
                <Button className="mt-6 w-full" variant="outline">Contribute coins</Button>
              </Card>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <LobbyPassCard
              title="BGMI Conqueror Lobby"
              game="BGMI · 2-hr session"
              slotCount={2}
              topBid={{ bidderHandle: 'arjun_bgmi', amount: 850, ageMinutes: 12 }}
              recentBids={[
                { bidderHandle: 'aniket7', amount: 820, ageMinutes: 18 },
                { bidderHandle: 'jiyaragingg', amount: 750, ageMinutes: 24 },
                { bidderHandle: 'karan_gg', amount: 700, ageMinutes: 31 },
              ]}
              secondsRemaining={2538}
              bidderCount={23}
            />

            <Card className="p-6">
              <h3 className="font-display text-lg text-text-0">Top Squad</h3>
              <p className="mt-1 text-xs text-text-2">Top fans by coin spend (this quarter)</p>
              <div className="mt-5 space-y-4">
                {[
                  { handle: 'rohit_ace', tier: 'commander' as const, coins: 5400 },
                  { handle: 'arjun_bgmi', tier: 'legend' as const, coins: 2200 },
                  { handle: 'karan_gg', tier: 'veteran' as const, coins: 1500 },
                ].map((f, i) => (
                  <div key={f.handle} className="flex items-center gap-3">
                    <RankBadge tier={f.tier} size="sm" />
                    <div className="flex-1">
                      <div className="font-mono text-sm text-text-0">@{f.handle}</div>
                      <div className="font-mono text-xs text-text-2">{f.coins.toLocaleString()} coins</div>
                    </div>
                    <div className="font-mono text-xs text-text-3">#{i + 1}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
