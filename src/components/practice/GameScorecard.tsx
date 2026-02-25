import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PitchLocationGrid } from '@/components/micro-layer/PitchLocationGrid';
import { useSportConfig } from '@/hooks/useSportConfig';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, RotateCcw } from 'lucide-react';

export interface GamePitch {
  pitch_location?: { row: number; col: number };
  pitch_type?: string;
  result: 'strike_looking' | 'strike_swinging' | 'ball' | 'foul' | 'in_play_out' | 'in_play_hit';
  swing_decision?: 'correct' | 'incorrect';
  contact_quality?: string;
  exit_direction?: string;
}

export interface AtBat {
  pitches: GamePitch[];
  outcome: string; // K, BB, 1B, 2B, 3B, HR, GO, FO, etc.
  rbi?: number;
}

interface GameScorecardProps {
  module: string;
  atBats: AtBat[];
  onAtBatsChange: (atBats: AtBat[]) => void;
}

const resultOptions = [
  { value: 'strike_looking', label: 'Called Strike', short: 'K👀' },
  { value: 'strike_swinging', label: 'Swing & Miss', short: 'K🌀' },
  { value: 'ball', label: 'Ball', short: '⚾' },
  { value: 'foul', label: 'Foul', short: '⚠️' },
  { value: 'in_play_out', label: 'In Play (Out)', short: '🔴' },
  { value: 'in_play_hit', label: 'In Play (Hit)', short: '🟢' },
];

const atBatOutcomes = ['K', 'BB', '1B', '2B', '3B', 'HR', 'GO', 'FO', 'LO', 'PO', 'FC', 'E', 'SAC', 'HBP'];

export function GameScorecard({ module, atBats, onAtBatsChange }: GameScorecardProps) {
  const { pitchTypes } = useSportConfig();
  const [currentPitches, setCurrentPitches] = useState<GamePitch[]>([]);
  const [currentPitch, setCurrentPitch] = useState<Partial<GamePitch>>({});
  const [step, setStep] = useState(0);
  const [showOutcome, setShowOutcome] = useState(false);

  // Derive count from current pitches
  const balls = currentPitches.filter(p => p.result === 'ball').length;
  const strikes = currentPitches.filter(p => ['strike_looking', 'strike_swinging', 'foul'].includes(p.result) && p.result !== 'foul').length
    + Math.min(2, currentPitches.filter(p => p.result === 'foul').length);

  const commitPitch = useCallback((result: string) => {
    const pitch: GamePitch = {
      ...currentPitch as GamePitch,
      result: result as GamePitch['result'],
    };
    const updated = [...currentPitches, pitch];
    setCurrentPitches(updated);
    setCurrentPitch({});
    setStep(0);

    // Check for automatic at-bat end
    const newBalls = updated.filter(p => p.result === 'ball').length;
    const newStrikes = updated.filter(p => ['strike_looking', 'strike_swinging'].includes(p.result)).length;
    const fouls = updated.filter(p => p.result === 'foul').length;
    const effectiveStrikes = newStrikes + Math.min(2, fouls);

    if (newBalls >= 4 || effectiveStrikes >= 3 || ['in_play_out', 'in_play_hit'].includes(result)) {
      setShowOutcome(true);
    }
  }, [currentPitch, currentPitches]);

  const finalizeAtBat = (outcome: string) => {
    const atBat: AtBat = {
      pitches: currentPitches,
      outcome,
    };
    onAtBatsChange([...atBats, atBat]);
    setCurrentPitches([]);
    setCurrentPitch({});
    setShowOutcome(false);
    setStep(0);
  };

  const resetAtBat = () => {
    setCurrentPitches([]);
    setCurrentPitch({});
    setShowOutcome(false);
    setStep(0);
  };

  // Stats
  const totalABs = atBats.length;
  const hits = atBats.filter(ab => ['1B', '2B', '3B', 'HR'].includes(ab.outcome)).length;
  const walks = atBats.filter(ab => ['BB', 'HBP'].includes(ab.outcome)).length;
  const ks = atBats.filter(ab => ab.outcome === 'K').length;
  const qualifiedABs = atBats.filter(ab => !['BB', 'HBP', 'SAC'].includes(ab.outcome)).length;
  const avg = qualifiedABs > 0 ? (hits / qualifiedABs).toFixed(3) : '.000';
  const obp = totalABs > 0 ? ((hits + walks) / totalABs).toFixed(3) : '.000';

  return (
    <div className="space-y-4">
      {/* Running stats bar */}
      {totalABs > 0 && (
        <div className="flex gap-4 justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold">{avg}</p>
            <p className="text-xs text-muted-foreground">AVG</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{obp}</p>
            <p className="text-xs text-muted-foreground">OBP</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{hits}</p>
            <p className="text-xs text-muted-foreground">H</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{ks}</p>
            <p className="text-xs text-muted-foreground">K</p>
          </div>
        </div>
      )}

      {/* Previous at-bats feed */}
      {atBats.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {atBats.map((ab, i) => (
            <Badge key={i} variant={['1B', '2B', '3B', 'HR'].includes(ab.outcome) ? 'default' : 'secondary'}>
              AB{i + 1}: {ab.outcome} ({ab.pitches.length}P)
            </Badge>
          ))}
        </div>
      )}

      {/* Current at-bat */}
      <Card className="border-primary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              At-Bat #{totalABs + 1}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-lg font-mono">{balls}-{Math.min(2, strikes)}</span>
              {currentPitches.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetAtBat} className="h-7 px-2">
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showOutcome ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">At-Bat Result</label>
              <div className="grid grid-cols-4 gap-2">
                {atBatOutcomes.map(outcome => (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => finalizeAtBat(outcome)}
                    className={cn(
                      'rounded-lg border p-3 text-center text-sm font-bold transition-all hover:scale-105',
                      ['1B', '2B', '3B', 'HR'].includes(outcome)
                        ? 'bg-green-500/20 border-green-300 text-green-700 hover:bg-green-500/30'
                        : 'bg-muted/30 border-border hover:bg-muted'
                    )}
                  >
                    {outcome}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              {/* Pitch sequence display */}
              {currentPitches.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {currentPitches.map((p, i) => {
                    const opt = resultOptions.find(r => r.value === p.result);
                    return (
                      <span key={i} className="text-sm">{opt?.short ?? '?'}</span>
                    );
                  })}
                </div>
              )}

              {/* Location */}
              <PitchLocationGrid
                value={currentPitch.pitch_location}
                onSelect={v => {
                  setCurrentPitch(prev => ({ ...prev, pitch_location: v }));
                  setStep(1);
                }}
              />

              {/* Result buttons */}
              {step >= 1 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Result</label>
                  <div className="grid grid-cols-3 gap-2">
                    {resultOptions.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => commitPitch(opt.value)}
                        className="rounded-lg border bg-muted/30 border-border hover:bg-muted p-2 text-center text-xs font-medium transition-all hover:scale-105"
                      >
                        {opt.short} {opt.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 0 && (
                <p className="text-center text-sm text-muted-foreground">Tap the zone where the pitch was thrown</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
