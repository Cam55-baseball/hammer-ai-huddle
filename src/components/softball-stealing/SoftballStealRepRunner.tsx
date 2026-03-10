import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SignalType } from './SoftballStealSetup';

export interface RepData {
  repNumber: number;
  signalResult: 'go' | 'hold';
  signalValue: string;
  decisionCorrect: boolean;
  twoStepTime?: number;
  timeToBase?: number;
  stepsToBase?: number;
  timestamp: string;
}

type Phase = 'idle' | 'countdown' | 'fake_signal' | 'real_signal' | 'decision' | 'data_entry';

const FAKE_COLORS = ['#6366f1', '#eab308', '#a855f7']; // indigo, yellow, purple
const FAKE_LABELS = ['Blue', 'Yellow', 'Purple'];
const EVEN_NUMBERS = [2, 4, 6, 8, 12, 14, 16, 18, 22, 24];
const ODD_NUMBERS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

interface Props {
  repNumber: number;
  signalType: SignalType;
  onRepComplete: (rep: RepData) => void;
  onDeleteRep: () => void;
  onEndSession: () => void;
  canEnd: boolean;
}

export function SoftballStealRepRunner({ repNumber, signalType, onRepComplete, onDeleteRep, onEndSession, canEnd }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(10);
  const [fakeSignals, setFakeSignals] = useState<{ color: string; label: string }[]>([]);
  const [currentFakeIdx, setCurrentFakeIdx] = useState(0);
  const [realSignal, setRealSignal] = useState<'go' | 'hold'>('go');
  const [realSignalDisplay, setRealSignalDisplay] = useState('');
  const [twoStepTime, setTwoStepTime] = useState('');
  const [timeToBase, setTimeToBase] = useState('');
  const [stepsToBase, setStepsToBase] = useState('');
  const [pendingDecision, setPendingDecision] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Reset phase when repNumber changes (fixes stuck decision buttons)
  useEffect(() => {
    setPhase('idle');
    setTwoStepTime('');
    setTimeToBase('');
    setStepsToBase('');
  }, [repNumber]);

  const generateSignalSequence = useCallback(() => {
    const fakeCount = Math.random() > 0.5 ? 2 : 1;
    const fakes: { color: string; label: string }[] = [];
    const usedIndices = new Set<number>();
    for (let i = 0; i < fakeCount; i++) {
      let idx: number;
      do { idx = Math.floor(Math.random() * 3); } while (usedIndices.has(idx));
      usedIndices.add(idx);
      fakes.push({ color: FAKE_COLORS[idx], label: FAKE_LABELS[idx] });
    }
    setFakeSignals(fakes);
    setCurrentFakeIdx(0);

    const isGo = Math.random() > 0.4;
    setRealSignal(isGo ? 'go' : 'hold');

    if (signalType === 'color') {
      setRealSignalDisplay(isGo ? 'Green' : 'Red');
    } else {
      const pool = isGo ? EVEN_NUMBERS : ODD_NUMBERS;
      setRealSignalDisplay(String(pool[Math.floor(Math.random() * pool.length)]));
    }
  }, [signalType]);

  const startRep = useCallback(() => {
    generateSignalSequence();
    setCountdown(10);
    setPhase('countdown');
    setTwoStepTime('');
    setTimeToBase('');
    setStepsToBase('');
  }, [generateSignalSequence]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('fake_signal');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Fake signal progression
  useEffect(() => {
    if (phase !== 'fake_signal') return;
    if (currentFakeIdx >= fakeSignals.length) {
      setPhase('real_signal');
      return;
    }
    const t = setTimeout(() => setCurrentFakeIdx(i => i + 1), 1000);
    return () => clearTimeout(t);
  }, [phase, currentFakeIdx, fakeSignals.length]);

  const handleDecision = (correct: boolean) => {
    if (realSignal === 'go') {
      setPendingDecision(correct);
      setPhase('data_entry');
    } else {
      // HOLD rep — no timing data needed
      onRepComplete({
        repNumber,
        signalResult: 'hold',
        signalValue: realSignalDisplay,
        decisionCorrect: correct,
        timestamp: new Date().toISOString(),
      });
      // phase will reset via useEffect on repNumber change
    }
  };

  const handleSaveRep = () => {
    const ts = parseFloat(twoStepTime);
    const ttb = parseFloat(timeToBase);
    const stb = parseInt(stepsToBase);
    if (isNaN(ts) || isNaN(ttb) || isNaN(stb) || ts <= 0 || ttb <= 0 || stb <= 0) return;

    onRepComplete({
      repNumber,
      signalResult: 'go',
      signalValue: realSignalDisplay,
      decisionCorrect: pendingDecision,
      twoStepTime: ts,
      timeToBase: ttb,
      stepsToBase: stb,
      timestamp: new Date().toISOString(),
    });
  };

  // ─── RENDER ──────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-8">
        <div className="space-y-1">
          <Badge variant="secondary" className="text-lg px-4 py-1">Rep #{repNumber}</Badge>
        </div>
        <Button size="lg" className="w-full text-lg h-14" onClick={startRep}>
          Start Rep
        </Button>
        {canEnd && (
          <Button variant="outline" className="w-full" onClick={onEndSession}>
            Save Session & Exit
          </Button>
        )}
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
        <p className="text-sm text-muted-foreground uppercase tracking-wider">Get Ready</p>
        <div className="text-8xl font-black text-primary tabular-nums">{countdown}</div>
      </div>
    );
  }

  if (phase === 'fake_signal') {
    const fake = fakeSignals[currentFakeIdx];
    if (!fake) return null;
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50 transition-colors duration-200"
        style={{ backgroundColor: fake.color }}
      >
        <span className="text-6xl font-black text-white drop-shadow-lg">{fake.label}</span>
      </div>
    );
  }

  if (phase === 'real_signal') {
    const isGo = realSignal === 'go';
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-50"
        style={{ backgroundColor: isGo ? '#22c55e' : '#ef4444' }}
      >
        <span className="text-7xl sm:text-9xl font-black text-white drop-shadow-lg mb-4">
          {signalType === 'color' ? (isGo ? 'GO!' : 'HOLD!') : realSignalDisplay}
        </span>
        {signalType === 'even_odd' && (
          <p className="text-xl font-bold text-white/90 mb-4">
            {isGo ? 'Even = GO' : 'Odd = HOLD'}
          </p>
        )}
        <Button
          size="lg"
          variant="outline"
          className="bg-white/20 text-white border-white/40 hover:bg-white/30 text-lg px-8"
          onClick={() => setPhase('decision')}
        >
          Continue
        </Button>
      </div>
    );
  }

  if (phase === 'decision') {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50 gap-6">
        <p className="text-lg font-semibold text-foreground">Did the runner make the correct decision?</p>
        <p className="text-sm text-muted-foreground">
          Signal was: <span className="font-bold">{realSignal === 'go' ? 'GO' : 'HOLD'}</span>
        </p>
        <div className="flex gap-3">
          <Button size="lg" className="flex-1 px-8" variant="default" onClick={() => handleDecision(true)}>
            ✓ Correct
          </Button>
          <Button size="lg" className="flex-1 px-8" variant="destructive" onClick={() => handleDecision(false)}>
            ✗ Incorrect
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'data_entry') {
    const isValid = twoStepTime && timeToBase && stepsToBase &&
      !isNaN(parseFloat(twoStepTime)) && !isNaN(parseFloat(timeToBase)) && !isNaN(parseInt(stepsToBase));

    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-center">Enter Rep Metrics</h3>
          <div className="space-y-3">
            <div>
              <Label htmlFor="two-step">2 Step Time (seconds)</Label>
              <Input id="two-step" type="number" step="0.01" min="0" placeholder="e.g. 0.78"
                value={twoStepTime} onChange={e => setTwoStepTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="time-base">Time to Base (seconds)</Label>
              <Input id="time-base" type="number" step="0.01" min="0" placeholder="e.g. 3.41"
                value={timeToBase} onChange={e => setTimeToBase(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="steps">Steps to Base</Label>
              <Input id="steps" type="number" step="1" min="1" placeholder="e.g. 13"
                value={stepsToBase} onChange={e => setStepsToBase(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" disabled={!isValid} onClick={handleSaveRep}>
              Save Rep
            </Button>
            <Button variant="outline" className="flex-1" onClick={onDeleteRep}>
              Delete Rep
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
