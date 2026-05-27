import { useEffect, useRef, useState } from 'react';
import { useIdentityState } from '@/hooks/useIdentityState';
import { useEngineRecomputeTrigger } from '@/hooks/useEngineRecomputeTrigger';
import { cn } from '@/lib/utils';
import { Flame, ShieldCheck, AlertCircle } from 'lucide-react';
import { BehavioralPressureToast } from './BehavioralPressureToast';
import { RestDayButton } from './RestDayButton';
import { DailyStandardCheck } from './DailyStandardCheck';

interface Props {
  className?: string;
}

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    startRef.current = null;
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

export function IdentityBanner({ className }: Props) {
  const { snapshot, tier, label, accent, scoreText, pill, loading } = useIdentityState();
  useEngineRecomputeTrigger();

  const score = snapshot?.consistency_score ?? 0;
  const animatedScore = useCountUp(score);

  if (loading) {
    return (
      <div className={cn('rounded-2xl border border-border bg-card p-4 animate-pulse h-28', className)} />
    );
  }

  const perfStreak = snapshot?.performance_streak ?? 0;
  const discStreak = snapshot?.discipline_streak ?? 0;
  const nnMiss = snapshot?.nn_miss_count_7d ?? 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm',
        )}
      >
        {/* Soft glass top sheen — barely visible, never muddy */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-b from-foreground/[0.03] to-transparent"
          aria-hidden
        />
        {/* Left tier accent bar */}
        <div className={cn('absolute left-0 top-0 bottom-0 w-1', accent)} aria-hidden />

        <div className="relative flex items-start justify-between gap-4 pl-2">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
              Identity
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <div className="text-2xl sm:text-3xl font-bold tracking-tight leading-none text-foreground">
                {label}
              </div>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest', pill)}>
                Tier
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1.5 h-6 rounded-full bg-muted/50 border border-border px-2.5 font-medium text-foreground">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="tabular-nums">{perfStreak}</span>
                <span className="text-muted-foreground">d perf</span>
              </span>
              <span className="inline-flex items-center gap-1.5 h-6 rounded-full bg-muted/50 border border-border px-2.5 font-medium text-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span className="tabular-nums">{discStreak}</span>
                <span className="text-muted-foreground">d active</span>
              </span>
              {nnMiss > 0 && (
                <span className="inline-flex items-center gap-1.5 h-6 rounded-full bg-rose-500/10 border border-rose-500/25 px-2.5 font-medium text-rose-700 dark:text-rose-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{nnMiss}</span>
                  <span className="opacity-80">NN miss/7d</span>
                </span>
              )}
            </div>

            <div className="mt-3">
              <RestDayButton />
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <div className={cn('text-5xl sm:text-6xl font-bold tabular-nums leading-none', scoreText)}>
              {animatedScore}
            </div>
            <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Consistency
            </div>
          </div>
        </div>
      </div>

      <BehavioralPressureToast />
      <DailyStandardCheck />
    </div>
  );
}
