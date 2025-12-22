import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScanEye } from 'lucide-react';

interface S2PeripheralAwarenessTestProps {
  onComplete: (score: number) => void;
}

const TOTAL_ROUNDS = 20;
const CENTER_FLASH_INTERVAL = 300; // ms between center flashes
const PERIPHERAL_DISPLAY_TIME = 200; // ms peripheral symbol shows

const SYMBOLS = ['★', '◆', '●', '▲'] as const;

export const S2PeripheralAwarenessTest = ({ onComplete }: S2PeripheralAwarenessTestProps) => {
  const [phase, setPhase] = useState<'instructions' | 'countdown' | 'playing' | 'respond' | 'done'>('instructions');
  const [countdown, setCountdown] = useState(3);
  const [round, setRound] = useState(0);
  const [centerFlashCount, setCenterFlashCount] = useState(0);
  const [centerFlashTarget, setCenterFlashTarget] = useState(0);
  const [centerFlashing, setCenterFlashing] = useState(false);
  const [peripheralSide, setPeripheralSide] = useState<'left' | 'right' | null>(null);
  const [peripheralSymbol, setPeripheralSymbol] = useState<string>('');
  const [showPeripheral, setShowPeripheral] = useState(false);
  const [results, setResults] = useState<{ centerCorrect: boolean; peripheralCorrect: boolean }[]>([]);
  const [userCenterCount, setUserCenterCount] = useState<number | null>(null);
  const flashIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const responseStartTime = useRef<number>(0);

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
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
      }
    };
  }, []);

  // Start a round
  const startRound = useCallback(() => {
    // Speed increases with progress
    const speed = Math.max(150, CENTER_FLASH_INTERVAL - round * 5);
    const targetFlashes = 3 + Math.floor(Math.random() * 4); // 3-6 flashes
    setCenterFlashTarget(targetFlashes);
    setCenterFlashCount(0);
    setPeripheralSide(null);
    setShowPeripheral(false);
    setUserCenterCount(null);

    // Random peripheral setup
    const side = Math.random() > 0.5 ? 'left' : 'right';
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    setPeripheralSide(side);
    setPeripheralSymbol(symbol);

    // When to show peripheral (during flashing)
    const peripheralDelay = speed * (1 + Math.floor(Math.random() * (targetFlashes - 1)));

    let flashCount = 0;
    flashIntervalRef.current = setInterval(() => {
      setCenterFlashing(true);
      flashCount++;
      setCenterFlashCount(flashCount);

      setTimeout(() => {
        setCenterFlashing(false);
      }, speed / 2);

      if (flashCount >= targetFlashes) {
        if (flashIntervalRef.current) {
          clearInterval(flashIntervalRef.current);
        }
        setTimeout(() => {
          responseStartTime.current = Date.now();
          setPhase('respond');
        }, 500);
      }
    }, speed);

    // Show peripheral at random point
    setTimeout(() => {
      setShowPeripheral(true);
      setTimeout(() => setShowPeripheral(false), PERIPHERAL_DISPLAY_TIME);
    }, peripheralDelay);
  }, [round]);

  // Handle response
  const handleResponse = (centerCount: number, side: 'left' | 'right') => {
    const centerCorrect = centerCount === centerFlashTarget;
    const peripheralCorrect = side === peripheralSide;

    setResults(prev => [...prev, { centerCorrect, peripheralCorrect }]);

    if (round + 1 >= TOTAL_ROUNDS) {
      setPhase('done');
    } else {
      setRound(r => r + 1);
      setPhase('playing');
      startRound();
    }
  };

  // Calculate final score
  useEffect(() => {
    if (phase === 'done') {
      const centerScore = results.filter(r => r.centerCorrect).length / TOTAL_ROUNDS * 50;
      const peripheralScore = results.filter(r => r.peripheralCorrect).length / TOTAL_ROUNDS * 50;
      const finalScore = Math.round(centerScore + peripheralScore);
      setTimeout(() => onComplete(finalScore), 1500);
    }
  }, [phase, results, onComplete]);

  // Instructions phase
  if (phase === 'instructions') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-teal-400">
            <ScanEye className="h-6 w-6" />
            Peripheral Awareness Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-background/50 rounded-lg space-y-4">
            <h4 className="font-semibold">How It Works:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Focus on the CENTER dot - it will flash</li>
              <li>Count how many times the center flashes</li>
              <li>While counting, watch for symbols appearing on LEFT or RIGHT</li>
              <li>Report both: flash count AND which side showed the symbol</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              {TOTAL_ROUNDS} rounds total • Tests split attention and peripheral vision
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
    const centerCorrect = results.filter(r => r.centerCorrect).length;
    const peripheralCorrect = results.filter(r => r.peripheralCorrect).length;
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
          <div className="text-xl font-semibold">Peripheral Awareness Complete</div>
          <div className="text-muted-foreground text-sm">
            Center focus: {centerCorrect}/{TOTAL_ROUNDS} • Peripheral: {peripheralCorrect}/{TOTAL_ROUNDS}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Response phase
  if (phase === 'respond') {
    return (
      <Card className="border-teal-500/30 bg-gradient-to-br from-teal-500/10 to-background">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Round {round + 1} of {TOTAL_ROUNDS}</span>
            </div>
            <Progress value={(round / TOTAL_ROUNDS) * 100} className="h-2" />
          </div>

          <div className="space-y-6">
            {/* Center count selection */}
            <div className="space-y-3">
              <div className="text-center font-medium">How many center flashes?</div>
              <div className="flex gap-2 justify-center flex-wrap">
                {[3, 4, 5, 6].map(num => (
                  <Button
                    key={num}
                    onClick={() => setUserCenterCount(num)}
                    variant={userCenterCount === num ? 'default' : 'outline'}
                    className={userCenterCount === num ? 'bg-teal-600' : ''}
                    size="lg"
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            {/* Side selection */}
            {userCenterCount !== null && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="text-center font-medium">Which side showed the symbol?</div>
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => handleResponse(userCenterCount, 'left')}
                    className="w-24 h-16 bg-teal-600 hover:bg-teal-700"
                    size="lg"
                  >
                    ← Left
                  </Button>
                  <Button
                    onClick={() => handleResponse(userCenterCount, 'right')}
                    className="w-24 h-16 bg-teal-600 hover:bg-teal-700"
                    size="lg"
                  >
                    Right →
                  </Button>
                </div>
              </motion.div>
            )}
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

        {/* Visual area */}
        <div className="relative h-[200px] flex items-center justify-center">
          {/* Left peripheral zone */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center">
            {showPeripheral && peripheralSide === 'left' && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl text-yellow-400"
              >
                {peripheralSymbol}
              </motion.span>
            )}
          </div>

          {/* Center focus point */}
          <motion.div
            className={`w-12 h-12 rounded-full transition-colors ${
              centerFlashing ? 'bg-teal-400' : 'bg-slate-600'
            }`}
            animate={{ scale: centerFlashing ? 1.2 : 1 }}
            transition={{ duration: 0.1 }}
          />

          {/* Right peripheral zone */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center">
            {showPeripheral && peripheralSide === 'right' && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-4xl text-yellow-400"
              >
                {peripheralSymbol}
              </motion.span>
            )}
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Focus on the center dot and count the flashes
        </div>
      </CardContent>
    </Card>
  );
};
