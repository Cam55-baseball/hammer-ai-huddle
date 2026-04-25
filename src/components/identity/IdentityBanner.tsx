import { useIdentityState } from '@/hooks/useIdentityState';
import { useEngineRecomputeTrigger } from '@/hooks/useEngineRecomputeTrigger';
import { cn } from '@/lib/utils';
import { Flame, ShieldCheck } from 'lucide-react';
import { BehavioralPressureToast } from './BehavioralPressureToast';
import { RestDayButton } from './RestDayButton';
import { DailyStandardCheck } from './DailyStandardCheck';

interface Props {
  className?: string;
}

export function IdentityBanner({ className }: Props) {
  const { snapshot, tier, label, tone, ring, bg, loading } = useIdentityState();
  useEngineRecomputeTrigger();

  if (loading) {
    return (
      <div className={cn('rounded-2xl border bg-card/50 p-4 animate-pulse h-24', className)} />
    );
  }

  const score = snapshot?.consistency_score ?? 0;
  const perfStreak = snapshot?.performance_streak ?? 0;
  const discStreak = snapshot?.discipline_streak ?? 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 ring-1',
          bg,
          ring
        )}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Identity
            </div>
            <div className={cn('mt-1 text-2xl font-black tracking-tight sm:text-3xl', tone)}>
              {label}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 font-semibold">
                <Flame className="h-3 w-3 text-orange-400" />
                {perfStreak}d perf
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 font-semibold">
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                {discStreak}d active
              </span>
              {snapshot && snapshot.nn_miss_count_7d > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 font-semibold text-rose-400">
                  {snapshot.nn_miss_count_7d} NN miss/7d
                </span>
              )}
            </div>
            <div className="mt-3">
              <RestDayButton />
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className={cn('text-3xl font-black tabular-nums sm:text-4xl', tone)}>{score}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
