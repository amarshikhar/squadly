'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SUPPORTED_GAMES } from '@/lib/constants';

const DEFAULT = {
  title: '',
  description: '',
  game: 'bgmi' as const,
  slotCount: 3,
  minBidCoins: 100,
  bidIncrementCoins: 50,
  endsInMinutes: 240,         // 4 hours
  sessionInMinutes: 360,      // session 6h from now
  sessionDurationMin: 120,    // 2-hour session
};

export function LobbyPassForm() {
  const router = useRouter();
  const [state, setState] = useState(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof DEFAULT>(k: K, v: typeof DEFAULT[K]) {
    setState((s) => ({ ...s, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/passes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      // replace (not push) so the back button from the detail page goes to
      // wherever the user came from (e.g., Hub) instead of the create form.
      router.replace(`/passes/${data.pass.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Title" hint="What you're offering">
          <input
            type="text"
            value={state.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Pro Squad Night — full party"
            required
            minLength={5}
            maxLength={140}
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </Field>

        <Field label="Description" hint="Optional details for bidders">
          <textarea
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="4-hour squad. We'll push ranked. Discord audio."
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </Field>

        <Field label="Game">
          <select
            value={state.game}
            onChange={(e) => update('game', e.target.value as any)}
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
          >
            {SUPPORTED_GAMES.map((g) => (
              <option key={g.code} value={g.code}>
                {g.emoji} {g.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Slots">
            <input
              type="number"
              value={state.slotCount}
              onChange={(e) => update('slotCount', Number(e.target.value))}
              min={1}
              max={10}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Min bid (coins)">
            <input
              type="number"
              value={state.minBidCoins}
              onChange={(e) => update('minBidCoins', Number(e.target.value))}
              min={1}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Bid step">
            <input
              type="number"
              value={state.bidIncrementCoins}
              onChange={(e) => update('bidIncrementCoins', Number(e.target.value))}
              min={1}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Auction ends in (min)">
            <input
              type="number"
              value={state.endsInMinutes}
              onChange={(e) => update('endsInMinutes', Number(e.target.value))}
              min={15}
              max={48 * 60}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Session start (min from now)">
            <input
              type="number"
              value={state.sessionInMinutes}
              onChange={(e) => update('sessionInMinutes', Number(e.target.value))}
              min={state.endsInMinutes}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Session length (min)">
            <input
              type="number"
              value={state.sessionDurationMin}
              onChange={(e) => update('sessionDurationMin', Number(e.target.value))}
              min={15}
              max={480}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>
        </div>

        <Button type="submit" size="lg" disabled={loading} variant="magenta" className="w-full">
          {loading ? 'Creating…' : 'Open Lobby Pass'}
        </Button>

        {error && (
          <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
            {error}
          </div>
        )}
      </form>
    </Card>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="font-mono text-xs uppercase tracking-widest text-text-2">{label}</label>
        {hint && <span className="font-mono text-[11px] text-text-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
