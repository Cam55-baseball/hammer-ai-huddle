import { memoize } from "./types";

export interface EducationState {
  completed: string[];
  lastSource: string | null;
}
const PREFIXES = ["education."];

export const buildEducationState = memoize<EducationState>((rows) => {
  const seen = new Set<string>();
  const completed: string[] = [];
  let lastSource: string | null = null;
  for (const r of rows) {
    const p = r.payload as { module?: string } | undefined;
    if (r.topic_id === "education.module_completed" && p?.module && !seen.has(p.module)) {
      seen.add(p.module);
      completed.push(p.module);
      lastSource = r.event_id;
    }
  }
  return { completed, lastSource };
});

export function educationState(rows: Parameters<typeof buildEducationState>[0], scope: Parameters<typeof buildEducationState>[1]) {
  return buildEducationState(rows, scope, PREFIXES);
}
