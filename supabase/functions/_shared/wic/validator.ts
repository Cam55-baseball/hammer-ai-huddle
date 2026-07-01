// Workout Validation Engine — every generated workout passes constitutional
// validation before publication. Fatal errors block publication.

import type { WicEngine } from "./constitution.ts";
import { CARD_REGISTRY, displayOrderForSlot, slotToCardType } from "./cardRegistry.ts";

export interface ValidationIssue {
  code: string;
  severity: "fatal" | "warn";
  message: string;
  slug?: string;
}

export interface ValidatorInput {
  phase: string;
  isGameDay: boolean;
  prescriptions: Array<{
    engine?: WicEngine | string;
    slot: string;
    sequence_role: string;
    movement_slug: string;
    movement_name: string;
    sets: number | null;
    reps: number | null;
    why_v2?: unknown;
  }>;
}

export interface ValidatorReport {
  ok: boolean;
  issues: ValidationIssue[];
  buckets: Record<string, number>;
}

const REQUIRED_LIFT_ROLES = new Set([
  "compound_lower",
  "upper_push",
  "upper_pull",
  "trunk_primer",
  "arm_care",
]);

const GAME_DAY_ALLOWED_SLOTS = new Set([
  "movement_prep",
  "warmup",
  "cross_sport",
  "speed",
  "bat_speed",
  "recovery",
]);

export function validate(input: ValidatorInput): ValidatorReport {
  const issues: ValidationIssue[] = [];
  const buckets: Record<string, number> = {};

  const seenSlug = new Set<string>();
  const seenName = new Set<string>();
  const seenSetsReps = new Set<string>();

  for (const rx of input.prescriptions) {
    buckets[rx.sequence_role] = (buckets[rx.sequence_role] ?? 0) + 1;

    if (seenSlug.has(rx.movement_slug)) {
      issues.push({ code: "duplicate_slug", severity: "fatal", message: `Duplicate movement: ${rx.movement_name}`, slug: rx.movement_slug });
    }
    seenSlug.add(rx.movement_slug);

    const nameKey = normalizeName(rx.movement_name);
    if (seenName.has(nameKey)) {
      issues.push({ code: "duplicate_name", severity: "fatal", message: `Duplicate movement name: ${rx.movement_name}`, slug: rx.movement_slug });
    }
    seenName.add(nameKey);

    if (rx.slot === "lift" && rx.sets != null && rx.reps != null) {
      const key = `${rx.sequence_role}|${rx.sets}x${rx.reps}`;
      if (seenSetsReps.has(key)) {
        issues.push({ code: "duplicate_sets_reps", severity: "warn", message: `Same sets×reps repeated in role ${rx.sequence_role}` });
      }
      seenSetsReps.add(key);
    }

    // Game-day suppression enforcement.
    if (input.isGameDay && !GAME_DAY_ALLOWED_SLOTS.has(rx.slot)) {
      issues.push({
        code: "game_day_forbidden_slot",
        severity: "fatal",
        message: `Slot "${rx.slot}" is not allowed on game day.`,
        slug: rx.movement_slug,
      });
    }
  }

  // Full-body enforcement — only when lifts are present and not game day.
  const liftCount = input.prescriptions.filter((r) => r.slot === "lift").length;
  if (!input.isGameDay && liftCount > 0) {
    for (const role of REQUIRED_LIFT_ROLES) {
      if (!buckets[role]) {
        issues.push({ code: "missing_role", severity: "warn", message: `Missing lift role: ${role}` });
      }
    }
  }

  // Phase 3 — Card orchestration validation.
  // Every prescription must resolve to a registered card, and its slot's
  // canonical display order must be strictly non-decreasing across the plan
  // (registry ordering is the ONLY ordering authority).
  let lastOrder = -Infinity;
  const seenCardTypes = new Set<string>();
  const cardTypeSlots = new Map<string, Set<string>>();
  for (const rx of input.prescriptions) {
    const cardType = slotToCardType(rx.slot);
    if (!cardType) {
      issues.push({
        code: "unregistered_slot",
        severity: "fatal",
        message: `Slot "${rx.slot}" is not owned by any card in the Phase 3 registry.`,
        slug: rx.movement_slug,
      });
      continue;
    }
    const order = displayOrderForSlot(rx.slot);
    if (order < lastOrder) {
      issues.push({
        code: "ordering_violation",
        severity: "fatal",
        message: `Slot "${rx.slot}" (order ${order}) appears after a later card (order ${lastOrder}).`,
        slug: rx.movement_slug,
      });
    }
    lastOrder = Math.max(lastOrder, order);
    seenCardTypes.add(cardType);
    if (!cardTypeSlots.has(cardType)) cardTypeSlots.set(cardType, new Set());
    cardTypeSlots.get(cardType)!.add(rx.slot);
  }
  // Card Responsibility Law — a card must not host slots owned by another card.
  for (const [cardType, slots] of cardTypeSlots) {
    for (const s of slots) {
      const owner = slotToCardType(s);
      if (owner && owner !== cardType) {
        issues.push({
          code: "responsibility_violation",
          severity: "fatal",
          message: `Slot "${s}" (owner: ${owner}) leaked into card "${cardType}".`,
        });
      }
    }
  }

  const ok = !issues.some((i) => i.severity === "fatal");
  return { ok, issues, buckets };
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[—–-].*$/g, "").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
