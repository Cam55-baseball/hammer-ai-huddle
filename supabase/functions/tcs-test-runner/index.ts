// Tissue Cost Scheduler — reliability runner (Step 5 §2).
//
// Runs the SAME sweep code the vitest suite and the bun script run, inside this
// project, on a schedule, and writes one row per run to public.tcs_test_runs.
//
//   POST { action: "start", tier: "fast" | "full" }  -> creates the run, returns its id
//   POST { action: "work", run_id }                  -> internal: drains chunks
//
// Work is split into chunks so a 100,000-season run fits inside the function's
// time budget: each invocation claims chunks until its budget is spent, then
// hands off to a fresh invocation. Nothing here touches athlete data or any
// production code path.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { runSweep } from "../_shared/wic/schedule/tissueCost/sweep.ts";
import { TCS_CONFIG_HASH, TCS_THRESHOLDS } from "../_shared/wic/schedule/tissueCost/config.ts";
import { canonicalJson, fnv1a64Hex } from "../_shared/wic/determinism/globalDeterminismLock.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RUNNER_TOKEN = Deno.env.get("TCS_RUNNER_TOKEN") ?? "";
const GIT_SHA = Deno.env.get("TCS_GIT_SHA") ?? null;

const THRESHOLDS_HASH = fnv1a64Hex(canonicalJson(TCS_THRESHOLDS));

// The edge runtime enforces a hard CPU budget per request (~2s), and one
// simulated athlete-season costs ~0.6s of CPU. Chunks are therefore tiny and
// the work is spread across many short invocations.
const TIERS = {
  fast: { seasons: 2000, chunkSeasons: 2, workers: 12 },
  full: { seasons: 100_000, chunkSeasons: 2, workers: 24 },
} as const;

const BASE_SEED = 20260920;
const BUDGET_MS = 900;

const db = () => createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/**
 * Two accepted callers: the TCS_RUNNER_TOKEN secret (manual / CI) and the
 * token row the scheduled job reads out of the database. No user token works.
 */
let dbToken: string | null = null;
async function authorized(token: string): Promise<boolean> {
  if (RUNNER_TOKEN && token === RUNNER_TOKEN) return true;
  if (dbToken === null) {
    const { data } = await db().from("tcs_runner_auth").select("token").limit(1).maybeSingle();
    dbToken = data?.token ?? "";
  }
  return !!dbToken && token === dbToken;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function selfInvoke(payload: unknown) {
  // fire and forget — the next invocation picks the work up
  fetch(`${SUPABASE_URL}/functions/v1/tcs-test-runner`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tcs-token": RUNNER_TOKEN || (dbToken ?? ""),
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

async function start(tier: "fast" | "full", overrides: Record<string, number> = {}) {
  const plan = TIERS[tier];
  const seasons = Math.max(1, Math.floor(overrides.seasons ?? plan.seasons));
  const chunkSeasons = Math.max(1, Math.floor(overrides.chunkSeasons ?? plan.chunkSeasons));
  const workers = Math.max(1, Math.floor(overrides.workers ?? plan.workers));
  const seed = Math.floor(overrides.seed ?? BASE_SEED);
  const chunkCount = Math.ceil(seasons / chunkSeasons);

  const sb = db();
  const { data: run, error } = await sb
    .from("tcs_test_runs")
    .insert({
      tier,
      seed,
      git_sha: GIT_SHA,
      config_hash: TCS_CONFIG_HASH,
      thresholds_hash: THRESHOLDS_HASH,
      status: "running",
      chunks_total: chunkCount,
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 500);

  const chunks = Array.from({ length: chunkCount }, (_, i) => ({
    run_id: run.id,
    chunk_index: i,
    seed: seed + i,
    seasons: Math.min(chunkSeasons, seasons - i * chunkSeasons),
  }));
  for (let i = 0; i < chunks.length; i += 500) {
    const { error: e2 } = await sb.from("tcs_test_run_chunks").insert(chunks.slice(i, i + 500));
    if (e2) return json({ error: e2.message }, 500);
  }

  for (let w = 0; w < Math.min(workers, chunkCount); w++) selfInvoke({ action: "work", run_id: run.id });

  return json({ run_id: run.id, tier, seasons, chunks: chunkCount, seed });
}

async function work(runId: string) {
  const sb = db();
  const started = Date.now();
  let processed = 0;

  while (Date.now() - started < BUDGET_MS) {
    const { data: chunk, error } = await sb.rpc("claim_tcs_chunk", { _run_id: runId });
    if (error) return json({ error: error.message }, 500);
    if (!chunk || (Array.isArray(chunk) && chunk.length === 0)) break;
    const c = Array.isArray(chunk) ? chunk[0] : chunk;
    if (!c?.id) break;

    const t0 = Date.now();
    try {
      const r = runSweep({ seed: Number(c.seed), seasons: Number(c.seasons) });
      await sb
        .from("tcs_test_run_chunks")
        .update({
          status: "done",
          days_checked: r.daysChecked,
          deep_checks: r.deepChecks,
          violations_count: r.violations.length,
          violations: r.violations.slice(0, 20),
          duration_seconds: (Date.now() - t0) / 1000,
          finished_at: new Date().toISOString(),
        })
        .eq("id", c.id);
    } catch (e) {
      await sb
        .from("tcs_test_run_chunks")
        .update({
          status: "error",
          error: String(e),
          duration_seconds: (Date.now() - t0) / 1000,
          finished_at: new Date().toISOString(),
        })
        .eq("id", c.id);
    }
    processed++;
  }

  // Hand the chain straight on while work remains. finalize_tcs_run locks the
  // run row, so it runs once at the end rather than after every chunk.
  const { count } = await sb
    .from("tcs_test_run_chunks")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId)
    .in("status", ["pending", "running"]);

  if ((count ?? 0) > 0) {
    selfInvoke({ action: "work", run_id: runId });
  } else {
    await sb.rpc("finalize_tcs_run", { _run_id: runId });
  }

  return json({ run_id: runId, processed, pending: count ?? 0 });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = req.headers.get("x-tcs-token") ?? "";
  if (!token || !(await authorized(token))) return json({ error: "unauthorized" }, 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json body" }, 400);
  }

  const action = String(body.action ?? "");
  if (action === "start") {
    const tier = body.tier === "full" ? "full" : "fast";
    const overrides: Record<string, number> = {};
    for (const k of ["seasons", "chunkSeasons", "workers", "seed"]) {
      if (typeof body[k] === "number" && Number.isFinite(body[k] as number)) {
        overrides[k] = body[k] as number;
      }
    }
    return await start(tier, overrides);
  }
  if (action === "work") {
    const runId = String(body.run_id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(runId)) return json({ error: "bad run_id" }, 400);
    return await work(runId);
  }
  return json({ error: "unknown action" }, 400);
});
