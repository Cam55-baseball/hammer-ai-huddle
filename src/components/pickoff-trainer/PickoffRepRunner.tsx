import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import type { SignalType } from './PickoffSetup';

export interface PickoffRep {
  repNumber: number;
  baseTarget: string;
  coveringPosition: string;
  finalSignal: 'pitch' | 'pickoff';
  decisionCorrect: boolean;
  timestamp: string;
  signalType: SignalType;
  displayedValue?: string;
}

type RepPhase = 'idle' | 'countdown' | 'signal_window' | 'real_signal' | 'decision';

const DISTRACTION_COLORS = ['bg-blue-500', 'bg-yellow-500', 'bg-purple-500'];
const EVEN_NUMBERS = [2, 4, 6, 8, 12, 14, 16, 18, 20, 22];
const ODD_NUMBERS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const ALL_NUMBERS = [...EVEN_NUMBERS, ...ODD_NUMBERS];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface Props {
  base: string;
  covering: string;
  signalType: SignalType;
  reps: PickoffRep[];
  onRepComplete: (rep: PickoffRep) => void;
  onDeleteRep: (index: number) => void;
  onFinish: () => void;
}

export function PickoffRepRunner({ base, covering, signalType, reps, onRepComplete, onDeleteRep, onFinish }: Props) {
  const [phase, setPhase] = useState<RepPhase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [flashNumber, setFlashNumber] = useState<number | null>(null);
  const [realSignal, setRealSignal] = useState<'pitch' | 'pickoff' | null>(null);
  const [realNumber, setRealNumber] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startRep = () => {
    setPhase('countdown');
    setCountdown(10);
    setFlashColor(null);
    setFlashNumber(null);
    setRealSignal(null);
    setRealNumber(null);

    let c = 10;
    intervalRef.current = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(intervalRef.current!);
        beginSignalWindow();
      }
    }, 1000);
  };

  const beginSignalWindow = () => {
    setPhase('signal_window');

    const numFakes = Math.random() < 0.5 ? 1 : 2;
    const fakeTimings: number[] = [];
    for (let i = 0; i < numFakes; i++) {
      fakeTimings.push(1000 + Math.random() * 5000 + i * 3000);
    }

    fakeTimings.forEach(t => {
      setTimeout(() => {
        if (signalType === 'color') {
          const color = DISTRACTION_COLORS[Math.floor(Math.random() * DISTRACTION_COLORS.length)];
          setFlashColor(color);
          setTimeout(() => setFlashColor(null), 1000);
        } else {
          setFlashNumber(pickRandom(ALL_NUMBERS));
          setTimeout(() => setFlashNumber(null), 1000);
        }
      }, t);
    });

    const lastFake = Math.max(...fakeTimings) + 1500;
    const realTime = lastFake + Math.random() * (13000 - lastFake);
    const signal: 'pitch' | 'pickoff' = Math.random() < 0.55 ? 'pitch' : 'pickoff';

    timerRef.current = setTimeout(() => {
      setFlashColor(null);
      setFlashNumber(null);
      setRealSignal(signal);

      if (signalType === 'even_odd') {
        const num = signal === 'pitch' ? pickRandom(EVEN_NUMBERS) : pickRandom(ODD_NUMBERS);
        setRealNumber(num);
      }

      setPhase('real_signal');
    }, Math.min(realTime, 13000));
  };

  const handleContinue = () => {
    setPhase('decision');
  };

  const handleDecision = (correct: boolean) => {
    onRepComplete({
      repNumber: reps.length + 1,
      baseTarget: base,
      coveringPosition: covering,
      finalSignal: realSignal!,
      decisionCorrect: correct,
      timestamp: new Date().toISOString(),
      signalType,
      displayedValue: signalType === 'even_odd' && realNumber != null ? String(realNumber) : undefined,
    });
    setPhase('idle');
    setRealSignal(null);
    setRealNumber(null);
    clearTimers();
  };

  const repNum = reps.length + 1;

  const signalLabel = (r: PickoffRep) => {
    if (r.signalType === 'even_odd' && r.displayedValue) {
      return r.finalSignal === 'pitch' ? `${r.displayedValue} (Even)` : `${r.displayedValue} (Odd)`;
    }
    return r.finalSignal === 'pitch' ? '🟢 Pitch' : '🔴 Pick-Off';
  };

  if (phase === 'idle') {
    return (
      <div className="max-w-lg mx-auto space-y-6 p-4">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-lg px-4 py-1">Rep {repNum}</Badge>
          <p className="text-sm text-muted-foreground">
            Target: {base} Base • Covering: {covering}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button size="lg" className="w-full" onClick={startRep}>Start Rep</Button>
          {reps.length > 0 && (
            <Button variant="outline" className="w-full" onClick={onFinish}>
              Save Session & Exit
            </Button>
          )}
        </div>

        {reps.length > 0 && (
          <Card className="border-border bg-card">
            <CardContent className="pt-4 space-y-2">
              <p className="text-sm font-medium text-foreground">Completed Reps</p>
              {reps.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                  <span className="text-muted-foreground">Rep {r.repNumber}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.finalSignal === 'pickoff' ? 'destructive' : 'default'} className="text-xs">
                      {signalLabel(r)}
                    </Badge>
                    <Badge variant={r.decisionCorrect ? 'default' : 'destructive'} className="text-xs">
                      {r.decisionCorrect ? '✓' : '✗'}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteRep(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <p className="text-muted-foreground text-lg mb-4">Next Rep Starting In</p>
        <span className="text-8xl font-bold text-foreground tabular-nums">{countdown}</span>
      </div>
    );
  }

  if (phase === 'signal_window') {
    if (signalType === 'even_odd') {
      return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-background">
          {flashNumber != null ? (
            <span className="text-9xl font-bold text-foreground">{flashNumber}</span>
          ) : (
            <p className="text-muted-foreground text-xl animate-pulse">Watch for signal...</p>
          )}
        </div>
      );
    }
    return (
      <div className={`fixed inset-0 flex items-center justify-center z-50 transition-colors duration-200 ${flashColor ? flashColor : 'bg-background'}`}>
        {!flashColor && (
          <p className="text-muted-foreground text-xl animate-pulse">Watch for signal...</p>
        )}
      </div>
    );
  }

  if (phase === 'real_signal') {
    if (signalType === 'even_odd') {
      const isPickoff = realSignal === 'pickoff';
      return (
        <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${isPickoff ? 'bg-red-500' : 'bg-green-500'}`}>
          <span className="text-9xl font-bold text-white mb-2">{realNumber}</span>
          <span className="text-2xl font-bold text-white/90 mb-4">
            {isPickoff ? 'ODD — PICK-OFF!' : 'EVEN — PITCH!'}
          </span>
          <Button
            size="lg"
            variant="outline"
            className="bg-white/20 text-white border-white/40 hover:bg-white/30"
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      );
    }

    const isPickoff = realSignal === 'pickoff';
    return (
      <div className={`fixed inset-0 flex flex-col items-center justify-center z-50 ${isPickoff ? 'bg-red-500' : 'bg-green-500'}`}>
        <span className="text-6xl font-bold text-white mb-4">
          {isPickoff ? '🔴 PICK-OFF!' : '🟢 PITCH!'}
        </span>
        <Button
          size="lg"
          variant="outline"
          className="bg-white/20 text-white border-white/40 hover:bg-white/30"
          onClick={handleContinue}
        >
          Continue
        </Button>
      </div>
    );
  }

  if (phase === 'decision') {
    const signalDisplay = signalType === 'even_odd' && realNumber != null
      ? `${realNumber} (${realSignal === 'pitch' ? 'Even → Pitch' : 'Odd → Pick-Off'})`
      : realSignal === 'pitch' ? '🟢 Pitch' : '🔴 Pick-Off';

    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <h2 className="text-xl font-bold text-foreground">Did you make the correct decision?</h2>
        <p className="text-muted-foreground text-sm">
          Signal was: {signalDisplay}
        </p>
        <div className="flex gap-4">
          <Button size="lg" onClick={() => handleDecision(true)} className="px-8">
            ✓ Correct
          </Button>
          <Button size="lg" variant="destructive" onClick={() => handleDecision(false)} className="px-8">
            ✗ Incorrect
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
