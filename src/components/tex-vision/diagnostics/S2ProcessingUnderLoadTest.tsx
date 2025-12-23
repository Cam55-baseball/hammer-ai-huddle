import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Layers } from 'lucide-react';

interface S2ProcessingUnderLoadTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_ROUNDS = 15;
const BASE_TIME = 5000; // ms to respond

interface Challenge {
  type: 'pattern' | 'sequence' | 'multi';
  question: string;
  options: string[];
  correctIndex: number;
}

const SHAPES = ['●', '■', '▲', '◆'];
const COLORS = ['red', 'blue', 'green', 'yellow'];

export const S2ProcessingUnderLoadTest = ({ onComplete }: S2ProcessingUnderLoadTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [timeLeft, setTimeLeft] = useState(100);
  const [results, setResults] = useState<{ correct: boolean; responseTime: number }[]>([]);
  const responseStartTime = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompleted = useRef(false);

  // Generate a challenge
  const generateChallenge = useCallback((): Challenge => {
    const difficulty = Math.floor(round / 5); // 0, 1, 2
    const type = ['pattern', 'sequence', 'multi'][Math.min(difficulty, 2)] as Challenge['type'];

    if (type === 'pattern') {
      // Pattern matching: Does Pattern A match Pattern B?
      const shape1 = SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const shape2 = Math.random() > 0.5 ? shape1 : SHAPES[Math.floor(Math.random() * SHAPES.length)];
      const color1 = COLORS[Math.floor(Math.random() * COLORS.length)];
      const color2 = Math.random() > 0.5 ? color1 : COLORS[Math.floor(Math.random() * COLORS.length)];
      
      const matches = shape1 === shape2 && color1 === color2;
      
      return {
        type: 'pattern',
        question: `Does ${shape1} (${color1}) match ${shape2} (${color2})?`,
        options: ['Yes', 'No'],
        correctIndex: matches ? 0 : 1,
      };
    } else if (type === 'sequence') {
      // Sequence ordering: What comes next?
      const sequences = [
        { pattern: ['A', 'B', 'C', 'D'], next: 'E', wrong: ['F', 'D', 'A'] },
        { pattern: ['2', '4', '6', '8'], next: '10', wrong: ['9', '12', '6'] },
        { pattern: ['●', '●●', '●●●'], next: '●●●●', wrong: ['●●', '●●●●●', '●'] },
        { pattern: ['1', '2', '4', '8'], next: '16', wrong: ['10', '12', '32'] },
      ];
      const seq = sequences[Math.floor(Math.random() * sequences.length)];
      const options = [seq.next, ...seq.wrong].sort(() => Math.random() - 0.5);
      
      return {
        type: 'sequence',
        question: `What comes next: ${seq.pattern.join(' → ')} → ?`,
        options,
        correctIndex: options.indexOf(seq.next),
      };
    } else {
      // Multi-condition: Evaluate multiple conditions
      const num = Math.floor(Math.random() * 10) + 1;
      const isEven = num % 2 === 0;
      const isGreaterThan5 = num > 5;
      
      const conditions = [
        { q: `Is ${num} even AND greater than 5?`, a: isEven && isGreaterThan5 },
        { q: `Is ${num} odd OR less than 5?`, a: !isEven || num < 5 },
        { q: `Is ${num} even OR equal to 5?`, a: isEven || num === 5 },
      ];
      const cond = conditions[Math.floor(Math.random() * conditions.length)];
      
      return {
        type: 'multi',
        question: cond.q,
        options: ['Yes', 'No'],
        correctIndex: cond.a ? 0 : 1,
      };
    }
  }, [round]);

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
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start a round
  const startRound = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const newChallenge = generateChallenge();
    setChallenge(newChallenge);
    setTimeLeft(100);
    responseStartTime.current = Date.now();

    // Time pressure - decreases with round
    const totalTime = Math.max(2000, BASE_TIME - round * 150);
    const intervalTime = totalTime / 100;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleResponse(-1); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, intervalTime);
  }, [round, generateChallenge]);

  // Handle response
  const handleResponse = (selectedIndex: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const responseTime = Date.now() - responseStartTime.current;
    const correct = selectedIndex === challenge?.correctIndex;

    setResults(prev => [...prev, { correct, responseTime }]);

    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      setRound(r => r + 1);
      setTimeout(startRound, 500);
    }
  };

  // Calculate final score
  useEffect(() => {
    if (phase === 'done' && !hasCompleted.current) {
      hasCompleted.current = true;
      
      const correctCount = results.filter(r => r.correct).length;
      const avgTime = results.filter(r => r.correct).reduce((sum, r) => sum + r.responseTime, 0) / (correctCount || 1);
      
      // Score: accuracy (70%) + speed bonus (30%)
      const accuracyScore = (correctCount / TOTAL_ROUNDS) * 70;
      const speedScore = Math.max(0, 30 - (avgTime / 200));
      const finalScore = Math.round(Math.min(100, accuracyScore + speedScore));
      
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results]);

  // Instructions phase
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Layers className="h-6 w-6" />
            Processing Under Load Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>You'll see multi-step problems under time pressure</li>
              <li>Pattern matching, sequences, and logic questions</li>
              <li>Answer before time runs out</li>
              <li>Difficulty and speed increase progressively</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_ROUNDS} rounds total • Tests mental processing under pressure
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
          <div className="text-xl font-semibold">Processing Under Load Complete</div>
          <div className="text-muted-foreground">
            {correctCount}/{TOTAL_ROUNDS} correct
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
            <span>{results.filter(r => r.correct).length} correct</span>
          </div>
          <Progress value={(round / TOTAL_ROUNDS) * 100} className="h-2" />
        </div>

        {/* Timer */}
        <div className="space-y-1">
          <Progress 
            value={timeLeft} 
            className={`h-3 ${timeLeft < 30 ? '[&>div]:bg-red-500' : '[&>div]:bg-teal-500'}`}
          />
          <div className="text-xs text-center text-muted-foreground">Time remaining</div>
        </div>

        {/* Challenge */}
        {challenge && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center p-4 bg-background/50 rounded-lg">
              <div className="text-lg font-medium">{challenge.question}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {challenge.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleResponse(index)}
                  className="h-14 text-lg bg-teal-600 hover:bg-teal-700"
                  size="lg"
                >
                  {option}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
