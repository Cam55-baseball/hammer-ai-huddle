import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ReportCardTile } from "./ReportCardTile";
import { TileExplainerSheet } from "./TileExplainerSheet";
import { getReportCardSpec, type AnalysisLike, type ReportCardTileSpec } from "@/lib/reportCard";

interface Props {
  sport: string | undefined;
  module: string | undefined;
  analysis: AnalysisLike;
}

export function HammerReportCard({ sport, module, analysis }: Props) {
  const spec = useMemo(() => getReportCardSpec(sport, module), [sport, module]);
  const [openTile, setOpenTile] = useState<ReportCardTileSpec | null>(null);

  if (!spec) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Report card for this analysis type is coming soon. Use the Analysis tab for full details.
      </div>
    );
  }

  const tilesWithState = spec.tiles.map((t) => ({ spec: t, state: t.compute(analysis) }));

  const nonNegFailed = tilesWithState.some(
    (t) => t.spec.nonNegotiable && t.state.status === "fail",
  );

  // Group by phase if requested
  const groups = spec.groupByPhase
    ? Object.entries(
        tilesWithState.reduce<Record<string, typeof tilesWithState>>((acc, t) => {
          const phase = t.spec.phase ?? "Other";
          (acc[phase] ||= []).push(t);
          return acc;
        }, {}),
      )
    : ([["", tilesWithState]] as [string, typeof tilesWithState][]);

  return (
    <div className="space-y-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xl font-bold">Hammer Report Card</h3>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {spec.disciplineLabel}
        </span>
      </div>

      {nonNegFailed && (
        <div className="flex items-start gap-3 rounded-xl border border-destructive bg-destructive/10 p-3 text-destructive">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="text-sm">
            <strong className="font-bold uppercase tracking-wider">Non-Negotiable Failed</strong>
            <p className="mt-0.5 opacity-90">
              One or more non-negotiable categories did not pass. Tap each to learn how to fix it.
            </p>
          </div>
        </div>
      )}

      {groups.map(([phase, tiles]) => (
        <div key={phase || "all"} className="space-y-3">
          {phase && (
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {phase}
            </h4>
          )}
          <div className="grid grid-cols-2 gap-3">
            {tiles.map(({ spec: tileSpec, state }) => (
              <ReportCardTile
                key={tileSpec.key}
                spec={tileSpec}
                state={state}
                onOpen={() => setOpenTile(tileSpec)}
              />
            ))}
          </div>
        </div>
      ))}

      <TileExplainerSheet
        spec={openTile}
        open={openTile !== null}
        onOpenChange={(o) => !o && setOpenTile(null)}
      />
    </div>
  );
}
