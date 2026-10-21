import { isMovementSeasonLegal, seasonContextFromPhase } from "../wic/season.ts";

type Row = Record<string, any>;
export interface SwapPlayer { phase: string; ageYears: number | null; injuries: string[] }
export interface SwapChoice { slug: string; name: string; reason: string }

const key = (v: string) => v.trim().toLowerCase().replace(/[\s-]+/g, "_");
const IGNORED = new Set(["none", "bodyweight", ""]);

/** Gear a card needs, shown as checkboxes. */
export function requiredGear(row: Row): string[] {
  return [...new Set([...(row.equipment_requirements ?? []), ...(row.equipment ?? [])]
    .filter((g: unknown): g is string => typeof g === "string").map(key))].filter(g => !IGNORED.has(g));
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
  for (const f of ["movement_category", "substitution_family", "dosage_unit"]) {
    if (!target[f] || target[f] !== source[f]) return false;
  }
  if ((target.primary_adaptation ?? null) !== (source.primary_adaptation ?? null)) return false;
  const missingKeys = new Set(missing.map(key));
  if (requiredGear(target).some(g => missingKeys.has(g))) return false;
  if (typeof target.min_age_years === "number") {
    if (player.ageYears == null || player.ageYears < target.min_age_years) return false;
  }
  const contra = (target.contraindications ?? []).map((c: string) => key(c));
  if (contra.some((c: string) => player.injuries.some(i => i.includes(c) || c.includes(i)))) return false;
  const legality = target.season_legality;
  if (legality && typeof legality === "object" && legality[player.phase] === false) return false;
  if (!isMovementSeasonLegal(seasonContextFromPhase(player.phase as any), target).legal) return false;
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
  const lacking = missing.map(m => m.replace(/_/g, " ")).join(", ");
  return family.filter(t => qualifies(source, t, missing, player)).slice(0, 3).map(t => ({
    slug: t.slug, name: t.name,
    reason: `${t.name}: same ${doseText(rx)}${lacking ? `, no ${lacking} needed` : ""}`,
  }));
}
