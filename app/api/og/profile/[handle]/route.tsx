import { ImageResponse } from 'next/og';
import { getCreatorProfile } from '@/lib/db/queries';
import { GAME_LABELS } from '@/lib/utils';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET(_req: Request, { params }: { params: { handle: string } }) {
  const profile = await getCreatorProfile(params.handle);

  if (!profile) {
    return fallback(`@${params.handle}`, 'Squadly creator');
  }

  const { user, profile: provider, ranks } = profile;
  const primaryRank = ranks.find((r) => r.game === provider?.primaryGame);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#070912', color: '#f3f6ff',
          padding: '64px', fontFamily: 'sans-serif',
          backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(0,240,255,0.15), transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,46,170,0.12), transparent 55%)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div
            style={{
              width: '40px', height: '40px',
              background: 'linear-gradient(135deg, #00f0ff, #ff2eaa)',
              borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#000', fontWeight: 700, fontSize: '22px',
            }}
          >S</div>
          <div style={{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.02em' }}>Squadly</div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '32px', color: '#8a93ad', fontWeight: 500 }}>@{user.handle}</div>
          <div style={{ fontSize: '88px', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.0, marginTop: '12px', color: '#f3f6ff' }}>
            {user.displayName}
          </div>

          {provider?.primaryGame && primaryRank && (
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <div style={{
                padding: '8px 18px', border: '1px solid rgba(0,240,255,0.3)',
                borderRadius: '999px', fontSize: '20px',
                color: '#00f0ff', background: 'rgba(0,240,255,0.08)',
              }}>
                {GAME_LABELS[provider.primaryGame] ?? provider.primaryGame} · {primaryRank.rankLabel}
              </div>
              {user.isVerified && (
                <div style={{
                  padding: '8px 18px', border: '1px solid rgba(123,255,164,0.3)',
                  borderRadius: '999px', fontSize: '20px',
                  color: '#7bffa4', background: 'rgba(123,255,164,0.08)',
                }}>
                  ✓ Verified
                </div>
              )}
            </div>
          )}

          {provider?.totalCompleted && provider.totalCompleted > 0 && (
            <div style={{ marginTop: '32px', fontSize: '24px', color: '#cdd5e8', display: 'flex' }}>
              {provider.totalCompleted} completed · ★ {Number(provider.avgRating ?? 0).toFixed(1)}
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

function fallback(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: '#070912', color: '#f3f6ff',
        padding: '64px', fontFamily: 'sans-serif',
      }}>
        <div style={{ fontSize: '32px', color: '#8a93ad' }}>{subtitle}</div>
        <div style={{ fontSize: '88px', fontWeight: 700, marginTop: '12px' }}>{title}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
