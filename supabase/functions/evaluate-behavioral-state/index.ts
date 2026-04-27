// Phase 10 — Behavioral State Evaluator (v3: rest days + DDA + amplification)
// Source: custom_activity_logs (completion_state='completed' = logged day)
// Override: athlete_daily_log.injury_mode = injury_hold day
// Rest:     user_rest_day_overrides + user_rest_day_rules.recurring_days
//
// ⚠ INVARIANTS — Phase 10.5 Integrity Lock — DO NOT VIOLATE
// This function is strictly behavioral scoring + NN suggestion generation.
// It must NOT:
//   - derive or write daily outcome (standard met / not met)
//   - mutate NN completion state on custom_activity_templates
//   - produce day-summary text or any per-day verdict
// Daily outcome is derived client-side via useDailyOutcome only (single
// source of truth). Adding outcome logic here will desync the system.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_USER = "00000000-0000-0000-0000-000000000001";

type IdentityTier = "building" | "consistent" | "locked_in" | "elite" | "slipping";

function deriveIdentityTier(score: number, performanceStreak: number, _prev: IdentityTier | null): IdentityTier {
  if (score < 50) return "slipping";
  if (score >= 90 && performanceStreak >= 21) return "elite";
  if (score >= 80 && performanceStreak >= 10) return "locked_in";
  if (score >= 65) return "consistent";
  return "building";
}

function dayStr(d: Date): string { return d.toISOString().split("T")[0]; }
function weekday(ds: string): number { return new Date(ds + "T00:00:00Z").getUTCDay(); }
// ISO week key: yyyy-Www
function weekKey(ds: string): string {
  const d = new Date(ds + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
}

function eventCopy(type: string, ctx: any): { command_text: string; action_type: string; action_payload: any } {
  switch (type) {
    case "nn_miss": {
      const titles: string[] = Array.isArray(ctx.missed_today_titles) ? ctx.missed_today_titles : [];
      const count: number = Number(ctx.missed_today_count ?? 0);
      let command_text: string;
      if (count <= 0) {
        command_text = "Today's standard isn't met yet. Open Non-Negotiables to fix it.";
      } else if (count === 1 && titles[0]) {
        command_text = `You haven't done ${titles[0]} yet today. Lock it in.`;
      } else if (count >= 2 && titles.length >= 2) {
        command_text = `${count} non-negotiables still open today: ${titles.slice(0, 2).join(", ")}. Lock them in.`;
      } else if (count >= 2) {
        command_text = `${count} non-negotiables still open today. Lock them in.`;
      } else {
        command_text = "Today's standard isn't met yet. Open Non-Negotiables to fix it.";
      }
      return {
        command_text,
        action_type: "complete_nn",
        action_payload: ctx.smallest_nn_template_id ? { template_id: ctx.smallest_nn_template_id } : {},
      };
    }
    case "rest_overuse":
      return {
        command_text: "Rest limit exceeded — standard slipping.",
        action_type: "tighten_week",
        action_payload: {},
      };
    case "consistency_drop":
      return {
        command_text: "You are slipping. Act immediately.",
        action_type: "log_session",
        action_payload: {},
      };
    case "consistency_recover":
      return {
        command_text: "Back on standard. Hold it.",
        action_type: "acknowledge",
        action_payload: {},
      };
    case "identity_tier_change": {
      const ranks = ["slipping", "building", "consistent", "locked_in", "elite"];
      const up = ranks.indexOf(ctx.to) > ranks.indexOf(ctx.from);
      return up
        ? { command_text: `${String(ctx.to).toUpperCase()} unlocked.`, action_type: "acknowledge", action_payload: {} }
        : { command_text: `Dropped to ${String(ctx.to).toUpperCase()}. Reclaim it.`, action_type: "complete_nn",
            action_payload: ctx.smallest_nn_template_id ? { template_id: ctx.smallest_nn_template_id } : {} };
    }
    case "streak_risk":
      return {
        command_text: "You are about to break your streak.",
        action_type: "save_streak",
        action_payload: {},
      };
    case "coaching_insight":
      return {
        command_text: ctx.message ?? "Tighten the standard.",
        action_type: "acknowledge",
        action_payload: {},
      };
    case "push_fail":
      return {
        command_text: "You called a push and didn't meet it.",
        action_type: "complete_nn",
        action_payload: ctx.smallest_nn_template_id ? { template_id: ctx.smallest_nn_template_id } : {},
      };
    case "push_complete":
      return {
        command_text: "Push executed. That's locked in.",
        action_type: "acknowledge",
        action_payload: {},
      };
    case "skip_day_used":
      return {
        command_text: "You skipped the day. No standard applied.",
        action_type: "acknowledge",
        action_payload: {},
      };
    default:
      return { command_text: "Update available.", action_type: "acknowledge", action_payload: {} };
  }
}

async function evaluateUser(supabase: any, userId: string, todayUTC: string) {
  if (userId === SYSTEM_USER) return { userId, skipped: "system_user" };

  const since30 = dayStr(new Date(Date.now() - 30 * 86400000));

  // 1. Activity completions
  const { data: actLogs } = await supabase
    .from("custom_activity_logs")
    .select("entry_date, completion_state, template_id")
    .eq("user_id", userId)
    .gte("entry_date", since30);

  const completedByDay = new Set<string>();
  const anyLogByDay = new Set<string>();
  const completedTemplatesByDay = new Map<string, Set<string>>();
  for (const l of actLogs ?? []) {
    anyLogByDay.add(l.entry_date);
    if (l.completion_state === "completed") {
      completedByDay.add(l.entry_date);
      if (!completedTemplatesByDay.has(l.entry_date)) completedTemplatesByDay.set(l.entry_date, new Set());
      completedTemplatesByDay.get(l.entry_date)!.add(l.template_id);
    }
  }

  // 2. Injury overrides
  const { data: dailyLogs } = await supabase
    .from("athlete_daily_log")
    .select("entry_date, injury_mode")
    .eq("user_id", userId)
    .gte("entry_date", since30);
  const injuryByDay = new Set<string>();
  for (const d of dailyLogs ?? []) if (d.injury_mode) injuryByDay.add(d.entry_date);

  // 3. Day state — unified overrides + recurring rest rule
  const [{ data: restRules }, { data: restOverrides }, { data: dayStateRows }] = await Promise.all([
    supabase.from("user_rest_day_rules")
      .select("recurring_days, max_rest_days_per_week").eq("user_id", userId).maybeSingle(),
    supabase.from("user_rest_day_overrides")
      .select("date").eq("user_id", userId).gte("date", since30),
    supabase.from("user_day_state_overrides")
      .select("date, type").eq("user_id", userId).gte("date", since30),
  ]);
  const recurringDays: number[] = restRules?.recurring_days ?? [];
  const maxRestPerWeek: number = restRules?.max_rest_days_per_week ?? 2;

  // Unified intent map: explicit override wins over legacy rest table
  const intentByDay = new Map<string, "rest" | "skip" | "push">();
  for (const r of restOverrides ?? []) intentByDay.set(r.date, "rest");
  for (const r of dayStateRows ?? []) intentByDay.set(r.date, r.type as any);

  // Walk 30 days oldest→newest, applying weekly cap to rest classification
  const today = new Date(todayUTC + "T00:00:00Z");
  const days: { ds: string; klass: "injury" | "rest" | "skip" | "push" | "logged" | "missed" }[] = [];
  const restUsedByWeek = new Map<string, number>();

  for (let i = 29; i >= 0; i--) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = dayStr(d);
    if (injuryByDay.has(ds)) { days.push({ ds, klass: "injury" }); continue; }

    const intent = intentByDay.get(ds);

    // SKIP: hard miss, breaks streaks, NN auto-missed
    if (intent === "skip") { days.push({ ds, klass: "skip" }); continue; }

    // REST: explicit or recurring
    const isRestCandidate = intent === "rest" || recurringDays.includes(weekday(ds));
    if (isRestCandidate) {
      const wk = weekKey(ds);
      const used = restUsedByWeek.get(wk) ?? 0;
      if (used < maxRestPerWeek) {
        restUsedByWeek.set(wk, used + 1);
        days.push({ ds, klass: "rest" });
        continue;
      }
      // exceeded cap → demote
      if (completedByDay.has(ds)) days.push({ ds, klass: "logged" });
      else days.push({ ds, klass: "missed" });
      continue;
    }

    // PUSH: behaves like standard for scoring; flagged for events
    if (intent === "push") {
      days.push({ ds, klass: "push" });
      continue;
    }

    if (completedByDay.has(ds)) days.push({ ds, klass: "logged" });
    else days.push({ ds, klass: "missed" });
  }

  // 4. Aggregate
  let logged = 0, missed = 0, injuryHold = 0, restDays30 = 0, restDays7 = 0;
  let skipDays7 = 0, pushDays7 = 0;
  const todayStr = todayUTC;
  let recoveryModeToday = false;
  let dayTypeToday: "injury" | "rest" | "skip" | "push" | "standard" = "standard";
  for (const x of days) {
    const ageDays = Math.round((today.getTime() - new Date(x.ds + "T00:00:00Z").getTime()) / 86400000);
    const isToday = x.ds === todayStr;
    if (x.klass === "injury") { injuryHold++; if (isToday) dayTypeToday = "injury"; }
    else if (x.klass === "rest") {
      restDays30++;
      if (ageDays < 7) restDays7++;
      if (isToday) { recoveryModeToday = true; dayTypeToday = "rest"; }
    }
    else if (x.klass === "skip") {
      // Hard miss — counts in missed_days, breaks streak, NN auto-missed
      missed++;
      if (ageDays < 7) skipDays7++;
      if (isToday) dayTypeToday = "skip";
    }
    else if (x.klass === "push") {
      // Push behaves like standard for scoring base; logged/missed depends on completion
      if (completedByDay.has(x.ds)) logged++; else missed++;
      if (ageDays < 7) pushDays7++;
      if (isToday) dayTypeToday = "push";
    }
    else if (x.klass === "logged") logged++;
    else missed++;
  }

  // 5. NN templates
  const { data: nnTemplates } = await supabase
    .from("custom_activity_templates")
    .select("id, estimated_duration_min, title, display_nickname")
    .eq("user_id", userId).eq("is_non_negotiable", true).is("deleted_at", null);
  const nnList = (nnTemplates ?? []).slice().sort(
    (a: any, b: any) => (a.estimated_duration_min ?? 999) - (b.estimated_duration_min ?? 999),
  );
  const nnIds: string[] = nnList.map((t: any) => t.id);
  const nnTitleById = new Map<string, string>(
    nnList.map((t: any) => [t.id, String(t.display_nickname || t.title || "Non-Negotiable")]),
  );
  const smallestNnId: string | null = nnList[0]?.id ?? null;

  // Previous tier (for DDA)
  const { data: prevSnap } = await supabase
    .from("user_consistency_snapshots")
    .select("identity_tier, consistency_score, tier_entered_at")
    .eq("user_id", userId)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const prevTier = (prevSnap?.identity_tier ?? null) as IdentityTier | null;
  const ddaRelief = prevTier === "slipping" && nnIds.length >= 2; // waive lowest-priority NN

  // 6. Streaks (rest = neutral, injury = neutral; skip = hard break; push = standard rules)
  let perfStreak = 0, discStreak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = dayStr(d);
    const klass = days.find(x => x.ds === ds)?.klass;
    if (klass === "injury" || klass === "rest") continue;
    if (klass === "skip") break; // hard streak break

    let dayMetPerf: boolean;
    if (nnIds.length > 0) {
      const done = completedTemplatesByDay.get(ds) ?? new Set<string>();
      const requiredIds = ddaRelief ? nnIds.slice(0, -1) : nnIds; // drop smallest under relief
      dayMetPerf = requiredIds.length === 0 ? completedByDay.has(ds) : requiredIds.every(id => done.has(id));
    } else {
      dayMetPerf = completedByDay.has(ds);
    }
    if (dayMetPerf) perfStreak++; else break;
  }
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
    const ds = dayStr(d);
    const klass = days.find(x => x.ds === ds)?.klass;
    if (klass === "injury" || klass === "rest") continue;
    if (klass === "skip") break; // hard discipline break too
    if (anyLogByDay.has(ds)) discStreak++; else break;
  }

  // 7. Score (rest excluded from denom)
  const denom = Math.max(1, 30 - injuryHold - restDays30);
  const score = Math.round((logged / denom) * 100);

  // 8. NN miss 7d (rest excluded; skip auto-misses every NN)
  let nnMiss7 = 0;
  if (nnIds.length > 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
      const ds = dayStr(d);
      const klass = days.find(x => x.ds === ds)?.klass;
      if (klass === "injury" || klass === "rest") continue;
      const requiredIds = ddaRelief ? nnIds.slice(0, -1) : nnIds;
      if (klass === "skip") { nnMiss7 += requiredIds.length; continue; }
      const done = completedTemplatesByDay.get(ds) ?? new Set<string>();
      for (const id of requiredIds) if (!done.has(id)) nnMiss7++;
    }
  }

  // 9. Damping
  let damp = 1.0;
  if (missed >= 4) damp = 0.85;
  else if (missed >= 2) damp = 0.95;
  if (score >= 80) damp = 1.0;

  // 10. Tier
  const tier = deriveIdentityTier(score, perfStreak, prevTier);
  const tierChanged = prevTier !== null && prevTier !== tier;
  const tierEnteredAt = tierChanged
    ? new Date().toISOString()
    : (prevSnap?.tier_entered_at ?? new Date().toISOString());

  // 11. Upsert snapshot
  await supabase.from("user_consistency_snapshots").upsert({
    user_id: userId,
    snapshot_date: todayUTC,
    consistency_score: score,
    logged_days: logged,
    missed_days: missed,
    injury_hold_days: injuryHold,
    performance_streak: perfStreak,
    discipline_streak: discStreak,
    nn_miss_count_7d: nnMiss7,
    identity_tier: tier,
    damping_multiplier: damp,
    rest_days_30d: restDays30,
    rest_days_7d: restDays7,
    recovery_mode_today: recoveryModeToday,
    tier_entered_at: tierEnteredAt,
    day_type_today: dayTypeToday,
    push_days_7d: pushDays7,
    skip_days_7d: skipDays7,
    inputs: {
      denom, nn_template_count: nnIds.length, dda_relief: ddaRelief,
      max_rest_per_week: maxRestPerWeek, recurring_days: recurringDays,
      source: "custom_activity_logs_v4_unified_day_state",
    },
  }, { onConflict: "user_id,snapshot_date" });

  // 12. Behavioral events with command_text + action_type
  const events: any[] = [];
  const pushEvent = (type: string, magnitude: number | null, metadata: any, ctx: any = {}) => {
    const copy = eventCopy(type, ctx);
    events.push({
      user_id: userId,
      event_type: type,
      magnitude,
      metadata,
      command_text: copy.command_text,
      action_type: copy.action_type,
      action_payload: copy.action_payload,
    });
  };

  if (tierChanged) pushEvent("identity_tier_change", null,
    { from: prevTier, to: tier, score },
    { from: prevTier, to: tier, smallest_nn_template_id: smallestNnId });

  if (prevSnap && Number(prevSnap.consistency_score) >= 80 && score < 65)
    pushEvent("consistency_drop", Number(prevSnap.consistency_score) - score, {});
  if (prevSnap && Number(prevSnap.consistency_score) < 65 && score >= 80)
    pushEvent("consistency_recover", score - Number(prevSnap.consistency_score), {});

  // nn_miss is emitted further down — only when TODAY has unmet NNs and the day
  // isn't rest/injury/skip/push-complete. See block after dedupeToday is defined.

  if (restDays7 > maxRestPerWeek)
    pushEvent("rest_overuse", restDays7 - maxRestPerWeek, { rest_days_7d: restDays7, cap: maxRestPerWeek });

  // Push / Skip events for today (deduped within day)
  const eventsTodaySince = todayUTC + "T00:00:00Z";
  const dedupeToday = async (type: string) => {
    const { data } = await supabase.from("behavioral_events")
      .select("id").eq("user_id", userId).eq("event_type", type)
      .gte("created_at", eventsTodaySince).limit(1);
    return !!(data && data.length);
  };

  if (dayTypeToday === "skip") {
    if (!(await dedupeToday("skip_day_used")))
      pushEvent("skip_day_used", null, { date: todayUTC });
  } else if (dayTypeToday === "push") {
    const requiredIds = ddaRelief ? nnIds.slice(0, -1) : nnIds;
    const doneToday = completedTemplatesByDay.get(todayUTC) ?? new Set<string>();
    const allNnDone = requiredIds.length === 0
      ? completedByDay.has(todayUTC)
      : requiredIds.every(id => doneToday.has(id));
    if (allNnDone) {
      if (!(await dedupeToday("push_complete")))
        pushEvent("push_complete", null, { date: todayUTC });
    } else {
      // Only emit push_fail late in day so users get full chance
      const utcHourPush = new Date().getUTCHours();
      if (utcHourPush >= 18 && !(await dedupeToday("push_fail"))) {
        pushEvent("push_fail", null, { date: todayUTC },
          { smallest_nn_template_id: smallestNnId });
      }
    }
  }

  // Streak risk: streak >=3, today not yet completed/rest/injury, late in day (UTC > 18:00)
  const todayKlass = days[days.length - 1]?.klass;
  const utcHour = new Date().getUTCHours();
  if (perfStreak >= 3 && (todayKlass === "missed" || todayKlass === "skip") && utcHour >= 18 && nnIds.length > 0) {
    if (!(await dedupeToday("streak_risk")))
      pushEvent("streak_risk", perfStreak, { streak: perfStreak });
  }

  // Coaching insights (low priority, dedupe by date)
  const insights: { cond: boolean; message: string }[] = [
    { cond: discStreak >= 5 && perfStreak === 0,
      message: "You're active, not executing. Lock the standard." },
    { cond: nnMiss7 >= 5 && nnIds.length >= 4,
      message: "Reduce NN count to stabilize consistency." },
    { cond: restDays7 > maxRestPerWeek,
      message: "Excess recovery. Return to execution." },
  ];
  for (const it of insights) {
    if (!it.cond) continue;
    const { data: dup } = await supabase.from("behavioral_events")
      .select("id").eq("user_id", userId).eq("event_type", "coaching_insight")
      .eq("metadata->>message", it.message)
      .gte("created_at", todayUTC + "T00:00:00Z").limit(1);
    if (!dup || dup.length === 0) pushEvent("coaching_insight", null, { message: it.message }, { message: it.message });
  }

  if (events.length) await supabase.from("behavioral_events").insert(events);

  // ────────────────────────────────────────────────────────────────────
  // Phase 10.2 — NN Suggestion Engine (additive, isolated)
  // Failures must NOT impact snapshot/event writes above.
  // ────────────────────────────────────────────────────────────────────
  try {
    const since14 = dayStr(new Date(Date.now() - 13 * 86400000)); // inclusive 14-day window
    const SUGGEST_THRESHOLD = 0.75;

    // 1. Candidate templates (non-NN, not deleted)
    const { data: candidateTpls } = await supabase
      .from("custom_activity_templates")
      .select("id, recurring_days, recurring_active, display_days, display_on_game_plan")
      .eq("user_id", userId)
      .eq("is_non_negotiable", false)
      .is("deleted_at", null);

    // 2. Last-14d completion logs (reuse base-table; window narrower than actLogs 30d)
    const { data: logs14 } = await supabase
      .from("custom_activity_logs")
      .select("entry_date, completion_state, template_id")
      .eq("user_id", userId)
      .gte("entry_date", since14);

    // Build template_id → Set<entry_date> for completed days
    const completedByTpl = new Map<string, Set<string>>();
    for (const l of logs14 ?? []) {
      if (l.completion_state !== "completed") continue;
      if (!completedByTpl.has(l.template_id)) completedByTpl.set(l.template_id, new Set());
      completedByTpl.get(l.template_id)!.add(l.entry_date);
    }

    // Build the trailing 14-date list for streak walk
    const dates14: string[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setUTCDate(d.getUTCDate() - i);
      dates14.push(dayStr(d));
    }

    const upserts: any[] = [];
    const qualifyingTplIds = new Set<string>();

    for (const tpl of candidateTpls ?? []) {
      const completedSet = completedByTpl.get(tpl.id) ?? new Set<string>();
      const totalCompletions = completedSet.size;

      // Days the template was scheduled in last 14d
      let scheduledDays = 0;
      const displayDays: number[] = (tpl as any).display_days ?? [];
      const recurringDaysT: number[] = (tpl as any).recurring_days ?? [];
      const useDisplay = (tpl as any).display_on_game_plan && displayDays.length > 0;
      const useRecurring = !useDisplay && (tpl as any).recurring_active && recurringDaysT.length > 0;

      if (useDisplay) {
        for (const ds of dates14) if (displayDays.includes(weekday(ds))) scheduledDays++;
      } else if (useRecurring) {
        for (const ds of dates14) if (recurringDaysT.includes(weekday(ds))) scheduledDays++;
      } else {
        // Fallback: assume scheduled on every day a log exists for it (avoids 0 denominator);
        // if no logs, scheduledDays stays 0 and gate below filters out.
        scheduledDays = totalCompletions;
      }

      const completionRate = scheduledDays > 0
        ? Math.min(1, totalCompletions / scheduledDays)
        : 0;

      // Eligibility gate (per spec)
      if (completionRate < 0.80 || totalCompletions < 6) continue;

      // Current consecutive completed-day streak walking back from today
      let streak = 0;
      for (let i = dates14.length - 1; i >= 0; i--) {
        if (completedSet.has(dates14[i])) streak++; else break;
      }

      // Score (normalized streak component to keep score ∈ [0,1])
      const rawScore =
        completionRate * 0.6
        + (Math.min(streak, 5) / 5) * 0.1
        + (totalCompletions / 14) * 0.3;
      const score = Math.max(0, Math.min(1, rawScore));

      if (score < SUGGEST_THRESHOLD) continue;

      qualifyingTplIds.add(tpl.id);

      upserts.push({
        user_id: userId,
        template_id: tpl.id,
        score: Number(score.toFixed(3)),
        completion_rate: Number(completionRate.toFixed(3)),
        total_completions_14d: totalCompletions,
        consistency_streak: streak,
      });
    }

    // Existing suggestions for this user (to honor accepted/dismissed-7d/active states)
    const { data: existingSugs } = await supabase
      .from("user_nn_suggestions")
      .select("id, template_id, status, updated_at")
      .eq("user_id", userId);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const existingByTpl = new Map<string, any>();
    for (const e of existingSugs ?? []) existingByTpl.set(e.template_id, e);

    // Filter upserts: skip accepted, skip dismissed within 7d
    const writeRows: any[] = [];
    for (const row of upserts) {
      const ex = existingByTpl.get(row.template_id);
      if (ex?.status === "accepted") continue;
      if (ex?.status === "dismissed" && new Date(ex.updated_at) > sevenDaysAgo) continue;
      writeRows.push({ ...row, status: "active", updated_at: new Date().toISOString() });
    }

    if (writeRows.length > 0) {
      await supabase
        .from("user_nn_suggestions")
        .upsert(writeRows, { onConflict: "user_id,template_id" });
    }

    // Silent cleanup: any active suggestion that no longer qualifies → dismiss
    const staleIds: string[] = [];
    for (const ex of existingSugs ?? []) {
      if (ex.status === "active" && !qualifyingTplIds.has(ex.template_id)) {
        staleIds.push(ex.id);
      }
    }
    if (staleIds.length > 0) {
      await supabase
        .from("user_nn_suggestions")
        .update({ status: "dismissed", updated_at: new Date().toISOString() })
        .in("id", staleIds);
    }
  } catch (e) {
    console.warn("[evaluate-behavioral-state] NN suggestion block failed (non-fatal)", e);
  }

  return { userId, score, tier, perfStreak, discStreak, nnMiss7, damp,
    restDays7, restDays30, recoveryModeToday, prevTier, ddaRelief };
}

serve(async (req) => {
  const startMs = Date.now();
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const todayUTC = new Date().toISOString().split("T")[0];
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetUser: string | null = body?.user_id ?? null;

    let userIds: string[];
    if (targetUser && targetUser !== SYSTEM_USER) {
      userIds = [targetUser];
    } else {
      const since30 = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
      const [{ data: activeRows }, { data: dayRows }] = await Promise.all([
        supabase.from("custom_activity_logs")
          .select("user_id").gte("entry_date", since30).neq("user_id", SYSTEM_USER),
        supabase.from("user_day_state_overrides")
          .select("user_id").gte("date", since30),
      ]);
      const ids = new Set<string>();
      for (const r of activeRows ?? []) if (r.user_id !== SYSTEM_USER) ids.add(r.user_id);
      for (const r of dayRows ?? []) if (r.user_id !== SYSTEM_USER) ids.add(r.user_id);
      userIds = Array.from(ids);
    }

    const results: any[] = [];
    for (const uid of userIds) {
      try { results.push(await evaluateUser(supabase, uid, todayUTC)); }
      catch (e) { results.push({ userId: uid, error: String(e) }); }
    }

    await supabase.from("engine_function_logs").insert({
      function_name: "evaluate-behavioral-state",
      status: "success",
      duration_ms: Date.now() - startMs,
      metadata: { processed: results.length, today: todayUTC, source: "custom_activity_logs_v3_rest" },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ status: "ok", processed: results.length, today: todayUTC, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[evaluate-behavioral-state]", err);
    await supabase.from("engine_function_logs").insert({
      function_name: "evaluate-behavioral-state",
      status: "fail",
      duration_ms: Date.now() - startMs,
      error_message: String(err),
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
