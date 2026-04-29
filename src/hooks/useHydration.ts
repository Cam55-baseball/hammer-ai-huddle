import { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  inferCategory,
  isComplete,
  applyFallbacks,
} from '@/utils/hydrationCategoryRules';

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

  // Stable "today" — only changes when the calendar day rolls over.
  // Recomputing this every render destabilized fetchTodayLogs and caused
  // the realtime subscription to tear down/resubscribe constantly, dropping
  // postgres_changes events for newly inserted hydration logs.
  const [today, setToday] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  useEffect(() => {
    const interval = setInterval(() => {
      const next = format(new Date(), 'yyyy-MM-dd');
      setToday(prev => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

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

  // --- Unified log payload builder ----------------------------------------
  // Single funnel for both preset and AI flows. Multiplies per-oz × oz, mirrors
  // electrolytes between macros + micros, computes the hydration profile, and
  // sets the AI/incomplete/confidence flags.
  const buildLogPayload = useCallback((args: {
    perOzMacros: HydrationMacrosPerOz;
    perOzMicros: Partial<HydrationMicros> | null | undefined;
    oz: number;
    aiEstimated: boolean;
    nutritionIncomplete: boolean;
    confidence: number;
    liquidType?: string;
    customLabel?: string | null;
  }) => {
    const { oz, aiEstimated, confidence, liquidType, customLabel } = args;
    let { nutritionIncomplete } = args;
    const cleanMacros = sanitizeMacrosPerOz(args.perOzMacros);

    // === FINAL ENFORCEMENT: category-based micronutrient completeness ===
    // No log can persist with missing required micros for its category.
    const category = inferCategory(customLabel || liquidType, liquidType);
    let workingMicros: Partial<HydrationMicros> = args.perOzMicros || {};
    const check = isComplete(category, workingMicros);
    if (!check.ok) {
      console.warn(
        `[hydration] fallback applied → category=${category} missing=[${check.missing.join(',')}]`,
      );
      workingMicros = applyFallbacks(category, workingMicros);
      nutritionIncomplete = true;
    }

    const mirrored = mirrorElectrolytes(cleanMacros, workingMicros);
    const totalsMacros = multiplyMacros(mirrored.macros, oz);
    const totalsMicros = multiplyMicros(mirrored.micros, oz);
    const profile = computeHydrationProfile({
      amount_oz: oz,
      water_g: totalsMacros.water_g,
      sodium_mg: totalsMacros.sodium_mg,
      potassium_mg: totalsMacros.potassium_mg,
      magnesium_mg: totalsMacros.magnesium_mg,
      sugar_g: totalsMacros.sugar_g,
      total_carbs_g: totalsMacros.total_carbs_g,
    });
    return {
      water_g: totalsMacros.water_g,
      sodium_mg: totalsMacros.sodium_mg,
      potassium_mg: totalsMacros.potassium_mg,
      magnesium_mg: totalsMacros.magnesium_mg,
      calcium_mg: totalsMacros.calcium_mg,
      sugar_g: totalsMacros.sugar_g,
      glucose_g: totalsMacros.glucose_g,
      fructose_g: totalsMacros.fructose_g,
      total_carbs_g: totalsMacros.total_carbs_g,
      osmolality_estimate: totalsMacros.osmolality_estimate,
      hydration_profile: profile,
      micros: totalsMicros,
      ai_estimated: aiEstimated,
      nutrition_incomplete: nutritionIncomplete,
      confidence,
    };
  }, []);

  // Add water — never blocks the log. Funnels through buildLogPayload.
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

      // === PATH A: Caller already gave us AI-analyzed per-oz nutrition. =====
      if (aiNutrition) {
        const conf =
          typeof aiNutrition.confidence === 'number'
            ? aiNutrition.confidence
            : aiNutrition.confidence === 'high' ? 0.9
              : aiNutrition.confidence === 'medium' ? 0.7
              : aiNutrition.confidence === 'low' ? 0.4 : 0.5;
        const perOzMacros: HydrationMacrosPerOz = {
          water_g:             Number(aiNutrition.water_g_per_oz)       || 0,
          sodium_mg:           Number(aiNutrition.sodium_mg_per_oz)     || 0,
          potassium_mg:        Number(aiNutrition.potassium_mg_per_oz)  || 0,
          magnesium_mg:        Number(aiNutrition.magnesium_mg_per_oz)  || 0,
          calcium_mg:          Number(aiNutrition.calcium_mg_per_oz)    || 0,
          sugar_g:             Number(aiNutrition.sugar_g_per_oz)       || 0,
          glucose_g:           Number(aiNutrition.glucose_g_per_oz)     || 0,
          fructose_g:          Number(aiNutrition.fructose_g_per_oz)    || 0,
          total_carbs_g:       Number(aiNutrition.total_carbs_g_per_oz) || 0,
          osmolality_estimate: Number(aiNutrition.osmolality_estimate)  || 0,
        };
        customLabel = aiNutrition.display_name?.slice(0, 80) || null;
        nutritionPayload = buildLogPayload({
          perOzMacros,
          perOzMicros: aiNutrition.micros_per_oz ?? null,
          oz: amount,
          aiEstimated: true,
          nutritionIncomplete: conf < CONFIDENCE_THRESHOLD,
          confidence: conf,
          liquidType,
          customLabel,
        });
        console.log(`[hydration] AI path: ${customLabel} score=${nutritionPayload.hydration_profile.hydration_score} conf=${conf}`);
      } else {
        // === PATH B: Preset lookup, then lazy AI enrich, then fuzzy fallback.
        let bev: any = null;
        try {
          const { data, error } = await (supabase as any)
            .from('hydration_beverage_database')
            .select('*')
            .eq('liquid_type', liquidType)
            .maybeSingle();
          if (error) console.warn('[hydration] preset lookup error:', error.message);
          bev = data;
        } catch (e) {
          console.warn('[hydration] preset lookup failed', e);
        }

        // Fuzzy fallback: try ILIKE on display_name when exact liquid_type misses.
        if (!bev && liquidType !== 'water' && liquidType !== 'other') {
          try {
            const { data } = await (supabase as any)
              .from('hydration_beverage_database')
              .select('*')
              .ilike('display_name', `%${liquidType}%`)
              .limit(1);
            if (data && data.length > 0) {
              bev = data[0];
              console.log(`[hydration] fuzzy match: "${liquidType}" → "${bev.display_name}"`);
            }
          } catch (e) {
            console.warn('[hydration] fuzzy match failed', e);
          }
        }

        if (bev) {
          let perOzMacros: HydrationMacrosPerOz = {
            water_g:             Number(bev.water_g_per_oz)       || 0,
            sodium_mg:           Number(bev.sodium_mg_per_oz)     || 0,
            potassium_mg:        Number(bev.potassium_mg_per_oz)  || 0,
            magnesium_mg:        Number(bev.magnesium_mg_per_oz)  || 0,
            calcium_mg:          Number(bev.calcium_mg_per_oz)    || 0,
            sugar_g:             Number(bev.sugar_g_per_oz)       || 0,
            glucose_g:           Number(bev.glucose_g_per_oz)     || 0,
            fructose_g:          Number(bev.fructose_g_per_oz)    || 0,
            total_carbs_g:       Number(bev.total_carbs_g_per_oz) || 0,
            osmolality_estimate: Number(bev.osmolality_estimate)  || 0,
          };
          let microsPerOz: Partial<HydrationMicros> | null = bev.micros_per_oz ?? null;
          let confidence = 0.95; // preset = high confidence

          // Lazy enrich: if micros are empty, ask AI and persist back.
          const microsEmpty =
            !microsPerOz ||
            (typeof microsPerOz === 'object' && Object.keys(microsPerOz).length === 0);
          if (microsEmpty && liquidType !== 'water') {
            try {
              console.log(`[hydration] enriching "${bev.display_name}" via AI`);
              const { data: enrich, error: enrichErr } = await supabase.functions.invoke(
                'analyze-hydration-beverage',
                { body: { name: bev.display_name || liquidType, category: liquidType } },
              );
              if (enrichErr) {
                console.warn('[hydration] enrich error:', enrichErr.message);
              } else if (enrich?.micros_per_oz) {
                microsPerOz = enrich.micros_per_oz as Partial<HydrationMicros>;
                // Merge any new macros from enrichment if preset macros were 0/missing.
                if (enrich.macros_per_oz) {
                  perOzMacros = sanitizeMacrosPerOz({
                    ...enrich.macros_per_oz,
                    // Preserve preset values that are non-zero.
                    ...(Object.fromEntries(
                      Object.entries(perOzMacros).filter(([_, v]) => Number(v) > 0)
                    )),
                  });
                }
                // Persist micros back to beverage DB (cache forever).
                try {
                  await (supabase as any)
                    .from('hydration_beverage_database')
                    .update({ micros_per_oz: microsPerOz })
                    .eq('id', bev.id);
                  console.log(`[hydration] cached micros for "${bev.display_name}"`);
                } catch (e) {
                  console.warn('[hydration] cache persist failed', e);
                }
                if (typeof enrich.confidence === 'number') confidence = enrich.confidence;
              }
            } catch (e) {
              console.warn('[hydration] enrichment failed', e);
            }
          }

          // Self-heal: if preset DB row's micros fail category validation,
          // persist a healed version so future logs read clean data.
          try {
            const cat = inferCategory(bev.display_name || liquidType, liquidType);
            const orig = isComplete(cat, bev.micros_per_oz || {});
            if (!orig.ok) {
              const healed = applyFallbacks(cat, bev.micros_per_oz || {});
              await (supabase as any)
                .from('hydration_beverage_database')
                .update({ micros_per_oz: healed })
                .eq('id', bev.id);
              microsPerOz = healed;
              console.log(`[hydration] self-healed preset "${bev.display_name}" missing=[${orig.missing.join(',')}]`);
            }
          } catch (e) {
            console.warn('[hydration] self-heal failed', e);
          }

          nutritionPayload = buildLogPayload({
            perOzMacros,
            perOzMicros: microsPerOz,
            oz: amount,
            aiEstimated: microsEmpty, // true if we needed AI to fill micros
            nutritionIncomplete: false,
            confidence,
            liquidType,
            customLabel: bev.display_name || null,
          });
          console.log(`[hydration] preset path: ${bev.display_name} score=${nutritionPayload.hydration_profile.hydration_score}`);
        } else if (liquidType === 'water') {
          // Plain water → assume mostly water, no electrolytes.
          nutritionPayload = buildLogPayload({
            perOzMacros: { ...sanitizeMacrosPerOz({ water_g: OZ_TO_G }) },
            perOzMicros: null,
            oz: amount,
            aiEstimated: false,
            nutritionIncomplete: false,
            confidence: 1,
            liquidType,
          });
        } else {
          // === PATH C: Last-resort fallback — store with mostly-water assumption.
          console.warn(`[hydration] no preset/match for "${liquidType}" — storing partial data`);
          nutritionPayload = buildLogPayload({
            perOzMacros: { ...sanitizeMacrosPerOz({ water_g: OZ_TO_G * 0.95 }) },
            perOzMicros: null,
            oz: amount,
            aiEstimated: true,
            nutritionIncomplete: true,
            confidence: 0,
            liquidType,
          });
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

      // Single source of truth: optimistic UI then reconcile from DB.
      const newTotal = todayTotal + amount;
      setTodayTotal(newTotal);

      if (newTotal >= dailyGoal && todayTotal < dailyGoal) {
        toast.success('🎉 Daily hydration goal reached!', { duration: 5000 });
      } else {
        toast.success(`+${amount} oz logged!`);
      }

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
  }, [user, today, todayTotal, dailyGoal, fetchTodayLogs, buildLogPayload]);

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

  // Keep the latest fetchTodayLogs in a ref so the realtime subscription
  // useEffect can depend only on user.id (stable) without missing events.
  const fetchTodayLogsRef = useRef(fetchTodayLogs);
  useEffect(() => {
    fetchTodayLogsRef.current = fetchTodayLogs;
  }, [fetchTodayLogs]);

  // Initial load
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([fetchTodayLogs(), fetchSettings()]).then(() => {
        setLoading(false);
      });
    }
  }, [user, fetchTodayLogs, fetchSettings]);

  // Cross-instance + cross-tab sync. Depend on user.id ONLY so the channel
  // is not torn down on every render (which dropped postgres_changes events
  // and made hydration logs appear to "disappear" across hook instances).
  useEffect(() => {
    if (!user?.id) return;

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
          fetchTodayLogsRef.current();
        }
      };
    } catch {}

    const realtime = supabase
      .channel(`hydration_logs:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hydration_logs', filter: `user_id=eq.${user.id}` },
        () => fetchTodayLogsRef.current()
      )
      .subscribe();

    return () => {
      try { channel?.close(); } catch {}
      supabase.removeChannel(realtime);
    };
  }, [user?.id]);

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

  // Aggregate micronutrients across today's hydration logs. Falls back to the
  // top-level macro columns (calcium_mg / potassium_mg / magnesium_mg) for
  // legacy logs that don't have a `micros` jsonb populated yet.
  const totalHydrationMicros: HydrationMicros = sumMicros(
    todayLogs.map(l => {
      const m = (l as any).micros as Partial<HydrationMicros> | null | undefined;
      const hasJsonb = m && typeof m === 'object' && Object.keys(m).length > 0;
      if (hasJsonb) return m;
      // Fallback: synthesize a partial micros object from the top-level columns.
      const ca = Number((l as any).calcium_mg)   || 0;
      const k  = Number((l as any).potassium_mg) || 0;
      const mg = Number((l as any).magnesium_mg) || 0;
      if (ca === 0 && k === 0 && mg === 0) return null;
      return { calcium_mg: ca, potassium_mg: k, magnesium_mg: mg };
    })
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
