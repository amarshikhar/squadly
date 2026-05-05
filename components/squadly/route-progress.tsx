'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Top-of-page progress bar that animates whenever the URL changes.
 * Gives users an instant "something is loading" cue while the next route's
 * server components stream in — without us having to plumb pending state
 * into every Link click.
 *
 * Heuristic: we hold the bar at ~80% until the new pathname renders, then
 * snap it to 100% and fade out. This matches what users expect from
 * NProgress-style indicators on YouTube, GitHub, etc.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const lastUrl = useRef<string | null>(null);
  const tickTimers = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    const url = `${pathname}?${searchParams.toString()}`;
    if (lastUrl.current === null) {
      lastUrl.current = url;
      return;
    }
    if (lastUrl.current === url) return;

    // URL changed — start a new progress run.
    lastUrl.current = url;

    // Clear any previous timers.
    tickTimers.current.forEach(clearTimeout);
    tickTimers.current = [];

    setVisible(true);
    setWidth(15);

    tickTimers.current.push(setTimeout(() => setWidth(40), 80));
    tickTimers.current.push(setTimeout(() => setWidth(70), 240));
    tickTimers.current.push(setTimeout(() => setWidth(85), 500));

    // Snap to 100 + fade out shortly after the new page commits.
    tickTimers.current.push(
      setTimeout(() => {
        setWidth(100);
      }, 700),
    );
    tickTimers.current.push(
      setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 1000),
    );

    return () => {
      tickTimers.current.forEach(clearTimeout);
      tickTimers.current = [];
    };
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-[100] h-0.5"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 200ms ease' }}
    >
      <div
        className="h-full bg-gradient-to-r from-neon-cyan via-neon-magenta to-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)]"
        style={{
          width: `${width}%`,
          transition: 'width 240ms ease',
        }}
      />
    </div>
  );
}
