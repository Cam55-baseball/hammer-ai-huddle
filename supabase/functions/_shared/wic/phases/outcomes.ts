/**
 * Stage C (v1 §7–§8, v1.2) — outcome links, bounded feedback, pain patterns.
 * Correlation language only. Confidence labels. Minimum data bars.
 * No medical or prevention claims. Nothing here authors a dose.
 */
import { SHARE, type BuildPhase } from "./adaptivePhases.ts";

export const OUTCOMES_VERSION = "outcomes_v1";

export const OUTCOME_METRICS = ["sprint", "jump", "bat_speed", "exit_velocity", "throwing_velocity", "combine"] as const;
export type OutcomeMetric = typeof OUTCOME_METRICS[number];
/** Lower is better for sprint times; everything else higher is better. */
export const LOWER_IS_BETTER: Record<OutcomeMetric, boolean> = {
  sprint: true, jump: false, bat_speed: false, exit_velocity: false, throwing_velocity: false, combine: false,
};

/** Which saved test keys feed each metric. */
export const METRIC_KEYS: Record<OutcomeMetric, string[]> = {
  sprint: ["ten_yard_dash", "sixty_yard_dash", "thirty_yard_dash"],
  jump: ["vertical_jump", "broad_jump", "sl_broad_jump", "sl_broad_jump_left", "sl_broad_jump_right"],
  bat_speed: ["bat_speed", "bat_speed_left", "bat_speed_right"],
  exit_velocity: ["exit_velocity", "tee_exit_velocity_left", "tee_exit_velocity_right"],
  throwing_velocity: ["velocity", "throwing_velocity", "long_toss_distance"],
  combine: [],
};

export type Factor = "phase_length" | "adherence" | "spacing";
export const FACTOR_NAME: Record<Factor, string> = {
  phase_length: "phase length", adherence: "sessions completed", spacing: "days between hard sessions",
};

/** One athlete's change in a metric between two tests, with what happened in between. */
export interface OutcomeObs {
  athlete: string;
  metric: OutcomeMetric;
  /** Improvement as a % (sign already flipped for lower-is-better). */
  changePct: number;
  phaseWeeks: number;
  adherence: number;
  spacingDays: number;
}

/** Minimum data bars: below either, nothing is shown as a link. */
export const MIN_ATHLETES = 20;
export const MIN_PAIRS = 30;

export type Confidence = "not enough data" | "low" | "moderate" | "high";

function rank(xs: number[]): number[] {
  const idx = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array(xs.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
}

export function spearman(x: number[], y: number[]): number | null {
  if (x.length < 3 || x.length !== y.length) return null;
  const rx = rank(x), ry = rank(y);
  const mx = rx.reduce((a, b) => a + b, 0) / rx.length, my = ry.reduce((a, b) => a + b, 0) / ry.length;
  let n = 0, dx = 0, dy = 0;
  for (let i = 0; i < rx.length; i++) { n += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  if (dx === 0 || dy === 0) return null;
  return n / Math.sqrt(dx * dy);
}

export function confidenceLabel(athletes: number, pairs: number, r: number | null): Confidence {
  if (athletes < MIN_ATHLETES || pairs < MIN_PAIRS || r === null) return "not enough data";
  const a = Math.abs(r);
  if (pairs >= 150 && a >= 0.3) return "high";
  if (pairs >= 60 && a >= 0.2) return "moderate";
  return "low";
}

export interface OutcomeLink {
  metric: OutcomeMetric;
  factor: Factor;
  athletes: number;
  pairs: number;
  r: number | null;
  confidence: Confidence;
  text: string;
}

const METRIC_NAME: Record<OutcomeMetric, string> = {
  sprint: "sprint times", jump: "jumps", bat_speed: "bat speed", exit_velocity: "exit velocity",
  throwing_velocity: "throwing velocity", combine: "combine marks",
};

export function linkText(l: Omit<OutcomeLink, "text">): string {
  if (l.confidence === "not enough data") {
    return `Not enough data yet to link ${FACTOR_NAME[l.factor]} with ${METRIC_NAME[l.metric]} (${l.athletes} athletes, ${l.pairs} test pairs; need ${MIN_ATHLETES} and ${MIN_PAIRS}).`;
  }
  const dir = (l.r ?? 0) > 0.1 ? "tended to go with bigger gains in" : (l.r ?? 0) < -0.1 ? "tended to go with smaller gains in" : "showed no clear link with";
  return `Among ${l.athletes} athletes, more ${FACTOR_NAME[l.factor]} ${dir} ${METRIC_NAME[l.metric]} (${l.confidence} confidence). This is a pattern in our data, not proof of cause.`;
}

export function outcomeLinks(obs: OutcomeObs[]): OutcomeLink[] {
  const out: OutcomeLink[] = [];
  for (const metric of OUTCOME_METRICS) {
    const rows = obs.filter((o) => o.metric === metric);
    const athletes = new Set(rows.map((r) => r.athlete)).size;
    for (const factor of ["phase_length", "adherence", "spacing"] as Factor[]) {
      const x = rows.map((r) => factor === "phase_length" ? r.phaseWeeks : factor === "adherence" ? r.adherence : r.spacingDays);
      const r = spearman(x, rows.map((o) => o.changePct));
      const base = { metric, factor, athletes, pairs: rows.length, r: r === null ? null : Math.round(r * 100) / 100, confidence: confidenceLabel(athletes, rows.length, r) };
      out.push({ ...base, text: linkText(base) });
    }
  }
  return out;
}

// ---------------------------------------------------------------- bounded feedback

export const MAX_FROM_DEFAULT = 0.2;
export const MAX_WEEKLY = 0.05;

export interface FeedbackState {
  version: number;
  shares: Record<BuildPhase, number>;
  enabled: boolean;
  disabledReason: string | null;
  history: { version: number; shares: Record<BuildPhase, number>; at: string; reason: string }[];
}

export function defaultFeedback(): FeedbackState {
  return { version: 0, shares: { ...SHARE }, enabled: true, disabledReason: null, history: [] };
}

function clampShares(prev: Record<BuildPhase, number>, want: Record<BuildPhase, number>): Record<BuildPhase, number> {
  const out = {} as Record<BuildPhase, number>;
  for (const p of ["P1", "P2", "P3"] as BuildPhase[]) {
    const lo = Math.max(SHARE[p] * (1 - MAX_FROM_DEFAULT), prev[p] * (1 - MAX_WEEKLY));
    const hi = Math.min(SHARE[p] * (1 + MAX_FROM_DEFAULT), prev[p] * (1 + MAX_WEEKLY));
    out[p] = Math.min(hi, Math.max(lo, want[p]));
  }
  const sum = out.P1 + out.P2 + out.P3;
  for (const p of ["P1", "P2", "P3"] as BuildPhase[]) out[p] = Math.round((out[p] / sum) * 10000) / 10000;
  return out;
}

/**
 * One weekly step. Only links with at least moderate confidence move a share.
 * Every step is versioned. If athletes on the adjusted shares did worse than
 * those on default, feedback switches itself off and returns to default.
 */
export function stepFeedback(
  prev: FeedbackState,
  links: OutcomeLink[],
  comparison: { adjustedMeanPct: number | null; defaultMeanPct: number | null; n: number },
  at: string,
): FeedbackState {
  if (!prev.enabled) return prev;
  if (comparison.n >= MIN_PAIRS && comparison.adjustedMeanPct !== null && comparison.defaultMeanPct !== null && comparison.adjustedMeanPct < comparison.defaultMeanPct) {
    return {
      version: prev.version + 1, shares: { ...SHARE }, enabled: false,
      disabledReason: "Adjusted phase lengths did worse than the default — switched off and returned to default.",
      history: [...prev.history, { version: prev.version + 1, shares: { ...SHARE }, at, reason: "auto-disabled" }],
    };
  }
  const usable = links.filter((l) => l.factor === "phase_length" && (l.confidence === "moderate" || l.confidence === "high"));
  if (!usable.length) return prev;
  const lean = (ms: OutcomeMetric[]) => usable.filter((l) => ms.includes(l.metric)).reduce((a, l) => a + (l.r ?? 0), 0);
  const want = {
    P1: prev.shares.P1 * (1 + MAX_WEEKLY * Math.sign(lean(["jump", "combine"]))),
    P2: prev.shares.P2 * (1 + MAX_WEEKLY * Math.sign(lean(["exit_velocity", "throwing_velocity"]))),
    P3: prev.shares.P3 * (1 + MAX_WEEKLY * Math.sign(lean(["sprint", "bat_speed"]))),
  };
  const shares = clampShares(prev.shares, want);
  if (shares.P1 === prev.shares.P1 && shares.P2 === prev.shares.P2 && shares.P3 === prev.shares.P3) return prev;
  return { ...prev, version: prev.version + 1, shares, history: [...prev.history, { version: prev.version + 1, shares, at, reason: "weekly step" }] };
}

// ---------------------------------------------------------------- pain patterns

export interface PainObs { athlete: string; date: string; region: string; severity: string; phase: string | null }

export interface PainPattern {
  region: string;
  reports: number;
  athletes: number;
  repeatAthletes: number;
  byPhase: Record<string, number>;
  confidence: Confidence;
  text: string;
}

export const MIN_PAIN_REPORTS_OWNER = 10;
export const MIN_PAIN_REPORTS_ATHLETE = 2;

const pretty = (r: string) => r.replace(/_/g, " ");

export function painPatterns(obs: PainObs[], scope: "owner" | "athlete"): PainPattern[] {
  const by = new Map<string, PainObs[]>();
  for (const o of obs) by.set(o.region, [...(by.get(o.region) ?? []), o]);
  const min = scope === "owner" ? MIN_PAIN_REPORTS_OWNER : MIN_PAIN_REPORTS_ATHLETE;
  const out: PainPattern[] = [];
  for (const [region, rows] of by) {
    const per = new Map<string, number>();
    for (const r of rows) per.set(r.athlete, (per.get(r.athlete) ?? 0) + 1);
    const byPhase: Record<string, number> = {};
    for (const r of rows) byPhase[r.phase ?? "unknown"] = (byPhase[r.phase ?? "unknown"] ?? 0) + 1;
    const repeatAthletes = [...per.values()].filter((n) => n > 1).length;
    const enough = rows.length >= min;
    const confidence: Confidence = !enough ? "not enough data" : rows.length >= min * 5 ? "high" : rows.length >= min * 2 ? "moderate" : "low";
    const top = Object.entries(byPhase).sort((a, b) => b[1] - a[1])[0];
    const text = !enough
      ? `${rows.length} ${pretty(region)} report${rows.length === 1 ? "" : "s"} so far — not enough to see a pattern.`
      : scope === "athlete"
        ? `You've reported ${pretty(region)} ${rows.length} times, most often during ${top[0] === "unknown" ? "unlabelled weeks" : top[0]}. This is a pattern, not a diagnosis — tell a coach or parent.`
        : `${rows.length} ${pretty(region)} reports from ${per.size} athletes (${repeatAthletes} more than once), most often during ${top[0]} (${confidence} confidence). A pattern in reports, not a cause.`;
    out.push({ region, reports: rows.length, athletes: per.size, repeatAthletes, byPhase, confidence, text });
  }
  return out.sort((a, b) => b.reports - a.reports);
}

/** Words that would turn a pattern into a claim. */
export const BANNED_CLAIMS = /\b(prevent|prevents|prevention|cure|diagnos(e|is)|treat(s|ment)?|proven|guarantee|causes?d?|injury[- ]proof|reduces? (the )?risk)\b/i;
