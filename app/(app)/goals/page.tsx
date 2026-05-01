import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import Link from 'next/link';

export default function GoalsPage() {
  // Placeholder data
  const goals = [
    {
      id: '1', creator: 'scout', game: 'BGMI',
      title: 'Conqueror push tonight — full lobby, no leave',
      current: 1250, target: 1500, contributors: 47, hoursLeft: 2,
    },
    {
      id: '2', creator: 'gauravigl', game: 'Valorant',
      title: 'Surrender-free Saturday: 10 wins streak',
      current: 1840, target: 3000, contributors: 23, hoursLeft: 5,
    },
    {
      id: '3', creator: 'riyaheadshot', game: 'Free Fire',
      title: 'Free Fire Heroic dash · 2 hour grind',
      current: 800, target: 800, contributors: 18, hoursLeft: 0,
    },
  ];

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="default">● Squad Goals · Live</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Active Squad Goals</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Crowd-fund your favorite creator&apos;s next challenge. Hit the goal, watch them deliver.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {goals.map((g) => (
            <Card key={g.id} className="p-7">
              <div className="flex items-center justify-between">
                <Link href={`/${g.creator}`} className="font-mono text-sm text-neon-cyan hover:underline">
                  @{g.creator}
                </Link>
                <Badge variant="amber">{g.game}</Badge>
              </div>
              <h3 className="mt-3 font-display text-lg leading-tight text-text-0">{g.title}</h3>

              <div className="mt-6">
                <GoalBar current={g.current} target={g.target} />
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                <div className="font-mono text-text-2">{g.contributors} contributors</div>
                <div className="font-mono text-neon-cyan">
                  {g.hoursLeft > 0 ? `${g.hoursLeft}h left` : 'Funded'}
                </div>
              </div>

              <Button className="mt-5 w-full" variant={g.hoursLeft > 0 ? 'default' : 'secondary'} disabled={g.hoursLeft === 0}>
                {g.hoursLeft > 0 ? 'Contribute coins' : 'Goal funded'}
              </Button>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
