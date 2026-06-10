import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ReportCardTile } from "./ReportCardTile";
import { TileExplainerSheet } from "./TileExplainerSheet";
import { FoilGradeCard } from "./visuals/FoilGradeCard";
import { PhaseRail, type PhaseNode } from "./visuals/PhaseRail";
import { ShareCardExport } from "./visuals/ShareCardExport";
import { gradeFromTiles } from "@/lib/reportCard/grade";
import { getReportCardSpec, type AnalysisLike, type ReportCardTileSpec } from "@/lib/reportCard";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  sport: string | undefined;
  module: string | undefined;
  analysis: AnalysisLike;
  /** Compact mode: ribbon + phase rail only; tiles hidden behind a toggle. */
  compact?: boolean;
  /** Show the Share / PNG export button. */
  showShare?: boolean;
  athleteName?: string | null;
}

export function HammerReportCard({
  sport,
  module,
  analysis,
  compact = false,
  showShare = true,
  athleteName,
}: Props) {
  const spec = useMemo(() => getReportCardSpec(sport, module), [sport, module]);
  const [openTile, setOpenTile] = useState<ReportCardTileSpec | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [tilesOpen, setTilesOpen] = useState(!compact);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

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
    <div className="space-y-5 rc-print-card" ref={cardRef}>
      {/* Ribbon — mount immediately */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <FoilGradeCard grade={grade} disciplineLabel={spec.disciplineLabel} />
      </motion.div>

      {/* Phase rail — staggered 120ms after ribbon */}
      {spec.groupByPhase && phases.length > 0 && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
        >
          <PhaseRail phases={phases} activePhase={activePhase} onSelect={setActivePhase} />
        </motion.div>
      )}

      {/* Compact toggle */}
      {compact && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setTilesOpen((s) => !s)}
          className="w-full justify-center gap-1 text-xs font-bold uppercase tracking-wider"
          data-share-export-exclude="true"
        >
          {tilesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {tilesOpen ? "Hide tiles" : `Show all ${tilesWithState.length} tiles`}
        </Button>
      )}

      {/* Tiles */}
      {tilesOpen &&
        groups.map(([phase, tiles], gi) => (
          <motion.div
            key={phase || "all"}
            className="space-y-2.5"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.24 + gi * 0.04 }}
          >
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
          </motion.div>
        ))}

      {showShare && (
        <div data-share-export-exclude="true">
          <ShareCardExport
            targetRef={cardRef as React.RefObject<HTMLElement>}
            athleteName={athleteName}
            fileLabel={`${spec.disciplineLabel.toLowerCase().replace(/\s+/g, "-")}-report-card`}
          />
        </div>
      )}

      <TileExplainerSheet
        spec={openTile}
        open={openTile !== null}
        onOpenChange={(o) => !o && setOpenTile(null)}
      />
    </div>
  );
}
