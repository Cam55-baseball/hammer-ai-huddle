import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Droplets, Sparkles, AlertTriangle } from 'lucide-react';
import { useHydration } from '@/hooks/useHydration';

export function HydrationQualityBreakdown() {
  const { t } = useTranslation();
  const { todayTotal, qualityTotal, fillerTotal, qualityPercent } = useHydration();

  if (todayTotal === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-500" />
            {t('nutrition.hydrationQuality', 'Hydration Quality')}
          </p>
          <span className="text-xs text-muted-foreground">{todayTotal} oz total</span>
        </div>

        {/* Quality bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Quality: {qualityTotal} oz
            </span>
            <span className="font-semibold">{qualityPercent}%</span>
          </div>
          <Progress value={qualityPercent} className="h-2" />
        </div>

        {/* Filler indicator */}
        {fillerTotal > 0 && (
          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Filler: {fillerTotal} oz
            </span>
            <span>{100 - qualityPercent}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
