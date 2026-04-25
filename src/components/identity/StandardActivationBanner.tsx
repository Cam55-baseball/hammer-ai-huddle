// Phase 10.7/10.8 — Standard Activation Banner
// - Fires once per local day on the entry surface (Dashboard).
// - 10.8 hardening: safeStorage fallback, mid-session auto-hide on completion,
//   day-rollover re-evaluation when the app stays open past midnight.

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDailyOutcome } from '@/hooks/useDailyOutcome';
import { getTodayDate } from '@/utils/dateUtils';
import { safeGet, safeSet } from '@/lib/safeStorage';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'hm:activation:lastShown';

function scrollToNN() {
  const el = document.getElementById('nn-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function StandardActivationBanner({ className }: { className?: string }) {
  const outcome = useDailyOutcome();
  const [show, setShow] = useState(false);
  const evaluatedDateRef = useRef<string | null>(null);
  const dismissedDateRef = useRef<string | null>(null);

  useEffect(() => {
    if (outcome.loading) return;

    const today = getTodayDate();

    // Day rollover: if we've crossed into a new day, reset in-memory dismissal
    // so the new day's banner can appear without a refresh.
    if (evaluatedDateRef.current && evaluatedDateRef.current !== today) {
      dismissedDateRef.current = null;
      setShow(false);
    }
    evaluatedDateRef.current = today;

    // Mid-session auto-hide: once the standard is met / rest / skip / no NNs,
    // hide instantly even if the banner was previously visible.
    if (outcome.status !== 'STANDARD NOT MET' || outcome.nnTotal <= 0) {
      if (show) setShow(false);
      return;
    }

    // Already dismissed (in-memory) for today → stay hidden.
    if (dismissedDateRef.current === today) return;

    // Persistent stamp check (safeStorage falls back to memory).
    if (safeGet(STORAGE_KEY) === today) {
      dismissedDateRef.current = today;
      return;
    }

    if (!show) setShow(true);
  }, [outcome.loading, outcome.status, outcome.nnTotal, show]);

  if (!show) return null;

  const stamp = () => {
    const today = getTodayDate();
    safeSet(STORAGE_KEY, today);
    dismissedDateRef.current = today;
    setShow(false);
  };

  const handleCTA = () => {
    stamp();
    requestAnimationFrame(scrollToNN);
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border border-rose-500/40 bg-gradient-to-br from-rose-500/10 to-red-500/5 p-4 shadow-lg',
        className,
      )}
      role="region"
      aria-label="Daily standard reminder"
    >
      <button
        type="button"
        onClick={stamp}
        className="absolute top-2 right-2 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="rounded-lg bg-rose-500/15 p-2 text-rose-400">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-rose-300 uppercase tracking-wide">
            You have a standard today
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Finish it before the day ends.
          </p>
          <Button
            size="sm"
            onClick={handleCTA}
            className="mt-3 bg-rose-500 hover:bg-rose-600 text-white"
          >
            View Non-Negotiables
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
