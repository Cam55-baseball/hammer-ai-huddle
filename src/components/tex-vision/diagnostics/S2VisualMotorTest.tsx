import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Hand } from 'lucide-react';

interface S2VisualMotorTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_TARGETS = 20;
const TARGET_DISPLAY_TIME = 2000; // ms before target disappears

export const S2VisualMotorTest = ({ onComplete }: S2VisualMotorTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [targetIndex, setTargetIndex] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [showTarget, setShowTarget] = useState(false);
  const [results, setResults] = useState<{ hit: boolean; responseTime: number; distance: number }[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const targetTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown
  useEffect(() => {
    if (phase === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (phase === 'countdown' && countdown === 0) {
      setPhase('playing');
    }
  }, [phase, countdown]);

  // Show target
  const showNextTarget = useCallback(() => {
    if (targetIndex >= TOTAL_TARGETS) {
      setPhase('done');
      return;
    }

    // Random position (avoiding edges)
    const x = 15 + Math.random() * 70; // 15-85%
    const y = 15 + Math.random() * 70;
    
    setTargetPosition({ x, y });
    setShowTarget(true);
    targetTimeRef.current = Date.now();

    // Auto-miss after timeout
    timeoutRef.current = setTimeout(() => {
      setResults(prev => [...prev, { hit: false, responseTime: TARGET_DISPLAY_TIME, distance: 999 }]);
      setShowTarget(false);
      setTargetIndex(i => i + 1);
    }, TARGET_DISPLAY_TIME);
  }, [targetIndex]);

  // Start game / advance to done
  useEffect(() => {
    if (phase === 'playing' && !showTarget) {
      if (targetIndex >= TOTAL_TARGETS) {
        setPhase('done');
      } else {
        const delay = setTimeout(showNextTarget, 500);
        return () => clearTimeout(delay);
      }
    }
  }, [phase, showTarget, targetIndex, showNextTarget]);

  // Handle tap
  const handleTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (!showTarget || !containerRef.current) return;

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const rect = containerRef.current.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Calculate tap position as percentage
    const tapX = ((clientX - rect.left) / rect.width) * 100;
    const tapY = ((clientY - rect.top) / rect.height) * 100;

    // Calculate distance from target center
    const distance = Math.sqrt(
      Math.pow(tapX - targetPosition.x, 2) + 
      Math.pow(tapY - targetPosition.y, 2)
    );

    const responseTime = Date.now() - targetTimeRef.current;
    const hit = distance < 12; // ~12% radius hit zone

    setResults(prev => [...prev, { hit, responseTime, distance }]);
    setShowTarget(false);
    setTargetIndex(i => i + 1);
  };

  // Calculate score
  useEffect(() => {
    if (phase === 'done') {
      const hits = results.filter(r => r.hit).length;
      const avgDistance = results.reduce((sum, r) => sum + Math.min(r.distance, 50), 0) / results.length;
      const avgResponseTime = results
        .filter(r => r.hit)
        .reduce((sum, r) => sum + r.responseTime, 0) / (hits || 1);

      // Score: accuracy (50%) + precision (25%) + speed (25%)
      const accuracyScore = (hits / TOTAL_TARGETS) * 50;
      const precisionScore = Math.max(0, 25 - avgDistance * 0.5);
      const speedScore = Math.max(0, 25 - (avgResponseTime / 80));

      const finalScore = Math.round(Math.min(100, accuracyScore + precisionScore + speedScore));
      
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results, onComplete]);

  // Instructions
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <Hand className="h-6 w-6" />
            Visual-Motor Integration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Targets will appear at random positions</li>
              <li>Tap the target as quickly and accurately as possible</li>
              <li>Each target disappears after 2 seconds</li>
              <li>Both speed and accuracy count!</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_TARGETS} targets total
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
    const hits = results.filter(r => r.hit).length;
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
          <div className="text-xl font-semibold">Visual-Motor Test Complete</div>
          <div className="text-muted-foreground">
            {hits}/{TOTAL_TARGETS} targets hit
          </div>
        </CardContent>
      </Card>
    );
  }

  // Playing
  return (
    <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
      <CardContent className="p-6 space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Target {targetIndex + 1} of {TOTAL_TARGETS}</span>
            <span>{results.filter(r => r.hit).length} hits</span>
          </div>
          <Progress value={(targetIndex / TOTAL_TARGETS) * 100} className="h-2" />
        </div>

        {/* Target Area */}
        <div 
          ref={containerRef}
          className="relative min-h-[300px] bg-background/30 rounded-lg border border-border/50 cursor-crosshair overflow-hidden"
          onClick={handleTap}
          onTouchStart={(e) => { e.preventDefault(); handleTap(e); }}
        >
          {showTarget && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute w-16 h-16 -ml-8 -mt-8 rounded-full bg-teal-500 flex items-center justify-center"
              style={{ 
                left: `${targetPosition.x}%`, 
                top: `${targetPosition.y}%`,
              }}
            >
              <div className="w-4 h-4 rounded-full bg-white" />
            </motion.div>
          )}
          
          {!showTarget && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground text-sm">Get ready...</span>
            </div>
          )}
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Tap the target as fast as you can!
        </div>
      </CardContent>
    </Card>
  );
};
