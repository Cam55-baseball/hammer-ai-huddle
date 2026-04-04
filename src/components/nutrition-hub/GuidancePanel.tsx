import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Target, Leaf, TrendingUp, AlertCircle } from 'lucide-react';
import { useNutritionGuidance } from '@/hooks/useNutritionGuidance';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import { cn } from '@/lib/utils';

interface GuidancePanelProps {
  date: Date;
}

export function GuidancePanel({ date }: GuidancePanelProps) {
  const { t } = useTranslation();
  const { config } = usePerformanceMode();
  const { data: guidance, isLoading } = useNutritionGuidance(date, config.rdaMultiplier);

  if (isLoading || !guidance) return null;

  // Suppressed: single line, no card chrome
  if (guidance.status === 'suppressed') {
    return (
      <p className="text-xs text-muted-foreground italic px-1">
        {guidance.message}
      </p>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary" />
          {t('nutrition.howToImprove', 'How to Improve Your Score')}
        </p>

        {/* Top limiting factors — max 2 */}
        {guidance.limitingFactors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Top Limiting Factors
            </p>
            {guidance.limitingFactors.map((factor, idx) => (
              <div key={factor.key} className="rounded-md bg-muted/50 px-2.5 py-2">
                {idx === 0 && (
                  <p className="text-[9px] font-semibold text-primary uppercase tracking-wider mb-1">
                    Highest impact nutrient to improve score
                  </p>
                )}
                <div className="flex items-center gap-1.5 text-xs">
                  <Target className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="font-medium">{factor.label}</span>
                  <span className={cn(
                    'ml-auto text-[10px] font-semibold',
                    factor.percent < 25 ? 'text-destructive' : 'text-amber-600'
                  )}>
                    {factor.percent}% RDA
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {factor.ptsLabel}
                  </span>
                </div>
                {factor.impact && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-[18px]">
                    {factor.impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Food suggestions — max 2, decision-grade */}
        {guidance.foodSuggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Fastest Path to Improvement
            </p>
            {guidance.foodSuggestions.map((food, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs px-2.5 py-1.5 rounded bg-emerald-500/5">
                <Leaf className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-medium">{food.name}</span>
                  <p className="text-[10px] text-muted-foreground">
                    Fixes {food.nutrients.join(' + ')} · {food.justification}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Max 1 nudge with outcome framing */}
        {guidance.nudges.length > 0 && (
          <div className="pt-1 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-[11px]">
              {guidance.nudges[0].startsWith('+') ? (
                <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
              <span className={cn(
                guidance.nudges[0].startsWith('+') ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
              )}>
                {guidance.nudges[0]}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
