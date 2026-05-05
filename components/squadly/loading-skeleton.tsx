import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Nav } from '@/components/squadly/nav';

/**
 * Generic page-load skeleton used by route-level `loading.tsx` files.
 * Shows the Nav + a pulsing card grid so users get instant visual feedback
 * during the server-component fetch on heavy pages.
 */
export function PageSkeleton({
  badge = '● Loading',
  title = 'One sec…',
  cardCount = 6,
}: {
  badge?: string;
  title?: string;
  cardCount?: number;
}) {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="container-x py-16">
        <Badge>{badge}</Badge>
        <h1 className="mt-4 font-display text-display-md text-text-0/40">{title}</h1>

        <div className="mt-10 grid animate-pulse gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-32 p-6">
              <div className="h-3 w-24 rounded-full bg-bg-2" />
              <div className="mt-3 h-8 w-32 rounded-md bg-bg-2" />
              <div className="mt-4 h-2 w-20 rounded-full bg-bg-2" />
            </Card>
          ))}
        </div>

        <div className="mt-10 grid animate-pulse gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i} className="h-44 p-5">
              <div className="h-3 w-20 rounded-full bg-bg-2" />
              <div className="mt-3 h-5 w-3/4 rounded-md bg-bg-2" />
              <div className="mt-2 h-3 w-1/2 rounded-full bg-bg-2" />
              <div className="mt-6 h-12 rounded-lg bg-bg-2" />
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
