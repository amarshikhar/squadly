'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    Razorpay?: any;
  }
}

interface BookButtonProps {
  serviceId: string;
  priceInr: number;   // paise
}

/**
 * Client-side booking flow:
 * 1. POST /api/requests → creates pending request + Razorpay order
 * 2. Open Razorpay Checkout
 * 3. On success → redirect to /requests/[id]
 * 4. Razorpay webhook finalizes ledger entries server-side
 */
export function BookButton({ serviceId, priceInr }: BookButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBook() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });

      if (res.status === 401) {
        // Not signed in
        router.push(`/signin?next=/services/${serviceId}`);
        return;
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'request_failed');
      }

      const { request, razorpay } = await res.json();

      // Lazy-load Razorpay checkout
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('razorpay_unavailable');

      const checkout = new window.Razorpay({
        key: razorpay.keyId,
        amount: razorpay.amount,
        currency: razorpay.currency,
        order_id: razorpay.orderId,
        name: 'Squadly',
        description: 'Service booking',
        theme: { color: '#00f0ff', backdrop_color: '#070912' },
        handler() {
          router.push(`/requests/${request.id}`);
        },
        modal: {
          ondismiss() {
            setLoading(false);
          },
        },
      });

      checkout.open();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
      setLoading(false);
    }
  }

  return (
    <>
      <Button onClick={handleBook} disabled={loading} size="lg" className="mt-6 w-full">
        {loading ? 'Opening checkout…' : 'Book now'}
      </Button>
      {error && <p className="mt-3 text-center text-xs text-neon-magenta">{error}</p>}
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
