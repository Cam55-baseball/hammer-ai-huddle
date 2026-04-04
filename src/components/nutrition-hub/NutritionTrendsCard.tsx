import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, BarChart3, Brain, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNutritionTrends, type TrendDirection } from '@/hooks/useNutritionTrends';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import { useNutritionBaseline } from '@/hooks/useNutritionBaseline';

const MICRO_LABELS: Record<string, string> = {
  vitamin_a_mcg: 'Vit A', vitamin_c_mg: 'Vit C', vitamin_d_mcg: 'Vit D',
  vitamin_e_mg: 'Vit E', vitamin_k_mcg: 'Vit K', vitamin_b6_mg: 'B6',
  vitamin_b12_mcg: 'B12', folate_mcg: 'Folate', calcium_mg: 'Calcium',
  iron_mg: 'Iron', magnesium_mg: 'Mag', potassium_mg: 'Potassium', zinc_mg: 'Zinc',
};

const trendIcon = (dir: TrendDirection) => {
  if (dir === 'up') return <TrendingUp className="h-3 w-3 text-emerald-500" />;
  if (dir === 'down') return <TrendingDown className="h-3 w-3 text-destructive" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
};

export function NutritionTrendsCard() {
  const { t } = useTranslation();
  const { config } = usePerformanceMode();
  const { data: trends } = useNutritionTrends(config.rdaMultiplier);
  const { data: baseline } = useNutritionBaseline(config.rdaMultiplier);

  if (!trends || trends.daysAnalyzed < 3) return null;

  if (trends.status === 'insufficient_data') {
    return (
      <Card>
        <CardContent className="p-4 space-y-2">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-primary" />
            {t('nutrition.trends', 'Nutrition Trends')}
          </p>
          <p className="text-[11px] text-muted-foreground italic">
            Trend analysis unavailable — insufficient micronutrient data
          </p>
        </CardContent>
      </Card>
    );
  }

  const topDeficient = trends.trends
    .filter(tr => tr.rdaPercent7 < 75)
    .sort((a, b) => a.rdaPercent7 - b.rdaPercent7)
    .slice(0, 4);

  // Chronically low from baseline
  const chronicLow = baseline?.nutrients.filter(n => n.chronicLow).slice(0, 2) || [];

  const hasContent = topDeficient.length > 0 || trends.predictedRisks.length > 0
    || trends.patterns.length > 0 || trends.nudges.length > 0 || chronicLow.length > 0;

  if (!hasContent) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-primary" />
          {t('nutrition.trends', 'Nutrition Trends')}
          <span className="text-[10px] font-normal text-muted-foreground ml-auto">
            {trends.daysAnalyzed}d analyzed
          </span>
        </p>

        {/* Personal baseline alerts */}
        {chronicLow.length > 0 && (
          <div className="space-y-1">
            {chronicLow.map(n => (
              <div key={n.key} className="flex items-center gap-1.5 rounded-md bg-destructive/5 border border-destructive/20 px-2.5 py-1.5">
                <User className="h-3 w-3 text-destructive/60 shrink-0" />
                <span className="text-[11px] text-destructive">
                  {MICRO_LABELS[n.key] || n.key}: avg {n.avgIntake} ({n.rdaPercent}% RDA) — chronically low
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 7-day micro trends */}
        {topDeficient.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {topDeficient.map(tr => (
              <div key={tr.key} className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5">
                {trendIcon(tr.trend)}
                <span className="text-xs truncate">{tr.label}</span>
                <span className={cn(
                  'text-[10px] font-semibold ml-auto',
                  tr.rdaPercent7 < 25 ? 'text-destructive' : 'text-amber-500'
                )}>
                  {tr.rdaPercent7}%
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Predictive warnings */}
        {trends.predictedRisks.length > 0 && (
          <div className="space-y-1">
            {trends.predictedRisks.map(risk => (
              <div key={risk.key} className="flex items-center gap-1.5 rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                  {risk.label} trending low — risk in {risk.riskDays ?? '3-5'}d
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Behavioral patterns */}
        {trends.patterns.length > 0 && (
          <div className="space-y-1">
            {trends.patterns.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Brain className="h-3 w-3 text-primary/60 shrink-0" />
                {p.pattern}
              </div>
            ))}
          </div>
        )}

        {/* Smart nudges */}
        {trends.nudges.length > 0 && (
          <div className="space-y-1">
            {trends.nudges.map((nudge, i) => (
              <div key={i} className="flex items-center gap-1.5 rounded-md bg-primary/5 px-2.5 py-1.5">
                <Lightbulb className="h-3 w-3 text-primary shrink-0" />
                <span className="text-[11px] font-medium">{nudge.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Frequently missed */}
        {trends.frequentlyMissed.length > 0 && (
          <p className="text-[10px] text-muted-foreground">
            Consistently low: {trends.frequentlyMissed.join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
