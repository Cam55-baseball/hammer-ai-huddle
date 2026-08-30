import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, ClipboardCheck, ShieldCheck, Clock, XCircle } from 'lucide-react';
import type { EvaluationRow } from '@/hooks/useEvaluations';

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
import type { ReportPositionLook } from '@/lib/evaluation/positionGrades';
import type { BatSideGrades, PitchingSideGrades } from '@/hooks/useReportDetails';


/** 20–80 scale colour anchor. 50 is average. */
function gradeTone(n: number | null): string {
  if (n == null) return 'text-muted-foreground';
  if (n >= 65) return 'text-emerald-500';
  if (n >= 55) return 'text-sky-500';
  if (n >= 45) return 'text-foreground';
  if (n >= 35) return 'text-amber-500';
  return 'text-destructive';
}

export interface EvaluationReportCardProps {
  report: EvaluationRow;
  /** Line under the title, e.g. evaluator name + credentials, or athlete name. */
  attribution?: string;
  /** Show the confirmation state chip (evaluator-side view). */
  showConfirmationStatus?: boolean;
  /** Every position look filed on this report (one event can carry several). */
  positions?: ReportPositionLook[];
  /** Per-batting-side offensive grades for a switch hitter seen from both sides. */
  batSides?: BatSideGrades[];
  /** Per-throwing-side pitching grades for an ambidextrous pitcher. */
  pitchingSides?: PitchingSideGrades[];
}

export function EvaluationReportCard({
  report,
  attribution,
  showConfirmationStatus,
  positions = [],
  batSides = [],
  pitchingSides = [],
}: EvaluationReportCardProps) {
  const position = (report.position_evaluated as string | null) ?? null;
  const hasLooks = positions.length > 0;
  const hasSides = batSides.length > 0;
  const hasPitchingSides = pitchingSides.length > 0;
  const rows = TOOL_DISPLAY_ORDER
    .map((key) => ({
      key,
      label:
        position && (POSITION_BOUND_KEYS as readonly string[]).includes(key)
          ? `${TOOL_LABELS[key]} @ ${position}`
          : TOOL_LABELS[key],
      present: (report[key] as number | null) ?? null,
      future: (report[`${key}_future`] as number | null) ?? null,
    }))
    // Position looks and per-side splits get their own sections below, so they
    // are never also shown as a single blended row.
    .filter((r) => !(hasLooks && (POSITION_BOUND_KEYS as readonly string[]).includes(r.key)))
    .filter((r) => !(hasSides && (SIDE_SPLIT_KEYS as readonly string[]).includes(r.key)))
    .filter((r) => r.present != null || r.future != null);



  const dateLabel = new Date(report.graded_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary shrink-0" />
              {reportTypeLabel(report.grade_type)}
            </CardTitle>
            <CardDescription className="mt-1">
              {attribution ? <span className="block font-medium text-foreground">{attribution}</span> : null}
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> {dateLabel}
              </span>
              {report.evaluation_context ? <> · {report.evaluation_context}</> : null}
              {report.event_description ? <> · {report.event_description}</> : null}
              {(hasLooks || position || report.is_switch_hitter) && (
                <span className="mt-1 flex flex-wrap gap-1">
                  {hasLooks
                    ? positions.map((p) => (
                        <Badge key={p.position} variant="outline">
                          Seen at {p.position}
                        </Badge>
                      ))
                    : position && <Badge variant="outline">Seen at {position}</Badge>}
                  {report.is_switch_hitter ? <Badge variant="outline">Switch hitter</Badge> : null}
                  {hasSides ? <Badge variant="outline">Both sides seen</Badge> : null}
                </span>
              )}

            </CardDescription>

          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {report.overall_grade != null && (
              <div className="text-right">
                <div className={`text-2xl font-bold leading-none ${gradeTone(report.overall_grade)}`}>
                  {report.overall_grade}
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">OFP</div>
              </div>
            )}
            {showConfirmationStatus &&
              (report.player_confirmed ? (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Confirmed
                </Badge>
              ) : report.player_rejected ? (
                <Badge variant="outline" className="gap-1 border-destructive/50 text-destructive">
                  <XCircle className="h-3 w-3" /> Player says not there
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                  <Clock className="h-3 w-3" /> Awaiting player
                </Badge>
              ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length > 0 && (
          <>
            <div className="grid grid-cols-[1fr_64px_64px] gap-3 text-xs font-medium text-muted-foreground">
              <span>Tool</span>
              <span className="text-center">Present</span>
              <span className="text-center">Future</span>
            </div>
            <Separator />
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[1fr_64px_64px] gap-3 items-center text-sm">
                <span className="truncate">{r.label}</span>
                <span className={`text-center font-semibold ${gradeTone(r.present)}`}>
                  {r.present ?? '—'}
                </span>
                <span className={`text-center font-semibold ${gradeTone(r.future)}`}>
                  {r.future ?? '—'}
                </span>
              </div>
            ))}
          </>
        )}

        {hasSides && (
          <div className="space-y-2">
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">Offense by batting side</p>
            <div className="grid grid-cols-[1fr_64px_64px] gap-3 text-xs font-medium text-muted-foreground">
              <span>Tool</span>
              <span className="text-center">Present</span>
              <span className="text-center">Future</span>
            </div>
            {batSides.map((s) => (
              <div key={s.bat_side} className="space-y-1">
                <p className="text-xs font-medium">{BAT_SIDE_LABELS[s.bat_side]}</p>
                {SIDE_SPLIT_KEYS.map((key) => {
                  const present = (s[key] as number | null) ?? null;
                  const future = (s[`${key}_future` as keyof BatSideGrades] as number | null) ?? null;
                  if (present == null && future == null) return null;
                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[1fr_64px_64px] gap-3 items-center text-sm"
                    >
                      <span className="truncate">{TOOL_LABELS[key]}</span>
                      <span className={`text-center font-semibold ${gradeTone(present)}`}>
                        {present ?? '—'}
                      </span>
                      <span className={`text-center font-semibold ${gradeTone(future)}`}>
                        {future ?? '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}

        {hasLooks && (
          <div className="space-y-2">
            <Separator />
            <p className="text-xs font-medium text-muted-foreground">Defense &amp; Arm by position</p>
            <div className="grid grid-cols-[1fr_64px_64px_64px_64px] gap-2 text-[11px] font-medium text-muted-foreground">
              <span>Position</span>
              <span className="text-center">Def</span>
              <span className="text-center">Def fut</span>
              <span className="text-center">Arm</span>
              <span className="text-center">Arm fut</span>
            </div>
            {positions.map((p) => (
              <div
                key={p.position}
                className="grid grid-cols-[1fr_64px_64px_64px_64px] gap-2 items-center text-sm"
              >
                <span className="truncate">{p.position}</span>
                <span className={`text-center font-semibold ${gradeTone(p.defense_grade ?? null)}`}>
                  {p.defense_grade ?? '—'}
                </span>
                <span className={`text-center ${gradeTone(p.defense_grade_future ?? null)}`}>
                  {p.defense_grade_future ?? '—'}
                </span>
                <span className={`text-center font-semibold ${gradeTone(p.throwing_grade ?? null)}`}>
                  {p.throwing_grade ?? '—'}
                </span>
                <span className={`text-center ${gradeTone(p.throwing_grade_future ?? null)}`}>
                  {p.throwing_grade_future ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {report.notes && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Write-up</p>
            <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
          </div>
        )}
        {rows.length === 0 && !report.notes && (
          <p className="text-sm text-muted-foreground">No tool grades or write-up were recorded.</p>
        )}
      </CardContent>
    </Card>
  );
}
