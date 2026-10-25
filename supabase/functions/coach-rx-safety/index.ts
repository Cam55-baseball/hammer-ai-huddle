// Coach prescription safety + choice (owner request Oct 24).
// mode "check": coach pre-send per-player replace eligibility.
// mode "choose": the player applies Use instead / Add alongside / Save for
// later / Decline. "Use instead" re-checks safety server-side, then replaces
// ONLY the same-category wk_prescriptions rows (marked replaced_by_coach_rx,
// never "missed") and records the prescription status. No spill-over.
// Service role is used, so every player must be linked to the caller
// (is_linked_coach) AND pass recruitingGate; choices require the caller to be
// the prescription's recipient.
// deno-lint-ignore-file no-explicit-any
import { createClient } from "npm:@supabase/supabase-js@2";
import { recruitingGate } from "../_shared/recruitingGate.ts";
import { ageFromDob } from "../_shared/age/ageFromDob.ts";
import { nextThrowDate } from "../_shared/wic/phases/nextThrowDate.ts";
import {
  checkPrescriptionReplace,
  checkPrescriptionAlongside,
  prescriptionIntensity,
  categorySlots,
  coachRxToWkRows,
  THROWING_CATEGORIES,
  type RxCategory,
  type RxReplaceFacts,
} from "../_shared/coach/prescriptionSafety.ts";
import { prescriptionMode, prescriptionChoiceDate } from "../_shared/coach/prescriptionActions.ts";
import { loadPrescriptionEnvelope } from "../_shared/coach/loadPrescriptionEnvelope.ts";
import { prescriptionResults } from "../_shared/coach/prescriptionResults.ts";
import { certifyCoachOwnItems } from "../_shared/coach/ownItemCertification.ts";
import { factGuidelineWarnings, medicalFactWarnings, factsWithoutAdvisories, factsWithoutWarnings, warningsAcknowledged, overrideReasonOk, isCoachPrescriptionDate, type CoachGuidelineWarning } from "../_shared/coach/guidelineWarnings.ts";
import { EMAIL_FROM, EMAIL_REPLY_TO } from "../_shared/email.ts";
import { z } from "npm:zod@3";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const cors = corsHeaders;
const SendRows = z.array(z.object({
  recipient_id: z.string().uuid(), category: z.enum(["hitting", "pitching", "throwing", "fielding", "baserunning", "lift", "speed", "conditioning", "warmup", "mobility", "recovery", "vision"]),
  plan_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), title: z.string().trim().min(1).max(255),
  exercises: z.array(z.record(z.unknown())).min(1).max(100), gear_labels: z.array(z.string()).max(500),
  source_template_id: z.string().uuid().nullable(), team_send_id: z.string().uuid().nullable(),
  schedule_type: z.enum(["any_day", "date", "dates", "recurring"]), series_id: z.string().uuid().nullable(),
  recur_weekdays: z.array(z.number().int().min(0).max(6)).nullable(), recur_every_weeks: z.number().int().min(1).max(8).nullable(),
  recur_monthly_ordinal: z.number().int().min(1).max(5).nullable(), recur_monthly_weekday: z.number().int().min(0).max(6).nullable(),
  recur_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(), recur_count: z.number().int().min(1).max(60).nullable(),
  safety_result: z.object({ intensity: z.enum(["light", "standard", "high", "max"]).optional() }),
})).min(1).max(3600);
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const shift = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const CATEGORIES: RxCategory[] = [
  "hitting", "pitching", "throwing", "fielding", "baserunning",
  "lift", "speed", "conditioning", "warmup", "mobility", "recovery", "vision",
];
const CHOICES = ["use_instead", "add_alongside", "save_for_later", "declined"] as const;
const STATUS: Record<string, string> = {
  use_instead: "used_instead",
  add_alongside: "added_alongside",
  save_for_later: "saved_for_later",
  declined: "declined",
};

async function gatherFacts(
  admin: any,
  pid: string,
  category: RxCategory,
  date: string,
  intensity: RxReplaceFacts["intensity"],
  throwing: boolean,
  today: string,
): Promise<RxReplaceFacts & { age: number | null }> {
  const from = shift(date, -14), to = shift(date, 14);
  const results = await Promise.all([
      admin.from("profiles").select("full_name, date_of_birth").eq("id", pid).maybeSingle(),
      admin.from("athlete_context").select("competition_level").eq("user_id", pid).maybeSingle(),
      admin.from("athlete_mpi_settings").select("season_status").eq("user_id", pid).maybeSingle(),
      admin.from("calendar_events").select("event_date, event_type").eq("user_id", pid).is("deleted_at", null)
        .gte("event_date", date).lte("event_date", to).in("event_type", ["rest", "game", "tournament", "scrimmage"]).limit(200),
      admin.from("gp_games").select("game_date").eq("user_id", pid).is("deleted_at", null).gte("game_date", date).lte("game_date", to)
        .not("status", "in", "(canceled,cancelled,rescheduled)").limit(200),
      admin.from("arm_ledger_entries").select("entry_date, source, throw_type, count, status").eq("user_id", pid)
        .gte("entry_date", from).lte("entry_date", today).limit(2000),
      admin.from("athlete_daily_log").select("day_status, injury_mode").eq("user_id", pid).eq("entry_date", date).maybeSingle(),
      admin.from("wk_prescriptions").select("id").eq("user_id", pid).eq("plan_date", date)
        .in("slot", categorySlots(category)).is("replaced_by_coach_rx", null)
        .not("status", "in", "(completed,skipped)").limit(1),
    ]);
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;
  const [{ data: prof }, { data: ac }, { data: mpi }, { data: cal }, { data: gp }, { data: arm }, { data: log }, { data: cards }] = results;
  const rest = new Set<string>(), games = new Set<string>();
  for (const e of (cal ?? []) as any[]) (e.event_type === "rest" ? rest : games).add(String(e.event_date));
  for (const g of (gp ?? []) as any[]) games.add(String(g.game_date));
  const age = ageFromDob((prof as any)?.date_of_birth ?? null, today);
  const ntd = nextThrowDate(age, (ac as any)?.competition_level ?? null, (arm ?? []).filter((r: any) => r.entry_date < date), shift(date, -1));
  return {
    category,
    date,
    intensity,
    throwing: throwing || THROWING_CATEGORIES.has(category),
    isRestDay: rest.has(date) || (log as any)?.day_status === "rest",
    gameOnDate: games.has(date),
    gameNextDay: games.has(shift(date, 1)),
    inSeason: (mpi as any)?.season_status === "in_season",
    nextThrowDate: ntd,
    injuryMode: (log as any)?.injury_mode === true,
    hasCard: (cards ?? []).length > 0,
    age,
  };
}

const OWNER_INBOX = "hammersmodality@hammersmodality.org";

/** Advisory + medical findings from the existing judges. Medical findings on
 *  minors (or unknown age) require a typed reason and a parent notice. */
function collectWarnings(facts: RxReplaceFacts & { age: number | null }, playerId: string): CoachGuidelineWarning[] {
  const minor = facts.age === null || facts.age < 18;
  return [...factGuidelineWarnings(facts), ...medicalFactWarnings(facts)]
    .map(w => ({ ...w, player_id: playerId, requires_reason: w.medical === true && minor }));
}

/** Email every accepted linked parent about a minor's medical override.
 *  TEST origins (preview/local) route to the owner inbox, matching the
 *  teen-waiver pattern. The outcome is recorded honestly in the audit log. */
async function notifyParentsOfMedicalOverride(
  admin: any, athleteId: string, action: string, warnings: CoachGuidelineWarning[], reason: string, testInbox: boolean,
): Promise<void> {
  try {
    const { data: links } = await admin.from("parent_athlete_links").select("parent_user_id")
      .eq("athlete_user_id", athleteId).eq("status", "accepted").is("revoked_at", null);
    const parentIds = [...new Set((links ?? []).map((l: any) => String(l.parent_user_id)))];
    const medical = warnings.filter(w => w.medical);
    const rules = medical.map(w => `${w.date}: ${w.rule}`).join(" ");
    const { data: athleteProf } = await admin.from("profiles").select("full_name").eq("id", athleteId).maybeSingle();
    const who = (athleteProf as any)?.full_name ?? "Your athlete";
    const key = Deno.env.get("RESEND_API_KEY");
    let sent = 0, failed = 0;
    for (const pid of parentIds) {
      const { data: pu } = await admin.auth.admin.getUserById(pid);
      const to = testInbox ? OWNER_INBOX : (pu?.user?.email ?? null);
      if (!to || !key) { failed++; continue; }
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: EMAIL_FROM, reply_to: EMAIL_REPLY_TO, to: [to],
          subject: `Coach overrode a health guideline for ${who}`,
          html: `<p>Hi,</p><p>A coach chose to proceed with a workout for ${who} even though a health guideline applies: ${rules}</p><p>The coach's recorded reason: “${reason.replace(/[<>&]/g, "")}”</p><p>You can talk to the coach or have ${who} decline the workout in the app. Hammers Modality LLC · 15985 Preserve Marketplace #1154, Odessa, FL 33556</p>`,
        }),
      });
      res.ok ? sent++ : failed++;
    }
    await admin.from("audit_log").insert({
      user_id: athleteId, action: "coach_medical_override_parent_notice", table_name: "coach_prescriptions",
      record_id: null,
      metadata: { action, warnings: medical, parents: parentIds.length, sent, failed, notice: sent > 0 ? "sent" : parentIds.length === 0 ? "no_linked_parent" : "failed" },
      created_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("parent notice failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "Not signed in" }, 401);
    const me = u.user.id;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const body = await req.json().catch(() => ({}));
    const mode = prescriptionMode(body.mode);
    if (!mode) return json({ error: "Unknown action" }, 400);
    const today = new Date().toISOString().slice(0, 10);
    const acknowledgement = body.warning_acknowledgement;
    const overrideReason = typeof body.override_reason === "string" ? body.override_reason.trim() : "";
    const testInbox = !(req.headers.get("origin") ?? "").includes("hammersmodality.org");
    const overrideRecord = (warnings: CoachGuidelineWarning[], action: string) => ({
      actor_id: me, occurred_at: new Date().toISOString(), action, warnings,
      ...(warnings.some(w => w.requires_reason) ? { reason: overrideReason, parent_notice: true } : {}),
    });
    /** Exact acknowledgement for every current finding; a typed reason when a minor's medical finding is overridden. */
    const ackError = (warnings: CoachGuidelineWarning[]) => {
      if (!warnings.length) return null;
      if (!warningsAcknowledged(warnings, acknowledgement)) return json({ applied: false, warning_required: true, warnings });
      if (warnings.some(w => w.requires_reason) && !overrideReasonOk(overrideReason)) return json({ applied: false, reason_required: true, warnings });
      return null;
    };

    if (mode === "send") {
      const parsed = SendRows.safeParse(body.rows);
      if (!parsed.success) return json({ error: "Review the players, dates and workout details before sending." }, 400);
      const sends = parsed.data;
      if (sends.some(r => !isCoachPrescriptionDate(r.plan_date) || r.plan_date < today || (r.recur_end !== null && !isCoachPrescriptionDate(r.recur_end)))) return json({ error: "Pick valid dates today or later." }, 400);
      const ids = [...new Set(sends.map(r => r.recipient_id))];
      if (ids.length > 60) return json({ error: "Send to no more than 60 players at once." }, 400);
      const linked = await Promise.all(ids.map(async id => { const r = await admin.rpc("coach_connected_to", { _me: me, _athlete: id }); return !r.error && r.data === true ? id : null; }));
      const gate = await recruitingGate(admin, me, linked.filter((id): id is string => id !== null), "metrics");
      if (ids.some(id => gate.get(id) !== "visible")) return json({ error: "You can't send to one or more selected players." }, 403);
      const warnings: CoachGuidelineWarning[] = [];
      for (const send of sends) {
        const facts = await gatherFacts(admin, send.recipient_id, send.category, send.plan_date, prescriptionIntensity(send.safety_result.intensity), false, today);
        const hard = checkPrescriptionAlongside(factsWithoutWarnings(facts));
        if (hard.verdict !== "allow") return json({ applied: false, reasons: hard.reasons, safeOption: hard.safeOption });
        warnings.push(...collectWarnings(facts, send.recipient_id));
      }
      const sendAckError = ackError(warnings);
      if (sendAckError) return sendAckError;
      const { data: inserted, error } = await admin.from("coach_prescriptions").insert(sends.map(send => ({ ...send, sender_id: me,
        safety_result: { ...send.safety_result, overrides: warnings.filter(w => w.player_id === send.recipient_id && w.date === send.plan_date).length ? [overrideRecord(warnings.filter(w => w.player_id === send.recipient_id && w.date === send.plan_date), "send")] : [] },
      }))).select("id");
      if (error) throw error;
      for (const send of sends) {
        const medical = warnings.filter(w => w.player_id === send.recipient_id && w.date === send.plan_date && w.requires_reason);
        if (medical.length) await notifyParentsOfMedicalOverride(admin, send.recipient_id, "send", medical, overrideReason, testInbox);
      }
      return json({ applied: true, ids: inserted?.map((r: any) => r.id) });
    }

    if (mode === "check") {
      const ids: string[] = Array.isArray(body.player_ids)
        ? ([...new Set(body.player_ids.map(String))].slice(0, 60) as string[])
        : [];
      const category = CATEGORIES.includes(body.category) ? (body.category as RxCategory) : null;
      const date = String(body.plan_date ?? "");
      const intensity = prescriptionIntensity(body.intensity);
      const throwing = body.throwing === true;
      if (!ids.length || !category || !isCoachPrescriptionDate(date)) return json({ error: "Pick players, a category and a date" }, 400);
      if (date < today) return json({ error: "Pick today or a future date" }, 400);

      // Coaches AND org admins (for their assigned athletes) may send —
      // coach_connected_to covers both paths server-side.
      const linked = await Promise.all(ids.map(async (id) => {
        const { data, error } = await admin.rpc("coach_connected_to", { _me: me, _athlete: id });
        return !error && data === true ? id : null;
      }));
      const allowedLinked = linked.filter(Boolean) as string[];
      const gate = await recruitingGate(admin, me, allowedLinked, "metrics");
      const allowed = allowedLinked.filter((id) => gate.get(id) === "visible");

      const results = await Promise.all(allowed.map(async (pid) => {
        const facts = await gatherFacts(admin, pid, category, date, intensity, throwing, today);
        const r = checkPrescriptionReplace(facts);
        const { data: prof } = await admin.from("profiles").select("full_name").eq("id", pid).maybeSingle();
        return { player_id: pid, name: (prof as any)?.full_name ?? "Player", ...r };
      }));
      const refused = ids.filter((id) => !allowed.includes(id)).map((id) => ({ player_id: id, reason: "You can't send to this player." }));
      return json({ results, refused });
    }

    // mode "manage" — the sender edits or cancels future, still-unanswered
    // dates, or resends a finished one. Never touches anything the player
    // already answered or that already happened.
    if (mode === "manage") {
      const action = String(body.action ?? "");
      const rxId = String(body.prescription_id ?? "");
      const newDate = String(body.new_date ?? "");
      const seriesId = String(body.series_id ?? "");

      if (action === "list") {
        const { data: rows, error: listError } = await admin.from("coach_prescriptions").select("*")
          .eq("sender_id", me).order("plan_date", { ascending: false }).limit(200);
        if (listError) throw listError;
        const candidates = (rows ?? []) as any[];
        const recipients = [...new Set(candidates.map((r) => String(r.recipient_id)))];
        const linked = await Promise.all(recipients.map(async (id) => {
          const { data, error } = await admin.rpc("coach_connected_to", { _me: me, _athlete: id });
          return !error && data === true ? id : null;
        }));
        const gate = await recruitingGate(admin, me, linked.filter((id): id is string => id !== null), "metrics");
        const list = candidates.filter((r) => gate.get(r.recipient_id) === "visible");
        // Completion: count plan rows each prescription created that the player finished.
        const rxIds = list.map((r) => r.id);
        const doneByRx: Record<string, { done: number; total: number }> = {};
        let actualsByRx: Record<string, any[]> = {};
        if (rxIds.length > 0) {
          const { data: wk, error: wkError } = await admin.from("wk_prescriptions").select("id,user_id,plan_date,movement_slug,movement_name,dosage_unit,slot,status,why_payload")
            .in("user_id", [...new Set(list.map((r) => r.recipient_id))])
            .not("why_payload", "is", null).limit(5000);
          if (wkError) throw wkError;
          for (const w of (wk ?? []) as any[]) {
            const rid = w.why_payload?.coach_rx;
            if (!rid || !rxIds.includes(rid)) continue;
            const b = (doneByRx[rid] ||= { done: 0, total: 0 });
            b.total++;
            if (w.status === "completed") b.done++;
          }
          const ownedRows = (wk ?? []).filter((w: any) => rxIds.includes(w.why_payload?.coach_rx));
          if (ownedRows.length) {
            const { data: logs, error: logsError } = await admin.from("wk_session_logs")
              .select("id,user_id,prescription_id,plan_date,movement_slug,sets_completed,reps_completed,total_reps_completed,duration_seconds_precise,duration_seconds_completed,distance_feet_completed,metrics")
              .in("prescription_id", ownedRows.map((w: any) => w.id)).limit(5000);
            if (logsError) throw logsError;
            actualsByRx = prescriptionResults(list, ownedRows, logs ?? []);
          }
        }
        const names: Record<string, string> = {};
        const recipientIds = [...new Set(list.map((r) => r.recipient_id))];
        if (recipientIds.length > 0) {
          const { data: profs } = await admin.from("profiles").select("id, full_name").in("id", recipientIds);
          for (const p of (profs ?? []) as any[]) names[p.id] = p.full_name ?? "Player";
        }
        return json({
          rows: list.map((r) => ({
            id: r.id, title: r.title, category: r.category, plan_date: r.plan_date,
            status: r.status, schedule_type: r.schedule_type, series_id: r.series_id,
            team_send_id: r.team_send_id, cancelled_at: r.cancelled_at,
            recipient_id: r.recipient_id, recipient_name: names[r.recipient_id] ?? "Player",
            schedule: {
              recur_weekdays: r.recur_weekdays, recur_every_weeks: r.recur_every_weeks,
              recur_monthly_ordinal: r.recur_monthly_ordinal, recur_monthly_weekday: r.recur_monthly_weekday,
              recur_end: r.recur_end, recur_count: r.recur_count,
            },
            completion: doneByRx[r.id] ?? { done: 0, total: 0 },
            results: actualsByRx[r.id] ?? [],
            overrides: r.safety_result?.overrides ?? [],
          })),
        });
      }

      if (action === "reschedule" || action === "cancel") {
        if (!rxId) return json({ error: "Pick a prescription" }, 400);
        if (action === "reschedule" && !isCoachPrescriptionDate(newDate)) return json({ error: "Pick a valid date" }, 400);
        if (action === "reschedule" && newDate < today) return json({ error: "Pick today or a future date" }, 400);
        const { data: rx } = await admin.from("coach_prescriptions").select("*").eq("id", rxId).maybeSingle();
        if (!rx || (rx as any).sender_id !== me) return json({ error: "Not your send" }, 403);
        if ((rx as any).status !== "pending") return json({ error: "The player already answered — it can't be changed" }, 409);
        if ((rx as any).plan_date < today) return json({ error: "Past dates can't be changed" }, 409);
        if ((rx as any).cancelled_at) return json({ error: "Already cancelled" }, 409);
        const { data: connected, error: connectionError } = await admin.rpc("coach_connected_to", { _me: me, _athlete: rx.recipient_id });
        const gate = await recruitingGate(admin, me, connectionError || connected !== true ? [] : [rx.recipient_id], "metrics");
        if (gate.get(rx.recipient_id) !== "visible") return json({ error: "You can't manage this player's workout." }, 403);
        let nextSafety = rx.safety_result ?? {};
        let reschedWarnings: CoachGuidelineWarning[] = [];
        if (action === "reschedule") {
          const facts = await gatherFacts(admin, rx.recipient_id, rx.category, newDate, prescriptionIntensity(rx.safety_result?.intensity), false, today);
          const hard = checkPrescriptionAlongside(factsWithoutWarnings(facts));
          if (hard.verdict !== "allow") return json({ applied: false, reasons: hard.reasons, safeOption: hard.safeOption });
          reschedWarnings = collectWarnings(facts, rx.recipient_id);
          const reschedAckError = ackError(reschedWarnings);
          if (reschedAckError) return reschedAckError;
          nextSafety = { ...nextSafety, overrides: [...(nextSafety.overrides ?? []), ...(reschedWarnings.length ? [overrideRecord(reschedWarnings, action)] : [])] };
        }
        const { error: updateError } = await admin.from("coach_prescriptions").update(
          action === "cancel"
            ? { cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : { plan_date: newDate, safety_result: nextSafety, updated_at: new Date().toISOString() },
        ).eq("id", rxId).eq("status", "pending").is("cancelled_at", null).eq("updated_at", rx.updated_at).select("id").single();
        if (updateError) throw updateError;
        const reschedMedical = reschedWarnings.filter(w => w.requires_reason);
        if (reschedMedical.length) await notifyParentsOfMedicalOverride(admin, rx.recipient_id, action, reschedMedical, overrideReason, testInbox);
        return json({ applied: true });
      }

      if (action === "cancel_series") {
        if (!seriesId) return json({ error: "Pick a series" }, 400);
        const { data: candidates, error: seriesError } = await admin.from("coach_prescriptions").select("id, recipient_id")
          .eq("sender_id", me).eq("series_id", seriesId).eq("status", "pending").gte("plan_date", today).is("cancelled_at", null);
        if (seriesError) throw seriesError;
        const recipients = [...new Set((candidates ?? []).map((r: any) => String(r.recipient_id)))];
        const linked = await Promise.all(recipients.map(async (id) => {
          const { data, error } = await admin.rpc("coach_connected_to", { _me: me, _athlete: id });
          return !error && data === true ? id : null;
        }));
        const gate = await recruitingGate(admin, me, linked.filter((id): id is string => id !== null), "metrics");
        const allowedIds = (candidates ?? []).filter((r: any) => gate.get(r.recipient_id) === "visible").map((r: any) => r.id);
        if (!allowedIds.length) return json({ error: "No permitted future dates to cancel." }, 403);
        const { data: updated, error: cancelError } = await admin.from("coach_prescriptions")
          .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .in("id", allowedIds).eq("sender_id", me).eq("series_id", seriesId).eq("status", "pending")
          .gte("plan_date", today).is("cancelled_at", null).select("id");
        if (cancelError) throw cancelError;
        return json({ applied: true, cancelled: (updated ?? []).length });
      }

      if (action === "resend") {
        if (!rxId || !isCoachPrescriptionDate(newDate) || newDate < today) return json({ error: "Pick a prescription and a future date" }, 400);
        const { data: rx } = await admin.from("coach_prescriptions").select("*").eq("id", rxId).maybeSingle();
        if (!rx || (rx as any).sender_id !== me) return json({ error: "Not your send" }, 403);
        const { data: connected, error: connectionError } = await admin.rpc("coach_connected_to", { _me: me, _athlete: rx.recipient_id });
        const gate = await recruitingGate(admin, me, connectionError || connected !== true ? [] : [rx.recipient_id], "metrics");
        if (gate.get(rx.recipient_id) !== "visible") return json({ error: "You can't send to this player." }, 403);
        const facts = await gatherFacts(admin, rx.recipient_id, rx.category, newDate, prescriptionIntensity(rx.safety_result?.intensity), false, today);
        const hard = checkPrescriptionAlongside(factsWithoutWarnings(facts));
        if (hard.verdict !== "allow") return json({ applied: false, reasons: hard.reasons, safeOption: hard.safeOption });
        const warnings = collectWarnings(facts, rx.recipient_id);
        const resendAckError = ackError(warnings);
        if (resendAckError) return resendAckError;
        const { data: created, error: resendError } = await admin.from("coach_prescriptions").insert({
          sender_id: me, recipient_id: (rx as any).recipient_id, category: (rx as any).category,
          plan_date: newDate, title: (rx as any).title, exercises: (rx as any).exercises,
          gear_labels: (rx as any).gear_labels, source_template_id: (rx as any).source_template_id,
          schedule_type: "date", safety_result: { intensity: rx.safety_result?.intensity, overrides: warnings.length ? [overrideRecord(warnings, action)] : [] },
        }).select("id").maybeSingle();
        if (resendError || !created) throw resendError ?? new Error("Workout was not sent");
        const resendMedical = warnings.filter(w => w.requires_reason);
        if (resendMedical.length) await notifyParentsOfMedicalOverride(admin, rx.recipient_id, action, resendMedical, overrideReason, testInbox);
        return json({ applied: true, id: (created as any)?.id ?? null });
      }

      return json({ error: "Unknown action" }, 400);
    }

    // mode "choose" — the player applies their choice to their own prescription.
    const rxId = String(body.prescription_id ?? "");
    const choice = CHOICES.includes(body.choice) ? body.choice : null;
    if (!rxId || !choice) return json({ error: "Pick a prescription and a choice" }, 400);

    const { data: rx } = await admin.from("coach_prescriptions").select("*").eq("id", rxId).maybeSingle();
    if (!rx || (rx as any).recipient_id !== me) return json({ error: "Not your prescription" }, 403);
    if ((rx as any).cancelled_at) return json({ error: "The coach cancelled this one" }, 409);
    // Saved-for-later cards can be activated later; everything else is one answer only.
    if ((rx as any).status !== "pending" && (rx as any).status !== "saved_for_later") {
      return json({ error: "Already answered" }, 409);
    }

    const category = (rx as any).category as RxCategory;
    // "Use today" activation (any-day cards, future dates, saved-for-later):
    // the workout lands on today's plan with the full safety re-check.
    const activateToday = body.activate_today === true;
    const date = prescriptionChoiceDate(choice, activateToday, String(rx.plan_date), today);
    const intensity = prescriptionIntensity(rx.safety_result?.intensity);

    let safety: Record<string, unknown> | null = null;
    let rows: Record<string, unknown>[] = [];
    let choiceMedical: CoachGuidelineWarning[] = [];
    if (choice === "use_instead" || choice === "add_alongside") {
      if (date !== today) return json({ error: "Use today to activate this workout on today's plan" }, 409);
      const { data: expectedRevision, error: revisionError } = await admin.rpc("coach_rx_safety_revision", { p_user: me, p_date: date });
      if (revisionError || !expectedRevision) return json({ error: "Could not check the latest workout details. Your saved plan is unchanged." }, 409);
      const { data: expectedCatalogRevision, error: catalogRevisionError } = await admin.rpc("coach_rx_catalog_revision");
      if (catalogRevisionError || !expectedCatalogRevision) return json({ error: "Could not check the latest Exercise Vault review. Your saved plan is unchanged." }, 409);
      const facts = await gatherFacts(admin, me, category, date, intensity, false, today);
      const { data: savedSnapshot, error: snapshotError } = await admin.from("athlete_plan_snapshots").select("payload,sport")
        .eq("user_id", me).eq("plan_date", date);
      if (snapshotError) throw snapshotError;
      const { data: sportContext, error: sportError } = await admin.from("athlete_context").select("sport_primary").eq("user_id", me).maybeSingle();
      if (sportError) throw sportError;
      const modality = category === "fielding" ? "defense" : category;
      const snapshot = savedSnapshot?.find((s: any) => s.sport === sportContext?.sport_primary);
      const block = snapshot?.payload?.blocks?.find((b: any) => b.modality === modality && b.status === "ready" && !b.replacedByCoachRx && !b.coachRx);
      // Same-category skill-block replacement commits through the existing
      // day-lock path (coach_rx_commit_certified → coach_rx_commit_choice):
      // the server re-verifies the exact saved block, refuses when any of its
      // drills are already completed, marks it "Replaced by coach workout —
      // not missed" and appends the coach block in the same transaction.
      facts.hasCard = facts.hasCard || !!block;
      const result = choice === "use_instead" ? checkPrescriptionReplace(factsWithoutWarnings(facts)) : checkPrescriptionAlongside(factsWithoutWarnings(facts));
      if (result.verdict !== "allow") return json({ applied: false, verdict: result.verdict, reasons: result.reasons, safeOption: result.safeOption });
      const { data: senderProfile, error: senderError } = await admin.from("profiles").select("full_name").eq("id", rx.sender_id).maybeSingle();
      if (senderError) throw senderError;
      // Coach-authored (non-Vault) items must pass the shared certification:
      // common gear vocabulary and a governed measure type, with unknown gear
      // named instead of silently dropped. Certification never prices workload
      // — the envelope's existing workload-declaration check still applies.
      const ownItems = certifyCoachOwnItems(Array.isArray(rx.exercises) ? rx.exercises : []);
      if (!ownItems.ok) return json({ applied: false, verdict: "blocked", reasons: ownItems.reasons, safeOption: "Safe option: save this workout for later and ask your coach to fix the listed items." });
      rows = coachRxToWkRows({
        userId: me, planDate: date, category, prescriptionId: rxId,
        coachName: senderProfile?.full_name ?? null,
        exercises: Array.isArray(rx.exercises) ? rx.exercises : [],
        usedInstead: choice === "use_instead",
      });
      if (!rows.length) return json({ error: "This workout has no usable exercises. Ask your coach to review it." }, 409);
      // Record the certified common-gear tokens on each own item so the
      // vocabulary survives server-side even though wk rows carry no gear.
      for (const row of rows) {
        if (!row.movement_slug) {
          const gear = ownItems.gearByName.get(String(row.movement_name));
          row.why_payload = { ...(row.why_payload as Record<string, unknown>), own_item_certified: true, certified_gear: gear ?? [] };
        }
      }
      const envelope = await loadPrescriptionEnvelope(admin, me, date, category, rows, choice === "use_instead");
      if (!envelope.allowed) return json({ applied: false, verdict: "blocked", reasons: envelope.reasons, safeOption: envelope.safeOption });
      const warnings = [...collectWarnings(facts, me), ...("warnings" in envelope ? (envelope.warnings ?? []).map(w => ({ ...w, player_id: me })) : [])];
      const chooseAckError = ackError(warnings);
      if (chooseAckError) return chooseAckError;
      choiceMedical = warnings.filter(w => w.requires_reason);
      const overrides = [...(rx.safety_result?.overrides ?? []), ...(warnings.length ? [overrideRecord(warnings, choice)] : [])];
      rows = envelope.rows;
      const because = overrides.flatMap((o: any) => (o.warnings ?? []).map((w: any) => `${w.date}: ${w.rule}`)).join("; ");
      if (because) for (const row of rows) { row.rationale = `${row.rationale} Coach override: ${because}`; row.why_payload = { ...(row.why_payload as Record<string, unknown>), coach_overrides: overrides, why: row.rationale }; }
      safety = { verdict: result.verdict, overrides, intensity, checked_at: new Date().toISOString(), envelope: "wic-swap", block_expected: block ?? null, cns_result: "cnsResult" in envelope ? envelope.cnsResult : null, expected_revision: expectedRevision, expected_catalog_revision: expectedCatalogRevision };
    }
    const { data: committed, error: commitError } = await admin.rpc("coach_rx_commit_certified", {
      p_user: me, p_rx: rxId, p_date: date, p_choice: choice,
      p_rows: rows, p_slots: categorySlots(category), p_safety: safety,
      p_expected_updated_at: rx.updated_at,
    });
    if (commitError) return json({ error: "Could not save this workout. Refresh and try again." }, 409);
    if (choiceMedical.length) await notifyParentsOfMedicalOverride(admin, me, String(choice), choiceMedical, overrideReason, testInbox);
    return json(committed);
  } catch (_e) {
    return json({ error: "Something went wrong" }, 500);
  }
});
