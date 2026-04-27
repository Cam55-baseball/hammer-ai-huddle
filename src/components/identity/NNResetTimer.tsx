import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NNResetTimerProps {
  /** Total seconds to count down. */
  durationSeconds: number;
  /** Accent color (template color) for ring + buttons. */
  accentColor: string;
  /** Fired exactly once when the timer naturally reaches 00:00. */
  onComplete: () => void;
}

/**
 * High-fidelity countdown for system Non-Negotiable cards (e.g. Daily Mental Reset).
 * Uses performance.now() + requestAnimationFrame for drift-free timing even when
 * the tab backgrounds (per CNS Readiness Test standard).
 */
export function NNResetTimer({ durationSeconds, accentColor, onComplete }: NNResetTimerProps) {
  const [remaining, setRemaining] = useState(durationSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const startedAtRef = useRef<number | null>(null);
  const baseRemainingRef = useRef<number>(durationSeconds);
  const rafRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  const tick = useCallback(() => {
    if (startedAtRef.current == null) return;
    const elapsed = (performance.now() - startedAtRef.current) / 1000;
    const next = Math.max(0, baseRemainingRef.current - elapsed);
    setRemaining(next);
    if (next <= 0) {
      setRunning(false);
      setDone(true);
      if (!completedRef.current) {
        completedRef.current = true;
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try { navigator.vibrate?.([60, 40, 60]); } catch { /* noop */ }
        }
        onComplete();
      }
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onComplete]);

  useEffect(() => {
    if (!running) return;
    startedAtRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [running, tick]);

  const handleStart = () => {
    if (done) return;
    baseRemainingRef.current = remaining;
    setRunning(true);
  };
  const handlePause = () => {
    setRunning(false);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  };
  const handleReset = () => {
    setRunning(false);
    setDone(false);
    completedRef.current = false;
    baseRemainingRef.current = durationSeconds;
    setRemaining(durationSeconds);
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = Math.floor(remaining % 60).toString().padStart(2, '0');

  // Progress ring math
  const pct = 1 - remaining / durationSeconds;
  const radius = 70;
  const circ = 2 * Math.PI * radius;
  const dash = circ * pct;

  return (
    <div
      className="flex flex-col items-center gap-4 py-6 px-4 rounded-xl border border-border/60 bg-muted/30"
      style={{ boxShadow: `inset 0 0 0 1px ${accentColor}20` }}
    >
      <div className="relative h-44 w-44">
        <svg className="h-44 w-44 -rotate-90" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="hsl(var(--muted-foreground) / 0.15)"
            strokeWidth="8"
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: running ? 'none' : 'stroke-dasharray 200ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn(
              'font-black tabular-nums tracking-tight text-foreground',
              'text-5xl sm:text-6xl',
            )}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {mm}:{ss}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">
            {done ? 'Complete' : running ? 'Focus' : 'Ready'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full">
        {!done ? (
          <>
            {!running ? (
              <Button
                onClick={handleStart}
                className="flex-1 gap-2 font-bold"
                style={{ backgroundColor: accentColor }}
              >
                <Play className="h-4 w-4" />
                {remaining < durationSeconds ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button
                onClick={handlePause}
                variant="secondary"
                className="flex-1 gap-2 font-bold"
              >
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}
            <Button
              onClick={handleReset}
              variant="outline"
              size="icon"
              aria-label="Reset timer"
              disabled={remaining === durationSeconds && !running}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <div
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-md font-bold"
            style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
          >
            <Check className="h-4 w-4" />
            Standard met. Locked in.
          </div>
        )}
      </div>
    </div>
  );
}
