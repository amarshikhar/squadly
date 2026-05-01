'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCoins, formatCountdown } from '@/lib/utils';
import { subscribeToPass, type BidPlacedEvent, type PassClosedEvent } from '@/lib/pusher-client';

interface BidView {
  id: string;
  bidderId: string;
  bidderHandle: string;
  coinAmount: number;
  status: string;
  bidAt: Date | string;
}

interface Props {
  passId: string;
  initialBids: BidView[];
  slotCount: number;
  minBidCoins: number;
  bidIncrementCoins: number;
  endsAt: string;
  status: string;
  isOwn: boolean;
  myCoins: number;
  isSignedIn: boolean;
}

export function LobbyPassLive(props: Props) {
  const router = useRouter();
  const [bids, setBids] = useState(props.initialBids);
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.floor((new Date(props.endsAt).getTime() - Date.now()) / 1000),
  );
  const [bidAmount, setBidAmount] = useState(() => {
    const top = props.initialBids[0];
    return top ? top.coinAmount + props.bidIncrementCoins : props.minBidCoins;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(props.status !== 'open' || secondsLeft <= 0);

  // Countdown
  useEffect(() => {
    if (closed) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setClosed(true);
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [closed]);

  // Realtime: subscribe to bid + close events; refresh server data on bid
  useEffect(() => {
    const unsub = subscribeToPass(props.passId, {
      onBid: (e: BidPlacedEvent) => {
        // Re-fetch authoritative bid list from server (we got a hint, refresh)
        router.refresh();
      },
      onClose: (e: PassClosedEvent) => {
        setClosed(true);
        router.refresh();
      },
    });
    return unsub;
  }, [props.passId, router]);

  // Polling fallback (every 15s) in case Pusher isn't configured
  useEffect(() => {
    if (closed) return;
    const id = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(id);
  }, [closed, router]);

  async function placeBid() {
    setError(null);
    if (!props.isSignedIn) {
      router.push(`/signin?next=/passes/${props.passId}`);
      return;
    }
    if (bidAmount > props.myCoins) {
      setError(`You only have ${formatCoins(props.myCoins)} coins. Top up first.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/passes/${props.passId}/bid`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ coinAmount: bidAmount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const visibleBids = bids.filter((b) => b.status !== 'refunded').slice(0, 8);
  const top = visibleBids[0];

  return (
    <Card className="p-7" style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.4), 0 0 60px rgba(255,46,170,0.1)' }}>
      <div className="flex items-center justify-between">
        <Badge variant="magenta">● Live Auction</Badge>
        <span className="font-mono text-xs text-text-3">{visibleBids.length} active bid{visibleBids.length === 1 ? '' : 's'}</span>
      </div>

      {top ? (
        <div className="mt-5 rounded-xl border border-border-magenta bg-neon-magenta/5 p-5">
          <div className="font-mono text-xs uppercase tracking-widest text-neon-magenta">Top bid</div>
          <div className="mt-2 font-display text-5xl font-bold text-neon-magenta glow-magenta-text">
            {formatCoins(top.coinAmount)}
          </div>
          <div className="mt-1 font-mono text-xs text-text-2">@{top.bidderHandle}</div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-border bg-bg-2 p-6 text-center text-text-3">
          <p className="font-mono text-sm">No bids yet. Be first.</p>
        </div>
      )}

      {/* Countdown */}
      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-text-3">
            {closed ? 'Auction ended' : 'Ends in'}
          </div>
          <div className={`mt-1 font-mono text-lg ${closed ? 'text-text-3' : 'text-neon-magenta'}`}>
            {closed ? '00:00:00' : formatCountdown(secondsLeft)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs uppercase tracking-widest text-text-3">Slots</div>
          <div className="mt-1 font-mono text-text-0">{props.slotCount}</div>
        </div>
      </div>

      {/* Bid history */}
      {visibleBids.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 font-mono text-xs uppercase tracking-widest text-text-2">
            Leaderboard · top {Math.min(visibleBids.length, 8)}
          </div>
          <div className="space-y-1">
            {visibleBids.map((b, i) => {
              const isWinner = i < props.slotCount;
              return (
                <div
                  key={b.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isWinner ? 'border-neon-green/30 bg-neon-green/5' : 'border-border bg-bg-2'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono text-xs ${isWinner ? 'text-neon-green' : 'text-text-3'}`}>
                      #{i + 1}
                    </span>
                    <span className="font-mono text-sm text-text-0">@{b.bidderHandle}</span>
                  </div>
                  <span className={`font-mono text-sm ${isWinner ? 'text-neon-green' : 'text-text-2'}`}>
                    {formatCoins(b.coinAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bid form */}
      {!closed && !props.isOwn && (
        <div className="mt-6 border-t border-border pt-6">
          <div className="font-mono text-xs uppercase tracking-widest text-text-2">Place your bid</div>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(Math.max(props.minBidCoins, Number(e.target.value)))}
              min={top ? top.coinAmount + props.bidIncrementCoins : props.minBidCoins}
              className="flex-1 rounded-lg border border-border bg-bg-2 px-4 py-3 font-mono text-text-0 focus:border-neon-magenta focus:outline-none"
            />
            <Button onClick={placeBid} disabled={loading} variant="magenta" size="lg">
              {loading ? '…' : 'Bid'}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-text-3">
            <span>Min next bid: {top ? top.coinAmount + props.bidIncrementCoins : props.minBidCoins}</span>
            <span>Your coins: {formatCoins(props.myCoins)}</span>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-sm text-neon-magenta">
              {error}
            </div>
          )}
        </div>
      )}

      {props.isOwn && (
        <div className="mt-6 rounded-lg border border-border bg-bg-2 p-4 text-center text-sm text-text-2">
          You can&apos;t bid on your own pass.
        </div>
      )}

      {closed && (
        <div className="mt-6 rounded-lg border border-neon-green/30 bg-neon-green/5 p-4 text-center text-sm text-neon-green">
          Auction closed. Top {props.slotCount} bidders unlocked DM access.
        </div>
      )}
    </Card>
  );
}
