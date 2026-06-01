/**
 * Phase 152 — Hammer Conversation panel.
 *
 * Read-only over the canonical conversation projection. The only write path
 * is `emitConversationTurn` from the canonical emit wrapper; no local
 * relational state lives here. Hammer turns enforce recall citation via
 * `assertHammerTurnLegality` before emission.
 */
import { useState } from "react";
import { useConversationMemory } from "@/hooks/useRelationalProjections";
import { useDevelopmentalState } from "@/hooks/useRelationalProjections";
import { emitConversationTurn } from "@/lib/runtime/relational/emit";
import type { Scope } from "@/lib/runtime/projections/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  athleteId: string;
  scope: Scope;
}

export function HammerConversationPanel({ athleteId, scope }: Props) {
  const { state } = useConversationMemory(athleteId, scope);
  const { state: dev } = useDevelopmentalState(athleteId, scope);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const threads = Object.values(state.threads);

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
        <h3 className="font-semibold text-foreground">Coach Hammer</h3>
        <div className="flex gap-2">
          {dev.is_minor && <Badge variant="secondary">Minor • parent visible</Badge>}
          <Badge variant="outline">scope: {scope}</Badge>
        </div>
      </header>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {threads.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No conversation history yet.
          </p>
        )}
        {threads.map((t) => (
          <div key={t.thread_id} className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>thread {t.thread_id.slice(0, 8)}</span>
              <span>•</span>
              <span>trust {t.trust_score.toFixed(2)}</span>
              {t.last_shared_scope && (
                <span>• shared with {t.last_shared_scope}</span>
              )}
            </div>
            {t.turns.map((turn) => (
              <div
                key={turn.event_id}
                className="rounded-md border border-border p-2 text-sm"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{turn.speaker_role}</span>
                  <span>{new Date(turn.occurred_at).toLocaleTimeString()}</span>
                </div>
                {turn.redacted ? (
                  <p className="italic text-muted-foreground">
                    redacted (consent withdrawn)
                  </p>
                ) : (
                  <p className="text-foreground">{turn.utterance_ref}</p>
                )}
                {turn.recalled_event_ids.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    cites {turn.recalled_event_ids.length} event
                    {turn.recalled_event_ids.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Tell Hammer how you feel…"
          disabled={sending}
        />
        <Button onClick={send} disabled={sending || !draft.trim()}>
          Send
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
