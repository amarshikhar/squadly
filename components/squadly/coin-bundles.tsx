'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { COIN_BUNDLES } from '@/lib/constants';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface CoinBundlesProps {
  className?: string;
}

/**
 * Coin top-up bundles. Clicking a bundle opens Razorpay Checkout.
 * On payment success, the Razorpay webhook credits coins server-side.
 */
export function CoinBundles({ className }: CoinBundlesProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleTopUp(inrAmount: number) {
    setLoading(inrAmount);
    setError(null);

    try {
      const res = await fetch('/api/coins', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inrAmount }),
      });

      if (res.status === 401) {
        router.push('/signin?next=/vault');
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        if (err.error === 'age_verification_required') {
          router.push('/profile/age?next=/vault');
          return;
        }
        if (err.error === 'rate_limited') {
          throw new Error(`Too many top-up attempts. Try again in ${err.retryAfter}s.`);
        }
        throw new Error(err.error ?? 'failed');
      }

      const { orderId, amount, currency, coins, keyId } = await res.json();

      await loadRazorpay();
      if (!window.Razorpay) throw new Error('razorpay_unavailable');

      const checkout = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: orderId,
        name: 'Squadly · Coins',
        description: `Top up ${coins} coins`,
        theme: { color: '#ff2eaa', backdrop_color: '#070912' },
        handler() {
          // Razorpay webhook will credit coins server-side
          router.refresh();
        },
        modal: {
          ondismiss() {
            setLoading(null);
          },
        },
      });

      checkout.open();
    } catch (e: any) {
      setError(e.message);
      setLoading(null);
    }
  }

  return (
    <>
      <div className={cn('grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5', className)}>
        {COIN_BUNDLES.map((b) => (
          <button
            key={b.inr}
            onClick={() => handleTopUp(b.inr)}
            disabled={loading !== null}
            className="text-left disabled:opacity-50"
          >
            <Card className="p-5 text-center transition-all hover:border-border-bright hover:-translate-y-1">
              <div className="font-display text-3xl text-neon-magenta">{b.coins}</div>
              <div className="mt-1 font-mono text-xs uppercase text-text-2">coins</div>
              {b.bonus > 0 && (
                <div className="mt-2 font-mono text-xs text-neon-green">+{b.bonus} bonus</div>
              )}
              <div className="mt-4 border-t border-border pt-4 font-display text-xl text-text-0">
                {loading === b.inr ? 'Opening…' : `₹${b.inr}`}
              </div>
            </Card>
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-border-magenta bg-neon-magenta/10 p-4 text-sm text-neon-magenta">
          {error}
        </div>
      )}
    </>
  );
}

let razorpayPromise: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (razorpayPromise) return razorpayPromise;
  razorpayPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('window unavailable'));
    if (window.Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('failed to load razorpay'));
    document.head.appendChild(script);
  });
  return razorpayPromise;
}
