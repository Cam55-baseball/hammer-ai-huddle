/**
 * Ask Hammer → Tell Hammers entry. Deterministic plain-words parser (no AI
 * call, no guessing): if it can't read a date, it asks instead of inventing one.
 */
import { isoShift, type TimelineTag } from "../../../../supabase/functions/_shared/wic/schedule/timeline";
import { REPORT_INJURY_REGIONS, type ReportInjuryRegionKey } from "@/lib/hammer/injury/reportInjury";

export interface EntryDraft {
  tag: TimelineTag;
  start_date: string;
  end_date: string;
  dates: string[] | null;
  payload: Record<string, unknown>;
}

export type ParseResult =
  | { ok: true; draft: EntryDraft }
  | { ok: false; reason: string };

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** A month/day with no year means the next time that date comes around. */
function resolveMonthDay(m: number, d: number, today: string): string {
  const y = Number(today.slice(0, 4));
  const candidate = iso(y, m, d);
  return candidate < today ? iso(y + 1, m, d) : candidate;
}

function nextWeekday(dow: number, today: string, includeToday = false): string {
  for (let i = includeToday ? 0 : 1; i < 8; i++) {
    const d = isoShift(today, i);
    if (new Date(`${d}T12:00:00Z`).getUTCDay() === dow) return d;
  }
  return today;
}

/** All explicit dates mentioned, in order. Handles "Oct 5 to 19" and "Oct 5 - Nov 2". */
export function extractDates(text: string, today: string): string[] {
  const t = text.toLowerCase();
  const out: string[] = [];
  const monthRe = /\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*(?:-|to|through|thru|until|till)\s*(?:(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+)?(\d{1,2})(?:st|nd|rd|th)?)?/g;
  let m: RegExpExecArray | null;
  while ((m = monthRe.exec(t))) {
    const mon = MONTHS[m[1].slice(0, m[1] === "sept" ? 4 : 3)];
    out.push(resolveMonthDay(mon, Number(m[2]), today));
    if (m[4]) {
      const mon2 = m[3] ? MONTHS[m[3].slice(0, 3)] : mon;
      out.push(resolveMonthDay(mon2, Number(m[4]), today));
    }
  }
  const numRe = /\b(\d{1,2})\/(\d{1,2})\b/g;
  while ((m = numRe.exec(t))) out.push(resolveMonthDay(Number(m[1]) - 1, Number(m[2]), today));
  if (/\btoday\b/.test(t)) out.push(today);
  if (/\btomorrow\b/.test(t)) out.push(isoShift(today, 1));
  if (!/\bevery\b/.test(t)) {
    for (const [name, dow] of Object.entries(WEEKDAYS)) {
      if (new RegExp(`\\b(this|next|on)?\\s*${name}\\b`).test(t) && name.length > 3) out.push(nextWeekday(dow, today));
    }
  }
  return out;
}

function durationDays(t: string): number | null {
  const m = t.match(/\b(\d+|a|one|two|three|four)\s*(day|days|week|weeks)\b/);
  if (!m) return null;
  const words: Record<string, number> = { a: 1, one: 1, two: 2, three: 3, four: 4 };
  const n = words[m[1]] ?? Number(m[1]);
  return m[2].startsWith("week") ? n * 7 : n;
}

function findRegion(t: string): { key: ReportInjuryRegionKey; label: string } | null {
  for (const r of REPORT_INJURY_REGIONS) {
    if (new RegExp(`\\b${r.key}\\b`).test(t) || t.includes(r.label.toLowerCase())) return { key: r.key, label: r.label };
  }
  if (/\barm\b/.test(t)) return { key: "shoulder", label: "Shoulder" };
  if (/\bback\b/.test(t)) return { key: "back", label: "Low back" };
  return null;
}

export function parseScheduleRequest(text: string, today: string): ParseResult {
  const t = text.toLowerCase().trim();
  if (!t) return { ok: false, reason: "Tell me what changed." };
  const dates = extractDates(t, today);
  const first = dates[0] ?? null;
  const range = (a: string | null, b?: string | null) => {
    const s = a ?? today;
    const e = b && b >= s ? b : s;
    return { start_date: s, end_date: e };
  };

  // Pain first — safety outranks everything.
  if (/\b(hurt|hurts|pain|sore|injur|tweak|pulled|strain)/.test(t)) {
    const region = findRegion(t);
    if (!region) return { ok: false, reason: "Where does it hurt? Tap \"Something hurts\" to pick the spot." };
    const face = /can'?t|cannot|really bad|a lot|bad/.test(t) ? (/can'?t|cannot/.test(t) ? "cant" : "lot") : "little";
    return {
      ok: true,
      draft: { tag: "PAIN", ...range(today), dates: null, payload: { region: region.key, regionLabel: region.label, face, faceLabel: FACE_LABEL[face] } },
    };
  }
  if (/\bback to normal\b|\bi'?m back\b|\bresume\b/.test(t)) {
    return { ok: true, draft: { tag: "RESUME", ...range(first ?? today), dates: null, payload: {} } };
  }
  if (/cancel|rained out|called off|no games/.test(t)) {
    if (!first) return { ok: false, reason: "Which dates got cancelled?" };
    return { ok: true, draft: { tag: "CANCELLED", ...range(first, dates[1]), dates: null, payload: {} } };
  }
  if (/season (start|begin|end|finish|over)/.test(t)) {
    if (!first) return { ok: false, reason: "What date?" };
    const which = /end|finish|over/.test(t) ? "ends" : "starts";
    return { ok: true, draft: { tag: "SEASON", ...range(first), dates: null, payload: { which } } };
  }
  if (/travel|trip|away|vacation|break|rest|time off|off for/.test(t)) {
    const reason = /travel|trip|away|vacation/.test(t) ? "travel" : "break";
    const days = durationDays(t);
    const start = first ?? today;
    const end = dates[1] ?? (days ? isoShift(start, days - 1) : null);
    if (!end && !first) return { ok: false, reason: "For how long?" };
    return { ok: true, draft: { tag: "HOLD", ...range(start, end ?? start), dates: null, payload: { reason } } };
  }
  const eventWord = t.match(/\b(combine|showcase|tryout|camp)\b/);
  if (eventWord) {
    if (!first) return { ok: false, reason: `When is the ${eventWord[1]}?` };
    const label = eventWord[1][0].toUpperCase() + eventWord[1].slice(1);
    return { ok: true, draft: { tag: "EVENT", ...range(first, dates[1]), dates: null, payload: { label, kind: eventWord[1] } } };
  }
  if (/tournament/.test(t)) {
    if (!first) return { ok: false, reason: "When is the tournament?" };
    return { ok: true, draft: { tag: "TOURNAMENT", ...range(first, dates[1]), dates: null, payload: {} } };
  }
  if (/\bgames?\b|\bplaying\b/.test(t)) {
    const every = t.match(/every\s+([a-z]+)/);
    if (every && WEEKDAYS[every[1]] !== undefined) {
      const until = first;
      if (!until) return { ok: false, reason: `Every ${every[1]} until when?` };
      const list = weeklyDates(WEEKDAYS[every[1]], today, until);
      if (!list.length) return { ok: false, reason: "That end date is before the first game." };
      return { ok: true, draft: { tag: "GAME", start_date: list[0], end_date: list[list.length - 1], dates: list, payload: { every: every[1] } } };
    }
    if (!first) return { ok: false, reason: "What dates are the games?" };
    const uniq = Array.from(new Set(dates)).sort();
    return { ok: true, draft: { tag: "GAME", start_date: uniq[0], end_date: uniq[uniq.length - 1], dates: uniq, payload: {} } };
  }
  if (/practice/.test(t)) {
    if (!first) return { ok: false, reason: "When is practice?" };
    return { ok: true, draft: { tag: "PRACTICE", ...range(first, dates[1]), dates: null, payload: {} } };
  }
  if (/\bgoal\b|\bwant to\b/.test(t)) {
    return { ok: true, draft: { tag: "GOAL", ...range(today), dates: null, payload: { text: text.trim() } } };
  }
  return { ok: true, draft: { tag: "NOTE", ...range(today), dates: null, payload: { text: text.trim() } } };
}

export function weeklyDates(dow: number, today: string, until: string): string[] {
  const out: string[] = [];
  let d = nextWeekday(dow, today, true);
  while (d <= until && out.length < 60) {
    out.push(d);
    d = isoShift(d, 7);
  }
  return out;
}

export const FACE_LABEL: Record<string, string> = {
  little: "a little",
  lot: "a lot",
  cant: "can't play",
};
/** The three faces map onto the existing pain rules' severity scale. */
export const FACE_SEVERITY = { little: "sore", lot: "limiting", cant: "cannot_train" } as const;

// ---------------------------------------------------------------- v1.1 §E check-in chips
// The check-in chips build EXACTLY the drafts the inbox buttons build, so the
// same dedupe applies and nothing is ever entered twice.
export type LifeChip = "travel" | "break" | "cancelled" | "resume";
export function lifeChipDraft(chip: LifeChip, today: string): EntryDraft {
  switch (chip) {
    case "travel":
      return { tag: "HOLD", start_date: today, end_date: today, dates: null, payload: { reason: "travel" } };
    case "break":
      return { tag: "HOLD", start_date: today, end_date: today, dates: null, payload: { reason: "break" } };
    case "cancelled":
      return { tag: "CANCELLED", start_date: today, end_date: isoShift(today, 6), dates: null, payload: {} };
    case "resume":
      return { tag: "RESUME", start_date: today, end_date: today, dates: null, payload: {} };
  }
}
export function painChipDraft(today: string, region: { key: string; label: string }, face: keyof typeof FACE_LABEL): EntryDraft {
  return { tag: "PAIN", start_date: today, end_date: today, dates: null, payload: { region: region.key, regionLabel: region.label, face, faceLabel: FACE_LABEL[face] } };
}
export type NextGameAnswer = "this_week" | "2_3_weeks" | "month_plus" | "not_sure";
export const NEXT_GAME_ANSWERS: { key: NextGameAnswer; label: string }[] = [
  { key: "this_week", label: "This week" },
  { key: "2_3_weeks", label: "2 to 3 weeks" },
  { key: "month_plus", label: "More than a month" },
  { key: "not_sure", label: "Not sure" },
];
export function nextGameDraft(today: string, answer: NextGameAnswer): EntryDraft {
  return { tag: "NOTE", start_date: today, end_date: today, dates: null, payload: { kind: "next_game_answer", answer } };
}
