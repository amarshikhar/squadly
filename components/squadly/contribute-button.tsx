'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatCoins } from '@/lib/utils';

interface ContributeButtonProps {
  goalId: string;
  coinBalance: number;
  disabled?: boolean;
}

const PRESETS = [50, 100, 250, 500, 1000];

export function ContributeButton({ goalId, coinBalance, disabled }: ContributeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [coins, setCoins] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (disabled) {
    return (
      <Button disabled size="lg" className="w-full" variant="secondary">
        Goal closed
      </Button>
    );
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} size="lg" className="w-full">
        Contribute coins
      </Button>
    );
  }

  async function submit() {
    setError(null);
    if (coins > coinBalance) {
      setError(`You only have ${formatCoins(coinBalance)} coins. Top up in your Vault.`);
      return;
    }

    setLoading(true);

    // Optimistic: tell GoalLiveProgress (sibling client component on the same page)
    // to bump the bar immediately. We dispatch a window event so we don't have to
    // restructure the server-component page to share state via props.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(`goal:${goalId}:optimistic-contribution`, {
          detail: { coins },
        }),
      );
    }

    try {
      const res = await fetch(`/api/goals/${goalId}/contribute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ coins }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/signin?next=/goals`);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'failed');

      setOpen(false);
      router.refresh();
    } catch (e: any) {
      // Roll back the optimistic bump on failure.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(`goal:${goalId}:optimistic-contribution`, {
            detail: { coins: -coins },
          }),
        );
      }
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between font-mono text-xs text-text-2">
        <span>Your coins</span>
        <span className="text-neon-cyan">{formatCoins(coinBalance)}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setCoins(p)}
            className={`flex-1 rounded-lg border px-3 py-2 font-mono text-sm transition-colors ${
              coins === p
                ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                : 'border-border bg-bg-2 text-text-1 hover:border-border-bright'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <input
        type="number"
        value={coins}
        onChange={(e) => setCoins(Math.max(1, Number(e.target.value)))}
        min={1}
        max={Math.min(coinBalance, 50000)}
        className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 font-mono text-text-0 focus:border-neon-cyan focus:outline-none"
      />

      <div className="flex gap-2">
        <Button onClick={() => setOpen(false)} variant="ghost" size="lg" className="flex-1">
          Cancel
        </Button>
        <Button onClick={submit} disabled={loading} size="lg" className="flex-1">
          {loading ? 'Sending…' : `Send ${formatCoins(coins)} coins`}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
          {error}
        </div>
      )}
    </div>
  );
}
