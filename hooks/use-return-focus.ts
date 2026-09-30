"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

/**
 * Focus-return for Radix overlays that are opened by state (no <Trigger>).
 *
 * Radix Dialog cancels its default focus restore and re-focuses its own
 * Trigger, which does not exist for controlled dialogs — so focus would be
 * dropped on <body>. This remembers the element that had focus when the overlay
 * opened and hands it back on close (NFR-25).
 *
 * Pass the returned handler to `onCloseAutoFocus` on the Radix Content.
 */
export function useReturnFocus(isOpen: boolean) {
  const openerRef = useRef<HTMLElement | null>(null);

  // Layout effect: runs in the commit where `isOpen` flips, before Radix's
  // FocusScope moves focus into the overlay.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
  }, [isOpen]);

  return useCallback((event: Event) => {
    event.preventDefault();
    const opener = openerRef.current;
    openerRef.current = null;
    // The opener can be gone (e.g. the member's Delete button after a delete).
    if (opener && opener.isConnected) opener.focus();
  }, []);
}
