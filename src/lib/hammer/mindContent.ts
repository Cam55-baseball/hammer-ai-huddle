/**
 * Owner-editable Game situations (Mind) and Today's coach advice.
 * Built-in items stay in code; an owner row with `builtin_key` edits that item,
 * other owner rows add new ones. Empty tag lists match every player.
 * Advice keeps its categories and the pick-by-season rule (day % list length).
 */
import { SEASONAL_TIPS, type SeasonalTip } from "@/lib/hpi/seasonalTips";
import type { SeasonPhase } from "@/lib/seasonPhase";

export type MindContentKind = "situation" | "advice";

export interface MindContentRow {
  id?: string;
  kind: MindContentKind;
  builtin_key: string | null;
  title: string;
  body: string;
  category: string | null;
  season_phases: string[];
  situation_type: string | null;
  sports: string[];
  positions: string[];
  levels: string[];
  programs: string[];
  active: boolean;
  created_at?: string;
}

export interface PlayerTags {
  sport: string;
  position?: string | null;
  level?: string | null;
  modules?: readonly string[] | null;
}

export const SEASON_PHASES: SeasonPhase[] = ["preseason", "in_season", "post_season", "off_season"];
export const ADVICE_CATEGORIES: SeasonalTip["category"][] = ["sleep", "hydration", "nutrition", "breath", "movement", "mind"];
export const SITUATION_TYPES = ["baserunning", "defense", "hitting", "pitching", "catching", "general"];
export const POSITION_OPTIONS = ["P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "IF", "OF", "UT"];
export const LEVEL_OPTIONS = ["youth", "middle school", "high school", "college", "professional", "adult"];
export const PROGRAM_OPTIONS = ["5tool", "golden2way", "pitcher", "hitting", "throwing"];

export const BUILTIN_SITUATION: MindContentRow = {
  kind: "situation", builtin_key: "situations:default",
  title: "Game situations",
  body: "Pick 3 game spots (runner on 2nd, 1 out). Say out loud what you'd do before the pitch.",
  category: null, season_phases: [], situation_type: "general",
  sports: [], positions: [], levels: [], programs: [], active: true,
};

export function builtinAdvice(): MindContentRow[] {
  return SEASON_PHASES.flatMap((phase) => SEASONAL_TIPS[phase].map((t, i) => ({
    kind: "advice" as const, builtin_key: `${phase}:${i}`, title: t.title, body: t.body, category: t.category,
    season_phases: [phase], situation_type: null, sports: [], positions: [], levels: [], programs: [], active: true,
  })));
}

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
const POSITION_ALIASES: Record<string, string> = {
  pitcher: "p", catcher: "c", firstbase: "1b", secondbase: "2b", thirdbase: "3b", shortstop: "ss",
  leftfield: "lf", centerfield: "cf", rightfield: "rf", infield: "if", outfield: "of", utility: "ut",
  leftfielder: "lf", centerfielder: "cf", rightfielder: "rf", infielder: "if", outfielder: "of",
};
const OUTFIELD = new Set(["lf", "cf", "rf"]);
const INFIELD = new Set(["1b", "2b", "3b", "ss"]);
function positionKey(p: string) { const k = key(p); return POSITION_ALIASES[k] ?? k; }

/** Every declared tag must fit the player; an empty tag list fits everyone. */
export function matchesPlayer(row: Pick<MindContentRow, "sports" | "positions" | "levels" | "programs">, p: PlayerTags): boolean {
  if (row.sports.length && !row.sports.includes(p.sport)) return false;
  if (row.positions.length) {
    const pos = p.position ? positionKey(p.position) : null;
    if (!pos) return false;
    const ok = row.positions.map(positionKey).some((t) => t === pos || (t === "of" && OUTFIELD.has(pos)) || (t === "if" && INFIELD.has(pos)));
    if (!ok) return false;
  }
  if (row.levels.length && !(p.level && row.levels.map(key).includes(key(p.level)))) return false;
  if (row.programs.length) {
    const mods = (p.modules ?? []).map(key);
    if (!row.programs.map(key).some((prog) => mods.some((m) => m === prog || m.endsWith(prog)))) return false;
  }
  return true;
}

/** Built-ins with owner edits applied (same order), then owner-added items (oldest first). */
export function mergeContent(builtins: MindContentRow[], owner: MindContentRow[]): MindContentRow[] {
  const edits = new Map(owner.filter((r) => r.builtin_key).map((r) => [r.builtin_key as string, r]));
  const added = owner.filter((r) => !r.builtin_key).sort((a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? ""));
  return [...builtins.map((b) => edits.get(b.builtin_key as string) ?? b), ...added];
}

const dayNumber = (d: Date) => Math.floor(d.getTime() / 86_400_000);

/** Today's coach advice: same season list and day rotation as before, narrowed by any tags. */
export function pickAdvice(owner: MindContentRow[], phase: SeasonPhase, player: PlayerTags, day = new Date()): MindContentRow {
  const all = mergeContent(builtinAdvice(), owner.filter((r) => r.kind === "advice"));
  const list = all.filter((r) => r.active && r.season_phases.includes(phase) && matchesPlayer(r, player));
  const fallback = builtinAdvice().filter((r) => r.season_phases.includes(phase));
  const use = list.length ? list : fallback;
  return use[dayNumber(day) % use.length];
}

/** Game situations item for a situations day, rotated by day among matching items. */
export function pickSituation(owner: MindContentRow[], player: PlayerTags, day = new Date()): MindContentRow {
  const all = mergeContent([BUILTIN_SITUATION], owner.filter((r) => r.kind === "situation"));
  const list = all.filter((r) => r.active && matchesPlayer(r, player));
  return list.length ? list[dayNumber(day) % list.length] : BUILTIN_SITUATION;
}
