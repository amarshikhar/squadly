import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● Listings" title="Loading your listings…" cardCount={6} />;
}
