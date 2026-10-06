/**
 * Daily plan job — builds today's Hammers Today plan for every started player,
 * on each player's own local day. NOT scheduled; the owner schedules it.
 *
 *   mode "build" (default): build any started player's missing plan for today.
 *   mode "check":           same pass, run later as the safety net — every
 *                           missing plan is retried once and any failure is
 *                           logged to wk_daily_plan_runs.
 *
 * Only plans that do not exist yet are built, so a plan with anything marked
 * is never touched (the planner also refuses to rebuild a marked plan).
 * Safe to call repeatedly: a second call finds every plan already present.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { runPool, CONCURRENCY, RUN_BUDGET_MS } from "./scheduler.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function localDate(tz: string | null, now = new Date()): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

// Job lock (owner-authorised 2026-10-06): every mode requires header
// x-job-token whose SHA-256 hex matches this digest. The token itself lives
// in Vault (wk_daily_plan_job_token) and is never logged or echoed here.
const JOB_TOKEN_SHA256 = "92a0d7f956decec62aeaf2c309a150a936afda73572d8755f9b3999fc91325c9";

async function tokenOk(req: Request): Promise<boolean> {
  const t = req.headers.get("x-job-token");
  if (!t) return false;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== JOB_TOKEN_SHA256.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ JOB_TOKEN_SHA256.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!(await tokenOk(req))) return new Response(null, { status: 401, headers: corsHeaders });
  const URL_ = Deno.env.get("SUPABASE_URL")!;
  const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(URL_, SERVICE);

  const body = (await req.json().catch(() => ({}))) as { mode?: string; limit?: number };
  // mode "recheck": re-run the final rule check on every saved plan from each
  // player's local today forward, in date order; failing unmarked plans are
  // rebuilt by wk-generate-daily (verify_saved), marked cards are never touched.
  if (body.mode === "recheck") {
    const utcYesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    const { data: rx, error: rxErr } = await admin.from("wk_prescriptions")
      .select("user_id, plan_date").gte("plan_date", utcYesterday).limit(50000);
    if (rxErr) return json({ error: rxErr.message }, 500);
    const byUser = new Map<string, Set<string>>();
    for (const r of (rx ?? []) as any[]) {
      if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
      byUser.get(r.user_id)!.add(String(r.plan_date));
    }
    const { data: tzs } = await admin.from("profiles").select("id, timezone").in("id", [...byUser.keys()]);
    const tzOf = new Map(((tzs ?? []) as any[]).map((p) => [p.id, p.timezone]));
    const out = { players: 0, days: 0, passed: 0, rebuilt: 0, trimmed: 0, failed: 0, failures: [] as string[] };
    for (const [uid, dates] of byUser) {
      out.players++;
      const today = localDate(tzOf.get(uid) ?? null);
      for (const d of [...dates].filter((x) => x >= today).sort()) {
        out.days++;
        try {
          const r = await fetch(`${URL_}/functions/v1/wk-generate-daily`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}`, apikey: SERVICE },
            body: JSON.stringify({ user_id: uid, plan_date: d, verify_saved: true }),
          });
          const b = await r.json().catch(() => ({}));
          if (!r.ok) { out.failed++; out.failures.push(`${uid} ${d} HTTP ${r.status} ${String(b?.error ?? "")}`); }
          else if (b.verified === true) out.passed++;
          else if (typeof b.trimmed === "number") out.trimmed++;
          else out.rebuilt++;
        } catch (e) { out.failed++; out.failures.push(`${uid} ${d} ${String(e).slice(0, 120)}`); }
      }
    }
    return json({ ok: true, mode: "recheck", ...out });
  }
  // mode "dry_run": the real scheduler over N fake players whose build takes
  // simulated_ms — no database reads or writes. Proves batching at scale.
  if (body.mode === "dry_run") {
    const n = Math.min(Math.max(Number((body as any).players ?? 1000) || 1000, 1), 20000);
    const ms = Math.min(Math.max(Number((body as any).simulated_ms ?? 3000) || 3000, 1), 60000);
    const budgetMs = Math.min(Number((body as any).budget_ms ?? RUN_BUDGET_MS) || RUN_BUDGET_MS, RUN_BUDGET_MS);
    const items = Array.from({ length: n }, (_, i) => i);
    const r = await runPool(items, () => new Promise((res) => setTimeout(res, ms)), { budgetMs });
    return json({ ok: true, mode: "dry_run", players: n, simulated_ms: ms, concurrency: CONCURRENCY, budget_ms: budgetMs, ...r });
  }

  const mode = body.mode === "check" ? "check" : "build";
  const limit = Math.min(Math.max(Number(body.limit ?? 20000) || 20000, 1), 20000);

  // Every started, unpaused player, paged so no one is cut off by a row cap.
  const players: Array<{ id: string; timezone: string | null }> = [];
  for (let from = 0; players.length < limit; from += 1000) {
    const { data, error } = await admin.from("profiles").select("id, timezone")
      .not("hammers_today_started_at", "is", null).is("account_paused_at", null)
      .order("id").range(from, from + 999);
    if (error) return json({ error: error.message }, 500);
    players.push(...((data ?? []) as any[]));
    if ((data ?? []).length < 1000) break;
  }

  // One bulk read per local day for which plans already exist.
  const days = new Map<string, string[]>();
  for (const p of players) {
    const d = localDate(p.timezone);
    days.set(d, [...(days.get(d) ?? []), p.id]);
  }
  const have = new Set<string>();
  for (const [d, ids] of days) {
    for (let i = 0; i < ids.length; i += 500) {
      const { data } = await admin.from("wk_prescriptions").select("user_id")
        .eq("plan_date", d).in("user_id", ids.slice(i, i + 500)).limit(50000);
      for (const r of (data ?? []) as any[]) have.add(`${r.user_id}|${d}`);
    }
  }
  const missing = players.filter((p) => !have.has(`${p.id}|${localDate(p.timezone)}`));
  const counts = { players: players.length, present: players.length - missing.length, built: 0, failed: 0, leftover_for_next_run: 0 };

  const pool = await runPool(missing, async (p) => {
    const day = localDate(p.timezone);
    const attempt = async (): Promise<string | null> => {
      try {
        const r = await fetch(`${URL_}/functions/v1/wk-generate-daily`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}`, apikey: SERVICE },
          body: JSON.stringify({ user_id: p.id, plan_date: day }),
        });
        if (!r.ok) return `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
        await r.text();
        return null;
      } catch (e) {
        return String(e).slice(0, 300);
      }
    };
    let err = await attempt();
    if (err && mode === "check") err = await attempt(); // one retry on the safety-net pass
    if (err) counts.failed++; else counts.built++;
    await admin.from("wk_daily_plan_runs").insert({
      user_id: p.id, plan_date: day, mode, outcome: err ? "failed" : "built", error_text: err,
    });
  });
  counts.leftover_for_next_run = pool.leftover;

  // Anonymous training store: refresh a few of the stalest eligible players.
  let anonRefreshed = 0;
  try { const { data } = await admin.rpc("anon_training_refresh_batch", { _limit: 25 }); anonRefreshed = Number(data ?? 0); } catch { /* never costs a plan */ }

  return json({ ok: true, mode, ...counts, elapsed_ms: pool.elapsedMs, anon_refreshed: anonRefreshed });
});
