'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface RequestActionsProps {
  requestId: string;
  status: string;
  isCreator: boolean;
  isBuyer: boolean;
}

export function RequestActions({ requestId, status, isCreator, isBuyer }: RequestActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewBody, setReviewBody] = useState('');

  async function patch(action: 'accept' | 'start' | 'complete' | 'cancel', cancelReason?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, cancelReason }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'failed');
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitReview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestId, rating, body: reviewBody }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'failed');
      }
      setShowReview(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // No actions for terminal states
  if (status === 'cancelled') {
    return (
      <div className="mt-6 rounded-lg border border-border bg-bg-2 p-4 text-center text-sm text-text-2">
        Request was cancelled.
      </div>
    );
  }

  if (status === 'completed' && isBuyer) {
    return (
      <div className="mt-6">
        {!showReview ? (
          <Button onClick={() => setShowReview(true)} variant="outline" size="lg" className="w-full">
            Leave a review
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className={`text-3xl transition-colors ${n <= rating ? 'text-neon-amber' : 'text-text-3'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="What was the session like? (optional)"
              className="w-full rounded-lg border border-border bg-bg-2 px-3 py-2 text-sm text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
            />
            <Button onClick={submitReview} disabled={loading} className="w-full">
              {loading ? 'Submitting…' : 'Submit review'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (status === 'completed') {
    return (
      <div className="mt-6 rounded-lg border border-neon-green/30 bg-neon-green/5 p-4 text-center text-sm text-neon-green">
        Completed · payout to your Vault
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-2">
      {/* Creator-side actions */}
      {isCreator && status === 'pending' && (
        <Button onClick={() => patch('accept')} disabled={loading} size="lg" className="w-full">
          Accept request
        </Button>
      )}
      {isCreator && status === 'accepted' && (
        <Button onClick={() => patch('start')} disabled={loading} size="lg" className="w-full">
          Mark as started
        </Button>
      )}
      {isCreator && (status === 'in_progress' || status === 'accepted') && (
        <Button onClick={() => patch('complete')} disabled={loading} size="lg" variant="default" className="w-full">
          Mark as completed
        </Button>
      )}

      {/* Cancel — both sides while pending; creator only after */}
      {((isBuyer && status === 'pending') || (isCreator && ['pending', 'accepted', 'in_progress'].includes(status))) && (
        <Button
          onClick={() => patch('cancel')}
          disabled={loading}
          variant="ghost"
          size="lg"
          className="w-full text-text-2 hover:text-neon-magenta"
        >
          Cancel request
        </Button>
      )}

      {error && (
        <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
          {error}
        </div>
      )}
    </div>
  );
}
