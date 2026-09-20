// Tissue Cost Scheduler — stage S3 shadow runner.
//
// SHADOW ONLY: writes wk_schedule_decisions, tcs_shadow_checks and
// wk_shadow_weekly_reports. It never reads, writes or influences a card.
//
// Modes (POST body { mode }):
//   "nightly"     — a decision for every athlete for today
//   "determinism" — recompute yesterday's decisions from their stored snapshot
//   "weekly"      — compare scheduler lift days with prescribed lift days
//   "athlete"     — one athlete ({ user_id, date })

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { addDays } from "../_shared/wic/schedule/tissueCost/tanks.ts";
import {
  decideFromSnapshot,
  decisionsMatch,
  runShadowDecision,
  SHADOW_VERSION,
  type ShadowSnapshot,
} from "../_shared/wic/schedule/tissueCost/shadow/run.ts";
import { fallbackRateAlert } from "../_shared/wic/schedule/tissueCost/v11/guard.ts";
import { determinismNote, fallbackRateNote } from "../_shared/wic/watch/rules.ts";
import { writeNotes } from "../_shared/wic/watch/write.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const todayIso = () => new Date().toISOString().slice(0, 10);

async function activeAthletes(admin: ReturnType<typeof createClient>, since: string) {
  const ids = new Set<string>();
  const { data: rx } = await admin
    .from("wk_prescriptions")
    .select("user_id")
    .gte("plan_date", since)
    .limit(50000);
  for (const r of rx ?? []) ids.add((r as { user_id: string }).user_id);
  const { data: mpi } = await admin.from("athlete_mpi_settings").select("user_id").limit(50000);
  for (const r of mpi ?? []) ids.add((r as { user_id: string }).user_id);
  return [...ids];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }
  const mode = typeof body.mode === "string" ? body.mode : "nightly";
  const started = Date.now();

  try {
    if (mode === "athlete") {
      const userId = String(body.user_id ?? "");
      if (!userId) return json({ error: "user_id is required" }, 400);
      const date = typeof body.date === "string" ? body.date : todayIso();
      const out = await runShadowDecision(admin, userId, date, "UTC", "manual");
      return json({ mode, ...out });
    }

    if (mode === "nightly") {
      const date = typeof body.date === "string" ? body.date : todayIso();
      const athletes = await activeAthletes(admin, addDays(date, -60));
      let ok = 0;
      let failed = 0;
      let fallbacks = 0;
      const errors: string[] = [];
      for (const userId of athletes) {
        const r = await runShadowDecision(admin, userId, date, "UTC", "nightly");
        if (r.ok) ok += 1;
        else {
          failed += 1;
          if (r.error && errors.length < 5) errors.push(`${userId}: ${r.error}`);
        }
        if (r.fallback) fallbacks += 1;
      }
      const { rate, alert } = fallbackRateAlert(fallbacks, ok);
      if (alert) {
        console.error("[tcs-shadow] fallback rate above 0.5%", { rate, fallbacks, decisions: ok });
      }
      return json({
        mode,
        date,
        athletes: athletes.length,
        decisions: ok,
        failed,
        fallbacks,
        fallback_rate: rate,
        errors,
        duration_seconds: (Date.now() - started) / 1000,
      });
    }

    if (mode === "determinism") {
      const checked = typeof body.date === "string" ? body.date : addDays(todayIso(), -1);
      const { data: rowsRaw, error } = await admin
        .from("wk_schedule_decisions")
        .select("*")
        .eq("decision_date", checked)
        .eq("version", SHADOW_VERSION)
        .limit(20000);
      if (error) throw error;
      const rows = rowsRaw ?? [];
      const mismatches: { user_id: string; field: string }[] = [];
      let fallbacks = 0;
      for (const row of rows as Record<string, any>[]) {
        if (row.fallback_used) fallbacks += 1;
        const fresh = decideFromSnapshot(row.inputs_snapshot as ShadowSnapshot);
        if (!decisionsMatch(row as any, fresh)) {
          if (mismatches.length < 20) {
            mismatches.push({ user_id: row.user_id, field: "recomputed_decision" });
          }
        }
      }
      const rate = rows.length > 0 ? fallbacks / rows.length : 0;
      const athletes = new Set((rows as Record<string, any>[]).map((r) => r.user_id)).size;
      const status = mismatches.length === 0 && rate <= 0.005 ? "passed" : "failed";
      const { data: inserted } = await admin
        .from("tcs_shadow_checks")
        .insert({
          checked_date: checked,
          athletes,
          decisions: rows.length,
          mismatches: mismatches.length,
          fallbacks,
          fallback_rate: rate,
          first_mismatches: mismatches,
          status,
          duration_seconds: (Date.now() - started) / 1000,
        })
        .select("id")
        .maybeSingle();
      // Step 13 Part B — the watchdog takes the note on any mismatch or a
      // backup-plan rate above the line.
      try {
        const notes = [
          determinismNote({
            checkedDate: checked,
            mismatches: mismatches.length,
            decisions: rows.length,
            sample: mismatches.map((m) => m.user_id),
          }),
          fallbackRateNote({ checkedDate: checked, rate, decisions: rows.length }),
        ].filter(Boolean) as any[];
        await writeNotes(admin as any, notes);
      } catch { /* never blocks the check */ }

      return json({ mode, checked, athletes, decisions: rows.length, mismatches: mismatches.length, fallback_rate: rate, status, row_id: (inserted as any)?.id ?? null });
    }

    if (mode === "weekly") {
      const end = typeof body.date === "string" ? body.date : todayIso();
      const start = addDays(end, -6);
      const { data: decisions } = await admin
        .from("wk_schedule_decisions")
        .select("user_id,decision_date,allowed_class,reasons")
        .gte("decision_date", start)
        .lte("decision_date", end)
        .eq("version", SHADOW_VERSION)
        .limit(50000);
      const { data: rx } = await admin
        .from("wk_prescriptions")
        .select("user_id,plan_date,slot")
        .gte("plan_date", start)
        .lte("plan_date", end)
        .eq("slot", "lift")
        .limit(100000);
      const prescribed = new Set(
        (rx ?? []).map((r: any) => `${r.user_id}|${r.plan_date}`),
      );
      const byUser = new Map<string, { agreements: number; disagreements: number; detail: unknown[] }>();
      for (const d of (decisions ?? []) as any[]) {
        const entry = byUser.get(d.user_id) ?? { agreements: 0, disagreements: 0, detail: [] };
        const schedulerLift = d.allowed_class !== "none";
        const engineLift = prescribed.has(`${d.user_id}|${d.decision_date}`);
        if (schedulerLift === engineLift) entry.agreements += 1;
        else {
          entry.disagreements += 1;
          entry.detail.push({
            date: d.decision_date,
            scheduler: schedulerLift ? d.allowed_class : "no lift",
            engine: engineLift ? "lift prescribed" : "no lift prescribed",
            reason: Array.isArray(d.reasons) ? d.reasons[0] ?? null : null,
          });
        }
        byUser.set(d.user_id, entry);
      }
      const rowsOut = [...byUser.entries()].map(([user_id, v]) => ({
        user_id,
        week_start: start,
        week_end: end,
        agreements: v.agreements,
        disagreements: v.disagreements,
        detail: v.detail,
      }));
      if (rowsOut.length > 0) {
        const { error } = await admin
          .from("wk_shadow_weekly_reports")
          .upsert(rowsOut, { onConflict: "user_id,week_start" });
        if (error) throw error;
      }
      return json({ mode, week_start: start, week_end: end, athletes: rowsOut.length });
    }

    return json({ error: `unknown mode: ${mode}` }, 400);
  } catch (e) {
    console.error("[tcs-shadow] failed", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
