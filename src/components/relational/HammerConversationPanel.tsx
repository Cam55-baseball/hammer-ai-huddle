/**
 * Phase 152 — Hammer Conversation panel.
 *
 * Read-only over the canonical conversation projection. The only write path
 * is `emitConversationTurn` from the canonical emit wrapper; no local
 * relational state lives here. Hammer turns enforce recall citation via
 * `assertHammerTurnLegality` before emission.
 */
import { useState } from "react";
import { useConversationMemory, useNarrativeState, useLifeContextState, useInjuryRecoveryState } from "@/hooks/useRelationalProjections";
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { emitConversationTurn } from "@/lib/runtime/relational/emit";
import { arbitrateMemoryCallback } from "@/lib/runtime/relational/hammerMemory";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HAMMER_VOICE, SURFACE_TITLES, DEVELOPMENTAL_VOICE, NARRATIVE_VOICE, LIFE_CONTEXT_VOICE, INJURY_RECOVERY_VOICE } from "@/lib/relational/copy";

interface Props {
  athleteId: string;
  scope: Scope;
  debug?: boolean;
}

export function HammerConversationPanel({ athleteId, scope, debug = false }: Props) {
  const { state } = useConversationMemory(athleteId, scope);
  const { state: dev } = useDevelopmentalState(athleteId, scope);
  const { state: narrative } = useNarrativeState(athleteId, scope);
  const { state: lifeCtx } = useLifeContextState(athleteId, scope);
  const { state: injury } = useInjuryRecoveryState(athleteId, scope);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threads = Object.values(state.threads);
  // RR-5 ↔ RR-8 ↔ RR-6 single-callback arbitration: at most one memory chip
  // per assistant turn, never multiple. Safeguarding lockdown suppresses all.
  const newestNarrative =
    narrative.resurfacingCandidates.length > 0
      ? [...narrative.resurfacingCandidates].sort((a, b) =>
          a.occurred_at < b.occurred_at ? 1 : -1,
        )[0]
      : null;
  const newestLifeCtx =
    lifeCtx.activePressureSignals.length > 0
      ? lifeCtx.activePressureSignals[lifeCtx.activePressureSignals.length - 1]
      : null;
  const newestInjury =
    injury.visibleRecoveryTimeline.length > 0
      ? injury.visibleRecoveryTimeline[injury.visibleRecoveryTimeline.length - 1]
      : null;
  const safeguardingHeld = lifeCtx.safeguardingHeld || injury.safeguardingHeld;
  const arbitrated = arbitrateMemoryCallback({
    narrative: newestNarrative
      ? {
          event_id: newestNarrative.event_id,
          occurred_at: newestNarrative.occurred_at,
          topic_tag: newestNarrative.topic_tag,
          kind: newestNarrative.kind,
        }
      : null,
    lifeContext: newestLifeCtx
      ? {
          event_id: newestLifeCtx.event_id,
          occurred_at: newestLifeCtx.occurred_at,
          topic_tag: newestLifeCtx.topic_tag,
          category: newestLifeCtx.category,
        }
      : null,
    injury: newestInjury
      ? {
          event_id: newestInjury.event_id,
          occurred_at: newestInjury.occurred_at,
          topic_tag: null,
          phase: newestInjury.kind,
        }
      : null,
    safeguardingLockdown: safeguardingHeld,
  });
  const callback = arbitrated.kind === "narrative" ? newestNarrative : null;
  const lifeCtxAck = arbitrated.kind === "life_context" ? newestLifeCtx : null;
  const injuryAck = arbitrated.kind === "injury_continuity" ? newestInjury : null;
  const injuryLineKey: keyof typeof INJURY_RECOVERY_VOICE.continuityLines =
    injuryAck?.kind === "rtp_authorized"
      ? "rtp_updated"
      : injuryAck?.kind === "recovery_checkpoint"
        ? "load_adjusted"
        : "routine";

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const hash = hashUtterance(draft);
      await emitConversationTurn({
        ctx: {
          athleteId,
          actorId: athleteId,
          actorRole: "athlete",
          occurredAt: new Date().toISOString(),
        },
        payload: {
          visibility_scope: scope === "demo" ? "demo" : "self",
          authority: "self",
          confidence: 1,
          missingness: { fields: [], reason: "not_observed" },
          lineage_parent_ids: [],
          thread_id: threads[0]?.thread_id ?? "thr_default",
          speaker_role: "athlete",
          utterance_ref: hash,
          intent_tag: "checkin",
          recalled_event_ids: [],
          trust_delta: 0,
          counterparty_id: "cp_hammer",
        },
      });
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">{SURFACE_TITLES.hammer}</h3>
        <div className="flex gap-2">
          {dev.is_minor && (
            <Badge variant="secondary">{DEVELOPMENTAL_VOICE.minorBadge}</Badge>
          )}
          {debug && <Badge variant="outline">scope: {scope}</Badge>}
        </div>
      </header>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {threads.length === 0 && (
          <p className="text-sm text-muted-foreground">{HAMMER_VOICE.emptyState}</p>
        )}
        {threads.map((t) => (
          <div key={t.thread_id} className="space-y-1">
            {debug && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>thread {t.thread_id.slice(0, 8)}</span>
                <span>•</span>
                <span>trust {t.trust_score.toFixed(2)}</span>
                {t.last_shared_scope && (
                  <span>• shared with {t.last_shared_scope}</span>
                )}
              </div>
            )}
            {t.turns.map((turn) => (
              <div
                key={turn.event_id}
                className="rounded-md border border-border p-2 text-sm"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{HAMMER_VOICE.speakerLabel(turn.speaker_role)}</span>
                  <span>{new Date(turn.occurred_at).toLocaleDateString()}</span>
                </div>
                {turn.redacted ? (
                  <p className="italic text-muted-foreground">{HAMMER_VOICE.redacted}</p>
                ) : (
                  <p className="text-foreground">{turn.utterance_ref}</p>
                )}
                {turn.recalled_event_ids.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {HAMMER_VOICE.cite(turn.recalled_event_ids.length)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      {callback && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
          <Badge variant="outline" className="font-normal">
            {NARRATIVE_VOICE.resurfacingChip}
          </Badge>
          <span>
            {NARRATIVE_VOICE.resurfacingLabel(
              callback.topic_tag ?? NARRATIVE_VOICE.journeyMarkers[callback.kind] ?? "this",
              new Date(callback.occurred_at).toLocaleDateString(),
            )}
          </span>
        </div>
      )}
      {lifeCtxAck && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
          <Badge variant="outline" className="font-normal">
            {LIFE_CONTEXT_VOICE.ackChip}
          </Badge>
          <span>
            {LIFE_CONTEXT_VOICE.observationalLine(
              LIFE_CONTEXT_VOICE.categoryLabels[lifeCtxAck.category] ?? "things",
              LIFE_CONTEXT_VOICE.intensityLabels[lifeCtxAck.intensity_band] ?? "noticeably",
            )}
          </span>
        </div>
      )}
      {injuryAck && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-2">
          <Badge variant="outline" className="font-normal">
            {INJURY_RECOVERY_VOICE.ackChip}
          </Badge>
          <span>{INJURY_RECOVERY_VOICE.continuityLines[injuryLineKey]}</span>
        </div>
      )}
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={HAMMER_VOICE.composerPlaceholder}
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !draft.trim()}>
          {HAMMER_VOICE.send}
        </Button>
      </div>
    </Card>
  );
}

// Deterministic, non-cryptographic FNV-1a fingerprint for utterance_ref.
// utterance_ref is interpretive lineage, not event identity — cryptographic
// digest composition is reserved for canonical identity authors
// (engineVersion.ts, sensorIdempotency.ts) per preflight invariant #2.
function hashUtterance(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (
    (h >>> 0).toString(16).padStart(8, "0") +
    (s.length >>> 0).toString(16).padStart(8, "0")
  );
}
