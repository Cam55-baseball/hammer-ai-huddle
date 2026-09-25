/**
 * Step 30 E — throwing and catching rep entry inside the plan.
 *
 * ONE arm ledger per athlete. Position throws (throwing card) and pitcher
 * warm-up / catch play (pitching card) are stored as arm_ledger_entries rows;
 * pitch counts keep living in the pitching log (wk_session_logs.metrics.pitches)
 * and are ADDED, never replaced. Budgets and the stricter-rule-wins logic come
 * from the shared arm ledger (armLedger.ts) — this file never invents a dose.
 *
 * A prescribed throw type with no entry counts as done at the prescribed
 * number; only an explicit "skipped" removes it.
 */
import {
  armBudget,
  ledgerDay,
  throwUnits,
  type ArmBudget,
  type Intent,
  type LedgerDay,
  type Sport,
  type ThrowAthlete,
  type ThrowEvent,
  type ThrowRole,
} from "../../../supabase/functions/_shared/wic/phases/armLedger";

export type ThrowType =
  | "catch_play"
  | "position_throws"
  | "infield_quick_release"
  | "infield_short_hops"
  | "outfield_crow_hop"
  | "long_toss"
  | "catcher_throwdowns"
  | "pitcher_warmup"
  | "pitcher_catch_play";

export type EntrySource = "position" | "pitching";

interface ThrowTypeDef {
  label: string;
  source: EntrySource;
  intent: Intent;
  kind: ThrowEvent["kind"];
}

export const THROW_TYPES: Record<ThrowType, ThrowTypeDef> = {
  catch_play: { label: "Catch play", source: "position", intent: "low", kind: "warmup" },
  position_throws: { label: "Position throws", source: "position", intent: "moderate", kind: "practice" },
  infield_quick_release: { label: "Infield quick release", source: "position", intent: "high", kind: "practice" },
  infield_short_hops: { label: "Infield short hops", source: "position", intent: "moderate", kind: "practice" },
  outfield_crow_hop: { label: "Outfield crow-hop throws", source: "position", intent: "high", kind: "practice" },
  long_toss: { label: "Long toss", source: "position", intent: "moderate", kind: "long_toss" },
  catcher_throwdowns: { label: "Catcher throw-downs", source: "position", intent: "high", kind: "throwdown" },
  pitcher_warmup: { label: "Warm-up throws", source: "pitching", intent: "low", kind: "warmup" },
  pitcher_catch_play: { label: "Catch play", source: "pitching", intent: "low", kind: "warmup" },
};

export interface ArmEntry {
  entry_date: string;
  throw_type: ThrowType;
  count: number;
  status: "done" | "skipped";
}
export interface PitchLog { plan_date: string; pitches: number }
export interface Prescribed { throw_type: ThrowType; count: number }

const norm = (p: unknown) => String(p ?? "").trim().toLowerCase();
const isP = (p: string) => p === "p" || p === "pitcher" || p === "sp" || p === "rp" || p.includes("pitch");
const isC = (p: string) => p === "c" || p === "catcher";
const INFIELD = new Set(["1b", "2b", "3b", "ss", "infield", "first base", "second base", "third base", "shortstop", "if"]);
const OUTFIELD = new Set(["lf", "cf", "rf", "of", "outfield", "left field", "center field", "right field"]);

/** Same role rule the nightly shadow job uses. */
export function throwRoleFrom(primary: unknown, secondary: unknown): ThrowRole {
  const a = norm(primary), b = norm(secondary);
  const pitches = isP(a) || isP(b);
  const catches = isC(a) || isC(b);
  if (pitches && catches) return "pitcher_catcher";
  if (pitches && (a && !isP(a) || b && !isP(b))) return "two_way";
  if (pitches) return "pitcher";
  if (catches) return "catcher";
  return "position";
}

export function positionGroup(primary: unknown): "infield" | "outfield" | "catcher" | "unknown" {
  const p = norm(primary);
  if (isC(p)) return "catcher";
  if (INFIELD.has(p)) return "infield";
  if (OUTFIELD.has(p)) return "outfield";
  return "unknown";
}

/** Prescribed throws for today's card, by role and position. Owner-reviewable defaults. */
export function prescribedThrows(role: ThrowRole, primary: unknown, secondary?: unknown): Prescribed[] {
  const out: Prescribed[] = [];
  const hasPosition = role !== "pitcher";
  if (hasPosition) {
    const grp = positionGroup(isP(norm(primary)) ? secondary : primary);
    out.push({ throw_type: "catch_play", count: 30 });
    if (grp === "catcher" || role === "catcher" || role === "pitcher_catcher") {
      out.push({ throw_type: "position_throws", count: 30 }, { throw_type: "catcher_throwdowns", count: 8 });
    } else if (grp === "infield") {
      out.push({ throw_type: "position_throws", count: 25 }, { throw_type: "infield_quick_release", count: 15 }, { throw_type: "infield_short_hops", count: 10 });
    } else if (grp === "outfield") {
      out.push({ throw_type: "position_throws", count: 20 }, { throw_type: "outfield_crow_hop", count: 12 }, { throw_type: "long_toss", count: 20 });
    } else {
      out.push({ throw_type: "position_throws", count: 30 }, { throw_type: "long_toss", count: 15 });
    }
  }
  if (role === "pitcher" || role === "two_way" || role === "pitcher_catcher") {
    out.push({ throw_type: "pitcher_warmup", count: 25 }, { throw_type: "pitcher_catch_play", count: 20 });
  }
  return out;
}

/** Every throw type the card can enter, even ones not prescribed today. */
export function enterableTypes(role: ThrowRole, source: EntrySource): ThrowType[] {
  return (Object.keys(THROW_TYPES) as ThrowType[]).filter((t) => {
    if (THROW_TYPES[t].source !== source) return false;
    if (source === "pitching") return role !== "position" && role !== "catcher";
    if (role === "pitcher") return false;
    if (t === "catcher_throwdowns") return role === "catcher" || role === "pitcher_catcher";
    return true;
  });
}

/** Events for ONE day: logged entries + missing prescribed = done + pitch counts (additive). */
export function dayEvents(date: string, prescribed: Prescribed[] | null, entries: ArmEntry[], pitches: PitchLog[]): ThrowEvent[] {
  const events: ThrowEvent[] = [];
  const today = entries.filter((e) => e.entry_date === date);
  const byType = new Map(today.map((e) => [e.throw_type, e]));
  for (const p of prescribed ?? []) {
    if (byType.has(p.throw_type)) continue;
    const d = THROW_TYPES[p.throw_type];
    events.push({ kind: d.kind, count: p.count, intent: d.intent, estimated: false });
  }
  for (const e of today) {
    if (e.status === "skipped" || e.count <= 0) continue;
    const d = THROW_TYPES[e.throw_type];
    events.push({ kind: d.kind, count: e.count, intent: d.intent, estimated: false });
  }
  const p = pitches.filter((x) => x.plan_date === date).reduce((s, x) => s + (x.pitches || 0), 0);
  if (p > 0) events.push({ kind: "pitch", count: p, intent: "high", estimated: false });
  return events;
}

export interface ArmLedgerView {
  role: ThrowRole;
  budget: ArmBudget;
  today: LedgerDay;
  usedToday: number;
  usedWeek: number;
  throwsToday: number;
  overWeekly: boolean;
  line: string;
}

function used(b: ArmBudget, events: ThrowEvent[]): number {
  if (b.unit === "pitches") return events.filter((e) => e.kind === "pitch").reduce((s, e) => s + e.count, 0);
  return Math.round(throwUnits(events) * 10) / 10;
}

/**
 * The one ledger view both cards render. Week = today + the six days before
 * (only what was logged on past days; today's prescribed-but-missing counts as done).
 */
export function armLedgerView(
  a: { sport: Sport; role: ThrowRole; age: number | null },
  date: string,
  prescribed: Prescribed[],
  entries: ArmEntry[],
  pitches: PitchLog[],
): ArmLedgerView {
  const athlete: ThrowAthlete = a;
  const budget = armBudget(athlete);
  const evToday = dayEvents(date, prescribed, entries, pitches);
  const today = ledgerDay(athlete, evToday);
  const usedToday = used(budget, evToday);
  let usedWeek = usedToday;
  const base = Date.parse(date + "T00:00:00Z");
  for (let i = 1; i < 7; i++) {
    const d = new Date(base - i * 86400000).toISOString().slice(0, 10);
    usedWeek += used(budget, dayEvents(d, null, entries, pitches));
  }
  usedWeek = Math.round(usedWeek * 10) / 10;
  const throwsToday = evToday.reduce((s, e) => s + e.count, 0);
  const unit = budget.unit === "pitches" ? "pitches" : "arm units";
  const line = `Today ${usedToday} of ${budget.daily} ${unit} · this week ${usedWeek} of ${budget.weekly}`;
  return { role: a.role, budget, today, usedToday, usedWeek, throwsToday, overWeekly: usedWeek > budget.weekly, line };
}

export function ageFrom(dob: string | null | undefined, now = Date.now()): number | null {
  if (!dob) return null;
  const y = (now - new Date(dob).getTime()) / (365.25 * 86400000);
  return Number.isFinite(y) ? Math.floor(y) : null;
}

// Pitch counts come from useRecentPitchingLoad (templates bullpen_pitching / pitching_outing).
