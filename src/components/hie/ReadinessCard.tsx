import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useHIESnapshot } from '@/hooks/useHIESnapshot';
import { Battery, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react';
import { ReadinessChip } from '@/components/hammer/ReadinessChip';

export function ReadinessCard() {
  const { snapshot } = useHIESnapshot();

  if (!snapshot) return null;

  const score = snapshot.readiness_score;
  const BatteryIcon = score >= 80 ? BatteryFull : score >= 60 ? BatteryMedium : score >= 40 ? Battery : BatteryLow;
  const color = score >= 80 ? 'text-green-500' : score >= 60 ? 'text-blue-500' : score >= 40 ? 'text-yellow-500' : 'text-red-500';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BatteryIcon className={`h-5 w-5 ${color}`} />
          Today's Readiness
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4">
          <div className={`text-3xl font-bold ${color}`}>{score}%</div>
          <Progress value={score} className="flex-1 h-3" />
        </div>
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

