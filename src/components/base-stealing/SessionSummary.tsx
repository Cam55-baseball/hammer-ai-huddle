import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Zap, ArrowLeft } from 'lucide-react';
import type { RepResult } from './LiveRepRunner';
import { RepReviewPlayer } from './RepReviewPlayer';
import { useState } from 'react';

interface SessionSummaryProps {
  reps: RepResult[];
  onDone: () => void;
  saving?: boolean;
}

export function SessionSummary({ reps, onDone, saving }: SessionSummaryProps) {
  const [expandedRep, setExpandedRep] = useState<number | null>(null);
  
  const correctCount = reps.filter(r => r.decisionCorrect).length;
  const avgReaction = reps.filter(r => r.decisionTimeSec != null).reduce((s, r) => s + (r.decisionTimeSec || 0), 0) / (reps.length || 1);
  const eliteJumps = reps.filter(r => r.eliteJump).length;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <h2 className="text-xl font-bold text-center">Session Complete</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{reps.length}</p>
            <p className="text-xs text-muted-foreground">Total Reps</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-500">{correctCount}/{reps.length}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold">{avgReaction.toFixed(2)}s</p>
            <p className="text-xs text-muted-foreground">Avg Reaction</p>
          </CardContent>
        </Card>
      </div>

      {eliteJumps > 0 && (
        <div className="flex items-center justify-center gap-2 text-amber-500 font-bold">
          <Zap className="h-5 w-5" /> {eliteJumps} Elite Jump{eliteJumps > 1 ? 's' : ''}!
        </div>
      )}

      {/* Rep list */}
      <div className="space-y-2">
        {reps.map((rep, i) => (
          <Card key={i} className="cursor-pointer" onClick={() => setExpandedRep(expandedRep === i ? null : i)}>
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Rep {rep.repNumber}</span>
                  {rep.decisionCorrect ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  {rep.eliteJump && <Zap className="h-4 w-4 text-amber-500" />}
                </div>
                <div className="text-xs text-muted-foreground">
                  {rep.signalValue} · {rep.decisionTimeSec}s
                </div>
              </div>
              {expandedRep === i && rep.videoBlob && (
                <RepReviewPlayer videoBlob={rep.videoBlob} />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full" onClick={onDone} disabled={saving}>
        {saving ? 'Saving...' : 'Save Session'}
      </Button>
    </div>
  );
}
