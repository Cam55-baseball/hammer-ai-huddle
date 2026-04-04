import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';

const MICRO_KEYS = [
  'vitamin_a_mcg', 'vitamin_c_mg', 'vitamin_d_mcg', 'vitamin_e_mg',
  'vitamin_k_mcg', 'vitamin_b6_mg', 'vitamin_b12_mcg', 'folate_mcg',
  'calcium_mg', 'iron_mg', 'magnesium_mg', 'potassium_mg', 'zinc_mg',
] as const;

const RDA: Record<string, number> = {
  vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 15, vitamin_e_mg: 15,
  vitamin_k_mcg: 120, vitamin_b6_mg: 1.3, vitamin_b12_mcg: 2.4, folate_mcg: 400,
  calcium_mg: 1000, iron_mg: 8, magnesium_mg: 420, potassium_mg: 2600, zinc_mg: 11,
};

export interface NutrientBaseline {
  key: string;
  avgIntake: number;
  rdaPercent: number;
  chronicLow: boolean; // >60% of days below 50% RDA
  priorityMultiplier: number; // 1.3 if chronic low, 1.0 otherwise
}

export interface BaselineData {
  nutrients: NutrientBaseline[];
  frequentFoods: string[];
  scoreAvg: number;
  scoreMin: number;
  scoreMax: number;
  daysWithData: number;
  adaptiveMultipliers: Record<string, number>;
}

export function useNutritionBaseline(rdaMultiplier = 1.0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutritionBaseline', user?.id, rdaMultiplier],
    queryFn: async (): Promise<BaselineData | null> => {
      if (!user) return null;

      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('entry_date, micros, meal_title, calories, protein_g, carbs_g, fats_g')
        .eq('user_id', user.id)
        .gte('entry_date', startDate)
        .order('entry_date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Aggregate per day — separate micro-days from all days
      const dayMicroMap = new Map<string, Record<string, number>>();
      const foodCounts = new Map<string, number>();
      const allDays = new Set<string>();

      for (const log of data) {
        const dateKey = log.entry_date;
        allDays.add(dateKey);

        // Only aggregate micros from rows that actually have micro data
        const micros = log.micros as Record<string, number> | null;
        if (micros && Object.keys(micros).length > 0) {
          if (!dayMicroMap.has(dateKey)) dayMicroMap.set(dateKey, {});
          const day = dayMicroMap.get(dateKey)!;
          for (const [k, v] of Object.entries(micros)) {
            if (typeof v === 'number') day[k] = (day[k] || 0) + v;
          }
        }

        // Track food frequency (all rows)
        if (log.meal_title) {
          foodCounts.set(log.meal_title, (foodCounts.get(log.meal_title) || 0) + 1);
        }
      }

      const microDays = Array.from(dayMicroMap.values());
      const daysWithData = allDays.size;
      const daysWithMicros = microDays.length;
      if (daysWithData === 0) return null;

      // Compute per-nutrient baseline
      const adaptiveMultipliers: Record<string, number> = {};
      const nutrients: NutrientBaseline[] = MICRO_KEYS.map(key => {
        const rda = RDA[key] * rdaMultiplier;
        const dailyValues = days.map(d => d[key] || 0);
        const avgIntake = dailyValues.reduce((a, b) => a + b, 0) / daysWithData;
        const rdaPercent = Math.round((avgIntake / rda) * 100);
        const belowCount = dailyValues.filter(v => v < rda * 0.5).length;
        const chronicLow = belowCount / daysWithData > 0.6;
        const priorityMultiplier = chronicLow ? 1.3 : 1.0;
        adaptiveMultipliers[key] = priorityMultiplier;

        return {
          key,
          avgIntake: Math.round(avgIntake * 10) / 10,
          rdaPercent,
          chronicLow,
          priorityMultiplier,
        };
      });

      // Frequent foods (top 10)
      const frequentFoods = Array.from(foodCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name]) => name);

      // Score range (simple proxy: count how many nutrients meet >50% RDA per day)
      const dailyScores = days.map(day => {
        let met = 0;
        for (const key of MICRO_KEYS) {
          const rda = RDA[key] * rdaMultiplier;
          if ((day[key] || 0) >= rda * 0.5) met++;
        }
        return Math.round((met / 13) * 100);
      });
      const scoreAvg = Math.round(dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length);
      const scoreMin = Math.min(...dailyScores);
      const scoreMax = Math.max(...dailyScores);

      return {
        nutrients,
        frequentFoods,
        scoreAvg,
        scoreMin,
        scoreMax,
        daysWithData,
        adaptiveMultipliers,
      };
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}
