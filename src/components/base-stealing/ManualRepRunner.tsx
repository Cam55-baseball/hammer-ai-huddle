import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Play, CheckCircle, XCircle, ArrowRight, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LeadConfig } from './SessionSetup';
import type { RepResult } from './LiveRepRunner';

const DIFFICULTY_MAX_DELAY: Record<string, number> = {
  easy: 2000,
  medium: 3000,
  hard: 5000,
};

type Phase = 'idle' | 'countdown' | 'take_lead' | 'waiting_signal' | 'signal_active' | 'confirm_decision' | 'data_entry';

interface ManualRepRunnerProps {
  config: LeadConfig;
  repNumber: number;
  onRepComplete: (result: RepResult) => void;
  onEndSession: () => void;
}

export function ManualRepRunner({ config, repNumber, onRepComplete, onEndSession }: ManualRepRunnerProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [signal, setSignal] = useState<{ type: 'go' | 'return'; value: string } | null>(null);
  const [decisionCorrect, setDecisionCorrect] = useState<boolean | null>(null);
  
  // Optional data entry
  const [firstTwoSteps, setFirstTwoSteps] = useState('');
  const [stepsToBase, setStepsToBase] = useState('');
  const [timeToBase, setTimeToBase] = useState('');
  
  const signalFiredAtRef = useRef<number>(0);
  const delayRef = useRef<number>(0);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;
    
    if (countdown <= 3 && countdown > 0) {
      // Show "Take Your Lead" during last 3 seconds
      setPhase('take_lead');
      return;
    }
    
    if (countdown <= 0) {
      // Move to waiting for signal
      const maxDelay = DIFFICULTY_MAX_DELAY[config.difficulty] || 3000;
      const delay = 1000 + Math.random() * (maxDelay - 1000); // 1-3s (or more based on difficulty)
      delayRef.current = delay;
      
      setTimeout(() => {
        fireSignal();
      }, delay);
      
      setPhase('waiting_signal');
      return;
    }
    
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, config.difficulty]);

  // Take lead countdown (3, 2, 1)
  useEffect(() => {
    if (phase !== 'take_lead') return;
    
    if (countdown <= 0) {
      const maxDelay = DIFFICULTY_MAX_DELAY[config.difficulty] || 3000;
      const delay = 1000 + Math.random() * (maxDelay - 1000);
      delayRef.current = delay;
      
      setTimeout(() => {
        fireSignal();
      }, delay);
      
      setPhase('waiting_signal');
      return;
    }
    
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, config.difficulty]);

  const fireSignal = useCallback(() => {
    // Determine signal type based on mode
    let type: 'go' | 'return';
    let value: string;
    
    if (config.signalMode === 'colors') {
      const isGo = Math.random() < 0.4;
      type = isGo ? 'go' : 'return';
      value = isGo ? 'STEAL' : 'BACK';
    } else {
      const num = Math.floor(Math.random() * 20) + 1;
      type = num % 2 === 0 ? 'go' : 'return';
      value = type === 'go' ? 'STEAL' : 'BACK';
    }
    
    setSignal({ type, value });
    signalFiredAtRef.current = Date.now();
    setPhase('signal_active');
  }, [config.signalMode]);

  const handleSignalTap = () => {
    setPhase('confirm_decision');
  };

  const handleDecisionConfirm = (correct: boolean) => {
    setDecisionCorrect(correct);
    setPhase('data_entry');
  };

  const buildResult = (): RepResult => {
    return {
      repNumber,
      signalType: signal!.type,
      signalValue: signal!.value,
      delayBeforeSignalMs: delayRef.current,
      signalFiredAt: signalFiredAtRef.current,
      reactionConfirmedAt: null, // No reaction time in manual mode
      decisionTimeSec: null, // No reaction time measurement
      decisionCorrect,
      eliteJump: false, // Can't determine without timing
      videoBlob: null, // No video in manual mode
      stepsTaken: stepsToBase ? parseInt(stepsToBase, 10) : undefined,
      timeToBaseSec: timeToBase ? parseFloat(timeToBase) : undefined,
      baseDistanceFt: parseFloat(config.baseDistanceFt) || 90,
      firstTwoStepsSec: firstTwoSteps ? parseFloat(firstTwoSteps) : undefined,
    };
  };

  const handleNextRep = () => {
    const result = buildResult();
    onRepComplete(result);
    
    // Reset for next rep
    setSignal(null);
    setDecisionCorrect(null);
    setFirstTwoSteps('');
    setStepsToBase('');
    setTimeToBase('');
    setCountdown(10);
    setPhase('countdown');
  };

const handleSaveEnd = () => {
  const result = buildResult();
  onRepComplete(result);
  onEndSession();
};

  const handleStartRep = () => {
    setCountdown(10);
    setPhase('countdown');
  };

  const isGoSignal = signal?.type === 'go';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 relative">
      {/* Idle state */}
      {phase === 'idle' && (
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">Rep #{repNumber}</p>
          <p className="text-sm text-muted-foreground">
            Manual mode — no camera required
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" onClick={handleStartRep} className="gap-2 px-8">
              <Play className="h-5 w-5" />
              Start Rep
            </Button>
            {repNumber > 1 && (
              <Button variant="outline" size="lg" onClick={onEndSession}>
                Save & End
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Countdown (10-4) */}
      {phase === 'countdown' && (
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground uppercase tracking-wider">Get Ready</p>
          <div className="text-8xl font-black tabular-nums text-primary">
            {countdown}
          </div>
        </div>
      )}

      {/* Take Lead (3-2-1) */}
      {phase === 'take_lead' && (
        <div className="text-center space-y-4">
          <p className="text-xl font-bold text-primary uppercase tracking-wider">Take Your Lead</p>
          <div className="text-8xl font-black tabular-nums text-primary">
            {countdown}
          </div>
        </div>
      )}

      {/* Waiting for signal */}
      {phase === 'waiting_signal' && (
        <div className="text-center space-y-4">
          <div className="text-xl font-medium text-muted-foreground animate-pulse">
            Hold your lead...
          </div>
        </div>
      )}

      {/* Signal Active - Full screen overlay */}
      <AnimatePresence>
        {phase === 'signal_active' && signal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer"
            style={{ backgroundColor: signal.type === 'go' ? '#22c55e' : '#ef4444' }}
            onClick={handleSignalTap}
          >
            <motion.span
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="text-white font-black drop-shadow-lg"
              style={{ fontSize: 'min(30vw, 200px)' }}
            >
              {signal.value}
            </motion.span>
            <p className="absolute bottom-20 text-white/80 text-lg font-medium">
              Tap when done
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm Decision */}
      {phase === 'confirm_decision' && (
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <p className="text-center font-medium">Did you make the correct decision?</p>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
                onClick={() => handleDecisionConfirm(true)}
              >
                <CheckCircle className="h-5 w-5" />
                Correct
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2 border-red-500 text-red-600 hover:bg-red-50"
                onClick={() => handleDecisionConfirm(false)}
              >
                <XCircle className="h-5 w-5" />
                Incorrect
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Entry */}
      {phase === 'data_entry' && (
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              {decisionCorrect ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                {decisionCorrect ? 'Correct Decision' : 'Incorrect Decision'}
              </span>
            </div>

            <p className="text-sm text-muted-foreground text-center">
              Optional: Enter timing data (leave blank if not tracked)
            </p>

            {/* Only show first two steps & time to base for GO signals */}
            {isGoSignal && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time of First 2 Steps (seconds)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.42"
                    value={firstTwoSteps}
                    onChange={e => setFirstTwoSteps(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Time to Base (seconds)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3.21"
                    value={timeToBase}
                    onChange={e => setTimeToBase(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Steps to {isGoSignal ? 'Base' : 'Return'}</Label>
              <Input
                type="number"
                placeholder="e.g. 9"
                value={stepsToBase}
                onChange={e => setStepsToBase(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button 
                size="lg" 
                onClick={handleNextRep}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Next Rep
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={handleSaveEnd}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                Save & End
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
