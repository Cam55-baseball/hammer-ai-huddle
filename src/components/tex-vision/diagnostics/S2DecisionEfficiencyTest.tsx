import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';

interface S2DecisionEfficiencyTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_ROUNDS = 25;
const STIMULUS_TIME = 800; // ms stimulus is shown
const INTER_STIMULUS_TIME = 500; // ms between stimuli

// Stimulus types: GO = green circle, NO-GO = red circle, DISTRACTOR = other colors
type StimulusType = 'go' | 'nogo' | 'distractor';

interface Stimulus {
  type: StimulusType;
  color: string;
}

const GO_STIMULUS: Stimulus = { type: 'go', color: '#10b981' }; // Green
const NOGO_STIMULUS: Stimulus = { type: 'nogo', color: '#ef4444' }; // Red
const DISTRACTORS: Stimulus[] = [
  { type: 'distractor', color: '#f59e0b' }, // Amber
  { type: 'distractor', color: '#8b5cf6' }, // Purple
  { type: 'distractor', color: '#06b6d4' }, // Cyan
];

export const S2DecisionEfficiencyTest = ({ onComplete }: S2DecisionEfficiencyTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);
  const [showStimulus, setShowStimulus] = useState(false);
  const [results, setResults] = useState<{ 
    type: StimulusType; 
    responded: boolean; 
    responseTime: number;
    correct: boolean;
  }[]>([]);
  const [canRespond, setCanRespond] = useState(false);
  const responseTimeRef = useRef<number>(0);
  const respondedRef = useRef(false);

  // Generate stimulus sequence
  const generateSequence = (): Stimulus[] => {
    const sequence: Stimulus[] = [];
    // Roughly 60% GO, 25% NO-GO, 15% distractor
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const rand = Math.random();
      if (rand < 0.6) {
        sequence.push(GO_STIMULUS);
      } else if (rand < 0.85) {
        sequence.push(NOGO_STIMULUS);
      } else {
        sequence.push(DISTRACTORS[Math.floor(Math.random() * DISTRACTORS.length)]);
      }
    }
    return sequence;
  };

  const [sequence] = useState(() => generateSequence());

  // Countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('playing');
    }
  }, [phase, countdown]);

  // Run trial
  useEffect(() => {
    if (phase !== 'playing') return;
    if (round >= TOTAL_ROUNDS) {
      setPhase('done');
      return;
    }

    respondedRef.current = false;
    
    // Show stimulus after inter-stimulus interval
    const showTimer = setTimeout(() => {
      setCurrentStimulus(sequence[round]);
      setShowStimulus(true);
      setCanRespond(true);
      responseTimeRef.current = Date.now();

      // Hide stimulus after display time
      const hideTimer = setTimeout(() => {
        setShowStimulus(false);
        setCanRespond(false);
        
        // Record result if no response
        if (!respondedRef.current) {
          const stimulus = sequence[round];
          setResults(prev => [...prev, {
            type: stimulus.type,
            responded: false,
            responseTime: 0,
            correct: stimulus.type === 'nogo' || stimulus.type === 'distractor', // Correct to NOT respond to nogo/distractor
          }]);
        }
        
        // Move to next round
        setTimeout(() => {
          setRound(r => r + 1);
        }, 200);
      }, STIMULUS_TIME);

      return () => clearTimeout(hideTimer);
    }, INTER_STIMULUS_TIME);

    return () => clearTimeout(showTimer);
  }, [phase, round, sequence]);

  // Handle tap response
  const handleTap = () => {
    if (!canRespond || respondedRef.current) return;
    
    respondedRef.current = true;
    const responseTime = Date.now() - responseTimeRef.current;
    const stimulus = sequence[round];
    
    // GO = should respond, NOGO/distractor = should NOT respond
    const correct = stimulus.type === 'go';
    
    setResults(prev => [...prev, {
      type: stimulus.type,
      responded: true,
      responseTime,
      correct,
    }]);
  };

  // Calculate score when done
  useEffect(() => {
    if (phase === 'done') {
      const correctResponses = results.filter(r => r.correct).length;
      const goTrials = results.filter(r => r.type === 'go');
      const nogoTrials = results.filter(r => r.type === 'nogo' || r.type === 'distractor');
      
      const hitRate = goTrials.length > 0 
        ? goTrials.filter(r => r.responded).length / goTrials.length 
        : 0;
      const falseAlarmRate = nogoTrials.length > 0
        ? nogoTrials.filter(r => r.responded).length / nogoTrials.length
        : 0;
      
      // Score: accuracy (50%) + hit rate bonus (25%) + low false alarm bonus (25%)
      const accuracyScore = (correctResponses / TOTAL_ROUNDS) * 50;
      const hitScore = hitRate * 25;
      const inhibitionScore = (1 - falseAlarmRate) * 25;
      
      const finalScore = Math.round(Math.min(100, accuracyScore + hitScore + inhibitionScore));
      
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results, onComplete]);

  // Instructions
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Target className="h-6 w-6" />
            Decision Efficiency Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500" />
                <span><strong>GREEN</strong> = TAP quickly!</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500" />
                <span><strong>RED</strong> = DON'T tap!</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500" />
                <span><strong>Other colors</strong> = DON'T tap!</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              React fast to green, but control your impulse on other colors!
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

  // Countdown
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

  // Done
  if (phase === 'done') {
    const correctCount = results.filter(r => r.correct).length;
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
          <div className="text-xl font-semibold">Decision Efficiency Complete</div>
          <div className="text-muted-foreground">
            {correctCount}/{TOTAL_ROUNDS} correct decisions
          </div>
        </CardContent>
      </Card>
    );
  }

  // Playing
  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
      <CardContent className="p-6 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Trial {round + 1} of {TOTAL_ROUNDS}</span>
            <span>{results.filter(r => r.correct).length} correct</span>
          </div>
          <Progress value={(round / TOTAL_ROUNDS) * 100} className="h-2" />
        </div>

        {/* Stimulus Area - Tap Zone */}
        <div 
          className="min-h-[250px] flex items-center justify-center cursor-pointer select-none"
          onClick={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
        >
          {showStimulus && currentStimulus ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-32 h-32 rounded-full"
              style={{ backgroundColor: currentStimulus.color }}
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Wait...</span>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Tap anywhere on the card when you see <span className="text-emerald-500 font-semibold">GREEN</span>
        </div>
      </CardContent>
    </Card>
  );
};
