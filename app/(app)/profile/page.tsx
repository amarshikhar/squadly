import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Badge } from '@/components/ui/badge';
import { RankVerifyForm } from '@/components/squadly/rank-verify-form';
import { db, gameRanks } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/signin?next=/profile');

  const ranks = await db.query.gameRanks.findMany({
    where: eq(gameRanks.userId, session.user.id),
  });

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>● Profile</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0">Your profile</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Verify your in-game ranks to unlock the verified badge on your Streamer Hub.
        </p>

        <div className="mt-12 max-w-2xl">
          <h2 className="mb-4 font-display text-2xl text-text-0">Game ranks</h2>
          <RankVerifyForm
            existingRanks={ranks.map((r) => ({
              game: r.game,
              rankLabel: r.rankLabel,
              verifiedVia: r.verifiedVia,
              verifiedAt: r.verifiedAt,
            }))}
          />
        </div>
      </main>
    </div>
  );
}
