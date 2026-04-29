/** Squadly constants */

export const APP_NAME = 'Squadly';
export const APP_TAGLINE = "The home for India's gaming creators.";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const SUPPORTED_GAMES = [
  { code: 'bgmi', label: 'BGMI', emoji: '🎯' },
  { code: 'valorant', label: 'Valorant', emoji: '🔫' },
  { code: 'free_fire', label: 'Free Fire', emoji: '🔥' },
  { code: 'dota2', label: 'DOTA 2', emoji: '⚔️' },
  { code: 'cs2', label: 'Counter-Strike 2', emoji: '💣' },
  { code: 'cod_mobile', label: 'COD Mobile', emoji: '🪖' },
  { code: 'mobile_legends', label: 'Mobile Legends', emoji: '🛡️' },
  { code: 'fortnite', label: 'Fortnite', emoji: '⛏️' },
] as const;

export const SERVICE_TYPES = [
  { code: 'coaching', label: 'Coaching', icon: '🎓' },
  { code: 'duo', label: 'Duo / Squad', icon: '🤝' },
  { code: 'rank_push', label: 'Rank Push', icon: '⬆️' },
  { code: 'lineup', label: 'Custom Lineup', icon: '📍' },
  { code: 'crosshair_fix', label: 'Crosshair Fix', icon: '🎯' },
  { code: 'hype_reel', label: 'Hype Reel', icon: '🎬' },
  { code: 'custom', label: 'Custom', icon: '✨' },
] as const;

export const TIER_LABELS = {
  recruit: { name: 'Recruit', roman: 'I', color: '#4a5468', threshold: 0 },
  soldier: { name: 'Soldier', roman: 'II', color: '#a35a26', threshold: 100 },
  veteran: { name: 'Veteran', roman: 'III', color: '#9aa4be', threshold: 500 },
  legend: { name: 'Legend', roman: 'IV', color: '#ffd700', threshold: 2000 },
  commander: { name: 'Commander', roman: 'V', color: '#00f0ff', threshold: 5000 },
} as const;

export const COIN_RATE = Number(process.env.COIN_RATE ?? 0.7); // coins per ₹1
export const MIN_TOPUP_INR = Number(process.env.MIN_TOPUP_INR ?? 100);

/** Suggested coin top-up bundles (INR → coins) */
export const COIN_BUNDLES = [
  { inr: 100, coins: 70, bonus: 0 },
  { inr: 500, coins: 380, bonus: 30 },
  { inr: 1000, coins: 800, bonus: 100 },
  { inr: 2500, coins: 2100, bonus: 350 },
  { inr: 5000, coins: 4500, bonus: 1000 },
];
