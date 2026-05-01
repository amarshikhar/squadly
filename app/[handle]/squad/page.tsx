import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RankBadge } from '@/components/squadly/rank-badge';
import { TIER_LABELS } from '@/lib/constants';
import type { RankTier } from '@/lib/utils';
import { getCreatorProfile, getTopFansForCreator } from '@/lib/db/queries';
import { db, squadRanks } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

export const revalidate = 60;

export default async function SquadLeaderboard({ params }: { params: { handle: string } }) {
  const profile = await getCreatorProfile(params.handle);
  if (!profile || !profile.user.isProvider) notFound();

  const session = await auth();
  const topFans = await getTopFansForCreator(profile.user.id, 50);

  // My rank for this creator (if signed in)
  let myRank: any = null;
  if (session?.user?.id) {
    myRank = await db.query.squadRanks.findFirst({
      where: and(eq(squadRanks.creatorId, profile.user.id), eq(squadRanks.fanId, session.user.id)),
    });
  }

  const tierBuckets: Record<string, number> = { recruit: 0, soldier: 0, veteran: 0, legend: 0, commander: 0 };
  topFans.forEach((f) => { tierBuckets[f.rank.currentTier] = (tierBuckets[f.rank.currentTier] ?? 0) + 1; });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <Link href={`/${profile.user.handle}`} className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← @{profile.user.handle}
        </Link>

        <h1 className="mt-6 font-display text-display-md text-text-0">
          {profile.user.displayName}&apos;s squad
        </h1>
        <p className="mt-3 max-w-xl text-text-2">
          Top fans climb tiers as they spend coins toward {profile.user.displayName}&apos;s goals, passes, and tips.
        </p>

        {/* Tier breakdown */}
        <div className="mt-10 grid grid-cols-5 gap-3">
          {(Object.keys(TIER_LABELS) as RankTier[]).map((t) => (
            <Card key={t} className="p-4 text-center">
              <RankBadge tier={t} size="sm" />
              <div className="mt-3 font-display text-2xl text-text-0">{tierBuckets[t]}</div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-text-3">
                {TIER_LABELS[t].name}
              </div>
            </Card>
          ))}
        </div>

        {/* My rank highlight */}
        {myRank && (
          <Card className="mt-8 p-5 border-neon-cyan/30 bg-neon-cyan/5">
            <div className="flex items-center gap-4">
              <RankBadge tier={myRank.currentTier as RankTier} size="md" />
              <div className="flex-1">
                <div className="font-mono text-xs uppercase tracking-widest text-text-2">Your rank</div>
                <div className="mt-1 font-display text-lg text-text-0">
                  {TIER_LABELS[myRank.currentTier as RankTier].name} ·{' '}
                  <span className="text-neon-cyan">{myRank.periodCoinsSpent.toLocaleString()} coins</span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs uppercase tracking-widest text-text-3">Position</div>
                <div className="font-mono text-lg text-text-0">#{myRank.rankPosition ?? '—'}</div>
              </div>
            </div>
          </Card>
        )}

        {/* Leaderboard */}
        <h2 className="mt-12 font-display text-2xl text-text-0">Leaderboard</h2>
        {topFans.length === 0 ? (
          <Card className="mt-4 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No fans yet. Be first.</p>
          </Card>
        ) : (
          <Card className="mt-4 overflow-hidden">
            <div className="divide-y divide-border">
              {topFans.map((f, i) => (
                <div key={f.fan.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-8 font-mono text-sm text-text-3">#{i + 1}</span>
                  <RankBadge tier={f.rank.currentTier as RankTier} size="sm" />
                  <div className="flex-1">
                    <div className="font-mono text-sm text-text-0">@{f.fan.handle}</div>
                    <div className="font-mono text-xs text-text-2">
                      {TIER_LABELS[f.rank.currentTier as RankTier].name}
                    </div>
                  </div>
                  <div className="font-mono text-sm text-neon-cyan">
                    {f.rank.periodCoinsSpent.toLocaleString()} coins
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
