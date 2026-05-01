'use client';

import { useEffect, useState } from 'react';
import { GoalBar } from './goal-bar';
import { subscribeToGoal, type GoalContributionEvent, type GoalFundedEvent } from '@/lib/pusher-client';

interface Props {
  goalId: string;
  initial: { current: number; target: number };
}

export function GoalLiveProgress({ goalId, initial }: Props) {
  const [current, setCurrent] = useState(initial.current);
  const [funded, setFunded] = useState(initial.current >= initial.target);

  useEffect(() => {
    const unsub = subscribeToGoal(goalId, {
      onContribution: (e: GoalContributionEvent) => {
        if (typeof e.currentCoins === 'number') setCurrent(e.currentCoins);
      },
      onFunded: () => setFunded(true),
    });
    return unsub;
  }, [goalId]);

  return (
    <>
      <GoalBar current={current} target={initial.target} />
      {funded && (
        <div className="mt-4 rounded-lg border border-neon-green/30 bg-neon-green/5 p-3 text-center text-sm text-neon-green">
          ★ Goal funded — creator will deliver
        </div>
      )}
    </>
  );
}
