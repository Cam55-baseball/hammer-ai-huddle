/**
 * RR-8 — relational.life_context.* event schemas.
 *
 * Constitutional: life context is interpretive overlay. It never authors
 * organism_truth, athlete_intent, authority_override, hard_stop, or
 * rehabilitation_state (RR-8 invariant 10). Disclosure is athlete- or
 * (for minors) parent-controlled. No passive collection, no inferred
 * household composition, no composite "stress" or "support" scores
 * (RR-8 invariants 1, 7).
 *
 * Pure module. No I/O, no Date.now, no Math.random. Replay-safe.
 */
import { z } from "zod";
import { RelationalEnvelope } from "./schemas";

export const LIFE_CONTEXT_TOPICS = {
  academic_load: "relational.life_context.academic_load",
  schedule_stress: "relational.life_context.schedule_stress",
  sleep_disruption: "relational.life_context.sleep_disruption",
  travel_load: "relational.life_context.travel_load",
  family_context: "relational.life_context.family_context",
  general_pressure: "relational.life_context.general_pressure",
  disclosure_revocation: "relational.life_context.disclosure_revocation",
} as const;

export const LIFE_CONTEXT_TOPIC_PREFIX = "relational.life_context." as const;

export const LIFE_CONTEXT_INTENSITY_BANDS = [
  "light",
  "moderate",
  "heavy",
] as const;
export type LifeContextIntensityBand =
  (typeof LIFE_CONTEXT_INTENSITY_BANDS)[number];

const DISCLOSURE_AUTHORITY_MSG = {
  message:
    "life-context authority must be 'self' or 'parent' (RR-8 invariants 1, 9)",
};

const LEGAL_SCOPE_MSG = {
  message:
    "life-context visibility must be self|parent|coach|demo — recruiter/org/external forbidden (RR-8 + RR-10)",
};

/** Bounded observational window — shared across all categories. */
const BoundedWindow = {
  window_start: z.string().min(1),
  window_end: z.string().min(1),
  intensity_band: z.enum(LIFE_CONTEXT_INTENSITY_BANDS),
  /** Short surface tag — copy templates render this. Never free-form feeling. */
  topic_tag: z.string().min(1).max(64).optional(),
};

export const AcademicLoadPayload = RelationalEnvelope.extend(BoundedWindow)
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

export const ScheduleStressPayload = RelationalEnvelope.extend(BoundedWindow)
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

export const SleepDisruptionPayload = RelationalEnvelope.extend(BoundedWindow)
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

export const TravelLoadPayload = RelationalEnvelope.extend(BoundedWindow)
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

/**
 * family_context — intensity_band only. No household composition, no
 * demographic data, no inferred relationships, no free-text content
 * (RR-8 invariant 7).
 */
export const FamilyContextPayload = RelationalEnvelope.extend(BoundedWindow)
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

export const GeneralPressurePayload = RelationalEnvelope.extend(BoundedWindow)
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

/**
 * Revocation removes downstream visibility on the next projection rebuild
 * (RR-8 invariant 2). Carries the revoked event id only; no narrative.
 */
export const DisclosureRevocationPayload = RelationalEnvelope.extend({
  revokes_event_id: z.string().min(1),
})
  .refine((d) => d.authority === "self" || d.authority === "parent", DISCLOSURE_AUTHORITY_MSG)
  .refine(
    (d) =>
      d.visibility_scope === "self" ||
      d.visibility_scope === "parent" ||
      d.visibility_scope === "coach" ||
      d.visibility_scope === "demo",
    LEGAL_SCOPE_MSG,
  );

export type AcademicLoadPayload = z.infer<typeof AcademicLoadPayload>;
export type ScheduleStressPayload = z.infer<typeof ScheduleStressPayload>;
export type SleepDisruptionPayload = z.infer<typeof SleepDisruptionPayload>;
export type TravelLoadPayload = z.infer<typeof TravelLoadPayload>;
export type FamilyContextPayload = z.infer<typeof FamilyContextPayload>;
export type GeneralPressurePayload = z.infer<typeof GeneralPressurePayload>;
export type DisclosureRevocationPayload = z.infer<
  typeof DisclosureRevocationPayload
>;

export type LifeContextCategory =
  | "academic_load"
  | "schedule_stress"
  | "sleep_disruption"
  | "travel_load"
  | "family_context"
  | "general_pressure";

export const LIFE_CONTEXT_CATEGORIES: ReadonlyArray<LifeContextCategory> = [
  "academic_load",
  "schedule_stress",
  "sleep_disruption",
  "travel_load",
  "family_context",
  "general_pressure",
];
