import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Battery } from 'lucide-react';

interface S2FatigueIndexTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_TRIALS = 40;
const EARLY_TRIALS = 20;

export const S2FatigueIndexTest = ({ onComplete }: S2FatigueIndexTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [trial, setTrial] = useState(0);
  const [showTarget, setShowTarget] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const responseStartTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('playing');
      startTrial();
    }
  }, [phase, countdown]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Start a trial
  const startTrial = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setShowTarget(false);
    setCanRespond(false);

    // Random delay before showing target (to prevent anticipation)
    const delay = 800 + Math.random() * 1500;

    timeoutRef.current = setTimeout(() => {
      setShowTarget(true);
      setCanRespond(true);
      responseStartTime.current = Date.now();

      // Auto-advance if no response (max 2 seconds)
      timeoutRef.current = setTimeout(() => {
        if (phase === 'playing') {
          setReactionTimes(prev => [...prev, 2000]); // Max time
          advanceTrial();
        }
      }, 2000);
    }, delay);
  }, [phase]);

  // Advance to next trial
  const advanceTrial = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setShowTarget(false);
    setCanRespond(false);

    if (trial + 1 >= TOTAL_TRIALS) {
      setPhase('done');
    } else {
      setTrial(t => t + 1);
      setTimeout(() => startTrial(), 200);
    }
  }, [trial, startTrial]);

  // Handle tap
  const handleTap = () => {
    if (!canRespond) return;

    const responseTime = Date.now() - responseStartTime.current;
    setReactionTimes(prev => [...prev, responseTime]);
    advanceTrial();
  };

  // Calculate final score
  useEffect(() => {
    if (phase === 'done' && reactionTimes.length >= TOTAL_TRIALS) {
      // Split into early and late trials
      const earlyTimes = reactionTimes.slice(0, EARLY_TRIALS);
      const lateTimes = reactionTimes.slice(EARLY_TRIALS);

      // Calculate averages
      const earlyAvg = earlyTimes.reduce((a, b) => a + b, 0) / earlyTimes.length;
      const lateAvg = lateTimes.reduce((a, b) => a + b, 0) / lateTimes.length;

      // Calculate consistency (lower variance = better)
      const allVariance = reactionTimes.reduce((sum, t) => {
        const avg = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
        return sum + Math.pow(t - avg, 2);
      }, 0) / reactionTimes.length;
      const stdDev = Math.sqrt(allVariance);

      // Fatigue decay: how much slower late vs early (negative = got faster)
      const decay = lateAvg - earlyAvg;

      // Score components:
      // 1. Consistency (low std dev = high score) - 50%
      const consistencyScore = Math.max(0, 50 - (stdDev / 10));

      // 2. Fatigue resistance (low decay = high score) - 30%
      const fatigueScore = Math.max(0, 30 - (decay / 5));

      // 3. Raw speed (faster = higher) - 20%
      const avgTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
      const speedScore = Math.max(0, 20 - (avgTime / 50));

      const finalScore = Math.round(Math.min(100, consistencyScore + fatigueScore + speedScore));
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, reactionTimes, onComplete]);

  // Instructions phase
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Battery className="h-6 w-6" />
            Fatigue Index Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Wait for the target to appear</li>
              <li>Tap as FAST as possible when you see it</li>
              <li>Stay consistent throughout all {TOTAL_TRIALS} trials</li>
              <li>We'll measure how your reaction time changes over time</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_TRIALS} trials total • Tests mental endurance and consistency
            </p>
          </div>
          
          <Button 
            onClick={() => setPhase('countdown')}
            className="w-full bg-teal-600 hover:bg-teal-700"
            size="lg"
          >
            Start Test
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Countdown phase
  if (phase === 'countdown') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardContent className="flex items-center justify-center min-h-[300px]">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-black text-teal-400"
          >
            {countdown}
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  // Done phase
  if (phase === 'done') {
    const earlyTimes = reactionTimes.slice(0, EARLY_TRIALS);
    const lateTimes = reactionTimes.slice(EARLY_TRIALS);
    const earlyAvg = Math.round(earlyTimes.reduce((a, b) => a + b, 0) / earlyTimes.length);
    const lateAvg = Math.round(lateTimes.reduce((a, b) => a + b, 0) / lateTimes.length);
    const decay = lateAvg - earlyAvg;

    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl"
          >
            ✓
          </motion.div>
          <div className="text-xl font-semibold">Fatigue Index Complete</div>
          <div className="text-muted-foreground text-sm space-y-1 text-center">
            <div>Early avg: {earlyAvg}ms • Late avg: {lateAvg}ms</div>
            <div className={decay > 50 ? 'text-amber-400' : 'text-emerald-400'}>
              {decay > 0 ? `+${decay}ms decay` : `${decay}ms improvement`}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Playing phase
  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
      <CardContent className="p-6 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Trial {trial + 1} of {TOTAL_TRIALS}</span>
            <span>{trial < EARLY_TRIALS ? 'Early Phase' : 'Late Phase'}</span>
          </div>
          <Progress value={(trial / TOTAL_TRIALS) * 100} className="h-2" />
        </div>

        {/* Last reaction time */}
        {reactionTimes.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Last: {reactionTimes[reactionTimes.length - 1]}ms
          </div>
        )}

        {/* Tap area */}
        <div 
          className="min-h-[250px] flex items-center justify-center cursor-pointer"
          onClick={handleTap}
        >
          {showTarget ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-32 h-32 rounded-full bg-teal-500 flex items-center justify-center shadow-lg"
            >
              <span className="text-white text-3xl font-bold">TAP!</span>
            </motion.div>
          ) : (
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Wait...</span>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Tap as fast as you can when the target appears
        </div>
      </CardContent>
    </Card>
  );
};
