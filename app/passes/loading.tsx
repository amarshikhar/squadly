import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● Lobby Pass · Live auctions" title="Loading auctions…" cardCount={6} />;
}
