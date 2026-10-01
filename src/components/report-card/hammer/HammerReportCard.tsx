import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ReportCardTile } from "./ReportCardTile";
import { TileExplainerSheet } from "./TileExplainerSheet";
import { FoilGradeCard } from "./visuals/FoilGradeCard";
import { PhaseRail, type PhaseNode } from "./visuals/PhaseRail";
import { ShareCardExport } from "./visuals/ShareCardExport";
import { getReportCardSpec, type AnalysisLike, type ReportCardTileSpec } from "@/lib/reportCard";
import { applySlotEmphasis, readArmSlot } from "@/lib/reportCard/slotEmphasis";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useScoredGradingAccess, SCORED_GRADING_NOTICE } from "@/hooks/useScoredGradingAccess";
import { measuredClipSpec } from "@/lib/reportCard/measuredClipSpec";
import { measuredClipScore } from "@/lib/reportCard/measuredClipSpec";
import { PHASE_EXPLAINER } from "@/lib/reportCard/measuredClipCopy";

interface Props {
  sport: string | undefined;
  module: string | undefined;
  analysis: AnalysisLike;
  /** Compact mode: ribbon + phase rail only; tiles hidden behind a toggle. */
  compact?: boolean;
  /** Show the Share / PNG export button. */
  showShare?: boolean;
  athleteName?: string | null;
  /** Only locally computed, clip-specific pose readings; never legacy AI scores. */
  measuredOnly?: boolean;
}

export function HammerReportCard({
  sport,
  module,
  analysis,
  compact = false,
  showShare = true,
  athleteName,
  measuredOnly = false,
}: Props) {
  const slot = readArmSlot(analysis as AnalysisLike, module);
  const spec = useMemo(() => {
    const s = measuredOnly ? measuredClipSpec(sport, module) : getReportCardSpec(sport, module);
    return s && !measuredOnly ? applySlotEmphasis(s, slot, sport) : s;
  }, [sport, module, slot, measuredOnly]);
  const [openTile, setOpenTile] = useState<ReportCardTileSpec | null>(null);
  const [activePhase, setActivePhase] = useState<string | null>(null);
  const [tilesOpen, setTilesOpen] = useState(!compact);
  const cardRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Release gate — scored grading is owner/admin only until the measurement
  // engine is real. Enforced again server-side; this is the UI half.
  const { allowed: scoresAllowed, loading: gateLoading } = useScoredGradingAccess();

  if (gateLoading && !measuredOnly) return null;
  if (!scoresAllowed && !measuredOnly) {
    return (
      <div className="space-y-2 rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">Grades are off for now</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{SCORED_GRADING_NOTICE}</p>
      </div>
    );
  }


  if (!spec) {
    return (
      <div className="rounded-2xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
        This type of analysis doesn't have a report card. Your findings above are the full result.
      </div>
    );
  }

  // Honest zero-tile state. A discipline whose every metric is suppressed
  // (all hitting today) says so plainly instead of rendering an empty grid
  // or back-filling unvalidated values.
  if (spec.tiles.length === 0) {
    return (
      <div className="space-y-2 rounded-2xl border bg-muted/30 p-6 text-center">
        <p className="text-sm font-semibold text-foreground">
          No graded tiles for {spec.disciplineLabel} yet
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Every {spec.disciplineLabel.toLowerCase()} measurement is still being
          validated, so we're showing you nothing rather than a number we can't
          stand behind. Your written analysis on the Analysis tab is unaffected.
        </p>
      </div>
    );
  }



  const tilesWithState = spec.tiles.map((t) => ({ spec: t, state: t.compute(analysis) }));
  const scored = measuredOnly ? measuredClipScore(analysis as Record<string, unknown>, sport, module) : null;

  const total = tilesWithState.length;
  const measured = tilesWithState.filter((t) => t.state.status !== "missing").length;
  const eliteCount = tilesWithState.filter((t) => t.state.status === "elite").length;
  const nonNegotiableFailed = tilesWithState.filter(
    (t) => t.spec.nonNegotiable && t.state.status === "fail",
  ).length;

  // Build phase summary for the rail (BH only)
  const phases: PhaseNode[] = (() => {
    if (!spec.groupByPhase) return [];
    const map = new Map<string, { passed: number; measured: number; total: number }>();
    for (const t of tilesWithState) {
      const k = t.spec.phase ?? "Other";
      const e = map.get(k) ?? { passed: 0, measured: 0, total: 0 };
      e.total += 1;
      if (t.state.status !== "missing" && t.state.status !== "record") {
        e.measured += 1;
        if (t.state.status === "pass" || t.state.status === "elite") e.passed += 1;
      }
      map.set(k, e);
    }
    return Array.from(map.entries()).map(([key, v]) => ({
      key,
      label: key,
      count: v.total,
       measured: scored ? (scored.categories.find((c) => c.title === key)?.coverage.scoredTiles ?? v.measured) : v.measured,
      passRate: v.measured > 0 ? v.passed / v.measured : 0,
       ...(scored?.categories.find((c) => c.title === key) ? {
         score: scored.categories.find((c) => c.title === key)?.score,
         points: scored.categories.find((c) => c.title === key)?.points,
         status: scored.categories.find((c) => c.title === key)?.status,
       } : {}),
    }));
  })();

  const visibleTiles = activePhase
    ? tilesWithState.filter((t) => (t.spec.phase ?? "Other") === activePhase)
    : tilesWithState;

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
      {/* Ribbon — discipline + coverage + encouragement (no letter, no /100 score) */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <FoilGradeCard
          disciplineLabel={spec.disciplineLabel}
          measured={measured}
          total={total}
          eliteCount={eliteCount}
          nonNegotiableFailed={nonNegotiableFailed}
          categoryTotal={scored?.total}
          categoryMax={scored ? 100 : undefined}
          coverageLabel={scored ? `${scored.categories.filter((c) => !c.additive && c.status === "complete").length} / ${scored.categories.filter((c) => !c.additive).length} categories measured` : undefined}
        />
      </motion.div>

      {scored?.card === "hitting" && (
        <motion.section
          aria-label="Hitting phases"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="rc-glass-tile rc-tile-border-pass relative overflow-hidden rounded-2xl border p-4 sm:p-5"
        >
          <div aria-hidden="true" className="rc-foil pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {PHASE_EXPLAINER.map((line) => (
              <p key={line} className="border-l-2 border-primary/50 pl-3 text-xs font-medium leading-relaxed text-foreground/90">{line}</p>
            ))}
          </div>
        </motion.section>
      )}

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
