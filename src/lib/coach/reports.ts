// Plan v3.1 Phase 5 — coach tabs for video analysis reports, grades and the
// six-week recap.
import { formatGrade, ratingBand } from "@/lib/benchmarks/gradeScale"; Everything shown comes from real records; missing data says
// so plainly and nothing is invented.

export interface CoachReportRow {
  id: string;
  created_at: string | null;
  session_date: string | null;
  module: string | null;
  sport: string | null;
  status: string | null;
  efficiency_score: number | null;
  title: string | null;
}

export interface CoachGradeRow {
  id: string;
  graded_at: string | null;
  grade_type: string | null;
  grade_source: string | null;
  overall_grade: number | null;
  position_evaluated: string | null;
  player_confirmed: boolean | null;
}

export interface CoachRecap {
  period_start: string;
  period_end: string;
  generated_at: string | null;
  strength_change_percent: number | null;
  total_weight_lifted: number | null;
}

export interface CoachReportsPayload {
  reports: CoachReportRow[];
  grades: CoachGradeRow[];
  recap: CoachRecap | null;
}

export function parseReportsPayload(raw: unknown): CoachReportsPayload {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    reports: Array.isArray(o.reports) ? (o.reports as CoachReportRow[]) : [],
    grades: Array.isArray(o.grades) ? (o.grades as CoachGradeRow[]) : [],
    recap: (o.recap ?? null) as CoachRecap | null,
  };
}

const MODULE_LABELS: Record<string, string> = {
  hitting: "Hitting",
  pitching: "Pitching",
  throwing: "Throwing",
  fielding: "Fielding",
  baserunning: "Baserunning",
  strength: "Strength",
};

export function moduleLabel(module: string | null): string {
  if (!module) return "Video analysis";
  return MODULE_LABELS[module] ?? module.charAt(0).toUpperCase() + module.slice(1);
}

export function reportDateLabel(r: CoachReportRow): string {
  const d = r.session_date ?? r.created_at;
  return d ? String(d).slice(0, 10) : "No date";
}

export function reportScoreLabel(r: CoachReportRow): string {
  if (r.efficiency_score == null) return "Score: not recorded";
  return `Efficiency score: ${r.efficiency_score}`;
}

export function gradeSourceLabel(source: string | null): string {
  if (!source) return "Source: not recorded";
  const s = source.replace(/_/g, " ");
  return `Source: ${s}`;
}

export function gradeLine(g: CoachGradeRow): string {
  const parts: string[] = [];
  if (g.overall_grade != null) parts.push(`Overall grade: ${formatGrade(g.overall_grade)} (${ratingBand(g.overall_grade)})`);
  if (g.position_evaluated) parts.push(`Position: ${g.position_evaluated}`);
  if (g.grade_type) parts.push(`Type: ${g.grade_type.replace(/_/g, " ")}`);
  return parts.length ? parts.join(" · ") : "Grade details not recorded";
}

export function recapLines(recap: CoachRecap): string[] {
  const lines: string[] = [`Period: ${recap.period_start} to ${recap.period_end}`];
  if (recap.strength_change_percent != null) {
    lines.push(`Strength change: ${recap.strength_change_percent}%`);
  }
  if (recap.total_weight_lifted != null) {
    lines.push(`Total weight lifted: ${recap.total_weight_lifted}`);
  }
  return lines;
}
