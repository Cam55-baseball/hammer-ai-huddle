// Goal Emphasis Authority — the single place athlete goals become weights.
//
// Constitutional bounds:
//   - Emphasis may only reorder / bias CHOICE between already-legal movements.
//   - Emphasis may NEVER author a dose (the Zero-Drift Dosage Doctrine owns
//     every set and rep), relax safety, season legality, injury, training-age
//     or scope gates, or delete a template-required category.
//   - Pure and deterministic: identical inputs always produce identical
//     weights, so a replay reproduces the identical session.

export const GOAL_EMPHASIS_VERSION = "wic_goal_emph_v1";

export type GoalDomain =
  | "speed"
  | "power"
  | "throwing"
  | "hitting"
  | "fielding"
  | "strength"
  | "conditioning"
  | "durability";

export const GOAL_DOMAINS: readonly GoalDomain[] = [
  "speed", "power", "throwing", "hitting", "fielding",
  "strength", "conditioning", "durability",
];

/** Baseline weight every domain carries regardless of stated goals. */
export const BASELINE_WEIGHT = 1.0;
/** Hard ceiling — emphasis can never more than moderately bias a choice. */
export const MAX_WEIGHT = 1.6;
/** Hard floor — a de-prioritised domain is still trained to baseline needs. */
export const MIN_WEIGHT = 0.85;

export interface GoalEmphasisInput {
  /** Rows from athlete_body_goals (may carry rank / priority). */
  bodyGoals?: Array<Record<string, unknown>> | null;
  /** Profile row — carries goal_speed / goal_power / ... free-text answers. */
  profile?: Record<string, unknown> | null;
  /** Stage 5 — the athlete's own ranking of the five training categories (best first). */
  categoryOrder?: readonly string[] | null;
  /** Stage 5 — the athlete's career goal in their own words (athlete_context.goal_summary). */
  careerGoal?: string | null;
  isPitcher?: boolean;
}

/** A career goal tilts at most this much — less than a third-ranked goal. */
export const CAREER_BONUS = 0.15;

// Explicit, auditable phrases. A goal that names none of them (e.g. "make
// varsity", "earn a roster spot") tilts nothing: the plan keeps training
// everything evenly toward it. Level targets are never read here.
const CAREER_LEXICON: Array<{ re: RegExp; domains: GoalDomain[]; pitcherOnly?: boolean }> = [
  { re: /home ?runs?|homers?|exit velo|hit (it )?(harder|farther|further)|more power|power in my swing|distance/i, domains: ["hitting", "power"] },
  { re: /bat speed|swing|hitting|hit (for )?average|batting average|contact|barrel|hit more|better hitter|strike ?outs? less|fewer strike ?outs/i, domains: ["hitting"] },
  { re: /command|throw strikes|more strikes|locat|accura|control/i, domains: ["throwing"] },
  { re: /throw harder|arm strength|velo(city)?|mph|pitch harder|throw faster/i, domains: ["throwing"], pitcherOnly: false },
  { re: /steal|faster|speed|sprint|quicker|run faster/i, domains: ["speed"] },
  { re: /defen[cs]e|glove|field(ing|er)?|gold glove|range/i, domains: ["fielding"] },
  { re: /stronger|strength|bigger|put on (muscle|size)/i, domains: ["strength"] },
  { re: /stay healthy|durab|never miss|injury[- ]free|available every/i, domains: ["durability"] },
];

/** Domains a career goal clearly points at, in first-mention order. Max two. */
export function careerDirection(text: string | null | undefined, isPitcher = false): GoalDomain[] {
  const t = String(text ?? "").trim();
  if (!t) return [];
  const hits: Array<{ at: number; d: GoalDomain }> = [];
  for (const { re, domains, pitcherOnly } of CAREER_LEXICON) {
    if (pitcherOnly && !isPitcher) continue;
    const m = re.exec(t);
    if (m) for (const d of domains) hits.push({ at: m.index, d });
  }
  hits.sort((a, b) => a.at - b.at);
  const out: GoalDomain[] = [];
  for (const h of hits) if (!out.includes(h.d)) out.push(h.d);
  return out.slice(0, 2);
}

export interface GoalEmphasis {
  readonly version: string;
  /** domain -> weight in [MIN_WEIGHT, MAX_WEIGHT]. */
  readonly weights: Readonly<Record<GoalDomain, number>>;
  /** Domains the athlete ranked, best first. */
  readonly ranked: readonly GoalDomain[];
  /** True when the athlete stated nothing — everything stays at baseline. */
  readonly isBaselineOnly: boolean;
  readonly rationale: string;
  /** Stage 5 — domains the career goal tilts toward (never an entitlement). */
  readonly career: readonly GoalDomain[];
  /** Stage 5 — true when the athlete ranked the five categories themselves. */
  readonly athleteRanked: boolean;
}

const DOMAIN_ALIASES: Record<string, GoalDomain> = {
  speed: "speed", running: "speed", sprint: "speed", quickness: "speed",
  agility: "speed", baserunning: "speed",
  power: "power", explosive: "power", explosiveness: "power", jump: "power",
  throwing: "throwing", arm: "throwing", velo: "throwing", velocity: "throwing",
  pitching: "throwing",
  hitting: "hitting", bat_speed: "hitting", batspeed: "hitting", swing: "hitting",
  fielding: "fielding", defense: "fielding", glove: "fielding", catching: "fielding",
  strength: "strength", lifting: "strength", lift: "strength", muscle: "strength",
  size: "strength", mass: "strength",
  conditioning: "conditioning", endurance: "conditioning", stamina: "conditioning",
  durability: "durability", injury: "durability", mobility: "durability",
  recovery: "durability", health: "durability",
};

export function normalizeGoalDomain(raw: unknown): GoalDomain | null {
  const s = String(raw ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!s) return null;
  if (DOMAIN_ALIASES[s]) return DOMAIN_ALIASES[s];
  for (const key of Object.keys(DOMAIN_ALIASES)) {
    if (s.includes(key)) return DOMAIN_ALIASES[key];
  }
  return null;
}

/** Rank 1 gets the top bonus, decaying to zero by rank 5+. */
function bonusForRank(rank: number): number {
  const table = [0.6, 0.45, 0.3, 0.18, 0.08];
  return rank >= 1 && rank <= table.length ? table[rank - 1] : 0.04;
}

function clampWeight(w: number): number {
  return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, Math.round(w * 1000) / 1000));
}

export function resolveGoalEmphasis(input: GoalEmphasisInput): GoalEmphasis {
  const weights: Record<GoalDomain, number> = Object.create(null);
  for (const d of GOAL_DOMAINS) weights[d] = BASELINE_WEIGHT;

  const rankedPairs: Array<{ domain: GoalDomain; rank: number }> = [];

  // 1) athlete_body_goals — explicit, may carry a rank.
  const rows = Array.isArray(input.bodyGoals) ? input.bodyGoals : [];
  rows.forEach((row, i) => {
    const r = row as Record<string, unknown>;
    const domain =
      normalizeGoalDomain(r.category) ??
      normalizeGoalDomain(r.goal_key) ??
      normalizeGoalDomain(r.goal) ??
      normalizeGoalDomain(r.label);
    if (!domain) return;
    const rawRank = Number(r.rank ?? r.priority ?? NaN);
    const rank = Number.isFinite(rawRank) && rawRank > 0 ? Math.floor(rawRank) : i + 1;
    rankedPairs.push({ domain, rank });
  });

  // 2) Profile category goals (speed / power / throwing / hitting / fielding).
  //    A `*_rank` column, when present, is the ordering authority.
  const p = (input.profile ?? {}) as Record<string, unknown>;
  const CATS: GoalDomain[] = ["speed", "power", "throwing", "hitting", "fielding"];
  for (const cat of CATS) {
    const value = p[`goal_${cat}`];
    if (value === null || value === undefined || String(value).trim() === "") continue;
    const rawRank = Number(p[`goal_${cat}_rank`] ?? NaN);
    const rank = Number.isFinite(rawRank) && rawRank > 0
      ? Math.floor(rawRank)
      : CATS.indexOf(cat) + 1;
    rankedPairs.push({ domain: cat, rank });
  }

  // 3) Stage 5 — the athlete's own ranking of the five categories. It is the
  //    ordering authority for those categories when present.
  const order = Array.isArray(input.categoryOrder)
    ? input.categoryOrder.map((x) => normalizeGoalDomain(x)).filter((d): d is GoalDomain => !!d)
    : [];
  const athleteRanked = order.length >= 5;
  if (athleteRanked) {
    order.forEach((domain, i) => rankedPairs.push({ domain, rank: i + 1 }));
  }

  // Deterministic: best (lowest) rank wins per domain, ties broken by domain
  // order in GOAL_DOMAINS.
  const bestRank = new Map<GoalDomain, number>();
  for (const { domain, rank } of rankedPairs) {
    const prev = bestRank.get(domain);
    if (prev === undefined || rank < prev) bestRank.set(domain, rank);
  }

  for (const [domain, rank] of bestRank) {
    weights[domain] = clampWeight(weights[domain] + bonusForRank(rank));
  }

  // Stage 5 — career goal: a small tilt toward what the goal names. Bounded by
  // MAX_WEIGHT like everything else; it only biases choice between legal moves.
  const career = careerDirection(input.careerGoal, input.isPitcher === true);
  for (const d of career) weights[d] = clampWeight(weights[d] + CAREER_BONUS);

  // Domains never mentioned drift slightly below baseline so a stated goal is
  // actually visible in the plan — but never below MIN_WEIGHT.
  if (bestRank.size > 0 || career.length > 0) {
    for (const d of GOAL_DOMAINS) {
      if (!bestRank.has(d) && !career.includes(d)) weights[d] = clampWeight(weights[d] - 0.1);
    }
  }

  const ranked = [...bestRank.entries()]
    .sort((a, b) =>
      a[1] - b[1] || GOAL_DOMAINS.indexOf(a[0]) - GOAL_DOMAINS.indexOf(b[0]))
    .map(([d]) => d);

  const rationale = ranked.length
    ? `Goal emphasis from your ranked priorities: ${ranked.join(" > ")}.`
    : "No stated goals on file — every domain trained at program baseline.";

  return Object.freeze({
    version: GOAL_EMPHASIS_VERSION,
    weights: Object.freeze(weights),
    ranked: Object.freeze(ranked) as readonly GoalDomain[],
    isBaselineOnly: ranked.length === 0 && career.length === 0,
    rationale,
    career: Object.freeze(career) as readonly GoalDomain[],
    athleteRanked,
  }) as GoalEmphasis;
}

/** Map a catalog movement onto the goal domain it primarily serves. */
export function domainForMovement(m: {
  movement_category?: string | null;
  category?: string | null;
  pattern?: string | null;
  primary_adaptation?: string | null;
}): GoalDomain {
  const mc = String(m.movement_category ?? "").toLowerCase();
  const cat = String(m.category ?? "").toLowerCase();
  const pat = String(m.pattern ?? "").toLowerCase();
  const adapt = String(m.primary_adaptation ?? "").toLowerCase();

  if (mc === "arm_care" || cat === "arm_care" || cat === "shoulder_prep" || cat === "cressey_sp") return "throwing";
  if (mc === "rotation" || cat === "bat_speed" || pat === "rotational") return "hitting";
  if (mc === "jump_landing" || pat === "plyometric" || pat === "plyo") return "power";
  if (adapt.includes("power") || adapt.includes("elastic")) return "power";
  if (adapt.includes("speed") || cat === "speed_lab") return "speed";
  if (mc === "mobility" || cat === "warmup" || cat === "movement_patterning" || cat === "functional_patterning") return "durability";
  if (cat === "conditioning") return "conditioning";
  if (mc === "single_leg" || cat === "unilateral_lower") return "speed";
  return "strength";
}

/** Weight for a movement, bounded, never a dose. */
export function emphasisFor(
  emphasis: GoalEmphasis,
  m: Parameters<typeof domainForMovement>[0],
): number {
  return emphasis.weights[domainForMovement(m)] ?? BASELINE_WEIGHT;
}
