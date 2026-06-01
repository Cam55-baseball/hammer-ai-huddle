/**
 * Phase 154+ — Recruiting roadmap. Read-only; gated by developmental matrix.
 */
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { prepareRows } from "@/lib/runtime/projections/types";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function RecruitingRoadmap({ athleteId, scope }: Props) {
  const { state: dev } = useDevelopmentalState(athleteId, scope);
  const q = useAsbTimeline({ athleteId });
  if (dev.gating_flags.recruiter_blocked) {
    return (
      <Card className="p-4 space-y-2">
        <h3 className="font-semibold text-foreground">Recruiting roadmap</h3>
        <Badge variant="destructive">gated by developmental stage</Badge>
        <p className="text-sm text-muted-foreground">
          Recruiter content is blocked at stage{" "}
          <span className="font-mono">{dev.current_stage ?? "unknown"}</span>.
          See <code>developmental-gating-matrix.md</code>.
        </p>
      </Card>
    );
  }
  const rows = prepareRows(q.data?.rows, scope, ["relational.recruiter."]);
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">Recruiting roadmap</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recruiter contact events yet.
        </p>
      ) : (
        <ol className="space-y-1">
          {rows.map((r) => {
            const p = r.payload as { school?: string; stage?: string };
            return (
              <li key={r.event_id} className="text-sm flex items-center gap-2">
                <Badge>{p.stage ?? "contact"}</Badge>
                <span>{p.school ?? "—"}</span>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
