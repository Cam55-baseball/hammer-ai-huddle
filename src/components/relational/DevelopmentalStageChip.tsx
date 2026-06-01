/**
 * Phase 154 — Developmental Stage chip. Read-only projection.
 */
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import type { Scope } from "@/lib/runtime/projections/types";
import { Badge } from "@/components/ui/badge";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function DevelopmentalStageChip({ athleteId, scope }: Props) {
  const { state } = useDevelopmentalState(athleteId, scope);
  if (!state.current_stage) {
    return <Badge variant="outline">stage: unknown</Badge>;
  }
  return (
    <div className="flex items-center gap-2">
      <Badge>stage: {state.current_stage}</Badge>
      <Badge variant="secondary">
        load ceiling {state.effective_load_ceiling_pct ?? "—"}%
      </Badge>
      {state.gating_flags.recruiter_blocked && (
        <Badge variant="destructive">recruiter blocked</Badge>
      )}
      {state.is_minor && <Badge variant="outline">minor</Badge>}
    </div>
  );
}
