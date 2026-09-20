// v1.2 §B1.1 / §B1.3 — the offseason arc.
// Pure: given a start date, nominal block lengths and a set of off days, lay the
// blocks out so the arc stretches around the off days and no block ever falls
// below its minimum number of loadable days.

import type { BlockName, BlockPlan } from "./types.ts";

export interface BlockSpec {
  name: BlockName;
  /** Nominal loadable days when nothing is in the way. */
  nominalDays: number;
  /** Hard floor. Blocks shift rather than compress below this. */
  minimumDays: number;
}

/** Owner arc, in order. Lengths are loadable days, not calendar days. */
export const ARC: readonly BlockSpec[] = Object.freeze([
  { name: "Build the Base", nominalDays: 28, minimumDays: 21 },
  { name: "Absorb", nominalDays: 21, minimumDays: 14 },
  { name: "Sport Ramp", nominalDays: 21, minimumDays: 14 },
  { name: "Speed & Power", nominalDays: 28, minimumDays: 21 },
  { name: "Sharpen", nominalDays: 14, minimumDays: 10 },
] as const);

export const ARC_NAMES: readonly BlockName[] = ARC.map((b) => b.name);

const DAY = 86_400_000;

export function toMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

export function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number): string {
  return toIso(toMs(iso) + n * DAY);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toMs(b) - toMs(a)) / DAY);
}

/**
 * Lay the arc out from `startDate`. Off days are skipped: they extend the block
 * they fall inside instead of eating one of its loadable days, so the arc
 * stretches and nothing compresses below its minimum.
 */
export function layoutArc(
  startDate: string,
  offDays: readonly string[],
  specs: readonly BlockSpec[] = ARC,
): BlockPlan[] {
  const off = new Set(offDays);
  const out: BlockPlan[] = [];
  let cursor = startDate;
  for (const spec of specs) {
    const blockStart = cursor;
    let loadable = 0;
    let length = 0;
    // Consume calendar days until the block has its nominal loadable days.
    while (loadable < spec.nominalDays) {
      if (!off.has(cursor)) loadable += 1;
      length += 1;
      cursor = addDays(cursor, 1);
    }
    out.push({
      name: spec.name,
      startDate: blockStart,
      endDate: addDays(blockStart, length - 1),
      lengthDays: length,
      workingDays: loadable,
      minimumDays: spec.minimumDays,
    });
  }
  return out;
}

/** Which block a date falls in, and the 1-based day inside it. */
export function locate(arc: readonly BlockPlan[], date: string): { block: BlockPlan; dayInBlock: number } {
  for (const b of arc) {
    if (toMs(date) >= toMs(b.startDate) && toMs(date) <= toMs(b.endDate)) {
      return { block: b, dayInBlock: daysBetween(b.startDate, date) + 1 };
    }
  }
  const last = arc[arc.length - 1];
  return { block: last, dayInBlock: daysBetween(last.startDate, date) + 1 };
}

/** Days into the arc at which a named block nominally begins (no off days). */
export function nominalOffsetOf(name: BlockName, specs: readonly BlockSpec[] = ARC): number {
  let n = 0;
  for (const s of specs) {
    if (s.name === name) return n;
    n += s.nominalDays;
  }
  return 0;
}
