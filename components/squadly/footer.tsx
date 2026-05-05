import Link from 'next/link';
import Image from 'next/image';
import { APP_NAME } from '@/lib/constants';
import { auth } from '@/lib/auth';

interface NavLink {
  href: string;
  label: string;
  authOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
  // Public — visible to everyone
  { href: '/services', label: 'Browse' },
  { href: '/goals', label: 'Goals' },
  { href: '/passes', label: 'Passes' },
  // Auth-only — hidden when signed out
  { href: '/home', label: 'Hub', authOnly: true },
  { href: '/feed', label: 'Feed', authOnly: true },
  { href: '/dms', label: 'DMs', authOnly: true },
  { href: '/vault', label: 'Vault', authOnly: true },
  { href: '/requests', label: 'Requests', authOnly: true },
  { href: '/payouts', label: 'Payouts', authOnly: true },
  { href: '/referrals', label: 'Referrals', authOnly: true },
  { href: '/profile', label: 'Profile', authOnly: true },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

// 'DMs' is a relabel of /messages — keep the actual route working but show new label.
const ROUTE_OVERRIDES: Record<string, string> = {
  '/dms': '/messages',
};

export async function Footer() {
  const session = await auth();
  const isAuthed = !!session?.user;
  const year = new Date().getFullYear();

  const visibleLinks = NAV_LINKS.filter((l) => !l.authOnly || isAuthed);

  return (
    <footer className="mt-24 border-t border-border bg-bg-1">
      {/* Flush container — matches top-bar padding (px-4 / sm:px-6) instead of container-x */}
      <div className="px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
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

          <div className="md:col-span-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Navigate</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {visibleLinks.map((l) => (
                <Link
                  key={l.href}
                  href={ROUTE_OVERRIDES[l.href] ?? l.href}
                  className="font-mono text-xs text-text-2 hover:text-neon-cyan"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Legal</div>
            <div className="mt-3 flex flex-col gap-2">
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
