'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Coordinated menu state — only one menu can be open at a time across the app.
 *
 * When a menu opens, it dispatches a custom event with its id. All other menus
 * listening for that event close themselves if the id doesn't match. Works
 * across sibling components without prop drilling or context.
 *
 * Usage:
 *   const { open, toggle, close } = useExclusiveMenu('notifications');
 */

const EVENT_NAME = 'squadly:menu-open';

interface MenuOpenEvent extends CustomEvent {
  detail: { id: string };
}

export function useExclusiveMenu(id: string) {
  const [open, setOpen] = useState(false);

  // Listen for other menus opening — close ours if it's not us
  useEffect(() => {
    function onOpen(e: Event) {
      const ce = e as MenuOpenEvent;
      if (ce.detail?.id !== id) {
        setOpen(false);
      }
    }
    window.addEventListener(EVENT_NAME, onOpen);
    return () => window.removeEventListener(EVENT_NAME, onOpen);
  }, [id]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const openMenu = useCallback(() => {
    setOpen(true);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { id } }));
  }, [id]);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    if (open) {
      setOpen(false);
    } else {
      openMenu();
    }
  }, [open, openMenu]);

  return { open, openMenu, close, toggle, setOpen };
}
