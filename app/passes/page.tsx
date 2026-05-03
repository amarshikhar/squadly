import Link from 'next/link';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { listOpenPasses } from '@/lib/db/queries';
import { db, lobbyPassBids } from '@/lib/db';
import { GAME_LABELS, formatCoins } from '@/lib/utils';
import { SUPPORTED_GAMES } from '@/lib/constants';
import { formatDistanceToNow } from 'date-fns';

export const revalidate = 30;

export default async function PassesIndex({ searchParams }: { searchParams: { game?: string } }) {
  const passes = await listOpenPasses({ game: searchParams.game, limit: 60 });

  // Hydrate top bids for each pass
  const passIds = passes.map((p) => p.pass.id);
  const topByPass: Record<string, number> = {};
  if (passIds.length > 0) {
    const tops = await db
      .select({
        passId: lobbyPassBids.passId,
        topAmount: sql<number>`MAX(${lobbyPassBids.coinAmount})`,
      })
      .from(lobbyPassBids)
      .where(and(
        inArray(lobbyPassBids.passId, passIds),
        sql`${lobbyPassBids.status} IN ('winning','active')`,
      ))
      .groupBy(lobbyPassBids.passId);
    tops.forEach((t) => (topByPass[t.passId] = Number(t.topAmount)));
  }

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge variant="magenta">● Lobby Pass · Live auctions</Badge>
        <h1 className="mt-4 font-display text-display-lg text-text-0">Bid for a slot</h1>
        <p className="mt-3 max-w-xl text-text-2">
          Time-boxed auctions for slots in your favorite creator&apos;s squad. Top bidders unlock DM access.
        </p>

        {/* Game filters */}
        <div className="mt-8 flex flex-wrap gap-2">
          <Link href="/passes">
            <Badge variant={!searchParams.game ? 'default' : 'muted'} className="cursor-pointer">All</Badge>
          </Link>
          {SUPPORTED_GAMES.map((g) => (
            <Link key={g.code} href={`/passes?game=${g.code}`}>
              <Badge variant={searchParams.game === g.code ? 'default' : 'muted'} className="cursor-pointer">
                {g.emoji} {g.label}
              </Badge>
            </Link>
          ))}
        </div>

        {passes.length === 0 ? (
          <Card className="mt-10 p-12 text-center text-text-3">
            <p className="font-mono text-sm">No open Lobby Passes right now.</p>
            <Button asChild className="mt-5">
              <Link href="/passes/create">Create one →</Link>
            </Button>
          </Card>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {passes.map(({ pass, creator }) => (
              <Card key={pass.id} className="p-5 transition-all hover:border-border-magenta hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="magenta">{pass.slotCount} slot{pass.slotCount > 1 ? 's' : ''}</Badge>
                  <Badge variant="amber">{GAME_LABELS[pass.game] ?? pass.game}</Badge>
                </div>
                <h3 className="mt-4 line-clamp-2 font-display text-lg leading-tight text-text-0">{pass.title}</h3>
                <Link href={`/${creator.handle}`} className="mt-1 block font-mono text-xs text-text-2 hover:text-neon-magenta">
                  @{creator.handle}
                </Link>

                <div className="mt-5 rounded-lg border border-border-magenta bg-neon-magenta/5 p-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Top bid</div>
                      <div className="font-display text-2xl text-neon-magenta glow-magenta-text">
                        {formatCoins(topByPass[pass.id] ?? pass.minBidCoins)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Ends</div>
                      <div className="font-mono text-xs text-text-1">
                        {formatDistanceToNow(new Date(pass.endsAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>

                <Button asChild variant="magenta" size="sm" className="mt-4 w-full">
                  <Link href={`/passes/${pass.id}`}>View & bid →</Link>
                </Button>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
