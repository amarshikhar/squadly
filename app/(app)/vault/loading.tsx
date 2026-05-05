import { PageSkeleton } from '@/components/squadly/loading-skeleton';

export default function Loading() {
  return <PageSkeleton badge="● The Vault" title="Loading your Vault…" cardCount={5} />;
}
