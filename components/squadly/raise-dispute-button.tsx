'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function RaiseDisputeButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (reason.trim().length < 10) {
      setError('Please provide at least 10 characters of context.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}/dispute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="ghost" size="sm" className="text-neon-magenta hover:bg-neon-magenta/10">
        Raise dispute
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="font-mono text-xs uppercase tracking-widest text-neon-magenta">
        Raise a dispute · admin reviews
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        maxLength={4000}
        placeholder="What went wrong? Include any evidence (screenshot links, timestamps)."
        className="w-full rounded-lg border border-border-magenta bg-bg-2 px-3 py-2 text-sm text-text-0 placeholder:text-text-3 focus:border-neon-magenta focus:outline-none"
      />
      <div className="flex gap-2">
        <Button onClick={() => setOpen(false)} variant="ghost" size="sm" className="flex-1">
          Cancel
        </Button>
        <Button onClick={submit} disabled={loading} variant="magenta" size="sm" className="flex-1">
          {loading ? 'Submitting…' : 'Submit dispute'}
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
