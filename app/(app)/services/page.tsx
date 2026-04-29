import Link from 'next/link';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatInr, GAME_LABELS } from '@/lib/utils';
import { SUPPORTED_GAMES } from '@/lib/constants';
import { listServices } from '@/lib/db/queries';

export const revalidate = 30;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: { game?: string; type?: string; q?: string };
}) {
  const services = await listServices({
    game: searchParams.game,
    type: searchParams.type,
    search: searchParams.q,
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

        {/* Filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/services">
            <Badge variant={!searchParams.game ? 'default' : 'muted'} className="cursor-pointer">All games</Badge>
          </Link>
          {SUPPORTED_GAMES.slice(0, 6).map((g) => (
            <Link href={`/services?game=${g.code}`} key={g.code}>
              <Badge variant={searchParams.game === g.code ? 'default' : 'muted'} className="cursor-pointer">
                {g.emoji} {g.label}
              </Badge>
            </Link>
          ))}
        </div>

        {/* Grid */}
        {services.length === 0 ? (
          <Card className="mt-10 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No services match your filters yet.</p>
          </Card>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map(({ service: s, creator }) => (
              <Card key={s.id} className="overflow-hidden transition-all hover:border-border-bright hover:-translate-y-1">
                <div className="bg-grad-brand-soft p-5">
                  <div className="flex items-center justify-between">
                    <Badge variant="amber">{GAME_LABELS[s.game]}</Badge>
                    <Badge variant="muted">{s.type}</Badge>
                  </div>
                  <h3 className="mt-4 font-display text-lg leading-tight text-text-0">{s.title}</h3>
                </div>
                <div className="flex items-center justify-between border-t border-border p-5">
                  <Link href={`/${creator.handle}`} className="font-mono text-sm text-text-2 hover:text-neon-cyan">
                    @{creator.handle}
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
