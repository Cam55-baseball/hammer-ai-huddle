import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";
import { googleCalendar } from "./google.ts";
import { DEFAULT_LESSON_HOURS, openSlots, type LessonHours } from "./slots.ts";

export async function loadOpenSlots(db: SupabaseClient, now = new Date(), excludeSessionId?: string) {
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

