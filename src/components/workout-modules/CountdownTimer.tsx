import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  unlockTime: Date;
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({ unlockTime, onComplete, className }: CountdownTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isComplete, setIsComplete] = useState(false);

  const calculateTimeRemaining = useCallback(() => {
    const now = new Date();
    const diff = unlockTime.getTime() - now.getTime();

    if (diff <= 0) {
      setIsComplete(true);
      setTimeRemaining({ hours: 0, minutes: 0, seconds: 0 });
      onComplete?.();
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setTimeRemaining({ hours, minutes, seconds });
  }, [unlockTime, onComplete]);

  useEffect(() => {
    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [calculateTimeRemaining]);

  if (isComplete) {
    return null;
  }

  const isNearComplete = timeRemaining.hours === 0 && timeRemaining.minutes < 5;
  const padZero = (n: number) => n.toString().padStart(2, '0');

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs flex items-center gap-1 font-mono transition-all',
        isNearComplete && 'animate-pulse border-orange-500 text-orange-500',
        className
      )}
    >
      <Clock className="h-3 w-3" />
      {timeRemaining.hours > 0 
        ? `${padZero(timeRemaining.hours)}:${padZero(timeRemaining.minutes)}:${padZero(timeRemaining.seconds)}`
        : `${padZero(timeRemaining.minutes)}:${padZero(timeRemaining.seconds)}`
      }
    </Badge>
  );
}
