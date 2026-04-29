'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatInr } from '@/lib/utils';

interface WithdrawFormProps {
  availableInr: number; // paise
}

export function WithdrawForm({ availableInr }: WithdrawFormProps) {
  const router = useRouter();
  const [vpa, setVpa] = useState('');
  const [amount, setAmount] = useState(500); // rupees
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const availableRupees = Math.floor(availableInr / 100);
  const tooMuch = amount * 100 > availableInr;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (tooMuch) {
      setError(`Amount exceeds available balance (${formatInr(availableInr)}).`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payouts/withdraw', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ amountInr: amount * 100, vpa }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');

      setSuccess(`Payout initiated: ${data.payout?.utr ?? data.payout?.id ?? 'pending'}`);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="font-mono text-xs uppercase tracking-widest text-text-2">UPI ID</label>
        <input
          type="text"
          value={vpa}
          onChange={(e) => setVpa(e.target.value)}
          placeholder="yourname@oksbi"
          required
          pattern="^[\w.\-]+@[\w]+$"
          className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 font-mono text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
        />
      </div>

      <div>
        <label className="font-mono text-xs uppercase tracking-widest text-text-2">Amount (₹)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          min={500}
          max={availableRupees}
          required
          className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-text-3">
          <span>Min ₹500</span>
          <button
            type="button"
            onClick={() => setAmount(availableRupees)}
            className="text-neon-cyan hover:underline"
          >
            Withdraw all ({formatInr(availableInr)})
          </button>
        </div>
      </div>

      <Button type="submit" disabled={loading || availableInr < 50000} size="lg" className="w-full">
        {loading ? 'Processing…' : 'Withdraw'}
      </Button>

      {error && (
        <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-neon-green/30 bg-neon-green/10 p-3 text-sm text-neon-green">
          {success}
        </div>
      )}

      <p className="text-center text-xs text-text-3">
        Funds typically arrive within 30 seconds via IMPS.
      </p>
    </form>
  );
}
