/**
 * Phase 152 — Hammer Conversation panel.
 *
 * Read-only over the canonical conversation projection. The only write path
 * is `emitConversationTurn` from the canonical emit wrapper; no local
 * relational state lives here. Hammer turns enforce recall citation via
 * `assertHammerTurnLegality` before emission.
 */
import { useState } from "react";
import { useConversationMemory, useNarrativeState, useLifeContextState } from "@/hooks/useRelationalProjections";
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { emitConversationTurn } from "@/lib/runtime/relational/emit";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HAMMER_VOICE, SURFACE_TITLES, DEVELOPMENTAL_VOICE, NARRATIVE_VOICE, LIFE_CONTEXT_VOICE } from "@/lib/relational/copy";

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
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threads = Object.values(state.threads);
  // RR-5: at most one observational callback per session — never a feed.
  const callback = narrative.resurfacingCandidates[0] ?? null;
  // RR-8: at most one observational life-context acknowledgement per session.
  // Suppressed when safeguarding is holding the disclosure (invariant 8).
  const lifeCtxAck =
    !lifeCtx.safeguardingHeld && lifeCtx.activePressureSignals.length > 0
      ? lifeCtx.activePressureSignals[lifeCtx.activePressureSignals.length - 1]
      : null;

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      const hash = await hashUtterance(draft);
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

async function hashUtterance(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
