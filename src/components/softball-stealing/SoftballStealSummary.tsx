import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Trophy, Clock, Footprints, Zap } from 'lucide-react';
import type { RepData } from './SoftballStealRepRunner';
import { getBenchmarksForDistance } from '@/data/softball/softballStealBenchmarks';

interface Props {
  reps: RepData[];
  baseDistance: number;
  baseTarget: string;
  onSave: () => void;
  saving: boolean;
}

export function SoftballStealSummary({ reps, baseDistance, baseTarget, onSave, saving }: Props) {
  const goReps = reps.filter(r => r.signalResult === 'go' && r.timeToBase);
  const correctCount = reps.filter(r => r.decisionCorrect).length;
  const accuracyPct = reps.length > 0 ? Math.round((correctCount / reps.length) * 100) : 0;

  const avgTime = goReps.length > 0 ? goReps.reduce((s, r) => s + (r.timeToBase || 0), 0) / goReps.length : 0;
  const bestTime = goReps.length > 0 ? Math.min(...goReps.map(r => r.timeToBase || 99)) : 0;
  const avgTwoStep = goReps.length > 0 ? goReps.reduce((s, r) => s + (r.twoStepTime || 0), 0) / goReps.length : 0;
  const avgSteps = goReps.length > 0 ? Math.round(goReps.reduce((s, r) => s + (r.stepsToBase || 0), 0) / goReps.length) : 0;

  const b = getBenchmarksForDistance(baseDistance);
  const isEliteTime = avgTime > 0 && avgTime <= b.eliteTimeMax;

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold">Session Complete</h2>
        <p className="text-sm text-muted-foreground">Stealing {baseTarget} Base · {baseDistance} ft</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Total Reps</p>
            <p className="text-2xl font-bold">{reps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">Decision Accuracy</p>
            <p className="text-2xl font-bold">{accuracyPct}%</p>
          </CardContent>
        </Card>
      </div>

      {goReps.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="pt-4 text-center">
              <Clock className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Avg Time</p>
              <p className="text-xl font-bold">{avgTime.toFixed(2)}s</p>
              {isEliteTime && <Badge className="mt-1 text-xs">Elite</Badge>}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Trophy className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Best Time</p>
              <p className="text-xl font-bold">{bestTime.toFixed(2)}s</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Zap className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Avg 2-Step</p>
              <p className="text-xl font-bold">{avgTwoStep.toFixed(2)}s</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <Footprints className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Avg Steps</p>
              <p className="text-xl font-bold">{avgSteps}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Rep list */}
      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {reps.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
            <span>Rep #{r.repNumber}</span>
            <div className="flex items-center gap-2">
              <Badge variant={r.signalResult === 'go' ? 'default' : 'secondary'} className="text-xs">
                {r.signalResult.toUpperCase()}
              </Badge>
              {r.timeToBase && <span className="tabular-nums">{r.timeToBase.toFixed(2)}s</span>}
              <Badge variant={r.decisionCorrect ? 'default' : 'destructive'} className="text-xs">
                {r.decisionCorrect ? '✓' : '✗'}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      <Button className="w-full" size="lg" onClick={onSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Session'}
      </Button>
    </div>
  );
}
