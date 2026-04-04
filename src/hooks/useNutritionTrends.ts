import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, getDay } from 'date-fns';

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

const MICRO_LABELS: Record<string, string> = {
  vitamin_a_mcg: 'Vitamin A', vitamin_c_mg: 'Vitamin C', vitamin_d_mcg: 'Vitamin D',
  vitamin_e_mg: 'Vitamin E', vitamin_k_mcg: 'Vitamin K', vitamin_b6_mg: 'Vitamin B6',
  vitamin_b12_mcg: 'Vitamin B12', folate_mcg: 'Folate', calcium_mg: 'Calcium',
  iron_mg: 'Iron', magnesium_mg: 'Magnesium', potassium_mg: 'Potassium', zinc_mg: 'Zinc',
};

export type TrendDirection = 'up' | 'down' | 'stable';

export interface NutrientTrend {
  key: string;
  label: string;
  avg7: number;
  avg14: number;
  avg30: number;
  rdaPercent7: number;
  trend: TrendDirection;
  predictedRisk: boolean;
  riskDays?: number;
}

export interface BehavioralPattern {
  nutrient: string;
  label: string;
  pattern: string;
}

export interface SmartNudge {
  message: string;
  nutrientKey: string;
}

interface DayMicros {
  date: string;
  dayOfWeek: number;
  totals: Record<string, number>;
}

function linearSlope(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function getTrend(slope: number, avg: number): TrendDirection {
  if (avg === 0) return 'stable';
  const relSlope = slope / Math.max(avg, 0.01);
  if (relSlope > 0.05) return 'up';
  if (relSlope < -0.05) return 'down';
  return 'stable';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function useNutritionTrends(rdaMultiplier = 1.0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['nutritionTrends', user?.id, rdaMultiplier],
    queryFn: async () => {
      if (!user) return null;

      const startDate = format(subDays(new Date(), 30), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('entry_date, micros')
        .eq('user_id', user.id)
        .gte('entry_date', startDate)
        .order('entry_date', { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Aggregate micros per day
      const dayMap = new Map<string, DayMicros>();
      for (const log of data) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros) continue;
        const dateKey = log.entry_date;
        if (!dayMap.has(dateKey)) {
          dayMap.set(dateKey, {
            date: dateKey,
            dayOfWeek: getDay(new Date(dateKey + 'T12:00:00')),
            totals: {},
          });
        }
        const day = dayMap.get(dateKey)!;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') day.totals[k] = (day.totals[k] || 0) + v;
        }
      }

      const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
      if (days.length === 0) return null;

      // Compute per-nutrient trends
      const trends: NutrientTrend[] = MICRO_KEYS.map(key => {
        const allValues = days.map(d => d.totals[key] || 0);
        const last7 = allValues.slice(-7);
        const last14 = allValues.slice(-14);
        const rda = RDA[key] * rdaMultiplier;

        const avg7 = last7.reduce((a, b) => a + b, 0) / Math.max(last7.length, 1);
        const avg14 = last14.reduce((a, b) => a + b, 0) / Math.max(last14.length, 1);
        const avg30 = allValues.reduce((a, b) => a + b, 0) / Math.max(allValues.length, 1);

        const slope = linearSlope(last7);
        const trend = getTrend(slope, avg7);
        const rdaPercent7 = Math.round((avg7 / rda) * 100);

        // Predict risk: avg < 50% RDA AND trending down
        const predictedRisk = rdaPercent7 < 50 && trend === 'down';
        const riskDays = predictedRisk && slope < 0
          ? Math.max(1, Math.round(Math.abs(avg7 / slope)))
          : undefined;

        return {
          key, label: MICRO_LABELS[key],
          avg7: Math.round(avg7 * 10) / 10,
          avg14: Math.round(avg14 * 10) / 10,
          avg30: Math.round(avg30 * 10) / 10,
          rdaPercent7, trend, predictedRisk,
          riskDays: riskDays ? Math.min(riskDays, 14) : undefined,
        };
      });

      // Frequently missed: below 50% RDA on >60% of logged days
      const frequentlyMissed = MICRO_KEYS.filter(key => {
        const rda = RDA[key] * rdaMultiplier;
        const belowCount = days.filter(d => (d.totals[key] || 0) < rda * 0.5).length;
        return belowCount / days.length > 0.6;
      }).map(k => MICRO_LABELS[k]);

      // Behavioral patterns: group by day-of-week, find consistent gaps
      const patterns: BehavioralPattern[] = [];
      for (const key of MICRO_KEYS) {
        const rda = RDA[key] * rdaMultiplier;
        const byDow: Record<number, number[]> = {};
        for (const d of days) {
          if (!byDow[d.dayOfWeek]) byDow[d.dayOfWeek] = [];
          byDow[d.dayOfWeek].push(d.totals[key] || 0);
        }
        for (const [dow, vals] of Object.entries(byDow)) {
          if (vals.length < 2) continue;
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const overallAvg = days.map(d => d.totals[key] || 0).reduce((a, b) => a + b, 0) / days.length;
          // If a specific day is <40% of overall average
          if (overallAvg > 0 && avg / overallAvg < 0.4 && avg < rda * 0.5) {
            patterns.push({
              nutrient: key,
              label: MICRO_LABELS[key],
              pattern: `${MICRO_LABELS[key]} drops on ${DAY_NAMES[Number(dow)]}s`,
            });
          }
        }
      }

      // Smart nudges: biggest current gaps
      const deficientTrends = trends
        .filter(t => t.rdaPercent7 < 50)
        .sort((a, b) => a.rdaPercent7 - b.rdaPercent7)
        .slice(0, 2);

      // Fetch food suggestions for nudges
      const nudges: SmartNudge[] = [];
      for (const dt of deficientTrends) {
        try {
          const col = dt.key;
          const { data: foods } = await supabase
            .from('nutrition_food_database')
            .select(`name, ${col}`)
            .gt(col, 0)
            .order(col, { ascending: false })
            .limit(1);

          if (foods && foods.length > 0) {
            const food = foods[0];
            const amount = Math.round((food as any)[col] * 10) / 10;
            const unit = col.includes('mcg') ? 'mcg' : 'mg';
            nudges.push({
              message: `Add ${food.name} for +${amount}${unit} ${dt.label}`,
              nutrientKey: dt.key,
            });
          }
        } catch { /* skip */ }
      }

      return {
        trends,
        frequentlyMissed,
        patterns: patterns.slice(0, 3),
        nudges,
        predictedRisks: trends.filter(t => t.predictedRisk),
        daysAnalyzed: days.length,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}
