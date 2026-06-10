import { useMemo, useState } from "react";
import { ReportCardTile } from "./ReportCardTile";
import { TileExplainerSheet } from "./TileExplainerSheet";
import { FoilGradeCard } from "./visuals/FoilGradeCard";
import { PhaseRail, type PhaseNode } from "./visuals/PhaseRail";
import { gradeFromTiles } from "@/lib/reportCard/grade";
import { getReportCardSpec, type AnalysisLike, type ReportCardTileSpec } from "@/lib/reportCard";

interface Props {
  sport: string | undefined;
  module: string | undefined;
  analysis: AnalysisLike;
}

export function HammerReportCard({ sport, module, analysis }: Props) {
  const spec = useMemo(() => getReportCardSpec(sport, module), [sport, module]);
  const [openTile, setOpenTile] = useState<ReportCardTileSpec | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);

  if (!spec) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        Report card for this analysis type is coming soon.
      </div>
    );
  }

  const tilesWithState = spec.tiles.map((t) => ({ spec: t, state: t.compute(analysis) }));
  const grade = useMemo(() => gradeFromTiles(tilesWithState), [tilesWithState]);

  // Build phase summary for the rail (BH only)
  const phases: PhaseNode[] = useMemo(() => {
    if (!spec.groupByPhase) return [];
    const map = new Map<string, { passed: number; measured: number; total: number }>();
    for (const t of tilesWithState) {
      const k = t.spec.phase ?? "Other";
      const e = map.get(k) ?? { passed: 0, measured: 0, total: 0 };
      e.total += 1;
      if (t.state.status !== "missing") {
        e.measured += 1;
        if (t.state.status === "pass") e.passed += 1;
      }
      map.set(k, e);
    }
    return Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: key,
      count: v.total,
      passRate: v.measured > 0 ? v.passed / v.measured : 0,
    }));
  }, [tilesWithState, spec.groupByPhase]);

  const visibleTiles = activePhase
    ? tilesWithState.filter((t) => (t.spec.phase ?? "Other") === activePhase)
    : tilesWithState;

  // Group by phase if requested
  const groups = spec.groupByPhase
    ? Object.entries(
        visibleTiles.reduce<Record<string, typeof visibleTiles>>((acc, t) => {
          const phase = t.spec.phase ?? "Other";
          (acc[phase] ||= []).push(t);
          return acc;
        }, {}),
      )
    : ([["", visibleTiles]] as [string, typeof visibleTiles][]);

  return (
    <div className="space-y-5">
      <FoilGradeCard grade={grade} disciplineLabel={spec.disciplineLabel} />

      {spec.groupByPhase && phases.length > 0 && (
        <PhaseRail phases={phases} activePhase={activePhase} onSelect={setActivePhase} />
      )}

      {groups.map(([phase, tiles]) => (
        <div key={phase || "all"} className="space-y-2.5">
          {phase && (
            <h4 className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {phase}
            </h4>
          )}
          <div className="grid grid-cols-2 gap-3">
            {tiles.map(({ spec: tileSpec, state }, i) => (
              <ReportCardTile
                key={tileSpec.key}
                spec={tileSpec}
                state={state}
                onOpen={() => setOpenTile(tileSpec)}
                index={i}
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
