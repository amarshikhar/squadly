import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/squadly/nav';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookButton } from '@/components/squadly/book-button';
import { ShareServiceButton } from '@/components/squadly/share-service-button';
import { formatInr, GAME_LABELS, platformFee } from '@/lib/utils';
import { getServiceById } from '@/lib/db/queries';

export const revalidate = 30;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const found = await getServiceById(params.id);
  if (!found) return { title: 'Service' };
  return {
    title: `${found.service.title} · @${found.creator.handle}`,
    description: found.service.description.slice(0, 160),
    openGraph: {
      title: found.service.title,
      description: `Book on Squadly · @${found.creator.handle}`,
      images: [`/api/og/service/${found.service.id}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`/api/og/service/${found.service.id}`],
    },
  };
}

export default async function ServiceDetail({ params }: { params: { id: string } }) {
  const found = await getServiceById(params.id);
  if (!found) notFound();

  const { service, creator } = found;
  const fee = platformFee(service.priceInr);
  const creatorPayout = service.priceInr - fee;

  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-12">
        <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          {/* Main content */}
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="amber">{GAME_LABELS[service.game] ?? service.game}</Badge>
              <Badge variant="muted">{service.type.replace('_', ' ')}</Badge>
            </div>

            <h1 className="mt-5 font-display text-display-md text-text-0">{service.title}</h1>

            <Link href={`/${creator.handle}`} className="mt-4 inline-flex items-center gap-3 group">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-border-bright">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={creator.avatarUrl ?? `https://i.pravatar.cc/100?u=${creator.id}`} alt={creator.displayName} className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-mono text-sm text-text-0 group-hover:text-neon-cyan transition-colors">@{creator.handle}</div>
                <div className="font-mono text-xs text-text-2">{creator.displayName}</div>
              </div>
            </Link>

            <Card className="mt-10 p-7">
              <h2 className="font-display text-lg text-text-0">About this service</h2>
              <p className="mt-3 whitespace-pre-line text-text-1">{service.description}</p>
            </Card>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <Card className="p-5">
                <div className="font-mono text-xs uppercase tracking-widest text-text-2">Duration</div>
                <div className="mt-2 font-display text-2xl text-text-0">{service.durationMin} min</div>
              </Card>
              <Card className="p-5">
                <div className="font-mono text-xs uppercase tracking-widest text-text-2">Delivery</div>
                <div className="mt-2 font-display text-2xl text-text-0">{service.deliveryWindowHours}h</div>
              </Card>
              <Card className="p-5">
                <div className="font-mono text-xs uppercase tracking-widest text-text-2">Type</div>
                <div className="mt-2 font-display text-2xl text-text-0 capitalize">{service.type.replace('_', ' ')}</div>
              </Card>
            </div>
          </div>

          {/* Booking sidebar */}
          <div>
            <Card className="p-7 sticky top-20">
              <div className="font-mono text-xs uppercase tracking-widest text-text-2">Total</div>
              <div className="mt-2 font-display text-4xl text-neon-cyan glow-cyan-text">{formatInr(service.priceInr)}</div>

              <div className="mt-6 space-y-2 border-t border-border pt-5 text-sm font-mono text-text-2">
                <div className="flex justify-between">
                  <span>Service price</span>
                  <span>{formatInr(service.priceInr)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform fee (15%)</span>
                  <span>{formatInr(fee)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-text-1">
                  <span>Creator earns</span>
                  <span className="text-neon-green">{formatInr(creatorPayout)}</span>
                </div>
              </div>

              <BookButton serviceId={service.id} priceInr={service.priceInr} />
              <ShareServiceButton serviceId={service.id} title={service.title} handle={creator.handle} />

              <p className="mt-4 text-center text-xs text-text-3">
                Pay with UPI · Cards · Net Banking. Refundable if creator cancels.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
