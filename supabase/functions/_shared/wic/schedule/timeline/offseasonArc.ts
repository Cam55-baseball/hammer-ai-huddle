// Offseason Arc resolver — training-intelligence-v1 §7.1.
// MIRROR SOURCE: src/lib/hammer/roadmap/offseasonArc.ts is a byte-identical copy
// of everything below the header line. Change one, run the mirror test.
//
// Pure: no clock, no I/O, no database. Given the athlete's real offseason length
// (and optionally their pre-season window and planned off days), lay out the
// owner's 6-4-2-4-4 arc scaled to that athlete.

export type ArcBlockKey = "B1" | "B2" | "B3" | "B4" | "B5";

export type ArcPhaseKey = "os_q1" | "os_q2" | "os_q3" | "os_q4";

export interface ArcBlockDef {
  readonly key: ArcBlockKey;
  /** Label the athlete sees. Replaces the old quarter names. */
  readonly label: string;
  /** Legality phase key the engine gates on. */
  readonly phaseKey: ArcPhaseKey;
  /** Phase key the dose is resolved from (B3 maintains on the in-season envelope). */
  readonly dosePhaseKey: ArcPhaseKey | "in_season";
  readonly share: number;
  readonly minimumWeeks: number;
  readonly aim: string;
}

/** §7.1 table. Order is the arc order and never changes. */
export const ARC_BLOCKS: readonly ArcBlockDef[] = Object.freeze([
  {
    key: "B1",
    label: "Build the Base",
    phaseKey: "os_q1",
    dosePhaseKey: "os_q1",
    share: 0.3,
    minimumWeeks: 3,
    aim: "tissue capacity and heavy triples",
  },
  {
    key: "B2",
    label: "Absorb",
    phaseKey: "os_q2",
    dosePhaseKey: "os_q2",
    share: 0.2,
    minimumWeeks: 2,
    aim: "double eccentric, land and hold",
  },
  {
    key: "B3",
    label: "Sport Ramp",
    phaseKey: "os_q2",
    dosePhaseKey: "in_season",
    share: 0.1,
    minimumWeeks: 0,
    aim: "skill volume climbs, lifting holds at maintain dose",
  },
  {
    key: "B4",
    label: "Speed & Power",
    phaseKey: "os_q3",
    dosePhaseKey: "os_q3",
    share: 0.2,
    minimumWeeks: 2,
    aim: "banded velocity and reactive jumps",
  },
  {
    key: "B5",
    label: "Sharpen",
    phaseKey: "os_q4",
    dosePhaseKey: "os_q4",
    share: 0.2,
    minimumWeeks: 1,
    aim: "overcoming isometrics, heavy sled, light jumps",
  },
] as const);

export const ARC_BLOCK_BY_KEY: Readonly<Record<ArcBlockKey, ArcBlockDef>> = Object.freeze(
  Object.fromEntries(ARC_BLOCKS.map((b) => [b.key, b])) as Record<ArcBlockKey, ArcBlockDef>,
);

export type ArcWeeks = Record<ArcBlockKey, number>;

const DAY_MS = 86_400_000;

function isoToMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function msToIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function arcAddDays(iso: string, n: number): string {
  return msToIso(isoToMs(iso) + n * DAY_MS);
}

export function arcDaysBetween(a: string, b: string): number {
  return Math.round((isoToMs(b) - isoToMs(a)) / DAY_MS);
}

/** §7.1 — how many weeks B3 may have at this offseason length. */
function b3CapWeeks(totalWeeks: number): number {
  if (totalWeeks >= 16) return Math.round(0.1 * totalWeeks);
  if (totalWeeks >= 12) return 1;
  return 0;
}

/**
 * Scale the arc to an offseason of `totalWeeks`.
 *
 * Rounds share × W, then enforces the minimums by borrowing from B3 first and
 * B1 second (§7.1). Under 8 weeks there is only time for B1 and B5 — B2 and B4
 * content stays locked because it cannot be earned.
 */
export function scaleArcWeeks(totalWeeks: number): ArcWeeks {
  const W = Math.max(0, Math.floor(totalWeeks));
  if (W <= 0) return { B1: 0, B2: 0, B3: 0, B4: 0, B5: 0 };

  if (W < 8) {
    const b5 = Math.min(W, Math.max(1, Math.round(0.2 * W)));
    return { B1: W - b5, B2: 0, B3: 0, B4: 0, B5: b5 };
  }

  const cap3 = b3CapWeeks(W);
  const weeks: ArcWeeks = {
    B1: Math.round(0.3 * W),
    B2: Math.round(0.2 * W),
    B3: cap3,
    B4: Math.round(0.2 * W),
    B5: Math.round(0.2 * W),
  };

  const total = (w: ArcWeeks) => w.B1 + w.B2 + w.B3 + w.B4 + w.B5;

  // Reconcile rounding drift. Extra weeks go to B3 up to its cap, then to B1.
  // Missing weeks come out of B1 first (it is the longest block and holds the
  // §7.1 B3 length fixed), then B3, then the remaining blocks in a fixed order.
  let drift = W - total(weeks);
  if (drift > 0) {
    const room = Math.max(0, cap3 - weeks.B3);
    const add = Math.min(drift, room);
    weeks.B3 += add;
    drift -= add;
    weeks.B1 += drift;
    drift = 0;
  } else if (drift < 0) {
    for (const donor of ["B1", "B3", "B5", "B2", "B4"] as ArcBlockKey[]) {
      if (drift >= 0) break;
      const floor = ARC_BLOCK_BY_KEY[donor].minimumWeeks;
      const spare = weeks[donor] - floor;
      if (spare <= 0) continue;
      const take = Math.min(spare, -drift);
      weeks[donor] -= take;
      drift += take;
    }
  }


  // Enforce minimums. Donors in fixed order: B3, then B1, then the blocks that
  // still sit above their own minimum (B5, B2, B4) so the result is deterministic.
  const donorOrder: ArcBlockKey[] = ["B3", "B1", "B5", "B2", "B4"];
  for (const def of ARC_BLOCKS) {
    let short = def.minimumWeeks - weeks[def.key];
    if (short <= 0) continue;
    for (const donor of donorOrder) {
      if (short <= 0) break;
      if (donor === def.key) continue;
      const floor = ARC_BLOCK_BY_KEY[donor].minimumWeeks;
      const spare = weeks[donor] - floor;
      if (spare <= 0) continue;
      const moved = Math.min(spare, short);
      weeks[donor] -= moved;
      weeks[def.key] += moved;
      short -= moved;
    }
  }

  return weeks;
}

export interface ArcSegment {
  readonly key: ArcBlockKey;
  readonly label: string;
  readonly phaseKey: ArcPhaseKey;
  readonly dosePhaseKey: ArcPhaseKey | "in_season";
  readonly startDate: string;
  readonly endDate: string;
  /** Calendar days, planned off days included. */
  readonly lengthDays: number;
  /** Loadable days after planned off days are removed. */
  readonly workingDays: number;
  readonly weeks: number;
}

export interface ResolveArcInput {
  /** First day of the offseason (day after the post-season ends). */
  readonly offseasonStart: string;
  /** First game of the next season. B5 ends the day before it. */
  readonly firstGameDate?: string | null;
  /** When pre-season dates exist, B5 is exactly the pre-season window (§7.1). */
  readonly preSeasonStart?: string | null;
  /** Planned zero-load days. The arc stretches around them (v1.2 §B1.3). */
  readonly offDays?: readonly string[] | null;
  /** Direct override when the athlete gives an offseason length instead of dates. */
  readonly offseasonWeeks?: number | null;
}

export interface ResolvedArc {
  readonly segments: readonly ArcSegment[];
  readonly totalWeeks: number;
  readonly weeks: ArcWeeks;
  /** True when B2/B4 content is locked out because the offseason is under 8 weeks. */
  readonly shortOffseason: boolean;
}

/**
 * Lay the scaled arc onto real dates. Planned off days extend the block they
 * fall inside instead of eating one of its loadable days, so the arc stretches
 * and no block compresses below its minimum.
 */
export function resolveOffseasonArc(input: ResolveArcInput): ResolvedArc {
  const start = input.offseasonStart;
  const off = new Set(input.offDays ?? []);

  const preStart = input.preSeasonStart ?? null;
  const arcEndExclusive = preStart ?? input.firstGameDate ?? null;

  let totalWeeks: number;
  if (typeof input.offseasonWeeks === "number" && input.offseasonWeeks > 0) {
    totalWeeks = Math.floor(input.offseasonWeeks);
  } else if (arcEndExclusive) {
    const days = Math.max(0, arcDaysBetween(start, arcEndExclusive));
    const loadable = countLoadable(start, days, off);
    totalWeeks = Math.max(1, Math.round(loadable / 7));
  } else {
    totalWeeks = 0;
  }

  // With a pre-season window, B5 owns it and B1–B4 share the weeks before it.
  const preWeeks =
    preStart && input.firstGameDate
      ? Math.max(1, Math.round(Math.max(0, arcDaysBetween(preStart, input.firstGameDate)) / 7))
      : 0;

  const weeks = scaleArcWeeks(totalWeeks + (preWeeks > 0 ? preWeeks : 0));
  if (preWeeks > 0) {
    // Re-balance: B5 is fixed to the pre-season window; the rest keep their shares.
    const before = scaleArcWeeks(totalWeeks);
    weeks.B1 = before.B1;
    weeks.B2 = before.B2;
    weeks.B3 = before.B3;
    weeks.B4 = before.B4;
    weeks.B5 = preWeeks;
  }

  const segments: ArcSegment[] = [];
  let cursor = start;
  for (const def of ARC_BLOCKS) {
    const w = weeks[def.key];
    if (w <= 0) continue;
    const target = w * 7;
    let loadable = 0;
    let length = 0;
    while (loadable < target) {
      if (!off.has(arcAddDays(cursor, length))) loadable += 1;
      length += 1;
    }
    segments.push({
      key: def.key,
      label: def.label,
      phaseKey: def.phaseKey,
      dosePhaseKey: def.dosePhaseKey,
      startDate: cursor,
      endDate: arcAddDays(cursor, length - 1),
      lengthDays: length,
      workingDays: loadable,
      weeks: w,
    });
    cursor = arcAddDays(cursor, length);
  }

  return {
    segments,
    totalWeeks: totalWeeks + (preWeeks > 0 ? preWeeks : 0),
    weeks,
    shortOffseason: totalWeeks > 0 && totalWeeks < 8,
  };
}

function countLoadable(start: string, days: number, off: Set<string>): number {
  let n = 0;
  for (let i = 0; i < days; i += 1) {
    if (!off.has(arcAddDays(start, i))) n += 1;
  }
  return n;
}

export interface ArcPosition {
  readonly block: ArcSegment;
  /** 1-based calendar day inside the block. */
  readonly dayInBlock: number;
  /** 1-based week inside the block, capped at 4 for the dose wave. */
  readonly weekInBlock: number;
}

/** Which block a date falls in. Dates before the arc clamp to B1, after it to the last block. */
export function locateInArc(arc: ResolvedArc, date: string): ArcPosition | null {
  if (arc.segments.length === 0) return null;
  const first = arc.segments[0];
  const last = arc.segments[arc.segments.length - 1];
  const target =
    arcDaysBetween(first.startDate, date) < 0
      ? first
      : arc.segments.find(
          (s) => arcDaysBetween(s.startDate, date) >= 0 && arcDaysBetween(date, s.endDate) >= 0,
        ) ?? last;
  const dayInBlock = Math.max(1, arcDaysBetween(target.startDate, date) + 1);
  const weekInBlock = Math.min(4, Math.max(1, Math.ceil(dayInBlock / 7)));
  return { block: target, dayInBlock, weekInBlock };
}
