import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCoins, formatCountdown } from '@/lib/utils';

interface Bid {
  bidderHandle: string;
  amount: number;
  ageMinutes: number;
}

interface LobbyPassCardProps {
  title: string;
  game: string;
  slotCount: number;
  topBid: Bid;
  recentBids: Bid[];
  secondsRemaining: number;
  bidderCount: number;
}

export function LobbyPassCard({
  title,
  game,
  slotCount,
  topBid,
  recentBids,
  secondsRemaining,
  bidderCount,
}: LobbyPassCardProps) {
  return (
    <Card className="p-7 shadow-card">
      <div className="font-mono text-xs uppercase tracking-widest text-text-2">Lobby Pass</div>
      <h3 className="mt-1 font-display text-xl font-semibold text-text-0">{title}</h3>
      <div className="mt-1 text-sm text-text-2">
        <span className="font-mono font-semibold text-neon-magenta">{slotCount} slots open</span>
        <span> · {game}</span>
      </div>

      <div className="mt-5 rounded-xl border border-border-magenta bg-neon-magenta/5 p-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <Badge variant="magenta">Top Bid</Badge>
          <Badge variant="green">● Winning</Badge>
        </div>
        <div className="mt-3 font-display text-4xl font-bold text-neon-magenta glow-magenta-text">
          {formatCoins(topBid.amount)}
        </div>
        <div className="mt-1 font-mono text-xs text-text-2">
          by @{topBid.bidderHandle} · {topBid.ageMinutes} min ago
        </div>
      </div>

      <div className="mt-4 space-y-2 font-mono text-xs text-text-2">
        {recentBids.map((b, i) => (
          <div key={i} className="flex items-center justify-between border-b border-white/5 py-2 last:border-b-0">
            <span className="font-semibold text-text-0">{formatCoins(b.amount)} coins</span>
            <span className="text-text-3">@{b.bidderHandle} · {b.ageMinutes}m</span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-text-3">Auction ends</div>
          <div className="font-mono text-base font-semibold text-neon-magenta">
            {formatCountdown(secondsRemaining)}
          </div>
        </div>
        <div className="font-mono text-xs text-text-2">{bidderCount} active bidders</div>
      </div>
    </Card>
  );
}
