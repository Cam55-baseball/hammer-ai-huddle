/**
 * Warm-up stage scale — ORDER only. The warm-up builder still CHOOSES movements
 * exactly as before; this module only sorts the chosen list from cold to fully
 * ready. Hard rules always win over any owner tag:
 *  - tissue prep (stage 0) is first, rolling before rhythm, 100% of the time;
 *  - build-ups (stage 7) come before any max-intent effort (stages 8–9);
 *  - a tissue-prep movement can never be moved later, a max-intent one never earlier.
 */
import type { WarmupRole } from "./warmupLibrary";

export interface WarmupStage { stage: number; name: string; warmth: string }

export const WARMUP_STAGES: readonly WarmupStage[] = [
  { stage: 0, name: "Tissue prep", warmth: "Cold, straight from sitting — rolling and easy rhythmic bounces loosen stiff tissue first." },
  { stage: 1, name: "Breathe and reset", warmth: "Still cold — slow breathing calms the body and sets the ribs before you move more." },
  { stage: 2, name: "Joint circles", warmth: "Loose but not warm — slow, controlled circles wake up every joint." },
  { stage: 3, name: "Mobilize", warmth: "Starting to warm — joints move freely, so you can open up hips, back and shoulders." },
  { stage: 4, name: "Activate", warmth: "Warm and mobile — now switch on glutes, trunk, shoulder blades and arm care." },
  { stage: 5, name: "Coordinate", warmth: "Muscles switched on — light catches and taps sharpen hands and eyes." },
  { stage: 6, name: "Movement prep", warmth: "Warm all over — skips, quick feet and rhythm drills, still well under full speed." },
  { stage: 7, name: "Build-ups", warmth: "Moving well — sprints, throws or swings that climb from about 60% to 80%." },
  { stage: 8, name: "Elastic hops", warmth: "Built up to 80% — single-leg hops, bounds and sticks that need a fully warm body." },
  { stage: 9, name: "Prime", warmth: "Fully ready — short, high-intent efforts so you finish sharp and ready to dominate." },
] as const;

export const MAX_STAGE = WARMUP_STAGES.length - 1;
export const BUILD_UP_STAGE = 7;
/** Roles that are high-intent: never allowed before the build-ups. */
const HIGH_INTENT_ROLES: ReadonlySet<string> = new Set(["single_leg_twitch", "ground_force", "fast_twitch"]);

export const STAGE_BY_ROLE: Record<WarmupRole, number> = {
  tissue_prep: 0,
  breathwork: 1,
  cars: 2,
  fascial_rotation: 3,
  mobility_joint: 3,
  activation: 4,
  stability: 4,
  arm_care: 4,
  weightless_coordination: 5,
  neural_priming: 6,
  ladder_quickness: 6,
  movement_bridge: 7,
  single_leg_twitch: 8,
  ground_force: 9,
  fast_twitch: 9,
};

/** Fixed position for the owner's tissue-prep sequence. */
const FIXED_ORDER: Record<string, number> = {
  wu_tissue_prep_roll_and_rhythm: 1,
  wu_tissue_prep_rhythmic_shake: 2,
  "hpi-breath-primer": 0,
};
const FIXED_STAGE: Record<string, number> = { "hpi-breath-primer": 1 };

/**
 * Starting stages the owner should confirm — the role says one thing, the
 * movement itself suggests another. Shown in the Vault's "Needs owner review".
 */
export const WARMUP_STAGE_REVIEW: ReadonlyArray<{ slug: string; current: number; suggested: number; note: string }> = [
  { slug: "wu_medball_rot_toss_wall", current: 3, suggested: 9, note: "Filed as rotation mobility, but it is an explosive med-ball throw — suggested stage 9 (Prime)." },
  { slug: "wu_sl_march_pop", current: 8, suggested: 6, note: "A low single-leg march pop — suggested stage 6 (Movement prep)." },
  { slug: "wu_gf_hip_lock_hold", current: 9, suggested: 8, note: "A held sprint position, not a max effort — suggested stage 8 (Elastic hops)." },
  { slug: "wu_shuffle_change_direction", current: 7, suggested: 6, note: "Shuffle and change of direction at sub-max — suggested stage 6 (Movement prep)." },
  { slug: "wu_reaction_ball_wall", current: 6, suggested: 5, note: "Reaction catches — suggested stage 5 (Coordinate)." },
  { slug: "wu_9020_reset", current: 1, suggested: 1, note: "Breathing reset — confirm stage 1 (Breathe and reset)." },
];

export type StageOverride = { stage: number; order: number | null };
const LS_KEY = "hm.warmupStageOverrides.v1";
let overrides: Map<string, StageOverride> | null = null;

function loadOverrides(): Map<string, StageOverride> {
  if (overrides) return overrides;
  overrides = new Map();
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, StageOverride>)) overrides.set(k, v);
  } catch { /* no device copy */ }
  return overrides;
}

/** Test/hook entry: replace the in-memory owner tags. */
export function setWarmupStageOverrides(map: Record<string, StageOverride> | null): void {
  overrides = new Map(Object.entries(map ?? {}));
}

/**
 * Fetch the owner's live Vault stage tags into the device copy. Used from the
 * NEXT plan build (never re-orders a warm-up already on screen).
 */
export async function refreshWarmupStageOverrides(fetcher: () => Promise<Array<{ slug: string; stage: number; stage_order: number | null }> | null>): Promise<void> {
  try {
    const rows = await fetcher();
    if (!rows || typeof localStorage === "undefined") return;
    const obj: Record<string, StageOverride> = {};
    for (const r of rows) if (Number.isInteger(r.stage)) obj[r.slug] = { stage: r.stage, order: r.stage_order ?? null };
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch { /* keep the old copy */ }
}

const clamp = (n: number) => Math.max(0, Math.min(MAX_STAGE, Math.round(n)));

/** Heuristic starting stage for catalog warm-up movements outside the builder library. */
export function guessStageFromName(name: string): number {
  const n = name.toLowerCase();
  if (/roll|release|ball pin|fascia|scrunch/.test(n)) return 0;
  if (/breath/.test(n)) return 1;
  if (/circle|cars\b|glide/.test(n)) return 2;
  if (/stretch|pose|pigeon|mobil|rock|open|flow|cradle|twist|cat cow|scorpion|hang|lunge|pancake|thread|swing|slide|iron cross|reach/.test(n)) return 3;
  if (/band|clamshell|monster|activation|bird|plank|walk/.test(n)) return 4;
  if (/skip|hurdle|ladder|line hop|ankle hop/.test(n)) return 6;
  if (/build|progressive/.test(n)) return 7;
  if (/pogo|bound|hop/.test(n)) return 8;
  if (/sprint|jump|max|burst/.test(n)) return 9;
  return 3;
}

/** Stage for one warm-up movement, after hard-rule clamps. Null = unknown. */
export function stageFor(slug: string, role?: string | null): number | null {
  if (slug in FIXED_STAGE) return FIXED_STAGE[slug];
  const r = role as WarmupRole | undefined;
  if (r === "tissue_prep" || slug.startsWith("wu_tissue_prep")) return 0;
  const o = loadOverrides().get(slug);
  let s: number | null = o ? clamp(o.stage) : r && r in STAGE_BY_ROLE ? STAGE_BY_ROLE[r] : null;
  if (s === null) return null;
  if (s === 0) s = 1; // stage 0 belongs to tissue prep only
  if (r && HIGH_INTENT_ROLES.has(r) && s <= BUILD_UP_STAGE) s = BUILD_UP_STAGE + 1;
  return s;
}

export function orderWithinStage(slug: string): number | null {
  if (slug in FIXED_ORDER) return FIXED_ORDER[slug];
  return loadOverrides().get(slug)?.order ?? null;
}

/**
 * Stable sort: stage (lowest first), then order-within-stage, then the
 * builder's own order. Unknown movements (e.g. an owner slot drill) keep the
 * stage of the movement they replaced/follow. Never adds or removes anything.
 */
export function sortByWarmupStage<T>(items: readonly T[], slugOf: (t: T) => string, roleOf?: (t: T) => string | null | undefined): T[] {
  let prev = 0;
  const keyed = items.map((it, i) => {
    const slug = slugOf(it);
    const known = stageFor(slug, roleOf?.(it) ?? null);
    const stage = known ?? prev;
    prev = stage;
    return { it, i, stage, ord: orderWithinStage(slug) };
  });
  keyed.sort((a, b) => a.stage - b.stage
    || (a.ord ?? Number.POSITIVE_INFINITY) - (b.ord ?? Number.POSITIVE_INFINITY)
    || a.i - b.i);
  return keyed.map((k) => k.it);
}
