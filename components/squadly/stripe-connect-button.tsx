'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface StripeConnectButtonProps {
  className?: string;
  label?: string;
}

export function StripeConnectButton({ className, label = 'Connect Stripe' }: StripeConnectButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payouts/stripe/onboard', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div className={className}>
      <Button onClick={start} disabled={loading} size="lg" variant="magenta">
        {loading ? 'Opening Stripe…' : label}
      </Button>
      {error && (
        <p className="mt-3 font-mono text-xs text-neon-magenta">{error}</p>
      )}
    </div>
  );
}
