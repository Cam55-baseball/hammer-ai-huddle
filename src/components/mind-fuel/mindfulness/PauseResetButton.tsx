import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pause, X, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PauseResetButtonProps {
  className?: string;
}

export default function PauseResetButton({ className }: PauseResetButtonProps) {
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'in' | 'out'>('in');
  const [timer, setTimer] = useState(0);
  const [cycles, setCycles] = useState(0);

  const targetCycles = 3;

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev >= 4) {
          if (breathPhase === 'out') {
            setCycles((c) => c + 1);
          }
          setBreathPhase(breathPhase === 'in' ? 'out' : 'in');
          return 0;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, breathPhase]);

  useEffect(() => {
    if (cycles >= targetCycles) {
      setTimeout(() => {
        setIsActive(false);
        setCycles(0);
        setTimer(0);
        setBreathPhase('in');
      }, 1000);
    }
  }, [cycles]);

  if (!isActive) {
    return (
      <Button
        onClick={() => setIsActive(true)}
        variant="outline"
        className={cn(
          'bg-gradient-to-r from-wellness-coral/20 to-wellness-lavender/20 border-wellness-coral/30',
          'hover:from-wellness-coral/30 hover:to-wellness-lavender/30',
          'text-foreground font-medium',
          className
        )}
      >
        <Pause className="h-4 w-4 mr-2" />
        {t('mindfulness.pause.button', 'Pause & Reset')}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4 bg-gradient-to-br from-wellness-cream to-white border-none shadow-2xl">
        <CardContent className="pt-6 text-center space-y-6">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setIsActive(false);
              setCycles(0);
              setTimer(0);
              setBreathPhase('in');
            }}
            className="absolute top-2 right-2"
          >
            <X className="h-4 w-4" />
          </Button>

          {cycles >= targetCycles ? (
            // Completion
            <>
              <Heart className="h-16 w-16 mx-auto text-wellness-coral animate-pulse" />
              <h3 className="text-xl font-semibold">
                {t('mindfulness.pause.complete', 'Reset Complete')}
              </h3>
              <p className="text-muted-foreground">
                {t('mindfulness.pause.completeDesc', 'Take this calm with you.')}
              </p>
            </>
          ) : (
            // Active breathing
            <>
              <h3 className="text-lg font-medium text-muted-foreground">
                {t('mindfulness.pause.title', 'Take a Moment')}
              </h3>

              {/* Breathing Circle */}
              <div className="relative w-40 h-40 mx-auto">
                <div
                  className={cn(
                    'absolute inset-0 rounded-full transition-all duration-1000',
                    'flex items-center justify-center',
                    breathPhase === 'in' 
                      ? 'scale-110 bg-wellness-sky/30' 
                      : 'scale-90 bg-wellness-sage/30'
                  )}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {breathPhase === 'in' 
                        ? t('mindfulness.pause.breatheIn', 'Breathe In')
                        : t('mindfulness.pause.breatheOut', 'Breathe Out')}
                    </div>
                    <div className="text-lg text-muted-foreground">{5 - timer}</div>
                  </div>
                </div>
              </div>

              {/* Cycle Progress */}
              <div className="flex justify-center gap-2">
                {Array.from({ length: targetCycles }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-3 h-3 rounded-full transition-colors',
                      i < cycles ? 'bg-wellness-sage' : 'bg-gray-300'
                    )}
                  />
                ))}
              </div>

              <p className="text-sm text-muted-foreground">
                {t('mindfulness.pause.cycleCount', '{{current}} of {{total}} breaths', {
                  current: cycles + 1,
                  total: targetCycles,
                })}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
