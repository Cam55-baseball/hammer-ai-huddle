/**
 * Wave 3 — Modulator contract.
 *
 * A modulator is a pure function that reads its own event-derived projection
 * and returns a bounded modulation envelope for the daily prescription. It
 * never authors organism truth, never raises confidence, never removes a hard
 * stop. Lineage is mandatory: every modulator must cite the source events that
 * justify its envelope.
 */
import type { AsbEventRow } from "@/hooks/useAsbTimeline";
import type { SessionKind, DailyPrescription } from "@/lib/runtime/prescription";

export type CeilingKind = SessionKind | null; // null = no opinion

export interface ModulatorEnvelope {
  /** Caps session kind (e.g., "recovery" forces deload). null = pass-through. */
  ceilingKind: CeilingKind;
  /** Bounded human-readable rationale items, prefixed by domain. */
  notes: string[];
  /** Source event ids justifying the envelope. Required if notes/ceiling set. */
  sources: string[];
  /** Tightest confidence the domain can vouch for. Never raises rx.confidence. */
  confidenceCeiling: number | null;
  /** Domain id for replay/observability. */
  domain: string;
}

export const PASS_THROUGH: ModulatorEnvelope = {
  ceilingKind: null,
  notes: [],
  sources: [],
  confidenceCeiling: null,
  domain: "noop",
};

export interface ModulatorContext {
  rows: AsbEventRow[] | undefined;
  athleteId: string | null;
  /** Viewer scope — drives privacy of cycle data. */
  viewerScope: "self" | "coach" | "org" | "external";
  /** Athlete age band — drives anti-early-specialization advisory. */
  ageBand?: "youth" | "hs" | "college" | "pro" | null;
}

export type Modulator = (ctx: ModulatorContext) => ModulatorEnvelope;

/**
 * Deterministic ordering of modulators. Survivability-first: hard medical
 * gates (rtp, illness) run before discretionary modulation.
 */
export const MODULATOR_ORDER = [
  "rtp",
  "illness",
  "cycle",
  "respiratory",
  "environment",
  "position",
  "perception",
] as const;

export type ModulatorDomain = (typeof MODULATOR_ORDER)[number];

/** Severity ordering used when collapsing multiple ceilings. */
const KIND_RANK: Record<SessionKind, number> = {
  rest: 0,
  recovery: 1,
  hybrid: 2,
  throw: 3,
  sprint: 4,
  lift: 5,
};

export function tightestKind(a: CeilingKind, b: CeilingKind): CeilingKind {
  if (a == null) return b;
  if (b == null) return a;
  return KIND_RANK[a] <= KIND_RANK[b] ? a : b;
}

export function tightestConfidence(
  a: number | null,
  b: number | null,
): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/** Helper for modulators to reach into latest event for their topic prefix. */
export function pickLatest(
  rows: AsbEventRow[] | undefined,
  prefix: string,
): AsbEventRow | null {
  if (!rows) return null;
  let best: AsbEventRow | null = null;
  for (const r of rows) {
    if (!r.topic_id?.startsWith(prefix)) continue;
    if (!best || r.occurred_at > best.occurred_at) best = r;
  }
  return best;
}

/** Helper: collect all events under a topic prefix, newest first. */
export function pickAll(
  rows: AsbEventRow[] | undefined,
  prefix: string,
): AsbEventRow[] {
  if (!rows) return [];
  return rows
    .filter((r) => r.topic_id?.startsWith(prefix))
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
}

export type { DailyPrescription };
