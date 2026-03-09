import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PickoffRep } from './PickoffRepRunner';

interface Props {
  reps: PickoffRep[];
  onSave: () => void;
  saving: boolean;
}

export function PickoffSummary({ reps, onSave, saving }: Props) {
  const total = reps.length;
  const correct = reps.filter(r => r.decisionCorrect).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const pickoffReps = reps.filter(r => r.finalSignal === 'pickoff');
  const pickoffCorrect = pickoffReps.filter(r => r.decisionCorrect).length;
  const pickoffAcc = pickoffReps.length > 0 ? Math.round((pickoffCorrect / pickoffReps.length) * 100) : 0;

  const pitchReps = reps.filter(r => r.finalSignal === 'pitch');
  const pitchCorrect = pitchReps.filter(r => r.decisionCorrect).length;
  const pitchAcc = pitchReps.length > 0 ? Math.round((pitchCorrect / pitchReps.length) * 100) : 0;

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-bold text-foreground text-center">Session Summary</h1>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border bg-card text-center">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Total Reps</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card text-center">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-500">{correct}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card text-center">
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-red-500">{total - correct}</p>
            <p className="text-xs text-muted-foreground">Incorrect</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Accuracy Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Decision Accuracy</span>
            <span className="text-lg font-bold text-foreground">{accuracy}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pick-Off Accuracy</span>
            <span className="text-lg font-bold text-foreground">{pickoffAcc}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Pitch Commitment</span>
            <span className="text-lg font-bold text-foreground">{pitchAcc}%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Rep Log</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {reps.map((r, i) => (
            <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
              <span className="text-muted-foreground">Rep {r.repNumber}</span>
              <div className="flex items-center gap-2">
                <Badge variant={r.finalSignal === 'pickoff' ? 'destructive' : 'default'} className="text-xs">
                  {r.finalSignal === 'pitch' ? '🟢 Pitch' : '🔴 Pick-Off'}
                </Badge>
                <Badge variant={r.decisionCorrect ? 'default' : 'destructive'} className="text-xs">
                  {r.decisionCorrect ? 'Correct' : 'Incorrect'}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full" size="lg" onClick={onSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Session'}
      </Button>
    </div>
  );
}
