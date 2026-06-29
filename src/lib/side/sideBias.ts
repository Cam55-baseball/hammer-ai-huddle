/**
 * sideBias — pure mapping from a computed L/R differential into a
 * deterministic "weaker side focus" instruction the daily plan can
 * attach to hitting/throwing blocks for switch/ambi athletes.
 *
 * Trust-first: returns null when the differential is too small to act
 * on, or when sample threshold was not met upstream. NEVER fabricates
 * a weaker side. Bias is capped at +20% extra activation.
 */
import type { Side } from "./getSideFor";

export interface SideBiasInput {
  readonly favored: Side | "even"; // from computeSideDifferential
  readonly diffPct: number;        // signed, right - left over |left|
  readonly leftN: number;
  readonly rightN: number;
}

export interface SideBiasResult {
  readonly weakerSide: Side;
  readonly absPct: number;             // 0..1 magnitude
  readonly extraSetMultiplier: number; // 1.10..1.20
  readonly note: string;
}

/** Floor below which we don't bother — too noisy to act on. */
export const SIDE_BIAS_MIN_PCT = 0.08; // 8%
export const SIDE_BIAS_MIN_SAMPLES = 3;

export function computeSideBias(input: SideBiasInput | null): SideBiasResult | null {
  if (!input) return null;
  if (input.favored === "even") return null;
  if (input.leftN < SIDE_BIAS_MIN_SAMPLES || input.rightN < SIDE_BIAS_MIN_SAMPLES) return null;
  const absPct = Math.abs(input.diffPct);
  if (!Number.isFinite(absPct) || absPct < SIDE_BIAS_MIN_PCT) return null;

  // The "favored" side leads. The OTHER side is weaker.
  const weakerSide: Side = input.favored === "L" ? "R" : "L";
  // Cap at +20% extra; scale linearly between 8% and 30% asymmetry.
  const scaled = Math.min(0.2, 0.10 + Math.min(0.10, (absPct - SIDE_BIAS_MIN_PCT)));
  const extraSetMultiplier = 1 + scaled;
  const pctLabel = Math.round(absPct * 100);
  const sideLabel = weakerSide === "L" ? "Left" : "Right";
  const note = `Weaker side focus: ${sideLabel} (+${Math.round(scaled * 100)}% activation today — L/R asymmetry ${pctLabel}%).`;
  return { weakerSide, absPct, extraSetMultiplier, note };
}

// ---------------------------------------------------------------------------
// Cross-component cache: SideSplitsSection writes, dailyPlan reads.
// Stored as a plain object keyed by discipline.
// ---------------------------------------------------------------------------

export type SideBiasDiscipline = "hit" | "throw";
const CACHE_KEY = "asb.sideBias.v1";

type CacheShape = Partial<Record<SideBiasDiscipline, SideBiasInput>>;

export function writeSideBiasInput(discipline: SideBiasDiscipline, input: SideBiasInput | null): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const raw = window.localStorage.getItem(CACHE_KEY);
    const cur: CacheShape = raw ? JSON.parse(raw) : {};
    if (input === null) {
      delete cur[discipline];
    } else {
      cur[discipline] = input;
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cur));
  } catch {
    /* noop — caching is best-effort */
  }
}

export function readSideBias(discipline: SideBiasDiscipline): SideBiasResult | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cur: CacheShape = JSON.parse(raw);
    return computeSideBias(cur[discipline] ?? null);
  } catch {
    return null;
  }
}
