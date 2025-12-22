import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Minus, Plus, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RestTimerProps {
  initialSeconds: number;
  onComplete: () => void;
  onSkip: () => void;
  exerciseType: 'strength' | 'isometric' | 'skill';
  intensity?: 'heavy' | 'moderate' | 'light';
  nextExerciseName?: string;
  isLastSet?: boolean;
}

export function RestTimer({
  initialSeconds,
  onComplete,
  onSkip,
  exerciseType,
  intensity = 'moderate',
  nextExerciseName,
  isLastSet = false,
}: RestTimerProps) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const totalSeconds = initialSeconds;
  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;
  const isLastTenSeconds = seconds <= 10 && seconds > 0;

  // Play beep sound
  const playBeep = useCallback((frequency: number = 800, duration: number = 150) => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration / 1000);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [soundEnabled]);

  useEffect(() => {
    if (isPaused || seconds <= 0) return;

    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          playBeep(1200, 300);
          setTimeout(onComplete, 300);
          return 0;
        }
        if (prev <= 10) {
          playBeep(600, 100);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, seconds, onComplete, playBeep]);

  const adjustTime = (amount: number) => {
    setSeconds((prev) => Math.max(0, Math.min(prev + amount, 600)));
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // SVG circle properties
  const size = 280;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Get color based on exercise type
  const getTypeColor = () => {
    switch (exerciseType) {
      case 'strength':
        return intensity === 'heavy' 
          ? 'text-orange-500' 
          : intensity === 'light' 
          ? 'text-yellow-500' 
          : 'text-orange-400';
      case 'isometric':
        return 'text-blue-500';
      case 'skill':
        return 'text-emerald-500';
      default:
        return 'text-primary';
    }
  };

  const getStrokeColor = () => {
    switch (exerciseType) {
      case 'strength':
        return intensity === 'heavy' 
          ? '#f97316' 
          : intensity === 'light' 
          ? '#eab308' 
          : '#fb923c';
      case 'isometric':
        return '#3b82f6';
      case 'skill':
        return '#10b981';
      default:
        return '#ef4444';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Timer Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t('workoutFullScreen.restTime')}
        </h2>
        <p className="text-muted-foreground">
          {t('workoutFullScreen.adjustRest')}
        </p>
      </div>

      {/* Circular Progress Timer */}
      <div className="relative">
        <svg
          width={size}
          height={size}
          className={cn(
            "transform -rotate-90 transition-all duration-300",
            isLastTenSeconds && "animate-pulse"
          )}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={getStrokeColor()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
            style={{
              filter: isLastTenSeconds ? 'drop-shadow(0 0 10px currentColor)' : 'none'
            }}
          />
        </svg>
        
        {/* Timer Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "text-6xl font-bold tabular-nums transition-all duration-300",
            isLastTenSeconds ? "text-orange-500 scale-110" : getTypeColor()
          )}>
            {formatTime(seconds)}
          </span>
          <span className="text-sm text-muted-foreground mt-2">
            {isLastSet 
              ? t('workoutFullScreen.restBetweenExercises')
              : t('workoutFullScreen.restBetweenSets')
            }
          </span>
        </div>
      </div>

      {/* Time Adjustment Controls */}
      <div className="flex items-center gap-6">
        <Button
          variant="outline"
          size="lg"
          onClick={() => adjustTime(-30)}
          className="h-14 px-6 text-lg gap-2"
          disabled={seconds <= 30}
        >
          <Minus className="h-5 w-5" />
          {t('workoutFullScreen.subtractTime')}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="h-12 w-12"
        >
          {soundEnabled ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <VolumeX className="h-6 w-6 text-muted-foreground" />
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => adjustTime(30)}
          className="h-14 px-6 text-lg gap-2"
        >
          <Plus className="h-5 w-5" />
          {t('workoutFullScreen.addTime')}
        </Button>
      </div>

      {/* Skip Button */}
      <Button
        variant="secondary"
        size="lg"
        onClick={onSkip}
        className="h-14 px-10 text-lg gap-2"
      >
        <SkipForward className="h-5 w-5" />
        {t('workoutFullScreen.skipRest')}
      </Button>

      {/* Next Exercise Preview */}
      {nextExerciseName && (
        <div className="text-center mt-4 p-4 rounded-xl bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground">
            {t('workoutFullScreen.nextExercise', { name: '' })}
          </p>
          <p className="text-lg font-semibold text-foreground mt-1">
            {nextExerciseName}
          </p>
        </div>
      )}
    </div>
  );
}
