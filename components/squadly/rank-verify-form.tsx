'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SUPPORTED_GAMES } from '@/lib/constants';

interface RankVerifyFormProps {
  existingRanks?: Array<{ game: string; rankLabel: string; verifiedVia: string | null; verifiedAt: Date | null }>;
}

export function RankVerifyForm({ existingRanks = [] }: RankVerifyFormProps) {
  const router = useRouter();
  const [game, setGame] = useState('valorant');
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [inGameId, setInGameId] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload =
        game === 'valorant'
          ? { game, gameName, tagLine }
          : { game, inGameId, proofUrl: proofUrl || undefined };

      const res = await fetch('/api/ranks/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');

      setResult(
        data.queuedForReview
          ? 'Submitted for manual review. We\'ll verify within 24 hours.'
          : `Verified: ${data.rank.rankLabel}`,
      );
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-7">
      {existingRanks.length > 0 && (
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-widest text-text-2">Verified ranks</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {existingRanks.map((r) => (
              <Badge
                key={r.game}
                variant={r.verifiedVia === 'riot_api' ? 'green' : r.verifiedVia === 'self_reported' ? 'amber' : 'muted'}
              >
                {r.game} · {r.rankLabel}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="font-mono text-xs uppercase tracking-widest text-text-2">Game</label>
          <select
            value={game}
            onChange={(e) => setGame(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 focus:border-neon-cyan focus:outline-none"
          >
            <option value="valorant">🔫 Valorant (live verification)</option>
            <option value="bgmi">🎯 BGMI (manual review)</option>
            <option value="free_fire">🔥 Free Fire (manual review)</option>
          </select>
        </div>

        {game === 'valorant' ? (
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-text-2">Riot Game Name</label>
              <input
                type="text"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                placeholder="TenZ"
                required
                className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-text-2">Tag</label>
              <div className="mt-2 flex items-center">
                <span className="rounded-l-lg border border-r-0 border-border bg-bg-2 px-3 py-3 font-mono text-text-3">#</span>
                <input
                  type="text"
                  value={tagLine}
                  onChange={(e) => setTagLine(e.target.value)}
                  placeholder="0001"
                  required
                  className="w-24 rounded-r-lg border border-border bg-bg-2 px-3 py-3 font-mono text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-text-2">In-Game ID</label>
              <input
                type="text"
                value={inGameId}
                onChange={(e) => setInGameId(e.target.value)}
                placeholder="Your unique BGMI / FF player ID"
                required
                className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-text-2">Proof screenshot URL (optional)</label>
              <input
                type="url"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                placeholder="https://imgur.com/yourrank"
                className="mt-2 w-full rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
              />
              <p className="mt-2 font-mono text-[11px] text-text-3">Speeds up manual review.</p>
            </div>
          </>
        )}

        <Button type="submit" disabled={loading} size="lg" className="w-full">
          {loading ? 'Verifying…' : 'Verify rank'}
        </Button>

        {error && (
          <div className="rounded-lg border border-border-magenta bg-neon-magenta/10 p-4 text-sm text-neon-magenta">
            {error}
          </div>
        )}
        {result && (
          <div className="rounded-lg border border-neon-green/30 bg-neon-green/10 p-4 text-sm text-neon-green">
            {result}
          </div>
        )}
      </form>
    </Card>
  );
}
