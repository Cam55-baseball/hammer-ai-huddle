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
  sport?: 'baseball' | 'softball';
}

// Sport-aware neon color helper
const getSportColors = (sport: 'baseball' | 'softball', type: 'strength' | 'isometric' | 'skill') => {
  if (sport === 'softball') {
    switch (type) {
      case 'strength': return { tw: 'pink', hex: '#f472b6', shadow: 'rgba(244,114,182,' };
      case 'isometric': return { tw: 'green', hex: '#4ade80', shadow: 'rgba(74,222,128,' };
      case 'skill': return { tw: 'yellow', hex: '#facc15', shadow: 'rgba(250,204,21,' };
    }
  }
  switch (type) {
    case 'strength': return { tw: 'orange', hex: '#fb923c', shadow: 'rgba(251,146,60,' };
    case 'isometric': return { tw: 'cyan', hex: '#22d3ee', shadow: 'rgba(34,211,238,' };
    case 'skill': return { tw: 'lime', hex: '#a3e635', shadow: 'rgba(163,230,53,' };
  }
};

export function RestTimer({
  initialSeconds,
  onComplete,
  onSkip,
  exerciseType,
  intensity = 'moderate',
  nextExerciseName,
  isLastSet = false,
  sport = 'baseball',
}: RestTimerProps) {
  const { t } = useTranslation();
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isPaused, setIsPaused] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const isSoftball = sport === 'softball';
  const colors = getSportColors(sport, exerciseType);

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

  // Get color based on exercise type and sport
  const getTypeColor = () => {
    return `text-${colors.tw}-400`;
  };

  const getStrokeColor = () => {
    return colors.hex;
  };

  const getGlowFilter = () => {
    return `drop-shadow(0 0 12px ${colors.shadow}0.8))`;
  };

  const getTimerTextClass = () => {
    if (isLastTenSeconds) {
      return isSoftball 
        ? "text-pink-400 scale-110 drop-shadow-[0_0_15px_rgba(244,114,182,0.8)]"
        : "text-orange-400 scale-110 drop-shadow-[0_0_15px_rgba(251,146,60,0.8)]";
    }
    return isSoftball 
      ? "text-green-400 drop-shadow-[0_0_12px_rgba(74,222,128,0.6)]"
      : "text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]";
  };

  const getSkipButtonClass = () => {
    return isSoftball 
      ? "bg-green-500 hover:bg-green-400 text-black font-bold shadow-[0_0_20px_rgba(74,222,128,0.4)]"
      : "bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-[0_0_20px_rgba(34,211,238,0.4)]";
  };

  const getNextExerciseBoxClass = () => {
    return isSoftball 
      ? "bg-black/40 border border-green-400/30 shadow-[0_0_20px_rgba(74,222,128,0.1)]"
      : "bg-black/40 border border-cyan-400/30 shadow-[0_0_20px_rgba(34,211,238,0.1)]";
  };

  const getSoundButtonHoverClass = () => {
    return isSoftball ? "hover:text-green-400" : "hover:text-cyan-400";
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Timer Title */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-white">
          {t('workoutFullScreen.restTime')}
        </h2>
        <p className="text-gray-300">
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
            className="text-gray-800"
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
              filter: getGlowFilter()
            }}
          />
        </svg>
        
        {/* Timer Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "text-6xl font-bold tabular-nums transition-all duration-300",
            getTimerTextClass()
          )}>
            {formatTime(seconds)}
          </span>
          <span className="text-sm text-gray-400 mt-2">
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
          className="h-14 px-6 text-lg gap-2 bg-transparent border-gray-600 text-white hover:bg-white/10 hover:border-gray-500"
          disabled={seconds <= 30}
        >
          <Minus className="h-5 w-5" />
          {t('workoutFullScreen.subtractTime')}
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn("h-12 w-12 text-white hover:bg-white/10", getSoundButtonHoverClass())}
        >
          {soundEnabled ? (
            <Volume2 className="h-6 w-6" />
          ) : (
            <VolumeX className="h-6 w-6 text-gray-500" />
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => adjustTime(30)}
          className="h-14 px-6 text-lg gap-2 bg-transparent border-gray-600 text-white hover:bg-white/10 hover:border-gray-500"
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
        className={cn("h-14 px-10 text-lg gap-2", getSkipButtonClass())}
      >
        <SkipForward className="h-5 w-5" />
        {t('workoutFullScreen.skipRest')}
      </Button>

      {/* Next Exercise Preview */}
      {nextExerciseName && (
        <div className={cn("text-center mt-4 p-4 rounded-xl", getNextExerciseBoxClass())}>
          <p className="text-sm text-gray-400">
            {t('workoutFullScreen.nextExercise', { name: '' })}
          </p>
          <p className="text-lg font-semibold text-white mt-1">
            {nextExerciseName}
          </p>
        </div>
      )}
    </div>
  );
}
