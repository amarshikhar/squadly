'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export interface CarouselSlide {
  id: string;
  /** Short label shown in dot ARIA + screen-reader announcement */
  title: string;
  /** Optional count badge shown next to the dot */
  count?: number;
  /** Slide content — usually a Card with a list inside */
  content: ReactNode;
}

interface PurchasesCarouselProps {
  /** Section heading shown above the carousel */
  heading: string;
  /** Three slides — fewer/more is fine, the carousel adapts */
  slides: CarouselSlide[];
}

/**
 * Looping carousel with arrow buttons, keyboard ←/→ navigation, dot indicators,
 * and reduced-motion support. One full-width slide visible at a time, slides
 * animate in via CSS transform transitions.
 *
 * Built with simple state + transform; no third-party dependency. Uses native
 * focus management and ARIA roles so screen readers announce slide changes.
 */
export function PurchasesCarousel({ heading, slides }: PurchasesCarouselProps) {
  const [index, setIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const total = slides.length;

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  // Keyboard ←/→ when the carousel region is focused
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    }
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // Touch swipe — basic threshold-based gesture, no library
  const touchStart = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStart.current;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  }

  if (total === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label={heading}
      className="select-none"
    >
      {/* Header row — title + arrow controls */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-text-0">{heading}</h2>
        <div className="flex items-center gap-2">
          <ArrowButton direction="left" onClick={goPrev} ariaLabel="Previous slide" />
          <span className="font-mono text-xs tabular-nums text-text-3" aria-live="polite">
            {index + 1} / {total}
          </span>
          <ArrowButton direction="right" onClick={goNext} ariaLabel="Next slide" />
        </div>
      </div>

      {/* Slide track */}
      <div
        ref={wrapperRef}
        tabIndex={0}
        role="group"
        aria-label={`${heading} slides — use arrow keys to navigate`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="overflow-hidden rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-bg-0"
      >
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${total}: ${slide.title}`}
              aria-hidden={i !== index}
              className="w-full flex-shrink-0 px-1"
              // Hide non-active slides from keyboard nav so tab order is clean
              {...(i !== index ? { inert: '' as any } : {})}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      <div className="mt-5 flex justify-center gap-2.5">
        {slides.map((slide, i) => {
          const active = i === index;
          return (
            <button
              key={slide.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show ${slide.title}${
                typeof slide.count === 'number' ? ` (${slide.count})` : ''
              }`}
              aria-current={active ? 'true' : 'false'}
              className={
                'group relative flex items-center gap-2 transition-all motion-reduce:transition-none ' +
                (active ? 'text-neon-cyan' : 'text-text-3 hover:text-text-1')
              }
            >
              <span
                className={
                  'block h-1.5 rounded-full transition-all motion-reduce:transition-none ' +
                  (active ? 'w-8 bg-neon-cyan shadow-glow-cyan' : 'w-1.5 bg-border group-hover:bg-text-2')
                }
              />
              <span className="font-mono text-[10px] uppercase tracking-widest">
                {slide.title}
                {typeof slide.count === 'number' && (
                  <span className="ml-1 text-text-3">· {slide.count}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ArrowButton({
  direction,
  onClick,
  ariaLabel,
}: {
  direction: 'left' | 'right';
  onClick: () => void;
  ariaLabel: string;
}) {
  const isLeft = direction === 'left';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-full border border-border bg-bg-1 text-text-1 transition-all hover:border-neon-cyan hover:text-neon-cyan hover:shadow-glow-cyan focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={isLeft ? '' : 'rotate-180'}
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
