'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const currentYear = new Date().getUTCFullYear();
const minYear = 1900;

export function AgeVerifyForm({ next }: { next?: string }) {
  const router = useRouter();
  const [year, setYear] = useState(currentYear - 25);
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computedAge = currentYear - year;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!confirm) {
      setError('Please confirm the statement before continuing.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile/verify-age', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ dobYear: year, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');
      router.push(next ?? '/home');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <label className="font-mono text-xs uppercase tracking-widest text-text-2">Year you were born</label>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={minYear}
          max={currentYear}
          required
          className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 font-mono text-text-0 focus:border-neon-cyan focus:outline-none"
        />
        <p className="mt-2 font-mono text-[11px] text-text-3">
          You will turn or have turned <span className="text-text-1">{computedAge}</span> this year
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
          className="mt-1 h-5 w-5 cursor-pointer accent-[#00f0ff]"
        />
        <span className="text-sm text-text-1">
          I confirm I am 18 years of age or older. I understand that providing false information may result in
          account termination and forfeiture of any held funds.
        </span>
      </label>

      <Button type="submit" disabled={loading || !confirm || computedAge < 18} size="lg" className="w-full">
        {loading ? 'Verifying…' : 'Verify and continue'}
      </Button>

      {computedAge < 18 && computedAge > 0 && (
        <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
          You must be 18 or older to use money-moving features on Squadly.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
          {error}
        </div>
      )}
    </form>
  );
}
