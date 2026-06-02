/**
 * Phase 154+ / RR-6 Wave 1 — Read-only injury lifecycle strip.
 *
 * Projects `relational.injury.*` events through the canonical
 * `injuryRecoveryState` projection. Observational only — no predictions,
 * no countdowns, no scoring, no RTP recommendation surface. Safeguarding
 * collapses the strip to a calm held-back line (RR-6 invariant 9).
 */
import { useInjuryRecoveryState } from "@/hooks/useRelationalProjections";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  INJURY_VOICE,
  INJURY_RECOVERY_VOICE,
  SURFACE_TITLES,
} from "@/lib/relational/copy";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function InjuryLifecycleStrip({ athleteId, scope }: Props) {
  const { state } = useInjuryRecoveryState(athleteId, scope);

  if (state.safeguardingHeld) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-foreground">{SURFACE_TITLES.injury}</h3>
        <p className="text-sm text-muted-foreground">
          {INJURY_RECOVERY_VOICE.safeguarded}
        </p>
      </Card>
    );
  }

  const rows = state.visibleRecoveryTimeline;
  if (rows.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold text-foreground">{SURFACE_TITLES.injury}</h3>
        <p className="text-sm text-muted-foreground">{INJURY_VOICE.empty}</p>
      </Card>
    );
  }

  const continuityKey =
    rows[rows.length - 1].kind === "rtp_authorized"
      ? "rtp_updated"
      : rows[rows.length - 1].kind === "recovery_checkpoint"
        ? "load_adjusted"
        : "routine";
  const participation = state.participationStatus;

  return (
    <Card className="p-4 space-y-2">
      <h3 className="font-semibold text-foreground">{SURFACE_TITLES.injury}</h3>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="font-normal">
          {INJURY_RECOVERY_VOICE.ackChip}
        </Badge>
        <span>{INJURY_RECOVERY_VOICE.continuityLines[continuityKey]}</span>
        {participation && (
          <span className="text-muted-foreground/80">
            · {INJURY_RECOVERY_VOICE.participationLabels[participation]}
          </span>
        )}
      </div>
      <ol className="space-y-1">
        {rows.map((r) => (
          <li key={r.event_id} className="text-sm flex items-center gap-2">
            <Badge variant="outline">
              {INJURY_VOICE.phaseLabels[r.kind] ?? r.kind}
            </Badge>
            <span className="text-muted-foreground">{r.body_region ?? "—"}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(r.occurred_at).toLocaleDateString()}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
