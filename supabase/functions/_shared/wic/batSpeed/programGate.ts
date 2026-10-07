// Round 8 owner rule (6b): bat speed by program.
// - Any hitting program (hitting, 5Tool, Golden 2Way) → hitter bat speed, unchanged.
// - Complete Pitcher (pitching modules, no hitting) → "Velocity training":
//   off-season ≤2/week, pre-season ≤1/week, in-season ≤1/week light bats only;
//   never on a start day or the day before/after a start.
// - Anything else → unchanged (gate does nothing).
// Pure: never authors a dose; it only allows, blocks, or limits to light bats.

export type BatSpeedProgram = "hitter" | "velocity" | "unchanged";

const HITTING = new Set(["hitting", "baseball_hitting", "softball_hitting", "baseball_5tool", "baseball_golden2way"]);
const PITCHING = new Set(["pitching", "baseball_pitching", "softball_pitching"]);

export const LIGHT_BAT_CATEGORIES = new Set(["underload", "light_implement"]);

export function batSpeedProgramOf(modules: readonly string[]): BatSpeedProgram {
  if (modules.some((m) => HITTING.has(m))) return "hitter";
  if (modules.some((m) => PITCHING.has(m))) return "velocity";
  return "unchanged";
}

export interface ProgramGateInput {
  modules: readonly string[];
  season: string | null | undefined; // off_season | preseason | in_season | post_season …
  isStartDay: boolean;
  startedYesterday: boolean;
  startsTomorrow: boolean;
  batSpeedDaysThisWeek: number; // planned bat-speed days Mon..yesterday
}

export interface ProgramGateResult {
  program: BatSpeedProgram;
  allow: boolean;
  lightOnly: boolean;
  reason: string | null;
}

export function weeklyVelocityCap(season: string | null | undefined): number {
  const s = String(season ?? "").toLowerCase();
  if (s.startsWith("off")) return 2;
  return 1; // pre-season, in-season, post-season, unknown → the stricter cap
}

export function batSpeedProgramGate(i: ProgramGateInput): ProgramGateResult {
  const program = batSpeedProgramOf(i.modules);
  if (program !== "velocity") return { program, allow: true, lightOnly: false, reason: null };
  if (i.isStartDay || i.startedYesterday || i.startsTomorrow) {
    return { program, allow: false, lightOnly: false, reason: "No velocity bat work on a start day or the day before or after." };
  }
  const cap = weeklyVelocityCap(i.season);
  if (i.batSpeedDaysThisWeek >= cap) {
    return { program, allow: false, lightOnly: false, reason: `Velocity bat work is ${cap}x a week this season — already done.` };
  }
  const s = String(i.season ?? "").toLowerCase();
  return { program, allow: true, lightOnly: s.startsWith("in"), reason: null };
}
