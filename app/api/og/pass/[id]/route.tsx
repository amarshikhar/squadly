import { ImageResponse } from 'next/og';
import { db, lobbyPasses, users, lobbyPassBids } from '@/lib/db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { GAME_LABELS } from '@/lib/utils';

export const runtime = 'nodejs';
export const revalidate = 30;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const pass = await db.query.lobbyPasses.findFirst({ where: eq(lobbyPasses.id, params.id) });
  if (!pass) {
    return new ImageResponse(<div style={{ width: '100%', height: '100%', background: '#070912' }} />, { width: 1200, height: 630 });
  }
  const creator = await db.query.users.findFirst({ where: eq(users.id, pass.creatorId), columns: { handle: true } });
  const top = await db.query.lobbyPassBids.findFirst({
    where: and(eq(lobbyPassBids.passId, pass.id), sql`${lobbyPassBids.status} IN ('winning','active')`),
    orderBy: [desc(lobbyPassBids.coinAmount)],
  });

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#070912', color: '#f3f6ff', padding: '64px', fontFamily: 'sans-serif',
        backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(255,46,170,0.18), transparent 50%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '6px 14px', border: '1px solid rgba(255,46,170,0.3)', borderRadius: '999px', fontSize: '16px', color: '#ff2eaa', background: 'rgba(255,46,170,0.08)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
            ● Lobby Pass
          </div>
          <div style={{ fontSize: '20px', color: '#8a93ad' }}>@{creator?.handle}</div>
          <div style={{ fontSize: '20px', color: '#5b637b' }}>· {GAME_LABELS[pass.game] ?? pass.game}</div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '60px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {pass.title}
          </div>
          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'flex-end', gap: '40px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '16px', color: '#8a93ad', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Top bid</div>
              <div style={{ fontSize: '88px', fontWeight: 700, color: '#ff2eaa', lineHeight: 1 }}>
                {top ? top.coinAmount.toLocaleString() : pass.minBidCoins.toLocaleString()}
                <span style={{ fontSize: '32px', color: '#5b637b' }}> coins</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 'auto' }}>
              <div style={{ fontSize: '16px', color: '#8a93ad', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Slots</div>
              <div style={{ fontSize: '60px', fontWeight: 700, color: '#f3f6ff', lineHeight: 1 }}>{pass.slotCount}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
