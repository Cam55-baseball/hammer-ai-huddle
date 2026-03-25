import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Minus, Plus } from 'lucide-react';

interface OpponentScoringPanelProps {
  inning: number;
  opponentName: string;
  half: 'top' | 'bottom';
  onRecordAndSwitch: (runs: number, hits: number, errors: number, outs: number) => void;
}

export function OpponentScoringPanel({ inning, opponentName, half, onRecordAndSwitch }: OpponentScoringPanelProps) {
  const [runs, setRuns] = useState(0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);
  const [outs, setOuts] = useState(0);

  const Stepper = ({ label, value, onChange, max }: { label: string; value: number; onChange: (v: number) => void; max?: number }) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-lg font-bold tabular-nums">{value}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(value + 1)} disabled={max !== undefined && value >= max}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  const halfLabel = half === 'top' ? 'Top' : 'Bottom';
  const nextHalfLabel = half === 'top' ? 'Bottom' : 'Top';
  const nextInning = half === 'bottom' ? inning + 1 : inning;

  return (
    <Card className="mt-4 border-dashed">
      <CardContent className="py-5">
        <p className="text-sm font-medium text-center mb-3">
          {halfLabel} of {inning} — <span className="text-primary">{opponentName}</span> batting
        </p>

        {/* Out indicator dots */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground font-medium mr-1">Outs:</span>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 transition-colors ${
                i < outs
                  ? 'bg-destructive border-destructive'
                  : 'border-muted-foreground/40 bg-transparent'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center gap-6 mb-5">
          <Stepper label="Outs" value={outs} onChange={setOuts} max={3} />
          <Stepper label="Runs" value={runs} onChange={setRuns} />
          <Stepper label="Hits" value={hits} onChange={setHits} />
          <Stepper label="Errors" value={errors} onChange={setErrors} />
        </div>

        <Button
          className="w-full"
          onClick={() => onRecordAndSwitch(runs, hits, errors, outs)}
          variant={outs >= 3 ? 'default' : 'outline'}
        >
          {outs >= 3
            ? `Record & Switch to ${nextHalfLabel} of ${nextInning}`
            : `Record & Switch (${outs}/3 outs)`}
        </Button>
      </CardContent>
    </Card>
  );
}
