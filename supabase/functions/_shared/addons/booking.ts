// Lesson booking flow, with Google Calendar injected so it can be tested with mocks.

export interface CalendarClient {
  freeBusy(timeMin: string, timeMax: string): Promise<{ start: string; end: string }[]>;
  createEvent(ev: { summary: string; description: string; start: string; end: string; attendees: string[]; requestId: string }): Promise<{ id: string; meetUrl: string | null }>;
  moveEvent(eventId: string, start: string, end: string): Promise<void>;
}

export interface SessionRow {
  id: string;
  lesson_number: number;
  start_at: string;
  end_at: string;
  status: "requested" | "confirmed" | "reschedule_requested";
  requested_start_at: string | null;
  google_event_id: string | null;
  meet_url: string | null;
}

/** Invite list: the player plus every linked parent when under 18. */
export function inviteList(playerEmail: string | null, parentEmails: string[], under18: boolean): string[] {
  const list = [playerEmail, ...(under18 ? parentEmails : [])].filter((e): e is string => !!e && e.includes("@"));
  return [...new Set(list.map((e) => e.toLowerCase()))];
}

/** Owner confirms: create one event (with Meet) per session that doesn't have one yet. Idempotent. */
export async function confirmSessions(
  cal: CalendarClient,
  sessions: SessionRow[],
  opts: { bookingId: string; playerName: string; attendees: string[] },
): Promise<SessionRow[]> {
  const out: SessionRow[] = [];
  for (const s of [...sessions].sort((a, b) => a.lesson_number - b.lesson_number)) {
    if (s.google_event_id) { out.push({ ...s, status: "confirmed" }); continue; }
    const ev = await cal.createEvent({
      summary: `Hammers Online — Private lesson ${s.lesson_number} of 4 (${opts.playerName})`,
      description: "One-on-one online private lesson with Hammers Modality. Join with the Google Meet link.",
      start: s.start_at, end: s.end_at, attendees: opts.attendees,
      requestId: `${opts.bookingId}-${s.lesson_number}`,
    });
    out.push({ ...s, status: "confirmed", google_event_id: ev.id, meet_url: ev.meetUrl });
  }
  return out;
}

/** Owner approves a reschedule: move the event and clear the request. */
export async function approveReschedule(cal: CalendarClient, s: SessionRow, lessonMinutes: number): Promise<SessionRow> {
  if (s.status !== "reschedule_requested" || !s.requested_start_at) throw new Error("no_reschedule_request");
  const start = new Date(s.requested_start_at).toISOString();
  const end = new Date(new Date(start).getTime() + lessonMinutes * 60000).toISOString();
  if (s.google_event_id) await cal.moveEvent(s.google_event_id, start, end);
  return { ...s, start_at: start, end_at: end, status: "confirmed", requested_start_at: null };
}
