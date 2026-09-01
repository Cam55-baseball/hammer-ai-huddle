import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, ShieldCheck, XCircle } from 'lucide-react';
import type { EvaluationRow } from '@/hooks/useEvaluations';
import { EvaluationReportCard } from './EvaluationReportCard';
import { reportTypeLabel } from '@/lib/evaluation/scoutingTools';
import type { ReportDetails } from '@/hooks/useReportDetails';

/**
 * Reports as a closed-by-default list, newest first.
 *
 * The row you scan is date → what the look was (camp, game, team) → who filed
 * it and their credentials. Grades only open when you ask for them, so a
 * season's worth of reports reads as a short list instead of a wall.
 */
export interface ReportAccordionListProps {
  reports: EvaluationRow[];
  /** Line shown on the row and inside the report (evaluator credentials, or athlete name). */
  attributionFor: (report: EvaluationRow) => string | undefined;
  details?: ReportDetails;
  /** Evaluator-side view: show whether the player has confirmed. */
  showConfirmationStatus?: boolean;
  /** When given, each opened report offers a "Download PDF" action. */
  onExport?: (report: EvaluationRow) => void;
  emptyLabel?: string;
}


function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** "In-person — game · vs. Central High" collapsed to what actually identifies the look. */
function contextLabel(r: EvaluationRow): string | null {
  const parts = [r.evaluation_context, r.event_description].filter(Boolean) as string[];
  return parts.length > 0 ? parts.join(' · ') : null;
}

export function ReportAccordionList({
  reports,
  attributionFor,
  details,
  showConfirmationStatus,
  emptyLabel = 'No reports yet.',
}: ReportAccordionListProps) {
  if (reports.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const ordered = [...reports].sort(
    (a, b) => new Date(b.graded_at).getTime() - new Date(a.graded_at).getTime(),
  );

  return (
    <Accordion type="multiple" className="rounded-md border divide-y">
      {ordered.map((r) => {
        const attribution = attributionFor(r);
        const context = contextLabel(r);
        return (
          <AccordionItem key={r.id} value={r.id} className="border-b-0 px-3">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex w-full items-start gap-3 pr-2 text-left">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{dateLabel(r.graded_at)}</span>
                    <span className="text-muted-foreground font-normal truncate">
                      {reportTypeLabel(r.grade_type)}
                    </span>
                  </div>
                  {context && (
                    <p className="text-xs text-muted-foreground truncate">{context}</p>
                  )}
                  {attribution && (
                    <p className="text-xs text-foreground/80 truncate">{attribution}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {r.overall_grade != null && (
                    <div className="text-right leading-none">
                      <div className="text-lg font-bold">{r.overall_grade}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        OFP
                      </div>
                    </div>
                  )}
                  {showConfirmationStatus &&
                    (r.player_confirmed ? (
                      <Badge variant="secondary" className="gap-1">
                        <ShieldCheck className="h-3 w-3" /> Confirmed
                      </Badge>
                    ) : r.player_rejected ? (
                      <Badge
                        variant="outline"
                        className="gap-1 border-destructive/50 text-destructive"
                      >
                        <XCircle className="h-3 w-3" /> Not there
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 border-amber-500/50 text-amber-600">
                        <Clock className="h-3 w-3" /> Awaiting
                      </Badge>
                    ))}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <EvaluationReportCard
                report={r}
                attribution={attribution}
                positions={details?.positionsByReport[r.id] ?? []}
                batSides={details?.batSidesByReport[r.id] ?? []}
                pitchingSides={details?.pitchingSidesByReport[r.id] ?? []}
                showConfirmationStatus={showConfirmationStatus}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
