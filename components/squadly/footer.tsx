import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { auth } from '@/lib/auth';

interface NavLink {
  href: string;
  label: string;
}

// Visible to everyone (signed in or out).
const PUBLIC_LINKS: NavLink[] = [
  { href: '/services', label: 'Browse' },
  { href: '/goals', label: 'Goals' },
  { href: '/passes', label: 'Passes' },
];

// Visible only when signed in.
const AUTH_LINKS: NavLink[] = [
  { href: '/home', label: 'Hub' },
  { href: '/feed', label: 'Feed' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/me/purchases', label: 'Purchases' },
  { href: '/me/listings', label: 'Listings' },
  { href: '/messages', label: 'DMs' },
  { href: '/vault', label: 'Vault' },
  { href: '/requests', label: 'Requests' },
  { href: '/payouts', label: 'Payouts' },
  { href: '/referrals', label: 'Referrals' },
  { href: '/profile', label: 'Profile' },
];

const CREATE_LINKS: NavLink[] = [
  { href: '/goals/create', label: '+ Goal' },
  { href: '/passes/create', label: '+ Lobby Pass' },
  { href: '/services/create', label: '+ Service' },
];

const LEGAL_LINKS: NavLink[] = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

export async function Footer() {
  const session = await auth();
  const isAuthed = !!session?.user;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-bg-1">
      {/* Flush container — matches top-bar padding (px-4 / sm:px-6) instead of container-x */}
      <div className="px-4 py-12 sm:px-6">
        <div
          className={
            'grid gap-10 ' +
            (isAuthed ? 'md:grid-cols-4' : 'md:grid-cols-3')
          }
        >
          {/* 1: Brand */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2" aria-label={`${APP_NAME} home`}>
              <Image
                src="/squadly-logo.png"
                alt=""
                width={120}
                height={32}
                className="h-7 w-auto"
              />
            </Link>
            <p className="mt-3 font-mono text-xs text-text-3">
              The home for India&apos;s gaming creators.
            </p>
          </div>

          {/* 2: Navigate (public + auth grouped) */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Navigate</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {PUBLIC_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="font-mono text-xs text-text-2 hover:text-neon-cyan"
                >
                  {l.label}
                </Link>
              ))}
            </div>
            {isAuthed && (
              <>
                <div className="mt-6 font-mono text-[10px] uppercase tracking-widest text-text-3">
                  For you
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                  {AUTH_LINKS.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="font-mono text-xs text-text-2 hover:text-neon-cyan"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 3: Create — auth only. Hidden when signed out so the grid is 3-col. */}
          {isAuthed && (
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Create</div>
              <div className="mt-3 flex flex-col gap-2">
                {CREATE_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="font-mono text-xs text-text-2 transition-colors hover:text-neon-cyan"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* 4: Legal — flush to the right edge */}
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Legal</div>
            <div className="mt-3 flex flex-col items-end gap-2">
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="font-mono text-xs text-text-2 hover:text-neon-cyan"
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="mailto:hello@squadly.gg"
                className="font-mono text-xs text-text-2 hover:text-neon-cyan"
              >
                Contact
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
          <span className="font-mono text-[11px] text-text-3">
            © {year} {APP_NAME}. All rights reserved.
          </span>
          <span className="font-mono text-[11px] text-text-3">Made in India 🇮🇳</span>
        </div>
      </div>
    </footer>
  );
}
