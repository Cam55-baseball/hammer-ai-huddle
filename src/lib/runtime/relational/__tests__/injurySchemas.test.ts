/**
 * RR-6 Wave 1 — injury schema legality tests.
 * Namespaced per Wave 1C replay-isolation convention (`is_*` ids).
 */
import { describe, it, expect } from "vitest";
import {
  InjuryReportedPayload,
  InjuryRtpAuthorizedPayload,
} from "@/lib/runtime/relational/injurySchemas";

const base = {
  engine_version: "asb-1.0.0",
  reasoning_version: "relational-1.0.0",
  visibility_scope: "self" as const,
  confidence: null,
  missingness: { fields: [] as string[], reason: "not_observed" as const },
  authority: "self" as const,
  lineage_parent_ids: [] as string[],
  body_region: "shoulder",
  severity_band: "light" as const,
  participation_status: "modified" as const,
  reported_symptoms: ["soreness" as const],
};

describe("InjuryReportedPayload — RR-6 schema legality", () => {
  it("accepts a clean self-reported observation", () => {
    expect(() => InjuryReportedPayload.parse(base)).not.toThrow();
  });

  it("rejects forbidden visibility scopes (external/org)", () => {
    expect(() =>
      InjuryReportedPayload.parse({ ...base, visibility_scope: "external" }),
    ).toThrow();
    expect(() =>
      InjuryReportedPayload.parse({ ...base, visibility_scope: "org" }),
    ).toThrow();
  });

  it("rejects diagnosis / treatment / pain_score / eta extras (strict)", () => {
    expect(() =>
      InjuryReportedPayload.parse({ ...base, diagnosis: "tendinitis" }),
    ).toThrow();
    expect(() =>
      InjuryReportedPayload.parse({ ...base, treatment_plan: "ice" }),
    ).toThrow();
    expect(() =>
      InjuryReportedPayload.parse({ ...base, eta_days: 14 }),
    ).toThrow();
    expect(() =>
      InjuryReportedPayload.parse({ ...base, pain_score: 7 }),
    ).toThrow();
  });

  it("rejects free-form symptoms outside controlled vocabulary", () => {
    expect(() =>
      InjuryReportedPayload.parse({
        ...base,
        reported_symptoms: ["torn rotator cuff"],
      }),
    ).toThrow();
  });

  it("rtp_authorized rejects coach/self/system_inferred authority", () => {
    const rtp = {
      ...base,
      authority: "self" as const,
      authorizes_event_id: "is_rep_1",
      reported_symptoms: undefined,
      severity_band: undefined,
    };
    // strip non-rtp fields
    const rtpPayload = {
      engine_version: base.engine_version,
      reasoning_version: base.reasoning_version,
      visibility_scope: "self" as const,
      confidence: null,
      missingness: base.missingness,
      lineage_parent_ids: [],
      body_region: "shoulder",
      authorizes_event_id: "is_rep_1",
      participation_status: "full" as const,
    };
    expect(() =>
      InjuryRtpAuthorizedPayload.parse({ ...rtpPayload, authority: "self" }),
    ).toThrow();
    expect(() =>
      InjuryRtpAuthorizedPayload.parse({
        ...rtpPayload,
        authority: "system_inferred",
      }),
    ).toThrow();
    expect(() =>
      InjuryRtpAuthorizedPayload.parse({ ...rtpPayload, authority: "parent" }),
    ).not.toThrow();
    expect(() =>
      InjuryRtpAuthorizedPayload.parse({
        ...rtpPayload,
        authority: "clinician",
      }),
    ).not.toThrow();
    void rtp;
  });
});
