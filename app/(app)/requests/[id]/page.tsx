import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RequestActions } from '@/components/squadly/request-actions';
import { RaiseDisputeButton } from '@/components/squadly/raise-dispute-button';
import { getRequestById } from '@/lib/db/queries';
import { formatInr, GAME_LABELS } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function RequestDetail({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect(`/signin?next=/requests/${params.id}`);

  const found = await getRequestById(params.id);
  if (!found) notFound();

  const { request: r, service, creator } = found;
  const isCreator = r.creatorId === session.user.id;
  const isBuyer = r.buyerId === session.user.id;

  if (!isCreator && !isBuyer) redirect('/requests');

  const STATUS_VARIANT: Record<string, 'default' | 'magenta' | 'green' | 'amber' | 'muted'> = {
    pending: 'amber',
    accepted: 'default',
    in_progress: 'default',
    completed: 'green',
    cancelled: 'muted',
    disputed: 'magenta',
  };

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <Link href="/requests" className="font-mono text-sm text-text-2 hover:text-neon-cyan">
          ← All requests
        </Link>

        <div className="mt-6 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div>
            <Badge variant={STATUS_VARIANT[r.status]} className="mb-4">{r.status.replace('_', ' ')}</Badge>
            <h1 className="font-display text-display-md text-text-0">{service.title}</h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="amber">{GAME_LABELS[service.game] ?? service.game}</Badge>
              <Badge variant="muted">{service.type.replace('_', ' ')}</Badge>
              <Badge variant="muted">{service.durationMin} min</Badge>
            </div>

            <Card className="mt-8 p-6">
              <h2 className="font-display text-lg text-text-0">Service description</h2>
              <p className="mt-3 whitespace-pre-line text-sm text-text-1">{service.description}</p>
            </Card>

            {r.notes && (
              <Card className="mt-4 p-6">
                <h2 className="font-display text-lg text-text-0">Buyer&apos;s notes</h2>
                <p className="mt-3 whitespace-pre-line text-sm text-text-1">{r.notes}</p>
              </Card>
            )}

            {/* Timeline */}
            <Card className="mt-4 p-6">
              <h2 className="font-display text-lg text-text-0">Timeline</h2>
              <div className="mt-4 space-y-3 text-sm font-mono">
                <TimelineRow label="Requested" timestamp={r.requestedAt} active />
                <TimelineRow label="Accepted" timestamp={r.acceptedAt} active={!!r.acceptedAt} />
                <TimelineRow label="Started" timestamp={r.startedAt} active={!!r.startedAt} />
                <TimelineRow label="Completed" timestamp={r.completedAt} active={!!r.completedAt} variant="green" />
                {r.cancelledAt && (
                  <TimelineRow label="Cancelled" timestamp={r.cancelledAt} active variant="magenta" extra={r.cancelReason ?? undefined} />
                )}
              </div>
            </Card>
          </div>

          <div>
            <Card className="sticky top-20 p-6">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">
                {isCreator ? 'You earn' : 'You pay'}
              </div>
              <div className="mt-2 font-display text-3xl text-neon-cyan glow-cyan-text">
                {isCreator ? formatInr(r.creatorPayoutInr) : formatInr(r.priceInrPaid)}
              </div>

              <Link
                href={`/${creator.handle}`}
                className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-bg-2 p-3 transition-colors hover:border-border-bright"
              >
                <div className="h-9 w-9 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={creator.avatarUrl ?? `https://i.pravatar.cc/100?u=${creator.id}`} alt={creator.displayName} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="font-mono text-sm text-text-0">@{creator.handle}</div>
                  <div className="font-mono text-xs text-text-2">{isCreator ? 'You' : creator.displayName}</div>
                </div>
              </Link>

              <RequestActions
                requestId={r.id}
                status={r.status}
                isCreator={isCreator}
                isBuyer={isBuyer}
              />

              {isBuyer && ['accepted', 'in_progress', 'completed'].includes(r.status) && (
                <div className="mt-4 border-t border-border pt-4">
                  <RaiseDisputeButton requestId={r.id} />
                </div>
              )}

              {r.status === 'disputed' && (
                <div className="mt-4 rounded-lg border border-border-magenta bg-neon-magenta/10 p-3 text-center text-sm text-neon-magenta">
                  This request is under dispute. Admin is reviewing.
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function TimelineRow({
  label,
  timestamp,
  active,
  variant = 'default',
  extra,
}: {
  label: string;
  timestamp: Date | null | undefined;
  active: boolean;
  variant?: 'default' | 'green' | 'magenta';
  extra?: string;
}) {
  const colors = {
    default: 'bg-neon-cyan',
    green: 'bg-neon-green',
    magenta: 'bg-neon-magenta',
  };
  return (
    <div className="flex items-center gap-3">
      <div className={`h-2 w-2 rounded-full ${active ? colors[variant] : 'bg-text-3'}`} />
      <div className="flex-1 text-text-1">{label}</div>
      <div className="text-text-3">
        {timestamp ? format(new Date(timestamp), 'dd MMM, HH:mm') : '—'}
        {extra && <span className="ml-2 text-neon-magenta">· {extra}</span>}
      </div>
    </div>
  );
}
