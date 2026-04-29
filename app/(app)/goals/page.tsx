import Link from 'next/link';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GoalBar } from '@/components/squadly/goal-bar';
import { listActiveGoals } from '@/lib/db/queries';
import { GAME_LABELS } from '@/lib/utils';

export const revalidate = 15;

function hoursLeft(deadline: Date): number {
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.max(0, Math.round(ms / (60 * 60 * 1000)));
}

export default async function GoalsPage() {
  const goals = await listActiveGoals();

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="default">● Squad Goals · Live</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Active Squad Goals</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Crowd-fund your favorite creator&apos;s next challenge. Hit the goal, watch them deliver.
        </p>

        {goals.length === 0 ? (
          <Card className="mt-10 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No active goals right now. Check back soon.</p>
          </Card>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {goals.map(({ goal: g, creator }) => {
              const hours = hoursLeft(g.deadline);
              return (
                <Card key={g.id} className="p-7">
                  <div className="flex items-center justify-between">
                    <Link href={`/${creator.handle}`} className="font-mono text-sm text-neon-cyan hover:underline">
                      @{creator.handle}
                    </Link>
                  </div>
                  <h3 className="mt-3 font-display text-lg leading-tight text-text-0">{g.title}</h3>
                  {g.description && <p className="mt-2 text-sm text-text-2">{g.description}</p>}

                  <div className="mt-6">
                    <GoalBar current={g.currentCoins} target={g.targetCoins} />
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                    <div className="font-mono text-text-2">{g.contributorsCount} contributors</div>
                    <div className="font-mono text-neon-cyan">
                      {hours > 0 ? `${hours}h left` : 'Closing now'}
                    </div>
                  </div>

                  <Button className="mt-5 w-full" disabled={hours === 0}>
                    {hours > 0 ? 'Contribute coins' : 'Closed'}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
