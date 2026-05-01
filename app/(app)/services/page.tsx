import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatInr, GAME_LABELS } from '@/lib/utils';
import { SUPPORTED_GAMES } from '@/lib/constants';

/** Discovery — browse all live services. Phase 1 wires this to DB + filters. */
export default function ServicesPage() {
  // Placeholder data
  const services = [
    { id: '1', creator: 'scout', game: 'bgmi', type: 'Coaching', title: '1-Hour BGMI Coaching · Conqueror', price: 50000 },
    { id: '2', creator: 'gauravigl', game: 'valorant', type: 'Coaching', title: 'Radiant Coaching · Aim & Crosshair', price: 75000 },
    { id: '3', creator: 'riyaheadshot', game: 'free_fire', type: 'Hype Reel', title: 'Custom Hype Reel · 30s', price: 25000 },
    { id: '4', creator: 'aniket7', game: 'bgmi', type: 'Rank Push', title: 'Rank Push to Crown', price: 200000 },
    { id: '5', creator: 'jiyaragingg', game: 'valorant', type: 'Crosshair', title: 'Crosshair Fix Session', price: 15000 },
    { id: '6', creator: 'gauravigl', game: 'valorant', type: 'Lineup', title: 'Custom Lineup Pack · Any Map', price: 35000 },
  ];

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
          <Badge variant="default">All games</Badge>
          {SUPPORTED_GAMES.slice(0, 6).map((g) => (
            <Badge key={g.code} variant="muted" className="cursor-pointer">
              {g.emoji} {g.label}
            </Badge>
          ))}
        </div>

        {/* Grid */}
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.id} className="overflow-hidden transition-all hover:border-border-bright hover:-translate-y-1">
              <div className="bg-grad-brand-soft p-5">
                <div className="flex items-center justify-between">
                  <Badge variant="amber">{GAME_LABELS[s.game]}</Badge>
                  <Badge variant="muted">{s.type}</Badge>
                </div>
                <h3 className="mt-4 font-display text-lg leading-tight text-text-0">{s.title}</h3>
              </div>
              <div className="flex items-center justify-between border-t border-border p-5">
                <Link href={`/${s.creator}`} className="font-mono text-sm text-text-2 hover:text-neon-cyan">
                  @{s.creator}
                </Link>
                <div className="text-right">
                  <div className="font-display text-xl text-neon-cyan">{formatInr(s.price)}</div>
                  <Button size="sm" className="mt-1">Book</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
