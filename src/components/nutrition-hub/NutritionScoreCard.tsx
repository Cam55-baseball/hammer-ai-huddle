import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Zap, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHydration } from '@/hooks/useHydration';
import { usePerformanceMode } from '@/hooks/usePerformanceMode';
import { useNutritionBaseline } from '@/hooks/useNutritionBaseline';
import { useNutritionConsistency } from '@/hooks/useNutritionConsistency';
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

const CONFIDENCE_WEIGHT: Record<string, number> = {
  high: 1.0, medium: 0.7, low: 0.4,
};

interface NutritionScoreCardProps {
  date?: Date;
}

export function NutritionScoreCard({ date }: NutritionScoreCardProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { qualityPercent, progress: hydrationProgress } = useHydration();
  const { performanceMode, config } = usePerformanceMode();
  const { data: baseline } = useNutritionBaseline(config.rdaMultiplier);
  const { data: consistency } = useNutritionConsistency(config.rdaMultiplier);
  const dateStr = format(date || new Date(), 'yyyy-MM-dd');

  const { data: score } = useQuery({
    queryKey: ['nutritionScore', dateStr, user?.id, qualityPercent, hydrationProgress, performanceMode, baseline?.adaptiveMultipliers],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros, calories, protein_g, carbs_g, fats_g, meal_title, data_confidence, data_source, logged_at')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      if (error) throw error;
      if (!data || data.length === 0) return null;

      const confidenceValues = data.map((l: any) => CONFIDENCE_WEIGHT[l.data_confidence || 'medium'] || 0.7);
      const avgConfidenceWeight = confidenceValues.reduce((a: number, b: number) => a + b, 0) / confidenceValues.length;
      const allLowConfidence = confidenceValues.every((v: number) => v <= 0.4);

      // Data coverage: count meals with actual micro data
      const mealsWithMicros = data.filter((l: any) => {
        const m = l.micros as Record<string, number> | null;
        return m && Object.keys(m).length > 0;
      }).length;
      const totalMeals = data.length;
      const microCoverage = totalMeals > 0 ? mealsWithMicros / totalMeals : 0;

      // 1. Micronutrient completeness with adaptive weighting
      const microTotals: Record<string, number> = {};
      for (const log of data) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') microTotals[k] = (microTotals[k] || 0) + v;
        }
      }
      const adaptiveMultipliers = baseline?.adaptiveMultipliers || {};
      let weightedMet = 0;
      let totalWeight = 0;
      for (const k of MICRO_KEYS) {
        const weight = adaptiveMultipliers[k] || 1.0;
        totalWeight += weight;
        if ((microTotals[k] || 0) >= RDA[k] * config.rdaMultiplier * 0.5) {
          weightedMet += weight;
        }
      }
      // Apply coverage factor: partial micro data = reduced micro score
      const microScore = (weightedMet / totalWeight) * config.microWeight * avgConfidenceWeight * microCoverage;

      // 2. Hydration quality
      const hydrationScore = (qualityPercent / 100) * config.hydrationWeight;

      // 3. Macro balance
      const totalP = data.reduce((s, l) => s + (l.protein_g || 0), 0);
      const totalC = data.reduce((s, l) => s + (l.carbs_g || 0), 0);
      const totalF = data.reduce((s, l) => s + (l.fats_g || 0), 0);
      const totalCal = totalP * 4 + totalC * 4 + totalF * 9;
      let macroScore = 0;
      if (totalCal > 0) {
        const pDev = Math.abs((totalP * 4) / totalCal - 0.30);
        const cDev = Math.abs((totalC * 4) / totalCal - 0.40);
        const fDev = Math.abs((totalF * 9) / totalCal - 0.30);
        macroScore = Math.max(0, (1 - ((pDev + cDev + fDev) / 3) * config.macroDeviationPenalty)) * config.macroWeight;
      }

      // 4. Variety
      const uniqueFoods = new Set(data.map(l => l.meal_title).filter(Boolean));
      const varietyScore = Math.min(uniqueFoods.size / 4, 1) * config.varietyWeight;

      // 5. Optimization sub-score (bonus up to 5 pts)
      let optimizationBonus = 0;
      if (data.length >= 2) {
        const sorted = [...data].sort((a, b) => (a.logged_at || '').localeCompare(b.logged_at || ''));
        const midpoint = Math.floor(sorted.length / 2);
        const firstHalf = sorted.slice(0, midpoint);
        const secondHalf = sorted.slice(midpoint);
        const firstMicros: Record<string, number> = {};
        const secondMicros: Record<string, number> = {};
        for (const log of firstHalf) {
          const m = log.micros as Record<string, number> | null;
          if (m) for (const [k, v] of Object.entries(m)) if (typeof v === 'number') firstMicros[k] = (firstMicros[k] || 0) + v;
        }
        for (const log of secondHalf) {
          const m = log.micros as Record<string, number> | null;
          if (m) for (const [k, v] of Object.entries(m)) if (typeof v === 'number') secondMicros[k] = (secondMicros[k] || 0) + v;
        }
        let improved = 0;
        let deficientFirst = 0;
        for (const key of MICRO_KEYS) {
          const rda = RDA[key] * config.rdaMultiplier;
          if ((firstMicros[key] || 0) < rda * 0.3) {
            deficientFirst++;
            if ((secondMicros[key] || 0) > (firstMicros[key] || 0) * 0.5) improved++;
          }
        }
        if (deficientFirst > 0) optimizationBonus = Math.round((improved / deficientFirst) * 5);
      }

      let total = Math.round(microScore + hydrationScore + macroScore + varietyScore + optimizationBonus);
      total = Math.min(total, 100);
      if (allLowConfidence && total > 60) total = 60;

      return {
        total,
        confidenceLabel: allLowConfidence ? 'low' : avgConfidenceWeight >= 0.85 ? 'high' : 'medium',
        microCoverage: { withMicros: mealsWithMicros, total: totalMeals },
        breakdown: {
          micro: Math.round(microScore),
          hydration: Math.round(hydrationScore),
          macro: Math.round(macroScore),
          variety: Math.round(varietyScore),
          optimization: optimizationBonus,
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

  const confidenceBadge = score.confidenceLabel === 'high'
    ? { text: 'Verified', cls: 'text-emerald-600 bg-emerald-500/10' }
    : score.confidenceLabel === 'low'
      ? { text: 'Low Confidence', cls: 'text-destructive bg-destructive/10' }
      : { text: 'Estimated', cls: 'text-amber-600 bg-amber-500/10' };

  const breakdownItems: [string, number, number][] = [
    ['Micros', score.breakdown.micro, config.microWeight],
    ['Hydration', score.breakdown.hydration, config.hydrationWeight],
    ['Macros', score.breakdown.macro, config.macroWeight],
    ['Variety', score.breakdown.variety, config.varietyWeight],
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full border-4 shrink-0',
            score.total >= 70 ? 'border-emerald-500/30' : score.total >= 40 ? 'border-amber-500/30' : 'border-destructive/30'
          )}>
            <span className={cn('text-xl font-bold', colorClass)}>{score.total}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Trophy className="h-4 w-4 text-primary" />
                {t('nutrition.nutritionScore', 'Nutrition Score')}
              </p>
              {performanceMode && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-0.5">
                  <Zap className="h-2.5 w-2.5" />
                  PRO
                </span>
              )}
              <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap', confidenceBadge.cls)}>
                {confidenceBadge.text}
              </span>
              {score.microCoverage && (
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap',
                  score.microCoverage.withMicros === score.microCoverage.total
                    ? 'text-emerald-600 bg-emerald-500/10'
                    : score.microCoverage.withMicros === 0
                      ? 'text-destructive bg-destructive/10'
                      : 'text-amber-600 bg-amber-500/10'
                )}>
                  {score.microCoverage.withMicros}/{score.microCoverage.total}
                  <span className="hidden sm:inline"> verified</span>
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
              {breakdownItems.map(([label, val, max]) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-semibold">{val}/{max}</p>
                </div>
              ))}
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Optim</p>
                <p className="text-xs font-semibold">{score.breakdown.optimization}/5</p>
              </div>
            </div>
            {/* Score reduction explanation */}
            {score.microCoverage && score.microCoverage.withMicros < score.microCoverage.total && (
              <p className="text-[10px] text-muted-foreground italic mt-1">
                Score reduced: {score.microCoverage.total - score.microCoverage.withMicros}/{score.microCoverage.total} meals lack micronutrient data
              </p>
            )}
            {/* Consistency badge */}
            {consistency && consistency.daysAnalyzed >= 3 && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <BarChart3 className="h-3 w-3 text-primary/60" />
                {consistency.score !== null ? (
                  <>
                    <span className="text-[10px] text-muted-foreground">
                      14-day consistency:
                    </span>
                    <span className={cn(
                      'text-[10px] font-semibold',
                      consistency.score >= 70 ? 'text-emerald-500' : consistency.score >= 40 ? 'text-amber-500' : 'text-destructive'
                    )}>
                      {consistency.score}
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">
                    Consistency unavailable — insufficient micronutrient data
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
