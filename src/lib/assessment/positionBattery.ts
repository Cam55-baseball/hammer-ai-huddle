/**
 * Owner Nov 6 — ONE position-specific test battery shared by the Initial
 * Assessment's athletic test and every 6-week re-test (same card, same rules),
 * so results compare test to test. Filters the existing registry only; never
 * invents a test. Position comes from the saved primary position at render
 * time, so a position change moves the next assessment/re-test with it.
 */
import { METRIC_CATEGORIES, getMetricsForContext, type MetricDefinition } from "@/data/performanceTestRegistry";
import { normalizePositionCode } from "@/lib/drills/positionLabels";
import type { TrainingProgram } from "../../../supabase/functions/_shared/programAccess";

export type BatterySport = "baseball" | "softball";
export type BatteryModule = "hitting" | "pitching" | "throwing";
export type BatteryGroup = "catcher" | "infield" | "outfield" | "pitcher" | "dh" | "utility" | "unknown";

/** Program from the program-filtered test tabs (the shared program judge already ran). */
export function batteryProgram(modules: readonly string[]): TrainingProgram | null {
  const hit = modules.includes("hitting");
  const pitch = modules.includes("pitching");
  if (hit && pitch) return "golden2way";
  if (pitch) return "pitcher";
  return hit || modules.includes("throwing") ? "5tool" : null;
}

export function batteryGroup(position: string | null | undefined, program: TrainingProgram | null): BatteryGroup {
  if (program === "pitcher") return "pitcher";
  const raw = String(position ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (raw === "dh" || raw === "designated_hitter") return "dh";
  const code = normalizePositionCode(position);
  switch (code) {
    case "C": return "catcher";
    case "1B": case "2B": case "SS": case "3B": case "IF": case "MI": case "CI": return "infield";
    case "LF": case "CF": case "RF": case "OF": return "outfield";
    case "UTIL": return "utility";
    // Golden 2Way pitchers keep the position-player battery (owner default) plus the pitching tab.
    case "P": case "PFP": return program === "golden2way" ? "unknown" : "pitcher";
    default: return "unknown";
  }
}

/** Position-only tests: who may see each one. Anything not listed is general. */
const POSITION_ONLY: Record<string, readonly BatteryGroup[]> = {
  pop_time: ["catcher"],
  fielding_exchange_time: ["infield", "catcher", "utility"],
  position_throw_velo: ["catcher", "infield", "outfield", "utility", "unknown"],
};

function sportWording(m: MetricDefinition, sport: BatterySport): MetricDefinition {
  if (sport !== "softball") return m;
  if (m.key === "pitching_velocity") return { ...m, instructions: "Fastball speed from the circle. Use a radar gun, average of 3 pitches." };
  if (m.key === "pulldown_velocity") return { ...m, instructions: m.instructions.replace(/mound/gi, "circle") };
  return m;
}

export interface BatteryInput {
  sport: BatterySport;
  module: BatteryModule;
  modules: readonly string[];
  position: string | null | undefined;
  densityLevel: number;
}

/** The exact ordered tests for one tab of the battery. */
export function positionBattery(i: BatteryInput): MetricDefinition[] {
  const program = batteryProgram(i.modules);
  if (!i.modules.includes(i.module)) return [];
  const group = batteryGroup(i.position, program);
  const seen = new Set<string>();
  const out: MetricDefinition[] = [];
  for (const m of [...getMetricsForContext(i.sport, i.module, i.densityLevel), ...getMetricsForContext(i.sport, "general", i.densityLevel)]) {
    if (seen.has(m.key)) continue;
    seen.add(m.key);
    if ((m.key === "pitching_velocity" || m.key === "pulldown_velocity") && i.module !== "pitching") continue;
    const only = POSITION_ONLY[m.key];
    if (only && !only.includes(group)) continue;
    out.push(sportWording(m, i.sport));
  }
  const order = (c: string) => (METRIC_CATEGORIES as readonly string[]).indexOf(c);
  return out.map((m, idx) => ({ m, idx })).sort((a, b) => order(a.m.category) - order(b.m.category) || a.idx - b.idx).map(x => x.m);
}
