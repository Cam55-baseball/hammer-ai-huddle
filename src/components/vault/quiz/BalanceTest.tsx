import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Scale, Play, Square, RotateCcw, CheckCircle2, ArrowRight, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceTestProps {
  onComplete: (leftSeconds: number, rightSeconds: number) => void;
  disabled?: boolean;
}

type Phase = 'idle' | 'left_running' | 'left_done' | 'right_running' | 'result';

// ---- Asymmetry contract (locked) -------------------------------------------
// A "significant" asymmetry warning is ONLY shown when ALL of these hold:
//   - Both legs held >= ASYMMETRY_MIN_HOLD_SEC (below this, balance noise dominates)
//   - Percent difference > ASYMMETRY_PCT_THRESHOLD
//   - Absolute gap >= ASYMMETRY_MIN_GAP_SEC
//   - Neither leg has hit the diagnostic ceiling (ASYMMETRY_CEILING_SEC)
const ASYMMETRY_PCT_THRESHOLD = 25;
const ASYMMETRY_MIN_GAP_SEC = 4;
const ASYMMETRY_MIN_HOLD_SEC = 8;
const ASYMMETRY_CEILING_SEC = 60;

export function BalanceTest({ onComplete, disabled }: BalanceTestProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0); // float
  const [leftSeconds, setLeftSeconds] = useState(0); // float, 1 decimal
  const [rightSeconds, setRightSeconds] = useState(0); // float, 1 decimal
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    startTimeRef.current = performance.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      setElapsedSeconds(Math.round(elapsed * 10) / 10);
    }, 100);
  }, []);

  const captureFinal = () => Math.round(((performance.now() - startTimeRef.current) / 1000) * 10) / 10;

  const startLeftTest = useCallback(() => {
    setPhase('left_running');
    startTimer();
  }, [startTimer]);

  const stopLeftTest = useCallback(() => {
    cleanup();
    setLeftSeconds(captureFinal());
    setPhase('left_done');
    if (navigator.vibrate) navigator.vibrate(20);
  }, [cleanup]);

  const startRightTest = useCallback(() => {
    setPhase('right_running');
    startTimer();
  }, [startTimer]);

  const stopRightTest = useCallback(() => {
    cleanup();
    const finalSeconds = captureFinal();
    setRightSeconds(finalSeconds);
    setPhase('result');
    // Report integer seconds to upstream consumers (preserve existing contract)
    onComplete(Math.round(leftSeconds), Math.round(finalSeconds));
    if (navigator.vibrate) navigator.vibrate(20);
  }, [cleanup, leftSeconds, onComplete]);

  const reset = useCallback(() => {
    cleanup();
    setPhase('idle');
    setElapsedSeconds(0);
    setLeftSeconds(0);
    setRightSeconds(0);
  }, [cleanup]);

  // Eyes closed thresholds (harder than eyes open)
  const getRating = (seconds: number) => {
    if (seconds >= 30) return { label: t('vault.quiz.cns.excellent', 'Excellent'), color: 'text-green-500', emoji: '🔥' };
    if (seconds >= 20) return { label: t('vault.quiz.cns.good', 'Good'), color: 'text-lime-500', emoji: '✨' };
    if (seconds >= 10) return { label: t('vault.quiz.cns.average', 'Average'), color: 'text-amber-500', emoji: '👍' };
    return { label: t('vault.quiz.cns.needsWork', 'Needs Work'), color: 'text-orange-500', emoji: '💪' };
  };

  const getAsymmetry = (left: number, right: number) => {
    const max = Math.max(left, right);
    const min = Math.min(left, right);
    const gap = max - min;

    if (max === 0) {
      return { percent: 0, gap: 0, weakerSide: 'none' as const, isSignificant: false, belowGate: true, ceilingHit: false };
    }

    const percentDiff = (gap / max) * 100;
    const belowGate = min < ASYMMETRY_MIN_HOLD_SEC;
    const ceilingHit = max >= ASYMMETRY_CEILING_SEC;
    const isSignificant =
      !belowGate &&
      !ceilingHit &&
      percentDiff > ASYMMETRY_PCT_THRESHOLD &&
      gap >= ASYMMETRY_MIN_GAP_SEC;

    return {
      percent: Math.round(percentDiff),
      gap: Math.round(gap * 10) / 10,
      weakerSide: left < right ? ('left' as const) : ('right' as const),
      isSignificant,
      belowGate,
      ceilingHit,
    };
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    // 1-decimal under 60s for precision
    return `${seconds.toFixed(1)}s`;
  };

  const asymmetry = getAsymmetry(leftSeconds, rightSeconds);
  const averageSeconds = Math.round(((leftSeconds + rightSeconds) / 2) * 10) / 10;

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/20">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-violet-500/20">
          <Scale className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-bold">{t('vault.quiz.cns.balanceTitle', 'Posture Stability Test')}</p>
          <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.balanceSubtitle', 'Single leg balance, eyes closed')}</p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            {t('vault.quiz.cns.balanceInstructions', 'Close your eyes and balance on one leg. Tap Stop when you lose balance.')}
          </p>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-medium text-violet-400">{t('vault.quiz.cns.leftLeg', 'LEFT Leg')}</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              <span className="text-xs text-muted-foreground">{t('vault.quiz.cns.rightLeg', 'RIGHT Leg')}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={startLeftTest}
            disabled={disabled}
            className="w-full bg-violet-500 hover:bg-violet-600"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.startLeftLeg', 'Start LEFT Leg Test')}
          </Button>

          <p className="text-xs text-amber-500/80 text-center flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('vault.quiz.cns.eyesClosed', 'Keep eyes CLOSED')}
          </p>
        </div>
      )}

      {phase === 'left_running' && (
        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 border-2 border-violet-500/50 flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-violet-300 uppercase tracking-wider mb-1">
              {t('vault.quiz.cns.leftLeg', 'LEFT Leg')}
            </p>
            <p className="text-4xl font-black text-violet-400 tabular-nums">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="text-xs text-violet-300 animate-pulse">
              {t('vault.quiz.cns.eyesClosed', 'Keep eyes CLOSED')}
            </p>
          </div>

          <Button
            type="button"
            onClick={stopLeftTest}
            variant="destructive"
            className="w-full"
          >
            <Square className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.stopBalance', 'Stop (Lost Balance)')}
          </Button>
        </div>
      )}

      {phase === 'left_done' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-green-400">
                  {t('vault.quiz.cns.leftComplete', 'Left leg complete!')}
                </span>
              </div>
              <span className="text-lg font-bold text-green-400">{formatTime(leftSeconds)}</span>
            </div>
          </div>

          {/* Progress indicators */}
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="text-xs font-medium text-green-400">{t('vault.quiz.cns.leftLeg', 'LEFT Leg')}</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/20 border border-violet-500/30">
              <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
              <span className="text-xs font-medium text-violet-400">{t('vault.quiz.cns.rightLeg', 'RIGHT Leg')}</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={startRightTest}
            className="w-full bg-violet-500 hover:bg-violet-600"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.startRightLeg', 'Start RIGHT Leg Test')}
          </Button>

          <p className="text-xs text-amber-500/80 text-center flex items-center justify-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('vault.quiz.cns.eyesClosed', 'Keep eyes CLOSED')}
          </p>
        </div>
      )}

      {phase === 'right_running' && (
        <div className="space-y-3">
          <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between">
            <span className="text-xs text-green-400">{t('vault.quiz.cns.leftLeg', 'LEFT Leg')}</span>
            <span className="text-sm font-bold text-green-400">{formatTime(leftSeconds)}</span>
          </div>

          <div className="h-24 rounded-xl bg-gradient-to-br from-violet-500/30 to-purple-500/30 border-2 border-violet-500/50 flex flex-col items-center justify-center">
            <p className="text-xs font-bold text-violet-300 uppercase tracking-wider mb-1">
              {t('vault.quiz.cns.rightLeg', 'RIGHT Leg')}
            </p>
            <p className="text-4xl font-black text-violet-400 tabular-nums">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="text-xs text-violet-300 animate-pulse">
              {t('vault.quiz.cns.eyesClosed', 'Keep eyes CLOSED')}
            </p>
          </div>

          <Button
            type="button"
            onClick={stopRightTest}
            variant="destructive"
            className="w-full"
          >
            <Square className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.stopBalance', 'Stop (Lost Balance)')}
          </Button>
        </div>
      )}

      {phase === 'result' && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="h-5 w-5 text-violet-500" />
              <span className="font-bold text-violet-400">{t('vault.quiz.cns.bothComplete', 'Balance Tests Complete!')}</span>
            </div>

            {/* Individual leg results */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-lg bg-background/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('vault.quiz.cns.leftLeg', 'LEFT Leg')}</p>
                <p className="text-2xl font-black text-violet-400">{formatTime(leftSeconds)}</p>
                <p className={cn("text-xs font-medium", getRating(leftSeconds).color)}>
                  {getRating(leftSeconds).emoji} {getRating(leftSeconds).label}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-background/50 text-center">
                <p className="text-xs text-muted-foreground mb-1">{t('vault.quiz.cns.rightLeg', 'RIGHT Leg')}</p>
                <p className="text-2xl font-black text-violet-400">{formatTime(rightSeconds)}</p>
                <p className={cn("text-xs font-medium", getRating(rightSeconds).color)}>
                  {getRating(rightSeconds).emoji} {getRating(rightSeconds).label}
                </p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-background/30">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.balanceAverage', 'Average')}</p>
                <p className="text-sm font-bold">{formatTime(averageSeconds)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.difference', 'Difference')}</p>
                <p
                  className={cn(
                    'text-sm font-bold',
                    asymmetry.belowGate
                      ? 'text-muted-foreground'
                      : asymmetry.isSignificant
                      ? 'text-amber-500'
                      : 'text-green-500'
                  )}
                >
                  {asymmetry.percent}%
                </p>
              </div>
            </div>

            {/* Asymmetry verdict — three states: not enough data / balanced / significant */}
            {asymmetry.belowGate && (
              <div className="mt-3 p-2 rounded-lg bg-muted/40 border border-border flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-foreground/90">
                    {t('vault.quiz.cns.asymmetryNeedMore', 'Hold longer for an asymmetry read')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      'vault.quiz.cns.asymmetryNeedMoreTip',
                      `Need at least ${ASYMMETRY_MIN_HOLD_SEC}s on each side to compare reliably.`
                    )}
                  </p>
                </div>
              </div>
            )}

            {!asymmetry.belowGate && asymmetry.isSignificant && (
              <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-500">
                    {t('vault.quiz.cns.asymmetryWarning', 'Significant asymmetry detected')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('vault.quiz.cns.asymmetryTip', 'Focus on single-leg stability work for your weaker side')}
                    {' '}
                    ({asymmetry.gap}s gap)
                  </p>
                </div>
              </div>
            )}

            {!asymmetry.belowGate && !asymmetry.isSignificant && (
              <p className="text-xs text-green-500 text-center mt-2">
                ✓ {t('vault.quiz.cns.balancedStability', 'Balanced stability')}
              </p>
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
            {t('vault.quiz.cns.retakeBalance', 'Retake Tests')}
          </Button>
        </div>
      )}
    </div>
  );
}
