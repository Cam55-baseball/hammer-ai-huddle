import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Minus, Plus } from 'lucide-react';

interface OpponentScoringPanelProps {
  inning: number;
  opponentName: string;
  onRecordAndSwitch: (runs: number, hits: number, errors: number) => void;
}

export function OpponentScoringPanel({ inning, opponentName, onRecordAndSwitch }: OpponentScoringPanelProps) {
  const [runs, setRuns] = useState(0);
  const [hits, setHits] = useState(0);
  const [errors, setErrors] = useState(0);

  const Stepper = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(Math.max(0, value - 1))} disabled={value === 0}>
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center text-lg font-bold tabular-nums">{value}</span>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onChange(value + 1)}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="mt-4 border-dashed">
      <CardContent className="py-5">
        <p className="text-sm font-medium text-center mb-4">
          Top of {inning} — <span className="text-primary">{opponentName}</span> batting
        </p>
        <div className="flex justify-center gap-8 mb-5">
          <Stepper label="Runs" value={runs} onChange={setRuns} />
          <Stepper label="Hits" value={hits} onChange={setHits} />
          <Stepper label="Errors" value={errors} onChange={setErrors} />
        </div>
        <Button className="w-full" onClick={() => onRecordAndSwitch(runs, hits, errors)}>
          Record & Switch to Bottom of {inning}
        </Button>
      </CardContent>
    </Card>
  );
}
