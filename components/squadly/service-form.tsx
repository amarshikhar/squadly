'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SUPPORTED_GAMES, SERVICE_TYPES } from '@/lib/constants';

interface FormState {
  type: string;
  game: string;
  title: string;
  description: string;
  priceInr: number;     // rupees (we convert to paise on submit)
  durationMin: number;
  deliveryWindowHours: number;
}

const DEFAULT: FormState = {
  type: 'coaching',
  game: 'bgmi',
  title: '',
  description: '',
  priceInr: 500,
  durationMin: 60,
  deliveryWindowHours: 24,
};

export function ServiceForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(DEFAULT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/services', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ...state,
          priceInr: Math.round(state.priceInr * 100), // paise
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'failed');
      }

      const { service } = await res.json();
      // replace (not push) so back from the detail page returns to Hub, not the form.
      router.replace(`/services/${service.id}`);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <Card className="p-8">
      <form onSubmit={submit} className="space-y-6">
        <Field label="Service type">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SERVICE_TYPES.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => update('type', t.code)}
                className={`rounded-lg border px-3 py-3 text-sm transition-colors ${
                  state.type === t.code
                    ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                    : 'border-border bg-bg-2 text-text-2 hover:border-border-bright'
                }`}
              >
                <div>{t.icon}</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-wider">{t.label}</div>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Game">
          <select
            value={state.game}
            onChange={(e) => update('game', e.target.value)}
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
          >
            {SUPPORTED_GAMES.map((g) => (
              <option key={g.code} value={g.code}>
                {g.emoji}  {g.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title" hint="3–80 characters">
          <input
            type="text"
            value={state.title}
            onChange={(e) => update('title', e.target.value)}
            placeholder="e.g. 1-Hour BGMI Coaching · Conqueror"
            maxLength={80}
            required
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </Field>

        <Field label="Description" hint="What buyers can expect">
          <textarea
            value={state.description}
            onChange={(e) => update('description', e.target.value)}
            rows={5}
            maxLength={2000}
            required
            placeholder="Personal review of your gameplay + drills tailored to your weaknesses…"
            className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-3">
          <Field label="Price (₹)">
            <input
              type="number"
              value={state.priceInr}
              onChange={(e) => update('priceInr', Number(e.target.value))}
              min={50}
              max={50000}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Duration (min)">
            <input
              type="number"
              value={state.durationMin}
              onChange={(e) => update('durationMin', Number(e.target.value))}
              min={5}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>

          <Field label="Delivery (hrs)">
            <input
              type="number"
              value={state.deliveryWindowHours}
              onChange={(e) => update('deliveryWindowHours', Number(e.target.value))}
              min={1}
              max={168}
              required
              className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
            />
          </Field>
        </div>

        <div className="rounded-lg border border-border bg-bg-2 p-5 text-sm">
          <div className="flex justify-between text-text-2">
            <span>Buyer pays</span>
            <span className="font-mono text-text-0">₹{state.priceInr.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 flex justify-between text-text-2">
            <span>Platform fee (15%)</span>
            <span className="font-mono">−₹{Math.round(state.priceInr * 0.15).toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <span className="text-text-0">You earn</span>
            <span className="font-mono text-neon-green">₹{Math.round(state.priceInr * 0.85).toLocaleString('en-IN')}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-4 text-sm text-neon-magenta">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="w-full">
          {loading ? 'Creating…' : 'Save service'}
        </Button>

        <p className="text-center text-xs text-text-3">
          Service starts in <span className="font-mono">draft</span> mode. Toggle to <span className="font-mono">live</span> from your dashboard.
        </p>
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
