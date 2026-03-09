import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import type { PickoffRep } from './PickoffRepRunner';

interface Props {
  reps: PickoffRep[];
}

function generateInsights(reps: PickoffRep[]): string[] {
  const insights: string[] = [];
  const total = reps.length;
  if (total === 0) return ['No reps recorded.'];

  const correct = reps.filter(r => r.decisionCorrect).length;
  const accuracy = correct / total;

  const pickoffReps = reps.filter(r => r.finalSignal === 'pickoff');
  const pickoffCorrect = pickoffReps.filter(r => r.decisionCorrect).length;
  const pitchReps = reps.filter(r => r.finalSignal === 'pitch');
  const pitchCorrect = pitchReps.filter(r => r.decisionCorrect).length;

  if (accuracy >= 0.9) insights.push('Elite decision accuracy this session. Maintain this level in game situations.');
  else if (accuracy >= 0.7) insights.push('Solid decision-making. Minor hesitation detected on some reps.');
  else insights.push('Decision accuracy needs improvement. Focus on reading signals without anticipation.');

  if (pickoffReps.length > 0 && pitchReps.length > 0) {
    const poAcc = pickoffCorrect / pickoffReps.length;
    const pAcc = pitchCorrect / pitchReps.length;
    if (poAcc < pAcc - 0.2) insights.push('Hesitation on pick-off signals under randomized pressure.');
    if (pAcc < poAcc - 0.2) insights.push('Pitch commitment accuracy lagging behind pick-off reads.');
  }

  // Consistency trend — check if accuracy drops in second half
  if (total >= 6) {
    const half = Math.floor(total / 2);
    const firstHalf = reps.slice(0, half).filter(r => r.decisionCorrect).length / half;
    const secondHalf = reps.slice(half).filter(r => r.decisionCorrect).length / (total - half);
    if (secondHalf < firstHalf - 0.15) {
      insights.push(`Accuracy dropped after rep ${half + 1}, suggesting focus fatigue.`);
    }
  }

  // Base comparison
  const bases = [...new Set(reps.map(r => r.baseTarget))];
  if (bases.length > 1) {
    const byBase = bases.map(b => {
      const bReps = reps.filter(r => r.baseTarget === b);
      return { base: b, acc: bReps.filter(r => r.decisionCorrect).length / bReps.length };
    });
    const best = byBase.reduce((a, b) => a.acc > b.acc ? a : b);
    const worst = byBase.reduce((a, b) => a.acc < b.acc ? a : b);
    if (best.acc - worst.acc > 0.15) {
      insights.push(`Decision accuracy improves when targeting ${best.base} compared to ${worst.base}.`);
    }
  }

  return insights;
}

export function PickoffAnalysis({ reps }: Props) {
  const navigate = useNavigate();
  const insights = generateInsights(reps);
  const total = reps.length;
  const correct = reps.filter(r => r.decisionCorrect).length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Rolling 3-rep accuracy for chart
  const trend: number[] = [];
  for (let i = 2; i < reps.length; i++) {
    const window = reps.slice(i - 2, i + 1);
    trend.push(Math.round((window.filter(r => r.decisionCorrect).length / 3) * 100));
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-bold text-foreground text-center">Session Analysis</h1>

      <Card className="border-primary/30 bg-card">
        <CardContent className="pt-6 text-center">
          <p className="text-5xl font-bold text-primary">{accuracy}%</p>
          <p className="text-sm text-muted-foreground mt-1">Overall Decision Accuracy</p>
        </CardContent>
      </Card>

      {trend.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader><CardTitle className="text-base">Consistency Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {trend.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-primary/70"
                  style={{ height: `${v}%` }}
                  title={`Reps ${i + 1}-${i + 3}: ${v}%`}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Rolling 3-rep accuracy window</p>
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <CardHeader><CardTitle className="text-base">Key Insights</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2">
              <Badge variant="outline" className="text-xs shrink-0 mt-0.5">💡</Badge>
              <p className="text-sm text-foreground">{insight}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Button className="w-full" variant="outline" onClick={() => navigate('/dashboard')}>
        Back to Dashboard
      </Button>
    </div>
  );
}
