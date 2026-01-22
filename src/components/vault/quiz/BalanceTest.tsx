import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Scale, Play, Square, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceTestProps {
  onComplete: (durationSeconds: number) => void;
  disabled?: boolean;
}

type Phase = 'idle' | 'running' | 'result';

export function BalanceTest({ onComplete, disabled }: BalanceTestProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [resultSeconds, setResultSeconds] = useState(0);
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

  const startTest = useCallback(() => {
    setPhase('running');
    setElapsedSeconds(0);
    startTimeRef.current = Date.now();
    
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 100);
  }, []);

  const stopTest = useCallback(() => {
    cleanup();
    const finalSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setResultSeconds(finalSeconds);
    setPhase('result');
    onComplete(finalSeconds);
    if (navigator.vibrate) navigator.vibrate(20);
  }, [cleanup, onComplete]);

  const reset = useCallback(() => {
    cleanup();
    setPhase('idle');
    setElapsedSeconds(0);
    setResultSeconds(0);
  }, [cleanup]);

  const getRating = (seconds: number) => {
    if (seconds >= 45) return { label: 'Excellent', color: 'text-green-500', emoji: '🔥' };
    if (seconds >= 30) return { label: 'Good', color: 'text-lime-500', emoji: '✨' };
    if (seconds >= 20) return { label: 'Average', color: 'text-amber-500', emoji: '👍' };
    return { label: 'Needs Work', color: 'text-orange-500', emoji: '💪' };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl border border-violet-500/20">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-violet-500/20">
          <Scale className="h-4 w-4 text-violet-500" />
        </div>
        <div>
          <p className="text-sm font-bold">{t('vault.quiz.cns.balanceTitle', 'Posture Stability Test')}</p>
          <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.balanceSubtitle', 'Single leg balance, eyes open')}</p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">
            {t('vault.quiz.cns.balanceInstructions', 'Stand on one leg. Tap Start, then tap Stop when you lose balance.')}
          </p>
          <Button
            type="button"
            onClick={startTest}
            disabled={disabled}
            className="w-full bg-violet-500 hover:bg-violet-600"
          >
            <Play className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.startBalance', 'Start Balance')}
          </Button>
        </div>
      )}

      {phase === 'running' && (
        <div className="space-y-3">
          <div className="h-20 rounded-xl bg-violet-500/20 border-2 border-violet-500/50 flex flex-col items-center justify-center">
            <p className="text-3xl font-black text-violet-400 tabular-nums">
              {formatTime(elapsedSeconds)}
            </p>
            <p className="text-xs text-violet-300 animate-pulse">
              {t('vault.quiz.cns.balancing', 'Balancing...')}
            </p>
          </div>
          
          <Button
            type="button"
            onClick={stopTest}
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
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-violet-500" />
                <span className="font-bold text-violet-400">{t('vault.quiz.cns.balanceComplete', 'Balance Complete!')}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.duration', 'Duration')}</p>
                <p className="text-2xl font-black text-violet-400">
                  {formatTime(resultSeconds)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.rating', 'Rating')}</p>
                <p className={cn("text-lg font-black", getRating(resultSeconds).color)}>
                  {getRating(resultSeconds).emoji} {getRating(resultSeconds).label}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              {resultSeconds < 20 
                ? t('vault.quiz.cns.balanceAdvice1', 'Focus on core stability work')
                : resultSeconds < 30 
                ? t('vault.quiz.cns.balanceAdvice2', 'Good foundation, keep training')
                : t('vault.quiz.cns.balanceAdvice3', 'Excellent stability!')
              }
            </p>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={reset}
            className="w-full"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('vault.quiz.cns.retakeBalance', 'Retake Test')}
          </Button>
        </div>
      )}
    </div>
  );
}
