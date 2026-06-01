/**
 * Phase 154 — Developmental Stage chip. Read-only projection.
 *
 * Presentation pass: humanizes stage names; technical labels behind debug.
 */
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import type { Scope } from "@/lib/runtime/projections/types";
import { Badge } from "@/components/ui/badge";
import { DEVELOPMENTAL_VOICE } from "@/lib/relational/copy";

interface Props {
  athleteId: string;
  scope: Scope;
  debug?: boolean;
}

export function DevelopmentalStageChip({ athleteId, scope, debug = false }: Props) {
  const { state } = useDevelopmentalState(athleteId, scope);
  const stageKey = state.current_stage ?? "unknown";
  const stageLabel = DEVELOPMENTAL_VOICE.stages[stageKey] ?? stageKey;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge>{stageLabel}</Badge>
      <Badge variant="secondary">
        {DEVELOPMENTAL_VOICE.loadCeiling(state.effective_load_ceiling_pct)}
      </Badge>
      {state.gating_flags.recruiter_blocked && (
        <Badge variant="outline">Recruiting paused</Badge>
      )}
      {state.is_minor && (
        <Badge variant="outline">{DEVELOPMENTAL_VOICE.minorBadge}</Badge>
      )}
      {debug && <Badge variant="outline">key: {stageKey}</Badge>}
    </div>
  );
}
