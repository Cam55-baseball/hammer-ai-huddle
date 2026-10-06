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
  const mode = body.mode === "check" ? "check" : "build";
  const limit = Math.min(Math.max(Number(body.limit ?? 2000) || 2000, 1), 5000);

  const { data: players, error } = await admin
    .from("profiles")
    .select("id, timezone")
    .not("hammers_today_started_at", "is", null)
    .is("account_paused_at", null)
    .limit(limit);
  if (error) return json({ error: error.message }, 500);

  const counts = { players: 0, present: 0, built: 0, failed: 0 };
  for (const p of (players ?? []) as Array<{ id: string; timezone: string | null }>) {
    counts.players++;
    const day = localDate(p.timezone);
    const { data: existing } = await admin.from("wk_prescriptions").select("id")
      .eq("user_id", p.id).eq("plan_date", day).limit(1);
    if ((existing ?? []).length > 0) { counts.present++; continue; }

    const attempt = async (): Promise<string | null> => {
      try {
        const r = await fetch(`${URL_}/functions/v1/wk-generate-daily`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE}`, apikey: SERVICE },
          body: JSON.stringify({ user_id: p.id, plan_date: day }),
        });
        if (!r.ok) return `HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`;
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
  }
  return json({ ok: true, mode, ...counts });
});
