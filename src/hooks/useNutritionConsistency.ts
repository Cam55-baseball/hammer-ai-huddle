import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, eachDayOfInterval } from 'date-fns';

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

export interface ConsistencyData {
  score: number; // 0-100
  stabilityScore: number;
  loggingFrequency: number;
  deficiencyFreeRate: number;
  daysAnalyzed: number;
}

export function useNutritionConsistency(rdaMultiplier = 1.0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutritionConsistency', user?.id, rdaMultiplier],
    queryFn: async (): Promise<ConsistencyData | null> => {
      if (!user) return null;

      const today = new Date();
      const start = subDays(today, 14);
      const startStr = format(start, 'yyyy-MM-dd');
      const allDates = eachDayOfInterval({ start, end: today }).map(d => format(d, 'yyyy-MM-dd'));

      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('entry_date, micros, calories, protein_g, carbs_g, fats_g')
        .eq('user_id', user.id)
        .gte('entry_date', startStr)
        .order('entry_date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Group by date — track which days have micro data separately
      const dayMap = new Map<string, { micros: Record<string, number>; hasMicros: boolean }>();
      for (const log of data) {
        if (!dayMap.has(log.entry_date)) {
          dayMap.set(log.entry_date, { micros: {}, hasMicros: false });
        }
        const day = dayMap.get(log.entry_date)!;
        const micros = log.micros as Record<string, number> | null;
        if (micros && Object.keys(micros).length > 0) {
          day.hasMicros = true;
          for (const [k, v] of Object.entries(micros)) {
            if (typeof v === 'number') day.micros[k] = (day.micros[k] || 0) + v;
          }
        }
      }

      // 1. Logging frequency (30%): % of 14 days with data
      const daysLogged = allDates.filter(d => dayMap.has(d)).length;
      const loggingFrequency = Math.round((daysLogged / allDates.length) * 100);

      // 2. Score stability (40%): only include days WITH micro data (exclude macro-only)
      const dailyScores: number[] = [];
      for (const date of allDates) {
        const day = dayMap.get(date);
        if (!day || !day.hasMicros) continue; // skip days without micro data
        let met = 0;
        for (const key of MICRO_KEYS) {
          const rda = RDA[key] * rdaMultiplier;
          if ((day.micros[key] || 0) >= rda * 0.5) met++;
        }
        dailyScores.push(Math.round((met / 13) * 100));
      }
      let stabilityScore = 100;
      if (dailyScores.length >= 2) {
        const mean = dailyScores.reduce((a, b) => a + b, 0) / dailyScores.length;
        const variance = dailyScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / dailyScores.length;
        const stdDev = Math.sqrt(variance);
        stabilityScore = Math.max(0, Math.round(100 - stdDev * 2));
      }

      // 3. Deficiency-free rate (30%): only from days WITH micro data
      const daysWithMicros = allDates.filter(d => dayMap.get(d)?.hasMicros).length;
      let deficiencyFreeDays = 0;
      for (const date of allDates) {
        const day = dayMap.get(date);
        if (!day || !day.hasMicros) continue; // exclude macro-only days
        const hasDeficiency = MICRO_KEYS.some(key => {
          const rda = RDA[key] * rdaMultiplier;
          return (day.micros[key] || 0) < rda * 0.25;
        });
        if (!hasDeficiency) deficiencyFreeDays++;
      }
      const deficiencyFreeRate = daysWithMicros > 0
        ? Math.round((deficiencyFreeDays / daysWithMicros) * 100)
        : 0;

      // Weighted total
      const score = Math.min(100, Math.round(
        stabilityScore * 0.4 +
        loggingFrequency * 0.3 +
        deficiencyFreeRate * 0.3
      ));

      return {
        score,
        stabilityScore,
        loggingFrequency,
        deficiencyFreeRate,
        daysAnalyzed: daysLogged,
      };
    },
    enabled: !!user,
    staleTime: 120_000,
  });
}
