'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface MobileMenuProps {
  isAuthed: boolean;
  userName?: string | null;
  coinBalance?: number;
}

export function MobileMenu({ isAuthed, userName, coinBalance }: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {/* Hamburger button — visible on mobile only */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-bg-1 text-text-1 transition-colors hover:border-border-bright md:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Drawer panel */}
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col gap-1 border-l border-border bg-bg-0 p-5 shadow-card">
            <div className="flex items-center justify-between border-b border-border pb-4 mb-3">
              <span className="font-display text-lg font-bold text-text-0">Menu</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg text-text-2 hover:text-neon-cyan"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {isAuthed && coinBalance !== undefined && (
              <Link
                href="/vault"
                onClick={() => setOpen(false)}
                className="mb-3 flex items-center justify-between rounded-lg border border-border-bright bg-neon-cyan/5 px-4 py-3 font-mono text-sm text-text-0"
              >
                <span className="text-text-2">Coins</span>
                <span className="text-neon-cyan">● {coinBalance.toLocaleString()}</span>
              </Link>
            )}

            <NavLink href="/services" onClick={() => setOpen(false)}>Browse</NavLink>
            <NavLink href="/goals" onClick={() => setOpen(false)}>Squad Goals</NavLink>
            {isAuthed ? (
              <>
                <NavLink href="/feed" onClick={() => setOpen(false)}>Feed</NavLink>
                <NavLink href="/requests" onClick={() => setOpen(false)}>Requests</NavLink>
                <NavLink href="/messages" onClick={() => setOpen(false)}>DMs</NavLink>
                <NavLink href="/notifications" onClick={() => setOpen(false)}>Notifications</NavLink>
                <NavLink href="/referrals" onClick={() => setOpen(false)}>Referrals</NavLink>
                <NavLink href="/payouts" onClick={() => setOpen(false)}>Payouts</NavLink>
                <NavLink href="/profile" onClick={() => setOpen(false)}>Profile</NavLink>
                <NavLink href="/home" onClick={() => setOpen(false)} accent>Streamer Hub</NavLink>
              </>
            ) : (
              <NavLink href="/signin" onClick={() => setOpen(false)} accent>Sign in</NavLink>
            )}

            <div className="mt-auto pt-4 border-t border-border">
              <Link
                href="/terms"
                onClick={() => setOpen(false)}
                className="block px-4 py-1 font-mono text-xs text-text-3 hover:text-text-1"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                onClick={() => setOpen(false)}
                className="block px-4 py-1 font-mono text-xs text-text-3 hover:text-text-1"
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
