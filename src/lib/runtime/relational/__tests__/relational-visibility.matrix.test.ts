/**
 * Visibility matrix — Phase 151 firewall + Phase 152 parent/demo scopes.
 *
 * Asserts prepareRows behavior via a downstream projection (conversation).
 * Demo↔production bidirectional firewall; self payloads only visible to self.
 */
import { describe, it, expect } from "vitest";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import type { Scope } from "@/lib/runtime/projections/types";
import { mk, ENV } from "./_fixtures";

type PayloadScope = "self" | "coach" | "parent" | "org" | "external" | "demo" | "none";

function row(eventId: string, payloadScope: PayloadScope) {
  const base = {
    ...ENV,
    authority: "self" as const,
    confidence: null,
    thread_id: `thr_${eventId}`,
    speaker_role: "athlete" as const,
    utterance_ref: `hash_${eventId}`,
    intent_tag: "checkin",
    recalled_event_ids: [] as string[],
    trust_delta: 0,
    counterparty_id: null,
  };
  const payload =
    payloadScope === "none"
      ? base
      : { ...base, visibility_scope: payloadScope };
  return mk({
    event_id: eventId,
    topic_id: "relational.conversation.turn",
    occurred_at: `2026-01-01T10:00:${eventId.padStart(2, "0")}Z`,
    payload,
  });
}

const SCOPES: Scope[] = ["self", "coach", "parent", "org", "external", "demo"];
const PAYLOAD_SCOPES: PayloadScope[] = [
  "self",
  "coach",
  "parent",
  "org",
  "external",
  "demo",
  "none",
];

// Expected visibility — true means the row contributes to the projection.
function expected(scope: Scope, p: PayloadScope): boolean {
  // Demo firewall (bidirectional): demo only reads demo; non-demo never reads demo.
  if (p === "demo") return scope === "demo";
  if (scope === "demo") return false;
  // Self-scoped payloads only visible to self scope.
  if (p === "self") return scope === "self";
  // Unscoped + other scopes pass the prefix filter; no further filter applied.
  return true;
}

describe("prepareRows visibility matrix", () => {
  for (const scope of SCOPES) {
    for (const p of PAYLOAD_SCOPES) {
      const want = expected(scope, p);
      it(`scope=${scope} payload=${p} → ${want ? "visible" : "hidden"}`, () => {
        const rows = [row("01", p)];
        const { state, meta } = conversationMemoryState(rows, scope);
        const visible = meta.sourceCount === 1;
        expect(visible).toBe(want);
        if (want) {
          expect(Object.keys(state.threads).length).toBe(1);
        } else {
          expect(Object.keys(state.threads).length).toBe(0);
        }
      });
    }
  }
});
