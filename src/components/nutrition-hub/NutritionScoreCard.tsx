import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHydration } from '@/hooks/useHydration';
import { cn } from '@/lib/utils';

const MICRO_KEYS = [
  'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg',
  'vitamin_k_mcg', 'vitamin_b6_mg', 'vitamin_b12_mcg', 'folate_mcg',
  'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg',
];

const RDA: Record<string, number> = {
  vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 15, vitamin_e_mg: 15,
  vitamin_k_mcg: 120, vitamin_b6_mg: 1.3, vitamin_b12_mcg: 2.4, folate_mcg: 400,
  calcium_mg: 1000, iron_mg: 8, magnesium_mg: 420, potassium_mg: 2600, zinc_mg: 11,
};

interface NutritionScoreCardProps {
  date?: Date;
}

export function NutritionScoreCard({ date }: NutritionScoreCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { qualityPercent, progress: hydrationProgress } = useHydration();
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const { data: score } = useQuery({
    queryKey: ['nutritionScore', dateStr, user?.id, qualityPercent, hydrationProgress],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros, calories, protein_g, carbs_g, fats_g, meal_title')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // 1. Micronutrient completeness (40%)
      const microTotals: Record<string, number> = {};
      for (const log of data) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') microTotals[k] = (microTotals[k] || 0) + v;
        }
      }
      const microsMeetingRda = MICRO_KEYS.filter(
        k => (microTotals[k] || 0) >= RDA[k] * 0.5
      ).length;
      const microScore = (microsMeetingRda / 13) * 40;

      // 2. Hydration quality (20%)
      const hydrationScore = (qualityPercent / 100) * 20;

      // 3. Macro balance (25%) — ratio closeness to 30/40/30 P/C/F
      const totalP = data.reduce((s, l) => s + (l.protein_g || 0), 0);
      const totalC = data.reduce((s, l) => s + (l.carbs_g || 0), 0);
      const totalF = data.reduce((s, l) => s + (l.fats_g || 0), 0);
      const totalCal = totalP * 4 + totalC * 4 + totalF * 9;
      let macroScore = 0;
      if (totalCal > 0) {
        const pRatio = (totalP * 4) / totalCal;
        const cRatio = (totalC * 4) / totalCal;
        const fRatio = (totalF * 9) / totalCal;
        const pDev = Math.abs(pRatio - 0.30);
        const cDev = Math.abs(cRatio - 0.40);
        const fDev = Math.abs(fRatio - 0.30);
        const avgDev = (pDev + cDev + fDev) / 3;
        macroScore = Math.max(0, (1 - avgDev * 3)) * 25;
      }

      // 4. Variety (15%)
      const uniqueFoods = new Set(data.map(l => l.meal_title).filter(Boolean));
      const varietyScore = Math.min(uniqueFoods.size / 4, 1) * 15;

      const total = Math.round(microScore + hydrationScore + macroScore + varietyScore);

      return {
        total,
        breakdown: {
          micro: Math.round(microScore),
          hydration: Math.round(hydrationScore),
          macro: Math.round(macroScore),
          variety: Math.round(varietyScore),
        },
      };
    },
    enabled: !!user,
  });

  if (!score) return null;

  const colorClass = score.total >= 70
    ? 'text-emerald-500'
    : score.total >= 40
      ? 'text-amber-500'
      : 'text-destructive';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full border-4',
            score.total >= 70 ? 'border-emerald-500/30' : score.total >= 40 ? 'border-amber-500/30' : 'border-destructive/30'
          )}>
            <span className={cn('text-xl font-bold', colorClass)}>{score.total}</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-primary" />
              {t('nutrition.nutritionScore', 'Nutrition Score')}
            </p>
            <div className="grid grid-cols-4 gap-1 mt-1.5">
              {([
                ['Micros', score.breakdown.micro, 40],
                ['Hydration', score.breakdown.hydration, 20],
                ['Macros', score.breakdown.macro, 25],
                ['Variety', score.breakdown.variety, 15],
              ] as [string, number, number][]).map(([label, val, max]) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-semibold">{val}/{max}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
