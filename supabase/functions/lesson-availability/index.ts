// Owner-approved Nov 6: open 1-hour lesson slots inside the owner's Lesson hours, minus his Google
// Calendar busy times and already-requested lessons. Times are UTC; the app shows them in the player's zone.
import { corsHeaders, json, admin, requireUser } from "../_shared/addons/server.ts";
import { googleCalendar } from "../_shared/addons/google.ts";
import { DEFAULT_LESSON_HOURS, openSlots, type LessonHours } from "../_shared/addons/slots.ts";

export async function loadOpenSlots(db: ReturnType<typeof admin>, now = new Date(), excludeSessionId?: string) {
  const { data: s } = await db.from("lesson_hours_settings").select("*").eq("id", 1).maybeSingle();
  const hours: LessonHours = { ...DEFAULT_LESSON_HOURS, ...(s ?? {}) };
  const until = new Date(now.getTime() + hours.max_weeks_ahead * 7 * 86400000 + 86400000);
  const busy = await googleCalendar().freeBusy(now.toISOString(), until.toISOString());
  const { data: taken } = await db.from("lesson_sessions").select("id, start_at, end_at, requested_start_at").gte("end_at", now.toISOString());
  const len = hours.lesson_minutes * 60000;
  const held = (taken ?? []).filter((t: any) => t.id !== excludeSessionId).flatMap((t: any) => {
    const out = [{ start: t.start_at, end: t.end_at }];
    if (t.requested_start_at) out.push({ start: t.requested_start_at, end: new Date(new Date(t.requested_start_at).getTime() + len).toISOString() });
    return out;
  });
  return { hours, slots: openSlots(hours, now, [...busy, ...held]) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const me = await requireUser(req);
    if (!me) return json({ error: "Not signed in" }, 401);
    const { hours, slots } = await loadOpenSlots(admin());
    return json({ slots, lessonMinutes: hours.lesson_minutes, ownerTimeZone: hours.time_zone });
  } catch (e) {
    console.error("lesson-availability", e);
    const msg = e instanceof Error ? e.message : "error";
    return json({ error: msg.includes("not_connected") ? "calendar_not_connected" : msg }, 500);
  }
});
