import type { AnalysisModule } from '@/lib/assessment/initialAssessment';
import { isAnalysisType } from '../../../supabase/functions/_shared/analysisTypes';

export interface AnalysisPromptInput {
  enabled: boolean;
  today: string;
  included: readonly AnalysisModule[];
  /** Modules whose skill is on today's plan (a reminder never adds a session). */
  prescribed: readonly AnalysisModule[];
  latest: Partial<Record<AnalysisModule, string>>;
  /** Modules with an open (uncleared) flagged issue. */
  flagged?: readonly AnalysisModule[];
  /** Player's ranked goals mapped to modules, most important first. */
  goalOrder?: readonly AnalysisModule[];
}

const WEEK_DAYS = 7;
const daysBetween = (from: string, to: string) => Math.floor((Date.parse(to) - Date.parse(from)) / 86_400_000);

/**
 * Owner cadence (Oct 20): record at least one analysis EVERY week.
 * One reminder at most: if any included module was recorded in the last 7 days
 * nothing is due. Otherwise rotate to the module recorded longest ago
 * (never recorded counts as oldest), using flagged issues then goal weight
 * to choose between equally old modules. Persistent priorities cannot starve
 * another included module; canonical recordings are the rotation history.
 * Only shown on a day that already has that skill. Invalid dates never count as
 * a recording and never make a module due on their own.
 */
export function analysesDueToday(input: AnalysisPromptInput): AnalysisModule[] {
  if (!input.enabled) return [];
  const included = input.included.filter(isAnalysisType);
  const valid = (m: AnalysisModule) => {
    const v = input.latest[m];
    return v && Number.isFinite(Date.parse(v)) ? v.slice(0, 10) : null;
  };
  const recentWeek = included.some((m) => {
    const d = valid(m);
    return d !== null && daysBetween(d, input.today) < WEEK_DAYS;
  });
  if (recentWeek) return [];
  const candidates = included.filter((m) => input.prescribed.includes(m) && !(input.latest[m] && !valid(m)));
  if (candidates.length === 0) return [];
  const flagged = new Set(input.flagged ?? []);
  const goalRank = (m: AnalysisModule) => {
    const i = (input.goalOrder ?? []).indexOf(m);
    return i === -1 ? 99 : i;
  };
  const age = (m: AnalysisModule) => {
    const d = valid(m);
    return d === null ? Number.MAX_SAFE_INTEGER : daysBetween(d, input.today);
  };
  const [pick] = [...candidates].sort((a, b) =>
    age(b) - age(a) || Number(flagged.has(b)) - Number(flagged.has(a)) || goalRank(a) - goalRank(b));
  return [pick];
}

const NOUN: Record<AnalysisModule, string> = { hitting: 'swing', pitching: 'pitching delivery', throwing: 'throw' };
export function analysisPromptText(module: AnalysisModule): string {
  return `Record this week's ${NOUN[module]} so you can see how you're evolving.`;
}
