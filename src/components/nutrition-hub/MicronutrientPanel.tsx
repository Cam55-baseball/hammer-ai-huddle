import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, Atom } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);

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

  // Don't render if no data
  const hasData = aggregated && Object.keys(aggregated).length > 0;
  if (!hasData) return null;

  const entries = Object.entries(RDA).map(([key, rda]) => {
    const current = aggregated?.[key] || 0;
    const percent = Math.min(100, Math.round((current / rda.amount) * 100));
    return { key, ...rda, current: Math.round(current * 10) / 10, percent };
  }).filter(e => e.current > 0);

  if (entries.length === 0) return null;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-violet-500/10">
                <Atom className="h-4 w-4 text-violet-500" />
              </div>
              <span className="text-sm font-medium">
                {t('nutrition.micronutrients', 'Micronutrients')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {entries.length} tracked
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 space-y-3">
            {entries.map(entry => (
              <div key={entry.key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{entry.label}</span>
                  <span className="text-muted-foreground">
                    {entry.current} / {entry.amount} {entry.unit}
                    <span className="ml-1 font-semibold text-foreground">({entry.percent}%)</span>
                  </span>
                </div>
                <Progress
                  value={entry.percent}
                  className="h-1.5"
                />
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
