import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { toast } from 'sonner';
import { TAB_ID } from '@/utils/tabId';
import { computeHydrationProfile, type HydrationProfile, type HydrationTier } from '@/utils/hydrationScoring';
import {
  multiplyMicros,
  sumMicros,
  EMPTY_MICROS,
  type HydrationMicros,
} from '@/utils/hydrationMicros';
import {
  sanitizeMacrosPerOz,
  multiplyMacros,
  mirrorElectrolytes,
  type HydrationMacrosPerOz,
} from '@/utils/hydrationMacros';

const OZ_TO_G = 29.5735;
const CONFIDENCE_THRESHOLD = 0.7;

const HYDRATION_CHANGED_EVENT = 'hydration:changed';

export interface HydrationLog {
  id: string;
  user_id: string;
  amount_oz: number;
  log_date: string;
  logged_at: string;
  liquid_type?: string;
  quality_class?: string;
  water_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  magnesium_mg?: number | null;
  calcium_mg?: number | null;
  sugar_g?: number | null;
  glucose_g?: number | null;
  fructose_g?: number | null;
  total_carbs_g?: number | null;
  osmolality_estimate?: number | null;
  hydration_profile?: HydrationProfile | null;
  custom_label?: string | null;
  micros?: Partial<HydrationMicros> | null;
  ai_estimated?: boolean | null;
  nutrition_incomplete?: boolean | null;
  confidence?: number | null;
}

export interface AiHydrationAnalysis {
  display_name: string;
  water_g_per_oz: number;
  sodium_mg_per_oz: number;
  potassium_mg_per_oz: number;
  magnesium_mg_per_oz: number;
  calcium_mg_per_oz?: number;
  sugar_g_per_oz: number;
  glucose_g_per_oz?: number;
  fructose_g_per_oz?: number;
  total_carbs_g_per_oz: number;
  osmolality_estimate?: number;
  confidence?: number | 'high' | 'medium' | 'low';
  micros_per_oz?: Partial<HydrationMicros> | null;
}

export interface HydrationSettings {
  id: string;
  user_id: string;
  daily_goal_oz: number;
  enabled: boolean;
  reminder_interval_minutes: number;
  start_time: string;
  end_time: string;
}

export interface HydrationStats {
  todayTotal: number;
  weeklyAverage: number;
  monthlyAverage: number;
  currentStreak: number;
  goalReachedToday: boolean;
}

const DEFAULT_GOAL = 100; // oz

export function useHydration() {
  const { user } = useAuth();
  const [todayLogs, setTodayLogs] = useState<HydrationLog[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(DEFAULT_GOAL);
  const [settings, setSettings] = useState<HydrationSettings | null>(null);
  const [stats, setStats] = useState<HydrationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), 'yyyy-MM-dd');

  // Fetch today's logs
  const fetchTodayLogs = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', today)
      .order('logged_at', { ascending: true });

    if (!error && data) {
      setTodayLogs(data as unknown as HydrationLog[]);
      const total = data.reduce((sum, log) => sum + Number(log.amount_oz), 0);
      setTodayTotal(total);
    }
  }, [user, today]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('hydration_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setSettings(data);
      setDailyGoal(data.daily_goal_oz || DEFAULT_GOAL);
    }
  }, [user]);

  // Fetch stats (weekly/monthly averages, streak)
  const fetchStats = useCallback(async () => {
    if (!user) return;

    const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
    const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');
    const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    // Fetch week logs
    const { data: weekLogs } = await supabase
      .from('hydration_logs')
      .select('amount_oz, log_date')
      .eq('user_id', user.id)
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd);

    // Fetch month logs
    const { data: monthLogs } = await supabase
      .from('hydration_logs')
      .select('amount_oz, log_date')
      .eq('user_id', user.id)
      .gte('log_date', monthStart)
      .lte('log_date', monthEnd);

    // Calculate weekly average (total / days with data)
    const weekDays = new Set(weekLogs?.map(l => l.log_date) || []);
    const weekTotal = weekLogs?.reduce((sum, l) => sum + Number(l.amount_oz), 0) || 0;
    const weeklyAverage = weekDays.size > 0 ? Math.round(weekTotal / weekDays.size) : 0;

    // Calculate monthly average
    const monthDays = new Set(monthLogs?.map(l => l.log_date) || []);
    const monthTotal = monthLogs?.reduce((sum, l) => sum + Number(l.amount_oz), 0) || 0;
    const monthlyAverage = monthDays.size > 0 ? Math.round(monthTotal / monthDays.size) : 0;

    // Calculate streak (consecutive days meeting goal)
    let streak = 0;
    const checkDate = new Date();
    const goal = settings?.daily_goal_oz || DEFAULT_GOAL;

    for (let i = 0; i < 365; i++) {
      const dateStr = format(subDays(checkDate, i), 'yyyy-MM-dd');
      const { data: dayLogs } = await supabase
        .from('hydration_logs')
        .select('amount_oz')
        .eq('user_id', user.id)
        .eq('log_date', dateStr);

      const dayTotal = dayLogs?.reduce((sum, l) => sum + Number(l.amount_oz), 0) || 0;
      
      if (dayTotal >= goal) {
        streak++;
      } else if (i > 0) {
        // Don't break on today if we haven't met goal yet
        break;
      }
    }

    setStats({
      todayTotal,
      weeklyAverage,
      monthlyAverage,
      currentStreak: streak,
      goalReachedToday: todayTotal >= dailyGoal,
    });
  }, [user, settings, todayTotal, dailyGoal]);

  // Add water
  const addWater = useCallback(async (
    amount: number,
    liquidType: string,
    qualityClass: string,
    aiNutrition?: AiHydrationAnalysis,
  ): Promise<boolean> => {
    if (!user) return false;

    if (!liquidType || !qualityClass) {
      console.error('addWater: liquidType and qualityClass are required');
      toast.error('Liquid classification is required');
      return false;
    }

    try {
      let nutritionPayload: Record<string, any> = {};
      let customLabel: string | null = null;

      if (aiNutrition) {
        // AI-analyzed beverage (e.g. "Other" liquid). Multiply per-oz values by amount.
        const water_g       = Number(aiNutrition.water_g_per_oz)       * amount;
        const sodium_mg     = Number(aiNutrition.sodium_mg_per_oz)     * amount;
        const potassium_mg  = Number(aiNutrition.potassium_mg_per_oz)  * amount;
        const magnesium_mg  = Number(aiNutrition.magnesium_mg_per_oz)  * amount;
        const sugar_g       = Number(aiNutrition.sugar_g_per_oz)       * amount;
        const total_carbs_g = Number(aiNutrition.total_carbs_g_per_oz) * amount;
        const profile = computeHydrationProfile({
          amount_oz: amount, water_g, sodium_mg, potassium_mg, magnesium_mg, sugar_g, total_carbs_g,
        });
        const micros = multiplyMicros(aiNutrition.micros_per_oz ?? null, amount);
        console.log(`[hydration] AI profile: ${aiNutrition.display_name} score=${profile.hydration_score}`);
        nutritionPayload = {
          water_g, sodium_mg, potassium_mg, magnesium_mg, sugar_g, total_carbs_g,
          glucose_g: null, fructose_g: null, osmolality_estimate: null, absorption_score: null,
          hydration_profile: profile,
          micros,
        };
        customLabel = aiNutrition.display_name?.slice(0, 80) || null;
      } else {
        // Look up preset beverage nutrition profile
        try {
          const { data: bev, error: bevError } = await (supabase as any)
            .from('hydration_beverage_database')
            .select('*')
            .eq('liquid_type', liquidType)
            .maybeSingle();

          if (bevError) {
            console.warn(`[hydration] beverage lookup error for "${liquidType}":`, bevError.message);
          } else if (!bev) {
            console.warn(`[hydration] no beverage row for liquidType="${liquidType}" — logging without profile`);
          } else {
            console.log(`[hydration] bev found: ${bev.display_name} (${liquidType})`);
            const water_g       = Number(bev.water_g_per_oz)       * amount;
            const sodium_mg     = Number(bev.sodium_mg_per_oz)     * amount;
            const potassium_mg  = Number(bev.potassium_mg_per_oz)  * amount;
            const magnesium_mg  = Number(bev.magnesium_mg_per_oz)  * amount;
            const sugar_g       = Number(bev.sugar_g_per_oz)       * amount;
            const total_carbs_g = Number(bev.total_carbs_g_per_oz) * amount;
            const profile = computeHydrationProfile({
              amount_oz: amount, water_g, sodium_mg, potassium_mg, magnesium_mg, sugar_g, total_carbs_g,
            });

            // --- Lazy micros enrichment -----------------------------------
            // If preset row's micros_per_oz is null or empty {}, ask AI to
            // estimate them and persist back to the beverage DB so future
            // logs reuse the cached values (one AI call per unique drink, ever).
            let microsPerOz: Partial<HydrationMicros> | null = bev.micros_per_oz ?? null;
            const isEmpty =
              !microsPerOz ||
              (typeof microsPerOz === 'object' && Object.keys(microsPerOz).length === 0);
            if (isEmpty && liquidType !== 'water') {
              try {
                console.log(`[hydration] enriching micros for "${bev.display_name}" via AI`);
                const { data: enrich, error: enrichErr } = await supabase.functions.invoke(
                  'analyze-hydration-beverage',
                  { body: { name: bev.display_name || liquidType, category: liquidType } },
                );
                if (enrichErr) {
                  console.warn('[hydration] enrich error:', enrichErr.message);
                } else if (enrich?.micros_per_oz) {
                  microsPerOz = enrich.micros_per_oz as Partial<HydrationMicros>;
                  // Persist back to beverage DB (cache forever).
                  const { error: upErr } = await (supabase as any)
                    .from('hydration_beverage_database')
                    .update({ micros_per_oz: microsPerOz })
                    .eq('id', bev.id);
                  if (upErr) console.warn('[hydration] cache persist error:', upErr.message);
                  else console.log(`[hydration] cached micros for "${bev.display_name}"`);
                }
              } catch (e) {
                console.warn('[hydration] enrichment failed', e);
              }
            }

            const micros = multiplyMicros(microsPerOz, amount);
            console.log(`[hydration] computed profile: score=${profile.hydration_score}, tier=${profile.hydration_tier}`);
            nutritionPayload = {
              water_g, sodium_mg, potassium_mg, magnesium_mg, sugar_g, total_carbs_g,
              glucose_g: null, fructose_g: null, osmolality_estimate: null, absorption_score: null,
              hydration_profile: profile,
              micros,
            };
          }
        } catch (e) {
          console.warn('[hydration] beverage lookup failed, logging without profile', e);
        }
      }

      const { error } = await supabase
        .from('hydration_logs')
        .insert({
          user_id: user.id,
          amount_oz: amount,
          log_date: today,
          liquid_type: liquidType,
          quality_class: qualityClass,
          custom_label: customLabel,
          ...nutritionPayload,
        } as any);

      if (error) throw error;

      const newTotal = todayTotal + amount;
      setTodayTotal(newTotal);
      
      // Check if goal reached
      if (newTotal >= dailyGoal && todayTotal < dailyGoal) {
        toast.success('🎉 Daily hydration goal reached!', { duration: 5000 });
      } else {
        toast.success(`+${amount} oz logged!`);
      }

      // Refresh logs
      fetchTodayLogs();
      try {
        const ch = new BroadcastChannel('data-sync');
        ch.postMessage({ type: HYDRATION_CHANGED_EVENT, userId: user.id, tabId: TAB_ID });
        ch.close();
      } catch {}
      return true;
    } catch (error) {
      console.error('Error logging water:', error);
      toast.error('Failed to log water');
      return false;
    }
  }, [user, today, todayTotal, dailyGoal, fetchTodayLogs]);

  // Delete log entry
  const deleteLog = useCallback(async (logId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('hydration_logs')
        .delete()
        .eq('id', logId)
        .eq('user_id', user.id);

      if (error) throw error;

      fetchTodayLogs();
      try {
        const ch = new BroadcastChannel('data-sync');
        ch.postMessage({ type: HYDRATION_CHANGED_EVENT, userId: user.id, tabId: TAB_ID });
        ch.close();
      } catch {}
      toast.success('Entry removed');
      return true;
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to remove entry');
      return false;
    }
  }, [user, fetchTodayLogs]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<HydrationSettings>): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data: existing } = await supabase
        .from('hydration_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('hydration_settings')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('hydration_settings')
          .insert({ user_id: user.id, ...updates });

        if (error) throw error;
      }

      if (updates.daily_goal_oz) {
        setDailyGoal(updates.daily_goal_oz);
      }
      
      fetchSettings();
      toast.success('Settings updated');
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
      return false;
    }
  }, [user, fetchSettings]);

  // Get logs for a date range
  const getLogsForDateRange = useCallback(async (startDate: string, endDate: string): Promise<HydrationLog[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) {
      console.error('Error fetching logs:', error);
      return [];
    }

    return (data as unknown as HydrationLog[]) || [];
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchTodayLogs(), fetchSettings()]).then(() => {
        setLoading(false);
      });
    }
  }, [user, fetchTodayLogs, fetchSettings]);

  // Cross-instance + cross-tab sync
  useEffect(() => {
    if (!user) return;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('data-sync');
      channel.onmessage = (event) => {
        const data = event.data;
        if (
          data?.type === HYDRATION_CHANGED_EVENT &&
          data.userId === user.id &&
          data.tabId !== TAB_ID
        ) {
          fetchTodayLogs();
        }
      };
    } catch {}

    const realtime = supabase
      .channel(`hydration_logs:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hydration_logs', filter: `user_id=eq.${user.id}` },
        () => fetchTodayLogs()
      )
      .subscribe();

    return () => {
      try { channel?.close(); } catch {}
      supabase.removeChannel(realtime);
    };
  }, [user, fetchTodayLogs]);

  // Refresh stats when todayTotal changes
  useEffect(() => {
    if (user && !loading) {
      fetchStats();
    }
  }, [user, loading, todayTotal]);

  const progress = dailyGoal > 0 ? Math.min((todayTotal / dailyGoal) * 100, 100) : 0;
  const remaining = Math.max(dailyGoal - todayTotal, 0);

  // Compute quality vs filler totals
  const qualityTotal = todayLogs
    .filter(l => (l as any).quality_class !== 'filler')
    .reduce((sum, l) => sum + Number(l.amount_oz), 0);
  const fillerTotal = todayLogs
    .filter(l => (l as any).quality_class === 'filler')
    .reduce((sum, l) => sum + Number(l.amount_oz), 0);
  const qualityPercent = todayTotal > 0 ? Math.round((qualityTotal / todayTotal) * 100) : 100;

  // --- New: hydration-score aggregates -------------------------------------
  const scoredLogs = todayLogs.filter(l => (l as any).hydration_profile?.hydration_score != null);
  const dailyAverageScore = scoredLogs.length > 0
    ? Math.round(
        scoredLogs.reduce(
          (sum, l) => sum + Number((l as any).hydration_profile.hydration_score),
          0
        ) / scoredLogs.length
      )
    : 0;
  const dailyTier: HydrationTier =
    dailyAverageScore >= 85 ? 'optimal' :
    dailyAverageScore >= 70 ? 'high' :
    dailyAverageScore >= 50 ? 'moderate' : 'low';

  const totalSodiumMg    = todayLogs.reduce((s, l) => s + Number((l as any).sodium_mg    || 0), 0);
  const totalPotassiumMg = todayLogs.reduce((s, l) => s + Number((l as any).potassium_mg || 0), 0);
  const totalMagnesiumMg = todayLogs.reduce((s, l) => s + Number((l as any).magnesium_mg || 0), 0);
  const totalSugarG      = todayLogs.reduce((s, l) => s + Number((l as any).sugar_g      || 0), 0);
  const totalElectrolytesMg = totalSodiumMg + totalPotassiumMg + totalMagnesiumMg;

  // Aggregate micronutrients across today's hydration logs (for display in
  // Hydration Quality breakdown). Falls back to empty when no logs carry micros.
  const totalHydrationMicros: HydrationMicros = sumMicros(
    todayLogs.map(l => (l as any).micros as Partial<HydrationMicros> | null | undefined)
  );

  return {
    // Data
    todayLogs,
    todayTotal,
    dailyGoal,
    settings,
    stats,
    loading,
    progress,
    remaining,
    goalReached: todayTotal >= dailyGoal,
    qualityTotal,
    fillerTotal,
    qualityPercent,

    // Score-based aggregates
    dailyAverageScore,
    dailyTier,
    totalSodiumMg,
    totalPotassiumMg,
    totalMagnesiumMg,
    totalSugarG,
    totalElectrolytesMg,
    totalHydrationMicros,

    // Actions
    addWater,
    deleteLog,
    updateSettings,
    getLogsForDateRange,
    refresh: fetchTodayLogs,
  };
}
