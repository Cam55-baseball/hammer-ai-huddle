/**
 * Rolled-up view of an athlete's CONFIRMED evaluations.
 *
 * Honesty rules:
 *  - Only reports the athlete confirmed they attended count. Pending and
 *    rejected reports are never averaged in.
 *  - A tool's average is over the reports that actually graded that tool —
 *    a blank is a blank, never a zero.
 *  - `looks` is reported per tool so a single-look average is never dressed up
 *    as a consensus.
 *  - Defense and Arm are excluded here: they are position-bound and summarized
 *    by PositionGradeSummaryCard, never blended across positions.
 */
import { TOOL_DISPLAY_ORDER, TOOL_LABELS, POSITION_BOUND_KEYS } from './scoutingTools';

export interface ConfirmedSummaryRow {
  key: string;
  label: string;
  present: number | null;
  future: number | null;
  looks: number;
}

export interface ConfirmedSummary {
  confirmedCount: number;
  overall: number | null;
  rows: ConfirmedSummaryRow[];
}

type AnyReport = Record<string, unknown> & {
  player_confirmed?: boolean;
  player_rejected?: boolean;
  overall_grade?: number | null;
};

const avg = (vals: number[]): number | null =>
  vals.length === 0 ? null : Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);

function numbersAt(reports: AnyReport[], key: string): number[] {
  const out: number[] = [];
  for (const r of reports) {
    const v = r[key];
    if (typeof v === 'number' && Number.isFinite(v)) out.push(v);
  }
  return out;
}

export function summarizeConfirmedEvaluations(reports: AnyReport[]): ConfirmedSummary {
  const confirmed = reports.filter((r) => r.player_confirmed === true && r.player_rejected !== true);

  const rows: ConfirmedSummaryRow[] = [];
  for (const key of TOOL_DISPLAY_ORDER) {
    if ((POSITION_BOUND_KEYS as readonly string[]).includes(key)) continue;
    const present = numbersAt(confirmed, key);
    const future = numbersAt(confirmed, `${key}_future`);
    if (present.length === 0 && future.length === 0) continue;
    rows.push({
      key,
      label: TOOL_LABELS[key] ?? key,
      present: avg(present),
      future: avg(future),
      looks: Math.max(present.length, future.length),
    });
  }

  return {
    confirmedCount: confirmed.length,
    overall: avg(numbersAt(confirmed, 'overall_grade')),
    rows,
  };
}
