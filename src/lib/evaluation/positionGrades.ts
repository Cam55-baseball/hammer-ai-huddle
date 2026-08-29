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
