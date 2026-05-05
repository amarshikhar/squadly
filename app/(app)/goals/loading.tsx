import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● Squad Goals · Live" title="Loading goals…" cardCount={4} />;
}
