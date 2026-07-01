// _shared/wic/ordering.ts — Phase 2 Fix 5.
// Single canonical ordering authority. No component-level ordering elsewhere.

export type CanonicalSlot =
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
// Constitutional day order — Warm-up → Cross activation (game-day only) →
// Speed → Bat Speed → Lift (full-body sequence) → Practice/Game → Conditioning →
// Cross-sport (offseason back-end only) → Recovery.
import { CARD_REGISTRY } from "./cardRegistry.ts";

const SLOT_ORDER: readonly CanonicalSlot[] = CARD_REGISTRY
  .flatMap((c) => c.slots as readonly string[])
  .filter((s): s is CanonicalSlot =>
    ["warmup", "cross_sport", "speed", "bat_speed", "lift", "supplemental", "conditioning", "recovery"].includes(s),
  );

const LIFT_ROLE_ORDER: readonly CanonicalRole[] = [
  "arm_care",
  "trunk_primer",
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

  return [slotIndex, roleIndex, 0, rx.movement_slug];
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
 * Assign monotonic sequence_order values (0..n-1) so downstream storage and
 * clients render in the canonical order without recomputing.
 */
export function assignSequenceOrder<T extends OrderableRx>(rxs: T[]): (T & { sequence_order: number })[] {
  return sortCanonical(rxs).map((rx, i) => ({ ...rx, sequence_order: i }));
}
