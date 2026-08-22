/**
 * Situation State Inference
 * ------------------------------------------------------------------
 * A Game IQ situation is written for a specific moment — "sac bunt with
 * R1 + R2, no outs", "R3, less than two outs". Opening that situation with
 * empty bases and zero outs shows the athlete a defense that would never be
 * standing there, which is the fastest way to teach the wrong picture.
 *
 * This module reads the implied base/out state out of the situation's slug
 * and title so the diamond opens in the moment the lesson is about. The
 * athlete can still change runners and outs by hand afterwards — this only
 * sets the starting picture.
 */
import type { RunnerBase } from "./alignmentResolver";

export interface ImpliedState {
  runners: RunnerBase[];
  outs: number;
  /** True when the text actually named the state (vs. a generic default). */
  explicit: boolean;
}

const has = (hay: string, ...needles: string[]) => needles.some((n) => hay.includes(n));

/**
 * Infer runners and outs from a situation slug + title.
 * Pure and deterministic — same input always yields the same picture.
 */
export function inferSituationState(slug: string, title = ""): ImpliedState {
  const s = `${slug} ${title}`.toLowerCase();
  const runners = new Set<RunnerBase>();
  let explicit = false;

  // --- Bases -------------------------------------------------------------
  // First-and-third package (check before the single-base patterns).
  if (has(s, "first-third", "first-and-third", "1st-and-3rd", "1st/3rd", "r1-r3", "r1+r3")) {
    runners.add("1B");
    runners.add("3B");
    explicit = true;
  }
  if (has(s, "bases-loaded", "bases loaded")) {
    runners.add("1B");
    runners.add("2B");
    runners.add("3B");
    explicit = true;
  }
  if (has(s, "r12", "r1-r2", "r1+r2", "runners-12", "runners on 1st and 2nd", "first and second")) {
    runners.add("1B");
    runners.add("2B");
    explicit = true;
  }
  if (has(s, "r1", "runner-on-1b", "runner on 1st", "on-1b", "-1b-", "from-1b")) {
    // Narrow guard: "1b-line" / "cover-1b" describe a location, not a runner.
    if (!has(s, "1b-line", "cover-1b", "backpick-c-to-1b", "to-1b") || has(s, "r1")) {
      runners.add("1B");
      explicit = true;
    }
  }
  if (has(s, "r2", "runner-on-2b", "runner on 2nd", "from-2b", "tying-run-9th", "lead-from-2b")) {
    runners.add("2B");
    explicit = true;
  }
  if (has(s, "r3", "runner-on-3b", "runner on 3rd", "squeeze", "tag-up-3b", "wild-pitch-r3")) {
    runners.add("3B");
    explicit = true;
  }

  // Steal / pickoff situations always imply the runner being held.
  if (has(s, "steal-2b", "pickoff-1b", "pop-time-r1", "look-back-rule-r1", "backpick-c-to-1b")) {
    runners.add("1B");
    explicit = true;
  }
  if (has(s, "pickoff-2b", "throw-3b", "steal-3b", "score-from-2b", "single-lf-r2", "push-bunt-1b-r2")) {
    runners.add("2B");
    explicit = true;
  }
  if (has(s, "pickoff-3b", "steal-home")) {
    runners.add("3B");
    explicit = true;
  }

  // Explicit "no runners" markers win over loose matches above.
  if (has(s, "-r0", "no runners", "no-one-on", "nobody on", "bases-empty")) {
    runners.clear();
    explicit = true;
  }

  // --- Outs --------------------------------------------------------------
  let outs = 0;
  if (has(s, "no-outs", "no outs", "0-out", "zero outs")) {
    outs = 0;
    explicit = true;
  } else if (has(s, "1-out", "one out", "-1-out")) {
    outs = 1;
    explicit = true;
  } else if (has(s, "2-outs", "two outs", "two-out")) {
    outs = 2;
    explicit = true;
  } else if (has(s, "less-than-two", "less than two", "< 2 outs", "<2 outs")) {
    // "Less than two" is taught at one out — the harder read of the two.
    outs = 1;
    explicit = true;
  } else if (runners.size > 0) {
    // A runner is on and the text is silent: no outs is the highest-leverage
    // version of nearly every base state, so teach that one first.
    outs = 0;
  }

  return { runners: orderBases(runners), outs, explicit };
}

/** Stable base order so React keys and comparisons never churn. */
function orderBases(set: Set<RunnerBase>): RunnerBase[] {
  const order: RunnerBase[] = ["1B", "2B", "3B"];
  return order.filter((b) => set.has(b));
}
