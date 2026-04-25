import { useDailyOutcome } from '@/hooks/useDailyOutcome';
import { cn } from '@/lib/utils';

/**
 * Thin, passive inline banner showing today's outcome at the top of
 * Progress Dashboard. NOT a card — single-line visibility only.
 * Sources from the same hook as the Nightly Check-In verdict so the
 * two cannot drift.
 */
export function DailyOutcomeInlineBanner() {
  const { status, loading } = useDailyOutcome();
  if (loading) return null;

  const tone =
    status === 'STANDARD MET' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' :
    status === 'STANDARD NOT MET' ? 'border-rose-500 bg-rose-500/10 text-rose-300' :
    status === 'RECOVERY DAY' ? 'border-sky-500 bg-sky-500/10 text-sky-300' :
    'border-zinc-500 bg-zinc-500/10 text-zinc-300';

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border-l-4 px-3 py-2 text-xs font-black uppercase tracking-widest',
        tone,
      )}
    >
      <span className="text-muted-foreground">Today:</span>
      <span>{status}</span>
    </div>
  );
}
