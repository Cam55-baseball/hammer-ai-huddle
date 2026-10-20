import type { AnalysisModule } from '@/lib/assessment/initialAssessment';

export interface AnalysisPromptInput {
  enabled: boolean;
  today: string;
  included: readonly AnalysisModule[];
  prescribed: readonly AnalysisModule[];
  latest: Partial<Record<AnalysisModule, string>>;
}
/** Proposed six-week reminder only; OFF until approved. Never authors a day/dose. */
export function analysesDueToday(input: AnalysisPromptInput): AnalysisModule[] {
  if (!input.enabled) return [];
  return input.included.filter(module => {
    if (!input.prescribed.includes(module)) return false;
    const latest = input.latest[module];
    if (!latest) return true;
    const at = Date.parse(latest);
    if (!Number.isFinite(at)) return false;
    const next = new Date(at); next.setUTCDate(next.getUTCDate() + 42);
    return next.toISOString().slice(0, 10) <= input.today;
  });
}