'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { signOutAction } from '@/app/actions/auth';
import { useExclusiveMenu } from '@/lib/use-exclusive-menu';

interface UserMenuProps {
  userName: string | null | undefined;
}

export function UserMenu({ userName }: UserMenuProps) {
  const { open, toggle, close } = useExclusiveMenu('user-menu');
  const ref = useRef<HTMLDivElement>(null);
  const firstName = userName?.split(' ')[0] ?? 'You';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <button
        onClick={toggle}
        className="font-mono text-sm text-text-0 hover:text-neon-cyan"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {firstName}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-border bg-bg-1 shadow-card"
        >
          <Link
            href="/home"
            onClick={close}
            className="block px-4 py-2.5 text-sm text-text-1 hover:bg-bg-2 hover:text-neon-cyan"
          >
            Hub
          </Link>
          <Link
            href="/profile"
            onClick={close}
            className="block px-4 py-2.5 text-sm text-text-1 hover:bg-bg-2 hover:text-neon-cyan"
          >
            Profile
          </Link>
          <Link
            href="/vault"
            onClick={close}
            className="block px-4 py-2.5 text-sm text-text-1 hover:bg-bg-2 hover:text-neon-cyan"
          >
            Vault
          </Link>
          <form action={signOutAction} className="border-t border-border">
            <button
              type="submit"
              className="block w-full px-4 py-2.5 text-left text-sm text-neon-magenta hover:bg-bg-2"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
