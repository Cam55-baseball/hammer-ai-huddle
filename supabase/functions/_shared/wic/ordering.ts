// _shared/wic/ordering.ts — Phase 2 Fix 5.
// Single canonical ordering authority. No component-level ordering elsewhere.

export type CanonicalSlot =
  | "movement_prep"
  | "warmup"
  | "cross_sport"
  | "speed"
  | "bat_speed"
  | "lift"
  | "supplemental"
  | "conditioning"
  | "recovery";

export type CanonicalRole =
  | "arm_care"
  | "trunk_primer"
  // BUG-3 (Stage 1) — `rotation` is a live sequence_role in the catalog. It
  // sits after the trunk primer: rotational output is primed, then expressed,
  // before the day's compound work.
  | "rotation"
  | "compound_lower"
  | "unilateral_lower"
  | "upper_push"
  | "upper_pull"
  | "carry_antirotation"
  | "trunk_finisher"
  | "supplemental"
  | "speed"
  | "bat_speed"
  | "conditioning"
  | "cross_sport";

// Phase 3 — SLOT_ORDER derived from canonical card registry.
// Constitutional day order — Movement prep → Warm-up → Cross activation
// (game-day only) → Speed → Bat Speed → Lift (full-body sequence) →
// Practice/Game → Conditioning → Cross-sport (offseason back-end only) →
// Recovery.
import { CARD_REGISTRY } from "./cardRegistry.ts";

const SLOT_ORDER: readonly CanonicalSlot[] = CARD_REGISTRY
  .flatMap((c) => c.slots as readonly string[])
  .filter((s): s is CanonicalSlot =>
    ["movement_prep", "warmup", "cross_sport", "speed", "bat_speed", "lift", "supplemental", "conditioning", "recovery"].includes(s),
  );

const LIFT_ROLE_ORDER: readonly CanonicalRole[] = [
  "arm_care",
  "trunk_primer",
  "rotation",
  "compound_lower",
  "unilateral_lower",
  "upper_push",
  "upper_pull",
  "carry_antirotation",
  "trunk_finisher",
  "supplemental",
];


export interface OrderableRx {
  slot: string;
  sequence_role?: string | null;
  /** Preserved coach/manual ordering. Mirrors the client key in src/lib/wic/ordering.ts. */
  sequence_order?: number;
  movement_slug: string;
  why_payload?: { placement?: string } & Record<string, unknown>;
}

/**
 * Compute a deterministic global sequence key so ordering is a total function
 * of (slot, placement, role, slug). No ties, no JSX-driven drift.
 */
export function canonicalSortKey(rx: OrderableRx): [number, number, number, string] {
  const placement = (rx.why_payload?.placement as string) ?? "";
  const isEarlyActivation = rx.slot === "cross_sport" && placement === "early_activation";
  const isOffseasonBackEnd = rx.slot === "cross_sport" && placement === "offseason_back_end";

  let slotIndex: number;
  if (isEarlyActivation) {
    slotIndex = SLOT_ORDER.indexOf("cross_sport"); // top of day
  } else if (isOffseasonBackEnd) {
    slotIndex = SLOT_ORDER.length; // append past everything
  } else {
    const i = SLOT_ORDER.indexOf(rx.slot as CanonicalSlot);
    slotIndex = i === -1 ? SLOT_ORDER.length + 1 : i;
  }

  const roleIndex =
    rx.slot === "lift" && rx.sequence_role
      ? Math.max(0, LIFT_ROLE_ORDER.indexOf(rx.sequence_role as CanonicalRole))
      : 0;

  return [slotIndex, roleIndex, rx.sequence_order ?? 0, rx.movement_slug];
}

export function sortCanonical<T extends OrderableRx>(rxs: T[]): T[] {
  return [...rxs].sort((a, b) => {
    const ka = canonicalSortKey(a);
    const kb = canonicalSortKey(b);
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] < kb[i]) return -1;
      if (ka[i] > kb[i]) return 1;
    }
    return 0;
  });
}

/**
 * "Never ignore what a coach has done."
 *
 * Regeneration must not silently revert a manual reorder back to the
 * canonical (alphabetical-within-role) default. Prior rows whose
 * `why_payload.manual_order === true` keep their stored `sequence_order`;
 * everything else falls back to the canonical key.
 */
export interface PriorOrderRow {
  slot: string;
  movement_slug: string;
  sequence_order: number | null;
  why_payload?: Record<string, unknown> | null;
}

export function manualOrderKey(slot: string, slug: string): string {
  return `${slot}::${slug}`;
}

export function applyManualOrder<T extends OrderableRx>(
  rxs: T[],
  priorRows: readonly PriorOrderRow[],
): T[] {
  const pinned = new Map<string, number>();
  for (const row of priorRows) {
    const manual = (row.why_payload as { manual_order?: unknown } | null | undefined)
      ?.manual_order === true;
    if (!manual || row.sequence_order == null) continue;
    pinned.set(manualOrderKey(row.slot, row.movement_slug), row.sequence_order);
  }
  if (pinned.size === 0) return rxs;

  return rxs.map((rx) => {
    const kept = pinned.get(manualOrderKey(rx.slot, rx.movement_slug));
    if (kept == null) return rx;
    const wp = { ...((rx.why_payload ?? {}) as Record<string, unknown>) };
    wp.manual_order = true;
    wp.manual_order_source = "coach";
    return { ...rx, sequence_order: kept, why_payload: wp } as T;
  });
}

/**
 * Assign monotonic sequence_order values (0..n-1) so downstream storage and
 * clients render in the canonical order without recomputing.
 */
export function assignSequenceOrder<T extends OrderableRx>(rxs: T[]): (T & { sequence_order: number })[] {
  // Items a coach pinned (marked by applyManualOrder) claim their stored slot
  // in the final list first; the canonical order fills every remaining slot.
  const isPinned = (rx: T) =>
    (rx.why_payload as { manual_order?: unknown } | undefined)?.manual_order === true &&
    typeof rx.sequence_order === "number";

  const pinned = rxs.filter(isPinned).sort((a, b) => (a.sequence_order! - b.sequence_order!));
  if (pinned.length === 0) {
    return sortCanonical(rxs).map((rx, i) => ({ ...rx, sequence_order: i }));
  }

  const rest = sortCanonical(rxs.filter((rx) => !isPinned(rx)));
  const total = rxs.length;
  const out: (T | undefined)[] = new Array(total).fill(undefined);

  for (const rx of pinned) {
    let idx = Math.max(0, Math.min(total - 1, rx.sequence_order as number));
    while (out[idx] !== undefined) idx = (idx + 1) % total; // collision → next free
    out[idx] = rx;
  }
  let cursor = 0;
  for (const rx of rest) {
    while (out[cursor] !== undefined) cursor++;
    out[cursor] = rx;
  }

  return (out as T[]).map((rx, i) => ({ ...rx, sequence_order: i }));
}
