// =====================================================================
// EXHAUSTIVE RUNNING AGGREGATOR
// =====================================================================
// Scans every place running can be logged, normalizes to miles, and
// returns unified totals so short-distance runners get full credit.
// =====================================================================

import { supabase } from '@/integrations/supabase/client';

export type DateRange = 'week' | 'month' | 'all';

type Unit = 'miles' | 'kilometers' | 'meters' | 'yards' | 'feet' | string | null | undefined;

export interface RunningSourceBreakdown {
  customActivities: { sessions: number; miles: number };
  embedded: { sessions: number; miles: number };
  intervals: { sessions: number; miles: number };
  cardioExercises: { sessions: number; miles: number };
  runningSessions: { sessions: number; miles: number };
  speedSessions: { sessions: number; miles: number };
  blockSprints: { sessions: number; miles: number };
}

export interface RunningStats {
  totalDistanceMiles: number;
  totalDistanceYards: number;
  totalDuration: number; // minutes
  totalSessions: number;
  avgPace: string; // min/mile or "—:—"
  bySource: RunningSourceBreakdown;
  shortDistanceMiles: number; // sum of efforts under 1 mile each
}

const MILE_YARDS = 1760;

export function toMiles(value: number | null | undefined, unit: Unit): number {
  if (!value || !isFinite(value) || value <= 0) return 0;
  const u = (unit || 'miles').toString().toLowerCase();
  if (u.startsWith('mile')) return value;
  if (u.startsWith('km') || u.startsWith('kilo')) return value / 1.609;
  if (u.startsWith('meter') || u === 'm') return value / 1609.34;
  if (u.startsWith('yard') || u === 'yd' || u === 'y') return value / 1760;
  if (u.startsWith('feet') || u === 'ft') return value / 5280;
  return value; // assume miles
}

const RUN_NAME_RE = /\b(run|sprint|jog|dash|hill|interval|tempo|mile|fartlek|stride|shuttle)\b/i;

// Parse distance from strings like "Hill Sprints (40yd)", "200m repeats", "60 yard dash"
function parseDistanceFromName(name: string): { value: number; unit: Unit } | null {
  if (!name) return null;
  const m = name.match(/(\d+(?:\.\d+)?)\s*(yd|yard|yards|y|m|meter|meters|ft|feet|mi|mile|miles|km)\b/i);
  if (!m) return null;
  const value = parseFloat(m[1]);
  const unitRaw = m[2].toLowerCase();
  return { value, unit: unitRaw };
}

function emptyBreakdown(): RunningSourceBreakdown {
  return {
    customActivities: { sessions: 0, miles: 0 },
    embedded: { sessions: 0, miles: 0 },
    intervals: { sessions: 0, miles: 0 },
    cardioExercises: { sessions: 0, miles: 0 },
    runningSessions: { sessions: 0, miles: 0 },
    speedSessions: { sessions: 0, miles: 0 },
    blockSprints: { sessions: 0, miles: 0 },
  };
}

function rangeStart(range: DateRange): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'week') {
    const day = d.getDay();
    d.setDate(d.getDate() - day);
  } else {
    d.setDate(1);
  }
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function aggregateAllRunning(
  userId: string,
  sport: 'baseball' | 'softball',
  range: DateRange
): Promise<RunningStats> {
  const startDate = rangeStart(range);
  const startISO = startDate ? new Date(startDate).toISOString() : null;
  const bySource = emptyBreakdown();
  let totalMiles = 0;
  let totalDuration = 0;
  let totalSessions = 0;
  let shortDistanceMiles = 0;

  const addEffort = (
    bucket: keyof RunningSourceBreakdown,
    miles: number,
    durationMin: number = 0,
    countSession: boolean = true
  ) => {
    if (miles <= 0 && durationMin <= 0) return;
    bySource[bucket].miles += miles;
    if (countSession) bySource[bucket].sessions += 1;
    totalMiles += miles;
    totalDuration += durationMin;
    if (countSession) totalSessions += 1;
    if (miles > 0 && miles < 1) shortDistanceMiles += miles;
  };

  // ---- 1-5: completed custom_activity_logs joined with templates ----
  try {
    let q = supabase
      .from('custom_activity_logs')
      .select('id, entry_date, actual_duration_minutes, custom_activity_templates!inner(activity_type, distance_value, distance_unit, duration_minutes, embedded_running_sessions, intervals, exercises, sport)')
      .eq('user_id', userId)
      .eq('completed', true);
    if (startDate) q = q.gte('entry_date', startDate);
    const { data: logs } = await q;

    (logs || []).forEach((log: any) => {
      const t = log.custom_activity_templates;
      if (!t) return;
      // soft sport filter — include matches and nulls
      if (t.sport && t.sport !== sport) return;

      const duration = log.actual_duration_minutes || t.duration_minutes || 0;
      const isRunningCard = t.activity_type === 'running';

      // 1. Standard running card main distance
      if (isRunningCard && t.distance_value) {
        const miles = toMiles(Number(t.distance_value), t.distance_unit);
        addEffort('customActivities', miles, duration, true);
      } else if (duration > 0 && isRunningCard) {
        addEffort('customActivities', 0, duration, true);
      }

      // 2. Embedded running sessions (any activity_type)
      const embedded = Array.isArray(t.embedded_running_sessions) ? t.embedded_running_sessions : [];
      embedded.forEach((s: any) => {
        const miles = toMiles(Number(s.distance_value), s.distance_unit);
        if (miles > 0) addEffort('embedded', miles, 0, true);
      });

      // 3. Intervals (jsonb)
      const intervals = Array.isArray(t.intervals) ? t.intervals : [];
      intervals.forEach((iv: any) => {
        const miles = toMiles(Number(iv.distance), iv.distanceUnit || iv.distance_unit);
        if (miles > 0) addEffort('intervals', miles, 0, true);
      });

      // 5. Cardio / sprint-named exercises inside the card
      const exercises = Array.isArray(t.exercises) ? t.exercises : [];
      exercises.forEach((ex: any) => {
        const name = (ex?.name || '').toString();
        const isRunish = ex?.type === 'cardio' || RUN_NAME_RE.test(name);
        if (!isRunish) return;
        const sets = Number(ex.sets) || 1;
        const reps = Number(ex.reps) || 1;
        const parsed = parseDistanceFromName(name);
        if (parsed) {
          const milesPerRep = toMiles(parsed.value, parsed.unit);
          addEffort('cardioExercises', milesPerRep * sets * reps, 0, true);
        } else if (ex.duration) {
          // Estimate via 6 mph default jog: 6 mph = 0.1 mile/min
          const minutes = Number(ex.duration) / 60;
          addEffort('cardioExercises', minutes * 0.1, minutes, true);
        }
      });
    });
  } catch (e) {
    console.error('[runningAggregator] custom logs error', e);
  }

  // ---- 6: dedicated running_sessions ----
  try {
    let q = supabase
      .from('running_sessions')
      .select('id, distance_value, distance_unit, intervals, completed_at, actual_time')
      .eq('user_id', userId)
      .eq('completed', true);
    if (startISO) q = q.gte('completed_at', startISO);
    const { data: rs } = await q;
    (rs || []).forEach((r: any) => {
      const miles = toMiles(Number(r.distance_value), r.distance_unit);
      let intervalMiles = 0;
      const intervals = Array.isArray(r.intervals) ? r.intervals : [];
      intervals.forEach((iv: any) => {
        intervalMiles += toMiles(Number(iv.distance), iv.distanceUnit || iv.distance_unit);
      });
      const total = miles + intervalMiles;
      if (total > 0) addEffort('runningSessions', total, 0, true);
    });
  } catch (e) {
    console.error('[runningAggregator] running_sessions error', e);
  }

  // ---- 7: speed_sessions distances {"10y":[...]} ----
  try {
    let q = supabase
      .from('speed_sessions')
      .select('id, distances, session_date, sport')
      .eq('user_id', userId)
      .eq('is_break_day', false);
    if (startDate) q = q.gte('session_date', startDate);
    const { data: ss } = await q;
    (ss || []).forEach((s: any) => {
      const distances = s.distances || {};
      let sessionYards = 0;
      let repCount = 0;
      Object.entries(distances).forEach(([key, reps]) => {
        if (!Array.isArray(reps) || reps.length === 0) return;
        // key like "10y", "30y", "60y", "40y", "20y", "7y"
        const m = key.match(/(\d+(?:\.\d+)?)\s*(yd|y|m|meter|ft)?/i);
        if (!m) return;
        const dist = parseFloat(m[1]);
        const unit = (m[2] || 'y').toLowerCase();
        const yardsPerRep = unit.startsWith('m') && unit !== 'mile'
          ? dist * 1.0936 // meters → yards
          : unit === 'ft' ? dist / 3 : dist;
        sessionYards += yardsPerRep * reps.length;
        repCount += reps.length;
      });
      if (sessionYards > 0) {
        addEffort('speedSessions', sessionYards / MILE_YARDS, 0, true);
      }
    });
  } catch (e) {
    console.error('[runningAggregator] speed_sessions error', e);
  }

  // ---- 8: block_exercises sprints from completed program workouts ----
  try {
    // Get user's training blocks
    const { data: blocks } = await supabase
      .from('training_blocks')
      .select('id')
      .eq('user_id', userId);
    const blockIds = (blocks || []).map((b: any) => b.id);
    if (blockIds.length > 0) {
      let wq = supabase
        .from('block_workouts')
        .select('id, completed_at, status, block_exercises(name, sets, reps)')
        .in('block_id', blockIds)
        .eq('status', 'completed');
      if (startISO) wq = wq.gte('completed_at', startISO);
      const { data: workouts } = await wq;
      (workouts || []).forEach((w: any) => {
        const exs = Array.isArray(w.block_exercises) ? w.block_exercises : [];
        let workoutYards = 0;
        let any = false;
        exs.forEach((ex: any) => {
          const name = (ex?.name || '').toString();
          if (!RUN_NAME_RE.test(name)) return;
          const sets = Number(ex.sets) || 1;
          const reps = Number(ex.reps) || 1;
          const parsed = parseDistanceFromName(name);
          let yardsPerRep = 30; // default sprint distance
          if (parsed) {
            const u = (parsed.unit || '').toString().toLowerCase();
            yardsPerRep = u.startsWith('m') && !u.startsWith('mi')
              ? parsed.value * 1.0936
              : u.startsWith('mi') ? parsed.value * MILE_YARDS
              : u === 'ft' ? parsed.value / 3
              : parsed.value;
          }
          workoutYards += yardsPerRep * sets * reps;
          any = true;
        });
        if (any && workoutYards > 0) {
          addEffort('blockSprints', workoutYards / MILE_YARDS, 0, true);
        }
      });
    }
  } catch (e) {
    console.error('[runningAggregator] block_exercises error', e);
  }

  // Pace: only if meaningful data
  let avgPace = '—:—';
  if (totalMiles >= 0.5 && totalDuration > 0) {
    const paceMin = totalDuration / totalMiles;
    const m = Math.floor(paceMin);
    const s = Math.round((paceMin - m) * 60);
    avgPace = `${m}:${String(s).padStart(2, '0')}`;
  }

  return {
    totalDistanceMiles: Math.round(totalMiles * 100) / 100,
    totalDistanceYards: Math.round(totalMiles * MILE_YARDS),
    totalDuration: Math.round(totalDuration),
    totalSessions,
    avgPace,
    bySource,
    shortDistanceMiles: Math.round(shortDistanceMiles * 100) / 100,
  };
}
