import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● Hub" title="Loading your Hub…" cardCount={3} />;
}
