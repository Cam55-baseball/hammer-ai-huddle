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
