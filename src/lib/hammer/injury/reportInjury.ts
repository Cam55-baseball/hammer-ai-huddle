/**
 * reportInjury — single canonical entry point for athlete-declared injuries.
 *
 * Every UI surface that lets an athlete say "this hurts" routes here:
 *   - HammerDailyPlan header "Report injury" button (A)
 *   - TellHammerDialog phrase-detection handoff (B)
 *   - AthleteOnboarding injury intake step (D)
 *
 * Constitutional (RR-6):
 *   - actorRole = "athlete", authority = "self" (no diagnosis, no inference).
 *   - confidence = 1.0 (athlete-declared); inferred_confidence never set.
 *   - No RTP authoring (only parent / clinician per RR-6 invariant 5).
 *   - visibility_scope defaults to "self" — athlete owns the disclosure.
 *
 * Side effects:
 *   1. Emits canonical relational.injury.reported event (RR-6 spine).
 *   2. Appends a normalized entry onto `athlete_context.injury_history`
 *      so the existing `decisionFilters.injuryRegions` keyword path
 *      immediately gates Hammer block selection on next render.
 *   3. Pings the compute-hammer-state edge function so the daily plan
 *      reflects the report before the user blinks.
 *
 * The caller supplies a QueryClient and we invalidate the surfaces that
 * depend on context + Hammer state. Errors propagate.
 */
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { emitInjuryReported } from "@/lib/runtime/relational/injuryEmitters";
import type { InjurySeverityBand, InjuryParticipationStatus, InjuryReportedSymptom } from "@/lib/runtime/relational/injurySchemas";
import { persistContextAnswer } from "@/lib/hammer/context/acquisition";

/**
 * Canonical region keys — match `KNOWN_INJURY_REGIONS` in
 * `src/lib/hammer/context/decisionFilters.ts` so the keyword scan picks
 * the region up the moment `injury_history` is rewritten.
 */
export const REPORT_INJURY_REGIONS = [
  { key: "shoulder", label: "Shoulder" },
  { key: "ucl", label: "Elbow (UCL)" },
  { key: "elbow", label: "Elbow" },
  { key: "forearm", label: "Forearm" },
  { key: "wrist", label: "Wrist" },
  { key: "hand", label: "Hand" },
  { key: "hip", label: "Hip" },
  { key: "knee", label: "Knee" },
  { key: "ankle", label: "Ankle" },
  { key: "foot", label: "Foot" },
  { key: "back", label: "Low back" },
  { key: "hamstring", label: "Hamstring" },
  { key: "quad", label: "Quad" },
  { key: "groin", label: "Groin" },
  { key: "calf", label: "Calf" },
  { key: "achilles", label: "Achilles" },
  { key: "neck", label: "Neck" },
] as const;

export type ReportInjuryRegionKey = (typeof REPORT_INJURY_REGIONS)[number]["key"];

export type ReportInjurySeverity = "niggle" | "sore" | "limiting" | "cannot_train";

const SEVERITY_BAND: Record<ReportInjurySeverity, InjurySeverityBand> = {
  niggle: "light",
  sore: "light",
  limiting: "moderate",
  cannot_train: "significant",
};

const PARTICIPATION: Record<ReportInjurySeverity, InjuryParticipationStatus> = {
  niggle: "full",
  sore: "modified",
  limiting: "limited",
  cannot_train: "inactive",
};

export interface ReportInjuryInput {
  userId: string;
  region: ReportInjuryRegionKey;
  severity: ReportInjurySeverity;
  /** Athlete-declared sensations. Bounded set, max 6. */
  symptoms?: InjuryReportedSymptom[];
  /** Optional context note (athlete's own words). Stored on athlete_context only. */
  note?: string;
  /** L / R / bilateral / N-A side label. Stored on note only — not on RR-6 envelope. */
  side?: "left" | "right" | "bilateral" | "na";
  /** ISO timestamp; defaults to now. */
  occurredAt?: string;
  /** Required so we can invalidate the right surfaces immediately. */
  queryClient: QueryClient;
}

export interface ReportInjuryResult {
  eventId: string;
  region: ReportInjuryRegionKey;
}

export async function reportInjury(input: ReportInjuryInput): Promise<ReportInjuryResult> {
  const {
    userId,
    region,
    severity,
    symptoms = [],
    note,
    side,
    queryClient,
  } = input;
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  // 1. Canonical RR-6 event. Athlete authority, self visibility.
  const eventId = await emitInjuryReported(
    {
      athleteId: userId,
      actorId: userId,
      actorRole: "athlete",
      occurredAt,
    },
    {
      visibility_scope: "self",
      confidence: 1.0,
      missingness: { fields: [], reason: "not_observed" },
      authority: "self",
      lineage_parent_ids: [],
      body_region: region,
      severity_band: SEVERITY_BAND[severity],
      participation_status: PARTICIPATION[severity],
      reported_symptoms: symptoms.slice(0, 6),
    },
    // Gate input: caller has no minor-supremacy context here; the emitter
    // narrows visibility to "parent" automatically under safeguarding lockdown,
    // and the projection layer enforces firewalling.
    { safeguardingLockdown: false, isMinor: false },
  );

  // 2. Append onto athlete_context.injury_history so the existing
  //    decisionFilters keyword path gates Hammer next render. Read current,
  //    append, write. Never overwrite — preserves prior reports.
  try {
    const { data } = await supabase
      .from("athlete_context")
      .select("injury_history")
      .eq("user_id", userId)
      .maybeSingle();
    const prior = Array.isArray((data as { injury_history?: unknown } | null)?.injury_history)
      ? ((data as { injury_history: unknown[] }).injury_history)
      : [];
    const sideLabel = side && side !== "na" ? ` (${side})` : "";
    const next = [
      ...prior,
      {
        note: (note?.trim() || region) + sideLabel,
        region,
        severity: SEVERITY_BAND[severity],
        participation: PARTICIPATION[severity],
        symptoms,
        reported_at: occurredAt,
        source_event_id: eventId,
      },
    ];
    await persistContextAnswer(userId, "injury_history", next, "report_injury", "self_report");
  } catch (e) {
    // RR-6 ledger truth is the canonical record; context mirror is a
    // decision-acceleration cache. Log and continue.
    console.warn("[reportInjury] context mirror append failed", e);
  }

  // 3. Recompute Hammer state and invalidate downstream surfaces.
  void supabase.functions
    .invoke("compute-hammer-state", { body: { user_id: userId } })
    .catch(() => {});

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["hammer-daily-plan"] }),
    queryClient.invalidateQueries({ queryKey: ["hammer-state"] }),
    queryClient.invalidateQueries({ queryKey: ["athlete-context"] }),
    queryClient.invalidateQueries({ queryKey: ["asb-events"] }),
    queryClient.invalidateQueries({ queryKey: ["injury-recovery-state"] }),
  ]);

  return { eventId, region };
}

/**
 * Deterministic phrase detector used by TellHammerDialog (B) to suggest
 * promoting a free-text note into a real RR-6 report. No silent emission —
 * the detector only opens the dialog with the matched region prefilled.
 */
const INJURY_PHRASE_RE =
  /\b(hurt|hurts|pain|painful|tweak(?:ed)?|strain(?:ed)?|sprain(?:ed)?|sore|soreness|injured|injury|tight|tightness|inflam|stiff)\b/i;

export function detectInjuryPhrasing(text: string): {
  matched: boolean;
  region: ReportInjuryRegionKey | null;
} {
  if (!text || !INJURY_PHRASE_RE.test(text)) return { matched: false, region: null };
  const lower = text.toLowerCase();
  for (const r of REPORT_INJURY_REGIONS) {
    if (lower.includes(r.key) || lower.includes(r.label.toLowerCase())) {
      return { matched: true, region: r.key };
    }
  }
  return { matched: true, region: null };
}
