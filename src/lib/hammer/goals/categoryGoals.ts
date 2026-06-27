/**
 * Per-Category Ranked Goals — canonical model.
 *
 * Constitutional rules:
 *  - Categories are fixed (speed/power/throwing/hitting/fielding). The athlete
 *    ranks ALL five in order of importance (1=most important, 5=least).
 *  - Each category may carry one optional `intent` selected from a preset list
 *    (free text is intentionally NOT supported here — Hammer must be able to
 *    deterministically reason about it).
 *  - Missingness is preserved: when nothing has been set, projection returns
 *    `null`. A partial ranking (some categories ranked, others not) is treated
 *    as missing because Hammer requires a total order to personalise.
 *  - Read-path callers must use `rankedCategories(...)` / `intentFor(...)` —
 *    never index into the raw array directly.
 */

export const CATEGORY_KEYS = ["speed", "power", "throwing", "hitting", "fielding"] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  speed: "Speed",
  power: "Power",
  throwing: "Throwing",
  hitting: "Hitting",
  fielding: "Fielding",
};

export const CATEGORY_DESCRIPTIONS: Record<CategoryKey, string> = {
  speed: "Sprint, acceleration, base-running quickness",
  power: "Strength, jump, rotational force",
  throwing: "Arm health, velocity, command",
  hitting: "Bat speed, contact quality, plate discipline",
  fielding: "Reactions, footwork, glove work",
};

/** Preset intents per category. Keep tight so the planner can act on them. */
export const CATEGORY_INTENTS: Record<CategoryKey, ReadonlyArray<{ id: string; label: string }>> = {
  speed: [
    { id: "max_velocity", label: "Add top-end speed" },
    { id: "acceleration", label: "Sharper first 10 yards" },
    { id: "base_stealing", label: "Steal more bases" },
    { id: "conditioning", label: "Stay fast late in games" },
  ],
  power: [
    { id: "rotational_power", label: "Rotational power" },
    { id: "lower_body_strength", label: "Lower-body strength" },
    { id: "upper_body_strength", label: "Upper-body strength" },
    { id: "vertical_jump", label: "Vertical jump" },
  ],
  throwing: [
    { id: "velocity", label: "Add throwing velocity" },
    { id: "command", label: "Improve command" },
    { id: "arm_health", label: "Protect arm health" },
    { id: "pitching_arsenal", label: "Develop pitching arsenal" },
  ],
  hitting: [
    { id: "bat_speed", label: "Bat speed" },
    { id: "contact_quality", label: "Hard contact" },
    { id: "plate_discipline", label: "Plate discipline" },
    { id: "power_hitting", label: "Power / extra-base hits" },
  ],
  fielding: [
    { id: "range", label: "Expand range" },
    { id: "hands", label: "Cleaner hands" },
    { id: "footwork", label: "Footwork & first-step" },
    { id: "position_iq", label: "Position-specific IQ" },
  ],
};

export interface CategoryGoal {
  readonly category: CategoryKey;
  /** 1-based, total order across all five categories. */
  readonly rank: number;
  readonly intent: string | null;
  readonly notes?: string | null;
}

export interface CategoryGoalsPayload {
  readonly version: 1;
  readonly goals: ReadonlyArray<CategoryGoal>;
  readonly updatedAt: string;
}

/* ── Normalization / validation ─────────────────────────────────────────── */

/**
 * Coerces any inbound shape (legacy, partial, malformed) into a validated
 * payload OR null when the ranking is not total/well-formed.
 */
export function normalizeCategoryGoals(raw: unknown): CategoryGoalsPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { goals?: unknown; updatedAt?: unknown };
  const list = Array.isArray(obj.goals) ? obj.goals : Array.isArray(raw) ? (raw as unknown[]) : null;
  if (!list) return null;
  const seen = new Set<CategoryKey>();
  const goals: CategoryGoal[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const r = item as { category?: unknown; rank?: unknown; intent?: unknown; notes?: unknown };
    if (typeof r.category !== "string") continue;
    const cat = r.category as CategoryKey;
    if (!CATEGORY_KEYS.includes(cat) || seen.has(cat)) continue;
    if (typeof r.rank !== "number" || !Number.isFinite(r.rank)) continue;
    const intentRaw = typeof r.intent === "string" ? r.intent : null;
    const intentLegal =
      intentRaw && CATEGORY_INTENTS[cat].some((p) => p.id === intentRaw) ? intentRaw : null;
    seen.add(cat);
    goals.push({
      category: cat,
      rank: Math.round(r.rank),
      intent: intentLegal,
      notes: typeof r.notes === "string" ? r.notes : null,
    });
  }
  if (goals.length !== CATEGORY_KEYS.length) return null; // partial ranking → missing
  // Renumber to canonical 1..N in ascending rank order to guarantee a total.
  goals.sort((a, b) => a.rank - b.rank);
  const canonical = goals.map((g, i) => ({ ...g, rank: i + 1 }));
  return {
    version: 1,
    goals: canonical,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

/* ── Read helpers ────────────────────────────────────────────────────────── */

export function rankedCategories(
  payload: CategoryGoalsPayload | null,
): ReadonlyArray<CategoryKey> {
  if (!payload) return [];
  return payload.goals.slice().sort((a, b) => a.rank - b.rank).map((g) => g.category);
}

export function rankFor(
  payload: CategoryGoalsPayload | null,
  category: CategoryKey,
): number | null {
  if (!payload) return null;
  const g = payload.goals.find((x) => x.category === category);
  return g ? g.rank : null;
}

export function intentFor(
  payload: CategoryGoalsPayload | null,
  category: CategoryKey,
): string | null {
  if (!payload) return null;
  const g = payload.goals.find((x) => x.category === category);
  return g?.intent ?? null;
}

/** Map a daily-plan modality token to the goal-category that owns it. */
export function modalityToCategory(modality: string): CategoryKey | null {
  switch (modality) {
    case "speed":
    case "baserunning":
      return "speed";
    case "strength":
      return "power";
    case "throwing":
      return "throwing";
    case "hitting":
      return "hitting";
    case "defense":
      return "fielding";
    default:
      return null;
  }
}

/** Convert a payload to a stable, human-readable summary used in lineage strings. */
export function summarizeGoals(payload: CategoryGoalsPayload | null): string | null {
  if (!payload) return null;
  return rankedCategories(payload)
    .map((c, i) => {
      const intent = intentFor(payload, c);
      const intentLabel = intent
        ? CATEGORY_INTENTS[c].find((p) => p.id === intent)?.label
        : null;
      return `${i + 1}. ${CATEGORY_LABELS[c]}${intentLabel ? ` — ${intentLabel}` : ""}`;
    })
    .join(" · ");
}

/** Equality check for de-bouncing writes. */
export function goalsEqual(
  a: CategoryGoalsPayload | null,
  b: CategoryGoalsPayload | null,
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.goals.length !== b.goals.length) return false;
  for (let i = 0; i < a.goals.length; i++) {
    const x = a.goals[i];
    const y = b.goals[i];
    if (x.category !== y.category || x.rank !== y.rank || (x.intent ?? null) !== (y.intent ?? null))
      return false;
  }
  return true;
}
