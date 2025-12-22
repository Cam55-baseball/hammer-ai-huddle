import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield } from 'lucide-react';

interface S2ImpulseControlTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_ROUNDS = 30;
const DISPLAY_TIME_MIN = 300;
const DISPLAY_TIME_MAX = 800;
const RESPONSE_WINDOW = 1500;

type TargetType = 'go' | 'nogo' | 'fake';

interface Target {
  type: TargetType;
  color: string;
}

export const S2ImpulseControlTest = ({ onComplete }: S2ImpulseControlTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [showTarget, setShowTarget] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [responded, setResponded] = useState(false);
  const [results, setResults] = useState<{ type: TargetType; responded: boolean; responseTime: number }[]>([]);
  const responseStartTime = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Start countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('playing');
      startRound();
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

  // Generate target for round
  const generateTarget = useCallback((): Target => {
    const rand = Math.random();
    const fakeChance = Math.min(0.2, 0.05 + round * 0.01); // Fake chance increases
    
    if (rand < 0.6) {
      // 60% go targets
      return { type: 'go', color: 'bg-emerald-500' };
    } else if (rand < 0.6 + fakeChance) {
      // Fake targets (appear green then flash red)
      return { type: 'fake', color: 'bg-emerald-500' };
    } else {
      // No-go targets
      return { type: 'nogo', color: 'bg-red-500' };
    }
  }, [round]);

  // Start a round
  const startRound = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setShowTarget(false);
    setResponded(false);
    setCanRespond(false);

    // Random delay before showing target
    const preDelay = 500 + Math.random() * 500;

    setTimeout(() => {
      const newTarget = generateTarget();
      setTarget(newTarget);
      setShowTarget(true);
      setCanRespond(true);
      responseStartTime.current = Date.now();

      // For fake targets, change color after brief delay
      if (newTarget.type === 'fake') {
        setTimeout(() => {
          setTarget(prev => prev ? { ...prev, color: 'bg-red-500' } : null);
        }, 150);
      }

      // Display duration decreases with progress
      const displayTime = Math.max(DISPLAY_TIME_MIN, DISPLAY_TIME_MAX - round * 10);

      // End response window
      timeoutRef.current = setTimeout(() => {
        const responseTime = Date.now() - responseStartTime.current;
        
        setResults(prev => [...prev, { 
          type: newTarget.type, 
          responded: false, 
          responseTime 
        }]);

        setShowTarget(false);
        setCanRespond(false);

        if (round + 1 >= TOTAL_ROUNDS) {
          setPhase('done');
        } else {
          setRound(r => r + 1);
          setTimeout(() => startRound(), 300);
        }
      }, RESPONSE_WINDOW);
    }, preDelay);
  }, [round, generateTarget]);

  // Handle tap/response
  const handleTap = () => {
    if (!canRespond || responded || !target) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const responseTime = Date.now() - responseStartTime.current;
    setResponded(true);
    setCanRespond(false);

    setResults(prev => [...prev, { 
      type: target.type, 
      responded: true, 
      responseTime 
    }]);

    setShowTarget(false);

    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      setRound(r => r + 1);
      setTimeout(() => startRound(), 300);
    }
  };

  // Calculate final score
  useEffect(() => {
    if (phase === 'done') {
      // Correct actions:
      // - Tap on 'go' targets
      // - Don't tap on 'nogo' targets
      // - Don't tap on 'fake' targets (after they turn red)
      
      let score = 0;
      const goTargets = results.filter(r => r.type === 'go');
      const nogoTargets = results.filter(r => r.type === 'nogo');
      const fakeTargets = results.filter(r => r.type === 'fake');

      // Points for correctly tapping go targets
      const goHits = goTargets.filter(r => r.responded).length;
      score += (goHits / Math.max(1, goTargets.length)) * 40;

      // Points for correctly NOT tapping nogo targets
      const nogoCorrect = nogoTargets.filter(r => !r.responded).length;
      score += (nogoCorrect / Math.max(1, nogoTargets.length)) * 30;

      // Points for correctly NOT tapping fake targets (heavy penalty for fakes)
      const fakeCorrect = fakeTargets.filter(r => !r.responded).length;
      score += (fakeCorrect / Math.max(1, fakeTargets.length)) * 30;

      // Speed bonus for go targets
      const avgGoTime = goTargets.filter(r => r.responded).reduce((sum, r) => sum + r.responseTime, 0) / (goHits || 1);
      const speedBonus = Math.max(0, 10 - (avgGoTime / 100));

      const finalScore = Math.round(Math.min(100, score + speedBonus));
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results, onComplete]);

  // Instructions phase
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Shield className="h-6 w-6" />
            Impulse Control Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li><span className="text-emerald-400 font-bold">GREEN</span> = TAP quickly!</li>
              <li><span className="text-red-400 font-bold">RED</span> = DON'T tap!</li>
              <li>Watch for FAKES: Green that turns Red - don't tap!</li>
              <li>Speed matters for green, but don't get tricked!</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_ROUNDS} rounds total • Tests impulse control and discipline
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
    const goHits = results.filter(r => r.type === 'go' && r.responded).length;
    const goTotal = results.filter(r => r.type === 'go').length;
    const falsePositives = results.filter(r => (r.type === 'nogo' || r.type === 'fake') && r.responded).length;
    
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
          <div className="text-xl font-semibold">Impulse Control Complete</div>
          <div className="text-muted-foreground text-sm">
            Go hits: {goHits}/{goTotal} • False positives: {falsePositives}
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
            <span>Round {round + 1} of {TOTAL_ROUNDS}</span>
          </div>
          <Progress value={(round / TOTAL_ROUNDS) * 100} className="h-2" />
        </div>

        {/* Tap area */}
        <div 
          className="min-h-[250px] flex items-center justify-center cursor-pointer"
          onClick={handleTap}
        >
          {showTarget && target ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-32 h-32 rounded-full ${target.color} flex items-center justify-center shadow-lg`}
            >
              <span className="text-white text-4xl font-bold">
                {target.color.includes('emerald') ? 'GO' : 'NO'}
              </span>
            </motion.div>
          ) : (
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Wait...</span>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Tap anywhere when you see <span className="text-emerald-400 font-bold">GREEN</span>
        </div>
      </CardContent>
    </Card>
  );
};
