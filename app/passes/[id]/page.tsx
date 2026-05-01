import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LobbyPassLive } from '@/components/squadly/lobby-pass-live';
import { db, users, lobbyPassBids } from '@/lib/db';
import { getPassWithBids } from '@/lib/lobby-pass';
import { getVaultBalance } from '@/lib/db/queries';
import { GAME_LABELS } from '@/lib/utils';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await getPassWithBids(params.id);
  if (!data) return { title: 'Lobby Pass' };
  return {
    title: `${data.pass.title} · Lobby Pass`,
    description: data.pass.description ?? 'Bid for a slot in this Lobby Pass on Squadly',
    openGraph: {
      title: data.pass.title,
      description: `${data.pass.slotCount} slot${data.pass.slotCount > 1 ? 's' : ''} · live bidding`,
      images: [`/api/og/pass/${data.pass.id}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og/pass/${data.pass.id}`],
    },
  };
}

export default async function PassDetail({ params }: { params: { id: string } }) {
  const session = await auth();
  const data = await getPassWithBids(params.id);
  if (!data) notFound();

  const { pass, bids } = data;
  const creator = await db.query.users.findFirst({ where: eq(users.id, pass.creatorId) });
  if (!creator) notFound();

  const vault = session?.user?.id ? await getVaultBalance(session.user.id) : null;
  const isOwn = session?.user?.id === pass.creatorId;

  // Hydrate bidder handles
  const bidderIds = Array.from(new Set(bids.map((b) => b.bidderId)));
  const bidderRows = bidderIds.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) => inArray(u.id, bidderIds),
        columns: { id: true, handle: true, avatarUrl: true },
      })
    : [];
  const bidderMap: Record<string, { handle: string; avatarUrl: string | null }> = {};
  bidderRows.forEach((b) => (bidderMap[b.id] = { handle: b.handle, avatarUrl: b.avatarUrl }));

  const enrichedBids = bids.map((b) => ({
    id: b.id,
    bidderId: b.bidderId,
    bidderHandle: bidderMap[b.bidderId]?.handle ?? '?',
    coinAmount: b.coinAmount,
    status: b.status,
    bidAt: b.bidAt,
  }));

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
          {/* LEFT — pass info */}
          <div>
            <Badge variant="magenta">● Lobby Pass</Badge>
            <h1 className="mt-4 font-display text-display-md text-text-0">{pass.title}</h1>
            <Link href={`/${creator.handle}`} className="mt-3 inline-flex items-center gap-3 group">
              <div className="h-9 w-9 overflow-hidden rounded-full border border-border-magenta">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creator.avatarUrl ?? `https://i.pravatar.cc/100?u=${creator.id}`} alt={creator.displayName} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-mono text-sm text-text-0 group-hover:text-neon-magenta transition-colors">@{creator.handle}</div>
              </div>
            </Link>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="amber">{GAME_LABELS[pass.game] ?? pass.game}</Badge>
              <Badge variant="magenta">{pass.slotCount} slot{pass.slotCount === 1 ? '' : 's'}</Badge>
              <Badge variant="muted">{pass.sessionDurationMin} min session</Badge>
            </div>

            {pass.description && (
              <Card className="mt-6 p-5">
                <p className="whitespace-pre-line text-sm text-text-1">{pass.description}</p>
              </Card>
            )}

            <Card className="mt-4 p-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-3">Auction ends</div>
                  <div className="mt-1 font-mono text-text-0">{format(new Date(pass.endsAt), 'dd MMM HH:mm')}</div>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-3">Session at</div>
                  <div className="mt-1 font-mono text-text-0">{format(new Date(pass.sessionAt), 'dd MMM HH:mm')}</div>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-3">Min bid</div>
                  <div className="mt-1 font-mono text-neon-magenta">{pass.minBidCoins} coins</div>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-text-3">Bid step</div>
                  <div className="mt-1 font-mono text-text-0">+{pass.bidIncrementCoins} coins</div>
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT — live bidding */}
          <LobbyPassLive
            passId={pass.id}
            initialBids={enrichedBids}
            slotCount={pass.slotCount}
            minBidCoins={pass.minBidCoins}
            bidIncrementCoins={pass.bidIncrementCoins}
            endsAt={pass.endsAt.toISOString()}
            status={pass.status}
            isOwn={isOwn}
            myCoins={vault?.coinBalance ?? 0}
            isSignedIn={!!session?.user}
          />
        </div>
      </main>
    </div>
  );
}
