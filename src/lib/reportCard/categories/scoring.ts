/**
 * Category scoring — one engine for all six report cards (owner rulings 2026-09-30).
 *
 *  - Points inside a category follow weight units (non-negotiables = 2 units),
 *    written as whole points per tile in the card spec.
 *  - Meter = weighted average of MEASURED tiles, scaled to the category's points.
 *  - INCOMPLETE unless measured tiles hold ≥ 60% of the applicable points AND
 *    every non-negotiable returned a verdict.
 *  - "Not applicable" tiles (e.g. pitcher not in frame, energy angle on a
 *    non-shuffle throw) leave the category entirely — never counted as missing.
 *  - Record-only tiles: worth 0 and outside the check until the athlete has a
 *    baseline (8 in-context clips); then scored on proximity to THEIR band.
 *  - Staff-only tiles (owner tiles 19/20) are missing in athlete view.
 *  - Total only when every scored category is complete.
 * Pure and deterministic.
 */
import { BASELINE_MIN_CLIPS } from "@/lib/biomech/baseline/athleteBaseline";

export const INCOMPLETE_MIN_SHARE = 0.6;
export const CATEGORY_SCORING_VERSION = "category_scoring@1.0.0-2026-09-30";

export type Audience = "athlete" | "staff";

/** What a tile reader returns — normalised from any engine's raw result. */
export type TileReading =
  | { kind: "verdict"; pass: boolean; elite?: boolean }
  | { kind: "score"; frac: number } // 0..1, higher is better
  | { kind: "record"; value: number }
  | { kind: "ungraded"; value: number | null; why: string }
  | { kind: "missing"; reason: string }
  | { kind: "not_applicable"; reason: string };

export interface CategoryTileSpec {
  key: string;
  name: string;
  points: number;
  nonNegotiable?: boolean;
  recordOnly?: boolean;
  staffOnly?: boolean;
  /** Ledger metric key used to look up this athlete's own band (record-only tiles). */
  baselineKey?: string;
  read: (raw: unknown) => TileReading;
}
export interface CategorySpec {
  key: string;
  title: string;
  points: number;
  tiles: CategoryTileSpec[];
  /** Additive bonus category: can only add, never deduct. */
  additive?: boolean;
  note?: string;
}
export interface UnscoredSection {
  key: string;
  title: string;
  note: string;
  tiles: { key: string; name: string; read: (raw: unknown) => TileReading }[];
}
export interface CardCategorySpec {
  card: string;
  sections: UnscoredSection[]; // shown above, never weighted
  categories: CategorySpec[];
  /** Scored categories are rescaled so they sum to this (hitting: five categories → 100). */
  scaleTo: number;
  showTotal: boolean;
  cardNotes: string[];
}

/** An athlete's own band for a record-only metric (from the baseline engine). */
export interface AthleteBand { low: number; high: number; n: number }

export type TileOutcome =
  | { status: "scored"; frac: number; points: number; earned: number }
  | { status: "waiting_on_baseline"; value: number; clipsNeeded: number }
  | { status: "ungraded"; value: number | null; why: string }
  | { status: "missing"; reason: string }
  | { status: "not_applicable"; reason: string };

export interface CategoryResult {
  key: string; title: string; points: number; additive: boolean;
  status: "complete" | "incomplete";
  /** Category score in its own points, 1 dp. null when incomplete. */
  score: number | null;
  incompleteReason: string | null;
  measuredShare: number;
  tiles: { key: string; name: string; points: number; nonNegotiable: boolean; outcome: TileOutcome }[];
  notApplicable: string[];
}
export interface CardScore {
  version: string; card: string; audience: Audience;
  sections: { key: string; title: string; note: string; tiles: { key: string; name: string; reading: TileReading }[] }[];
  categories: CategoryResult[];
  total: number | null;
  totalReason: string | null;
  notes: string[];
}

/** Proximity to the athlete's own band: 1 inside, linear to 0 at two band widths beyond the edge. */
export function bandProximity(value: number, band: AthleteBand): number {
  const w = Math.max(band.high - band.low, 1e-9);
  const d = value < band.low ? band.low - value : value > band.high ? value - band.high : 0;
  return Math.max(0, 1 - d / (2 * w));
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export function scoreCard(spec: CardCategorySpec, raw: unknown, o: { audience: Audience; bands?: Record<string, AthleteBand> }): CardScore {
  const bands = o.bands ?? {};
  const scored = spec.categories.filter((c) => !c.additive);
  const baseSum = scored.reduce((a, c) => a + c.points, 0);
  const scale = baseSum > 0 ? spec.scaleTo / baseSum : 1;

  const categories = spec.categories.map((c): CategoryResult => {
    const tiles = c.tiles.map((t) => {
      let outcome: TileOutcome;
      if (t.staffOnly && o.audience === "athlete") outcome = { status: "missing", reason: "staff_only_until_validated" };
      else {
        const rd = t.read(raw);
        if (rd.kind === "not_applicable") outcome = { status: "not_applicable", reason: rd.reason };
        else if (rd.kind === "missing") outcome = { status: "missing", reason: rd.reason };
        else if (rd.kind === "ungraded") outcome = { status: "ungraded", value: rd.value, why: rd.why };
        else if (rd.kind === "record") {
          const b = t.baselineKey ? bands[t.baselineKey] : undefined;
          outcome = b && b.n >= BASELINE_MIN_CLIPS
            ? { status: "scored", frac: bandProximity(rd.value, b), points: t.points, earned: 0 }
            : { status: "waiting_on_baseline", value: rd.value, clipsNeeded: Math.max(0, BASELINE_MIN_CLIPS - (b?.n ?? 0)) };
        } else {
          const frac = rd.kind === "score" ? Math.max(0, Math.min(1, rd.frac)) : rd.pass ? 1 : 0;
          outcome = { status: "scored", frac, points: t.points, earned: 0 };
        }
      }
      if (outcome.status === "scored") outcome = { ...outcome, earned: outcome.frac * t.points };
      return { key: t.key, name: t.name, points: t.points, nonNegotiable: !!t.nonNegotiable, outcome };
    });
    const inCheck = tiles.filter((t) => t.outcome.status !== "not_applicable" && t.outcome.status !== "waiting_on_baseline");
    const applicable = inCheck.reduce((a, t) => a + t.points, 0);
    const measured = inCheck.filter((t) => t.outcome.status === "scored");
    const mPts = measured.reduce((a, t) => a + t.points, 0);
    const share = applicable > 0 ? mPts / applicable : 0;
    const nnMissing = tiles.filter((t) => t.nonNegotiable && t.outcome.status !== "scored");
    const notApplicable = tiles.filter((t) => t.outcome.status === "not_applicable").map((t) => t.name);
    const catPts = c.additive ? c.points : c.points * scale;
    let reason: string | null = null;
    if (c.additive) {
      // Never incomplete in a way that costs anything: bonus is 0 until earned.
      const earned = measured.reduce((a, t) => a + (t.outcome as { earned: number }).earned, 0);
      const full = tiles.reduce((a, t) => a + t.points, 0) || 1;
      return { key: c.key, title: c.title, points: c.points, additive: true, status: "complete", score: r1((earned / full) * c.points), incompleteReason: null, measuredShare: share, tiles, notApplicable };
    }
    if (applicable === 0) reason = measured.length === 0 && tiles.some((t) => t.outcome.status === "waiting_on_baseline") ? "waiting_on_athlete_baseline" : "nothing_measurable_in_this_clip";
    else if (nnMissing.length) reason = `non_negotiable_not_measured:${nnMissing.map((t) => t.key).join(",")}`;
    else if (share < INCOMPLETE_MIN_SHARE) reason = "too_many_tiles_not_measured";
    const score = reason ? null : r1((measured.reduce((a, t) => a + (t.outcome as { earned: number }).earned, 0) / mPts) * catPts);
    return { key: c.key, title: c.title, points: r1(catPts), additive: false, status: reason ? "incomplete" : "complete", score, incompleteReason: reason, measuredShare: Math.round(share * 1000) / 1000, tiles, notApplicable };
  });

  const scoredRes = categories.filter((c) => !c.additive);
  const done = scoredRes.filter((c) => c.status === "complete").length;
  let total: number | null = null, totalReason: string | null = null;
  if (!spec.showTotal) totalReason = "no_total_for_this_card";
  else if (done < scoredRes.length) totalReason = `incomplete:${done}_of_${scoredRes.length}_categories_measured`;
  else {
    const bonus = categories.filter((c) => c.additive).reduce((a, c) => a + (c.score ?? 0), 0);
    total = r1(Math.min(spec.scaleTo, scoredRes.reduce((a, c) => a + (c.score ?? 0), 0) + bonus));
  }
  return {
    version: CATEGORY_SCORING_VERSION, card: spec.card, audience: o.audience,
    sections: spec.sections.map((s) => ({ key: s.key, title: s.title, note: s.note, tiles: s.tiles.map((t) => ({ key: t.key, name: t.name, reading: t.read(raw) })) })),
    categories, total, totalReason, notes: spec.cardNotes,
  };
}

/* ---------- tolerant readers for the engines' raw result objects ---------- */
type Rawish = { value?: unknown; verdict?: unknown; missingness?: { missing_reason?: string } | null; missing_reason?: unknown; lineage?: Record<string, unknown> } | null | undefined;
export const at = (raw: unknown, path: string): Rawish =>
  path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), raw) as Rawish;
const reasonOf = (t: Rawish) => String(t?.lineage?.reason ?? t?.missingness?.missing_reason ?? t?.missing_reason ?? "not_measured");
const numOf = (t: Rawish) => (typeof t?.value === "number" && Number.isFinite(t.value) ? t.value : null);

/** pass/fail/elite verdict; null verdict with a value = ungraded (no owner standard); pitcher-absent = not applicable. */
export function verdictAt(path: string, o: { naIf?: (reason: string) => boolean } = {}) {
  return (raw: unknown): TileReading => {
    const t = at(raw, path);
    const v = t?.verdict;
    if (v === "pass" || v === "elite") return { kind: "verdict", pass: true, elite: v === "elite" };
    if (v === "fail") return { kind: "verdict", pass: false };
    const reason = reasonOf(t);
    if (o.naIf?.(reason)) return { kind: "not_applicable", reason };
    const n = numOf(t);
    if (n != null) return { kind: "ungraded", value: n, why: "no_owner_standard_yet" };
    return { kind: "missing", reason };
  };
}
/** 0–100 score tiles (higher is better). */
export function scoreAt(path: string) {
  return (raw: unknown): TileReading => {
    const t = at(raw, path); const n = numOf(t);
    return n == null ? { kind: "missing", reason: reasonOf(t) } : { kind: "score", frac: n / 100 };
  };
}
/** Record-only value. */
export function recordAt(path: string, o: { naIf?: (raw: unknown) => string | null } = {}) {
  return (raw: unknown): TileReading => {
    const na = o.naIf?.(raw); if (na) return { kind: "not_applicable", reason: na };
    const t = at(raw, path); const n = numOf(t);
    return n == null ? { kind: "missing", reason: reasonOf(t) } : { kind: "record", value: n };
  };
}
export const missingTile = (reason: string) => (): TileReading => ({ kind: "missing", reason });
export const pitcherAbsent = (reason: string) => reason.startsWith("pitcher_not_in_frame");
