/**
 * WkProgressionNote — renders the progression lineage the generator attached
 * to a speed / bat-speed prescription.
 *
 * Read-only presentation. It shows the athlete three things and nothing else:
 * where today sits in the 4-week wave, what it builds on, and what number to
 * beat. When no history exists it says so plainly rather than inventing one.
 */
import { Badge } from "@/components/ui/badge";
import { TrendingUp, History, Target, ArrowRight, Compass, Gauge } from "lucide-react";

export interface ProgressionPayloadShape {
  block_index?: number;
  week_in_block?: number;
  block_phase?: string;
  is_deload_week?: boolean;
  builds_on?: string | null;
  target?: string | null;
  next_step?: string | null;
  baseline?: boolean;
  domain?: string;
  domain_history?: string | null;
  career_stage?: string;
  career_label?: string;
  career_focus?: string;
  test_day?: boolean;
  test_metric?: string | null;
  test_metric_label?: string | null;
  measurement_gap?: string | null;
}


const PHASE_COPY: Record<string, string> = {
  accumulate: "Build the base",
  intensify: "Add work",
  peak: "Peak intent",
  deload: "Easy week + re-test",
};

export function WkProgressionBadge({
  progression,
  stageLabel,
}: {
  progression?: ProgressionPayloadShape | null;
  stageLabel?: string | null;
}) {
  if (!progression && !stageLabel) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {stageLabel && (
        <Badge variant="outline" className="text-[10px] border-primary/50 text-primary">
          {stageLabel}
        </Badge>
      )}
      {/* Step 21D2 — no block numbers on movement cards. Athlete words only. */}
      {progression?.week_in_block != null && progression.block_phase && PHASE_COPY[progression.block_phase] && (
        <Badge variant="secondary" className="text-[10px]">
          {PHASE_COPY[progression.block_phase]} · Week {progression.week_in_block}
        </Badge>
      )}
      {progression?.test_day && (
        <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/40">
          Test day{progression.test_metric_label ? ` · ${progression.test_metric_label}` : ""}
        </Badge>
      )}
    </div>
  );
}

export function WkProgressionNote({
  progression,
}: {
  progression?: ProgressionPayloadShape | null;
}) {
  if (!progression) return null;
  const {
    builds_on,
    target,
    next_step,
    baseline,
    domain_history,
    career_label,
    career_focus,
    test_day,
    test_metric_label,
    measurement_gap,
  } = progression;
  if (!builds_on && !target && !next_step && !domain_history && !measurement_gap) return null;

  return (
    <div className="rounded border border-emerald-500/25 bg-emerald-500/5 p-2 space-y-1">
      <div className="font-medium flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
        <TrendingUp className="h-3 w-3" /> Your progression
      </div>
      {test_day && (
        <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
          <Gauge className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            Re-test today — log your {test_metric_label ?? "result"}. This number closes the block.
          </span>
        </div>
      )}
      {measurement_gap && (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <Gauge className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{measurement_gap}</span>
        </div>
      )}

      {domain_history && (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <History className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{domain_history}</span>
        </div>
      )}
      {builds_on && (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <History className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{builds_on}</span>
        </div>
      )}
      {target ? (
        <div className="flex items-start gap-1.5 text-foreground/90">
          <Target className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{target}</span>
        </div>
      ) : baseline ? (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <Target className="h-3 w-3 mt-0.5 shrink-0" />
          <span>No logged number yet — log this one and it becomes the mark to beat.</span>
        </div>
      ) : null}
      {next_step && (
        <div className="flex items-start gap-1.5 text-muted-foreground">
          <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{next_step}</span>
        </div>
      )}
      {(career_label || career_focus) && (
        <div className="flex items-start gap-1.5 text-muted-foreground border-t border-emerald-500/20 pt-1">
          <Compass className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            {career_label ? <span className="font-medium text-foreground/80">{career_label}: </span> : null}
            {career_focus}
          </span>
        </div>
      )}
    </div>
  );
}


/**
 * Step 21D2 — strip internal block numbering from a stored session title and
 * leave athlete words only: "Block 36 · Week 2 · add work — Maximum Bat Speed"
 * becomes "Build the base · Week 2 — Maximum Bat Speed".
 */
export function athleteSessionTitle(title?: string | null): string | null {
  const raw = String(title ?? "").trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/^Block\s+\d+\s*·\s*/i, "")
    .replace(/(Week\s+\d+)\s*·\s*([a-z][a-z +-]*?)\s*(?=—|$)/i, (_m, wk: string, phase: string) => {
      const key = phase.trim().toLowerCase();
      const pretty =
        Object.entries(PHASE_COPY).find(([, v]) => v.toLowerCase() === key)?.[1] ??
        PHASE_COPY[key] ??
        phase.trim().charAt(0).toUpperCase() + phase.trim().slice(1);
      return `${pretty} · ${wk} `;
    })
    .trim();
  return cleaned.length > 0 ? cleaned : null;
}

/** Session-level header line, e.g. "Build the base · Week 2 — Maximum Bat Speed". */
export function WkSessionShapeLine({
  title,
  shape,
}: {
  title?: string | null;
  shape?: { min?: number; max?: number; actual?: number } | null;
}) {
  const display = athleteSessionTitle(title);
  if (!display && !shape?.actual) return null;
  return (
    <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2">
      {display && <span className="font-medium text-foreground/80">{display}</span>}
      {shape?.actual != null && (
        <span>
          {shape.actual} movement{shape.actual === 1 ? "" : "s"} in sequence
        </span>
      )}
    </div>
  );
}
