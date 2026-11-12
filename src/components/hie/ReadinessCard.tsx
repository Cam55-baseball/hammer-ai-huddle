import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { Battery, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react';
import { ReadinessChip } from '@/components/hammer/ReadinessChip';

export function ReadinessCard() {
  const { snapshot } = useHIESnapshot();

  if (!snapshot) return null;

  // Owner Nov 12: an unknown score is shown as unknown — never a number, bar or color.
  const score = typeof snapshot.readiness_score === 'number' ? snapshot.readiness_score : null;
  const BatteryIcon = score === null ? Battery : score >= 80 ? BatteryFull : score >= 60 ? BatteryMedium : score >= 40 ? Battery : BatteryLow;
  const color = score === null ? 'text-muted-foreground' : score >= 80 ? 'text-green-500' : score >= 60 ? 'text-blue-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BatteryIcon className={`h-5 w-5 ${color}`} />
          Today's Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {score === null ? (
          <div className="text-lg font-semibold text-muted-foreground" data-testid="readiness-unknown">Readiness unknown</div>
        ) : (
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold ${color}`}>{score}%</div>
            <Progress value={score} className="flex-1 h-3" />
          </div>
        )}
        {snapshot.readiness_recommendation && (
          <p className="text-sm font-medium bg-accent/50 rounded-lg p-3">
            {snapshot.readiness_recommendation}
          </p>
        )}
        {/* Unified Readiness — additive, shows source breakdown */}
        <ReadinessChip variant="expanded" />
      </CardContent>
    </Card>
  );
}

