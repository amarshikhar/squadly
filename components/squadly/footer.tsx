import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';

const NAV_LINKS = [
  { href: '/home', label: 'Home' },
  { href: '/feed', label: 'Feed' },
  { href: '/services', label: 'Services' },
  { href: '/goals', label: 'Goals' },
  { href: '/passes', label: 'Lobby Passes' },
  { href: '/messages', label: 'Messages' },
  { href: '/vault', label: 'Vault' },
  { href: '/requests', label: 'Requests' },
  { href: '/payouts', label: 'Payouts' },
  { href: '/referrals', label: 'Referrals' },
  { href: '/profile', label: 'Profile' },
];

const LEGAL_LINKS = [
  { href: '/terms', label: 'Terms' },
  { href: '/privacy', label: 'Privacy' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-border bg-bg-1">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="font-display text-lg text-text-0">{APP_NAME}</div>
            <p className="mt-2 font-mono text-xs text-text-3">
              The home for India&apos;s gaming creators.
            </p>
          </div>

          <div className="md:col-span-2">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">Navigate</div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
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
