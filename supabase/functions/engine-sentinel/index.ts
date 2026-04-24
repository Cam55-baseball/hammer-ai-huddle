// Engine Sentinel — Truth-vs-Reality verification edge function.
// Cron-invoked hourly. Pure observer: reads only, never invokes compute-hammer-state.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  computeExpectedState,
  driftScore,
  DRIFT_THRESHOLD,
  SENTINEL_VERSION,
  type SentinelState,
  type TruthInputs,
} from './truth-model.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANCHOR_USER_ID = '95de827d-7418-460b-8b79-267bf79bdca4';
const POOL_SIZE = 10;

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'engine-sentinel',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

interface SentinelRow {
  user_id: string;
  expected_state: SentinelState;
  actual_state: SentinelState | null;
  drift_score: number;
  drift_flag: boolean;
  failure_reason: string | null;
  inputs_snapshot: Record<string, unknown>;
  engine_snapshot: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  const runId = crypto.randomUUID();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // 1. Select sentinel pool
    let _poolData: unknown = null;
    try {
      const r = await supabase.rpc('exec_sql' as never, {} as never);
      _poolData = r;
    } catch { /* rpc unavailable; continue with REST */ }

    // Pool selection via direct query (no exec_sql available; use REST)
    const poolUserIds = await selectPool(supabase);

    const rows: SentinelRow[] = [];
    for (const uid of poolUserIds) {
      try {
        rows.push(await evaluateUser(supabase, uid, runId));
      } catch (e) {
        rows.push({
          user_id: uid,
          expected_state: 'caution',
          actual_state: null,
          drift_score: 50,
          drift_flag: true,
          failure_reason: 'compute_error',
          inputs_snapshot: {},
          engine_snapshot: {},
          metadata: { run_id: runId, sentinel_version: SENTINEL_VERSION, error: String(e) },
        });
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await supabase.from('engine_sentinel_logs').insert(rows);
      if (insErr) console.error('[sentinel] insert failed', insErr);
    }

    // Audit log for each drift
    const drifts = rows.filter((r) => r.drift_flag);
    if (drifts.length > 0) {
      await supabase.from('audit_log').insert(
        drifts.map((d) => ({
          user_id: d.user_id,
          action: 'engine_drift_detected',
          table_name: 'engine_sentinel_logs',
          metadata: {
            run_id: runId,
            expected: d.expected_state,
            actual: d.actual_state,
            drift_score: d.drift_score,
            failure_reason: d.failure_reason,
            inputs: d.inputs_snapshot,
          },
        }))
      );
    }

    const worstDrift = rows.reduce((m, r) => Math.max(m, r.drift_score), 0);

    await logRun(supabase, 'success', t0, undefined, {
      users_evaluated: rows.length,
      drifts_flagged: drifts.length,
      worst_drift: worstDrift,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        users_evaluated: rows.length,
        drifts_flagged: drifts.length,
        worst_drift: worstDrift,
        run_ms: Date.now() - t0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[sentinel] fatal', e);
    await logRun(supabase, 'fail', t0, String(e));
    return new Response(
      JSON.stringify({ ok: false, error: String(e), run_ms: Date.now() - t0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function selectPool(supabase: any): Promise<string[]> {
  // Pull last 7 days of non-heartbeat logs and rank client-side.
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400_000).toISOString();

  const { data, error } = await supabase
    .from('custom_activity_logs')
    .select('user_id, created_at, perceived_intensity:performance_data, notes, entry_date')
    .gte('created_at', fourteenDaysAgo)
    .limit(10000);

  if (error || !data) {
    console.error('[sentinel] pool select failed', error);
    return [ANCHOR_USER_ID];
  }

  // Build sandbox-user exclusion set (adversarial sandbox accounts)
  const sandboxIds = new Set<string>();
  try {
    const { data: list } = await (supabase.auth.admin as unknown as {
      listUsers: (opts: { page: number; perPage: number }) => Promise<{ data: { users: Array<{ id: string; email?: string }> } }>;
    }).listUsers({ page: 1, perPage: 200 });
    for (const u of list?.users ?? []) {
      if (u.email && u.email.toLowerCase().endsWith('@hammers-system.local')) sandboxIds.add(u.id);
    }
  } catch (e) {
    console.warn('[sentinel] sandbox exclusion lookup failed', String(e));
  }

  const byUser = new Map<string, { logs7d: number; days14d: Set<string>; rpes7d: number[] }>();
  for (const row of data as Array<{ user_id: string; created_at: string; entry_date?: string; notes?: string | null; perceived_intensity?: unknown }>) {
    if (row.notes && row.notes.toLowerCase().includes('heartbeat')) continue;
    if (row.notes && row.notes.toLowerCase().startsWith('adversarial:')) continue;
    if (sandboxIds.has(row.user_id)) continue;
    const u = row.user_id;
    if (!byUser.has(u)) byUser.set(u, { logs7d: 0, days14d: new Set(), rpes7d: [] });
    const agg = byUser.get(u)!;
    agg.days14d.add(row.entry_date ?? row.created_at.slice(0, 10));
    if (row.created_at >= sevenDaysAgo) {
      agg.logs7d += 1;
      const pd = row.perceived_intensity as { rpe?: number } | null;
      if (pd && typeof pd.rpe === 'number') agg.rpes7d.push(pd.rpe);
    }
  }

  const ranked: Array<{ uid: string; score: number }> = [];
  for (const [uid, agg] of byUser.entries()) {
    if (agg.logs7d < 5) continue;
    const variance = stddev(agg.rpes7d);
    const score = agg.logs7d * 0.4 + agg.days14d.size * 2 + variance * 5;
    ranked.push({ uid, score });
  }
  ranked.sort((a, b) => b.score - a.score);

  const pool = ranked.slice(0, POOL_SIZE).map((r) => r.uid);
  if (!pool.includes(ANCHOR_USER_ID)) pool.push(ANCHOR_USER_ID);
  return pool;
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

async function evaluateUser(
  supabase: any,
  userId: string,
  runId: string
): Promise<SentinelRow> {
  const now = Date.now();
  const sixHoursAgo = new Date(now - 6 * 3600_000).toISOString();
  const twentyFourHoursAgo = new Date(now - 24 * 3600_000).toISOString();
  const threeDaysAgo = new Date(now - 3 * 86400_000).toISOString();

  // Pull recent logs in one query, slice client-side
  const { data: logs } = await supabase
    .from('custom_activity_logs')
    .select('created_at, entry_date, actual_duration_minutes, performance_data, notes')
    .eq('user_id', userId)
    .gte('created_at', threeDaysAgo)
    .order('created_at', { ascending: false });

  const cleanLogs = ((logs ?? []) as Array<Record<string, unknown>>).filter(
    (l) => !String(l.notes ?? '').toLowerCase().includes('heartbeat')
  );

  let completions_6h = 0;
  let completions_24h = 0;
  const days3d = new Set<string>();
  const rpes24h: number[] = [];
  const durations24h: number[] = [];

  for (const l of cleanLogs as Array<{
    created_at: string;
    entry_date?: string;
    actual_duration_minutes?: number | null;
    performance_data?: { rpe?: number } | null;
  }>) {
    if (l.created_at >= sixHoursAgo) completions_6h += 1;
    if (l.created_at >= twentyFourHoursAgo) {
      completions_24h += 1;
      const r = l.performance_data?.rpe;
      if (typeof r === 'number') rpes24h.push(r);
      if (typeof l.actual_duration_minutes === 'number') durations24h.push(l.actual_duration_minutes);
    }
    days3d.add(l.entry_date ?? l.created_at.slice(0, 10));
  }

  const lastLogTs = cleanLogs[0]?.created_at as string | undefined;
  const hours_since_last_activity = lastLogTs
    ? (now - new Date(lastLogTs).getTime()) / 3600_000
    : null;

  const inputs: TruthInputs = {
    completions_6h,
    completions_24h,
    sessions_3d: days3d.size,
    avg_rpe_24h: rpes24h.length ? rpes24h.reduce((s, x) => s + x, 0) / rpes24h.length : null,
    max_rpe_24h: rpes24h.length ? Math.max(...rpes24h) : null,
    avg_duration_24h: durations24h.length
      ? durations24h.reduce((s, x) => s + x, 0) / durations24h.length
      : null,
    sleep_quality_24h: null, // not wired yet
    hours_since_last_activity,
  };

  const truth = computeExpectedState(inputs);

  // Pull latest engine snapshot
  const { data: snap } = await supabase
    .from('hammer_state_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let actual_state: SentinelState | null = null;
  let failure_reason: string | null = null;
  let score = 0;

  if (!snap) {
    failure_reason = 'no_snapshot';
    score = 100;
  } else {
    const ageMs = now - new Date((snap as { computed_at: string }).computed_at).getTime();
    actual_state = (snap as { overall_state: SentinelState }).overall_state ?? null;
    if (ageMs > 24 * 3600_000) {
      failure_reason = 'stale_snapshot';
      score = Math.max(80, driftScore(truth.expected_state, actual_state));
    } else {
      score = driftScore(truth.expected_state, actual_state);
      if (score >= DRIFT_THRESHOLD) failure_reason = 'state_mismatch';
    }
  }

  const drift_flag = score >= DRIFT_THRESHOLD;

  return {
    user_id: userId,
    expected_state: truth.expected_state,
    actual_state,
    drift_score: score,
    drift_flag,
    failure_reason,
    inputs_snapshot: {
      ...inputs,
      load_score: truth.load_score,
      recovery_score: truth.recovery_score,
      freshness_score: truth.freshness_score,
    },
    engine_snapshot: snap
      ? {
          computed_at: (snap as { computed_at: string }).computed_at,
          overall_state: (snap as { overall_state: string }).overall_state,
          arousal_score: (snap as { arousal_score?: number }).arousal_score ?? null,
          recovery_score: (snap as { recovery_score?: number }).recovery_score ?? null,
          dopamine_load: (snap as { dopamine_load?: number }).dopamine_load ?? null,
          cognitive_load: (snap as { cognitive_load?: number }).cognitive_load ?? null,
          motor_state: (snap as { motor_state?: string }).motor_state ?? null,
        }
      : {},
    metadata: { run_id: runId, sentinel_version: SENTINEL_VERSION, threshold: DRIFT_THRESHOLD },
  };
}
