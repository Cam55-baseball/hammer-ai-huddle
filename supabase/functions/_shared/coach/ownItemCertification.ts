// Certification of a coach's own (non-Exercise-Vault) prescription items
// (owner finish list, Oct 25). Scope is exactly what the owner named: the
// common gear vocabulary and the measure type. A certified own item has a
// name, a governed measure with an exact positive dose, whole-number sets,
// and gear that maps cleanly to the shared common-gear vocabulary — unknown
// words are named and rejected, never silently dropped (ownerDefaults rule:
// unknown equipment remains visible for review).
//
// Certification says nothing about workload price: own items carry no
// Exercise Vault workload declaration, so activation still goes through the
// envelope's existing "workload isn't declared" refusal. No training logic
// is invented here — only vocabulary and measure rules the app already uses.
import { ownerGear } from "../vault/ownerDefaults.ts";

/** Measure units the existing judges already govern. Innings stay excluded:
 *  they have no exact count, so the arm ledger could never check them. */
export const COACH_OWN_MEASURE_UNITS = ["reps", "reps per arm", "reps per leg", "reps each side", "total_reps", "throws", "pitches", "seconds", "feet"] as const;
export type CoachOwnMeasure = (typeof COACH_OWN_MEASURE_UNITS)[number];

export interface OwnItemInput {
  name?: string | null;
  /** Exercise Vault slug. Items with a slug are Vault-reviewed and skipped. */
  slug?: string | null;
  sets?: number | null;
  reps?: number | null;
  total_reps?: number | null;
  duration?: number | null;      // seconds
  distance_feet?: number | null;
  dosage_unit?: string | null;
  gear?: string | null;
}

export interface OwnItemCertification {
  certified: boolean;
  reasons: string[];
  /** Canonical common-gear tokens the item needs (empty = no gear). */
  equipment: string[];
  /** The coach's words that are not in the common gear vocabulary. */
  unknownGear: string[];
}

export function certifyCoachOwnItem(item: OwnItemInput): OwnItemCertification {
  const reasons: string[] = [];
  const name = (item.name ?? "").trim();
  if (!name) reasons.push("Every exercise needs a name.");
  const label = name || "An exercise";

  const unit = (item.dosage_unit ?? "").trim();
  if (!(COACH_OWN_MEASURE_UNITS as readonly string[]).includes(unit)) {
    reasons.push(`${label}: choose a measure — reps, total reps, throws, pitches, seconds or feet.`);
  } else {
    const dose = unit === "seconds" ? item.duration
      : unit === "feet" ? item.distance_feet
      : unit === "total_reps" ? (item.total_reps ?? item.reps)
      : item.reps;
    if (typeof dose !== "number" || !Number.isFinite(dose) || dose <= 0) {
      reasons.push(`${label}: enter an exact ${unit === "seconds" ? "time in seconds" : unit === "feet" ? "distance in feet" : "count"}.`);
    } else if (unit !== "seconds" && unit !== "feet" && !Number.isInteger(dose)) {
      // Timed and distance entries keep hundredths; counts stay whole.
      reasons.push(`${label}: reps and throws must be whole counts.`);
    }
  }
  if (item.sets != null && (!Number.isInteger(item.sets) || item.sets <= 0)) {
    reasons.push(`${label}: sets must be a whole number of 1 or more.`);
  }

  const mapped = ownerGear((item.gear ?? "").split(",").map(token => token.trim()).filter(Boolean));
  const equipment = mapped.equipment.filter(gear => gear !== "none");
  if (mapped.unknown.length) {
    reasons.push(`${label}: "${mapped.unknown.join('", "')}" isn't in the common gear list. Ask your coach to pick the closest common gear so your saved equipment answers can be checked.`);
  }

  return { certified: reasons.length === 0, reasons, equipment, unknownGear: mapped.unknown };
}

/** Certify every slugless (coach-authored) item in a prescription's exercise
 *  list. Catalog items (with a slug) are certified by the Exercise Vault
 *  review flow instead and are skipped here. */
export function certifyCoachOwnItems(exercises: readonly OwnItemInput[]): { ok: boolean; reasons: string[]; gearByName: Map<string, string[]> } {
  const reasons: string[] = [];
  const gearByName = new Map<string, string[]>();
  for (const item of exercises ?? []) {
    if (!item || typeof item !== "object") continue;
    if (item.slug) continue; // Vault-reviewed items certify through the catalog.
    const name = (item.name ?? "").trim();
    if (!name) { reasons.push("Every exercise needs a name."); continue; }
    const result = certifyCoachOwnItem(item);
    gearByName.set(name, result.equipment);
    reasons.push(...result.reasons);
  }
  return { ok: reasons.length === 0, reasons: [...new Set(reasons)], gearByName };
}
