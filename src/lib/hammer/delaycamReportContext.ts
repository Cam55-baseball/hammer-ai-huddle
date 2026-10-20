import { majorMechanicalFlag, type AnalysisReportIssues } from './delaycamMajorFlag';

export interface DelaycamReportRow {
  readonly id: string;
  readonly created_at: string;
  readonly sport: string | null;
  readonly module: string | null;
}
export interface DelaycamFindingRow {
  readonly video_id: string | null;
  readonly sport: string | null;
  readonly skill_domain: string;
  readonly fault_key: string;
  readonly correction_key: string | null;
  readonly movement_key: string | null;
}

/** Only durable mechanical taxonomy findings count. No prose or grades are parsed.
 * Clean reports remain in the denominator; re-runs of one video count once.
 * The canonical finding schema has no severe field: never invent one.
 */
export function delaycamReportContext(reports: readonly DelaycamReportRow[], findings: readonly DelaycamFindingRow[], sport: string): AnalysisReportIssues[] {
  const unique = new Map<string, DelaycamReportRow>();
  for (const report of reports) {
    if (report.sport !== sport || report.module !== 'hitting' || !report.id) continue;
    unique.set(report.id, report);
  }
  return [...unique.values()].map(report => ({
    date: report.created_at,
    issues: findings.filter(finding => finding.video_id === report.id && finding.sport === sport
      && finding.skill_domain === 'hitting' && Boolean(finding.correction_key || finding.movement_key))
      .map(finding => ({ key: finding.fault_key })),
  }));
}

export function recurringHittingMechanics(reports: readonly DelaycamReportRow[], findings: readonly DelaycamFindingRow[], sport: string): boolean {
  return majorMechanicalFlag(delaycamReportContext(reports, findings, sport));
}