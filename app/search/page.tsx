import Link from 'next/link';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoalBar } from '@/components/squadly/goal-bar';
import { searchAll } from '@/lib/db/queries';
import { formatInr, GAME_LABELS, formatCoins } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const query = (searchParams.q ?? '').trim();
  const results = query ? await searchAll(query, 8) : { users: [], services: [], goals: [], passes: [] };
  const total = results.users.length + results.services.length + results.goals.length + results.passes.length;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <Badge variant="default">● Search</Badge>
        {query ? (
          <>
            <h1 className="mt-4 font-display text-display-md text-text-0">
              {total} result{total === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
            </h1>
            {total === 0 && (
              <Card className="mt-10 p-12 text-center text-text-3">
                <p className="font-mono text-sm">
                  Nothing matched. Try a different search term, or browse{' '}
                  <Link href="/services" className="text-neon-cyan hover:underline">all services</Link>.
                </p>
              </Card>
            )}
          </>
        ) : (
          <>
            <h1 className="mt-4 font-display text-display-md text-text-0">Search</h1>
            <p className="mt-3 text-text-2">Type in the nav bar above to search creators, services, goals, and Lobby Passes.</p>
          </>
        )}

        {/* Creators */}
        {results.users.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-2xl text-text-0">Creators</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.users.map((u) => (
                <Link key={u.id} href={`/${u.handle}`}>
                  <Card className="flex items-center gap-3 p-4 transition-colors hover:border-border-bright">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u.avatarUrl ?? `https://i.pravatar.cc/100?u=${u.id}`} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-text-0 truncate">@{u.handle}</span>
                        {u.isVerified && <span className="text-neon-cyan text-xs">✓</span>}
                      </div>
                      <div className="font-mono text-xs text-text-3 truncate">{u.displayName}</div>
                    </div>
                    {u.isProvider && <Badge variant="amber">Creator</Badge>}
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Services */}
        {results.services.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-2xl text-text-0">Services</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.services.map(({ service: s, creator }) => (
                <Card key={s.id} className="p-5 transition-colors hover:border-border-bright">
                  <div className="flex items-center justify-between">
                    <Badge variant="amber">{GAME_LABELS[s.game] ?? s.game}</Badge>
                    <Badge variant="muted">{s.type.replace('_', ' ')}</Badge>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{s.title}</h3>
                  <Link href={`/${creator.handle}`} className="mt-1 block font-mono text-xs text-text-2 hover:text-neon-cyan">
                    @{creator.handle}
                  </Link>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-display text-lg text-neon-cyan">{formatInr(s.priceInr)}</div>
                    <Link href={`/services/${s.id}`} className="font-mono text-xs text-neon-cyan hover:underline">
                      View →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Goals */}
        {results.goals.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-2xl text-text-0">Squad Goals</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.goals.map(({ goal: g, creator }) => (
                <Card key={g.id} className="p-5 transition-colors hover:border-border-bright">
                  <Link href={`/${creator.handle}`} className="font-mono text-xs text-neon-cyan hover:underline">
                    @{creator.handle}
                  </Link>
                  <h3 className="mt-2 line-clamp-2 font-display text-base leading-tight text-text-0">{g.title}</h3>
                  <div className="mt-4">
                    <GoalBar current={g.currentCoins} target={g.targetCoins} showPct={false} />
                  </div>
                  <Link href={`/goals/${g.id}`} className="mt-3 block font-mono text-xs text-neon-cyan hover:underline">
                    View →
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Lobby Passes */}
        {results.passes.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 font-display text-2xl text-text-0">Lobby Passes</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.passes.map(({ pass: p, creator }) => (
                <Card key={p.id} className="p-5 transition-colors hover:border-border-magenta">
                  <div className="flex items-center justify-between">
                    <Badge variant="magenta">{p.slotCount} slot{p.slotCount > 1 ? 's' : ''}</Badge>
                    <Link href={`/${creator.handle}`} className="font-mono text-xs text-text-2 hover:text-neon-magenta">
                      @{creator.handle}
                    </Link>
                  </div>
                  <h3 className="mt-3 line-clamp-2 font-display text-base leading-tight text-text-0">{p.title}</h3>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="font-mono text-xs text-text-2">min {formatCoins(p.minBidCoins)}</div>
                    <Link href={`/passes/${p.id}`} className="font-mono text-xs text-neon-magenta hover:underline">
                      Bid →
                    </Link>
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
