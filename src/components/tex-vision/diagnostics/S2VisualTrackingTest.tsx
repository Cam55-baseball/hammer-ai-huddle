import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Eye } from 'lucide-react';

interface S2VisualTrackingTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_ROUNDS = 15;
const INITIAL_DOTS = 8;
const MOVEMENT_DURATION = 3000; // ms dots move
const MOVEMENT_SPEED = 2; // pixels per frame

interface Dot {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTarget: boolean;
}

export const S2VisualTrackingTest = ({ onComplete }: S2VisualTrackingTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'highlight' | 'moving' | 'select' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [dots, setDots] = useState<Dot[]>([]);
  const [targetCount, setTargetCount] = useState(1);
  const [selectedDots, setSelectedDots] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<{ correct: number; total: number }[]>([]);
  const animationRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate random position within container
  const randomPosition = (max: number) => Math.random() * (max - 40) + 20;

  // Initialize dots for a round
  const initializeDots = useCallback(() => {
    const numTargets = Math.min(1 + Math.floor(round / 5), 3); // 1-3 targets based on progress
    setTargetCount(numTargets);
    
    const newDots: Dot[] = [];
    const containerWidth = 280;
    const containerHeight = 280;
    
    for (let i = 0; i < INITIAL_DOTS + Math.floor(round / 3); i++) {
      newDots.push({
        id: i,
        x: randomPosition(containerWidth),
        y: randomPosition(containerHeight),
        vx: (Math.random() - 0.5) * MOVEMENT_SPEED * (1 + round * 0.1),
        vy: (Math.random() - 0.5) * MOVEMENT_SPEED * (1 + round * 0.1),
        isTarget: i < numTargets,
      });
    }
    
    // Shuffle dots
    for (let i = newDots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDots[i], newDots[j]] = [newDots[j], newDots[i]];
    }
    
    setDots(newDots);
    setSelectedDots(new Set());
  }, [round]);

  // Start countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      initializeDots();
      setPhase('highlight');
    }
  }, [phase, countdown, initializeDots]);

  // Show targets highlighted, then start moving
  useEffect(() => {
    if (phase === 'highlight') {
      const timer = setTimeout(() => {
        setPhase('moving');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Animate dots during movement phase
  useEffect(() => {
    if (phase !== 'moving') return;

    const startTime = Date.now();
    const containerWidth = 280;
    const containerHeight = 280;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      
      if (elapsed >= MOVEMENT_DURATION) {
        setPhase('select');
        return;
      }

      setDots(prevDots => prevDots.map(dot => {
        let newX = dot.x + dot.vx;
        let newY = dot.y + dot.vy;
        let newVx = dot.vx;
        let newVy = dot.vy;

        // Bounce off walls
        if (newX < 10 || newX > containerWidth - 10) {
          newVx = -newVx;
          newX = Math.max(10, Math.min(containerWidth - 10, newX));
        }
        if (newY < 10 || newY > containerHeight - 10) {
          newVy = -newVy;
          newY = Math.max(10, Math.min(containerHeight - 10, newY));
        }

        return { ...dot, x: newX, y: newY, vx: newVx, vy: newVy };
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [phase]);

  // Handle dot selection
  const toggleDotSelection = (id: number) => {
    if (phase !== 'select') return;
    
    setSelectedDots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else if (newSet.size < targetCount) {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Submit selection
  const submitSelection = () => {
    const correctCount = dots.filter(d => d.isTarget && selectedDots.has(d.id)).length;
    setResults(prev => [...prev, { correct: correctCount, total: targetCount }]);

    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      setRound(r => r + 1);
      setPhase('highlight');
      initializeDots();
    }
  };

  // Calculate final score
  useEffect(() => {
    if (phase === 'done') {
      const totalCorrect = results.reduce((sum, r) => sum + r.correct, 0);
      const totalTargets = results.reduce((sum, r) => sum + r.total, 0);
      const finalScore = Math.round((totalCorrect / totalTargets) * 100);
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results, onComplete]);

  // Instructions phase
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Eye className="h-6 w-6" />
            Visual Tracking Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Watch for the highlighted (yellow) dots</li>
              <li>All dots will start moving randomly</li>
              <li>Track the target dots with your eyes</li>
              <li>When motion stops, select the dots you tracked</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_ROUNDS} rounds total • Difficulty increases progressively
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
    const totalCorrect = results.reduce((sum, r) => sum + r.correct, 0);
    const totalTargets = results.reduce((sum, r) => sum + r.total, 0);
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
          <div className="text-xl font-semibold">Visual Tracking Complete</div>
          <div className="text-muted-foreground">
            {totalCorrect}/{totalTargets} targets tracked
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active phases
  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
      <CardContent className="p-6 space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Round {round + 1} of {TOTAL_ROUNDS}</span>
            <span>Track {targetCount} dot{targetCount > 1 ? 's' : ''}</span>
          </div>
          <Progress value={(round / TOTAL_ROUNDS) * 100} className="h-2" />
        </div>

        {/* Status */}
        <div className="text-center text-sm font-medium">
          {phase === 'highlight' && <span className="text-yellow-400">Remember these dots!</span>}
          {phase === 'moving' && <span className="text-blue-400">Track with your eyes...</span>}
          {phase === 'select' && <span className="text-teal-400">Select the target dots ({selectedDots.size}/{targetCount})</span>}
        </div>

        {/* Dot Container */}
        <div 
          ref={containerRef}
          className="relative w-[280px] h-[280px] mx-auto bg-background/50 rounded-xl border border-border/50 overflow-hidden"
        >
          {dots.map(dot => (
            <motion.div
              key={dot.id}
              className={`absolute w-6 h-6 rounded-full cursor-pointer transition-colors ${
                phase === 'highlight' && dot.isTarget
                  ? 'bg-yellow-400 ring-2 ring-yellow-400/50'
                  : phase === 'select' && selectedDots.has(dot.id)
                  ? 'bg-teal-400 ring-2 ring-teal-400/50'
                  : 'bg-slate-500'
              }`}
              style={{
                left: dot.x - 12,
                top: dot.y - 12,
              }}
              onClick={() => toggleDotSelection(dot.id)}
              whileHover={phase === 'select' ? { scale: 1.2 } : undefined}
            />
          ))}
        </div>

        {/* Submit button */}
        {phase === 'select' && (
          <Button 
            onClick={submitSelection}
            disabled={selectedDots.size !== targetCount}
            className="w-full bg-teal-600 hover:bg-teal-700"
          >
            Confirm Selection
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
