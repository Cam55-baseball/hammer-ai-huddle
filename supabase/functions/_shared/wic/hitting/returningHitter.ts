/**
 * Owner Nov 1 round 6 Part 3 — HITTERS RETURNING. Pure; shared by the app and the server.
 *  - Default: keep the player's normal environment. Returning hitters (no recent live/machine,
 *    or coming off a layoff) get LOW-effort swings and their reduced starting volume, building
 *    effort back to full go one step per green week.
 *  - Exceptions: coming back from an injury, or under 13 → low-impact environment first
 *    (tee / front toss), back to normal after a green week.
 *  - Adaptive bridge: actual effort above the prescribed effort on 2+ sessions, or hitting-
 *    related soreness/pain rising → tee / front toss until a green week, then back.
 * It only reshapes existing hitting rows (never adds swings, never removes safety work).
 */

export type SwingEffort = "low" | "medium" | "full";
export type PitchSource = "tee" | "front_toss" | "machine" | "live";
export const EFFORTS: readonly SwingEffort[] = ["low", "medium", "full"];
export const PITCH_SOURCES: readonly PitchSource[] = ["tee", "front_toss", "machine", "live"];
export const PITCH_SOURCE_LABEL: Record<PitchSource, string> = { tee: "Tee", front_toss: "Front toss", machine: "Machine", live: "Live" };
export const EFFORT_LABEL: Record<SwingEffort, string> = { low: "Low", medium: "Medium", full: "Full" };
export const RETURN_GAP_DAYS = 14;
export const YOUTH_LOW_IMPACT_UNDER = 13;

export interface HitterProgram {
  id?: string;
  sport: "baseball" | "softball";
  started_on: string;
  reason: "no_live" | "layoff" | "injury" | "under13";
  environment: "normal" | "low_impact";
  effort: SwingEffort;
  bridge: boolean;
  last_change_on: string;
  /** date → number of hitting drills prescribed that day */
  prescribed: Record<string, number>;
  completed_on: string | null;
}

const DAY = 86_400_000;
const ms = (d: string) => Date.parse(`${d}T12:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => iso(ms(d) + n * DAY);
export const mondayOf = (d: string) => { const t = new Date(ms(d)); return iso(t.getTime() - ((t.getUTCDay() + 6) % 7) * DAY); };

/** Built-in and owner hitting rows → pitch source (explicit owner tag wins; built-ins by their written names). */
export function pitchSourceOf(d: { name: string; pitchSource?: string | null; pitch_source?: string | null }): PitchSource | null {
  const tag = (d.pitchSource ?? d.pitch_source ?? null) as PitchSource | null;
  if (tag && PITCH_SOURCES.includes(tag)) return tag;
  const n = d.name.toLowerCase();
  if (/\blive\b|\bbp\b|batting practice|at-bats|live abs/.test(n)) return /machine/.test(n) && !/\blive\b/.test(n) ? "machine" : "live";
  if (/machine/.test(n)) return "machine";
  if (/front toss|front-toss|soft toss|flips?\b/.test(n)) return "front_toss";
  if (/\btee\b/.test(n)) return "tee";
  return null;
}

export function startHitterReturn(i: {
  today: string; sport: HitterProgram["sport"]; age: number | null; injuryActive: boolean;
  liveRecently: "Yes" | "No" | null; lastTrained: string | null; lastHitDate: string | null; hadHittingBefore: boolean;
  latest: Pick<HitterProgram, "completed_on" | "started_on"> | null;
}): HitterProgram | null {
  if (i.latest && !i.latest.completed_on) return null;
  const gap = i.lastHitDate ? Math.round((ms(i.today) - ms(i.lastHitDate)) / DAY) : null;
  const layoffFromHistory = i.hadHittingBefore && gap != null && gap >= RETURN_GAP_DAYS && !(i.latest && i.latest.started_on > (i.lastHitDate ?? ""));
  const fromAnswer = !i.latest && !i.hadHittingBefore && (i.liveRecently === "No" || (i.lastTrained != null && i.lastTrained !== "Right now"));
  if (!layoffFromHistory && !fromAnswer) return null;
  const lowImpact = i.injuryActive || (i.age != null && i.age < YOUTH_LOW_IMPACT_UNDER);
  const reason: HitterProgram["reason"] = i.injuryActive ? "injury" : i.age != null && i.age < YOUTH_LOW_IMPACT_UNDER ? "under13" : layoffFromHistory || i.lastTrained !== "Right now" ? "layoff" : "no_live";
  return { sport: i.sport, started_on: i.today, reason, environment: lowImpact ? "low_impact" : "normal", effort: "low", bridge: false, last_change_on: i.today, prescribed: {}, completed_on: null };
}

export interface HitDay { date: string; readiness: number | null; pain: boolean; hittingPain: boolean }
export type WeekColor = "green" | "red" | "hold";

/** Owner thresholds: GREEN ≥85% done + 5 GOOD + no LOW + no pain; RED pain / <60% / 3+ LOW. */
export function hittingWeek(weekStart: string, prescribed: Record<string, number>, completedByDate: Record<string, number>, days: readonly HitDay[], readyAt: number | null): WeekColor {
  const end = addDays(weekStart, 6);
  const due = Object.entries(prescribed).filter(([d]) => d >= weekStart && d <= end);
  const total = due.reduce((n, [, c]) => n + c, 0);
  if (!total) return "hold";
  const done = due.reduce((n, [d, c]) => n + Math.min(c, completedByDate[d] ?? 0), 0) / total;
  const wk = days.filter((c) => c.date >= weekStart && c.date <= end);
  const low = wk.filter((c) => c.readiness != null && c.readiness < 0.4).length;
  if (wk.some((c) => c.pain) || done < 0.6 || low >= 3) return "red";
  if (readyAt == null) return "hold";
  const good = wk.filter((c) => !c.pain && c.readiness != null && c.readiness >= readyAt).length;
  return done >= 0.85 && good >= 5 && low === 0 ? "green" : "hold";
}

const rank = (e: SwingEffort) => EFFORTS.indexOf(e);

/** Bridge triggers: actual effort above prescribed on 2+ sessions, or hitting soreness/pain rising week over week. */
export function needsBridge(efforts: ReadonlyArray<{ date: string; prescribed: SwingEffort; actual: SwingEffort }>, days: readonly HitDay[], today: string, since: string): { on: boolean; because: string | null } {
  const sessions = new Set(efforts.filter((e) => e.date >= since && rank(e.actual) > rank(e.prescribed)).map((e) => e.date));
  if (sessions.size >= 2) return { on: true, because: "Because: you swung harder than your plan on 2+ days, so you hit off a tee or front toss for now. You go back after a green week." };
  const lastWeek = days.filter((d) => d.date >= addDays(today, -7) && d.date < today && d.hittingPain).length;
  const before = days.filter((d) => d.date >= addDays(today, -14) && d.date < addDays(today, -7) && d.hittingPain).length;
  if (lastWeek > before && lastWeek >= 2) return { on: true, because: "Because: soreness in your hitting areas is going up, so you hit off a tee or front toss for now. You go back after a green week." };
  return { on: false, because: null };
}

/** One step per finished full week since the last change. Full effort + a green week = back to normal. */
export function advanceHitter(p: HitterProgram, today: string, color: (weekStart: string) => WeekColor, bridgeOn: boolean): HitterProgram {
  if (p.completed_on) return p;
  let next: HitterProgram = bridgeOn && !p.bridge ? { ...p, bridge: true, last_change_on: today } : p;
  const thisWeek = mondayOf(today);
  const firstFull = mondayOf(next.last_change_on) === next.last_change_on ? next.last_change_on : addDays(mondayOf(next.last_change_on), 7);
  if (firstFull >= thisWeek) return next;
  const c = color(addDays(thisWeek, -7));
  if (c === "green") {
    if (next.bridge || next.environment === "low_impact") return { ...next, bridge: false, environment: "normal", last_change_on: today };
    if (next.effort === "full") return { ...next, completed_on: today, last_change_on: today };
    return { ...next, effort: EFFORTS[rank(next.effort) + 1], last_change_on: today };
  }
  if (c === "red" && rank(next.effort) > 0) return { ...next, effort: EFFORTS[rank(next.effort) - 1], last_change_on: today };
  return next;
}

export function hitterBecause(p: HitterProgram): string {
  if (p.bridge) return "Because: you're on a tee / front-toss bridge until a green week, then back to your normal hitting.";
  if (p.environment === "low_impact") return p.reason === "injury"
    ? "Because: you're coming back from an injury, so you start off a tee or front toss and work back to your normal hitting."
    : "Because: players under 13 start back off a tee or front toss, then move to normal hitting after a green week.";
  return `Because: you're getting back into hitting, so swing at ${EFFORT_LABEL[p.effort].toLowerCase()} effort today. Effort goes up one step after each green week.`;
}

type Row = { name: string; dosage?: string; setup?: string; cue?: string; pitchSource?: string | null; [k: string]: unknown };
/**
 * Reshape hitting rows: every swing row carries the prescribed effort; machine/live rows become
 * tee (or front toss when no tee is owned) only for the low-impact start or the bridge. Dose never changes.
 */
export function applyHitterReturn<R extends Row>(rows: R[], p: HitterProgram | null, owned: ReadonlySet<string>): { rows: R[]; because: string[] } {
  if (!p || p.completed_on) return { rows, because: [] };
  const lowImpact = p.bridge || p.environment === "low_impact";
  const swap: PitchSource = owned.has("tee") ? "tee" : "front_toss";
  const out = rows.map((r) => {
    const src = pitchSourceOf(r);
    const swingRow = src != null || /swing|hit|bat/i.test(r.name);
    if (!swingRow) return r;
    if (lowImpact && (src === "machine" || src === "live")) {
      return { ...r, name: swap === "tee" ? "Tee work (bridge)" : "Front toss (bridge)", pitchSource: swap, swingEffort: p.effort, returnedFrom: r.name,
        setup: swap === "tee" ? "Tee at the height of the pitch location you're working on." : "Partner tosses underhand from behind a screen, 15–20 ft away.",
        dosage: `${r.dosage ?? ""}${r.dosage ? " · " : ""}${EFFORT_LABEL[p.effort]} effort` } as R;
    }
    return { ...r, swingEffort: p.effort, dosage: `${r.dosage ?? ""}${r.dosage ? " · " : ""}${EFFORT_LABEL[p.effort]} effort` } as R;
  });
  return { rows: out, because: [hitterBecause(p)] };
}

/** Body-map words that count as hitting-related soreness. */
export const HITTING_AREAS = /hand|wrist|forearm|elbow|oblique|rib|side|back|core|hip|shoulder/i;
