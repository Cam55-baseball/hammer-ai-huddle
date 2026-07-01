// Workout Validation Engine — every generated workout passes constitutional
// validation before publication. Fatal errors block publication.

import type { WicEngine } from "./constitution.ts";

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

  const ok = !issues.some((i) => i.severity === "fatal");
  return { ok, issues, buckets };
}

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[—–-].*$/g, "").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
