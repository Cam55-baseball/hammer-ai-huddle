/**
 * Owner Nov 5 round 4 — GAME-DAY LOGGING CARD (pure rules: placement, sections by program,
 * summary line, save payloads). The card saves through the existing game-log rows
 * (gp_games / gp_at_bats / gp_defense_plays / gp_baserun_events), so conditioning credit,
 * identity windows and the coach view all read the same facts.
 */
import { programQuestionScope, type TrainingProgram } from "../../../supabase/functions/_shared/programAccess";
import { rbiForAtBat, asksRunners, parseRunners, formatRunners, type Base } from "./rbi";

export type GameSectionId = "hitting" | "fielding" | "baserunning" | "pitching" | "review";

/**
 * Sections in order for the program (via the one shared program judge's scope).
 * 5Tool → hitting, fielding, baserunning. Complete Pitcher → pitching only.
 * Golden 2Way → hitting, fielding, baserunning, and pitching only if they pitched.
 */
export function gameSections(program: TrainingProgram | null, pitched: boolean): GameSectionId[] {
  const scope = programQuestionScope(program);
  const out: GameSectionId[] = [];
  if (scope.hitting) out.push("hitting", "fielding", "baserunning");
  if (scope.pitching && (program === "pitcher" || pitched)) out.push("pitching");
  out.push("review");
  return out;
}
/** Golden 2Way is asked "Did you pitch?" first; pitchers always log pitching. */
export const asksDidYouPitch = (program: TrainingProgram | null) => program === "golden2way";

export interface DayItem { id: string; kind: "warmup" | "work" | "recovery" | "game"; time?: string | null }
/**
 * Chronological placement: by the scheduled time when known (among items that carry a time);
 * otherwise after the last pre-game warm-up item and before the first recovery/flush item.
 */
export function placeGameCard<T extends DayItem>(items: readonly T[], game: T): T[] {
  const t = toMinutes(game.time);
  const timed = items.map((x, i) => ({ i, m: toMinutes(x.time) })).filter((x) => x.m != null);
  if (t != null && timed.length) {
    const after = timed.find((x) => (x.m as number) > t);
    const at = after ? after.i : timed[timed.length - 1].i + 1;
    return [...items.slice(0, at), game, ...items.slice(at)];
  }
  const lastWarm = items.map((x) => x.kind).lastIndexOf("warmup");
  const firstRec = items.findIndex((x, i) => i > lastWarm && x.kind === "recovery");
  const at = firstRec >= 0 ? firstRec : items.length;
  return [...items.slice(0, Math.max(at, lastWarm + 1)), game, ...items.slice(Math.max(at, lastWarm + 1))];
}
export function toMinutes(time: string | null | undefined): number | null {
  const m = String(time ?? "").trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (!m) return null;
  let h = Number(m[1]); const min = Number(m[2]);
  if (m[3]) { const pm = m[3].toLowerCase() === "pm"; if (h === 12) h = pm ? 12 : 0; else if (pm) h += 12; }
  return h < 24 && min < 60 ? h * 60 + min : null;
}
export function timeLabel(time: string | null | undefined): string | null {
  const m = toMinutes(time);
  if (m == null) return null;
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, "0");
  return `${h % 12 === 0 ? 12 : h % 12}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

export type GamePhase = "before" | "log" | "logged";
/** Before the game → plan around it; after the start time (or once the day's game is past) → "Log your game"; logged → summary. */
export function gamePhase(o: { status: string | null; time: string | null; nowMinutes: number }): GamePhase {
  if (o.status === "final") return "logged";
  const t = toMinutes(o.time);
  if (t == null) return "log"; // unknown time: always loggable
  return o.nowMinutes >= t ? "log" : "before";
}

export interface AtBatEntry { result: string; inning: number; runners?: Base[]; scored?: number | null; /** Saved RBI (from the log), kept until this at-bat is changed. */ rbi?: number | null }
export interface GameLine {
  atBats: AtBatEntry[];
  position: string | null; chances: number; errors: number;
  steals: number; caught: number; runs: number;
  pitching: null | {
    pitches: number | null; battersFaced: number | null; innings: number | null; outs: number | null;
    strikeouts: number | null; walks: number | null; firstPitchStrikes: number | null; twoBallCounts: number | null;
    soft: number | null; medium: number | null; hard: number | null; runnersOn: number | null; stealsAllowed: number | null; stealAttempts: number | null;
  };
}
export const emptyLine = (): GameLine => ({ atBats: [], position: null, chances: 0, errors: 0, steals: 0, caught: 0, runs: 0, pitching: null });

const HITS = new Set(["1B", "2B", "3B", "HR"]);
const NOT_AB = new Set(["BB", "IBB", "HBP", "SAC", "SF"]);
export const atBatRbi = (ab: AtBatEntry) => ab.rbi != null ? ab.rbi : (rbiForAtBat(ab.result, ab.runners ?? [], ab.scored ?? 0) ?? 0);

/** Clean summary line, e.g. "2-for-4 · 1 HR · 3 RBI · 1 SB" (pitching: "5.1 IP · 78 pitches · 6 K · 1 BB"). */
export function summaryLine(line: GameLine, sections: readonly GameSectionId[]): string {
  const parts: string[] = [];
  if (sections.includes("hitting") && line.atBats.length) {
    const ab = line.atBats.filter((a) => !NOT_AB.has(a.result)).length;
    const h = line.atBats.filter((a) => HITS.has(a.result)).length;
    parts.push(`${h}-for-${ab}`);
    const hr = line.atBats.filter((a) => a.result === "HR").length; if (hr) parts.push(`${hr} HR`);
    const rbi = line.atBats.reduce((n, a) => n + atBatRbi(a), 0); if (rbi) parts.push(`${rbi} RBI`);
    const bb = line.atBats.filter((a) => a.result === "BB" || a.result === "IBB").length; if (bb) parts.push(`${bb} BB`);
  }
  if (sections.includes("baserunning")) { if (line.steals) parts.push(`${line.steals} SB`); if (line.runs) parts.push(`${line.runs} R`); }
  if (sections.includes("fielding") && line.errors) parts.push(`${line.errors} E`);
  const p = line.pitching;
  if (sections.includes("pitching") && p) {
    if (p.innings != null) parts.push(`${p.innings}${p.outs ? `.${p.outs}` : ""} IP`);
    if (p.pitches != null) parts.push(`${p.pitches} pitches`);
    if (p.strikeouts) parts.push(`${p.strikeouts} K`);
    if (p.walks) parts.push(`${p.walks} BB`);
  }
  return parts.length ? parts.join(" · ") : "Nothing entered yet";
}

/** Rows for the existing ledgers. Every row is the player's own, player_entered. */
export function ledgerRows(line: GameLine, sections: readonly GameSectionId[], ids: { userId: string; gameId: string }) {
  const own = { user_id: ids.userId, game_id: ids.gameId, entry_source: "player_entered" };
  const atBats = sections.includes("hitting") ? line.atBats.map((a, i) => ({
    ...own, inning: a.inning, ab_order: i + 1, result: a.result,
    runners_on: asksRunners(a.result) && a.runners ? formatRunners(a.runners) : null,
    rbi: atBatRbi(a), position_played: line.position,
  })) : [];
  const defense = sections.includes("fielding") && line.position ? Array.from({ length: Math.max(0, line.chances) }, (_, i) => ({
    ...own, position: line.position, error_flag: i < line.errors,
  })) : [];
  const baserun = sections.includes("baserunning") ? [
    ...Array.from({ length: line.steals }, () => ({ ...own, event_type: "steal", success: true })),
    ...Array.from({ length: line.caught }, () => ({ ...own, event_type: "steal", success: false })),
  ] : [];
  const p = line.pitching;
  const game: Record<string, unknown> = { status: "final", entry_source: "player_entered" };
  if (sections.includes("pitching") && p) Object.assign(game, {
    pitch_count: p.pitches, batters_faced: p.battersFaced, pitcher_innings: p.innings,
    pitcher_outs: p.innings != null ? p.innings * 3 + (p.outs ?? 0) : null,
    pitcher_strikeouts: p.strikeouts, pitcher_walks: p.walks, pitcher_first_pitch_strikes: p.firstPitchStrikes,
    pitcher_two_ball_batters: p.twoBallCounts, pitcher_soft_contact: p.soft, pitcher_medium_contact: p.medium, pitcher_hard_contact: p.hard,
    pitcher_runners_on: p.runnersOn, pitcher_sb_allowed: p.stealsAllowed, pitcher_steal_attempts: p.stealAttempts,
  });
  if (sections.includes("fielding") && line.position) game.my_positions = [line.position];
  return { atBats, defense, baserun, game, runs: sections.includes("baserunning") ? line.runs : null };
}

/** Rebuild the line from saved rows (for the summary and Edit). */
export function lineFromRows(r: { atBats: any[]; defense: any[]; baserun: any[]; game: any }): GameLine {
  const g = r.game ?? {};
  const pitched = [g.pitch_count, g.batters_faced, g.pitcher_outs, g.pitcher_strikeouts].some((v) => v != null);
  return {
    atBats: [...r.atBats].sort((a, b) => (a.ab_order ?? 0) - (b.ab_order ?? 0)).map((a) => ({
      result: String(a.result ?? ""), inning: Number(a.inning ?? 1),
      runners: parseRunners(a.runners_on), scored: null, rbi: a.rbi ?? null,
    })),
    position: r.defense[0]?.position ?? (Array.isArray(g.my_positions) ? g.my_positions[0] ?? null : null),
    chances: r.defense.length, errors: r.defense.filter((d) => d.error_flag).length,
    steals: r.baserun.filter((b) => b.event_type === "steal" && b.success === true).length,
    caught: r.baserun.filter((b) => b.event_type === "steal" && b.success === false).length,
    runs: Number(g.game_summary?.game_card?.runs ?? 0) || 0,
    pitching: pitched ? {
      pitches: g.pitch_count ?? null, battersFaced: g.batters_faced ?? null,
      innings: g.pitcher_outs != null ? Math.floor(g.pitcher_outs / 3) : g.pitcher_innings ?? null, outs: g.pitcher_outs != null ? g.pitcher_outs % 3 : null,
      strikeouts: g.pitcher_strikeouts ?? null, walks: g.pitcher_walks ?? null, firstPitchStrikes: g.pitcher_first_pitch_strikes ?? null,
      twoBallCounts: g.pitcher_two_ball_batters ?? null, soft: g.pitcher_soft_contact ?? null, medium: g.pitcher_medium_contact ?? null, hard: g.pitcher_hard_contact ?? null,
      runnersOn: g.pitcher_runners_on ?? null, stealsAllowed: g.pitcher_sb_allowed ?? null, stealAttempts: g.pitcher_steal_attempts ?? null,
    } : null,
  };
}

export const sportWords = (sport: "baseball" | "softball") => ({
  pitchPlace: sport === "softball" ? "in the circle" : "on the mound",
  game: sport === "softball" ? "softball game" : "baseball game",
});
