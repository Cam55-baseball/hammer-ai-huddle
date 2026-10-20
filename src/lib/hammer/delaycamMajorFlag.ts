/**
 * Owner rule (Oct 20): a "major" mechanical flag = the same issue in 3+ of the
 * last 5 analysis reports for that category, or any issue a report marks severe.
 * Reports must already be scoped to one sport + category by the caller.
 */
export interface AnalysisReportIssues {
  readonly date: string; // ISO date of the report
  readonly issues: ReadonlyArray<{ key: string; severe?: boolean }>;
}

export function majorMechanicalFlag(reports: ReadonlyArray<AnalysisReportIssues>): boolean {
  const last5 = [...reports]
    .filter(r => /^\d{4}-\d{2}-\d{2}/.test(r.date))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const counts = new Map<string, number>();
  for (const r of last5) {
    for (const key of new Set(r.issues.map(i => i.key.trim()).filter(Boolean))) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    if (r.issues.some(i => i.severe === true && i.key.trim())) return true;
  }
  return [...counts.values()].some(n => n >= 3);
}
