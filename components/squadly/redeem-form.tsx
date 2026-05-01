'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function RedeemForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/referrals/redeem', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');

      setSuccess(data.message ?? 'Code accepted!');
      setCode('');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ENTER CODE"
        maxLength={16}
        required
        className="w-full rounded-lg border border-border bg-bg-2 px-4 py-3 font-mono text-lg tracking-[0.15em] text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none uppercase"
      />
      <Button type="submit" disabled={loading || code.length < 4} size="lg" className="w-full">
        {loading ? 'Redeeming…' : 'Redeem'}
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
    </form>
  );
}
