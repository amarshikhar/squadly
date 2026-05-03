'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useExclusiveMenu } from '@/lib/use-exclusive-menu';

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationsBell() {
  const { open, toggle, close } = useExclusiveMenu('notifications');
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);

  // Poll notifications every 30s
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/notifications', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        setItems(data.items ?? []);
        setUnread(data.unread ?? 0);
      } catch {}
    }
    load();
    const id = setInterval(load, 30000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, close]);

  async function markRead() {
    await fetch('/api/notifications', { method: 'PATCH' });
    setItems((items) => items.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          const wasOpen = open;
          toggle();
          if (!wasOpen && unread > 0) markRead();
        }}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-border bg-bg-1 text-text-1 transition-colors hover:border-border-bright hover:text-neon-cyan"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-neon-magenta px-1 font-mono text-[10px] font-bold text-black">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-bg-1 shadow-card"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-display text-sm font-semibold text-text-0">Notifications</span>
            <Link
              href="/notifications"
              className="font-mono text-[11px] uppercase tracking-widest text-text-2 hover:text-neon-cyan"
              onClick={close}
            >
              See all →
            </Link>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-text-3">
                <p className="font-mono">No notifications yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.slice(0, 8).map((n) => {
                  const inner = (
                    <div className={`px-4 py-3 transition-colors hover:bg-bg-2 ${!n.readAt ? 'bg-neon-cyan/5' : ''}`}>
                      <div className="flex items-start gap-2">
                        {!n.readAt && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-neon-cyan" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-0">{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-text-2">{n.body}</p>}
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-text-3">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {n.link ? (
                        <Link href={n.link} onClick={close}>
                          {inner}
                        </Link>
                      ) : inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
