// Coach prescription "Use instead" safety check (owner request Oct 24).
// Pure. Uses only rules the app already enforces elsewhere (same sources as
// practiceSafety.ts): rest days stay rest days, game days allow only light
// work, in-season no high intensity the day before a game, throwing waits for
// the Pitch Smart rest date, and injury mode blocks replacement.
// It never changes the prescription by itself — it explains and offers the
// safe option (add alongside, or a lighter version).

export type RxCategory =
  | "hitting" | "pitching" | "throwing" | "fielding" | "baserunning"
  | "lift" | "speed" | "conditioning" | "warmup" | "mobility" | "recovery" | "vision";

export type RxVerdict = "allow" | "alongside_only";

export interface RxReplaceFacts {
  category: RxCategory;
  date: string; // YYYY-MM-DD
  intensity: "light" | "standard" | "high";
  throwing: boolean;
  isRestDay: boolean;
  gameOnDate: boolean;
  gameNextDay: boolean;
  inSeason: boolean;
  /** First date throwing is allowed again (Pitch Smart); null = no limit. */
  nextThrowDate: string | null;
  /** Player is in injury mode today. */
  injuryMode: boolean;
  /** The player actually has a Today card of this category on that date. */
  hasCard: boolean;
}

export interface RxReplaceResult {
  verdict: RxVerdict;
  reasons: string[];
  /** Player-facing safe option text when replacement is not allowed. */
  safeOption: string | null;
}

/** Categories that involve throwing and must respect the arm-rest date. */
export const THROWING_CATEGORIES: ReadonlySet<RxCategory> = new Set(["pitching", "throwing"]);

/** Categories with no Hammers Today card — a coach send can only be added alongside. */
export const NO_CARD_CATEGORIES: ReadonlySet<RxCategory> = new Set(["vision"]);

/** Map a coach-prescription category to the wk_prescriptions slots it may replace. */
export function categorySlots(category: RxCategory): string[] {
  switch (category) {
    case "lift": return ["lift", "supplemental"];
    case "speed": return ["speed"];
    case "conditioning": return ["conditioning"];
    case "warmup": return ["warmup", "ub_primer"];
    case "hitting": return ["hitting"];
    case "pitching": return ["pitching"];
    case "throwing": return ["throwing"];
    case "fielding": return ["fielding"];
    case "baserunning": return ["baserunning"];
    case "mobility": return ["mobility"];
    case "recovery": return ["recovery"];
    case "vision": return [];
  }
}

export function checkPrescriptionReplace(f: RxReplaceFacts): RxReplaceResult {
  const reasons: string[] = [];
  const safe: string[] = [];

  if (NO_CARD_CATEGORIES.has(f.category) || !f.hasCard) {
    reasons.push(`There is no ${f.category} card on your plan that day.`);
    safe.push("add it alongside your plan");
  }
  if (f.injuryMode) {
    reasons.push("You're in injury mode right now — only your recovery work can be swapped.");
    safe.push("add it alongside and ask your coach first");
  }
  if (f.isRestDay) {
    reasons.push("That day is your rest day.");
    safe.push("save it for another day");
  }
  if (!f.isRestDay && f.gameOnDate && f.intensity !== "light") {
    reasons.push("You have a game that day — only light work is allowed.");
    safe.push("add a light version alongside");
  }
  if (!f.isRestDay && !f.gameOnDate && f.inSeason && f.gameNextDay && f.intensity === "high") {
    reasons.push("In season, no hard work the day before a game.");
    safe.push("add a lighter version alongside");
  }
  if (!f.isRestDay && f.throwing && f.nextThrowDate && f.date < f.nextThrowDate) {
    reasons.push(`Your arm needs rest from throwing until ${f.nextThrowDate} (pitch-count rest rule).`);
    safe.push(`save it for ${f.nextThrowDate} or later`);
  }

  if (reasons.length === 0) return { verdict: "allow", reasons, safeOption: null };
  return { verdict: "alongside_only", reasons, safeOption: `Safe option: ${[...new Set(safe)].join(", or ")}.` };
}

/** One coach-sent exercise item as stored in coach_prescriptions.exercises. */
export interface CoachRxExercise {
  name?: string;
  sets?: number | null;
  reps?: number | null;
  duration?: number | null;   // seconds
  rest?: number | null;       // seconds
  gear?: string | null;
}

/**
 * Convert a coach prescription's exercises into wk_prescriptions rows so the
 * coach workout runs exactly like a Hammers card: focus mode, Swap, autosave
 * and logging all read/write the same tables, and completed work lands in
 * wk_session_logs → Discipline, load, the learning loop and the coach's plan
 * view. Pure: the caller inserts. Coach rows carry cns_cost 0 (the coach's
 * dose is already what it is) and a why_payload linking the prescription so
 * the "Because" line notes it was coach-sent.
 */
export function coachRxToWkRows(args: {
  userId: string;
  planDate: string;
  category: RxCategory;
  prescriptionId: string;
  coachName: string | null;
  exercises: CoachRxExercise[];
  usedInstead: boolean;
}): Record<string, unknown>[] {
  const slots = categorySlots(args.category);
  const slot = slots[0] ?? args.category;
  const because = args.usedInstead
    ? `Sent by ${args.coachName ?? "your coach"} — you used it instead of your ${args.category} card.`
    : `Sent by ${args.coachName ?? "your coach"} — added alongside your plan.`;
  return args.exercises
    .filter((e) => e && typeof e.name === "string" && e.name.trim().length > 0)
    .map((e, i) => {
      const name = e.name!.trim();
      const duration = typeof e.duration === "number" && e.duration > 0 ? Math.round(e.duration) : null;
      return {
        user_id: args.userId,
        plan_date: args.planDate,
        slot,
        sequence_order: 900 + i, // coach block sorts after generator rows
        sequence_role: "coach",
        movement_slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""),
        movement_name: name,
        phase: "coach",
        sets: typeof e.sets === "number" && e.sets > 0 ? Math.round(e.sets) : null,
        reps: typeof e.reps === "number" && e.reps > 0 ? Math.round(e.reps) : null,
        tempo: null,
        load_pct: null,
        duration_seconds: duration,
        rest_seconds: typeof e.rest === "number" && e.rest > 0 ? Math.round(e.rest) : null,
        distance_feet: null,
        total_reps: null,
        dosage_unit: duration ? "seconds" : "reps",
        cns_cost: 0,
        cns_clamped: false,
        substituted_from_slug: null,
        substitution_reason: null,
        rationale: because,
        status: "pending",
        why_payload: { why: because, coach_rx: args.prescriptionId, generator_version: "coach-rx" },
      };
    });
}
