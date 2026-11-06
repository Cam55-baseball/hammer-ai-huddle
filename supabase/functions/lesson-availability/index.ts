// Owner-approved Nov 6: open 1-hour lesson slots inside the owner's Lesson hours, minus his Google
// Calendar busy times and already-requested lessons. Times are UTC; the app shows them in the player's zone.
import { corsHeaders, json, admin, requireUser } from "../_shared/addons/server.ts";
import { loadOpenSlots } from "../_shared/addons/availability.ts";

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
