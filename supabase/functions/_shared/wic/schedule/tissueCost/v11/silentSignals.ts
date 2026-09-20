// TCS v1.1 §3 — Silent Signals. See what a tough athlete won't say.
// PURE: no clock, no database, no network. Deterministic.
// Not wired into any generator, edge function or client.

export const TCS_SIGNALS_VERSION = "tcs_signals_v1_1";

/* --------------------------------------------------------- estimated max */

/** Epley, conservative: reps in reserve are added to the reps performed. */
export function estimatedMax(load: number, reps: number, rir = 0): number | null {
  if (!Number.isFinite(load) || load <= 0) return null;
  if (!Number.isFinite(reps) || reps <= 0) return null;
  const r = Math.max(0, Math.min(4, Number.isFinite(rir) ? rir : 0));
  const effective = reps + r;
  if (effective > 12) return null; // too far out to estimate safely
  return Math.round(load * (1 + effective / 30) * 100) / 100;
}

export interface LoggedSet {
  date: string;
  pattern: string;
  load: number;
  reps: number;
  /** Reps in reserve, 0–4. Sets outside that range are ignored for estimates. */
  rir?: number | null;
  side?: "left" | "right" | null;
}

/** Best estimated max from recent sets with 0–4 RIR. */
export function bestEstimatedMax(sets: LoggedSet[]): number | null {
  let best: number | null = null;
  for (const s of sets ?? []) {
    if (!s || typeof s !== "object") continue;
    const rir = s.rir ?? 0;
    if (rir < 0 || rir > 4) continue;
    const e = estimatedMax(s.load, s.reps, rir);
    if (e !== null && (best === null || e > best)) best = e;
  }
  return best;
}

export function roundTo5(v: number): number {
  return Math.round(v / 5) * 5;
}

export interface TargetWeight {
  target: number | null;
  /** Youth and foundation athletes never see a percentage. */
  showPercent: boolean;
  basis: "estimated_max" | "last_session" | "none";
}

/** §3 — target = estimated max × prescribed intensity, rounded to 5 lb. */
export function targetWeight(input: {
  sets: LoggedSet[];
  intensity: number | null;
  youthOrFoundation: boolean;
  lastSession?: { load: number; reps: number } | null;
}): TargetWeight {
  const em = bestEstimatedMax(input.sets ?? []);
  if (input.youthOrFoundation || em === null || !Number.isFinite(input.intensity ?? NaN)) {
    const ls = input.lastSession;
    if (ls && Number.isFinite(ls.load) && ls.load > 0) {
      return { target: roundTo5(ls.load), showPercent: false, basis: "last_session" };
    }
    return { target: null, showPercent: false, basis: "none" };
  }
  const t = roundTo5(em * (input.intensity as number));
  return { target: t > 0 ? t : null, showPercent: true, basis: "estimated_max" };
}

/* ------------------------------------------------------------------ signals */

export type SignalKey =
  | "under_target"
  | "over_target"
  | "rep_shortfall"
  | "effort_mismatch"
  | "strength_dip"
  | "avoidance"
  | "side_to_side_gap"
  | "skip_clustering"
  | "cut_short_rise"
  | "check_in_mismatch"
  | "test_drop";

export const ALL_SIGNALS: SignalKey[] = [
  "under_target",
  "over_target",
  "rep_shortfall",
  "effort_mismatch",
  "strength_dip",
  "avoidance",
  "side_to_side_gap",
  "skip_clustering",
  "cut_short_rise",
  "check_in_mismatch",
  "test_drop",
];

export interface SignalSession {
  date: string;
  pattern?: string | null;
  region?: string | null;
  status?: "done" | "skipped" | "cut_short" | null;
  loggedLoad?: number | null;
  targetLoad?: number | null;
  repsCompleted?: number | null;
  repsPrescribed?: number | null;
  /** "How hard? 1–10". */
  howHard?: number | null;
  estimatedMax?: number | null;
  /** Best estimated max over the trailing 28 days. */
  estimatedMax28dBest?: number | null;
  leftResult?: number | null;
  rightResult?: number | null;
  swapped?: boolean | null;
  gameYesterday?: boolean | null;
  travel?: boolean | null;
  checkInScore?: number | null;
  testValue?: number | null;
  testBaseline?: number | null;
  testHigherIsBetter?: boolean | null;
  youth?: boolean | null;
}

export interface Signal {
  key: SignalKey;
  /** 1 = noticed, 2 = repeated. Drives dose reduction, never removal. */
  weight: number;
  /** Neutral athlete-facing copy. Never "hurt", "weak" or "injury". */
  copy: string;
  evidence: string;
}

/** §3 neutral copy templates — the only athlete-facing strings this engine emits. */
export const SIGNAL_COPY: Record<SignalKey, string> = {
  under_target: "We set today to match your last few sessions.",
  over_target: "Today stays at the planned weight.",
  rep_shortfall: "We trimmed the reps to match how the last sessions went.",
  effort_mismatch: "We kept today steady while things settle.",
  strength_dip: "Today is set a touch lighter than your recent best.",
  avoidance: "We swapped in a friendlier version of this movement.",
  side_to_side_gap: "Extra single-side work today to even things up.",
  skip_clustering: "We moved this session to a day that fits your schedule better.",
  cut_short_rise: "Shorter session today so you can finish it.",
  check_in_mismatch: "We set today to match your last few sessions.",
  test_drop: "Today is set to match your latest test numbers.",
};

const BANNED_WORDS = [
  "hurt",
  "weak",
  "injury",
  "injured",
  "pain",
  "damage",
  "cause",
  "causes",
  "caused",
  "because of",
  "prevents",
];

/** §7 — signal copy is always neutral. */
export function copyIsNeutral(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  return !BANNED_WORDS.some((w) => new RegExp(`\\b${w.replace(" ", "\\s+")}\\b`).test(t));
}

function n(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * §3 — evaluate all 11 signals over a rolling window, newest last.
 * Missing data never fires a signal.
 */
export function evaluateSignals(sessions: SignalSession[]): Signal[] {
  const list = (Array.isArray(sessions) ? sessions : []).filter(
    (s) => s && typeof s === "object" && typeof s.date === "string",
  );
  const out: Signal[] = [];
  const add = (key: SignalKey, weight: number, evidence: string) =>
    out.push({ key, weight, copy: SIGNAL_COPY[key], evidence });

  const recent = list.slice(-3);
  const ratios = recent
    .map((s) => {
      const lg = n(s.loggedLoad);
      const tg = n(s.targetLoad);
      return lg !== null && tg !== null && tg > 0 ? lg / tg : null;
    })
    .filter((r): r is number => r !== null);

  // 1. Under-target — < 0.90 on 2 of the last 3 sessions of a pattern.
  const under = ratios.filter((r) => r < 0.9).length;
  if (ratios.length >= 2 && under >= 2) {
    add("under_target", under >= 3 ? 2 : 1, `${under} of the last ${ratios.length} sessions under 0.90 of target`);
  }

  // 2. Over-target — > 1.10, weighted higher for youth.
  const last = list[list.length - 1];
  if (last) {
    const lg = n(last.loggedLoad);
    const tg = n(last.targetLoad);
    if (lg !== null && tg !== null && tg > 0 && lg / tg > 1.1) {
      add("over_target", last.youth ? 2 : 1, `logged ${Math.round((lg / tg) * 100)}% of target`);
    }
    // 3. Rep shortfall at target load.
    const rc = n(last.repsCompleted);
    const rp = n(last.repsPrescribed);
    if (rc !== null && rp !== null && rp > 0 && rc < rp && lg !== null && tg !== null && tg > 0 && lg / tg >= 0.95) {
      add("rep_shortfall", 1, `${rc} of ${rp} reps at target load`);
    }
    // 4. Effort mismatch.
    const hh = n(last.howHard);
    if (hh !== null && lg !== null && tg !== null && tg > 0) {
      const dropped = lg / tg < 0.95 || (rc !== null && rp !== null && rp > 0 && rc < rp);
      if (hh <= 4 && dropped) add("effort_mismatch", 1, `reported ${hh}/10 while output fell`);
      if (hh >= 8 && !dropped && lg / tg <= 1.02) add("effort_mismatch", 1, `reported ${hh}/10 at the usual load`);
    }
  }

  // 5. Strength dip — estimated max down > 5% vs the 28-day best, 3 sessions.
  const dips = list.slice(-3).filter((s) => {
    const em = n(s.estimatedMax);
    const best = n(s.estimatedMax28dBest);
    return em !== null && best !== null && best > 0 && em < best * 0.95;
  }).length;
  if (dips >= 3) add("strength_dip", 2, "estimated max more than 5% under its 28-day best across 3 sessions");

  // 6. Avoidance — repeated swaps or skips of the same region or pattern.
  const byRegion = new Map<string, number>();
  for (const s of list.slice(-8)) {
    const key = (s.region ?? s.pattern ?? "").toString();
    if (!key) continue;
    if (s.swapped || s.status === "skipped") byRegion.set(key, (byRegion.get(key) ?? 0) + 1);
  }
  for (const [key, count] of [...byRegion.entries()].sort()) {
    if (count >= 2) add("avoidance", count >= 3 ? 2 : 1, `${count} swaps or skips of ${key}`);
  }

  // 7. Side-to-side gap > 12%.
  if (last) {
    const l = n(last.leftResult);
    const r = n(last.rightResult);
    if (l !== null && r !== null && Math.max(l, r) > 0) {
      const gap = Math.abs(l - r) / Math.max(l, r);
      if (gap > 0.12) add("side_to_side_gap", 1, `${Math.round(gap * 100)}% difference between sides`);
    }
  }

  // 8. Skip clustering — skips bunching after games or travel.
  const clustered = list.slice(-10).filter(
    (s) => s.status === "skipped" && (s.gameYesterday || s.travel),
  ).length;
  if (clustered >= 2) add("skip_clustering", clustered >= 3 ? 2 : 1, `${clustered} skips after games or travel`);

  // 9. Cut-short rise.
  const half = Math.floor(list.length / 2);
  if (list.length >= 6) {
    const rate = (arr: SignalSession[]) =>
      arr.length ? arr.filter((s) => s.status === "cut_short").length / arr.length : 0;
    const older = rate(list.slice(0, half));
    const newer = rate(list.slice(half));
    if (newer > older && newer >= 0.34) add("cut_short_rise", 1, `cut-short rate ${Math.round(newer * 100)}% vs ${Math.round(older * 100)}% earlier`);
  }

  // 10. Check-in mismatch — perfect check-ins while performance falls.
  const checkIns = list.slice(-4).map((s) => n(s.checkInScore)).filter((v): v is number => v !== null);
  if (checkIns.length >= 3 && checkIns.every((v) => v >= 9)) {
    const falling = ratios.length >= 2 && ratios.every((r) => r < 0.95);
    if (falling) add("check_in_mismatch", 1, "check-ins at 9+ while output fell");
  }

  // 11. Test drop at the same effort.
  if (last) {
    const tv = n(last.testValue);
    const tb = n(last.testBaseline);
    if (tv !== null && tb !== null && tb > 0) {
      const higherBetter = last.testHigherIsBetter !== false;
      const drop = higherBetter ? tv < tb * 0.95 : tv > tb * 1.05;
      if (drop) add("test_drop", 1, "latest test more than 5% off baseline");
    }
  }

  return out;
}

export interface SignalResponse {
  /** 0–0.3 — dose is reduced, never removed. */
  doseReduction: number;
  /** Tank cost multipliers handed to the scheduler. Bounded. */
  tankCostMultiplier: number;
  swapRegions: string[];
  copy: string[];
  signals: SignalKey[];
}

/** §3 — reduce, never remove. Copy stays neutral. */
export function respondToSignals(signals: Signal[]): SignalResponse {
  const total = signals.reduce((a, s) => a + s.weight, 0);
  const doseReduction = Math.min(0.3, total * 0.05);
  const tankCostMultiplier = Math.min(1.25, 1 + total * 0.03);
  const swapRegions = signals
    .filter((s) => s.key === "avoidance" || s.key === "side_to_side_gap")
    .map((s) => s.evidence);
  const copy: string[] = [];
  for (const s of signals) if (!copy.includes(s.copy)) copy.push(s.copy);
  return {
    doseReduction,
    tankCostMultiplier,
    swapRegions,
    copy,
    signals: signals.map((s) => s.key),
  };
}
