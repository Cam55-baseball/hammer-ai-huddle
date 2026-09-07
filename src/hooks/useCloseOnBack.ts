/**
 * useCloseOnBack — makes the Android hardware back gesture (and the browser
 * back button, and iOS edge-swipe back) close an open overlay instead of
 * navigating the athlete out of the app.
 *
 * While the overlay is open a throwaway history entry is pushed. A `popstate`
 * consumes that entry and closes the overlay. Closing the overlay any other
 * way pops the entry back off so history is left exactly as it was found.
 *
 * No-ops for uncontrolled overlays (no `open` / `onOpenChange` pair).
 */
import { useEffect, useRef } from "react";

export function useCloseOnBack(open: boolean | undefined, onOpenChange?: (v: boolean) => void) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (open !== true || typeof onOpenChange !== "function") return;

    window.history.pushState({ __overlay: true }, "");
    pushedRef.current = true;

    const onPop = () => {
      pushedRef.current = false;
      onOpenChange(false);
    };
    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
      if (pushedRef.current) {
        pushedRef.current = false;
        // Remove the entry we added so the athlete's real back stack is intact.
        window.history.back();
      }
    };
  }, [open, onOpenChange]);
}
