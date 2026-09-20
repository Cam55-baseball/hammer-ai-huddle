// Step 13 Part B/D — the watchdog that takes the notes.
//
// Modes (POST { mode }):
//   "scan"     — nightly sweep: re-check, backup-plan rate, lift frequency,
//                day-mix drift, card speed, skipped sessions. Writes notes.
//   "digest"   — the 8am summary for the owner (in-app Owner Alert Center).
//   "report"   — plain text report for the last 7 days (Copy report button).
//   "baseline" — records today's normal levels the rules compare against.
//
// It only reads and writes its own notebook. It never touches a card.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  buildDigest,
  buildReport,
  determinismNote,
  fallbackRateNote,
  liftFrequencyNotes,
  mixDriftNote,
  skipRiseNotes,
  slowdownNote,
  type ClassMix,
  type WatchNote,
} from "../_shared/wic/watch/rules.ts";
import { writeNotes } from "../_shared/wic/watch/write.ts";
import { checkIsGreen, countGreenNights } from "../_shared/wic/flags/rollout.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isoDaysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const dateDaysAgo = (n: number) => isoDaysAgo(n).slice(0, 10);
const median = (xs: number[]) => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function baselines(admin: any): Promise<Map<string, { value: number; detail: any }>> {
  const { data } = await admin.from("ti_watch_baselines").select("metric, value, detail");
  return new Map((data ?? []).map((r: any) => [r.metric as string, { value: Number(r.value), detail: r.detail ?? {} }]));
}

async function emptyMix(admin: any, from: string, to: string): Promise<ClassMix> {
  const mix: ClassMix = { none: 0, L: 0, M: 0, H: 0 };
  const { data } = await admin
    .from("wk_schedule_decisions")
    .select("allowed_class")
    .gte("decision_date", from)
    .lte("decision_date", to)
    .limit(50000);
  for (const r of data ?? []) {
    const k = String((r as any).allowed_class) as keyof ClassMix;
    if (k in mix) mix[k] += 1;
  }
  return mix;
}

async function scan(admin: any) {
  const notes: WatchNote[] = [];
  const base = await baselines(admin);

  // 1. Last night's re-check: mismatches and backup-plan rate.
  const { data: checks } = await admin
    .from("tcs_shadow_checks")
    .select("checked_date, mismatches, decisions, fallback_rate, status")
    .order("run_at", { ascending: false })
    .limit(1);
  const check = (checks ?? [])[0];
  if (check) {
    const d = determinismNote({
      checkedDate: String(check.checked_date),
      mismatches: Number(check.mismatches ?? 0),
      decisions: Number(check.decisions ?? 0),
    });
    if (d) notes.push(d);
    const f = fallbackRateNote({
      checkedDate: String(check.checked_date),
      rate: Number(check.fallback_rate ?? 0),
      decisions: Number(check.decisions ?? 0),
    });
    if (f) notes.push(f);
  }

  // 2. Lift frequency per athlete over the last 10 days.
  const { data: lifts } = await admin
    .from("wk_prescriptions")
    .select("user_id, plan_date")
    .eq("slot", "lift")
    .gte("plan_date", dateDaysAgo(30))
    .limit(50000);
  const byAthlete = new Map<string, Set<string>>();
  for (const r of lifts ?? []) {
    const id = String((r as any).user_id);
    (byAthlete.get(id) ?? byAthlete.set(id, new Set()).get(id)!).add(String((r as any).plan_date));
  }
  const today = new Date().toISOString().slice(0, 10);
  const cutoff7 = dateDaysAgo(7);
  const freq = [...byAthlete.entries()].map(([userId, dates]) => {
    const all = [...dates].sort();
    const last = all[all.length - 1];
    const daysSince = last
      ? Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86400000)
      : null;
    return {
      userId,
      liftsLast7Days: all.filter((d) => d >= cutoff7).length,
      daysSinceLastLift: daysSince,
    };
  });
  notes.push(...liftFrequencyNotes(freq));

  // 3. Day-mix drift against the shadow baseline.
  const mixBase = base.get("class_mix")?.detail as ClassMix | undefined;
  if (mixBase) {
    const current = await emptyMix(admin, dateDaysAgo(7), today);
    const m = mixDriftNote(mixBase, current);
    if (m) notes.push(m);
  }

  // 4. Card build speed.
  const { data: diag } = await admin
    .from("wk_generation_diagnostics")
    .select("generation_ms")
    .gte("created_at", isoDaysAgo(1))
    .limit(5000);
  const msSamples = (diag ?? []).map((d: any) => Number(d.generation_ms ?? 0)).filter((n: number) => n > 0);
  const msBase = base.get("generation_ms")?.value ?? 0;
  const s = slowdownNote({ baselineMs: msBase, currentMs: median(msSamples), samples: msSamples.length });
  if (s) notes.push(s);

  // 5. Skipped sessions, overall and per athlete.
  const { data: logs } = await admin
    .from("wk_session_logs")
    .select("user_id, metrics")
    .gte("created_at", isoDaysAgo(7))
    .limit(50000);
  const skipTotals = { n: 0, skipped: 0 };
  const perAthleteTotals = new Map<string, { n: number; skipped: number }>();
  for (const r of logs ?? []) {
    const outcome = (r as any).metrics?.one_tap_outcome;
    if (!outcome) continue;
    skipTotals.n += 1;
    if (outcome === "skipped") skipTotals.skipped += 1;
    const id = String((r as any).user_id);
    const t = perAthleteTotals.get(id) ?? { n: 0, skipped: 0 };
    t.n += 1;
    if (outcome === "skipped") t.skipped += 1;
    perAthleteTotals.set(id, t);
  }
  const skipBase = base.get("skip_rate")?.value ?? 0;
  const perAthleteBase = (base.get("skip_rate")?.detail?.per_athlete ?? {}) as Record<string, number>;
  notes.push(
    ...skipRiseNotes({
      baselineRate: skipBase,
      currentRate: skipTotals.n ? skipTotals.skipped / skipTotals.n : 0,
      sessions: skipTotals.n,
      perAthlete: [...perAthleteTotals.entries()].map(([userId, t]) => ({
        userId,
        baselineRate: perAthleteBase[userId] ?? skipBase,
        currentRate: t.n ? t.skipped / t.n : 0,
        sessions: t.n,
      })),
    }),
  );

  const written = await writeNotes(admin, notes);
  return { notes: notes.length, written, categories: notes.map((n) => n.category) };
}

async function digest(admin: any) {
  const since = isoDaysAgo(1);
  const { data } = await admin
    .from("ti_watch_notes")
    .select("noted_at, severity, category, title, auto_action")
    .gte("noted_at", since)
    .order("noted_at", { ascending: false })
    .limit(500);
  const dayLabel = new Date().toISOString().slice(0, 10);
  const { subject, body } = buildDigest((data ?? []) as any, dayLabel);
  const counts = (data ?? []).reduce((acc: any, n: any) => {
    acc[n.severity] = (acc[n.severity] ?? 0) + 1;
    return acc;
  }, {});

  // Channel: the in-app Owner Alert Center (owner_alerts) — the same bell the
  // rest of the system already rings.
  await admin.from("owner_alerts").insert({
    alert_key: `ti_watch_digest_${dayLabel}`,
    severity: (counts.critical ?? 0) > 0 ? "critical" : "info",
    title: subject,
    detail: { body, counts, window_hours: 24 },
    minute_bucket: new Date(Math.floor(Date.now() / 60000) * 60000).toISOString(),
  });
  return { subject, body, counts };
}

async function report(admin: any, days = 7) {
  const since = isoDaysAgo(days);
  const [notesRes, auditRes, checksRes, switchRes] = await Promise.all([
    admin
      .from("ti_watch_notes")
      .select("noted_at, severity, category, user_id, title, detail, auto_action")
      .gte("noted_at", since)
      .order("noted_at", { ascending: false })
      .limit(1000),
    admin
      .from("wk_feature_switch_audit")
      .select("changed_at, feature_key, from_mode, to_mode, reason")
      .eq("automatic", true)
      .gte("changed_at", since)
      .order("changed_at", { ascending: false })
      .limit(200),
    admin
      .from("tcs_shadow_checks")
      .select("status, mismatches, fallback_rate")
      .order("run_at", { ascending: false })
      .limit(30),
    admin.from("wk_feature_switches").select("feature_key, label, mode").order("sort_order"),
  ]);

  const checks = (checksRes.data ?? []).map((c: any) => ({
    status: String(c.status),
    mismatches: Number(c.mismatches ?? 0),
    fallbackRate: Number(c.fallback_rate ?? 0),
  }));

  const text = buildReport({
    generatedAt: new Date().toISOString(),
    days,
    notes: (notesRes.data ?? []) as any,
    switchDowns: (auditRes.data ?? []) as any,
    fallbackRate: checks[0]?.fallbackRate ?? null,
    greenNights: countGreenNights(checks),
    switches: (switchRes.data ?? []) as any,
  });
  return { text, green_nights: countGreenNights(checks), last_night_green: checkIsGreen(checks[0] ?? null) };
}

async function recordBaseline(admin: any) {
  const mix = await emptyMix(admin, dateDaysAgo(30), dateDaysAgo(1));
  const { data: diag } = await admin
    .from("wk_generation_diagnostics")
    .select("generation_ms")
    .gte("created_at", isoDaysAgo(14))
    .limit(20000);
  const ms = median((diag ?? []).map((d: any) => Number(d.generation_ms ?? 0)).filter((n: number) => n > 0));

  const { data: logs } = await admin
    .from("wk_session_logs")
    .select("user_id, metrics")
    .gte("created_at", isoDaysAgo(30))
    .limit(50000);
  let n = 0;
  let skipped = 0;
  const per: Record<string, { n: number; skipped: number }> = {};
  for (const r of logs ?? []) {
    const outcome = (r as any).metrics?.one_tap_outcome;
    if (!outcome) continue;
    n += 1;
    if (outcome === "skipped") skipped += 1;
    const id = String((r as any).user_id);
    per[id] ??= { n: 0, skipped: 0 };
    per[id].n += 1;
    if (outcome === "skipped") per[id].skipped += 1;
  }
  const perRate: Record<string, number> = {};
  for (const [id, t] of Object.entries(per)) perRate[id] = t.n ? t.skipped / t.n : 0;

  const rows = [
    { metric: "class_mix", value: mix.none + mix.L + mix.M + mix.H, detail: mix, note: "Shadow day mix before release" },
    { metric: "generation_ms", value: ms, detail: {}, note: "Median card build time before release" },
    {
      metric: "skip_rate",
      value: n ? skipped / n : 0,
      detail: { sessions: n, per_athlete: perRate },
      note: "Skipped-session rate before release",
    },
  ];
  await admin.from("ti_watch_baselines").upsert(rows, { onConflict: "metric" });
  return { baselines: rows.map((r) => ({ metric: r.metric, value: r.value })) };
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
  const mode = typeof body.mode === "string" ? body.mode : "scan";

  try {
    if (mode === "digest") return json({ mode, ...(await digest(admin)) });
    if (mode === "report") return json({ mode, ...(await report(admin, Number(body.days ?? 7) || 7)) });
    if (mode === "baseline") return json({ mode, ...(await recordBaseline(admin)) });
    if (mode === "note") {
      // Used by tests and by internal callers that already built a note.
      const note = body.note as WatchNote;
      const written = await writeNotes(admin, note ? [note] : []);
      return json({ mode, written });
    }
    return json({ mode: "scan", ...(await scan(admin)) });
  } catch (err) {
    console.error("[ti-watchdog] fatal:", err);
    return json({ error: String(err) }, 500);
  }
});
