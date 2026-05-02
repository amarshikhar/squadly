import { ImageResponse } from 'next/og';
import { getGoalById } from '@/lib/db/queries';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const found = await getGoalById(params.id);
    if (!found) return fallback('Squad Goal not found');

    const { goal, creator } = found;
    const targetCoins = Math.max(1, goal.targetCoins);
    const pct = Math.min(100, Math.round((goal.currentCoins / targetCoins) * 100));

    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#070912', color: '#f3f6ff',
          padding: '64px', fontFamily: 'sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              padding: '6px 14px', border: '1px solid rgba(0,240,255,0.3)',
              borderRadius: '999px', fontSize: '16px',
              color: '#00f0ff', background: 'rgba(0,240,255,0.08)',
              textTransform: 'uppercase', letterSpacing: '0.18em',
              display: 'flex',
            }}>● Squad Goal</div>
            <div style={{ fontSize: '20px', color: '#8a93ad', display: 'flex' }}>
              @{creator.handle}
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontSize: '52px', fontWeight: 700, lineHeight: 1.1,
              letterSpacing: '-0.02em', display: 'flex',
            }}>
              {goal.title.slice(0, 90)}
            </div>

            <div style={{ marginTop: '36px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{
                width: '100%', height: '20px', borderRadius: '999px',
                border: '1px solid rgba(0,240,255,0.3)',
                background: 'rgba(0,240,255,0.06)',
                overflow: 'hidden', display: 'flex',
              }}>
                <div style={{
                  width: `${pct}%`, height: '100%', borderRadius: '999px',
                  background: '#00f0ff',
                  display: 'flex',
                }} />
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
              }}>
                <div style={{
                  fontSize: '60px', fontWeight: 700, color: '#00f0ff',
                  lineHeight: 1, display: 'flex',
                }}>
                  {goal.currentCoins.toLocaleString()}
                  <span style={{ color: '#5b637b', fontSize: '32px', display: 'flex', marginLeft: '8px' }}>
                    / {targetCoins.toLocaleString()}
                  </span>
                </div>
                <div style={{ fontSize: '24px', color: '#cdd5e8', display: 'flex' }}>
                  {pct}% funded
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (e) {
    console.error('[og goal error]', e);
    return fallback('Squad Goal');
  }
}

function fallback(text: string) {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#070912', color: '#f3f6ff',
        fontSize: 48, fontFamily: 'sans-serif',
      }}>
        {text}
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
