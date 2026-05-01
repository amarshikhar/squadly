'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatInr } from '@/lib/utils';

interface Props {
  disputeId: string;
  priceInr: number;
}

type Resolution = 'resolved_creator' | 'resolved_buyer' | 'resolved_partial' | 'cancelled';

export function ResolveDisputeForm({ disputeId, priceInr }: Props) {
  const router = useRouter();
  const [resolution, setResolution] = useState<Resolution>('resolved_buyer');
  const [partialInr, setPartialInr] = useState(Math.round(priceInr / 2 / 100));
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resolution,
          note,
          refundInr: resolution === 'resolved_partial' ? partialInr * 100 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { v: 'resolved_buyer' as const, l: 'Refund buyer', refund: priceInr },
          { v: 'resolved_partial' as const, l: 'Partial refund', refund: null },
          { v: 'resolved_creator' as const, l: 'No refund', refund: 0 },
          { v: 'cancelled' as const, l: 'Withdraw', refund: 0 },
        ].map((r) => (
          <button
            key={r.v}
            type="button"
            onClick={() => setResolution(r.v)}
            className={`rounded-lg border px-3 py-3 text-xs transition-colors ${
              resolution === r.v
                ? 'border-neon-magenta bg-neon-magenta/10 text-neon-magenta'
                : 'border-border bg-bg-2 text-text-2 hover:border-border-bright'
            }`}
          >
            <div className="font-semibold">{r.l}</div>
            {r.refund !== null && (
              <div className="mt-1 font-mono text-[10px]">
                {r.refund > 0 ? `−${formatInr(r.refund)}` : 'no refund'}
              </div>
            )}
          </button>
        ))}
      </div>

      {resolution === 'resolved_partial' && (
        <div>
          <label className="font-mono text-xs uppercase tracking-widest text-text-2">Refund amount (₹)</label>
          <input
            type="number"
            value={partialInr}
            onChange={(e) => setPartialInr(Number(e.target.value))}
            min={1}
            max={priceInr / 100}
            className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 font-mono text-text-0 focus:border-neon-magenta focus:outline-none"
          />
        </div>
      )}

      <div>
        <label className="font-mono text-xs uppercase tracking-widest text-text-2">Resolution note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Brief reasoning shown to both parties"
          className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-magenta focus:outline-none"
        />
      </div>

      <Button type="submit" disabled={loading} variant="magenta" className="w-full">
        {loading ? 'Resolving…' : 'Resolve dispute'}
      </Button>

      {error && (
        <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
          {error}
        </div>
      )}
    </form>
  );
}
