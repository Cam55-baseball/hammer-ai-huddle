import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, AlertCircle, TrendingUp, Target, Leaf } from 'lucide-react';
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

  // Suppressed state
  if (guidance.status === 'suppressed') {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-muted-foreground" />
            {t('nutrition.howToImprove', 'How to Improve Your Score')}
          </p>
          <p className="text-xs text-muted-foreground italic mt-1.5">
            {guidance.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-primary" />
          {t('nutrition.howToImprove', 'How to Improve Your Score')}
        </p>

        {/* Top limiting factors */}
        {guidance.limitingFactors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Top Limiting Factors
            </p>
            {guidance.limitingFactors.map((factor, idx) => (
              <div key={factor.key} className="rounded-md bg-muted/50 px-2.5 py-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <Target className="h-3 w-3 text-amber-500 shrink-0" />
                  <span className="font-medium">{factor.label}</span>
                  <span className={cn(
                    'ml-auto text-[10px] font-semibold',
                    factor.percent < 25 ? 'text-destructive' : 'text-amber-600'
                  )}>
                    {factor.percent}% RDA
                  </span>
                </div>
                {factor.impact && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 ml-[18px]">
                    → {factor.impact}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Food suggestions */}
        {guidance.foodSuggestions.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Fastest Path to Improvement
            </p>
            {guidance.foodSuggestions.map((food, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded bg-emerald-500/5">
                <Leaf className="h-3 w-3 text-emerald-500 shrink-0" />
                <span>{food.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Nudges */}
        {guidance.nudges.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-border/50">
            {guidance.nudges.map((nudge, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                {nudge.startsWith('+') ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  nudge.startsWith('+') ? 'text-emerald-600 font-medium' : 'text-muted-foreground'
                )}>
                  {nudge}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
