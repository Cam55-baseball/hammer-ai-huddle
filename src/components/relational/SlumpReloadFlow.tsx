/**
 * Phase 153 — Slump reload flow. Shown only when psych confidence axis
 * lands in `strained` or `crisis`. Writes go through `emitPsychSelfReport`.
 *
 * Presentation pass: tone calmed, buttons humanized, no clinical language.
 */
import { useState } from "react";
import { usePsychState } from "@/hooks/useRelationalProjections";
import { emitPsychSelfReport } from "@/lib/runtime/relational/emit";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SLUMP_VOICE } from "@/lib/relational/copy";

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

  const buttons: Array<{ label: string; value: number; primary?: boolean }> = [
    { label: SLUMP_VOICE.buttons.worse, value: -1 },
    { label: SLUMP_VOICE.buttons.same, value: 0 },
    { label: SLUMP_VOICE.buttons.better, value: 1, primary: true },
    { label: SLUMP_VOICE.buttons.much_better, value: 2, primary: true },
  ];

  return (
    <Card className="p-5 space-y-3">
      <h3 className="font-semibold text-foreground">{SLUMP_VOICE.title}</h3>
      <p className="text-sm text-muted-foreground">{SLUMP_VOICE.body}</p>
      <div className="flex gap-2 flex-wrap">
        {buttons.map((b) => (
          <Button
            key={b.value}
            variant={b.primary ? "default" : "secondary"}
            disabled={sending}
            onClick={() => reload(b.value)}
            className="min-h-11"
          >
            {b.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
