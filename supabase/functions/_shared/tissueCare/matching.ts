/**
 * Owner Nov 1 (round 4 spec + round 5 defaults): tissue-care tagging and like-for-like matching.
 * Pure; shared by the app plan builder, the server bundle, Swap and the admin preview.
 *
 * Matching hierarchy (exact → general), never forcing an irrelevant pick:
 *   1 exact      — same area, same type
 *   2 type       — same area, compatible type
 *   3 area       — related area, same type
 *   4 both       — related area, compatible type
 *   5 general    — any area, same type
 * Anything else (incompatible type, wrong sport/role/context, injured area, too intense) is never picked.
 */

export const CARE_TYPES = ["foam_roll", "soft_tissue", "mobility", "stretch", "activation", "elasticity", "breathing"] as const;
export type CareType = typeof CARE_TYPES[number];
export const CARE_AREAS = ["neck", "shoulders", "elbow_forearm", "back", "core", "hips", "glutes", "hamstrings", "quadriceps", "knees", "calves_ankles", "feet", "full_body"] as const;
export type CareArea = typeof CARE_AREAS[number];
export const CARE_CONTEXTS = ["warm_up", "pre_throwing", "pre_hitting", "pre_lift", "pre_speed", "cool_down", "recovery", "rest_day"] as const;
export type CareContext = typeof CARE_CONTEXTS[number];
export const WARMUP_CONTEXTS: readonly CareContext[] = ["warm_up", "pre_throwing", "pre_hitting", "pre_lift", "pre_speed"];

export const CARE_TYPE_LABEL: Record<CareType, string> = {
  foam_roll: "Foam roll", soft_tissue: "Soft tissue", mobility: "Mobility", stretch: "Stretch",
  activation: "Activation", elasticity: "Elasticity", breathing: "Breathing",
};
export const CARE_AREA_LABEL: Record<CareArea, string> = {
  neck: "Neck", shoulders: "Shoulders", elbow_forearm: "Elbow & Forearm", back: "Back", core: "Core", hips: "Hips",
  glutes: "Glutes", hamstrings: "Hamstrings", quadriceps: "Quadriceps", knees: "Knees", calves_ankles: "Calves & Ankles",
  feet: "Feet", full_body: "Full body",
};
export const CARE_CONTEXT_LABEL: Record<CareContext, string> = {
  warm_up: "Warm-up", pre_throwing: "Before throwing", pre_hitting: "Before hitting", pre_lift: "Before lifting",
  pre_speed: "Before sprints", cool_down: "Cool-down", recovery: "Recovery", rest_day: "Rest day",
};

export interface CompatiblePair { a: CareType; b: CareType; warmupOnly?: boolean }
export interface CareMatchConfig {
  compatible: CompatiblePair[];
  /** Symmetric after normalizing. */
  related: Partial<Record<CareArea, CareArea[]>>;
}

/** Owner-approved defaults (round 5). Editable in the admin screen. */
export const DEFAULT_CARE_CONFIG: CareMatchConfig = {
  compatible: [
    { a: "foam_roll", b: "soft_tissue" },
    { a: "mobility", b: "stretch" },
    { a: "activation", b: "elasticity", warmupOnly: true },
  ],
  related: {
    neck: ["shoulders", "back"],
    shoulders: ["elbow_forearm", "back", "core"],
    back: ["core", "hips"],
    hips: ["glutes", "core", "hamstrings", "quadriceps"],
    glutes: ["hamstrings"],
    hamstrings: ["knees", "calves_ankles"],
    quadriceps: ["knees"],
    knees: ["calves_ankles"],
    calves_ankles: ["feet"],
  },
};
export const CARE_CONFIG_KEY = "tissue_care_matching";

const isType = (x: unknown): x is CareType => CARE_TYPES.includes(x as CareType);
const isArea = (x: unknown): x is CareArea => CARE_AREAS.includes(x as CareArea);

/** Saved setting → config; anything invalid falls back to the owner defaults. */
export function careConfigFrom(value: unknown): CareMatchConfig {
  const v = value as { compatible?: unknown; related?: unknown } | null;
  if (!v || typeof v !== "object") return DEFAULT_CARE_CONFIG;
  const compatible = Array.isArray(v.compatible)
    ? (v.compatible as any[]).filter((p) => p && isType(p.a) && isType(p.b) && p.a !== p.b).map((p) => ({ a: p.a, b: p.b, warmupOnly: !!p.warmupOnly }))
    : DEFAULT_CARE_CONFIG.compatible;
  const related: Partial<Record<CareArea, CareArea[]>> = {};
  if (v.related && typeof v.related === "object") {
    for (const [k, list] of Object.entries(v.related as Record<string, unknown>)) {
      if (isArea(k) && Array.isArray(list)) related[k] = list.filter(isArea).filter((a) => a !== k);
    }
  } else Object.assign(related, DEFAULT_CARE_CONFIG.related);
  return { compatible, related };
}

export function areRelated(a: CareArea, b: CareArea, cfg: CareMatchConfig): boolean {
  if (a === b) return false;
  return !!cfg.related[a]?.includes(b) || !!cfg.related[b]?.includes(a);
}
export function areCompatible(a: CareType, b: CareType, ctx: CareContext, cfg: CareMatchConfig): boolean {
  if (a === b) return false;
  return cfg.compatible.some((p) => ((p.a === a && p.b === b) || (p.a === b && p.b === a)) && (!p.warmupOnly || WARMUP_CONTEXTS.includes(ctx)));
}

export interface CareItem {
  id: string;
  name: string;
  areas: readonly CareArea[];
  types: readonly CareType[];
  /** Empty = any context. */
  contexts?: readonly CareContext[];
  /** Empty = both sports. */
  sports?: readonly string[];
  /** Empty = every role. */
  roles?: readonly string[];
  intensity?: "light" | "moderate" | null;
  origin?: "owner" | "builtin";
}
export interface CareTarget {
  areas: readonly CareArea[];
  type: CareType;
  context: CareContext;
  sport: string;
  role?: string | null;
  /** Active injury areas: never picked. */
  injuredAreas?: readonly CareArea[];
  /** Low readiness / rest / recovery: light items only. */
  lightOnly?: boolean;
}
export type CareTier = 1 | 2 | 3 | 4 | 5;
export const CARE_TIER_LABEL: Record<CareTier, string> = { 1: "Exact match", 2: "Same area, close type", 3: "Nearby area, same type", 4: "Nearby area, close type", 5: "Same type, other area" };
export interface CareMatch { item: CareItem; tier: CareTier; score: number; because: string }

/** Is this item safe and allowed for this target at all (before ranking)? */
export function careEligible(item: CareItem, t: CareTarget): boolean {
  if (item.sports?.length && !item.sports.includes(t.sport)) return false;
  if (item.roles?.length && !(t.role && item.roles.includes(t.role))) return false;
  if (item.contexts?.length && !item.contexts.includes(t.context) && !(t.context !== "warm_up" && WARMUP_CONTEXTS.includes(t.context) && item.contexts.includes("warm_up"))) return false;
  if (t.injuredAreas?.length && !item.types.every((x) => x === "breathing") && item.areas.some((a) => t.injuredAreas!.includes(a))) return false;
  if ((t.lightOnly || t.context === "recovery" || t.context === "rest_day") && item.intensity === "moderate") return false;
  if (item.types.includes("elasticity") && !WARMUP_CONTEXTS.includes(t.context) && !item.types.some((x) => x !== "elasticity" && x !== "activation")) return false;
  return item.areas.length > 0 && item.types.length > 0;
}

function tierFor(item: CareItem, t: CareTarget, cfg: CareMatchConfig): CareTier | null {
  const sameType = item.types.includes(t.type);
  const compType = !sameType && item.types.some((x) => areCompatible(t.type, x, t.context, cfg));
  if (!sameType && !compType) return null; // never force an irrelevant type
  if (t.type === "breathing") return 1; // breathing stands alone and has no area
  const full = item.areas.includes("full_body") || t.areas.includes("full_body");
  const sameArea = full || item.areas.some((a) => t.areas.includes(a));
  const relArea = !sameArea && item.areas.some((a) => t.areas.some((b) => areRelated(a, b, cfg)));
  if (sameArea) return sameType ? 1 : 2;
  if (relArea) return sameType ? 3 : 4;
  return sameType ? 5 : null; // a compatible type in an unrelated area is too far
}

/** Ranked eligible matches, best first. Items already `used` today are skipped (no duplicates). */
export function rankCare(t: CareTarget, pool: readonly CareItem[], cfg: CareMatchConfig = DEFAULT_CARE_CONFIG, used: ReadonlySet<string> = new Set()): CareMatch[] {
  const out: CareMatch[] = [];
  const seen = new Set<string>();
  for (const item of pool) {
    if (used.has(item.id) || seen.has(item.id)) continue;
    seen.add(item.id);
    if (!careEligible(item, t)) continue;
    const tier = tierFor(item, t, cfg);
    if (tier == null) continue;
    let score = (6 - tier) * 100;
    if (item.contexts?.includes(t.context)) score += 6; // ranking modifiers
    if (t.role && item.roles?.includes(t.role)) score += 4;
    if (item.sports?.includes(t.sport)) score += 2;
    score += 3 * item.areas.filter((a) => t.areas.includes(a)).length;
    score -= Math.max(0, item.areas.length - 3); // very broad items rank under specific ones
    out.push({ item, tier, score, because: careBecause(item, t, tier) });
  }
  // Stable sort: equal scores keep pool order (callers rotate the pool by day for variety).
  return out.sort((a, b) => b.score - a.score);
}

export function matchCare(t: CareTarget, pool: readonly CareItem[], cfg?: CareMatchConfig, used?: ReadonlySet<string>): CareMatch | null {
  return rankCare(t, pool, cfg, used)[0] ?? null;
}

function careBecause(item: CareItem, t: CareTarget, tier: CareTier): string {
  const area = t.areas.map((a) => CARE_AREA_LABEL[a].toLowerCase()).join(" + ");
  const type = CARE_TYPE_LABEL[t.type].toLowerCase();
  if (tier === 1) return `Because: ${item.name} is ${type} for your ${area}, same amount of time.`;
  if (tier === 2) return `Because: ${item.name} works your ${area} the same way as ${type}, same amount of time.`;
  if (tier === 3 || tier === 4) return `Because: ${item.name} works an area right next to your ${area}, same amount of time.`;
  return `Because: ${item.name} is the closest ${type} there is today, same amount of time.`;
}

/** Plain-word area tags from a movement name/setup (for built-in movements that carry no tags). */
const AREA_WORDS: Array<[RegExp, CareArea]> = [
  [/\bneck\b/i, "neck"],
  [/shoulder|scap|pec\b|pec minor|\blat\b|thoracic|arm care|band pull/i, "shoulders"],
  [/elbow|forearm|wrist/i, "elbow_forearm"],
  [/t-?spine|back|spine|thorax/i, "back"],
  [/\bcore\b|dead ?bug|\bplank|rib/i, "core"],
  [/\bhip|adductor|groin|90.?90|shin-box|frog|cossack|couch|airplane/i, "hips"],
  [/glute|bridge|clam|monster walk|lateral walk|mini-?band/i, "glutes"],
  [/hamstring/i, "hamstrings"],
  [/\bquad|couch stretch/i, "quadriceps"],
  [/\bknee/i, "knees"],
  [/ankle|calf|soleus|achilles|pogo/i, "calves_ankles"],
  [/\bfoot|feet|toe|arch|barefoot/i, "feet"],
  [/full body|whole body|major areas|focus areas/i, "full_body"],
];
export function inferCareAreas(text: string): CareArea[] {
  const out = AREA_WORDS.filter(([re]) => re.test(text)).map(([, a]) => a);
  return [...new Set(out)];
}

/** Region tokens used elsewhere in the app → care areas. */
export function careAreaOfRegion(region: string): CareArea | null {
  const r = region.toLowerCase();
  if (/neck/.test(r)) return "neck";
  if (/shoulder|rotator|scap/.test(r)) return "shoulders";
  if (/elbow|ucl|forearm|wrist|hand/.test(r)) return "elbow_forearm";
  if (/back|spine|lumbar/.test(r)) return "back";
  if (/core|oblique|ab/.test(r)) return "core";
  if (/hip|groin|adductor/.test(r)) return "hips";
  if (/glute/.test(r)) return "glutes";
  if (/hamstring/.test(r)) return "hamstrings";
  if (/quad|thigh/.test(r)) return "quadriceps";
  if (/knee/.test(r)) return "knees";
  if (/ankle|calf|achilles|shin/.test(r)) return "calves_ankles";
  if (/foot|toe/.test(r)) return "feet";
  return null;
}

/** Built-in movement → care tags (null = not a tissue-care movement, so never swapped by this rule). */
export function builtinCareTags(d: { name: string; role?: string | null; setup?: string | null; dosage?: string | null }): { areas: CareArea[]; types: CareType[] } | null {
  const text = `${d.name} ${d.setup ?? ""} ${d.dosage ?? ""}`;
  let types: CareType[] = [];
  const role = d.role ?? "";
  if (d.name === "Mobility + foam roll") types = ["foam_roll", "mobility"];
  else if (role === "breathwork" || /breath/i.test(d.name)) types = ["breathing"];
  else if (role === "tissue_prep") types = [/roll/i.test(d.name) || /roller/i.test(d.setup ?? "") ? "foam_roll" : "soft_tissue"];
  else if (role === "cars" || role === "mobility_joint" || role === "fascial_rotation" || /mobility|cool-down|finisher/i.test(d.name)) types = [/stretch/i.test(d.name) ? "stretch" : "mobility"];
  else if (role === "activation" || role === "stability") types = ["activation"];
  else if (/stretch/i.test(d.name)) types = ["stretch"];
  else if (/foam roll/i.test(d.name)) types = ["foam_roll"];
  if (!types.length) return null;
  const areas = types[0] === "breathing" ? ["full_body" as CareArea] : inferCareAreas(text);
  return { areas: areas.length ? areas : ["full_body"], types };
}

/** Plan-level pick: walks the day's care rows in order and never repeats an item. */
export function pickCareForDay(targets: readonly CareTarget[], pool: readonly CareItem[], cfg?: CareMatchConfig, alreadyInDay: Iterable<string> = []): Array<CareMatch | null> {
  const used = new Set<string>(alreadyInDay);
  return targets.map((t) => {
    const m = matchCare(t, pool, cfg, used);
    if (m) used.add(m.item.id);
    return m;
  });
}
