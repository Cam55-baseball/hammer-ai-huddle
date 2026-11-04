/**
 * Owner Nov 4 r3 Part C — Baserunning IQ guided course. Seven steps built ONLY from the
 * existing baserunning lessons and situations (no new content). Each lesson/situation is
 * placed in the first step whose words it matches; nothing is rewritten.
 */
export const BASERUNNING_IQ_COURSE_ROUTE = "/baserunning-iq/course";

export type CourseStepKey = "reads" | "leads" | "jumps" | "first_to_third" | "tag_ups" | "rounding" | "sliding";
export interface CourseStepDef { key: CourseStepKey; title: string; goal: string; match: RegExp }

// Order matters for matching: the more specific topics are tested first.
const MATCH_ORDER: CourseStepKey[] = ["tag_ups", "first_to_third", "sliding", "rounding", "leads", "jumps", "reads"];

export const COURSE_STEPS: readonly CourseStepDef[] = [
  { key: "reads", title: "Reads", goal: "See the ball and the fielders, then decide fast.", match: /\bread|recogni|awareness|process|ball[- ]in[- ]dirt|pattern|scan|chaos|broken|trailing|decision|hesitat/i },
  { key: "leads", title: "Leads", goal: "Take a safe, strong lead and know when to go back.", match: /\blead|baseline|pickoff|pick-off/i },
  { key: "jumps", title: "Jumps", goal: "Get a quick first move on the pitch or the hit.", match: /\bjump|first step|first move|steal|timing|explos|commit|break on/i },
  { key: "first_to_third", title: "First to third", goal: "Know when to take two bases on a hit.", match: /first to third|1st to 3rd|first-to-third|round second|gap hit|single to (right|center|left)|double or nothing|hustl/i },
  { key: "tag_ups", title: "Tag-ups", goal: "Know when to tag and when to go halfway on a fly ball.", match: /tag(s|ging)? up|tag up|tag-up|fly ball|sacrifice fly|halfway/i },
  { key: "rounding", title: "Rounding bases", goal: "Take a tight turn and decide go or hold.", match: /round|turn|angle|arc|sprint through|go or hold|rundown/i },
  { key: "sliding", title: "Sliding decisions", goal: "Know when, and when not, to slide.", match: /slid|headfirst|tag attempt|sweep tag|avoid the tag/i },
];

export function stepFor(text: string): CourseStepKey | null {
  for (const key of MATCH_ORDER) {
    const def = COURSE_STEPS.find((s) => s.key === key)!;
    if (def.match.test(text)) return key;
  }
  return null;
}

export interface CourseLesson { id: string; title: string; elite_cue?: string | null; game_transfer?: string | null; order_index?: number | null }
export interface CourseScenario { id: string; scenario_text: string; lesson_id?: string | null }
export interface BuiltStep<L, S> extends CourseStepDef { lessons: L[]; checks: S[] }

/** Group lessons by title and situations by their own text; up to 4 short checks per step. */
export function buildCourse<L extends CourseLesson, S extends CourseScenario>(lessons: readonly L[], scenarios: readonly S[], maxChecks = 4): BuiltStep<L, S>[] {
  const steps = COURSE_STEPS.map((d) => ({ ...d, lessons: [] as L[], checks: [] as S[] }));
  const at = (k: CourseStepKey) => steps.find((s) => s.key === k)!;
  for (const l of [...lessons].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))) {
    const k = stepFor(l.title);
    if (k) at(k).lessons.push(l);
  }
  for (const s of [...scenarios].sort((a, b) => a.id.localeCompare(b.id))) {
    const k = stepFor(s.scenario_text);
    if (k && at(k).checks.length < maxChecks) at(k).checks.push(s);
  }
  return steps;
}

/** The next step to work on: the first step not yet done, else the last one. */
export function nextStepIndex(done: ReadonlySet<string>): number {
  const i = COURSE_STEPS.findIndex((s) => !done.has(s.key));
  return i < 0 ? COURSE_STEPS.length - 1 : i;
}
