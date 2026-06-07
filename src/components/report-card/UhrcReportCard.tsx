/**
 * UHRC Report Card — primary athlete-facing analysis surface.
 *
 * Pure presentation over `UhrcReport`. Every pillar exposes a
 * one-click drill-down into its contributions. No new intelligence,
 * no re-scoring. Source event ids surface so the lineage handle is
 * reachable per Phase 33/46/47 observability supremacy.
 *
 * Command Center Authority Restoration §B / §E (RFL-069):
 *   - Adds "Work on this in today's plan" remediation CTA that anchors
 *     into HammerDailyPlan so the report card is no longer a dead end.
 *   - Mounts the canonical LineageDrilldownButton when a source event
 *     id is available.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LineageDrilldownButton } from "@/components/command/LineageDrilldownButton";
import type { UhrcReport } from "@/lib/uhrc/types";
import { ArrowRight, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  report: UhrcReport;
  /** Show the "Detailed analysis" toggle. Defaults to true. */
  showDetailedToggle?: boolean;
  /** When parent owns detailed-view state. */
  onToggleDetailed?: (open: boolean) => void;
  /** Lineage handle for the LineageDrilldownButton. */
  sourceEventId?: string | null;
}

function tierBadge(tier: string | null) {
  if (!tier) return null;
  const variant =
    tier === "clean" ? "secondary" : tier === "critical" ? "destructive" : "outline";
  return (
    <Badge variant={variant as "secondary" | "destructive" | "outline"} className="ml-2 text-[10px] uppercase">
      {tier}
    </Badge>
  );
}

export function UhrcReportCard({
  report,
  showDetailedToggle = true,
  onToggleDetailed,
  sourceEventId = null,
}: Props) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    onToggleDetailed?.(next);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-lg">
          <span>Hammers Report Card</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Composite{" "}
              <strong className="text-foreground">
                {report.composite != null ? Math.round(report.composite) : "—"}
              </strong>
            </span>
            <Badge variant="outline" className="text-[10px]">
              {report.engine_version}
            </Badge>
            <LineageDrilldownButton sourceEventId={sourceEventId} />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.biggest_leak && (
          <div className="rounded border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
            <span className="font-medium">Biggest leak:</span> {report.biggest_leak.summary}
          </div>
        )}
        {report.biggest_win && (
          <div className="rounded border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-3 text-sm">
            <span className="font-medium">Biggest win:</span> {report.biggest_win.summary}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {report.pillars.map((p) => (
            <div key={p.id} className="rounded border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{p.label}</span>
                {tierBadge(p.tier)}
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {p.score != null ? Math.round(p.score) : "—"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {p.contributions.filter((c) => !c.missing).length}/{p.contributions.length} signals
                · confidence {p.confidence}
              </div>
            </div>
          ))}
        </div>

        <div className="text-[11px] text-muted-foreground">
          {report.missingness.total_signals_present}/{report.missingness.total_signals_expected}{" "}
          source signals present
          {report.missingness.missing_signal_ids.length > 0 && (
            <> · missing: {report.missingness.missing_signal_ids.slice(0, 4).join(", ")}
              {report.missingness.missing_signal_ids.length > 4 && "…"}
            </>
          )}
        </div>

        <Button asChild variant="outline" size="sm" className="w-full justify-between">
          <Link to="/command#hammer-plan" aria-label="Work on this in today's plan">
            <span>Work on this in today's plan</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        {showDetailedToggle && (
          <Button variant="ghost" size="sm" className="text-xs" onClick={toggle}>
            {open ? <ChevronDown className="mr-1 h-3 w-3" /> : <ChevronRight className="mr-1 h-3 w-3" />}
            Detailed analysis
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
