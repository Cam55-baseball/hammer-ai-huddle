import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NUTRIENT_IMPACT } from '@/constants/nutrientPerformanceMap';

const RDA: Record<string, number> = {
  vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 15, vitamin_e_mg: 15,
  vitamin_k_mcg: 120, vitamin_b6_mg: 1.3, vitamin_b12_mcg: 2.4, folate_mcg: 400,
  calcium_mg: 1000, iron_mg: 8, magnesium_mg: 420, potassium_mg: 2600, zinc_mg: 11,
};

export interface LimitingFactor {
  key: string;
  label: string;
  percent: number;
  impact: string;
}

export interface GuidanceFood {
  name: string;
  nutrients: string[]; // which limiting nutrients this food helps
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

      // Fetch today's logs
      const { data: logs, error } = await supabase
        .from('vault_nutrition_logs')
        .select('micros, data_confidence, data_source, supplements')
        .eq('user_id', user.id)
        .eq('entry_date', dateStr);

      if (error) throw error;
      if (!logs || logs.length === 0) {
        return { status: 'suppressed', message: 'No meals logged today', limitingFactors: [], foodSuggestions: [], nudges: [] };
      }

      // Micro coverage check
      const mealsWithMicros = logs.filter((l: any) => {
        const m = l.micros as Record<string, number> | null;
        return m && Object.keys(m).length > 0;
      }).length;

      if (mealsWithMicros === 0) {
        return {
          status: 'suppressed',
          message: 'Guidance unavailable — insufficient micronutrient data',
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

      // Compute % RDA for each nutrient and find top 2 limiting factors
      const nutrientScores = Object.entries(RDA).map(([key, rda]) => {
        const current = totals[key] || 0;
        const adjustedRda = rda * rdaMultiplier;
        const percent = Math.round((current / adjustedRda) * 100);
        const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          .replace(/ Mcg$/, '').replace(/ Mg$/, '');
        return { key, label, percent, impact: NUTRIENT_IMPACT[key] || '' };
      });

      const limitingFactors = nutrientScores
        .filter(n => n.percent < 75)
        .sort((a, b) => a.percent - b.percent)
        .slice(0, 2);

      // Fetch food suggestions for limiting nutrients
      let foodSuggestions: GuidanceFood[] = [];
      if (limitingFactors.length > 0) {
        const topKey = limitingFactors[0].key;
        try {
          const { data: foods } = await supabase
            .from('nutrition_food_database')
            .select('name')
            .gt(topKey, 0)
            .order(topKey, { ascending: false })
            .limit(3);

          foodSuggestions = (foods || []).map((f: any) => ({
            name: f.name,
            nutrients: limitingFactors.filter(lf => lf.key === topKey || limitingFactors.length === 1).map(lf => lf.label),
          }));
        } catch {
          // Non-blocking
        }
      }

      // Behavioral nudges
      const nudges: string[] = [];
      const microCoverageRatio = mealsWithMicros / logs.length;

      if (microCoverageRatio < 0.5) {
        nudges.push('Increase verified foods to unlock full nutrient tracking');
      }

      // Check consistency — look for cached consistency data
      const consistencyData = queryClient.getQueryData(['nutritionConsistency']) as any;
      if (!consistencyData || consistencyData?.score === null) {
        nudges.push('Log nutrient-complete meals to activate consistency scoring');
      }

      // Yesterday comparison
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
            nudges.push(`+${delta}% micronutrient coverage vs yesterday`);
          }
        }
      } catch {
        // Non-blocking
      }

      return {
        status: 'active',
        limitingFactors,
        foodSuggestions,
        nudges,
      };
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
