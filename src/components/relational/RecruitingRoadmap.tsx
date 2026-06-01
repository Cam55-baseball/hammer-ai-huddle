/**
 * Phase 154+ — Recruiting roadmap. Read-only; gated by developmental matrix.
 *
 * Presentation pass: protection-first language; parent-consent badge for minors.
 */
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { useAsbTimeline } from "@/hooks/useAsbTimeline";
import { prepareRows } from "@/lib/runtime/projections/types";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RECRUITING_VOICE, SURFACE_TITLES } from "@/lib/relational/copy";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function RecruitingRoadmap({ athleteId, scope }: Props) {
  const { state: dev } = useDevelopmentalState(athleteId, scope);
  const q = useAsbTimeline({ athleteId });
  if (dev.gating_flags.recruiter_blocked) {
    return (
      <Card className="p-5 space-y-2">
        <h3 className="font-semibold text-foreground">
          {RECRUITING_VOICE.gatedTitle}
        </h3>
        <Badge variant="secondary">{RECRUITING_VOICE.gatedBadge}</Badge>
        <p className="text-sm text-muted-foreground">{RECRUITING_VOICE.gatedBody}</p>
      </Card>
    );
  }
  const rows = prepareRows(q.data?.rows, scope, ["relational.recruiter."]);
  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">{SURFACE_TITLES.recruiting}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {RECRUITING_VOICE.unlockedEmpty}
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r) => {
            const p = r.payload as { school?: string; stage?: string };
            return (
              <li key={r.event_id} className="text-sm flex items-center gap-2 flex-wrap">
                <Badge>{p.stage ?? "contact"}</Badge>
                <span>{p.school ?? "—"}</span>
                {dev.is_minor && (
                  <Badge variant="outline">{RECRUITING_VOICE.minorConsent}</Badge>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
