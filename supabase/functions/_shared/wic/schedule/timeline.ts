/**
 * Tell Hammers — the single schedule timeline (spec: docs/wic/adaptive-phases-and-schedule-v1.md §2, §10).
 *
 * Pure. Shared by the plan builder (edge function) and the app, so the two can
 * never read the timeline differently. No I/O.
 *
 * What each tag does to a plan day (Stage A):
 *   GAME / TOURNAMENT / EVENT  → a hard date the game-proximity rules plan around
 *   CANCELLED                   → removes games and practices on those dates (any source)
 *   HOLD                        → a recovery day (the existing rest-day path; only ever lighter)
 *   PRACTICE                    → a team practice on those dates
 *   PAIN                        → nothing here — pain runs through the existing pain rules
 *   SEASON                      → nothing here — season dates live on the season settings
 *   RESUME                      → ends any open hold from that day on
 *   GOAL / NOTE                 → context only
 */

export const TIMELINE_TAGS = [
  "SEASON",
  "GAME",
  "TOURNAMENT",
  "PRACTICE",
  "CANCELLED",
  "PAIN",
  "HOLD",
  "EVENT",
  "GOAL",
  "NOTE",
] as const;
export type TimelineFilterTag = (typeof TIMELINE_TAGS)[number];
export type TimelineTag = TimelineFilterTag | "RESUME";
export type TimelineSource = "inbox" | "ask_hammer";

export interface TimelineEntry {
  id: string;
  tag: TimelineTag;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  dates: string[] | null;
  source: TimelineSource;
  payload: Record<string, unknown>;
  summary: string;
  created_at: string;
  undone_at: string | null;
}

export const UNDO_WINDOW_MS = 24 * 3600 * 1000;

export function isoShift(iso: string, n: number): string {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
}

/** Every date an entry covers. Explicit `dates` win over the range. */
export function entryDates(e: Pick<TimelineEntry, "start_date" | "end_date" | "dates">): string[] {
  if (e.dates && e.dates.length) return [...e.dates].sort();
  const out: string[] = [];
  let d = e.start_date;
  let guard = 0;
  while (d <= e.end_date && guard < 400) {
    out.push(d);
    d = isoShift(d, 1);
    guard++;
  }
  return out;
}

export function isActive(e: Pick<TimelineEntry, "undone_at">): boolean {
  return !e.undone_at;
}

export function canUndo(e: Pick<TimelineEntry, "created_at" | "undone_at">, now = Date.now()): boolean {
  return !e.undone_at && now - new Date(e.created_at).getTime() < UNDO_WINDOW_MS;
}

/** Dedupe rule (mirrors the database save function): same tag + same source + overlapping dates. */
export function findMergeTarget(
  existing: ReadonlyArray<TimelineEntry>,
  next: { tag: TimelineTag; source: TimelineSource; start_date: string; end_date: string; payload?: Record<string, unknown> },
): TimelineEntry | null {
  return (
    existing
      .filter(
        (e) =>
          isActive(e) &&
          e.tag === next.tag &&
          // v1.2 §A: PAIN merges on the same body part from any screen.
          (next.tag === "PAIN"
            ? String((e as any).payload?.region ?? "") === String((next as any).payload?.region ?? "")
            : e.source === next.source) &&
          e.start_date <= next.end_date &&
          e.end_date >= next.start_date,
      )
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))[0] ?? null
  );
}

export interface DayEffect {
  cancelled: boolean;
  hold: boolean;
  travel: boolean;
  games: Array<{ id: string; date: string; label: string; tag: "GAME" | "TOURNAMENT" | "EVENT" }>;
  practice: boolean;
}

/** Resolve what the active timeline means for one date. */
export function dayEffect(entries: ReadonlyArray<TimelineEntry>, date: string): DayEffect {
  const live = entries.filter(isActive);
  const resumes = live.filter((e) => e.tag === "RESUME").map((e) => e.start_date);
  const out: DayEffect = { cancelled: false, hold: false, travel: false, games: [], practice: false };
  for (const e of live) {
    if (!entryDates(e).includes(date)) continue;
    switch (e.tag) {
      case "CANCELLED":
        out.cancelled = true;
        break;
      case "HOLD": {
        // A "Back to normal" on or before this date, made after the hold started, ends it.
        const ended = resumes.some((r) => r >= e.start_date && r <= date);
        if (!ended) {
          out.hold = true;
          if ((e.payload as any)?.reason === "travel") out.travel = true;
        }
        break;
      }
      case "GAME":
      case "TOURNAMENT":
      case "EVENT":
        out.games.push({
          id: `timeline:${e.id}:${date}`,
          date,
          label: String((e.payload as any)?.label ?? (e.tag === "EVENT" ? "Big event" : e.tag === "TOURNAMENT" ? "Tournament" : "Game")),
          tag: e.tag,
        });
        break;
      case "PRACTICE":
        out.practice = true;
        break;
      default:
        break;
    }
  }
  // A cancelled date carries no games from the timeline either.
  if (out.cancelled) out.games = [];
  return out;
}

/** Set of cancelled dates across the active timeline. */
export function cancelledDates(entries: ReadonlyArray<TimelineEntry>): Set<string> {
  const s = new Set<string>();
  for (const e of entries) if (isActive(e) && e.tag === "CANCELLED") for (const d of entryDates(e)) s.add(d);
  return s;
}

/**
 * The next "heavy day" in plain terms: the first day from `from` (inclusive,
 * up to 14 days) that is not a game/event day, not the day before one, not a
 * hold, and falls on one of the athlete's lifting weekdays.
 */
export function nextHeavyDay(
  entries: ReadonlyArray<TimelineEntry>,
  otherGameDates: ReadonlyArray<string>,
  from: string,
  liftWeekdays: ReadonlyArray<number> = [1, 2, 4, 5, 6],
): string | null {
  const cancelled = cancelledDates(entries);
  const games = new Set<string>(otherGameDates.filter((d) => !cancelled.has(d)));
  for (let i = 0; i < 21; i++) {
    const d = isoShift(from, i);
    for (const g of dayEffect(entries, d).games) games.add(g.date);
  }
  for (let i = 0; i < 14; i++) {
    const d = isoShift(from, i);
    const dow = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (!liftWeekdays.includes(dow)) continue;
    if (games.has(d) || games.has(isoShift(d, 1))) continue;
    if (dayEffect(entries, d).hold) continue;
    return d;
  }
  return null;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function plainDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}
export function plainWeekday(iso: string): string {
  return DAYS[new Date(`${iso}T12:00:00Z`).getUTCDay()];
}
function plainRange(a: string, b: string): string {
  return a === b ? plainDate(a) : `${plainDate(a)} to ${plainDate(b)}`;
}

/** One plain line saying what the entry is. */
export function describeEntry(e: Pick<TimelineEntry, "tag" | "start_date" | "end_date" | "dates" | "payload">): string {
  const p = (e.payload ?? {}) as any;
  const n = entryDates(e).length;
  switch (e.tag) {
    case "GAME":
      return n > 1 ? `${n} games, ${plainRange(e.start_date, e.end_date)}` : `Game on ${plainDate(e.start_date)}`;
    case "TOURNAMENT":
      return `Tournament ${plainRange(e.start_date, e.end_date)}`;
    case "CANCELLED":
      return `No games ${plainRange(e.start_date, e.end_date)}`;
    case "HOLD":
      return p.reason === "travel" ? `Travelling ${plainRange(e.start_date, e.end_date)}` : `Break ${plainRange(e.start_date, e.end_date)}`;
    case "EVENT":
      return `${p.label ?? "Big event"} on ${plainDate(e.start_date)}`;
    case "SEASON":
      return `Season ${p.which === "ends" ? "ends" : "starts"} ${plainDate(e.start_date)}`;
    case "PAIN":
      return `${p.regionLabel ?? "Something"} hurts — ${p.faceLabel ?? "noted"}`;
    case "RESUME":
      return `Back to normal from ${plainDate(e.start_date)}`;
    case "PRACTICE":
      return `Practice ${plainRange(e.start_date, e.end_date)}`;
    case "GOAL":
      return `Goal: ${p.text ?? ""}`.trim();
    default:
      return String(p.text ?? "Note");
  }
}

/**
 * "What changed" line after a save (§2, §10: always a visible change or a
 * plain "nothing needed to change").
 */
export function whatChanged(args: {
  entry: Pick<TimelineEntry, "tag" | "start_date" | "end_date" | "dates" | "payload">;
  merged: boolean;
  heavyBefore: string | null;
  heavyAfter: string | null;
}): string {
  const head = args.merged ? "You already told me this — I updated it." : "Got it —";
  const what = describeEntry(args.entry);
  let tail: string;
  if (args.entry.tag === "PAIN") {
    tail = "Saved to your pain log — tell a coach or parent too.";
  } else if (args.heavyBefore !== args.heavyAfter) {
    tail = args.heavyAfter
      ? `Next heavy day moves to ${plainWeekday(args.heavyAfter)}, ${plainDate(args.heavyAfter)}.`
      : "No heavy day in the next two weeks.";
  } else if (["GOAL", "NOTE"].includes(args.entry.tag)) {
    tail = "Nothing needed to change in your plan.";
  } else {
    tail = args.heavyAfter
      ? `Hammer re-planned your week. Next heavy day stays ${plainWeekday(args.heavyAfter)}.`
      : "Hammer re-planned your week. Nothing heavy is due yet.";
  }
  return args.merged ? `${head} ${what}. ${tail}` : `${head} ${what.charAt(0).toLowerCase()}${what.slice(1)}. ${tail}`;
}
