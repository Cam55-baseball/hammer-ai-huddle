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

  if (total >= 6) {
    const half = Math.floor(total / 2);
    const firstHalf = reps.slice(0, half).filter(r => r.decisionCorrect).length / half;
    const secondHalf = reps.slice(half).filter(r => r.decisionCorrect).length / (total - half);
    if (secondHalf < firstHalf - 0.15) {
      insights.push(`Accuracy dropped after rep ${half + 1}, suggesting focus fatigue.`);
    }
  }

  // Balk analysis
  const balks = reps.filter(r => r.balk === 'yes');
  const questionableBalks = reps.filter(r => r.balk === 'questionable');
  if (balks.length > 0) {
    const balkRate = Math.round((balks.length / total) * 100);
    insights.push(`Balk rate: ${balkRate}% (${balks.length}/${total}). ${balkRate > 20 ? 'Focus on legal mechanics before throwing.' : 'Keep refining your set position.'}`);
  }
  if (questionableBalks.length > 0) {
    insights.push(`${questionableBalks.length} questionable balk${questionableBalks.length > 1 ? 's' : ''} — review your set position and step-off mechanics.`);
  }

  // Throw quality analysis
  const eliteThrows = reps.filter(r => r.throwClean === 'elite');
  const cleanThrows = reps.filter(r => r.throwClean === 'yes');
  const badThrows = reps.filter(r => r.throwClean === 'no');
  if (badThrows.length > 0) {
    const badRate = Math.round((badThrows.length / total) * 100);
    insights.push(`${badRate}% of throws were not clean (${badThrows.length}/${total}). Work on accuracy under pressure.`);
  }
  if (eliteThrows.length > 0) {
    insights.push(`${eliteThrows.length} elite throw${eliteThrows.length > 1 ? 's' : ''} this session — great arm action.`);
  }

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

  const balkCount = reps.filter(r => r.balk === 'yes').length;
  const eliteThrows = reps.filter(r => r.throwClean === 'elite').length;
  const cleanThrows = reps.filter(r => r.throwClean === 'yes').length;

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

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{balkCount}</p>
            <p className="text-xs text-muted-foreground">Balks</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{cleanThrows + eliteThrows}</p>
            <p className="text-xs text-muted-foreground">Clean Throws</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{eliteThrows}</p>
            <p className="text-xs text-muted-foreground">Elite Throws</p>
          </CardContent>
        </Card>
      </div>

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
