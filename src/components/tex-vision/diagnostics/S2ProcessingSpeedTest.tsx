import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap } from 'lucide-react';

interface S2ProcessingSpeedTestProps {
  onComplete: (score: number) => void;
}

const SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
const COLORS = ['#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'] as const;
const TOTAL_ROUNDS = 20;
const DISPLAY_TIME = 1500; // ms to show pattern
const MAX_RESPONSE_TIME = 3000; // ms to respond

interface Pattern {
  shape: typeof SHAPES[number];
  color: typeof COLORS[number];
}

export const S2ProcessingSpeedTest = ({ onComplete }: S2ProcessingSpeedTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [targetPattern, setTargetPattern] = useState<Pattern | null>(null);
  const [displayPatterns, setDisplayPatterns] = useState<Pattern[]>([]);
  const [showPatterns, setShowPatterns] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [results, setResults] = useState<{ correct: boolean; responseTime: number }[]>([]);
  const responseStartTime = useRef<number>(0);
  const waitingForResponseRef = useRef(false);
  const responseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate random pattern
  const generatePattern = (): Pattern => ({
    shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  });

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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (responseTimeoutRef.current) {
        clearTimeout(responseTimeoutRef.current);
      }
    };
  }, []);

  // Start a round
  const startRound = useCallback(() => {
    // Clear any existing timeout
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
    }

    const target = generatePattern();
    setTargetPattern(target);
    
    // Generate 8 display patterns (including 0-2 matches)
    const patterns: Pattern[] = [];
    const numMatches = Math.floor(Math.random() * 3); // 0, 1, or 2 matches
    
    for (let i = 0; i < 8; i++) {
      if (i < numMatches) {
        patterns.push({ ...target });
      } else {
        let pattern = generatePattern();
        // Make sure it's different from target
        while (pattern.shape === target.shape && pattern.color === target.color) {
          pattern = generatePattern();
        }
        patterns.push(pattern);
      }
    }
    
    // Shuffle patterns
    for (let i = patterns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [patterns[i], patterns[j]] = [patterns[j], patterns[i]];
    }
    
    setDisplayPatterns(patterns);
    setShowPatterns(true);

    // Hide patterns after display time and wait for response
    setTimeout(() => {
      setShowPatterns(false);
      setWaitingForResponse(true);
      waitingForResponseRef.current = true;
      responseStartTime.current = Date.now();

      // Auto-fail after max response time - use ref to avoid stale closure
      responseTimeoutRef.current = setTimeout(() => {
        if (waitingForResponseRef.current) {
          handleResponse(-1); // -1 indicates timeout
        }
      }, MAX_RESPONSE_TIME);
    }, DISPLAY_TIME);
  }, []);

  // Handle user response
  const handleResponse = (count: number) => {
    if (!waitingForResponseRef.current && count !== -1) return;
    
    // Clear timeout to prevent double-firing
    if (responseTimeoutRef.current) {
      clearTimeout(responseTimeoutRef.current);
      responseTimeoutRef.current = null;
    }
    
    const responseTime = Date.now() - responseStartTime.current;
    const actualCount = displayPatterns.filter(
      p => p.shape === targetPattern?.shape && p.color === targetPattern?.color
    ).length;
    
    const correct = count === actualCount;
    
    setResults(prev => [...prev, { correct, responseTime }]);
    setWaitingForResponse(false);
    waitingForResponseRef.current = false;

    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      setRound(r => r + 1);
      setTimeout(startRound, 500);
    }
  };

  // Calculate final score
  useEffect(() => {
    if (phase === 'done') {
      const correctCount = results.filter(r => r.correct).length;
      const avgResponseTime = results
        .filter(r => r.correct)
        .reduce((sum, r) => sum + r.responseTime, 0) / (correctCount || 1);
      
      // Score formula: accuracy (60%) + speed bonus (40%)
      const accuracyScore = (correctCount / TOTAL_ROUNDS) * 60;
      const speedScore = Math.max(0, 40 - (avgResponseTime / 100)); // Faster = higher
      const finalScore = Math.round(Math.min(100, accuracyScore + speedScore));
      
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results, onComplete]);

  // Render shape component
  const renderShape = (pattern: Pattern, size: number = 40) => {
    const style = { backgroundColor: pattern.color };
    
    switch (pattern.shape) {
      case 'circle':
        return <div className="rounded-full" style={{ ...style, width: size, height: size }} />;
      case 'square':
        return <div style={{ ...style, width: size, height: size }} />;
      case 'triangle':
        return (
          <div 
            style={{ 
              width: 0, 
              height: 0, 
              borderLeft: `${size/2}px solid transparent`,
              borderRight: `${size/2}px solid transparent`,
              borderBottom: `${size}px solid ${pattern.color}`,
            }} 
          />
        );
      case 'diamond':
        return (
          <div 
            style={{ ...style, width: size * 0.7, height: size * 0.7 }}
            className="rotate-45"
          />
        );
    }
  };

  // Instructions phase
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Zap className="h-6 w-6" />
            Processing Speed Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>You'll see a TARGET pattern (shape + color) at the top</li>
              <li>A grid of 8 patterns will flash briefly</li>
              <li>Count how many match the target (0, 1, or 2)</li>
              <li>Tap your answer quickly but accurately</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_ROUNDS} rounds total • Speed and accuracy both matter
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
            exit={{ scale: 1.5, opacity: 0 }}
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
          <div className="text-xl font-semibold">Processing Speed Complete</div>
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

        {/* Target Pattern */}
        <div className="text-center space-y-2">
          <div className="text-sm text-muted-foreground">Find this pattern:</div>
          <div className="flex justify-center">
            {targetPattern && renderShape(targetPattern, 60)}
          </div>
        </div>

        {/* Pattern Grid */}
        <div className="min-h-[200px] flex items-center justify-center">
          {showPatterns ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-4 gap-4"
            >
              {displayPatterns.map((pattern, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-center p-2"
                >
                  {renderShape(pattern)}
                </motion.div>
              ))}
            </motion.div>
          ) : waitingForResponse ? (
            <div className="text-center space-y-4">
              <div className="text-lg font-semibold">How many matches?</div>
              <div className="flex gap-4 justify-center">
                {[0, 1, 2].map(num => (
                  <Button
                    key={num}
                    onClick={() => handleResponse(num)}
                    size="lg"
                    className="w-16 h-16 text-2xl font-bold bg-teal-600 hover:bg-teal-700"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">Get ready...</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
