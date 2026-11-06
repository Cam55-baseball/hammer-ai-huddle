/**
 * Owner Nov 6 — ONE program-split test battery shared by the Initial
 * Assessment's athletic test and every 6-week re-test. Filters the existing
 * registry only; never invents a test. No per-position filtering.
 */
import { getMetricsForContext, type MetricDefinition } from "@/data/performanceTestRegistry";
import type { TrainingProgram } from "../../../supabase/functions/_shared/programAccess";

export type BatterySport = "baseball" | "softball";
export type BatteryModule = "hitting" | "pitching" | "throwing";
/** Program from the program-filtered test tabs (the shared program judge already ran). */
export function batteryProgram(modules: readonly string[]): TrainingProgram | null {
  const hit = modules.includes("hitting");
  const pitch = modules.includes("pitching");
  if (hit && pitch) return "golden2way";
  if (pitch) return "pitcher";
  return hit || modules.includes("throwing") ? "5tool" : null;
}

/**
 * Locked by owner Nov 6: no per-position filtering. Only the program split:
 * pitchers never get hitting or position-player tests; position players never
 * get pitching tests; Golden 2Way gets both.
 */
const POSITION_PLAYER_ONLY = new Set(["pop_time", "fielding_exchange_time", "position_throw_velo"]);
const PITCHING_ONLY = new Set(["pitching_velocity", "pulldown_velocity"]);

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
  densityLevel: number;
}

/** The exact ordered tests for one tab of the battery. */
export function positionBattery(i: BatteryInput): MetricDefinition[] {
  const program = batteryProgram(i.modules);
  if (!i.modules.includes(i.module)) return [];
  const seen = new Set<string>();
  const out: MetricDefinition[] = [];
  for (const m of [...getMetricsForContext(i.sport, i.module, i.densityLevel), ...getMetricsForContext(i.sport, "general", i.densityLevel)]) {
    if (seen.has(m.key)) continue;
    seen.add(m.key);
    if (PITCHING_ONLY.has(m.key) && (i.module !== "pitching" || program === "5tool")) continue;
    if (program === "pitcher" && (POSITION_PLAYER_ONLY.has(m.key) || m.category === "exit_velocity")) continue;
    out.push(sportWording(m, i.sport));
  }
  return sortPreferred(out);
}

/** The existing preferred testing order (categories), unchanged. */
export const PREFERRED_CATEGORY_ORDER = ['mobility','body_control','quickness','power_lower','power_upper','speed','exit_velocity','throwing_velocity','fielding','energy_system'] as const;
function sortPreferred(list: MetricDefinition[]): MetricDefinition[] {
  const order = (c: string) => (PREFERRED_CATEGORY_ORDER as readonly string[]).indexOf(c);
  return list.map((m, idx) => ({ m, idx })).sort((a, b) => order(a.m.category) - order(b.m.category) || a.idx - b.idx).map(x => x.m);
}

/** Every test across the player's tabs, deduplicated, in the preferred order. */
export function fullPositionBattery(i: Omit<BatteryInput, "module">): MetricDefinition[] {
  const seen = new Map<string, MetricDefinition>();
  for (const module of ["hitting", "pitching", "throwing"] as const) for (const m of positionBattery({ ...i, module })) if (!seen.has(m.key)) seen.set(m.key, m);
  return sortPreferred([...seen.values()]);
}
