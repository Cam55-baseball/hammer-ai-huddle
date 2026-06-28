// Deterministic, seeded variant generator. Same seed = same permutation order,
// so the "never finishes" loop keeps producing novel-but-reproducible reps
// per (user, situation). Replay-safe and offline-friendly.

export interface IqVariantInput {
  count_balls: number;
  count_strikes: number;
  outs: number;
  runners: { first?: boolean; second?: boolean; third?: boolean };
  score_state: "leading_small" | "leading_big" | "tied" | "trailing_small" | "trailing_big" | "neutral";
  inning: number;
  handedness: "R" | "L" | "S";
  opponent_tendency: "small_ball" | "power" | "speed" | "balanced";
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

export function generateVariant(seed: string): IqVariantInput {
  const rng = mulberry32(hash(seed));
  return {
    count_balls: Math.floor(rng() * 4),
    count_strikes: Math.floor(rng() * 3),
    outs: Math.floor(rng() * 3),
    runners: {
      first: rng() < 0.5,
      second: rng() < 0.4,
      third: rng() < 0.25,
    },
    score_state: pick(rng, [
      "leading_small","leading_big","tied","trailing_small","trailing_big","neutral",
    ] as const),
    inning: 1 + Math.floor(rng() * 9),
    handedness: pick(rng, ["R","L","S"] as const),
    opponent_tendency: pick(rng, ["small_ball","power","speed","balanced"] as const),
  };
}

export function describeVariant(v: IqVariantInput): string {
  const parts: string[] = [];
  parts.push(`${v.count_balls}-${v.count_strikes}, ${v.outs} out${v.outs === 1 ? "" : "s"}`);
  const r: string[] = [];
  if (v.runners.first) r.push("1B");
  if (v.runners.second) r.push("2B");
  if (v.runners.third) r.push("3B");
  parts.push(r.length ? `runners ${r.join("/")}` : "bases empty");
  parts.push(`inn ${v.inning}`);
  parts.push(`${v.handedness}HH`);
  return parts.join(" · ");
}
