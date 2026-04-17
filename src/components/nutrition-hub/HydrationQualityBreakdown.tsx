import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Droplets, Gauge } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';
import { TIER_LABEL, TIER_TEXT_CLASS } from '@/utils/hydrationScoring';
import { cn } from '@/lib/utils';
import { HydrationLogCard } from './HydrationLogCard';

export function HydrationQualityBreakdown() {
  const { t } = useTranslation();
  const {
    todayLogs,
    todayTotal,
    dailyAverageScore,
    dailyTier,
    totalSodiumMg,
    totalPotassiumMg,
    totalMagnesiumMg,
    totalSugarG,
    progress,
    deleteLog,
  } = useHydration();

  if (todayTotal === 0) return null;

  const tierColor = TIER_TEXT_CLASS[dailyTier];
  const hasScored = dailyAverageScore > 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            {t('nutrition.hydrationQuality', 'Hydration Quality')}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{todayTotal} oz</span>
            {hasScored && (
              <span className={cn('flex items-center gap-0.5 text-xs font-bold', tierColor)}>
                <Gauge className="h-3 w-3" />
                {dailyAverageScore}
              </span>
            )}
          </div>
        </div>

        {/* Daily average score bar */}
        {hasScored ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1">
                <Gauge className={cn('h-3 w-3', tierColor)} />
                <span>Avg Hydration Score</span>
              </span>
              <span className={cn('font-semibold', tierColor)}>
                {dailyAverageScore} · {TIER_LABEL[dailyTier]}
              </span>
            </div>
            <Progress value={dailyAverageScore} className="h-2" />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Logged volume only — switch to a tracked beverage type to see your hydration score.
          </p>
        )}

        {/* Aggregate breakdown */}
        <div className="grid grid-cols-4 gap-1.5 text-[10px] pt-1">
          <Cell label="Volume"   value={`${Math.round(todayTotal)} oz`} />
          <Cell label="Sodium"   value={`${Math.round(totalSodiumMg)}mg`} />
          <Cell label="Potassium" value={`${Math.round(totalPotassiumMg)}mg`} />
          <Cell label="Sugar"    value={`${totalSugarG.toFixed(1)}g`} />
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>Magnesium: {Math.round(totalMagnesiumMg)}mg</span>
          <span>Goal progress: {Math.round(progress)}%</span>
        </div>

        {/* Per-drink hydration logs with scores */}
        {todayLogs.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground">
              {t('nutrition.todayDrinks', "Today's drinks")} ({todayLogs.length})
            </p>
            <div className="space-y-2">
              {todayLogs.map(log => (
                <HydrationLogCard
                  key={log.id}
                  log={log as any}
                  onDelete={deleteLog}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-muted/50 px-1.5 py-1 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}
