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

  // Pusher: authoritative server-side updates.
  useEffect(() => {
    const unsub = subscribeToGoal(goalId, {
      onContribution: (e: GoalContributionEvent) => {
        if (typeof e.currentCoins === 'number') setCurrent(e.currentCoins);
      },
      onFunded: () => setFunded(true),
    });
    return unsub;
  }, [goalId]);

  // Optimistic: ContributeButton dispatches a custom event before the server
  // confirms, so the bar moves the moment a fan clicks "Send". A negative
  // coin count is the rollback signal if the server later rejects.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const evtName = `goal:${goalId}:optimistic-contribution`;
    function onOptimistic(e: Event) {
      const detail = (e as CustomEvent<{ coins: number }>).detail;
      if (!detail || typeof detail.coins !== 'number') return;
      setCurrent((c) => Math.max(0, c + detail.coins));
      if (detail.coins > 0 && current + detail.coins >= initial.target) setFunded(true);
    }
    window.addEventListener(evtName, onOptimistic);
    return () => window.removeEventListener(evtName, onOptimistic);
  }, [goalId, current, initial.target]);

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
