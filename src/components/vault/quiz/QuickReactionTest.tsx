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

type Phase = 'idle' | 'waiting' | 'ready' | 'tap' | 'result';

const TOTAL_TAPS = 5;
const MIN_DELAY = 500;
const MAX_DELAY = 2000;

export function QuickReactionTest({ onComplete, disabled }: QuickReactionTestProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tapCount, setTapCount] = useState(0);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [showTime, setShowTime] = useState<number | null>(null);
  const [tooEarly, setTooEarly] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startTest = useCallback(() => {
    setPhase('waiting');
    setTapCount(0);
    setReactionTimes([]);
    setTooEarly(false);
    
    // Random delay before showing target
    const delay = Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
    timeoutRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();
      setPhase('tap');
    }, delay);
  }, []);

  const handleTap = useCallback(() => {
    if (phase === 'waiting') {
      // Too early!
      cleanup();
      setTooEarly(true);
      setPhase('idle');
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      return;
    }

    if (phase === 'tap') {
      const reactionTime = Date.now() - startTimeRef.current;
      setShowTime(reactionTime);
      if (navigator.vibrate) navigator.vibrate(10);
      
      const newReactionTimes = [...reactionTimes, reactionTime];
      setReactionTimes(newReactionTimes);
      
      const newTapCount = tapCount + 1;
      setTapCount(newTapCount);

      if (newTapCount >= TOTAL_TAPS) {
        // Calculate average and score
        const avgTime = Math.round(newReactionTimes.reduce((a, b) => a + b, 0) / newReactionTimes.length);
        // Score: 100 for <200ms, 0 for >600ms, linear in between
        const score = Math.max(0, Math.min(100, Math.round(100 - ((avgTime - 200) / 4))));
        
        setPhase('result');
        onComplete(avgTime, score);
      } else {
        // Next round
        setPhase('waiting');
        const delay = Math.random() * (MAX_DELAY - MIN_DELAY) + MIN_DELAY;
        timeoutRef.current = setTimeout(() => {
          startTimeRef.current = Date.now();
          setPhase('tap');
          setShowTime(null);
        }, delay);
      }
    }
  }, [phase, reactionTimes, tapCount, cleanup, onComplete]);

  const reset = useCallback(() => {
    cleanup();
    setPhase('idle');
    setTapCount(0);
    setReactionTimes([]);
    setShowTime(null);
    setTooEarly(false);
  }, [cleanup]);

  const avgReactionTime = reactionTimes.length > 0 
    ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    : 0;

  const getScoreColor = (time: number) => {
    if (time < 250) return 'text-green-500';
    if (time < 350) return 'text-lime-500';
    if (time < 450) return 'text-amber-500';
    return 'text-orange-500';
  };

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
        {tapCount > 0 && phase !== 'result' && (
          <span className="text-xs font-medium text-muted-foreground">
            {tapCount}/{TOTAL_TAPS}
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
          onClick={handleTap}
          className={cn(
            "relative h-24 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-150 select-none",
            phase === 'waiting' 
              ? "bg-slate-800 border-2 border-slate-600" 
              : "bg-green-500 border-2 border-green-400 shadow-lg shadow-green-500/30"
          )}
        >
          <AnimatePresence>
            {phase === 'tap' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex flex-col items-center"
              >
                <Target className="h-10 w-10 text-white" />
                <span className="text-white font-bold mt-1">{t('vault.quiz.cns.tapNow', 'TAP!')}</span>
              </motion.div>
            )}
            {phase === 'waiting' && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-400 text-sm"
              >
                {t('vault.quiz.cns.waitForGreen', 'Wait for green...')}
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
                <p className={cn("text-xl font-black", getScoreColor(avgReactionTime))}>
                  {avgReactionTime}ms
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">{t('vault.quiz.cns.rating', 'Rating')}</p>
                <p className={cn("text-xl font-black", getScoreColor(avgReactionTime))}>
                  {avgReactionTime < 250 ? '🔥 Elite' : avgReactionTime < 350 ? '✨ Fast' : avgReactionTime < 450 ? '👍 Good' : '💪 Keep Training'}
                </p>
              </div>
            </div>
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
