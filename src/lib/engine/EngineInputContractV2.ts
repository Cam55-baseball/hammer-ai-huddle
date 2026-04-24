/**
 * Engine Input Contract V2 — the canonical input shape for any future engine.
 *
 * All future features that compute or read engine state MUST normalize their
 * inputs to this shape. Direct DB column coupling in feature code is forbidden.
 *
 * This is a declarative contract — no runtime impact today. Existing engine
 * (Phases 1–6) continues with its current snapshot-based flow. Future engine
 * v2 code reads/writes through these types only.
 */

export interface EngineInputV2 {
  /** 0..100 — normalized cumulative load over last 24h */
  load_24h: number;
  /** 0..100 — current recovery score */
  recovery_score: number;
  /** 0..100 — dopamine/freshness index from last 6h activity */
  freshness_6h: number;
  /** 0..1 — normalized state-transition rate over last 3d */
  volatility: number;
}

export interface EngineOutputV2 {
  overall_state: 'prime' | 'ready' | 'caution' | 'recover';
  /** 0..100 */
  confidence: number;
  /** ISO timestamp */
  computed_at: string;
}

/** Adapter: convert a hammer_state_snapshots row into EngineInputV2. */
export function snapshotToEngineInput(snap: {
  cognitive_load?: number | null;
  recovery_score?: number | null;
  dopamine_load?: number | null;
}): EngineInputV2 {
  return {
    load_24h: Number(snap.cognitive_load ?? 0),
    recovery_score: Number(snap.recovery_score ?? 50),
    freshness_6h: 100 - Number(snap.dopamine_load ?? 0),
    volatility: 0, // computed externally — caller fills in if known
  };
}

export const ENGINE_CONTRACT_VERSION = 'v2.0.0';
