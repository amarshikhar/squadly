import { ImageResponse } from 'next/og';
import { getServiceById } from '@/lib/db/queries';
import { GAME_LABELS, formatInr } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const found = await getServiceById(params.id);
    if (!found) return fallback('Service');

    const { service, creator } = found;

    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: '#070912', color: '#f3f6ff',
          padding: '64px', fontFamily: 'sans-serif',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '6px 14px', border: '1px solid rgba(255,184,0,0.3)',
              borderRadius: '999px', fontSize: '16px',
              color: '#ffb800', background: 'rgba(255,184,0,0.08)',
              textTransform: 'uppercase', letterSpacing: '0.18em',
              display: 'flex',
            }}>{GAME_LABELS[service.game] ?? service.game}</div>
            <div style={{
              padding: '6px 14px', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '999px', fontSize: '16px',
              color: '#8a93ad', display: 'flex',
            }}>
              {service.type.replace('_', ' ')}
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '24px', color: '#8a93ad', display: 'flex' }}>
              @{creator.handle}
            </div>
            <div style={{
              fontSize: '64px', fontWeight: 700, lineHeight: 1.05,
              letterSpacing: '-0.02em', marginTop: '8px', display: 'flex',
            }}>
              {service.title.slice(0, 70)}
            </div>
            <div style={{
              marginTop: '28px', display: 'flex',
              alignItems: 'baseline', gap: '20px',
            }}>
              <div style={{
                fontSize: '76px', fontWeight: 700, color: '#00f0ff',
                lineHeight: 1, display: 'flex',
              }}>
                {formatInr(service.priceInr)}
              </div>
              <div style={{ fontSize: '22px', color: '#5b637b', display: 'flex' }}>
                {service.durationMin} min
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  } catch (e) {
    console.error('[og service error]', e);
    return fallback('Service');
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
