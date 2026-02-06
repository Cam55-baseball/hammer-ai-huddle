import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw } from 'lucide-react';

interface PartnerTimerProps {
  distanceLabel: string;
  onComplete: (timeSeconds: number) => void;
  onCancel: () => void;
}

export function PartnerTimer({ distanceLabel, onComplete, onCancel }: PartnerTimerProps) {
  const { t } = useTranslation();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);

  const updateTimer = useCallback(() => {
    if (!startTimeRef.current) return;
    const now = performance.now();
    setElapsed((now - startTimeRef.current) / 1000);
    animFrameRef.current = requestAnimationFrame(updateTimer);
  }, []);

  const handleStart = () => {
    startTimeRef.current = performance.now();
    setRunning(true);
    setFinished(false);
    setElapsed(0);
    animFrameRef.current = requestAnimationFrame(updateTimer);
  };

  const handleStop = () => {
    cancelAnimationFrame(animFrameRef.current);
    setRunning(false);
    setFinished(true);
  };

  const handleReset = () => {
    cancelAnimationFrame(animFrameRef.current);
    setRunning(false);
    setFinished(false);
    setElapsed(0);
    startTimeRef.current = 0;
  };

  useEffect(() => {
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const displayTime = elapsed.toFixed(2);

  return (
    <div className="bg-muted/30 rounded-xl p-4 space-y-3">
      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-1">{distanceLabel}</p>
        <div className="text-4xl font-mono font-bold tracking-wider text-primary tabular-nums">
          {displayTime}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('speedLab.timer.seconds', 'seconds')}
        </p>
      </div>

      <div className="flex gap-2 justify-center">
        {!running && !finished && (
          <Button
            onClick={handleStart}
            className="h-14 px-8 text-lg font-bold gap-2"
            size="lg"
          >
            <Play className="h-5 w-5" />
            {t('speedLab.timer.start', 'START')}
          </Button>
        )}

        {running && (
          <Button
            onClick={handleStop}
            variant="destructive"
            className="h-14 px-8 text-lg font-bold gap-2"
            size="lg"
          >
            <Square className="h-5 w-5" />
            {t('speedLab.timer.stop', 'STOP')}
          </Button>
        )}

        {finished && (
          <>
            <Button
              onClick={handleReset}
              variant="outline"
              className="h-12 gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {t('speedLab.timer.reset', 'Reset')}
            </Button>
            <Button
              onClick={() => onComplete(elapsed)}
              className="h-12 px-6 font-bold"
            >
              {t('speedLab.timer.save', 'Save Time')}
            </Button>
          </>
        )}
      </div>

      <button
        onClick={onCancel}
        className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('speedLab.timer.cancel', 'Cancel timer')}
      </button>
    </div>
  );
}
