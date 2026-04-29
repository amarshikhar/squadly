/**
 * Riot Games API client (Valorant rank verification).
 *
 * Flow:
 *   1. Resolve Riot ID (gameName + tagLine) to PUUID via account-v1
 *   2. Fetch competitive rank via val-ranked-v1 (production key required)
 *
 * For dev/test (without a production key), use SANDBOX_RANKS to stub responses.
 */
const RIOT_BASE = {
  account: 'https://asia.api.riotgames.com',         // /riot/account/v1/accounts/by-riot-id
  val: 'https://ap.api.riotgames.com',               // Valorant ranked endpoint (region-specific)
};

const SANDBOX_RANKS: Record<string, string> = {
  'TenZ#0001': 'Radiant',
  'Scout#BGMI': 'Immortal 3',
  'Demo#0000': 'Diamond 2',
};

export interface RiotRankResult {
  riotId: string;
  puuid: string;
  rank: string;
  source: 'riot_api' | 'sandbox';
}

/** Verify a Valorant rank via Riot API. Throws on not found / API error. */
export async function verifyValorantRank(opts: {
  gameName: string;
  tagLine: string;
}): Promise<RiotRankResult> {
  const apiKey = process.env.RIOT_API_KEY;
  const riotId = `${opts.gameName}#${opts.tagLine}`;

  // Sandbox mode (no API key) — useful for local dev
  if (!apiKey || apiKey === '' || apiKey.startsWith('SANDBOX')) {
    const rank = SANDBOX_RANKS[riotId];
    if (!rank) throw new RiotError('not_found', `Sandbox: ${riotId} not found. Try TenZ#0001, Scout#BGMI, or Demo#0000.`);
    return { riotId, puuid: 'sandbox-' + riotId, rank, source: 'sandbox' };
  }

  // 1. Resolve PUUID
  const accountRes = await fetch(
    `${RIOT_BASE.account}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(opts.gameName)}/${encodeURIComponent(opts.tagLine)}`,
    { headers: { 'X-Riot-Token': apiKey }, cache: 'no-store' },
  );

  if (accountRes.status === 404) throw new RiotError('not_found', 'Riot ID not found');
  if (accountRes.status === 429) throw new RiotError('rate_limited', 'Riot API rate-limited; try again');
  if (!accountRes.ok) throw new RiotError('api_error', `Riot account API: ${accountRes.status}`);

  const account = await accountRes.json();
  const puuid: string = account.puuid;

  // 2. Fetch rank (requires Valorant production key — most apps don't have this)
  // For now, return a placeholder rank from PUUID hash; replace with val-ranked-v1 call once approved.
  // See: https://developer.riotgames.com/apis#val-ranked-v1
  const rank = await fetchValorantRank(puuid, apiKey);

  return { riotId, puuid, rank, source: 'riot_api' };
}

async function fetchValorantRank(puuid: string, apiKey: string): Promise<string> {
  // Production endpoint; requires `RSO + val-ranked-v1` access
  // const res = await fetch(`${RIOT_BASE.val}/val/ranked/v1/by-puuid/${puuid}`, ...);
  // For dev key: this endpoint isn't accessible. Return a placeholder so the flow works end-to-end.
  return 'Pending verification';
}

export class RiotError extends Error {
  constructor(public code: 'not_found' | 'rate_limited' | 'api_error' | 'invalid_input', message: string) {
    super(message);
    this.name = 'RiotError';
  }
}
