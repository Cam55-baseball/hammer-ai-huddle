import { isMovementSeasonLegal, seasonContextFromPhase } from "../wic/season.ts";
import { declaredRouteBases } from "../wic/runRest.ts";

type Row = Record<string, any>;
export interface SwapPlayer { phase: string; sport: "baseball" | "softball" | null; ageYears: number | null; injuries: string[]; availableGear: string[] }
export interface SwapChoice { slug: string; name: string; reason: string }

/** Today answers stay dated; only Always answers affect later plan builds. */
export function swapMemoryAnswer(userId: string, requestId: string, planDate: string, scope: "today" | "always", missing: string[]) {
  return { user_id: userId, request_id: requestId, scope, plan_date: planDate,
    confirmed_have: [] as string[], confirmed_lacks: [...new Set(missing)] };
}

const key = (v: string) => v.trim().toLowerCase().replace(/[\s-]+/g, "_");
const IGNORED = new Set(["none", "bodyweight", ""]);
const ALIASES: Record<string, string> = { bat: "gamer_bat", cable: "cable_stack", band: "bands", dumbbells: "dumbbell", db: "dumbbell", kb: "kettlebell", medicine_ball: "med_ball", plate: "plates", rack: "squat_rack", pins: "safety_pins", smith: "smith_machine", light_bat: "underload_bat", pullup_bar: "pull_up_bar" };
const gearKey = (value: string) => ALIASES[key(value)] ?? key(value);

/** Complete alternative groups are OR; items inside a group are AND. Malformed groups fail closed. */
function equipmentGroups(row: Row): string[][] | null {
  const value = row.equipment_alternatives;
  if (value == null) return [];
  if (!Array.isArray(value)) return null;
  if (value.some(group => !Array.isArray(group) || !group.length || group.some(g => typeof g !== "string" || !g.trim()))) return null;
  return value.map(group => group.map(gearKey));
}

function mandatoryGear(row: Row): string[] | null {
  const arrays = [row.equipment_requirements ?? [], row.equipment ?? []];
  if (arrays.some(value => !Array.isArray(value) || value.some(g => typeof g !== "string" || !g.trim()))) return null;
  return [...new Set(arrays.flat().map(gearKey))].filter(g => !IGNORED.has(g));
}

/** True when every item a movement needs is in the player's saved gear (or needs no gear). */
export function ownsAllGear(row: Row, owned: Iterable<string>, universal: Iterable<string> = []): boolean {
  const have = new Set([...owned, ...universal].map(gearKey));
  const groups = equipmentGroups(row);
  const mandatory = mandatoryGear(row);
  return groups !== null && mandatory !== null && mandatory.every(g => have.has(g)) &&
    (groups.length === 0 || groups.some(group => group.every(g => IGNORED.has(g) || have.has(g))));
}

export function rememberedMissingGear(answers: Array<{ confirmed_have: string[]; confirmed_lacks: string[] }>): Set<string> {
  const missing = new Set<string>();
  for (const answer of answers) {
    for (const item of answer.confirmed_lacks) missing.add(gearKey(item));
    for (const item of answer.confirmed_have) missing.delete(gearKey(item));
  }
  return missing;
}

/** A remembered unavailable item never becomes legal merely because its family has no fallback. */
export function avoidsMissingGear(row: Row, missing: Iterable<string>): boolean {
  const lacks = new Set([...missing].map(gearKey));
  const groups = equipmentGroups(row);
  const mandatory = mandatoryGear(row);
  return groups !== null && mandatory !== null && mandatory.every(g => !lacks.has(g)) &&
    (groups.length === 0 || groups.some(group => group.every(g => !lacks.has(g))));
}

/** Gear a card needs, shown as checkboxes. */
export function requiredGear(row: Row): string[] {
  return [...new Set([...(mandatoryGear(row) ?? []), ...(equipmentGroups(row)?.flat() ?? [])])].filter(g => !IGNORED.has(g));
}

/** Collect injury words from any saved shape (strings, arrays, objects). */
export function injuryWords(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [key(value)] : [];
  if (Array.isArray(value)) return value.flatMap(injuryWords);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => v === true ? [key(k)] : injuryWords(v));
  }
  return [];
}

/** Same category, family, intent and unit; gear available; legal for age/season/injury. */
export function qualifies(source: Row, target: Row, missing: string[], player: SwapPlayer): boolean {
  if (!target || target.slug === source.slug || target.is_active !== true || target.superseded_by != null) return false;
  if (!player.sport || (target.sport_scope !== "both" && target.sport_scope !== player.sport)) return false;
  for (const f of ["movement_category", "substitution_family", "dosage_unit"]) {
    if (!target[f] || target[f] !== source[f]) return false;
  }
  if ((target.primary_adaptation ?? null) !== (source.primary_adaptation ?? null)) return false;
  if (!avoidsMissingGear(target, missing)) return false;
  const lacks = new Set(missing.map(gearKey));
  if (!ownsAllGear(target, player.availableGear.filter(g => !lacks.has(gearKey(g))))) return false;
  if (typeof target.min_age_years === "number") {
    if (player.ageYears == null || player.ageYears < target.min_age_years) return false;
  }
  const contra = (target.contraindications ?? []).map((c: string) => key(c));
  if (contra.some((c: string) => player.injuries.some(i => i.includes(c) || c.includes(i)))) return false;
  const legality = target.season_legality;
  if (legality && typeof legality === "object" && legality[player.phase] === false) return false;
  if (!isMovementSeasonLegal(seasonContextFromPhase(player.phase as any), target as any).legal) return false;
  return true;
}

function doseText(rx: Row): string {
  const u = rx.dosage_unit;
  if (u === "feet" && rx.distance_feet) return `${rx.sets ?? 1}×${rx.distance_feet} ft`;
  if (u === "seconds" && rx.duration_seconds) return `${rx.sets ?? 1}×${rx.duration_seconds} sec`;
  if (rx.total_reps) return `${rx.total_reps} reps`;
  if (rx.sets && rx.reps) return `${rx.sets}×${rx.reps} reps`;
  return "same amount";
}

export function swapChoices(source: Row, family: Row[], rx: Row, missing: string[], player: SwapPlayer): SwapChoice[] {
  // Name only the missing gear this exercise actually uses; other remembered gaps stay off its reason.
  const used = new Set([...((source.equipment_requirements ?? []) as string[]), ...(((source.equipment_alternatives ?? []) as string[][]).flat())].map(g => String(g).toLowerCase()));
  const named = missing.filter(m => used.has(m.toLowerCase()));
  const lacking = (named.length ? named : missing).map(m => m.replace(/_/g, " ")).join(" or ");
  return family.filter(t => {
    if (!qualifies(source, t, missing, player)) return false;
    // A route carries work and rest identity as well as a distance; keep both.
    if (source.base_route != null || t.base_route != null) {
      if (!player.sport) return false;
      const fromBases = declaredRouteBases(source.base_route, player.sport, rx.distance_feet);
      const toBases = declaredRouteBases(t.base_route, player.sport, rx.distance_feet);
      if (fromBases == null || fromBases !== toBases) return false;
    }
    return true;
  }).slice(0, 3).map(t => ({
    slug: t.slug, name: t.name,
    reason: `${t.name}: same ${doseText(rx)}${lacking ? `, no ${lacking} needed` : ""}`,
  }));
}
