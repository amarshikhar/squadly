'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const DEFAULT = {
  title: '',
  description: '',
  targetCoins: 1000,
  deadlineHoursFromNow: 48, // 2 days
};

export function GoalForm() {
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
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      // replace (not push) so back from the detail page returns to Hub, not the form.
      router.replace(`/goals/${data.goal.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Title" hint="What you're rallying the squad to do">
          <input
            type="text"
            value={state.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="Conqueror push tonight"
            required
            minLength={5}
            maxLength={140}
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </Field>

        <Field label="Description" hint="Optional details for your fans">
          <textarea
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="Going for Conqueror live tonight at 9pm. Help me lock in."
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Target coins" hint="Total to raise">
            <input
              type="number"
              value={state.targetCoins}
              onChange={(e) => update('targetCoins', Number(e.target.value))}
              min={1}
              max={500000}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Deadline (hours from now)" hint="Up to 72h">
            <input
              type="number"
              value={state.deadlineHoursFromNow}
              onChange={(e) => update('deadlineHoursFromNow', Number(e.target.value))}
              min={1}
              max={72}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>
        </div>

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Open Squad Goal'}
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
