'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ShareServiceButtonProps {
  serviceId: string;
  title: string;
  handle: string;
}

export function ShareServiceButton({ serviceId, title, handle }: ShareServiceButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url =
      typeof window !== 'undefined'
        ? `${window.location.origin}/services/${serviceId}`
        : `/services/${serviceId}`;
    const shareText = `${title} · @${handle} on Squadly`;

    // Native share sheet (mobile, supported desktop browsers)
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: shareText, url });
        return;
      } catch {
        // User dismissed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  }

  return (
    <Button onClick={handleShare} variant="outline" size="lg" className="mt-3 w-full">
      {copied ? '✓ Link copied' : '🔗 Share / copy link'}
    </Button>
  );
}
