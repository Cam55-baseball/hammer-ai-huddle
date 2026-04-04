import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NUTRIENT_IMPACT_ACTIVE } from '@/constants/nutrientPerformanceMap';

const RDA: Record<string, number> = {
  vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 15, vitamin_e_mg: 15,
  vitamin_k_mcg: 120, vitamin_b6_mg: 1.3, vitamin_b12_mcg: 2.4, folate_mcg: 400,
  calcium_mg: 1000, iron_mg: 8, magnesium_mg: 420, potassium_mg: 2600, zinc_mg: 11,
};

const MICRO_WEIGHT = 40; // micro dimension weight in scoring
const NUTRIENT_COUNT = 13;

export interface LimitingFactor {
  key: string;
  label: string;
  percent: number;
  impact: string;
  ptsRecoverable: number;
  ptsLabel: string;
}

export interface GuidanceFood {
  name: string;
  nutrients: string[];
  justification: string;
}

export interface NutritionGuidance {
  status: 'active' | 'suppressed';
  message?: string;
  limitingFactors: LimitingFactor[];
  foodSuggestions: GuidanceFood[];
  nudges: string[];
}

export function useNutritionGuidance(date: Date, rdaMultiplier: number = 1.0) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const dateStr = format(date, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(date, 1), 'yyyy-MM-dd');

  return useQuery<NutritionGuidance>({
    queryKey: ['nutritionGuidance', dateStr, user?.id, rdaMultiplier],
    queryFn: async (): Promise<NutritionGuidance> => {
      if (!user) return { status: 'suppressed', message: 'Not authenticated', limitingFactors: [], foodSuggestions: [], nudges: [] };

      const { data: logs, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros, data_confidence, data_source, supplements')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      if (error) throw error;
      if (!logs || logs.length === 0) {
        return { status: 'suppressed', message: 'No meals logged today', limitingFactors: [], foodSuggestions: [], nudges: [] };
      }

      const mealsWithMicros = logs.filter((l: any) => {
        const m = l.micros as Record<string, number> | null;
        return m && Object.keys(m).length > 0;
      }).length;

      if (mealsWithMicros === 0) {
        return {
          status: 'suppressed',
          message: 'Guidance unavailable — log verified foods to unlock',
          limitingFactors: [],
          foodSuggestions: [],
          nudges: [],
        };
      }

      // Aggregate micros
      const totals: Record<string, number> = {};
      for (const log of logs) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') totals[k] = (totals[k] || 0) + v;
        }
      }

      // Get baseline adaptive multipliers if available
      const baselineData = queryClient.getQueryData(['nutritionBaseline']) as any;
      const adaptiveMultipliers: Record<string, number> = baselineData?.adaptiveMultipliers || {};

      // Score-impact ranking: (100 - percent) * MICRO_WEIGHT / NUTRIENT_COUNT * priority
      const nutrientScores = Object.entries(RDA).map(([key, rda]) => {
        const current = totals[key] || 0;
        const adjustedRda = rda * rdaMultiplier;
        const percent = Math.min(100, Math.round((current / adjustedRda) * 100));
        const priority = adaptiveMultipliers[key] || 1.0;
        const gap = 100 - percent;
        const ptsRecoverable = Math.round((gap * MICRO_WEIGHT / NUTRIENT_COUNT) * priority) / 100;
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          .replace(/ Mcg$/, '').replace(/ Mg$/, '');
        return {
          key,
          label,
          percent,
          impact: NUTRIENT_IMPACT_ACTIVE[key] || '',
          ptsRecoverable: Math.round(ptsRecoverable * 10) / 10,
        };
      });

      // Rank by score impact (pts recoverable), take top 2
      const limitingFactors = nutrientScores
        .filter(n => n.percent < 75)
        .sort((a, b) => b.ptsRecoverable - a.ptsRecoverable)
        .slice(0, 2);

      // Fetch food suggestions — max 2, with dual-benefit detection
      let foodSuggestions: GuidanceFood[] = [];
      if (limitingFactors.length > 0) {
        const topKey = limitingFactors[0].key;
        const secondKey = limitingFactors.length > 1 ? limitingFactors[1].key : null;
        const selectCols = secondKey ? `name, ${topKey}, ${secondKey}` : `name, ${topKey}`;

        try {
          const { data: foods } = await supabase
            .from('nutrition_food_database')
            .select(selectCols)
            .gt(topKey, 0)
            .order(topKey, { ascending: false })
            .limit(5);

          if (foods && foods.length > 0) {
            // Check for dual-benefit foods first
            const dualBenefit = secondKey
              ? foods.filter((f: any) => f[secondKey] > 0)
              : [];

            if (dualBenefit.length > 0) {
              const best = dualBenefit[0] as any;
              foodSuggestions.push({
                name: best.name,
                nutrients: [limitingFactors[0].label, limitingFactors[1]?.label].filter(Boolean),
                justification: 'Highest combined density per serving',
              });
            }

            // Fill remaining slots (max 2 total)
            for (const f of foods as any[]) {
              if (foodSuggestions.length >= 2) break;
              if (foodSuggestions.some(s => s.name === f.name)) continue;
              foodSuggestions.push({
                name: f.name,
                nutrients: [limitingFactors[0].label],
                justification: 'Fastest single-source correction',
              });
            }
          }
        } catch {
          // Non-blocking
        }
      }

      // Max 1 nudge — priority: progress > coverage > consistency
      const nudges: string[] = [];
      const microCoverageRatio = mealsWithMicros / logs.length;

      // Yesterday comparison (highest priority nudge)
      try {
        const { data: yesterdayLogs } = await supabase
          .from('vault_nutrition_logs')
          .select('micros')
          .eq('user_id', user.id)
          .eq('entry_date', yesterdayStr);

        if (yesterdayLogs && yesterdayLogs.length > 0) {
          const yesterdayWithMicros = yesterdayLogs.filter((l: any) => {
            const m = l.micros as Record<string, number> | null;
            return m && Object.keys(m).length > 0;
          }).length;
          const yesterdayCoverage = yesterdayWithMicros / yesterdayLogs.length;
          const delta = Math.round((microCoverageRatio - yesterdayCoverage) * 100);
          if (delta > 0) {
            nudges.push(`+${delta}% micronutrient coverage — higher scoring potential unlocked`);
          }
        }
      } catch {
        // Non-blocking
      }

      // Coverage warning (second priority)
      if (nudges.length === 0 && microCoverageRatio < 0.5) {
        nudges.push('Increase verified foods to unlock full nutrient tracking');
      }

      // Consistency prompt (third priority)
      if (nudges.length === 0) {
        const consistencyData = queryClient.getQueryData(['nutritionConsistency']) as any;
        if (!consistencyData || consistencyData?.score === null) {
          nudges.push('Log nutrient-complete meals to activate consistency scoring');
        }
      }

      return {
        status: 'active',
        limitingFactors,
        foodSuggestions,
        nudges: nudges.slice(0, 1), // enforce max 1
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
