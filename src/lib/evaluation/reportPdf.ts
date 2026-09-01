import jsPDF from 'jspdf';
import type { EvaluationRow } from '@/hooks/useEvaluations';
import type { ReportPositionLook } from '@/lib/evaluation/positionGrades';
import type { BatSideGrades, PitchingSideGrades } from '@/hooks/useReportDetails';
import {
  TOOL_LABELS,
  TOOL_DISPLAY_ORDER,
  POSITION_BOUND_KEYS,
  SIDE_SPLIT_KEYS,
  BAT_SIDE_LABELS,
  PITCHING_SIDE_SPLIT_KEYS,
  PITCHING_SIDE_LABELS,
  reportTypeLabel,
} from '@/lib/evaluation/scoutingTools';

/**
 * Printable scouting report.
 *
 * Mirrors exactly what `EvaluationReportCard` renders on screen: the flat tool
 * grades, then the per-batting-side, per-throwing-arm and per-position splits,
 * then the write-up. Nothing is derived or invented for the PDF — a grade that
 * is blank on screen stays blank on paper.
 */

export interface ReportPdfInput {
  report: EvaluationRow;
  /** Who the report is about. */
  subject: string;
  /** Who filed it (name + credentials), when known. */
  evaluator?: string;
  positions?: ReportPositionLook[];
  batSides?: BatSideGrades[];
  pitchingSides?: PitchingSideGrades[];
}

const MARGIN = 15;
const LINE = 5.5;

function fmt(n: number | null | undefined): string {
  return n == null ? '—' : String(n);
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Filesystem-safe slug for the download name. */
export function reportFileName(subject: string, iso: string): string {
  const slug = subject.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
  return `scouting-report-${slug}-${iso.slice(0, 10)}.pdf`;
}

class Cursor {
  y = MARGIN;
  constructor(private doc: jsPDF) {}

  private pageBreak(needed = LINE) {
    if (this.y + needed > this.doc.internal.pageSize.getHeight() - MARGIN) {
      this.doc.addPage();
      this.y = MARGIN;
    }
  }

  text(value: string, opts: { size?: number; bold?: boolean; x?: number } = {}) {
    this.pageBreak();
    this.doc.setFontSize(opts.size ?? 10);
    this.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    this.doc.text(value, opts.x ?? MARGIN, this.y);
    this.y += (opts.size ?? 10) > 12 ? LINE + 2 : LINE;
  }

  wrapped(value: string, size = 10) {
    const width = this.doc.internal.pageSize.getWidth() - MARGIN * 2;
    this.doc.setFontSize(size);
    this.doc.setFont('helvetica', 'normal');
    for (const line of this.doc.splitTextToSize(value, width) as string[]) {
      this.pageBreak();
      this.doc.text(line, MARGIN, this.y);
      this.y += LINE;
    }
  }

  /** Tool / Present / Future row. */
  gradeRow(label: string, present: number | null, future: number | null, bold = false) {
    this.pageBreak();
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const right = this.doc.internal.pageSize.getWidth() - MARGIN;
    this.doc.text(label, MARGIN, this.y);
    this.doc.text(fmt(present), right - 30, this.y, { align: 'right' });
    this.doc.text(fmt(future), right, this.y, { align: 'right' });
    this.y += LINE;
  }

  rule() {
    this.pageBreak(3);
    this.doc.setDrawColor(200);
    this.doc.line(MARGIN, this.y, this.doc.internal.pageSize.getWidth() - MARGIN, this.y);
    this.y += 4;
  }

  gap(n = 3) {
    this.y += n;
  }
}

/** Writes one report's body at the cursor. Shared by single and batch exports. */
function writeReport(doc: jsPDF, c: Cursor, input: ReportPdfInput) {
  const { report, subject, evaluator } = input;
  const positions = input.positions ?? [];
  const batSides = input.batSides ?? [];
  const pitchingSides = input.pitchingSides ?? [];

  c.text(subject, { size: 16, bold: true });
  c.text(
    [reportTypeLabel(report.grade_type), dateLabel(report.graded_at)]
      .filter(Boolean)
      .join(' · '),
    { size: 10 },
  );
  const context = [report.evaluation_context, report.event_description].filter(Boolean).join(' · ');
  if (context) c.text(context, { size: 10 });
  if (evaluator) c.text(`Filed by ${evaluator}`, { size: 10 });
  if (!report.user_id) {
    const detail = [
      report.prospect_position as string | null,
      report.prospect_team as string | null,
      report.prospect_grad_year ? `Class of ${report.prospect_grad_year}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    c.text(`Prospect — no Hammers account${detail ? ` · ${detail}` : ''}`, { size: 9 });
  }
  if (report.overall_grade != null) c.text(`OFP ${report.overall_grade}`, { size: 12, bold: true });
  c.rule();

  const hasLooks = positions.length > 0;
  const hasSides = batSides.length > 0;
  const hasPitchSides = pitchingSides.length > 0;
  const primaryPosition = (report.position_evaluated as string | null) ?? null;

  const rows = TOOL_DISPLAY_ORDER.map((key) => ({
    key,
    label:
      primaryPosition && (POSITION_BOUND_KEYS as readonly string[]).includes(key)
        ? `${TOOL_LABELS[key]} @ ${primaryPosition}`
        : TOOL_LABELS[key],
    present: (report[key] as number | null) ?? null,
    future: (report[`${key}_future`] as number | null) ?? null,
  }))
    .filter((r) => !(hasLooks && (POSITION_BOUND_KEYS as readonly string[]).includes(r.key)))
    .filter((r) => !(hasSides && (SIDE_SPLIT_KEYS as readonly string[]).includes(r.key)))
    .filter((r) => !(hasPitchSides && (PITCHING_SIDE_SPLIT_KEYS as readonly string[]).includes(r.key)))
    .filter((r) => r.present != null || r.future != null);

  if (rows.length > 0) {
    c.gradeRow('Tool', null, null, true);
    c.gradeRow('', null, null);
    c.y -= LINE;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const right = doc.internal.pageSize.getWidth() - MARGIN;
    doc.text('PRESENT', right - 30, c.y - LINE, { align: 'right' });
    doc.text('FUTURE', right, c.y - LINE, { align: 'right' });
    for (const r of rows) c.gradeRow(r.label, r.present, r.future);
    c.gap();
  }

  if (hasSides) {
    c.rule();
    c.text('Offense by batting side', { size: 10, bold: true });
    for (const s of batSides) {
      c.text(BAT_SIDE_LABELS[s.bat_side] ?? s.bat_side, { size: 9, bold: true });
      for (const key of SIDE_SPLIT_KEYS) {
        const present = (s[key] as number | null) ?? null;
        const future = (s[`${key}_future` as keyof BatSideGrades] as number | null) ?? null;
        if (present == null && future == null) continue;
        c.gradeRow(TOOL_LABELS[key], present, future);
      }
    }
    c.gap();
  }

  if (hasPitchSides) {
    c.rule();
    c.text('Pitching by throwing arm', { size: 10, bold: true });
    for (const s of pitchingSides) {
      c.text(PITCHING_SIDE_LABELS[s.throwing_hand] ?? String(s.throwing_hand), {
        size: 9,
        bold: true,
      });
      for (const key of PITCHING_SIDE_SPLIT_KEYS) {
        const present = (s[key] as number | null) ?? null;
        const future = (s[`${key}_future`] as number | null) ?? null;
        if (present == null && future == null) continue;
        c.gradeRow(TOOL_LABELS[key], present, future);
      }
    }
    c.gap();
  }

  if (hasLooks) {
    c.rule();
    c.text('Defense & arm by position', { size: 10, bold: true });
    for (const p of positions) {
      c.gradeRow(`${p.position} — Defense`, p.defense_grade ?? null, p.defense_grade_future ?? null);
      c.gradeRow(`${p.position} — Arm`, p.throwing_grade ?? null, p.throwing_grade_future ?? null);
    }
    c.gap();
  }

  if (report.notes) {
    c.rule();
    c.text('Write-up', { size: 10, bold: true });
    c.wrapped(report.notes);
  }

  c.gap(4);
  c.text(
    report.player_confirmed
      ? 'Player confirmed attendance at this event.'
      : report.player_rejected
        ? 'Player stated they were not at this event.'
        : 'Awaiting player confirmation of attendance.',
    { size: 8 },
  );
}

/** Downloads a single filed report as a PDF. */
export function exportReportPdf(input: ReportPdfInput): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const c = new Cursor(doc);
  writeReport(doc, c, input);
  doc.save(reportFileName(input.subject, input.report.graded_at));
}

export interface ComparisonColumn {
  subject: string;
  /** Latest recorded grade per tool key. */
  grades: Record<string, number | null>;
  overall: number | null;
  reportCount: number;
  latestAt: string | null;
}

/** Downloads a side-by-side grade comparison of two or more players. */
export function exportComparisonPdf(columns: ComparisonColumn[], toolKeys: string[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const labelWidth = 70;
  const colWidth = Math.max(
    22,
    (pageWidth - MARGIN * 2 - labelWidth) / Math.max(columns.length, 1),
  );
  let y = MARGIN;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Player comparison', MARGIN, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Latest recorded grade per tool, 20–80 scale.', MARGIN, y);
  y += 8;

  const header = () => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Tool', MARGIN, y);
    columns.forEach((col, i) => {
      doc.text(
        doc.splitTextToSize(col.subject, colWidth - 2)[0] as string,
        MARGIN + labelWidth + i * colWidth,
        y,
      );
    });
    y += 5;
    doc.setDrawColor(200);
    doc.line(MARGIN, y - 3, pageWidth - MARGIN, y - 3);
  };
  header();

  const row = (label: string, values: (number | null)[], bold = false) => {
    if (y > doc.internal.pageSize.getHeight() - MARGIN) {
      doc.addPage();
      y = MARGIN;
      header();
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, MARGIN, y);
    values.forEach((v, i) => {
      doc.text(fmt(v), MARGIN + labelWidth + i * colWidth, y);
    });
    y += 5;
  };

  row('OFP', columns.map((c) => c.overall), true);
  for (const key of toolKeys) {
    const values = columns.map((c) => c.grades[key] ?? null);
    if (values.every((v) => v == null)) continue;
    row(TOOL_LABELS[key] ?? key, values);
  }

  y += 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  columns.forEach((c, i) => {
    doc.text(
      `${c.reportCount} report${c.reportCount === 1 ? '' : 's'}`,
      MARGIN + labelWidth + i * colWidth,
      y,
    );
  });

  doc.save(`player-comparison-${new Date().toISOString().slice(0, 10)}.pdf`);
}
