/**
 * useCloseOnBack — makes the Android hardware back gesture (and the browser
 * back button, and iOS edge-swipe back) close an open overlay instead of
 * navigating the athlete out of the app.
 *
 * While the overlay is open a throwaway history entry is pushed, tagged with a
 * unique id. A `popstate` consumes that entry and closes the overlay.
 *
 * SAFETY (regression fix): the cleanup may only remove the pushed entry when
 * that entry is *still the current one*. If the app navigated to another route
 * while the overlay was open — the common case, because a nav link inside a
 * sheet both closes the sheet and changes the route — the current history entry
 * belongs to the router, not to us. Calling `history.back()` then would undo
 * the athlete's navigation and bounce them to the previous page. In that case
 * we abandon the entry and navigate nothing.
 *
 * No-ops for uncontrolled overlays (no `open` / `onOpenChange` pair).
 */
import { useEffect, useRef } from "react";

let seq = 0;

export function useCloseOnBack(open: boolean | undefined, onOpenChange?: (v: boolean) => void) {
  const idRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (open !== true || typeof onOpenChange !== "function") return;

    const id = ++seq;
    idRef.current = id;
    // Carry the router's own history state (key/idx) onto the throwaway entry.
    // Without it react-router sees an unknown entry, falls back to index 0, and
    // a later in-app "back" lands on the app root instead of the previous page.
    const routerState = (window.history.state ?? {}) as Record<string, unknown>;
    window.history.pushState({ ...routerState, __overlay: id }, "");

    // True only while our own throwaway entry is the current history entry.
    const isOurEntry = () =>
      (window.history.state as { __overlay?: number } | null)?.__overlay === id;

    const onPop = () => {
      idRef.current = null;
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (idRef.current === id && isOurEntry()) {
        // Overlay closed on its own terms and nothing navigated underneath us:
        // safe to remove the entry we added.
        idRef.current = null;
        window.history.back();
      }
      // Otherwise the location changed underneath the overlay (route change,
      // redirect, or a nested overlay pushed on top). Drop the entry silently.
      idRef.current = null;
    };
  }, [open, onOpenChange]);
}
