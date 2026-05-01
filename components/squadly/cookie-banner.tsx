'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const COOKIE_KEY = 'squadly_cookie_consent_v1';

interface ConsentState {
  essential: true;          // always on
  analytics: boolean;
  acceptedAt: string;
}

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(COOKIE_KEY);
      if (!raw) setShow(true);
    } catch {
      // localStorage might be blocked — show banner
      setShow(true);
    }
  }, []);

  function persist(state: ConsentState) {
    try {
      localStorage.setItem(COOKIE_KEY, JSON.stringify(state));
    } catch {}
    setShow(false);
  }

  function acceptAll() {
    persist({ essential: true, analytics: true, acceptedAt: new Date().toISOString() });
  }

  function rejectOptional() {
    persist({ essential: true, analytics: false, acceptedAt: new Date().toISOString() });
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-4 sm:p-6">
      <div className="container-x">
        <div className="rounded-xl border border-border-bright bg-bg-1/95 p-5 backdrop-blur-md shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-text-1">
              <span className="font-semibold text-text-0">We use cookies. </span>
              Essential cookies keep you signed in. Analytics cookies (opt-in) help us improve.
              See our{' '}
              <Link href="/privacy" className="text-neon-cyan underline">Privacy Policy</Link>.
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <Button onClick={rejectOptional} variant="ghost" size="sm">
                Essential only
              </Button>
              <Button onClick={acceptAll} size="sm">
                Accept all
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
