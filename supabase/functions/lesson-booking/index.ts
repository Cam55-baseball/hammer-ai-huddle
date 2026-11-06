// Owner-approved Nov 6: Hammers Online ×4 booking. Player picks 4 times on 4 different days → owner
// confirms → 4 Google Calendar events with Meet links, inviting the player (+ parents if under 18).
import { z } from "npm:zod@3.23.8";
import { corsHeaders, json, admin, requireUser, isOwner, athleteFacts, emailOf, notify, ownerIds } from "../_shared/addons/server.ts";
import { googleCalendar } from "../_shared/addons/google.ts";
import { validatePicks, dayKey } from "../_shared/addons/slots.ts";
import { confirmSessions, approveReschedule, inviteList, type SessionRow } from "../_shared/addons/booking.ts";
import { loadOpenSlots } from "../_shared/addons/availability.ts";

const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("mine") }),
  z.object({ action: z.literal("submit_times"), bookingId: z.string().uuid(), picks: z.array(z.string().max(40)).length(4), timeZone: z.string().max(64).optional() }),
  z.object({ action: z.literal("request_reschedule"), sessionId: z.string().uuid(), newStart: z.string().max(40) }),
  z.object({ action: z.literal("owner_list") }),
  z.object({ action: z.literal("owner_confirm"), bookingId: z.string().uuid() }),
  z.object({ action: z.literal("owner_return"), bookingId: z.string().uuid() }),
  z.object({ action: z.literal("owner_reschedule"), sessionId: z.string().uuid(), approve: z.boolean() }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const me = await requireUser(req);
    if (!me) return json({ error: "Not signed in" }, 401);
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return json({ error: "bad_request" }, 400);
    const db = admin();
    const uid = me.user.id;
    const b = parsed.data;
    const now = new Date().toISOString();

    if (b.action === "mine") {
      const { data } = await db.from("lesson_bookings").select("*, lesson_sessions(*)").eq("athlete_user_id", uid).order("created_at", { ascending: false });
      return json({ bookings: data ?? [] });
    }

    if (b.action === "submit_times") {
      const { data: bk } = await db.from("lesson_bookings").select("*").eq("id", b.bookingId).maybeSingle();
      if (!bk || bk.athlete_user_id !== uid) return json({ error: "not_found" }, 404);
      if (bk.status !== "awaiting_times") return json({ error: "already_requested" }, 409);
      const { hours, slots } = await loadOpenSlots(db);
      const v = validatePicks(b.picks, slots, hours);
      if (!v.ok) return json({ error: "invalid_picks", message: v.reason }, 400);
      const len = hours.lesson_minutes * 60000;
      const rows = [...b.picks].map((p) => new Date(p).toISOString()).sort().map((start, i) => ({
        booking_id: bk.id, lesson_number: i + 1, start_at: start, end_at: new Date(new Date(start).getTime() + len).toISOString(),
      }));
      const { error } = await db.from("lesson_sessions").insert(rows);
      if (error) return json({ error: "save_failed" }, 500);
      await db.from("lesson_bookings").update({ status: "requested", player_time_zone: b.timeZone ?? null, updated_at: now }).eq("id", bk.id);
      const facts = await athleteFacts(db, uid);
      await notify(db, await ownerIds(db), "New lesson request", `${facts.name} picked 4 lesson times. Confirm them in Lesson requests.`, "/owner?section=lessons");
      return json({ ok: true });
    }

    if (b.action === "request_reschedule") {
      const { data: s } = await db.from("lesson_sessions").select("*, lesson_bookings!inner(athlete_user_id)").eq("id", b.sessionId).maybeSingle();
      if (!s || (s as any).lesson_bookings.athlete_user_id !== uid) return json({ error: "not_found" }, 404);
      if (s.status !== "confirmed") return json({ error: "not_confirmed" }, 409);
      const { hours, slots } = await loadOpenSlots(db, new Date(), s.id);
      const newStart = new Date(b.newStart).toISOString();
      if (!slots.some((x) => x.start === newStart)) return json({ error: "invalid_picks", message: "That time isn't open. Pick another." }, 400);
      const { data: others } = await db.from("lesson_sessions").select("start_at").eq("booking_id", s.booking_id).neq("id", s.id);
      if ((others ?? []).some((o: any) => dayKey(o.start_at, hours.time_zone) === dayKey(newStart, hours.time_zone))) {
        return json({ error: "invalid_picks", message: "Each lesson must be on a different day." }, 400);
      }
      await db.from("lesson_sessions").update({ status: "reschedule_requested", requested_start_at: newStart, updated_at: now }).eq("id", s.id);
      await notify(db, await ownerIds(db), "Lesson reschedule request", "A player asked to move a lesson. Review it in Lesson requests.", "/owner?section=lessons");
      return json({ ok: true });
    }

    // Owner actions
    if (!(await isOwner(db, uid))) return json({ error: "owner_only" }, 403);

    if (b.action === "owner_list") {
      const { data } = await db.from("lesson_bookings").select("*, lesson_sessions(*)").order("created_at", { ascending: false }).limit(100);
      const ids = [...new Set((data ?? []).map((r: any) => r.athlete_user_id))];
      const { data: profs } = ids.length ? await db.from("profiles").select("id, full_name, first_name").in("id", ids) : { data: [] };
      const names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || p.first_name || "Player"]));
      return json({ bookings: (data ?? []).map((r: any) => ({ ...r, player_name: names[r.athlete_user_id] ?? "Player" })) });
    }

    if (b.action === "owner_return") {
      const { data: bk } = await db.from("lesson_bookings").select("*").eq("id", b.bookingId).maybeSingle();
      if (!bk || bk.status !== "requested") return json({ error: "not_requested" }, 409);
      // Scoped to this one unconfirmed booking's requested times.
      await db.from("lesson_sessions").delete().eq("booking_id", bk.id).eq("status", "requested").is("google_event_id", null);
      await db.from("lesson_bookings").update({ status: "awaiting_times", updated_at: now }).eq("id", bk.id);
      await notify(db, [bk.athlete_user_id], "Please pick new lesson times", "Those times didn't work. Pick 4 new days and times.", "/lessons");
      return json({ ok: true });
    }

    const cal = googleCalendar();

    if (b.action === "owner_confirm") {
      const { data: bk } = await db.from("lesson_bookings").select("*").eq("id", b.bookingId).maybeSingle();
      if (!bk || !["requested", "confirmed"].includes(bk.status)) return json({ error: "not_requested" }, 409);
      const { data: sessions } = await db.from("lesson_sessions").select("*").eq("booking_id", bk.id);
      const facts = await athleteFacts(db, bk.athlete_user_id);
      const playerEmail = (await emailOf(db, bk.athlete_user_id)) ?? facts.contactEmail;
      const parentEmails = (await Promise.all(facts.parentIds.map((p) => emailOf(db, p)))).filter((e): e is string => !!e);
      const attendees = inviteList(playerEmail, parentEmails, facts.under18);
      const done = await confirmSessions(cal, (sessions ?? []) as SessionRow[], { bookingId: bk.id, playerName: facts.name, attendees });
      for (const s of done) {
        await db.from("lesson_sessions").update({ status: s.status, google_event_id: s.google_event_id, meet_url: s.meet_url, updated_at: now }).eq("id", s.id);
      }
      await db.from("lesson_bookings").update({ status: "confirmed", updated_at: now }).eq("id", bk.id);
      await notify(db, [bk.athlete_user_id, ...(facts.under18 ? facts.parentIds : [])], "Lessons confirmed", "Your 4 lesson times are confirmed. Meet links are in the app and your email.", "/lessons");
      return json({ ok: true, invited: attendees.length });
    }

    if (b.action === "owner_reschedule") {
      const { data: s } = await db.from("lesson_sessions").select("*, lesson_bookings!inner(athlete_user_id)").eq("id", b.sessionId).maybeSingle();
      if (!s || s.status !== "reschedule_requested") return json({ error: "no_request" }, 409);
      const athlete = (s as any).lesson_bookings.athlete_user_id;
      if (!b.approve) {
        await db.from("lesson_sessions").update({ status: "confirmed", requested_start_at: null, updated_at: now }).eq("id", s.id);
        await notify(db, [athlete], "Lesson time kept", "Your lesson stays at its original time.", "/lessons");
        return json({ ok: true });
      }
      const { data: hs } = await db.from("lesson_hours_settings").select("lesson_minutes").eq("id", 1).maybeSingle();
      const moved = await approveReschedule(cal, s as SessionRow, hs?.lesson_minutes ?? 60);
      await db.from("lesson_sessions").update({ start_at: moved.start_at, end_at: moved.end_at, status: "confirmed", requested_start_at: null, updated_at: now }).eq("id", s.id);
      await notify(db, [athlete], "Lesson moved", "Your lesson was moved to the new time you asked for.", "/lessons");
      return json({ ok: true });
    }
    return json({ error: "bad_request" }, 400);
  } catch (e) {
    console.error("lesson-booking", e);
    const msg = e instanceof Error ? e.message : "error";
    return json({ error: msg.includes("not_connected") ? "calendar_not_connected" : msg }, 500);
  }
});
