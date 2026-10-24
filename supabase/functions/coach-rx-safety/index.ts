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
  categorySlots,
  coachRxToWkRows,
  THROWING_CATEGORIES,
  type RxCategory,
  type RxReplaceFacts,
} from "../_shared/coach/prescriptionSafety.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
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
): Promise<RxReplaceFacts> {
  const from = shift(date, -14), to = shift(date, 14);
  const [{ data: prof }, { data: ac }, { data: mpi }, { data: cal }, { data: gp }, { data: arm }, { data: log }, { data: cards }] =
    await Promise.all([
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
  const rest = new Set<string>(), games = new Set<string>();
  for (const e of (cal ?? []) as any[]) (e.event_type === "rest" ? rest : games).add(String(e.event_date));
  for (const g of (gp ?? []) as any[]) games.add(String(g.game_date));
  const age = ageFromDob((prof as any)?.date_of_birth ?? null, today);
  const ntd = nextThrowDate(age, (ac as any)?.competition_level ?? null, (arm ?? []) as any[], today);
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
  };
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
    const mode = body.mode === "choose" ? "choose" : "check";
    const today = new Date().toISOString().slice(0, 10);

    if (mode === "check") {
      const ids: string[] = Array.isArray(body.player_ids)
        ? ([...new Set(body.player_ids.map(String))].slice(0, 60) as string[])
        : [];
      const category = CATEGORIES.includes(body.category) ? (body.category as RxCategory) : null;
      const date = String(body.plan_date ?? "");
      const intensity = (["light", "standard", "high"].includes(body.intensity) ? body.intensity : "standard") as RxReplaceFacts["intensity"];
      const throwing = body.throwing === true;
      if (!ids.length || !category || !DATE.test(date)) return json({ error: "Pick players, a category and a date" }, 400);
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
    if (body.mode === "manage") {
      const action = String(body.action ?? "");
      const rxId = String(body.prescription_id ?? "");
      const newDate = String(body.new_date ?? "");
      const seriesId = String(body.series_id ?? "");

      if (action === "list") {
        const { data: rows } = await admin.from("coach_prescriptions").select("*")
          .eq("sender_id", me).order("plan_date", { ascending: false }).limit(200);
        const list = (rows ?? []) as any[];
        // Completion: count plan rows each prescription created that the player finished.
        const rxIds = list.map((r) => r.id);
        const doneByRx: Record<string, { done: number; total: number }> = {};
        if (rxIds.length > 0) {
          const { data: wk } = await admin.from("wk_prescriptions").select("status, why_payload")
            .in("user_id", [...new Set(list.map((r) => r.recipient_id))])
            .not("why_payload", "is", null).limit(5000);
          for (const w of (wk ?? []) as any[]) {
            const rid = w.why_payload?.coach_rx;
            if (!rid || !rxIds.includes(rid)) continue;
            const b = (doneByRx[rid] ||= { done: 0, total: 0 });
            b.total++;
            if (w.status === "completed") b.done++;
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
          })),
        });
      }

      if (action === "reschedule" || action === "cancel") {
        if (!rxId) return json({ error: "Pick a prescription" }, 400);
        if (action === "reschedule" && !DATE.test(newDate)) return json({ error: "Pick a valid date" }, 400);
        if (action === "reschedule" && newDate < today) return json({ error: "Pick today or a future date" }, 400);
        const { data: rx } = await admin.from("coach_prescriptions").select("*").eq("id", rxId).maybeSingle();
        if (!rx || (rx as any).sender_id !== me) return json({ error: "Not your send" }, 403);
        if ((rx as any).status !== "pending") return json({ error: "The player already answered — it can't be changed" }, 409);
        if ((rx as any).plan_date < today) return json({ error: "Past dates can't be changed" }, 409);
        if ((rx as any).cancelled_at) return json({ error: "Already cancelled" }, 409);
        await admin.from("coach_prescriptions").update(
          action === "cancel"
            ? { cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }
            : { plan_date: newDate, updated_at: new Date().toISOString() },
        ).eq("id", rxId);
        return json({ applied: true });
      }

      if (action === "cancel_series") {
        if (!seriesId) return json({ error: "Pick a series" }, 400);
        const { data: updated } = await admin.from("coach_prescriptions")
          .update({ cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("sender_id", me).eq("series_id", seriesId).eq("status", "pending")
          .gte("plan_date", today).is("cancelled_at", null).select("id");
        return json({ applied: true, cancelled: (updated ?? []).length });
      }

      if (action === "resend") {
        if (!rxId || !DATE.test(newDate) || newDate < today) return json({ error: "Pick a prescription and a future date" }, 400);
        const { data: rx } = await admin.from("coach_prescriptions").select("*").eq("id", rxId).maybeSingle();
        if (!rx || (rx as any).sender_id !== me) return json({ error: "Not your send" }, 403);
        const { data: created } = await admin.from("coach_prescriptions").insert({
          sender_id: me, recipient_id: (rx as any).recipient_id, category: (rx as any).category,
          plan_date: newDate, title: (rx as any).title, exercises: (rx as any).exercises,
          gear_labels: (rx as any).gear_labels, source_template_id: (rx as any).source_template_id,
          schedule_type: "date", safety_result: (rx as any).safety_result,
        }).select("id").maybeSingle();
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
    const date = activateToday ? today : String((rx as any).plan_date);
    if (activateToday) {
      await admin.from("coach_prescriptions").update({ plan_date: today, updated_at: new Date().toISOString() }).eq("id", rxId);
    }
    const intensity = (["light", "standard", "high"].includes((rx as any).safety_result?.intensity)
      ? (rx as any).safety_result.intensity
      : "standard") as RxReplaceFacts["intensity"];

    if (choice === "use_instead") {
      const facts = await gatherFacts(admin, me, category, date, intensity, false, today);
      const r = checkPrescriptionReplace(facts);
      if (r.verdict !== "allow") {
        return json({ applied: false, verdict: r.verdict, reasons: r.reasons, safeOption: r.safeOption });
      }
      const slots = categorySlots(category);
      // Replaced rows are marked skipped (zero CNS, never "missed") and carry
      // the coach-prescription link so the card reads "replaced by coach workout".
      const { data: replaced } = await admin.from("wk_prescriptions")
        .update({ replaced_by_coach_rx: rxId, status: "skipped" })
        .eq("user_id", me).eq("plan_date", date).in("slot", slots)
        .is("replaced_by_coach_rx", null).not("status", "in", "(completed,skipped)")
        .select("id");
      // The coach workout becomes real plan rows so it runs exactly like a
      // Hammers card: focus mode, Swap, autosave and logging all land in the
      // same tables (wk_session_logs → Discipline, load, learning, coach plan).
      const { data: senderProfile } = await admin.from("profiles").select("full_name").eq("id", (rx as any).sender_id).maybeSingle();
      const rows = coachRxToWkRows({
        userId: me, planDate: date, category, prescriptionId: rxId,
        coachName: (senderProfile as any)?.full_name ?? null,
        exercises: Array.isArray((rx as any).exercises) ? (rx as any).exercises : [],
        usedInstead: true,
      });
      if (rows.length > 0) await admin.from("wk_prescriptions").insert(rows);
      await admin.from("coach_prescriptions").update({
        status: STATUS[choice],
        safety_result: { verdict: r.verdict, intensity, replaced_count: (replaced ?? []).length, inserted_count: rows.length, checked_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      }).eq("id", rxId);
      return json({ applied: true, verdict: r.verdict, replaced: (replaced ?? []).length, inserted: rows.length });
    }

    // Add alongside: the coach workout also becomes real plan rows (same
    // logging path); save-for-later and declined insert nothing.
    if (choice === "add_alongside") {
      const { data: senderProfile } = await admin.from("profiles").select("full_name").eq("id", (rx as any).sender_id).maybeSingle();
      const rows = coachRxToWkRows({
        userId: me, planDate: date, category, prescriptionId: rxId,
        coachName: (senderProfile as any)?.full_name ?? null,
        exercises: Array.isArray((rx as any).exercises) ? (rx as any).exercises : [],
        usedInstead: false,
      });
      if (rows.length > 0) await admin.from("wk_prescriptions").insert(rows);
      await admin.from("coach_prescriptions").update({
        status: STATUS[choice], updated_at: new Date().toISOString(),
      }).eq("id", rxId);
      return json({ applied: true, verdict: null, inserted: rows.length });
    }

    await admin.from("coach_prescriptions").update({
      status: STATUS[choice],
      updated_at: new Date().toISOString(),
    }).eq("id", rxId);
    return json({ applied: true, verdict: null });
  } catch (_e) {
    return json({ error: "Something went wrong" }, 500);
  }
});
