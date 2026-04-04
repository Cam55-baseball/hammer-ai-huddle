import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, TrendingDown, Lightbulb, Check, X, Pill } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import { useNutritionTrends } from '@/hooks/useNutritionTrends';
import { useNutritionBaseline } from '@/hooks/useNutritionBaseline';
import { useSuggestionLearning } from '@/hooks/useSuggestionLearning';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NUTRIENT_IMPACT } from '@/constants/nutrientPerformanceMap';

const RDA: Record<string, { amount: number; unit: string; label: string }> = {
  vitamin_a_mcg: { amount: 900, unit: 'mcg', label: 'Vitamin A' },
  vitamin_c_mg: { amount: 90, unit: 'mg', label: 'Vitamin C' },
  vitamin_d_mcg: { amount: 15, unit: 'mcg', label: 'Vitamin D' },
  vitamin_e_mg: { amount: 15, unit: 'mg', label: 'Vitamin E' },
  vitamin_k_mcg: { amount: 120, unit: 'mcg', label: 'Vitamin K' },
  vitamin_b6_mg: { amount: 1.3, unit: 'mg', label: 'Vitamin B6' },
  vitamin_b12_mcg: { amount: 2.4, unit: 'mcg', label: 'Vitamin B12' },
  folate_mcg: { amount: 400, unit: 'mcg', label: 'Folate' },
  calcium_mg: { amount: 1000, unit: 'mg', label: 'Calcium' },
  iron_mg: { amount: 8, unit: 'mg', label: 'Iron' },
  magnesium_mg: { amount: 420, unit: 'mg', label: 'Magnesium' },
  potassium_mg: { amount: 2600, unit: 'mg', label: 'Potassium' },
  zinc_mg: { amount: 11, unit: 'mg', label: 'Zinc' },
};

type Level = 'deficient' | 'low' | 'optimal' | 'excess';

function getLevel(percent: number): Level {
  if (percent < 25) return 'deficient';
  if (percent < 75) return 'low';
  if (percent <= 150) return 'optimal';
  return 'excess';
}

const levelConfig: Record<Level, { color: string; bg: string }> = {
  deficient: { color: 'text-destructive', bg: 'bg-destructive/10' },
  low: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
  optimal: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
  excess: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
};

interface DeficiencyAlertProps {
  date?: Date;
}

export function DeficiencyAlert({ date }: DeficiencyAlertProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { config } = usePerformanceMode();
  const { data: trendData } = useNutritionTrends(config.rdaMultiplier);
  const { data: baseline } = useNutritionBaseline(config.rdaMultiplier);
  const { getPersonalizedRanking, trackInteraction } = useSuggestionLearning();
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const { data: alerts } = useQuery({
    queryKey: ['deficiencyAlerts', dateStr, user?.id, config.rdaMultiplier, baseline?.adaptiveMultipliers],
    queryFn: async () => {
      if (!user) return null;

      // Fetch logs with supplements info
      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros, supplements')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      if (error) throw error;

      const totals: Record<string, number> = {};
      for (const log of data || []) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') totals[k] = (totals[k] || 0) + v;
        }
      }

      if (Object.keys(totals).length === 0) return null;

      const adaptiveMultipliers = baseline?.adaptiveMultipliers || {};

      const alertItems = Object.entries(RDA).map(([key, rda]) => {
        const adjustedRda = rda.amount * config.rdaMultiplier;
        const current = totals[key] || 0;
        const percent = Math.round((current / adjustedRda) * 100);
        const level = getLevel(percent);
        const priority = adaptiveMultipliers[key] || 1.0;
        return { key, label: rda.label, percent, level, current: Math.round(current * 10) / 10, rda: adjustedRda, unit: rda.unit, priority };
      });

      const issues = alertItems
        .filter(a => a.level === 'deficient' || a.level === 'low')
        .sort((a, b) => {
          // Sort by severity × priority multiplier
          const severityA = a.level === 'deficient' ? 2 : 1;
          const severityB = b.level === 'deficient' ? 2 : 1;
          return (severityB * b.priority) - (severityA * a.priority);
        })
        .slice(0, 2); // Priority engine: top 2 only

      if (issues.length === 0) return null;

      // Fetch personalized food suggestions
      const issuesWithSuggestions = await Promise.all(
        issues.map(async (issue) => {
          try {
            const { data: foods } = await supabase
              .from('nutrition_food_database')
              .select('*')
              .gt(issue.key, 0)
              .order(issue.key, { ascending: false })
              .limit(5);

            const ranked = getPersonalizedRanking(
              issue.key,
              (foods || []).map((f: any) => ({ name: f.name, ...f }))
            );
            const suggestions = ranked.slice(0, 3).map((f: any) => f.name);
            return { ...issue, suggestions };
          } catch {
            return { ...issue, suggestions: [] as string[] };
          }
        })
      );

      return issuesWithSuggestions;
    },
    enabled: !!user,
  });

  const predictedRisks = trendData?.predictedRisks?.filter(
    r => !alerts?.some(a => a.key === r.key)
  ) || [];

  if ((!alerts || alerts.length === 0) && predictedRisks.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            {t('nutrition.deficiencyAlerts', 'Nutrient Alerts')}
          </p>
          <p className="text-xs text-muted-foreground italic mt-1.5">
            Nutrient analysis unavailable — no micronutrient data logged today
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleAccept = (nutrientKey: string, foodName: string) => {
    trackInteraction(nutrientKey, foodName, 'accepted');
  };

  const handleDismiss = (nutrientKey: string, foodName: string) => {
    trackInteraction(nutrientKey, foodName, 'dismissed');
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-amber-500" />
          {t('nutrition.deficiencyAlerts', 'Nutrient Alerts')}
          {baseline && (
            <span className="text-[10px] font-normal text-muted-foreground ml-auto">
              Personalized
            </span>
          )}
        </p>

        {/* Current day alerts */}
        {alerts && alerts.length > 0 && (
          <div className="space-y-1.5">
            {alerts.map(item => {
              const cfg = levelConfig[item.level];
              return (
                <div key={item.key} className={cn('rounded-md px-2.5 py-1.5', cfg.bg)}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={cn('font-medium flex items-center gap-1', cfg.color)}>
                      {item.level === 'deficient' ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 opacity-50" />
                      )}
                      {item.label}
                      {(item as any).priority > 1 && (
                        <span className="text-[9px] bg-amber-500/20 px-1 rounded">priority</span>
                      )}
                    </span>
                    <span className={cn('font-semibold', cfg.color)}>
                      {item.percent}% RDA ({item.current}{item.unit})
                    </span>
                  </div>
                  {item.suggestions && item.suggestions.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {item.suggestions.map((food, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Lightbulb className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                          <span className="flex-1 truncate">{food}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={() => handleAccept(item.key, food)}
                          >
                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4 p-0"
                            onClick={() => handleDismiss(item.key, food)}
                          >
                            <X className="h-2.5 w-2.5 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Predictive risk alerts */}
        {predictedRisks.length > 0 && (
          <div className="space-y-1.5 mt-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Predicted Risks
            </p>
            {predictedRisks.map(risk => (
              <div key={risk.key} className="rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-2.5 py-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <TrendingDown className="h-3 w-3" />
                    {risk.label}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400">
                    ~{risk.riskDays ?? '3-5'}d risk
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  7-day avg: {risk.rdaPercent7}% RDA — trending down
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
