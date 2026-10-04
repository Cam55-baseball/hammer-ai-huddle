import { createContext, useContext, useEffect, useRef, useState } from "react";
import "./HMLoadingScreen.css";

type LoadingContextValue = { enter: () => () => void };
const LoadingContext = createContext<LoadingContextValue | null>(null);
const DELAY_MS = 300;
const MIN_VISIBLE_MS = 600;

/** Keep the overlay alive independently of a Suspense fallback or a page loader. */
export function HMLoadingProvider({ children }: { children: React.ReactNode }) {
  const active = useRef(0);
  const shownAt = useRef(0);
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [show, setShow] = useState(false);
  const [value] = useState<LoadingContextValue>(() => ({
    enter: () => {
      active.current += 1;
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (!shownAt.current && !delayTimer.current) {
        delayTimer.current = setTimeout(() => {
          delayTimer.current = null;
          if (active.current > 0) {
            shownAt.current = performance.now();
            setShow(true);
          }
        }, DELAY_MS);
      }
      let released = false;
      return () => {
        if (released) return;
        released = true;
        active.current = Math.max(0, active.current - 1);
        if (active.current > 0) return;
        if (delayTimer.current) { clearTimeout(delayTimer.current); delayTimer.current = null; }
        if (shownAt.current) {
          hideTimer.current = setTimeout(() => {
            if (active.current === 0) { shownAt.current = 0; setShow(false); }
          }, Math.max(0, MIN_VISIBLE_MS - (performance.now() - shownAt.current)));
        }
      };
    },
  }));

  return <LoadingContext.Provider value={value}>
    {children}
    {show && <div className="hm-loading" role="status" aria-label="Loading Hammers Modality" aria-live="polite">
      <svg className="hm-loading-mark" viewBox="0 0 280 180" role="img" aria-label="HM">
        <defs>
          <mask id="hm-loading-letters">
            <rect width="280" height="180" fill="black" />
            <text x="140" y="137" textAnchor="middle" fontFamily="Impact, Arial Narrow, sans-serif" fontWeight="900" fontSize="158" letterSpacing="0" fill="white">HM</text>
          </mask>
        </defs>
        <text x="140" y="137" textAnchor="middle" fontFamily="Impact, Arial Narrow, sans-serif" fontWeight="900" fontSize="158" letterSpacing="0" fill="none" stroke="currentColor" strokeWidth="2">HM</text>
        <g mask="url(#hm-loading-letters)">
          <rect className="hm-loading-red" width="280" height="180" />
          <rect className="hm-loading-white" width="280" height="180" />
        </g>
      </svg>
      <span className="sr-only">Loading</span>
    </div>}
  </LoadingContext.Provider>;
}

export function HMLoadingFallback() {
  const context = useContext(LoadingContext);
  useEffect(() => context?.enter(), [context]);
  return null;
}