'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function BanToggle({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      if (isBanned) {
        await fetch(`/api/admin/users/${userId}/ban`, { method: 'DELETE' });
      } else {
        const reason = prompt('Reason for ban (logged):');
        if (!reason) {
          setLoading(false);
          return;
        }
        await fetch(`/api/admin/users/${userId}/ban`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      onClick={toggle}
      disabled={loading}
      variant={isBanned ? 'outline' : 'ghost'}
      size="sm"
      className={isBanned ? '' : 'text-neon-magenta hover:bg-neon-magenta/10'}
    >
      {loading ? '…' : isBanned ? 'Unban' : 'Ban'}
    </Button>
  );
}
