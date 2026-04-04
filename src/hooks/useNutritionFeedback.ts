import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { NUTRIENT_IMPACT } from '@/constants/nutrientPerformanceMap';
import type { MealLogData } from '@/components/nutrition-hub/MealLogCard';
import type { NutritionGuidance } from '@/hooks/useNutritionGuidance';

const RDA: Record<string, number> = {
  vitamin_a_mcg: 900, vitamin_c_mg: 90, vitamin_d_mcg: 15, vitamin_e_mg: 15,
  vitamin_k_mcg: 120, vitamin_b6_mg: 1.3, vitamin_b12_mcg: 2.4, folate_mcg: 400,
  calcium_mg: 1000, iron_mg: 8, magnesium_mg: 420, potassium_mg: 2600, zinc_mg: 11,
};

const MICRO_KEYS = Object.keys(RDA);
const IDENTITY_POOL = [
  "You're building a high-performance nutrition profile",
  "Consistency like this supports elite recovery",
  "Your nutrient discipline is above average",
  "This pattern drives long-term performance gains",
];

export interface RewardSignal {
  nutrient: string;
  nutrientKey: string;
  deltaPercent: number;
  scoreGain: number;
  outcome: string;
}

export interface ProgressionSignal {
  nutrient: string;
  fromPercent: number;
  toPercent: number;
  delta: number;
}

export interface FeedbackData {
  reward: RewardSignal | null;
  progression: ProgressionSignal | null;
  streak: number;
  identityFrame: string | null;
  nudge: string | null;
  goal: string | null;
  zeroData: boolean;
}

export function useNutritionFeedback(
  date: Date,
  meals: MealLogData[],
  guidanceData: NutritionGuidance | undefined,
  rdaMultiplier: number = 1.0,
) {
  const { user } = useAuth();
  const dateStr = format(date, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(date, 1), 'yyyy-MM-dd');

  // Streak query — 14-day lookback
  const { data: streakData } = useQuery({
    queryKey: ['nutritionStreak', user?.id, dateStr],
    queryFn: async () => {
      if (!user) return { streak: 0, yesterdayMicros: {} as Record<string, number> };

      const start = subDays(date, 14);
      const startStr = format(start, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('vault_nutrition_logs')
        .select('entry_date, micros')
        .eq('user_id', user.id)
        .gte('entry_date', startStr)
        .lte('entry_date', dateStr)
        .order('entry_date', { ascending: false });

      if (error) throw error;

      // Group by date
      const dayMap = new Map<string, Record<string, number>>();
      for (const log of data || []) {
        const micros = log.micros as Record<string, number> | null;
        if (!micros || Object.keys(micros).length === 0) continue;
        if (!dayMap.has(log.entry_date)) dayMap.set(log.entry_date, {});
        const day = dayMap.get(log.entry_date)!;
        for (const [k, v] of Object.entries(micros)) {
          if (typeof v === 'number') day[k] = (day[k] || 0) + v;
        }
      }

      // Count streak (consecutive days ending at date with ≥7/13 nutrients above 50% RDA)
      const allDates = eachDayOfInterval({ start, end: date })
        .map(d => format(d, 'yyyy-MM-dd'))
        .reverse();

      let streak = 0;
      for (const d of allDates) {
        const dayMicros = dayMap.get(d);
        if (!dayMicros) break;
        const met = MICRO_KEYS.filter(k => {
          const rda = RDA[k] * rdaMultiplier;
          return (dayMicros[k] || 0) >= rda * 0.5;
        }).length;
        if (met >= 7) streak++;
        else break;
      }

      // Yesterday totals for progression
      const yesterdayMicros = dayMap.get(yesterdayStr) || {};

      return { streak, yesterdayMicros };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const feedback = useMemo((): FeedbackData => {
    const mealsWithMicros = meals.filter(m => m.micros && Object.keys(m.micros).length > 0);
    const zeroData = mealsWithMicros.length === 0;

    if (zeroData) {
      return {
        reward: null,
        progression: null,
        streak: 0,
        identityFrame: null,
        nudge: null,
        goal: 'Log 1 verified meal to activate full tracking',
        zeroData: true,
      };
    }

    const streak = streakData?.streak ?? 0;
    const yesterdayMicros = streakData?.yesterdayMicros ?? {};
    const limitingFactors = guidanceData?.limitingFactors ?? [];

    // Aggregate today's micros
    const todayMicros: Record<string, number> = {};
    for (const meal of meals) {
      if (!meal.micros) continue;
      const micros = meal.micros as Record<string, number>;
      for (const [k, v] of Object.entries(micros)) {
        if (typeof v === 'number') todayMicros[k] = (todayMicros[k] || 0) + v;
      }
    }

    // --- REWARD: Check if latest meal improved a limiting nutrient ---
    let reward: RewardSignal | null = null;
    if (mealsWithMicros.length >= 1 && limitingFactors.length > 0) {
      // Compute totals WITHOUT the latest meal
      const latestMeal = mealsWithMicros[mealsWithMicros.length - 1];
      const latestMicros = (latestMeal.micros as Record<string, number>) || {};
      
      for (const factor of limitingFactors) {
        const added = latestMicros[factor.key] || 0;
        if (added <= 0) continue;
        const rda = RDA[factor.key] * rdaMultiplier;
        const beforeTotal = (todayMicros[factor.key] || 0) - added;
        const afterTotal = todayMicros[factor.key] || 0;
        const deltaPercent = Math.round(((afterTotal - beforeTotal) / rda) * 100);
        if (deltaPercent >= 5) {
          const impactMap = NUTRIENT_IMPACT[factor.key] || '';
          const outcomeWords = impactMap.split(' / ')[0]?.toLowerCase() || 'performance';
          reward = {
            nutrient: factor.label,
            nutrientKey: factor.key,
            deltaPercent,
            scoreGain: factor.ptsRecoverable,
            outcome: `${outcomeWords} improved`,
          };
          break;
        }
      }
    }

    // --- PROGRESSION: Today vs yesterday for top limiting factor ---
    let progression: ProgressionSignal | null = null;
    if (limitingFactors.length > 0 && Object.keys(yesterdayMicros).length > 0) {
      const topFactor = limitingFactors[0];
      const rda = RDA[topFactor.key] * rdaMultiplier;
      const todayPct = Math.min(100, Math.round(((todayMicros[topFactor.key] || 0) / rda) * 100));
      const yesterdayPct = Math.min(100, Math.round(((yesterdayMicros[topFactor.key] || 0) / rda) * 100));
      const delta = todayPct - yesterdayPct;
      if (delta > 0) {
        progression = {
          nutrient: topFactor.label,
          fromPercent: yesterdayPct,
          toPercent: todayPct,
          delta,
        };
      }
    }

    // --- IDENTITY FRAME: only when streak ≥3 or high performance ---
    let identityFrame: string | null = null;
    if (streak >= 3) {
      // Deterministic rotation by day
      const dayIndex = parseInt(format(date, 'd'), 10) % IDENTITY_POOL.length;
      identityFrame = IDENTITY_POOL[dayIndex];
    }

    // --- SMART NUDGE ---
    let nudge: string | null = null;
    if (reward) {
      nudge = 'Strong correction — keep this pattern';
    } else {
      const latestMeal = meals[meals.length - 1];
      const latestHasMicros = latestMeal?.micros && Object.keys(latestMeal.micros).length > 0;
      if (!latestHasMicros) {
        nudge = 'Low micronutrient density — consider adding one high-impact food';
      } else if (streak > 0 && mealsWithMicros.length < 2) {
        nudge = 'Log one nutrient-complete meal to maintain your streak';
      }
    }

    // --- DAILY MICRO-GOAL ---
    let goal: string | null = null;
    if (limitingFactors.length > 0) {
      const top = limitingFactors[0];
      const nextTarget = Math.min(100, Math.ceil((top.percent + 10) / 10) * 10);
      if (top.percent < nextTarget) {
        const nutrientLower = top.label.toLowerCase();
        goal = `1 more ${nutrientLower}-rich food to reach ${nextTarget}%`;
      }
    }
    if (!goal) {
      const totalMicros = mealsWithMicros.length;
      if (totalMicros < meals.length) {
        goal = 'Add 1 verified meal to unlock full scoring';
      }
    }

    // --- NOISE RULE: progression vs identity (max 1) ---
    // If streak ≥3, identity replaces progression
    const finalProgression = streak >= 3 ? null : progression;
    const finalIdentity = streak >= 3 ? identityFrame : null;

    return {
      reward: reward,
      progression: finalProgression ?? (finalIdentity ? null : progression),
      streak,
      identityFrame: finalIdentity,
      nudge: reward ? nudge : nudge, // max 1 nudge
      goal,
      zeroData: false,
    };
  }, [meals, guidanceData, streakData, date, rdaMultiplier]);

  return feedback;
}
