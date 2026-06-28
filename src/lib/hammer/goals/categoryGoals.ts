/**
 * Per-Category Ranked Goals — canonical model.
 *
 * V1 (legacy) and V2 (current) shapes are both stored in
 * `athlete_context.category_goals`. New writes are V2; reads tolerate both
 * by deriving a V1-equivalent ranked view from a V2 payload so downstream
 * Hammer code (dailyPlan.ts, decisionFilters) keeps working unchanged.
 *
 * V2 model (sport + discipline aware, 1–2 sub-goals per category, 70/30 split):
 *   {
 *     version: 2,
 *     baseball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals },
 *     softball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals },
 *     updatedAt: ISO,
 *   }
 *
 * Constitutional rules:
 *  - Reads MUST use `rankedCategories(...)` / `intentFor(...)` (V1 view) or
 *    the explicit `getV2(...)` / `scoreSkillLever(...)` (V2 view).
 *  - Missingness preserved — return null when there's not enough signal.
 *  - V2 sub-goals are validated against the catalog at normalize time.
 */
import {
  type CategoryKey as CatalogCategoryKey,
  type Discipline,
  type Sport,
  type SubGoal,
  type SkillLever,
  legalSubGoalIds,
  findSubGoal,
} from "./subGoalCatalog";

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

/** Legacy intents — preserved for back-compat with existing rows / Hammer reads. */
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

/* ── V2 model ─────────────────────────────────────────────────────────────── */

export type GoalRank = "primary" | "secondary";
export const RANK_WEIGHT: Record<GoalRank, number> = { primary: 0.7, secondary: 0.3 };

export interface SubGoalPick {
  readonly id: string;
  readonly rank: GoalRank;
}

export interface DisciplineGoals {
  readonly speed?: ReadonlyArray<SubGoalPick>;
  readonly power?: ReadonlyArray<SubGoalPick>;
  readonly throwing?: ReadonlyArray<SubGoalPick>;
  readonly hitting?: ReadonlyArray<SubGoalPick>;
  readonly fielding?: ReadonlyArray<SubGoalPick>;
  readonly pitching?: ReadonlyArray<SubGoalPick>;
}

export interface CategoryGoalsPayloadV2 {
  readonly version: 2;
  readonly baseball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals };
  readonly softball?: { position?: DisciplineGoals; pitcher?: DisciplineGoals };
  readonly updatedAt: string;
}

/* ── V2 normalization ─────────────────────────────────────────────────────── */

function normalizePicks(
  sport: Sport,
  discipline: Discipline,
  category: CatalogCategoryKey,
  raw: unknown,
): SubGoalPick[] {
  if (!Array.isArray(raw)) return [];
  const legal = legalSubGoalIds(sport, discipline, category);
  const seenIds = new Set<string>();
  const out: SubGoalPick[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as { id?: unknown; rank?: unknown };
    if (typeof r.id !== "string" || !legal.has(r.id) || seenIds.has(r.id)) continue;
    const rank: GoalRank = r.rank === "secondary" ? "secondary" : "primary";
    seenIds.add(r.id);
    out.push({ id: r.id, rank });
    if (out.length >= 2) break; // max 2 picks per category
  }
  // Guarantee at most one primary + one secondary; demote duplicates.
  let primarySeen = false;
  return out.map((p) => {
    if (p.rank === "primary") {
      if (primarySeen) return { ...p, rank: "secondary" as const };
      primarySeen = true;
    }
    return p;
  });
}

function normalizeDiscipline(
  sport: Sport,
  discipline: Discipline,
  raw: unknown,
): DisciplineGoals | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const out: DisciplineGoals = {
    speed: normalizePicks(sport, discipline, "speed", r.speed),
    power: normalizePicks(sport, discipline, "power", r.power),
    throwing: normalizePicks(sport, discipline, "throwing", r.throwing),
    hitting: normalizePicks(sport, discipline, "hitting", r.hitting),
    fielding: normalizePicks(sport, discipline, "fielding", r.fielding),
    pitching: normalizePicks(sport, discipline, "pitching", r.pitching),
  };
  const hasAny = Object.values(out).some((v) => Array.isArray(v) && v.length > 0);
  return hasAny ? out : null;
}

export function normalizeCategoryGoalsV2(raw: unknown): CategoryGoalsPayloadV2 | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { version?: unknown; baseball?: unknown; softball?: unknown; updatedAt?: unknown };
  if (obj.version !== 2) return null;
  const baseball = obj.baseball && typeof obj.baseball === "object"
    ? {
        position: normalizeDiscipline("baseball", "position", (obj.baseball as Record<string, unknown>).position) ?? undefined,
        pitcher: normalizeDiscipline("baseball", "pitcher", (obj.baseball as Record<string, unknown>).pitcher) ?? undefined,
      }
    : undefined;
  const softball = obj.softball && typeof obj.softball === "object"
    ? {
        position: normalizeDiscipline("softball", "position", (obj.softball as Record<string, unknown>).position) ?? undefined,
        pitcher: normalizeDiscipline("softball", "pitcher", (obj.softball as Record<string, unknown>).pitcher) ?? undefined,
      }
    : undefined;
  const hasAny =
    !!(baseball?.position || baseball?.pitcher || softball?.position || softball?.pitcher);
  if (!hasAny) return null;
  return {
    version: 2,
    ...(baseball ? { baseball } : {}),
    ...(softball ? { softball } : {}),
    updatedAt: typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

/* ── V1 normalization (legacy) ────────────────────────────────────────────── */

function normalizeV1Raw(raw: unknown): CategoryGoalsPayload | null {
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
  if (goals.length !== CATEGORY_KEYS.length) return null;
  goals.sort((a, b) => a.rank - b.rank);
  const canonical = goals.map((g, i) => ({ ...g, rank: i + 1 }));
  return {
    version: 1,
    goals: canonical,
    updatedAt:
      typeof obj.updatedAt === "string" ? obj.updatedAt : new Date().toISOString(),
  };
}

/** Derive a V1-equivalent ranked view from a V2 payload. */
function v2ToV1(v2: CategoryGoalsPayloadV2): CategoryGoalsPayload {
  // Aggregate weighted presence per V1 category across all enabled discipline panes.
  const score: Record<CategoryKey, number> = { speed: 0, power: 0, throwing: 0, hitting: 0, fielding: 0 };
  const firstIntent: Partial<Record<CategoryKey, string>> = {};

  const accept = (disc: Discipline, sport: Sport, dg: DisciplineGoals | undefined) => {
    if (!dg) return;
    const consume = (cat: CategoryKey, picks: ReadonlyArray<SubGoalPick> | undefined) => {
      if (!picks) return;
      for (const p of picks) {
        score[cat] += RANK_WEIGHT[p.rank];
        if (!firstIntent[cat]) firstIntent[cat] = p.id;
      }
    };
    consume("speed", dg.speed);
    consume("power", dg.power);
    consume("hitting", dg.hitting);
    consume("fielding", dg.fielding);
    // Pitcher pane: Pitching picks contribute to "throwing" V1 bucket.
    if (disc === "pitcher") {
      consume("throwing", dg.pitching);
    } else {
      consume("throwing", dg.throwing);
    }
    void sport;
  };

  if (v2.baseball) {
    accept("position", "baseball", v2.baseball.position);
    accept("pitcher", "baseball", v2.baseball.pitcher);
  }
  if (v2.softball) {
    accept("position", "softball", v2.softball.position);
    accept("pitcher", "softball", v2.softball.pitcher);
  }

  const ordered = (Object.keys(score) as CategoryKey[]).sort((a, b) => {
    if (score[b] !== score[a]) return score[b] - score[a];
    return CATEGORY_KEYS.indexOf(a) - CATEGORY_KEYS.indexOf(b);
  });

  const goals: CategoryGoal[] = ordered.map((cat, i) => ({
    category: cat,
    rank: i + 1,
    intent: firstIntent[cat] ?? null,
  }));

  return { version: 1, goals, updatedAt: v2.updatedAt };
}

/**
 * Single canonical normalizer. Detects V2 and derives a V1 view automatically;
 * tolerates legacy V1 payloads unchanged. Returns null only when the data is
 * truly insufficient for Hammer to plan from.
 */
export function normalizeCategoryGoals(raw: unknown): CategoryGoalsPayload | null {
  const v2 = normalizeCategoryGoalsV2(raw);
  if (v2) return v2ToV1(v2);
  return normalizeV1Raw(raw);
}

/** Read the raw V2 payload (or null) — for components that need the full sub-goal detail. */
export function getV2(raw: unknown): CategoryGoalsPayloadV2 | null {
  return normalizeCategoryGoalsV2(raw);
}

/* ── V2 scoring (Hammer prescription) ─────────────────────────────────────── */

/**
 * Aggregate skill-lever scores across all active discipline panes in a V2
 * payload. 70/30 weights are applied automatically. Returns an empty object
 * for V1 / null inputs (callers fall back to ranked categories).
 */
export function scoreSkillLevers(
  raw: unknown,
): Partial<Record<SkillLever, number>> {
  const v2 = normalizeCategoryGoalsV2(raw);
  if (!v2) return {};
  const out: Partial<Record<SkillLever, number>> = {};
  const consume = (
    sport: Sport,
    discipline: Discipline,
    category: CatalogCategoryKey,
    picks: ReadonlyArray<SubGoalPick> | undefined,
  ) => {
    if (!picks?.length) return;
    for (const pick of picks) {
      const sg: SubGoal | null = findSubGoal(sport, discipline, category, pick.id);
      if (!sg) continue;
      const w = RANK_WEIGHT[pick.rank];
      for (const [lever, hint] of Object.entries(sg.weightHints) as Array<[SkillLever, number]>) {
        out[lever] = (out[lever] ?? 0) + hint * w;
      }
    }
  };
  const acceptDiscipline = (sport: Sport, discipline: Discipline, dg?: DisciplineGoals) => {
    if (!dg) return;
    consume(sport, discipline, "speed", dg.speed);
    consume(sport, discipline, "power", dg.power);
    consume(sport, discipline, "throwing", dg.throwing);
    consume(sport, discipline, "hitting", dg.hitting);
    consume(sport, discipline, "fielding", dg.fielding);
    consume(sport, discipline, "pitching", dg.pitching);
  };
  if (v2.baseball) {
    acceptDiscipline("baseball", "position", v2.baseball.position);
    acceptDiscipline("baseball", "pitcher", v2.baseball.pitcher);
  }
  if (v2.softball) {
    acceptDiscipline("softball", "position", v2.softball.position);
    acceptDiscipline("softball", "pitcher", v2.softball.pitcher);
  }
  return out;
}

/* ── Read helpers (unchanged from V1) ─────────────────────────────────────── */

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
