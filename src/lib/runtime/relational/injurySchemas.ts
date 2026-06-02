/**
 * RR-6 Wave 1 — relational.injury.* event schemas.
 *
 * Constitutional: injury continuity is an OBSERVATIONAL overlay. The system
 * never diagnoses, never prescribes, never auto-clears RTP. Authority to
 * authorize return-to-play is restricted to parent / authorized adult
 * (clinician). Coach, AI, recruiter, and system_inferred actors are
 * constitutionally forbidden from authoring rtp_authorized events.
 *
 * Pure module. No I/O. No Date.now / Math.random. Replay-safe.
 */
import { z } from "zod";
import { RelationalEnvelope } from "./schemas";

export const INJURY_TOPICS = {
  reported: "relational.injury.reported",
  updated: "relational.injury.updated",
  recovery_checkpoint: "relational.injury.recovery_checkpoint",
  rtp_authorized: "relational.injury.rtp_authorized",
  visibility_revoked: "relational.injury.visibility_revoked",
} as const;

export const INJURY_TOPIC_PREFIX = "relational.injury." as const;

export const INJURY_SEVERITY_BANDS = ["light", "moderate", "significant"] as const;
export type InjurySeverityBand = (typeof INJURY_SEVERITY_BANDS)[number];

export const INJURY_PARTICIPATION_STATUSES = [
  "full",
  "modified",
  "limited",
  "inactive",
] as const;
export type InjuryParticipationStatus =
  (typeof INJURY_PARTICIPATION_STATUSES)[number];

export const INJURY_CHECKPOINT_TYPES = [
  "mobility",
  "strength",
  "conditioning",
  "throwing",
  "general",
] as const;
export type InjuryCheckpointType = (typeof INJURY_CHECKPOINT_TYPES)[number];

/**
 * Bounded controlled vocabulary for self-reported symptoms.
 * RR-6 invariants 1+7: no free-form medical inference; no pain scoring
 * beyond bounded severity_band. Symptoms describe sensation only, never
 * pathology / diagnosis / cause.
 */
export const INJURY_REPORTED_SYMPTOMS = [
  "soreness",
  "stiffness",
  "tightness",
  "dull_ache",
  "sharp_sensation",
  "fatigue",
  "swelling",
  "reduced_range",
  "hesitation",
] as const;
export type InjuryReportedSymptom = (typeof INJURY_REPORTED_SYMPTOMS)[number];

/**
 * Allowed visibility scopes for RR-6 surfaces. Recruiter/org/external
 * forbidden by RR-6 invariant 4 (commercial pressure may never override
 * recovery). "safeguarding_only" semantics are realized as
 * visibility_scope="parent" + safeguarding_category=true at the emit
 * boundary — same pattern as RR-8 (lifeContextEmitters), so the shared
 * VISIBILITY_SCOPES enum and Scope type are not mutated.
 */
const INJURY_LEGAL_SCOPE_MSG = {
  message:
    "injury visibility must be self|parent|coach|demo — recruiter/org/external forbidden (RR-6 invariant 4)",
};

function isLegalScope(v: string): boolean {
  return v === "self" || v === "parent" || v === "coach" || v === "demo";
}

/**
 * Authority restrictions for non-RTP events: self / parent / clinician.
 * AI and system_inferred actors must not author any RR-6 event (RR-6
 * invariant 8 — injury events never author organism authority directly).
 */
const INJURY_BASE_AUTHORITY_MSG = {
  message:
    "injury authority must be self, parent, or clinician (RR-6 invariants 1, 8)",
};

function isLegalBaseAuthority(a: string): boolean {
  return a === "self" || a === "parent" || a === "clinician";
}

/** RTP authorization actors per RR-6 invariant 5. Coach blocked. */
export const RTP_AUTHORIZED_AUTHORITIES = ["parent", "clinician"] as const;

const RTP_AUTHORITY_MSG = {
  message:
    "rtp_authorized must come from parent or clinician (RR-6 invariant 5 — coach/AI/system cannot authorize RTP)",
};

const BoundedObservation = {
  body_region: z.string().min(1).max(64),
  severity_band: z.enum(INJURY_SEVERITY_BANDS),
  participation_status: z.enum(INJURY_PARTICIPATION_STATUSES),
  reported_symptoms: z.array(z.enum(INJURY_REPORTED_SYMPTOMS)).max(6),
  recovery_focus: z.string().min(1).max(80).optional(),
};

export const InjuryReportedPayload = RelationalEnvelope.extend(
  BoundedObservation,
)
  .strict()
  .refine((d) => isLegalBaseAuthority(d.authority), INJURY_BASE_AUTHORITY_MSG)
  .refine((d) => isLegalScope(d.visibility_scope), INJURY_LEGAL_SCOPE_MSG);

export const InjuryUpdatedPayload = RelationalEnvelope.extend({
  ...BoundedObservation,
  updates_event_id: z.string().min(1),
})
  .strict()
  .refine((d) => isLegalBaseAuthority(d.authority), INJURY_BASE_AUTHORITY_MSG)
  .refine((d) => isLegalScope(d.visibility_scope), INJURY_LEGAL_SCOPE_MSG);

export const InjuryRecoveryCheckpointPayload = RelationalEnvelope.extend({
  body_region: z.string().min(1).max(64),
  checkpoint_type: z.enum(INJURY_CHECKPOINT_TYPES),
  participation_status: z.enum(INJURY_PARTICIPATION_STATUSES),
  recovery_focus: z.string().min(1).max(80).optional(),
})
  .strict()
  .refine((d) => isLegalBaseAuthority(d.authority), INJURY_BASE_AUTHORITY_MSG)
  .refine((d) => isLegalScope(d.visibility_scope), INJURY_LEGAL_SCOPE_MSG);

export const InjuryRtpAuthorizedPayload = RelationalEnvelope.extend({
  body_region: z.string().min(1).max(64),
  authorizes_event_id: z.string().min(1),
  participation_status: z.enum(INJURY_PARTICIPATION_STATUSES),
})
  .strict()
  .refine(
    (d) =>
      (RTP_AUTHORIZED_AUTHORITIES as ReadonlyArray<string>).includes(d.authority),
    RTP_AUTHORITY_MSG,
  )
  .refine((d) => isLegalScope(d.visibility_scope), INJURY_LEGAL_SCOPE_MSG);

export const InjuryVisibilityRevokedPayload = RelationalEnvelope.extend({
  revokes_event_id: z.string().min(1),
})
  .strict()
  .refine((d) => isLegalBaseAuthority(d.authority), INJURY_BASE_AUTHORITY_MSG)
  .refine((d) => isLegalScope(d.visibility_scope), INJURY_LEGAL_SCOPE_MSG);

export type InjuryReportedPayload = z.infer<typeof InjuryReportedPayload>;
export type InjuryUpdatedPayload = z.infer<typeof InjuryUpdatedPayload>;
export type InjuryRecoveryCheckpointPayload = z.infer<
  typeof InjuryRecoveryCheckpointPayload
>;
export type InjuryRtpAuthorizedPayload = z.infer<
  typeof InjuryRtpAuthorizedPayload
>;
export type InjuryVisibilityRevokedPayload = z.infer<
  typeof InjuryVisibilityRevokedPayload
>;
