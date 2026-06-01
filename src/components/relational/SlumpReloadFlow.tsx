/**
 * Phase 153 — Slump reload flow. Shown only when psych confidence axis
 * lands in `strained` or `crisis`. Writes go through `emitPsychSelfReport`.
 */
import { useState } from "react";
import { usePsychState } from "@/hooks/useRelationalProjections";
import { emitPsychSelfReport } from "@/lib/runtime/relational/emit";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function SlumpReloadFlow({ athleteId, scope }: Props) {
  const { state } = usePsychState(athleteId, scope);
  const conf = state.axes.confidence;
  const [sending, setSending] = useState(false);
  if (!conf.effective_band) return null;
  if (conf.effective_band !== "strained" && conf.effective_band !== "crisis")
    return null;

  async function reload(value: number) {
    setSending(true);
    try {
      await emitPsychSelfReport(
        {
          athleteId,
          actorId: athleteId,
          actorRole: "athlete",
          occurredAt: new Date().toISOString(),
        },
        {
          visibility_scope: scope === "demo" ? "demo" : "self",
          authority: "self",
          confidence: 1,
          missingness: { fields: [], reason: "not_observed" },
          lineage_parent_ids: conf.evidence_event_ids,
          axis: "confidence",
          value,
        },
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-4 space-y-3 border-destructive/40">
      <h3 className="font-semibold text-foreground">Slump check-in</h3>
      <p className="text-sm text-muted-foreground">
        Your confidence is in the {conf.effective_band} band. Reload with a
        self-report — your input always overrides inference.
      </p>
      <div className="flex gap-2">
        {[-1, 0, 1, 2].map((v) => (
          <Button
            key={v}
            variant={v >= 1 ? "default" : "secondary"}
            disabled={sending}
            onClick={() => reload(v)}
          >
            {v > 0 ? `+${v}` : v}
          </Button>
        ))}
      </div>
    </Card>
  );
}
