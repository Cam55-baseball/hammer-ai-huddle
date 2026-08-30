/**
 * Position-specific defense / arm accumulation.
 *
 * A report's `defense_grade` and `throwing_grade` describe the player AT the
 * position the evaluator watched (`position_evaluated`). Averaging them across
 * positions would blend a shortstop's actions with a corner-outfield look, so
 * we group first and only average within a position.
 */

export interface PositionGradeSource {
  position_evaluated?: string | null;
  defense_grade?: number | null;
  throwing_grade?: number | null;
  defense_grade_future?: number | null;
  throwing_grade_future?: number | null;
  graded_at: string;
}

export interface PositionGradeSummary {
  position: string;
  looks: number;
  defensePresent: number | null;
  defenseFuture: number | null;
  armPresent: number | null;
  armFuture: number | null;
  latestGradedAt: string;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function summarizePositionGrades(
  reports: PositionGradeSource[],
): PositionGradeSummary[] {
  const buckets = new Map<string, PositionGradeSource[]>();
  for (const r of reports) {
    const pos = (r.position_evaluated ?? '').trim();
    if (!pos) continue; // Unpositioned legacy reports cannot be attributed.
    if (r.defense_grade == null && r.throwing_grade == null &&
        r.defense_grade_future == null && r.throwing_grade_future == null) continue;
    const list = buckets.get(pos) ?? [];
    list.push(r);
    buckets.set(pos, list);
  }

  const pick = (rows: PositionGradeSource[], key: keyof PositionGradeSource) =>
    mean(rows.map((r) => r[key]).filter((v): v is number => typeof v === 'number'));

  return [...buckets.entries()]
    .map(([position, rows]) => ({
      position,
      looks: rows.length,
      defensePresent: pick(rows, 'defense_grade'),
      defenseFuture: pick(rows, 'defense_grade_future'),
      armPresent: pick(rows, 'throwing_grade'),
      armFuture: pick(rows, 'throwing_grade_future'),
      latestGradedAt: [...rows.map((r) => r.graded_at)].sort().slice(-1)[0],
    }))
    .sort((a, b) => b.looks - a.looks || a.position.localeCompare(b.position));
}

/**
 * One report can now carry several position looks (child rows). This folds the
 * legacy single `position_evaluated` on the parent row together with the child
 * looks into one flat list for `summarizePositionGrades`.
 *
 * Child rows win: when a report has explicit looks, the parent's legacy copy of
 * its primary look is skipped so it is never double-counted.
 */
export interface ReportPositionLook {
  grade_id: string;
  position: string;
  defense_grade?: number | null;
  throwing_grade?: number | null;
  defense_grade_future?: number | null;
  throwing_grade_future?: number | null;
}

export function expandPositionLooks(
  reports: (PositionGradeSource & { id?: string })[],
  looks: ReportPositionLook[],
): PositionGradeSource[] {
  const byReport = new Map<string, ReportPositionLook[]>();
  for (const l of looks) {
    const list = byReport.get(l.grade_id) ?? [];
    list.push(l);
    byReport.set(l.grade_id, list);
  }

  const out: PositionGradeSource[] = [];
  for (const r of reports) {
    const children = r.id ? byReport.get(r.id) : undefined;
    if (children && children.length > 0) {
      for (const c of children) {
        out.push({
          position_evaluated: c.position,
          defense_grade: c.defense_grade ?? null,
          throwing_grade: c.throwing_grade ?? null,
          defense_grade_future: c.defense_grade_future ?? null,
          throwing_grade_future: c.throwing_grade_future ?? null,
          graded_at: r.graded_at,
        });
      }
      continue;
    }
    out.push(r);
  }
  return out;
}
