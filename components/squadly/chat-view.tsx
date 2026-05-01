'use client';

import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subscribeToThread, type MessageSentEvent } from '@/lib/pusher-client';
import { format } from 'date-fns';

interface Msg {
  id: string;
  senderId: string;
  body: string;
  sentAt: string;
}

interface Props {
  threadId: string;
  currentUserId: string;
  initialMessages: Msg[];
}

export function ChatView({ threadId, currentUserId, initialMessages }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  // Subscribe to realtime
  useEffect(() => {
    const unsub = subscribeToThread(threadId, (e: MessageSentEvent) => {
      setMsgs((prev) => {
        if (prev.some((m) => m.id === e.messageId)) return prev;
        return [...prev, {
          id: e.messageId,
          senderId: e.senderId,
          body: e.body,
          sentAt: e.sentAt,
        }];
      });
    });
    return unsub;
  }, [threadId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setError(null);
    setLoading(true);

    // Optimistic
    const optimisticId = `tmp-${Date.now()}`;
    const optimistic: Msg = {
      id: optimisticId,
      senderId: currentUserId,
      body: input,
      sentAt: new Date().toISOString(),
    };
    setMsgs((p) => [...p, optimistic]);
    const value = input;
    setInput('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ threadId, body: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'failed');

      setMsgs((p) => p.map((m) => (m.id === optimisticId
        ? { ...m, id: data.message.id }
        : m)));
    } catch (e: any) {
      setError(e.message);
      setMsgs((p) => p.filter((m) => m.id !== optimisticId));
      setInput(value);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-[60vh] flex-col p-0 overflow-hidden">
      <div className="flex-1 space-y-3 overflow-y-auto p-6">
        {msgs.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-text-3">
            <p className="font-mono text-sm">No messages yet. Say hi.</p>
          </div>
        ) : (
          msgs.map((m) => {
            const mine = m.senderId === currentUserId;
            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                    mine
                      ? 'bg-neon-cyan/15 border border-neon-cyan/30 text-text-0'
                      : 'bg-bg-2 border border-border text-text-1'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.body}</p>
                  <div className="mt-1 font-mono text-[10px] text-text-3">
                    {format(new Date(m.sentAt), 'HH:mm')}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-border bg-bg-1 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            maxLength={4000}
            className="flex-1 rounded-lg border border-border bg-bg-2 px-4 py-3 text-text-0 placeholder:text-text-3 focus:border-neon-cyan focus:outline-none"
          />
          <Button type="submit" disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
        {error && (
          <div className="mt-2 font-mono text-xs text-neon-magenta">{error}</div>
        )}
      </form>
    </Card>
  );
}
