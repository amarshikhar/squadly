'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';

interface MobileMenuProps {
  isAuthed: boolean;
  userName?: string | null;
  coinBalance?: number;
}

export function MobileMenu({ isAuthed, userName, coinBalance }: MobileMenuProps) {
  const [open, setOpen] = useState(false);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {/* Hamburger button — visible on mobile only */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-bg-1 text-text-1 transition-colors hover:border-border-bright lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Drawer overlay — fixed full-viewport using dvh (handles iOS Safari URL bar) */}
      {open && (
        <div
          className="fixed inset-0 z-[80] lg:hidden"
          style={{ height: '100dvh' }}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            style={{ height: '100dvh' }}
          />

          {/* Drawer panel — wider (88% on phone, max 380px), full height, translucent */}
          <div
            className="absolute right-0 top-0 flex w-[min(88%,380px)] flex-col border-l border-border-bright/40 bg-bg-1/85 shadow-card backdrop-blur-2xl"
            style={{
              height: '100dvh',
              WebkitBackdropFilter: 'blur(24px)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Sticky header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-border bg-bg-1/50 p-5 backdrop-blur-md">
              <span className="font-display text-lg font-bold text-text-0">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-9 w-9 place-items-center rounded-lg text-text-2 hover:bg-bg-2 hover:text-neon-cyan"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-5">
              {isAuthed && coinBalance !== undefined && (
                <Link
                  href="/vault"
                  onClick={() => setOpen(false)}
                  className="mb-4 flex items-center justify-between rounded-lg border border-border-bright bg-neon-cyan/10 px-4 py-3 font-mono text-sm text-text-0"
                >
                  <span className="text-text-2">Coins</span>
                  <span className="text-neon-cyan">● {coinBalance.toLocaleString()}</span>
                </Link>
              )}

              {isAuthed && (
                <NavLink href="/feed" onClick={() => setOpen(false)}>Feed</NavLink>
              )}
              <NavLink href="/services" onClick={() => setOpen(false)}>Browse</NavLink>
              <NavLink href="/goals" onClick={() => setOpen(false)}>Squad Goals</NavLink>
              <NavLink href="/passes" onClick={() => setOpen(false)}>Lobby Passes</NavLink>
              {isAuthed ? (
                <>
                  <NavLink href="/requests" onClick={() => setOpen(false)}>Requests</NavLink>
                  <NavLink href="/messages" onClick={() => setOpen(false)}>DMs</NavLink>
                  <NavLink href="/notifications" onClick={() => setOpen(false)}>Notifications</NavLink>
                  <NavLink href="/referrals" onClick={() => setOpen(false)}>Referrals</NavLink>
                  <NavLink href="/payouts" onClick={() => setOpen(false)}>Payouts</NavLink>
                  <NavLink href="/profile" onClick={() => setOpen(false)}>Profile</NavLink>
                  <NavLink href="/home" onClick={() => setOpen(false)} accent>Streamer Hub</NavLink>
                  <form action={signOutAction} className="mt-3">
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-border bg-bg-2/50 px-4 py-3 text-left text-base text-neon-magenta hover:bg-bg-2"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <NavLink href="/signin" onClick={() => setOpen(false)} accent>Sign in</NavLink>
              )}
            </div>

            {/* Sticky footer */}
            <div className="flex flex-shrink-0 items-center gap-4 border-t border-border bg-bg-1/50 p-4 backdrop-blur-md">
              <Link
                href="/terms"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-text-3 hover:text-text-1"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                onClick={() => setOpen(false)}
                className="font-mono text-xs text-text-3 hover:text-text-1"
              >
                Privacy
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavLink({
  href,
  onClick,
  accent,
  children,
}: {
  href: string;
  onClick: () => void;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`rounded-lg px-4 py-3 text-base transition-colors ${
        accent
          ? 'bg-neon-cyan text-black font-semibold shadow-glow-cyan hover:brightness-110'
          : 'text-text-1 hover:bg-bg-2 hover:text-text-0'
      }`}
    >
      {children}
    </Link>
  );
}
