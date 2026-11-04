/**
 * Warm-up level and age-band tags (owner Nov 4 round 3, Part D answers).
 *
 * - Age bands match the other safety rules: under 13 / 13–17 / 18+.
 * - Level tags: youth, high school, college, pro.
 * - Each warm-up item lists every level and age band it fits. The composer
 *   only picks items that fit the player; when nothing fits a slot it takes
 *   the nearest easier item so full-body coverage is never lost.
 * - Built-in items are backfilled from their existing minLifecycle; owner
 *   edits (Exercise builder / Skill drill builder) override per item.
 *
 * Hook-free so the server plan builder bundles it.
 */
import { competitionRank } from "../../../../supabase/functions/_shared/wic/competitionLevel";

export type WarmupLevel = "youth" | "high_school" | "college" | "pro";
export type WarmupAgeBand = "u13" | "13_17" | "18_plus";

export const WARMUP_LEVELS: ReadonlyArray<{ id: WarmupLevel; label: string }> = [
  { id: "youth", label: "Youth" },
  { id: "high_school", label: "High school" },
  { id: "college", label: "College" },
  { id: "pro", label: "Pro" },
];
export const WARMUP_AGE_BANDS: ReadonlyArray<{ id: WarmupAgeBand; label: string }> = [
  { id: "u13", label: "Under 13" },
  { id: "13_17", label: "13–17" },
  { id: "18_plus", label: "18+" },
];

export interface WarmupFitTags {
  readonly levels: ReadonlyArray<WarmupLevel>;
  readonly ageBands: ReadonlyArray<WarmupAgeBand>;
}

export interface PlayerFit {
  readonly level: WarmupLevel;
  readonly ageBand: WarmupAgeBand;
}

type Lifecycle = "youth" | "beginner" | "intermediate" | "advanced" | "elite";

/** Roles under-13s may get at beginner level (owner: mobility, activation, tissue prep). */
export const LOW_IMPACT_ROLES: ReadonlySet<string> = new Set([
  "tissue_prep", "mobility_joint", "cars", "fascial_rotation", "activation", "breathwork",
]);

const ALL_LEVELS: WarmupLevel[] = ["youth", "high_school", "college", "pro"];
const ALL_BANDS: WarmupAgeBand[] = ["u13", "13_17", "18_plus"];

/** Owner backfill rule from the existing minLifecycle. */
export function backfillFitTags(minLifecycle: Lifecycle, role: string): WarmupFitTags {
  switch (minLifecycle) {
    case "youth":
      return { levels: ALL_LEVELS, ageBands: ALL_BANDS };
    case "beginner":
      return LOW_IMPACT_ROLES.has(role)
        ? { levels: ALL_LEVELS, ageBands: ALL_BANDS }
        : { levels: ["high_school", "college", "pro"], ageBands: ["13_17", "18_plus"] };
    case "intermediate":
      return { levels: ["high_school", "college", "pro"], ageBands: ["13_17", "18_plus"] };
    default:
      return { levels: ["college", "pro"], ageBands: ["18_plus"] };
  }
}

/** Defaults for a brand-new owner warm-up item (by its chosen difficulty, or all when unknown). */
export function defaultFitForNewItem(minLifecycle: Lifecycle | null | undefined, role = ""): WarmupFitTags {
  return minLifecycle ? backfillFitTags(minLifecycle, role) : { levels: ALL_LEVELS, ageBands: ALL_BANDS };
}

const isLevel = (x: unknown): x is WarmupLevel => typeof x === "string" && (ALL_LEVELS as string[]).includes(x);
const isBand = (x: unknown): x is WarmupAgeBand => typeof x === "string" && (ALL_BANDS as string[]).includes(x);

/** Clean a saved tag list; empty or missing → null (use the backfill). */
export function cleanFit(levels: unknown, ageBands: unknown): WarmupFitTags | null {
  const l = Array.isArray(levels) ? levels.filter(isLevel) : [];
  const a = Array.isArray(ageBands) ? ageBands.filter(isBand) : [];
  if (l.length === 0 || a.length === 0) return null;
  return { levels: [...new Set(l)], ageBands: [...new Set(a)] };
}

let overrides = new Map<string, WarmupFitTags>();

/** Owner Exercise-builder tags by slug (from live Vault versions). */
export function setWarmupFitOverrides(map: Record<string, { levels?: unknown; ageBands?: unknown; age_bands?: unknown }> | null): void {
  const next = new Map<string, WarmupFitTags>();
  for (const [slug, v] of Object.entries(map ?? {})) {
    const fit = cleanFit(v?.levels, v?.ageBands ?? v?.age_bands);
    if (fit) next.set(slug, fit);
  }
  overrides = next;
}

export function fitTagsFor(d: { slug: string; role: string; minLifecycle: Lifecycle }): WarmupFitTags {
  return overrides.get(d.slug) ?? backfillFitTags(d.minLifecycle, d.role);
}

export function fits(tags: WarmupFitTags, player: PlayerFit): boolean {
  return tags.levels.includes(player.level) && tags.ageBands.includes(player.ageBand);
}

export function ageBandFor(ageYears: number): WarmupAgeBand {
  return ageYears < 13 ? "u13" : ageYears < 18 ? "13_17" : "18_plus";
}

function levelFromSaved(level: string | null | undefined): WarmupLevel | null {
  if (!level || !String(level).trim()) return null;
  const key = String(level).trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (key === "indy" || key === "independent") return "pro";
  const rank = competitionRank(level);
  if (rank == null) {
    if (/pro|mlb|milb|minor/.test(key)) return "pro";
    if (/college|juco|ncaa|naia|d1|d2|d3/.test(key)) return "college";
    if (/high|hs|varsity|jv/.test(key)) return "high_school";
    if (/youth|little|middle|\d+u/.test(key)) return "youth";
    return null;
  }
  if (rank <= 4) return "youth";
  if (rank <= 6) return "high_school";
  if (rank <= 9) return "college";
  return "pro";
}

/**
 * Owner rule: saved level wins; with no level use their age; with no age
 * either, treat them as high school. Age band comes from age, else from level.
 */
export function resolvePlayerFit(input: { competitionLevel?: string | null; ageYears?: number | null }): PlayerFit {
  const age = typeof input.ageYears === "number" && Number.isFinite(input.ageYears) ? input.ageYears : null;
  const saved = levelFromSaved(input.competitionLevel ?? null);
  const level: WarmupLevel = saved
    ?? (age == null ? "high_school" : age < 13 ? "youth" : age < 18 ? "high_school" : "college");
  const ageBand: WarmupAgeBand = age != null ? ageBandFor(age)
    : level === "youth" ? "u13" : level === "high_school" ? "13_17" : "18_plus";
  return { level, ageBand };
}

export function fitLabel(tags: WarmupFitTags): string {
  const l = WARMUP_LEVELS.filter((x) => tags.levels.includes(x.id)).map((x) => x.label).join(", ");
  const a = WARMUP_AGE_BANDS.filter((x) => tags.ageBands.includes(x.id)).map((x) => x.label).join(", ");
  return `Levels: ${l || "none"} · Ages: ${a || "none"}`;
}
