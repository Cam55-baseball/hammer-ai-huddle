import type { EvaluationRow } from '@/hooks/useEvaluations';

/**
 * Who a scouting report is about.
 *
 * A report is either attached to a real Hammers account (`user_id`) or, for a
 * prospect who has not signed up yet, carries a free-text `prospect_name`.
 * The database guarantees exactly one of those two is present.
 */

export function isUnlinkedProspect(report: EvaluationRow): boolean {
  return !report.user_id;
}

/** Stable grouping key: one athlete account, or one standalone prospect report. */
export function subjectKey(report: EvaluationRow): string {
  return report.user_id ? `athlete:${report.user_id}` : `prospect:${report.id}`;
}

/** Human label for the report's subject. `names` maps athlete id -> full name. */
export function subjectLabel(
  report: EvaluationRow,
  names: Record<string, string> = {},
): string {
  if (report.user_id) return names[report.user_id] ?? 'Athlete';
  const name = (report.prospect_name as string | null)?.trim();
  return name && name.length > 0 ? name : 'Unnamed prospect';
}

/** "Central High · 2027" — the identifying context captured for a prospect. */
export function prospectDetailLine(report: EvaluationRow): string | null {
  const parts = [
    (report.prospect_position as string | null) || null,
    (report.prospect_team as string | null) || null,
    report.prospect_grad_year ? `Class of ${report.prospect_grad_year}` : null,
  ].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' · ') : null;
}
