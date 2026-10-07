/**
 * Finish-your-profile gaps (owner 2026-10-07). Pure: lists exactly which
 * onboarding answers the planner uses are still missing. Anything already
 * saved is never listed again. Weight counts if either weight_lb or
 * weight_lbs is saved. Never blocks training — display only.
 */

export type GapSection = "body" | "goals" | "level" | "training" | "equipment";

export interface ProfileGapInput {
  anthropometrics?: Record<string, unknown> | null;
  category_goals?: unknown;
  goal_summary?: string | null;
  goal_priority_rank?: number | null;
  competition_level?: string | null;
  lifting_age_years?: number | null;
  lifting_history?: unknown;
  equipment?: string[] | null;
}

export interface ProfileGap {
  section: GapSection;
  /** Plain names of what's missing in this section. */
  items: string[];
  why: string;
  to: string;
}

/** Body measurements the planner reads, in the order they're asked. */
export const BODY_FIELDS: ReadonlyArray<{ key: string; label: string; hint?: string }> = [
  { key: "height_in", label: "Height (in)" },
  { key: "weight_lb", label: "Weight (lb)" },
  { key: "wingspan_in", label: "Wingspan (in)", hint: "Arms out wide, fingertip to fingertip." },
  { key: "arm_total_in", label: "Arm length (in)", hint: "Shoulder joint to wrist crease." },
  { key: "forearm_in", label: "Forearm (in)", hint: "Inside elbow crease to wrist crease." },
  { key: "femur_in", label: "Thigh bone (in)", hint: "Hip joint to knee joint, sitting." },
  { key: "tibia_in", label: "Shin (in)", hint: "Knee joint to floor, sitting." },
  { key: "leg_length_in", label: "Leg length (in)", hint: "Floor to top of hip bone." },
  { key: "torso_in", label: "Torso (in)", hint: "Top of hip bone to top of shoulder." },
  { key: "foot_length_in", label: "Foot length (in)", hint: "Barefoot, heel to longest toe." },
];

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : null;
}

function hasAny(o: unknown): boolean {
  if (Array.isArray(o)) return o.length > 0;
  if (!o || typeof o !== "object") return false;
  return Object.values(o as Record<string, unknown>).some((v) =>
    Array.isArray(v) ? v.length > 0 : v !== null && v !== undefined && v !== "" && v !== false && !(typeof v === "object" && !hasAny(v)),
  );
}

/** Body fields still missing. Weight reads both weight_lb and weight_lbs. */
export function missingBodyFields(a: Record<string, unknown> | null | undefined): string[] {
  const src = a ?? {};
  return BODY_FIELDS.filter((f) =>
    f.key === "weight_lb" ? num(src.weight_lb) == null && num(src.weight_lbs) == null : num(src[f.key]) == null,
  ).map((f) => f.key);
}

export function profileGaps(i: ProfileGapInput): ProfileGap[] {
  const out: ProfileGap[] = [];
  const body = missingBodyFields(i.anthropometrics);
  if (body.length) {
    out.push({
      section: "body",
      items: body.map((k) => BODY_FIELDS.find((f) => f.key === k)!.label.replace(/ \((in|lb)\)$/, "")),
      why: "Your limb lengths help pick the lifts that fit your body.",
      to: "/finish-profile?step=body",
    });
  }
  const cg = (i.category_goals ?? null) as { categoryOrder?: unknown } | null;
  const hasGoals = hasAny(i.category_goals) || !!(i.goal_summary && i.goal_summary.trim());
  const hasOrder = (Array.isArray(cg?.categoryOrder) && cg!.categoryOrder.length > 0) || i.goal_priority_rank != null;
  if (!hasGoals || !hasOrder) {
    const items = [!hasGoals && "Your goals", !hasOrder && "Which goal matters most"].filter(Boolean) as string[];
    out.push({ section: "goals", items, why: "Your goals decide which exercises lead each day.", to: "/onboarding/athlete?edit=goals" });
  }
  if (!(i.competition_level && i.competition_level.trim())) {
    out.push({ section: "level", items: ["Level of play"], why: "Your level sets how hard and how much you train.", to: "/finish-profile?step=level" });
  }
  if (num(i.lifting_age_years) == null && i.lifting_age_years !== 0 && !hasAny(i.lifting_history)) {
    out.push({ section: "training", items: ["Years of lifting"], why: "How long you've lifted sets safe starting weights.", to: "/finish-profile?step=training" });
  }
  if (!(i.equipment && i.equipment.length)) {
    out.push({ section: "equipment", items: ["Your equipment"], why: "So every drill uses gear you actually have.", to: "/onboarding/athlete?edit=equipment" });
  }
  return out;
}

/** Reminder cadence: after "Later", the card returns 3 days on. */
export const REMIND_EVERY_MS = 3 * 24 * 60 * 60 * 1000;
export function shouldShowReminder(laterAt: number | null, now = Date.now()): boolean {
  return laterAt == null || now - laterAt >= REMIND_EVERY_MS;
}
