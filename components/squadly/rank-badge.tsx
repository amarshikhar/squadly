import { cn } from '@/lib/utils';
import { TIER_LABELS } from '@/lib/constants';
import type { RankTier } from '@/lib/utils';

interface RankBadgeProps {
  tier: RankTier;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const TIER_STYLES: Record<RankTier, string> = {
  recruit:   'bg-gradient-to-br from-tier-recruit to-[#2c3548] text-text-1 border-tier-recruit',
  soldier:   'bg-gradient-to-br from-tier-soldier to-[#5e3414] text-orange-100 border-tier-soldier shadow-[0_0_18px_rgba(163,90,38,0.4)]',
  veteran:   'bg-gradient-to-br from-tier-veteran to-[#5d6377] text-white border-tier-veteran shadow-[0_0_18px_rgba(154,164,190,0.4)]',
  legend:    'bg-gradient-to-br from-tier-legend to-[#cc9800] text-yellow-950 border-tier-legend shadow-[0_0_22px_rgba(255,215,0,0.5)]',
  commander: 'bg-grad-brand text-black border-neon-cyan shadow-glow-cyan',
};

const SIZE_STYLES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-2xl',
};

export function RankBadge({ tier, size = 'md', showName = false, className }: RankBadgeProps) {
  const t = TIER_LABELS[tier];
  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div
        className={cn(
          'flex items-center justify-center rounded-full border-2 font-display font-bold',
          SIZE_STYLES[size],
          TIER_STYLES[tier],
        )}
      >
        {t.roman}
      </div>
      {showName && (
        <div className="font-display text-xs font-bold uppercase tracking-wider text-text-0">
          {t.name}
        </div>
      )}
    </div>
  );
}
