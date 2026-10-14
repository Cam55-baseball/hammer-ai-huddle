/**
 * Reads a coach's free-text answer ("10U–14U, high school, college, pro") into
 * structured age groups (6U…18U) and levels. Pure and tested.
 */
export const COACH_LEVELS = ["Youth", "Middle school", "High school", "Junior college", "College", "Pro", "Adult"] as const;
export type CoachLevel = (typeof COACH_LEVELS)[number];

const LEVEL_WORDS: [RegExp, CoachLevel][] = [
  [/\b(juco|junior college|jc)\b/i, "Junior college"],
  [/\b(middle school|ms|junior high)\b/i, "Middle school"],
  [/\b(high school|hs|varsity|jv|prep)\b/i, "High school"],
  [/\b(college|ncaa|naia|d1|d2|d3|university)\b/i, "College"],
  [/\b(pro|professional|milb|mlb|indy|independent|ausl)\b/i, "Pro"],
  [/\b(adult|men'?s league|women'?s league|amateur)\b/i, "Adult"],
  [/\b(youth|little league|rec|travel|kids?)\b/i, "Youth"],
];

export interface ParsedCoachAges { ageGroups: string[]; levels: CoachLevel[] }

export function parseCoachAges(text: string): ParsedCoachAges {
  const t = text.replace(/[–—]/g, "-");
  const ages = new Set<number>();
  // Ranges: "10U-14U", "10-14U", "ages 9 to 12", "9u thru 12u"
  for (const m of t.matchAll(/\b(\d{1,2})\s*u?\s*(?:-|to|thru|through)\s*(\d{1,2})\s*u?\b/gi)) {
    const a = Number(m[1]), b = Number(m[2]);
    if (a >= 5 && b <= 19 && a <= b) for (let i = a; i <= b; i++) ages.add(i);
  }
  // Singles: "12U", "16u"
  for (const m of t.matchAll(/\b(\d{1,2})\s*u\b/gi)) { const a = Number(m[1]); if (a >= 5 && a <= 19) ages.add(a); }
  const levels = new Set<CoachLevel>();
  for (const [re, lvl] of LEVEL_WORDS) if (re.test(t)) levels.add(lvl);
  return {
    ageGroups: [...ages].sort((a, b) => a - b).map((a) => `${a}U`),
    levels: COACH_LEVELS.filter((l) => levels.has(l)),
  };
}

/** Stored chips (age groups first, then levels) → split back for editing and display. */
export function splitCoachChips(chips: string[]): ParsedCoachAges {
  return {
    ageGroups: chips.filter((c) => /^\d{1,2}U$/.test(c)),
    levels: chips.filter((c): c is CoachLevel => (COACH_LEVELS as readonly string[]).includes(c)),
  };
}
