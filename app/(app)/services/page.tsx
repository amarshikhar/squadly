import Link from 'next/link';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatInr, GAME_LABELS } from '@/lib/utils';
import { SUPPORTED_GAMES, SERVICE_TYPES } from '@/lib/constants';
import { listServices } from '@/lib/db/queries';

export const revalidate = 30;

interface SearchParams {
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
  const services = await listServices({
    game: searchParams.game,
    type: searchParams.type,
    search: searchParams.q,
    minPriceInr: searchParams.min ? Number(searchParams.min) * 100 : undefined,
    maxPriceInr: searchParams.max ? Number(searchParams.max) * 100 : undefined,
    verifiedOnly: searchParams.verified === '1',
    sort: searchParams.sort ?? 'recent',
    limit: 60,
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Discovery</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Find a service</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Browse coaching, duos, rank pushes, and custom content from India&apos;s top gaming creators.
        </p>

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
            {/* Preserve existing filters */}
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
      </main>
    </div>
  );
}
