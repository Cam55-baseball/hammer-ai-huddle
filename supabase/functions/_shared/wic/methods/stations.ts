// Elite Training Methods Engine v1 — station resolution.
//
// Station methods (French contrast, contrast pairs, PAP primers) need more than
// the anchor lift: they need a plyometric, a loaded-explosive and sometimes an
// assisted/overspeed expression of the SAME movement family.
//
// Those station movements are drawn from the identical legality-gated catalog
// pool the engines already use. The method never widens eligibility — the
// generator passes in movements that have already cleared season legality,
// injury contraindications, training age, scope and catalog integrity.
//
// If a station cannot be filled from the legal pool, the method degrades to a
// simpler one (the selector's structure gate) instead of inventing work.

import type { MethodDef, MethodStation } from "./catalog.ts";

export type MovementFamily = "lower" | "upper_push" | "upper_pull" | "rotation" | "other";

export interface StationMovementLike {
  slug: string;
  name: string;
  category?: string | null;
  movement_category?: string | null;
  pap_classification?: string | null;
  movement_velocity?: string | null;
  equipment?: string[] | null;
}

const RX = {
  lower: /(squat|hinge|deadlift|lunge|split|step_?up|sled|jump|bound|hip_?thrust|calf|tibial)/i,
  upperPush: /(bench|press|push_?up|dip|landmine_press|overhead)/i,
  upperPull: /(row|pull_?up|chin|pulldown|pull_?down|face_?pull|shrug)/i,
  rotation: /(rotat|chop|scoop|shot_?put|med_?ball|swing|twist|anti_?rotat)/i,
  plyo: /(plyo|jump|bound|hop|depth|throw|toss|slam|skip|pogo)/i,
  loadedExplosive: /(jump_?squat|trap_?bar_?jump|clean|snatch|push_?press|med_?ball|kb_?swing|speed_?(bench|squat|pull)|dynamic_?effort|landmine)/i,
  assisted: /(assisted|band_?assist|overspeed|band_?resisted|drop_?jump|falling|towed|downhill|light_?ball|underload)/i,
};

function text(m: StationMovementLike): string {
  return `${m.slug} ${m.name} ${m.movement_category ?? ""} ${m.category ?? ""}`.toLowerCase();
}

export function movementFamily(m: StationMovementLike): MovementFamily {
  const t = text(m);
  if (RX.rotation.test(t)) return "rotation";
  if (RX.upperPull.test(t)) return "upper_pull";
  if (RX.upperPush.test(t)) return "upper_push";
  if (RX.lower.test(t)) return "lower";
  return "other";
}

export function isPlyometric(m: StationMovementLike): boolean {
  const pap = String(m.pap_classification ?? "").toLowerCase();
  const vel = String(m.movement_velocity ?? "").toLowerCase();
  return pap.includes("plyo") || vel.includes("ballistic") || vel.includes("plyo") ||
    RX.plyo.test(text(m));
}

export function isLoadedExplosive(m: StationMovementLike): boolean {
  const vel = String(m.movement_velocity ?? "").toLowerCase();
  const loaded = (m.equipment ?? []).length > 0;
  return (vel.includes("explosive") || vel.includes("dynamic") || RX.loadedExplosive.test(text(m))) &&
    (loaded || RX.loadedExplosive.test(text(m)));
}

export function isAssistedOrOverspeed(m: StationMovementLike): boolean {
  return RX.assisted.test(text(m));
}

export interface StationPools {
  plyometric: StationMovementLike[];
  loaded_explosive: StationMovementLike[];
  assisted: StationMovementLike[];
  expression: StationMovementLike[];
}

/**
 * Bucket an already legality-gated pool by station role, keeping only movements
 * from the anchor's family so the potentiation actually transfers.
 */
export function buildStationPools(
  pool: readonly StationMovementLike[],
  family: MovementFamily,
): StationPools {
  const sameFamily = pool.filter((m) => movementFamily(m) === family);
  const plyometric = sameFamily.filter(isPlyometric);
  return {
    plyometric,
    loaded_explosive: sameFamily.filter((m) => isLoadedExplosive(m) && !isPlyometric(m)),
    assisted: sameFamily.filter(isAssistedOrOverspeed),
    expression: plyometric,
  };
}

export interface ResolvedStation extends MethodStation {
  slug: string;
  name: string;
}

function pickDeterministic(
  pool: readonly StationMovementLike[],
  seed: string,
  salt: string,
): StationMovementLike | null {
  if (pool.length === 0) return null;
  const sorted = [...pool].sort((a, b) => a.slug.localeCompare(b.slug));
  let h = 2166136261;
  const s = `${seed}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return sorted[(h >>> 0) % sorted.length];
}

/**
 * Fill every station of a method. Returns null when any station cannot be
 * filled from the legal pool — the caller then falls back to a simpler method.
 */
export function resolveStations(
  method: MethodDef,
  anchor: StationMovementLike,
  pools: StationPools,
  seed: string,
): ResolvedStation[] | null {
  if (method.stations.length === 0) return [];
  const used = new Set<string>([anchor.slug]);
  const out: ResolvedStation[] = [];

  for (const st of method.stations) {
    if (st.source === "anchor") {
      out.push({ ...st, slug: anchor.slug, name: anchor.name });
      continue;
    }
    const pool = pools[st.source].filter((m) => !used.has(m.slug));
    const picked = pickDeterministic(pool, seed, `${method.id}:${st.order}`);
    if (!picked) return null;
    used.add(picked.slug);
    out.push({ ...st, slug: picked.slug, name: picked.name });
  }
  return out;
}

/** Block shape probe used by the selector's structure gate. */
export function shapeFromPools(
  pools: StationPools,
  opts: { hasAnchor: boolean; accessoryCount: number },
) {
  return {
    hasAnchor: opts.hasAnchor,
    hasPlyometric: pools.plyometric.length > 0,
    hasLoadedExplosive: pools.loaded_explosive.length > 0,
    hasAssisted: pools.assisted.length > 0,
    hasExpression: pools.expression.length > 0,
    accessoryCount: opts.accessoryCount,
  };
}
