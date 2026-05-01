'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

interface Props {
  code: string;
  expiresAt: string;
  reward: number;
}

export function ReferralCard({ code, expiresAt, reward }: Props) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/signin?ref=${code}`
    : `https://squadly.gg/signin?ref=${code}`;

  function copyCode() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function copyLink() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function share() {
    if (navigator.share) {
      navigator.share({
        title: 'Join me on Squadly',
        text: `Sign up with my code ${code} and we both get ${reward} coins.`,
        url,
      });
    } else {
      copyLink();
    }
  }

  return (
    <Card className="p-7">
      <h2 className="font-display text-xl text-text-0">Your invite code</h2>

      <div className="mt-6 rounded-xl border border-border-bright bg-neon-cyan/5 p-6 text-center">
        <div className="font-display text-5xl font-bold tracking-[0.15em] text-neon-cyan glow-cyan-text">
          {code}
        </div>
        <div className="mt-3 font-mono text-xs text-text-3">
          Expires {format(new Date(expiresAt), 'dd MMM yyyy')}
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Button onClick={copyCode} variant="outline" size="sm">
          {copied ? 'Copied!' : 'Copy code'}
        </Button>
        <Button onClick={copyLink} variant="outline" size="sm">
          Copy link
        </Button>
        <Button onClick={share} size="sm">
          Share
        </Button>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-bg-2 p-4 font-mono text-xs">
        <div className="text-text-3 uppercase tracking-widest">Reward</div>
        <div className="mt-1 text-neon-green">+{reward} coins each side · on first paid action</div>
      </div>
    </Card>
  );
}
