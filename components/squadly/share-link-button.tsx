'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface ShareLinkButtonProps {
  /** Path on the current origin to share, e.g. "/goals/abc-123" */
  path: string;
  /** Title shown in native share sheet (mobile) — fallback only */
  title?: string;
  /** Visual variant of the button */
  variant?: 'outline' | 'magenta' | 'ghost';
  /** Layout — full width or inline */
  fullWidth?: boolean;
  /** Optional className passthrough */
  className?: string;
  /** Compact button label (defaults to "🔗 Share / copy link") */
  label?: string;
}

/**
 * Reusable share-link button. Tries the native Web Share API first (great on
 * mobile + macOS), then falls back to clipboard copy with a "✓ Link copied"
 * confirmation, then to a window.prompt (last-ditch fallback if clipboard
 * permissions are denied).
 *
 * Used on /services/[id], /goals/[id], /passes/[id] — same affordance,
 * same feedback, in every detail page.
 */
export function ShareLinkButton({
  path,
  title,
  variant = 'outline',
  fullWidth = false,
  className,
  label = '🔗 Share / copy link',
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url =
      typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: title ?? url, url });
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
    <Button
      onClick={handleShare}
      variant={variant}
      size="sm"
      className={[fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')}
    >
      {copied ? '✓ Link copied' : label}
    </Button>
  );
}
