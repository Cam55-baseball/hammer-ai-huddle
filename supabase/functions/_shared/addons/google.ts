// Google Calendar through Lovable's Google Calendar connection (owner's Workspace calendar).
import type { CalendarClient } from "./booking.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_calendar/calendar/v3";

export function googleCalendar(): CalendarClient {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connKey = Deno.env.get("GOOGLE_CALENDAR_API_KEY");
  if (!lovableKey || !connKey) throw new Error("google_calendar_not_connected");
  const headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey, "Content-Type": "application/json" };
  const call = async (path: string, init: RequestInit) => {
    const r = await fetch(`${GATEWAY_URL}${path}`, { ...init, headers });
    const text = await r.text();
    if (!r.ok) throw new Error(`Google Calendar [${r.status}]: ${text}`);
    return text ? JSON.parse(text) : {};
  };
  return {
    async freeBusy(timeMin, timeMax) {
      const j = await call("/freeBusy", { method: "POST", body: JSON.stringify({ timeMin, timeMax, items: [{ id: "primary" }] }) });
      return (j.calendars?.primary?.busy ?? []) as { start: string; end: string }[];
    },
    async createEvent(ev) {
      const j = await call("/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all", {
        method: "POST",
        body: JSON.stringify({
          summary: ev.summary, description: ev.description,
          start: { dateTime: ev.start }, end: { dateTime: ev.end },
          attendees: ev.attendees.map((email) => ({ email })),
          conferenceData: { createRequest: { requestId: ev.requestId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
          reminders: { useDefault: false, overrides: [{ method: "email", minutes: 1440 }, { method: "popup", minutes: 60 }] },
        }),
      });
      const meet = j.hangoutLink ?? j.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri ?? null;
      return { id: j.id, meetUrl: meet };
    },
    async moveEvent(eventId, start, end) {
      await call(`/calendars/primary/events/${encodeURIComponent(eventId)}?sendUpdates=all`, {
        method: "PATCH", body: JSON.stringify({ start: { dateTime: start }, end: { dateTime: end } }),
      });
    },
  };
}
