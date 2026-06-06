/**
 * UHRC — detailed analysis drawer. Hosts the existing analysis
 * cards as drill-down children. This component does NOT re-score
 * or re-aggregate; it just composes the previously orphaned surfaces
 * into a single secondary view.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UhrcReport } from "@/lib/uhrc/types";

interface Props {
  report: UhrcReport;
  /** Existing analysis cards passed in by the page. */
  children?: React.ReactNode;
}

export function UhrcDetailedAnalysis({ report, children }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Pillar contributions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.pillars.map((p) => (
            <div key={p.id} className="rounded border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">{p.label}</span>
                <span className="text-xs text-muted-foreground">
                  score {p.score != null ? Math.round(p.score) : "—"} · confidence {p.confidence}
                </span>
              </div>
              <ul className="space-y-1 text-xs">
                {p.contributions.map((c) => (
                  <li key={c.source_signal_id} className="flex justify-between gap-2">
                    <span className="truncate">
                      <code className="text-[10px] text-muted-foreground">{c.source_signal_id}</code>{" "}
                      {c.explanation}
                    </span>
                    <span className={c.missing ? "text-muted-foreground" : "font-medium"}>
                      {c.missing ? "missing" : `${Math.round(c.value!)} · w${c.weight}`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
