/**
 * RestTimer — Round 8 Step 2a (screen only; never changes the plan).
 * With a prescribed rest it counts down and vibrates at zero.
 * Without one it counts up ("Rest so far") — no rest time is invented.
 * Uses wall-clock deltas so a backgrounded phone stays accurate.
 */
import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Square, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Owner rule: sprint rest = 1 minute per 10 yards. */
export function sprintRestSeconds(distanceFeet: number | null | undefined): number | null {
  if (!distanceFeet || distanceFeet <= 0) return null;
  return Math.ceil(distanceFeet / 3 / 10) * 60;
}

export function fmtClock(totalSec: number) {
  const s = Math.max(0, Math.round(totalSec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function RestTimer({ seconds, label = "Rest" }: { seconds?: number | null; label?: string }) {
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const buzzed = useRef(false);

  useEffect(() => {
    if (startedAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const elapsed = startedAt == null ? 0 : (now - startedAt) / 1000;
  const countdown = typeof seconds === "number" && seconds > 0;
  const left = countdown ? seconds! - elapsed : 0;
  const finished = countdown && startedAt != null && left <= 0;

  useEffect(() => {
    if (finished && !buzzed.current) {
      buzzed.current = true;
      try { navigator.vibrate?.([200, 100, 200]); } catch { /* unsupported */ }
    }
  }, [finished]);

  const start = () => { buzzed.current = false; setNow(Date.now()); setStartedAt(Date.now()); };
  const stop = () => setStartedAt(null);

  return (
    <div data-rest-timer className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
      <Timer className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="text-muted-foreground">
        {countdown ? `${label} time (${fmtClock(seconds!)}):` : `${label} so far:`}
      </span>
      <span className="font-mono font-semibold text-foreground" aria-live="polite">
        {finished ? "Go — rest done" : fmtClock(countdown ? (startedAt == null ? seconds! : left) : elapsed)}
      </span>
      <div className="ml-auto flex gap-1">
        {startedAt == null ? (
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={start} aria-label={`Start ${label.toLowerCase()} timer`}>
            <Play className="h-3 w-3" />
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={start} aria-label="Restart timer"><RotateCcw className="h-3 w-3" /></Button>
            <Button size="sm" variant="outline" className="h-7 px-2" onClick={stop} aria-label="Stop timer"><Square className="h-3 w-3" /></Button>
          </>
        )}
      </div>
    </div>
  );
}
