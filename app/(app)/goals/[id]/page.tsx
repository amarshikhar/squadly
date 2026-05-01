import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoalBar } from '@/components/squadly/goal-bar';
import { GoalLiveProgress } from '@/components/squadly/goal-live-progress';
import { ContributeButton } from '@/components/squadly/contribute-button';
import { getGoalById, getVaultBalance } from '@/lib/db/queries';
import { formatDistanceToNow } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function GoalDetail({ params }: { params: { id: string } }) {
  const session = await auth();
  const found = await getGoalById(params.id);
  if (!found) notFound();

  const { goal, creator } = found;
  const vault = session?.user?.id ? await getVaultBalance(session.user.id) : null;
  const isOwnGoal = session?.user?.id === creator.id;
  const isClosed = goal.status !== 'active' || new Date(goal.deadline) < new Date();

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <Link href="/goals" className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← All goals
        </Link>

        <div className="mt-6 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <Badge variant={goal.status === 'active' ? 'default' : goal.status === 'funded' ? 'green' : 'muted'}>
                {goal.status}
              </Badge>
              <Link href={`/${creator.handle}`} className="font-mono text-sm text-neon-cyan hover:underline">
                @{creator.handle}
              </Link>
            </div>

            <h1 className="mt-4 font-display text-display-md text-text-0">{goal.title}</h1>
            {goal.description && (
              <p className="mt-3 max-w-xl whitespace-pre-line text-text-1">{goal.description}</p>
            )}

            <Card className="mt-8 p-7">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Progress</div>
              <div className="mt-4">
                <GoalLiveProgress goalId={goal.id} initial={{ current: goal.currentCoins, target: goal.targetCoins }} />
              </div>
              <div className="mt-6 flex justify-between border-t border-border pt-4 text-sm font-mono">
                <div>
                  <div className="text-text-3 text-xs uppercase tracking-widest">Contributors</div>
                  <div className="mt-1 text-text-0">{goal.contributorsCount}</div>
                </div>
                <div className="text-right">
                  <div className="text-text-3 text-xs uppercase tracking-widest">Closes</div>
                  <div className="mt-1 text-text-0">
                    {goal.deadline ? formatDistanceToNow(new Date(goal.deadline), { addSuffix: true }) : '—'}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20 p-6">
              {isOwnGoal ? (
                <>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-2">Your goal</div>
                  <p className="mt-2 text-sm text-text-1">
                    This is your Squad Goal. Once funded, deliver per your commitment and post the proof URL.
                  </p>
                </>
              ) : !session?.user ? (
                <>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-2">Contribute</div>
                  <p className="mt-2 text-sm text-text-2">Sign in to fund this goal with coins.</p>
                  <Link href={`/signin?next=/goals/${goal.id}`}>
                    <Badge variant="default" className="mt-4 cursor-pointer">Sign in</Badge>
                  </Link>
                </>
              ) : (
                <>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-2">Contribute</div>
                  <p className="mt-2 mb-5 text-sm text-text-2">
                    Spend coins to push this goal toward funding.
                  </p>
                  <ContributeButton
                    goalId={goal.id}
                    coinBalance={vault?.coinBalance ?? 0}
                    disabled={isClosed}
                  />
                </>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
