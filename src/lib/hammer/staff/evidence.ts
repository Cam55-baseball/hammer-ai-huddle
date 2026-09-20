// Staff View — the rules behind a day, with their evidence grade.
//
// Grades come from docs/wic/training-intelligence-v1.md §2:
//   E1 Established · E2 Supported · E3 Hammers method · E4 Source claim
//
// Nothing here recomputes a decision. It reads the stored decision text and
// names which written rules were in play, so staff can see the reasoning.

export type EvidenceGrade = "E1" | "E2" | "E3" | "E4";

export type RuleEntry = {
  id: string;
  text: string;
  grade: EvidenceGrade;
  /** Matched against the stored reason / floor text, lower-cased. */
  match: RegExp;
};

export const RULE_LIBRARY: RuleEntry[] = [
  {
    id: "TL-2",
    text: "Recent exposure beats capability — program from the last 4 weeks.",
    grade: "E2",
    match: /last 4 weeks|recent|28 day|four weeks/,
  },
  {
    id: "TL-3",
    text: "Workload is workload — lifts, sprints, jumps, throws, swings, practice and games all count.",
    grade: "E2",
    match: /practice|game|innings|pitch count|workload/,
  },
  {
    id: "TL-5",
    text: "In-season: remove the eccentric, keep the intensity.",
    grade: "E2",
    match: /in.?season|eccentric/,
  },
  {
    id: "TL-6",
    text: "Plyos are primers, not workouts — fresh, low volume, before the field or the lift.",
    grade: "E2",
    match: /primer|plyo|jump/,
  },
  {
    id: "TL-7",
    text: "Jump tier and surface advance with the phase, and each tier is earned.",
    grade: "E3",
    match: /tier|earn/,
  },
  {
    id: "TL-8",
    text: "Spacing is set by the kind of session, not by the calendar.",
    grade: "E3",
    match: /rest day|full rest|days after|spacing|too soon/,
  },
  {
    id: "TL-9",
    text: "Explosive reps count only while they stay explosive.",
    grade: "E2",
    match: /quality|slow|loud|form/,
  },
  {
    id: "I12",
    text: "At least 3 full rest days after the most recent heavy or moderate day; a light day neither counts nor resets.",
    grade: "E3",
    match: /heavy|3 full|three full|moderate/,
  },
  {
    id: "TI-1",
    text: "Exposure ledger — each channel is counted on its own and never added to another.",
    grade: "E3",
    match: /ledger|exposure|channel/,
  },
  {
    id: "TI-2",
    text: "Spike governor — a day stays near the biggest single day of the last 4 weeks.",
    grade: "E2",
    match: /capped|cap |on hold|biggest .* day|spike/,
  },
  {
    id: "GM",
    text: "Growth Mode — during a fast growth spurt the day is held at maintenance.",
    grade: "E3",
    match: /growth/,
  },
  {
    id: "PS",
    text: "Pitch Smart rest days block prescribed throwing.",
    grade: "E1",
    match: /pitch smart|rest days after|throw/,
  },
];

export type StoredDecisionLike = {
  reasons?: unknown;
  floors_applied?: unknown;
  allowed_class?: string | null;
};

const textsOf = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v : typeof v === "object" && v ? String((v as { text?: string }).text ?? "") : ""))
    .filter(Boolean);
};

/** The written rules that governed a stored decision, each with its grade. */
export function rulesForDecision(decision: StoredDecisionLike): RuleEntry[] {
  const haystack = [...textsOf(decision.reasons), ...textsOf(decision.floors_applied)]
    .join(" · ")
    .toLowerCase();
  if (!haystack) return [];
  return RULE_LIBRARY.filter((r) => r.match.test(haystack));
}

/** Plain sentences a staff member reads on the page. */
export function decisionSentences(decision: StoredDecisionLike): string[] {
  return [...textsOf(decision.reasons), ...textsOf(decision.floors_applied)];
}
