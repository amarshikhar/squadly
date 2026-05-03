import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format INR amount stored in paise */
export function formatInr(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** Format coins (no currency symbol) */
export function formatCoins(coins: number): string {
  return new Intl.NumberFormat('en-IN').format(coins);
}

/** Calculate platform fee for a service price (paise → paise) */
export function platformFee(priceInr: number, isPro = false): number {
  const pct = isPro ? 10 : Number(process.env.PLATFORM_COMMISSION_PCT ?? 15);
  return Math.round((priceInr * pct) / 100);
}

/** Tier thresholds for Squad Ranks (period coins) */
export const RANK_TIERS = {
  recruit: 0,
  soldier: 100,
  veteran: 500,
  legend: 2000,
  commander: 5000,
} as const;

export type RankTier = keyof typeof RANK_TIERS;

export function tierForCoins(periodCoins: number): RankTier {
  if (periodCoins >= RANK_TIERS.commander) return 'commander';
  if (periodCoins >= RANK_TIERS.legend) return 'legend';
  if (periodCoins >= RANK_TIERS.veteran) return 'veteran';
  if (periodCoins >= RANK_TIERS.soldier) return 'soldier';
  return 'recruit';
}

/** Format a countdown duration in HH:MM:SS */
export function formatCountdown(secondsRemaining: number): string {
  const s = Math.max(0, Math.floor(secondsRemaining));
  const hh = Math.floor(s / 3600).toString().padStart(2, '0');
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/** Game code → display label */
export const GAME_LABELS: Record<string, string> = {
  bgmi: 'BGMI',
  valorant: 'Valorant',
  free_fire: 'Free Fire',
  dota2: 'DOTA 2',
  cs2: 'Counter-Strike 2',
  cod_mobile: 'COD Mobile',
  fortnite: 'Fortnite',
  mobile_legends: 'Mobile Legends',
  chess: 'Chess',
  other: 'Other',
};
