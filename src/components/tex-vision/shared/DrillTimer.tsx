import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrillTimerProps {
  initialSeconds?: number;
  mode?: 'countdown' | 'countup';
  onComplete?: () => void;
  onTick?: (seconds: number) => void;
  fatigueLevel?: number;
  autoStart?: boolean;
  className?: string;
}

export function DrillTimer({
  initialSeconds = 60,
  mode = 'countdown',
  onComplete,
  onTick,
  fatigueLevel = 0,
  autoStart = false,
  className,
}: DrillTimerProps) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(mode === 'countdown' ? initialSeconds : 0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [hasStarted, setHasStarted] = useState(autoStart);

  // Store callbacks in refs to prevent interval reset on parent re-renders
  // This is critical for drills that update state at 60fps (e.g., Follow the Target)
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);

  // Keep refs in sync with latest props
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Sync autoStart prop changes to internal state (e.g., after countdown completes)
  useEffect(() => {
    if (autoStart && !isRunning) {
      setIsRunning(true);
      setHasStarted(true);
    }
  }, [autoStart, isRunning]);

  const maxSeconds = mode === 'countdown' ? initialSeconds : Math.max(seconds, initialSeconds);
  const progress = mode === 'countdown' 
    ? (seconds / initialSeconds) * 100 
    : Math.min((seconds / initialSeconds) * 100, 100);

  // Fatigue-adaptive colors
  const timerColor = fatigueLevel > 70 
    ? 'stroke-tex-vision-text-muted' 
    : fatigueLevel > 50 
      ? 'stroke-tex-vision-timing' 
      : 'stroke-tex-vision-primary-light';

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = mode === 'countdown' ? prev - 1 : prev + 1;
          // Use refs to call callbacks - prevents interval reset on parent re-renders
          onTickRef.current?.(next);
          
          if (mode === 'countdown' && next <= 0) {
            setIsRunning(false);
            onCompleteRef.current?.();
            return 0;
          }
          
          return next;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode]); // Only depend on isRunning and mode - callbacks use refs

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setHasStarted(true);
  }, []);

  const handlePause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setHasStarted(false);
    setSeconds(mode === 'countdown' ? initialSeconds : 0);
  }, [mode, initialSeconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Circular progress timer */}
      <div className="relative h-12 w-12">
        <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44">
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            className="stroke-tex-vision-primary-dark"
            strokeWidth="3"
          />
          <circle
            cx="22"
            cy="22"
            r="20"
            fill="none"
            className={timerColor}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.2s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-tex-vision-text">
          {formatTime(seconds)}
        </span>
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-1">
        {!isRunning ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStart}
            className="h-8 w-8 rounded-full bg-tex-vision-primary/20 hover:bg-tex-vision-primary/30 text-tex-vision-primary-light"
          >
            <Play className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePause}
            className="h-8 w-8 rounded-full bg-tex-vision-timing/20 hover:bg-tex-vision-timing/30 text-tex-vision-timing"
          >
            <Pause className="h-4 w-4" />
          </Button>
        )}
        
        {hasStarted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-8 w-8 rounded-full bg-tex-vision-primary/10 hover:bg-tex-vision-primary/20 text-tex-vision-text-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
