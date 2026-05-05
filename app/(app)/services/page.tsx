import Link from 'next/link';
import { and, sql, inArray } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import { formatInr, formatCoins, GAME_LABELS } from '@/lib/utils';
import { SUPPORTED_GAMES, SERVICE_TYPES } from '@/lib/constants';
import { listServices, listOpenPasses, listActiveGoals } from '@/lib/db/queries';
import { db, lobbyPassBids } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';

export const revalidate = 30;

type Kind = 'services' | 'passes' | 'goals';

interface SearchParams {
  kind?: Kind;
  game?: string;
  type?: string;
  q?: string;
  min?: string;        // INR (rupees)
  max?: string;
  verified?: string;
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'rating';
}

function buildQueryString(current: SearchParams, override: Partial<SearchParams>): string {
  const merged = { ...current, ...override };
  const params = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  });
  const s = params.toString();
  return s ? '?' + s : '';
}

export default async function ServicesPage({ searchParams }: { searchParams: SearchParams }) {
  const kind: Kind = searchParams.kind === 'passes'
    ? 'passes'
    : searchParams.kind === 'goals'
      ? 'goals'
      : 'services';

  const services = kind === 'services'
    ? await listServices({
        game: searchParams.game,
        type: searchParams.type,
        search: searchParams.q,
        minPriceInr: searchParams.min ? Number(searchParams.min) * 100 : undefined,
        maxPriceInr: searchParams.max ? Number(searchParams.max) * 100 : undefined,
        verifiedOnly: searchParams.verified === '1',
        sort: searchParams.sort ?? 'recent',
        limit: 60,
      })
    : [];

  const passes = kind === 'passes'
    ? await listOpenPasses({ game: searchParams.game, limit: 60 })
    : [];

  // Goals are not game-scoped in the schema — no game filter applied.
  const goals = kind === 'goals'
    ? await listActiveGoals()
    : [];

  // Hydrate top bids for each pass (parity with /passes/page.tsx).
  const topByPass: Record<string, number> = {};
  if (kind === 'passes' && passes.length > 0) {
    const passIds = passes.map((p) => p.pass.id);
    const tops = await db
      .select({
        passId: lobbyPassBids.passId,
        topAmount: sql<number>`MAX(${lobbyPassBids.coinAmount})`,
      })
      .from(lobbyPassBids)
      .where(and(
        inArray(lobbyPassBids.passId, passIds),
        sql`${lobbyPassBids.status} IN ('winning','active')`,
      ))
      .groupBy(lobbyPassBids.passId);
    tops.forEach((t) => (topByPass[t.passId] = Number(t.topAmount)));
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Discovery</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Browse</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Coaching, duos, and rank pushes — plus live Lobby Pass auctions and Squad Goals to crowd-fund.
        </p>

        {/* Kind tabs */}
        <div className="mt-8 flex gap-2 border-b border-border">
          {[
            { code: 'services' as const, label: 'Services' },
            { code: 'goals' as const, label: 'Squad Goals' },
            { code: 'passes' as const, label: 'Lobby Passes' },
          ].map((t) => {
            const active = kind === t.code;
            // Switching tabs preserves only the universal `game` filter (which doesn't apply to goals);
            // service-only filters are dropped.
            const nextGame = t.code === 'goals' ? undefined : searchParams.game;
            const href = '/services' + buildQueryString(
              { game: nextGame },
              { kind: t.code === 'services' ? undefined : t.code },
            );
            return (
              <Link
                key={t.code}
                href={href}
                className={
                  'relative -mb-px border-b-2 px-4 py-2 font-mono text-xs uppercase tracking-widest transition-colors ' +
                  (active
                    ? 'border-neon-cyan text-text-0'
                    : 'border-transparent text-text-3 hover:text-text-1')
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        {kind === 'services' ? (
          <ServicesView services={services} searchParams={searchParams} />
        ) : kind === 'passes' ? (
          <PassesView passes={passes} topByPass={topByPass} searchParams={searchParams} />
        ) : (
          <GoalsView goals={goals} />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Services tab — preserves all existing filters and behaviour.
// ---------------------------------------------------------------------------
function ServicesView({
  services,
  searchParams,
}: {
  services: Awaited<ReturnType<typeof listServices>>;
  searchParams: SearchParams;
}) {
  return (
    <>
      {/* Search bar */}
      <form className="mt-8" action="/services">
        <div className="flex gap-3">
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search BGMI coaching, Valorant duo, hype reel…"
            className="flex-1 rounded-lg border border-border bg-bg-2 px-5 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
          {/* Preserve existing filters when submitting */}
          {searchParams.game && <input type="hidden" name="game" value={searchParams.game} />}
          {searchParams.type && <input type="hidden" name="type" value={searchParams.type} />}
          <Button type="submit" size="lg">Search</Button>
        </div>
      </form>

      {/* Game filter */}
      <div className="mt-6">
        <div className="font-mono text-[11px] uppercase tracking-widest text-text-3 mb-2">Game</div>
        <div className="flex flex-wrap gap-2">
          <Link href={'/services' + buildQueryString(searchParams, { game: undefined })}>
            <Badge variant={!searchParams.game ? 'default' : 'muted'} className="cursor-pointer">All</Badge>
          </Link>
          {SUPPORTED_GAMES.map((g) => (
            <Link key={g.code} href={'/services' + buildQueryString(searchParams, { game: g.code })}>
              <Badge variant={searchParams.game === g.code ? 'default' : 'muted'} className="cursor-pointer">
                {g.emoji} {g.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Type filter */}
      <div className="mt-4">
        <div className="font-mono text-[11px] uppercase tracking-widest text-text-3 mb-2">Type</div>
        <div className="flex flex-wrap gap-2">
          <Link href={'/services' + buildQueryString(searchParams, { type: undefined })}>
            <Badge variant={!searchParams.type ? 'default' : 'muted'} className="cursor-pointer">All</Badge>
          </Link>
          {SERVICE_TYPES.slice(0, 6).map((t) => (
            <Link key={t.code} href={'/services' + buildQueryString(searchParams, { type: t.code })}>
              <Badge variant={searchParams.type === t.code ? 'default' : 'muted'} className="cursor-pointer">
                {t.icon} {t.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      {/* Price + sort row */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-text-3">Price</span>
        {[
          { label: 'Any', min: undefined, max: undefined },
          { label: 'Under ₹500', min: undefined, max: '500' },
          { label: '₹500–₹2K', min: '500', max: '2000' },
          { label: '₹2K+', min: '2000', max: undefined },
        ].map((p) => {
          const active = searchParams.min === p.min && searchParams.max === p.max;
          return (
            <Link key={p.label} href={'/services' + buildQueryString(searchParams, { min: p.min, max: p.max })}>
              <Badge variant={active ? 'default' : 'muted'} className="cursor-pointer">{p.label}</Badge>
            </Link>
          );
        })}

        <span className="ml-auto font-mono text-[11px] uppercase tracking-widest text-text-3">Sort</span>
        {[
          { label: 'Recent', sort: 'recent' as const },
          { label: 'Price ↑', sort: 'price_asc' as const },
          { label: 'Price ↓', sort: 'price_desc' as const },
        ].map((s) => {
          const active = (searchParams.sort ?? 'recent') === s.sort;
          return (
            <Link key={s.sort} href={'/services' + buildQueryString(searchParams, { sort: s.sort })}>
              <Badge variant={active ? 'default' : 'muted'} className="cursor-pointer">{s.label}</Badge>
            </Link>
          );
        })}

        <Link href={'/services' + buildQueryString(searchParams, { verified: searchParams.verified === '1' ? undefined : '1' })}>
          <Badge variant={searchParams.verified === '1' ? 'green' : 'muted'} className="cursor-pointer">
            ✓ Verified only
          </Badge>
        </Link>
      </div>

      {/* Results */}
      <div className="mt-6 font-mono text-xs text-text-3">
        {services.length} result{services.length === 1 ? '' : 's'}
      </div>

      {services.length === 0 ? (
        <Card className="mt-4 p-12 text-center text-text-3">
          <p className="font-mono text-sm">No services match your filters yet.</p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ service: s, creator }) => (
            <Card key={s.id} className="overflow-hidden transition-all hover:border-border-bright hover:-translate-y-1">
              <div className="bg-grad-brand-soft p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="amber">{GAME_LABELS[s.game]}</Badge>
                  <Badge variant="muted">{s.type.replace('_', ' ')}</Badge>
                </div>
                <h3 className="mt-4 font-display text-lg leading-tight text-text-0">{s.title}</h3>
              </div>
              <div className="flex items-center justify-between border-t border-border p-5">
                <Link href={`/${creator.handle}`} className="flex items-center gap-2 font-mono text-sm text-text-2 hover:text-neon-cyan">
                  @{creator.handle}
                  {creator.isVerified && <span className="text-neon-cyan">✓</span>}
                </Link>
                <div className="text-right">
                  <div className="font-display text-xl text-neon-cyan">{formatInr(s.priceInr)}</div>
                  <Button asChild size="sm" className="mt-1">
                    <Link href={`/services/${s.id}`}>Book</Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Passes tab — game filter only. Card markup mirrors /passes/page.tsx.
// ---------------------------------------------------------------------------
function PassesView({
  passes,
  topByPass,
  searchParams,
}: {
  passes: Awaited<ReturnType<typeof listOpenPasses>>;
  topByPass: Record<string, number>;
  searchParams: SearchParams;
}) {
  const baseParams: SearchParams = { kind: 'passes', game: searchParams.game };

  return (
    <>
      <div className="mt-8">
        <div className="font-mono text-[11px] uppercase tracking-widest text-text-3 mb-2">Game</div>
        <div className="flex flex-wrap gap-2">
          <Link href={'/services' + buildQueryString(baseParams, { game: undefined })}>
            <Badge variant={!searchParams.game ? 'default' : 'muted'} className="cursor-pointer">All</Badge>
          </Link>
          {SUPPORTED_GAMES.map((g) => (
            <Link key={g.code} href={'/services' + buildQueryString(baseParams, { game: g.code })}>
              <Badge variant={searchParams.game === g.code ? 'default' : 'muted'} className="cursor-pointer">
                {g.emoji} {g.label}
              </Badge>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 font-mono text-xs text-text-3">
        {passes.length} open pass{passes.length === 1 ? '' : 'es'}
      </div>

      {passes.length === 0 ? (
        <Card className="mt-4 p-12 text-center text-text-3">
          <p className="font-mono text-sm">No open Lobby Passes right now.</p>
          <Button asChild className="mt-5">
            <Link href="/passes/create">Create one →</Link>
          </Button>
        </Card>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {passes.map(({ pass, creator }) => (
            <Card key={pass.id} className="p-5 transition-all hover:border-border-magenta hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <Badge variant="magenta">{pass.slotCount} slot{pass.slotCount > 1 ? 's' : ''}</Badge>
                <Badge variant="amber">{GAME_LABELS[pass.game] ?? pass.game}</Badge>
              </div>
              <h3 className="mt-4 line-clamp-2 font-display text-lg leading-tight text-text-0">{pass.title}</h3>
              <Link href={`/${creator.handle}`} className="mt-1 block font-mono text-xs text-text-2 hover:text-neon-magenta">
                @{creator.handle}
              </Link>

              <div className="mt-5 rounded-lg border border-border-magenta bg-neon-magenta/5 p-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Top bid</div>
                    <div className="font-display text-2xl text-neon-magenta glow-magenta-text">
                      {formatCoins(topByPass[pass.id] ?? pass.minBidCoins)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Ends</div>
                    <div className="font-mono text-xs text-text-1">
                      {formatDistanceToNow(new Date(pass.endsAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              </div>

              <Button asChild variant="magenta" size="sm" className="mt-4 w-full">
                <Link href={`/passes/${pass.id}`}>View & bid →</Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Goals tab — schema has no game/type/price columns on squad_goals,
// so no filter row is rendered. Card markup is a leaner version of /goals.
// ---------------------------------------------------------------------------
function GoalsView({ goals }: { goals: Awaited<ReturnType<typeof listActiveGoals>> }) {
  return (
    <>
      <div className="mt-8 font-mono text-xs text-text-3">
        {goals.length} active goal{goals.length === 1 ? '' : 's'}
      </div>

      {goals.length === 0 ? (
        <Card className="mt-4 p-12 text-center text-text-3">
          <p className="font-mono text-sm">No active Squad Goals right now. Check back soon.</p>
        </Card>
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map(({ goal: g, creator }) => {
            const closed = new Date(g.deadline).getTime() <= Date.now();
            return (
              <Card key={g.id} className="p-5 transition-all hover:border-border-bright hover:-translate-y-1">
                <Link href={`/${creator.handle}`} className="font-mono text-xs text-neon-cyan hover:underline">
                  @{creator.handle}
                </Link>
                <h3 className="mt-2 line-clamp-2 font-display text-lg leading-tight text-text-0">{g.title}</h3>
                {g.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-text-2">{g.description}</p>
                )}

                <div className="mt-5">
                  <GoalBar current={g.currentCoins} target={g.targetCoins} />
                </div>

                <div className="mt-3 flex items-center justify-between font-mono text-xs">
                  <span className="text-text-2">{g.contributorsCount} contributors</span>
                  <span className="text-neon-cyan">
                    {closed
                      ? 'Closing now'
                      : 'ends ' + formatDistanceToNow(new Date(g.deadline), { addSuffix: true })}
                  </span>
                </div>

                <Button asChild size="sm" className="mt-4 w-full" disabled={closed}>
                  <Link href={`/goals/${g.id}`}>
                    {closed ? 'View goal' : 'Contribute coins →'}
                  </Link>
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
