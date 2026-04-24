// Adversarial Drift Engine — actively tries to trick the engine with known failure patterns.
// Cron-invoked every 6h. Service-role only. Operates only on dedicated sandbox auth users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { SCENARIOS, FORBIDDEN, EXPECTED, generateScenario, type ScenarioName } from './scenarios.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SANDBOX_EMAIL_DOMAIN = '@hammers-system.local';
const SANDBOX_COUNT = 3;
const POLL_MAX_MS = 30_000;
const POLL_INTERVAL_MS = 2_000;

// Phase 7 — Observability wrapper
async function logRun(supabase: any, status: 'success'|'fail'|'timeout', startMs: number, error?: string, metadata?: any) {
  try {
    await supabase.from('engine_function_logs').insert({
      function_name: 'engine-adversarial',
      status,
      duration_ms: Date.now() - startMs,
      error_message: error ?? null,
      metadata: metadata ?? {},
    });
  } catch { /* silent */ }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SB = any;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const t0 = Date.now();
  const runId = crypto.randomUUID();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const sandboxIds = await ensureSandboxUsers(supabase);
    const results: Array<{ scenario: ScenarioName; pass: boolean; failure_reason: string | null; actual_state: string | null }> = [];

    for (let i = 0; i < SCENARIOS.length; i++) {
      const scenario = SCENARIOS[i];
      const userId = sandboxIds[i % SANDBOX_COUNT];
      try {
        const r = await runScenario(supabase, scenario, userId, runId);
        results.push({ scenario, pass: r.pass, failure_reason: r.failure_reason, actual_state: r.actual_state });
      } catch (e) {
        const errMsg = String(e);
        await supabase.from('engine_adversarial_logs').insert({
          run_at: new Date().toISOString(),
          scenario,
          user_id: userId,
          expected_state: EXPECTED[scenario],
          forbidden_states: FORBIDDEN[scenario],
          actual_state: null,
          pass: false,
          failure_reason: 'pipeline_error',
          inputs: {},
          engine_output: {},
          metadata: { run_id: runId, error: errMsg },
        });
        results.push({ scenario, pass: false, failure_reason: 'pipeline_error', actual_state: null });
      }
    }

    const passed = results.filter((r) => r.pass).length;
    await logRun(supabase, 'success', t0, undefined, {
      scenarios_run: results.length,
      passed,
      failed: results.length - passed,
    });
    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        scenarios_run: results.length,
        passed,
        failed: results.length - passed,
        results,
        run_ms: Date.now() - t0,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('[adversarial] fatal', e);
    await logRun(supabase, 'fail', t0, String(e));
    return new Response(
      JSON.stringify({ ok: false, error: String(e), run_ms: Date.now() - t0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function ensureSandboxUsers(supabase: SB): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 1; i <= SANDBOX_COUNT; i++) {
    const email = `adversarial-sandbox-${i}${SANDBOX_EMAIL_DOMAIN}`;
    // Try lookup via admin list (filter by email)
    const { data: list } = await (supabase.auth.admin as unknown as {
      listUsers: (opts: { page: number; perPage: number }) => Promise<{ data: { users: Array<{ id: string; email?: string }> } }>;
    }).listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) {
      ids.push(existing.id);
      continue;
    }
    const password = crypto.randomUUID() + '!Aa1';
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Adversarial Sandbox ${i}`, system_account: true },
    });
    if (createErr || !created?.user) {
      throw new Error(`sandbox_create_failed:${i}:${createErr?.message ?? 'unknown'}`);
    }
    ids.push(created.user.id);
    // Profile + mpi settings auto-created by handle_new_user trigger; nothing else required.
  }
  return ids;
}

async function runScenario(
  supabase: SB,
  scenario: ScenarioName,
  userId: string,
  runId: string
): Promise<{ pass: boolean; failure_reason: string | null; actual_state: string | null }> {
  const tStart = Date.now();

  // A. RESET: clear prior synthetic logs for this sandbox user
  await supabase
    .from('custom_activity_logs')
    .delete()
    .eq('user_id', userId)
    .like('notes', 'adversarial:%');

  // Clear stale snapshots > 1h old
  const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
  await supabase
    .from('hammer_state_snapshots')
    .delete()
    .eq('user_id', userId)
    .lt('computed_at', oneHourAgo);

  // B. INJECT (preflight probe first to catch contract violations loudly)
  const logs = generateScenario(scenario, userId);
  if (logs.length > 0) {
    const [probe, ...rest] = logs;
    const { error: probeErr } = await supabase.from('custom_activity_logs').insert(probe);
    if (probeErr) {
      await supabase.from('engine_adversarial_logs').insert({
        run_at: new Date().toISOString(),
        scenario,
        user_id: userId,
        expected_state: EXPECTED[scenario],
        forbidden_states: FORBIDDEN[scenario],
        actual_state: null,
        pass: false,
        failure_reason: 'invalid_insert_contract',
        inputs: { log_count: logs.length, probe_sample: probe },
        engine_output: {},
        metadata: { run_id: runId, db_error: probeErr.message, db_details: probeErr.details ?? null, db_hint: probeErr.hint ?? null },
      });
      return { pass: false, failure_reason: 'invalid_insert_contract', actual_state: null };
    }
    if (rest.length > 0) {
      const { error: insErr } = await supabase.from('custom_activity_logs').insert(rest);
      if (insErr) throw new Error(`inject_failed_after_probe:${insErr.message}`);
    }
  }

  // Sleep-signal injection for fake_recovery / low_load_high_readiness via profiles upsert if columns exist.
  if (scenario === 'fake_recovery' || scenario === 'low_load_high_readiness') {
    // Best-effort: write to profiles.last_sleep_quality if column exists. Ignore errors silently.
    try {
      await (supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> } } })
        .from('profiles')
        .update({ last_sleep_quality: 5 })
        .eq('id', userId);
    } catch (_) { /* column may not exist; non-fatal */ }
  }

  // C. PIPELINE TRIGGER
  try {
    await supabase.functions.invoke('hie-refresh-worker', { body: {} });
  } catch (e) {
    console.warn(`[adversarial:${scenario}] hie-refresh-worker invoke warn`, String(e));
  }
  try {
    await supabase.functions.invoke('compute-hammer-state', { body: { user_id: userId } });
  } catch (e) {
    console.warn(`[adversarial:${scenario}] compute-hammer-state invoke warn`, String(e));
  }

  // D. POLL for fresh snapshot
  const pollStart = Date.now();
  let snapshot: Record<string, unknown> | null = null;
  while (Date.now() - pollStart < POLL_MAX_MS) {
    const { data } = await supabase
      .from('hammer_state_snapshots')
      .select('*')
      .eq('user_id', userId)
      .gte('computed_at', new Date(tStart).toISOString())
      .order('computed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      snapshot = data as Record<string, unknown>;
      break;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  const actual_state = (snapshot?.overall_state as string | undefined) ?? null;
  const forbidden = FORBIDDEN[scenario];
  const expected = EXPECTED[scenario];

  let pass: boolean;
  let failure_reason: string | null = null;

  if (!actual_state) {
    pass = false;
    failure_reason = 'timeout';
  } else if (forbidden.includes(actual_state)) {
    pass = false;
    failure_reason = 'forbidden_state_returned';
  } else {
    pass = true;
  }

  const inputsSummary = {
    log_count: logs.length,
    rpe_distribution: countBy(logs.map((l) => l.performance_data.rpe)),
    earliest_ms_ago: logs.length ? Math.max(...logs.map((l) => Date.now() - new Date(l.created_at).getTime())) : 0,
    latest_ms_ago: logs.length ? Math.min(...logs.map((l) => Date.now() - new Date(l.created_at).getTime())) : 0,
  };

  const engineOutput = snapshot
    ? {
        computed_at: snapshot.computed_at,
        overall_state: snapshot.overall_state,
        arousal_score: snapshot.arousal_score ?? null,
        recovery_score: snapshot.recovery_score ?? null,
        dopamine_load: snapshot.dopamine_load ?? null,
        cognitive_load: snapshot.cognitive_load ?? null,
        motor_state: snapshot.motor_state ?? null,
      }
    : {};

  // E. PERSIST
  await supabase.from('engine_adversarial_logs').insert({
    run_at: new Date().toISOString(),
    scenario,
    user_id: userId,
    expected_state: expected,
    forbidden_states: forbidden,
    actual_state,
    pass,
    failure_reason,
    inputs: inputsSummary,
    engine_output: engineOutput,
    metadata: {
      run_id: runId,
      duration_ms: Date.now() - tStart,
      sandbox_user_id: userId,
    },
  });

  if (!pass) {
    await supabase.from('audit_log').insert({
      user_id: userId,
      action: 'engine_adversarial_fail',
      table_name: 'engine_adversarial_logs',
      metadata: {
        run_id: runId,
        scenario,
        expected,
        forbidden,
        actual: actual_state,
        failure_reason,
        inputs: inputsSummary,
      },
    });
  }

  return { pass, failure_reason, actual_state };
}

function countBy(nums: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of nums) out[String(n)] = (out[String(n)] ?? 0) + 1;
  return out;
}
