// Growth vs game trends for the organization tools (PLAN v3.1 Phase 6).
// Compares how training, video analysis scores and game results move over time.
// Rules: label co-movement "these move together", NEVER claim cause, and say
// "not enough data yet" when a series has fewer than 2 points.

export interface TrainingWeek {
  week_start: string;
  planned: number;
  done: number;
}

export interface TrendReport {
  id: string;
  date: string;
  module: string | null;
  efficiency_score: number | null;
}

export interface TrendGame {
  id: string;
  game_date: string;
  opponent: string | null;
  my_score: number | null;
  opp_score: number | null;
  pitch_count: number | null;
  verified: boolean;
}

export type Direction = "up" | "down" | "flat" | "unknown";

export interface SeriesTrend {
  label: string;
  direction: Direction;
  points: number;
  summary: string; // plain words, e.g. "Training completion rose over the last 8 weeks"
}

export interface PairReading {
  a: string;
  b: string;
  reading: string; // "these move together" | "these move in opposite directions" | "not enough data yet"
  detail: string;
}

const MIN_POINTS = 2;

/** Direction of a numeric series: compare average of first half vs second half. */
export function seriesDirection(values: number[]): Direction {
  const nums = values.filter((v) => Number.isFinite(v));
  if (nums.length < MIN_POINTS) return "unknown";
  const mid = Math.floor(nums.length / 2);
  const first = nums.slice(0, mid);
  const second = nums.slice(nums.length - mid);
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const a = avg(first);
  const b = avg(second);
  const span = Math.max(Math.abs(a), Math.abs(b), 1);
  const diff = (b - a) / span;
  if (diff > 0.1) return "up";
  if (diff < -0.1) return "down";
  return "flat";
}

export function trainingCompletionTrend(weeks: TrainingWeek[]): SeriesTrend {
  const usable = weeks.filter((w) => w.planned > 0);
  const rates = usable.map((w) => w.done / w.planned);
  const direction = seriesDirection(rates);
  const summary =
    direction === "unknown"
      ? "not enough data yet"
      : direction === "up"
        ? "Training completion rose across these weeks"
        : direction === "down"
          ? "Training completion fell across these weeks"
          : "Training completion stayed steady across these weeks";
  return { label: "Training", direction, points: usable.length, summary };
}

export function efficiencyTrend(reports: TrendReport[]): SeriesTrend {
  const scores = reports
    .map((r) => r.efficiency_score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s));
  const direction = seriesDirection(scores);
  const summary =
    direction === "unknown"
      ? "not enough data yet"
      : direction === "up"
        ? "Analysis scores rose across these reports"
        : direction === "down"
          ? "Analysis scores fell across these reports"
          : "Analysis scores stayed steady across these reports";
  return { label: "Video analysis", direction, points: scores.length, summary };
}

export function gameResultsTrend(games: TrendGame[]): SeriesTrend {
  // 1 = win, 0.5 = tie, 0 = loss, only where both scores are present.
  const results = games
    .filter((g) => g.my_score != null && g.opp_score != null)
    .map((g) => (g.my_score! > g.opp_score! ? 1 : g.my_score! === g.opp_score! ? 0.5 : 0));
  const direction = seriesDirection(results);
  const summary =
    direction === "unknown"
      ? "not enough data yet"
      : direction === "up"
        ? "Game results improved across these games"
        : direction === "down"
          ? "Game results dipped across these games"
          : "Game results stayed steady across these games";
  return { label: "Game results", direction, points: results.length, summary };
}

/** Pair two series: co-movement label only, never causal. */
export function pairReading(a: SeriesTrend, b: SeriesTrend): PairReading {
  if (a.direction === "unknown" || b.direction === "unknown") {
    return {
      a: a.label,
      b: b.label,
      reading: "not enough data yet",
      detail: `Need at least ${MIN_POINTS} ${a.direction === "unknown" ? a.label.toLowerCase() : b.label.toLowerCase()} points to compare.`,
    };
  }
  if (a.direction === b.direction && a.direction !== "flat") {
    return {
      a: a.label,
      b: b.label,
      reading: "these move together",
      detail: `${a.label} and ${b.label.toLowerCase()} both went ${a.direction} over this stretch. This only shows they moved together — it does not show one caused the other.`,
    };
  }
  if (a.direction === "flat" || b.direction === "flat") {
    return {
      a: a.label,
      b: b.label,
      reading: "no clear pattern",
      detail: `One stayed steady while the other moved, so there is no clear shared pattern in this stretch.`,
    };
  }
  return {
    a: a.label,
    b: b.label,
    reading: "these move in opposite directions",
    detail: `${a.label} went ${a.direction} while ${b.label.toLowerCase()} went ${b.direction} over this stretch. This only shows how they moved — it does not show one caused the other.`,
  };
}

export function buildPairReadings(
  weeks: TrainingWeek[],
  reports: TrendReport[],
  games: TrendGame[],
): { training: SeriesTrend; analysis: SeriesTrend; games: SeriesTrend; pairs: PairReading[] } {
  const training = trainingCompletionTrend(weeks);
  const analysis = efficiencyTrend(reports);
  const gameTrend = gameResultsTrend(games);
  return {
    training,
    analysis,
    games: gameTrend,
    pairs: [pairReading(training, analysis), pairReading(training, gameTrend), pairReading(analysis, gameTrend)],
  };
}
