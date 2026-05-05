import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● Purchases & Contributions" title="Loading your spending…" cardCount={6} />;
}
