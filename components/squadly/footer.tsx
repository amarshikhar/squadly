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
      {/* Flush container — matches top-bar padding (px-4 / sm:px-6) */}
      <div className="px-4 py-12 sm:px-6">
        {/* Outer row — Brand left, link groups middle, Legal right.
            Stacks vertically on mobile, flows horizontally on lg+. */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          {/* LEFT — Brand */}
          <div className="lg:w-48 lg:flex-shrink-0">
            <Link
              href="/"
              className="inline-flex items-center gap-2"
              aria-label={`${APP_NAME} home`}
            >
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

          {/* MIDDLE — three link subgroups laid out horizontally on desktop.
              "For you" has 11 items so it gets a 2-column grid to keep the
              footer from growing tall; the other two stay single-column. */}
          <div className="flex flex-col gap-10 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-12 sm:gap-y-8">
            <NavGroup title="Navigate" links={PUBLIC_LINKS} columns={1} />
            {isAuthed && <NavGroup title="For you" links={AUTH_LINKS} columns={2} />}
            {isAuthed && <NavGroup title="Create" links={CREATE_LINKS} columns={1} />}
          </div>

          {/* RIGHT — Legal flush to the right edge */}
          <div className="lg:flex-shrink-0 lg:text-right">
            <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">
              Legal
            </div>
            <div className="mt-3 flex flex-col gap-2 lg:items-end">
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

function NavGroup({
  title,
  links,
  columns = 1,
}: {
  title: string;
  links: NavLink[];
  columns?: 1 | 2 | 3;
}) {
  const gridCols =
    columns === 3 ? 'grid-cols-3' : columns === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <div className="min-w-[7rem]">
      <div className="font-mono text-[10px] uppercase tracking-widest text-text-3">
        {title}
      </div>
      <div className={`mt-3 grid gap-x-6 gap-y-2 ${gridCols}`}>
        {links.map((l) => (
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
  );
}
