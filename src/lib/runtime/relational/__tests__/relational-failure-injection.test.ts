/**
 * Phase 152–154 — failure injection pass.
 *
 * Each test attempts a constitutionally illegal action and asserts the
 * substrate rejects it. Rejections are surfaced as Zod parse errors or
 * thrown legality assertions (RR-1 / RR-2 / RR-3 enforcement).
 *
 * Note: emit wrappers call schema.parse() at the boundary, so testing parse
 * directly is equivalent to testing emission legality without a live DB.
 */
import { describe, it, expect } from "vitest";
import {
  PsychInferredPayload,
  PsychSelfReportPayload,
  ConversationTurnPayload,
  DevelopmentalTransitionPayload,
  PSYCH_INFERRED_CONFIDENCE_CEILING,
} from "@/lib/runtime/relational/schemas";
import { assertHammerTurnLegality } from "@/lib/runtime/relational/hammerMemory";
import { clampInferredConfidence } from "@/lib/runtime/relational/psychInference";
import { developmentalState } from "@/lib/runtime/projections/developmentalState";
import { trustState } from "@/lib/runtime/projections/trustState";
import { conversationMemoryState } from "@/lib/runtime/projections/conversationMemoryState";
import { buildDemoSeed } from "./_seed";
import { mk, ENV } from "./_fixtures";
import { prepareRows } from "@/lib/runtime/projections/types";

describe("relational failure injection — Phases 152–154", () => {
  it("(F1) psych inferred confidence > 0.7 — schema rejects, clamp pins to ceiling", () => {
    expect(() =>
      PsychInferredPayload.parse({
        engine_version: "asb-1.0.0",
        reasoning_version: "relational-1.0.0",
        visibility_scope: "demo",
        missingness: { fields: [], reason: "not_observed" },
        authority: "system_inferred",
        confidence: 0.85,
        lineage_parent_ids: [],
        axis: "mood",
        value: 0.5,
        evidence_event_ids: ["e1"],
      }),
    ).toThrow();
    expect(clampInferredConfidence(0.85)).toBe(
      PSYCH_INFERRED_CONFIDENCE_CEILING,
    );
  });

  it("(F2) psych self_report with non-self authority — schema rejects", () => {
    expect(() =>
      PsychSelfReportPayload.parse({
        engine_version: "asb-1.0.0",
        reasoning_version: "relational-1.0.0",
        visibility_scope: "demo",
        missingness: { fields: [], reason: "not_observed" },
        authority: "coach", // illegal — self_report must be 'self'
        confidence: 1,
        lineage_parent_ids: [],
        axis: "mood",
        value: 0,
      }),
    ).toThrow();
  });

  it("(F3) developmental regression rejected by projection (monotonic stage)", () => {
    const rows = [
      mk({
        event_id: "t1",
        topic_id: "relational.developmental.transition",
        occurred_at: "2026-01-01T00:00:00Z",
        payload: {
          ...ENV,
          visibility_scope: "demo",
          authority: "clinician",
          confidence: 0.9,
          from_stage: "youth_intro",
          to_stage: "adolescent_mid",
          evidence_event_ids: [],
        },
      }),
      mk({
        event_id: "t2",
        topic_id: "relational.developmental.transition",
        occurred_at: "2026-01-02T00:00:00Z",
        payload: {
          ...ENV,
          visibility_scope: "demo",
          authority: "clinician",
          confidence: 0.9,
          from_stage: "adolescent_mid",
          to_stage: "youth_intro", // regression
          evidence_event_ids: [],
        },
      }),
    ];
    const s = developmentalState(rows, "demo").state;
    expect(s.current_stage).toBe("adolescent_mid");
  });

  it("(F4) replay-order scrambling does not produce divergent stage state", () => {
    const seed = buildDemoSeed();
    const a = developmentalState(seed, "demo").state.current_stage;
    const b = developmentalState([...seed].reverse(), "demo").state
      .current_stage;
    expect(a).toBe(b);
  });

  it("(F5) demo event leaking into production scope — firewall rejects", () => {
    const demoRow = mk({
      event_id: "leak1",
      topic_id: "relational.conversation.turn",
      occurred_at: "2026-01-01T00:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "demo",
        authority: "self",
        confidence: 1,
        thread_id: "t",
        speaker_role: "athlete",
        utterance_ref: "u",
        intent_tag: "i",
        recalled_event_ids: [],
        trust_delta: 0,
        counterparty_id: null,
      },
    });
    const filteredSelf = prepareRows([demoRow], "self", [
      "relational.conversation.",
    ]);
    const filteredDemo = prepareRows([demoRow], "demo", [
      "relational.conversation.",
    ]);
    expect(filteredSelf.length).toBe(0);
    expect(filteredDemo.length).toBe(1);
  });

  it("(F6) production event leaking into demo scope — reverse firewall rejects", () => {
    const prodRow = mk({
      event_id: "leak2",
      topic_id: "relational.conversation.turn",
      occurred_at: "2026-01-01T00:00:00Z",
      payload: {
        ...ENV,
        visibility_scope: "coach",
        authority: "coach",
        confidence: 1,
        thread_id: "t",
        speaker_role: "coach",
        utterance_ref: "u",
        intent_tag: "i",
        recalled_event_ids: [],
        trust_delta: 0,
        counterparty_id: "c",
      },
    });
    const filteredDemo = prepareRows([prodRow], "demo", [
      "relational.conversation.",
    ]);
    expect(filteredDemo.length).toBe(0);
  });

  it("(F7) coach_hammer turn with empty recalled_event_ids while claiming recall — RR-1 rejects", () => {
    expect(() =>
      assertHammerTurnLegality(
        {
          speaker_role: "coach_hammer",
          recalled_event_ids: [],
          missingness: { fields: [], reason: "not_observed" },
          intent_tag: "acknowledge",
        },
        {
          claims_recall: true,
          references_recruiter: false,
          parent_consent_event_id: null,
          athlete_is_minor: true,
          has_unstated_gap: false,
        },
      ),
    ).toThrow(/HAMMER_TURN_CONSTITUTIONALLY_ILLEGAL.*FABRICATED_RECALL/);
  });

  it("(F8) coach_hammer recruiter reference for minor without parent consent — rejected", () => {
    expect(() =>
      assertHammerTurnLegality(
        {
          speaker_role: "coach_hammer",
          recalled_event_ids: ["e1"],
          missingness: { fields: [], reason: "not_observed" },
          intent_tag: "recruiter_context",
        },
        {
          claims_recall: true,
          references_recruiter: true,
          parent_consent_event_id: null,
          athlete_is_minor: true,
          has_unstated_gap: false,
        },
      ),
    ).toThrow(/RECRUITER_REFERENCE_WITHOUT_CONSENT/);
  });

  it("(F9) trust_delta burst (|d| > 0.1 per turn) — schema rejects at emit boundary", () => {
    expect(() =>
      ConversationTurnPayload.parse({
        engine_version: "asb-1.0.0",
        reasoning_version: "relational-1.0.0",
        visibility_scope: "demo",
        missingness: { fields: [], reason: "not_observed" },
        authority: "self",
        confidence: 1,
        lineage_parent_ids: [],
        thread_id: "t",
        speaker_role: "athlete",
        utterance_ref: "u",
        intent_tag: "i",
        recalled_event_ids: [],
        trust_delta: 0.9, // bounded to [-0.1, 0.1]
        counterparty_id: "c",
      }),
    ).toThrow();
  });

  it("(F10) redacted turn loses trust contribution (consent withdrawn ⇒ unresolvable)", () => {
    const seed = buildDemoSeed();
    const trust = trustState(seed, "demo").state;
    const conv = conversationMemoryState(seed, "demo").state;
    // The redactable turn ev_conv_turn_0130 is redacted by ev_conv_redacted_0140
    // — its trust_delta (+0.05) must NOT appear in coach_hammer trust accrual.
    const hammerTrust = trust.byCounterparty["coach_hammer"];
    // hammer contributions: ev_conv_turn_0090 (+0.05). redacted turn excluded.
    expect(hammerTrust?.trust_score).toBeCloseTo(0.05, 5);
    expect(
      conv.threads["thread-coach-hammer-001"].redacted_turn_ids,
    ).toContain("ev_conv_turn_0130");
  });

  it("(F11) developmental transition with invalid stage id — schema rejects", () => {
    expect(() =>
      DevelopmentalTransitionPayload.parse({
        engine_version: "asb-1.0.0",
        reasoning_version: "relational-1.0.0",
        visibility_scope: "demo",
        missingness: { fields: [], reason: "not_observed" },
        authority: "clinician",
        confidence: 0.9,
        lineage_parent_ids: [],
        from_stage: "youth_intro",
        to_stage: "elder_pro", // not in enum
        evidence_event_ids: [],
      }),
    ).toThrow();
  });
});
