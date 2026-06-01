/**
 * Phase 152 — relational.conversation.* projection.
 *
 * Pure, deterministic, memoized. Folds conversation turns into per-thread
 * memory with derived trust score. Trust is DERIVED, never stored.
 *
 * Visibility firewall (Phase 151 + 152): demo↔production handled by
 * prepareRows in ./types. Per-turn `safeguarding_category` honoured here.
 */
import { memoize, type Scope } from "./types";
import type { AsbEventRow } from "@/hooks/useAsbTimeline";

export interface TurnSummary {
  event_id: string;
  thread_id: string;
  speaker_role: "athlete" | "coach_hammer" | "coach" | "parent";
  utterance_ref: string;
  intent_tag: string;
  recalled_event_ids: string[];
  trust_delta: number;
  occurred_at: string;
  confidence: number | null;
  missingness_fields: string[];
  redacted: boolean;
  counterparty_id: string | null;
}

export interface ThreadMemory {
  thread_id: string;
  turns: TurnSummary[];
  trust_score: number;
  last_shared_scope: string | null;
  redacted_turn_ids: string[];
}

export interface ConversationMemoryState {
  threads: Record<string, ThreadMemory>;
}

const PREFIXES = ["relational.conversation."];

function clampTrust(v: number): number {
  if (v > 1) return 1;
  if (v < -1) return -1;
  return v;
}

export const buildConversationMemoryState = memoize<ConversationMemoryState>(
  (rows) => {
    const threads: Record<string, ThreadMemory> = {};
    const redactedSet: Record<string, Set<string>> = {};

    // First pass: collect redactions so turns can be marked.
    for (const r of rows) {
      if (r.topic_id === "relational.conversation.redacted") {
        const p = r.payload as { thread_id?: string; turn_ids?: string[] };
        if (!p?.thread_id || !Array.isArray(p.turn_ids)) continue;
        const s = redactedSet[p.thread_id] ?? new Set<string>();
        for (const id of p.turn_ids) s.add(id);
        redactedSet[p.thread_id] = s;
      }
    }

    for (const r of rows) {
      const p = r.payload as Record<string, unknown> | undefined;
      if (!p) continue;

      if (r.topic_id === "relational.conversation.turn") {
        const threadId = p.thread_id as string;
        if (!threadId) continue;
        const thread =
          threads[threadId] ??
          {
            thread_id: threadId,
            turns: [],
            trust_score: 0,
            last_shared_scope: null,
            redacted_turn_ids: [],
          };
        const redacted = redactedSet[threadId]?.has(r.event_id) ?? false;
        const turn: TurnSummary = {
          event_id: r.event_id,
          thread_id: threadId,
          speaker_role: p.speaker_role as TurnSummary["speaker_role"],
          utterance_ref: redacted ? "" : (p.utterance_ref as string),
          intent_tag: p.intent_tag as string,
          recalled_event_ids: (p.recalled_event_ids as string[]) ?? [],
          trust_delta: (p.trust_delta as number) ?? 0,
          occurred_at: r.occurred_at,
          confidence: (p.confidence as number | null) ?? null,
          missingness_fields:
            ((p.missingness as { fields?: string[] })?.fields) ?? [],
          redacted,
          counterparty_id: (p.counterparty_id as string | null) ?? null,
        };
        thread.turns.push(turn);
        // Trust accrual: redacted turns lose their delta contribution
        // (consent withdrawn ⇒ contribution unresolvable).
        if (!redacted) {
          thread.trust_score = clampTrust(
            thread.trust_score + (turn.trust_delta || 0),
          );
        }
        if (redacted) thread.redacted_turn_ids.push(r.event_id);
        threads[threadId] = thread;
      }

      if (r.topic_id === "relational.conversation.shared") {
        const threadId = p.thread_id as string;
        if (!threadId) continue;
        const thread =
          threads[threadId] ??
          {
            thread_id: threadId,
            turns: [],
            trust_score: 0,
            last_shared_scope: null,
            redacted_turn_ids: [],
          };
        thread.last_shared_scope = (p.shared_with_scope as string) ?? null;
        threads[threadId] = thread;
      }
    }

    return { threads };
  },
);

export function conversationMemoryState(
  rows: AsbEventRow[] | undefined,
  scope: Scope,
) {
  return buildConversationMemoryState(rows, scope, PREFIXES);
}
