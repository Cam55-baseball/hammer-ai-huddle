import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Target, Zap, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickReactionTestProps {
  onComplete: (reactionTimeMs: number, score: number) => void;
  disabled?: boolean;
}

type Phase = 'idle' | 'waiting' | 'tap' | 'result';

// ---- Reaction-time contract (locked, see mem://features/physio/cns-readiness-test) ----
// Protocol:
//   - Total taps: 7. First tap discarded as warm-up. Slowest of remaining 6 dropped.
//     Average is computed over the 5 cleanest taps.
//   - Anti-cheat floor: tap < 100ms is an anticipation, treated as "too early".
//   - Miss ceiling: tap > 1500ms is treated as a miss and re-prompted (does not pollute average).
//   - Timing source: performance.now(). When PointerEvent.timeStamp is non-zero we use it
//     (it represents the hardware input time and is more accurate than reading performance.now()
//     after React reconciles into the handler).
//   - Start timestamp is captured inside requestAnimationFrame on the frame the green target
//     is painted, NOT inside setTimeout (which fires before the browser paints).
//   - Tap surface uses onPointerDown to bypass the ~50–300ms synthesized click delay on touch.
const TOTAL_TAPS = 7;          // 1 warmup + 6 measured; drop slowest of 6 -> avg of 5
const WARMUP_TAPS = 1;
const MIN_DELAY_MS = 700;
const MAX_DELAY_MS = 2400;
const MIN_VALID_MS = 100;       // anything faster = anticipation
const MAX_VALID_MS = 1500;      // anything slower = missed (not in average)

export function QuickReactionTest({ onComplete, disabled }: QuickReactionTestProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tapIndex, setTapIndex] = useState(0); // 0-based index of NEXT tap (incl. warmup)
  const [allTimes, setAllTimes] = useState<number[]>([]); // every recorded tap incl. warmup
  const [showTime, setShowTime] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const [missed, setMissed] = useState(false);

  const startTimeRef = useRef<number>(0);
  const targetVisibleRef = useRef<boolean>(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  /** Schedule the next "go" prompt. */
  const scheduleNextRound = useCallback(() => {
    targetVisibleRef.current = false;
    setShowTime((s) => (s !== null ? s : null));
    setPhase('waiting');

    const delay = Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS) + MIN_DELAY_MS;
    timeoutRef.current = setTimeout(() => {
      // Flip to 'tap' state, but capture start ON the painted frame, not now.
      setPhase('tap');
      // Two rAFs: first runs before paint, second after the paint of the green frame.
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = requestAnimationFrame(() => {
          startTimeRef.current = performance.now();
          targetVisibleRef.current = true;
        });
      });
    }, delay);
  }, []);

  const startTest = useCallback(() => {
    cleanup();
    setTapIndex(0);
    setAllTimes([]);
    setTooEarly(false);
    setMissed(false);
    setShowTime(null);
    scheduleNextRound();
  }, [cleanup, scheduleNextRound]);

  /** Re-prompt the same tap index without recording (used for misses). */
  const reprompt = useCallback(() => {
    cleanup();
    scheduleNextRound();
  }, [cleanup, scheduleNextRound]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Block the synthesized click that follows.
      e.preventDefault();

      if (phase === 'waiting' || (phase === 'tap' && !targetVisibleRef.current)) {
        // Tap before green was painted = anticipation.
        cleanup();
        setTooEarly(true);
        setPhase('idle');
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        return;
      }

      if (phase === 'tap') {
        // Prefer the hardware-derived event timestamp when available.
        // PointerEvent.timeStamp is on the same monotonic clock as performance.now() in modern browsers.
        const evtTs = e.timeStamp && e.timeStamp > 0 ? e.timeStamp : performance.now();
        const reactionTime = Math.max(0, evtTs - startTimeRef.current);

        // Anti-cheat: under MIN_VALID_MS = anticipation
        if (reactionTime < MIN_VALID_MS) {
          cleanup();
          setTooEarly(true);
          setPhase('idle');
          if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
          return;
        }

        // Miss: over MAX_VALID_MS — re-prompt, do not record
        if (reactionTime > MAX_VALID_MS) {
          setMissed(true);
          if (navigator.vibrate) navigator.vibrate(30);
          // re-prompt without bumping tapIndex
          reprompt();
          return;
        }

        // Valid tap
        setMissed(false);
        setShowTime(Math.round(reactionTime));
        if (navigator.vibrate) navigator.vibrate(10);

        const newAll = [...allTimes, reactionTime];
        setAllTimes(newAll);
        const newTapIndex = tapIndex + 1;
        setTapIndex(newTapIndex);

        if (newTapIndex >= TOTAL_TAPS) {
          // Drop warmup tap(s)
          const measured = newAll.slice(WARMUP_TAPS);
          // Drop the single slowest measured tap as an outlier
          const sorted = [...measured].sort((a, b) => a - b);
          const cleaned = sorted.slice(0, sorted.length - 1);
          const avgTime = Math.round(cleaned.reduce((a, b) => a + b, 0) / cleaned.length);
          // Score: 200ms => 100, 600ms => 0, linear, clamped
          const score = Math.max(0, Math.min(100, Math.round(100 - (avgTime - 200) / 4)));
          cleanup();
          setPhase('result');
          onComplete(avgTime, score);
        } else {
          scheduleNextRound();
        }
      }
    },
    [phase, allTimes, tapIndex, cleanup, onComplete, reprompt, scheduleNextRound]
  );

  const reset = useCallback(() => {
    cleanup();
    setPhase('idle');
    setTapIndex(0);
    setAllTimes([]);
    setShowTime(null);
    setTooEarly(false);
    setMissed(false);
  }, [cleanup]);

  // ----- Display helpers -----
  const measuredTimes = allTimes.slice(WARMUP_TAPS);
  const avgReactionTime =
    measuredTimes.length > 0
      ? Math.round(
          (() => {
            const sorted = [...measuredTimes].sort((a, b) => a - b);
            const cleaned = sorted.length > 1 ? sorted.slice(0, sorted.length - 1) : sorted;
            return cleaned.reduce((a, b) => a + b, 0) / cleaned.length;
          })()
        )
      : 0;

  const getScoreColor = (time: number) => {
    if (time < 250) return 'text-green-500';
    if (time < 350) return 'text-lime-500';
    if (time < 450) return 'text-amber-500';
    return 'text-orange-500';
  };

  // For the progress chip: count includes warmup, but show "warmup" for first one
  const displayedTapNumber = tapIndex + 1;
  const isWarmup = tapIndex < WARMUP_TAPS;

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <Zap className="h-4 w-4 text-cyan-500" />
          </div>
          <div>
            <p className="text-sm font-bold">{t('vault.quiz.cns.reactionTitle', 'Reaction Time Test')}</p>
            <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.reactionSubtitle', 'Tap when you see the target')}</p>
          </div>
        </div>
        {phase !== 'idle' && phase !== 'result' && (
          <span className="text-xs font-medium text-muted-foreground">
            {isWarmup ? t('vault.quiz.cns.warmup', 'warm-up') : `${displayedTapNumber - WARMUP_TAPS}/${TOTAL_TAPS - WARMUP_TAPS}`}
          </span>
        )}
      </div>

      {phase === 'idle' && (
        <div className="space-y-2">
          {tooEarly && (
            <p className="text-xs text-red-500 text-center font-medium">
              {t('vault.quiz.cns.tooEarly', 'Too early! Wait for the green target.')}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            {t(
              'vault.quiz.cns.reactionProtocol',
              'First tap is a warm-up. Average is computed from your 5 best of 6 measured taps.'
            )}
          </p>
          <Button
            type="button"
            onClick={startTest}
            disabled={disabled}
            className="w-full bg-cyan-500 hover:bg-cyan-600"
          >
            <Target className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.startTest', 'Start Test')}
          </Button>
        </div>
      )}

      {(phase === 'waiting' || phase === 'tap') && (
        <div
          onPointerDown={handlePointerDown}
          role="button"
          tabIndex={0}
          className={cn(
            'relative h-24 rounded-xl flex items-center justify-center cursor-pointer transition-colors duration-75 select-none',
            phase === 'waiting'
              ? 'bg-slate-800 border-2 border-slate-600'
              : 'bg-green-500 border-2 border-green-400 shadow-lg shadow-green-500/30'
          )}
          style={{ touchAction: 'manipulation', WebkitUserSelect: 'none', userSelect: 'none' }}
        >
          {/* Pre-render the target visual; toggle visibility to keep paint cost off the critical frame */}
          <div className={cn('flex flex-col items-center', phase === 'tap' ? 'opacity-100' : 'opacity-0')}>
            <Target className="h-10 w-10 text-white" />
            <span className="text-white font-bold mt-1">{t('vault.quiz.cns.tapNow', 'TAP!')}</span>
          </div>
          <AnimatePresence>
            {phase === 'waiting' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute text-slate-400 text-sm"
              >
                {missed
                  ? t('vault.quiz.cns.missed', 'Missed — try again')
                  : t('vault.quiz.cns.waitForGreen', 'Wait for green...')}
              </motion.p>
            )}
          </AnimatePresence>

          {showTime !== null && phase === 'waiting' && (
            <motion.div
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="absolute top-2 right-2 text-xs font-bold text-cyan-400"
            >
              {showTime}ms
            </motion.div>
          )}
        </div>
      )}

      {phase === 'result' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="font-bold text-green-500">{t('vault.quiz.cns.testComplete', 'Test Complete!')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.avgTime', 'Avg Time')}</p>
                <p className={cn('text-xl font-black', getScoreColor(avgReactionTime))}>
                  {avgReactionTime}ms
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.rating', 'Rating')}</p>
                <p className={cn('text-xl font-black', getScoreColor(avgReactionTime))}>
                  {avgReactionTime < 250
                    ? '🔥 Elite'
                    : avgReactionTime < 350
                    ? '✨ Fast'
                    : avgReactionTime < 450
                    ? '👍 Good'
                    : '💪 Keep Training'}
                </p>
              </div>
            </div>

            {/* Per-tap breakdown (measured only) */}
            {measuredTimes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-500/20">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('vault.quiz.cns.perTap', 'Per-tap (slowest dropped)')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(() => {
                    const sorted = [...measuredTimes].sort((a, b) => a - b);
                    const droppedIdx = sorted.length - 1;
                    return measuredTimes.map((ms, i) => {
                      const isDropped = ms === sorted[droppedIdx];
                      return (
                        <span
                          key={i}
                          className={cn(
                            'text-[10px] font-mono px-1.5 py-0.5 rounded',
                            isDropped
                              ? 'bg-muted/40 text-muted-foreground line-through'
                              : 'bg-cyan-500/20 text-cyan-300'
                          )}
                        >
                          {Math.round(ms)}ms
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={reset}
            className="w-full"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.retake', 'Retake Test')}
          </Button>
        </div>
      )}
    </div>
  );
}
