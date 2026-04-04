import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Atom } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

/**
 * USDA Recommended Daily Allowances (adults 19-50, general)
 */
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

interface MicronutrientPanelProps {
  date?: Date;
}

export function MicronutrientPanel({ date }: MicronutrientPanelProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const { data: aggregated } = useQuery({
    queryKey: ['micronutrients', dateStr, user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      if (error) throw error;

      // Aggregate all micros from all meals
      const totals: Record<string, number> = {};
      for (const log of data || []) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        for (const [key, val] of Object.entries(micros)) {
          if (typeof val === 'number' && val > 0) {
            totals[key] = (totals[key] || 0) + val;
          }
        }
      }

      return totals;
    },
    enabled: !!user,
  });

  const hasAnyData = aggregated && Object.keys(aggregated).length > 0;

  // Always show all 13 nutrients
  const entries = Object.entries(RDA).map(([key, rda]) => {
    const current = aggregated?.[key] || 0;
    const percent = Math.min(100, Math.round((current / rda.amount) * 100));
    return { key, ...rda, current: Math.round(current * 10) / 10, percent };
  });

  return (
    <Card>
      <div className="p-4 flex items-center gap-2">
        <div className="p-1.5 rounded-md bg-violet-500/10">
          <Atom className="h-4 w-4 text-violet-500" />
        </div>
        <span className="text-sm font-medium">
          {t('nutrition.micronutrients', 'Micronutrients')}
        </span>
        <span className="text-xs text-muted-foreground ml-auto">
          {hasAnyData
            ? `${entries.filter(e => e.current > 0).length}/13 tracked`
            : 'No data'
          }
        </span>
      </div>

      <CardContent className="pt-0 pb-4 space-y-3">
        {!hasAnyData ? (
          <p className="text-xs text-muted-foreground italic text-center py-3">
            No micronutrient data available — log verified foods to track
          </p>
        ) : (
          entries.map(entry => (
            <div key={entry.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", entry.current === 0 && "text-muted-foreground")}>
                  {entry.label}
                </span>
                <span className={cn(
                  entry.current === 0 ? "text-muted-foreground/50" : "text-muted-foreground"
                )}>
                  {entry.current} / {entry.amount} {entry.unit}
                  <span className={cn(
                    "ml-1 font-semibold",
                    entry.current === 0 ? "text-muted-foreground/50" : "text-foreground"
                  )}>
                    ({entry.percent}%)
                  </span>
                </span>
              </div>
              <Progress
                value={entry.percent}
                className={cn("h-1.5", entry.current === 0 && "opacity-30")}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
