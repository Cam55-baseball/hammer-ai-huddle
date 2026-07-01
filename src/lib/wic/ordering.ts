// src/lib/wic/ordering.ts — Phase 2 Fix 5 client mirror.
// Client-side canonical ordering must never diverge from the server's.
// Keep this file in shape-parity with supabase/functions/_shared/wic/ordering.ts.

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

// Phase 3 — SLOT_ORDER is derived from the canonical card registry so
// ordering can never drift from card orchestration. Speed precedes Bat Speed
// per Phase 3 canonical training flow.
import { CARD_REGISTRY } from "./cardRegistry";

const REGISTRY_SLOTS: readonly CanonicalSlot[] = CARD_REGISTRY
  .flatMap((c) => c.slots as readonly string[])
  .filter((s): s is CanonicalSlot =>
    ["warmup", "cross_sport", "speed", "bat_speed", "lift", "supplemental", "conditioning", "recovery"].includes(s),
  );

const SLOT_ORDER: readonly CanonicalSlot[] = REGISTRY_SLOTS;

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
  sequence_order?: number;
  movement_slug: string;
  why_payload?: { placement?: string } & Record<string, unknown>;
}

export function canonicalSortKey(rx: OrderableRx): [number, number, number, string] {
  const placement = (rx.why_payload?.placement as string) ?? "";
  const isEarlyActivation = rx.slot === "cross_sport" && placement === "early_activation";
  const isOffseasonBackEnd = rx.slot === "cross_sport" && placement === "offseason_back_end";
  let slotIndex: number;
  if (isEarlyActivation) slotIndex = SLOT_ORDER.indexOf("cross_sport");
  else if (isOffseasonBackEnd) slotIndex = SLOT_ORDER.length;
  else {
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
