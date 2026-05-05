import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● Discovery" title="Loading Browse…" cardCount={9} />;
}
