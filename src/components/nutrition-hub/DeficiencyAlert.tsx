import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, TrendingDown, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const RDA: Record<string, { amount: number; unit: string; label: string; dbColumn: string }> = {
  vitamin_a_mcg: { amount: 900, unit: 'mcg', label: 'Vitamin A', dbColumn: 'vitamin_a_mcg' },
  vitamin_c_mg: { amount: 90, unit: 'mg', label: 'Vitamin C', dbColumn: 'vitamin_c_mg' },
  vitamin_d_mcg: { amount: 15, unit: 'mcg', label: 'Vitamin D', dbColumn: 'vitamin_d_mcg' },
  vitamin_e_mg: { amount: 15, unit: 'mg', label: 'Vitamin E', dbColumn: 'vitamin_e_mg' },
  vitamin_k_mcg: { amount: 120, unit: 'mcg', label: 'Vitamin K', dbColumn: 'vitamin_k_mcg' },
  vitamin_b6_mg: { amount: 1.3, unit: 'mg', label: 'Vitamin B6', dbColumn: 'vitamin_b6_mg' },
  vitamin_b12_mcg: { amount: 2.4, unit: 'mcg', label: 'Vitamin B12', dbColumn: 'vitamin_b12_mcg' },
  folate_mcg: { amount: 400, unit: 'mcg', label: 'Folate', dbColumn: 'folate_mcg' },
  calcium_mg: { amount: 1000, unit: 'mg', label: 'Calcium', dbColumn: 'calcium_mg' },
  iron_mg: { amount: 8, unit: 'mg', label: 'Iron', dbColumn: 'iron_mg' },
  magnesium_mg: { amount: 420, unit: 'mg', label: 'Magnesium', dbColumn: 'magnesium_mg' },
  potassium_mg: { amount: 2600, unit: 'mg', label: 'Potassium', dbColumn: 'potassium_mg' },
  zinc_mg: { amount: 11, unit: 'mg', label: 'Zinc', dbColumn: 'zinc_mg' },
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
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const { data: alerts } = useQuery({
    queryKey: ['deficiencyAlerts', dateStr, user?.id],
    queryFn: async () => {
      if (!user) return null;

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

      // Build alerts and fetch suggestions for deficient/low nutrients
      const alertItems = Object.entries(RDA).map(([key, rda]) => {
        const current = totals[key] || 0;
        const percent = Math.round((current / rda.amount) * 100);
        const level = getLevel(percent);
        return { key, label: rda.label, percent, level, current: Math.round(current * 10) / 10, rda: rda.amount, unit: rda.unit, dbColumn: rda.dbColumn };
      });

      const issues = alertItems.filter(a => a.level === 'deficient' || a.level === 'low');
      if (issues.length === 0) return null;

      // Fetch corrective food suggestions for each deficient nutrient (top 3 from DB)
      const issuesWithSuggestions = await Promise.all(
        issues.map(async (issue) => {
          try {
            const { data: foods } = await supabase
              .from('nutrition_food_database')
              .select(`name, ${issue.dbColumn}`)
              .gt(issue.dbColumn, 0)
              .order(issue.dbColumn, { ascending: false })
              .limit(3);

            const suggestions = (foods || []).map((f: any) => f.name);
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

  if (!alerts || alerts.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingDown className="h-4 w-4 text-amber-500" />
          {t('nutrition.deficiencyAlerts', 'Nutrient Alerts')}
        </p>
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
                  </span>
                  <span className={cn('font-semibold', cfg.color)}>
                    {item.percent}% RDA ({item.current}{item.unit})
                  </span>
                </div>
                {item.suggestions && item.suggestions.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Lightbulb className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                    Try: {item.suggestions.join(', ')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
