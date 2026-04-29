import { cn } from '@/lib/utils';
import { formatCoins } from '@/lib/utils';

interface GoalBarProps {
  current: number;
  target: number;
  className?: string;
  showPct?: boolean;
}

/**
 * Animated progress bar for a Squad Goal.
 * Visual style matches the deck mockup — cyan glow, dot at the leading edge.
 */
export function GoalBar({ current, target, className, showPct = true }: GoalBarProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative h-3.5 overflow-hidden rounded-full border border-neon-cyan/20 bg-neon-cyan/5">
        <div
          className="relative h-full rounded-full bg-gradient-to-r from-neon-cyan to-cyan-400 shadow-glow-cyan transition-all duration-500"
          style={{ width: `${pct}%` }}
        >
          <div className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full bg-neon-cyan shadow-glow-cyan" />
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div className="font-display text-2xl font-bold text-text-0">
          <span className="text-neon-cyan glow-cyan-text">{formatCoins(current)}</span>
          <span className="text-text-3 text-base font-normal"> / {formatCoins(target)}</span>
        </div>
        {showPct && <div className="font-mono text-sm text-text-2">{pct}% funded</div>}
      </div>
    </div>
  );
}
